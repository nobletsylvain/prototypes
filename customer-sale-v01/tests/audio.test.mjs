import test from 'node:test';
import assert from 'node:assert/strict';
import { SaleAudio } from '../audio.mjs';

class FakeParam {
  constructor(value = 0) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  exponentialRampToValueAtTime(value, time) { this.events.push(['exponential', value, time]); }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
}

class FakeNode {
  constructor(type, context) {
    this.kind = type; this.context = context; this.connections = []; this.disconnects = 0;
    for (const key of ['gain', 'threshold', 'ratio', 'frequency', 'Q']) this[key] = new FakeParam();
  }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnects++; this.connections.length = 0; }
}

class FakeSource extends FakeNode {
  constructor(type, context) { super(type, context); this.starts = []; this.stops = []; }
  start(time = 0) { this.starts.push(time); }
  stop(time = 0) { this.stops.push(time); }
  finish() { this.onended?.(); }
}

class FakeContext {
  constructor(state = 'suspended') {
    this.state = state; this.currentTime = 3.25; this.sampleRate = 12000;
    this.destination = {}; this.nodes = []; this.buffers = []; this.resumeCalls = 0; this.closeCalls = 0;
  }
  node(type) { const node = new FakeNode(type, this); this.nodes.push(node); return node; }
  createGain() { return this.node('gain'); }
  createDynamicsCompressor() { return this.node('compressor'); }
  createBiquadFilter() { return this.node('filter'); }
  createBuffer(channels, length, sampleRate) {
    assert.equal(channels, 1); assert.equal(sampleRate, this.sampleRate); assert.ok(length > 0);
    const data = new Float32Array(length);
    const buffer = { getChannelData: index => { assert.equal(index, 0); return data; }, data };
    this.buffers.push(buffer); return buffer;
  }
  createBufferSource() { const source = new FakeSource('noise', this); this.nodes.push(source); return source; }
  createOscillator() { const source = new FakeSource('tone', this); this.nodes.push(source); return source; }
  async resume() { this.resumeCalls++; if (this.rejectResume) throw new Error('Resume refused'); this.state = 'running'; }
  async close() { this.closeCalls++; this.state = 'closed'; }
  get sources() { return this.nodes.filter(node => node instanceof FakeSource); }
}

async function unlocked(state = 'suspended') {
  const context = new FakeContext(state);
  const audio = new SaleAudio({ contextFactory: () => context });
  assert.equal(await audio.unlock(), true);
  return { context, audio };
}

test('no cue starts before the user unlocks audio', () => {
  let factories = 0;
  const audio = new SaleAudio({ contextFactory: () => { factories++; return new FakeContext(); } });
  assert.equal(audio.play('take'), false);
  assert.equal(factories, 0);
  assert.equal(audio.metrics.played, 0);
});

test('unlock resumes one context and preserves one output chain', async () => {
  const context = new FakeContext(); let factories = 0;
  const audio = new SaleAudio({ contextFactory: () => { factories++; return context; } });
  assert.equal(await audio.unlock(), true);
  assert.equal(await audio.unlock(), true);
  assert.equal(factories, 1); assert.equal(context.resumeCalls, 1);
  assert.equal(context.nodes.filter(node => node.kind === 'compressor').length, 1);
  assert.equal(audio.master.connections[0].connections[0], context.destination);
});

test('missing audio support leaves visual interaction usable', async () => {
  const audio = new SaleAudio({ contextFactory: () => null });
  assert.equal(await audio.unlock(), false);
  assert.equal(audio.play('paper-contact'), false);
  assert.deepEqual(audio.metrics, { played: 0, failures: 0 });
  await audio.close();
});

test('a rejected resume is reported and a later user gesture can recover', async () => {
  const context = new FakeContext(); context.rejectResume = true;
  const audio = new SaleAudio({ contextFactory: () => context });
  assert.equal(await audio.unlock(), false);
  assert.equal(audio.metrics.failures, 1);
  assert.equal(audio.play('take'), false);
  assert.equal(context.sources.length, 0);
  context.rejectResume = false;
  assert.equal(await audio.unlock(), true);
  assert.equal(audio.play('take'), true);
});

test('a constructor failure is contained', async () => {
  const audio = new SaleAudio({ contextFactory: () => { throw new Error('Unavailable'); } });
  assert.equal(await audio.unlock(), false);
  assert.equal(audio.play('talk'), false);
  assert.equal(audio.metrics.failures, 1);
});

test('output construction can recover after a temporary failure', async () => {
  const context = new FakeContext('running');
  const original = context.createDynamicsCompressor;
  context.createDynamicsCompressor = () => { throw new Error('Temporary failure'); };
  const audio = new SaleAudio({ contextFactory: () => context });
  assert.equal(await audio.unlock(), false);
  assert.equal(audio.play('talk'), false);
  context.createDynamicsCompressor = original;
  assert.equal(await audio.unlock(), true);
  assert.equal(audio.play('talk'), true);
});

test('mute before unlock and mute after unlock suppress new sources', async () => {
  const context = new FakeContext();
  const audio = new SaleAudio({ contextFactory: () => context });
  audio.setMuted(true);
  assert.equal(await audio.unlock(), true);
  assert.equal(audio.master.gain.value, 0);
  assert.equal(audio.play('take'), false);
  audio.setMuted(false);
  assert.equal(audio.play('take'), true);
  const count = context.sources.length;
  audio.setMuted(true);
  assert.equal(audio.master.gain.value, 0);
  assert.equal(audio.play('sale-to-hand'), false);
  assert.equal(context.sources.length, count);
});

test('a suspended background context accepts no cues', async () => {
  const { context, audio } = await unlocked();
  context.state = 'suspended';
  assert.equal(audio.play('paper-contact'), false);
  assert.equal(context.sources.length, 0);
});

test('refusal is a quiet cue and unknown events create no sources', async () => {
  const { context, audio } = await unlocked();
  assert.equal(audio.play('refused'), true);
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].kind, 'tone');
  assert.equal(audio.play('unknown-event'), false);
  assert.equal(audio.play(null), false);
  assert.equal(context.sources.length, 1);
  assert.equal(audio.metrics.played, 1);
});

test('contact callback drives paper and product cues, while a drop alone is silent', async () => {
  const { context, audio } = await unlocked();
  const contact = event => audio.play(event.type);
  assert.equal(audio.play('drop'), false);
  assert.equal(context.sources.length, 0);
  assert.equal(contact({ type: 'paper-contact', id: 'fund-5-1' }), true);
  assert.equal(context.sources.length, 2);
  assert.equal(contact({ type: 'product-contact', id: 'hash8-1' }), true);
  assert.equal(context.sources.length, 4);
  assert.equal(audio.metrics.played, 2);
  for (const source of context.sources) {
    assert.equal(source.starts.length, 1);
    assert.ok(source.stops[0] > source.starts[0]);
  }
});

test('the physical fund contact plays the automatic storage cue', async () => {
  const { context, audio } = await unlocked();
  const contact = event => audio.play(event.type);
  assert.equal(audio.play('confirm'), false);
  assert.equal(context.sources.length, 0);
  assert.equal(contact({ type: 'fund-contact', id: 'payment-1' }), true);
  assert.equal(audio.metrics.played, 1);
  assert.equal(context.sources.length, 2);
  assert.ok(context.sources.every(source => source.kind === 'noise'));
  assert.ok(context.sources[1].starts[0] > context.sources[0].starts[0]);
});

test('rapid cues never exceed 24 simultaneous sources', async () => {
  const { audio, context } = await unlocked();
  for (let index = 0; index < 8; index++) assert.equal(audio.play('sale-to-tray'), true);
  assert.equal(audio.sources.size, 24);
  assert.equal(audio.play('take'), false);
  assert.equal(audio.play('refused'), false);
  assert.equal(context.sources.length, 24);
  context.sources[0].finish();
  assert.equal(audio.sources.size, 23);
  assert.equal(audio.play('take'), false);
  assert.equal(audio.play('refused'), true);
  assert.equal(audio.sources.size, 24);
});

test('ended sources release their voice slot and disconnect', async () => {
  const { audio, context } = await unlocked();
  audio.play('paper-contact');
  const source = context.sources[0];
  source.finish();
  assert.equal(audio.sources.has(source), false);
  assert.equal(source.disconnects, 1);
  assert.equal(audio.sources.size, 1);
});

test('plain feedback reduces cue layers without disabling useful contact sound', async () => {
  const { audio, context } = await unlocked();
  audio.setEnhanced(false);
  assert.equal(audio.play('take'), true);
  assert.equal(context.sources.length, 1);
  assert.equal(audio.play('paper-contact'), true);
  assert.equal(context.sources.length, 3);
  assert.equal(audio.play('sale-to-hand'), true);
  assert.equal(context.sources.length, 4);
});

test('synthesis failure is counted without escaping into the controller', async () => {
  const { audio, context } = await unlocked();
  context.createBuffer = () => { throw new Error('Allocation failed'); };
  assert.equal(audio.play('take'), false);
  assert.deepEqual(audio.metrics, { played: 0, failures: 1 });
  assert.equal(audio.sources.size, 0);
});

test('generated noise samples and automation values stay finite', async () => {
  const { audio, context } = await unlocked();
  audio.play('stow'); audio.play('product-contact');
  for (const buffer of context.buffers) for (const sample of buffer.data) {
    assert.ok(Number.isFinite(sample)); assert.ok(Math.abs(sample) <= 1);
  }
  for (const node of context.nodes) for (const key of ['gain', 'frequency']) {
    for (const event of node[key].events) for (const value of event.slice(1)) assert.ok(Number.isFinite(value));
  }
});

test('close stops voices, closes the context and supports a fresh later session', async () => {
  const contexts = [];
  const audio = new SaleAudio({ contextFactory: () => { const context = new FakeContext(); contexts.push(context); return context; } });
  await audio.unlock(); audio.play('take');
  const first = contexts[0];
  await audio.close();
  assert.equal(first.closeCalls, 1);
  assert.equal(audio.sources.size, 0);
  assert.equal(audio.master, null);
  assert.ok(first.sources.every(source => source.stops.includes(0)));
  await audio.close();
  assert.equal(first.closeCalls, 1);
  assert.equal(await audio.unlock(), true);
  assert.equal(contexts.length, 2);
});
