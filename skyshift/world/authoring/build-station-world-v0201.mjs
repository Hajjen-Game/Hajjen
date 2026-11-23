// SKYSHIFT 0.20.1 — Offline-authored 3D station bay library (glTF 2.0).
// Reproducible *asset authoring*, NOT a new runtime mesh generator.
// Generates the checked-in scene asset with three spatially coherent bays,
// pre-authored PBR materials and physically open panorama windows.
// Usage: node skyshift/build-station-world-v0200.mjs > skyshift/assets/worlds/continuum-bays-v1.gltf
export const STATION_ART_0201=Object.freeze({
 id:"continuum-enclosure-bays-v2",format:"glTF 2.0",
 bayLengthMeters:16,bayTypes:Object.freeze(["PANORAMA","SERVICE","GATE"]),
 shellMaterial:"Titanium Architectural Shell",detailMaterial:"Inset Alloy",
 energyMaterial:"Recessed Lighting",windowMaterial:"Panoramic Glass",
 minSideClearance:14.4,minOverheadClearance:25.6,
 controlledEmissive:true,noiseFreeBackdrop:true,
 deliberatelyOpenWindows:false,authoredMeshes:12
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
 const z0=-8,z1=8;
 const span=(surf,x0,y0,za,x1,y1,zb,color)=>
  surf.rectangle(Math.min(x0,x1),Math.min(y0,y1),za,
   Math.max(x0,x1),Math.max(y0,y1),zb,color);
 // All modules belong to ONE connected megastation hull. The floor, side
 // bulkheads and roof physically meet; the road runs inside this volume.
 // The track deck and guardrails are unchanged at their original coordinates.
 span(shell,-23,-16,z0,23,-8.6,z1,palette.under);
 span(shell,-20.8,-8.6,z0,20.8,-6.4,z1,palette.side);
 // Wide structural underdeck lip on both sides connects the highway deck
 // visually to its architectural sidewall, NOT to unprotected space.
 for(const sign of [-1,1]){
  const X=v=>v*sign;
  const r=(surf,a,lo,za,b,hi,zb,c)=>span(surf,X(a),lo,za,X(b),hi,zb,c);
  // Continuous inner-side base: only 2.9m beyond the 11.6m lane half-width.
  r(shell,14.5,-6.4,z0,18.4,12.6,z1,palette.side);
  r(inlay,14.39,2.3,z0+.4,14.5,6.4,z1-.4,palette.fascia);
  // The below-road edge is part of the station, not hanging in space.
  r(shell,17.5,-15.8,z0,27,-6.4,z1,palette.under);
  r(shell,23,-10,z0,28.2,6.8,z1,palette.bevel);
  // Upper bulkhead and roof are continuous, including around windows.
  r(shell,15.5,23.2,z0,22.1,32,z1,palette.roof);
  r(inlay,15.32,24.0,z0+.55,15.5,27.4,z1-.55,palette.rim);
  // A real wall for industrial/service/gate bays; no view straight into
  // space between the road edge and the station structure.
  if(kind!=="PANORAMA"){
   r(shell,15.75,12.55,z0,19.9,23.35,z1,palette.side);
   // Two large wall plates, rather than six repeating narrow columns.
   for(const [a,b] of [[-7.2,-.5],[.5,7.2]]){
    r(inlay,15.52,13.8,a,15.72,22.1,b,palette.panel);
    r(inlay,15.43,14.5,a+.6,15.52,20.5,b-.6,palette.fascia);
   }
   // Behind a solid wall: subtle transparent diagnostic panel, not a
   // panorama. Keeps identical four-material glTF bay contract.
   r(glass,15.35,15.4,-1.65,15.38,18.6,1.65,palette.glass);
  }else{
   // Only the observation bays open to space. Their window is FRAMED and
   // physically recessed through the thick hull. No 16m open glass wall.
   r(shell,15.7,12.5,z0,20.0,15.0,z1,palette.bevel);
   r(shell,15.7,21.2,z0,20.0,23.4,z1,palette.bevel);
   for(const [a,b] of [[z0,-5.4],[5.4,z1]]){
    r(shell,15.7,14.9,a,20.0,21.3,b,palette.side);
   }
   // Window jambs project inward, clearly defining a constructed aperture.
   for(const z of [-5.4,5.4]){
    r(shell,15.30,14.7,z-.32,19.9,21.5,z+.32,palette.rim);
    r(inlay,15.16,15.1,z-.24,15.3,21.0,z+.24,palette.fascia);
   }
   r(shell,15.7,14.8,-.32,19.9,21.4,.32,palette.bevel);
   r(inlay,15.48,14.6,-5.6,15.68,14.95,5.6,palette.panelLit);
   r(inlay,15.48,21.16,-5.6,15.68,21.5,5.6,palette.panelLit);
   // Glass lies in the aperture; its alpha is intentionally restrained.
   glass.quad([15.64*sign,15.0,-5.1],
    [15.64*sign,21.2,-5.1],
    [15.64*sign,21.2,5.1],
    [15.64*sign,15.0,5.1],palette.glass);
  }
  // Exterior station shell deliberately joins window wall at all floors.
  // Dark external mass can be seen THROUGH the windows, but none of it
  // floats independently of the structural plinth.
  r(shell,20.5,-15.8,z0,27.4,-9.8,z1,palette.under);
  r(shell,20.5,29.6,z0,27.4,38,z1,palette.roof);
  // Broad coffered ceiling corners and continuous crown soffit.
  r(shell,17.1,27.0,z0,23.8,32.7,z1,palette.roofLit);
  // Main load-bearing station joint every 16 metres; the vertical lines
  // are part of the wall, not free-standing beams in space.
  r(shell,15.2,-7.2,7.0,20.5,29.6,8.08,palette.bevel);
  r(inlay,15.05,7.9,7.1,15.23,23.3,7.85,palette.rim);
  // A restrained inset uplight washes a near-side panel via static vertex
  // colors, not a real point light or glaring band.
  if(kind==="GATE"){
   r(energy,15.00,24.5,-4.5,15.08,25.05,4.5,palette.coveWarm);
  }
 }
 // 46.5m wide connected exterior roof; 30.0m high inside. No skylight
 // the length of the track. The upper road/tunnel 0.20.1 had a large hole.
 span(shell,-26.7,31.6,z0,26.7,38.8,z1,palette.roof);
 span(shell,-18.8,29.2,z0,18.8,31.65,z1,palette.under);
 // Deep ceiling cassette directly above the cockpit: wide continuous mass.
 span(inlay,-12.7,28.98,-7.15,12.7,29.15,7.15,palette.recess);
 span(inlay,-10.6,28.82,-5.95,10.6,28.98,5.95,palette.fascia);
 // Overhead light wells are integrated only in observations and gates.
 if(kind==="PANORAMA"){
  for(const x of [-10.2,10.2])
   span(energy,x-.26,28.71,-4.5,x+.26,28.82,4.5,palette.cove);
 }
 if(kind==="GATE"){
  // Reinforced pressure transition: the corridor remains open where the
  // ship flies, with a heavy embossed insignia above its clearance.
  span(shell,-24.5,26.1,-7.5,24.5,30.9,-4.7,palette.bevel);
  span(inlay,-11.1,25.9,-7.65,11.1,26.1,-4.55,palette.fascia);
  for(const x of [-6.5,6.5])
   span(energy,x-.65,25.76,-7.73,x+.65,25.89,-4.5,palette.whiteCore);
  // Guarded lower passage reveal does not protrude into pilot area.
  for(const sign of [-1,1]){
   const X=v=>sign*v;
   span(inlay,Math.min(X(14.4),X(15.3)),3.6,-7.5,
    Math.max(X(14.4),X(15.3)),18.7,-4.7,palette.fascia);
  }
 }
 // Industrial bays have wide *connected* ceiling coffers. No tiny lights
 // repeated every metre; spatial hierarchy comes from architecture.
 if(kind==="SERVICE"){
  span(inlay,-8.6,28.68,-2.4,8.6,28.85,2.4,palette.panel);
  // Small functional status luminaire, embedded in the service ceiling.
  span(energy,-1.5,28.60,-.18,1.5,28.68,.18,palette.cove);
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
  {name:STATION_ART_0201.shellMaterial,doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:.31,roughnessFactor:.7}},
  {name:STATION_ART_0201.detailMaterial,doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:.14,roughnessFactor:.63}},
  {name:STATION_ART_0201.energyMaterial,doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1},
   emissiveFactor:[.84,.84,.84],extensions:{
    KHR_materials_emissive_strength:{emissiveStrength:2.2}}},
  {name:STATION_ART_0201.windowMaterial,doubleSided:true,alphaMode:"BLEND",
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
 for(const variant of STATION_ART_0201.bayTypes){
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
 const gltf={asset:{version:"2.0",generator:"SKYSHIFT World Art Pipeline 0.20.1",
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
  variants:STATION_ART_0201.bayTypes}};
}
