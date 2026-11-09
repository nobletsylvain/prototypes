import * as THREE from './vendor/three.module.js';
import { PARENTS } from './model.mjs';
import { sceneLabels as LABELS } from './strings.mjs';
import { createHeadGeometry } from './head-geometry.mjs';

export function createScene(container, { onAction = () => {} } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c4c5b3');
  scene.fog = new THREE.Fog('#c4c5b3', 8, 17);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'workshop-canvas';
  renderer.domElement.setAttribute('aria-label', '3D botanical worktable');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.04, 50);
  const targetPosition = new THREE.Vector3();
  const targetLook = new THREE.Vector3();
  const actualLook = new THREE.Vector3(0, 1, 0);
  const desiredPosition = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clock = new THREE.Clock();
  const pickables = [];
  const textures = [];
  const disposables = [];
  const parentCards = [];
  const cuttingGroups = [];
  const parentHitAreas = [];
  const leafMaterial = material('#648052', { roughness: 0.8 });
  const budDarkMaterial = material('#50603d', { roughness: 0.95 });
  const brass = material('#a58b46', { metalness: 0.7, roughness: 0.3 });
  const darkMetal = material('#354540', { metalness: 0.5, roughness: 0.5 });
  const terracotta = material('#ad7050', { roughness: 0.92 });
  const cream = material('#eee5d0', { roughness: 0.8 });
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#293627', transparent: true, opacity: 0.1, depthWrite: false });
  let state = { phase: 'compose', parentIds: [], result: null, strains: PARENTS, researchMode: false, researchTarget: null, researchChoices: {}, researchPoints: 0, hotspotLabels: {}, activeHotspot: '', enhanced: true, reducedMotion: false, lang: 'fr' };
  let focusName = 'table';
  let zoomOffset = 0;
  let yaw = 0;
  let pitch = 0;
  let frame = 0;
  let alive = true;
  let drag = null;
  let pulseStarted = -10;
  let lastPhase = 'compose';
  let growingStarted = 0;
  let specimenKey = '';
  let specimenData = null;
  let pulseType = 'contact';
  let lastLanguage = 'fr';
  let lastResearchMode = false;
  let displayedStrains = [...PARENTS];
  let viewportLayout = { width: 1, height: 1, freeWidth: 1, hotspotTop: 32, hotspotBottom: 1 };
  let visualProfile = { duration: 0.6, color: '#e7ead0', strength: 0.35, particles: 0, priority: 0 };
  let revealCharge = 0;
  let displayedCharge = 0;
  const projectedPoint = new THREE.Vector3();
  const hotspotLayer = document.createElement('div');
  hotspotLayer.className = 'research-hotspots';
  hotspotLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:4;overflow:hidden';
  const washLayer = document.createElement('div');
  washLayer.className = 'research-wash';
  washLayer.setAttribute('aria-hidden', 'true');
  washLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;opacity:0';
  container.append(washLayer, hotspotLayer);
  const hotspotDefinitions = [
    { id: 'slot-0', slotIndex: 0, position: [0.07, 0.48, 0.075], side: 1 },
    { id: 'slot-1', slotIndex: 1, position: [-0.1, 0.4, 0.07], side: -1 },
    { id: 'slot-2', slotIndex: 2, position: [0.115, 0.29, 0.07], side: 1 },
    { id: 'slot-3', slotIndex: 3, position: [-0.11, 0.2, 0.065], side: -1 },
    { id: 'slot-4', slotIndex: 4, position: [0.07, 0.09, 0.075], side: 1 },
    { id: 'origin', slotIndex: null, position: [-0.045, 0.025, 0.07], side: -1 }
  ];
  const hotspots = hotspotDefinitions.map(definition => {
    const anchor = document.createElement('span');
    anchor.setAttribute('aria-hidden', 'true');
    anchor.style.cssText = 'position:absolute;width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px #fff3;transform:translate(-50%,-50%)';
    const leader = document.createElement('span');
    leader.setAttribute('aria-hidden', 'true');
    leader.style.cssText = 'position:absolute;height:1px;transform-origin:0 50%;background:#ffffffb8';
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'research-hotspot'; button.dataset.hotspot = definition.id;
    button.style.cssText = 'position:absolute;box-sizing:border-box;width:44px;height:44px;min-width:44px;min-height:44px;padding:0;border:1px solid #fff;border-radius:50%;background:#25382aca;color:#fff;box-shadow:0 2px 12px #16291940;pointer-events:auto;cursor:pointer;font:600 18px system-ui;display:grid;place-items:center;touch-action:manipulation';
    const icon = document.createElement('span'); icon.setAttribute('aria-hidden', 'true'); button.append(icon);
    const number = document.createElement('span'); number.setAttribute('aria-hidden', 'true');
    number.style.cssText = 'position:absolute;right:-4px;bottom:-3px;width:17px;height:17px;display:grid;place-items:center;border-radius:50%;border:1px solid #fff;background:#f3f4e7;color:#314b37;font:700 10px system-ui';
    number.textContent = definition.slotIndex === null ? '' : String(definition.slotIndex + 1);
    number.hidden = definition.slotIndex === null;
    if (definition.slotIndex === null) number.style.display = 'none';
    button.append(number);
    const label = document.createElement('span'); label.className = 'research-hotspot-label';
    label.style.cssText = 'position:absolute;top:50%;transform:translateY(-50%);font:500 11px system-ui;letter-spacing:.025em;color:#fff;white-space:nowrap;text-shadow:0 1px 4px #17281e;padding:4px 6px;background:#27372dc9;border-radius:4px;pointer-events:none';
    if (definition.side < 0) label.style.right = '51px'; else label.style.left = '51px';
    button.append(label);
    button.addEventListener('click', event => { event.stopPropagation(); onAction('hotspot', definition.id); });
    button.addEventListener('focus', () => { button.style.outline = '3px solid #a8c7aa'; button.style.outlineOffset = '4px'; });
    button.addEventListener('blur', () => { button.style.outline = 'none'; });
    hotspotLayer.append(anchor, leader, button);
    return { ...definition, enabled: true, local: new THREE.Vector3(...definition.position), anchor, leader, button, icon, number, label };
  });

  function material(color, options = {}) {
    const value = new THREE.MeshStandardMaterial({ color, ...options });
    disposables.push(value);
    return value;
  }
  function mesh(geometry, mat, parent, position = [0, 0, 0], rotation = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    object.rotation.set(...rotation);
    object.castShadow = true;
    object.receiveShadow = true;
    (parent || scene).add(object);
    disposables.push(geometry);
    return object;
  }
  function box(w, h, d, mat, position, parent = scene, rotation) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, parent, position, rotation);
  }
  function cylinder(rt, rb, h, mat, position, parent = scene, segments = 36) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, segments), mat, parent, position);
  }
  function sphere(radius, mat, position, parent = scene, scale) {
    const object = mesh(new THREE.SphereGeometry(radius, 12, 8), mat, parent, position);
    if (scale) object.scale.set(...scale);
    return object;
  }
  function lineBetween(a, b, radius, mat, parent = scene) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const object = cylinder(radius, radius, start.distanceTo(end), mat, [0, 0, 0], parent, 8);
    object.position.copy(start).add(end).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return object;
  }
  function makeTexture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.push(texture);
    return texture;
  }
  function seedNoise(x) {
    const value = Math.sin(x * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }
  const woodTexture = makeTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#92714b'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      ctx.strokeStyle = `rgba(62,38,17,${0.035 + seedNoise(y) * 0.09})`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const py = y + Math.sin(x * 0.009 + y * 0.17) * (2 + seedNoise(y + 1) * 5);
        if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(41,30,19,.25)'; ctx.lineWidth = 2;
    for (let y = 128; y < h; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = 'rgba(242,221,173,.08)'; ctx.beginPath();
      ctx.ellipse(seedNoise(i + 4) * w, seedNoise(i + 21) * h, 30 + i * 2, 3, 0, 0, Math.PI * 2); ctx.stroke();
    }
  });
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(1.2, 1.1);
  const wood = material('#ffffff', { map: woodTexture, roughness: 0.8 });
  const wall = material('#b6b9a3', { roughness: 1 });
  const floor = material('#8a8979', { roughness: 1 });
  box(14, 0.16, 12, floor, [0, -0.08, 0]);
  box(14, 6, 0.16, wall, [0, 2.8, -3.0]);
  box(0.18, 6, 12, material('#d3cbb6'), [-4.3, 2.8, 0]);
  box(14, 0.16, 0.07, material('#707d68'), [0, 1.06, -2.87]);
  box(5.9, 0.19, 3.5, wood, [0, 0.86, 0]);
  box(5.7, 0.16, 0.1, material('#6e5338'), [0, 0.73, 1.69]);
  [[-2.55, -1.2], [2.55, -1.2], [-2.55, 1.25], [2.55, 1.25]].forEach(([x, z]) => box(0.16, 0.74, 0.16, wood, [x, 0.37, z]));

  const ambient = new THREE.HemisphereLight('#f0ead0', '#556248', 2.25);
  scene.add(ambient);
  const sunlight = new THREE.DirectionalLight('#ffe3ab', 3.4);
  sunlight.position.set(-3, 5, 3);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  sunlight.shadow.camera.left = -4;
  sunlight.shadow.camera.right = 4;
  sunlight.shadow.camera.top = 4;
  sunlight.shadow.camera.bottom = -4;
  sunlight.shadow.normalBias = 0.035;
  sunlight.shadow.bias = -0.0003;
  scene.add(sunlight);
  const fill = new THREE.DirectionalLight('#c4d4c0', 1.0);
  fill.position.set(4, 2, -2); scene.add(fill);

  // An illuminated window and broad slats establish a grounded room at eye level.
  box(0.05, 2.9, 2.35, material('#62715f'), [-4.16, 2.8, -0.5]);
  box(0.06, 2.58, 2.06, material('#e6ead6', { emissive: '#e6ead6', emissiveIntensity: 0.5 }), [-4.1, 2.8, -0.5]);
  box(0.1, 2.62, 0.08, cream, [-4.04, 2.8, -0.5]);
  box(0.1, 0.08, 2.1, cream, [-4.04, 2.8, -0.5]);
  for (let i = 0; i < 8; i++) box(0.13, 0.04, 2.25, material('#ddd5bb'), [-3.98, 1.75 + i * 0.28, -0.5]);

  box(2.8, 0.12, 0.48, wood, [1.5, 2.15, -2.62]);
  box(2.8, 0.12, 0.48, wood, [1.5, 3.1, -2.62]);
  const glass = material('#b0c0b0', { transparent: true, opacity: 0.26, roughness: 0.15, metalness: 0.08, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 7; i++) {
    const x = 0.4 + (i % 4) * 0.62;
    const y = i < 4 ? 2.42 : 3.36;
    cylinder(0.16, 0.16, 0.44, glass, [x, y, -2.62]);
    cylinder(0.17, 0.17, 0.04, brass, [x, y + 0.23, -2.62]);
    const preserved = sphere(0.12, i % 2 ? budDarkMaterial : leafMaterial, [x, y - 0.03, -2.62], scene, [0.7, 1.4, 0.7]);
    preserved.rotation.z = i * 0.8;
  }

  const botanicalPrint = makeTexture(512, 640, (ctx, w, h) => {
    ctx.fillStyle = '#d9d2b9'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#57624b'; ctx.font = '24px Georgia'; ctx.fillText('HERBARIUM', 56, 72);
    ctx.strokeStyle = '#657551'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(260, 545); ctx.bezierCurveTo(230, 440, 290, 270, 240, 140); ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const y = 170 + i * 31, sign = i % 2 ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(253, y + 40); ctx.bezierCurveTo(253 + sign * 125, y + 35, 253 + sign * 130, y - 22, 253, y + 40); ctx.stroke();
    }
    ctx.font = '16px Georgia'; ctx.fillText('PL. 07 — BOTANICA', 65, 590);
  });
  box(1.04, 1.3, 0.05, wood, [-1.5, 2.47, -2.86]);
  mesh(new THREE.PlaneGeometry(0.94, 1.2), new THREE.MeshBasicMaterial({ map: botanicalPrint }), scene, [-1.5, 2.47, -2.82]);

  // A brass and enamel work light casts a warm pool without a second shadow map.
  cylinder(0.27, 0.31, 0.045, darkMetal, [2.2, 0.98, -0.9]);
  lineBetween([2.2, 1.0, -0.9], [2.2, 1.85, -0.9], 0.035, brass);
  lineBetween([2.2, 1.85, -0.9], [1.7, 2.2, -0.8], 0.035, brass);
  const lampshade = cylinder(0.11, 0.31, 0.3, darkMetal, [1.7, 2.15, -0.8]);
  lampshade.rotation.z = -0.18;
  cylinder(0.27, 0.27, 0.008, material('#ffdc92', { emissive: '#ffcf7d', emissiveIntensity: 1.5 }), [1.68, 1.99, -0.8]);
  const lampLight = new THREE.PointLight('#ffd690', 4.0, 4.5, 2);
  lampLight.position.set(1.7, 1.9, -0.8); scene.add(lampLight);

  const matTexture = makeTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#4b6657'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#94a59155'; ctx.lineWidth = 1;
    for (let n = 0; n < w; n += 32) { ctx.beginPath(); ctx.moveTo(n, 0); ctx.lineTo(n, h); ctx.moveTo(0, n); ctx.lineTo(w, n); ctx.stroke(); }
    ctx.strokeStyle = '#c0c6a9'; ctx.lineWidth = 3; ctx.strokeRect(12, 12, w - 24, h - 24);
  });
  box(2.45, 0.018, 2.08, material('#ffffff', { map: matTexture, roughness: 1 }), [-1.42, 0.966, -0.02]);

  function botanicalDrawing(ctx, cx, cy, size, variation, ink) {
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.72); ctx.bezierCurveTo(cx - 12, cy + size * 0.25, cx + 12, cy, cx, cy - size * 0.65); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const y = cy + size * 0.4 - i * size * 0.145;
      const sign = i % 2 ? 1 : -1;
      const width = size * (0.3 + Math.sin(i + variation) * 0.08);
      ctx.beginPath(); ctx.moveTo(cx, y + 15); ctx.bezierCurveTo(cx + width * sign, y + 4, cx + width * sign, y - 18, cx, y + 15); ctx.stroke();
    }
    for (let i = 0; i < 13; i++) {
      ctx.beginPath(); ctx.ellipse(cx + Math.sin(i * 2.4) * size * 0.12, cy - size * 0.55 + Math.cos(i * 2.4) * size * 0.2, size * 0.045, size * 0.07, i, 0, Math.PI * 2); ctx.stroke();
    }
  }
  function cardTexture(index, lang = 'fr', strain = displayedStrains[index] || PARENTS[index]) {
    return makeTexture(512, 680, (ctx, w, h) => {
      ctx.fillStyle = '#ebe6d4'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#59705b'; ctx.lineWidth = 2; ctx.strokeRect(25, 25, w - 50, h - 50);
      ctx.fillStyle = '#4a6150'; ctx.font = '19px monospace'; ctx.fillText(`0${index + 1} / HERBARIUM`, 48, 70);
      const name = typeof strain?.name === 'string' ? strain.name : strain?.name?.[lang] || strain?.id || '—';
      ctx.font = `${name.length > 20 ? 23 : 34}px Georgia`; ctx.fillText(name.toLocaleUpperCase(lang), 48, 125, w - 96);
      botanicalDrawing(ctx, w / 2, 330, 225, index, '#5c7056');
      ctx.strokeStyle = '#89957d'; ctx.lineWidth = 1;
      [545, 575, 605].forEach(y => { ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(w - 48, y); ctx.stroke(); });
      ctx.fillStyle = strain?.color || strain?.result?.color || '#88965b'; ctx.beginPath(); ctx.arc(w - 72, 80, 14, 0, Math.PI * 2); ctx.fill();
    });
  }
  const cardGeometry = new THREE.BoxGeometry(0.53, 0.009, 0.72);
  const cardFaceGeometry = new THREE.PlaneGeometry(0.53, 0.72);
  disposables.push(cardGeometry, cardFaceGeometry);
  for (let i = 0; i < 3; i++) {
    const group = new THREE.Group(); group.position.set(-2.21 + i * 0.65, 0.99, -0.55); group.rotation.y = (i - 1) * -0.07;
    scene.add(group);
    const card = new THREE.Mesh(cardGeometry, cream); card.castShadow = true; card.receiveShadow = true; group.add(card);
    const faceMat = new THREE.MeshStandardMaterial({ map: cardTexture(i), roughness: 0.95 }); disposables.push(faceMat);
    const face = new THREE.Mesh(cardFaceGeometry, faceMat); face.rotation.x = -Math.PI / 2; face.position.y = 0.006; group.add(face);
    card.userData.action = ['parent', PARENTS[i].id]; pickables.push(card);
    parentCards.push({ group, card, face, strainId: PARENTS[i].id, start: group.position.clone(), target: group.position.clone() });
    const dish = new THREE.Group(); dish.position.set(-2.21 + i * 0.65, 0.99, 0.29); scene.add(dish);
    cylinder(0.22, 0.18, 0.032, cream, [0, 0, 0], dish);
    const cutting = new THREE.Group(); dish.add(cutting);
    lineBetween([-0.1, 0.035, 0.13], [0.06, 0.045, -0.13], 0.008, leafMaterial, cutting);
    for (let j = 0; j < 4; j++) {
      const leaf = sphere(0.06, leafMaterial, [Math.sin(j * 2.5) * 0.08, 0.05, 0.09 - j * 0.05], cutting, [0.58, 0.15, 1.6]);
      leaf.rotation.y = j * 0.8;
    }
    const hit = cylinder(0.24, 0.24, 0.12, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), [0, 0.06, 0], dish);
    hit.userData.action = ['parent', PARENTS[i].id]; pickables.push(hit); parentHitAreas.push(hit);
    cuttingGroups.push(cutting);
  }
  const affinityTexture = makeTexture(640, 320, (ctx, w, h) => {
    ctx.fillStyle = '#d4d9bf'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#72866a'; ctx.lineWidth = 3;
    [[160, 135], [480, 135]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 60, 0, Math.PI * 2); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(220, 135); ctx.lineTo(420, 135); ctx.moveTo(320, 135); ctx.lineTo(320, 245); ctx.stroke();
    ctx.beginPath(); ctx.arc(320, 245, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#72866a'; ctx.font = '24px Georgia'; ctx.fillText('A', 150, 145); ctx.fillText('B', 470, 145); ctx.fillText('?', 313, 253);
  });
  mesh(new THREE.PlaneGeometry(1.35, 0.64), material('#ffffff', { map: affinityTexture, roughness: 1 }), scene, [-1.45, 0.986, 0.88], [-Math.PI / 2, 0, 0]);

  const pot = new THREE.Group(); pot.position.set(0.95, 1.0, -0.56); scene.add(pot);
  cylinder(0.25, 0.18, 0.31, terracotta, [0, 0.135, 0], pot);
  cylinder(0.27, 0.27, 0.045, terracotta, [0, 0.285, 0], pot);
  cylinder(0.233, 0.233, 0.012, material('#413d2a'), [0, 0.307, 0], pot);
  cylinder(0.31, 0.29, 0.035, terracotta, [0, -0.025, 0], pot);
  const seedling = new THREE.Group(); seedling.position.y = 0.31; pot.add(seedling);
  lineBetween([0, 0, 0], [0.01, 0.62, 0], 0.009, leafMaterial, seedling);
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.4;
    const height = 0.12 + i * 0.052;
    const leaf = sphere(0.095, leafMaterial, [Math.cos(angle) * 0.1, height, Math.sin(angle) * 0.1], seedling, [0.75, 0.18, 1.65]);
    leaf.rotation.y = -angle; leaf.rotation.z = 0.3;
    lineBetween([0, height - 0.04, 0], [Math.cos(angle) * 0.1, height, Math.sin(angle) * 0.1], 0.004, leafMaterial, seedling);
  }
  const potHit = cylinder(0.37, 0.37, 1.0, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), [0, 0.4, 0], pot);
  potHit.userData.action = ['pot']; pickables.push(potHit);

  const board = box(1.35, 0.045, 1.2, wood, [0.0, 1.0, 0.7]);
  board.rotation.y = -0.08;
  const bowl = cylinder(0.41, 0.35, 0.05, cream, [-0.15, 1.045, 0.65]);
  const bowlInner = cylinder(0.365, 0.365, 0.009, material('#d7ceb3'), [-0.15, 1.075, 0.65]);
  const specimenAccent = material('#b6c384', { roughness: 0.7, transparent: true, opacity: 0.5 });
  const specimenRim = mesh(new THREE.TorusGeometry(0.37, 0.008, 6, 48), specimenAccent, scene, [-0.15, 1.08, 0.65], [Math.PI / 2, 0, 0]);
  const specimenFill = new THREE.PointLight('#e4ce91', 0.13, 1.1, 2);
  specimenFill.position.set(-0.15, 1.65, 1.03); scene.add(specimenFill);
  const specimenRoot = new THREE.Group(); specimenRoot.position.set(-0.15, 1.1, 0.65); scene.add(specimenRoot);
  const specimenRotation = new THREE.Group(); specimenRoot.add(specimenRotation);
  const headMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .87, metalness: 0, flatShading: true });
  const headMesh = new THREE.Mesh(new THREE.BufferGeometry(), headMaterial);
  headMesh.scale.setScalar(.53); headMesh.castShadow = true; headMesh.receiveShadow = true;
  specimenRotation.add(headMesh);
  const specimenHit = cylinder(0.38, 0.38, 0.7, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), [-0.15, 1.4, 0.65]);
  specimenHit.userData.action = ['specimen']; pickables.push(specimenHit);

  const magnifier = new THREE.Group(); magnifier.position.set(0.05, 1.48, 1.12); magnifier.rotation.x = -0.22; scene.add(magnifier);
  const lensRim = mesh(new THREE.TorusGeometry(0.335, 0.02, 10, 56), brass, magnifier);
  const lensGlass = mesh(new THREE.CircleGeometry(0.315, 48), material('#d4e1cf', { transparent: true, opacity: 0.065, roughness: 0.1, metalness: 0.05, side: THREE.DoubleSide, depthWrite: false }), magnifier, [0, 0, 0.001]);
  lineBetween([0.23, -0.23, 0], [0.53, -0.53, 0], 0.035, darkMetal, magnifier);
  cylinder(0.16, 0.19, 0.035, darkMetal, [0.55, 1.05, 1.12]);
  lensRim.userData.action = ['specimen']; lensGlass.userData.action = ['specimen']; pickables.push(lensRim, lensGlass);

  const notebook = new THREE.Group(); notebook.position.set(1.65, 1.0, 0.75); notebook.rotation.y = -0.17; scene.add(notebook);
  box(0.95, 0.065, 1.13, darkMetal, [0, 0, 0], notebook);
  box(0.91, 0.045, 1.09, cream, [0.005, 0.04, -0.005], notebook);
  const notebookMat = material('#fff7e4');
  const notebookFace = mesh(new THREE.PlaneGeometry(0.89, 1.06), notebookMat, notebook, [0.005, 0.066, -0.005], [-Math.PI / 2, 0, 0]);
  notebookFace.userData.action = ['cards']; pickables.push(notebookFace);
  lineBetween([2.19, 1.03, 0.43], [2.12, 1.03, 1.07], 0.018, brass);
  const notebookTextures = {};
  function updateNotebook() {
    const key = `${state.lang}-${['revealed', 'kept'].includes(state.phase) ? 'known' : 'unknown'}`;
    if (!notebookTextures[key]) notebookTextures[key] = makeTexture(512, 640, (ctx, w, h) => {
      const labels = LABELS[state.lang] || LABELS.fr;
      ctx.fillStyle = '#e9e2c9'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#46594b'; ctx.font = '23px Georgia'; ctx.fillText(labels.record, 44, 72);
      ctx.font = '15px monospace'; ctx.fillText('R&D / 001', 44, 104);
      if (key.endsWith('-known')) {
        botanicalDrawing(ctx, 252, 270, 150, 4, '#647858');
        ctx.fillStyle = '#536550'; ctx.font = '20px Georgia'; ctx.fillText(labels.kept, 44, 468);
      } else {
        ctx.strokeStyle = '#8b947c'; ctx.lineWidth = 1; ctx.strokeRect(45, 160, 422, 258);
        ctx.font = '18px monospace'; ctx.fillText(labels.unknown, 112, 290);
      }
      ctx.strokeStyle = '#a3aa94'; [510, 550, 590].forEach(y => { ctx.beginPath(); ctx.moveTo(44, y); ctx.lineTo(w - 44, y); ctx.stroke(); });
    });
    notebookMat.map = notebookTextures[key]; notebookMat.needsUpdate = true;
  }

  const ring = mesh(new THREE.RingGeometry(0.36, 0.375, 56), new THREE.MeshBasicMaterial({ color: '#d1df9c', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), scene, [-0.15, 1.085, 0.65], [-Math.PI / 2, 0, 0]);
  ring.castShadow = ring.receiveShadow = false;
  const revealHalo = mesh(new THREE.RingGeometry(0.34, 0.348, 72), new THREE.MeshBasicMaterial({ color: '#f0dfaa', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), scene, [-0.15, 1.39, 0.54]);
  revealHalo.castShadow = revealHalo.receiveShadow = false;
  const burstOrigin = new THREE.Vector3(-0.15, 1.31, 0.65);
  const burstPositions = new Float32Array(96 * 3);
  const burstGeometry = new THREE.BufferGeometry(); burstGeometry.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3)); disposables.push(burstGeometry);
  const sparkTexture = makeTexture(32, 32, (ctx) => {
    const glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
    glow.addColorStop(0, '#ffffff'); glow.addColorStop(0.25, '#ffffffe6'); glow.addColorStop(1, '#ffffff00');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 32, 32);
  });
  const burstMaterial = new THREE.PointsMaterial({ color: '#f0dfaa', size: 0.045, map: sparkTexture, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const burst = new THREE.Points(burstGeometry, burstMaterial); burst.frustumCulled = false; scene.add(burst);
  const chargeRingMaterial = new THREE.MeshBasicMaterial({ color: '#f2f2dd', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const chargeRing = mesh(new THREE.RingGeometry(0.37, 0.385, 120, 1, Math.PI / 2, Math.PI * 2), chargeRingMaterial, scene, [-0.15, 1.39, 0.58]);
  chargeRing.castShadow = chargeRing.receiveShadow = false;
  const chargeGuide = mesh(new THREE.RingGeometry(0.37, 0.373, 120), new THREE.MeshBasicMaterial({ color: '#f2f2dd', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), scene, [-0.15, 1.39, 0.58]);
  chargeGuide.castShadow = chargeGuide.receiveShadow = false;
  const chargePositions = new Float32Array(28 * 3);
  const chargeGeometry = new THREE.BufferGeometry(); chargeGeometry.setAttribute('position', new THREE.BufferAttribute(chargePositions, 3)); disposables.push(chargeGeometry);
  const chargeMaterial = new THREE.PointsMaterial({ color: '#f2f2dd', size: 0.032, map: sparkTexture, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const chargeSparks = new THREE.Points(chargeGeometry, chargeMaterial); chargeSparks.frustumCulled = false; scene.add(chargeSparks);
  const chargeLight = new THREE.PointLight('#eef0dd', 0, 1.65, 2);
  chargeLight.position.set(-0.15, 1.55, 1.02); scene.add(chargeLight);
  const motePositions = new Float32Array(32 * 3);
  for (let i = 0; i < 32; i++) { motePositions[i * 3] = seedNoise(i) * 6 - 3; motePositions[i * 3 + 1] = 1.1 + seedNoise(i + 8) * 2; motePositions[i * 3 + 2] = seedNoise(i + 45) * 3 - 1.5; }
  const moteGeometry = new THREE.BufferGeometry(); moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3)); disposables.push(moteGeometry);
  const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: '#f3e2b2', size: 0.012, transparent: true, opacity: 0.4, depthWrite: false })); scene.add(motes);

  function updateSpecimen(visual) {
    const key = JSON.stringify(visual || null);
    if (key === specimenKey && specimenData) return;
    specimenKey = key;
    const data = createHeadGeometry(visual); specimenData = data;
    const positions = [], normals = [], colors = [];
    const shade = new THREE.Color();
    for (let face = 0; face < data.groups.length; face++) {
      shade.set(data.colors[face]);
      for (let corner = 0; corner < 3; corner++) {
        const index = data.triangles[face * 3 + corner] * 3;
        positions.push(...data.positions.slice(index, index + 3));
        normals.push(...data.normals.slice(face * 3, face * 3 + 3));
        colors.push(shade.r, shade.g, shade.b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
    headMesh.geometry.dispose(); headMesh.geometry = geometry;
    specimenAccent.color.set(data.phenotype.color);
    const headHeight = data.bounds.max[1] * .53;
    let headRadius = .30;
    for (let vertex = 0; vertex < data.positions.length; vertex += 3)
      headRadius = Math.max(headRadius, Math.hypot(data.positions[vertex], data.positions[vertex + 2]) * .53);
    specimenHit.scale.set((headRadius + .055) / .38, (headHeight + .10) / .7, (headRadius + .055) / .38);
    specimenHit.position.y = 1.1 + headHeight / 2;
    // Anchors follow actual transformed surface vertices, including inherited proportions.
    hotspots.forEach((hotspot, index) => {
      const reference = hotspotDefinitions[index].position;
      const expectedY = reference[1] / .55 * data.bounds.max[1];
      const expectedX = Math.sign(reference[0]) * (data.bounds.max[0] - data.bounds.min[0]) * .25;
      let nearest = 0, best = Infinity;
      for (let vertex = 0; vertex < data.positions.length; vertex += 3) {
        const x = data.positions[vertex], y = data.positions[vertex + 1], z = data.positions[vertex + 2];
        const distance = (x - expectedX) ** 2 + (y - expectedY) ** 2 * 2 + (z - data.bounds.max[2]) ** 2;
        if (distance < best) { best = distance; nearest = vertex; }
      }
      hotspot.local.set(data.positions[nearest] * .53, data.positions[nearest + 1] * .53, data.positions[nearest + 2] * .53);
    });
  }

  function setState(next = {}) {
    state = { ...state, ...next };
    if (state.phase !== 'inspected' || state.researchMode) setRevealCharge(0);
    if (!LABELS[state.lang]) state.lang = 'fr';
    const discovered = !!state.researchMode || ['ready', 'inspected', 'revealed', 'kept'].includes(state.phase);
    specimenRoot.visible = discovered;
    specimenRim.visible = discovered;
    specimenFill.visible = discovered;
    specimenHit.visible = discovered;
    magnifier.visible = discovered && !state.researchMode;
    bowl.visible = bowlInner.visible = true;
    seedling.visible = state.phase === 'growing';
    motes.visible = !!state.enhanced && !state.reducedMotion;
    const availableStrains = state.strains?.length ? state.strains : PARENTS;
    const selectedIds = (state.parentIds || []).map(id => typeof id === 'number' ? PARENTS[id]?.id : id).filter(Boolean);
    const selectedStrains = selectedIds.map(id => availableStrains.find(strain => strain.id === id)).filter(Boolean);
    displayedStrains = [...selectedStrains, ...availableStrains.filter(strain => !selectedIds.includes(strain.id))].slice(0, 3);
    parentCards.forEach((entry, index) => {
      const strain = displayedStrains[index];
      entry.group.visible = !!strain;
      if (!strain) { parentHitAreas[index].visible = false; return; }
      const isSelected = selectedIds.includes(strain.id);
      entry.target.copy(entry.start); entry.target.y += isSelected ? 0.018 : 0;
      if (lastLanguage !== state.lang || entry.strainId !== strain.id) {
        entry.face.material.map = cardTexture(index, state.lang, strain);
        entry.face.material.needsUpdate = true;
      }
      entry.strainId = strain.id;
      entry.card.userData.action = ['parent', strain.id];
      parentHitAreas[index].userData.action = ['parent', strain.id];
      parentHitAreas[index].visible = true;
    });
    cuttingGroups.forEach((cutting, index) => {
      const parentId = displayedStrains[index]?.id;
      const available = state.inventoryCounts?.[parentId];
      const hasStock = !!parentId && (available === undefined || available > 0);
      const consumedForActiveTrial = selectedIds.includes(parentId) && ['growing', 'ready', 'inspected', 'revealed', 'kept'].includes(state.phase);
      cutting.visible = hasStock && !consumedForActiveTrial;
    });
    const visibleSpecimen = state.researchMode ? state.researchTarget?.result || state.researchTarget : state.result;
    if (discovered) updateSpecimen(visibleSpecimen?.visual);
    if (state.phase === 'growing' && lastPhase !== 'growing') growingStarted = clock.getElapsedTime();
    if (state.phase !== lastPhase) pulse(state.phase === 'kept' ? 'sign' : state.phase === 'growing' ? 'start' : state.phase === 'ready' ? 'ready' : 'contact');
    if (state.researchMode && !lastResearchMode) focus('specimen');
    if (!state.researchMode && lastResearchMode) focus('table');
    updateHotspotState();
    lastPhase = state.phase;
    lastLanguage = state.lang;
    lastResearchMode = !!state.researchMode;
    updateNotebook();
    resize();
  }
  function focus(target) {
    if (state.researchMode) target = 'specimen';
    focusName = ['table', 'parents', 'pot', 'specimen'].includes(target) ? target : 'table';
    zoomOffset = 0; yaw = 0; pitch = 0;
  }
  function rotate(deltaX = 0, deltaY = 0) {
    if (focusName === 'specimen' && specimenRoot.visible) {
      specimenRotation.rotation.y += deltaX * 0.009;
      specimenRotation.rotation.x = THREE.MathUtils.clamp(specimenRotation.rotation.x + deltaY * 0.005, -0.55, 0.55);
    } else {
      yaw = THREE.MathUtils.clamp(yaw + deltaX * 0.0018, -0.42, 0.42);
      pitch = THREE.MathUtils.clamp(pitch + deltaY * 0.0011, -0.17, 0.18);
    }
  }
  function zoom(delta = 0) { zoomOffset = THREE.MathUtils.clamp(zoomOffset + delta * 0.0015, -0.35, 0.7); }
  function pulse(kind = 'contact') {
    if (kind === 'reveal' || kind.startsWith('reveal-')) setRevealCharge(0);
    const profiles = {
      'reveal': { duration: 1.25, color: '#dae5be', strength: 0.7, particles: 32, priority: 3 },
      'reveal-common': { duration: 1.25, color: '#dae5be', strength: 0.7, particles: 32, priority: 3 },
      'reveal-rare': { duration: 2.0, color: '#c39af4', strength: 1, particles: 68, priority: 4 },
      'reveal-exceptional': { duration: 2.4, color: '#f6d17c', strength: 1.25, particles: 96, priority: 5 },
      'point': { duration: 0.9, color: '#d9e8c5', strength: 0.65, particles: 20, priority: 1 },
      'upgrade': { duration: 1.3, color: '#f2e6be', strength: 0.85, particles: 38, priority: 2 },
      'start': { duration: 0.8, color: '#c7d4a3', strength: 0.55, particles: 12, priority: 1 },
      'ready': { duration: 1.2, color: '#dae8b9', strength: 0.7, particles: 22, priority: 1 },
      'harvest': { duration: 0.85, color: '#c7d4a3', strength: 0.65, particles: 25, priority: 1 },
      'sign': { duration: 1.1, color: '#eee0b2', strength: 0.65, particles: 16, priority: 1 },
      'select': { duration: 0.5, color: '#ffffff', strength: 0.3, particles: 0, priority: 0 },
      'charge-step': { duration: 0.28, color: '#f2f2dd', strength: 0.24, particles: 0, priority: 1 },
      'paper': { duration: 0.55, color: '#e0e4cb', strength: 0.3, particles: 0, priority: 0 },
      'refuse': { duration: 0.4, color: '#ddd2bc', strength: 0.15, particles: 0, priority: 0 }
    };
    const next = profiles[kind] || { duration: 0.6, color: '#e7ead0', strength: 0.35, particles: 0, priority: 0 };
    const now = clock.getElapsedTime();
    if (next.priority < visualProfile.priority && now - pulseStarted < visualProfile.duration * 0.7) return;
    pulseStarted = now; pulseType = kind; visualProfile = next;
    ring.material.color.set(next.color); revealHalo.material.color.set(next.color); burstMaterial.color.set(next.color);
    burstOrigin.set(kind === 'start' ? 0.95 : -0.15, kind === 'start' ? 1.35 : 1.31, kind === 'start' ? -0.56 : 0.65);
    washLayer.style.background = `radial-gradient(ellipse at 48% 48%, ${next.color}66 0%, ${next.color}18 42%, transparent 73%)`;
  }

  function setRevealCharge(progress = 0) {
    const next = Number.isFinite(progress) ? THREE.MathUtils.clamp(progress, 0, 1) : 0;
    revealCharge = state.phase === 'inspected' && !state.researchMode ? next : 0;
    if (revealCharge === 0) {
      displayedCharge = 0;
      chargeRingMaterial.opacity = 0;
      chargeGuide.material.opacity = 0;
      chargeSparks.visible = false;
      chargeLight.intensity = 0;
    }
  }

  function updateRevealCharge(delta) {
    const eligible = state.phase === 'inspected' && !state.researchMode && specimenRoot.visible;
    const target = eligible ? revealCharge : 0;
    displayedCharge = state.reducedMotion ? target : THREE.MathUtils.lerp(displayedCharge, target, 1 - Math.exp(-delta * 20));
    const progress = displayedCharge;
    const visible = progress > 0.001;
    chargeRing.visible = chargeGuide.visible = visible;
    chargeSparks.visible = visible && state.enhanced && !state.reducedMotion;
    if (!visible) { chargeLight.intensity = 0; return; }
    const strength = state.enhanced ? 1 : 0.32;
    chargeRing.geometry.setDrawRange(0, Math.max(6, Math.round(progress * 120) * 6));
    chargeRingMaterial.opacity = (0.3 + progress * 0.48) * strength;
    chargeGuide.material.opacity = 0.11 * strength;
    const scale = state.reducedMotion ? 1 : 1.16 - progress * 0.16;
    chargeRing.scale.setScalar(scale); chargeGuide.scale.setScalar(scale);
    chargeLight.intensity = (0.08 + progress * progress * 0.65) * strength * (state.reducedMotion ? 0.45 : 1);
    chargeMaterial.opacity = 0.2 + progress * 0.42;
    if (chargeSparks.visible) {
      for (let i = 0; i < 28; i++) {
        const angle = i * 2.39996 + progress * (2.4 + seedNoise(i + 15) * 2.5);
        const radius = (0.42 + seedNoise(i + 4) * 0.17) * (1 - progress * 0.58);
        chargePositions[i * 3] = -0.15 + Math.cos(angle) * radius;
        chargePositions[i * 3 + 1] = 1.39 + Math.sin(angle) * radius * 0.83;
        chargePositions[i * 3 + 2] = 0.65 + Math.sin(angle * 1.3 + i) * radius * 0.3;
      }
      chargeGeometry.attributes.position.needsUpdate = true;
    }
  }

  function updateHotspotState() {
    hotspotLayer.hidden = !state.researchMode;
    const choices = state.researchChoices?.[state.researchTarget?.id] || state.researchChoices || {};
    const capacity = state.researchTarget?.slotCapacity === 5 ? 5 : 3;
    hotspots.forEach(hotspot => {
      const informational = hotspot.id === 'origin';
      hotspot.enabled = informational || hotspot.slotIndex < capacity;
      hotspot.button.disabled = !hotspot.enabled;
      hotspot.button.tabIndex = hotspot.enabled ? 0 : -1;
      hotspot.button.setAttribute('aria-hidden', String(!hotspot.enabled));
      if (!hotspot.enabled) [hotspot.anchor, hotspot.leader, hotspot.button].forEach(element => { element.hidden = true; element.style.visibility = 'hidden'; });
      const chosen = !!choices[hotspot.id];
      const locked = !informational && !chosen && !(state.researchPoints > 0);
      const active = state.activeHotspot === hotspot.id;
      const label = state.hotspotLabels?.[hotspot.id] || hotspot.id;
      const status = LABELS[state.lang][informational ? 'information' : chosen ? 'chosen' : locked ? 'locked' : 'available'];
      hotspot.label.textContent = label;
      if (locked) hotspot.icon.innerHTML = '<svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden="true"><rect x="3" y="8" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 8V5a3 3 0 0 1 6 0v3" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="12" r="1" fill="currentColor"/></svg>';
      else hotspot.icon.textContent = informational ? 'i' : chosen ? '✓' : '•';
      hotspot.button.setAttribute('aria-label', `${label} — ${status}`);
      hotspot.button.setAttribute('aria-pressed', String(active));
      hotspot.button.dataset.status = informational ? 'information' : chosen ? 'chosen' : locked ? 'locked' : 'available';
      hotspot.button.style.background = active ? '#ffffff' : '#25382ad9';
      hotspot.button.style.color = active ? '#263b2e' : '#ffffff';
      hotspot.button.style.boxShadow = active ? '0 0 0 5px #ffffff2b,0 2px 16px #16291950' : '0 2px 12px #16291940';
    });
  }

  function updateHotspotPositions() {
    if (!state.researchMode) return;
    const { width, height, freeWidth, hotspotTop, hotspotBottom } = viewportLayout;
    const capacity = state.researchTarget?.slotCapacity === 5 ? 5 : 3;
    const rows = capacity === 5 ? 3 : 2;
    scene.updateMatrixWorld(); camera.updateMatrixWorld();
    projectedPoint.set(-0.15, 1.38, 0.65).project(camera);
    const centerX = (projectedPoint.x * 0.5 + 0.5) * width;
    const centerY = (-projectedPoint.y * 0.5 + 0.5) * height;
    const laneDistance = THREE.MathUtils.clamp(freeWidth * 0.24, 73, 126);
    const rowGap = Math.min(width <= 700 ? 68 : 90, Math.max(50, (hotspotBottom - hotspotTop) / Math.max(1, rows - 1)));
    const span = (rows - 1) * rowGap;
    const startY = THREE.MathUtils.clamp(centerY - span / 2, Math.min(hotspotTop, hotspotBottom - span), hotspotBottom - span);
    hotspots.forEach(hotspot => {
      if (!hotspot.enabled) return;
      projectedPoint.copy(hotspot.local); specimenRotation.localToWorld(projectedPoint); projectedPoint.project(camera);
      const x = (projectedPoint.x * 0.5 + 0.5) * width, y = (-projectedPoint.y * 0.5 + 0.5) * height;
      const visible = projectedPoint.z > -1 && projectedPoint.z < 1 && x > 0 && x < freeWidth && y > 0 && y < height;
      [hotspot.anchor, hotspot.leader, hotspot.button].forEach(element => { element.hidden = !visible; element.style.visibility = visible ? 'visible' : 'hidden'; });
      if (!visible) return;
      const row = hotspot.id === 'origin' ? rows - 1 : Math.floor(hotspot.slotIndex / 2);
      const bx = THREE.MathUtils.clamp(centerX + hotspot.side * laneDistance, 28, freeWidth - 28);
      const by = startY + row * rowGap;
      const dx = bx - x, dy = by - y;
      hotspot.anchor.style.left = `${x}px`; hotspot.anchor.style.top = `${y}px`;
      hotspot.leader.style.left = `${x}px`; hotspot.leader.style.top = `${y}px`;
      hotspot.leader.style.width = `${Math.hypot(dx, dy)}px`; hotspot.leader.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      hotspot.button.style.left = `${bx - 22}px`; hotspot.button.style.top = `${by - 22}px`;
      const labelWidth = Math.max(82, hotspot.label.textContent.length * 7 + 14);
      const labelFits = hotspot.side < 0 ? bx - 51 - labelWidth > 12 : bx + 51 + labelWidth < freeWidth - 12;
      hotspot.label.style.display = freeWidth >= 620 && labelFits ? 'block' : 'none';
    });
  }

  function updateCamera(delta) {
    const mobile = viewportLayout.width <= 700;
    if (focusName === 'specimen') {
      desiredPosition.set(-0.06, 1.85, mobile ? 2.8 : 2.7);
      targetLook.set(-0.12, 1.39, 0.65);
    } else if (focusName === 'pot') {
      desiredPosition.set(1.01, 2.08, mobile ? 2.25 : 2.1);
      targetLook.set(0.95, 1.35, -0.45);
    } else if (focusName === 'parents') {
      desiredPosition.set(-1.25, 2.65, mobile ? 2.9 : 2.6);
      targetLook.set(-1.45, 0.98, 0.03);
    } else {
      desiredPosition.set(mobile ? 0.1 : 0.55, mobile ? 2.55 : 2.55, mobile ? 4.35 : 4.45);
      targetLook.set(mobile ? -0.4 : 0.05, 1.14, -0.22);
    }
    desiredPosition.z += zoomOffset;
    targetLook.x -= yaw * 3;
    targetLook.y += pitch * 3;
    const amount = state.reducedMotion ? 1 : 1 - Math.exp(-delta * 6.5);
    camera.position.lerp(desiredPosition, amount);
    actualLook.lerp(targetLook, amount);
    camera.lookAt(actualLook);
  }
  function resize() {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    let freeWidth = width;
    let hotspotTop = 32, hotspotBottom = height - 32;
    const bounds = container.getBoundingClientRect();
    const panel = container.parentElement?.querySelector('#panel');
    if (width > 700 && panel) {
      const panelBounds = panel.getBoundingClientRect();
      if (panelBounds.width > 0 && panelBounds.left > bounds.left && panelBounds.top < bounds.bottom && panelBounds.bottom > bounds.top) {
        freeWidth = THREE.MathUtils.clamp(panelBounds.left - bounds.left - 16, Math.min(260, width), width);
      }
    }
    const heading = container.parentElement?.querySelector('.scene-heading');
    if (heading) {
      const headingBounds = heading.getBoundingClientRect();
      if (headingBounds.height > 0 && headingBounds.bottom > bounds.top && headingBounds.top < bounds.bottom) hotspotTop = Math.max(32, headingBounds.bottom - bounds.top + 28);
    }
    container.parentElement?.querySelectorAll('.view-tools,.sound-control').forEach(control => {
      const controlBounds = control.getBoundingClientRect();
      if (controlBounds.width > 0 && controlBounds.left < bounds.left + freeWidth && controlBounds.bottom > bounds.top && controlBounds.top < bounds.bottom) hotspotBottom = Math.min(hotspotBottom, controlBounds.top - bounds.top - 28);
    });
    hotspotBottom = Math.max(160, hotspotBottom);
    hotspotTop = Math.min(hotspotTop, hotspotBottom - 100);
    viewportLayout = { width, height, freeWidth, hotspotTop, hotspotBottom };
    hotspotLayer.style.width = `${freeWidth}px`;
    hotspotLayer.style.right = 'auto';
    camera.aspect = width / height;
    camera.fov = width <= 700 ? 47 : 43;
    if (freeWidth < width) camera.setViewOffset(width, height, (width - freeWidth) / 2, 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize); observer.observe(container);
  const panelElement = container.parentElement?.querySelector('#panel');
  if (panelElement) observer.observe(panelElement);
  resize();
  camera.position.set(0.55, 2.55, 4.45); actualLook.set(0.05, 1.14, -0.22);
  function animate() {
    if (!alive) return;
    frame = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    const now = clock.elapsedTime;
    updateCamera(delta);
    const amount = state.reducedMotion ? 1 : 1 - Math.exp(-delta * 8);
    parentCards.forEach(entry => entry.group.position.lerp(entry.target, amount));
    if (state.phase === 'growing') {
      const growth = THREE.MathUtils.clamp((now - growingStarted) / 7, 0, 1);
      seedling.scale.setScalar(0.25 + growth * 0.75);
      if (!state.reducedMotion) seedling.rotation.z = Math.sin(now * 0.7) * 0.015;
    }
    const elapsed = now - pulseStarted;
    const progress = THREE.MathUtils.clamp(elapsed / visualProfile.duration, 0, 1);
    const envelope = Math.sin(progress * Math.PI) ** 1.5;
    const activePulse = elapsed >= 0 && elapsed < visualProfile.duration;
    const intensity = visualProfile.strength * (state.enhanced ? 1 : 0.23);
    ring.material.opacity = activePulse ? envelope * intensity * (state.reducedMotion ? 0.22 : 0.6) : 0;
    ring.scale.setScalar(state.reducedMotion ? 1 : 1 + progress * (state.enhanced ? 1.4 : 0.3));
    revealHalo.material.opacity = activePulse && state.enhanced && !state.reducedMotion && visualProfile.priority >= 2 ? envelope * 0.28 : 0;
    revealHalo.scale.setScalar(1 + progress * 1.4);
    washLayer.style.opacity = String(activePulse && state.enhanced ? envelope * (state.reducedMotion ? 0.12 : 0.35) * Math.min(1, intensity) : 0);
    burst.visible = activePulse && state.enhanced && !state.reducedMotion && visualProfile.particles > 0;
    if (burst.visible) {
      const count = visualProfile.particles;
      burstGeometry.setDrawRange(0, count);
      burstMaterial.opacity = Math.sin(Math.min(1, progress * 1.4) * Math.PI * 0.5) * (1 - progress) * 0.88;
      burstMaterial.size = visualProfile.priority >= 4 ? 0.052 : 0.035;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.39996;
        const speed = 0.08 + seedNoise(i + 57) * (visualProfile.priority >= 4 ? 0.4 : 0.22);
        const radius = 0.08 + elapsed * speed;
        burstPositions[i * 3] = burstOrigin.x + Math.cos(angle) * radius;
        burstPositions[i * 3 + 1] = burstOrigin.y + seedNoise(i + 4) * 0.25 + elapsed * (0.25 + seedNoise(i + 92) * 0.35) - elapsed * elapsed * 0.08;
        burstPositions[i * 3 + 2] = burstOrigin.z + Math.sin(angle) * radius * 0.7;
      }
      burstGeometry.attributes.position.needsUpdate = true;
    }
    if (activePulse && state.enhanced && !state.reducedMotion && specimenRoot.visible) specimenRoot.position.y = 1.1 + envelope * 0.018;
    else specimenRoot.position.y = 1.1;
    if (motes.visible) motes.rotation.y = Math.sin(now * 0.035) * 0.15;
    updateRevealCharge(delta);
    updateHotspotPositions();
    renderer.render(scene, camera);
  }
  function pointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, originX: event.clientX, originY: event.clientY, moved: false, id: event.pointerId };
    renderer.domElement.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) > 7) drag.moved = true;
    if (drag.moved) rotate(dx, dy);
    drag.x = event.clientX; drag.y = event.clientY;
  }
  function pointerUp(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables.filter(object => {
        let ancestor = object;
        while (ancestor) { if (!ancestor.visible) return false; ancestor = ancestor.parent; }
        return true;
      }), false)[0];
      if (hit?.object.userData.action) onAction(...hit.object.userData.action);
    }
    drag = null;
  }
  function pointerCancel() { drag = null; }
  function wheel(event) { event.preventDefault(); zoom(event.deltaY); }
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', pointerCancel);
  renderer.domElement.addEventListener('wheel', wheel, { passive: false });
  setState(); animate();
  return {
    setState, focus, rotate, zoom, pulse, setRevealCharge,
    dispose() {
      setRevealCharge(0);
      alive = false; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerCancel);
      renderer.domElement.removeEventListener('wheel', wheel);
      textures.forEach(texture => texture.dispose());
      const disposed = new Set();
      scene.traverse(object => {
        if (object.geometry && !disposed.has(object.geometry)) { object.geometry.dispose(); disposed.add(object.geometry); }
        const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
        materials.forEach(mat => { if (!disposed.has(mat)) { mat.dispose(); disposed.add(mat); } });
      });
      renderer.dispose(); renderer.domElement.remove(); hotspotLayer.remove(); washLayer.remove();
    }
  };
}
