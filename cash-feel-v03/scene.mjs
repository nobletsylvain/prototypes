import * as THREE from './assets/three.module.js';
import { selectNearbyNotes, resolveIntake, isTableDrop } from './gesture.mjs';

const NOTE_WIDTH = .14, NOTE_DEPTH = .065;
const TABLE_Y = .745;
const smooth = t => t * t * (3 - 2 * t);
const noise = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export class CashScene {
  constructor(canvas, onSelect, { circuit = 'integrated' } = {}) {
    this.machineState={reserves:{10:0,20:0},target:100,autoBundle:true,binding:{10:false,20:false},counted:0}; this.canvas=canvas; this.onSelect=onSelect; this.circuit=circuit; this.labels={}; this.gesture=null; this.hoverTarget=null; this.handDrag=null; this.dropPlacements=new Map(); this.intakeRegions={}; this.effects=true; this.look=false; this.time=0;
    this.views=new Map(); this.bundleViews=new Map(); this.targets=new Map(); this.pulses=[]; this.events=[]; this.ledger=null;
    this.metrics={frames:0,largestFrameMs:0,drawCalls:0,noteMeshes:0,bundleMeshes:0,contacts:0};
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75)); this.renderer.setClearColor(0x253c37);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace; this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.3;
    this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0x263b34,2.8,6);
    this.camera=new THREE.PerspectiveCamera(49,1,.025,15); this.yaw=0;this.pitch=0;
    this.scene.add(new THREE.HemisphereLight(0xf5ebcd,0x526451,2));
    const sun=new THREE.DirectionalLight(0xffe3b7,3.0);sun.position.set(-1.4,3,1);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-1.4;sun.shadow.camera.right=1.4;sun.shadow.camera.top=1.4;sun.shadow.camera.bottom=-1.4;sun.shadow.bias=-.0003;this.scene.add(sun);
    const fill=new THREE.DirectionalLight(0xa5d3cb,1.3);fill.position.set(1,1,0);this.scene.add(fill);
    this.materials={wood:new THREE.MeshStandardMaterial({color:0x897259,roughness:.92}),edge:new THREE.MeshStandardMaterial({color:0x403b2e,roughness:.8}),dark:new THREE.MeshStandardMaterial({color:0x172d2a,roughness:.7}),metal:new THREE.MeshStandardMaterial({color:0x83968e,metalness:.45,roughness:.45}),cream:new THREE.MeshStandardMaterial({color:0xd2d3b4,roughness:.85}),black:new THREE.MeshStandardMaterial({color:0x101b19,roughness:.6}),band:new THREE.MeshStandardMaterial({color:0xe5d5a6,roughness:.8})};
    this.pickables=[];this.makeRoom();this.makeMachine();this.makePouch();this.makeStorage();this.makeNotes();
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.matrix=new THREE.Object3D();
    this.setCircuit(circuit);this.installControls();this.resize();window.addEventListener('resize',()=>this.resize());
  }
  box(w,h,d,x,y,z,material,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  label(text,w,h,color='#c5d3b8',background='#213b34'){
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.font='500 54px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  }
  makeRoom(){
    this.box(5,.06,4,0,-.02,0,this.materials.edge);
    const wall=this.box(5,3,.05,0,1.5,-1.1,new THREE.MeshStandardMaterial({color:0x42584b,roughness:1}));
    this.box(2.45,.12,1.22,0,TABLE_Y-.06,0,this.materials.wood);
    this.box(2.48,.045,.06,0,TABLE_Y-.02,.60,this.materials.edge);
    for(const x of [-1,1])this.box(.07,.7,.9,x,.35,0,this.materials.dark);
    for(let i=0;i<22;i++)this.box(.002,.0004,1.16,-1.15+i*.11,TABLE_Y+.0002,0,new THREE.MeshStandardMaterial({color:i%2?0x75634f:0x998166,roughness:1}));
    this.box(1.32,.004,.67,-.16,TABLE_Y+.003,.03,new THREE.MeshStandardMaterial({color:0x324b41,roughness:1}));
    for(const x of [-.815,.495])this.box(.001,.001,.65,x,TABLE_Y+.006,.03,this.materials.cream);
    this.box(1.3,.001,.001,-.16,TABLE_Y+.006,.35,this.materials.cream);
    const sign=this.label('ATELIER / 03',.64,.16,'#c3c7ab','#3b5145');sign.position.set(-.7,1.36,-1.067);this.scene.add(sign);
    this.box(.85,.035,.16,.60,1.27,-.96,this.materials.edge);
    for(let i=0;i<4;i++)this.box(.10,.13+i*.012,.10,.34+i*.15,1.35,-.98,this.materials.dark);
    this.box(.44,.42,.02,.65,1.68,-1.06,new THREE.MeshStandardMaterial({color:0xa0a082,roughness:1}));
    for(let i=0;i<6;i++)this.box(.34,.003,.002,.65,1.81-i*.047,-1.047,this.materials.edge);
    // The lamp is part of the proposed staging, with no effect on money state.
    this.box(.024,.62,.024,-1.03,1.05,-.40,this.materials.black);
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.16,.09,32,1,true),this.materials.cream);shade.position.set(-1.03,1.37,-.40);this.scene.add(shade);
    this.box(.01,.015,.24,-1.03,1.4,-.50,this.materials.black);
    const light=new THREE.PointLight(0xffd89c,.25,1.5);light.position.set(-1.03,1.30,-.4);this.scene.add(light);
  }
  makeMachine(){
    this.machines={};this.rollers=[];this.reserveScreens={};
    const group=new THREE.Group();group.position.set(0,TABLE_Y,-.20);this.scene.add(group);this.machine=group;
    const trim=new THREE.MeshStandardMaterial({color:0xa6b49a,metalness:.25,roughness:.65});
    // Both denomination chambers belong to this one continuous housing.
    this.box(1.16,.055,.45,0,.035,0,this.materials.dark,group);
    this.box(1.16,.30,.035,0,.21,-.218,this.materials.dark,group);
    for(const x of [-.565,0,.565])this.box(.028,.38,.45,x,.21,0,this.materials.dark,group);
    this.box(1.16,.045,.25,0,.40,-.10,trim,group);
    this.box(1.16,.038,.035,0,.31,.225,trim,group);
    this.box(1.16,.035,.035,0,.13,.225,trim,group);
    const glowMaterial=new THREE.MeshStandardMaterial({color:0x9ab99c,emissive:0x49755d,emissiveIntensity:.35,roughness:.7});
    const inlet=this.box(.38,.012,.18,0,.432,-.07,glowMaterial,group);
    for(const x of [-.215,.215])this.box(.02,.085,.22,x,.455,-.07,this.materials.dark,group);
    this.box(.45,.10,.016,0,.47,-.19,this.materials.dark,group);
    const rollers=[];
    for(const z of [-.045,.035]){const roller=new THREE.Mesh(new THREE.CylinderGeometry(.019,.019,.39,20),this.materials.black);roller.rotation.z=Math.PI/2;roller.position.set(0,.448,z);group.add(roller);rollers.push(roller);this.rollers.push(roller);}
    const pick=this.box(.46,.10,.25,0,.46,-.07,new THREE.MeshBasicMaterial({visible:false}),group);pick.userData.action='combined';this.pickables.push(pick);
    const title=this.label('',.39,.035,'#d9e3c8','#213a32');title.position.set(0,.49,-.178);group.add(title);
    this.machines.integrated={group,inlet,glowMaterial,rollers,title,pick,count:0};
    for(const d of [10,20]){
      const x=d===10?-.285:.285;
      // Inset shelves and full-height side posts make the retained paper visibly internal.
      this.box(.50,.012,.37,x,.166,.012,this.materials.metal,group);
      this.box(.47,.004,.25,x,.175,.035,this.materials.black,group);
      for(const side of [-1,1])this.box(.009,.085,.28,x+side*.235,.211,.035,trim,group);
      const reservePick=this.box(.48,.145,.30,x,.227,.055,new THREE.MeshBasicMaterial({visible:false}),group);reservePick.userData.action='reserve';reservePick.userData.denomination=d;this.pickables.push(reservePick);
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const screen=new THREE.Mesh(new THREE.PlaneGeometry(.43,.083),new THREE.MeshBasicMaterial({map:texture}));screen.position.set(x,.348,.227);group.add(screen);
      this.reserveScreens[d]={canvas,texture};
      this.box(.31,.065,.012,x,.089,.226,this.materials.black,group);
      this.box(.33,.008,.12,x,.061,.25,this.materials.metal,group);
      for(const side of [-1,1])this.box(.008,.05,.13,x+side*.165,.085,.27,trim,group);
      const pad=this.box(.40,.009,.19,x,TABLE_Y+.006,.27,this.materials.metal);
      const outputPick=this.box(.41,.08,.19,x,TABLE_Y+.045,.27,new THREE.MeshBasicMaterial({visible:false}));outputPick.userData.action='output';outputPick.userData.denomination=d;this.pickables.push(outputPick);
      const tag=this.label(String(d)+' EUR',.10,.023);tag.rotation.x=-Math.PI/2;tag.position.set(x,TABLE_Y+.012,.365);this.scene.add(tag);
    }
    this.setMachineState(this.machineState);
  }
  setCircuit(circuit='integrated'){
    if(!['integrated','combined'].includes(circuit))throw new RangeError('The integrated scene has one machine');
    this.cancelGesture();this.intakeRegions={};this.circuit='integrated';this.setLabels(this.labels);this.retarget();
  }
  setLabels(labels={}){
    this.labels={...this.labels,...labels};
    const machine=this.machines.integrated,canvas=machine.title.material.map.image;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#213a32';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#d9e3c8';ctx.font='500 48px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(this.labels.combined??this.labels.machine??'',256,66,490);machine.title.material.map.needsUpdate=true;
  }
  reservePosition(denomination){return{x:denomination===10?-.285:.285,y:TABLE_Y+.181,z:-.15};}
  bindingPosition(denomination){return{x:denomination===10?-.285:.285,y:TABLE_Y+.183,z:-.05};}
  outputPosition(denomination){return{x:denomination===10?-.285:.285,z:.27};}
  setMachineState(state={}){
    this.machineState={...this.machineState,...state,reserves:{...this.machineState.reserves,...state.reserves},binding:{...this.machineState.binding,...state.binding}};
    for(const d of [10,20]){
      const screen=this.reserveScreens?.[d];if(!screen)continue;
      const count=this.machineState.reserves[d]??0,target=this.machineState.target??100;
      const signature=[count,target,this.machineState.binding[d],this.machineState.autoBundle].join(':');if(signature===screen.signature)continue;screen.signature=signature;
      const ctx=screen.canvas.getContext('2d');ctx.fillStyle='#112b23';ctx.fillRect(0,0,512,128);
      ctx.textAlign='left';ctx.fillStyle='#e5e7cd';ctx.font='30px monospace';ctx.fillText(String(d)+' EUR',20,38);
      ctx.textAlign='right';ctx.fillStyle=this.machineState.binding[d]?'#f3d49e':'#c6e7a7';ctx.font='51px monospace';ctx.fillText(String(count).padStart(3,'0')+' / '+target,492,94);
      ctx.fillStyle=this.machineState.autoBundle?'#91be8b':'#e1bf84';ctx.beginPath();ctx.arc(485,27,8,0,Math.PI*2);ctx.fill();screen.texture.needsUpdate=true;
    }
  }
  makePouch(){this.pouch=new THREE.Group();this.pouch.position.set(-.95,TABLE_Y+.035,-.19);this.pouch.rotation.y=-.18;this.scene.add(this.pouch);
    const material=new THREE.MeshStandardMaterial({color:0x7b8262,roughness:1});this.box(.28,.06,.19,0,0,0,material,this.pouch);this.box(.25,.01,.16,0,.035,0,this.materials.black,this.pouch);
    for(const x of [-.14,.14])this.box(.009,.065,.19,x,.01,0,material,this.pouch);
    this.box(.28,.018,.009,0,.04,-.09,this.materials.cream,this.pouch);
    const tag=this.label('01',.07,.035,'#2a3e33','#c6c5a6');tag.rotation.x=-Math.PI/2;tag.position.set(0,.042,-.055);this.pouch.add(tag);
    const pick=this.box(.31,.10,.22,0,.02,0,new THREE.MeshBasicMaterial({visible:false}),this.pouch);pick.userData.action='pouch';this.pickables.push(pick);
  }
  makeStorage(){this.trays=[];for(let i=0;i<5;i++){const g=new THREE.Group();g.position.set(.86+(i%2)*.19,TABLE_Y+.008,-.35+Math.floor(i/2)*.19);this.scene.add(g);this.box(.175,.015,.15,0,0,0,this.materials.dark,g);for(const x of [-.085,.085])this.box(.006,.035,.15,x,.018,0,this.materials.edge,g);this.box(.17,.035,.006,0,.018,-.072,this.materials.edge,g);const t=this.label(String(i+1),.028,.02);t.rotation.x=-Math.PI/2;t.position.set(0,.009,.052);g.add(t);const p=this.box(.18,.07,.16,0,.03,0,new THREE.MeshBasicMaterial({visible:false}),g);p.userData.action='slot';p.userData.index=i;this.pickables.push(p);this.trays.push(g);}}
  makeNotes(){
    this.paperGeometry=new THREE.BoxGeometry(NOTE_WIDTH,.00055,NOTE_DEPTH,10,1,5);
    const p=this.paperGeometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,p.getY(i)+Math.sin(x/NOTE_WIDTH*Math.PI)*Math.sin(z/NOTE_DEPTH*Math.PI)*.0016);}this.paperGeometry.computeVertexNormals();
    const normals=this.paperGeometry.attributes.normal, uv=this.paperGeometry.attributes.uv;
    // The far -Z edge is the printed top; mirror U only on the reverse face.
    for(let i=0;i<uv.count;i++){const x=p.getX(i),z=p.getZ(i),ny=normals.getY(i),faceV=.5-z/NOTE_DEPTH;if(ny>.5)uv.setXY(i,x/NOTE_WIDTH+.5,.53515625+faceV*.46484375);else if(ny<-.5)uv.setXY(i,.5-x/NOTE_WIDTH,faceV*.46484375);else uv.setXY(i,.5,.5);}
    this.noteMaterials={};this.noteInstances={};this.instanceIds={};
    const loader=new THREE.TextureLoader();this.assetPromises=[];
    for(const d of [10,20]){const texture=loader.load(`assets/banknote_${d}eur_front_back.png`);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.noteMaterials[d]=new THREE.MeshStandardMaterial({map:texture,roughness:.92});const mesh=new THREE.InstancedMesh(this.paperGeometry,this.noteMaterials[d],1200);mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.denomination=d;this.scene.add(mesh);this.noteInstances[d]=mesh;}
    const c=document.createElement('canvas');c.width=32;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#c5c8a6';ctx.fillRect(0,0,32,256);for(let y=0;y<256;y+=3){ctx.fillStyle=y%9?'#8d9b81':'#e0dfbe';ctx.fillRect(0,y,32,1);}this.edgeTexture=new THREE.CanvasTexture(c);
    this.edgeMaterial=new THREE.MeshStandardMaterial({map:this.edgeTexture,roughness:1});
    this.ring=new THREE.Mesh(new THREE.RingGeometry(.095,.097,48),new THREE.MeshBasicMaterial({color:0xe8edce,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.ring.position.set(-.26,TABLE_Y+.011,.12);this.scene.add(this.ring);this.ring.visible=false;
  }
  bundleHeight(entity){return Math.max(.006,entity.noteIds.length*.00018);}
  makeBundle(entity){
    const g=new THREE.Group();g.userData.entityId=entity.id;const d=this.ledger.denomination(entity),height=this.bundleHeight(entity);
    this.box(NOTE_WIDTH,height,NOTE_DEPTH,0,height/2,0,this.edgeMaterial,g);
    const top=new THREE.Mesh(this.paperGeometry,this.noteMaterials[d]);top.position.y=height+.001;top.castShadow=true;g.add(top);
    const band=this.box(.026,height+.003,NOTE_DEPTH+.001,0,(height+.003)/2,0,this.materials.band,g);g.userData.band=band;
    const label=this.label(String(entity.noteIds.length),.022,.010,'#4a5e46','#e5d5a6');label.rotation.x=-Math.PI/2;label.position.set(0,height+.0032,0);g.add(label);
    const target=this.targets.get(entity.id);const start=target??{x:this.bindingPosition(d).x,y:TABLE_Y+.183,z:-.05};
    this.scene.add(g);this.bundleViews.set(entity.id,{group:g,position:new THREE.Vector3(start.x,start.y,start.z),rotation:0,born:this.time,lastLocation:entity.location,flight:null});return this.bundleViews.get(entity.id);
  }
  sync(ledger,event=null){
    this.ledger=ledger;
    if(event){this.events.push({...event,time:this.time});if(this.events.length>200)this.events.shift();
      if(event.type==='bind'){const pos=this.bindingPosition(event.denomination??20);this.pulse(new THREE.Vector3(pos.x,pos.y+.02,pos.z),0xe0dab0);}
      if(['dump','drop','store'].includes(event.type))this.metrics.contacts++;
      if(event.type==='drop'){
        const point=event.position??this.pendingDropPosition;
        if(point)for(const entity of ledger.getEntities('table')){
          const previous=this.views.get(entity.id)?.lastLocation??this.bundleViews.get(entity.id)?.lastLocation;
          if(event.ids?.includes(entity.id)||previous==='hand')this.dropPlacements.set(entity.id,{x:point.x,z:point.z});
        }
      }
    }
    this.retarget();
  }
  retarget(){
    if(!this.ledger)return;this.targets.clear();const counts={},totals={};for(const entity of this.ledger.entities)totals[entity.location]=(totals[entity.location]??0)+1;
    const sorted=[...this.ledger.entities].sort((a,b)=>a.id.localeCompare(b.id));
    for(const e of sorted){const d=this.ledger.denomination(e);const key=e.location+(e.location==='output'?d:'');const n=counts[key]??0;counts[key]=n+1;let x=0,y=TABLE_Y+.007,z=0,r=0;
      if(e.location==='pouch'){x=-.95+(noise(n)-.5)*.08;z=-.19+(noise(n+5)-.5)*.04;y+=.032+n*.00012;r=-.18;}
      if(e.location==='table'){
        const seed=Number(e.noteIds[0].replace(/\D/g,''))||n;const drop=this.dropPlacements.get(e.id);
        x=(drop?.x??-.38)+(noise(seed)-.5)*(drop?.18:.62);z=(drop?.z??.44)+(noise(seed+41)-.5)*(drop?.09:.14);
        x=THREE.MathUtils.clamp(x,-1.05,1.05);z=THREE.MathUtils.clamp(z,.14,.51);
        y+=Math.floor(n/70)*.0007+noise(seed+20)*.002;r=(noise(seed+5)-.5)*(drop?.5:2.1);
      }
      if(e.location==='hand'){x=.04+(n%8)*.003;z=.51+(n%5)*.002;y=TABLE_Y+.17+Math.floor(n/8)*.00075;r=-.12+n*.0015;}
      if(e.location==='input'){x=0;z=-.27;y=TABLE_Y+.452+n*.00020;}
      if(e.location==='reserve10'||e.location==='reserve20'){const pos=this.reservePosition(d),count=totals[e.location];x=pos.x;z=pos.z;y=pos.y+n*Math.min(.00035,.09/Math.max(1,count));}
      if(e.location==='binding10'||e.location==='binding20'){const pos=this.bindingPosition(d);x=pos.x;z=pos.z;y=pos.y;}
      if(e.location==='output'){const pos=this.outputPosition(d);x=pos.x;z=pos.z;y+=n*.022;}
      if(e.location.startsWith('slot')){const i=Number(e.location.slice(4));const g=this.trays[i];x=g.position.x;z=g.position.z-.01;y+=.016+n*(e.type==='bundle'?.020:.00035);}
      this.targets.set(e.id,{x,y,z,r,e,index:n});
      if(e.type==='note'&&!this.views.has(e.id))this.views.set(e.id,{position:new THREE.Vector3(x,y,z),rotation:r,lastLocation:e.location,flight:null});
    }
    for(const [id,v] of this.bundleViews)if(!this.targets.has(id)){this.disposeBundle(v);this.bundleViews.delete(id);}
    for(const id of this.views.keys())if(!this.targets.has(id))this.views.delete(id);
  }
  pulse(position,color=0xe9d4a3){if(!this.effects)return;const mesh=new THREE.Mesh(new THREE.RingGeometry(.025,.028,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));mesh.position.copy(position);mesh.rotation.x=-Math.PI/2;this.scene.add(mesh);this.pulses.push({mesh,born:this.time});}
  updateDisplay(count){this.setMachineState({counted:count});}
  resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;const portraitFov=2*Math.atan(Math.tan(THREE.MathUtils.degToRad(27))/(w/h));this.camera.fov=w<h?THREE.MathUtils.radToDeg(portraitFov):50;this.camera.updateProjectionMatrix();this.resetCamera(false);}
  resetCamera(reset=true){if(reset){this.yaw=0;this.pitch=0;}const portrait=this.canvas.clientWidth<this.canvas.clientHeight;this.camera.position.set(0,portrait?1.43:1.46,portrait?1.25:1.43);this.camera.lookAt(this.yaw,(portrait?1.10:.97)+this.pitch,-.03);this.camera.updateMatrixWorld();}
  getHotspots(){
    const rect=this.canvas.getBoundingClientRect(),result={};
    const anchors={combined:{x:0,y:TABLE_Y+.47,z:-.27,radius:.20}};
    for(const d of [10,20]){const reserve=this.reservePosition(d),output=this.outputPosition(d);anchors['reserve'+d]={...reserve,y:reserve.y+.035};anchors['output'+d]={...output,y:TABLE_Y+.04};}
    for(const [name,anchor] of Object.entries(anchors)){
      const point=new THREE.Vector3(anchor.x,anchor.y,anchor.z).project(this.camera);
      const edge=new THREE.Vector3(anchor.x+(anchor.radius??.17),anchor.y,anchor.z).project(this.camera);
      const x=(point.x+1)*rect.width/2,y=(1-point.y)*rect.height/2;
      result[name]={x,y,visible:point.z>-1&&point.z<1&&x>=0&&x<=rect.width&&y>=0&&y<=rect.height,radius:Math.max(32,Math.min(80,Math.abs(edge.x-point.x)*rect.width/2)),intake:name==='combined'};
    }
    return result;
  }
  getInteractionState(){return{dragging:!!this.handDrag,hoverTarget:this.hoverTarget};}
  setIntakeRegions(regions={}){
    this.intakeRegions={};
    for(const [name,rect] of Object.entries(regions)){
      if(name!=='combined'||!rect)continue;
      const {left,top,right,bottom}=rect;
      if([left,top,right,bottom].every(Number.isFinite)&&right>left&&bottom>top)this.intakeRegions[name]={left,top,right,bottom};
    }
  }
  setHover(target){if(this.hoverTarget===target)return;this.hoverTarget=target;this.onSelect({action:'hover-target',target});}
  setPointerRay(x,y){const rect=this.canvas.getBoundingClientRect();this.pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);return rect;}
  planePoint(x,y,height=TABLE_Y+.16){this.setPointerRay(x,y);const point=new THREE.Vector3();return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-height),point)?point:null;}
  intakeAt(x,y){const rect=this.canvas.getBoundingClientRect();const spots=Object.fromEntries(Object.entries(this.getHotspots()).map(([name,spot])=>[name,{...spot,rect:this.intakeRegions?.[name]}]));return resolveIntake({x:x-rect.left,y:y-rect.top},spots);}
  hitAt(x,y){
    this.setPointerRay(x,y);const isVisible=object=>{for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;};
    const objects=[...Object.values(this.noteInstances),...this.pickables.filter(isVisible),...[...this.bundleViews.values()].map(v=>v.group)];
    for(const hit of this.ray.intersectObjects(objects,true)){
      if(hit.instanceId!==undefined){const id=this.instanceIds[hit.object.userData.denomination][hit.instanceId];const entity=this.ledger?.entities.find(v=>v.id===id);if(!entity)continue;
        // Held paper and notes travelling through a machine cannot block a drop target.
        if(['hand','input','binding10','binding20'].includes(entity.location))continue;
        if(entity.location==='table')return{action:entity.type==='bundle'?'output':'handful',id,point:hit.point};
        if(entity.location.startsWith('reserve'))return{action:'reserve',denomination:this.ledger.denomination(entity),point:hit.point};
        if(entity.location==='output')return{action:'output',id,point:hit.point};
        if(entity.location.startsWith('slot'))return{action:'slot',index:Number(entity.location.slice(4)),point:hit.point};
        if(entity.location==='pouch')return{action:'pouch',point:hit.point};continue;
      }
      let object=hit.object;while(object&&!object.userData.action&&!object.userData.entityId)object=object.parent;
      if(object?.userData.entityId){const entity=this.ledger?.entities.find(v=>v.id===object.userData.entityId);if(!entity||['hand','binding10','binding20'].includes(entity.location))continue;if(entity.location.startsWith('slot'))return{action:'slot',index:Number(entity.location.slice(4)),point:hit.point};return{action:'output',id:object.userData.entityId,point:hit.point};}
      if(object?.userData.action==='output'){const entity=this.ledger?.getEntities('output').find(e=>this.ledger.denomination(e)===object.userData.denomination);if(entity)return{action:'output',id:entity.id,denomination:object.userData.denomination,point:hit.point};continue;}
      if(object?.userData.action)return{...object.userData,point:hit.point};
    }
    return null;
  }
  grabAt(point,amount=24){
    if(!this.ledger)return;const candidates=this.ledger.getEntities('table').filter(e=>e.type==='note').map(e=>{const view=this.views.get(e.id);const target=this.targets.get(e.id);return{id:e.id,x:view?.position.x??target.x,z:view?.position.z??target.z};});
    const ids=selectNearbyNotes(candidates,point,100-this.ledger.handObjects,amount,.27);
    if(ids.length){this.ring.position.set(point.x,TABLE_Y+.02,point.z);this.ring.visible=true;this.onSelect({action:'handful',ids});}
  }
  updateDrag(x,y){if(!this.ledger?.handObjects)return;const p=this.planePoint(x,y);if(p){p.x=THREE.MathUtils.clamp(p.x,-1.2,1.2);p.z=THREE.MathUtils.clamp(p.z,-.5,.65);this.handDrag=p;}this.setHover(this.intakeAt(x,y));}
  cancelGesture(){this.gesture=null;this.handDrag=null;if(this.hoverTarget!==null)this.setHover(null);}
  installControls(){
    this.canvas.addEventListener('pointerdown',e=>{
      if(this.gesture)return;e.preventDefault();this.canvas.setPointerCapture(e.pointerId);
      const gesture={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,age:0,nextGather:.35,source:null,hadHand:!!this.ledger?.handObjects};this.gesture=gesture;
      if(this.look)return;const hit=this.hitAt(e.clientX,e.clientY);gesture.source=hit;
      if(hit?.action==='handful'){this.grabAt(hit.point);gesture.anchor={x:hit.point.x,z:hit.point.z};}
      else if(!this.ledger?.handObjects&&hit){if(['reserve','output','slot','pouch'].includes(hit.action))this.onSelect(hit);}
      if(this.ledger?.handObjects)this.updateDrag(e.clientX,e.clientY);
    });
    this.canvas.addEventListener('pointermove',e=>{
      const g=this.gesture;if(!g||g.pointerId!==e.pointerId)return;e.preventDefault();const dx=e.clientX-g.lastX,dy=e.clientY-g.lastY;g.lastX=e.clientX;g.lastY=e.clientY;
      if(Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>8)g.moved=true;
      if(this.look){this.yaw=THREE.MathUtils.clamp(this.yaw-dx*.0015,-.6,.6);this.pitch=THREE.MathUtils.clamp(this.pitch+dy*.001,-.18,.35);this.resetCamera(false);return;}
      if(g.moved)this.updateDrag(e.clientX,e.clientY);
    });
    this.canvas.addEventListener('pointerup',e=>{
      const g=this.gesture;if(!g||g.pointerId!==e.pointerId)return;e.preventDefault();
      if(!this.look&&this.ledger?.handObjects){
        const target=this.intakeAt(e.clientX,e.clientY);
        if(target&&(g.moved||g.hadHand))this.onSelect({action:target});
        else if(g.moved){const hit=this.hitAt(e.clientX,e.clientY);if(hit?.action==='slot')this.onSelect(hit);else{const point=this.planePoint(e.clientX,e.clientY,TABLE_Y+.008);if(isTableDrop(point)){this.pendingDropPosition={x:point.x,z:point.z};this.onSelect({action:'drop',position:this.pendingDropPosition});this.pendingDropPosition=null;}}}
      }else if(!this.look&&!g.moved&&g.source&&g.source.action==='combined')this.onSelect(g.source);
      this.cancelGesture();
    });
    this.canvas.addEventListener('pointercancel',()=>this.cancelGesture());
    this.canvas.addEventListener('lostpointercapture',()=>this.cancelGesture());
    window.addEventListener('blur',()=>this.cancelGesture());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.cancelGesture();});
  }
  selectAt(x,y,sweep=false){const hit=this.hitAt(x,y);if(!hit)return;if(hit.action==='handful')this.grabAt(hit.point);else if(!sweep)this.onSelect(hit);}
  setEffects(value){this.effects=value;if(!value){for(const p of this.pulses){this.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();}this.pulses=[];}}
  disposeBundle(v){this.scene.remove(v.group);v.group.traverse(o=>{if(o.geometry&&o.geometry!==this.paperGeometry)o.geometry.dispose();if(o.material?.map&&o.material!==this.edgeMaterial&&!Object.values(this.noteMaterials).includes(o.material)){o.material.map.dispose();o.material.dispose();}});}
  reset(){this.cancelGesture();this.dropPlacements.clear();for(const v of this.bundleViews.values())this.disposeBundle(v);this.bundleViews.clear();this.views.clear();this.targets.clear();this.events=[];this.ring.visible=false;const effects=this.effects;this.setEffects(false);this.setEffects(effects);this.setMachineState({reserves:{10:0,20:0},binding:{10:false,20:false},counted:0});}
  step(dt,realDt=dt){this.time+=dt;this.metrics.frames++;this.metrics.largestFrameMs=Math.max(this.metrics.largestFrameMs,realDt*1000);if(!this.ledger)return;
    const gesture=this.gesture;if(gesture&&!this.look&&!gesture.moved&&gesture.anchor){gesture.age+=dt;if(gesture.age>=gesture.nextGather){this.grabAt(gesture.anchor,16);gesture.nextGather+=.15;}}
    const indexes={10:0,20:0};this.instanceIds={10:[],20:[]};let running=this.ledger.getEntities('input').length>0;
    for(const [id,target] of this.targets){const {e}=target;if(e.type==='bundle'){
      const v=this.bundleViews.get(id)||this.makeBundle(e),age=this.time-v.born;
      const targetPos=e.location==='hand'&&this.handDrag?this.handDrag.clone():new THREE.Vector3(target.x,target.y,target.z);
      if(v.lastLocation!==e.location){
        const from=v.lastLocation;v.lastLocation=e.location;
        v.flight={start:v.position.clone(),born:this.time,duration:from.startsWith('binding')&&e.location==='output'?.60:.22,ejection:from.startsWith('binding')&&e.location==='output'};
      }
      if(v.flight){
        const f=v.flight,t=Math.min(1,(this.time-f.born)/f.duration);
        if(f.ejection){
          const slide=Math.min(1,t/.28),fall=Math.max(0,(t-.18)/.82);
          v.position.x=THREE.MathUtils.lerp(f.start.x,targetPos.x,smooth(t));
          v.position.z=THREE.MathUtils.lerp(f.start.z,targetPos.z,smooth(slide));
          v.position.y=THREE.MathUtils.lerp(f.start.y,targetPos.y,fall*fall);
          v.group.rotation.x=this.effects?Math.sin(t*Math.PI)*.17:0;
        }else v.position.lerpVectors(f.start,targetPos,smooth(t));
        if(t>=1){v.flight=null;v.group.rotation.x=0;if(f.ejection){v.settleBorn=this.time;this.metrics.contacts++;this.pulse(targetPos,0xc8d5ac);}}
      }else v.position.lerp(targetPos,1-Math.exp(-dt*14));
      v.group.position.copy(v.position);v.group.rotation.y=target.r;
      // Compression stays in the chamber and cannot alter the bundle's members.
      let scale=1;if(e.location.startsWith('binding')&&this.effects&&age<.90)scale=age<.65?1.6-.82*smooth(age/.65):.78+.22*smooth((age-.65)/.25);
      v.group.scale.y=scale;v.group.userData.band.scale.x=e.location.startsWith('binding')&&age<.65?Math.max(.02,smooth(age/.65)):1;
      if(v.settleBorn!==undefined&&this.effects){const t=(this.time-v.settleBorn)/.24;if(t<1)v.group.position.y+=Math.abs(Math.sin(t*Math.PI*2))*Math.pow(1-t,2)*.008;else delete v.settleBorn;}
      continue;
    }
      const d=this.ledger.denomination(e);const v=this.views.get(id);if(!v)continue;
      if(v.lastLocation!==e.location){v.flight={start:v.position.clone(),born:this.time,duration:e.location.startsWith('reserve')?.14:e.location==='hand'?.20:e.location==='table'?.42:.25,from:v.lastLocation};v.lastLocation=e.location;}
      const tpos=e.location==='hand'&&this.handDrag?new THREE.Vector3(this.handDrag.x+(target.index%8)*.003,this.handDrag.y+Math.floor(target.index/8)*.00075,this.handDrag.z+(target.index%5)*.002):new THREE.Vector3(target.x,target.y,target.z);let roll=0,pitch=0;
      if(v.flight){const f=v.flight;const t=Math.min(1,(this.time-f.born)/f.duration);v.position.lerpVectors(f.start,tpos,smooth(t));v.position.y+=Math.sin(t*Math.PI)*(e.location.startsWith('reserve')?.012:.085);roll=this.effects?Math.sin(t*Math.PI*3)*.08:0;pitch=this.effects?Math.sin(t*Math.PI)*.13:0;if(t===1){v.flight=null;v.settle={born:this.time,amplitude:e.location==='hand'&&this.ledger.handObjects>1?.010:.006};if(this.effects&&e.location==='table'&&noise(indexes[d])>.94)this.pulse(tpos);}}
      else{v.position.lerp(tpos,1-Math.exp(-dt*17));if(this.effects&&e.location==='hand')v.position.y+=Math.sin(this.time*2.5)*.00015;}
      v.rotation=THREE.MathUtils.lerp(v.rotation,target.r,1-Math.exp(-dt*14));this.matrix.position.copy(v.position);if(v.settle&&this.effects){const age=(this.time-v.settle.born)/.32;if(age<1)this.matrix.position.y+=Math.sin(age*Math.PI*2)*Math.pow(1-age,2)*v.settle.amplitude;else v.settle=null;}this.matrix.rotation.set(pitch,v.rotation,roll);this.matrix.scale.set(1,1,1);this.matrix.updateMatrix();this.noteInstances[d].setMatrixAt(indexes[d],this.matrix.matrix);this.instanceIds[d].push(id);indexes[d]++;
    }
    for(const d of [10,20]){this.noteInstances[d].count=indexes[d];this.noteInstances[d].instanceMatrix.needsUpdate=true;this.noteInstances[d].boundingSphere=null;}
    const machine=this.machines.integrated,active=this.ledger.getEntities('input').length>0;
    machine.group.position.y=TABLE_Y+(active&&this.effects?Math.sin(this.time*100)*.0025:0);
    for(const roller of machine.rollers)if(active)roller.rotation.x+=dt*32;
    machine.glowMaterial.emissiveIntensity=this.hoverTarget==='combined'?1.8:this.ledger.handObjects?.6:.25;
    for(let i=this.pulses.length-1;i>=0;i--){const p=this.pulses[i],t=(this.time-p.born)/.4;if(t>=1){this.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();this.pulses.splice(i,1);}else{p.mesh.scale.setScalar(1+t*2);p.mesh.material.opacity=(1-t)*.35;}}
    if(this.ring.visible)this.ring.material.opacity=.3+Math.sin(this.time*5)*.1;
    this.renderer.render(this.scene,this.camera);this.metrics.drawCalls=this.renderer.info.render.calls;this.metrics.noteMeshes=indexes[10]+indexes[20];this.metrics.bundleMeshes=this.bundleViews.size;
  }
}
