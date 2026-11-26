// One route-configured optical assembly for live game and independent renderer.
import {createSharedSourceSampler0282,installSharedRoadReflections0282,installSharedShipLight0282} from './shared-road-ship-light-v0282.mjs';
import {createUnifiedSourceRegistry02894,installUnifiedCeilingRoad02894} from './unified-tunnel-light-sources-v02894.mjs';
import {vaultStraightMask02891,installVaultStraightRoadParity02891} from './shared-straight-edge-parity-v02891.mjs';
import {installArchRoadReflection02893} from './premium-arch-optics-v02893.mjs';
import {installRoadSpill02895} from './road-spill-wave-coves-v02895.mjs';
import {installCinematicRoad0289} from '../rendering/cinematic-metal-neon-v0289.mjs';

export function createSharedOpticalContext({positionAt,trackLength,lowMemory,tunnel,enabled,unifiedSources}){
 const sourceSampler=enabled?createSharedSourceSampler0282(positionAt,trackLength,tunnel?.modules):null;
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
// Keep the original shader order and the caller-owned PMREM capture timing.
export function installSharedRoadOptics(THREE,world,context,policy,{initialWave,previousCeiling,previousSpill,roadStrength=false}={}){
 const {positionAt,trackLength,lowMemory,sourceSampler,ranges,sourceRegistry,sourceModules}=context;
 const deck=world.getObjectByName("Zone Ribbon · integrated PBR racing deck");
 const native=installSharedRoadReflections0282(THREE,world,{enabled:policy.road,positionAt,trackLength,lowMemory,sourceSampler});
 const finish=installCinematicRoad0289(world,{enabled:policy.cinematic&&!!native?.active,lowMemory,road:roadStrength});
 const straight=installVaultStraightRoadParity02891(THREE,deck,{enabled:policy.straight&&!!native?.active&&!!finish?.active,ranges,trackLength});
 if(policy.straight&&!straight?.active)throw Error("0.28.9.1 native straight-only road mask unavailable: "+(straight?.stats?.().reason??"unknown"));
 const arch=installArchRoadReflection02893(THREE,world,positionAt,{enabled:policy.arch&&!!native?.active&&!!straight?.active,lowMemory,trackLength,unifiedSources:policy.unifiedSources,sourceSampler,sourceRegistry});
 if(policy.arch&&!arch?.active)throw Error("0.28.9.3 real zone-colored arch GGX unavailable: "+(arch?.stats?.().reason??"unknown"));
 if(initialWave!==undefined){arch?.updateWave?.(initialWave);previousCeiling?.updateWave?.(initialWave);previousSpill?.updateWave?.(initialWave);}
 const cove=installUnifiedCeilingRoad02894(THREE,world,positionAt,{enabled:policy.ceiling&&!!arch?.active&&policy.ceilingFixtures,lowMemory,trackLength,sourceRegistry});
 if(policy.ceiling&&policy.arch&&policy.ceilingFixtures&&!cove?.active)throw Error("0.28.9.4 source-matched physical ceiling road response missing");
 if(initialWave!==undefined){cove?.updateWave?.(initialWave);previousSpill?.updateWave?.(initialWave);}
 const spill=installRoadSpill02895(THREE,deck,{enabled:policy.spill&&!!straight?.active&&!!cove?.active,lowMemory,trackLength,sourceModules});
 if(policy.spill&&!spill.active)throw Error("0.28.9.5 original physical lip spill missing");
 if(initialWave!==undefined)spill.updateWave?.(initialWave);
 return {native,finish,straight,arch,cove,spill};
}
