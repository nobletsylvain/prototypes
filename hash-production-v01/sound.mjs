export function createSound() {
  let context, master, enabled = true, running = false;
  let motor, motorGain, grainSource, grainGain, pressTone, pressGain;
  let noiseBuffer;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value || 0));
  function initialize() {
    if (context) return;
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    context = new Audio();
    master = context.createGain(); master.gain.value = enabled ? 0.45 : 0; master.connect(context.destination);
    noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < channel.length; i++) { smooth = (smooth + (Math.random() * 2 - 1) * 0.15) / 1.15; channel[i] = smooth * 3; }
    motor = context.createOscillator(); motor.type = 'triangle'; motor.frequency.value = 48;
    motorGain = context.createGain(); motorGain.gain.value = 0; motor.connect(motorGain); motorGain.connect(master); motor.start();
    grainSource = context.createBufferSource(); grainSource.buffer = noiseBuffer; grainSource.loop = true;
    const grainFilter = context.createBiquadFilter(); grainFilter.type = 'highpass'; grainFilter.frequency.value = 1700;
    grainGain = context.createGain(); grainGain.gain.value = 0; grainSource.connect(grainFilter); grainFilter.connect(grainGain); grainGain.connect(master); grainSource.start();
    pressTone = context.createOscillator(); pressTone.type = 'sine'; pressTone.frequency.value = 125;
    pressGain = context.createGain(); pressGain.gain.value = 0; pressTone.connect(pressGain); pressGain.connect(master); pressTone.start();
  }
  async function unlock() {
    try { initialize(); if (context?.state === 'suspended') await context.resume(); running = context?.state === 'running'; } catch { running = false; }
    return running;
  }
  function tone(frequency, duration, amplitude, endFrequency = frequency, type = 'sine') {
    if (!context || !running || !enabled) return;
    const now = context.currentTime, source = context.createOscillator(), gain = context.createGain();
    source.type = type; source.frequency.setValueAtTime(frequency, now); source.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, amplitude), now + 0.004); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(gain); gain.connect(master); source.start(); source.stop(now + duration + 0.01); source.onended = () => { source.disconnect(); gain.disconnect(); };
  }
  function noise(duration, amplitude, frequency = 1600, filterType = 'bandpass') {
    if (!context || !running || !enabled) return;
    const now = context.currentTime, source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noiseBuffer; source.playbackRate.value = 0.85 + Math.random() * 0.3;
    filter.type = filterType; filter.frequency.value = frequency; filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, amplitude), now + 0.006); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(master); source.start(0, Math.random() * 0.5); source.stop(now + duration + 0.01);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  function play(name, strength = 1) {
    strength = clamp(strength, 0.05, 1.5);
    if (name === 'impact' || name === 'contact') { tone(100 + strength * 35, 0.12, strength * 0.22, 50); noise(0.075, strength * 0.14, 850); }
    else if (name === 'crank' || name === 'impulse') { tone(310, 0.065, strength * 0.10, 180, 'triangle'); noise(0.085, strength * 0.08, 2600); }
    else if (name === 'jar' || name === 'take' || name === 'deposit') { tone(630, 0.11, 0.09 * strength, 420); noise(0.045, 0.06 * strength, 2200); }
    else if (name === 'load') { noise(0.4, 0.18 * strength, 2200); tone(135, 0.1, 0.06, 90); }
    else if (name === 'finish' || name === 'pressComplete') { tone(90, 0.19, 0.24 * strength, 48); noise(0.1, 0.14 * strength, 750); }
    else if (name === 'eject') { noise(0.19, 0.14 * strength, 1850); tone(175, 0.16, 0.08 * strength, 105); }
    else if (name === 'film' || name === 'wrap') { noise(0.24, 0.29 * strength, 3400, 'highpass'); setTimeout(() => { noise(0.055, 0.23 * strength, 4700, 'highpass'); tone(410, 0.05, 0.045, 250); }, 240); }
    else if (name === 'open' || name === 'cut') { noise(0.16, 0.24 * strength, 3200, 'highpass'); tone(780, 0.04, 0.025, 340); }
    else if (name === 'drawer' || name === 'format') { noise(0.22, 0.13 * strength, 650); tone(120, 0.1, 0.09, 80); }
    else if (name === 'overflow') noise(0.18, 0.12 * strength, 2800);
    else if (name === 'refuse') tone(145, 0.12, 0.06, 110, 'triangle');
    else tone(500, 0.045, 0.025 * strength, 370);
  }
  function update(dt, view = {}) {
    if (!context || !running) return;
    const now = context.currentTime, speed = clamp(view.drumSpeed / 9);
    motor.frequency.setTargetAtTime(36 + speed * 68, now, 0.08);
    motorGain.gain.setTargetAtTime(speed * 0.065, now, 0.09);
    grainGain.gain.setTargetAtTime(view.pouring || view.loading ? 0.15 : speed * 0.027, now, 0.025);
    pressTone.frequency.setTargetAtTime(160 - clamp(view.compression) * 95, now, 0.1);
    pressGain.gain.setTargetAtTime(view.pressing ? 0.024 + clamp(view.compression) * 0.025 : 0, now, 0.06);
  }
  function setEnabled(value) { enabled = !!value; if (master) master.gain.setTargetAtTime(enabled ? 0.45 : 0, context.currentTime, 0.02); }
  function dispose() { running = false; if (context) context.close(); context = null; }
  return { unlock, setEnabled, update, play, dispose, getState: () => ({ enabled, running, sampleRate: context?.sampleRate || null }) };
}
