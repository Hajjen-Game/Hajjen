// SKYSHIFT 0.10.0 — Fleet foundation & saved progression.
// Pure, testable state; storage is optional and injected (safely falls back
// to Manta Blade). All ships share identical authoritative flight physics.
export const FLEET_VERSION="fleet-foundation-010";
export const FLEET_STORAGE_KEY="skyshift-fleet-v010";
export const FLEET=Object.freeze([
 Object.freeze({id:"manta",name:"MANTA BLADE",subtitle:"SPLIT-TAIL INTERCEPTOR",
  unlockedInitially:true,unlockClears:0,signature:"Hard-edged delta craft",
  handling:"Same performance · Signature Flight Motion"}),
 Object.freeze({id:"stingray",name:"STINGRAY EVO",subtitle:"ARTICULATED MANTA",
  unlockedInitially:false,unlockClears:1,signature:"Nine-section kinetic tail",
  handling:"Same performance · Distinct tail choreography"})
]);
const find=id=>FLEET.find(x=>x.id===id);
const nonnegative=n=>Number.isFinite(n)?Math.max(0,Math.min(1e6,Math.floor(n))):0;
export function initialFleet(){
 return {version:1,clears:0,selected:"manta"};
}
export function isFleetUnlocked(state,id){
 const ship=find(id);
 return !!ship&&(ship.unlockedInitially||
  nonnegative(state?.clears)>=ship.unlockClears);
}
export function normalizeFleet(source){
 const progress=initialFleet();
 if(!source||typeof source!=="object"||Array.isArray(source))return progress;
 progress.clears=nonnegative(source.clears);
 progress.selected=isFleetUnlocked(progress,source.selected)?
  source.selected:"manta";
 return progress;
}
export function readFleet(storage){
 try{
  if(!storage)return initialFleet();
  const raw=storage.getItem(FLEET_STORAGE_KEY);
  return raw?normalizeFleet(JSON.parse(raw)):initialFleet();
 }catch{return initialFleet();}
}
export function saveFleet(storage,progress){
 const safe=normalizeFleet(progress);
 try{storage?.setItem(FLEET_STORAGE_KEY,JSON.stringify(safe));}
 catch{/* blocked storage/private mode: gameplay still works */}
 return safe;
}
export function equipFleet(state,id){
 const current=normalizeFleet(state);
 if(!isFleetUnlocked(current,id))return current;
 return {...current,selected:id};
}
export function recordFleetClear(state,won){
 const current=normalizeFleet(state);
 if(!won)return {state:current,newlyUnlocked:[]};
 const next={...current,clears:current.clears+1};
 const newlyUnlocked=FLEET.filter(x=>!isFleetUnlocked(current,x.id)&&
   isFleetUnlocked(next,x.id)).map(x=>x.id);
 return {state:next,newlyUnlocked};
}
export function fleetStatus(state){
 const current=normalizeFleet(state);
 return {version:FLEET_VERSION,clears:current.clears,
  selected:current.selected,
  unlocked:FLEET.filter(x=>isFleetUnlocked(current,x.id)).map(x=>x.id),
  available:FLEET.length};
}
