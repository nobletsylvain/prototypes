// Fictional demonstration parameters; these values are not final game rules.
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const clone = value => structuredClone(value);
const UINT32_SPACE = 4294967296;
const RARE_PHASES = ['revealed', 'kept', 'archived'];
const TERMINAL_PHASES = ['kept', 'archived'];
const serial = index => String(index).padStart(3, '0');
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isSeed = value => Number.isInteger(value) && value >= 0 && value < UINT32_SPACE;
const normalizeText = value => typeof value === 'string' ? Array.from(value.normalize('NFC').replace(/[<>\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim()).slice(0, 48).join('') : '';
const requireCondition = (condition, message) => { if (!condition) throw new Error(`Invalid research state: ${message}`); };

export const PARENTS = freeze([
  { id: 'aube', name: { fr: 'Aube', en: 'Dawn' }, taste: { fr: 'Citronné', en: 'Citrus' }, effect: { fr: 'Élan', en: 'Lift' }, color: '#b5bf68', rarity: 'common', generation: 0, genes: { taste: [70, 20, 10], effect: [70, 20, 10] }, parents: [] },
  { id: 'lisiere', name: { fr: 'Lisière', en: 'Woodland' }, taste: { fr: 'Boisé', en: 'Woody' }, effect: { fr: 'Calme', en: 'Calm' }, color: '#6a9b79', rarity: 'common', generation: 0, genes: { taste: [10, 70, 20], effect: [10, 70, 20] }, parents: [] },
  { id: 'velours', name: { fr: 'Velours', en: 'Velvet' }, taste: { fr: 'Floral', en: 'Floral' }, effect: { fr: 'Rêverie', en: 'Reverie' }, color: '#aa8fbb', rarity: 'common', generation: 0, genes: { taste: [20, 10, 70], effect: [20, 10, 70] }, parents: [] },
]);

export const UPGRADE_BRANCHES = freeze([
  { id: 'inheritance', cost: 1, name: { fr: 'Héritage', en: 'Inheritance' }, options: [
    { id: 'convergence', name: { fr: 'Convergence', en: 'Convergence' }, description: { fr: 'Augmente la chance rare selon la proximité des parents.', en: 'Raises rare odds with parent affinity.' } },
    { id: 'exploration', name: { fr: 'Exploration', en: 'Exploration' }, description: { fr: '+4 points de pourcentage exceptionnel pour les prochains croisements.', en: '+4 percentage points of exceptional odds in future crosses.' } },
  ] },
  { id: 'lineage', cost: 1, name: { fr: 'Lignée', en: 'Lineage' }, options: [
    { id: 'memory', name: { fr: 'Mémoire', en: 'Memory' }, description: { fr: 'Augmente la chance rare selon la génération de cette variété.', en: 'Raises rare odds with this variety’s generation.' } },
    { id: 'radiance', name: { fr: 'Rayonnement', en: 'Radiance' }, description: { fr: 'Transfère 4 points de pourcentage de rare vers exceptionnel.', en: 'Moves 4 percentage points from rare to exceptional.' } },
  ] },
]);

const initialCuttings = () => PARENTS.flatMap(parent => Array.from({ length: 3 }, (_, index) => ({ id: `cutting-${parent.id}-${index + 1}`, varietyId: parent.id, sourcePlantId: `plant-${parent.id}-demo` })));
const emptyResearch = () => ({ earned: 0, spent: 0, choices: {} });

export function createState() {
  return {
    schema: 2,
    revision: 0,
    inventory: initialCuttings(),
    plants: PARENTS.map(parent => ({ id: `plant-${parent.id}-demo`, varietyId: parent.id, capacity: 3, harvested: 0, createdByTrialId: null })),
    harvests: [],
    pot: { id: 'pot-demo-01', trialId: null },
    trials: [],
    varieties: [],
    research: Object.fromEntries(PARENTS.map(parent => [parent.id, emptyResearch()])),
    upgrades: [],
    activeTrialId: null,
    history: [],
  };
}

export function getStrains(state) {
  return [...PARENTS.map(clone), ...state.varieties.map(clone)];
}

function resolvePair(state, parentIds) {
  if (!Array.isArray(parentIds) || parentIds.length !== 2 || parentIds[0] === parentIds[1]) return null;
  const strains = getStrains(state);
  const parents = parentIds.map(id => strains.find(strain => strain.id === id));
  return parents.every(Boolean) ? parents : null;
}

export function getOdds(state, parentIds) {
  const parents = resolvePair(state, parentIds);
  if (!parents) return null;
  const overlap = key => parents[0].genes[key].reduce((sum, amount, index) => sum + Math.min(amount, parents[1].genes[key][index]), 0);
  const affinity = (overlap('taste') + overlap('effect')) / 200;
  const parentGeneration = Math.max(...parents.map(parent => parent.generation));
  const bonuses = { affinity: Math.round(Math.max(0, affinity - 0.4) * 25), depth: Math.min(4, parentGeneration) * 2, convergence: 0, exploration: 0, memory: 0, radiance: 0 };
  for (const parent of parents) {
    const choices = state.research[parent.id].choices;
    if (choices.inheritance === 'convergence') bonuses.convergence += Math.round(affinity * 6);
    if (choices.inheritance === 'exploration') bonuses.exploration += 4;
    if (choices.lineage === 'memory') bonuses.memory += Math.min(8, 2 + parent.generation * 2);
    if (choices.lineage === 'radiance') bonuses.radiance += 4;
  }
  const exceptional = 5 + bonuses.exploration + bonuses.radiance;
  const rare = Math.min(90 - exceptional, 20 + bonuses.affinity + bonuses.depth + bonuses.convergence + bonuses.memory - bonuses.radiance);
  const common = 100 - rare - exceptional;
  // Integer thresholds make every boundary exact on the 2^32 seed space.
  // Whole percentages are display targets; exactPercent records their discrete realization.
  const thresholds = { exceptional: Math.floor(exceptional * UINT32_SPACE / 100), rare: Math.floor((exceptional + rare) * UINT32_SPACE / 100) };
  const counts = { exceptional: thresholds.exceptional, rare: thresholds.rare - thresholds.exceptional, common: UINT32_SPACE - thresholds.rare };
  const exactPercent = Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, count * 100 / UINT32_SPACE]));
  return { common, rare, exceptional, affinity, generation: parentGeneration + 1, bonuses, thresholds, counts, sampleSpace: UINT32_SPACE, exactPercent };
}

function hash32(seed, salt) {
  let value = (seed ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}
function allocatePercentages(values) {
  const result = values.map(Math.floor);
  const order = values.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let missing = 100 - result.reduce((a, b) => a + b, 0), index = 0; missing > 0; missing--, index++) result[order[index % order.length].index]++;
  return result;
}
function mixGenes(parents, key) { return allocatePercentages(parents[0].genes[key].map((amount, index) => (amount + parents[1].genes[key][index]) / 2)); }
function drawFamily(weights, roll) {
  let total = 0;
  for (let index = 0; index < weights.length - 1; index++) {
    total += weights[index];
    if (roll < Math.floor(total * UINT32_SPACE / 100)) return index;
  }
  return weights.length - 1;
}
function descendantGenes(mixed, family) { return allocatePercentages(mixed.map((value, index) => value * 0.8 + (index === family ? 20 : 0))); }
function createResult(parents, odds, seed, index) {
  const tasteMix = mixGenes(parents, 'taste'), effectMix = mixGenes(parents, 'effect');
  const tasteIndex = drawFamily(tasteMix, hash32(seed, 0xa341316c));
  const effectIndex = drawFamily(effectMix, hash32(seed, 0xc8013ea4));
  const rarity = seed < odds.thresholds.exceptional ? 'exceptional' : seed < odds.thresholds.rare ? 'rare' : 'common';
  const accent = rarity === 'exceptional' ? { fr: 'Reflets dorés', en: 'Golden glints' } : rarity === 'rare' ? { fr: 'Reflets mauves', en: 'Mauve glints' } : { fr: 'Reflets doux', en: 'Soft glints' };
  return {
    id: `variety-${serial(index)}`,
    taste: clone(PARENTS[tasteIndex].taste),
    effect: clone(PARENTS[effectIndex].effect),
    accent,
    color: PARENTS[tasteIndex].color,
    parents: parents.map(parent => parent.id),
    rarity,
    genes: { taste: descendantGenes(tasteMix, tasteIndex), effect: descendantGenes(effectMix, effectIndex) },
    generation: odds.generation,
  };
}

function applyCommand(state, command, now) {
  const refuse = error => ({ state, ok: false, error });
  if (!isRecord(command) || typeof command.type !== 'string') return refuse('invalid-command');
  if (!Number.isFinite(now) || now < 0) return refuse('invalid-time');
  const commit = (next, recorded, event) => {
    next.revision += 1;
    next.history.push({ command: recorded, at: now });
    return { state: next, ok: true, event };
  };

  if (command.type === 'START') {
    if (typeof command.requestId !== 'string' || !command.requestId.trim() || command.requestId.length > 128) return refuse('request-id-required');
    if (state.trials.some(trial => trial.requestId === command.requestId)) return { state, ok: true, event: 'request-already-committed' };
    const current = state.trials.find(trial => trial.id === state.activeTrialId);
    if (current && !TERMINAL_PHASES.includes(current.phase)) return refuse('trial-in-progress');
    if (Array.isArray(command.parentIds) && command.parentIds.length === 2 && command.parentIds[0] === command.parentIds[1]) return refuse('distinct-parents-required');
    const parents = resolvePair(state, command.parentIds);
    if (!parents) return refuse('parents-required');
    if ('intent' in command || 'taste' in command || 'effect' in command) return refuse('direct-trait-selection-removed');
    if (!isSeed(command.seed)) return refuse('seed-required');
    const cuttings = command.parentIds.map(id => state.inventory.find(cutting => cutting.varietyId === id));
    if (cuttings.some(cutting => !cutting)) return refuse('insufficient-cuttings');
    const odds = getOdds(state, command.parentIds);
    const next = clone(state), index = next.trials.length + 1;
    const trial = {
      id: `trial-${serial(index)}`, requestId: command.requestId,
      parentIds: [...command.parentIds], cuttingIds: cuttings.map(cutting => cutting.id),
      seed: command.seed, odds, result: createResult(parents, odds, command.seed, index),
      batch: { id: `batch-${serial(index)}`, quality: 'demo-standard', quantity: 1, unit: 'specimen' },
      phase: 'growing', createdAt: now, pointsAwarded: false,
    };
    next.inventory = next.inventory.filter(cutting => !trial.cuttingIds.includes(cutting.id));
    next.trials.push(trial); next.pot.trialId = trial.id; next.activeTrialId = trial.id;
    return commit(next, { type: 'START', parentIds: [...command.parentIds], seed: command.seed, requestId: command.requestId }, 'trial-started');
  }

  if (command.type === 'HARVEST') {
    const plant = state.plants.find(plant => plant.varietyId === command.varietyId);
    if (!plant) return refuse('source-plant-required');
    if (plant.harvested >= plant.capacity) return refuse('plant-exhausted');
    const next = clone(state), index = next.harvests.length + 1;
    const cutting = { id: `cutting-harvest-${serial(index)}`, varietyId: plant.varietyId, sourcePlantId: plant.id };
    next.inventory.push(cutting);
    next.plants.find(source => source.id === plant.id).harvested += 1;
    next.harvests.push({ id: `harvest-${serial(index)}`, plantId: plant.id, varietyId: plant.varietyId, cuttingId: cutting.id });
    return commit(next, { type: 'HARVEST', varietyId: plant.varietyId }, 'cutting-harvested');
  }

  if (command.type === 'UPGRADE') {
    if (!getStrains(state).some(strain => strain.id === command.varietyId)) return refuse('variety-not-found');
    const branch = UPGRADE_BRANCHES.find(branch => branch.id === command.branchId);
    if (!branch || !branch.options.some(option => option.id === command.optionId)) return refuse('upgrade-not-found');
    const research = state.research[command.varietyId];
    if (research.choices[branch.id]) return refuse('branch-already-chosen');
    if (research.earned - research.spent < branch.cost) return refuse('research-point-required');
    const next = clone(state);
    next.research[command.varietyId].spent += branch.cost;
    next.research[command.varietyId].choices[branch.id] = command.optionId;
    next.upgrades.push({ id: `upgrade-${serial(next.upgrades.length + 1)}`, varietyId: command.varietyId, branchId: branch.id, optionId: command.optionId, cost: branch.cost });
    return commit(next, { type: 'UPGRADE', varietyId: command.varietyId, branchId: branch.id, optionId: command.optionId }, 'upgrade-chosen');
  }

  const phases = { ADVANCE: ['growing', 'ready'], INSPECT: ['ready', 'inspected'], REVEAL: ['inspected', 'revealed'], KEEP: ['revealed', 'kept'], ARCHIVE: ['revealed', 'archived'] };
  if (!Object.hasOwn(phases, command.type)) return refuse('unknown-command');
  const index = state.trials.findIndex(trial => trial.id === command.trialId);
  if (index < 0) return refuse('trial-not-found');
  if (state.trials[index].phase !== phases[command.type][0]) return refuse('wrong-phase');
  const name = normalizeText(command.name), signature = normalizeText(command.signature);
  if (command.type === 'KEEP' && !name) return refuse('name-required');
  const next = clone(state), trial = next.trials[index];
  trial.phase = phases[command.type][1];
  if (command.type === 'ADVANCE') next.pot.trialId = null;
  if (command.type === 'REVEAL' && trial.result.rarity !== 'common') {
    for (const parentId of trial.parentIds) next.research[parentId].earned += 1;
    trial.pointsAwarded = true;
  }
  if (command.type === 'KEEP') {
    next.varieties.push({ ...clone(trial.result), name, signature, trialId: trial.id });
    next.research[trial.result.id] = emptyResearch();
    next.plants.push({ id: `plant-${trial.result.id}`, varietyId: trial.result.id, capacity: 4, harvested: 0, createdByTrialId: trial.id });
  }
  const recorded = { type: command.type, trialId: trial.id };
  if (command.type === 'KEEP') Object.assign(recorded, { name, signature });
  return commit(next, recorded, { ADVANCE: 'trial-ready', INSPECT: 'specimen-inspected', REVEAL: 'record-revealed', KEEP: 'variety-kept', ARCHIVE: 'trial-archived' }[command.type]);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  requireCondition(value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)), 'non-JSON or non-finite value');
  return value;
}
function snapshot(value) { return JSON.stringify(canonical(value)); }

export function validateState(state) {
  requireCondition(isRecord(state) && state.schema === 2, 'unsupported schema');
  requireCondition(Array.isArray(state.history), 'missing command history');
  requireCondition(Number.isSafeInteger(state.revision) && state.revision === state.history.length, 'revision');
  let replay = createState();
  for (const entry of state.history) {
    requireCondition(isRecord(entry) && isRecord(entry.command) && Number.isFinite(entry.at) && entry.at >= 0, 'history entry');
    const next = applyCommand(replay, entry.command, entry.at);
    requireCondition(next.ok && next.state !== replay, `history command ${entry.command.type} refused`);
    replay = next.state;
  }
  // Replay verifies exact genealogy, committed seeds and odds, phase order, physical
  // provenance/conservation, finite plant harvests, reward timing and exclusive costs.
  requireCondition(snapshot(replay) === snapshot(state), 'history does not match saved resources, outcomes or research');
  for (const trial of state.trials) {
    requireCondition(trial.pointsAwarded === (RARE_PHASES.includes(trial.phase) && trial.result.rarity !== 'common'), 'point award phase');
    for (const key of ['taste', 'effect']) requireCondition(trial.result.genes[key].every(Number.isInteger) && trial.result.genes[key].reduce((sum, value) => sum + value, 0) === 100, 'genetic distribution');
  }
  return state;
}

export function restoreState(json) {
  const state = typeof json === 'string' ? JSON.parse(json) : clone(json);
  return validateState(state);
}

export function transition(state, command, now = Date.now()) {
  validateState(state);
  const result = applyCommand(state, command, now);
  if (result.ok && result.state !== state) validateState(result.state);
  return result;
}
