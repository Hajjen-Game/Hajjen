// SKYSHIFT 0.10.3 — Signature Flight Motion: deterministic presentation QA.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {SIGNATURE_FLIGHT,createSignatureFlightState,stepSignatureFlight,
 triggerSignatureJump,triggerSignatureLanding,triggerSignatureBoost,
 signatureFlightAudit} from "../../flight/signature-flight-v091.mjs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const sample=(fps,view,seconds=1)=>{
 const st=createSignatureFlightState();
 for(let k=0;k<Math.round(fps*seconds);k++)
  stepSignatureFlight(st,1/fps,view);
 return st;
};
test("cosmetic GRIP power-carve is stronger than the normal banking layer",()=>{
 const base={speed:80,steering:.74,yawRate:.56,grounded:true,
  boostMultiplier:1,gripIntensity:0};
 const normal=sample(60,base),grip=sample(60,{...base,gripIntensity:1});
 assert.ok(Math.abs(grip.roll)>Math.abs(normal.roll)*2.8);
 assert.ok(grip.engineEnergy>normal.engineEnergy);
 assert.ok(Math.abs(grip.engineSplit)>Math.abs(normal.engineSplit)*2);
 assert.ok(grip.roll<0,"right steering visually banks to the right");
 assert.equal(SIGNATURE_FLIGHT.physicsChanged,false);
 assert.equal(SIGNATURE_FLIGHT.extraDrawCalls,0);
});
test("analytic smoothing gives near-identical motion at 30/60/120fps",()=>{
 const view={speed:90,steering:-.9,yawRate:-.8,gripIntensity:.75,
  grounded:true,boostMultiplier:1.4};
 const a=sample(30,view,1.5),b=sample(60,view,1.5),c=sample(120,view,1.5);
 for(const key of ["roll","pitch","lift","engineEnergy","engineSplit"]){
  assert.ok(Math.abs(a[key]-b[key])<1e-9,key+" 30 vs 60");
  assert.ok(Math.abs(b[key]-c[key])<1e-9,key+" 60 vs 120");
 }
});
test("air tricks, corkscrew and magnetic wall suppress added bank",()=>{
 const base={speed:72,steering:1,yawRate:1,gripIntensity:1,
  grounded:true};
 const normal=sample(120,base),wall=sample(120,{...base,wall:true}),
  cork=sample(120,{...base,corkscrew:true}),
  trick=sample(120,{...base,grounded:false,trickActive:true});
 assert.ok(Math.abs(wall.roll)<Math.abs(normal.roll)*.25);
 assert.ok(Math.abs(cork.roll)<Math.abs(normal.roll)*.05);
 assert.ok(Math.abs(trick.roll)<1e-9);
 assert.ok(wall.protectedFrames>0&&cork.protectedFrames>0);
});
test("bounded takeoff/landing/boost responses and frozen pause",()=>{
 const st=createSignatureFlightState();
 triggerSignatureJump(st);triggerSignatureLanding(st,90);triggerSignatureBoost(st);
 assert.equal(st.launches,1);assert.equal(st.landings,1);assert.equal(st.boosts,1);
 for(let k=0;k<240;k++)stepSignatureFlight(st,1/120,{
  speed:115,steering:k<120?1:-1,yawRate:k<120?1.24:-1.24,
  gripIntensity:1,boostMultiplier:1.4,grounded:true});
 assert.ok(Math.abs(st.roll)<=SIGNATURE_FLIGHT.maxExtraRollRadians);
 assert.ok(Math.abs(st.pitch)<=SIGNATURE_FLIGHT.maxExtraPitchRadians);
 assert.ok(Math.abs(st.lift)<=SIGNATURE_FLIGHT.maxExtraLiftMeters);
 const snapshot=JSON.stringify(st);
 stepSignatureFlight(st,0,{steering:0,gripIntensity:0});
 assert.equal(JSON.stringify(st),snapshot);
 assert.ok(signatureFlightAudit(st).peakTwinEngineSplit>0);
});
test("0.10.3 live source retains GRIP-first pilot physics and Kinetic Camera",()=>{
 const html=read("./index.html"),boot=read("./boot-v0103.js"),
  game=read("./game-v0103.mjs"),prior=read("./legacy/game/game-v0901.mjs");
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/signature-flight-v091\.mjs/);
 assert.match(game,/kinetic-camera-v090\.mjs/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(game,/triggerSignatureLanding/);
 assert.match(game,/signatureFlightAudit/);
 assert.match(prior,/version:"0\.9\.0\.1"/);
 assert.match(read("./trial-v0901.mjs"),/GRIP-First Steering Balance/);
});
