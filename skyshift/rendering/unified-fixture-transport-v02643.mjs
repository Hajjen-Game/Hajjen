// SKYSHIFT 0.26.4.3 — Unified Fixture Light Transport & Surface Response
// The user-marked *red* sources are emissive but insufficiently illuminate
// their neighboring surfaces. The ceiling's *green* cyan response is already
// correct. Transport is added only inside existing source-space masks; no
// global exposure, point lights, AO, SSR or new display geometry.
export const FIXTURE_TRANSPORT_02643=Object.freeze({
 version:"0.26.4.3",base:"0.26.4.2",comparison:"?fixtureTransport=classic",
 priorities:{walls:1,connectedAmberFloor:2,straightRail:3,realWebGLVisualQA:4},
 noNewDynamicLights:true,noNewRenderPasses:true,noNewDrawCalls:true,
 noExtraMetalGGXSamples:true,originalMetalRoughness:true,
 ceilingCyanProtected:true,straightOnlyRailProtected:true,
 originalAmberGeometry:true,physicsUnchanged:true,gripUnchanged:true,
 shipUnchanged:true,roadBlackBaseProtected:true,solarSealProtected:true,
 nativeZoneWaveProtected:true
});
const COMMON="#include <common>";
const SUBSTRATE_ANCHOR="m25Final*=mix(1.0,m41Preserve,uMetalLightResponse02641);";
const EDGE_ANCHOR="reflectedLight.directSpecular+=e31Cool+e31Warm;";
const FOOT_ANCHOR="diffuseColor.a=mix(diffuseColor.a,";
export const LOWER_CYAN_NAME_02643=
 "SKYSHIFT 0.26.3.3 / cyan lower-edge inlays on straight track ONLY";
export const JOINED_AMBER_NAME_02643=
 "SKYSHIFT 0.26.3.2 / one-piece amber arch-foot and floor bands";
const roles={panel:"HARDSURFACE_PANELS",rib:"CURVED_RIBS",
 shell:"CLOSED_SHELL",conduit:"STRUCTURAL_CONDUITS"};
const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const gl=x=>Number(x).toFixed(3);

// PRIORITY 1a: distinct RGB reflected bounce FROM the ALREADY visible
// cove/sconce on the actual dark brushed titanium underlying each physical
// coat. m25Wall and m25Portal belong to the original solar-isolated tunnel
// shader. This is NOT neutral ambient light or new geometry.
// Roof's strong cyan is protected by the wall-height mask.
export function patchWallTransport02643(vertex,fragment,{role="panel",mobile=false}={}){
 if(!(role in roles)||!fragment.includes(COMMON)||
  !fragment.includes(SUBSTRATE_ANCHOR)||
  !fragment.includes("float m25Wall=")||
  !fragment.includes("float m25Roof=")||
  !fragment.includes("float m25Portal=")||
  !fragment.includes("float m25Cavity=")||
  !fragment.includes("varying vec2 vNeonLocalSection;"))
  throw Error("0.26.4.3 needs original brushed, sunlight-sealed titanium");
 const scale=(role==="panel"?1:role==="rib"?.82:role==="shell"?.56:.64)*
  (mobile?.56:1);
 const lines=[
  "// 0.26.4.3 material response near the EXISTING cyan wall coves.",
  "float t43X=abs(vNeonLocalSection.x);",
  "float t43Y=vNeonLocalSection.y;",
  "float t43Face=1.0-0.92*clamp(m25Cavity,0.0,1.0);",
  "float t43Cove=smoothstep(13.0,20.8,t43X)*",
  " exp(-pow((t43Y-23.7)/6.1,2.0))*",
  " (0.36+0.64*clamp(m25Wall,0.0,1.0))*",
  " (1.0-0.78*clamp(m25Roof,0.0,1.0));",
  "// Existing warm sconces on portal panels plus their actual lower foot.",
  "float t43Warm=pow(clamp(m25Portal,0.0,1.0),0.90)*",
  " smoothstep(16.5,22.0,t43X)*",
  " (0.75*exp(-pow((t43Y-14.3)/5.2,2.0))+",
  " 0.32*exp(-pow((t43Y-4.4)/4.4,2.0)));",
  "float t43Relief=0.45+0.55*clamp(m25Bevel+0.42*m25Grazing,0.0,1.0);",
  "vec3 t43Bounce=vec3(0.028,0.138,0.187)*t43Cove+",
  " vec3(0.205,0.077,0.018)*t43Warm;",
  "m25Final=clamp(m25Final+uFixtureTransport02643*",
  " "+gl(scale)+"*t43Face*t43Relief*t43Bounce,vec3(0.002),vec3(0.425));"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace(COMMON,COMMON+"\nuniform float uFixtureTransport02643;")
  .replace(SUBSTRATE_ANCHOR,SUBSTRATE_ANCHOR+"\n"+lines)};
}
// PRIORITY 1b: PBR response in existing TWO physically located source
// families. The response is modulated by native finite distances, not
// by a billboard or constant screen-space glow. Never boost roof cyan.
export function patchMetalTransport02643(vertex,fragment,{role="panel",mobile=false}={}){
 if(!["panel","rib"].includes(role)||
  !fragment.includes(COMMON)||
  !fragment.includes("float pbrColdFalloff0260=")||
  !fragment.includes("float pbrWarmFalloff0260=")||
  !fragment.includes("pbrFixture0260.color=vec3(0.11,0.68,0.94)")||
  !fragment.includes("pbrFixture0260.color=vec3(0.94,0.35,0.085)")||
  !fragment.includes("uniform float uReflectionFinish02642;")||
  !fragment.includes("uniform float uMetalLightResponse02641;")||
  !fragment.includes("varying vec2 vPbrSection0260;"))
  throw Error("0.26.4.3 requires exact original local source GGX chain");
 const cold=role==="rib"?7.2:8.6;
 const warm=8.0;
 const source=fragment.replace(COMMON,
  COMMON+"\nuniform float uFixtureTransport02643;");
 const coolAnchor="float pbrWarmFalloff0260=exp(-pow(pbrWarmDistance0260/8.0,2.0));";
 if(!source.includes(coolAnchor))throw Error("missing warm finite GGX anchor");
 const code=[
  "// Strong ceiling cyan stays untouched; add only wall-facing source transport.",
  "float t43Wall=smoothstep(12.5,20.0,abs(vPbrSection0260.x))*",
  " (1.0-smoothstep(23.0,27.3,vPbrSection0260.y));",
  "float t43Sconce=smoothstep(17.0,22.5,abs(vPbrSection0260.x))*",
  " (1.0-smoothstep(19.0,24.0,vPbrSection0260.y));",
  "float t43ColdWide=exp(-pow(pbrColdDistance0260/"+gl(cold*(mobile?1.12:1.36))+",2.0));",
  "float t43WarmWide=exp(-pow(pbrWarmDistance0260/"+gl(warm*(mobile?1.10:1.42))+",2.0));",
  "pbrColdFalloff0260=mix(pbrColdFalloff0260,",
  " mix(pbrColdFalloff0260,t43ColdWide,0.70*t43Wall),uFixtureTransport02643);",
  "pbrWarmFalloff0260=mix(pbrWarmFalloff0260,",
  " mix(pbrWarmFalloff0260,t43WarmWide,0.86*t43Sconce),uFixtureTransport02643);"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:source.replace(coolAnchor,coolAnchor+"\n"+code)};
}
// PRIORITY 3: strengthens the existing specular response of the LOWER RAIL
// without altering the short visible cyan inlays or creating phantom light
// in chevron turns. e31Power is *already* multiplied by straight-only mask.
export function patchRailTransport02643(vertex,fragment,{mobile=false}={}){
 if(!fragment.includes(COMMON)||
  !fragment.includes(EDGE_ANCHOR)||
  !fragment.includes("float e31Power=uEdgeFloor02631*e31In*e31Bay*e31Safe*clamp(vEdgeStraight02633,0.0,1.0);")||
  !fragment.includes("vec3 e31Cool=vec3(0.018,0.48,0.76)")||
  !fragment.includes("vec3 e31Warm=vec3(0.85,0.27,0.055)")||
  !fragment.includes("float e31FootBand=")||
  !fragment.includes("uRoadSolarSpillSeal"))
  throw Error("0.26.4.3 requires real straight-only source-masked road");
 const factor=mobile?1.19:1.49;
 const body=[
  "// Existing rail/edge sources only. e31Cool is already zero in curves.",
  "e31Cool*=mix(1.0,"+gl(factor)+",uFixtureTransport02643);",
  "// Existing localized amber foot light, independent of lower rail strip.",
  "e31Warm*=mix(1.0,"+gl(mobile?1.10:1.19)+",uFixtureTransport02643);",
  EDGE_ANCHOR
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace(COMMON,COMMON+"\nuniform float uFixtureTransport02643;")
  .replace(EDGE_ANCHOR,body)};
}
// PRIORITY 2: mitigate hard polygon edges of the original additive amber
// floor geometry by shaping its INTERPOLATED alpha only. Leaves original
// 20 source positions, 20 joined floor bands, vertex colors and texture-free
// rendering intact. Near-zero halo gets feathered instead of a hard plane.
export function patchFootTransport02643(vertex,fragment,{mobile=false}={}){
 if(!fragment.includes(COMMON)||
  !fragment.includes("float f42Alpha=")||
  !fragment.includes("f42Soft")||
  !fragment.includes("uReflectionFinish02642")||
  !fragment.includes(FOOT_ANCHOR))
  throw Error("0.26.4.3 requires original connected-amber alpha pipeline");
 const target="mix(diffuseColor.a,f42Soft,0.72),uReflectionFinish02642);";
 if(!fragment.includes(target))throw Error("0.26.4.3 missing connected foot curve");
 const soft=[
  target,
  "float t43A=clamp(diffuseColor.a,0.0,1.0);",
  "float t43Feather=pow(t43A,"+(mobile?"1.035":"1.115")+")*",
  " (0.96+0.04*smoothstep(0.10,0.56,t43A));",
  "diffuseColor.a=mix(diffuseColor.a,t43Feather,",
  " uFixtureTransport02643*"+(mobile?"0.48":"0.74")+");"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace(COMMON,COMMON+"\nuniform float uFixtureTransport02643;")
  .replace(target,soft)};
}
export function wrapFixtureMaterial02643(material,uniform,type,opts={}){
 const expected=type==="physical"?"isMeshPhysicalMaterial":
  type==="road"?"isMeshStandardMaterial":"isMeshBasicMaterial";
 if(!material?.[expected]||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.26.4.3 missing original material for "+type);
 const old=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  old.call(this,shader,renderer);
  const fn=type==="physical"?patchMetalTransport02643:
   type==="substrate"?patchWallTransport02643:
   type==="road"?patchRailTransport02643:patchFootTransport02643;
  const next=fn(shader.vertexShader,shader.fragmentShader,opts);
  shader.vertexShader=next.vertexShader;
  shader.fragmentShader=next.fragmentShader;
  shader.uniforms.uFixtureTransport02643=uniform;
 };
 material.customProgramCacheKey=function(){
  return key.call(this)+"-fixture-transport-02643-"+type+"-"+
   (opts.role||"shared")+(opts.mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
 return ()=>{material.onBeforeCompile=old;
  material.customProgramCacheKey=key;material.needsUpdate=true;};
}
export function installUnifiedFixtureTransport02643(THREE,world,roadMesh,{
 enabled=true,lowMemory=false,metalState=null,roadRebuild=null,
 reflectionFinish=null,straightEdges=null
}={}){
 const fallback=status=>({active:false,setComparison(){},dispose(){},
  stats:()=>({fixtureTransport02643Active:false,
   fixtureTransport02643Status:status})});
 if(!enabled)return fallback("classic");
 if(!metalState?.stats?.().unifiedMetal02641Active||
  !roadRebuild?.stats?.().roadRebuild0263Active||
  !reflectionFinish?.stats?.().reflectionFinish02642Active||
  !straightEdges?.stats?.().straightEdges02633Active)
  return fallback("physical-metal-road-previous-reflection-or-straight-rail-missing");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const names=Object.entries(roles)
  .filter(([role])=>!lowMemory||role!=="conduit")
  .map(([role,key])=>({type:"substrate",role,
   mesh:group?.children?.find(m=>m.name==="Tunnel / "+key)}));
 const physical=["panel","rib"].filter(role=>!lowMemory||role==="panel")
  .map(role=>({type:"physical",role,
   mesh:group?.children?.find(m=>
    m.name==="SKYSHIFT 0.26.0 P2 / true physical "+role)}));
 const amber=world?.getObjectByName?.(JOINED_AMBER_NAME_02643);
 const cyan=world?.getObjectByName?.(LOWER_CYAN_NAME_02643);
 if(!roadMesh?.material?.isMeshStandardMaterial||
  !amber?.material?.isMeshBasicMaterial||
  !cyan?.material?.isMeshBasicMaterial||
  physical.some(x=>!x.mesh?.material?.isMeshPhysicalMaterial)||
  names.some(x=>!x.mesh?.material?.isMeshBasicMaterial))
  return fallback("original-light-source-or-substrate-meshes-unavailable");
 const amount={value:1},undo=[];
 try{
  for(const {type,role,mesh} of [...names,...physical])
   undo.push(wrapFixtureMaterial02643(mesh.material,amount,type,
    {role,mobile:lowMemory}));
  undo.push(wrapFixtureMaterial02643(roadMesh.material,amount,"road",
   {mobile:lowMemory}));
  undo.push(wrapFixtureMaterial02643(amber.material,amount,"foot",
   {mobile:lowMemory}));
 }catch(e){
  for(const restore of undo.reverse())restore();
  console.warn("SKYSHIFT 0.26.4.3 keeping previous source response",e);
  return fallback("fixture-transport-chain-incompatible");
 }
 const report={
  fixtureTransport02643Active:true,fixtureTransport02643Status:"active",
  fixtureTransport02643Version:"0.26.4.3",
  fixtureTransport02643SubstrateCount:names.length,
  fixtureTransport02643PhysicalCount:physical.length,
  fixtureTransport02643RoadCount:1,
  fixtureTransport02643ConnectedAmberCount:1,
  fixtureTransport02643CeilingCyanProtected:true,
  fixtureTransport02643StraightCyanProtected:true,
  fixtureTransport02643NoNewLights:true,
  fixtureTransport02643NoNewPasses:true,
  fixtureTransport02643WhiteSolarSealed:true,
  fixtureTransport02643PhysicsUnchanged:true,
  fixtureTransport02643NativeWaveUnchanged:true,
  fixtureTransport02643LowMemory:!!lowMemory
 };
 return {active:true,setComparison(v){amount.value=clamp(v);},
  stats:()=>({...report,fixtureTransport02643Strength:amount.value}),
  dispose(){amount.value=0;for(const restore of undo.reverse())restore();}
 };
}
