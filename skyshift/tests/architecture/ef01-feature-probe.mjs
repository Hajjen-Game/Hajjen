// EF01C: baseline actual current flight modules, not historical implementations.
// Run each track in a fresh Node process because track selection is module-global.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [root,track]=process.argv.slice(2);
assert.ok(root&&['skyline','vault','aurora'].includes(track));
globalThis.location={search:'?track='+track};
const load=p=>import(pathToFileURL(resolve(root,'skyshift',p)));
const t=await load('trial-v0165.mjs'),g=await load('tracks/shared/track-3d-v0160.mjs'),a=await load('flight/air-tricks-v083.mjs');
const dt=1/120;
function stateAt(s){
 const f=t.newFlightState(),p=t.positionAt(s,0,0);
 Object.assign(f,{s,lap:Math.floor(s/t.CIRCUIT.lapLength)+1,worldX:p.x,worldZ:p.z,
  lateral:0,heading:t.headingAt(s),y:t.surfaceHeightAt(s)+t.TRIAL.hoverHeight,
  currentSpeed:t.speedAt(s,0),zoneCruiseSpeed:t.speedAt(s,0),grounded:true});
 return f;
}
function steering(s){
 const f=stateAt(s);
 for(let i=0;i<64;i++)t.stepFlight(f,dt,{steer:.65,grip:true});
 return {yaw:f.yawRate,peakYaw:f.peakYawRateDeg,prearmTicks:f.gripPreArmTicks,suppressed:f.gripYawSuppressedTicks,railContacts:f.railContacts};
}
function leap(direction,held){
 const start=t.SKYLINE_LEAP.start-8,f=stateAt(start);
 for(let i=0;i<480;i++){
  const active=held&&!f.grounded;
  const result=t.stepFlight(f,dt,{steer:active?direction*.85:0,grip:active});
  if(result.landed||f.failed||f.falls)break;
 }
 return {direction,held,launches:f.autoLaunches,landings:f.landings,cleanLandings:f.cleanLeapLandings,rolls:f.trickFullRotations,qualified:f.trickQualifiedLandings,boosts:f.landingBoostActivations,rejected:f.trickRejectedLandings,result:f.lastTrickResult,reason:f.lastTrickFailReason,falls:f.falls,landingS:f.s};
}
function pureTrick(direction,mode){
 const f=a.initAirTrickState({grounded:false,railContacts:0,lateral:0,currentSpeed:44});
 a.beginAirTrick(f,1);
 for(let i=0;i<(mode==='incomplete'?10:120);i++)a.advanceAirTrick(f,dt,direction,true);
 f.grounded=true;
 const judge=a.finalizeAirTrick(f,{lap:1,impact:mode==='hard'?30:7,headingErrorDeg:mode==='yaw'?30:0,lateralLimit:10,grounded:true,railContact:mode==='rail'});
 let peak=1;
 for(let i=0;i<240;i++){f.currentSpeed=44;peak=Math.max(peak,a.stepLandingBoost(f,dt,44));}
 assert.equal(judge.awarded,mode==='clean');
 assert.equal(f.landingBoostActivations,mode==='clean'?1:0);
 assert.equal(f.landingBoostMultiplier,1);
 return {direction,mode,judge,rolls:f.trickFullRotations,activations:f.landingBoostActivations,peak};
}
const pure=[-1,1].flatMap(d=>['clean','incomplete','hard','yaw','rail'].map(mode=>pureTrick(d,mode)));
const poses=Array.from({length:35},(_,i)=>i*t.CIRCUIT.lapLength/34).map(s=>({s,position:t.positionAt(s,0,0),bank:t.bankDegreesAt(s),grade:t.gradeAt(s),height:t.surfaceHeightAt(s)}));
assert.ok(poses.every(p=>[p.position.x,p.position.y,p.position.z,p.bank,p.grade,p.height].every(Number.isFinite)));
assert.equal(t.GAPS.length,track==='skyline'?1:0);
const steer=steering(510);
if(track!=='skyline')assert.equal(steer.suppressed,0);
const jumps=track==='skyline'?[[0,false],[-1,true],[1,true]].map(([d,h])=>leap(d,h)):[];
if(track==='skyline'){
 assert.equal(jumps[0].launches,1);
 assert.equal(jumps[0].boosts,0);
 assert.ok(Math.abs(t.bankDegreesAt((g.MAGNETIC_WALL.riseEnd+g.MAGNETIC_WALL.fallStart)/2))>69);
 assert.ok(Math.abs(t.bankDegreesAt((g.CORKSCREW.start+g.CORKSCREW.end)/2))>179);
}
// Integrated outcomes are observations, not invented acceptance for a future generic fixture.
console.log('SKYSHIFT_EF01_FEATURE '+JSON.stringify({track,trial:t.TRIAL.id,gaps:t.GAPS,topology:g.TRACK_3D,elevation:g.elevationAudit(),steer,jumps,pure,poses,validation:t.validateTrial()}));
