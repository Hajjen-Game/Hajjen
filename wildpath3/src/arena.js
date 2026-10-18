// Self-contained bright arcade arena: no old Wildpath world or camera state.
import {ARENA_RADIUS,CAMERA_WIDTH} from './rules.js';
const B=window.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
export function candyMaterial(scene,name,hex,{emission=.025,shine=.13}={}){
  const m=new B.StandardMaterial(name,scene),c=B.Color3.FromHexString(hex);
  m.diffuseColor=c;
  m.ambientColor=c.scale(.22);
  m.emissiveColor=c.scale(emission);
  m.specularColor=new B.Color3(shine,shine*.92,shine*.8);
  m.specularPower=72;
  return m;
}
function addSphere(scene,name,material,x,y,z,sx,sy,sz){
  const m=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:12},scene);
  m.position.set(x,y,z);m.scaling.set(sx,sy,sz);m.material=material;m.isPickable=false;
  return m;
}
export function createArcadeArena(scene){
  scene.clearColor=B.Color4.FromHexString('#163d4eff');
  scene.ambientColor=new B.Color3(.28,.31,.28);
  const hemi=new B.HemisphericLight('ambient sky',V(0,1,0),scene);
  hemi.intensity=.67;hemi.diffuse=B.Color3.FromHexString('#dcf3df');
  hemi.groundColor=B.Color3.FromHexString('#345c57');
  const sun=new B.DirectionalLight('soft angled sunlight',V(-.55,-1,.4),scene);
  sun.intensity=.63;sun.diffuse=B.Color3.FromHexString('#ffe5b0');
  const floorMat=candyMaterial(scene,'bright meadow floor','#328d5e',{emission:.01,shine:.018});
  const skirt=candyMaterial(scene,'arena soft dark teal skirt','#185d56',{shine:.04});
  const trim=candyMaterial(scene,'thick lime arena rim','#95c844',{shine:.11});
  const edge=candyMaterial(scene,'dark green inside edge','#267453',{shine:.08});
  // Small round playing field: 26 units across rather than 86 units in 2.x.
  const base=B.MeshBuilder.CreateCylinder('arena raised meadow',{height:.42,
    diameter:ARENA_RADIUS*2,tessellation:80},scene);
  base.position.y=-.27;base.material=skirt;base.isPickable=false;
  const ground=B.MeshBuilder.CreateCylinder('arena playable surface',{height:.11,
    diameter:ARENA_RADIUS*2-.38,tessellation:80},scene);
  ground.position.y=-.018;ground.material=floorMat;ground.isPickable=false;
  const rim=B.MeshBuilder.CreateTorus('arena raised lime rim',{
    diameter:ARENA_RADIUS*2-.25,thickness:.50,tessellation:90},scene);
  rim.position.y=.035;rim.material=trim;rim.isPickable=false;
  const inner=B.MeshBuilder.CreateTorus('arena inner grass edge',{
    diameter:ARENA_RADIUS*2-1.06,thickness:.13,tessellation:90},scene);
  inner.position.y=.075;inner.material=edge;inner.isPickable=false;
  // Color blocks and little stone stepping chips keep the green field readable
  // without noisy textures, opaque ponds, or dark circular stains.
  const colors=['#59b858','#80c446','#43b68c','#e7c26b','#f3a85b','#f16fa0','#a97ce4'];
  const materials=colors.map((color,i)=>candyMaterial(scene,'arena confetti '+i,color,{shine:.06}));
  const stone=candyMaterial(scene,'smooth gold stone','#e4c27c',{shine:.11});
  const wood=candyMaterial(scene,'rich brown trunks','#a65d38',{shine:.11});
  const leaf=[candyMaterial(scene,'outer canopy lime','#58b82e',{shine:.14}),
    candyMaterial(scene,'outer canopy emerald','#1ba785',{shine:.14}),
    candyMaterial(scene,'outer canopy bright green','#8cd53c',{shine:.13}),
    candyMaterial(scene,'outer canopy coral','#f27965',{shine:.13})];
  const rand=rng(4069);
  for(let i=0;i<54;i++){
    const a=rand()*Math.PI*2,r=2+Math.sqrt(rand())*9.8;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const material=materials[i%materials.length],s=.1+rand()*.18;
    addSphere(scene,'tiny saturated meadow petal',material,x,.094,z,s,.04,s*.60);
  }
  // Carefully placed peripheral vegetation: the combat center stays clear.
  for(let i=0;i<28;i++){
    const a=i*Math.PI*2/28+.10*(rand()-.5),r=ARENA_RADIUS+.6+rand()*1.15;
    const x=Math.cos(a)*r,z=Math.sin(a)*r,s=.73+rand()*.40;
    const trunk=B.MeshBuilder.CreateCylinder('bright garden tree trunk',
      {height:1.65*s,diameterTop:.38*s,diameterBottom:.62*s,tessellation:9},scene);
    trunk.position.set(x,.73*s,z);trunk.material=wood;trunk.isPickable=false;
    addSphere(scene,'plump canopied treetop',leaf[i%leaf.length],x,2*s,z,
      1.75*s,1.42*s,1.58*s);
    addSphere(scene,'curved leafy shoulder',leaf[(i+1)%leaf.length],x+.5*s,1.93*s,z+.10,
      1.02*s,.9*s,1.10*s);
    if(i%2===0)addSphere(scene,'pebble between garden trees',stone,
      x*.93,.17,z*.93,.52,.28,.45);
  }
  const camera=new B.FreeCamera('close follow mobile camera',V(0,19,-10),scene);
  camera.mode=B.Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ=.08;camera.maxZ=100;scene.activeCamera=camera;
  function resize(engine){
    const w=Math.max(1,engine.getRenderWidth()),h=Math.max(1,engine.getRenderHeight());
    const aspect=w/h,halfWidth=CAMERA_WIDTH*.5;
    camera.orthoLeft=-halfWidth;camera.orthoRight=halfWidth;
    camera.orthoTop=halfWidth/aspect;camera.orthoBottom=-halfWidth/aspect;
  }
  function follow(x,z,dt){
    const rate=1-Math.exp(-Math.max(0,dt)*6.8);
    const target=V(x,19,z-10);
    camera.position=B.Vector3.Lerp(camera.position,target,rate);
    camera.setTarget(V(camera.position.x,0,camera.position.z+10.7));
  }
  return {camera,resize,follow,dispose:()=>{}};
}
