// SKYSHIFT 0.4.9.3 — White-Core Spectral Zone Wave synchronized with premium inlaid rail accents
// Material layers and inlaid graphics share the 0.4.6 track geometry/collider.
// A faceted safety wall replaces the round-looking continuous neon tube.
import {
 TRIAL,GUARDRAIL,positionAt,widthAt,curvatureAt
} from "./trial-v049.mjs";
import {ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL} from "./zone-wave-v0493.mjs";
export const AERO_BARRIER=Object.freeze({
 step:.70,
 height:GUARDRAIL.height,
 railSides:2,
 profileColumns:8,
 innerSweepMeters:1.36,
 capLightWidthMeters:.035,
 metalPanelPitchMeters:16,
 curveArrowPitchMeters:11.5,
 arrowCurvatureThreshold:.0045,
 shoulderPitchMeters:24,
 drawBatches:3,
 colorZoneReady:true,
 whiteCoreReady:true,
 colliderUnchanged:true
});
// Lateral offsets are relative to the lane's outer edge. The FIRST vertices
// lie near the road and form a sloped shoulder; THEN a deliberately angular,
// hollow-looking raised metal wall/cap. No semicircular tubular profile.
export const AERO_PROFILE=Object.freeze([
 [-1.36,.025], // integrated deck-side start
 [-1.03,.035], // nearly flat shoulder
 [-.76,.205],  // angled, climb begins
 [-.55,.66],   // inside armor face (clearly visible from track)
 [-.40,.78],   // sharply chamfered inner cap
 [ .23,.78],   // flat 63cm cap top
 [ .43,.55],   // outer cap bevel
 [ .43,-.06]   // under-deck outer seam
]);
const METAL_GRADES=Object.freeze([
 [.105,.185,.235], // inner lip
 [.135,.235,.300], // broad, very dark sloped shoulder
 [.18,.28,.35],    // beginning of rising armored side
 [.135,.205,.265], // deliberately darker face (not bright neon)
 [.28,.39,.45],    // machined bevel highlight
 [.20,.29,.35],    // broad horizontal graphite cap
 [.09,.155,.21],   // dark outer shoulder
 [.06,.10,.15]     // buried outer face
]);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const lerp=(a,b,t)=>a+(b-a)*t;
export function sampleAeroProfile(s,side){
 const w=widthAt(s)/2;
 return AERO_PROFILE.map(([off,h])=>positionAt(s,side*(w+off),h));
}
export function createAeroBarrierData(step=AERO_BARRIER.step){
 const slices=Math.ceil(TRIAL.length/step),count=AERO_PROFILE.length;
 const positions=[],colors=[],indices=[];
 for(const side of [-1,1]){
  const offset=positions.length/3;
  for(let i=0;i<=slices;i++){
   const s=i*TRIAL.length/slices;
   const vertices=sampleAeroProfile(s,side);
   for(let j=0;j<count;j++){
    const p=vertices[j];
    positions.push(p.x,p.y,p.z);
    colors.push(...METAL_GRADES[j]);
   }
  }
  // Indexed shared vertices: NO visual breaks at piece boundaries.
  for(let i=0;i<slices;i++)for(let j=0;j<count-1;j++){
   const a=offset+i*count+j,b=a+1,c=b+count,d=a+count;
   indices.push(a,b,c,a,c,d);
  }
 }
 return {positions,colors,indices,columns:count,rows:slices+1,
  triangles:indices.length/3};
}
function createBatch(){
 return {positions:[],colors:[],coords:[],quads:0,triangles:0};
}
function putQuad(batch,p1,p2,p3,p4,intensity=1,sStart=0,sEnd=sStart,side=0){
 for(const p of [p1,p2,p3,p1,p3,p4]){
  batch.positions.push(p.x,p.y,p.z);
  batch.colors.push(intensity,intensity,intensity);
 }
 // Per-triangle physical arc-length and side; NO additional geometry pass.
 const lat=side*10.0;
 for(const [ss,ll] of [[sStart,lat],[sStart,lat],[sEnd,lat],
                       [sStart,lat],[sEnd,lat],[sEnd,lat]])
  batch.coords.push(ss,ll);
 batch.quads++;batch.triangles+=2;
}
const p=(s,side,off,h)=>positionAt(s,side*(widthAt(s)/2+off),h);
// Contact face: rail cross-section between profile vertices 2 and 3.
// Lift graphic by 2.4cm to avoid z-fighting on both steep banked bends.
function face(s,side,t,lift=.024){
 return p(s,side,lerp(-.76,-.55,t)-lift,.205+(.66-.205)*t+.012);
}
function faceStroke(batch,side,a,ta,b,tb,halfT,intensity){
 putQuad(batch,
  face(a,side,clamp(ta-halfT,.03,.97)),
  face(a,side,clamp(ta+halfT,.03,.97)),
  face(b,side,clamp(tb+halfT,.03,.97)),
  face(b,side,clamp(tb-halfT,.03,.97)),intensity,a,b,side);
}
export function createAeroDetailData(){
 const dark=createBatch(),light=createBatch();
 let panelSeams=0,curveChevrons=0,shoulderMarks=0;
 const slices=Math.ceil(TRIAL.length/.8);
 // Recessed cap: a dark, machined channel around a very NARROW accent.
 // Old v0.4.6 had a large luminous/rounded tube; these strips are 3.5cm.
 for(let i=0;i<slices;i++){
  const a=i*TRIAL.length/slices,b=(i+1)*TRIAL.length/slices;
  for(const side of [-1,1]){
   putQuad(dark,p(a,side,-.245,.792),p(a,side,-.045,.792),
    p(b,side,-.045,.792),p(b,side,-.245,.792),.44,a,b,side);
   putQuad(light,p(a,side,-.157,.804),p(a,side,-.122,.804),
    p(b,side,-.122,.804),p(b,side,-.157,.804),.42,a,b,side);
  }
 }
 // A structural panel seam each 16m, not fake curved panels or exposed posts.
 // The non-emissive graphite grooves sit inside the armored side face.
 for(let s=16;s<TRIAL.length-8;s+=AERO_BARRIER.metalPanelPitchMeters){
  for(const side of [-1,1]){
   faceStroke(dark,side,s-.045,.09,s+.045,.91,.055,.54);
   // Lower recessed latch suggests a purposeful panel connection.
   faceStroke(dark,side,s+.25,.19,s+.76,.19,.055,.70);
   panelSeams++;
  }
 }
 // Clearly readable double-chevron directional inlays, mostly in corners.
 // No blinking slabs; the metal wall remains dominant. The arrow geometry
 // is coplanar with the inner face and is baked into ONE accent batch.
 for(let s=13;s<TRIAL.length-9;s+=AERO_BARRIER.curveArrowPitchMeters){
  if(Math.abs(curvatureAt(s))<AERO_BARRIER.arrowCurvatureThreshold)continue;
  for(const side of [-1,1]){
   const a=s-1.4,b=s+1.4;
   faceStroke(light,side,a,.17,b,.50,.105,.98);
   faceStroke(light,side,a,.83,b,.50,.105,.98);
   curveChevrons++;
  }
 }
 // The deck remains intentionally uncluttered. Shoulder trim is intermittent,
 // never a full-width alternating tile that might be mistaken for a hazard.
 for(let s=15;s<TRIAL.length-15;s+=AERO_BARRIER.shoulderPitchMeters){
  for(const side of [-1,1]){
   const x=side*(widthAt(s)/2-2.62);
   putQuad(light,positionAt(s,x-.045,.049),positionAt(s,x+.045,.049),
    positionAt(s+6.2,x+.045,.049),positionAt(s+6.2,x-.045,.049),.20,s,s+6.2,side);
   shoulderMarks++;
  }
 }
 return {dark,light,panelSeams,curveChevrons,shoulderMarks,
  accentAnchors:[0,95,222,292,424,625,780,900,1055,1145,1295,1375,1465,TRIAL.length]};
}
function makeGeometry(THREE,batch,indices){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(batch.positions,3));
 geometry.setAttribute("color",new THREE.Float32BufferAttribute(batch.colors,3));
 if(batch.coords?.length)geometry.setAttribute("aRailCoord",
  new THREE.Float32BufferAttribute(batch.coords,2));
 if(indices)geometry.setIndex(indices);
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 return geometry;
}
// Rail inlay is one existing draw batch. The same world-coordinate front
// and lateral distortion as the deck shader recolors inlay vertices in-place.
export const RAIL_SPECTRAL_VERTEX=`attribute vec2 aRailCoord;
varying vec2 vRailCoord;`;
const railDeclaration=`
varying vec2 vRailCoord;
uniform float uZoneActiveCount;
uniform float uZoneFeather;
uniform float uZoneTime;
uniform float uWaveDetail;
uniform float uRailFront1,uRailFront2,uRailFront3;
uniform vec3 uRailBase,uRailNext1,uRailNext2,uRailNext3;
${SPECTRAL_FRONT_GLSL}
`;
export const RAIL_SPECTRAL_FRAGMENT=`
 float waveTrack=spectralWaveOffset(vRailCoord.x,vRailCoord.y,uZoneTime);
 vec3 railColor=uRailBase;
 float railEnergy=0.0;
 float railWhite=0.0,railBloom=0.0,railFilaments=0.0;
 ${Array.from({length:3},(_,i)=>{
  const k=i+1;
  return `
  float rail${k}On=step(${(k-.5).toFixed(1)},uZoneActiveCount);
  float rail${k}D=waveTrack-uRailFront${k};
  float rail${k}Mix=rail${k}On*(1.0-smoothstep(-uZoneFeather,
    uZoneFeather,rail${k}D));
  railColor=mix(railColor,uRailNext${k},rail${k}Mix);
  railWhite=max(railWhite,rail${k}On*spectralWhiteCore(rail${k}D));
  railBloom=max(railBloom,rail${k}On*spectralWhiteBloom(rail${k}D));
  railFilaments=max(railFilaments,rail${k}On*spectralFilaments(
    rail${k}D,vRailCoord.y,uZoneTime,uWaveDetail));
  railEnergy=max(railEnergy,
   rail${k}On*(spectralCore(rail${k}D)*.20+
     spectralHalo(rail${k}D)*.11+spectralAfterglow(rail${k}D)*.02));`;}).join("\n")}
 // White wave visibly runs along *each rail vertex* and the chevrons.
 // Reuse this mesh's diffuse/alpha (zero added draw calls or lighting).
 railColor=mix(railColor,vec3(1.0),
  clamp(railWhite*.43+railBloom*.12+railFilaments*.11,0.0,.67));
 diffuseColor.rgb *= railColor*(1.0+railEnergy+railWhite*.75+
   railBloom*.22+railFilaments*.12);
 diffuseColor.a=min(1.0,diffuseColor.a*(1.0+railWhite*.32+railBloom*.12));
`;
export function patchRailShaders(vertex,fragment){
 if(!vertex.includes("#include <common>")||
    !vertex.includes("#include <begin_vertex>")||
    !fragment.includes("#include <common>")||
    !fragment.includes("#include <color_fragment>"))
  throw new Error("Unsupported rail material shader chunks");
 return {
  vertexShader:vertex.replace("#include <common>",
   "#include <common>\n"+RAIL_SPECTRAL_VERTEX)
    .replace("#include <begin_vertex>",
     "#include <begin_vertex>\nvRailCoord=aRailCoord;"),
  fragmentShader:fragment.replace("#include <common>",
   "#include <common>\n"+railDeclaration)
    .replace("#include <color_fragment>",
     "#include <color_fragment>\n"+RAIL_SPECTRAL_FRAGMENT)
 };
}
export function installAeroBarriers(THREE,world){
 const body=createAeroBarrierData(),detail=createAeroDetailData();
 // Deliberately matte-dark under ambient light; narrow bright paint on top.
 const metal=new THREE.MeshStandardMaterial({
  color:0xffffff,vertexColors:true,metalness:.72,roughness:.32,
  flatShading:true, // Sharp metal bevels rather than smooth luminous tube normals.
  emissive:0x07111b,emissiveIntensity:.16,side:THREE.DoubleSide
 });
 const groove=new THREE.MeshBasicMaterial({
  color:0x071420,vertexColors:true,side:THREE.DoubleSide,
  depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,
  polygonOffsetUnits:-1
 });
 const illumination=new THREE.MeshBasicMaterial({
  color:0xffffff,vertexColors:true,transparent:true,opacity:.53,
  depthWrite:false,side:THREE.DoubleSide,toneMapped:true
 });
 const railUniforms={
  uZoneActiveCount:{value:0},uZoneFeather:{value:ZONE_WAVE.featherMeters},
  uZoneTime:{value:0},uWaveDetail:{value:1},
  uRailBase:{value:new THREE.Color(ZONE_PALETTES[0].accent)}
 };
 for(let k=1;k<=3;k++){
  railUniforms["uRailFront"+k]={value:-10000};
  railUniforms["uRailNext"+k]={
    value:new THREE.Color(ZONE_PALETTES[k].accent)
  };
 }
 illumination.onBeforeCompile=shader=>{
  const patched=patchRailShaders(shader.vertexShader,shader.fragmentShader);
  shader.vertexShader=patched.vertexShader;
  shader.fragmentShader=patched.fragmentShader;
  Object.assign(shader.uniforms,railUniforms);
 };
 illumination.customProgramCacheKey=()=>"aero-white-core-v0493";
 const bodyMesh=new THREE.Mesh(makeGeometry(THREE,body,body.indices),metal);
 bodyMesh.name="Angular integrated aero-barrier body";
 bodyMesh.frustumCulled=false;world.add(bodyMesh);
 const seamMesh=new THREE.Mesh(makeGeometry(THREE,detail.dark),groove);
 seamMesh.name="Recessed graphite cap channels and modular panel seams";
 seamMesh.renderOrder=1;seamMesh.frustumCulled=false;world.add(seamMesh);
 const lightMesh=new THREE.Mesh(makeGeometry(THREE,detail.light),illumination);
 lightMesh.name="Thin inset zone accents and curve chevrons";
 lightMesh.renderOrder=2;lightMesh.frustumCulled=false;world.add(lightMesh);
 return {
  plan:["aero-barrier","graphite-panel-system","curve-chevron-inlays",
   "thin-zone-reactive-led","quiet-shoulder-markings"],
  drawBatches:AERO_BARRIER.drawBatches,
  railTriangles:body.triangles,
  paintTriangles:detail.light.triangles+detail.dark.triangles,
  chevrons:detail.curveChevrons,
  panelSeams:detail.panelSeams,
  shoulderMarks:detail.shoulderMarks,
  accentAnchors:detail.accentAnchors,
  profileHeightMeters:AERO_BARRIER.height,
  accentWidthMeters:AERO_BARRIER.capLightWidthMeters,
  setDetailMode(quality){
   railUniforms.uWaveDetail.value=quality==="low"?0:1;
  },
  setWaveState(state){
   railUniforms.uZoneActiveCount.value=state.activeCount;
   railUniforms.uZoneTime.value=state.lastStepSeconds;
   for(let k=1;k<=3;k++)railUniforms["uRailFront"+k].value=state.fronts[k-1];
  },
  updateAccent(color){railUniforms.uRailBase.value.copy(color);},
  dispose(){
   for(const mesh of [bodyMesh,seamMesh,lightMesh]){
    mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();
   }
  }
 };
}
