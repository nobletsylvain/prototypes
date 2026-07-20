/* La Loupe — atelier 3D (geste atelier-3d : coupe maintien + emballage).
   Présentation only pour Math.random (textures / physique de chute). */
import * as THREE from "three";

const LOAF_L = 1.7, LOAF_W = 0.55, LOAF_H = 0.34;
const PER_LEN = 100;
const SWIPE_NAV = 60; // px — swipe ▸ en mode cut = aller au conditionnement
const PRESS_TIME = 0.6;
const PILE_CAP = 18;
const WRAP_K = 0.34;
const CAM_Y = 3.7, CAM_Z = 2.55, LOOK_Y = 0.85;

let hooks = null;
let root = null;
let renderer, scene, camera;
let coupeRig, cakeMesh, bladeMesh, coupeStockPile, condGroup, condInPile, condOutPile;
let benchCut, benchCond;
let rightNeg = 0, rightPos = 0, over = false, bladeChop = 0;
let slices = [];
let loafMats, matCrust, plasticMat, twistGeoBig, slabGeo;
let mode = "hidden"; // cut | cond | buy | hidden
let buyGroup = null, buyMesh = null;

let holding = false, pressing = false, pressT = 0, cutConsumed = false;
let pid = null, startX = 0, startY = 0, lastX = 0, lastY = 0, moved = false;

const wrap = { active: false, phase: "", pct: 0, mesh: null, film: null, twists: null };
let pressbarEl, pressfillEl, presslblEl, wrapbarEl, wrapfillEl, wraptextEl, sealEl, hintEl;

function haptic(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {} }

function grainTex(r, g, b, contrast, spots) {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d"); const cl = (v) => Math.max(0, Math.min(255, v));
  const img = x.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * contrast;
    img.data[i] = cl(r + n); img.data[i + 1] = cl(g + n); img.data[i + 2] = cl(b + n); img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  for (let k = 0; k < spots; k++) {
    x.fillStyle = "rgba(0,0,0," + (Math.random() * 0.2) + ")";
    x.fillRect(Math.random() * S, Math.random() * S, Math.random() * 4 + 1, Math.random() * 4 + 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}
function bumpTex() {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d"); const img = x.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 120;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}

function makePrism(aNeg, aPos, bNeg, bPos) {
  const xL = (aNeg + aPos) / 2, xR = (bNeg + bPos) / 2;
  const zN = -LOAF_W / 2, zP = LOAF_W / 2, H = LOAF_H;
  const dx = Math.max(0.0001, xR - xL);
  const bv = Math.min(0.10, dx * 0.45, LOAF_W * 0.18, H * 0.48);
  const A = [xL, 0, zN], B = [xR, 0, zN], C = [xR, 0, zP], D = [xL, 0, zP];
  const Ap = [xL, H - bv, zN], Bp = [xR, H - bv, zN], Cp = [xR, H - bv, zP], Dp = [xL, H - bv, zP];
  const At = [xL + bv, H, zN + bv], Bt = [xR - bv, H, zN + bv], Ct = [xR - bv, H, zP - bv], Dt = [xL + bv, H, zP - bv];
  const pos = [], uv = [], grp = [];
  const quad = (mat, p0, p1, p2, p3) => {
    const s = pos.length / 3;
    pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
    uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    grp.push([s, 6, mat]);
  };
  quad(1, A, B, C, D);
  quad(0, A, Ap, Bp, B); quad(0, C, Cp, Dp, D);
  quad(2, D, Dp, Ap, A); quad(2, B, Bp, Cp, C);
  quad(0, Ap, At, Bt, Bp); quad(0, Bp, Bt, Ct, Cp);
  quad(0, Cp, Ct, Dt, Dp); quad(0, Dp, Dt, At, Ap); quad(0, At, Bt, Ct, Dt);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  for (const [s, c, m] of grp) g.addGroup(s, c, m);
  g.computeVertexNormals();
  return g;
}

function makeBin(w, d, h, color) {
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.08, side: THREE.DoubleSide });
  const th = 0.04;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, th, d), mat); floor.position.y = th / 2; floor.receiveShadow = true; grp.add(floor);
  const wLR = (x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(th, h, d), mat); m.position.set(x, h / 2, 0); m.castShadow = true; grp.add(m); };
  const wFB = (z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, th), mat); m.position.set(0, h / 2, z); m.castShadow = true; grp.add(m); };
  wLR(-w / 2); wLR(w / 2); wFB(-d / 2); wFB(d / 2);
  return grp;
}

function makePile(cols, max, factory) {
  const g = new THREE.Group();
  for (let i = 0; i < max; i++) {
    const m = factory();
    const perLayer = cols * 2, layer = Math.floor(i / perLayer), idx = i % perLayer, col = idx % cols, row = Math.floor(idx / cols);
    m.position.set(-((cols - 1) * 0.17) / 2 + col * 0.17, 0.06 + layer * 0.095, -0.13 + row * 0.26);
    m.rotation.y = (Math.random() - 0.5) * 0.4;
    if (m.isMesh) m.castShadow = true;
    m.visible = false; g.add(m);
  }
  return g;
}
function showPile(g, n) { for (let i = 0; i < g.children.length; i++) g.children[i].visible = i < n; }

function makePapillote() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.075, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x6f5733, roughness: 0.34, metalness: 0.14 }));
  body.castShadow = true; g.add(body);
  const twistGeo = new THREE.ConeGeometry(0.045, 0.06, 6);
  const eL = new THREE.Mesh(twistGeo, plasticMat); eL.rotation.z = Math.PI / 2; eL.position.x = -0.085; g.add(eL);
  const eR = new THREE.Mesh(twistGeo, plasticMat); eR.rotation.z = -Math.PI / 2; eR.position.x = 0.085; g.add(eR);
  return g;
}

function makeBench(color) {
  const grp = new THREE.Group();
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 3.3),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 }));
  bench.position.set(0, 0.45, -0.7); bench.castShadow = true; bench.receiveShadow = true; grp.add(bench);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.12, 3.45),
    new THREE.MeshStandardMaterial({ color: 0xece7f2, roughness: 0.5 }));
  top.position.set(0, 0.96, -0.7); top.castShadow = true; top.receiveShadow = true; grp.add(top);
  return grp;
}

function rebuildLoaf() {
  if (!cakeMesh) return;
  cakeMesh.geometry.dispose();
  cakeMesh.geometry = makePrism(0, 0, rightNeg, rightPos);
  cakeMesh.visible = Math.max(rightNeg, rightPos) > 0.03;
}

function syncLoafFromPain() {
  const g = hooks.getPainG();
  const len = Math.min(LOAF_L, Math.max(0, g / PER_LEN));
  rightNeg = rightPos = len;
  over = g < 1;
  rebuildLoaf();
}

function refreshBins() {
  const bars = Math.min(PILE_CAP, hooks.getBarCount());
  const packs = Math.min(PILE_CAP, hooks.getSachetCount());
  if (coupeStockPile) showPile(coupeStockPile, bars);
  if (condInPile) showPile(condInPile, bars);
  if (condOutPile) showPile(condOutPile, packs);
}

function spawnBarrette(cutNeg, cutPos) {
  const geo = makePrism(cutNeg, cutPos, rightNeg, rightPos);
  geo.computeBoundingBox();
  const c = new THREE.Vector3(); geo.boundingBox.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z); geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, loafMats);
  mesh.castShadow = true; mesh.position.copy(c);
  coupeRig.add(mesh);
  slices.push({
    mesh,
    vx: 0.4 + Math.random() * 0.35, vy: 1.3 + Math.random() * 0.7, vz: 0.25 + Math.random() * 0.3,
    vrx: 1.4 + Math.random() * 1.4, vrz: (Math.random() - 0.5) * 2.2,
    rest: 0.12 + geo.boundingSphere.radius * 0.15, settled: false,
  });
  rightNeg = cutNeg; rightPos = cutPos;
  rebuildLoaf();
  while (slices.length > 24) { const s = slices.shift(); coupeRig.remove(s.mesh); s.mesh.geometry.dispose(); }
}

const BIN_TARGET = new THREE.Vector3(1.1, 0.14, 0.82);

function pressCut() {
  if (over || hooks.getPainG() < 1) return;
  // la taille de la barrette se décide ICI, à la lame (défaut 2 g, libre)
  const take = Math.min(hooks.getPainG(), hooks.getCutSize());
  const thick = take / PER_LEN;
  let cn = rightNeg - thick, cp = rightPos - thick;
  if (cn < 0.001 && cp < 0.001) { cn = 0; cp = 0; }
  cn = Math.max(0, cn); cp = Math.max(0, cp);
  bladeChop = 1;
  spawnBarrette(cn, cp);
  hooks.onCut(take);
  haptic(40);
  if (hooks.getPainG() < 1) {
    over = true;
    hooks.toast("Pain fini. Rachat requis.");
  }
  refreshBins();
}

function updateSlices(dt) {
  const g = 11;
  for (let i = slices.length - 1; i >= 0; i--) {
    const sl = slices[i];
    if (sl.collect) {
      sl.mesh.position.lerp(BIN_TARGET, Math.min(1, dt * 6));
      sl.mesh.rotation.y += dt * 9;
      sl.mesh.scale.multiplyScalar(1 - Math.min(0.85, dt * 3.4));
      if (sl.mesh.scale.x < 0.18) { coupeRig.remove(sl.mesh); sl.mesh.geometry.dispose(); slices.splice(i, 1); }
      continue;
    }
    if (sl.settled) {
      sl.restT = (sl.restT || 0) + dt;
      if (sl.restT > 0.22) sl.collect = true;
      continue;
    }
    sl.vy -= g * dt;
    sl.mesh.position.x += sl.vx * dt;
    sl.mesh.position.y += sl.vy * dt;
    sl.mesh.position.z += sl.vz * dt;
    sl.mesh.rotation.x += sl.vrx * dt;
    sl.mesh.rotation.z += sl.vrz * dt;
    if (sl.mesh.position.y < sl.rest) {
      sl.mesh.position.y = sl.rest;
      sl.vy *= -0.32; sl.vx *= 0.6; sl.vz *= 0.6; sl.vrx *= 0.4; sl.vrz *= 0.4;
      if (Math.abs(sl.vy) < 0.5) { sl.vy = 0; sl.settled = true; }
    }
  }
}

function updateKnife(dt) {
  if (!bladeMesh) return;
  const show = mode === "cut" && !over;
  bladeMesh.visible = show;
  const right = (rightNeg + rightPos) / 2;
  const cutX = Math.max(0, right - hooks.getCutSize() / PER_LEN);
  let y = LOAF_H + 0.10 - (pressing ? (pressT / PRESS_TIME) * 0.5 : 0);
  if (bladeChop > 0) {
    bladeChop = Math.max(0, bladeChop - dt * 4.5);
    y = LOAF_H + 0.10 - Math.sin(Math.min(1, 1 - bladeChop) * Math.PI) * 0.32;
  }
  bladeMesh.position.set(cutX, y, 0);
}

function startWrap() {
  if (wrap.active || !condGroup) return;
  const fmt = hooks.getDoseFormat();
  if (hooks.getBarG() < fmt) { hooks.toast("Pas assez de barrettes."); return; }
  hooks.onTakeBar(fmt);
  refreshBins();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.26), matCrust);
  mesh.castShadow = true; mesh.position.set(0.0, 1.5, 0.55);
  const filmMat = new THREE.MeshStandardMaterial({
    color: 0xdff3ff, transparent: true, opacity: 0.32, roughness: 0.06, metalness: 0.3, side: THREE.DoubleSide,
  });
  const film = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.26), filmMat);
  film.scale.setScalar(1.3); mesh.add(film);
  condGroup.add(mesh);
  wrap.active = true; wrap.phase = "enroule"; wrap.pct = 0; wrap.mesh = mesh; wrap.film = film;
  wraptextEl.textContent = "Glisse ⬆️ pour enrouler";
  wraptextEl.classList.add("show"); wrapbarEl.classList.add("show");
  wrapfillEl.style.width = "0%"; sealEl.classList.remove("show");
}

function enterSeal() {
  wrap.phase = "seal";
  if (wrap.film) {
    wrap.film.material.color.set(0xe6dfca); wrap.film.material.opacity = 0.6;
    wrap.film.material.roughness = 0.14; wrap.film.material.metalness = 0.18;
    wrap.film.scale.set(1.05, 1.1, 1.05);
  }
  if (wrap.mesh && !wrap.twists) {
    const s = 0.25;
    const tL = new THREE.Mesh(twistGeoBig, plasticMat); tL.rotation.z = Math.PI / 2; tL.position.x = -s - 0.03;
    const tR = new THREE.Mesh(twistGeoBig, plasticMat); tR.rotation.z = -Math.PI / 2; tR.position.x = s + 0.03;
    wrap.mesh.add(tL); wrap.mesh.add(tR); wrap.twists = [tL, tR];
  }
  wraptextEl.classList.remove("show"); wrapbarEl.classList.remove("show"); sealEl.classList.add("show");
}

function sealWrap() {
  if (!wrap.active || wrap.phase !== "seal") return;
  haptic(30);
  hooks.onPack(hooks.getDoseFormat());
  cleanupWrap();
  refreshBins();
  hooks.toast("Sachet scellé.");
}

function abortWrap() {
  if (!wrap.active) return;
  const fmt = hooks.getDoseFormat();
  hooks.onReturnBar(fmt);
  cleanupWrap();
  refreshBins();
}

function cleanupWrap() {
  if (wrap.mesh) {
    condGroup.remove(wrap.mesh);
    wrap.mesh.geometry.dispose();
    if (wrap.film) { wrap.film.geometry.dispose(); wrap.film.material.dispose(); }
  }
  wrap.active = false; wrap.phase = ""; wrap.pct = 0; wrap.mesh = null; wrap.film = null; wrap.twists = null;
  wraptextEl.classList.remove("show"); wrapbarEl.classList.remove("show"); sealEl.classList.remove("show");
}

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14101b);
  scene.fog = new THREE.Fog(0x14101b, 8, 22);

  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xcfd6ff, 0x201a2b, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(3, 8, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a2436, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -1); floor.receiveShadow = true;
  scene.add(floor);

  const _bump = bumpTex();
  matCrust = new THREE.MeshStandardMaterial({
    map: grainTex(46, 31, 18, 52, 260), bumpMap: _bump, bumpScale: 0.05, roughness: 0.6, metalness: 0.12, side: THREE.DoubleSide,
  });
  const matPale = new THREE.MeshStandardMaterial({
    map: grainTex(96, 74, 46, 38, 140), bumpMap: _bump, bumpScale: 0.035, roughness: 0.85, side: THREE.DoubleSide,
  });
  const matSponge = new THREE.MeshStandardMaterial({
    map: grainTex(196, 168, 116, 52, 130), bumpMap: _bump, bumpScale: 0.055, roughness: 0.97, side: THREE.DoubleSide,
  });
  loafMats = [matCrust, matPale, matSponge];
  plasticMat = new THREE.MeshStandardMaterial({
    color: 0xded7c2, roughness: 0.16, metalness: 0.18, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  });
  twistGeoBig = new THREE.ConeGeometry(0.09, 0.14, 6);
  slabGeo = new THREE.BoxGeometry(0.13, 0.07, 0.22);

  // Coupe
  benchCut = makeBench(0xc06d6d);
  coupeRig = new THREE.Group();
  coupeRig.position.set(-0.6, 1.02, 0);
  benchCut.add(coupeRig);
  cakeMesh = new THREE.Mesh(makePrism(0, 0, 0.01, 0.01), loafMats);
  cakeMesh.castShadow = true; cakeMesh.receiveShadow = true; coupeRig.add(cakeMesh);
  const steel = new THREE.MeshStandardMaterial({ color: 0xd7dee6, metalness: 0.9, roughness: 0.18 });
  const bladeLen = LOAF_W + 0.22;
  bladeMesh = new THREE.Group();
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, bladeLen), steel); edge.position.y = 0.16;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, bladeLen), steel); spine.position.y = 0.33;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, bladeLen * 0.42),
    new THREE.MeshStandardMaterial({ color: 0x1d1410, roughness: 0.6 })); handle.position.y = 0.42;
  for (const m of [edge, spine, handle]) { m.castShadow = true; bladeMesh.add(m); }
  bladeMesh.visible = false; coupeRig.add(bladeMesh);
  const sbin = makeBin(0.66, 0.62, 0.16, 0x2f2619);
  sbin.position.set(0.85, 1.02, 0.82);
  coupeStockPile = makePile(3, PILE_CAP, () => new THREE.Mesh(slabGeo, matCrust));
  sbin.add(coupeStockPile); benchCut.add(sbin);
  scene.add(benchCut);

  // Cond
  benchCond = makeBench(0xc0a86d);
  condGroup = benchCond;
  const inBin = makeBin(0.66, 0.62, 0.16, 0x2f2619);
  inBin.position.set(-0.62, 1.02, 0.42);
  condInPile = makePile(3, PILE_CAP, () => new THREE.Mesh(slabGeo, matCrust));
  inBin.add(condInPile); benchCond.add(inBin);
  const outBin = makeBin(0.66, 0.62, 0.16, 0x243247);
  outBin.position.set(0.62, 1.02, 0.42);
  condOutPile = makePile(3, PILE_CAP, makePapillote);
  outBin.add(condOutPile); benchCond.add(outBin);
  scene.add(benchCond);

  // Buy preview
  buyGroup = new THREE.Group();
  buyMesh = new THREE.Mesh(makePrism(0, 0, 1.2, 1.2), loafMats);
  buyMesh.position.set(0, 1.2, 0); buyMesh.castShadow = true;
  buyGroup.add(buyMesh);
  const buyBench = makeBench(0x6d8ac0);
  buyGroup.add(buyBench);
  buyMesh.position.set(0, 1.02, 0.1);
  scene.add(buyGroup);
}

function applyCamera() {
  camera.position.set(0, CAM_Y, CAM_Z);
  camera.lookAt(0, LOOK_Y, 0);
}

function setVisibleGroups() {
  if (benchCut) benchCut.visible = mode === "cut";
  if (benchCond) benchCond.visible = mode === "cond";
  if (buyGroup) buyGroup.visible = mode === "buy";
  if (hintEl) {
    if (mode === "cut") hintEl.textContent = "Swipe ▸ conditionnement"; // « Maintiens » est déjà dit par #presslbl
    else if (mode === "cond") hintEl.textContent = "Tap = prendre · glisse ⬆️ = enrouler · 🔥 sceller";
    else if (mode === "buy") hintEl.textContent = "Aperçu matière · achat dans la liste";
    else hintEl.textContent = "";
  }
}

function onPointerDown(e) {
  if (mode !== "cut" && mode !== "cond") return;
  // les contrôles HUD (taille de coupe, appro, sceller) gardent leurs clics :
  // sans ce garde, setPointerCapture recible le click sur #view3d et les boutons sont morts
  if (e.target && e.target.closest && e.target.closest("#fmtBar,#buyOverlay,#seal")) return;
  if (pid !== null) return;
  pid = e.pointerId;
  root.setPointerCapture(pid);
  startX = lastX = e.clientX; startY = lastY = e.clientY;
  moved = false;
  holding = mode === "cut";
  cutConsumed = false;
}

function onPointerMove(e) {
  if (e.pointerId !== pid) return;
  const dxT = e.clientX - startX, dyT = e.clientY - startY;

  if (wrap.active && mode === "cond") {
    if (Math.abs(dxT) > Math.abs(dyT) && Math.abs(dxT) > 40) {
      abortWrap();
      moved = true;
    } else if (wrap.phase === "enroule") {
      const dyStep = e.clientY - lastY;
      wrap.pct = Math.min(100, wrap.pct + Math.abs(dyStep) * WRAP_K);
      if (wrap.mesh) wrap.mesh.rotation.x -= dyStep * 0.03;
      wrapfillEl.style.width = wrap.pct + "%";
      if (wrap.pct >= 100) enterSeal();
      lastX = e.clientX; lastY = e.clientY;
      return;
    } else {
      lastX = e.clientX; lastY = e.clientY;
      return;
    }
  }

  if (Math.abs(dxT) > 6 || Math.abs(dyT) > 6) { moved = true; holding = false; }
  lastX = e.clientX; lastY = e.clientY;
}

function onPointerUp(e) {
  if (e.pointerId !== pid) return;
  try { root.releasePointerCapture(pid); } catch (_) {}
  pid = null;
  if (moved && mode === "cut") {
    // swipe vers la droite = rail atelier → conditionnement
    const dx = lastX - startX, dy = lastY - startY;
    if (dx > SWIPE_NAV && Math.abs(dx) > Math.abs(dy) * 1.2 && hooks.onSwipeRight) {
      holding = false; pressing = false; pressT = 0; cutConsumed = false;
      hooks.onSwipeRight();
      return;
    }
  }
  if (!moved) {
    if (mode === "cut" && over) {
      syncLoafFromPain();
      if (!over) hooks.toast("Pain rechargé sur la planche.");
      else hooks.toast("Plus de pain. Appro d'abord.");
    } else if (mode === "cond" && !wrap.active) {
      startWrap();
    }
  }
  holding = false; pressing = false; pressT = 0; cutConsumed = false;
}

export function mount(container, hud, h) {
  hooks = h;
  root = container;
  pressbarEl = hud.pressbar; pressfillEl = hud.pressfill; presslblEl = hud.presslbl;
  wrapbarEl = hud.wrapbar; wrapfillEl = hud.wrapfill; wraptextEl = hud.wraptext;
  sealEl = hud.seal; hintEl = hud.hint;
  sealEl.onclick = (e) => { e.stopPropagation(); sealWrap(); };

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:0;touch-action:none";
  root.insertBefore(canvas, root.firstChild);

  buildScene();
  applyCamera();
  resize();

  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerUp);
}

export function resize() {
  if (!renderer || !root) return;
  const w = root.clientWidth || 1, h = root.clientHeight || 1;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

export function setMode(m) {
  if (wrap.active && m !== "cond") abortWrap();
  mode = m;
  setVisibleGroups();
  if (m === "cut") syncLoafFromPain();
  if (m === "cut" || m === "cond" || m === "buy") refreshBins();
  if (m === "buy" && buyMesh) {
    const g = Math.max(40, hooks.getPainG() || 100);
    const len = Math.min(LOAF_L, g / PER_LEN);
    buyMesh.geometry.dispose();
    buyMesh.geometry = makePrism(0, 0, len, len);
  }
  resize();
}

export function syncFromState() {
  if (mode === "cut") syncLoafFromPain();
  refreshBins();
}

export function tick(dt) {
  if (mode === "hidden" || !renderer) return;

  if (mode === "buy" && buyMesh) buyMesh.rotation.y += dt * 0.55;

  pressing = holding && pid !== null && !moved && mode === "cut" && !over && !cutConsumed;
  if (pressing) {
    pressT += dt;
    if (pressT >= PRESS_TIME) { pressCut(); pressT = 0; cutConsumed = true; pressing = false; }
  } else if (!holding) pressT = 0;

  const showPress = mode === "cut" && !over;
  presslblEl.classList.toggle("show", showPress);
  pressbarEl.classList.toggle("show", showPress && pressing);
  pressfillEl.style.width = (pressing ? Math.min(100, (pressT / PRESS_TIME) * 100) : 0) + "%";

  if (mode === "cut") {
    updateSlices(dt);
    updateKnife(dt);
  }

  applyCamera();
  renderer.render(scene, camera);
}

export function isActive() { return mode !== "hidden"; }
