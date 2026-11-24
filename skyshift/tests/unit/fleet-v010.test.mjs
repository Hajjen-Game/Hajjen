import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {FLEET,FLEET_STORAGE_KEY,initialFleet,normalizeFleet,isFleetUnlocked,
 readFleet,saveFleet,equipFleet,recordFleetClear,fleetStatus}
 from "../../ships/fleet-v010.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
function storage(){
 const map=new Map();
 return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
}
test("two distinct ships and one full three-lap clear reward",()=>{
 assert.deepEqual(FLEET.map(x=>x.id),["manta","stingray"]);
 assert.equal(FLEET[1].unlockClears,1);
 const first=initialFleet();
 assert.equal(isFleetUnlocked(first,"manta"),true);
 assert.equal(isFleetUnlocked(first,"stingray"),false);
 assert.equal(equipFleet(first,"stingray").selected,"manta");
 assert.deepEqual(recordFleetClear(first,false).newlyUnlocked,[]);
 const won=recordFleetClear(first,true);
 assert.deepEqual(won.newlyUnlocked,["stingray"]);
 assert.equal(isFleetUnlocked(won.state,"stingray"),true);
 assert.equal(equipFleet(won.state,"stingray").selected,"stingray");
 const again=recordFleetClear(won.state,true);
 assert.deepEqual(again.newlyUnlocked,[]);
 assert.equal(again.state.clears,2);
});
test("stored progression survives reload and malformed data cannot equip locked aircraft",()=>{
 const store=storage();
 assert.deepEqual(readFleet(store),initialFleet());
 store.setItem(FLEET_STORAGE_KEY,JSON.stringify({selected:"stingray",clears:0}));
 assert.equal(readFleet(store).selected,"manta");
 const finished=recordFleetClear(readFleet(store),true);
 const selected=equipFleet(finished.state,"stingray");
 saveFleet(store,selected);
 assert.deepEqual(readFleet(store),selected);
 assert.equal(fleetStatus(selected).unlocked.length,2);
 assert.deepEqual(normalizeFleet({clears:-5,selected:"ghost"}),initialFleet());
 store.setItem(FLEET_STORAGE_KEY,"{oops");
 assert.deepEqual(readFleet(store),initialFleet());
 const broken={getItem(){throw Error("blocked")},setItem(){throw Error("blocked")}};
 assert.deepEqual(readFleet(broken),initialFleet());
 assert.equal(saveFleet(broken,selected).selected,"stingray");
});
test("production fleet has live hangar and retained previous handling",()=>{
 const html=read("./index.html"),boot=read("./boot-v0103.js"),
  game=read("./game-v0103.mjs"),old=read("./legacy/game/game-v0921.mjs");
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 for(const id of ["hangar-screen","hangar-btn","hangar-back",
  "fleet-progress","fleet-unlock-toast","fleet-preview-title"]){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/buildStingrayEvo/);
 assert.match(game,/readFleet\(fleetStorage\(\)\)/);
 assert.match(game,/recordFleetClear\(fleetProgress,won\)/);
 assert.match(game,/fleetSmoke/);
 assert.match(game,/shadow-tunnel-v092\.mjs/);
 assert.match(game,/tunnel-blackout-v0921\.mjs/);
 assert.match(game,/kinetic-camera-v090\.mjs/);
 assert.match(game,/signature-flight-v091\.mjs/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(old,/version:"0\.9\.2\.1"/);
});
