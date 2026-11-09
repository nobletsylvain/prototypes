import { createState, getOdds, transition, validateState } from './model.mjs';

export const NORMAL_SAVE_KEY = 'botanical-table-v02';
export const TEST_SAVE_KEY = 'botanical-table-v02-test';

const TEST_PARENTS = Object.freeze(['aube', 'lisiere']);
const TEST_TIERS = Object.freeze(['rare', 'exceptional']);
const UINT32_SPACE = 4294967296;

export function getTestSeed(odds, tier) {
  if (!TEST_TIERS.includes(tier)) throw new RangeError('Unsupported test tier');
  const exceptional = odds?.thresholds?.exceptional;
  const rare = odds?.thresholds?.rare;
  if (!Number.isInteger(exceptional) || !Number.isInteger(rare) || exceptional <= 0 || rare <= exceptional || rare > UINT32_SPACE) throw new RangeError('Invalid test probability thresholds');
  const lower = tier === 'exceptional' ? 0 : exceptional;
  const upper = tier === 'exceptional' ? exceptional : rare;
  return lower + Math.floor((upper - lower) / 2);
}

export function createTestDiscovery(tier = 'rare', previousState = null) {
  const original = previousState ?? createState();
  const refuse = error => ({ state: original, ok: false, error });
  if (!TEST_TIERS.includes(tier)) return refuse('invalid-test-tier');
  try { validateState(original); } catch { return refuse('invalid-test-state'); }
  const active = original.trials.find(trial => trial.id === original.activeTrialId);
  if (active && !['kept', 'archived'].includes(active.phase)) return refuse('test-trial-in-progress');

  // Preflight both resources before composing normal transitions. A refused
  // preparation always returns the exact original state without partial harvests.
  for (const varietyId of TEST_PARENTS) {
    if (original.inventory.some(cutting => cutting.varietyId === varietyId)) continue;
    const plant = original.plants.find(source => source.varietyId === varietyId);
    if (!plant || plant.harvested >= plant.capacity) return refuse('test-cuttings-exhausted');
  }

  let working = original;
  let timestamp = Date.now();
  const apply = command => {
    const result = transition(working, command, timestamp++);
    if (!result.ok || result.state === working) return false;
    working = result.state;
    return true;
  };
  try {
    for (const varietyId of TEST_PARENTS) {
      if (!working.inventory.some(cutting => cutting.varietyId === varietyId) && !apply({ type: 'HARVEST', varietyId })) return refuse('test-preparation-failed');
    }
    const seed = getTestSeed(getOdds(working, TEST_PARENTS), tier);
    const prefix = `test-fixture-${tier}-${working.trials.length + 1}`;
    let requestId = prefix, suffix = 0;
    while (working.trials.some(trial => trial.requestId === requestId)) requestId = `${prefix}-${++suffix}`;
    if (!apply({ type: 'START', parentIds: [...TEST_PARENTS], requestId, seed })) return refuse('test-preparation-failed');
    const trialId = working.activeTrialId;
    if (!apply({ type: 'ADVANCE', trialId }) || !apply({ type: 'INSPECT', trialId })) return refuse('test-preparation-failed');
    validateState(working);
    return { state: working, ok: true };
  } catch {
    return refuse('test-preparation-failed');
  }
}
