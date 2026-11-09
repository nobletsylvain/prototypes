import * as THREE from './assets/three.module.js';

// The workshop is scenery only: it has no clock, inventory or economy state.
export function createScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch (error) {
    console.warn('WebGL unavailable; using the workshop illustration.', error?.message);
    return createFallback(canvas);
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#172227');
  scene.fog = new THREE.FogExp2('#222c30', 0.037);
  const camera = new THREE.PerspectiveCamera(49, 1, 0.1, 35);
  const look = new THREE.Vector3(-0.24, 1.36, -2.0);
  const resources = new Set();
  const material = (color, extra = {}) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: 0.84, ...extra });
    resources.add(value);
    return value;
  };
  const palette = {
    wall: material('#6f7874'), wood: material('#70503c'), edge: material('#493c31'),
    dark: material('#283639'), metal: material('#526061', { metalness: 0.38, roughness: 0.46 }),
    paper: material('#d5c8a7'), cardboard: material('#9c7951'), tape: material('#b8996c'),
    ceramic: material('#b8c1ab'), fabric: material('#59655a'), rubber: material('#172328')
  };
  function mesh(geometry, mat, position, rotation = null) {
    resources.add(geometry);
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    if (rotation) object.rotation.set(...rotation);
    object.castShadow = true;
    object.receiveShadow = true;
    scene.add(object);
    return object;
  }
  const box = (size, pos, mat = palette.dark, rotation) => mesh(new THREE.BoxGeometry(...size), mat, pos, rotation);
  const cylinder = (top, bottom, height, pos, mat, rotation) => mesh(new THREE.CylinderGeometry(top, bottom, height, 24), mat, pos, rotation);
  function canvasTexture(width, height, draw) {
    const surface = document.createElement('canvas'); surface.width = width; surface.height = height;
    draw(surface.getContext('2d'), width, height);
    const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    resources.add(texture); return texture;
  }
  function plaque(text, subtitle, pos, size = [1.15, 0.35], background = '#243538', foreground = '#e6ddbf') {
    const map = canvasTexture(768, 256, (ctx, w, h) => {
      ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#77837b'; ctx.lineWidth = 3; ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.fillStyle = foreground; ctx.textAlign = 'center'; ctx.font = 'bold 63px sans-serif';
      ctx.fillText(text, w / 2, 112); ctx.font = '24px sans-serif'; ctx.fillText(subtitle, w / 2, 177);
    });
    const mat = material('#ffffff', { map });
    return mesh(new THREE.PlaneGeometry(...size), mat, pos);
  }
  const wallMap = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#7c8279'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      const x = (i * 151.73) % w, y = (i * 83.19) % h;
      ctx.fillStyle = i % 3 ? 'rgba(38,49,43,.035)' : 'rgba(232,223,191,.06)';
      ctx.fillRect(x, y, 1 + i % 8, 1 + i % 13);
    }
    ctx.fillStyle = 'rgba(45,58,50,.12)'; ctx.fillRect(0, 440, w, 72);
  });
  wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping; wallMap.repeat.set(3, 2);
  const wallMat = material('#b4b6a6', { map: wallMap });
  box([9, 4.4, 0.12], [0, 2.15, -3.85], wallMat);
  box([0.12, 4.4, 9], [-4.3, 2.15, 0], wallMat);
  box([0.12, 4.4, 9], [4.3, 2.15, 0], palette.dark);
  box([8.6, 0.08, 10], [0, -0.04, 0], material('#444a43'));
  for (let i = -4; i <= 4; i++) box([0.018, 0.004, 10], [i, 0.006, 0], palette.edge);
  for (let i = -4; i <= 4; i++) box([8.5, 0.004, 0.018], [0, 0.008, i], palette.edge);
  box([8.5, 0.2, 0.14], [0, 0.12, -3.72], palette.edge);
  // Cool window light and a quiet skyline keep the room legible around the device.
  box([2.1, 1.9, 0.15], [-2.35, 2.45, -3.69], palette.rubber);
  const skyMap = canvasTexture(512, 512, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#102b3f'); gradient.addColorStop(1, '#668f9e');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#243d49';
    for (let i = 0; i < 9; i++) {
      const x = i * 64 - 20, y = 200 + (i * 73) % 150;
      ctx.fillRect(x, y, 59, h - y);
      ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 30, y - 28); ctx.lineTo(x + 64, y); ctx.fill();
      for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) {
        ctx.fillStyle = (i + j + k) % 4 === 0 ? '#bda173' : '#345361';
        ctx.fillRect(x + 10 + j * 15, y + 20 + k * 40, 7, 13);
      }
      ctx.fillStyle = '#243d49';
    }
    ctx.fillStyle = 'rgba(228,237,212,.8)'; ctx.beginPath(); ctx.arc(380, 85, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(167,208,215,.14)'; ctx.lineWidth = 1;
    for (let i = 0; i < 45; i++) { const x = (i * 37) % w; const y = (i * 91) % h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 30); ctx.stroke(); }
  });
  const sky = new THREE.MeshBasicMaterial({ map: skyMap }); resources.add(sky);
  mesh(new THREE.PlaneGeometry(1.88, 1.68), sky, [-2.35, 2.45, -3.6]);
  box([0.055, 1.75, 0.09], [-2.35, 2.45, -3.52], palette.dark);
  box([1.9, 0.055, 0.09], [-2.35, 2.45, -3.51], palette.dark);
  box([2.3, 0.09, 0.42], [-2.35, 1.48, -3.45], palette.paper);
  box([0.2, 2.15, 0.19], [-3.49, 2.36, -3.43], palette.fabric);
  box([0.32, 2.15, 0.19], [-1.13, 2.36, -3.43], palette.fabric);
  // A wide bench and visible edge establish the player's standing eye height.
  box([5.8, 0.13, 1.6], [0.1, 0.88, -1.45], palette.wood);
  box([5.9, 0.09, 0.06], [0.1, 0.84, -0.63], palette.edge);
  for (const x of [-2.55, 2.75]) {
    box([0.12, 0.82, 0.12], [x, 0.42, -0.85], palette.metal);
    box([0.12, 0.82, 0.12], [x, 0.42, -2.03], palette.metal);
    box([0.09, 0.08, 1.3], [x, 0.26, -1.45], palette.metal);
  }
  box([5.2, 0.07, 0.08], [0.1, 0.26, -2.02], palette.metal);
  box([1.12, 0.015, 0.65], [-0.85, 0.955, -1.1], material('#334844'), [0, -0.09, 0]);
  for (let i = 0; i < 8; i++) box([0.001, 0.001, 0.57], [-1.32 + i * 0.13, 0.964, -1.1], material('#51625b'), [0, -0.09, 0]);
  // Simple supply cartons; labels are scenery, never interactive purchase targets.
  function carton(x, y, z, size, angle = 0) {
    const body = box(size, [x, y + size[1] / 2, z], palette.cardboard, [0, angle, 0]);
    const tape = box([size[0] * 0.13, 0.004, size[2] + 0.005], [x, y + size[1] + 0.003, z], palette.tape, [0, angle, 0]);
    const slip = box([size[0] * 0.45, size[1] * 0.33, 0.004], [x, y + size[1] * 0.58, z + size[2] / 2 + 0.004], palette.paper);
    return [body, tape, slip];
  }
  carton(1.85, 0.95, -1.7, [0.76, 0.5, 0.6]);
  carton(2.0, 1.45, -1.72, [0.58, 0.39, 0.5]);
  carton(2.55, 0.95, -1.03, [0.43, 0.3, 0.5]);
  carton(-2.7, 0.02, -1.2, [0.72, 0.59, 0.7]);
  box([1.6, 0.1, 0.4], [1.84, 2.65, -3.45], palette.wood);
  box([0.05, 0.45, 0.3], [1.22, 2.42, -3.52], palette.metal);
  box([0.05, 0.45, 0.3], [2.47, 2.42, -3.52], palette.metal);
  for (let i = 0; i < 5; i++) {
    const x = 1.23 + i * 0.3;
    cylinder(0.105, 0.1, 0.28, [x, 2.84, -3.39], material(i % 2 ? '#9da68b' : '#b9b396', { metalness: 0.12 }));
    cylinder(0.11, 0.11, 0.03, [x, 3.0, -3.39], palette.dark);
  }
  for (const [x,z] of [[-2.0,-1.65],[-1.68,-1.75],[-2.2,-1.3]]) {
    cylinder(0.13, 0.125, 0.29, [x, 1.095, z], palette.ceramic);
    cylinder(0.135, 0.135, 0.04, [x, 1.26, z], palette.dark);
  }
  // A task lamp throws a warm pool on the desk; the screen itself stays neutral.
  cylinder(0.21, 0.23, 0.045, [-1.15, 0.98, -2.03], palette.dark);
  box([0.045, 0.75, 0.045], [-1.2, 1.35, -2.03], palette.metal, [0, 0, 0.2]);
  box([0.04, 0.48, 0.04], [-1.12, 1.86, -2.03], palette.metal, [0, 0, -0.6]);
  cylinder(0.12, 0.27, 0.22, [-0.99, 2.03, -2.03], material('#8e7650'), [0, 0, -0.18]);
  cylinder(0.19, 0.19, 0.006, [-0.97, 1.923, -2.03], material('#ffe1a2', { emissive: '#ffd78c', emissiveIntensity: 2 }), [0, 0, -0.18]);
  const deskLight = new THREE.SpotLight('#ffd095', 21, 8, 0.72, 0.72, 1.6);
  deskLight.position.set(-0.97, 1.91, -2.02); deskLight.target.position.set(-0.75, 0.85, -1.2);
  deskLight.castShadow = true; deskLight.shadow.mapSize.set(1024,1024); deskLight.shadow.bias = -0.001;
  scene.add(deskLight, deskLight.target);
  const windowLight = new THREE.PointLight('#8dc1e3', 8.2, 11, 1.6); windowLight.position.set(-2.3, 2.45, -2.8); scene.add(windowLight);
  scene.add(new THREE.HemisphereLight('#b1ccdb', '#57442e', 1.45));
  const rim = new THREE.DirectionalLight('#ffe4bb', 1.15); rim.position.set(3,4,3); scene.add(rim);
  // Pinboard, physical clock, arrival slot and paper scraps provide recognisable scale.
  box([1.18, 0.83, 0.065], [0.27, 2.42, -3.63], palette.edge);
  box([1.08, 0.73, 0.02], [0.27, 2.42, -3.58], material('#8d7a54'));
  for (let i=0;i<3;i++) {
    const paper = box([0.26,0.33,0.005], [-0.06 + i * 0.32, 2.41 + (i%2) * 0.06, -3.56], palette.paper, [0,0,(i-1)*0.08]);
    const pin = cylinder(0.016,0.016,0.02,[paper.position.x, paper.position.y+0.13,-3.54],material('#a75035'),[Math.PI/2,0,0]);
  }
  plaque('ARRIVAGES', 'COMMANDES & FOURNITURES', [2.0, 2.2, -3.51], [1.4, 0.44]);
  box([1.35, 0.78, 0.15], [2.0, 1.55, -3.5], palette.metal);
  box([1.1, 0.065, 0.025], [2.0, 1.7, -3.4], palette.rubber);
  box([1.03, 0.08, 0.27], [2.0, 1.61, -3.31], palette.edge);
  const clockMap = canvasTexture(256, 256, (ctx,w,h)=>{
    ctx.fillStyle='#d4d4bc';ctx.beginPath();ctx.arc(w/2,h/2,123,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#263b3d';ctx.lineWidth=6;
    for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(128+97*Math.sin(a),128-97*Math.cos(a));ctx.lineTo(128+110*Math.sin(a),128-110*Math.cos(a));ctx.stroke();}
    for(const [a,r,line] of [[(21+8/60)*Math.PI/6,58,9],[8*Math.PI/30,84,5]]){ctx.lineWidth=line;ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(128+r*Math.sin(a),128-r*Math.cos(a));ctx.stroke();}
    ctx.fillStyle='#b56c41';ctx.beginPath();ctx.arc(128,128,8,0,Math.PI*2);ctx.fill();
  });
  cylinder(0.3,0.3,0.07,[-0.25,3.38,-3.58],palette.dark,[Math.PI/2,0,0]);
  mesh(new THREE.CircleGeometry(0.274,48),material('#ffffff',{map:clockMap}),[-0.25,3.38,-3.53]);
  const mug = cylinder(0.09,0.075,0.17,[-0.25,1.03,-1.92],material('#baa56d'));
  cylinder(0.079,0.079,0.004,[-0.25,1.117,-1.92],material('#332c22'));
  box([0.26,0.004,0.34],[-0.31,0.953,-1.3],palette.paper,[0,0.2,0]);
  box([0.33,0.03,0.045],[-0.5,0.978,-1.14],palette.dark,[0,0.4,0]);
  // Cable conduit and low workshop stool finish the peripheral silhouette.
  box([8.3,0.045,0.04],[0,1.22,-3.72],palette.metal);
  box([0.045,1.4,0.04],[-3.9,1.9,-3.72],palette.metal);
  cylinder(0.35,0.35,0.09,[-2.3,0.53,0.15],palette.fabric);
  for(const x of [-2.52,-2.08])for(const z of [-0.06,0.36])box([0.045,0.5,0.045],[x,0.25,z],palette.metal);

  let mode = 'stowed', enhanced = true, disposed = false, frame = 0;
  let last = 0, elapsed = 0;
  const current = new THREE.Vector3(0.3,1.72,3.15);
  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width,height,false); camera.aspect=width/height;
    camera.fov = width < height ? 59 : 49; camera.updateProjectionMatrix();
  }
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas); window.addEventListener('resize',resize); resize();
  function render(now) {
    if(disposed)return;
    const dt=Math.min((now-last)/1000 || 0.016,0.05);last=now;elapsed+=dt;
    const target = mode==='focused' ? new THREE.Vector3(0.28,1.69,3.08) : mode==='held' ? new THREE.Vector3(0.29,1.71,3.12) : new THREE.Vector3(0.3,1.72,3.15);
    current.lerp(target,1-Math.exp(-dt*9));camera.position.copy(current);
    if(enhanced && mode==='stowed'){camera.position.y+=Math.sin(elapsed*1.1)*0.003;camera.position.x+=Math.sin(elapsed*0.7)*0.004;}
    camera.lookAt(look);renderer.render(scene,camera);frame=requestAnimationFrame(render);
  }
  frame=requestAnimationFrame(render);
  return {
    setPhone(value){ if(['stowed','held','focused'].includes(value))mode=value; },
    setEnhanced(value){enhanced=Boolean(value);}, resize,
    dispose(){disposed=true;cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);resources.forEach(value=>value.dispose?.());renderer.dispose();}
  };
}

function createFallback(canvas) {
  const surface = document.createElement('canvas'); surface.width=1400; surface.height=900;
  const ctx=surface.getContext('2d');
  const wall=ctx.createLinearGradient(0,0,1400,900);wall.addColorStop(0,'#526361');wall.addColorStop(1,'#171f21');
  ctx.fillStyle=wall;ctx.fillRect(0,0,1400,900);
  ctx.fillStyle='#1a303f';ctx.fillRect(120,90,330,370);
  ctx.strokeStyle='#9faca0';ctx.lineWidth=16;ctx.strokeRect(120,90,330,370);
  ctx.fillStyle='#33474c';ctx.fillRect(130,290,310,160);
  ctx.fillStyle='#688b99';ctx.fillRect(279,95,8,360);ctx.fillRect(125,270,320,8);
  ctx.fillStyle='#384344';ctx.fillRect(900,260,320,270);
  ctx.fillStyle='#dcd3b5';ctx.font='bold 34px sans-serif';ctx.fillText('ARRIVAGES',940,320);
  ctx.fillStyle='#111e23';ctx.fillRect(935,380,250,16);
  ctx.fillStyle='#674e38';ctx.beginPath();ctx.moveTo(0,560);ctx.lineTo(1400,560);ctx.lineTo(1400,900);ctx.lineTo(0,830);ctx.fill();
  ctx.fillStyle='#ac885f';ctx.fillRect(180,420,170,150);ctx.fillRect(1090,460,190,140);
  ctx.fillStyle='#c3bca0';for(let i=0;i<3;i++){ctx.fillRect(390+i*58,492,43,75);ctx.fillStyle='#243c40';ctx.fillRect(387+i*58,486,49,10);ctx.fillStyle='#c3bca0';}
  const light=ctx.createRadialGradient(630,510,10,630,510,430);light.addColorStop(0,'rgba(255,211,131,.23)');light.addColorStop(1,'rgba(255,211,131,0)');ctx.fillStyle=light;ctx.fillRect(0,0,1400,900);
  canvas.style.background=`center / cover no-repeat url("${surface.toDataURL()}")`;
  canvas.dataset.fallback='illustration';
  return {setPhone(){},setEnhanced(){},resize(){},dispose(){}};
}
