// SKYSHIFT 0.10.3 – Manta Blade receives a restrained, shared premium
// surface pass without altering its recognisable hard-edge delta geometry,
// cockpit, dual engine coordinates, GRIP response or flight physics.
import {buildMantaBlade,MANTA_IDENTITY,ENGINE_SOCKETS}
 from "../manta-blade-v0484.mjs";
import {buildShipPolish,SHIP_POLISH} from "./ship-polish-v0103.mjs";
export const MANTA_POLISH=Object.freeze({
 ...MANTA_IDENTITY,version:"manta-premium-0103",
 sharedDetailLanguage:SHIP_POLISH.version,
 addedLights:0,physicsChanged:false
});
export function buildPremiumMantaBlade(THREE,shipGlow){
 const craft=buildMantaBlade(THREE,shipGlow);
 const finish=buildShipPolish(THREE,craft.ship,{
  variant:"manta",engineSockets:ENGINE_SOCKETS
 });
 craft.ship.name="Manta Blade · premium interceptor finish";
 return {...craft,spec:MANTA_POLISH,
  framePolish:finish.frame,resetPolish:finish.reset,
  polishStats:finish.stats,
  polishSurfaces:finish.surfaces};
}
