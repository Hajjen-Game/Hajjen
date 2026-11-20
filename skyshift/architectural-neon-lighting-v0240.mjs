// SKYSHIFT 0.24.0 — Architectural Neon Lighting.
// Bounded spectral bounce from the ORIGINAL wall strips, crown flows and
// portal arches, on EXISTING sealed tunnel metals. No new geometry/lights,
// no outside sunlight, no road/ship/rail changes and no separate color clock.
import {installUnifiedTunnelMaterials}
 from "./unified-tunnel-materials-v0233.mjs";

export const ARCHITECTURAL_NEON_0240=Object.freeze({
 version:"0.24.0",id:"architectural-neon-lighting-0240",
 pass:"1 — architectural cove light, portal collars and metal bounce",
 source:"existing native wall/crown strips, portal arcs and zone wave",
 fullTunnelMeters:368,comparison:"?architecturalNeon=classic",
 targetMeshes:["HARDSURFACE_PANELS","STRUCTURAL_CONDUITS",
  "CLOSED_SHELL","CURVED_RIBS"],
 mobile:"bounded simplified highlights using existing per-pixel coordinates",
 newMeshes:0,newLights:0,newDrawCalls:0,newTextures:0,newRenderPasses:0,
 geometryChanged:false,roadChanged:false,shipChanged:false,
 railsChanged:false,physicsChanged:false,gripChanged:false,
 cameraChanged:false,exteriorSolarSealed:true,preservesNativeNeon:true,
 nativeWaveSynchronized:true
});

const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const roles=Object.freeze({
 panel:"HARDSURFACE_PANELS",conduit:"STRUCTURAL_CONDUITS",
 shell:"CLOSED_SHELL",rib:"CURVED_RIBS"
});
const panelEnd="diffuseColor.rgb=c32Before+c32Strength*c32Contribution;";
const otherEnd="diffuseColor.rgb=mix(d31Original,d31Out,d31Strength);";

// Insert AFTER 0.23.3's finished material AND after the existing 0.23.2
// metal glints. The original shader remains byte-for-byte identical at
// uArchitecturalNeon024=0; additive luminance never erases the native neon.
export function patchArchitecturalNeonShader(vertex,fragment,{
 role="panel",mobile=false
}={}){
 if(!(role in roles))throw Error("0.24.0 unsupported tunnel material role");
 const common="#include <common>";
 const anchor=(role==="panel"||role==="conduit")?panelEnd:otherEnd;
 if(!fragment.includes(common)||!fragment.includes(anchor)||
    !fragment.includes("uUnifiedExtent0233")||
    !fragment.includes("float p23WallLight=")||
    !fragment.includes("float p23RoofLight=")||
    !fragment.includes("float cinemaArch=")||
    !fragment.includes("vec3 rbTint=rebirthPalette();")||
    !fragment.includes("varying vec2 vNeonLocalSection;")||
    !fragment.includes("float d31Grazing=")||
    !fragment.includes("float p23Facing="))
  throw Error("0.24.0 requires 0.23.3's full-length sun-sealed shader");
 const materialRole=(role==="rib")?"rib":(role==="shell")?"shell":"metal";
 // No new world-space point lights or neutral-white shading. All spatial
 // falloffs were calculated earlier using the REAL banked tunnel geometry.
 const materialBias=materialRole==="rib"?.27:materialRole==="shell"?.16:.12;
 const faceWeight=materialRole==="rib"?.86:materialRole==="shell"?.52:.34;
 const edgeWeight=materialRole==="rib"?.53:materialRole==="shell"?.22:.62;
 const mobileScale=mobile?".65":"1.0";
 const body=[
  "// 0.24.0: architectural neon, not external sunlight or white fog.",
  "if(uArchitecturalNeon024>0.0001){",
  " float a24X=abs(vNeonLocalSection.x);",
  " float a24Y=vNeonLocalSection.y;",
  " float a24Wall=clamp(p23WallLight,0.0,1.0);",
  " float a24Crown=clamp(p23RoofLight,0.0,1.0);",
  " float a24Near=max(a24Wall,a24Crown);",
  " float a24Portal=clamp(cinemaArch,0.0,1.0);",
  " float a24Graze=clamp(d31Grazing,0.0,1.0);",
  " float a24Bevel=clamp(rbBevel,0.0,1.0);",
  " float a24Cavity=clamp(rbCavity,0.0,1.0);",
  " float a24WallCove=smoothstep(15.0,22.0,a24X)*",
  "  smoothstep(7.0,14.0,a24Y)*a24Wall;",
  " float a24RoofCove=(1.0-smoothstep(12.0,22.0,a24X))*",
  "  smoothstep(20.0,27.0,a24Y)*a24Crown;",
  " float a24Collar=a24Portal*smoothstep(10.0,23.0,a24Y)*",
  "  (0.24+0.76*a24Near);",
  " float a24Edge=("+edgeWeight.toFixed(2)+"*a24Bevel+",
  "  "+faceWeight.toFixed(2)+"*(0.28+0.72*a24Graze));",
  " float a24Wash=(0.145*a24WallCove+0.16*a24RoofCove)*",
  "  (0.42+0.58*a24Edge);",
  " float a24PortalBounce="+materialBias.toFixed(2)+"*a24Collar*",
  "  (0.35+0.65*a24Edge);",
  " float a24MetalGlint=0.065*a24Near*a24Bevel*",
  "  (0.35+0.65*a24Graze);",
  " float a24Total=min(0.26,(a24Wash+a24PortalBounce+",
  "  a24MetalGlint)*"+mobileScale+")*(1.0-0.90*a24Cavity);",
  // Local palette is the original 9-zone chromatic wave: no independent
  // color pulse, extra lights, precomputed white-core, or new tone mapping.
  " vec3 a24Tint=clamp(rbTint,vec3(0.0),vec3(0.76));",
  " vec3 a24Bounce=a24Tint*a24Total*uArchitecturalNeon024;",
  " diffuseColor.rgb+=a24Bounce;",
  "}"
 ].join("\n");
 return {vertexShader:vertex,fragmentShader:fragment
  .replace(common,common+"\nuniform float uArchitecturalNeon024;")
  .replace(anchor,anchor+"\n"+body)};
}

export function installArchitecturalNeonShader(material,uniforms,opts={}){
 const role=opts.role||"panel";
 if(!roles[role]||!material?.isMeshBasicMaterial||
    typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw Error("0.24.0 requires original solar-isolated tunnel Basic material");
 const previous=material.onBeforeCompile;
 const previousKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  const result=patchArchitecturalNeonShader(
   shader.vertexShader,shader.fragmentShader,opts);
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=result.fragmentShader;
 };
 material.customProgramCacheKey=function(){
  return previousKey.call(this)+"-architectural-neon-0240-"+role+
   (opts.mobile?"-4gb":"-high");
 };
 material.needsUpdate=true;
}

export function installArchitecturalNeonLighting(THREE,world,options={}){
 const base=installUnifiedTunnelMaterials(THREE,world,options);
 const original=base.stats();
 const fallback=reason=>({...base,
  stats(){return {...base.stats(),architecturalNeon0240Enabled:false,
    architecturalNeon0240Status:reason};},
  setArchitecturalNeonComparison(){}
 });
 if(!original.unifiedTunnel0233Enabled||
    original.unifiedTunnel0233Status!=="active"||
    !original.unifiedTunnel0233PreservedNativeNeon||
    !original.unifiedTunnel0233SunSealed)
  return fallback("0.23.3-not-ready");
 const group=world?.getObjectByName?.("SKYSHIFT · Tunnel Megastructure 0.21.1");
 const lowMemory=!!options.lowMemory;
 const targets=Object.entries(roles).filter(([role])=>!lowMemory||role!=="conduit")
  .map(([role,name])=>({role,
   mesh:group?.children?.find(x=>x.name==="Tunnel / "+name)}));
 // Preflight all batches BEFORE installing any shaders. The original
 // solar seal is MeshBasicMaterial and may not be replaced.
 if(targets.length!==(lowMemory?3:4)||targets.some(({mesh})=>
    !mesh?.material?.isMeshBasicMaterial||
    !mesh?.geometry?.getAttribute?.("neonLocalSection")||
    !mesh?.geometry?.getAttribute?.("glowWeight")))
  return fallback("sealed-metal-batch-missing");
 const control={value:1},uniforms={uArchitecturalNeon024:control};
 for(const {role,mesh} of targets)
  installArchitecturalNeonShader(mesh.material,uniforms,{role,mobile:lowMemory});
 const state={
  architecturalNeon0240Enabled:true,architecturalNeon0240Status:"active",
  architecturalNeon0240Version:"0.24.0",
  architecturalNeon0240Batches:targets.length,
  architecturalNeon0240LowMemory:lowMemory,
  architecturalNeon0240PreservedNativeNeon:true,
  architecturalNeon0240SolarSealed:true,
  architecturalNeon0240WaveSynchronized:true,
  architecturalNeon0240AddedLights:0,
  architecturalNeon0240AddedDrawCalls:0,
  architecturalNeon0240GeometryUnchanged:true,
  architecturalNeon0240RoadShipFlightUntouched:true
 };
 return {...base,
  stats(){return {...base.stats(),...state,
   architecturalNeon0240Strength:control.value,version:"0.24.0"};},
  setArchitecturalNeonComparison(v){control.value=clamp(v);}
 };
}
