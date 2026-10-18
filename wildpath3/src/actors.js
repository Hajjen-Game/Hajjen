// Original chunky, saturated mobile silhouettes; materials shared per scene.
import {candyMaterial} from './arena.js';
const B=window.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);
const matCache=new WeakMap();
function mat(scene,key,color,shine=.21){
  let cache=matCache.get(scene);
  if(!cache){cache=new Map();matCache.set(scene,cache);}
  if(!cache.has(key))cache.set(key,candyMaterial(scene,'arcade '+key,color,{shine,emission:.035}));
  return cache.get(key);
}
function shape(root,scene,name,material,x,y,z,sx,sy,sz){
  const mesh=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:14},scene);
  mesh.parent=root;mesh.position=V(x,y,z);mesh.scaling=V(sx,sy,sz);
  mesh.material=material;mesh.isPickable=false;
  return mesh;
}
export function createCharacter(scene,type='hero'){
  const colors={
    hero:['#00c9dc','#48e7d9','#0c577d','#084455'],
    mossling:['#73d133','#b5ed62','#337a4d','#224b44'],
    bramble:['#eb6581','#ffa166','#87466e','#452b56'],
    ember:['#ff9d31','#ffe16e','#ae4d54','#53333d'],
    guardian:['#9b61db','#d1a1f1','#554483','#33314f']
  };
  const [body,head,trim,dark]=colors[type]||colors.mossling;
  const root=new B.TransformNode('wildpath3 '+type,scene);
  const primary=mat(scene,type+' body',body),light=mat(scene,type+' face',head);
  const accent=mat(scene,type+' trim',trim),darkMat=mat(scene,type+' features',dark,.05);
  const depth=type==='guardian'?1.43:type==='hero'?1.1:.94;
  const torso=shape(root,scene,'rounded '+type+' body',primary,0,.69*depth,0,
    1.20*depth,1.15*depth,1.01*depth);
  shape(root,scene,'giant arcade character head',light,0,1.31*depth,-.07,
    1.12*depth,.92*depth,.99*depth);
  // Colored forehead and dark eyes face the camera; tiny sharp highlights only.
  shape(root,scene,'dark facial visor',accent,0,1.33*depth,-.51*depth,
    .78*depth,.35*depth,.095*depth);
  for(const x of [-.23,.23])
    shape(root,scene,'readable black eye',darkMat,x*depth,1.43*depth,-.58*depth,
      .11*depth,.14*depth,.065*depth);
  if(type==='hero'){
    shape(root,scene,'blue hero crown',primary,0,1.78*depth,.12*depth,
      .72*depth,.25*depth,.55*depth);
    for(const s of [-1,1])
      shape(root,scene,'cute hero glove',light,s*.62*depth,.77*depth,-.05,
        .32*depth,.43*depth,.34*depth);
    shape(root,scene,'hero spell focus',mat(scene,'focus','#ffce42'),.69,1.0,-.44,
      .23,.23,.23);
  } else if(type==='bramble'){
    for(const s of [-1,1])shape(root,scene,'pink thorn ears',primary,s*.52,1.80,.05,.34,.47,.35);
  } else if(type==='ember'){
    shape(root,scene,'ember golden flame',mat(scene,'amber flame','#ffd341'),0,1.81,-.02,.48,.55,.42);
  } else if(type==='guardian'){
    shape(root,scene,'guardian purple crown',accent,0,2.52,.10,1.05,.43,.79);
    for(const s of [-1,1])shape(root,scene,'guardian shoulder',primary,s*.83,1.12,0,.55,.56,.55);
  }
  const contact=B.MeshBuilder.CreateDisc('arcade soft ground shadow',{radius:.86*depth,
    tessellation:32},scene);
  contact.rotation.x=Math.PI/2;contact.position.y=.088;contact.parent=root;
  contact.material=mat(scene,'ground shade','#1b5f58',.01);contact.isPickable=false;
  contact.material.alpha=.23;contact.material.disableLighting=true;
  contact.scaling.y=.58;
  return {root,torso,baseY:0,dispose(){root.dispose(false,false);}};
}
export function setCharacterPose(actor,x,z,t,velocity=0){
  actor.root.position.set(x,Math.abs(Math.sin(t*9))*Math.min(.07,velocity*.016),z);
  // Camera-visible movement bounce; no large strobing light.
  actor.root.rotation.y=Math.sin(t*3.2)*.05;
}
