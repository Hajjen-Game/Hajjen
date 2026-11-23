// SKYSHIFT 0.20.0 — Offline-authored 3D station bay library (glTF 2.0).
// Reproducible *asset authoring*, NOT a new runtime mesh generator.
// Generates the checked-in scene asset with three spatially coherent bays,
// pre-authored PBR materials and physically open panorama windows.
// Usage: node skyshift/build-station-world-v0200.mjs > skyshift/assets/worlds/continuum-bays-v1.gltf
export const STATION_ART_0200=Object.freeze({
 id:"continuum-station-bays-v1",format:"glTF 2.0",
 bayLengthMeters:16,bayTypes:Object.freeze(["PANORAMA","SERVICE","GATE"]),
 shellMaterial:"Titanium Architectural Shell",detailMaterial:"Inset Alloy",
 energyMaterial:"Recessed Lighting",windowMaterial:"Panoramic Glass",
 minSideClearance:23.4,minOverheadClearance:34,
 controlledEmissive:true,noiseFreeBackdrop:true,
 deliberatelyOpenWindows:true,authoredMeshes:12
});
const palette=Object.freeze({
 shell:0x32485d,side:0x25374a,roof:0x36495c,roofLit:0x40576b,
 rim:0x52697d,bevel:0x485d70,under:0x182839,recess:0x142438,
 fascia:0x405b73,panel:0x2e465c,panelLit:0x3d5d72,
 warm:0xa9a1a0,cool:0x8bbacb,
 whiteCore:0xc3f6ff,cove:0x56d6eb,coveWarm:0xffbda4,
 glass:0x254b69
});
const Vec=(x,y,z)=>[x,y,z];
const floatColor=(hex)=>[((hex>>16)&255)/255,((hex>>8)&255)/255,(hex&255)/255];
function surface(){
 const coords=[],normals=[],colors=[];
 function tri(a,b,c,color){
  const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
  const v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
   u[0]*v[1]-u[1]*v[0]];
  const len=Math.hypot(...n)||1;n=n.map(x=>x/len);
  for(const p of [a,b,c]){
   coords.push(...p);normals.push(...n);colors.push(...floatColor(color));
  }
 }
 return {
  coords,normals,colors,
  quad(a,b,c,d,col){tri(a,b,c,col);tri(a,c,d,col)},
  triangle:tri,
  rectangle(x0,y0,z0,x1,y1,z1,color){
   // axis-aligned six-sided solid with actual recessed depth.
   const A=Vec(x0,y0,z0),B=Vec(x1,y0,z0),C=Vec(x1,y1,z0),D=Vec(x0,y1,z0);
   const E=Vec(x0,y0,z1),F=Vec(x1,y0,z1),G=Vec(x1,y1,z1),H=Vec(x0,y1,z1);
   this.quad(A,B,C,D,color);this.quad(E,H,G,F,color);
   this.quad(A,E,F,B,color);this.quad(D,C,G,H,color);
   this.quad(A,D,H,E,color);this.quad(B,F,G,C,color);
  }
 };
}
function stationBay(kind){
 const shell=surface(),inlay=surface(),energy=surface(),glass=surface();
 const zLeft=-8,zRight=8;
 // Four-sided faceted structural hull. The recurring cross-section is a real
 // architectural grammar, not random floating pieces on the space backdrop.
 for(const sign of [-1,1]){
  const X=l=>sign*l;
  const sideFace=(s,x,yo,yt,from,to,col)=>{
   const a=Vec(X(x),yo,from),b=Vec(X(x),yt,from),
   c=Vec(X(x),yt,to),d=Vec(X(x),yo,to);
   s.quad(a,b,c,d,col);
  };
  // A continuous armored plinth with an inset center sill.
  shell.rectangle(Math.min(X(28.5),X(25.4)),-3.2,zLeft,
   Math.max(X(28.5),X(25.4)),9.8,zRight,palette.side);
  inlay.rectangle(Math.min(X(25.28),X(25.02)),1,zLeft+.55,
   Math.max(X(25.28),X(25.02)),7.5,zRight-.55,palette.panel);
  // Long panel recesses, aligned across neighboring bays.
  for(const z of [-5.5,-1.7,2.1,5.8]){
   inlay.rectangle(Math.min(X(24.95),X(24.72)),2,z-.95,
    Math.max(X(24.95),X(24.72)),6.6,z+.95,
    (z<0?palette.fascia:palette.panel));
  }
  // Upper lintel: all windows share a single continuous horizontal datum.
  shell.rectangle(Math.min(X(28.4),X(24.6)),29.8,zLeft,
   Math.max(X(28.4),X(24.6)),36.2,zRight,palette.roof);
  inlay.rectangle(Math.min(X(24.55),X(24.28)),30.4,zLeft+.55,
   Math.max(X(24.55),X(24.28)),33.2,zRight-.55,palette.bevel);
  // Panoramic aperture is genuinely cut out: only tiny glass inset.
  if(kind!=="SERVICE"){
   glass.quad(Vec(X(25.0),10.4,-7.4),Vec(X(25.0),29.5,-7.4),
    Vec(X(25.0),29.5,7.4),Vec(X(25.0),10.4,7.4),
    palette.glass);
  }else{
   // Service wings are still one coherent room, but inset armor replaces
   // 70% of the giant glazing. Only a deliberate narrow view slot remains.
   shell.rectangle(Math.min(X(25.0),X(24.2)),10.1,-8,
    Math.max(X(25.0),X(24.2)),17.0,8,palette.side);
   shell.rectangle(Math.min(X(25.0),X(24.2)),23.1,-8,
    Math.max(X(25.0),X(24.2)),29.7,8,palette.roof);
   glass.quad(Vec(X(24.05),17.4,-7.25),Vec(X(24.05),22.7,-7.25),
    Vec(X(24.05),22.7,7.25),Vec(X(24.05),17.4,7.25),
    palette.glass);
  }
  // Beveled roof folded over the window header, leaving a panoramic
  // longitudinal skylight: x=-11..11 is NOT closed with opaque triangles.
  const crown=Vec(X(11.8),43.5,zLeft),shoulder=Vec(X(23.6),36.2,zLeft);
  const crown2=Vec(X(11.8),43.5,zRight),
   shoulder2=Vec(X(23.6),36.2,zRight);
  shell.quad(shoulder,crown,crown2,shoulder2,palette.roofLit);
  const a=Vec(X(13.6),41.6,zLeft),b=Vec(X(22.6),35.8,zLeft),
   c=Vec(X(22.6),35.8,zRight),d=Vec(X(13.6),41.6,zRight);
  shell.quad(a,b,c,d,palette.under);
  // Wide shallow coves are embedded along the roof, not a forest of neon.
  const za=zLeft+.45,zb=zRight-.45;
  energy.quad(Vec(X(17.6),38.4,za),Vec(X(18.35),38.05,za),
   Vec(X(18.35),38.05,zb),Vec(X(17.6),38.4,zb),palette.cove);
  // Local luminance is baked into nearby trim, no extra point lights.
  inlay.quad(Vec(X(18.4),38.1,za),Vec(X(20.6),36.8,za),
   Vec(X(20.6),36.8,zb),Vec(X(18.4),38.1,zb),palette.panelLit);
  // Vertical mullions are thick, integral elements of the wall.
  for(const z of [-7.55,7.55]){
   shell.rectangle(Math.min(X(27.3),X(24.5)),9.6,z-.43,
    Math.max(X(27.3),X(24.5)),30.5,z+.43,palette.bevel);
   inlay.rectangle(Math.min(X(24.45),X(24.23)),12.2,z-.40,
    Math.max(X(24.45),X(24.23)),27.0,z+.40,palette.rim);
  }
  // A narrow but substantial outside mezzanine is visible through the
  // windows, tying this bay into a plausible larger station complex.
  shell.rectangle(Math.min(X(38),X(29)),-5,zLeft,
   Math.max(X(38),X(29)),-2.6,zRight,palette.side);
  shell.rectangle(Math.min(X(39),X(38.5)), -2.6,zLeft,
   Math.max(X(39),X(38.5)),6,zRight,palette.recess);
  // Structural joint fins have aligned profile at every module seam.
  const z=7.4;
  shell.rectangle(Math.min(X(29.2),X(27.3)),-4,z-.75,
   Math.max(X(29.2),X(27.3)),34,z+.75,palette.bevel);
  inlay.rectangle(Math.min(X(27.25),X(27.08)),7.8,z-.5,
   Math.max(X(27.25),X(27.08)),27.6,z+.5,palette.panelLit);
  // The glass edge has only two illumination anchors per window bay.
  if(kind==="GATE"){
   energy.quad(Vec(X(25.0),29.24,-5.3),Vec(X(25.0),29.65,-5.3),
    Vec(X(25.0),29.65,5.3),Vec(X(25.0),29.24,5.3),palette.coveWarm);
  }
 }
 // Architectural overhead diaphragm frame across the skylight at bay seams.
 shell.rectangle(-13.3,41.8,6.8,13.3,44.8,8,palette.bevel);
 inlay.rectangle(-11.3,41.52,7.0,11.3,41.72,7.8,palette.rim);
 if(kind==="GATE"){
  // Monumental gate forms with shoulders and a recessed central insignia,
  // purposely built into the shell rather than sprinkled in open space.
  shell.rectangle(-13.4,38.6,-7.3,13.4,43.2,-4.25,palette.side);
  inlay.rectangle(-9.2,38.25,-7.52,9.2,38.50,-4.08,palette.fascia);
  for(const x of [-6,6]){
   energy.rectangle(x-.45,38.0,-7.6,x+.45,38.18,-4.1,
    palette.whiteCore);
  }
  for(const sign of [-1,1]){
   const X=v=>sign*v;
   shell.rectangle(Math.min(X(24.2),X(20.1)),31,-7.1,
    Math.max(X(24.2),X(20.1)),40.9,-4.4,palette.bevel);
   inlay.rectangle(Math.min(X(19.95),X(19.77)),31.6,-7.28,
    Math.max(X(19.95),X(19.77)),38.2,-4.2,palette.panelLit);
  }
 }
 if(kind==="SERVICE"){
  // Woven armor across the upper roof, intentionally more enclosed than
  // PANORAMA. Still transparent/open overhead at the longitudinal skylight.
  inlay.rectangle(-11.1,43.1,-3,11.1,43.34,-1.8,palette.fascia);
  inlay.rectangle(-11.1,43.1,1.8,11.1,43.34,3,palette.fascia);
 }
 return {shell,inlay,energy,glass};
}
function base64(data){
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
 let result="";
 for(let i=0;i<data.length;i+=3){
  const a=data[i],b=data[i+1],c=data[i+2];
  const triple=(a<<16)|((b??0)<<8)|(c??0);
  result+=alphabet[(triple>>>18)&63]+alphabet[(triple>>>12)&63]+
   (b===undefined?"=":alphabet[(triple>>>6)&63])+
   (c===undefined?"=":alphabet[triple&63]);
 }
 return result;
}
export function buildStationAsset(){
 const meshes=[],nodes=[],bufferViews=[],accessors=[],payload=[],materials=[
  {name:STATION_ART_0200.shellMaterial,doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:.31,roughnessFactor:.7}},
  {name:STATION_ART_0200.detailMaterial,doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:.14,roughnessFactor:.63}},
  {name:STATION_ART_0200.energyMaterial,doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1},
   emissiveFactor:[.84,.84,.84],extensions:{
    KHR_materials_emissive_strength:{emissiveStrength:2.2}}},
  {name:STATION_ART_0200.windowMaterial,doubleSided:true,alphaMode:"BLEND",
   pbrMetallicRoughness:{baseColorFactor:[.66,.85,1,.115],
    metallicFactor:0,roughnessFactor:.13}}
 ];
 let byteCursor=0;
 function addFloatBuffer(array,type){
  const count=type==="VEC3"?array.length/3:array.length;
  const typed=new Float32Array(array);
  const raw=new Uint8Array(typed.buffer);
  const start=byteCursor;
  for(const b of raw)payload.push(b);
  byteCursor+=raw.length;
  bufferViews.push({buffer:0,byteOffset:start,byteLength:raw.length,
   target:34962});
  return {bufferView:bufferViews.length-1,componentType:5126,count,type};
 }
 for(const variant of STATION_ART_0200.bayTypes){
  const components=stationBay(variant);
  for(const [i,name] of ["shell","inlay","energy","glass"].entries()){
   const s=components[name];if(!s.coords.length)continue;
   const pa=addFloatBuffer(s.coords,"VEC3");
   const normal=addFloatBuffer(s.normals,"VEC3");
   const colors=addFloatBuffer(s.colors,"VEC3");
   const bounds=[0,1,2].map(k=>s.coords.filter((_,i)=>i%3===k));
   pa.min=bounds.map(x=>Math.min(...x));
   pa.max=bounds.map(x=>Math.max(...x));
   const attrs={POSITION:accessors.push(pa)-1,
    NORMAL:accessors.push(normal)-1,
    COLOR_0:accessors.push(colors)-1};
   const meshName=variant+"_"+name.toUpperCase();
   meshes.push({name:meshName,primitives:[{
    attributes:attrs,material:i,mode:4}]});
   nodes.push({name:meshName,mesh:meshes.length-1});
  }
 }
 const bufferBytes=new Uint8Array(payload);
 const gltf={asset:{version:"2.0",generator:"SKYSHIFT World Art Pipeline 0.20.0",
  copyright:"Original procedural authored station asset"},
 extensionsUsed:["KHR_materials_emissive_strength"],
 scenes:[{name:"CONTINUUM STATION / 3 MODULE LIBRARY",
  nodes:nodes.map((_,i)=>i)}],scene:0,nodes,meshes,materials,
 accessors,bufferViews,buffers:[{uri:"data:application/octet-stream;base64,"+
  base64(bufferBytes),byteLength:byteCursor}]};
 return {gltf,statistics:{assetBytes:byteCursor,meshes:meshes.length,
  vertices:accessors.filter((_,i)=>i%3===0).reduce((s,x)=>s+x.count,0),
  triangles:accessors.filter((_,i)=>i%3===0).reduce((s,x)=>s+x.count/3,0),
  materialCount:materials.length,
  variants:STATION_ART_0200.bayTypes}};
}
