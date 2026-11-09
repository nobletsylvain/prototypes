import * as THREE from './vendor/three.module.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));
const smooth = (value, target, dt, speed = 9) => value + (target - value) * (1 - Math.exp(-dt * speed));
function randomFor(value) { let result = 2166136261; for (const character of String(value)) result = Math.imul(result ^ character.charCodeAt(0), 16777619); return (result >>> 0) / 4294967296; }

export function createScene(canvas, { onContact = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.65));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.13;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#c9d1bd'); scene.fog = new THREE.Fog('#c9d1bd', 13, 28);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.06, 40); scene.add(camera);
  const mainLight = new THREE.DirectionalLight('#ffe7b4', 3.4); mainLight.position.set(-3, 6, 4); mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1536, 1536); mainLight.shadow.camera.left = -6; mainLight.shadow.camera.right = 6; mainLight.shadow.camera.top = 5; mainLight.shadow.camera.bottom = -4;
  mainLight.shadow.normalBias = 0.025; mainLight.shadow.bias = -0.0003; scene.add(mainLight);
  scene.add(new THREE.HemisphereLight('#e6f5ed', '#696251', 2));
  const fill = new THREE.DirectionalLight('#b4dfed', 0.7); fill.position.set(4, 3, -1); scene.add(fill);
  const materials = {
    floor: new THREE.MeshStandardMaterial({ color: '#acaa99', roughness: 0.97 }),
    wall: new THREE.MeshStandardMaterial({ color: '#87977c', roughness: 0.96 }),
    trim: new THREE.MeshStandardMaterial({ color: '#4b6259', roughness: 0.9 }),
    dark: new THREE.MeshStandardMaterial({ color: '#263b35', roughness: 0.66, metalness: 0.36 }),
    steel: new THREE.MeshStandardMaterial({ color: '#aab6b0', roughness: 0.34, metalness: 0.72 }),
    orange: new THREE.MeshStandardMaterial({ color: '#d87934', roughness: 0.48, metalness: 0.16 }),
    black: new THREE.MeshStandardMaterial({ color: '#202726', roughness: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: '#b79366', roughness: 0.85 }),
    cream: new THREE.MeshStandardMaterial({ color: '#ede5ca', roughness: 0.72 }),
    grain: new THREE.MeshStandardMaterial({ color: '#bd9954', roughness: 0.94, flatShading: true }),
    plant: new THREE.MeshStandardMaterial({ color: '#76764a', roughness: 1, flatShading: true }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#dde3ce', transparent: true, opacity: 0.21, roughness: 0.16, metalness: 0.08, depthWrite: false }),
    film: new THREE.MeshPhysicalMaterial({ color: '#e8f4e8', transparent: true, opacity: 0.2, roughness: 0.06, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false, side: THREE.DoubleSide }),
    filmLine: new THREE.LineBasicMaterial({ color: '#eefbfa', transparent: true, opacity: 0.65 }),
  };
  const allocatedGeometries = new Set(), allocatedMaterials = new Set(Object.values(materials)), allocatedTextures = new Set();
  function mesh(geometry, material, parent = scene, x = 0, y = 0, z = 0) { allocatedGeometries.add(geometry); const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object; }
  function box(width, height, depth, material, parent = scene, x = 0, y = 0, z = 0) { return mesh(new THREE.BoxGeometry(width, height, depth), material, parent, x, y, z); }
  function cylinder(top, bottom, height, material, parent = scene, x = 0, y = 0, z = 0, segments = 16) { return mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material, parent, x, y, z); }
  function barBetween(a, b, radius, material, parent = scene) { const direction = new THREE.Vector3().subVectors(b, a); const object = cylinder(radius, radius, direction.length(), material, parent); object.position.copy(a).add(b).multiplyScalar(0.5); object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return object; }
  function bolt(parent, x, y, z) { const object = cylinder(0.025, 0.025, 0.022, materials.steel, parent, x, y, z, 6); object.rotation.x = Math.PI / 2; return object; }
  function granularSurface(parent, width, depth) {
    const geometry = new THREE.PlaneGeometry(width, depth, 19, 13); geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position; for (let index = 0; index < positions.count; index++) positions.setY(index, randomFor(index + 301) * 0.012); geometry.computeVertexNormals();
    return mesh(geometry, materials.grain, parent, 0, 0.051, 0);
  }
  function tray(parent, width, depth) { const group = new THREE.Group(); parent.add(group); box(width, 0.035, depth, materials.steel, group); box(width, 0.1, 0.035, materials.steel, group, 0, 0.05, -depth / 2); box(width, 0.1, 0.035, materials.steel, group, 0, 0.05, depth / 2); box(0.035, 0.1, depth, materials.steel, group, -width / 2, 0.05, 0); box(0.035, 0.1, depth, materials.steel, group, width / 2, 0.05, 0); return group; }
  function placard(parent, x, y, z, count) {
    box(0.36, 0.13, 0.018, materials.cream, parent, x, y, z);
    for (let index = 0; index < count; index++) box(0.045, 0.065, 0.022, materials.dark, parent, x + (index - (count - 1) / 2) * 0.08, y, z + 0.01);
  }

  box(20, 0.12, 18, materials.floor, scene, 0, -0.08, 0);
  box(16, 4.3, 0.16, materials.wall, scene, 0, 2.1, -2.4);
  box(0.16, 4.3, 11, materials.wall, scene, -5.6, 2.1, 1);
  box(16, 0.14, 0.22, materials.trim, scene, 0, 0.05, -2.27);
  for (let index = -4; index <= 4; index++) { const line = box(0.012, 0.003, 12, materials.trim, scene, index * 1.8, -0.014, 0); line.material = materials.floor.clone(); line.material.color.set('#939787'); allocatedMaterials.add(line.material); }
  for (let index = 0; index < 4; index++) box(9, 0.003, 0.012, materials.trim, scene, 0, -0.013, index * 1.8 - 2);
  box(2.8, 2.1, 0.04, materials.trim, scene, -3.3, 2.5, -2.29);
  const windowMaterial = new THREE.MeshBasicMaterial({ color: '#f6e6b1' }); allocatedMaterials.add(windowMaterial);
  box(2.55, 1.85, 0.045, windowMaterial, scene, -3.3, 2.5, -2.25);
  box(0.07, 1.9, 0.08, materials.cream, scene, -3.3, 2.5, -2.17); box(2.6, 0.07, 0.08, materials.cream, scene, -3.3, 2.5, -2.17);
  box(2.9, 0.1, 0.26, materials.cream, scene, -3.3, 1.45, -2.12);
  const sunPatchMaterial = new THREE.MeshBasicMaterial({ color: '#f2d8a2', transparent: true, opacity: 0.18, depthWrite: false }); allocatedMaterials.add(sunPatchMaterial);
  for (let index = 0; index < 2; index++) { const patch = box(1.1, 0.001, 3.1, sunPatchMaterial, scene, -2.6 + index * 1.3, -0.009, 0.5); patch.rotation.y = -0.3; }
  box(1.65, 0.07, 0.42, materials.wood, scene, 3.4, 1.75, -2.1); box(1.65, 0.07, 0.42, materials.wood, scene, 3.4, 2.55, -2.1);
  for (let index = 0; index < 5; index++) { cylinder(0.1, 0.1, 0.25, materials.cream, scene, 2.85 + index * 0.25, 1.92, -2.1); cylinder(0.108, 0.108, 0.035, materials.orange, scene, 2.85 + index * 0.25, 2.065, -2.1); }
  box(0.58, 0.46, 0.38, materials.wood, scene, 3.03, 2.82, -2.1); box(0.58, 0.32, 0.38, materials.cream, scene, 3.72, 2.75, -2.1);
  const floorZone = new THREE.Group(); scene.add(floorZone); floorZone.position.set(2.45, 0.002, 0.58);
  for (let index = 0; index < 4; index++) { const stripe = box(0.4, 0.004, 0.025, materials.orange, floorZone, -0.7 + index * 0.46, 0, -0.55); stripe.rotation.y = -0.3; }
  for (let index = 0; index < 4; index++) { const stripe = box(0.4, 0.004, 0.025, materials.orange, floorZone, -0.7 + index * 0.46, 0, 0.75); stripe.rotation.y = -0.3; }

  const drum = new THREE.Group(); scene.add(drum); drum.position.set(-1.8, 0, 0);
  box(1.6, 0.1, 1, materials.wood, drum, 0, 0.82, 0);
  for (const x of [-0.65, 0.65]) for (const z of [-0.36, 0.36]) { box(0.085, 0.8, 0.085, materials.dark, drum, x, 0.4, z); box(0.14, 0.06, 0.14, materials.black, drum, x, 0.015, z); }
  for (const x of [-0.55, 0.55]) { box(0.1, 0.65, 0.12, materials.orange, drum, x, 1.13, 0); bolt(drum, x, 1.39, 0.071); }
  const drumRotor = new THREE.Group(); drum.add(drumRotor); drumRotor.position.y = 1.4;
  const cageGeometry = new THREE.CylinderGeometry(0.43, 0.43, 1.06, 20, 5, true); allocatedGeometries.add(cageGeometry);
  const cageMaterial = new THREE.MeshStandardMaterial({ color: '#6d8073', roughness: 0.45, metalness: 0.55, wireframe: true }); allocatedMaterials.add(cageMaterial);
  const cage = mesh(cageGeometry, cageMaterial, drumRotor); cage.rotation.z = Math.PI / 2;
  for (const x of [-0.53, 0.53]) { const end = cylinder(0.44, 0.44, 0.045, materials.dark, drumRotor, x, 0, 0, 20); end.rotation.z = Math.PI / 2; const hub = cylinder(0.11, 0.11, 0.07, materials.orange, drumRotor, x * 1.05, 0, 0); hub.rotation.z = Math.PI / 2; }
  for (const x of [-0.32, 0.32]) { const ring = mesh(new THREE.TorusGeometry(0.435, 0.018, 5, 20), materials.steel, drumRotor, x, 0, 0); ring.rotation.y = Math.PI / 2; }
  const crank = new THREE.Group(); drumRotor.add(crank); crank.position.x = 0.66;
  box(0.06, 0.46, 0.055, materials.orange, crank, 0, 0.18, 0); const handle = cylinder(0.045, 0.045, 0.2, materials.black, crank, 0.08, 0.4, 0); handle.rotation.z = Math.PI / 2;
  const drumGrains = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.065, 0), materials.plant, 42); allocatedGeometries.add(drumGrains.geometry); drumGrains.castShadow = true; drum.add(drumGrains); drumGrains.position.y = 1.4;
  const collection = tray(drum, 0.92, 0.62); collection.position.set(0, 0.9, 0.06); const collectingMatter = box(0.8, 0.035, 0.5, materials.grain, collection, 0, 0.04, 0); const collectionSurface = granularSurface(collectingMatter, 0.8, 0.5); collectionSurface.position.y = 0.018;
  const sourceTray = tray(drum, 0.7, 0.5); sourceTray.position.set(-0.94, 0.88, 0.43); const sourceMatter = box(0.61, 0.09, 0.41, materials.plant, sourceTray, 0, 0.07, 0);
  sourceMatter.visible = false;
  const sourceHeads = new THREE.InstancedMesh(drumGrains.geometry, materials.plant, 22); sourceHeads.castShadow = true; sourceTray.add(sourceHeads);
  const sourceDummy = new THREE.Object3D();
  for (let index = 0; index < 22; index++) { const seed = randomFor(index + 470); sourceDummy.position.set((index % 6 - 2.5) * 0.1, 0.07 + Math.floor(index / 12) * 0.05, (Math.floor(index / 6) - 1.5) * 0.1); sourceDummy.rotation.set(seed * 4, seed * 9, seed * 6); sourceDummy.scale.setScalar(0.7 + seed * 0.4); sourceDummy.updateMatrix(); sourceHeads.setMatrixAt(index, sourceDummy.matrix); } sourceHeads.instanceMatrix.needsUpdate = true;
  placard(drum, 0, 0.72, 0.52, 1);
  box(1.7, 0.06, 0.46, materials.wood, scene, -1.8, 0.61, -0.8);

  const press = new THREE.Group(); scene.add(press); press.position.set(1.25, 0, 0);
  box(1.14, 0.1, 0.9, materials.dark, press, 0, 0.07, 0);
  for (const x of [-0.44, 0.44]) { box(0.13, 1.93, 0.16, materials.dark, press, x, 1.02, 0); box(0.2, 0.11, 0.3, materials.black, press, x, 0.08, 0.15); bolt(press, x, 1.85, 0.09); bolt(press, x, 0.79, 0.09); }
  box(1.12, 0.23, 0.34, materials.orange, press, 0, 1.96, 0); box(1.08, 0.12, 0.7, materials.dark, press, 0, 0.89, 0.1);
  cylinder(0.065, 0.065, 0.72, materials.steel, press, 0, 1.59, 0.02);
  const piston = new THREE.Group(); press.add(piston); piston.position.set(0, 1.48, 0.05);
  box(0.61, 0.12, 0.39, materials.steel, piston); box(0.44, 0.025, 0.26, materials.black, piston, 0, -0.07, 0.03);
  const moldDrawer = new THREE.Group(); press.add(moldDrawer); moldDrawer.position.set(0, 0.98, 0.17);
  box(0.66, 0.06, 0.48, materials.steel, moldDrawer); box(0.66, 0.09, 0.045, materials.orange, moldDrawer, 0, 0.01, 0.24);
  for (const x of [-0.29, 0.29]) box(0.05, 0.13, 0.39, materials.steel, moldDrawer, x, 0.07, 0);
  for (const z of [-0.18, 0.18]) box(0.57, 0.13, 0.035, materials.steel, moldDrawer, 0, 0.07, z);
  const moldMatter = box(0.49, 0.1, 0.28, materials.grain, moldDrawer, 0, 0.045, 0);
  granularSurface(moldMatter, 0.49, 0.28);
  const drawerHandle = barBetween(new THREE.Vector3(-0.13, 0, 0.31), new THREE.Vector3(0.13, 0, 0.31), 0.025, materials.black, moldDrawer);
  const lever = new THREE.Group(); press.add(lever); lever.position.set(0.1, 1.96, 0.07); lever.rotation.z = -0.4;
  barBetween(new THREE.Vector3(), new THREE.Vector3(0.74, 0.38, 0.13), 0.032, materials.steel, lever);
  const grip = cylinder(0.055, 0.055, 0.27, materials.black, lever, 0.75, 0.39, 0.13); grip.rotation.x = Math.PI / 2;
  box(0.7, 0.07, 0.63, materials.wood, press, -0.93, 0.89, 0.1); box(0.07, 0.85, 0.07, materials.dark, press, -1.15, 0.43, 0.1);
  const workTray = tray(press, 0.65, 0.43); workTray.position.set(-0.93, 0.97, 0.13);
  const trayMatter = box(0.55, 0.1, 0.33, materials.grain, workTray, 0, 0.05, 0);
  granularSurface(trayMatter, 0.55, 0.33);
  const chute = box(0.6, 0.05, 0.43, materials.steel, press, 0.67, 0.86, 0.08); chute.rotation.z = -0.22;
  for (const z of [-0.18, 0.32]) { const rail = box(0.65, 0.07, 0.03, materials.orange, press, 0.68, 0.91, z); rail.rotation.z = -0.22; }
  box(0.65, 0.06, 0.46, materials.wood, press, -0.88, 1.35, -0.52);
  placard(press, 0, 1.96, 0.19, 2);
  const rollGroup = new THREE.Group(); scene.add(rollGroup); rollGroup.position.set(2.96, 0.2, 1.14);
  const roll = cylinder(0.095, 0.095, 0.38, materials.cream, rollGroup); roll.rotation.z = Math.PI / 2;
  const rollCore = cylinder(0.047, 0.047, 0.385, materials.wood, rollGroup); rollCore.rotation.z = Math.PI / 2;

  const handGroup = new THREE.Group(); camera.add(handGroup); handGroup.position.set(0.32, -0.49, -0.87); handGroup.rotation.set(0.12, -0.14, 0.08);
  const heldTrayGroup = new THREE.Group(); camera.add(heldTrayGroup);
  const plateObjects = new Map(), potObjects = new Map(), packageObjects = new Map(), openingPackages = [];
  const knifeGroup = new THREE.Group(); scene.add(knifeGroup); knifeGroup.visible = false;
  const knifeHandle = box(0.16, 0.035, 0.028, materials.dark, knifeGroup, -0.09, 0, 0);
  const knifeBlade = box(0.2, 0.025, 0.008, materials.steel, knifeGroup, 0.085, 0, 0);
  const placementRing = mesh(new THREE.RingGeometry(0.13, 0.15, 32), new THREE.MeshBasicMaterial({ color: '#f0dfb3', transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }), scene);
  allocatedMaterials.add(placementRing.material); placementRing.rotation.x = -Math.PI / 2; placementRing.visible = false;
  const measurements = { impacts: [], settled: [], ejections: 0, renderedFrames: 0, activeBodies: 0, geometrySource: 'procedural-fallback', assetErrors: [], loadedAppearances: [], loadedGeometryFormats: [], loadedKnife: false };
  let elapsed = 0, station = 'overview', lastFormat = 100, drawerAnimation = 0, loadAnimation = 0, lastLoading = false, disposed = false;
  let lastCompression = 0, currentCompression = 0, yawOffset = 0, pitchOffset = 0;
  const navigationOffset = new THREE.Vector3(), targetPosition = new THREE.Vector3(), lookTarget = new THREE.Vector3(), dummy = new THREE.Object3D();
  const poses = { overview: [[-0.2, 2.2, 6], [0, 1.03, 0]], drum: [[-1.7, 1.82, 2.85], [-1.8, 1.16, 0]], press: [[1.4, 1.8, 2.75], [1.25, 1.1, 0]], packing: [[2.25, 1.65, 2.65], [2.3, 0.24, 0.4]] };
  const cameraDirection = new THREE.Vector3(), cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const particleGeometry = new THREE.IcosahedronGeometry(0.015, 0); allocatedGeometries.add(particleGeometry);
  const particles = new THREE.InstancedMesh(particleGeometry, materials.grain, 70); particles.castShadow = true; scene.add(particles);
  const loadParticles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.026, 0), materials.plant, 26); allocatedGeometries.add(loadParticles.geometry); scene.add(loadParticles);
  const plateMaterials = new Map();
  let geometryAssets = {}, appearanceAssets = {};
  function plateMaterial(color = '#796044', variant = 'A', format = 100) {
    const key = `${format}:${color}:${variant}`;
    if (!plateMaterials.has(key)) { const material = new THREE.MeshStandardMaterial({ color, roughness: variant === 'F' ? 0.45 : 0.86, metalness: 0, flatShading: true, ...(appearanceAssets[`${format}:${variant}`] || {}) }); plateMaterials.set(key, material); allocatedMaterials.add(material); }
    return plateMaterials.get(key);
  }
  function createPlateVisual(item) {
    const group = new THREE.Group(), isLarge = Number(item.format) === 250;
    const width = 0.32, height = isLarge ? 0.08 : 0.032, depth = 0.178;
    const body = box(width, height, depth, plateMaterial(item.color, item.variant, Number(item.format) || 100), group, 0, 0, 0);
    const edges = new THREE.EdgesGeometry(body.geometry, 30); allocatedGeometries.add(edges);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: '#d5b17a', transparent: true, opacity: 0.13 }); allocatedMaterials.add(edgeMaterial);
    const line = new THREE.LineSegments(edges, edgeMaterial); group.add(line);
    if (geometryAssets[item.format]) { applyAssetGeometry(body, geometryAssets[item.format], { width, height, depth }); line.visible = false; }
    return { group, mesh: body, width, height, depth, format: Number(item.format) || 100, edges: line };
  }
  function applyAssetGeometry(object, geometry, dimensions) {
    object.geometry = geometry; geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3()); object.scale.set(dimensions.width / size.x, dimensions.height / size.y, dimensions.depth / size.z);
  }
  function makeBody(item, born = true) {
    const visual = createPlateVisual(item); scene.add(visual.group);
    const seed = randomFor(item.id), body = { ...visual, id: item.id, location: 'floor', vx: 0.95 + seed * 0.3, vy: 0.35, vz: 0.18 + seed * 0.16, angular: (seed - 0.5) * 2, bornAt: elapsed, impacts: 0, settled: false, support: null };
    body.group.position.set(1.8, 1.04, 0.16); body.group.rotation.set(0, seed * 0.2, 0.1);
    if (!born) { body.group.position.set(2.35 + (seed - 0.5) * 0.7, 0.16, 0.3 + seed * 0.5); body.vx = body.vy = body.vz = 0; }
    plateObjects.set(item.id, body); measurements.ejections++;
    return body;
  }
  function createPot(item) {
    const group = new THREE.Group(); scene.add(group);
    cylinder(0.09, 0.085, 0.25, materials.glass, group, 0, 0.13, 0, 12); cylinder(0.095, 0.095, 0.035, materials.dark, group, 0, 0.268, 0, 12);
    const fill = cylinder(0.08, 0.076, 0.22, materials.grain, group, 0, 0.12, 0, 12);
    box(0.116, 0.06, 0.007, materials.cream, group, 0, 0.13, 0.084);
    const markerMaterial = new THREE.MeshStandardMaterial({ color: item.color || '#d0a85b', roughness: 0.7 }); allocatedMaterials.add(markerMaterial); box(0.028, 0.04, 0.009, markerMaterial, group, 0.032, 0.13, 0.091);
    const object = { group, fill }; potObjects.set(item.id, object); return object;
  }
  function packageVisual(item, count, format) {
    const group = new THREE.Group(); scene.add(group);
    const large = Number(format) === 250, halfWidth = 0.175, halfDepth = 0.105;
    const height = Math.max(0.04, count * (large ? 0.08 : 0.032)), geometry = new THREE.BoxGeometry(halfWidth * 2, height + 0.025, halfDepth * 2); allocatedGeometries.add(geometry);
    const wrap = mesh(geometry, materials.film, group, 0, height / 2, 0);
    const points = [];
    for (let i = 0; i < 7; i++) { const y = (height / 7) * i; points.push(new THREE.Vector3(-halfWidth, y, halfDepth), new THREE.Vector3(halfWidth, Math.min(height, y + 0.018), halfDepth)); points.push(new THREE.Vector3(halfWidth, Math.min(height, y + 0.018), halfDepth), new THREE.Vector3(halfWidth, y + 0.007, -halfDepth)); }
    points.push(new THREE.Vector3(-halfWidth, height + 0.01, -halfDepth), new THREE.Vector3(halfWidth, height + 0.012, halfDepth), new THREE.Vector3(-halfWidth, height + 0.014, halfDepth), new THREE.Vector3(halfWidth * 0.6, height + 0.016, -halfDepth));
    const lines = new THREE.BufferGeometry().setFromPoints(points); allocatedGeometries.add(lines); group.add(new THREE.LineSegments(lines, materials.filmLine));
    const result = { group, wrap, count, height, bornAt: elapsed, location: null, position: null }; packageObjects.set(item.id, result); return result;
  }
  const raycaster = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.012);
  const pickOccluders = [];
  scene.traverse(object => {
    if (object.isMesh && !object.isInstancedMesh && !object.material.transparent && object !== knifeHandle && object !== knifeBlade && object !== placementRing) pickOccluders.push(object);
  });
  function getPlacement() {
    raycaster.setFromCamera(new THREE.Vector2(0, camera.aspect < 1 ? 0.26 : 0.1), camera);
    const position = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3());
    return { x: clamp(position?.x ?? 2.4, -4.5, 4.5), y: 0.025, z: clamp(position?.z ?? 0.8, -1.6, 4.3) };
  }
  function getPickablePlates(eligibleIds) {
    const eligible = eligibleIds ? new Set(eligibleIds) : null, width = canvas.clientWidth || 1024, height = canvas.clientHeight || 768;
    const reticleY = camera.aspect < 1 ? 0.26 : 0.1, maximumDistance = Math.min(width, height) * 0.3, candidates = [];
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    for (const body of plateObjects.values()) {
      if (body.location !== 'floor' || !body.group.visible || eligible && !eligible.has(body.id)) continue;
      const world = body.group.getWorldPosition(new THREE.Vector3()), projected = world.clone().project(camera);
      if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue;
      const distancePixels = Math.hypot(projected.x * width / 2, (projected.y - reticleY) * height / 2);
      if (distancePixels > maximumDistance) continue;
      const direction = world.clone().sub(camera.position), worldDistance = direction.length();
      raycaster.set(camera.position, direction.normalize()); raycaster.near = 0.05; raycaster.far = Math.max(0.05, worldDistance - 0.08);
      if (raycaster.intersectObjects(pickOccluders.filter(object => object.visible), false).length) continue;
      candidates.push({ id: body.id, distancePixels, worldDistance, screenX: (projected.x + 1) * width / 2, screenY: (1 - projected.y) * height / 2 });
    }
    raycaster.near = 0; raycaster.far = Infinity;
    return candidates.sort((a, b) => a.distancePixels - b.distancePixels || a.worldDistance - b.worldDistance);
  }
  function pickPlate(eligibleIds) { return getPickablePlates(eligibleIds)[0]?.id || null; }
  function updateBodies(dt, view) {
    const plateList = Array.isArray(view.plates) ? view.plates : [], selected = new Set(view.selectedIds || []), packages = view.packages || (view.package ? [view.package] : []);
    const packageByPlate = new Map(); packages.forEach(item => (item.plateIds || item.plates || []).forEach((id, index) => packageByPlate.set(typeof id === 'object' ? id.id : id, { item, index })));
    const activeIds = new Set(plateList.map(item => item.id));
    for (const [id, body] of plateObjects) if (!activeIds.has(id)) { body.group.removeFromParent(); plateObjects.delete(id); }
    for (const [id, object] of packageObjects) if (!packages.some(item => item.id === id)) {
      object.group.updateWorldMatrix(true, true);
      for (const body of plateObjects.values()) if (body.group.parent === object.group) { body.lastPackagePosition = body.group.getWorldPosition(new THREE.Vector3()); body.lastPackageRotation = body.group.getWorldQuaternion(new THREE.Quaternion()); }
      openingPackages.push({ group: object.group, wrap: object.wrap, time: 0, height: object.height });
      packageObjects.delete(id);
    }
    packages.forEach((item, index) => {
      const ids = item.plateIds || item.plates || [], count = ids.length || 1, first = plateList.find(plate => plate.id === (typeof ids[0] === 'object' ? ids[0].id : ids[0]));
      const object = packageObjects.get(item.id) || packageVisual(item, count, first?.format || item.format || 100), held = ['held', 'hand'].includes(item.location);
      if (held) { if (object.group.parent !== handGroup) handGroup.add(object.group); object.group.position.set(0, -0.02, 0); object.group.rotation.set(0, 0, 0); }
      else {
        if (object.location === 'held') object.position = getPlacement();
        if (object.group.parent !== scene) scene.add(object.group);
        object.group.position.set(item.x ?? object.position?.x ?? 2.4 + index * 0.42, 0.025, item.z ?? object.position?.z ?? 0.86); object.group.rotation.set(0, -0.13, 0);
      }
      object.location = held ? 'held' : 'floor';
      const age = elapsed - object.bornAt; object.group.scale.setScalar(1 + Math.max(0, 0.035 - age * 0.07));
    });
    let heldIndex = 0;
    plateList.forEach(item => {
      const body = plateObjects.get(item.id) || makeBody(item, elapsed > 0.15), packaged = packageByPlate.get(item.id), held = selected.has(item.id) || ['held', 'hand'].includes(item.location);
      if (packaged) {
        const parent = packageObjects.get(packaged.item.id)?.group; if (parent && body.group.parent !== parent) parent.add(body.group);
        body.group.position.set(0, body.height / 2 + packaged.index * body.height, 0); body.group.rotation.set(0, 0, 0); body.location = 'package'; return;
      }
      if (held) { if (body.group.parent !== handGroup) handGroup.add(body.group); body.group.position.set((heldIndex % 3) * 0.002, heldIndex * body.height, 0); body.group.rotation.set(0, (heldIndex % 2) * 0.015, 0); body.location = 'held'; heldIndex++; return; }
      if (body.location !== 'floor') {
        const drop = getPlacement(); scene.add(body.group);
        if (body.lastPackagePosition) { body.group.position.copy(body.lastPackagePosition); body.group.quaternion.copy(body.lastPackageRotation); delete body.lastPackagePosition; delete body.lastPackageRotation; }
        else body.group.position.set(drop.x, 0.3, drop.z);
        body.vx = body.vz = body.vy = 0; body.settled = false; body.bornAt = elapsed;
      }
      body.location = 'floor';
    });
    const heldPackage = packages.some(item => ['held', 'hand'].includes(item.location));
    placementRing.visible = heldPackage; if (heldPackage) { const drop = getPlacement(); placementRing.position.set(drop.x, 0.015, drop.z); }
    const wrapping = heldPackage && view.filmProgress < 1;
    if (wrapping) {
      if (rollGroup.parent !== handGroup) handGroup.add(rollGroup);
      const angle = view.filmProgress * Math.PI * 4; rollGroup.position.set(Math.cos(angle) * 0.25, 0.08 + view.filmProgress * 0.23, Math.sin(angle) * 0.17); rollGroup.rotation.set(0, angle, Math.PI / 2);
    } else { if (rollGroup.parent !== scene) scene.add(rollGroup); rollGroup.position.set(2.96, 0.2, 1.14); rollGroup.rotation.set(0, 0, 0); }
    knifeGroup.visible = openingPackages.length > 0;
    for (let index = openingPackages.length - 1; index >= 0; index--) {
      const opening = openingPackages[index]; opening.time += dt; const progress = clamp(opening.time / 0.4);
      knifeGroup.position.copy(opening.group.position).add(new THREE.Vector3(-0.2 + progress * 0.42, opening.height + 0.055, 0.015)); knifeGroup.rotation.set(0.2, 0, -0.15);
      opening.group.scale.set(1 + progress * 0.4, 1 - progress * 0.9, 1 + progress * 0.4); opening.group.rotation.z = -progress * 0.35;
      if (progress >= 1) { opening.group.removeFromParent(); openingPackages.splice(index, 1); }
    }
    const heldHeight = Math.max(heldIndex * 0.032, ...packages.filter(item => ['held', 'hand'].includes(item.location)).map(item => packageObjects.get(item.id)?.height || 0));
    handGroup.scale.setScalar(Math.min(1, 0.54 / Math.max(0.54, heldHeight)));
    const bodies = [...plateObjects.values()].filter(body => body.location === 'floor'); measurements.activeBodies = bodies.filter(body => !body.settled).length;
    const steps = Math.max(1, Math.ceil(dt / 0.012)), step = dt / steps;
    for (let iteration = 0; iteration < steps; iteration++) for (const body of bodies) {
      if (body.settled) continue;
      const previousY = body.group.position.y;
      body.vy -= 6.5 * step; body.group.position.x += body.vx * step; body.group.position.y += body.vy * step; body.group.position.z += body.vz * step;
      body.group.rotation.y += body.angular * step; body.group.rotation.x = smooth(body.group.rotation.x, 0, step, 5); body.group.rotation.z = smooth(body.group.rotation.z, 0, step, 5);
      let ground = body.height / 2 + 0.008, support = null;
      for (const other of bodies) {
        if (other === body || other.group.position.y >= previousY) continue;
        const overlapX = Math.abs(body.group.position.x - other.group.position.x) < (body.width + other.width) * 0.42, overlapZ = Math.abs(body.group.position.z - other.group.position.z) < (body.depth + other.depth) * 0.42;
        const top = other.group.position.y + (other.height + body.height) / 2;
        if (overlapX && overlapZ && top > ground && previousY >= top - 0.02) { ground = top; support = other; }
      }
      if (body.group.position.y <= ground && body.vy < 0) {
        const impact = Math.abs(body.vy); body.group.position.y = ground; body.vy = impact > 0.3 ? impact * 0.18 : 0; body.vx *= 0.58; body.vz *= 0.58; body.angular *= 0.45;
        if (impact > 0.12) {
          body.impacts++; onContact('impact', clamp(impact / 3, 0.08, 1));
          measurements.impacts.push({ id: body.id, time: Number(elapsed.toFixed(3)), speed: Number(impact.toFixed(3)), on: support?.id || 'floor' });
          if (measurements.impacts.length > 2000) measurements.impacts.shift();
          if (support && support.settled && impact > 0.6) { support.settled = false; support.vx += body.vx * 0.1; support.vz += body.vz * 0.12; support.angular += body.angular * 0.1; }
        }
        if (body.vy === 0 && Math.hypot(body.vx, body.vz) < 0.06) { body.settled = true; body.vx = body.vz = 0; body.group.rotation.x = 0; body.group.rotation.z = 0; body.support = support?.id || null; measurements.settled.push({ id: body.id, seconds: Number((elapsed - body.bornAt).toFixed(3)), impacts: body.impacts, x: Number(body.group.position.x.toFixed(3)), z: Number(body.group.position.z.toFixed(3)) }); }
      }
      body.group.position.x = clamp(body.group.position.x, -4.8, 4.8); body.group.position.z = clamp(body.group.position.z, -1.8, 4.5);
    }
    for (const body of bodies) if (body.settled && body.support && !bodies.some(other => other.id === body.support && Math.abs(other.group.position.x - body.group.position.x) < (body.width + other.width) * 0.45 && Math.abs(other.group.position.z - body.group.position.z) < (body.depth + other.depth) * 0.45)) { body.settled = false; body.support = null; }
  }
  function updatePots(view) {
    const list = view.pots || [], active = new Set(list.map(item => item.id));
    for (const [id, item] of potObjects) if (!active.has(id)) { item.group.removeFromParent(); potObjects.delete(id); }
    const counters = { stock: 0, deposited: 0, inventory: 0 };
    list.forEach(item => {
      const object = potObjects.get(item.id) || createPot(item), location = item.location === 'press' ? 'deposited' : item.location || 'stock', index = counters[location] || 0; counters[location] = index + 1;
      object.fill.visible = item.fill > 0; object.fill.scale.y = Math.max(0.01, clamp(item.fill)); object.fill.position.y = 0.02 + 0.11 * clamp(item.fill);
      if (location === 'deposited') object.group.position.set(0.39 + (index % 3) * 0.21, 1.4 + Math.floor(index / 6) * 0.28, -0.64 + (Math.floor(index / 3) % 2) * 0.21);
      else if (location === 'inventory') object.group.position.set(-0.55 + (index % 5) * 0.21, 0.06 + Math.floor(index / 10) * 0.29, 0.75 + (Math.floor(index / 5) % 2) * 0.23);
      else if (location === 'reuse') object.group.position.set(-2.45 + (index % 4) * 0.2, 0.88 + Math.floor(index / 4) * 0.28, -0.25);
      else object.group.position.set(-2.5 + (index % 7) * 0.22, 0.65 + Math.floor(index / 7) * 0.29, -0.8);
      object.group.visible = index < 42;
    });
  }
  function updateParticles(dt, view) {
    const pouring = !!view.pouring, overflow = !!view.overflow;
    particles.visible = pouring || overflow;
    for (let index = 0; index < 70; index++) {
      const seed = randomFor(index), t = (elapsed * 2.2 + index / 70) % 1;
      if (overflow && index > 46) { const arc = (elapsed * 2.7 + seed) % 1; dummy.position.set(1.2 - arc * 0.88, 1.08 + Math.sin(arc * Math.PI) * 0.3, 0.15 + (seed - 0.5) * 0.15); }
      else dummy.position.set(1.06 - (1 - t) * 0.15 + (seed - 0.5) * 0.11, 1.57 - t * 0.48, 0.17 + (randomFor(index + 100) - 0.5) * 0.12);
      dummy.rotation.set(seed * 5 + elapsed, seed * 9, elapsed * 2); dummy.scale.setScalar(0.55 + seed * 0.7); dummy.updateMatrix(); particles.setMatrixAt(index, dummy.matrix);
    }
    particles.instanceMatrix.needsUpdate = true;
    loadParticles.visible = loadAnimation > 0.1;
    for (let index = 0; index < 26; index++) { const t = (elapsed * 1.8 + index / 26) % 1, seed = randomFor(index + 190); dummy.position.set(-2.18 + t * 0.4 + (seed - 0.5) * 0.17, 1.97 - t * 0.55, 0.02 + (seed - 0.5) * 0.17); dummy.rotation.set(seed * 9, elapsed * 4, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); loadParticles.setMatrixAt(index, dummy.matrix); }
    loadParticles.instanceMatrix.needsUpdate = true;
  }
  function setStation(value) { if (!poses[value]) return; station = value; yawOffset = pitchOffset = 0; navigationOffset.set(0, 0, 0); }
  function look(dx, dy) { yawOffset = clamp(yawOffset - dx * 0.003, -1.8, 1.8); pitchOffset = clamp(pitchOffset - dy * 0.0025, -0.8, 0.7); }
  function move(x, z, dt) { camera.getWorldDirection(cameraDirection); cameraDirection.y = 0; cameraDirection.normalize(); const right = new THREE.Vector3().crossVectors(cameraDirection, camera.up).normalize(); navigationOffset.addScaledVector(right, x * dt * 1.65); navigationOffset.addScaledVector(cameraDirection, -z * dt * 1.65); navigationOffset.x = clamp(navigationOffset.x, -2, 2); navigationOffset.z = clamp(navigationOffset.z, -1.5, 2); }
  function resize() {
    const width = canvas.clientWidth || globalThis.innerWidth || 1024, height = canvas.clientHeight || globalThis.innerHeight || 768;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.fov = camera.aspect < 1 ? 52 : 48;
    camera.setViewOffset(width, height, 0, height * (camera.aspect < 1 ? 0.15 : 0.11), width, height); camera.updateProjectionMatrix();
  }
  function update(dt, view = {}) {
    dt = clamp(dt, 0, 0.08); elapsed += dt; measurements.renderedFrames++;
    if (view.resetToken !== undefined && update.resetToken !== view.resetToken) { if (update.resetToken !== undefined) { for (const body of plateObjects.values()) body.group.removeFromParent(); plateObjects.clear(); for (const item of packageObjects.values()) item.group.removeFromParent(); packageObjects.clear(); measurements.impacts.length = measurements.settled.length = 0; measurements.ejections = 0; } update.resetToken = view.resetToken; }
    drumRotor.rotation.x = Number.isFinite(view.drumAngle) ? view.drumAngle : drumRotor.rotation.x + (view.drumSpeed || 0) * dt;
    const amount = clamp(view.drumFill); drumGrains.count = Math.round(42 * amount); collectingMatter.visible = amount > 0.01;
    for (let index = 0; index < drumGrains.count; index++) { const seed = randomFor(index + 1), angle = elapsed * (view.drumSpeed || 0) * 0.18 + seed * 8; dummy.position.set((seed - 0.5) * 0.87, -0.19 + Math.abs(Math.sin(angle)) * 0.11, (randomFor(index + 70) - 0.5) * 0.46); dummy.rotation.set(angle, seed * 8, angle / 2); dummy.scale.setScalar(0.65 + seed * 0.7); dummy.updateMatrix(); drumGrains.setMatrixAt(index, dummy.matrix); } drumGrains.instanceMatrix.needsUpdate = true;
    if (view.loading && !lastLoading) loadAnimation = 1; lastLoading = !!view.loading; loadAnimation = Math.max(0, loadAnimation - dt * 0.72);
    sourceTray.position.x = smooth(sourceTray.position.x, loadAnimation > 0 ? -0.64 : -0.94, dt); sourceTray.position.y = smooth(sourceTray.position.y, loadAnimation > 0 ? 1.93 : 0.88, dt); sourceTray.position.z = smooth(sourceTray.position.z, loadAnimation > 0 ? 0.02 : 0.43, dt); sourceTray.rotation.z = smooth(sourceTray.rotation.z, loadAnimation > 0 ? -0.65 : 0, dt);
    sourceHeads.visible = view.sourceFill === undefined || view.sourceFill > 0;
    const held = !!view.trayHeld, pouring = !!view.pouring;
    workTray.position.x = smooth(workTray.position.x, held ? -0.39 : -0.93, dt, 10); workTray.position.y = smooth(workTray.position.y, held ? 1.57 : 0.97, dt, 10); workTray.position.z = smooth(workTray.position.z, held ? 0.19 : 0.13, dt, 10); workTray.rotation.z = smooth(workTray.rotation.z, pouring ? -0.68 : held ? -0.12 : 0, dt, 11);
    trayMatter.visible = view.trayFill > 0; trayMatter.scale.y = Math.max(0.02, clamp(view.trayFill)); trayMatter.position.y = 0.025 + 0.05 * clamp(view.trayFill);
    const format = Number(view.format) || 100; if (lastFormat !== format) { drawerAnimation = 1; lastFormat = format; } drawerAnimation = Math.max(0, drawerAnimation - dt * 1.6); moldDrawer.position.z = 0.17 + Math.sin(drawerAnimation * Math.PI) * 0.37;
    moldMatter.visible = view.moldFill > 0; const materialHeight = 0.13 * clamp(view.moldFill) * (1 - clamp(view.materialCompression ?? view.compression) * 0.7); moldMatter.scale.set(format === 250 ? 1 : 0.75, Math.max(0.01, materialHeight / 0.1), format === 250 ? 1 : 0.8); moldMatter.position.y = 0.02 + materialHeight / 2;
    const pressing = view.pressing || view.phase === 'pressing', targetCompression = pressing ? clamp(view.compression) : 0;
    currentCompression = smooth(currentCompression, targetCompression, dt, pressing ? 11 : 4); piston.position.y = 1.48 - currentCompression * 0.37; lever.rotation.z = -0.4 - currentCompression * 1.1;
    lastCompression = view.compression || 0;
    updateBodies(dt, view); updatePots(view); updateParticles(dt, view);
    const pose = poses[station]; targetPosition.set(...pose[0]); if (camera.aspect < 1) targetPosition.z += (1 - camera.aspect) * (station === 'overview' ? 8 : 2.7);
    targetPosition.add(navigationOffset); lookTarget.set(...pose[1]).add(navigationOffset);
    camera.position.lerp(targetPosition, 1 - Math.exp(-dt * 4.5)); camera.lookAt(lookTarget); cameraEuler.setFromQuaternion(camera.quaternion, 'YXZ'); cameraEuler.y += yawOffset; cameraEuler.x += pitchOffset; camera.quaternion.setFromEuler(cameraEuler);
    handGroup.position.y = -0.5 + Math.sin(elapsed * 1.7) * 0.003; handGroup.rotation.z = 0.08 + Math.sin(elapsed * 1.1) * 0.003;
    renderer.render(scene, camera);
  }
  function dispose() { disposed = true; for (const geometry of allocatedGeometries) geometry.dispose(); for (const material of allocatedMaterials) material.dispose(); for (const texture of allocatedTextures) texture.dispose(); renderer.dispose(); }
  resize(); camera.position.set(...poses.overview[0]); camera.lookAt(...poses.overview[1]);
  const api = { update, setStation, look, move, resize, dispose, getPlacement, pickPlate, getPickablePlates, getMeasurements: () => structuredClone(measurements), setAssetGeometry(format, data) {
    if (disposed) return;
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    if (data.normals) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3)); else geometry.computeVertexNormals();
    if (data.uvs) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2)); if (data.indices) geometry.setIndex(data.indices);
    geometry.rotateY(Math.PI / 2); geometry.computeBoundingBox(); const center = geometry.boundingBox.getCenter(new THREE.Vector3()); geometry.translate(-center.x, -center.y, -center.z);
    allocatedGeometries.add(geometry); geometryAssets[format] = geometry; measurements.geometrySource = 'verified-asset'; measurements.loadedGeometryFormats.push(Number(format));
    for (const body of plateObjects.values()) if (body.format === Number(format)) { applyAssetGeometry(body.mesh, geometry, body); body.edges.visible = false; }
  }, setAppearance(variant, props, format = 100) {
    appearanceAssets[`${format}:${variant}`] = props;
    for (const [key, material] of plateMaterials) if (key.startsWith(`${format}:`) && key.endsWith(`:${variant}`)) { material.setValues(props); material.needsUpdate = true; }
  } };
  const loader = new THREE.TextureLoader();
  async function texture(path, color = false) {
    const result = await loader.loadAsync(new URL(`./assets/${path}`, import.meta.url).href); result.flipY = false;
    if (color) result.colorSpace = THREE.SRGBColorSpace; result.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); allocatedTextures.add(result); return result;
  }
  async function loadAssets() {
    const outcomes = await Promise.allSettled([...[100, 250].map(async format => {
      const response = await fetch(new URL(`./assets/hash-${format}g.json`, import.meta.url)); if (!response.ok) throw new Error(`Geometry ${format}: ${response.status}`); api.setAssetGeometry(format, await response.json());
    }), (async () => {
      const response = await fetch(new URL('./assets/bud-5g.json', import.meta.url)); if (!response.ok) throw new Error(`Bud geometry: ${response.status}`);
      const data = await response.json(), geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
      geometry.computeBoundingBox(); const center = geometry.boundingBox.getCenter(new THREE.Vector3()), size = geometry.boundingBox.getSize(new THREE.Vector3()); geometry.translate(-center.x, -center.y, -center.z); geometry.scale(0.13 / size.y, 0.13 / size.y, 0.13 / size.y);
      const map = await texture('bud-5g-basecolor-0.jpg', true); if (disposed) { geometry.dispose(); map.dispose(); return; }
      const material = new THREE.MeshStandardMaterial({ map, color: '#ffffff', roughness: 1, flatShading: true }); allocatedMaterials.add(material); allocatedGeometries.add(geometry);
      drumGrains.geometry = sourceHeads.geometry = geometry; drumGrains.material = sourceHeads.material = material; measurements.loadedBud = true;
    })(), (async () => {
      const response = await fetch(new URL('./assets/knife-v02.json', import.meta.url)); if (!response.ok) throw new Error(`Knife geometry: ${response.status}`);
      const data = await response.json(), geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
      geometry.computeBoundingBox(); const center = geometry.boundingBox.getCenter(new THREE.Vector3()); geometry.translate(-center.x, -center.y, -center.z);
      const map = await texture('knife-v02-basecolor-0.jpg', true); if (disposed) { geometry.dispose(); map.dispose(); return; }
      const material = new THREE.MeshStandardMaterial({ map, color: '#ffffff', roughness: 0.55, metalness: 0.65 }); allocatedMaterials.add(material);
      const object = mesh(geometry, material, knifeGroup); object.scale.setScalar(1.4); knifeHandle.visible = knifeBlade.visible = false; measurements.loadedKnife = true;
    })()]);
    for (const result of outcomes) if (result.status === 'rejected') measurements.assetErrors.push(String(result.reason));
    try {
      const response = await fetch(new URL('./assets/hash-materials.json', import.meta.url)); if (!response.ok) throw new Error(`Appearance descriptor: ${response.status}`);
      const descriptor = await response.json();
      const jobs = [100, 250].flatMap(format => Object.entries(descriptor[`hash-${format}g`] || {}).map(async ([variant, definition]) => {
        const [map, normalMap, roughnessMap] = await Promise.all([texture(definition.map, true), texture(definition.normalMap), texture(definition.roughnessMap)]);
        if (disposed) { map.dispose(); normalMap.dispose(); roughnessMap.dispose(); return; }
        api.setAppearance(variant, { color: new THREE.Color('#ffffff'), roughness: 1, metalness: definition.metalness || 0, map, normalMap, roughnessMap, normalScale: new THREE.Vector2(0.55, 0.55) }, format);
        measurements.loadedAppearances.push(`${format}:${variant}`);
      }));
      const appearances = await Promise.allSettled(jobs); for (const result of appearances) if (result.status === 'rejected') measurements.assetErrors.push(String(result.reason));
    } catch (error) { measurements.assetErrors.push(String(error)); }
  }
  api.assetsReady = loadAssets();
  return api;
}
