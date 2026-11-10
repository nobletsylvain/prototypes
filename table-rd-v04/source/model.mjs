// Fictional demonstration parameters. They do not define final game rules.
import { founderVisual, inheritVisual, getVisualPhenotype, validateVisual } from './visual-genetics.mjs';
import { QUALITY_TIERS, QUALITY_VERSION, tierForScore, getQualityOdds, drawGeneticQuality } from './genetic-quality.mjs';
export { QUALITY_TIERS, tierForScore, getQualityOdds } from './genetic-quality.mjs';
const clone = value => structuredClone(value);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const UINT32_SPACE = 4294967296;
const KNOWN_PHASES = ['revealed', 'kept', 'archived'];
const TERMINAL_PHASES = ['kept', 'archived'];
const serial = index => String(index).padStart(3, '0');
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isSeed = value => Number.isInteger(value) && value >= 0 && value < UINT32_SPACE;
const normalizeText = value => typeof value === 'string' ? Array.from(value.normalize('NFC').replace(/[<>\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim()).slice(0, 48).join('') : '';
const requireCondition = (condition, message) => { if (!condition) throw new Error(`Invalid research state: ${message}`); };

export const TRAITS = freeze([
  { id: 'citrus', category: 'taste', name: { fr: 'Citronné', en: 'Citrus' }, description: { fr: 'Active le goût citronné déjà hérité.', en: 'Activates the inherited citrus taste.' }, rare: false },
  { id: 'floral', category: 'taste', name: { fr: 'Floral', en: 'Floral' }, description: { fr: 'Active le goût floral déjà hérité.', en: 'Activates the inherited floral taste.' }, rare: false },
  { id: 'yield', category: 'production', name: { fr: 'Ramification', en: 'Branching' }, description: { fr: 'Aperçu de production future : 3 → 5 branches. Aucun stock créé.', en: 'Future production preview: 3 → 5 branches. No stock created.' }, rare: false },
  { id: 'quality', category: 'quality', name: { fr: 'Qualité potentielle', en: 'Quality potential' }, description: { fr: 'Active un potentiel de qualité pour une production future ; les lots existants restent inchangés.', en: 'Activates quality potential for future production; existing batches stay unchanged.' }, rare: false },
  { id: 'b1', category: 'effect', name: { fr: 'B1', en: 'B1' }, description: { fr: 'Active l’effet fictif rare B1, uniquement s’il a été hérité.', en: 'Activates the fictional rare B1 effect, only if inherited.' }, rare: true },
]);

function summarizePotentials(potentialIds, category) {
  const selected = TRAITS.filter(trait => trait.category === category && potentialIds.includes(trait.id));
  return { fr: selected.map(trait => trait.name.fr).join(' · ') || '—', en: selected.map(trait => trait.name.en).join(' · ') || '—' };
}
function classify(potentialIds, slotCapacity) {
  const aromatic = potentialIds.includes('citrus') && potentialIds.includes('floral');
  if (slotCapacity === 5 && aromatic && potentialIds.includes('b1')) return 'exceptional';
  if (potentialIds.includes('b1') || (slotCapacity === 5 && aromatic)) return 'rare';
  return 'common';
}
export const PARENTS = freeze([
  { id: 'x', geneticQuality: 24, name: { fr: 'X · Aromatique', en: 'X · Aromatic' }, slotCapacity: 3, potentialIds: ['citrus', 'floral', 'yield'] },
  { id: 'y', geneticQuality: 54, name: { fr: 'Y · Réserve', en: 'Y · Reserve' }, slotCapacity: 5, potentialIds: ['yield', 'quality'] },
  { id: 'z', geneticQuality: 84, name: { fr: 'Z · B1', en: 'Z · B1' }, slotCapacity: 3, potentialIds: ['b1', 'quality'] },
].map(parent => {
  const visual = founderVisual(parent.id), phenotype = getVisualPhenotype(visual);
  return { ...parent, visual, color: phenotype.color, accent: phenotype.accent, taste: summarizePotentials(parent.potentialIds, 'taste'), effect: summarizePotentials(parent.potentialIds, 'effect'), rarity: tierForScore(parent.geneticQuality).id, generation: 0, parents: [] };
}));

const initialCuttings = () => PARENTS.flatMap(parent => Array.from({ length: 3 }, (_, index) => ({ id: `cutting-${parent.id}-${index + 1}`, varietyId: parent.id, sourcePlantId: `plant-${parent.id}-demo` })));
const emptyResearch = () => ({ earned: 0, spent: 0, choices: {} });

export function createState() {
  return {
    schema: 5, revision: 0, inventory: initialCuttings(),
    plants: PARENTS.map(parent => ({ id: `plant-${parent.id}-demo`, varietyId: parent.id, capacity: 3, harvested: 0, createdByTrialId: null })),
    harvests: [], pot: { id: 'pot-demo-01', trialId: null }, trials: [], varieties: [],
    research: Object.fromEntries(PARENTS.map(parent => [parent.id, emptyResearch()])),
    activations: [], activeTrialId: null, history: [],
  };
}
export function getStrains(state) { return [...PARENTS.map(clone), ...state.varieties.map(clone)]; }

export function getConfiguration(state, varietyId) {
  const strain = getStrains(state).find(strain => strain.id === varietyId)
    || state.trials.find(trial => KNOWN_PHASES.includes(trial.phase) && trial.result.id === varietyId)?.result;
  if (!strain) return null;
  const choices = state.research[varietyId]?.choices || {};
  const slots = Array.from({ length: strain.slotCapacity }, (_, index) => ({ id: `slot-${index}`, index, traitId: choices[`slot-${index}`] || null }));
  const activeIds = slots.map(slot => slot.traitId).filter(Boolean);
  return { activeIds, slots, productionBranches: activeIds.includes('yield') ? 5 : 3, qualityPotential: activeIds.includes('quality') };
}
function resolvePair(state, parentIds) {
  if (!Array.isArray(parentIds) || parentIds.length !== 2 || parentIds[0] === parentIds[1]) return null;
  const strains = getStrains(state), parents = parentIds.map(id => strains.find(strain => strain.id === id));
  return parents.every(Boolean) ? parents : null;
}

export function getOdds(state, parentIds, qualityVersion = QUALITY_VERSION) {
  const parents = resolvePair(state, parentIds);
  if (!parents) return null;
  const potentials = TRAITS.filter(trait => parents.some(parent => parent.potentialIds.includes(trait.id)));
  const capacities = [...new Set(parents.map(parent => parent.slotCapacity))].sort((a, b) => a - b);
  const capacityWeight = capacities.length === 1 ? 100 : 50;
  const retention = potentials.map(trait => {
    const copies = parents.filter(parent => parent.potentialIds.includes(trait.id)).length;
    return trait.id === 'b1' ? (copies === 2 ? 65 : 35) : (copies === 2 ? 90 : 65);
  });
  const weighted = [];
  for (const slotCapacity of capacities) {
    for (let mask = 0; mask < 2 ** potentials.length; mask++) {
      const potentialIds = [];
      let weight = BigInt(capacityWeight);
      potentials.forEach((trait, index) => {
        const included = (mask & (1 << index)) !== 0;
        if (included) potentialIds.push(trait.id);
        weight *= BigInt(included ? retention[index] : 100 - retention[index]);
      });
      weighted.push({ potentialIds, slotCapacity, rarity: classify(potentialIds, slotCapacity), weight });
    }
  }
  const totalWeight = weighted.reduce((sum, outcome) => sum + outcome.weight, 0n), space = BigInt(UINT32_SPACE);
  const allocated = weighted.map((outcome, index) => ({ ...outcome, index, count: Number(outcome.weight * space / totalWeight), remainder: outcome.weight * space % totalWeight }));
  let unassigned = UINT32_SPACE - allocated.reduce((sum, outcome) => sum + outcome.count, 0);
  const priority = [...allocated].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (let index = 0; index < unassigned; index++) priority[index].count++;
  let cursor = 0;
  const outcomes = allocated.map(outcome => {
    const seedStart = cursor; cursor += outcome.count;
    return { potentialIds: outcome.potentialIds, slotCapacity: outcome.slotCapacity, rarity: outcome.rarity, count: outcome.count, seedStart, seedEnd: cursor, percent: outcome.count * 100 / UINT32_SPACE };
  });
  const counts = { common: 0, rare: 0, exceptional: 0 };
  outcomes.forEach(outcome => { counts[outcome.rarity] += outcome.count; });
  const percentages = Object.fromEntries(Object.entries(counts).map(([rarity, count]) => [rarity, count * 100 / UINT32_SPACE]));
  const potentialOdds = potentials.map((trait, index) => {
    const count = outcomes.filter(outcome => outcome.potentialIds.includes(trait.id)).reduce((sum, outcome) => sum + outcome.count, 0);
    return { traitId: trait.id, percent: count * 100 / UINT32_SPACE, count, nominalPercent: retention[index] };
  });
  const capacityOdds = capacities.map(capacity => {
    const count = outcomes.filter(outcome => outcome.slotCapacity === capacity).reduce((sum, outcome) => sum + outcome.count, 0);
    return { capacity, percent: count * 100 / UINT32_SPACE, count, nominalPercent: capacityWeight };
  });
  const shared = potentials.filter(trait => parents.every(parent => parent.potentialIds.includes(trait.id))).length;
  const qualityOdds = getQualityOdds(parents, qualityVersion);
  return { ...qualityOdds.exactPercent, qualityOdds, inheritanceCounts: counts, affinity: potentials.length ? shared / potentials.length : 0, generation: Math.max(...parents.map(parent => parent.generation)) + 1, potentialOdds, capacityOdds, outcomes, counts: qualityOdds.counts, sampleSpace: UINT32_SPACE, exactPercent: { ...qualityOdds.exactPercent } };
}

function createResult(parents, odds, seed, qualitySeed, index) {
  const outcome = odds.outcomes.find(outcome => seed >= outcome.seedStart && seed < outcome.seedEnd);
  requireCondition(outcome, 'seed has no inheritance outcome');
  const potentialIds = [...outcome.potentialIds];
  const geneticQuality = drawGeneticQuality(odds.qualityOdds, qualitySeed);
  const visual = inheritVisual(parents, seed), phenotype = getVisualPhenotype(visual);
  return {
    id: `variety-${serial(index)}`, potentialIds, slotCapacity: outcome.slotCapacity,
    taste: summarizePotentials(potentialIds, 'taste'), effect: summarizePotentials(potentialIds, 'effect'),
    visual, accent: phenotype.accent, color: phenotype.color,
    parents: parents.map(parent => parent.id), geneticQuality, rarity: tierForScore(geneticQuality).id, generation: odds.generation,
  };
}

function applyCommand(state, command, now, replaying = false) {
  const refuse = error => ({ state, ok: false, error });
  if (!isRecord(command) || typeof command.type !== 'string') return refuse('invalid-command');
  if (!Number.isFinite(now) || now < 0) return refuse('invalid-time');
  const commit = (next, recorded, event) => { next.revision++; next.history.push({ command: recorded, at: now }); return { state: next, ok: true, event }; };
  if (command.type === 'START') {
    if (typeof command.requestId !== 'string' || !command.requestId.trim() || command.requestId.length > 128) return refuse('request-id-required');
    const hasQualityVersion = Object.hasOwn(command, 'qualityVersion');
    const qualityVersion = hasQualityVersion ? command.qualityVersion : replaying ? 1 : QUALITY_VERSION;
    if ((qualityVersion !== 1 && qualityVersion !== 2) || (!replaying && qualityVersion !== QUALITY_VERSION)) return refuse('unsupported-quality-version');
    const versionFields = replaying && !hasQualityVersion ? {} : { qualityVersion };
    if (state.trials.some(trial => trial.requestId === command.requestId)) return { state, ok: true, event: 'request-already-committed' };
    const current = state.trials.find(trial => trial.id === state.activeTrialId);
    if (current && !TERMINAL_PHASES.includes(current.phase)) return refuse('trial-in-progress');
    if (Array.isArray(command.parentIds) && command.parentIds.length === 2 && command.parentIds[0] === command.parentIds[1]) return refuse('distinct-parents-required');
    const parents = resolvePair(state, command.parentIds);
    if (!parents) return refuse('parents-required');
    if ('intent' in command || 'taste' in command || 'effect' in command || 'potentialIds' in command || 'slotCapacity' in command || 'visual' in command || 'geneticQuality' in command || 'rarity' in command) return refuse('direct-trait-selection-removed');
    if (!isSeed(command.seed)) return refuse('seed-required');
    if (!isSeed(command.qualitySeed)) return refuse('quality-seed-required');
    const cuttings = command.parentIds.map(id => state.inventory.find(cutting => cutting.varietyId === id));
    if (cuttings.some(cutting => !cutting)) return refuse('insufficient-cuttings');
    const odds = getOdds(state, command.parentIds, qualityVersion), next = clone(state), index = next.trials.length + 1;
    const trial = { id: `trial-${serial(index)}`, requestId: command.requestId, parentIds: [...command.parentIds], cuttingIds: cuttings.map(cutting => cutting.id), seed: command.seed, qualitySeed: command.qualitySeed, ...versionFields, odds, result: createResult(parents, odds, command.seed, command.qualitySeed, index), batch: { id: `batch-${serial(index)}`, quality: 'demo-standard', quantity: 1, unit: 'specimen' }, phase: 'growing', createdAt: now, pointsAwarded: false };
    next.inventory = next.inventory.filter(cutting => !trial.cuttingIds.includes(cutting.id));
    next.trials.push(trial); next.pot.trialId = trial.id; next.activeTrialId = trial.id;
    return commit(next, { type: 'START', parentIds: [...command.parentIds], seed: command.seed, qualitySeed: command.qualitySeed, ...versionFields, requestId: command.requestId }, 'trial-started');
  }
  if (command.type === 'HARVEST') {
    const plant = state.plants.find(plant => plant.varietyId === command.varietyId);
    if (!plant) return refuse('source-plant-required');
    if (plant.harvested >= plant.capacity) return refuse('plant-exhausted');
    const next = clone(state), index = next.harvests.length + 1;
    const cutting = { id: `cutting-harvest-${serial(index)}`, varietyId: plant.varietyId, sourcePlantId: plant.id };
    next.inventory.push(cutting); next.plants.find(source => source.id === plant.id).harvested++;
    next.harvests.push({ id: `harvest-${serial(index)}`, plantId: plant.id, varietyId: plant.varietyId, cuttingId: cutting.id });
    return commit(next, { type: 'HARVEST', varietyId: plant.varietyId }, 'cutting-harvested');
  }
  if (command.type === 'ACTIVATE') {
    const strain = getStrains(state).find(strain => strain.id === command.varietyId);
    if (!strain) return refuse('variety-not-found');
    if (!Number.isInteger(command.slotIndex) || command.slotIndex < 0 || command.slotIndex >= strain.slotCapacity) return refuse('slot-unavailable');
    if (!strain.potentialIds.includes(command.traitId)) return refuse('potential-unavailable');
    const research = state.research[strain.id], slotId = `slot-${command.slotIndex}`;
    if (research.choices[slotId]) return refuse('slot-occupied');
    if (Object.values(research.choices).includes(command.traitId)) return refuse('trait-already-active');
    if (research.earned - research.spent < 1) return refuse('research-point-required');
    const next = clone(state); next.research[strain.id].spent++; next.research[strain.id].choices[slotId] = command.traitId;
    next.activations.push({ id: `activation-${serial(next.activations.length + 1)}`, varietyId: strain.id, slotIndex: command.slotIndex, traitId: command.traitId, cost: 1 });
    return commit(next, { type: 'ACTIVATE', varietyId: strain.id, slotIndex: command.slotIndex, traitId: command.traitId }, 'trait-activated');
  }
  const phases = { ADVANCE: ['growing', 'ready'], INSPECT: ['ready', 'inspected'], REVEAL: ['inspected', 'revealed'], KEEP: ['revealed', 'kept'], ARCHIVE: ['revealed', 'archived'] };
  if (!Object.hasOwn(phases, command.type)) return refuse('unknown-command');
  const index = state.trials.findIndex(trial => trial.id === command.trialId);
  if (index < 0) return refuse('trial-not-found');
  if (state.trials[index].phase !== phases[command.type][0]) return refuse('wrong-phase');
  const name = normalizeText(command.name), signature = normalizeText(command.signature);
  if (command.type === 'KEEP' && !name) return refuse('name-required');
  const next = clone(state), trial = next.trials[index]; trial.phase = phases[command.type][1];
  if (command.type === 'ADVANCE') next.pot.trialId = null;
  if (command.type === 'REVEAL' && trial.result.geneticQuality >= 60) { for (const parentId of trial.parentIds) next.research[parentId].earned++; trial.pointsAwarded = true; }
  if (command.type === 'KEEP') {
    next.varieties.push({ ...clone(trial.result), name, signature, trialId: trial.id }); next.research[trial.result.id] = emptyResearch();
    next.plants.push({ id: `plant-${trial.result.id}`, varietyId: trial.result.id, capacity: 8, harvested: 0, createdByTrialId: trial.id });
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
  requireCondition(isRecord(state) && state.schema === 5, 'unsupported schema; V04 requires a new career');
  requireCondition(Array.isArray(state.history), 'missing command history');
  requireCondition(Number.isSafeInteger(state.revision) && state.revision === state.history.length, 'revision');
  requireCondition(Array.isArray(state.trials) && Array.isArray(state.varieties), 'missing identity collections');
  state.trials.forEach(trial => validateVisual(trial.result?.visual));
  state.varieties.forEach(variety => validateVisual(variety.visual));
  let replay = createState();
  for (const entry of state.history) {
    requireCondition(isRecord(entry) && isRecord(entry.command) && Number.isFinite(entry.at) && entry.at >= 0, 'history entry');
    const next = applyCommand(replay, entry.command, entry.at, true);
    requireCondition(next.ok && next.state !== replay, `history command ${entry.command.type} refused`); replay = next.state;
  }
  requireCondition(snapshot(replay) === snapshot(state), 'history does not match saved resources, outcomes or research');
  for (const trial of state.trials) requireCondition(trial.pointsAwarded === (KNOWN_PHASES.includes(trial.phase) && trial.result.geneticQuality >= 60), 'point award phase');
  return state;
}
export function restoreState(json) {
  const state = typeof json === 'string' ? JSON.parse(json) : clone(json);
  return validateState(state);
}
export function transition(state, command, now = Date.now()) {
  validateState(state); const result = applyCommand(state, command, now);
  if (result.ok && result.state !== state) validateState(result.state);
  return result;
}
