// SKYSHIFT 0.28.0 — Shared Tunnel Runtime 1.0
//
// ONE installation contract for the already approved original Skyline
// 0.26.5 chain and NEON VAULT 0.27.4 chain. The original authoring functions
// remain authoritative. Tracks declare sections, source layout and banked
// positionAt, while the renderer consumes the shared visual style.
// Skyline's existing 0.20–0.26 historical A/B chain remains invokable.
import {installTrueSharedTunnelRenderer0281,installConfiguredSharedTunnel}
 from "./true-shared-tunnel-renderer-v0281.mjs";
import {makeTunnelPlan0280,tunnelQuality0280,SHARED_TUNNEL_STYLE_0280}
 from "./shared-tunnel-architecture-v0280.mjs";
import {installFullTunnelCircuit0270}
 from "./tracks/vault/full-tunnel-circuit-v0270.mjs";
import {installVaultMaterialParity0271}
 from "./tracks/vault/vault-material-parity-v0271.mjs";
import {installVaultArchitectureParity0272}
 from "./tracks/vault/vault-architectural-parity-v0272.mjs";
import {installVaultFullLighting0273}
 from "./tracks/vault/vault-full-lighting-v0273.mjs";

export function createSharedTunnelRuntime0280(THREE,world,{
 track,positionAt,trackLength,lowMemory=false,sections=null,
 enabled=true
}={}){
 if(typeof positionAt!=="function"||!world||!THREE)
  throw Error("0.28.0 shared tunnel requires banked positionAt, world, Three");
 const plan=makeTunnelPlan0280({track,trackLength,sections,
  quality:tunnelQuality0280(lowMemory)});
 let vault=null,skyline=null,trueShared=null,
  installedVault=false,installedSkyline=false,installedTrueShared=false;
 const stopped={active:false,stats:()=>({active:false}),dispose(){}};
 function installTrueShared({enabled=false,policy=null}={}){
  if(installedTrueShared)throw Error("0.28.1 duplicate true shared install");
  installedTrueShared=true;
  trueShared=enabled&&policy?installConfiguredSharedTunnel(THREE,world,{
   track,positionAt,trackLength,lowMemory,policy,sections:plan.intervals
  }):installTrueSharedTunnelRenderer0281(THREE,world,{
   track,positionAt,trackLength,lowMemory,enabled
  });
  return trueShared;
 }
 function installVault({
  foundationEnabled=false,materialEnabled=false,architectureEnabled=false,
  lightingEnabled=false,finishEnabled=false
 }={}){
  if(installedVault)throw Error("0.28.0 duplicate shared Vault installation");
  installedVault=true;
  if(track!=="vault"||trueShared?.active)return vault={

   foundation:stopped,material:stopped,architecture:stopped,
   lighting:stopped
  };
  // 0.27.0–0.27.4 originally approved production renderers, not second
  // copied implementations. The same geometry, fixtures, road and ship.
  const foundation=installFullTunnelCircuit0270(THREE,world,{
   track,positionAt,lowMemory,enabled:foundationEnabled,
   reliefLighting:architectureEnabled
  });
  const material=installVaultMaterialParity0271(THREE,world,{
   track,lowMemory,enabled:materialEnabled,foundation
  });
  const architecture=installVaultArchitectureParity0272(THREE,world,{
   track,lowMemory,positionAt,enabled:architectureEnabled,
   foundation,materialParity:material
  });
  const lighting=installVaultFullLighting0273(THREE,world,{
   track,lowMemory,positionAt,enabled:lightingEnabled,
   foundation,architecture,materialParity:material,
   finishEnabled
  });
  return vault={foundation,material,architecture,lighting};
 }
 function installSkyline(installer,legacyOptions={}){
  if(installedSkyline)throw Error("0.28.0 duplicate original Skyline install");
  installedSkyline=true;
  if(track!=="skyline")return null;
  if(typeof installer!=="function")
   throw Error("0.28.0 Skyline needs ORIGINAL approved visual installer");
  const opts={...legacyOptions};
  // The 0.21.3/0.24.1 original sculptor now accepts our common
  // segment plan. Historical ?sharedTunnel=classic delegates to
  // the same unmodified source route for screenshots/A/B.
  if(enabled)opts.sharedTunnelPlan0280=plan;
  skyline=installer(THREE,world,opts);
  return skyline;
 }
 function audit(){
  const f=vault?.foundation?.stats?.()??null,
   m=vault?.material?.stats?.()??null,
   a=vault?.architecture?.stats?.()??null,
   l=vault?.lighting?.stats?.()??null,
   sky=skyline?.stats?.()??null;
  return {
   version:trueShared?.active?"0.28.1":"0.28.0",track,active:!!trueShared?.active||(track==="vault"?!!f?.active:
    track==="skyline"?!!sky?.active:false),
   styleId:SHARED_TUNNEL_STYLE_0280.id,
   styleVersion:SHARED_TUNNEL_STYLE_0280.version,
   quality:plan.quality,
   totalTrackMeters:plan.length,
   tunnelMeters:plan.totalEnclosedMeters,
   sectionCount:plan.intervals.length,chunkCount:plan.totalChunks,
   segments:plan.intervals.map(s=>({
    start:s.start,end:s.end,profilePeriod:s.profilePeriod,
    portalCount:s.portals.length,chunkCount:s.chunks.length,
    fixturePreset:s.fixturePreset??"author-specified"
   })),
   commonProfile:"original Skyline 0.21.1",
   commonPanels:"original Skyline 0.24.1",
   commonMetal:"original Skyline 0.26.0/0.26.1/0.26.2/0.26.5",
   originalPhysicsUntouched:true,originalTrackUntouched:true,
   originalShipUntouched:true,originalGripUntouched:true,
   skylineLegacyPipelinePreserved:true,sharedPanelSource:true,
   oldTunnelRendererRecreated:false,
   skyline:sky?vitalize(sky):null,
   trueSharedRenderer:trueShared?.stats?.()??null,
   vault:f?{foundationActive:!!f.active,materialActive:!!m?.active,
    architectureActive:!!a?.active,lightingActive:!!l?.active,
    drawBatches:f.drawBatches??null,raisedPanels:a?.panels??null,
    physicalCoats:l?.physicalCoats??null}:null
  };
 }
 const vitalize=s=>({active:!!s.active,status:s.status??"active",
  version:s.version??null,drawBatches:s.drawBatches??null,
  sourcePanels:s.structuralPlates??null});
 return Object.freeze({
  plan,installVault,installSkyline,installTrueShared,audit,
  updateWave(wave){trueShared?.updateWave?.(wave);},
  refs:()=>vault??{foundation:stopped,material:stopped,
   architecture:stopped,lighting:stopped},
  dispose(){
   trueShared?.dispose?.();
   vault?.lighting?.dispose?.();
   vault?.architecture?.dispose?.();
   vault?.material?.dispose?.();
   vault?.foundation?.dispose?.();
   skyline?.dispose?.();
  }
 });
}
