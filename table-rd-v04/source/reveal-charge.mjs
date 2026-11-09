// Presentation progress only. No outcomes, probabilities or resources enter here.
export function createRevealCharge(durationMs = 2100) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error('Invalid reveal duration.');
  let elapsed = 0, active = false, completed = false;
  const snapshot = () => ({progress:elapsed / durationMs,active,completed});
  return {
    get state() { return snapshot(); },
    start() { if (!completed) active = true; return snapshot(); },
    pause() { active = false; return snapshot(); },
    reset() { elapsed = 0; active = false; completed = false; return snapshot(); },
    advance(deltaMs) {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('Invalid frame duration.');
      let didComplete = false;
      if (active && !completed) {
        elapsed = Math.min(durationMs, elapsed + deltaMs);
        if (elapsed === durationMs) { completed = true; active = false; didComplete = true; }
      }
      return {...snapshot(),didComplete};
    }
  };
}
