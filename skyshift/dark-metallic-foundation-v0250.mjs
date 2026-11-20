// SKYSHIFT 0.25.0 — Dark Metallic Lighting Foundation.
// This is a genuine material-baseline correction, NOT another additive tint.
// The composed 0.24.x shader stays intact and runs unchanged at strength 0.
// On the original 3-4 sun-isolated tunnel-metal batches, a physical-looking
// charcoal substrate is reconstructed before bounded local NEON reflections.
// Original emitter cores, road/ship materials, solar seal and flight untouched.
import {installPremiumSurfaceCraftsmanship}
 from "./premium-surface-craftsmanship-v0241.mjs";
import {TUNNEL_PORTALS_0211,tunnelProfilePoint0211}
 from "./tunnel-megastructure-v0211.mjs";

export const DARK_METALLIC_FOUNDATION_0250=Object.freeze({
 version:"0.25.0",id:"dark-metallic-lighting-foundation-0250",
 reference:"dark graphite / separated cyan neon / isolated amber fixtures",
 fullTunnelMeters:368,compare:"?darkMetal=classic",
 base:"0.24.2",metalRoleCountHigh:4,metalRoleCountMobile:3,
 true3DMetal:"preserved 0.24.1 machined panels, seams and rib geometry",
 substrate:"graphite metal with brushed milling, true dark recessed joints",
 lighting:"banked cyan spectral cove/specular and portal-local amber practicals",
 bloom:"source-limited by dark metal, existing HDR processing untouched",
 fixtureLayout:"one original-position batch of small amber portal luminaires",
 addedDrawCalls:1,addedDynamicLights:0,addedTextures:0,
 addedRenderPasses:0,addedColliders:0,changesRoad:false,
 changesShip:false,changesRails:false,changesCamera:false,
 changesGrip:false,changesPhysics:false,changesZoneWave:false,
 changesExteriorSolarSeal:false,preservesNativeEmission:true,
 lowMemory:"same 3 metal batches and one tiny fixture batch; economical grain"
});
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const ROLE_NAMES=Object.freeze({
 panel:"HARDSURFACE_PANELS",conduit:"STRUCTURAL_CONDUITS",
 shell:"CLOSED_SHELL",rib:"CURVED_RIBS"
});
const LAST_PANEL=" diffuseColor.rgb+=uSurfaceCraft0241*s41Color*s41Satin;\n}";
const LAST_OTHER=" diffuseColor.rgb+=a24Bounce;\n}";
// Important: each anchor is INSIDE the existing p23Mix scope and thus has
// access to p23WallLight, p23RoofLight, p23Facing and p23Distance. Panel
// anchors additionally live inside its original 0.23.2 material branch.
// New uniforms gate this entire correction: setting 0 restores exact 0.24.2.
export function patchDarkMetallicShader(vertex,fragment,{role="panel",mobile=false}={}){
 if(!ROLE_NAMES[role])throw Error("0.25.0 invalid tunnel metal role");
 const anchor=role==="panel"?LAST_PANEL:LAST_OTHER;
 if(!fragment.includes("#include <common>")||!fragment.includes(anchor)||
  !fragment.includes("uniform float uArchitecturalNeon024;")||
  !fragment.includes("uniform float uUnifiedExtent0233;")||
  !fragment.includes("float p23WallLight=")||
  !fragment.includes("float p23RoofLight=")||
  !fragment.includes("float cinemaArch=")||
  !fragment.includes("float p23Facing=")||
  !fragment.includes("vec3 rbTint=rebirthPalette();")||
  !fragment.includes("varying vec2 vNeonLocalSection;")||
  !fragment.includes("varying float vRebirthClass;")||
  !fragment.includes("diffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;"))
  throw Error("0.25.0 requires complete original sun-isolated 0.24.2 tunnel shaders");
 const panel=role==="panel",rib=role==="rib",shell=role==="shell";
 const base=panel?"vec3(0.010,0.013,0.017)":
  shell?"vec3(0.012,0.015,0.019)":rib?
  "vec3(0.014,0.017,0.022)":"vec3(0.012,0.016,0.021)";
 const body=[
  "// 0.25.0: charcoal metal (the earlier cyan metal fill is intentionally",
  "// discarded) illuminated only where REAL original neon is present.",
  "if(uDarkMetal0250>0.0001){",
  " vec3 m25Original=diffuseColor.rgb;",
  " float m25Cavity=clamp(rbCavity,0.0,1.0);",
  " float m25Bevel=clamp(rbBevel,0.0,1.0);",
  " float m25Face=1.0-m25Cavity;",
  " float m25Macro=0.5+0.5*sin(vRebirthTrack*0.185+",
  "  vNeonLocalSection.y*0.47);",
  " float m25Near=1.0-smoothstep(19.0,78.0,p23Distance);",
  " float m25Brush=(0.5+0.5*sin(vRebirthTrack*"+
    (mobile?"2.7":"7.5")+"+vNeonLocalSection.y*"+
    (mobile?"1.0":"2.1")+"))*m25Near;",
  " float m25Facing=clamp(p23Facing,0.0,1.0);",
  " float m25Grazing=pow(1.0-m25Facing,2.4);",
  // Base is DARK charcoal, not zone-colored. Milling and edge/panel
  // classes create material variation without replacing light sources.
  " vec3 m25Graphite="+base+"*(0.84+0.26*m25Macro+",
  "  0.08*m25Brush)*(0.78+0.22*m25Facing);",
  " m25Graphite*=1.0-"+
    (panel?".85":shell?".38":rib?".26":".55")+"*m25Cavity;",
  " m25Graphite+=vec3(.006,.007,.008)*m25Bevel*",
  "  (0.45+0.55*m25Facing);",
  // All inputs are the 0.23 true banked local emitters, NOT exterior sun,
  // not a screen-space fake and not a colored global ambient fill.
  " float m25Wall=pow(clamp(p23WallLight,0.0,1.0),3.2);",
  " float m25Roof=pow(clamp(p23RoofLight,0.0,1.0),3.4);",
  " float m25Portal=pow(clamp(cinemaArch,0.0,1.0),3.1);",
  " float m25Local=max(m25Wall,m25Roof);",
  " float m25LightZone=clamp(0.65*m25Wall+0.80*m25Roof,0.0,1.0);",
  " float m25EdgeLobe=m25Bevel*(0.42+0.58*m25Grazing);",
  " float m25ViewLobe=pow(1.0-m25Facing,"+(mobile?"2.0":"3.0")+");",
  " float m25PortalLobe=m25Portal*(0.22+0.78*m25Local)*",
  "  (0.26+0.74*m25EdgeLobe);",
  // Isolated glow on nearby real metal rather than wash across all panels.
  " float m25Bounce=(0.038*m25Wall+0.043*m25Roof)*",
  "  (0.38+0.62*m25EdgeLobe)+0.046*m25PortalLobe;",
  " float m25Chrome=(0.058*m25Local*m25EdgeLobe+",
  "  0.037*m25Local*m25ViewLobe)*(0.45+0.55*m25Near);",
  " vec3 m25Tint=clamp(rbTint,vec3(0.0),vec3(0.86));",
  " vec3 m25Spectral=m25Tint*min(0.19,m25Bounce+m25Chrome)*",
  "  (1.0-0.94*m25Cavity);",
  // Warm light ONLY close to the visible practical sconces on the
  // sides of existing portals. No amber global lighting.
  " float m25Side=smoothstep(16.0,23.0,abs(vNeonLocalSection.x));",
  " float m25Height=smoothstep(8.5,13.6,vNeonLocalSection.y)*",
  "  (1.0-smoothstep(17.3,22.0,vNeonLocalSection.y));",
  " float m25Amber=0.125*m25Portal*m25Side*m25Height*",
  "  (0.30+0.70*(m25EdgeLobe+m25Grazing)*0.5)*",
  "  (1.0-0.86*m25Cavity);",
  " vec3 m25Warm=vec3(0.82,0.31,0.075)*m25Amber;",
  " vec3 m25Final=clamp(m25Graphite+m25Spectral+m25Warm,",
  "  vec3(0.002),vec3(0.32));",
  " diffuseColor.rgb=mix(m25Original,m25Final,uDarkMetal0250);",
  "}"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace("#include <common>",
   "#include <common>\nuniform float uDarkMetal0250;")
  .replace(anchor,anchor+"\n"+body)};
}
export function installDarkMetalShader(material,uniforms,options={}){
 const {role="panel",mobile=false}=options;
 if(!ROLE_NAMES[role]||!material?.isMeshBasicMaterial||
  typeof material.onBeforeCompile!=="function"||
  typeof material.customProgramCacheKey!=="function")
  throw Error("0.25.0 must compose into original sun-sealed Basic metal");
 const previous=material.onBeforeCompile,oldKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  const next=patchDarkMetallicShader(shader.vertexShader,
   shader.fragmentShader,{role,mobile});
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=next.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return oldKey.call(this)+"-dark-metal-foundation-0250-"+role+
   (mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
}
function makeWarmPracticalBatch(THREE,positionAt,options={}){
 if(typeof positionAt!=="function")throw Error("0.25.0 needs original banked track sampler");
 const p=[];
 const viewportClassic=!!options.vaultHeightClassic;
 function quad(a,b,c,d){
  for(const point of [a,b,c,a,c,d])p.push(point.x,point.y,point.z);
 }
 let fixtures=0;
 for(const portal of TUNNEL_PORTALS_0211){
  // Skip final partial arch cut if it lacks room. All locations come
  // from the ORIGINAL structural portal list; never arbitrary floats.
  if(portal+1.65>368)continue;
  for(const side of [-1,1]){
   const a=tunnelProfilePoint0211(8,portal,viewportClassic);
   const b=tunnelProfilePoint0211(9,portal,viewportClassic);
   const get=(s,t)=>{
    const x=Math.abs(a[0]*(1-t)+b[0]*t)-0.64;
    const y=a[1]*(1-t)+b[1]*t-0.15;
    return positionAt(s,side*x,y);
   };
   quad(get(portal+.74,.18),get(portal+1.5,.18),
    get(portal+1.5,.28),get(portal+.74,.28));
   fixtures++;
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
 geometry.computeBoundingSphere();
 const material=new THREE.MeshBasicMaterial({
  color:0xffa75f,side:THREE.DoubleSide,
  toneMapped:false,depthTest:true,depthWrite:false
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name="SKYSHIFT 0.25.0 / warm portal practicals";
 mesh.frustumCulled=true;mesh.renderOrder=2;
 return {mesh,fixtures};
}
export function installDarkMetallicFoundation(THREE,world,options={}){
 const base=installPremiumSurfaceCraftsmanship(THREE,world,options);
 const old=base.stats(),lowMemory=!!options.lowMemory;
 const fallback=reason=>({...base,stats(){
  return {...base.stats(),darkMetal0250Enabled:false,
   darkMetal0250Status:reason};
 },setDarkMetalComparison(){}});
 if(!old.surfaceCraft0241Enabled||
  !old.architecturalNeon0240Enabled||
  !old.unifiedTunnel0233Enabled||
  !old.surfaceCraft0241SunSealed||
  !old.surfaceCraft0241NativeNeonRetained)
  return fallback("previous-0.24-pass-unavailable");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const targets=Object.entries(ROLE_NAMES)
  .filter(([role])=>!lowMemory||role!=="conduit")
  .map(([role,name])=>({role,
   mesh:group?.children?.find(m=>m.name==="Tunnel / "+name)}));
 const emitter=group?.children?.find(m=>m.name==="Tunnel / INTEGRATED_LIGHT");
 if(targets.length!==(lowMemory?3:4)||!emitter?.material?.isMeshBasicMaterial||
  targets.some(({mesh})=>!mesh?.material?.isMeshBasicMaterial||
   !mesh?.geometry?.getAttribute?.("neonLocalSection")||
   !mesh?.geometry?.getAttribute?.("glowWeight")))
  return fallback("original-metal-or-native-emitter-missing");
 let practical;
 try{practical=makeWarmPracticalBatch(THREE,options.positionAt,options);}
 catch(e){
  console.warn("SKYSHIFT 0.25.0 practical placement failed",e);
  return fallback("practical-geometry-failed");
 }
 const amount={value:1},uniforms={uDarkMetal0250:amount};
 for(const {role,mesh} of targets)
  installDarkMetalShader(mesh.material,uniforms,{role,mobile:lowMemory});
 group.add(practical.mesh);
 const state={
  darkMetal0250Enabled:true,darkMetal0250Status:"active",
  darkMetal0250Version:"0.25.0",
  darkMetal0250Batches:targets.length,
  darkMetal0250Fixtures:practical.fixtures,
  darkMetal0250LowMemory:lowMemory,
  darkMetal0250NativeEmitterUntouched:true,
  darkMetal0250SolarSealed:true,
  darkMetal0250AddedDynamicLights:0,
  darkMetal0250AddedDrawCalls:1,
  darkMetal0250ChangesRoad:false,
  darkMetal0250ChangesShip:false,
  darkMetal0250ChangesPhysics:false,
  darkMetal0250ChangesGRIP:false,
  darkMetal0250WaveSynchronized:true
 };
 return {...base,stats(){return {...base.stats(),...state,
  darkMetal0250Strength:amount.value,version:"0.25.0"};},
  setDarkMetalComparison(v){
   amount.value=clamp(v);
   practical.mesh.visible=amount.value>0.001;
  },
  dispose(){
   practical.mesh.removeFromParent();
   practical.mesh.geometry.dispose();
   practical.mesh.material.dispose();
   base.dispose?.();
  }
 };
}
