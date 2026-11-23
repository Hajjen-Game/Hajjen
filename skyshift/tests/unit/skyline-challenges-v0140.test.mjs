import test from "node:test";
import assert from "node:assert/strict";
import {CHALLENGES_0140,CHALLENGE_RULES_0140,initialChallengeProgress,
 readChallengeProgress,saveChallengeProgress,challengeUnlocked,medalsEarned,
 evaluateChallenge,recordChallenge,challengeSummary,captureChallengeMetrics,
 normalizeChallengeProgress} from "../../tracks/skyline/skyline-challenges-v0140.mjs";
import {TRIAL,newFlightState,CIRCUIT,SKYLINE_LEAP,GRIP_APEX,
 MAGNETIC_WALL,CORKSCREW,poseAt} from "../../trial-v01348.mjs";
import {readFileSync} from "node:fs";
const src=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const sample=(c,o={})=>({reachedExit:true,elapsed:c.goldSeconds-1,
 railContacts:0,falls:0,gripSeconds:2,qualifiedLandings:1,
 cleanWallExits:1,cleanCorkscrewExits:1,cleanCarves:3,...o});
test("eight authored legal sections with existing collision and physics",()=>{
 assert.equal(CHALLENGES_0140.length,8);
 assert.equal(new Set(CHALLENGES_0140.map(c=>c.id)).size,8);
 for(const c of CHALLENGES_0140){
  assert.ok(c.startS>=5&&c.endS<=CIRCUIT.lapLength&&c.endS>c.startS+200);
  assert.ok(c.goldSeconds>10&&c.goldSeconds<100);
  assert.ok(poseAt(c.startS).x!==undefined);
 }
 assert.ok(CHALLENGES_0140.find(x=>x.id==="skyline-leap").startS<SKYLINE_LEAP.start);
 assert.ok(CHALLENGES_0140.find(x=>x.id==="skyline-leap").endS>SKYLINE_LEAP.end);
 assert.ok(CHALLENGES_0140.find(x=>x.id==="precision-apex").startS<GRIP_APEX.throatStart);
 assert.ok(CHALLENGES_0140.find(x=>x.id==="precision-apex").endS>GRIP_APEX.throatEnd);
 assert.ok(CHALLENGES_0140.find(x=>x.id==="magnetic-wall").startS<MAGNETIC_WALL.start);
 assert.ok(CHALLENGES_0140.find(x=>x.id==="corkscrew").endS>CORKSCREW.end);
 assert.equal(CHALLENGE_RULES_0140.pilotPhysicsUnchanged,true);
});
test("bronze always finish, silver requires a controlled skill, gold needs skill and speed",()=>{
 for(const c of CHALLENGES_0140){
  assert.equal(evaluateChallenge(c,sample(c,{reachedExit:false})).medal,"none");
  assert.equal(evaluateChallenge(c,sample(c,{falls:1,railContacts:3})).medal,"bronze");
  assert.equal(evaluateChallenge(c,sample(c)).medal,"gold");
  assert.equal(evaluateChallenge(c,sample(c,{elapsed:c.goldSeconds+4})).medal,"silver");
  assert.equal(evaluateChallenge(c,sample(c,{railContacts:1})).medal,"silver");
 }
 const leap=CHALLENGES_0140.find(x=>x.id==="skyline-leap");
 assert.equal(evaluateChallenge(leap,sample(leap,{qualifiedLandings:0})).medal,"bronze");
 const apex=CHALLENGES_0140.find(x=>x.id==="precision-apex");
 assert.equal(evaluateChallenge(apex,sample(apex,{gripSeconds:0})).medal,"bronze");
 const master=CHALLENGES_0140.at(-1);
 assert.equal(evaluateChallenge(master,sample(master,{qualifiedLandings:0,cleanCarves:0,cleanWallExits:0})).medal,"bronze");
 assert.equal(evaluateChallenge(master,sample(master,{qualifiedLandings:0})).medal,"silver");
});
test("progression unlocks 2 starting challenges then one bronze per next card",()=>{
 let p=initialChallengeProgress();
 assert.equal(challengeSummary(p).available,2);
 assert.equal(challengeUnlocked(p,CHALLENGES_0140[2].id),false);
 for(let i=0;i<6;i++){
  const c=CHALLENGES_0140[i];
  assert.equal(challengeUnlocked(p,c.id),true);
  const gained=recordChallenge(p,c.id,evaluateChallenge(c,sample(c)));
  p=gained.progress;
  assert.equal(medalsEarned(p),i+1);
  assert.equal(challengeUnlocked(p,CHALLENGES_0140[Math.min(7,i+2)].id),true);
 }
 assert.equal(challengeSummary(p).available,8);
});
test("saved medal is never downgraded; faster bronze does not erase gold",()=>{
 const c=CHALLENGES_0140[0],p=initialChallengeProgress();
 const gold=recordChallenge(p,c.id,evaluateChallenge(c,sample(c))).progress;
 const faster=recordChallenge(gold,c.id,evaluateChallenge(c,
  sample(c,{railContacts:5,elapsed:c.goldSeconds-2}))).progress;
 assert.equal(faster.records[c.id].medal,"gold");
 assert.ok(faster.records[c.id].bestSeconds<c.goldSeconds);
 assert.equal(recordChallenge(p,"bogus",{medal:"gold",elapsed:1}).improved,false);
 assert.equal(recordChallenge(p,CHALLENGES_0140[4].id,{medal:"gold",elapsed:1}).improved,false);
});
test("local storage roundtrip, malformed saves and ruleset mismatch are safe",()=>{
 const mem=new Map(),store={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};
 const a=CHALLENGES_0140[0];
 const updated=recordChallenge(initialChallengeProgress(),a.id,
   evaluateChallenge(a,sample(a))).progress;
 saveChallengeProgress(store,updated);
 assert.deepEqual(readChallengeProgress(store),updated);
 assert.deepEqual(normalizeChallengeProgress({version:1,ruleset:"obsolete",
  records:updated.records}),initialChallengeProgress());
 assert.deepEqual(readChallengeProgress({getItem:()=>"{bad json"}),initialChallengeProgress());
});
test("real 120Hz flight metrics drive medals, not UI or cosmetic animation",()=>{
 const c=CHALLENGES_0140[0],f=newFlightState();
 f.s=c.endS;f.elapsed=14;f.railContacts=0;f.falls=0;
 const m=captureChallengeMetrics(c,f,{cleanCarves:0});
 assert.equal(m.reachedExit,true);
 assert.equal(evaluateChallenge(c,m).medal,"gold");
 f.railContacts=1;
 assert.equal(evaluateChallenge(c,captureChallengeMetrics(c,f,{})).medal,"silver");
});
test("0.14.0 boots and keeps identical normal race physics and ships",()=>{
 const game=src("./game-v0140.mjs");
 const html=src("./index.html"),boot=src("./legacy/boot/boot-v0140.js");
 assert.match(game,/from "\.\/trial-v01348\.mjs"/);
 assert.match(game,/const result=stepFlight\(flight,dt,\{steer,grip:gripHeld\}\)/);
 assert.match(game,/ship\.rotation\.z=naturalRoll;/);
 assert.match(game,/from "\.\/skyline-challenges-v0140\.mjs"/);
 assert.match(html,/id="challenges-screen"/);
 assert.match(html,/id="challenges-btn"/);
 assert.match(html,/boot-v0140\.js\?v=0\.14\.0/);
 assert.match(boot,/game-v0140\.mjs\?v=0\.14\.0/);
 assert.doesNotMatch(game,/steering-authority-v0901\.mjs/);
});
