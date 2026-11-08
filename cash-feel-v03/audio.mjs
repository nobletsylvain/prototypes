const clamp = (value, low, high) => Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));

/** Temporary synthesized cues, driven by the actual material events. */
export class CashAudio {
  constructor({ contextFactory, visibilityTarget } = {}) {
    this.contextFactory = contextFactory ?? (() => {
      const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      return AudioContextClass ? new AudioContextClass() : null;
    });
    this.visibilityTarget = visibilityTarget ?? globalThis.document;
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.enabled = true;
    this.volume = 0.55;
    this.voices = new Set();
    this.buffers = new Map();
    this.serial = 0;
    this.pendingUnlock = null;
    this.counters = { paper: 0, tick: 0, bundle: 0, contact: 0, refuse: 0, sources: 0, stopped: 0, errors: 0, peakVoices: 0 };
    this.visibilityTarget?.addEventListener?.('visibilitychange', () => {
      if (this.visibilityTarget.hidden) this.stop();
    });
  }

  async unlock() {
    if (this.pendingUnlock) return this.pendingUnlock;
    this.pendingUnlock = this.unlockContext();
    try { return await this.pendingUnlock; }
    finally { this.pendingUnlock = null; }
  }

  async unlockContext() {
    try {
      if (!this.context) {
        this.context = this.contextFactory();
        if (!this.context) return false;
        this.master = this.context.createGain();
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 8;
        this.compressor.ratio.value = 8;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.11;
        this.master.gain.value = this.enabled ? this.volume * 0.32 : 0;
        this.master.connect(this.compressor);
        this.compressor.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch {
      this.counters.errors++;
      return false;
    }
  }

  setVolume(value) {
    this.volume = clamp(value, 0, 1);
    this.updateMaster();
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    if (!this.enabled) this.stop();
    this.updateMaster();
  }

  updateMaster() {
    if (!this.master || !this.context) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.enabled ? this.volume * 0.32 : 0, now, 0.015);
  }

  get ready() {
    return Boolean(this.context?.state === 'running' && this.enabled && this.volume > 0 && !this.visibilityTarget?.hidden);
  }

  begin(event) {
    if (!this.ready) return false;
    this.counters[event]++;
    this.serial++;
    return true;
  }

  paper(strength = 1) {
    if (!this.begin('paper')) return false;
    const amount = clamp(strength, 0.1, 2);
    this.noise(0.11 + amount * 0.025, 0.24 * amount, 1450 + (this.serial % 5) * 110, this.serial % 4);
    return true;
  }

  tick(index = 0) {
    if (!this.begin('tick')) return false;
    const beat = Math.abs(Math.trunc(Number.isFinite(index) ? index : 0)) % 8;
    const accent = beat === 0 ? 1.13 : beat === 4 ? 1.06 : 1;
    this.noise(0.035 + (beat % 3) * 0.003, 0.43 * accent, 2200 + beat * 83, beat % 4);
    this.tone(135 + beat * 7, 0.028, 0.17 * accent, 'triangle');
    return true;
  }

  bundle() {
    if (!this.begin('bundle')) return false;
    this.noise(0.58, 0.32, 950, 2);
    this.tone(115, 0.18, 0.25, 'sine');
    this.noise(0.025, 0.48, 3100, 1, 0.65);
    this.tone(390, 0.075, 0.11, 'triangle', 0.65, 180);
    return true;
  }

  contact(dense = false) {
    if (!this.begin('contact')) return false;
    if (dense) {
      this.tone(94, 0.13, 0.43, 'sine', 0, 48);
      this.noise(0.055, 0.31, 1050, this.serial % 4);
    } else {
      this.noise(0.065, 0.18, 1850, this.serial % 4);
    }
    return true;
  }

  refuse() {
    if (!this.begin('refuse')) return false;
    this.tone(170, 0.065, 0.12, 'sine', 0, 120);
    return true;
  }

  noise(duration, amount, frequency, variant = 0, delay = 0) {
    const key = `${duration}:${variant}`;
    let buffer = this.buffers.get(key);
    if (!buffer) {
      const length = Math.max(1, Math.ceil(this.context.sampleRate * duration));
      buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      let state = (7919 + variant * 104729) >>> 0;
      for (let index = 0; index < length; index++) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const grain = index % 41 < 6 ? 0.65 : 1;
        data[index] = ((state / 4294967296) * 2 - 1) * grain;
      }
      if (this.buffers.size >= 20) this.buffers.delete(this.buffers.keys().next().value);
      this.buffers.set(key, buffer);
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    this.schedule(source, duration, amount, delay, filter);
  }

  tone(frequency, duration, amount, type, delay = 0, endFrequency = frequency) {
    const source = this.context.createOscillator();
    source.type = type;
    const start = this.context.currentTime + delay;
    source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    this.schedule(source, duration, amount, delay);
  }

  schedule(source, duration, amount, delay, filter = null) {
    while (this.voices.size >= 32) this.finishVoice(this.voices.values().next().value, true);
    const start = this.context.currentTime + delay;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(amount, start + Math.min(0.005, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.gain.setValueAtTime(0, start + duration + 0.004);
    const nodes = filter ? [source, filter, gain] : [source, gain];
    if (filter) { source.connect(filter); filter.connect(gain); }
    else source.connect(gain);
    gain.connect(this.master);
    const voice = { source, nodes };
    this.voices.add(voice);
    this.counters.sources++;
    this.counters.peakVoices = Math.max(this.counters.peakVoices, this.voices.size);
    source.onended = () => this.finishVoice(voice, false);
    source.start(start);
    source.stop(start + duration + 0.006);
  }

  finishVoice(voice, stopSource) {
    if (!this.voices.delete(voice)) return;
    voice.source.onended = null;
    if (stopSource) {
      try { voice.source.stop(this.context.currentTime); } catch { /* It may already have ended. */ }
      this.counters.stopped++;
    }
    for (const node of voice.nodes) node.disconnect();
  }

  stop() {
    for (const voice of [...this.voices]) this.finishVoice(voice, true);
  }

  get metrics() {
    return {
      ...this.counters,
      activeVoices: this.voices.size,
      cachedBuffers: this.buffers.size,
      enabled: this.enabled,
      volume: this.volume,
      ready: this.ready,
      state: this.context?.state ?? 'locked',
      totalEvents: this.counters.paper + this.counters.tick + this.counters.bundle + this.counters.contact + this.counters.refuse,
    };
  }
}
