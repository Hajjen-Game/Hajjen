import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {planTrueSharedTunnel0281,adaptSourcePosition0281}
 from "./true-shared-tunnel-renderer-v0281.mjs";
import {ZONE_WAVE,newZoneWaveState,updateZoneWave}
 from "./zone-wave-v060.mjs";
import {VAULT_WAVE_PARITY_0285,vaultSpatialWaveEnabled0285,
 waveSignedGlobal0285,waveColorAmount0285,
 patchVaultSpatialWave0285,installVaultSpatialWaveModule0285}
 from "./vault-spatial-wave-parity-v0285.mjs";

const read=n=>readFileSync(new URL(n,import.meta.url),"utf8");
const roadSigned=(s,front,length=3400)=>((s-front+length*.5)%length+
 length)%length-length*.5;

test("0.28.5 only: Skyline, Aurora and published Vault baselines untouched",()=>{
 for(const v of ["0.28.1","0.28.2","0.28.3","0.28.4"])
  assert.equal(vaultSpatialWaveEnabled0285("?track=vault&v="+v),false);
 for(const t of ["skyline","aurora"])
  assert.equal(vaultSpatialWaveEnabled0285("?track="+t+"&v=0.28.5"),false);
 assert.equal(vaultSpatialWaveEnabled0285("?track=vault&v=0.28.5"),true);
 assert.equal(vaultSpatialWaveEnabled0285("?track=vault&v=0.28.5&waveSync=classic"),false);
 assert.equal(VAULT_WAVE_PARITY_0285.transitionMeters,
  ZONE_WAVE.atmosphereTransitionMeters);
 assert.equal(VAULT_WAVE_PARITY_0285.geometryChanged,false);
 assert.equal(VAULT_WAVE_PARITY_0285.physicsChanged,false);
});

test("all 10 shared source modules match EXACT road shader signed distance across 3400m and lap wraps",()=>{
 const modules=planTrueSharedTunnel0281(3400);
 assert.equal(modules.length,10);
 for(const front of [-90,10,175,340,350,680,1100,1840,3230,3395,
  3408,3610,5411,6798,7002,10203]){
  for(const module of modules){
   for(const sourceS of [0,4,62,184,312,368]){
    const arc=module.start+sourceS*module.scale;
    const tunnel=waveSignedGlobal0285(sourceS,front,module,3400);
    assert.ok(Math.abs(tunnel-roadSigned(arc,front))<1e-5,
     "module "+module.index+" front "+front+" global "+arc+
     " got "+tunnel+" != "+roadSigned(arc,front));
   }
  }
 }
 assert.equal(waveSignedGlobal0285(184,510,modules[1],3400),
  roadSigned(510,510));
});

test("road and tunnel change palette on the same 66m physical boundary",()=>{
 for(const signed of [-130,-66,-40,0,40,66,130]){
  const tint=waveColorAmount0285(signed);
  assert.ok(tint>=0&&tint<=1);
  assert.ok(Math.abs(tint-(1-(Math.max(0,Math.min(1,(signed+66)/132))**2)*
   (3-2*Math.max(0,Math.min(1,(signed+66)/132)))))<1e-8);
 }
 assert.equal(waveColorAmount0285(0),.5);
 assert.equal(waveColorAmount0285(-66),1);
 assert.equal(waveColorAmount0285(66),0);
 const road=read("./premium-track-v0160.mjs");
 assert.match(road,/VAULT_WAVE_PARITY_0285_ACTIVE/);
 assert.match(road,/wave\$\{k\}Color/);
 assert.match(road,/state\.shaderBaseStage\?\?0/);
 assert.match(road,/ZONE_WAVE\.atmosphereTransitionMeters/);
});

test("only the original tunnel spectral distances are patched, not local GGX/micro metal trackS",()=>{
 const original=[
  "#include <common>",
  "float signedDistance=vTunnelTrack-uTunnelFront;",
  "float feather=1.0-smoothstep(-66.0,66.0,vRebirthTrack-uRebirthFront);",
  "float localMetalGrain=sin(vPbrTrack0260*10.5);",
  "vec3 sourceNormal=normalize(vRoadFixtureMasks0263.xyz);"
 ].join("\n");
 const output=patchVaultSpatialWave0285(original);
 assert.equal(output.patched,2);
 assert.ok(output.fragmentShader.includes(
  "vaultSignedWave0285(vTunnelTrack,uTunnelFront)"));
 assert.ok(output.fragmentShader.includes(
  "vaultSignedWave0285(vRebirthTrack,uRebirthFront)"));
 assert.ok(output.fragmentShader.includes("uVaultWaveStart0285"));
 assert.ok(output.fragmentShader.includes("uVaultWaveScale0285"));
 assert.ok(output.fragmentShader.includes("uVaultWaveLap0285"));
 assert.ok(output.fragmentShader.includes("vPbrTrack0260*10.5"));
 assert.ok(output.fragmentShader.includes("vRoadFixtureMasks0263.xyz"));
 assert.doesNotMatch(output.fragmentShader,/vTunnelTrack-uTunnelFront/);
 assert.equal(patchVaultSpatialWave0285("bare shader").patched,0);
});

test("module wrapper is reversible and preserves existing onBeforeCompile composition",()=>{
 const module=planTrueSharedTunnel0281(3400)[3];
 const materials=Array.from({length:6},()=>({
  onBeforeCompile(shader){
   shader.fragmentShader="#include <common>\nfloat signedDistance=vTunnelTrack-uTunnelFront;"+
    "\nfloat m=smoothstep(-66.0,66.0,vRebirthTrack-uRebirthFront);";
  },
  customProgramCacheKey(){return "original"},
  needsUpdate:false
 }));
 const names=["Tunnel / CLOSED_SHELL","Tunnel / CURVED_RIBS",
  "Tunnel / INTEGRATED_LIGHT","Tunnel / HALO",
  "Tunnel / HARDSURFACE_PANELS","Tunnel / STRUCTURAL_CONDUITS"];
 const meshes=materials.map((material,i)=>({
  isMesh:true,name:names[i],material
 }));
 const group={traverse(fn){meshes.forEach(fn)}};
 const section={getObjectByName(name){
  return name==="SKYSHIFT · Tunnel Megastructure 0.21.1"?group:null;
 }};
 const original=materials.map(m=>m.onBeforeCompile);
 const installed=installVaultSpatialWaveModule0285({},section,module,{
  trackLength:3400,enabled:true
 });
 assert.equal(installed.active,true);
 assert.equal(installed.materials,6);
 const sample={fragmentShader:"",uniforms:{}};
 materials[0].onBeforeCompile(sample,{});
 assert.match(sample.fragmentShader,/vaultSignedWave0285/);
 assert.equal(sample.uniforms.uVaultWaveStart0285.value,module.start);
 assert.equal(sample.uniforms.uVaultWaveScale0285.value,module.scale);
 assert.equal(sample.uniforms.uVaultWaveLap0285.value,3400);
 assert.match(materials[0].customProgramCacheKey(),/vault-spatial-wave-0285/);
 installed.dispose();
 materials.forEach((m,i)=>{
  assert.equal(m.onBeforeCompile,original[i]);
  assert.equal(m.customProgramCacheKey(),"original");
 });
 const disabled=installVaultSpatialWaveModule0285({},section,module,{
  enabled:false});
 assert.equal(disabled.active,false);
});
