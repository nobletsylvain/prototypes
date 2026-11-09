import * as THREE from './assets/three.module.js';
import { CATALOG } from './model.mjs';

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
    const skinColors = ['#aa7754', '#bb9272', '#916849', '#c39a7d', '#9c735b', '#c2a180'];
    const shirtColors = ['#406b76', '#9d6358', '#7b875f', '#686783', '#ac8b55', '#586d73'];
    const skin = material(skinColors[index % skinColors.length]);
    const cloth = material(shirtColors[index % shirtColors.length]);
    const trousers = material('#263a43');
    cylinder(person, 0.105, 0.69, trousers, -0.12, 0.39, 0, 0.12);
    cylinder(person, 0.105, 0.69, trousers, 0.12, 0.39, 0, 0.12);
    box(person, 0.19, 0.1, 0.31, material('#192729'), -0.12, 0.08, 0.07);
    box(person, 0.19, 0.1, 0.31, material('#192729'), 0.12, 0.08, 0.07);
    const torso = cylinder(person, 0.26, 0.61, cloth, 0, 1.0, 0, 0.32);
    torso.scale.z = 0.6;
    cylinder(person, 0.085, 0.2, skin, 0, 1.38, 0);
    const head = new THREE.Group();
    head.position.set(0, 1.65, 0);
    sphere(head, 0.205, skin, 0, 0, 0, [0.85, 1.1, 0.88]);
    sphere(head, 0.207, material(index % 2 ? '#332c26' : '#292a28'), 0, 0.08, -0.016, [0.85, 0.7, 0.87]);
    sphere(head, 0.038, skin, -0.174, -0.01, 0);
    sphere(head, 0.038, skin, 0.174, -0.01, 0);
    sphere(head, 0.018, material('#1e2826'), -0.064, 0.008, 0.161, [1, 0.65, 0.35]);
    sphere(head, 0.018, material('#1e2826'), 0.064, 0.008, 0.161, [1, 0.65, 0.35]);
    sphere(head, 0.03, skin, 0, -0.029, 0.178, [0.7, 1, 1]);
    line(head, [[-0.048, -0.09, 0.161], [0, -0.1, 0.172], [0.048, -0.09, 0.161]], '#654836');
    person.add(head);
    const arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.3, 1.22, 0);
      cylinder(arm, 0.075, 0.44, cloth, 0, -0.18, 0, 0.105);
      sphere(arm, 0.075, skin, 0, -0.44, 0.025, [0.8, 1.3, 0.7]);
      arm.rotation.z = side * 0.13;
      arms.push(arm);
      person.add(arm);
    }
    person.userData = { head, arms, torso, index };
    return person;
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

  createObject(item) {
    const group = new THREE.Group();
    group.userData.id = item.id;
    let paper = null;
    if (item.kind === 'bill') {
      const geometry = new THREE.PlaneGeometry(0.19, 0.4, 4, 12);
      paper = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: this.billTextures[item.denomination], side: THREE.DoubleSide, roughness: 0.84, metalness: 0 }));
      paper.castShadow = true;
      group.add(paper);
    } else if (item.kind === 'product') {
      const data = CATALOG.find(entry => entry.key === item.sku);
      const foil = material('#d5e7e6', { transparent: true, opacity: 0.29, roughness: 0.2, metalness: 0.18, depthWrite: false });
      box(group, 0.22, 0.035, 0.25, foil, 0, 0.023, 0);
      box(group, 0.22, 0.009, 0.018, material('#b7cbca', { roughness: 0.4 }), 0, 0.046, -0.108);
      if (item.sku.startsWith('hash')) {
        const bar = box(group, 0.135, 0.04, item.grams === 8 ? 0.15 : 0.09, material(data.color), 0, 0.027, 0.025);
        bar.rotation.y = -0.07;
        line(group, [[-0.06, 0.049, 0.015], [0.06, 0.049, 0.006]], '#745435', 0.6);
      } else {
        for (let index = 0; index < 7; index++) {
          const angle = index * 2.4;
          const radius = index ? 0.042 : 0;
          sphere(group, 0.035, material(index % 2 ? data.color : '#597449'), Math.cos(angle) * radius, 0.045, Math.sin(angle) * radius + 0.02, [0.75, 1, 0.8]);
        }
      }
      const tag = label(group, `${item.grams} g`, 0.11, 0.042, 0, 0.058, -0.07, { background: '#e9e4cf', color: '#284447', size: 94, weight: 800 });
      tag.rotation.x = -Math.PI / 2;
      line(group, [[-0.106, 0.045, -0.09], [-0.096, 0.045, 0.115], [0.103, 0.045, 0.115]], '#edf1dc', 0.7);
    } else {
      box(group, 0.27, 0.16, 0.21, material('#ad9064'));
      box(group, 0.045, 0.165, 0.215, material('#dac398'));
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(item.kind === 'bill' ? 0.14 : 0.12, 24), new THREE.MeshBasicMaterial({ color: '#251d14', transparent: true, opacity: 0.2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    this.scene.add(shadow);
    group.traverse(child => { if (child.isMesh) child.userData.objectId = item.id; });
    this.scene.add(group);
    const entry = { group, paper, shadow, location: null, age: 0, start: new THREE.Vector3(), target: new THREE.Vector3(), targetRotation: new THREE.Euler(), contactPending: false, item };
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
      position.set((item.location === 'change' ? 0.49 : -0.88) + (index % 3) * 0.24, 0.745 + Math.floor(index / 3) * 0.006, item.location === 'change' ? -0.23 : 0.23);
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
      this.customer.position.x = 0.55;
      this.customer.rotation.y = -0.3;
    }
    this.pickMeshes.length = 0;
    const ids = new Set();
    for (const item of state.objects) {
      ids.add(item.id);
      const entry = this.objects.get(item.id) || this.createObject(item);
      entry.item = item;
      const hidden = item.location.startsWith('customer:') || item.location.startsWith('client:') || item.location === 'demo-home';
      const next = this.targetFor(item, state);
      const changed = entry.location !== item.location;
      if (changed) {
        const initial = entry.location === null;
        entry.handingOver = hidden && !initial && ['tray', 'change'].includes(entry.location);
        entry.start.copy(initial ? next.position : entry.group.position);
        entry.age = initial ? 1 : 0;
        entry.location = item.location;
        entry.contactPending = !initial && ['tray', 'change', 'receipt'].includes(item.location);
        if (initial) { entry.group.position.copy(next.position); entry.group.rotation.copy(next.rotation); }
      }
      const slotItems = item.location.startsWith('slot:') ? state.objects.filter(other => other.location === item.location) : [];
      const buried = slotItems.length > 2 && slotItems.findIndex(other => other.id === item.id) < slotItems.length - 2;
      entry.group.visible = (!hidden || (entry.handingOver && entry.age < 0.22)) && !buried;
      entry.group.scale.setScalar(this.portrait && ['fund', 'drag', 'hand'].includes(item.location) && item.kind === 'bill' ? 1.28 : this.portrait && item.location.startsWith('slot:') ? 1.25 : 1);
      entry.age += dt;
      entry.target.copy(next.position);
      entry.targetRotation.copy(next.rotation);
      if (item.location === 'drag') {
        entry.group.position.lerp(next.position, 1 - Math.exp(-24 * dt));
      } else {
        const t = Math.min(1, entry.age / (this.enhanced ? 0.2 : 0.12));
        const ease = 1 - Math.pow(1 - t, 3);
        entry.group.position.lerpVectors(entry.start, next.position, ease);
        if (this.enhanced && t < 1 && !hidden) entry.group.position.y += Math.sin(t * Math.PI) * 0.16;
        if (entry.contactPending && t === 1) {
          entry.contactPending = false;
          this.onContact?.({ type: item.kind === 'bill' ? 'paper-contact' : 'product-contact', id: item.id });
          if (this.enhanced) this.contactEffect(next.position);
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
        const motion = item.location === 'drag' || entry.age < 0.5;
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
      if (!hidden && !buried) entry.group.traverse(child => { if (child.isMesh) this.pickMeshes.push(child); });
    }
    for (const [id, entry] of this.objects) if (!ids.has(id)) { entry.group.visible = false; entry.shadow.visible = false; }
    this.animateCustomer(state, view, dt);
    for (let index = 0; index < this.waiting.length; index++) {
      const person = this.waiting[index];
      person.visible = index < view.queueCount;
      person.userData.head.rotation.z = Math.sin(this.time * 0.7 + index) * 0.025;
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
    person.visible = Boolean(view.current);
    const departing = state.phase === 'departing';
    const targetX = departing ? 2.1 : 0;
    person.position.x = damp(person.position.x, targetX, dt, departing ? 2.2 : 5);
    person.rotation.y = damp(person.rotation.y, departing ? 0.7 : 0, dt, 5);
    const head = person.userData.head;
    const hesitate = state.phase === 'hesitation';
    head.rotation.z = damp(head.rotation.z, hesitate ? -0.14 : Math.sin(this.time * 0.9) * 0.02, dt);
    head.rotation.x = damp(head.rotation.x, hesitate ? 0.04 : 0, dt);
    person.userData.torso.scale.y = 1 + Math.sin(this.time * 1.6) * 0.008;
    if (this.reaction) {
      const age = this.time - this.reaction.start;
      if (age < 0.85) {
        head.rotation.x += Math.sin(age * 11) * 0.15 * (1 - age / 0.85);
        person.userData.arms[1].rotation.x = -0.6 * Math.sin(Math.min(1, age / 0.85) * Math.PI);
      } else { this.reaction = null; person.userData.arms[1].rotation.x = 0; }
    }
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
    if (['sale-to-hand', 'sale-to-tray', 'propose', 'declined', 'talk'].includes(type)) this.reaction = { start: this.time, type };
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
