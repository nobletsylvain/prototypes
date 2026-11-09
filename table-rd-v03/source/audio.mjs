export function createAudio() {
  let context, master, compressor, enabled = false, volume = 0.35, enhanced = true;
  let lastPlayed = -1, lastKind = '';
  let chargeVoice = null, chargeProgress = 0, chargeActive = false, disposed = false;
  const voices = new Set();
  async function unlock() {
    if (disposed) return;
    if (!context) {
      const AudioContextType = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextType) throw new Error('Web Audio is unavailable.');
      context = new AudioContextType(); master = context.createGain(); compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -14; compressor.knee.value = 18; compressor.ratio.value = 4; compressor.attack.value = 0.006; compressor.release.value = 0.18;
      master.connect(compressor); compressor.connect(context.destination);
    }
    await context.resume(); enabled = true; master.gain.setTargetAtTime(volume, context.currentTime, 0.02);
  }
  function stopCharge(fade = 0.065) {
    chargeActive = false;
    const voice = chargeVoice;
    chargeVoice = null;
    if (!voice || !context) return;
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, Math.max(0.004, fade / 3));
    voice.oscillators.forEach(oscillator => { try { oscillator.stop(now + fade + 0.015); } catch { /* The voice has already ended. */ } });
  }
  function setRevealCharge(progress = 0, active = false) {
    chargeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    const shouldPlay = !!active && chargeProgress > 0 && chargeProgress < 1 && enabled && volume > 0 && context?.state === 'running' && !disposed;
    if (!shouldPlay) { stopCharge(); return; }
    chargeActive = true;
    if (!chargeVoice) {
      const gain = context.createGain(), filter = context.createBiquadFilter();
      const oscillators = [context.createOscillator(), context.createOscillator()];
      filter.type = 'lowpass'; filter.Q.value = 0.5;
      filter.frequency.value = 620 + chargeProgress * 900;
      gain.gain.value = 0.0001;
      filter.connect(gain); gain.connect(master);
      let remaining = oscillators.length;
      oscillators.forEach((oscillator, index) => {
        oscillator.type = index ? 'triangle' : 'sine';
        oscillator.frequency.value = (128 + chargeProgress * 138) * (index ? 1.5 : 1);
        oscillator.connect(filter); voices.add(oscillator);
        oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); if (--remaining === 0) { filter.disconnect(); gain.disconnect(); } };
        oscillator.start(context.currentTime);
      });
      chargeVoice = { gain, filter, oscillators };
    }
    const now = context.currentTime, pitch = 128 + chargeProgress * 138;
    const amplitude = (0.022 + chargeProgress * 0.035) * (enhanced ? 1 : 0.3);
    chargeVoice.gain.gain.cancelScheduledValues(now);
    chargeVoice.gain.gain.setTargetAtTime(amplitude, now, 0.035);
    chargeVoice.filter.frequency.cancelScheduledValues(now);
    chargeVoice.filter.frequency.setTargetAtTime(620 + chargeProgress * 900, now, 0.045);
    chargeVoice.oscillators.forEach((oscillator, index) => {
      oscillator.frequency.cancelScheduledValues(now);
      oscillator.frequency.setTargetAtTime(pitch * (index ? 1.5 : 1), now, 0.045);
    });
  }
  function route(source, gain, pan) {
    const panner = context.createStereoPanner ? context.createStereoPanner() : null;
    source.connect(gain);
    if (panner) { panner.pan.value = pan; gain.connect(panner); panner.connect(master); } else gain.connect(master);
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); panner?.disconnect(); };
  }
  function tone(hz, duration, amplitude, { type = 'sine', delay = 0, end = hz * 0.82, pan = 0, attack = 0.014 } = {}) {
    const start = context.currentTime + delay, oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(hz, start); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + duration);
    gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, amplitude), start + attack); gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    route(oscillator, gain, pan); oscillator.start(start); oscillator.stop(start + duration + 0.03);
  }
  function noise(duration, amplitude, frequency, { delay = 0, pan = 0, lowpass = false, swell = false } = {}) {
    const length = Math.max(1, Math.floor(context.sampleRate * duration)), buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) { const t = i / length; data[i] = (Math.random() * 2 - 1) * (swell ? Math.sin(Math.PI * t) ** 1.5 : (1 - t) ** 2); }
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer; filter.type = lowpass ? 'lowpass' : 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 0.7; gain.gain.value = amplitude;
    source.connect(filter); filter.connect(gain);
    const panner = context.createStereoPanner ? context.createStereoPanner() : null;
    if (panner) { panner.pan.value = pan; gain.connect(panner); panner.connect(master); } else gain.connect(master);
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); panner?.disconnect(); };
    source.start(context.currentTime + delay);
  }
  function reveal(tier) {
    const strength = enhanced ? 1 : 0.38, rare = tier === 'rare', exceptional = tier === 'exceptional';
    tone(exceptional ? 105 : rare ? 130 : 175, 0.22, 0.15 * strength, { end: 70 }); noise(0.28, 0.24 * strength, 1300, { swell: true });
    const pitches = exceptional ? [392, 587.33, 783.99, 1174.66] : rare ? [440, 659.25, 880] : [523.25, 783.99];
    for (let i = 0; i < (enhanced ? pitches.length : 1); i++) tone(pitches[i], exceptional ? 1.15 : rare ? 0.9 : 0.58, (0.082 - i * 0.012) * strength, { delay: 0.08 + i * 0.095, end: pitches[i] * 0.997, pan: (i % 2 ? 1 : -1) * 0.25, attack: 0.025 });
    if (enhanced && (rare || exceptional)) { noise(exceptional ? 1.05 : 0.75, 0.12, 3900, { delay: 0.1, swell: true, pan: 0.2 }); tone(exceptional ? 1567.98 : 1318.5, 0.7, 0.022, { delay: 0.43, end: exceptional ? 1560 : 1310, pan: -0.24, attack: 0.04 }); }
  }
  function play(kind = 'contact') {
    if (kind === 'reveal' || kind.startsWith('reveal-')) stopCharge(0.025);
    if (!enabled || !context || context.state !== 'running') return;
    const now = context.currentTime;
    if (kind === lastKind && now - lastPlayed < 0.075) return;
    lastPlayed = now; lastKind = kind;
    const strength = enhanced ? 1 : 0.42;
    switch (kind) {
      case 'charge-step': noise(0.045, 0.1 * strength, 1300, { lowpass: true }); tone(440, 0.11, 0.036 * strength, { end: 438 }); if (enhanced) tone(660, 0.17, 0.018, { delay: 0.015, end: 658 }); break;
      case 'paper': noise(0.22, 0.36 * strength, 1800, { pan: -0.15 }); tone(175, 0.08, 0.04 * strength); break;
      case 'select': noise(0.065, 0.16 * strength, 2100); tone(690, 0.12, 0.045 * strength, { end: 640 }); break;
      case 'start': noise(0.15, 0.33 * strength, 720, { lowpass: true }); tone(125, 0.19, 0.14 * strength, { end: 75 }); if (enhanced) noise(0.5, 0.09, 1700, { delay: 0.07, swell: true }); break;
      case 'ready': noise(0.18, 0.14 * strength, 2800, { swell: true }); tone(659.25, 0.45, 0.065 * strength, { end: 657 }); if (enhanced) tone(987.77, 0.55, 0.042, { delay: 0.11, end: 984, pan: 0.15 }); break;
      case 'harvest': noise(0.12, 0.38 * strength, 3300); noise(0.24, 0.2 * strength, 900, { delay: 0.07, lowpass: true, pan: -0.1 }); tone(190, 0.16, 0.09 * strength, { delay: 0.09, end: 105 }); break;
      case 'point': tone(880, 0.24, 0.06 * strength, { end: 879, pan: -0.15 }); if (enhanced) tone(1320, 0.4, 0.04, { delay: 0.07, end: 1315, pan: 0.15 }); break;
      case 'upgrade': noise(0.12, 0.22 * strength, 1200, { lowpass: true }); tone(210, 0.16, 0.1 * strength, { end: 140 }); tone(587.33, 0.5, 0.08 * strength, { delay: 0.06, end: 586 }); if (enhanced) tone(880, 0.65, 0.05, { delay: 0.14, end: 877, pan: 0.2 }); break;
      case 'reveal': case 'reveal-common': reveal('common'); break;
      case 'reveal-rare': reveal('rare'); break;
      case 'reveal-exceptional': reveal('exceptional'); break;
      case 'sign': noise(0.3, 0.27 * strength, 3200); tone(165, 0.18, 0.1 * strength, { delay: 0.25, end: 105 }); if (enhanced) tone(523.25, 0.4, 0.035, { delay: 0.3, end: 521 }); break;
      case 'refuse': tone(155, 0.14, 0.05, { end: 120 }); break;
      default: tone(210, 0.16, 0.12 * strength, { end: 105 }); noise(0.07, 0.23 * strength, 820, { lowpass: true });
    }
  }
  return {
    unlock, get enabled() { return enabled; },
    setEnabled(value) { enabled = !!value && !disposed; if (!enabled) stopCharge(0.025); if (master && context) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, 0.025); },
    setVolume(value) { volume = Math.max(0, Math.min(1, Number(value) || 0)); if (volume === 0) stopCharge(0.025); if (master && context) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, 0.025); },
    setEnhanced(value) { enhanced = !!value; if (chargeActive) setRevealCharge(chargeProgress, true); }, play, setRevealCharge,
    dispose() { disposed = true; enabled = false; stopCharge(0); voices.forEach(source => { try { source.stop(); } catch { /* Already stopped. */ } }); voices.clear(); master?.disconnect(); compressor?.disconnect(); context?.close(); }
  };
}
