// SKYSHIFT 0.20.4.1 — Offline-authored 3D station bay library (glTF 2.0).
// Reproducible *asset authoring*, NOT a new runtime mesh generator.
// Generates the checked-in scene asset with three spatially coherent bays,
// pre-authored PBR materials and physically open panorama windows.
// Usage: node skyshift/build-station-world-v0200.mjs > skyshift/assets/worlds/continuum-bays-v1.gltf
export const STATION_ART_02041=Object.freeze({
 id:"continuum-neon-sculpted-v6",format:"glTF 2.0",
 bayLengthMeters:16,bayTypes:Object.freeze(["PANORAMA_START","PANORAMA_END","SERVICE","GATE"]),
 shellMaterial:"Titanium Architectural Shell",detailMaterial:"Inset Alloy",
 energyMaterial:"Recessed Lighting",windowMaterial:"Panoramic Glass",
 haloMaterial:"Architectural Neon Falloff",
 minSideClearance:14.4,minOverheadClearance:25.6,
 controlledEmissive:true,noiseFreeBackdrop:true,
 deliberatelyOpenWindows:true,authoredMeshes:18,
 visualPass:"Premium Integrated Neon / Pass 3 · Sculpted Light",
 luminousRibbonsIntegrated:true,nonRepeatingArchitecturalGateAccents:true,
 observationExteriorJambsOnly:true,ceilingPortalsAtTrueGatesOnly:true,
 narrowerWallHalo:true,sculptedAccentBands:true,
 unchangedRoadShipAndPhysics:true,priorGraphiteAndGlazingUnchanged:true,
 magentaSidewall:true,cyanCovedRoof:true,
 whiteHotCores:true,lowMemoryEmissiveParity:true,
 addedPhysicalLights:0,additionalRenderPasses:0,
 observationBandLengthMeters:32,observationRevealHeight:7.25,
 openingPerModuleMeters:15.9,centerMullions:0,
 closedBayDecorativeGlassPanels:0,
 originalHallWidthUnchanged:true,originalLightingUnchanged:true,
 originalGraphitePalettePreserved:true,stationPbrOnly:true,
 roadAndShipMaterialsUnchanged:true,sceneExposureUnchanged:true
});
export const GRAPHITE_PALETTE_02041=Object.freeze({
 shell:0x1c2d3d,side:0x172536,roof:0x1b2a3b,roofLit:0x2b4257,
 rim:0x3c5c74,bevel:0x30495f,under:0x111e2c,recess:0x0e1a29,
 fascia:0x2e485f,panel:0x23394d,panelLit:0x3a5b72,
 warm:0xa9a1a0,cool:0x8bbacb,
 whiteCore:0xc3f6ff,cove:0x56d6eb,coveWarm:0xffbda4,
 glass:0x254b69,
 neonPink:0xff369e,neonWhitePink:0xffe2f4,
 neonCyan:0x39cff5,neonWhiteBlue:0xe5faff,
 glowPink:0xb13b77,glowCyan:0x167ea4
});
const palette=GRAPHITE_PALETTE_02041;
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
 const shell=surface(),inlay=surface(),energy=surface(),glass=surface(),halo=surface();
 const z0=-8,z1=8;
 // Thin baked luminous faces, not floating 6-sided decorative bars.
 const sideGlow=(s,sign,x,y0,y1,a,b,c)=>s.quad(
  [sign*x,y0,a],[sign*x,y1,a],[sign*x,y1,b],[sign*x,y0,b],c);
 const roofGlow=(s,x0,x1,y,a,b,c)=>s.quad(
  [x0,y,a],[x1,y,a],[x1,y,b],[x0,y,b],c);
 // Angled neon stays embedded in the station's actual pressure shoulders.
 const wallShoulder=(s,sign,x,za,zb,c,thickness=.17)=>s.quad(
  [sign*x,24.72,za-thickness],[sign*x,25.07,za+thickness],
  [sign*x,27.23,zb+thickness],[sign*x,26.89,zb-thickness],c);
 const roofShoulder=(s,sign,y,za,zb,c,width=.18)=>s.quad(
  [sign*11.16,y,za-width],[sign*11.16,y,za+width],
  [sign*9.18,y,zb+width],[sign*9.18,y,zb-width],c);
 const isObservation=kind==="PANORAMA_START"||kind==="PANORAMA_END";
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
  if(!isObservation){
   // A SEALED and connected station wall, not a collage of rectangular
   // pretend windows. Restore architectural mass between the view galleries.
   r(shell,15.75,12.55,z0,19.9,23.35,z1,palette.side);
   // Only one narrow horizontal panel joint. No decorative glass or
   // two-per-module inset boxes that look like shuttered windows.
   r(inlay,15.48,22.45,z0+.1,15.63,22.78,z1-.1,palette.rim);
  }else{
   // Two GLTF modules read as ONE 32m panorama ribbon.
   // No masonry or glazing grid is placed at the pair's shared boundary.
   r(shell,15.7,12.5,z0,20,14.75,z1,palette.bevel);
   r(shell,15.7,22.08,z0,20,23.4,z1,palette.bevel);
   r(inlay,15.46,14.48,z0+.08,15.68,14.80,z1-.08,palette.rim);
   r(inlay,15.46,22.01,z0+.08,15.68,22.34,z1-.08,palette.rim);
   // Each paired gallery has only OUTER jambs; the former large center
   // upright is removed to make the full-length slit immediately legible.
   // Local +z faces backward along track: START's outside is +8,
   // END's outside is -8, their shared seam gets no upright at all.
   const outside=kind==="PANORAMA_START"?7.44:-7.44;
   r(shell,15.27,14.50,outside-.5,19.9,22.3,outside+.5,palette.bevel);
   r(inlay,15.14,14.93,outside-.36,15.28,21.88,outside+.36,palette.rim);
   // Very faint glazing lets deep space read as open space, not solid blue.
   glass.quad([15.63*sign,14.81,-7.95],
    [15.63*sign,22.07,-7.95],
    [15.63*sign,22.07,7.95],
    [15.63*sign,14.81,7.95],palette.glass);
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
  // Only show load-bearing vertical bulkheads at actual room boundaries;
  // no square lattice every 16m along solid walls.
  if(kind==="GATE"||isObservation){
   const edge=kind==="PANORAMA_END"?-7.44:7.44;
   r(shell,15.2,-7.2,edge-.56,20.5,29.6,edge+.56,palette.bevel);
   r(inlay,15.05,7.9,edge-.36,15.23,23.3,edge+.36,palette.rim);
  }
  // A restrained inset uplight washes a near-side panel via static vertex
  // colors, not a real point light or glaring band.
  if(kind==="GATE"){
   r(energy,15.00,24.5,-4.5,15.08,25.05,4.5,palette.coveWarm);
  }
  // Twin magenta guide coves run in the same architectural recess
  // in every bay, hugging the wall at +/-14.5m from the centerline.
  r(inlay,14.365,8.50,z0,14.50,9.85,z1,palette.recess);
  sideGlow(energy,sign,14.336,9.02,9.31,z0,z1,palette.neonPink);
  sideGlow(energy,sign,14.315,9.125,9.173,z0,z1,palette.neonWhitePink);
  // Reduce the broad glowing slab from 0.20.4; retain a clean neon core.
  sideGlow(halo,sign,14.296,8.63,9.69,z0,z1,palette.glowPink);
  if(isObservation){
   // Window opening sill follows the same 32m unbroken frame; cyan
   // guides the eye to open space without creating shuttered squares.
   sideGlow(energy,sign,15.175,14.55,14.75,z0,z1,palette.neonCyan);
   sideGlow(energy,sign,15.156,14.618,14.664,z0,z1,palette.neonWhiteBlue);
   sideGlow(halo,sign,15.139,14.34,14.98,z0,z1,palette.glowCyan);
   // Only the OUTER ends of each 32m gallery get an illuminated jamb.
   // No fake box windows or center mullions in the panoramic ribbon.
   const outer=kind==="PANORAMA_START"?7.44:-7.44;
   sideGlow(energy,sign,15.104,15.02,21.81,outer-.115,outer+.115,palette.neonCyan);
   sideGlow(energy,sign,15.087,15.11,21.72,outer-.034,outer+.034,palette.neonWhiteBlue);
   sideGlow(halo,sign,15.073,14.92,21.95,outer-.27,outer+.27,palette.glowCyan);
  }
  if(kind==="GATE"){
   // Vertical magenta collar is integral to a true pressure gate ONLY.
   sideGlow(energy,sign,14.327,17.2,25.05,-7.27,-7.07,palette.neonPink);
   sideGlow(halo,sign,14.302,16.8,25.20,-7.34,-6.98,palette.glowPink);
   // A single angular continuation on a real gate's reinforced shoulder.
   wallShoulder(energy,sign,14.282,-7.11,-5.06,palette.neonPink);
   wallShoulder(energy,sign,14.266,-7.11,-5.06,palette.neonWhitePink,.045);
   wallShoulder(halo,sign,14.247,-7.11,-5.06,palette.glowPink,.40);
  }
 }
 // 46.5m wide connected exterior roof; 30.0m high inside. No skylight
 // the length of the track. The upper road/tunnel 0.20.4.1 had a large hole.
 span(shell,-26.7,31.6,z0,26.7,38.8,z1,palette.roof);
 span(shell,-18.8,29.2,z0,18.8,31.65,z1,palette.under);
 // Deep ceiling cassette directly above the cockpit: wide continuous mass.
 span(inlay,-12.7,28.98,-7.15,12.7,29.15,7.15,palette.recess);
 span(inlay,-10.6,28.82,-5.95,10.6,28.98,5.95,palette.fascia);
 // A continuous two-tone coved ceiling. The glowing faces sit under the
 // actual recessed roof panels, not on an unrelated floating beam.
 for(const sign of [-1,1]){
  const X=v=>v*sign;
  span(inlay,X(10.73),28.44,z0,X(11.40),28.58,z1,palette.recess);
  roofGlow(energy,X(10.92),X(11.19),28.39,z0,z1,palette.neonCyan);
  roofGlow(energy,X(11.030),X(11.078),28.35,z0,z1,palette.neonWhiteBlue);
  roofGlow(halo,X(10.32),X(11.76),28.295,z0,z1,palette.glowCyan);
  if(kind==="GATE"){
   // Angular cove transitions at a station gate only; no new overhead
   // crossbars in open segments and no geometry in the flight envelope.
   roofShoulder(energy,sign,28.321,-5.76,-3.85,palette.neonCyan);
   roofShoulder(energy,sign,28.306,-5.76,-3.85,palette.neonWhiteBlue,.05);
   roofShoulder(halo,sign,28.282,-5.76,-3.85,palette.glowCyan,.37);
  }
 }
 // Overhead light wells are integrated only in observations and gates.
 if(isObservation){
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
 return {shell,inlay,energy,glass,halo};
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
  {name:STATION_ART_02041.shellMaterial,doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:.22,roughnessFactor:.7}},
  {name:STATION_ART_02041.detailMaterial,doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:.12,roughnessFactor:.68}},
  {name:STATION_ART_02041.energyMaterial,doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1},
   emissiveFactor:[.84,.84,.84],extensions:{
    KHR_materials_emissive_strength:{emissiveStrength:2.2}}},
  {name:STATION_ART_02041.windowMaterial,doubleSided:true,alphaMode:"BLEND",
   pbrMetallicRoughness:{baseColorFactor:[.36,.57,.73,.048],
    metallicFactor:0,roughnessFactor:.13}},
  {name:STATION_ART_02041.haloMaterial,doubleSided:true,alphaMode:"BLEND",
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,.17],
    metallicFactor:0,roughnessFactor:1}}
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
 for(const variant of STATION_ART_02041.bayTypes){
  const components=stationBay(variant);
  for(const [i,name] of ["shell","inlay","energy","glass","halo"].entries()){
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
 const gltf={asset:{version:"2.0",generator:"SKYSHIFT World Art Pipeline 0.20.4.1",
  copyright:"Original procedural authored station asset"},
 extensionsUsed:["KHR_materials_emissive_strength"],
 scenes:[{name:"CONTINUUM STATION / SCULPTED INTEGRATED NEON LIBRARY",
  nodes:nodes.map((_,i)=>i)}],scene:0,nodes,meshes,materials,
 accessors,bufferViews,buffers:[{uri:"data:application/octet-stream;base64,"+
  base64(bufferBytes),byteLength:byteCursor}]};
 return {gltf,statistics:{assetBytes:byteCursor,meshes:meshes.length,
  vertices:accessors.filter((_,i)=>i%3===0).reduce((s,x)=>s+x.count,0),
  triangles:accessors.filter((_,i)=>i%3===0).reduce((s,x)=>s+x.count/3,0),
  materialCount:materials.length,
  variants:STATION_ART_02041.bayTypes}};
}
