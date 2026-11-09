import { createState, getOdds, getStrains, transition, validateState, QUALITY_TIERS } from './model.mjs';

export const NORMAL_SAVE_KEY = 'botanical-table-v04';
export const TEST_SAVE_KEY = 'botanical-table-v04-test';
const TIERS = QUALITY_TIERS.map(tier => tier.id);
const FIXTURE_LABELS = {
  bridge: { fr: 'Relais de qualité · test', en: 'Quality bridge · test' },
  signature: { fr: 'Préparation de test', en: 'Test preparation' },
};
const midpoint = outcome => outcome.seedStart + Math.floor(outcome.count / 2);

// This seed selects the separate quality draw, never the inheritance draw.
export function getTestSeed(odds, tier) {
  const quality = odds?.qualityOdds || odds;
  if (!TIERS.includes(tier) || !Array.isArray(quality?.outcomes)) return null;
  const options = quality.outcomes.filter(outcome => outcome.tier === tier && outcome.count > 0);
  options.sort((a, b) => b.count - a.count || a.seedStart - b.seedStart);
  return options.length ? midpoint(options[0]) : null;
}
const available = (state, varietyId) => state.inventory.some(cutting => cutting.varietyId === varietyId)
  || state.plants.some(plant => plant.varietyId === varietyId && plant.harvested < plant.capacity);

export function createTestDiscovery(tier = 'rare', previousState = null, rewardParentId = null) {
  const original = previousState ?? createState();
  const refuse = error => ({ state: original, ok: false, error });
  if (!TIERS.includes(tier)) return refuse('invalid-test-tier');
  try { validateState(original); } catch { return refuse('invalid-test-state'); }
  const active = original.trials.find(trial => trial.id === original.activeTrialId);
  if (active && !['kept', 'archived'].includes(active.phase)) return refuse('test-trial-in-progress');
  let working = original, timestamp = Date.now();
  const setupTrialIds = [], setupLabels = [];
  const apply = command => {
    const result = transition(working, command, timestamp++);
    if (!result.ok || result.state === working) return false;
    working = result.state; return true;
  };
  const candidates = target => {
    const strains = getStrains(working), pairs = [];
    for (let a = 0; a < strains.length; a++) for (let b = a + 1; b < strains.length; b++) {
      const parentIds = [strains[a].id, strains[b].id];
      if (target !== null && !parentIds.includes(target)) continue;
      const odds = getOdds(working, parentIds);
      pairs.push({ parentIds, odds, usable: parentIds.every(id => available(working, id)) });
    }
    return pairs;
  };
  const matching = target => candidates(target).filter(pair => getTestSeed(pair.odds, tier) !== null)
    .sort((a, b) => b.odds[tier] - a.odds[tier] || a.parentIds.join('/').localeCompare(b.parentIds.join('/')));
  const prepare = (parentIds, qualitySeed, label) => {
    if (qualitySeed === null || !parentIds.every(id => available(working, id))) return false;
    for (const varietyId of parentIds) if (!working.inventory.some(cutting => cutting.varietyId === varietyId) && !apply({ type: 'HARVEST', varietyId })) return false;
    const prefix = `test-${label}-${working.trials.length + 1}`;
    let requestId = prefix, suffix = 0;
    while (working.trials.some(trial => trial.requestId === requestId)) requestId = `${prefix}-${++suffix}`;
    // Explicit fixture inheritance seed is independent of the requested quality tier.
    const seed = 2778533696;
    if (!apply({ type: 'START', parentIds: [...parentIds], seed, qualitySeed, requestId })) return false;
    const trialId = working.activeTrialId;
    return apply({ type: 'ADVANCE', trialId }) && apply({ type: 'INSPECT', trialId });
  };
  try {
    if (rewardParentId !== null && !getStrains(working).some(strain => strain.id === rewardParentId)) return refuse('test-parent-unavailable');
    let options = matching(rewardParentId);
    if (!options.length && rewardParentId === null && tier === 'legendary') {
      const bridges = candidates(null).filter(pair => pair.usable).sort((a, b) => b.odds.qualityOdds.outcomes.at(-1).score - a.odds.qualityOdds.outcomes.at(-1).score);
      const bridge = bridges[0], outcome = bridge?.odds.qualityOdds.outcomes.at(-1);
      if (!outcome || outcome.score < 80) return refuse('test-tier-unavailable');
      if (!prepare(bridge.parentIds, midpoint(outcome), 'quality-bridge')) return refuse('test-cuttings-exhausted');
      const trialId = working.activeTrialId, name = `${FIXTURE_LABELS.bridge.fr} ${working.trials.length}`;
      if (!apply({ type: 'REVEAL', trialId }) || !apply({ type: 'KEEP', trialId, name, signature: FIXTURE_LABELS.signature.fr })) return refuse('test-preparation-failed');
      setupTrialIds.push(trialId); setupLabels.push(name);
      options = matching(null);
    }
    if (!options.length) return refuse('test-tier-unavailable');
    const chosen = options.find(pair => pair.usable);
    if (!chosen) return refuse('test-cuttings-exhausted');
    if (!prepare(chosen.parentIds, getTestSeed(chosen.odds, tier), tier)) return refuse('test-cuttings-exhausted');
    validateState(working);
    return { state: working, ok: true, setupTrialIds, setupLabels };
  } catch {
    return refuse('test-preparation-failed');
  }
}
