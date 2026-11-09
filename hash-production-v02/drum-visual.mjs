import * as THREE from './vendor/three.module.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const between = (value, from, to) => clamp((value - from) / (to - from));
function seeded(value) { let result = 2166136261; for (const char of String(value)) result = Math.imul(result ^ char.charCodeAt(0), 16777619); return (result >>> 0) / 4294967296; }

export const DRUM_SHAPE = Object.freeze({ radius: 0.29, length: 0.72, axisHeight: 1.28, maximumBudPieces: 24, maximumBranchPieces: 8, budsPerBranch: 3, displayChargeUnits: 1000, openingArcDegrees: 90 });

export function createDrumVisual({ scene, materials, mesh, box, cylinder, barBetween, tray, allocatedGeometries, allocatedMaterials }) {
  const shape = DRUM_SHAPE, origin = new THREE.Group(); origin.position.set(-1.8, 0, 0); scene.add(origin);
  box(1.6, 0.1, 1, materials.wood, origin, 0, 0.82, 0);
  for (const x of [-0.65, 0.65]) for (const z of [-0.36, 0.36]) {
    box(0.085, 0.8, 0.085, materials.dark, origin, x, 0.4, z);
    box(0.14, 0.06, 0.14, materials.black, origin, x, 0.015, z);
  }
  for (const x of [-0.405, 0.405]) {
    box(0.075, 0.44, 0.12, materials.orange, origin, x, 1.085, 0);
    const axle = cylinder(0.05, 0.05, 0.1, materials.steel, origin, x, shape.axisHeight, 0, 12); axle.rotation.z = Math.PI / 2;
  }
  const rotor = new THREE.Group(); origin.add(rotor); rotor.position.y = shape.axisHeight;
  const cageMaterial = new THREE.MeshStandardMaterial({ color: '#516657', roughness: 0.43, metalness: 0.5, wireframe: true }); allocatedMaterials.add(cageMaterial);
  const cageGeometry = new THREE.CylinderGeometry(shape.radius, shape.radius, shape.length, 20, 4, true, Math.PI / 2, Math.PI * 1.5);
  const cage = mesh(cageGeometry, cageMaterial, rotor); cage.rotation.z = Math.PI / 2;
  for (const x of [-0.365, 0.365]) {
    const cap = cylinder(0.3, 0.3, 0.025, materials.dark, rotor, x, 0, 0, 20); cap.rotation.z = Math.PI / 2;
    const hub = cylinder(0.075, 0.075, 0.04, materials.orange, rotor, x * 1.06, 0, 0, 12); hub.rotation.z = Math.PI / 2;
    const ring = mesh(new THREE.TorusGeometry(0.294, 0.014, 5, 24), materials.steel, rotor, x, 0, 0); ring.rotation.y = Math.PI / 2;
  }
  for (let index = 0; index < 12; index++) {
    const angle = Math.PI / 2 + index * Math.PI * 1.5 / 11;
    barBetween(new THREE.Vector3(-0.35, Math.sin(angle) * 0.292, Math.cos(angle) * 0.292), new THREE.Vector3(0.35, Math.sin(angle) * 0.292, Math.cos(angle) * 0.292), 0.0045, materials.steel, rotor);
  }
  const hatch = new THREE.Group(); rotor.add(hatch); hatch.position.set(0, shape.radius, 0);
  const hatchGeometry = new THREE.CylinderGeometry(shape.radius, shape.radius, shape.length - 0.04, 8, 3, true, 0, Math.PI / 2);
  hatchGeometry.rotateZ(Math.PI / 2); hatchGeometry.translate(0, -shape.radius, 0); mesh(hatchGeometry, cageMaterial, hatch);
  for (const x of [-0.338, 0.338]) {
    const curve = [];
    for (let index = 0; index <= 8; index++) { const angle = index / 8 * Math.PI / 2; curve.push(new THREE.Vector3(x, Math.sin(angle) * shape.radius - shape.radius, Math.cos(angle) * shape.radius)); }
    for (let index = 0; index < curve.length - 1; index++) barBetween(curve[index], curve[index + 1], 0.009, materials.orange, hatch);
  }
  barBetween(new THREE.Vector3(-0.34, -shape.radius, shape.radius), new THREE.Vector3(0.34, -shape.radius, shape.radius), 0.011, materials.orange, hatch);
  barBetween(new THREE.Vector3(-0.37, 0, 0), new THREE.Vector3(0.37, 0, 0), 0.014, materials.steel, hatch);
  box(0.11, 0.025, 0.045, materials.black, hatch, 0.18, -shape.radius - 0.015, shape.radius);
  const crank = new THREE.Group(); rotor.add(crank); crank.position.x = 0.46;
  box(0.048, 0.27, 0.045, materials.orange, crank, 0, 0.12, 0);
  const handle = cylinder(0.036, 0.036, 0.16, materials.black, crank, 0.07, 0.245, 0, 12); handle.rotation.z = Math.PI / 2;
  const collection = tray(origin, 0.73, 0.5); collection.position.set(0, 0.89, 0.055);
  const collectedDust = box(0.62, 0.015, 0.38, materials.grain, collection, 0, 0.03, 0); collectedDust.visible = false;
  const sourceTray = tray(origin, 0.62, 0.43); sourceTray.position.set(-0.75, 0.91, 0.36);
  box(0.34, 0.13, 0.018, materials.cream, origin, 0, 0.72, 0.52); box(0.045, 0.065, 0.022, materials.dark, origin, 0, 0.72, 0.535);
  box(1.7, 0.06, 0.46, materials.wood, scene, -1.8, 0.61, -0.8);

  const stemMaterial = new THREE.MeshStandardMaterial({ color: '#8c744e', roughness: 1, flatShading: true }); allocatedMaterials.add(stemMaterial);
  const dryLeafMaterial = new THREE.MeshStandardMaterial({ color: '#7d7950', roughness: 1, side: THREE.DoubleSide, flatShading: true }); allocatedMaterials.add(dryLeafMaterial);
  const dryLeafGeometry = new THREE.BufferGeometry();
  dryLeafGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.018, 0.025, 0.005, 0, 0.075, 0.027, -0.016, 0.028, -0.003], 3));
  dryLeafGeometry.setIndex([0, 1, 2, 0, 2, 3]); dryLeafGeometry.computeVertexNormals(); allocatedGeometries.add(dryLeafGeometry);
  let budGeometry = new THREE.IcosahedronGeometry(0.055, 1), budMaterial = materials.plant; allocatedGeometries.add(budGeometry);
  const budMeshes = new Set(), pieces = new Map(), history = [], provisionalSource = [];
  const identity = new THREE.Quaternion(), trayQuaternion = new THREE.Quaternion(), temporary = new THREE.Vector3();
  let sequence = 0, active = null, previousLoadId = null, currentMode = 'branches', rotorOffset = 0, visualAngle = 0, spentTray = false;
  let lastSourceGrams = null, sourceGeneration = 0, lastView = {};
  const metrics = { shape: { ...shape }, mode: 'branches', visualUnitsAreMass: false, load: null, source: {}, contents: {}, loads: history, loadedBudAsset: false };
  function maximum(mode) { return mode === 'branches' ? shape.maximumBranchPieces : shape.maximumBudPieces; }
  function countFor(grams, mode) { return grams > 0 ? Math.max(1, Math.ceil(maximum(mode) * Math.min(shape.displayChargeUnits, grams) / shape.displayChargeUnits)) : 0; }
  function makePiece(mode, id) {
    const group = new THREE.Group(); origin.add(group);
    const piece = { id, mode, group, buds: [], leaves: [], phase: 'source', crossed: false, order: sequence++, scale: 1 };
    if (mode === 'branches') {
      const nodes = [new THREE.Vector3(-0.145, 0, 0), new THREE.Vector3(-0.045, 0.012, 0.008), new THREE.Vector3(0.055, 0.018, -0.006), new THREE.Vector3(0.14, 0.024, 0)];
      for (let index = 0; index < nodes.length - 1; index++) barBetween(nodes[index], nodes[index + 1], 0.0065 - index * 0.0013, stemMaterial, group);
      const branches = [new THREE.Vector3(-0.063, 0.062, 0.042), new THREE.Vector3(0.045, 0.066, -0.041), new THREE.Vector3(0.135, 0.055, 0.014)];
      branches.forEach((tip, index) => {
        barBetween(nodes[index + 1], tip, 0.0036, stemMaterial, group);
        const head = mesh(budGeometry, budMaterial, group, tip.x, tip.y + 0.015, tip.z); head.scale.setScalar(0.54 + index * 0.035); head.rotation.set(0.35, index * 1.9, -0.3 + index * 0.2); piece.buds.push(head); budMeshes.add(head);
      });
      for (let index = 0; index < 2; index++) {
        const leaf = mesh(dryLeafGeometry, dryLeafMaterial, group, nodes[index + 1].x, nodes[index + 1].y + 0.005, nodes[index + 1].z);
        leaf.rotation.set(0.9, index * 1.3, index ? -1.25 : 1.15); piece.leaves.push(leaf);
      }
    } else {
      const head = mesh(budGeometry, budMaterial, group); head.scale.setScalar(0.68 + seeded(id) * 0.15); piece.buds.push(head); budMeshes.add(head);
    }
    pieces.set(id, piece); return piece;
  }
  function removePiece(piece) { piece.group.removeFromParent(); pieces.delete(piece.id); piece.buds.forEach(head => budMeshes.delete(head)); }
  function sourcePosition(index, mode) {
    if (mode === 'branches') return new THREE.Vector3((index % 2 - 0.5) * 0.28, 0.052 + Math.floor(index / 4) * 0.045, (Math.floor(index / 2) % 2 - 0.5) * 0.18);
    return new THREE.Vector3((index % 6 - 2.5) * 0.085, 0.06 + Math.floor(index / 12) * 0.05, (Math.floor(index / 6) % 2 - 0.5) * 0.15);
  }
  function sourcePose(piece, index) {
    piece.group.position.copy(sourcePosition(index, piece.mode)).applyMatrix4(sourceTray.matrix);
    sourceTray.getWorldQuaternion(trayQuaternion); piece.group.quaternion.copy(trayQuaternion);
    if (piece.mode === 'buds') piece.group.rotateY(seeded(piece.id) * 5.6);
    else piece.group.rotateY((seeded(piece.id) - 0.5) * 0.12);
  }
  function insidePosition(piece, index, angle = visualAngle) {
    const seed = seeded(piece.id), tumble = angle * 0.62 + seed * Math.PI * 2;
    if (piece.mode === 'branches') return new THREE.Vector3((index % 2 - 0.5) * 0.27 + Math.sin(tumble) * 0.008, shape.axisHeight - 0.15 + Math.floor(index / 4) * 0.065 + Math.abs(Math.sin(tumble)) * 0.048, (Math.floor(index / 2) % 2 - 0.5) * 0.18 + Math.cos(tumble) * 0.012);
    return new THREE.Vector3((index % 6 - 2.5) * 0.087 + Math.sin(tumble) * 0.008, shape.axisHeight - 0.16 + Math.floor(index / 12) * 0.07 + Math.abs(Math.sin(tumble)) * 0.075, (Math.floor(index / 6) % 2 - 0.5) * 0.17 + Math.cos(tumble) * 0.03);
  }
  function insidePose(piece, index) {
    piece.group.position.copy(insidePosition(piece, index));
    const seed = seeded(piece.id), tumble = visualAngle * 0.62 + seed * Math.PI * 2;
    piece.group.quaternion.copy(identity);
    if (piece.mode === 'branches') piece.group.rotation.set(Math.sin(tumble) * 0.28, Math.cos(tumble) * 0.11, Math.sin(tumble * 0.7) * 0.06);
    else piece.group.rotation.set(tumble, seed * 6 + visualAngle * 0.2, Math.sin(tumble) * 0.5);
  }
  function clearSource() { for (const piece of provisionalSource) removePiece(piece); provisionalSource.length = 0; }
  function prepareSource(mode, count) {
    clearSource(); sourceGeneration++;
    for (let index = 0; index < count; index++) provisionalSource.push(makePiece(mode, `source-${sourceGeneration}-${index}`));
  }
  function beginLoad(view) {
    const mode = view.inputMode === 'buds' ? 'buds' : 'branches', count = countFor(view.loadingGrams, mode);
    if (provisionalSource.length !== count || provisionalSource[0]?.mode !== mode) prepareSource(mode, count);
    const incoming = provisionalSource.splice(0);
    active = { id: view.loadId, mode, grams: view.loadingGrams, count, pieces: incoming, progress: 0, crossed: 0, before: Math.max(0, view.sourceGrams || 0) + view.loadingGrams, after: Math.max(0, view.sourceGrams || 0), initialAngle: Math.atan2(Math.sin(visualAngle), Math.cos(visualAngle)), startedAt: 0 };
    for (const piece of incoming) { piece.phase = 'source'; piece.crossed = false; piece.loadId = view.loadId; }
    previousLoadId = view.loadId; currentMode = mode; spentTray = true;
    history.push({ id: active.id, mode, displayPieces: count, grams: view.loadingGrams, sourceBeforeGrams: active.before, sourceAfterGrams: active.after, crossedOpening: 0, completed: false, pieceIds: incoming.map(piece => piece.id) });
    if (history.length > 50) history.shift();
  }
  function completeLoad() {
    if (!active) return;
    for (const piece of active.pieces) { piece.phase = 'inside'; piece.crossed = true; }
    const entry = history.find(item => item.id === active.id); if (entry) { entry.completed = true; entry.crossedOpening = active.count; }
    rotorOffset = -(Number(lastView.drumAngle) || 0); visualAngle = 0; active = null;
  }
  function update(dt, view = {}) {
    lastView = view;
    const mode = view.inputMode === 'buds' ? 'buds' : 'branches', rawAngle = Number(view.drumAngle) || 0;
    const modeChanged = mode !== currentMode;
    if (view.loading && view.loadId !== previousLoadId) beginLoad(view);
    else if (active && !view.loading) completeLoad();
    if (active) active.progress = Math.max(active.progress, clamp(view.loadingProgress));
    currentMode = mode; metrics.mode = mode;
    const p = active?.progress ?? 1;
    if (active) { visualAngle = active.initialAngle * (1 - ease(between(p, 0, 0.16))); rotorOffset = -rawAngle; }
    else visualAngle = rawAngle + rotorOffset;
    rotor.rotation.x = visualAngle;
    const hatchOpen = active ? ease(between(p, 0.08, 0.25)) * (1 - ease(between(p, 0.84, 0.96))) : 0;
    hatch.rotation.x = -2.15 * hatchOpen;
    const lift = active ? ease(between(p, 0.03, 0.25)) * (1 - ease(between(p, 0.86, 1))) : 0;
    const tilt = active ? ease(between(p, 0.21, 0.36)) * (1 - ease(between(p, 0.82, 0.95))) : 0;
    sourceTray.position.set(-0.75 + lift * 0.20, 0.91 + lift * 0.86, 0.36 + lift * 0.04); sourceTray.rotation.z = -0.62 * tilt; sourceTray.updateMatrix(); sourceTray.updateWorldMatrix(true, false);
    const sourceChanged = lastSourceGrams !== null && view.sourceGrams !== lastSourceGrams && !active;
    if (!active && (!spentTray || modeChanged || sourceChanged && Number(view.sourceGrams) > Number(lastSourceGrams))) {
      const available = Math.min(Math.max(0, view.sourceGrams ?? shape.displayChargeUnits), shape.displayChargeUnits * Math.max(0, 1 - clamp(view.drumFill)));
      const count = countFor(available, mode);
      if (modeChanged || provisionalSource.length !== count) prepareSource(mode, count);
    }
    lastSourceGrams = view.sourceGrams;
    provisionalSource.forEach((piece, index) => { piece.phase = 'source'; piece.group.visible = true; piece.group.scale.setScalar(1); sourcePose(piece, index); });
    let inside = [...pieces.values()].filter(piece => piece.phase === 'inside' && (!active || piece.loadId !== active.id));
    const targetUnits = maximum(mode) * clamp(view.drumFill);
    if (!active && !inside.length && targetUnits > 0) {
      for (let index = 0; index < Math.ceil(targetUnits); index++) { const piece = makePiece(mode, `existing-${sequence}`); piece.phase = 'inside'; inside.push(piece); }
    }
    inside.forEach((piece, index) => {
      const fraction = clamp(targetUnits - index); piece.group.visible = fraction > 0;
      if (!fraction) { removePiece(piece); return; }
      piece.group.scale.setScalar(0.72 + fraction * 0.28); insidePose(piece, index);
    });
    let sourceCount = provisionalSource.length, flightCount = 0, arrivedCount = 0;
    if (active) {
      const baseIndex = inside.filter(piece => piece.group.visible).length;
      active.pieces.forEach((piece, index) => {
        const start = 0.28 + index / Math.max(1, active.count - 1) * 0.27, q = between(p, start, start + 0.27);
        piece.group.visible = true; piece.group.scale.setScalar(1);
        if (q <= 0) { piece.phase = 'source'; sourcePose(piece, index); sourceCount++; return; }
        const initial = sourcePosition(index, piece.mode), lip = new THREE.Vector3(0.30, 0.065, 0.025 + (seeded(piece.id) - 0.5) * 0.065);
        if (q < 0.27) {
          piece.phase = 'sliding'; temporary.copy(initial).lerp(lip, ease(q / 0.27)); piece.group.position.copy(temporary).applyMatrix4(sourceTray.matrix); sourceCount++;
          piece.group.quaternion.copy(sourceTray.quaternion); return;
        }
        const from = lip.clone().applyMatrix4(sourceTray.matrix), inlet = new THREE.Vector3((seeded(piece.id + 'entry') - 0.5) * 0.20, shape.axisHeight + 0.195, 0.19);
        if (q < 0.66) {
          piece.phase = 'entering'; const transit = between(q, 0.27, 0.66); piece.group.position.copy(from).lerp(inlet, transit); piece.group.position.y += Math.sin(transit * Math.PI) * 0.012;
          piece.group.rotation.set(0.08 * transit, (seeded(piece.id) - 0.5) * 0.18, -0.62 * (1 - transit)); flightCount++;
        } else {
          if (!piece.crossed) { piece.crossed = true; active.crossed++; }
          piece.phase = q >= 1 ? 'inside' : 'settling'; const transit = ease(between(q, 0.66, 1));
          piece.group.position.copy(inlet).lerp(insidePosition(piece, baseIndex + index, 0), transit); piece.group.rotation.set(0, 0, 0); arrivedCount++;
        }
      });
      const record = history.find(item => item.id === active.id); if (record) record.crossedOpening = active.crossed;
    }
    collectedDust.visible = !active && targetUnits > 0 && (view.drumSpeed || 0) > 0.1;
    const shownInside = [...pieces.values()].filter(piece => piece.group.visible && ['inside', 'settling'].includes(piece.phase));
    metrics.source = { gramsAvailable: view.sourceGrams ?? null, preparedPieces: sourceCount, trayEmptied: spentTray && !active && sourceCount === 0 };
    metrics.contents = { modelFill: clamp(view.drumFill), visiblePieces: shownInside.length, attachedBuds: shownInside.reduce((sum, piece) => sum + piece.buds.length, 0), angle: Number(visualAngle.toFixed(4)) };
    metrics.load = active ? { id: active.id, mode: active.mode, progress: Number(p.toFixed(4)), phase: p < 0.25 ? 'lifting' : p < 0.82 ? 'transferring' : 'closing', sourcePieces: sourceCount, inTransitPieces: flightCount, arrivedPieces: arrivedCount, openingCrossings: active.crossed, hatchOpen: Number(hatchOpen.toFixed(4)), grams: active.grams } : null;
    metrics.pieces = [...pieces.values()].filter(piece => piece.group.visible).map(piece => ({ id: piece.id, mode: piece.mode, phase: piece.phase, attachedBuds: piece.buds.length, attachedDryLeaves: piece.leaves.length, position: piece.group.position.toArray().map(value => Number(value.toFixed(4))) }));
  }
  function setBudAsset(geometry, material) {
    budGeometry = geometry; budMaterial = material; for (const object of budMeshes) { object.geometry = geometry; object.material = material; } metrics.loadedBudAsset = true;
  }
  return { update, setBudAsset, getMeasurements: () => structuredClone(metrics) };
}
