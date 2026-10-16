// Wildpath Visual Pass 0.3 — portrait-first, finite-width fantasy trail.
// The board is a long 3D diorama; the camera shows its full width and follows the northward journey.
import { STAGE_GATES } from './config.js?v=0.3.1';
export { createActor, ring, disc, lightOrb } from './world.js';

const B = window.BABYLON;
const V = (x,y,z)=>new B.Vector3(x,y,z);
const rng=(seed)=>()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
const mix=(a,b,t)=>a+(b-a)*t;
const COLORS={
  earth:'#5b7158', grass:'#66805f', meadow:'#769069', grassLight:'#899b72',
  road:'#78839a', roadLight:'#8792a9', edge:'#515d70',
  soil:'#344a43', cliff:'#344c45', bark:'#736052', stone:'#838e8d'
};

export const BOARD_HALF_WIDTH=13.5;
export const CAMERA_WORLD_WIDTH=29.4;
export const TRAIL_HALF_WIDTH=4.7;
export const TRAIL_END=STAGE_GATES[STAGE_GATES.length-1]+12;
// Distinct bends like the reference image, with room for the caster and melee to fight.
export const pathX=z=>2.4*Math.sin(z/17)+1.05*Math.sin(z/7.3)+.65*Math.sin(z/35);
export const trailLimit=z=>Math.min(BOARD_HALF_WIDTH-1.65,Math.abs(pathX(z))+TRAIL_HALF_WIDTH+2.3);

function material(scene,name,hex,glow=0){
  const m=new B.StandardMaterial(name,scene),c=B.Color3.FromHexString(hex);
  m.diffuseColor=c;m.ambientColor=c.scale(.4);
  m.specularColor=new B.Color3(.02,.026,.02);
  if(glow>0)m.emissiveColor=c.scale(glow);
  return m;
}
function planeStrip(scene,name,halfWidth,hex,height){
  const pos=[],indices=[],normals=[],n=570,start=-47,end=TRAIL_END+2;
  for(let i=0;i<=n;i++){
    const z=mix(start,end,i/n);
    const mid=pathX(z),spread=halfWidth+.10*Math.sin(z/5.3);
    pos.push(mid-spread,height,z,mid+spread,height,z);
  }
  for(let i=0;i<n;i++){
    const p=2*i;
    // +Y facing: increasing Z cross increasing X.
    indices.push(p,p+2,p+1,p+1,p+2,p+3);
  }
  B.VertexData.ComputeNormals(pos,indices,normals);
  const vd=new B.VertexData();vd.positions=pos;vd.indices=indices;vd.normals=normals;
  const mesh=new B.Mesh(name,scene);vd.applyToMesh(mesh);
  mesh.material=material(scene,name+' material',hex,.09);
  mesh.material.backFaceCulling=false;
  mesh.isPickable=false;mesh.freezeWorldMatrix();
  return mesh;
}
function sceneBox(scene,name,w,h,d,x,y,z,mat){
  const mesh=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
  mesh.position.set(x,y,z);mesh.material=mat;mesh.isPickable=false;
  return mesh;
}
function sourceSphere(scene,name,mat,segments=12){
  const mesh=B.MeshBuilder.CreateSphere(name,{diameter:1,segments},scene);
  mesh.position.y=-1000;mesh.material=mat;mesh.isPickable=false;
  return mesh;
}
function sourceCylinder(scene,name,mat){
  const mesh=B.MeshBuilder.CreateCylinder(name,{height:1,diameterTop:.72,diameterBottom:1,tessellation:12},scene);
  mesh.position.y=-1000;mesh.material=mat;mesh.isPickable=false;
  return mesh;
}
function instance(t,name,x,y,z,sx,sy,sz,turn=0){
  const m=t.createInstance(name);
  m.position.set(x,y,z);m.scaling.set(sx,sy,sz);m.rotation.y=turn;
  m.isPickable=false;return m;
}
function makeGround(scene,end){
  const top=material(scene,'soft dark meadows',COLORS.grass,.13);
  const side=material(scene,'raised board dark vertical sides',COLORS.cliff,.07);
  const border=material(scene,'dark meadow outer rim','#364e45',.07);
  // A real rectangular board, rather than an endless forest floor.
  const start=-49,length=end-start+4,mid=(start+end+4)/2;
  sceneBox(scene,'solid raised forest island',27.15,1.15,length,0,-.79,mid,side);
  sceneBox(scene,'clean forest island lip',27.25,.20,length,0,-.20,mid,border);
  sceneBox(scene,'walkable grass tabletop',26.9,.11,length-.14,0,-.08,mid,top);

  // Small rounded ground patches give depth without noisy tile textures.
  const patches=[
    material(scene,'sage moss patches','#839372',.16),
    material(scene,'teal moss patches','#577b6c',.15),
    material(scene,'deep fern patches','#536e5e',.14),
  ];
  const dots=patches.map((m,i)=>sourceSphere(scene,'meadow patch source '+i,m,10));
  const r=rng(47273);
  for(let i=0;i<170;i++){
    const z=-45+r()*(end+45),x=(r()-.5)*24.6;
    if(Math.abs(x-pathX(z))<6.3)continue;
    const size=.65+r()*1.3;
    instance(dots[Math.floor(r()*dots.length)],'rounded patch of forest moss',x,.025,z,size,.07,size*.83,r()*6.3);
  }
}
export function createWorld(scene){
  const end=TRAIL_END,r=rng(921170),choice=a=>a[Math.floor(r()*a.length)];
  makeGround(scene,end);

  // Explicit high-contrast winding road; no meshes hidden below a separate terrain.
  planeStrip(scene,'soft valley path shadow',5.65,COLORS.soil,.070);
  planeStrip(scene,'slate border on the road',5.11,COLORS.edge,.078);
  planeStrip(scene,'broad blue-grey forest road',4.90,COLORS.road,.091);
  planeStrip(scene,'worn center of trail',3.56,COLORS.roadLight,.100);

  // Repeating slabs and pebbles break up the broad road without low-poly squares.
  const pebbleMats=[
    material(scene,'soft road pebble 1','#a1a7b3',.10),
    material(scene,'soft road pebble 2','#6c788e',.1)
  ];
  const pebbleSrc=pebbleMats.map((m,i)=>sourceSphere(scene,'road pebble source '+i,m,9));
  for(let i=0;i<125;i++){
    const z=1+r()*(end-5),x=pathX(z)+(r()-.5)*8;
    const s=.11+r()*.2;
    instance(choice(pebbleSrc),'smooth stone fleck in trail',x,.134,z,s,.06,s*.66);
  }

  const leafMats=[
    material(scene,'rounded spruce green','#416e64',.09),
    material(scene,'dusk jade','#548779',.11),
    material(scene,'soft teal','#628f82',.1),
    material(scene,'forest mint','#789987',.11),
    material(scene,'moss and pine','#537665',.1),
    material(scene,'sage forest','#819680',.1)
  ];
  const leaf=leafMats.map((m,i)=>sourceSphere(scene,'broadleaf foliage '+i,m,12));
  const bark=sourceCylinder(scene,'smooth trunks',material(scene,'cedar wood',COLORS.bark,.07));
  const rockMats=[
    material(scene,'round grey rocks','#8a9092',.12),
    material(scene,'dusky violet boulders','#757c8b',.11),
    material(scene,'mossy river stone','#718578',.12)
  ];
  const rocks=rockMats.map((m,i)=>sourceSphere(scene,'smooth stone source '+i,m,12));
  const bushes=[
    sourceSphere(scene,'short leaf bushes',material(scene,'fern green','#719173',.1),10),
    sourceSphere(scene,'purple bushes',material(scene,'dusky heather','#858195',.13),10),
    sourceSphere(scene,'blueleaf shrubs',material(scene,'bluish shrubs','#55837a',.1),10),
  ];
  const shadow=sourceSphere(scene,'soft ground shadow source',material(scene,'soft canopy shadow','#43594e',.05),10);
  const flower=[
    sourceSphere(scene,'pale flowers',material(scene,'small wildflowers','#b9a5be',.15),8),
    sourceSphere(scene,'warm flowers',material(scene,'golden buds','#c5b586',.12),8)
  ];

  const tree=(x,z,s)=>{
    const leafIndex=Math.floor(r()*leaf.length);
    instance(shadow,'tree shade',x,.11,z,2.5*s,.026,1.9*s);
    instance(bark,'round brown tree trunk',x,.73*s,z,.39*s,1.45*s,.39*s,r()*6.28);
    instance(leaf[leafIndex],'tree rounded main canopy',x,1.90*s,z,2.1*s,1.73*s,2*s,r()*6.28);
    instance(leaf[leafIndex],'tree canopy left',x-.56*s,1.76*s,z+.34*s,1.62*s,1.38*s,1.53*s);
    instance(leaf[(leafIndex+2)%leaf.length],'tree canopy right',x+.61*s,1.81*s,z-.24*s,1.5*s,1.42*s,1.58*s);
  };
  const bush=(x,z,s)=>instance(choice(bushes),'small leafy thicket',x,.23*s,z,1.06*s,.56*s,.98*s,r()*6.28);
  const stone=(x,z,s)=>instance(choice(rocks),'rounded grey boulder',x,.2*s,z,1.1*s,.55*s,.96*s,r()*6.28);

  // Two readable scenery rails along the fixed board sides, instead of an open world.
  // Their jitter is constrained so neither trees nor rocks wander off the island.
  for(let z=-43;z<end;z+=4.25){
    for(const side of [-1,1]){
      const x=side*(10.25+r()*1.6),zz=z+(r()-.5)*2.1;
      if(r()<.73)tree(x,zz,.73+r()*.25);
      else if(r()<.68)stone(x,zz,.8+r()*.47);
      else bush(x,zz,.9+r()*.45);
    }
  }
  // Pathside vegetation is sparse and curated, leaving its curves clearly visible.
  for(let z=-41;z<end;z+=7.4){
    for(const side of [-1,1]){
      const center=pathX(z),x=center+side*(6.1+r()*.64);
      if(Math.abs(x)>9.5)continue;
      if(r()<.43)bush(x,z,.62+r()*.5);
      else stone(x,z,.55+r()*.33);
    }
  }
  for(let i=0;i<180;i++){
    const z=-44+r()*(end+44),sign=r()<.5?-1:1,x=sign*(7.2+r()*5.6);
    if(Math.abs(x-pathX(z))<5.65)continue;
    if(r()<.66)bush(x,z,.34+r()*.44);
    else stone(x,z,.3+r()*.45);
  }
  for(let i=0;i<130;i++){
    const z=-44+r()*(end+44),x=(r()-.5)*25;
    if(Math.abs(x-pathX(z))<5.6)continue;
    instance(choice(flower),'tiny flower in meadow',x,.14,z,.13,.18,.14);
  }

  // Milestone markers remain on the route and are always visible as a pair.
  const landmark=sourceSphere(scene,'standing stone template',rockMats[0]);
  const glow=sourceSphere(scene,'shimmering checkpoint',material(scene,'sea glass checkpoint','#b8ead1',.85));
  const gateMarkers=[];
  STAGE_GATES.forEach((z,stage)=>{
    for(const side of [-1,1]){
      const x=pathX(z)+side*5.72;
      const st=instance(landmark,'checkpoint upright stone',x,.87,z,.74,1.70,.70);
      const orb=instance(glow,'checkpoint glowing stone',x,1.84,z,.30,.40,.30);
      gateMarkers.push({st,orb,stage});
    }
  });
  return {gateMarkers,dispose:()=>scene.meshes.slice().forEach(m=>m.dispose())};
}
