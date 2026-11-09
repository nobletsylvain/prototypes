import test from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY_TIERS } from '../source/genetic-quality.mjs';
import { TIER_FEEDBACK, TIER_STEP_FEEDBACK, getTierFeedback, getTierStepFeedback, feedbackEnvelope } from '../source/tier-feedback.mjs';
import { createAudio } from '../source/audio.mjs';

test('six reveal profiles use the canonical tier colors and distinct sound and visual settings', () => {
  assert.deepEqual(Object.keys(TIER_FEEDBACK), ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary']);
  const sounds = new Set(), visuals = new Set();
  for (const tier of QUALITY_TIERS) {
    const profile = getTierFeedback(`reveal-${tier.id}`);
    assert.equal(profile.color, tier.color); assert.equal(profile.visual.color, tier.color);
    assert(Object.isFrozen(profile.audio.notes)); assert(Object.isFrozen(profile.visual.ringDelays));
    assert(profile.visual.particles <= 96); assert(profile.visual.duration <= 2.6);
    assert(profile.visual.wash <= .28); assert.equal(profile.visual.priority, 3);
    assert.equal(profile.audio.notes.length, profile.audio.delays.length);
    assert(profile.audio.delays.every(delay => delay >= 0));
    assert(profile.audio.delays.at(-1) + profile.audio.sustain < 2.6);
    sounds.add(JSON.stringify(profile.audio));
    visuals.add(JSON.stringify({ ...profile.visual, color: '' }));
  }
  assert.equal(sounds.size, 6); assert.equal(visuals.size, 6);
});

test('reveal intensity increases without changing a hidden score or specimen', () => {
  const profiles = QUALITY_TIERS.map(tier => TIER_FEEDBACK[tier.id]);
  for (let i = 1; i < profiles.length; i++) {
    assert(profiles[i].visual.duration > profiles[i - 1].visual.duration);
    assert(profiles[i].visual.particles > profiles[i - 1].visual.particles);
    assert(profiles[i].visual.strength > profiles[i - 1].visual.strength);
  }
  const privateValue = Object.defineProperty({}, 'geneticQuality', { get() { throw Error('Hidden score read'); } });
  assert.equal(getTierFeedback(privateValue), null);
  assert.equal(getTierStepFeedback(privateValue), null);
  assert.equal(getTierFeedback('charge-step'), null);
  assert.equal(getTierFeedback('tier-step-legendary'), null);
  assert.equal(getTierFeedback('reveal-unknown'), null);
  assert.equal(getTierFeedback('reveal-__proto__'), null);
  assert.equal(getTierFeedback('reveal-constructor'), null);
  assert.equal(getTierFeedback('reveal'), TIER_FEEDBACK.common);
});

test('six short traversed-stage cues remain distinct and separate from final revelations', () => {
  const pitches = new Set();
  for (const tier of QUALITY_TIERS) {
    const step = getTierStepFeedback(`tier-step-${tier.id}`);
    assert.equal(step, TIER_STEP_FEEDBACK[tier.id]); assert.equal(step.color, tier.color);
    assert.equal(step.visual.duration, .28); assert.equal(step.visual.priority, 2);
    assert.equal(step.visual.particles, 0); assert.equal(step.visual.wash, 0); assert.equal(step.visual.objectLift, 0);
    assert(step.audio.duration < .28); pitches.add(step.audio.hz);
  }
  assert.equal(pitches.size, 6); assert.equal(getTierStepFeedback('reveal-rare'), null);
  assert.equal(getTierStepFeedback('tier-step-invalid'), null);
  assert.equal(getTierStepFeedback('tier-step-__proto__'), null);
});

test('light envelopes have a single gradual peak and finite tails', () => {
  for (const profile of Object.values(TIER_FEEDBACK)) {
    const duration = profile.visual.duration;
    assert.equal(feedbackEnvelope(0, duration), 0); assert.equal(feedbackEnvelope(duration, duration), 0);
    assert.equal(feedbackEnvelope(duration + 1, duration), 0); assert.equal(feedbackEnvelope(-1, duration), 0);
    let previous = 0;
    for (let i = 1; i <= 100; i++) {
      const current = feedbackEnvelope(duration * i / 200, duration);
      assert(current >= previous && current <= 1); assert(current - previous < .026); previous = current;
    }
  }
  assert.equal(feedbackEnvelope(NaN, 1), 0); assert.equal(feedbackEnvelope(1, 0), 0);
});

class Parameter {
  value = 0; events = [];
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  exponentialRampToValueAtTime(value, time) { this.events.push(['ramp', value, time]); }
  setTargetAtTime(value, time, constant) { this.events.push(['target', value, time, constant]); }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
}
class AudioNode {
  constructor(context, kind) {
    this.kind = kind; this.context = context; this.frequency = new Parameter(); this.gain = new Parameter();
    this.Q = new Parameter(); this.pan = new Parameter(); this.stops = []; this.disconnected = false;
    for (const name of ['threshold', 'knee', 'ratio', 'attack', 'release']) this[name] = new Parameter();
    context.nodes.push(this);
  }
  connect() {}
  disconnect() { this.disconnected = true; }
  start(time = this.context.currentTime) { this.started = time; }
  stop(time = this.context.currentTime) { this.stops.push(time); }
}
class MockContext {
  static instances = [];
  currentTime = 1; sampleRate = 1000; state = 'suspended'; nodes = []; destination = {}; closed = false;
  constructor() { MockContext.instances.push(this); }
  async resume() { this.state = 'running'; }
  createGain() { return new AudioNode(this, 'gain'); }
  createDynamicsCompressor() { return new AudioNode(this, 'compressor'); }
  createBiquadFilter() { return new AudioNode(this, 'filter'); }
  createOscillator() { return new AudioNode(this, 'oscillator'); }
  createStereoPanner() { return new AudioNode(this, 'panner'); }
  createBufferSource() { return new AudioNode(this, 'buffer'); }
  createBuffer(channels, length, rate) { const data = new Float32Array(length); return { length, sampleRate: rate, getChannelData: () => data }; }
  close() { this.closed = true; this.state = 'closed'; }
  get sources() { return this.nodes.filter(node => node.kind === 'oscillator' || node.kind === 'buffer'); }
}
async function withAudio(callback) {
  const previous = globalThis.window; MockContext.instances = [];
  globalThis.window = { AudioContext: MockContext };
  const audio = createAudio();
  try { await callback(audio); } finally { audio.dispose(); if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
}

test('audio creates neither context nor synth before explicit unlock', async () => withAudio(async audio => {
  for (const tier of QUALITY_TIERS) { audio.play(`reveal-${tier.id}`); audio.play(`tier-step-${tier.id}`); }
  audio.setRevealCharge(.5, true); audio.setEnabled(true); audio.play('charge-step');
  assert.equal(MockContext.instances.length, 0);
  await audio.unlock(); assert.equal(MockContext.instances.length, 1);
  assert.equal(MockContext.instances[0].sources.length, 0);
}));

test('all six reveal motifs differ in full and discreet playback and terminate finitely', async () => withAudio(async audio => {
  await audio.unlock(); const context = MockContext.instances[0];
  for (const enhanced of [true, false]) {
    audio.setEnhanced(enhanced); const motifs = new Set();
    for (const tier of QUALITY_TIERS) {
      context.currentTime += 3; const before = context.sources.length;
      audio.play(`reveal-${tier.id}`);
      const sources = context.sources.slice(before), tones = sources.filter(source => source.kind === 'oscillator');
      motifs.add(JSON.stringify(tones.map(source => [source.frequency.events[0][1], source.started - context.currentTime])));
      assert(tones.length >= 2);
      assert(tones.every(source => source.stops.length === 1 && source.stops[0] <= context.currentTime + 2.6));
      assert(sources.filter(source => source.kind === 'buffer').every(source => source.buffer.length / source.buffer.sampleRate < 1));
    }
    assert.equal(motifs.size, 6);
  }
}));

test('tier steps preserve the continuous held voice; completed reveal ends it', async () => withAudio(async audio => {
  await audio.unlock(); const context = MockContext.instances[0];
  audio.setRevealCharge(.12, true); const held = [...context.sources]; assert.equal(held.length, 2);
  for (const tier of QUALITY_TIERS) { context.currentTime += .3; audio.play(`tier-step-${tier.id}`); }
  assert(held.every(source => source.stops.length === 0));
  audio.play('reveal-epic'); assert(held.every(source => source.stops.length > 0));
}));

test('release, mute, zero volume and dispose end held or scheduled sound', async () => withAudio(async audio => {
  await audio.unlock(); const context = MockContext.instances[0];
  audio.setRevealCharge(.4, true); const first = [...context.sources];
  audio.setRevealCharge(.4, false); assert(first.every(source => source.stops.length > 0));
  context.currentTime += 1; audio.setRevealCharge(.6, true); audio.play('reveal-legendary');
  audio.setEnabled(false); assert(context.sources.every(source => source.stops.length > 0));
  let count = context.sources.length; audio.play('reveal-rare'); assert.equal(context.sources.length, count);
  audio.setEnabled(true); audio.setRevealCharge(.5, true); audio.setVolume(0);
  assert(context.sources.every(source => source.stops.length > 0));
  count = context.sources.length; audio.play('reveal-epic'); assert.equal(context.sources.length, count);
  audio.setVolume(.5); audio.setRevealCharge(.7, true); audio.dispose();
  assert(context.closed); assert(context.sources.every(source => source.stops.length > 0));
  count = context.sources.length; await audio.unlock(); audio.play('reveal-common'); assert.equal(context.sources.length, count);
}));
