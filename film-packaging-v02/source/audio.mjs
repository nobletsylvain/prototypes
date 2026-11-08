const SAMPLE_RATE = 44100;
const EVENTS = Object.freeze({
  pickup: { duration: .095, gain: .22, tone: 145, noise: .48 },
  wrapStart: { duration: .42, gain: .42, tone: 0, noise: 1 },
  wrapFinish: { duration: .075, gain: .28, tone: 380, noise: .8 },
  place: { duration: .16, gain: .35, tone: 102, noise: .48 },
  openStart: { duration: .28, gain: .32, tone: 0, noise: 1 },
  openFinish: { duration: .10, gain: .2, tone: 170, noise: .7 },
  refuse: { duration: .11, gain: .11, tone: 185, noise: .08 }
});

/** Finite one-shot sounds for the prototype; not final production recordings. */
export function synthesizeEvent(event, durationSeconds, enhanced = true, seed = 2039) {
  const spec = EVENTS[event];
  if (!spec) return null;
  const requested = Number.isFinite(durationSeconds) ? durationSeconds : spec.duration;
  const duration = event === 'wrapStart' ? Math.max(.08, Math.min(.52, requested)) : spec.duration;
  const samples = new Float32Array(Math.ceil(duration * SAMPLE_RATE));
  let state = seed >>> 0, low = 0, previous = 0;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296 * 2 - 1; };
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE, u = i / (samples.length - 1), noise = random();
    low += .12 * (noise - low);
    const high = noise - previous; previous = noise;
    const attack = Math.sin(Math.min(1, u / .035) * Math.PI / 2) ** 2;
    const release = Math.sin(Math.min(1, (1 - u) / .11) * Math.PI / 2) ** 2;
    let body, envelope;
    if (event === 'wrapStart' || event === 'openStart') {
      const folds = .24 + .76 * Math.sin((u * 7.2 + .12) * Math.PI) ** 8;
      const grain = (event === 'openStart' ? .38 : .56) * high + .7 * low;
      body = grain * (enhanced ? folds : .4);
      envelope = attack * release * (.85 - .45 * u);
    } else {
      const pitch = spec.tone * (1 - .35 * u);
      const tone = Math.sin(2 * Math.PI * pitch * t);
      body = tone * (1 - spec.noise) + (event === 'place' ? low : high * .4 + low * .3) * spec.noise;
      envelope = attack * release * Math.exp(-u * (event === 'wrapFinish' ? 6 : 4));
    }
    samples[i] = Math.max(-.6, Math.min(.6, body * envelope * spec.gain * (enhanced ? 1 : .5)));
  }
  samples[0] = 0; samples[samples.length - 1] = 0;
  return { samples, sampleRate: SAMPLE_RATE, duration: samples.length / SAMPLE_RATE, event };
}

export class WorkshopAudio {
  constructor() {
    this.context = null; this.master = null; this.enabled = false;
    this.volume = .55; this.enhanced = true; this.voices = new Set(); this.sequence = 1;
  }
  async enable() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    if (!this.context) {
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -12; compressor.knee.value = 5;
      compressor.ratio.value = 12; compressor.attack.value = .002; compressor.release.value = .08;
      this.master.connect(compressor); compressor.connect(this.context.destination);
    }
    try { await this.context.resume(); this.enabled = this.context.state === 'running'; }
    catch { this.enabled = false; }
    return this.enabled;
  }
  setVolume(value) {
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .55;
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .015);
  }
  setEnhanced(value) { this.enhanced = Boolean(value); }
  play(event, durationSeconds) {
    if (!this.enabled || !this.context || this.context.state !== 'running' || this.volume === 0) return false;
    const data = synthesizeEvent(event, durationSeconds, this.enhanced, this.sequence++ * 3907);
    if (!data) return false;
    while (this.voices.size >= 4) {
      const oldest = this.voices.values().next().value;
      try { oldest.stop(); } catch { /* The source may have already ended. */ }
      oldest.disconnect(); this.voices.delete(oldest);
    }
    const buffer = this.context.createBuffer(1, data.samples.length, data.sampleRate);
    buffer.copyToChannel(data.samples, 0);
    const source = this.context.createBufferSource(); source.buffer = buffer; source.loop = false;
    source.connect(this.master); this.voices.add(source);
    source.onended = () => { source.disconnect(); this.voices.delete(source); };
    source.start(); return true;
  }
  stopAll() {
    for (const voice of this.voices) { try { voice.stop(); } catch {} voice.disconnect(); }
    this.voices.clear();
  }
  setEnabled(value) {
    this.enabled = Boolean(value) && this.context?.state === 'running';
    if (!this.enabled) this.stopAll();
  }
}
