// Standalone game-state prototype. All quantities and timings are fictional.
// The temporary accounting rule is one input unit to one pollen unit.
export const PARAMETERS = Object.freeze({ jarCapacity: 250, drumCapacity: 1000, trayCapacity: 300, maxSelection: 30, pressSeconds: 2.6, returnSeconds: 0.65, pourRate: 155, feedRate: 350, maxSpeed: 8, impulse: 3.1, drag: 0.52, extractionPerRadian: 20 });
export const mass = contents => contents.reduce((sum, part) => sum + part.grams, 0);
const clone = value => JSON.parse(JSON.stringify(value));
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
const success = (events = [], extra = {}) => ({ ok: true, code: 'ok', events, ...extra });
const failure = code => ({ ok: false, code, events: [] });
const signature = plate => JSON.stringify([plate.id, plate.format, plate.variety, plate.contents]);
const varietyOf = (state, contents) => contents.length ? state.lots[contents[0].lotId]?.variety : null;
const uniform = (state, contents, variety) => contents.every(part => state.lots[part.lotId]?.variety === variety);
function append(target, parts) {
  for (const part of parts) {
    const existing = target.find(item => item.lotId === part.lotId);
    if (existing) existing.grams += part.grams;
    else target.push({ lotId: part.lotId, grams: part.grams });
  }
}
function remove(source, amount) {
  const parts = [];
  let remaining = amount;
  while (remaining > 0 && source.length) {
    const taken = Math.min(remaining, source[0].grams);
    parts.push({ lotId: source[0].lotId, grams: taken });
    source[0].grams -= taken;
    remaining -= taken;
    if (!source[0].grams) source.shift();
  }
  return parts;
}
function move(source, target, amount) { const parts = remove(source, amount); append(target, parts); return parts; }
const pressContents = state => [...state.press.tray, ...state.press.mold, ...state.jars.filter(jar => jar.location === 'press').flatMap(jar => jar.contents)];
const hands = state => state.plates.filter(plate => plate.location === 'hand');
const packageHeld = state => state.packages.some(pack => pack.location === 'hand');
function newJar(state, location, contents) {
  const id = `jar-${++state.ids.jar}`;
  const jar = { id, location, contents };
  state.jars.push(jar);
  state.jarRecords.push(id);
  return jar;
}
export function createState() {
  const lots = {
    'lot-amber-01': { id: 'lot-amber-01', variety: 'amber', harvest: '01', quality: 'soft', color: '#987140', roughness: 0.86, granularity: 0.85 },
    'lot-amber-02': { id: 'lot-amber-02', variety: 'amber', harvest: '02', quality: 'dense', color: '#5b3b25', roughness: 0.42, granularity: 0.35 },
    'lot-ochre-01': { id: 'lot-ochre-01', variety: 'ochre', harvest: '03', quality: 'grainy', color: '#b28c48', roughness: 0.94, granularity: 1 }
  };
  const state = {
    version: 1, time: 0, lots, lotRecords: JSON.stringify(lots),
    initialByLot: { 'lot-amber-01': 4250, 'lot-amber-02': 4250, 'lot-ochre-01': 1500 },
    source: [{ lotId: 'lot-amber-01', grams: 4250 }, { lotId: 'lot-amber-02', grams: 4250 }, { lotId: 'lot-ochre-01', grams: 1500 }],
    settings: { ...PARAMETERS, feeling: 'snappy' }, ids: { jar: 0, plate: 0, package: 0 },
    drum: { contents: [], speed: 0, angle: 0, work: 0 },
    jars: [], jarRecords: [], plates: [], plateRecords: {}, packages: [],
    press: { format: 100, variety: null, queue: [], tray: [], mold: [], trayHeld: false, progress: 0, phase: 'idle', returnTime: 0, lever: 0, pourCarry: 0, feedCarry: 0 },
    counters: { produced: 0, extracted: 0, departed: 0, accepted: 0, overflowReturned: 0, wrapped: 0, opened: 0 }
  };
  for (let i = 0; i < 2; i++) newJar(state, 'inventory', []);
  return state;
}
export function dispatch(state, action = {}) {
  const p = state.press;
  switch (action.type) {
    case 'load': {
      const source = state.source.find(part => part.lotId === action.lotId);
      if (!source || !positiveInteger(action.grams) || action.grams > source.grams) return failure('invalid_quantity');
      if (mass(state.drum.contents) + action.grams > state.settings.drumCapacity) return failure('drum_full');
      if (state.drum.contents.length && !uniform(state, state.drum.contents, state.lots[action.lotId].variety)) return failure('different_variety');
      source.grams -= action.grams;
      append(state.drum.contents, [{ lotId: action.lotId, grams: action.grams }]);
      return success([{ type: 'loaded', lotId: action.lotId, grams: action.grams }]);
    }
    case 'stopDrum':
      state.drum.speed = 0;
      return success([{ type: 'drumStopped' }]);
    case 'impulse':
      state.drum.speed = Math.min(state.settings.maxSpeed, state.drum.speed + state.settings.impulse);
      return success([{ type: 'impulse', speed: state.drum.speed }]);
    case 'takeJar': {
      const jar = state.jars.find(j => j.id === action.jarId);
      if (!jar || jar.location !== 'stock') return failure('jar_unavailable');
      jar.location = 'inventory';
      return success([{ type: 'jarTaken', jarId: jar.id }]);
    }
    case 'depositJars': {
      if (!Array.isArray(action.jarIds) || !action.jarIds.length || new Set(action.jarIds).size !== action.jarIds.length) return failure('invalid_selection');
      const jars = action.jarIds.map(id => state.jars.find(j => j.id === id));
      if (jars.some(jar => !jar || jar.location !== 'inventory' || !mass(jar.contents))) return failure('jar_unavailable');
      const parts = jars.flatMap(jar => jar.contents);
      const variety = varietyOf(state, parts);
      if (!uniform(state, parts, variety)) return failure('different_variety');
      if (mass(parts) % p.format !== 0) return failure('incomplete_deposit');
      if (!uniform(state, pressContents(state), variety)) return failure('different_variety');
      for (const jar of jars) jar.location = 'press';
      p.queue.push(...action.jarIds);
      p.variety = variety;
      return success([{ type: 'jarsDeposited', jarIds: [...action.jarIds], grams: mass(parts) }]);
    }
    case 'withdrawJar': {
      const jar = state.jars.find(j => j.id === action.jarId);
      if (!jar || jar.location !== 'press') return failure('jar_unavailable');
      jar.location = 'inventory';
      p.queue = p.queue.filter(id => id !== jar.id);
      return success([{ type: 'jarWithdrawn', jarId: jar.id, grams: mass(jar.contents) }]);
    }
    case 'reuseJar': {
      const jar = state.jars.find(j => j.id === action.jarId);
      if (!jar || jar.location !== 'inventory' || mass(jar.contents)) return failure('empty_jar_required');
      jar.location = 'reuse';
      return success([{ type: 'jarReused', jarId: jar.id }]);
    }
    case 'takeTray':
      if (p.trayHeld || p.phase !== 'idle' || p.progress > 0 || mass(p.mold) >= p.format || packageHeld(state) || hands(state).length) return failure('tray_unavailable');
      if (!mass(p.tray)) return failure('tray_empty');
      p.trayHeld = true;
      return success([{ type: 'trayTaken' }]);
    case 'putTray':
      if (!p.trayHeld) return failure('tray_unavailable');
      p.trayHeld = false;
      return success([{ type: 'trayRested' }]);
    case 'pour': {
      if (!p.trayHeld || p.phase !== 'idle' || p.progress > 0 || mass(p.mold) >= p.format) return failure('pour_unavailable');
      if (!positiveInteger(action.grams) || action.grams > mass(p.tray)) return failure('invalid_quantity');
      const departing = remove(p.tray, action.grams);
      const admitted = Math.min(action.grams, p.format - mass(p.mold));
      append(p.mold, remove(departing, admitted));
      const overflow = mass(departing);
      append(p.tray, departing);
      state.counters.departed += action.grams;
      state.counters.accepted += admitted;
      state.counters.overflowReturned += overflow;
      const events = [{ type: 'poured', departed: action.grams, accepted: admitted, overflow, neverPoured: mass(p.tray) - overflow }];
      if (overflow) events.push({ type: 'overflowReturned', grams: overflow, contents: clone(departing) });
      if (mass(p.mold) === p.format) { p.trayHeld = false; p.pourCarry = 0; events.push({ type: 'trayRested' }, { type: 'moldFull' }); }
      return success(events);
    }
    case 'setFormat':
      if (![100, 250].includes(action.format)) return failure('invalid_format');
      if (mass(p.mold) || p.trayHeld || p.phase !== 'idle' || p.progress) return failure('mold_busy');
      p.format = action.format;
      return success([{ type: 'formatChanged', format: p.format }]);
    case 'recover': {
      if (!['tray', 'mold'].includes(action.source)) return failure('invalid_source');
      if (p.progress || p.phase !== 'idle' || p.trayHeld) return failure('recovery_unavailable');
      const jar = state.jars.find(j => j.id === action.jarId);
      if (!jar || jar.location !== 'inventory') return failure('jar_unavailable');
      const source = p[action.source];
      const amount = action.grams ?? Math.min(mass(source), state.settings.jarCapacity - mass(jar.contents));
      if (!positiveInteger(amount) || amount > mass(source) || amount + mass(jar.contents) > state.settings.jarCapacity) return failure('invalid_quantity');
      const variety = varietyOf(state, source);
      if (!uniform(state, jar.contents, variety)) return failure('different_variety');
      const contents = move(source, jar.contents, amount);
      return success([{ type: 'recovered', source: action.source, jarId: jar.id, grams: amount, contents: clone(contents) }]);
    }
    case 'press':
      if (mass(p.mold) !== p.format || p.trayHeld || p.phase !== 'idle') return failure('mold_incomplete');
      if (packageHeld(state) || hands(state).length) return failure('hands_busy');
      return success([{ type: 'pressReady' }]);
    case 'selectPlate': {
      const plate = state.plates.find(item => item.id === action.plateId);
      if (!plate || plate.location !== 'floor') return failure('plate_unavailable');
      if (p.trayHeld || packageHeld(state)) return failure('hands_busy');
      const selected = hands(state);
      if (selected.length >= state.settings.maxSelection) return failure('selection_full');
      if (selected.length && (selected[0].format !== plate.format || selected[0].variety !== plate.variety)) return failure('incompatible_plate');
      plate.location = 'hand';
      return success([{ type: 'plateTaken', plateId: plate.id }]);
    }
    case 'deselectPlate': {
      const plate = state.plates.find(item => item.id === action.plateId);
      if (!plate || plate.location !== 'hand') return failure('plate_unavailable');
      plate.location = 'floor';
      return success([{ type: 'plateDropped', plateId: plate.id }]);
    }
    case 'wrap': {
      const selected = hands(state);
      if (!selected.length || selected.length > state.settings.maxSelection || packageHeld(state) || p.trayHeld) return failure('invalid_selection');
      if (!selected.every(plate => plate.variety === selected[0].variety && plate.format === selected[0].format)) return failure('incompatible_plate');
      const id = `package-${++state.ids.package}`;
      const pack = { id, plateIds: selected.map(plate => plate.id), location: 'hand', variety: selected[0].variety, format: selected[0].format };
      state.packages.push(pack);
      for (const plate of selected) { plate.location = 'package'; plate.packageId = id; }
      state.counters.wrapped++;
      return success([{ type: 'wrapped', packageId: id, plateIds: [...pack.plateIds] }], { packageId: id });
    }
    case 'dropPackage': {
      const pack = state.packages.find(item => item.id === action.packageId);
      if (!pack || pack.location !== 'hand') return failure('package_unavailable');
      pack.location = 'floor';
      return success([{ type: 'packageDropped', packageId: pack.id }]);
    }
    case 'openPackage': {
      const pack = state.packages.find(item => item.id === action.packageId);
      if (!pack || pack.location !== 'floor') return failure('package_unavailable');
      const plates = pack.plateIds.map(id => state.plates.find(plate => plate.id === id));
      if (plates.some(plate => !plate || plate.location !== 'package' || plate.packageId !== pack.id)) return failure('invalid_package');
      for (const plate of plates) { plate.location = 'floor'; delete plate.packageId; }
      pack.location = 'opened';
      state.counters.opened++;
      return success([{ type: 'packageOpened', packageId: pack.id, plateIds: [...pack.plateIds] }]);
    }
    case 'setFeel':
    case 'setFeeling': {
      const feeling = action.feeling ?? action.preset;
      if (!['snappy', 'weighty'].includes(feeling)) return failure('invalid_feeling');
      const options = { snappy: [2.6, 0.52], weighty: [3.3, 0.65] }[feeling];
      state.settings.feeling = feeling;
      state.settings.pressSeconds = options[0];
      state.settings.drag = options[1];
      return success([{ type: 'feelingChanged', feeling }]);
    }
    default: return failure('unknown_action');
  }
}
export function tick(state, dt, input = {}) {
  if (!Number.isFinite(dt) || dt <= 0) return [];
  dt = Math.min(dt, 0.25);
  const events = [];
  const s = state.settings, d = state.drum, p = state.press;
  state.time += dt;
  const speedBefore = d.speed;
  d.speed *= Math.exp(-s.drag * dt);
  if (d.speed < 0.005) d.speed = 0;
  const travel = (speedBefore + d.speed) * 0.5 * dt;
  d.angle = (d.angle + travel) % (Math.PI * 2);
  if (mass(d.contents)) {
    d.work += travel * s.extractionPerRadian;
    while (mass(d.contents) && d.work >= Math.min(s.jarCapacity, mass(d.contents))) {
      const amount = Math.min(s.jarCapacity, mass(d.contents));
      const contents = remove(d.contents, amount);
      let jar = state.jars.find(item => item.location === 'reuse' && !mass(item.contents));
      if (jar) { jar.location = 'stock'; jar.contents = contents; }
      else jar = newJar(state, 'stock', contents);
      d.work -= amount;
      state.counters.extracted += amount;
      events.push({ type: 'jarProduced', jarId: jar.id, grams: amount });
    }
    if (!mass(d.contents)) d.work = 0;
  }
  if (!p.trayHeld && mass(p.tray) < s.trayCapacity) {
    p.feedCarry += s.feedRate * dt;
    let allowance = Math.floor(p.feedCarry);
    p.feedCarry -= allowance;
    for (const jar of p.queue.map(id => state.jars.find(item => item.id === id)).filter(item => item && mass(item.contents))) {
      const amount = Math.min(allowance, mass(jar.contents), s.trayCapacity - mass(p.tray));
      if (amount <= 0) break;
      move(jar.contents, p.tray, amount);
      allowance -= amount;
      events.push({ type: 'trayFed', jarId: jar.id, grams: amount });
    }
  }
  if (input.pour && p.trayHeld && mass(p.tray) && p.phase === 'idle' && !p.progress) {
    p.pourCarry += s.pourRate * dt;
    const amount = Math.min(Math.floor(p.pourCarry), mass(p.tray));
    if (amount) { p.pourCarry -= amount; events.push(...dispatch(state, { type: 'pour', grams: amount }).events); }
  }
  if (p.phase === 'returning') {
    p.returnTime += dt;
    p.lever = Math.max(0, 1 - p.returnTime / s.returnSeconds);
    if (p.returnTime >= s.returnSeconds) {
      const plate = { id: `plate-${++state.ids.plate}`, format: p.format, variety: varietyOf(state, p.mold), contents: remove(p.mold, mass(p.mold)), location: 'floor' };
      state.plates.push(plate);
      state.plateRecords[plate.id] = signature(plate);
      state.counters.produced++;
      p.phase = 'idle'; p.progress = 0; p.returnTime = 0; p.lever = 0;
      events.push({ type: 'plateEjected', plateId: plate.id, format: plate.format, contents: clone(plate.contents) });
    }
  } else if (input.press && !p.trayHeld && !hands(state).length && !packageHeld(state) && mass(p.mold) === p.format) {
    const wasZero = p.progress === 0;
    p.progress = Math.min(1, p.progress + dt / s.pressSeconds);
    p.lever += (p.progress - p.lever) * Math.min(1, dt * 12);
    if (wasZero) events.push({ type: 'pressStarted' });
    if (p.progress >= 1) { p.phase = 'returning'; p.returnTime = 0; p.lever = 1; events.push({ type: 'pressCompleted' }); }
  } else {
    p.lever *= Math.exp(-dt * 7);
  }
  return events;
}
export function inventorySlots(state) {
  const groups = new Map();
  for (const jar of state.jars.filter(item => item.location === 'inventory')) {
    const key = varietyOf(state, jar.contents) ?? 'empty';
    const group = groups.get(key) ?? [];
    group.push(jar.id); groups.set(key, group);
  }
  return [...groups].flatMap(([variety, ids]) => Array.from({ length: Math.ceil(ids.length / 10) }, (_, index) => ({ variety, jarIds: ids.slice(index * 10, index * 10 + 10) })));
}
export function audit(state) {
  const errors = [], byLot = Object.fromEntries(Object.keys(state.initialByLot).map(id => [id, 0]));
  if (JSON.stringify(state.lots) !== state.lotRecords) errors.push('Lot metadata changed');
  const allContents = [state.source, state.drum.contents, state.press.tray, state.press.mold, ...state.jars.map(item => item.contents), ...state.plates.map(item => item.contents)];
  for (const [index, contents] of allContents.entries()) {
    const seen = new Set();
    for (const part of contents) {
      if (!Number.isSafeInteger(part.grams) || part.grams < 0 || (!part.grams && index !== 0)) errors.push(`Invalid mass in container ${index}`);
      if (!(part.lotId in byLot)) errors.push(`Unknown lot ${part.lotId}`);
      else byLot[part.lotId] += part.grams;
      if (seen.has(part.lotId)) errors.push(`Duplicate contribution ${part.lotId} in container ${index}`);
      seen.add(part.lotId);
    }
  }
  for (const [id, expected] of Object.entries(state.initialByLot)) if (byLot[id] !== expected) errors.push(`Conservation failed for ${id}: ${byLot[id]} != ${expected}`);
  for (const [name, items] of [['jars', state.jars], ['plates', state.plates], ['packages', state.packages]]) if (new Set(items.map(item => item.id)).size !== items.length) errors.push(`Duplicate ${name} identity`);
  if (state.jars.length !== state.jarRecords.length || state.jarRecords.some(id => !state.jars.some(jar => jar.id === id))) errors.push('Missing jar identity');
  if (Object.keys(state.plateRecords).length !== state.plates.length) errors.push('Missing plate identity');
  for (const jar of state.jars) {
    if (!['stock', 'inventory', 'press', 'reuse'].includes(jar.location)) errors.push(`Invalid jar location ${jar.id}`);
    if (mass(jar.contents) > state.settings.jarCapacity) errors.push(`Jar capacity exceeded ${jar.id}`);
    if (!uniform(state, jar.contents, varietyOf(state, jar.contents))) errors.push(`Mixed variety in ${jar.id}`);
    if (jar.location === 'reuse' && mass(jar.contents)) errors.push(`Nonempty reuse jar ${jar.id}`);
  }
  if (mass(state.press.tray) > state.settings.trayCapacity || mass(state.press.mold) > state.press.format) errors.push('Press capacity exceeded');
  if (mass(state.drum.contents) > state.settings.drumCapacity || !uniform(state, state.drum.contents, varietyOf(state, state.drum.contents))) errors.push('Invalid drum contents');
  if (!uniform(state, pressContents(state), varietyOf(state, pressContents(state)))) errors.push('Mixed variety at press');
  if (mass(pressContents(state)) && !uniform(state, pressContents(state), state.press.variety)) errors.push('Press variety mismatch');
  if (new Set(state.press.queue).size !== state.press.queue.length || state.press.queue.length !== state.jars.filter(jar => jar.location === 'press').length || state.press.queue.some(id => !state.jars.some(jar => jar.id === id && jar.location === 'press'))) errors.push('Invalid press queue');
  if (state.press.progress > 0 && mass(state.press.mold) !== state.press.format) errors.push('Incomplete mold under compression');
  for (const plate of state.plates) {
    if (![100, 250].includes(plate.format) || mass(plate.contents) !== plate.format) errors.push(`Invalid plate mass ${plate.id}`);
    if (!uniform(state, plate.contents, plate.variety)) errors.push(`Mixed variety in ${plate.id}`);
    if (state.plateRecords[plate.id] !== signature(plate)) errors.push(`Plate identity or composition changed ${plate.id}`);
    if (!['floor', 'hand', 'package'].includes(plate.location)) errors.push(`Invalid plate location ${plate.id}`);
    if (plate.location === 'package' && !state.packages.some(pack => pack.id === plate.packageId && pack.location !== 'opened' && pack.plateIds.includes(plate.id))) errors.push(`Orphan packaged plate ${plate.id}`);
  }
  const claimed = new Set();
  for (const pack of state.packages) {
    if (!['hand', 'floor', 'opened'].includes(pack.location)) errors.push(`Invalid package location ${pack.id}`);
    if (pack.location === 'opened') continue;
    if (!pack.plateIds.length || pack.plateIds.length > 30 || new Set(pack.plateIds).size !== pack.plateIds.length) errors.push(`Invalid package size ${pack.id}`);
    for (const id of pack.plateIds) {
      const plate = state.plates.find(item => item.id === id);
      if (claimed.has(id)) errors.push(`Plate claimed by two packages ${id}`);
      claimed.add(id);
      if (!plate || plate.location !== 'package' || plate.packageId !== pack.id || plate.variety !== pack.variety || plate.format !== pack.format) errors.push(`Package contents mismatch ${pack.id}`);
    }
  }
  const selected = hands(state);
  if (selected.length > 30 || (selected.length && !selected.every(plate => plate.format === selected[0].format && plate.variety === selected[0].variety))) errors.push('Invalid held selection');
  if (state.packages.filter(pack => pack.location === 'hand').length > 1 || (packageHeld(state) && selected.length)) errors.push('Conflicting hand ownership');
  if (state.press.trayHeld && (selected.length || packageHeld(state))) errors.push('Tray conflicts with held objects');
  if (state.counters.departed !== state.counters.accepted + state.counters.overflowReturned) errors.push('Overflow accounting mismatch');
  if (state.counters.produced !== state.plates.length) errors.push('Production count mismatch');
  return { ok: !errors.length, errors, total: Object.values(byLot).reduce((a, b) => a + b, 0), byLot, jars: state.jars.length, plates: state.plates.length, packages: state.packages.filter(pack => pack.location !== 'opened').length };
}
