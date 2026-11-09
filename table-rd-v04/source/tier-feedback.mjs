import { QUALITY_TIERS } from './genetic-quality.mjs';

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

// Presentation tuning only. These profiles never score, reroll or alter a specimen.
const SETTINGS = {
  poor: {
    visual: { duration: .78, strength: .34, particles: 6, ringDelays: [0], ringExpansion: .35, halo: .035, wash: .055, particleSize: .022, spread: .08, lift: .10, pattern: 'settle' },
    audio: { body: 148, bodyGain: .075, noise: 650, noiseGain: .08, noiseDuration: .075, notes: [293.66], delays: [.075], sustain: .26, noteGain: .046, type: 'sine', air: 0 },
  },
  common: {
    visual: { duration: 1.05, strength: .52, particles: 18, ringDelays: [0], ringExpansion: .62, halo: .075, wash: .10, particleSize: .028, spread: .16, lift: .18, pattern: 'rise' },
    audio: { body: 174, bodyGain: .09, noise: 1050, noiseGain: .12, noiseDuration: .12, notes: [392, 523.25], delays: [.07, .18], sustain: .38, noteGain: .052, type: 'sine', air: 0 },
  },
  uncommon: {
    visual: { duration: 1.4, strength: .68, particles: 34, ringDelays: [0, .24], ringExpansion: .85, halo: .13, wash: .14, particleSize: .033, spread: .23, lift: .25, pattern: 'rise' },
    audio: { body: 164, bodyGain: .105, noise: 1650, noiseGain: .15, noiseDuration: .18, notes: [440, 659.25, 880], delays: [.08, .20, .39], sustain: .50, noteGain: .058, type: 'sine', air: .035 },
  },
  rare: {
    visual: { duration: 1.75, strength: .83, particles: 52, ringDelays: [0, .31], ringExpansion: 1.06, halo: .19, wash: .19, particleSize: .038, spread: .28, lift: .31, pattern: 'arc' },
    audio: { body: 130.81, bodyGain: .12, noise: 2100, noiseGain: .18, noiseDuration: .22, notes: [523.25, 659.25, 1046.5], delays: [.06, .24, .47], sustain: .68, noteGain: .064, type: 'triangle', air: .055 },
  },
  epic: {
    visual: { duration: 2.12, strength: .97, particles: 74, ringDelays: [0, .36, .72], ringExpansion: 1.25, halo: .245, wash: .24, particleSize: .043, spread: .32, lift: .38, pattern: 'orbit' },
    audio: { body: 116.54, bodyGain: .135, noise: 2800, noiseGain: .20, noiseDuration: .28, notes: [349.23, 523.25, 698.46, 1046.5], delays: [.08, .20, .39, .65], sustain: .86, noteGain: .070, type: 'sine', air: .075 },
  },
  legendary: {
    visual: { duration: 2.6, strength: 1.08, particles: 96, ringDelays: [0, .43, .88], ringExpansion: 1.45, halo: .29, wash: .28, particleSize: .047, spread: .36, lift: .45, pattern: 'crown' },
    audio: { body: 98, bodyGain: .15, noise: 3300, noiseGain: .22, noiseDuration: .34, notes: [392, 587.33, 783.99, 1174.66, 1567.98], delays: [.08, .22, .38, .65, .92], sustain: 1.12, noteGain: .076, type: 'sine', air: .095 },
  },
};

export const TIER_FEEDBACK = freeze(Object.fromEntries(QUALITY_TIERS.map(tier => [tier.id, {
  id: tier.id,
  color: tier.color,
  visual: { ...SETTINGS[tier.id].visual, color: tier.color, priority: 3 },
  audio: SETTINGS[tier.id].audio,
}])));

/** The controller alone decides when the completed tier may be presented. */
export function getTierFeedback(kind) {
  if (kind === 'reveal') return TIER_FEEDBACK.common;
  if (typeof kind !== 'string' || !kind.startsWith('reveal-')) return null;
  const id = kind.slice(7);
  return Object.hasOwn(TIER_FEEDBACK, id) ? TIER_FEEDBACK[id] : null;
}

const STEP_PITCHES = [220, 329.63, 440, 587.33, 739.99, 987.77];
export const TIER_STEP_FEEDBACK = freeze(Object.fromEntries(QUALITY_TIERS.map((tier, index) => [tier.id, {
  id: tier.id,
  color: tier.color,
  visual: { duration: .28, color: tier.color, strength: .25 + index * .035, particles: 0,
    priority: 2, ringDelays: [0], ringExpansion: .20 + index * .045, halo: .05 + index * .008, wash: 0, objectLift: 0 },
  audio: { hz: STEP_PITCHES[index], duration: .115 + index * .018, gain: .036 + index * .002,
    harmonic: index >= 2 ? 1.5 : 2, noise: 750 + index * 230 },
}])));

/** A traversed hold stage is not a reveal and does not inspect the hidden result. */
export function getTierStepFeedback(kind) {
  if (typeof kind !== 'string' || !kind.startsWith('tier-step-')) return null;
  const id = kind.slice(10);
  return Object.hasOwn(TIER_STEP_FEEDBACK, id) ? TIER_STEP_FEEDBACK[id] : null;
}

/** A smooth single swell, with no discontinuity or repeated brightness flash. */
export function feedbackEnvelope(elapsed, duration) {
  if (!(duration > 0) || !Number.isFinite(elapsed) || elapsed <= 0 || elapsed >= duration) return 0;
  return Math.sin(elapsed / duration * Math.PI) ** 1.5;
}
