// One route-configured optical assembly for live game and independent renderer.
import {createSharedSourceSampler0282,installSharedRoadReflections0282,installSharedShipLight0282} from './shared-road-ship-light-v0282.mjs';
import {createUnifiedSourceRegistry02894,installUnifiedCeilingRoad02894} from './unified-tunnel-light-sources-v02894.mjs';
import {vaultStraightMask02891,installVaultStraightRoadParity02891} from './shared-straight-edge-parity-v02891.mjs';
import {installArchRoadReflection02893} from './premium-arch-optics-v02893.mjs';
import {installRoadSpill02895} from './road-spill-wave-coves-v02895.mjs';
import {installCinematicRoad0289} from '../rendering/cinematic-metal-neon-v0289.mjs';
import {installPmremReflectionPipeline0284} from './pmrem-reflection-pipeline-v0284.mjs';

export function createSharedOpticalContext({positionAt,sourcePositionAt=positionAt,trackLength,lowMemory,tunnel,enabled,unifiedSources}){
 const sourceSampler=enabled?createSharedSourceSampler0282(sourcePositionAt,trackLength,tunnel?.modules):null;
 const ranges=tunnel?.policy?.straightOnly?tunnel.policy.straightRanges:undefined;
 const sourceRegistry=sourceSampler&&unifiedSources?
  createUnifiedSourceRegistry02894(positionAt,trackLength,{lowMemory,sourceSampler,
   straightMask:ranges?s=>vaultStraightMask02891(s,ranges,trackLength):undefined}):null;
 return {positionAt,trackLength,lowMemory,sourceSampler,ranges,sourceRegistry,sourceModules:tunnel?.modules};
}
export function installSharedOpticalShip(THREE,ship,context,enabled){
 const controller=installSharedShipLight0282(THREE,{enabled,positionAt:context.positionAt,
  trackLength:context.trackLength,lowMemory:context.lowMemory,sourceSampler:context.sourceSampler});
 controller.attachShip(ship);return controller;
}
// Always start native cinematic finishes at zero, before the static PMREM capture.
export function installSharedRoadOptics(THREE,world,context,policy,{initialWave,previousCeiling,previousSpill}={}){
 const {positionAt,trackLength,lowMemory,sourceSampler,ranges,sourceRegistry,sourceModules}=context;
 const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
 const native=installSharedRoadReflections0282(THREE,world,{enabled:policy.road,positionAt,trackLength,lowMemory,sourceSampler});
 const finish=installCinematicRoad0289(world,{enabled:policy.cinematic&&!!native?.active,lowMemory,road:false});
 const straight=installVaultStraightRoadParity02891(THREE,deck,{enabled:policy.straight&&!!native?.active&&!!finish?.active,ranges,trackLength});
 if(policy.straight&&!straight?.active)throw Error("0.28.9.1 native straight-only road mask unavailable: "+(straight?.stats?.().reason??"unknown"));
 const arch=installArchRoadReflection02893(THREE,world,positionAt,{enabled:policy.arch&&!!native?.active&&!!straight?.active,lowMemory,trackLength,unifiedSources:policy.unifiedSources,sourceSampler,sourceRegistry});
 if(policy.arch&&!arch?.active)throw Error("0.28.9.3 real zone-colored arch GGX unavailable: "+(arch?.stats?.().reason??"unknown"));
 if(initialWave!==undefined){arch?.updateWave?.(initialWave);previousCeiling?.updateWave?.(initialWave);previousSpill?.updateWave?.(initialWave);}
 const cove=installUnifiedCeilingRoad02894(THREE,world,positionAt,{enabled:policy.ceiling&&!!arch?.active&&policy.ceilingFixtures,lowMemory,trackLength,sourceRegistry});
 if(policy.ceiling&&policy.arch&&policy.ceilingFixtures&&!cove?.active)throw Error("0.28.9.4 source-matched physical ceiling road response missing");
 if(initialWave!==undefined){cove?.updateWave?.(initialWave);previousSpill?.updateWave?.(initialWave);}
 const spill=installRoadSpill02895(THREE,deck,{enabled:policy.spill&&!!straight?.active&&!!cove?.active,lowMemory,trackLength,sourceModules,edgeOnly:policy.edgeOnly===true});
 if(policy.spill&&!spill.active)throw Error("0.28.9.5 original physical lip spill missing");
 if(initialWave!==undefined)spill.updateWave?.(initialWave);
 return {native,finish,straight,arch,cove,spill};
}

// Called after all source geometry, ship and legacy physical shaders are ready.
// Preserve the approved pre-cinematic radiance capture even with PMREM disabled:
// an explicit comparison mode still activates the requested visible finishes.
export function finalizeSharedOptics(THREE,renderer,scene,world,context,{
 track,ship,tunnel,pmremEnabled,finish,cinematic=null,markStartup=()=>{}
}={}){
 const {positionAt,trackLength,lowMemory}=context;
 markStartup("pmremBegin");
 const pmrem=installPmremReflectionPipeline0284(THREE,renderer,scene,world,{
  enabled:pmremEnabled,track,positionAt,trackLength,lowMemory,ship,tunnel
 });
 markStartup("pmremReady");
 if(cinematic){
  tunnel?.setCinematicMetalComparison?.({contrast:cinematic.contrast,strips:cinematic.strips});
  finish?.setComparison?.({road:cinematic.road});
 }
 return pmrem;
}
