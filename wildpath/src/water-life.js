// Living Water 1.0 — deterministic visual world-state, independent of combat.
// Spells create short-lived wet ground; clustered defeats may turn it into a pond.
export const WATER_MAX_SPOTS=14;
export const WATER_MAX_PONDS=8;
export const WATER_MAX_RADIUS=5.8;
export const WATER_POND_KILLS=3;
export const WATER_POND_RARE=6;
export const WATER_STYLE=Object.freeze({
  'Glint Dart':'Water Dart','Winter Pool':'Rainfall',
  'Crystal Bloom':'Tidal Bloom','Pale Guard':'Tide Guard',
  'Crystal Cascade':'Tidal Cascade','Glint Splash':'Water Splash'
});
const finite=(...xs)=>xs.every(Number.isFinite);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const visibleWaterSpell=(name,open=true)=>open?(WATER_STYLE[name]||name):name;
export function newWaterLedger(){return {spots:[],nextId:1,pondsMade:0};}
export function waterCast(ledger,{x,z,kind,time,radius=2.7}){
  if(!finite(x,z,time,radius)||radius<=0||!['rain','tide'].includes(kind))return null;
  const r=Math.min(WATER_MAX_RADIUS,Math.max(1.4,radius));
  // Join nearby splashes instead of building overlapping water discs.
  let spot=ledger.spots.filter(s=>!s.permanent&&distance(s,{x,z})<Math.min(s.radius,r)*.72)
    .sort((a,b)=>distance(a,{x,z})-distance(b,{x,z}))[0];
  if(spot){
    spot.time=time;spot.kind=kind;spot.radius=Math.min(WATER_MAX_RADIUS,Math.max(spot.radius,r));
    spot.expires=time+(kind==='rain'?12:9);
    return {id:spot.id,kind:spot.kind,x:spot.x,z:spot.z,radius:spot.radius,
      permanent:false,existing:true};
  }
  if(ledger.spots.length>=WATER_MAX_SPOTS){
    const oldest=ledger.spots.find(s=>!s.permanent);
    if(!oldest)return null;
    ledger.spots.splice(ledger.spots.indexOf(oldest),1);
  }
  spot={id:ledger.nextId++,kind,x,z,radius:r,permanent:false,
    kills:0,rare:false,time,expires:time+(kind==='rain'?12:9)};
  ledger.spots.push(spot);
  return {...spot,existing:false};
}
export function waterKill(ledger,{x,z,time}){
  if(!finite(x,z,time))return [];
  const candidates=ledger.spots.filter(s=>!s.permanent && time<=s.expires &&
    distance(s,{x,z})<=s.radius*.95);
  if(!candidates.length)return [];
  // Count a kill only ONCE in its closest wet area.
  const spot=candidates.sort((a,b)=>distance(a,{x,z})-distance(b,{x,z}))[0];
  spot.kills++;
  if(spot.kills<WATER_POND_KILLS)return [];
  if(ledger.spots.filter(s=>s.permanent).length>=WATER_MAX_PONDS){
    // Don't silently erase player-earned ponds.
    return [];
  }
  spot.permanent=true;spot.rare=spot.kills>=WATER_POND_RARE;
  spot.radius=Math.min(WATER_MAX_RADIUS,Math.max(2.5,spot.radius*.75));
  ledger.pondsMade++;
  return [{...spot,kind:'pond',promoted:true}];
}
export function ageWater(ledger,time){
  if(!Number.isFinite(time))return [];
  const expired=ledger.spots.filter(s=>!s.permanent&&time>s.expires).map(s=>s.id);
  ledger.spots=ledger.spots.filter(s=>s.permanent||time<=s.expires);
  return expired;
}
export function waterState(ledger){
  const ponds=ledger.spots.filter(s=>s.permanent);
  return {spots:ledger.spots.length,ponds:ponds.length,
    temporary:ledger.spots.length-ponds.length,pondsMade:ledger.pondsMade,
    rarePonds:ponds.filter(s=>s.rare).length};
}
