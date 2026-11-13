// SKYSHIFT 0.4.8 — Boost Lanes & Zone Surface Language.
// Large readable ribbons / directional fields, not repeated tiny decals.
// All content is flat with the same authoritative road banking; this adds
// no collision obstacles, flashing screen overlays or new point lights.
import {TRIAL,positionAt,widthAt} from "./trial-v048.mjs";
import {BOOST_PADS} from "./boost-v048.mjs";
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const ZONE_SURFACE=Object.freeze({
 theme:"Festival velocity / abstract zone ribbon",
 macroFieldColor:0xad60e2, // visible secondary violet vs blue road
 boostFieldColor:0xffc46f, // warm amber unmistakable boost signal
 lineAccentColor:0x9ff6f8, // cool tertiary luminous inlays
 geometryHeight:.064,
 fieldCount:8,
 boostPadCount:2,
 drawBatches:3,
 paletteReady:true,
 flashing:false
});
export const MACRO_FIELDS=Object.freeze([
 Object.freeze({id:"opening-slash",start:6,end:18,from:-7.1,to:3.8,width:3.4}),
 Object.freeze({id:"turn-in-left",start:63,end:84,from:7.0,to:-3.5,width:3.5}),
 Object.freeze({id:"left-sweep-a",start:126,end:155,from:-6.3,to:6.1,width:4.1}),
 Object.freeze({id:"left-sweep-b",start:176,end:205,from:6.7,to:-6.5,width:3.8}),
 Object.freeze({id:"central-arc",start:228,end:251,from:-6.9,to:7.1,width:3.6}),
 Object.freeze({id:"right-sweep-a",start:323,end:352,from:6.5,to:-6.4,width:4.1}),
 Object.freeze({id:"right-sweep-b",start:380,end:409,from:-6.6,to:6.3,width:3.8}),
 Object.freeze({id:"finish-sash",start:480,end:503,from:6.4,to:-6.7,width:4.3})
]);
export const MACRO_CHEVRONS=Object.freeze([74,266,430]);
function batch(){return {positions:[],values:[],triangles:0,quads:0};}
function quad(batch,a,b,c,d,weight=1){
 for(const p of [a,b,c,a,c,d]){
  batch.positions.push(p.x,p.y,p.z);
  batch.values.push(weight,weight,weight);
 }
 batch.quads++;batch.triangles+=2;
}
// Sweep between two tracks points; sample in arc-length, so projected
// markings follow the C2 transitions and bank with the asphalt.
function ribbon(batch,start,end,from,to,width,weight,height=ZONE_SURFACE.geometryHeight){
 const steps=Math.max(1,Math.ceil((end-start)/.75));
 for(let i=0;i<steps;i++){
  const a=i/steps,b=(i+1)/steps;
  const la=mix(from,to,a),lb=mix(from,to,b);
  const sa=mix(start,end,a),sb=mix(start,end,b);
  const x=width/2;
  quad(batch,positionAt(sa,la-x,height),positionAt(sa,la+x,height),
   positionAt(sb,lb+x,height),positionAt(sb,lb-x,height),weight);
 }
}
export function buildZoneSurfaceData(){
 const field=batch(),boost=batch(),details=batch();
 // Eight broad structural bands whose scale reads at 45-60m/s.
 for(const f of MACRO_FIELDS)
  ribbon(field,f.start,f.end,f.from,f.to,f.width,.85);
 // Occasional giant V direction fields—not a dense field of small arrows.
 for(const s of MACRO_CHEVRONS){
  ribbon(field,s,s+8,-6.4,-.3,1.65,.66);
  ribbon(field,s,s+8,6.4,.3,1.65,.66);
 }
 for(const pad of BOOST_PADS){
  const center=(pad.lateralMin+pad.lateralMax)/2;
  const width=pad.lateralMax-pad.lateralMin;
  // One wide inlaid amber patch per straight with a clean matte edge.
  ribbon(boost,pad.start,pad.end,center,center,width,.78,.073);
  // Dual cyan rails stay WITHIN the booster instead of across the road.
  ribbon(details,pad.start+.3,pad.end-.3,pad.lateralMin+.35,
   pad.lateralMin+.35,.12,.62,.089);
  ribbon(details,pad.start+.3,pad.end-.3,pad.lateralMax-.35,
   pad.lateralMax-.35,.12,.62,.089);
  // Two wide, forward pointing chevrons per pad: instantly legible boost.
  for(const s of [pad.start+3.5,pad.start+10]){
   ribbon(details,s,s+3.5,center-3.0,center-.25,.78,1,.096);
   ribbon(details,s,s+3.5,center+3.0,center+.25,.78,1,.096);
  }
 }
 return {
  fields:field,boost,details,
  macroFields:MACRO_FIELDS.length,
  macroChevrons:MACRO_CHEVRONS.length,
  boostPads:BOOST_PADS.length,
  triangles:field.triangles+boost.triangles+details.triangles,
  paletteAnchors:[0,95,222,292,424,TRIAL.length]
 };
}
function makeGeometry(THREE,b){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(b.positions,3));
 g.setAttribute("color",new THREE.Float32BufferAttribute(b.values,3));
 g.computeVertexNormals();g.computeBoundingSphere();
 return g;
}
export function installZoneSurface(THREE,world){
 const data=buildZoneSurfaceData();
 const layers=[
  {name:"Zone-scale violet macro racing fields",part:data.fields,
   color:ZONE_SURFACE.macroFieldColor,alpha:.56},
  {name:"Embedded amber straight boost fields",part:data.boost,
   color:ZONE_SURFACE.boostFieldColor,alpha:.73},
  {name:"Cool inset chevrons and booster border details",part:data.details,
   color:ZONE_SURFACE.lineAccentColor,alpha:.80}
 ];
 const meshes=layers.map((layer,i)=>{
  const material=new THREE.MeshBasicMaterial({
   color:layer.color,vertexColors:true,transparent:true,
   opacity:layer.alpha,depthWrite:false,side:THREE.DoubleSide,
   toneMapped:true,polygonOffset:true,polygonOffsetFactor:-1,
   polygonOffsetUnits:-1
  });
  const mesh=new THREE.Mesh(makeGeometry(THREE,layer.part),material);
  mesh.name=layer.name;mesh.frustumCulled=false;
  mesh.renderOrder=4+i;world.add(mesh);
  return mesh;
 });
 return {
  plan:["macro-fields","large-chevron-identity","straight-boost-tiles","zone-palette-anchors"],
  drawBatches:ZONE_SURFACE.drawBatches,
  macroFields:data.macroFields,
  macroChevrons:data.macroChevrons,
  boostPads:data.boostPads,
  triangleCount:data.triangles,
  paletteAnchors:data.paletteAnchors,
  setZonePalette(patternHex,boostHex,accentHex){
   // Material-only recoloring is reserved for a future zone-wave feature.
   meshes[0].material.color.setHex(patternHex);
   meshes[1].material.color.setHex(boostHex);
   meshes[2].material.color.setHex(accentHex);
  },
  dispose(){
   for(const mesh of meshes){
    mesh.removeFromParent();
    mesh.geometry.dispose();mesh.material.dispose();
   }
  }
 };
}
