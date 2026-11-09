import * as THREE from './vendor/three.module.js';

const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const ease = x=>1-Math.pow(1-x,3);
export class WorkshopView {
  constructor(canvas,onSelect){
    this.canvas=canvas;this.onSelect=onSelect;this.assets={};this.enhanced=true;this.filmPresence=1;this.time=0;this.anim=null;this.move=null;this.look=false;this.yaw=0;this.pitch=0;this.zoom=1;this.targets=[];this.dynamic=new THREE.Group();this.slot=0;this.placements=new Map();this.placementSequence=0;this.pendingOpenPlacement=null;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#252923');this.scene.fog=new THREE.Fog('#252923',2.9,7);this.scene.add(this.dynamic);
    this.camera=new THREE.PerspectiveCamera(43,1,.01,20);this.ray=new THREE.Raycaster();this.buildRoom();this.resize();this.bindPointer();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
    this.last=performance.now();this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  async init(){
    await Promise.all(['hash-100g','hash-250g','bud-5g','knife-v02'].map(async name=>{
      const r=await fetch(`assets/${name}.json`);if(!r.ok)throw new Error(`Asset unavailable: ${name}`);const a=await r.json();
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(a.normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(a.uvs,2));for(const x of a.groups)g.addGroup(x.start,x.count,x.materialIndex);
      const mats=await Promise.all(a.materials.map(async m=>{let map=null;if(m.map){map=await new THREE.TextureLoader().loadAsync(`assets/${m.map}`);map.flipY=false;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;}return new THREE.MeshStandardMaterial({color:new THREE.Color(...m.color.slice(0,3)),map,roughness:Math.max(.35,m.roughness??.7),metalness:m.metalness??0});}));
      this.assets[name]={geometry:g,materials:mats,dimensions:a.dimensions};
    }));
    this.noteMaps={};await Promise.all([10,20,50].map(async value=>{const map=await new THREE.TextureLoader().loadAsync(`assets/banknote_${value}eur_front_back.png`);map.colorSpace=THREE.SRGBColorSpace;map.repeat.set(1,.46484375);map.offset.set(0,.53515625);this.noteMaps[value]=map;}));
    this.knife=this.asset('knife-v02');this.knife.position.set(.88,.006,.32);this.knife.rotation.y=-.3;this.scene.add(this.knife);
  }
  asset(name){const a=this.assets[name];const m=new THREE.Mesh(a.geometry,a.materials);m.castShadow=true;m.receiveShadow=true;return m;}
  own(mesh){mesh.userData.ownsResources=true;return mesh;}
  box(w,h,d,color,x=0,y=0,z=0,roughness=.7){const m=this.own(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness})));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
  buildRoom(){
    const scene=this.scene;scene.add(new THREE.HemisphereLight('#e2e5c8','#615038',2.0));
    const key=new THREE.DirectionalLight('#fff3d3',3.5);key.position.set(-1.2,2,1);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-1.6;key.shadow.camera.right=1.6;key.shadow.camera.top=1.4;key.shadow.camera.bottom=-1.4;key.shadow.normalBias=.004;key.shadow.bias=-.0002;scene.add(key);
    const rim=new THREE.DirectionalLight('#d6e9f6',2);rim.position.set(1,1,-1);scene.add(rim);
    const room=new THREE.Scene();room.background=new THREE.Color('#60716a');const lightPlane=(w,h,x,y,z,rx,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.set(rx,ry,0);room.add(m);};lightPlane(1,3,-1,1,0,0,Math.PI/2);lightPlane(2,.15,0,1.5,-1,0,0);lightPlane(.5,3,1,1,1,0,-Math.PI/2);const pmrem=new THREE.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(room,.03);scene.environment=this.environment.texture;pmrem.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    const wood=document.createElement('canvas');wood.width=512;wood.height=512;const c=wood.getContext('2d');c.fillStyle='#777461';c.fillRect(0,0,512,512);let seed=14;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<1500;i++){c.strokeStyle=`rgba(${rnd()>.5?'38,35,22':'198,190,152'},${rnd()*.12})`;c.lineWidth=rnd()*2+.3;c.beginPath();const x=rnd()*512;c.moveTo(x,0);c.bezierCurveTo(x+rnd()*12,180,x-rnd()*10,320,x,512);c.stroke();}const tex=new THREE.CanvasTexture(wood);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(3,2);
    const table=this.box(2.5,.09,1.7,'#b7ad8e',0,-.045,.04);table.material.map=tex;scene.add(table);
    scene.add(this.box(3.8,2.8,.06,'#42483e',0,1,-1.15));scene.add(this.box(.04,2.8,4,'#484d40',-1.85,.8,0));
    for(let i=0;i<5;i++)scene.add(this.box(.002,1.9,.005,'#333c31',-.9+i*.45,.8,-1.115));
    scene.add(this.box(1.1,.035,.22,'#747862',-.32,.50,-.96));
    for(let i=0;i<3;i++){const tin=this.box(.14,.13,.13,['#787e59','#989473','#414e40'][i],-.65+i*.24,.58,-.98);scene.add(tin);}
    scene.add(this.box(.54,.006,.37,'#484f3e',.45,.001,-.12));
    this.roll=new THREE.Group();const outer=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.25,40),new THREE.MeshPhysicalMaterial({color:'#dae6d7',metalness:.15,roughness:.23,clearcoat:1}));outer.rotation.z=Math.PI/2;this.roll.add(outer);const core=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.254,32),new THREE.MeshStandardMaterial({color:'#b09a73'}));core.rotation.z=Math.PI/2;this.roll.add(core);this.roll.position.set(-.34,.04,.46);scene.add(this.roll);
    this.slotMarkers=[];for(let i=0;i<3;i++){const m=this.box(.34,.001,.38,'#92a277',.52,.003,-.42+i*.42);m.material.transparent=true;m.material.opacity=.15;m.receiveShadow=false;scene.add(m);this.slotMarkers.push(m);}
  }
  resize(){const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.fov=w<700?58:48;this.camera.updateProjectionMatrix();this.baseDistance=this.fitDistance();this.updateCamera();}
  fitDistance(){
    const probe=this.camera.clone(),points=[];
    for(const box of [[-.75,-.20,0,.15,-.62,.31],[.35,.70,0,.26,-.62,.62],[-.13,.22,.19,.35,.20,.58]])for(const x of [box[0],box[1]])for(const y of [box[2],box[3]])for(const z of [box[4],box[5]])points.push(new THREE.Vector3(x,y,z));
    for(let distance=1.7;distance<4;distance+=.025){probe.position.set(.05,.72,distance);probe.lookAt(.05,.06,-.02);probe.updateMatrixWorld();if(points.every(point=>{const p=point.clone().project(probe);return Math.abs(p.x)<.88&&p.y>-.66&&p.y<.65;}))return distance;}
    return 4;
  }
  updateCamera(){const dist=(this.baseDistance||1.7)*this.zoom;this.camera.position.set(.05+Math.sin(this.yaw)*dist,.72+this.pitch,Math.cos(this.yaw)*dist);this.camera.lookAt(.05,.06,-.02);}
  bindPointer(){let start=null;this.canvas.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch};this.canvas.setPointerCapture(e.pointerId);});this.canvas.addEventListener('pointermove',e=>{if(!start||!this.look)return;this.yaw=clamp(start.yaw-(e.clientX-start.x)*.004,-.75,.75);this.pitch=clamp(start.pitch+(e.clientY-start.y)*.002,-.18,.5);this.updateCamera();});this.canvas.addEventListener('pointerup',e=>{if(start&&!this.look&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<12){const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);const hit=this.ray.intersectObjects(this.targets,true)[0];if(hit){let o=hit.object;while(o&&!o.userData.action)o=o.parent;if(o)this.onSelect(o.userData.action);}}start=null;});this.canvas.addEventListener('pointercancel',()=>start=null);}
  reframe(){this.yaw=0;this.pitch=0;this.zoom=1;this.updateCamera();}
  itemMesh(item){
    if(item.kind==='slab')return this.asset(item.formatMg===250000?'hash-250g':'hash-100g');
    const group=new THREE.Group();
    if(item.kind==='cashBundle'){
      const body=this.box(.14,.018,.065,'#b3b79e',0,.009,0);group.add(body);for(let i=0;i<9;i++)group.add(this.box(.1405,.0004,.0655,i%2?'#d2d6c0':'#858d78',0,.002+i*.0018,0));const denomination=item.bills[0]?.cents/100;const face=this.own(new THREE.Mesh(new THREE.PlaneGeometry(.14,.065),new THREE.MeshStandardMaterial({map:this.noteMaps[denomination],roughness:.8})));face.rotation.x=-Math.PI/2;face.position.y=.0185;group.add(face);group.add(this.box(.032,.019,.066,'#b7ad85',0,.0095,0));
    } else {
      const flower=this.asset('bud-5g');flower.rotation.x=Math.PI/2;flower.position.set(0,.03,-.046);group.add(flower);const bag=this.box(.082,.06,.125,'#d6dfd2',0,.031,0,.15);bag.material.transparent=true;bag.material.opacity=.1;bag.material.depthWrite=false;group.add(bag);group.add(this.box(.081,.003,.004,'#a15239',0,.063,-.057));
    }return group;
  }
  dimensions(item){return item.kind==='slab'?[.102,item.formatMg===250000?.046:.019,.182]:item.kind==='cashBundle'?[.143,.02,.069]:[.085,.066,.13];}
  contentLayout(ids,state){
    if(!ids.length)return {positions:[],size:[0,0,0],stackCount:0};
    const item=state.items[ids[0]],d=this.dimensions(item),vertical=(item.kind==='slab'&&item.formatMg===100000)||item.kind==='cashBundle';
    const stackCount=vertical?Math.ceil(ids.length/5):0;
    const cols=vertical?Math.min(3,stackCount):ids.length>10?3:ids.length>3?2:1;
    const rows=vertical?Math.ceil(stackCount/cols):ids.length>6?2:1;
    const positions=ids.map((id,i)=>{
      const stack=vertical?Math.floor(i/5):i;
      const c=stack%cols,r=vertical?Math.floor(stack/cols):Math.floor(i/cols)%rows;
      const layer=vertical?i%5:Math.floor(i/(cols*rows));
      return [(c-(cols-1)/2)*d[0],layer*d[1],(r-(rows-1)/2)*d[2]];
    });
    return {positions,size:[cols*d[0],(vertical?Math.min(5,ids.length):Math.ceil(ids.length/(cols*rows)))*d[1],rows*d[2]],stackCount};
  }
  makeContents(ids,state){
    const g=new THREE.Group(),layout=this.contentLayout(ids,state),columns=new Map();
    ids.forEach((id,i)=>{
      const item=state.items[id],m=this.itemMesh(item),d=this.dimensions(item);
      m.position.set(...layout.positions[i]);m.userData.itemId=id;g.add(m);m.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(m),key=`${m.position.x.toFixed(6)},${m.position.z.toFixed(6)}`;
      let column=columns.get(key);
      if(!column){column={x:m.position.x,z:m.position.z,stepX:d[0],stepZ:d[2],maxBevel:item.kind==='cashBundle'?.001:.003,minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity,bottom:Infinity,top:-Infinity};columns.set(key,column);}
      column.minX=Math.min(column.minX,bounds.min.x);column.maxX=Math.max(column.maxX,bounds.max.x);
      column.minZ=Math.min(column.minZ,bounds.min.z);column.maxZ=Math.max(column.maxZ,bounds.max.z);
      column.bottom=Math.min(column.bottom,bounds.min.y);column.top=Math.max(column.top,bounds.max.y);
    });
    g.userData.size=layout.size;g.userData.stackCount=layout.stackCount;g.userData.filmColumns=[...columns.values()];return g;
  }
  createFilm(size,finished=true,contentColumns=null){
    const group=new THREE.Group();group.userData.film=true;group.userData.finished=finished;
    const margin=.0006,detailOffset=.00018;
    const columns=contentColumns?.length?contentColumns:[{x:0,z:0,stepX:size[0],stepZ:size[2],minX:-size[0]/2,maxX:size[0]/2,minZ:-size[2]/2,maxZ:size[2]/2,bottom:0,top:size[1]}];
    const bottom=Math.min(...columns.map(c=>c.bottom))-margin;
    const shellVertices=[],foldLines=[],foldTriangles=[],seamVertices=[];
    const faces=[];
    const triangle=(target,a,b,c)=>target.push(...a,...b,...c);
    const neighbor=(column,dx,dz)=>columns.find(other=>other!==column&&Math.abs(other.x-column.x-dx*column.stepX)<.00001&&Math.abs(other.z-column.z-dz*column.stepZ)<.00001);
    for(const column of columns){
      const west=neighbor(column,-1,0),east=neighbor(column,1,0),north=neighbor(column,0,-1),south=neighbor(column,0,1);
      const x0=west?(west.x+column.x)/2:column.minX-margin,x1=east?(east.x+column.x)/2:column.maxX+margin;
      const z0=north?(north.z+column.z)/2:column.minZ-margin,z1=south?(south.z+column.z)/2:column.maxZ+margin;
      const top=column.top+margin;
      const bevel=Math.min(column.maxBevel??.003,(x1-x0)*.08,(z1-z0)*.08);
      const nw=!north&&!west?bevel:0,ne=!north&&!east?bevel:0,se=!south&&!east?bevel:0,sw=!south&&!west?bevel:0;
      const polygon=[[x0+nw,z0],[x1-ne,z0],[x1,z0+ne],[x1,z1-se],[x1-se,z1],[x0+sw,z1],[x0,z1-sw],[x0,z0+nw]]
        .filter((point,index,array)=>index===0||point[0]!==array[index-1][0]||point[1]!==array[index-1][1]);
      if(polygon.length>1&&polygon.at(-1)[0]===polygon[0][0]&&polygon.at(-1)[1]===polygon[0][1])polygon.pop();
      const center=[(x0+x1)/2,top,(z0+z1)/2],lowerCenter=[center[0],bottom,center[2]];
      const surfacePoint=(point,inset=0,height=top+detailOffset)=>[point[0]+(center[0]-point[0])*inset,height,point[1]+(center[2]-point[1])*inset];
      for(let index=0;index<polygon.length;index++){
        const a=polygon[index],b=polygon[(index+1)%polygon.length];
        triangle(shellVertices,center,[b[0],top,b[1]],[a[0],top,a[1]]);
        triangle(shellVertices,lowerCenter,[a[0],bottom,a[1]],[b[0],bottom,b[1]]);
        let adjacent=null;
        if(Math.abs(a[0]-x0)<1e-9&&Math.abs(b[0]-x0)<1e-9)adjacent=west;
        else if(Math.abs(a[0]-x1)<1e-9&&Math.abs(b[0]-x1)<1e-9)adjacent=east;
        else if(Math.abs(a[1]-z0)<1e-9&&Math.abs(b[1]-z0)<1e-9)adjacent=north;
        else if(Math.abs(a[1]-z1)<1e-9&&Math.abs(b[1]-z1)<1e-9)adjacent=south;
        const low=adjacent?Math.max(bottom,adjacent.top+margin):bottom;
        if(top>low+.000001){
          const ab=[a[0],low,a[1]],at=[a[0],top,a[1]],bt=[b[0],top,b[1]],bb=[b[0],low,b[1]];
          triangle(shellVertices,ab,at,bt);triangle(shellVertices,ab,bt,bb);
          const edgeLength=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=(b[1]-a[1])/edgeLength,nz=-(b[0]-a[0])/edgeLength;
          if(edgeLength>.012){
            const u=.18,v=.38;
            foldLines.push(a[0]+(b[0]-a[0])*u+nx*detailOffset,top-(top-low)*.12,a[1]+(b[1]-a[1])*u+nz*detailOffset,
              a[0]+(b[0]-a[0])*v+nx*detailOffset,top-(top-low)*.70,a[1]+(b[1]-a[1])*v+nz*detailOffset);
          }
          const creaseA=surfacePoint(a,.035),creaseB=surfacePoint(a,.32);
          foldLines.push(...creaseA,...creaseB);
          triangle(foldTriangles,creaseA,creaseB,surfacePoint([a[0]+(b[0]-a[0])*.10,a[1]+(b[1]-a[1])*.10],.16));
        }
      }
      const seamX=center[0]+(x1-x0)*.18,seamHalf=Math.min(.002,(x1-x0)*.025),seamZ0=z0+(z1-z0)*.12,seamZ1=z1-(z1-z0)*.12;
      const sa=[seamX-seamHalf,top+detailOffset,seamZ0],sb=[seamX+seamHalf,top+detailOffset,seamZ0],sc=[seamX+seamHalf,top+detailOffset,seamZ1],sd=[seamX-seamHalf,top+detailOffset,seamZ1];
      triangle(seamVertices,sa,sc,sb);triangle(seamVertices,sa,sd,sc);
      faces.push({x:column.x,z:column.z,top,bottom,polygon});
    }
    const geometry=vertices=>{const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));result.computeVertexNormals();return result;};
    const shell=new THREE.Mesh(geometry(shellVertices),new THREE.MeshPhysicalMaterial({color:finished?'#333638':'#c5ded7',transparent:true,opacity:(finished?.23:.12)*this.filmPresence,roughness:.13,metalness:.14,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.6,depthWrite:false,side:THREE.DoubleSide}));group.add(shell);
    const lines=new THREE.BufferGeometry();lines.setAttribute('position',new THREE.Float32BufferAttribute(foldLines,3));group.add(new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:'#f1fff1',transparent:true,opacity:.42*this.filmPresence,depthWrite:false})));
    group.add(new THREE.Mesh(geometry(foldTriangles),new THREE.MeshPhysicalMaterial({color:'#effff8',transparent:true,opacity:.22*this.filmPresence,roughness:.06,metalness:.35,side:THREE.DoubleSide,depthWrite:false})));
    group.add(new THREE.Mesh(geometry(seamVertices),new THREE.MeshStandardMaterial({color:'#effff2',transparent:true,opacity:.10*this.filmPresence,roughness:.45,side:THREE.DoubleSide,depthWrite:false})));
    group.userData.contour={margin,detailOffset,faces};group.traverse(o=>{if(o.geometry)this.own(o);});return group;
  }
  clearDynamic(){const geometries=new Set(),materials=new Set();this.dynamic.traverse(o=>{if(!o.userData.ownsResources)return;if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.dynamic.clear();this.targets=[];this.held=null;this.packageViews={};}
  updatePlacements(state){
    const opened=state.piles.filter(p=>p.label==='openedPackage'&&p.itemIds.length);
    const placed=state.packages.filter(p=>p.id!==state.heldPackageId);
    if(!state.packages.length&&!opened.length){this.placements.clear();this.placementSequence=0;this.pendingOpenPlacement=null;}
    const pending=this.pendingOpenPlacement;
    if(pending&&!state.packages.some(p=>p.id===pending.packageId)){
      const pile=opened.find(p=>JSON.stringify(p.slot)===JSON.stringify(pending.slot)&&p.itemIds.length===pending.itemIds.length&&p.itemIds.every((id,i)=>id===pending.itemIds[i]));
      if(pile){this.placements.set(pile.id,{...pending.placement,position:[...pending.placement.position]});this.pendingOpenPlacement=null;}
    }
    const entries=[...opened,...placed];const active=new Set(entries.map(p=>p.id));
    for(const id of this.placements.keys())if(!active.has(id))this.placements.delete(id);
    for(const entry of entries){
      const key=JSON.stringify(entry.slot);let record=this.placements.get(entry.id);
      if(!record||record.slotKey!==key){record={slotKey:key,slot:entry.slot,order:++this.placementSequence,height:0,position:[0,0,0]};this.placements.set(entry.id,record);}
      record.height=Math.max(record.height,this.contentLayout(entry.itemIds,state).size[1]+.008);
    }
    const levels=new Map();for(const [,record] of [...this.placements].sort((a,b)=>a[1].order-b[1].order)){
      const level=levels.get(record.slotKey)||0;const slot=record.slot;const x=typeof slot==='object'&&slot!==null?slot.x:.52;const z=typeof slot==='object'&&slot!==null?slot.z:-.42+(typeof slot==='number'?slot:0)*.42;
      record.position=[x,.009+level,z];levels.set(record.slotKey,level+record.height);
    }
  }
  sync(state,slot=0){
    this.state=state;this.slot=slot;this.updatePlacements(state);this.clearDynamic();this.slotMarkers.forEach((m,i)=>{m.material.opacity=i===slot?.32:.10;});
    state.piles.forEach((p,i)=>{if(!p.itemIds.length)return;const g=this.makeContents(p.itemIds,state);const opened=p.label==='openedPackage';const position=opened?this.placements.get(p.id).position:[-.59+(i%2)*.27,.008,-.32+Math.floor(i/2)*.52];g.position.set(...position);g.userData.action={type:'pile',id:p.id};this.dynamic.add(g);this.targets.push(g);if(p.id===state.targetPileId){const size=g.userData.size;const marker=this.box(size[0]+.03,.002,size[2]+.03,'#c7de8e',position[0],position[1]-.002,position[2]);marker.material.transparent=true;marker.material.opacity=.34;marker.userData.transient=true;this.dynamic.add(marker);}});
    state.packages.forEach(p=>{const g=this.makeContents(p.itemIds,state);const film=this.createFilm(g.userData.size,true,g.userData.filmColumns);g.add(film);g.userData.filmObject=film;g.userData.action={type:'package',id:p.id,slot:p.slot};if(p.id===state.heldPackageId){g.position.set(.04,.19,.39);this.held=g;}else g.position.set(...this.placements.get(p.id).position);this.dynamic.add(g);this.targets.push(g);this.packageViews[p.id]=g;});
    if(state.handIds.length){const g=this.makeContents(state.handIds,state);g.position.set(.04,.19,.39);this.dynamic.add(g);this.held=g;}
  }
  setFilm(v){this.filmPresence=v;if(this.state)this.sync(this.state,this.slot);}
  animateMove(packageId,fromPositionArray,duration=.18,callback=()=>{}){
    const object=this.packageViews[packageId];if(!object||this.move||this.anim)return false;
    if(!Array.isArray(fromPositionArray)||fromPositionArray.length!==3||!fromPositionArray.every(Number.isFinite))return false;
    this.move={object,from:new THREE.Vector3(...fromPositionArray),to:object.position.clone(),duration:Math.max(.01,Number.isFinite(duration)?duration:.18),t:0,callback};
    this.pulseTime=0;object.position.copy(this.move.from);return true;
  }
  animate(kind,duration,callback,packageId){
    if(this.anim||this.move)return;this.anim={kind,duration,t:0,callback,packageId,base:this.held?.position.clone()};
    if(kind==='wrap'&&this.held){this.tempFilm=this.createFilm(this.held.userData.size,false,this.held.userData.filmColumns);this.tempFilm.scale.set(.02,1.4,1.12);this.held.add(this.tempFilm);}
    if(kind==='open'){this.knife.visible=true;this.openTarget=this.packageViews[packageId];const packet=this.state.packages.find(p=>p.id===packageId),placement=this.placements.get(packageId);if(packet&&placement)this.pendingOpenPlacement={packageId,itemIds:[...packet.itemIds],slot:packet.slot,placement:{...placement,position:[...placement.position]}};}
  }
  pulse(kind){this.pulseTime=.22;this.pulseKind=kind;}
  frame(now){const dt=Math.min((now-this.last)/1000,.04);this.last=now;this.time+=dt;
    if(this.pulseTime>0){this.pulseTime-=dt;if(this.held&&this.enhanced)this.held.position.y=.19+Math.sin(Math.max(0,this.pulseTime)/.22*Math.PI)*.012;}
    if(this.move){const move=this.move;move.t+=dt;const progress=clamp(move.t/move.duration,0,1),travel=progress*progress*(3-2*progress);move.object.position.lerpVectors(move.from,move.to,travel);if(this.enhanced)move.object.position.y+=Math.sin(progress*Math.PI)*.018;if(progress>=1){move.object.position.copy(move.to);this.move=null;move.callback();}}
    if(this.anim){const a=this.anim;a.t+=dt;const p=clamp(a.t/a.duration,0,1);
      if(a.kind==='wrap'&&this.held){const s=this.held.userData.size;const q=ease(p);if(this.tempFilm){this.tempFilm.scale.set(Math.max(.025,q),1+(1-q)*.45,1+(1-q)*.17);this.tempFilm.position.x=-(1-q)*s[0]*.5;}this.roll.position.set(.04+Math.cos(p*Math.PI*2)*(.10+s[0]*.5),.19+s[1]+.05+Math.sin(p*Math.PI*2)*.03,.39+Math.sin(p*Math.PI*2)*(.07+s[2]*.5));this.roll.rotation.y=p*Math.PI*2;}
      if(a.kind==='open'&&this.openTarget){const pos=this.openTarget.position,s=this.openTarget.userData.size;this.knife.position.set(pos.x-s[0]*.55+p*s[0],pos.y+s[1]+.014+Math.sin(p*Math.PI)*.012,pos.z);this.knife.rotation.set(0,0,-.15);const film=this.openTarget.userData.filmObject;film.scale.set(1+Math.max(0,p-.35)*.65,1,1+Math.max(0,p-.35)*.55);film.traverse(o=>{if(o.material)o.material.opacity*=1-dt*3*p;});}
      document.getElementById('progress').style.width=`${p*100}%`;
      if(p>=1){this.anim=null;this.tempFilm=null;this.roll.position.set(-.34,.04,.46);this.roll.rotation.set(0,0,0);this.knife.position.set(.88,.006,.32);this.knife.rotation.set(0,-.3,0);a.callback();}
    }
    this.renderer.render(this.scene,this.camera);requestAnimationFrame(this.frame);
  }
}
