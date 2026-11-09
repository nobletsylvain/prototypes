import * as THREE from './assets/three.module.js';
import { CATALOG } from './model.mjs?v=20261109d';

const TAU = Math.PI * 2;
const denominations = [5, 10, 20, 50, 100];
const paperColors = { 5: '#bfc9b6', 10: '#d4a397', 20: '#a6c7d5', 50: '#d9b083', 100: '#afc994' };
const damp = (a, b, dt, speed = 15) => a + (b - a) * (1 - Math.exp(-dt * speed));

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.86, ...options });
}

function box(parent, w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(parent, radius, mat, x, y, z, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radius, height, mat, x, y, z, top = radius) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, radius, height, 12), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function label(parent, text, width, height, x, y, z, options = {}) {
  const texture = canvasTexture(512, 160, (ctx, w, h) => {
    if (options.background) { ctx.fillStyle = options.background; ctx.fillRect(0, 0, w, h); }
    ctx.fillStyle = options.color || '#f4e9ce';
    ctx.font = `${options.weight || 600} ${options.size || 70}px Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: !options.background, side: THREE.DoubleSide, depthWrite: false }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function weightLabel(parent, grams, shortcut, width, height, x, y, z) {
  const texture = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f1ead5'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#b6ad91'; ctx.lineWidth = 4; ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#193738'; ctx.font = '800 100px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${grams} g`, w / 2, shortcut ? 58 : 64);
    if (shortcut) {
      ctx.fillStyle = '#626c61'; ctx.font = '600 24px Arial, sans-serif';
      ctx.fillText(String(shortcut), w - 20, h - 17);
    }
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function line(parent, points, color, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point)));
  const mesh = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
  parent.add(mesh);
  return mesh;
}

export class SaleScene {
  constructor(canvas, { onContact } = {}) {
    this.canvas = canvas;
    this.onContact = onContact;
    this.enhanced = true;
    this.labels = { bag: 'SACOCHE' };
    this.time = 0;
    this.reaction = null;
    this.lastCurrent = null;
    this.objects = new Map();
    this.productModels = new Map();
    this.characterModels = new Map();
    this.pickMeshes = [];
    this.dragPoint = new THREE.Vector3(0.25, 1.3, 0.9);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.effects = [];
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#202e35');
    this.scene.fog = new THREE.Fog('#28333a', 8, 22);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.camera = new THREE.PerspectiveCamera(43, 1, 0.08, 60);
    this.scene.add(new THREE.HemisphereLight('#d5e5ff', '#6b5141', 2.2));
    const lamp = new THREE.DirectionalLight('#ffe1b2', 3.1);
    lamp.position.set(-3, 5, 3);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    Object.assign(lamp.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 14 });
    lamp.shadow.bias = -0.0008;
    this.scene.add(lamp);
    const fill = new THREE.DirectionalLight('#8daecb', 1.0);
    fill.position.set(4, 3, -2);
    this.scene.add(fill);
    this.buildStreet();
    this.buildStall();
    this.buildBag();
    this.customer = this.makeCustomer(0);
    this.customer.position.set(0, 0, -1.35);
    this.scene.add(this.customer);
    this.waiting = Array.from({ length: 5 }, (_, index) => {
      const person = this.makeCustomer(index + 1);
      person.position.set(-1.3 - index * 0.38, 0, -2.25 - index * 0.55);
      person.rotation.y = 0.22;
      person.visible = false;
      this.scene.add(person);
      return person;
    });
    this.hand = new THREE.Group();
    const sleeve = box(this.hand, 0.18, 0.18, 0.45, material('#253c49'), 0.06, -0.11, 0.18);
    sleeve.rotation.x = -0.4;
    sphere(this.hand, 0.108, material('#ae7b58'), 0, 0, 0, [0.75, 0.45, 1.1]);
    sphere(this.hand, 0.05, material('#bd8a66'), -0.065, 0.018, -0.035, [0.65, 0.65, 1.5]);
    this.scene.add(this.hand);
    this.hand.visible = false;
    this.billTextures = Object.fromEntries(denominations.map(value => [value, this.makeBillTexture(value)]));
    this.resize();
  }

  buildStreet() {
    const floorTexture = canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#586066'; ctx.fillRect(0, 0, w, h);
      for (let row = 0; row < 8; row++) for (let col = 0; col < 6; col++) {
        ctx.fillStyle = ['#62686a', '#64696a', '#5d6568', '#697071'][(row * 7 + col) % 4];
        ctx.fillRect(col * 88 - (row % 2) * 44, row * 64, 84, 60);
      }
    });
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(7, 7);
    box(this.scene, 25, 0.1, 25, material('#ffffff', { map: floorTexture }), 0, -0.07, -4);
    const plaster = material('#aca28b');
    const dark = material('#263e42');
    const trim = material('#c7bc9f');
    box(this.scene, 16, 7, 0.28, plaster, 0, 3.5, -4.4);
    box(this.scene, 16, 0.68, 0.36, material('#737b73'), 0, 0.34, -4.17);
    for (let index = -3; index <= 3; index++) {
      const x = index * 2.15;
      box(this.scene, 1.15, 2.0, 0.1, dark, x, 2.35, -4.21);
      box(this.scene, 1.32, 0.13, 0.35, trim, x, 1.31, -4.1);
      box(this.scene, 0.06, 2.0, 0.12, trim, x, 2.35, -4.12);
      box(this.scene, 1.15, 0.06, 0.12, trim, x, 2.5, -4.1);
      box(this.scene, 0.25, 2.1, 0.12, material('#415c59'), x - 0.74, 2.36, -4.12);
      box(this.scene, 0.25, 2.1, 0.12, material('#415c59'), x + 0.74, 2.36, -4.12);
    }
    box(this.scene, 1.3, 2.3, 0.2, material('#3a4b48'), 2.15, 1.15, -4.05);
    box(this.scene, 0.08, 0.3, 0.08, material('#ad9c65', { metalness: 0.5 }), 2.55, 1.05, -3.91);
    label(this.scene, 'RUE DES TILLEULS', 1.25, 0.28, 2.15, 3.7, -4.08, { background: '#264c60', color: '#e6e6d3', size: 34 });
    const glow = material('#ffd69e', { emissive: '#db9e42', emissiveIntensity: 1.5 });
    box(this.scene, 0.18, 0.3, 0.16, glow, -3.13, 2.88, -3.8);
    cylinder(this.scene, 0.04, 3.05, material('#283d3d'), -3.13, 1.52, -3.8);
    const pool = new THREE.PointLight('#ffc984', 10, 6, 2);
    pool.position.set(-3.13, 2.7, -3.6);
    this.scene.add(pool);
    box(this.scene, 0.5, 0.85, 0.5, material('#42564a'), 3, 0.42, -2.8);
    const awning = box(this.scene, 2.8, 0.1, 1.1, material('#7b514b'), -2.15, 3.7, -3.5);
    awning.rotation.x = -0.12;
    for (let index = 0; index < 7; index++) box(this.scene, 0.2, 0.2, 0.9, material('#c6b59d'), -3.35 + index * 0.4, 3.61, -3.5);
  }

  buildStall() {
    const cardboardTexture = canvasTexture(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#b29467'; ctx.fillRect(0, 0, w, h);
      for (let index = 0; index < 400; index++) {
        const x = (index * 79) % w, y = (index * 67) % h;
        ctx.fillStyle = index % 2 ? '#b79b73' : '#ad8e60';
        ctx.fillRect(x, y, 1 + index % 5, 1);
      }
      ctx.fillStyle = '#c8ae80'; ctx.fillRect(w / 2 - 28, 0, 56, h);
      ctx.fillStyle = '#9c7d50'; ctx.fillRect(w / 2 - 1, 0, 2, h);
      ctx.strokeStyle = '#a08356'; ctx.strokeRect(4, 4, w - 8, h - 8);
    });
    this.carton = new THREE.Group();
    box(this.carton, 2.55, 0.68, 1.2, material('#9c7c4c'), 0, 0.34, -0.18);
    const top = box(this.carton, 2.6, 0.045, 1.24, material('#ffffff', { map: cardboardTexture }), 0, 0.7, -0.18);
    top.userData.drop = 'tray';
    this.traySurface = top;
    const tape = box(this.carton, 0.15, 0.64, 0.007, material('#b89a64'), 0, 0.33, 0.424);
    tape.rotation.z = -0.01;
    label(this.carton, "L’ÉTAL", 0.65, 0.22, -0.73, 0.4, 0.434, { color: '#4c3b29', size: 72, weight: 800 });
    label(this.carton, '↑  ↑', 0.27, 0.16, 0.98, 0.21, 0.434, { color: '#715735', size: 100 });
    line(this.carton, [[-1.27, 0.67, 0.427], [1.27, 0.67, 0.427]], '#d1b082');
    this.scene.add(this.carton);
  }

  buildBag() {
    this.bag = new THREE.Group();
    this.bag.position.set(0, 0, 0.98);
    const leather = material('#263b35');
    const edge = material('#52614b');
    const inside = material('#142a27');
    const depth = this.portrait ? 0.94 : 0.56;
    const front = depth / 2;
    const body = box(this.bag, 2.64, 0.3, depth, leather, 0, 0.34, 0);
    body.userData.drop = 'bag';
    this.bagSurface = body;
    box(this.bag, 2.64, 0.06, depth + 0.06, inside, 0, 0.5, 0);
    box(this.bag, 2.66, 0.085, 0.055, edge, 0, 0.52, front);
    box(this.bag, 2.66, 0.12, 0.045, edge, 0, 0.56, -front);
    box(this.bag, 0.06, 0.14, depth - 0.02, edge, -1.3, 0.53, 0);
    box(this.bag, 0.06, 0.14, depth - 0.02, edge, 1.3, 0.53, 0);
    if (this.portrait) {
      box(this.bag, 2.58, 0.12, 0.035, edge, 0, 0.55, 0.02);
      for (let index = 0; index < 5; index++) {
        const x = -1.04 + index * 0.52;
        if (index) box(this.bag, 0.025, 0.14, depth - 0.02, edge, x - 0.26, 0.55, 0);
        label(this.bag, String(index + 1), 0.12, 0.08, x, 0.43, front + 0.01, { color: '#d3cdb6', size: 105 });
      }
      this.bagLabel = label(this.bag, this.labels.bag, 0.43, 0.085, 0, 0.28, front + 0.01, { color: '#d5cab1', size: 52 });
      box(this.bag, 2.4, 0.012, 0.01, material('#998c66'), 0, 0.21, front + 0.01);
      this.bag.scale.x = 0.75;
      this.scene.add(this.bag);
      return;
    }
    for (let index = 0; index < 5; index++) {
      const x = -1.13 + index * 0.27;
      box(this.bag, 0.025, 0.13, 0.51, edge, x - 0.13, 0.55, -0.01);
      const numeral = label(this.bag, String(index + 1), 0.08, 0.065, x, 0.44, 0.29, { color: '#d3cdb6', size: 105 });
      numeral.rotation.x = -0.13;
    }
    box(this.bag, 0.04, 0.16, 0.53, edge, 0.12, 0.56, 0);
    for (let index = 0; index < 5; index++) {
      const x = 0.28 + index * 0.22;
      box(this.bag, 0.018, 0.13, 0.51, edge, x - 0.107, 0.56, 0);
    }
    box(this.bag, 2.4, 0.018, 0.01, material('#998c66'), 0, 0.3, 0.288);
    this.bagLabel = label(this.bag, this.labels.bag, 0.43, 0.09, 0.7, 0.38, 0.293, { color: '#d5cab1', size: 52 });
    box(this.bag, 0.08, 0.08, 0.04, material('#ad9c70', { metalness: 0.4 }), -0.63, 0.3, 0.3);
    const strapPoints = [[-1.25, 0.5, 0.1], [-1.58, 0.5, 0.5], [-1.52, 0.3, 1.1]];
    line(this.bag, strapPoints, '#52614b');
    this.scene.add(this.bag);
  }

  makeCustomer(index) {
    const person = new THREE.Group();
    this.setCustomerModel(person, index);
    return person;
  }

  setCustomerModel(person, index) {
    const names = ['Leah', 'Moira', 'Eddie', 'Martin'];
    const name = names[Math.max(0, index) % names.length];
    if (person.userData.modelName === name && person.userData.ready) return;
    person.userData.mouth?.geometry.dispose();
    person.clear();
    person.userData = { modelName: name, index, ready: false, emotion: 'neutral', emotionStart: this.time };
    const source = this.characterModels.get(name);
    if (!source) return;
    const model = source.clone(true);
    const nodes = [];
    model.traverse(node => { nodes.push(node); if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    const named = prefix => nodes.filter(node => { const name = node.userData.name || node.name; return name === prefix || name.startsWith(prefix + '.'); });
    const head = named('Head')[0], arms = [named('Arm_L')[0], named('Arm_R')[0]];
    const torso = named('Shirt torso')[0], mouth = named('Mouth')[0];
    const eyebrows = named('Eyebrow').sort((a, b) => a.position.x - b.position.x);
    const eyes = named('Eye white').sort((a, b) => a.position.x - b.position.x);
    const pupils = named('Pupil').sort((a, b) => a.position.x - b.position.x);
    if (!head || arms.some(arm => !arm) || !torso || !mouth?.isMesh || eyebrows.length !== 2 || eyes.length !== 2 || pupils.length !== 2) throw new Error(`Character ${name} is missing original animation pivots`);
    const hand = named('Hand').find(node => node.parent === arms[1]);
    if (!hand) throw new Error(`Character ${name} is missing the right hand`);
    const grip = new THREE.Object3D();
    grip.position.copy(hand.position);
    arms[1].add(grip);
    // Subdivide the original mouth surface so its own geometry can smile or frown.
    const geometry = mouth.geometry.index ? mouth.geometry.toNonIndexed() : mouth.geometry.clone();
    const original = geometry.attributes.position;
    const vertices = [];
    const addTriangle = (a, b, c, depth) => {
      if (!depth) { vertices.push(...a, ...b, ...c); return; }
      const mid = (u, v) => u.map((value, axis) => (value + v[axis]) / 2);
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      addTriangle(a, ab, ca, depth - 1); addTriangle(ab, b, bc, depth - 1);
      addTriangle(ca, bc, c, depth - 1); addTriangle(ab, bc, ca, depth - 1);
    };
    for (let i = 0; i < original.count; i += 3) {
      const point = index => [original.getX(index), original.getY(index), original.getZ(index)];
      addTriangle(point(i), point(i + 1), point(i + 2), 1);
    }
    geometry.dispose();
    mouth.geometry = new THREE.BufferGeometry();
    mouth.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    mouth.geometry.computeVertexNormals();
    mouth.geometry.computeBoundingBox();
    const mouthBase = new Float32Array(vertices);
    const mouthHalfWidth = Math.max(0.0001, mouth.geometry.boundingBox.getSize(new THREE.Vector3()).x / 2);
    person.add(model);
    person.userData = { modelName: name, index, ready: true, head, arms, torso, grip, eyes, pupils, eyebrows, mouth, mouthBase, mouthHalfWidth, emotion: 'neutral', emotionStart: this.time,
      browY: eyebrows.map(brow => brow.position.y), armY: arms.map(arm => arm.position.y) };
  }

  async loadGameModels({ loaderUrl = './assets/GLTFLoader.js', urls = {} } = {}) {
    const report = { loaded: [], failed: [] };
    let loader;
    try { const { GLTFLoader } = await import(loaderUrl); loader = new GLTFLoader(); }
    catch (error) { return { loaded: [], failed: [{ asset: 'loader', message: String(error?.message || error) }] }; }
    const sources = await Promise.all(['bud2', 'bud5', 'resin', 'Leah', 'Moira', 'Eddie', 'Martin'].map(async name => {
      try {
        if (!urls[name]) throw new Error('Missing original game model URL');
        const gltf = await loader.loadAsync(new URL(urls[name], import.meta.url).href);
        if (!gltf.scene) throw new Error('Model has no scene');
        let skinned = false;
        gltf.scene.traverse(node => { if (node.isSkinnedMesh) skinned = true; });
        const bounds = new THREE.Box3().setFromObject(gltf.scene);
        const size = bounds.getSize(new THREE.Vector3());
        if (skinned || bounds.isEmpty() || size.toArray().some(value => !Number.isFinite(value)) || size.length() < 0.00001) throw new Error('Original model geometry is invalid');
        return { name, scene: gltf.scene };
      } catch (error) { report.failed.push({ asset: name, message: String(error?.message || error) }); return null; }
    }));
    for (const source of sources.filter(Boolean)) {
      if (['bud2', 'bud5', 'resin'].includes(source.name)) {
        const skus = source.name === 'resin' ? ['hash4', 'hash8'] : source.name === 'bud5' ? ['flower5'] : ['flower2', 'premium2'];
        for (const sku of skus) this.productModels.set(sku, { scene: source.scene, source: urls[source.name] });
        report.loaded.push(source.name);
      } else {
        try {
          this.characterModels.set(source.name, source.scene);
          const probe = this.makeCustomer(['Leah', 'Moira', 'Eddie', 'Martin'].indexOf(source.name));
          if (!probe.userData.ready) throw new Error('Character animation pivots are unavailable');
          probe.userData.mouth.geometry.dispose();
          report.loaded.push(source.name);
        } catch (error) { this.characterModels.delete(source.name); report.failed.push({ asset: source.name, message: String(error?.message || error) }); }
      }
    }
    this.setCustomerModel(this.customer, this.state?.clients.findIndex(client => client.id === this.state.currentId) ?? 0);
    this.waiting.forEach((person, index) => this.setCustomerModel(person, index + 1));
    for (const entry of this.objects.values()) if (entry.item.kind === 'product') {
      const replacement = this.createProductVisual(entry.item);
      entry.group.remove(entry.productVisual);
      entry.group.add(replacement);
      entry.productVisual = replacement;
      replacement.traverse(node => { if (node.isMesh) node.userData.objectId = entry.item.id; });
    }
    this.gameModelReport = report;
    return report;
  }

  makeBillTexture(value) {
    let source = null;
    const texture = canvasTexture(256, 512, (ctx, w, h) => this.drawBill(ctx, w, h, value, source));
    const image = new Image();
    image.onload = () => {
      source = image;
      this.drawBill(texture.image.getContext('2d'), 256, 512, value, source);
      texture.needsUpdate = true;
    };
    image.src = new URL(`./assets/banknote_${value}eur_front_back.png`, import.meta.url).href;
    return texture;
  }

  drawBill(ctx, w, h, value, source) {
    ctx.fillStyle = paperColors[value]; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e5e3cc'; ctx.lineWidth = 9; ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.strokeStyle = '#6c8582'; ctx.lineWidth = 2; ctx.strokeRect(23, 23, w - 46, h - 46);
    ctx.fillStyle = '#23464b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${value === 100 ? 92 : 112}px Arial`;
    ctx.fillText(String(value), w / 2, 117);
    ctx.font = '22px Arial'; ctx.fillText('EURO', w / 2, 195);
    if (source) ctx.drawImage(source, 0, 0, 1024, 476, 25, 260, w - 50, 160);
    else {
      ctx.lineWidth = 5; ctx.strokeRect(50, 290, w - 100, 100);
      ctx.beginPath(); ctx.arc(w / 2, 340, 40, Math.PI, 0); ctx.stroke();
    }
    ctx.font = '12px Arial'; ctx.fillText('THE CAPITAL', w / 2, 462);
  }

  createProductVisual(item) {
    const visual = new THREE.Group();
    const asset = this.productModels.get(item.sku);
    // The game content sits inside one pouch, with one weight label.
    const foil = material('#d5e7e6', { transparent: true, opacity: 0.24, roughness: 0.2, metalness: 0.18, depthWrite: false });
    const film = box(visual, 0.22, 0.08, 0.25, foil, 0, 0.045, 0);
    let labelY = 0.099;
    box(visual, 0.22, 0.009, 0.018, material('#9b4741', { roughness: 0.4 }), 0, 0.046, -0.108);
    if (asset) {
      const model = asset.scene.clone(true);
      if (item.sku.startsWith('hash')) {
        const dimensions = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
        model.scale.set(1.5, 1.5, (item.grams === 8 ? 0.0216 : 0.0108) / dimensions.z);
      } else model.scale.setScalar(1.6);
      model.rotation.x = -Math.PI / 2;
      visual.add(model);
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.add(new THREE.Vector3(-center.x, 0.012 - bounds.min.y, 0.025 - center.z));
      const pouchHeight = Math.max(0.08, bounds.max.y - bounds.min.y + 0.018);
      film.scale.y = pouchHeight / 0.08;
      film.position.y = 0.005 + pouchHeight / 2;
      labelY = pouchHeight + 0.019;
      model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
      visual.userData.sourceModel = asset.source;
    }
    const tag = weightLabel(visual, item.grams, null, 0.19, 0.075, 0, labelY, -0.0825);
    tag.rotation.x = -Math.PI / 2;
    line(visual, [[-0.106, 0.045, -0.09], [-0.096, 0.045, 0.115], [0.103, 0.045, 0.115]], '#edf1dc', 0.7);
    return visual;
  }

  createObject(item) {
    const group = new THREE.Group();
    group.userData.id = item.id;
    let paper = null;
    let productVisual = null;
    if (item.kind === 'bill') {
      const geometry = new THREE.PlaneGeometry(0.19, 0.4, 4, 12);
      paper = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: this.billTextures[item.denomination], side: THREE.DoubleSide, roughness: 0.84, metalness: 0 }));
      paper.castShadow = true;
      group.add(paper);
    } else if (item.kind === 'product') {
      productVisual = this.createProductVisual(item);
      group.add(productVisual);
    } else {
      box(group, 0.27, 0.16, 0.21, material('#ad9064'));
      box(group, 0.045, 0.165, 0.215, material('#dac398'));
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(item.kind === 'bill' ? 0.14 : 0.12, 24), new THREE.MeshBasicMaterial({ color: '#251d14', transparent: true, opacity: 0.2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    this.scene.add(shadow);
    group.traverse(child => { if (child.isMesh) child.userData.objectId = item.id; });
    this.scene.add(group);
    const entry = { group, paper, productVisual, shadow, location: null, age: 0, start: new THREE.Vector3(), target: new THREE.Vector3(), targetRotation: new THREE.Euler(), contactPending: false, item };
    this.objects.set(item.id, entry);
    return entry;
  }

  targetFor(item, state) {
    const related = state.objects.filter(other => other.location === item.location && (item.location !== 'fund' || other.denomination === item.denomination));
    const index = related.findIndex(other => other.id === item.id);
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    if (item.location.startsWith('slot:')) {
      const slot = CATALOG.findIndex(entry => entry.key === item.sku);
      position.set(this.portrait ? (-1.04 + slot * 0.52) * 0.75 : -1.13 + slot * 0.27, 0.56 + index * 0.008, (this.portrait ? 1.24 : 0.98) - index * 0.005);
      rotation.y = ((index % 3) - 1) * 0.04;
    } else if (item.location === 'fund') {
      position.set((this.portrait ? (-1.04 + denominations.indexOf(item.denomination) * 0.52) * 0.75 : 0.28 + denominations.indexOf(item.denomination) * 0.22) + index * 0.002, (this.portrait ? 0.79 : 0.73) + index * 0.004, (this.portrait ? 0.77 : 1.0) - index * 0.009);
      rotation.x = -0.12;
      rotation.z = (denominations.indexOf(item.denomination) - 2) * -0.025;
    } else if (item.location === 'tray') {
      position.set(-0.48 + (index % 3) * 0.27, 0.735 + Math.floor(index / 6) * 0.012, -0.4 + (Math.floor(index / 3) % 2) * 0.26);
      rotation.y = -0.12 + (index % 3) * 0.08;
    } else if (item.location === 'change' || item.location === 'receipt') {
      position.set((item.location === 'change' ? 0.49 : -0.92) + (index % 3) * 0.24, 0.745 + Math.floor(index / 3) * 0.006, item.location === 'change' ? -0.23 : -0.66);
      rotation.x = -Math.PI / 2;
      rotation.z = Math.PI / 2 + (index % 3 - 1) * 0.08;
    } else if (item.location === 'drag') {
      position.copy(this.dragPoint);
      if (item.kind === 'bill') { rotation.x = -0.25; rotation.z = 0.08; }
      else rotation.x = 0.45;
    } else if (item.location === 'hand') {
      position.set((this.portrait ? 0.73 : 0.9) + index * 0.025, 0.94, 1.36 - index * 0.012);
      if (item.kind === 'bill') { rotation.x = -0.45; rotation.z = -0.22; }
      else rotation.x = 0.1;
    } else if (item.location === `customer:${state.currentId}`) {
      if (this.customer.userData.grip) this.customer.userData.grip.getWorldPosition(position);
      else position.set(0.255, 1.1, -0.85);
      position.add(new THREE.Vector3(index * 0.025, 0.17, 0.055 - index * 0.012));
      rotation.x = -0.12;
      rotation.y = this.customer.rotation.y * 0.5;
      rotation.z = -0.04 + index * 0.04;
    } else {
      position.set(0, 1.05, -1.45);
    }
    return { position, rotation };
  }

  update(state, view, dt = 0.016) {
    dt = Math.max(0, Math.min(dt, 0.08));
    this.time += dt;
    this.state = state;
    this.view = view;
    const newlyStarted = this.lastCurrent !== state.currentId;
    if (newlyStarted) {
      this.lastCurrent = state.currentId;
      this.setCustomerModel(this.customer, state.clients.findIndex(client => client.id === state.currentId));
      this.customer.position.x = 0.55;
      this.customer.rotation.y = -0.3;
      this.reaction = null;
      this.setCustomerEmotion('neutral');
    }
    this.animateCustomer(state, view, dt);
    this.customer.updateMatrixWorld(true);
    this.pickMeshes.length = 0;
    const ids = new Set();
    for (const item of state.objects) {
      ids.add(item.id);
      const entry = this.objects.get(item.id) || this.createObject(item);
      entry.item = item;
      const customerOwned = item.location.startsWith('customer:');
      const currentTender = item.location === `customer:${state.currentId}` && ['request', 'hesitation', 'payment'].includes(state.phase);
      const hidden = (customerOwned && !currentTender) || item.location.startsWith('client:') || item.location === 'demo-home';
      const next = this.targetFor(item, state);
      const changed = entry.location !== item.location;
      if (changed) {
        const initial = entry.location === null;
        entry.handingOver = hidden && !initial && ['tray', 'change'].includes(entry.location);
        entry.transferToFund = !initial && item.location === 'fund' && entry.location.startsWith('customer:');
        entry.start.copy(initial ? next.position : entry.group.position);
        entry.age = initial ? 1 : 0;
        entry.location = item.location;
        entry.contactPending = !initial && (['tray', 'change', 'receipt'].includes(item.location) || entry.transferToFund);
        if (initial) { entry.group.position.copy(next.position); entry.group.rotation.copy(next.rotation); }
      }
      const slotItems = item.location.startsWith('slot:') ? state.objects.filter(other => other.location === item.location) : [];
      const buried = slotItems.length > 2 && slotItems.findIndex(other => other.id === item.id) < slotItems.length - 2;
      entry.group.visible = (!hidden || (entry.handingOver && entry.age < 0.22)) && !buried;
      entry.group.scale.setScalar(currentTender ? (this.portrait ? 1.5 : 1.35) : this.portrait && ['fund', 'drag', 'hand'].includes(item.location) && item.kind === 'bill' ? 1.28 : this.portrait && item.location.startsWith('slot:') ? 1.25 : 1);
      entry.age += dt;
      entry.target.copy(next.position);
      entry.targetRotation.copy(next.rotation);
      if (item.location === 'drag') {
        entry.group.position.lerp(next.position, 1 - Math.exp(-24 * dt));
      } else {
        const duration = entry.transferToFund ? (this.enhanced ? 0.5 : 0.3) : (this.enhanced ? 0.2 : 0.12);
        const t = Math.min(1, entry.age / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        entry.group.position.lerpVectors(entry.start, next.position, ease);
        if (this.enhanced && t < 1 && !hidden) entry.group.position.y += Math.sin(t * Math.PI) * 0.16;
        if (entry.contactPending && t === 1) {
          entry.contactPending = false;
          this.onContact?.({ type: entry.transferToFund ? 'fund-contact' : item.kind === 'bill' ? 'paper-contact' : 'product-contact', id: item.id });
          if (this.enhanced && !entry.transferToFund) this.contactEffect(next.position);
        }
        if (this.enhanced && ['tray', 'change', 'receipt'].includes(item.location) && entry.age > 0.2 && entry.age < 0.48) {
          entry.group.position.y += Math.max(0, Math.sin((entry.age - 0.2) * 28)) * 0.012 * (1 - (entry.age - 0.2) / 0.28);
        }
      }
      entry.group.rotation.x = damp(entry.group.rotation.x, next.rotation.x, dt);
      entry.group.rotation.y = damp(entry.group.rotation.y, next.rotation.y, dt);
      entry.group.rotation.z = damp(entry.group.rotation.z, next.rotation.z, dt);
      if (entry.paper) {
        const positions = entry.paper.geometry.attributes.position;
        const motion = item.location === 'drag' || (entry.transferToFund ? entry.age < 0.8 : entry.age < 0.5);
        const amplitude = this.enhanced && motion ? 0.019 : 0.004;
        for (let index = 0; index < positions.count; index++) {
          const y = positions.getY(index);
          positions.setZ(index, Math.sin(y * 17 + this.time * (motion ? 13 : 1.2)) * amplitude * Math.max(0.1, (y + 0.2) / 0.4));
        }
        positions.needsUpdate = true;
        entry.paper.geometry.computeVertexNormals();
      }
      entry.shadow.visible = !hidden && ['tray', 'change', 'receipt', 'drag'].includes(item.location);
      entry.shadow.position.set(entry.group.position.x, 0.727, entry.group.position.z);
      entry.shadow.material.opacity = item.location === 'drag' ? 0.1 : 0.18;
      if (!hidden && !buried && !customerOwned) entry.group.traverse(child => { if (child.isMesh) this.pickMeshes.push(child); });
    }
    for (const [id, entry] of this.objects) if (!ids.has(id)) { entry.group.visible = false; entry.shadow.visible = false; }
    for (let index = 0; index < this.waiting.length; index++) {
      const person = this.waiting[index];
      if (state.queue[index]) this.setCustomerModel(person, state.clients.findIndex(client => client.id === state.queue[index]));
      person.visible = person.userData.ready && index < view.queueCount;
      if (person.userData.head) person.userData.head.rotation.z = Math.sin(this.time * 0.7 + index) * 0.025;
    }
    this.hand.visible = Boolean(state.dragId || view.hand?.length);
    if (this.hand.visible) {
      const held = state.dragId ? this.objects.get(state.dragId)?.group.position : this.objects.get(view.hand?.[0]?.id)?.group.position;
      if (held) this.hand.position.copy(held).add(new THREE.Vector3(0.1, -0.12, 0.05));
    }
    for (let index = this.effects.length - 1; index >= 0; index--) {
      const effect = this.effects[index];
      effect.age += dt;
      effect.mesh.scale.setScalar(1 + effect.age * 3);
      effect.mesh.material.opacity = Math.max(0, 0.28 * (1 - effect.age / 0.36));
      if (effect.age > 0.36) { this.scene.remove(effect.mesh); effect.mesh.geometry.dispose(); effect.mesh.material.dispose(); this.effects.splice(index, 1); }
    }
    this.renderer.render(this.scene, this.camera);
  }

  animateCustomer(state, view, dt) {
    const person = this.customer;
    person.visible = person.userData.ready && Boolean(view.current);
    if (!person.userData.ready) return;
    const departing = state.phase === 'departing';
    const targetX = departing ? 2.1 : 0;
    person.position.x = damp(person.position.x, targetX, dt, departing ? 2.2 : 5);
    person.rotation.y = damp(person.rotation.y, departing ? 0.7 : 0, dt, 5);
    const latestSale = state.sales?.at(-1);
    if (['receipt', 'departing'].includes(state.phase) && latestSale?.customerId === state.currentId) {
      const feedbackEmotion = latestSale.feedback?.emotion;
      if (['happy', 'unhappy'].includes(feedbackEmotion)) this.setCustomerEmotion(feedbackEmotion);
      else if (person.userData.emotion === 'neutral') this.setCustomerEmotion('happy');
    } else if (view.current?.status === 'left') this.setCustomerEmotion('unhappy');
    const head = person.userData.head;
    const hesitate = state.phase === 'hesitation';
    const emotion = person.userData.emotion;
    const age = this.time - (this.reaction?.start ?? person.userData.emotionStart);
    const active = Math.max(0, 1 - age / 1.1);
    const happy = emotion === 'happy';
    const unhappy = emotion === 'unhappy';
    const nod = happy ? Math.sin(age * 12) * 0.19 * active : this.reaction && !unhappy ? Math.sin(age * 10) * 0.07 * active : 0;
    head.rotation.z = damp(head.rotation.z, unhappy ? -0.07 : hesitate ? -0.14 : Math.sin(this.time * 0.9) * 0.02, dt);
    head.rotation.x = damp(head.rotation.x, unhappy ? 0.12 : nod + (hesitate ? 0.04 : 0), dt, 20);
    head.rotation.y = damp(head.rotation.y, unhappy ? Math.sin(age * 11) * 0.22 * active : 0, dt, 20);
    person.userData.torso.scale.y = (unhappy ? 0.97 : 1) + Math.sin(this.time * 1.6) * 0.008;
    person.userData.torso.rotation.x = damp(person.userData.torso.rotation.x, unhappy ? 0.06 : 0, dt);
    for (let index = 0; index < 2; index++) {
      const side = index ? 1 : -1;
      const brow = person.userData.eyebrows[index];
      brow.position.y = damp(brow.position.y, person.userData.browY[index] + (happy ? 0.012 : unhappy ? -0.007 : 0), dt);
      brow.rotation.z = damp(brow.rotation.z, side * (unhappy ? 0.32 : happy ? -0.08 : 0.07), dt);
      person.userData.eyes[index].scale.y = damp(person.userData.eyes[index].scale.y, happy ? 0.7 : 1, dt);
      person.userData.pupils[index].scale.y = person.userData.eyes[index].scale.y;
      person.userData.arms[index].position.y = damp(person.userData.arms[index].position.y, person.userData.armY[index] - (unhappy ? 0.025 : 0), dt);
    }
    const holdsPayment = state.objects.some(item => item.location === `customer:${state.currentId}`);
    const offering = ['request', 'hesitation', 'payment'].includes(state.phase);
    person.userData.arms[1].rotation.x = damp(person.userData.arms[1].rotation.x, holdsPayment && offering ? -1.12 : 0, dt, 10);
    const gesture = happy ? -0.75 * Math.sin(Math.min(1, age / 1.1) * Math.PI) : unhappy ? -0.12 : -0.25 * Math.sin(Math.min(1, age / 1.1) * Math.PI);
    person.userData.arms[0].rotation.x = damp(person.userData.arms[0].rotation.x, active ? gesture : 0, dt);
    person.userData.arms[0].rotation.z = damp(person.userData.arms[0].rotation.z, happy && active ? -0.3 : unhappy ? -0.04 : -0.13, dt);
    if (this.reaction && age >= 1.1) this.reaction = null;
  }

  setCustomerEmotion(emotion) {
    if (!['happy', 'unhappy', 'neutral'].includes(emotion) || !this.customer) return;
    const face = this.customer.userData;
    if (face.emotion === emotion) return;
    face.emotion = emotion;
    face.emotionStart = this.time;
    if (!face.mouth) return;
    const positions = face.mouth.geometry.attributes.position;
    const bend = emotion === 'happy' ? 0.012 : emotion === 'unhappy' ? -0.008 : 0;
    for (let index = 0; index < positions.count; index++) {
      const x = face.mouthBase[index * 3];
      positions.setXYZ(index, x, face.mouthBase[index * 3 + 1] + bend * ((x / face.mouthHalfWidth) ** 2 - 0.4), face.mouthBase[index * 3 + 2]);
    }
    face.mouth.scale.x = emotion === 'happy' ? 1.45 : 1;
    positions.needsUpdate = true;
    face.mouth.geometry.computeVertexNormals();
  }

  contactEffect(position) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.076, 32), new THREE.MeshBasicMaterial({ color: '#edcf9f', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y = 0.731;
    this.scene.add(mesh);
    this.effects.push({ mesh, age: 0 });
  }

  pulse(event) {
    const type = typeof event === 'string' ? event : event?.type;
    if (type === 'reset') { this.reaction = null; this.setCustomerEmotion('neutral'); return; }
    if (['sale-unhappy', 'declined'].includes(type)) this.setCustomerEmotion('unhappy');
    else if (type === 'sale-happy') this.setCustomerEmotion('happy');
    else if (['sale-to-fund', 'sale-to-hand', 'sale-to-tray'].includes(type)) {
      this.setCustomerEmotion(this.state?.sales?.at(-1)?.feedback?.emotion === 'unhappy' ? 'unhappy' : 'happy');
    }
    if (['sale-happy', 'sale-unhappy', 'sale-to-fund', 'sale-to-hand', 'sale-to-tray', 'propose', 'declined', 'talk'].includes(type)) this.reaction = { start: this.time, type };
  }

  setEnhanced(value) { this.enhanced = Boolean(value); }

  setLabels(values = {}) {
    if (!values.bag || values.bag === this.labels.bag) return;
    this.labels.bag = String(values.bag);
    const texture = this.bagLabel?.material.map;
    if (!texture) return;
    const ctx = texture.image.getContext('2d');
    ctx.clearRect(0, 0, 512, 160);
    ctx.fillStyle = '#d5cab1'; ctx.font = '600 52px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.labels.bag, 256, 80);
    texture.needsUpdate = true;
  }

  setRay(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  pick(clientX, clientY) {
    this.setRay(clientX, clientY);
    const hits = this.raycaster.intersectObjects(this.pickMeshes, false);
    for (const hit of hits) {
      const entry = this.objects.get(hit.object.userData.objectId);
      if (!entry || !entry.group.visible) continue;
      const item = entry.item;
      return { id: item.id, kind: item.kind, location: item.location, denomination: item.denomination, slot: CATALOG.findIndex(data => data.key === item.sku) };
    }
    return null;
  }

  setDrag(clientX, clientY) {
    this.setRay(clientX, clientY);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0.6, 1).normalize(), -1.48);
    const point = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, point)) {
      this.dragPoint.copy(point);
      this.dragPoint.x = THREE.MathUtils.clamp(this.dragPoint.x, -1.5, 1.5);
      this.dragPoint.y = THREE.MathUtils.clamp(this.dragPoint.y, 0.85, 1.9);
    }
  }

  dropTarget(clientX, clientY) {
    this.setRay(clientX, clientY);
    const hits = this.raycaster.intersectObjects([this.traySurface, this.bagSurface], false);
    if (hits.length) return hits[0].object.userData.drop;
    const point = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.72), point)) {
      if (Math.abs(point.x) < 1.45 && point.z >= -0.9 && point.z <= 0.58) return 'tray';
      if (Math.abs(point.x) < 1.5 && point.z > 0.58 && point.z < 1.75) return 'bag';
    }
    return null;
  }

  feedbackAnchor() {
    if (!this.customer.visible || !this.customer.userData.head) return null;
    const point = this.customer.userData.head.getWorldPosition(new THREE.Vector3());
    point.y += 0.3;
    point.project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 };
  }

  projectObject(id) {
    const entry = this.objects.get(id);
    if (!entry?.group.visible) return null;
    const point = entry.group.position.clone().project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 };
  }

  projectTarget(target) {
    const vector = target === 'bag' ? new THREE.Vector3(0, 0.5, 1) : new THREE.Vector3(0, 0.73, -0.18);
    vector.project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + (vector.x + 1) * rect.width / 2, y: rect.top + (1 - vector.y) * rect.height / 2 };
  }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    const portrait = width < height;
    if (this.portrait !== portrait) {
      this.portrait = portrait;
      if (this.bag) {
        this.scene.remove(this.bag);
        this.bag.traverse(object => { object.geometry?.dispose(); });
        this.buildBag();
        for (const entry of this.objects.values()) entry.location = null;
      }
    }
    this.camera.fov = portrait ? 61 : 55;
    this.camera.position.set(0, portrait ? 2.9 : 2.48, portrait ? 4.65 : 3.95);
    this.camera.lookAt(0, portrait ? 1.1 : 1.4, -0.35);
    this.carton.scale.x = portrait ? 0.9 : 1;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.scene.traverse(object => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(mat => mat.dispose());
      else object.material?.dispose();
    });
    this.renderer.dispose();
  }
}
