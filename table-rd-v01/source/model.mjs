// Fictional demonstration data. These values do not define production rules.
export const PARENTS = Object.freeze([
  Object.freeze({ id: 'aube', name: { fr: 'Aube', en: 'Dawn' }, taste: { fr: 'Citronné', en: 'Citrus' }, effect: { fr: 'Élan', en: 'Lift' }, color: '#b5bf68' }),
  Object.freeze({ id: 'lisiere', name: { fr: 'Lisière', en: 'Woodland' }, taste: { fr: 'Boisé', en: 'Woody' }, effect: { fr: 'Calme', en: 'Calm' }, color: '#6a9b79' }),
  Object.freeze({ id: 'velours', name: { fr: 'Velours', en: 'Velvet' }, taste: { fr: 'Floral', en: 'Floral' }, effect: { fr: 'Rêverie', en: 'Reverie' }, color: '#aa8fbb' }),
]);

const PHASES = ['growing', 'ready', 'inspected', 'revealed', 'kept', 'archived'];
const TERMINAL_PHASES = ['kept', 'archived'];
const clone = value => structuredClone(value);
const initialCuttings = () => PARENTS.flatMap(parent => Array.from({ length: 3 }, (_, index) => ({
  id: `cutting-${parent.id}-${index + 1}`,
  varietyId: parent.id,
  sourcePlantId: `plant-${parent.id}-demo`,
})));
const serial = index => String(index).padStart(3, '0');
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const requireCondition = (condition, message) => { if (!condition) throw new Error(`Invalid research state: ${message}`); };
const normalizeText = value => typeof value === 'string'
  ? Array.from(value.normalize('NFC').replace(/[<>\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim()).slice(0, 48).join('')
  : '';

function createResult(parentIds, intent, index) {
  const parents = parentIds.map(id => PARENTS.find(parent => parent.id === id));
  const tasteParent = parents[intent === 'aroma' ? 0 : 1];
  const effectParent = parents[intent === 'aroma' ? 1 : 0];
  return {
    id: `variety-${serial(index)}`,
    taste: clone(tasteParent.taste),
    effect: clone(effectParent.effect),
    // Alternation makes the small accent reproducible, including after reload.
    // It is a preview fixture, not a probability or a final inheritance rule.
    accent: index % 2 === 1 ? { fr: 'Reflets dorés', en: 'Golden glints' } : { fr: 'Reflets mauves', en: 'Mauve glints' },
    color: tasteParent.color,
    parents: [...parentIds],
  };
}

export function createState() {
  return {
    schema: 1,
    revision: 0,
    inventory: initialCuttings(),
    pot: { id: 'pot-demo-01', trialId: null },
    trials: [],
    varieties: [],
    activeTrialId: null,
  };
}

export function validateState(state) {
  requireCondition(isRecord(state) && state.schema === 1, 'unsupported schema');
  requireCondition(Number.isSafeInteger(state.revision) && state.revision >= 0, 'revision');
  requireCondition(Array.isArray(state.inventory) && Array.isArray(state.trials) && Array.isArray(state.varieties), 'collections');
  requireCondition(isRecord(state.pot) && state.pot.id === 'pot-demo-01', 'pot identity');
  requireCondition(state.trials.length <= 4, 'trial count exceeds available cuttings');

  const initial = new Map(initialCuttings().map(cutting => [cutting.id, cutting]));
  const occupiedCuttings = new Set();
  for (const cutting of state.inventory) {
    requireCondition(isRecord(cutting) && initial.has(cutting.id), 'unknown cutting');
    const original = initial.get(cutting.id);
    requireCondition(cutting.varietyId === original.varietyId && cutting.sourcePlantId === original.sourcePlantId, 'cutting provenance');
    requireCondition(!occupiedCuttings.has(cutting.id), 'duplicate physical cutting');
    occupiedCuttings.add(cutting.id);
  }

  const requestIds = new Set();
  for (const [index, trial] of state.trials.entries()) {
    requireCondition(isRecord(trial) && trial.id === `trial-${serial(index + 1)}`, 'trial identity');
    requireCondition(typeof trial.requestId === 'string' && trial.requestId.length > 0 && trial.requestId.length <= 128, 'request identity');
    requireCondition(!requestIds.has(trial.requestId), 'duplicate request');
    requestIds.add(trial.requestId);
    requireCondition(Array.isArray(trial.parentIds) && trial.parentIds.length === 2 && trial.parentIds[0] !== trial.parentIds[1], 'parent pair');
    requireCondition(trial.parentIds.every(id => PARENTS.some(parent => parent.id === id)), 'unknown parent');
    requireCondition(trial.intent === 'aroma' || trial.intent === 'character', 'intent');
    requireCondition(PHASES.includes(trial.phase), 'trial phase');
    requireCondition(Number.isFinite(trial.createdAt) && trial.createdAt >= 0, 'creation time');
    requireCondition(Array.isArray(trial.cuttingIds) && trial.cuttingIds.length === 2, 'consumed cuttings');
    trial.cuttingIds.forEach((id, parentIndex) => {
      requireCondition(initial.has(id) && initial.get(id).varietyId === trial.parentIds[parentIndex], 'consumed cutting parent');
      requireCondition(!occupiedCuttings.has(id), 'cutting consumed more than once');
      occupiedCuttings.add(id);
    });
    requireCondition(JSON.stringify(trial.result) === JSON.stringify(createResult(trial.parentIds, trial.intent, index + 1)), 'result identity changed');
    requireCondition(isRecord(trial.batch) && trial.batch.id === `batch-${serial(index + 1)}` && trial.batch.quantity === 1 && trial.batch.unit === 'specimen', 'batch identity or quantity');
    requireCondition(typeof trial.batch.quality === 'string' && trial.batch.quality.length > 0 && trial.batch.quality.length <= 48, 'batch quality');
    if (index < state.trials.length - 1) requireCondition(TERMINAL_PHASES.includes(trial.phase), 'unfinished prior trial');
  }
  requireCondition(occupiedCuttings.size === initial.size, 'cutting conservation');

  const latest = state.trials.at(-1);
  requireCondition(state.activeTrialId === (latest?.id ?? null), 'active trial linkage');
  requireCondition(state.pot.trialId === (latest?.phase === 'growing' ? latest.id : null), 'pot reservation');
  const keptTrials = state.trials.filter(trial => trial.phase === 'kept');
  requireCondition(state.varieties.length === keptTrials.length, 'kept variety count');
  state.varieties.forEach((variety, index) => {
    const trial = keptTrials[index];
    requireCondition(isRecord(variety) && variety.id === trial.result.id && variety.trialId === trial.id, 'kept identity');
    requireCondition(typeof variety.name === 'string' && variety.name.length > 0 && variety.name === normalizeText(variety.name), 'variety name');
    requireCondition(typeof variety.signature === 'string' && variety.signature === normalizeText(variety.signature), 'signature');
    const { name, signature, trialId, ...identity } = variety;
    requireCondition(JSON.stringify(identity) === JSON.stringify(trial.result), 'kept traits changed');
  });
  return state;
}

export function restoreState(json) {
  const state = typeof json === 'string' ? JSON.parse(json) : clone(json);
  return validateState(state);
}

export function transition(state, command, now = Date.now()) {
  validateState(state);
  const refuse = error => ({ state, ok: false, error });
  if (!isRecord(command)) return refuse('invalid-command');

  if (command.type === 'START') {
    if (typeof command.requestId !== 'string' || !command.requestId.trim() || command.requestId.length > 128) return refuse('request-id-required');
    const repeated = state.trials.find(trial => trial.requestId === command.requestId);
    if (repeated) return { state, ok: true, event: 'request-already-committed' };
    const current = state.trials.find(trial => trial.id === state.activeTrialId);
    if (current && !TERMINAL_PHASES.includes(current.phase)) return refuse('trial-in-progress');
    if (!Array.isArray(command.parentIds) || command.parentIds.length !== 2 || !command.parentIds.every(id => PARENTS.some(parent => parent.id === id))) return refuse('parents-required');
    if (command.parentIds[0] === command.parentIds[1]) return refuse('distinct-parents-required');
    if (!['aroma', 'character'].includes(command.intent)) return refuse('invalid-intent');
    if (!Number.isFinite(now) || now < 0) return refuse('invalid-time');
    const cuttings = command.parentIds.map(id => state.inventory.find(cutting => cutting.varietyId === id));
    if (cuttings.some(cutting => !cutting)) return refuse('insufficient-cuttings');

    const next = clone(state);
    const index = next.trials.length + 1;
    const trial = {
      id: `trial-${serial(index)}`,
      requestId: command.requestId,
      parentIds: [...command.parentIds],
      cuttingIds: cuttings.map(cutting => cutting.id),
      intent: command.intent,
      result: createResult(command.parentIds, command.intent, index),
      batch: { id: `batch-${serial(index)}`, quality: 'demo-standard', quantity: 1, unit: 'specimen' },
      phase: 'growing',
      createdAt: now,
    };
    next.inventory = next.inventory.filter(cutting => !trial.cuttingIds.includes(cutting.id));
    next.trials.push(trial);
    next.pot.trialId = trial.id;
    next.activeTrialId = trial.id;
    next.revision += 1;
    validateState(next);
    return { state: next, ok: true, event: 'trial-started' };
  }

  const expectedPhase = { ADVANCE: 'growing', INSPECT: 'ready', REVEAL: 'inspected', KEEP: 'revealed', ARCHIVE: 'revealed' }[command.type];
  if (!expectedPhase) return refuse('unknown-command');
  const index = state.trials.findIndex(trial => trial.id === command.trialId);
  if (index < 0) return refuse('trial-not-found');
  if (state.trials[index].phase !== expectedPhase) return refuse('wrong-phase');
  const name = normalizeText(command.name);
  if (command.type === 'KEEP' && !name) return refuse('name-required');
  const next = clone(state);
  const trial = next.trials[index];
  const targetPhase = { ADVANCE: 'ready', INSPECT: 'inspected', REVEAL: 'revealed', KEEP: 'kept', ARCHIVE: 'archived' }[command.type];
  trial.phase = targetPhase;
  if (command.type === 'ADVANCE') next.pot.trialId = null;
  if (command.type === 'KEEP') next.varieties.push({ ...clone(trial.result), name, signature: normalizeText(command.signature), trialId: trial.id });
  next.revision += 1;
  validateState(next);
  return { state: next, ok: true, event: { ADVANCE: 'trial-ready', INSPECT: 'specimen-inspected', REVEAL: 'record-revealed', KEEP: 'variety-kept', ARCHIVE: 'trial-archived' }[command.type] };
}
