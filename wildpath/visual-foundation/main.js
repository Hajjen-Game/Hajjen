import {MODEL_FILES,MODEL_HOST,MODEL_SOURCE,TREE_LAYOUT,BUSH_LAYOUT} from './asset-manifest.js?v=10.1';
const B=window.BABYLON;
const byId=id=>document.getElementById(id);
const canvas=byId('world');
const mobile=matchMedia('(pointer:coarse)').matches || innerWidth<720;
if(!B){byId('error').hidden=false;byId('error').textContent='Babylon.js kunde inte laddas. Kontrollera internetanslutningen.';throw Error('Babylon missing');}
const engine=new B.Engine(canvas,true,{stencil:true,preserveDrawingBuffer:false,antialias:true});
engine.setHardwareScalingLevel(mobile?Math.max(1,Math.min(devicePixelRatio,1.5)):1);
const scene=new B.Scene(engine);
scene.useRightHandedSystem=false;
const V=(x,y,z)=>new B.Vector3(x,y,z);
const C=h=>B.Color3.FromHexString(h);
const themes=[
  {name:'Morgonljus',sky:'#cbded1',sun:'#fff0cc',ambient:'#d7ecdf',earth:'#90b998',path:'#dfcba2',water:'#79c7bb',light:2.15},
  {name:'Gyllene timmen',sky:'#f3d4b9',sun:'#ffcd8f',ambient:'#e9d0c8',earth:'#a4b58b',path:'#dfb993',water:'#74c2b6',light:1.85}
];
let themeIndex=0,angled=true,showShadows=true;
scene.clearColor=B.Color4.FromHexString(themes[0].sky+'ff');
scene.ambientColor=C('#889a82');
scene.imageProcessingConfiguration.toneMappingEnabled=true;
scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
scene.imageProcessingConfiguration.exposure=1.22;
scene.imageProcessingConfiguration.contrast=1.09;
const hemi=new B.HemisphericLight('hemisphere daylight',V(.1,1,.15),scene);
hemi.intensity=.88;hemi.diffuse=C('#d7ecdf');hemi.groundColor=C('#747f70');
const sun=new B.DirectionalLight('sun with soft depth shadows',V(-.54,-1,.42),scene);
sun.position=V(-45,70,-35);sun.intensity=2.15;sun.diffuse=C('#fff0cc');
sun.shadowFrustumSize=92;
const shadows=new B.ShadowGenerator(mobile?1024:2048,sun);
shadows.usePercentageCloserFiltering=true;
shadows.filteringQuality=B.ShadowGenerator.QUALITY_MEDIUM;
shadows.bias=.0008;shadows.normalBias=.025;
shadows.getShadowMap().refreshRate=B.RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES;
const camera=new B.ArcRotateCamera('angled overview',-Math.PI/2,.75,42,V(0,.5,0),scene);
camera.mode=B.Camera.ORTHOGRAPHIC_CAMERA;
camera.lowerBetaLimit=.30;camera.upperBetaLimit=1.12;
camera.lowerRadiusLimit=17;camera.upperRadiusLimit=70;
camera.panningSensibility=0;
camera.wheelPrecision=45;camera.pinchPrecision=95;
camera.inertia=.82;camera.angularSensibilityX=1800;camera.angularSensibilityY=1800;
camera.attachControl(canvas,true);
let viewWidth=mobile?31:43;
let lastCameraRadius=camera.radius;
function frame(){const ratio=Math.max(.1,engine.getRenderWidth()/Math.max(1,engine.getRenderHeight()));const half=viewWidth/2;
  camera.orthoLeft=-half;camera.orthoRight=half;camera.orthoTop=half/ratio;camera.orthoBottom=-half/ratio;}
frame();
// Every diffuse palette belongs to the same grounded, desaturated color family.
const material=(name,color,spec='#192020')=>{const m=new B.StandardMaterial(name,scene);
  m.diffuseColor=C(color);m.specularColor=C(spec);m.roughness=.85;return m;};
let seed=192021;
const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
function groundTexture(){
  const tex=new B.DynamicTexture('fine-grain painted earth',{width:512,height:512},scene,false);
  const ctx=tex.getContext();ctx.fillStyle='#a3bda0';ctx.fillRect(0,0,512,512);
  for(let i=0;i<6800;i++){const a=.025+rnd()*.13;const s=.4+rnd()*3.8;
    ctx.fillStyle=rnd()>.53?'rgba(234,241,198,'+a+')':'rgba(52,101,71,'+a+')';
    ctx.beginPath();ctx.ellipse(rnd()*512,rnd()*512,s,s*(.4+rnd()),rnd()*6.28,0,6.283);ctx.fill();}
  tex.update();tex.uScale=11;tex.vScale=11;tex.wrapU=B.Texture.WRAP_ADDRESSMODE;tex.wrapV=B.Texture.WRAP_ADDRESSMODE;return tex;
}
const earth=B.MeshBuilder.CreateGround('soft grass surface',{width:155,height:155,subdivisions:1},scene);
earth.position.y=-.11;earth.receiveShadows=true;
const earthMat=material('meadow based on moss and sage','#9fba9b','#0c2217');
earthMat.diffuseTexture=groundTexture();earthMat.diffuseColor=C('#d9e8d5');
earthMat.specularColor=C('#152820').scale(.08);earth.material=earthMat;
const trailMat=material('warm sandy trail','#dbc39b','#38271a');trailMat.backFaceCulling=false;
const pathLeft=[],pathRight=[];
for(let z=-68;z<=68;z+=1.1){let cx=1.7*Math.sin(z/15)+.85*Math.sin(z/7.1);
 let w=1.7+.25*Math.sin(z/11);pathLeft.push(V(cx-w,-.073,z));pathRight.push(V(cx+w,-.073,z));}
const path=B.MeshBuilder.CreateRibbon('winding quiet footpath',{pathArray:[pathLeft,pathRight],sideOrientation:B.Mesh.DOUBLESIDE},scene);path.material=trailMat;path.receiveShadows=true;
const grasses=[];
function grassPatches(){
 const mats=['#6f9f78','#8fac80','#b2bf83'].map((c,i)=>material('painted grass blade '+i,c));
 for(let j=0;j<mats.length;j++){
   const template=B.MeshBuilder.CreateCylinder('bent grass silhouette',{height:.45,diameterTop:0,diameterBottom:.095,tessellation:3},scene);
   template.material=mats[j];template.isPickable=false;
   const matrices=[];
   for(let i=0;i<110;i++){let x=(rnd()-.5)*68,z=(rnd()-.5)*68;
    const bend=1.7*Math.sin(z/15)+.85*Math.sin(z/7.1);
    if(Math.abs(x-bend)<2.5||Math.hypot(x-10,z-5)<7)continue;
    const p=V(x,.11,z),s=V(.65+rnd(),.58+rnd()*.75,.65+rnd());
    const q=B.Quaternion.RotationYawPitchRoll(rnd()*6.28,(rnd()-.5)*.29,(rnd()-.5)*.22);
    const m=B.Matrix.Compose(s,q,p);matrices.push(...m.m);}
   template.thinInstanceSetBuffer('matrix',new Float32Array(matrices),16,true);
   template.alwaysSelectAsActiveMesh=true;grasses.push(template);
 }
}
grassPatches();
const rockMats=['#9eaa99','#c8bbab','#9ba6a6','#adad96'].map((c,i)=>material('soft rounded rock '+i,c,'#4d5250'));
function rock(x,z,size,index=0){
 const mesh=B.MeshBuilder.CreateIcoSphere('handplaced rounded stone',{radius:1,subdivisions:2},scene);
 mesh.position=V(x,.02+size*.28,z);mesh.scaling=V(size*.9,size*.38,size*.67);
 mesh.rotation.y=rnd()*6.28;mesh.material=rockMats[index%rockMats.length];
 mesh.receiveShadows=true;shadows.addShadowCaster(mesh);
 return mesh;
}
for(let i=0;i<55;i++){const angle=rnd()*Math.PI*2,rad=7+rnd()*29;
 const x=Math.cos(angle)*rad,z=Math.sin(angle)*rad;
 if(Math.abs(x)<2.5||Math.hypot(x-10,z-5)<6)continue;
 rock(x,z,.26+rnd()*.65,i);}
const bank=material('soft pond bank','#a6b29b','#1d4230');
const waterMaterial=material('translucent physical turquoise','#81cec1','#c6fff5');
waterMaterial.alpha=.84;waterMaterial.specularPower=130;waterMaterial.backFaceCulling=false;
const waterMid=material('shallow pond middle','#6bb6ac','#e7fff8');waterMid.alpha=.35;waterMid.backFaceCulling=false;
const rippleMaterial=material('subtle water reflections','#e4fff1','#ffffff');rippleMaterial.alpha=.42;rippleMaterial.emissiveColor=C('#4b8078').scale(.18);
const lilyMat=material('water lily leaves','#629b74','#1e4937');
const petalMats=['#f8e9d3','#e8b8c4','#ddc6e9','#f0d89f'].map((c,i)=>material('petal shade '+i,c));
const middleMat=material('warm flower center','#f1c975');
const stemMat=material('soft plant stem','#699777');
const ripples=[];
function createFlower(x,z,r=.16,shade=0){
 const stem=B.MeshBuilder.CreateCylinder('flower stem',{height:.38,diameterTop:.025,diameterBottom:.045,tessellation:5},scene);
 stem.position=V(x,.16,z);stem.material=stemMat;
 const center=B.MeshBuilder.CreateSphere('pollen heart',{diameter:.13,segments:8},scene);center.position=V(x,.39,z);center.material=middleMat;
 for(let a=0;a<5;a++){
   const t=a*2*Math.PI/5;
   const petal=B.MeshBuilder.CreateSphere('sculpted petal',{diameter:1,segments:8},scene);
   petal.scaling=V(r*.72,.045,r*.46);
   petal.position=V(x+Math.sin(t)*r*.7,.37,z+Math.cos(t)*r*.7);
   petal.rotation.y=t;petal.material=petalMats[shade%petalMats.length];
 }
}
function ellipseDisc(name,x,y,z,rx,rz,mat){
 const d=B.MeshBuilder.CreateDisc(name,{radius:1,tessellation:64,sideOrientation:B.Mesh.DOUBLESIDE},scene);
 d.rotation.x=-Math.PI/2;d.scaling=V(rx,rz,1);d.position=V(x,y,z);d.material=mat;
 return d;
}
function createPond(x,z,rx,rz){
 // Clear separation between permanent terrain pond and a temporary combat AoE telegraph.
 ellipseDisc('irregular shoreline soil',x,-.043,z,rx*1.13,rz*1.13,bank);
 ellipseDisc('transparent pond bed',x,-.020,z,rx*1.04,rz*1.04,waterMid);
 ellipseDisc('physical turquoise pond surface',x,.008,z,rx,rz,waterMaterial);
 for(let n=0;n<2;n++){
  const ring=B.MeshBuilder.CreateTorus('broad subtle water ripple',{diameter:1,thickness:.018,tessellation:64},scene);
  ring.position=V(x,.027+n*.003,z);ring.scaling=V(rx*(.68-n*.28)*2,1,rz*(.68-n*.28)*2);
  ring.material=rippleMaterial;ripples.push({ring,phase:n*2.2,baseX:ring.scaling.x,baseZ:ring.scaling.z});
 }
 for(let i=0;i<6;i++){const a=rnd()*6.28,rr=.1+rnd()*.7;
  const px=x+Math.cos(a)*rx*rr,pz=z+Math.sin(a)*rz*rr;
  ellipseDisc('lily pad leaf',px,.043,pz,.23+rnd()*.13,.19+rnd()*.06,lilyMat);
  if(i%3===0)createFlower(px+.07,pz+.06,.11,i+1);
 }
 for(let i=0;i<19;i++){const a=i*Math.PI*2/19+(.4*rnd()),px=x+Math.cos(a)*rx*1.11,pz=z+Math.sin(a)*rz*1.10;
  if(rnd()<.6)rock(px,pz,.15+rnd()*.25,i+1);
 }
}
createPond(10,5,4.7,3.0);
createPond(-17,-8,2.3,1.65);
for(let i=0;i<43;i++){
 const a=rnd()*6.283,dist=5+rnd()*24;
 let x=Math.cos(a)*dist,z=Math.sin(a)*dist;
 if(Math.abs(x)<2.5||Math.hypot(x-10,z-5)<6)continue;
 createFlower(x,z,.12+rnd()*.09,i);
}
const glow=new B.GlowLayer('subtle fairy glow',scene,{blurKernelSize:18});
glow.intensity=.26;
const fireflyMat=new B.StandardMaterial('gentle fireflies',scene);
fireflyMat.emissiveColor=C('#ffe4a1');fireflyMat.disableLighting=true;
const sparkles=[];
for(let i=0;i<10;i++){
 const orb=B.MeshBuilder.CreateSphere('firefly',{diameter:.09,segments:8},scene);
 orb.position=V((rnd()-.5)*30,.6+rnd()*2,(rnd()-.5)*30);orb.material=fireflyMat;orb.isPickable=false;
 sparkles.push({mesh:orb,alt:orb.position.y,phase:rnd()*6.283});
}
const guide=B.MeshBuilder.CreateCylinder('small traveler avatar (placeholder)',{height:.88,diameterTop:.30,diameterBottom:.53,tessellation:9},scene);
guide.position=V(0,.47,0);guide.material=material('traveler cloak','#6f938e','#dfefe3');
const head=B.MeshBuilder.CreateSphere('traveler head',{diameter:.31,segments:12},scene);
head.position=V(0,1.03,0);head.material=material('traveler head shade','#efdfc1');
const cap=B.MeshBuilder.CreateCylinder('pointed wanderer hat',{height:.47,diameterTop:0,diameterBottom:.61,tessellation:11},scene);
cap.position=V(0,1.35,0);cap.material=material('cloth hat','#68838d');
const anchor=B.MeshBuilder.CreateTorus('minimal traveler ground indicator',{diameter:.75,thickness:.022,tessellation:32},scene);
anchor.position=V(0,.025,0);anchor.material=material('player ring','#d5e5b3');
shadows.addShadowCaster(guide);shadows.addShadowCaster(head);shadows.addShadowCaster(cap);
const status=byId('status');
const modelCache=new Map();
const errors=[];
async function loadModels(){
 const entries=Object.entries(MODEL_FILES);
 await Promise.all(entries.map(async ([id,file])=>{
  try{
   status.textContent='Laddar 3D-modeller ('+(modelCache.size+1)+' / '+entries.length+')...';
   const container=await B.SceneLoader.LoadAssetContainerAsync(MODEL_HOST,file,scene);
   modelCache.set(id,container);
  }catch(error){errors.push(id+': '+String(error?.message||error));}
 }));
 let actors=0;
 function place(id,x,z,height,turn=0){
  const container=modelCache.get(id);if(!container)return;
  const anchor=new B.TransformNode('authored '+id+' placement '+actors++,scene);
  const placed=container.instantiateModelsToScene(n=>'VF-'+actors+'-'+n,false,{doNotInstantiate:true});
  placed.rootNodes.forEach(root=>{root.parent=anchor;});
  const meshes=anchor.getChildMeshes(false);
  if(!meshes.length){anchor.dispose();return;}
  let ymin=Infinity,ymax=-Infinity;
  for(const mesh of meshes){
   mesh.computeWorldMatrix(true);
   const box=mesh.getBoundingInfo()?.boundingBox;if(!box)continue;
   ymin=Math.min(ymin,box.minimumWorld.y);ymax=Math.max(ymax,box.maximumWorld.y);
   mesh.isPickable=false;
   if(mesh.material){mesh.material.backFaceCulling=false;
     if('metallic' in mesh.material)mesh.material.metallic=0;
     if('roughness' in mesh.material)mesh.material.roughness=.94;}
   shadows.addShadowCaster(mesh,false);
  }
  const naturalHeight=ymax-ymin;
  const scale=Number.isFinite(naturalHeight)&&naturalHeight>.001?height/naturalHeight:1;
  anchor.rotation.y=turn;anchor.scaling.setAll(scale);
  anchor.position=V(x,-(Number.isFinite(ymin)?ymin:0)*scale-.10,z);
 }
 TREE_LAYOUT.forEach(([x,z,id,height,turn])=>place(id,x,z,height,turn));
 BUSH_LAYOUT.forEach(([x,z,height],i)=>place('bush',x,z,height,i*.85));
 const count=TREE_LAYOUT.filter(a=>modelCache.has(a[2])).length+BUSH_LAYOUT.filter(()=>modelCache.has('bush')).length;
 if(errors.length){byId('error').hidden=false;
  byId('error').textContent='Några 3D-modeller kunde inte laddas ('+errors.map(e=>e.split(':')[0]).join(', ')+'). Den här förhandsvisningen använder externa CC0-GLB-filer, som kräver åtkomst till raw.githubusercontent.com.';}
 status.textContent=count?count+' riktiga 3D-växter · '+MODEL_SOURCE:'Inga 3D-modeller kunde laddas';
}
function applyTheme(){
 const t=themes[themeIndex];
 scene.clearColor=B.Color4.FromHexString(t.sky+'ff');hemi.diffuse=C(t.ambient);sun.diffuse=C(t.sun);sun.intensity=t.light;
 trailMat.diffuseColor=C(t.path);bank.diffuseColor=C(t.earth);waterMaterial.diffuseColor=C(t.water);
 byId('timeBtn').textContent=themeIndex?'☀ Gyllene timmen':'☀ Morgonljus';
}
applyTheme();
byId('timeBtn').addEventListener('click',()=>{themeIndex=(themeIndex+1)%themes.length;applyTheme();});
byId('viewBtn').addEventListener('click',()=>{angled=!angled;camera.beta=angled?.75:.44;
 byId('viewBtn').textContent=angled?'◇ Kamera: diagonal':'◇ Kamera: högt uppifrån';});
byId('shadowBtn').addEventListener('click',()=>{showShadows=!showShadows;
 shadows.getShadowMap().renderList.forEach(m=>m.receiveShadows=showShadows);
 earth.receiveShadows=showShadows;path.receiveShadows=showShadows;
 sun.shadowEnabled=showShadows;
 byId('shadowBtn').textContent=showShadows?'◉ Skuggor: på':'○ Skuggor: av';});
const pressed=new Set();
const allowed=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(allowed.includes(k)){e.preventDefault();pressed.add(k);}});
window.addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>pressed.clear());
let analogX=0,analogY=0;
const touch=byId('touch'),knob=byId('knob');
function analog(e){const rect=touch.getBoundingClientRect(),mx=rect.left+rect.width/2,my=rect.top+rect.height/2;
 const dx=e.clientX-mx,dy=e.clientY-my,dist=Math.max(1,Math.hypot(dx,dy)),amt=Math.min(dist,39);
 analogX=dx/dist*(amt/39);analogY=dy/dist*(amt/39);
 knob.style.transform='translate('+(analogX*31)+'px,'+(analogY*31)+'px)';}
touch.addEventListener('pointerdown',e=>{touch.setPointerCapture(e.pointerId);analog(e);});
touch.addEventListener('pointermove',e=>{if(touch.hasPointerCapture(e.pointerId))analog(e);});
const stop=()=>{analogX=analogY=0;knob.style.transform='translate(0,0)';};
touch.addEventListener('pointerup',stop);touch.addEventListener('pointercancel',stop);
const position=V(0,0,0);
let time=0,seconds=0,frames=0;
engine.runRenderLoop(()=>{
 const dt=Math.min(.05,engine.getDeltaTime()/1000||.016);time+=dt;seconds+=dt;frames++;
 if(Math.abs(camera.radius-lastCameraRadius)>.01){
   viewWidth=B.Scalar.Clamp(viewWidth*camera.radius/lastCameraRadius,21,68);
   lastCameraRadius=camera.radius;frame();
 }
 let mx=(+pressed.has('d')+ +pressed.has('arrowright'))-(+pressed.has('a')+ +pressed.has('arrowleft'))+analogX;
 let mz=(+pressed.has('w')+ +pressed.has('arrowup'))-(+pressed.has('s')+ +pressed.has('arrowdown'))-analogY;
 const length=Math.hypot(mx,mz);
 if(length>.08){
  mx/=Math.max(1,length);mz/=Math.max(1,length);
  position.x=B.Scalar.Clamp(position.x+mx*dt*7,-29,29);
  position.z=B.Scalar.Clamp(position.z+mz*dt*7,-29,29);
 }
 guide.position.x=head.position.x=cap.position.x=anchor.position.x=position.x;
 guide.position.z=head.position.z=cap.position.z=anchor.position.z=position.z;
 const desired=V(position.x,.35,position.z);
 camera.setTarget(B.Vector3.Lerp(camera.target,desired,Math.min(1,dt*4)));
 for(const s of sparkles)s.mesh.position.y=s.alt+Math.sin(time*.9+s.phase)*.19;
 for(const r of ripples){const s=1+.024*Math.sin(time*.72+r.phase);
  r.ring.scaling.x=r.baseX*s;r.ring.scaling.z=r.baseZ*s;}
 if(seconds>1.3){byId('fps').textContent=Math.round(frames/seconds)+' fps';frames=0;seconds=0;}
 scene.render();
});
window.addEventListener('resize',()=>{engine.resize();frame();});
void loadModels();
