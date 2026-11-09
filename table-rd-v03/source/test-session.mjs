import { createState, getOdds, getStrains, transition, validateState } from './model.mjs';

export const NORMAL_SAVE_KEY = 'botanical-table-v03';
export const TEST_SAVE_KEY = 'botanical-table-v03-test';
const TIERS = ['rare', 'exceptional'];
const FIXTURE_LABELS = {
  bridge: { fr: 'Relais Y × X · test', en: 'Y × X bridge · test' },
  signature: { fr: 'Préparation de test', en: 'Test preparation' },
};
const midpoint = outcome => outcome.seedStart + Math.floor((outcome.seedEnd - outcome.seedStart) / 2);

export function getTestSeed(odds, tier) {
  if (!TIERS.includes(tier) || !Array.isArray(odds?.outcomes)) return null;
  const options = odds.outcomes.filter(outcome => outcome.rarity === tier && outcome.count > 0);
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
  const ensureCuttings = parentIds => {
    if (!parentIds.every(id => available(working, id))) return false;
    for (const varietyId of parentIds) if (!working.inventory.some(cutting => cutting.varietyId === varietyId) && !apply({ type: 'HARVEST', varietyId })) return false;
    return true;
  };
  const prepare = (parentIds, seed, label) => {
    if (seed === null || !ensureCuttings(parentIds)) return false;
    const prefix = `test-${label}-${working.trials.length + 1}`;
    let requestId = prefix, suffix = 0;
    while (working.trials.some(trial => trial.requestId === requestId)) requestId = `${prefix}-${++suffix}`;
    if (!apply({ type: 'START', parentIds: [...parentIds], seed, requestId })) return false;
    const trialId = working.activeTrialId;
    return apply({ type: 'ADVANCE', trialId }) && apply({ type: 'INSPECT', trialId });
  };
  try {
    let parentIds;
    if (rewardParentId !== null) {
      const strains = getStrains(working);
      if (!strains.some(strain => strain.id === rewardParentId)) return refuse('test-parent-unavailable');
      const candidates = strains.filter(strain => strain.id !== rewardParentId).map(strain => ({ id: strain.id, odds: getOdds(working, [rewardParentId, strain.id]) })).filter(candidate => getTestSeed(candidate.odds, tier) !== null);
      if (!candidates.length) return refuse('test-tier-unavailable');
      const usable = candidates.filter(candidate => available(working, candidate.id) && available(working, rewardParentId));
      if (!usable.length) return refuse('test-cuttings-exhausted');
      usable.sort((a, b) => b.odds[tier] - a.odds[tier] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      parentIds = [rewardParentId, usable[0].id];
    } else if (tier === 'rare') {
      parentIds = ['x', 'z'];
    } else {
      if (!available(working, 'z')) return refuse('test-cuttings-exhausted');
      let bridge = working.varieties.find(strain => strain.parents.length === 2 && strain.parents.includes('x') && strain.parents.includes('y') && strain.slotCapacity === 5 && strain.potentialIds.includes('citrus') && strain.potentialIds.includes('floral') && available(working, strain.id));
      if (!bridge) {
        const odds = getOdds(working, ['y', 'x']);
        const options = odds.outcomes.filter(outcome => outcome.slotCapacity === 5 && outcome.potentialIds.includes('citrus') && outcome.potentialIds.includes('floral') && outcome.count > 0);
        options.sort((a, b) => b.potentialIds.length - a.potentialIds.length || b.count - a.count || a.seedStart - b.seedStart);
        if (!options.length) return refuse('test-tier-unavailable');
        if (!prepare(['y', 'x'], midpoint(options[0]), 'bridge')) return refuse('test-cuttings-exhausted');
        const trialId = working.activeTrialId, name = `${FIXTURE_LABELS.bridge.fr} ${working.trials.length}`;
        if (!apply({ type: 'REVEAL', trialId }) || !apply({ type: 'KEEP', trialId, name, signature: FIXTURE_LABELS.signature.fr })) return refuse('test-preparation-failed');
        setupTrialIds.push(trialId); setupLabels.push(name);
        bridge = working.varieties.at(-1);
      }
      parentIds = [bridge.id, 'z'];
    }
    const seed = getTestSeed(getOdds(working, parentIds), tier);
    if (seed === null) return refuse('test-tier-unavailable');
    if (!prepare(parentIds, seed, tier)) return refuse('test-cuttings-exhausted');
    validateState(working);
    return { state: working, ok: true, setupTrialIds, setupLabels };
  } catch {
    return refuse('test-preparation-failed');
  }
}
