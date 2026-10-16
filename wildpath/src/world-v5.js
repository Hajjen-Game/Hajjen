// Wildpath v0.5 — compact mobile fantasy adventure inspired by tower-defense map composition.
// The vegetation is softly rounded, but every ROAD segment is axis-aligned.
import { STAGE_GATES } from './config.js?v=0.6.0';
import { BOARD_START, BOARD_END, BOARD_HALF_WIDTH, ROAD_HALF_WIDTH, WAYPOINTS,
  pathX, isOnRoad, rectsForRoad } from './layout-v5.js?v=0.6.0';
export { createActor, ring, disc, lightOrb } from './world.js';
export { pathX, isOnRoad } from './layout-v5.js?v=0.6.0';

const B=window.BABYLON;
const rng=(seed)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function mat(scene,name,hex,glow=.07){
  const c=B.Color3.FromHexString(hex),m=new B.StandardMaterial(name,scene);
  m.diffuseColor=c;m.ambientColor=c.scale(.28);m.emissiveColor=c.scale(glow);
  m.specularColor=new B.Color3(.025,.027,.026);return m;
}
function box(scene,name,w,h,d,x,y,z,m){
  const mesh=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
  mesh.position.set(x,y,z);mesh.material=m;mesh.isPickable=false;return mesh;
}
function orbSource(scene,name,m){
  const t=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:12},scene);
  t.position.y=-1000;t.material=m;t.isPickable=false;return t;
}
function trunkSource(scene,name,m){
  const t=B.MeshBuilder.CreateCylinder(name,{height:1,diameterTop:.7,diameterBottom:1,tessellation:12},scene);
  t.position.y=-1000;t.material=m;t.isPickable=false;return t;
}
function inst(t,name,x,y,z,sx,sy,sz){
  const m=t.createInstance(name);m.position.set(x,y,z);m.scaling.set(sx,sy,sz);
  m.isPickable=false;return m;
}
function makeRoad(scene){
  const soil=mat(scene,'island sides','#40564a',.1);
  const turf=mat(scene,'soft green meadow','#56745d',.09);
  const rim=mat(scene,'edge trim','#253d35',.08);
  const shadow=mat(scene,'dark paving outer edge','#59624f',.08);
  const paving=mat(scene,'clean blue-grey stone path','#a28d70',.17);
  const worn=mat(scene,'subtle central road light','#b3a080',.11);
  const seams=mat(scene,'paving tile boundaries','#a18d74',.07);
  const length=BOARD_END-BOARD_START,mid=(BOARD_START+BOARD_END)/2;
  box(scene,'raised island',BOARD_HALF_WIDTH*2,1.4,length,0,-1,mid,soil);
  box(scene,'solid edge trim',BOARD_HALF_WIDTH*2+.25,.17,length+.15,0,-.205,mid,rim);
  box(scene,'meadow top',BOARD_HALF_WIDTH*2,.16,length,0,-.057,mid,turf);
  for(const [i,rd] of rectsForRoad().entries()){
    // Adjacent orthogonal rectangles have mathematically sharp corners.
    box(scene,'street edge '+i,rd.w+.32,.08,rd.d+.32,rd.x,.07,rd.z,shadow);
    box(scene,'level one straight street '+i,rd.w,.08,rd.d,rd.x,.122,rd.z,paving);
    const horiz=rd.segment.horizontal;
    const iw=horiz?rd.w-.5:rd.w-1.1, iz=horiz?rd.d-1.1:rd.d-.5;
    box(scene,'worn road inlay '+i,iw,.013,iz,rd.x,.172,rd.z,worn);
    // Smooth earthy route: no city-like grid lines or asphalt tiles.
  }
  // Hide overlaps as a square-crossing instead of a rounded polygon.
  for(const p of WAYPOINTS.slice(1,-1)){
    box(scene,'square sharp road intersection',ROAD_HALF_WIDTH*2,.09,ROAD_HALF_WIDTH*2,p.x,.125,p.z,paving);
    box(scene,'square worn corner paving',ROAD_HALF_WIDTH*2-1.15,.014,ROAD_HALF_WIDTH*2-1.15,p.x,.182,p.z,worn);
  }
}
export function createWorld(scene){
  const random=rng(2416),pick=a=>a[Math.floor(random()*a.length)];
  makeRoad(scene);
  const leaf=['#456c55','#5a8063','#709372','#4b765b','#7c9a77','#83a17b'].map((c,i)=>
    orbSource(scene,'leaf source '+i,mat(scene,'leaf '+i,c,.1)));
  const bark=trunkSource(scene,'wood trunk',mat(scene,'wood bark','#756253'));
  const rocks=['#828e92','#8b8d84','#7a8493'].map((c,i)=>
    orbSource(scene,'rock source '+i,mat(scene,'rock '+i,c,.08)));
  const shrubs=['#668876','#839a7d','#807c98'].map((c,i)=>
    orbSource(scene,'shrubs source '+i,mat(scene,'shrub '+i,c,.12)));
  const flowers=['#ccb2b7','#e1bd9c','#b6c9b3'].map((c,i)=>
    orbSource(scene,'small flowers '+i,mat(scene,'flower '+i,c,.2)));

  function tree(x,z,s){
    const k=Math.floor(random()*leaf.length);
    inst(bark,'trunk',x,.82*s,z,.47*s,1.62*s,.47*s);
    inst(leaf[k],'round leafy tree',x,2.14*s,z,2.25*s,1.83*s,2.18*s);
    inst(leaf[k],'round canopy extension',x-.6*s,1.94*s,z+.2*s,1.63*s,1.54*s,1.52*s);
    inst(leaf[(k+1)%leaf.length],'round canopy lobe',x+.55*s,1.97*s,z-.3*s,1.59*s,1.44*s,1.6*s);
  }
  function shrub(x,z,s){inst(pick(shrubs),'round shrub',x,.27*s,z,1.20*s,.62*s,1.06*s);}
  function stone(x,z,s){inst(pick(rocks),'round stone',x,.28*s,z,1.28*s,.63*s,.94*s);}
  // Visible scenery rows on both sides create separate "nature blocks"
  // rather than a random open-world carpet.
  for(let z=BOARD_START+2;z<BOARD_END-2;z+=5.2){
    for(const side of [-1,1]){
      const x=side*(BOARD_HALF_WIDTH-1.7-random()*1.25);
      if(isOnRoad(x,z,1.1))continue;
      if(random()<.73)tree(x,z,.65+random()*.23);
      else if(random()<.75)shrub(x,z,.83+random()*.3);
      else stone(x,z,.7+random()*.5);
    }
  }
  for(let z=BOARD_START+4;z<BOARD_END-2;z+=5.8){
    for(let x=-BOARD_HALF_WIDTH+4.1;x<BOARD_HALF_WIDTH-3.4;x+=5.0){
      const xx=x+(random()-.5)*1.3,zz=z+(random()-.5)*1.4;
      if(isOnRoad(xx,zz,2.6))continue;
      const n=random();
      if(n<.33)tree(xx,zz,.58+random()*.16);
      else if(n<.75)shrub(xx,zz,.55+random()*.44);
      else stone(xx,zz,.54+random()*.25);
    }
  }
  for(let i=0;i<82;i++){
    const x=(random()-.5)*(BOARD_HALF_WIDTH*2-2),z=BOARD_START+random()*(BOARD_END-BOARD_START);
    if(isOnRoad(x,z,1))continue;
    const s=.12+random()*.09;
    inst(pick(flowers),'little fantasy flower',x,.18,z,s,.15,s);
  }
  // Checkpoints never obscure the playable road.
  const milestone=orbSource(scene,'standing stone',mat(scene,'milestone material','#84948d',.1));
  const sparkle=orbSource(scene,'milestone glow',mat(scene,'pale lantern','#b9e1bf',.62));
  const gateMarkers=[];
  STAGE_GATES.forEach((z,stage)=>{
    const x=pathX(z);
    for(const side of [-1,1]){
      const gx=x+side*(ROAD_HALF_WIDTH+.7);
      const st=inst(milestone,'milestone standing stone',gx,.87,z,.76,1.74,.62);
      const orb=inst(sparkle,'glowing milestone top',gx,1.92,z,.32,.37,.3);
      gateMarkers.push({st,orb,stage});
    }
  });
  return {gateMarkers};
}
