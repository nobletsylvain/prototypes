/** Original temporary synthesis. Audio never changes the ledger. */
export class SaleAudio {
  constructor({ contextFactory } = {}) {
    this.contextFactory = contextFactory || (() => {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      return AudioContextClass ? new AudioContextClass() : null;
    });
    this.context = null;
    this.master = null;
    this.muted = false;
    this.enhanced = true;
    this.serial = 0;
    this.sources = new Set();
    this.maxVoices = 24;
    this.metrics = { played: 0, failures: 0 };
  }

  async unlock() {
    try {
      if (!this.context) this.context = this.contextFactory();
      if (!this.context) return false;
      if (!this.master) {
        const master = this.context.createGain();
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.ratio.value = 7;
        master.gain.value = this.muted ? 0 : 0.34;
        master.connect(compressor);
        compressor.connect(this.context.destination);
        this.master = master;
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch { this.metrics.failures++; return false; }
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.34, this.context.currentTime, 0.02);
  }

  setEnhanced(value) { this.enhanced = Boolean(value); }

  envelope(duration, amplitude, start) {
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, amplitude), start + Math.min(0.012, duration * 0.15));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(this.master);
    return gain;
  }

  track(source, end) {
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
    source.stop(end);
  }

  noise(duration, amplitude, frequency, delay = 0) {
    const ctx = this.context;
    const start = ctx.currentTime + delay;
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 1349 + this.serial++ * 7919;
    for (let index = 0; index < samples.length; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      samples[index] = (seed / 2147483648) * (0.58 + 0.42 * Math.sin(index * 0.024));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 0.7;
    source.connect(filter); filter.connect(this.envelope(duration, amplitude, start));
    source.start(start); this.track(source, start + duration + 0.02);
  }

  tone(frequency, duration, amplitude, delay = 0, type = 'sine') {
    const start = this.context.currentTime + delay;
    const source = this.context.createOscillator();
    source.type = type; source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(frequency * 0.8, start + duration);
    source.connect(this.envelope(duration, amplitude, start));
    source.start(start); this.track(source, start + duration + 0.02);
  }

  play(event) {
    if (this.muted || this.context?.state !== 'running' || !this.master) return false;
    const type = typeof event === 'string' ? event : event?.type;
    const pickup = ['take', 'giveBill', 'giveProduct', 'retake', 'collect'].includes(type);
    const contact = ['paper-contact', 'product-contact', 'stow', 'cancelDrag'].includes(type);
    const sale = ['sale-to-hand', 'sale-to-tray'].includes(type);
    const voices = pickup ? (this.enhanced ? 2 : 1) : contact ? 2 : sale ? (this.enhanced ? 3 : 1) : 1;
    if (this.sources.size + voices > this.maxVoices) return false;
    const scale = this.enhanced ? 1 : 0.4;
    try {
      if (['take', 'giveBill', 'giveProduct', 'retake', 'collect'].includes(type)) {
        this.noise(0.13, 0.2 * scale, 2300);
        if (this.enhanced) this.noise(0.05, 0.09, 4100, 0.045);
      } else if (type === 'paper-contact') {
        this.noise(0.09, 0.23 * scale, 1200);
        this.tone(115, 0.055, 0.11 * scale);
      } else if (type === 'product-contact') {
        this.noise(0.07, 0.14 * scale, 2700);
        this.tone(85, 0.08, 0.17 * scale);
      } else if (['stow', 'cancelDrag'].includes(type)) {
        this.noise(0.19, 0.18 * scale, 1800);
        this.noise(0.055, 0.12 * scale, 750, 0.12);
      } else if (['sale-to-hand', 'sale-to-tray'].includes(type)) {
        this.noise(0.15, 0.18 * scale, 2500);
        if (this.enhanced) { this.tone(520, 0.16, 0.055); this.tone(780, 0.2, 0.05, 0.06); }
      } else if (['declined', 'error', 'refused'].includes(type)) {
        this.tone(165, 0.07, 0.07 * scale, 0, 'triangle');
      } else if (['talk', 'propose', 'adjustPrice'].includes(type)) {
        this.noise(0.035, 0.07 * scale, 1200);
      } else return false;
      this.metrics.played++;
      return true;
    } catch { this.metrics.failures++; return false; }
  }

  async close() {
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
    if (this.context && this.context.state !== 'closed') await this.context.close();
    this.context = null;
    this.master = null;
  }
}
