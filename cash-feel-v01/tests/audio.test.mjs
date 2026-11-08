import test from 'node:test';
import assert from 'node:assert/strict';
import { CashAudio } from '../audio.mjs';

class FakeParam {
  constructor() { this.value = 0; this.events = []; }
  record(name, ...args) { assert(args.every(Number.isFinite)); this.events.push([name, ...args]); }
  setValueAtTime(...args) { this.record('set', ...args); }
  linearRampToValueAtTime(...args) { this.record('linear', ...args); }
  exponentialRampToValueAtTime(...args) { assert(args[0] > 0); this.record('exponential', ...args); }
  setTargetAtTime(...args) { this.record('target', ...args); }
  cancelScheduledValues(...args) { this.record('cancel', ...args); }
}

class FakeNode {
  constructor() {
    for (const key of ['gain', 'frequency', 'Q', 'threshold', 'knee', 'ratio', 'attack', 'release']) this[key] = new FakeParam();
    this.connections = [];
    this.disconnected = false;
  }
  connect(node) { this.connections.push(node); }
  disconnect() { this.disconnected = true; }
  start(time) { this.startTime = time; }
  stop(time) { this.stopTime = time; }
  finish() { this.onended?.(); }
}

class FakeContext {
  constructor() { this.state = 'suspended'; this.sampleRate = 24000; this.currentTime = 3; this.destination = {}; this.nodes = []; this.buffers = []; this.resumes = 0; }
  node() { const node = new FakeNode(); this.nodes.push(node); return node; }
  createGain() { return this.node(); }
  createDynamicsCompressor() { return this.node(); }
  createBufferSource() { return this.node(); }
  createBiquadFilter() { return this.node(); }
  createOscillator() { return this.node(); }
  createBuffer(channels, length, rate) {
    assert.equal(channels, 1); assert.equal(rate, this.sampleRate);
    const data = new Float32Array(length);
    const buffer = { getChannelData: () => data };
    this.buffers.push(buffer); return buffer;
  }
  async resume() { this.resumes++; this.state = 'running'; }
}

function fixture() {
  const context = new FakeContext();
  const visibility = { hidden: false, addEventListener(type, listener) { assert.equal(type, 'visibilitychange'); this.listener = listener; } };
  const audio = new CashAudio({ contextFactory: () => context, visibilityTarget: visibility });
  return { audio, context, visibility };
}

test('No audio context or cue starts before the gesture unlock', async () => {
  let creations = 0;
  const audio = new CashAudio({ contextFactory: () => { creations++; return new FakeContext(); } });
  assert.equal(audio.paper(), false);
  assert.equal(audio.tick(), false);
  assert.equal(creations, 0);
  assert.equal(audio.metrics.state, 'locked');
  assert.equal(await audio.unlock(), true);
  assert.equal(creations, 1);
  assert.equal(audio.metrics.enabled, true);
  assert.equal(audio.metrics.sources, 0);
});

test('Repeated unlock shares one context and one resume', async () => {
  const { audio, context } = fixture();
  assert.deepEqual(await Promise.all([audio.unlock(), audio.unlock()]), [true, true]);
  await audio.unlock();
  assert.equal(context.resumes, 1);
  assert.equal(context.nodes.length, 2);
});

test('Each real machine tick creates a finite paper and mechanical cue', async () => {
  const { audio, context } = fixture(); await audio.unlock();
  for (let i = 0; i < 8; i++) audio.tick(i);
  assert.equal(audio.metrics.tick, 8);
  assert.equal(audio.metrics.sources, 16);
  for (const node of context.nodes.filter(node => node.startTime !== undefined)) {
    assert(node.stopTime > node.startTime);
    assert(node.stopTime - node.startTime < 0.08);
    assert.notEqual(node.loop, true);
  }
});

test('Band closure has a delayed finite snap; dense contact includes body', async () => {
  const { audio, context } = fixture(); await audio.unlock();
  audio.bundle();
  assert.equal(audio.metrics.bundle, 1);
  assert.equal(audio.metrics.sources, 4);
  assert(context.nodes.some(node => node.startTime > context.currentTime));
  const before = audio.metrics.sources;
  audio.contact(true); assert.equal(audio.metrics.sources - before, 2);
  audio.contact(false); assert.equal(audio.metrics.sources - before, 3);
});

test('Mute stops all voices and suppresses new events until enabled', async () => {
  const { audio } = fixture(); await audio.unlock();
  audio.paper(); audio.bundle();
  audio.setEnabled(false);
  assert.equal(audio.metrics.activeVoices, 0);
  const count = audio.metrics.totalEvents;
  assert.equal(audio.tick(), false);
  assert.equal(audio.metrics.totalEvents, count);
  audio.setEnabled(true); assert.equal(audio.tick(), true);
});

test('Hidden tabs stop pending cues and cannot schedule further cues', async () => {
  const { audio, visibility } = fixture(); await audio.unlock();
  audio.bundle(); visibility.hidden = true; visibility.listener();
  assert.equal(audio.metrics.activeVoices, 0);
  assert.equal(audio.paper(), false);
  visibility.hidden = false;
  assert.equal(audio.paper(), true);
});

test('Ended sources disconnect and repeated stop is harmless', async () => {
  const { audio, context } = fixture(); await audio.unlock(); audio.tick();
  const sources = context.nodes.filter(node => node.startTime !== undefined);
  for (const source of sources) source.finish();
  assert.equal(audio.metrics.activeVoices, 0);
  assert(sources.every(source => source.disconnected));
  audio.stop(); audio.stop();
  assert.equal(audio.metrics.stopped, 0);
});

test('Rapid interaction keeps finite voice and buffer budgets', async () => {
  const { audio } = fixture(); await audio.unlock();
  for (let i = 0; i < 1000; i++) { audio.tick(i); audio.paper((i % 100) / 50); }
  assert(audio.metrics.activeVoices <= 32);
  assert(audio.metrics.peakVoices <= 32);
  assert(audio.metrics.cachedBuffers <= 20);
  audio.stop(); assert.equal(audio.metrics.activeVoices, 0);
});

test('Noise variation is deterministic, bounded and non-silent', async () => {
  const a = fixture(); const b = fixture(); await a.audio.unlock(); await b.audio.unlock();
  a.audio.tick(3); b.audio.tick(3);
  const first = a.context.buffers[0].getChannelData(0);
  assert.deepEqual(first, b.context.buffers[0].getChannelData(0));
  assert(first.some(value => Math.abs(value) > 0.1));
  assert(first.every(value => Number.isFinite(value) && Math.abs(value) <= 1));
  a.audio.tick(4);
  assert.notDeepEqual(first, a.context.buffers[1].getChannelData(0));
});

test('Volume is clamped and a compressor is wired after the master', async () => {
  const { audio, context } = fixture(); await audio.unlock();
  audio.setVolume(10); assert.equal(audio.metrics.volume, 1);
  audio.setVolume(-2); assert.equal(audio.metrics.volume, 0); assert.equal(audio.tick(), false);
  audio.setVolume(NaN); assert.equal(audio.metrics.volume, 0);
  assert.equal(audio.master.connections[0], audio.compressor);
  assert.equal(audio.compressor.connections[0], context.destination);
  assert.equal(audio.compressor.ratio.value, 8);
});

test('Unavailable or rejected audio leaves the rest of the demo usable', async () => {
  const unavailable = new CashAudio({ contextFactory: () => null });
  assert.equal(await unavailable.unlock(), false);
  const rejected = new CashAudio({ contextFactory: () => { throw new Error('Unavailable'); } });
  assert.equal(await rejected.unlock(), false);
  assert.equal(rejected.metrics.errors, 1);
  assert.equal(rejected.refuse(), false);
});
