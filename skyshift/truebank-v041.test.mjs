import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 TRIAL,GAPS,ISLANDS,SPLITS,CHECKPOINTS,bankAt,bankDegreesAt,
 poseAt,positionAt,projectWorldToTrack,headingAt,roadIntervals,
 surfaceHeightAt,surfaceNormalAt,MAX_BANK_RAD,
 newFlightState,stepFlight,onRoad,validateTrial,speedAt,clamp
} from "./trial-v041.mjs";
import {createSurfacePlan,validateSurfacePlan} from "./identity-v041.mjs";
const src=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const dt=1/120;
const rad=x=>x*Math.PI/180;
const setPose=(st,s,l,yawOffset=0)=>{
 const p=positionAt(s,l,0);
 st.s=s;st.lateral=l;st.worldX=p.x;st.worldZ=p.z;
 st.heading=headingAt(s)+yawOffset;st.steering=0;st.lastInput=0;
 st.grounded=true;st.y=surfaceHeightAt(s,l)+TRIAL.hoverHeight;st.vy=0;
 st.coyote=0;st.jumpBuffer=0;st.jumpHold=0;
};

test("course geometry remains continuous; banking ramps to a real 3D cross-slope",()=>{
 assert.deepEqual(validateTrial(),[]);
 assert.equal(TRIAL.length,1300);
 assert.equal(GAPS.length,6);
 const sampled=[44,60,79,109,201,222,722,745,998,1160,1220];
 assert.ok(sampled.filter(s=>Math.abs(bankDegreesAt(s))>8).length>=7);
 for(let s=0;s<TRIAL.length;s+=1){
   const bank=bankAt(s);
   assert.ok(Number.isFinite(bank));
   assert.ok(Math.abs(bank)<=MAX_BANK_RAD+1e-8);
   assert.ok(Math.abs(bankAt(s+.2)-bank)<.03,"bank step at "+s);
   for(const lateral of [-widthAtFast(s)*.38,0,widthAtFast(s)*.38]){
     const pos=positionAt(s,lateral,0);
     assert.ok(Math.abs(pos.y-surfaceHeightAt(s,lateral))<1e-8);
     const p=projectWorldToTrack(pos.x,pos.z,s);
     assert.ok(Math.abs(p.s-s)<.12,"projection s "+s+" got "+p.s);
     assert.ok(Math.abs(p.lateral-lateral)<.22,"projection lane "+s+" got "+p.lateral);
   }
   const n=surfaceNormalAt(s);
   assert.ok(Math.abs(Math.hypot(n.x,n.y,n.z)-1)<1e-8);
 }
});
function widthAtFast(s){
 const lanes=roadIntervals(s);
 return lanes.length?lanes.reduce((w,[a,b])=>Math.max(w,b-a),0):17;
}

test("real banked road slopes opposite the bend and stays flat at jump boundaries",()=>{
 const s=72,bank=bankAt(s);
 assert.ok(bank>.12,"opening right turn should have a clearly banked surface");
 assert.ok(surfaceHeightAt(s,-8)>surfaceHeightAt(s,+8)+1);
 for(const gap of GAPS){
   for(const point of [gap.start-2,gap.start,gap.end,gap.end+2])
     assert.ok(Math.abs(bankAt(point))<.02,gap.id+" bank too close to jump "+point);
 }
 for(const a of [354,392,420,575,599,640,860])
   assert.ok(Math.abs(bankAt(a))<.02,"island and risk cuts must remain neutral "+a);
});

test("no stick input means no automatic turning, even while the road bends away",()=>{
 const st=newFlightState(),initial=st.heading;
 let leftRoad=false,n=0;
 while(n++<1500&&!st.failed){
   const r=stepFlight(st,dt,{steer:0});
   if(!onRoad(st.s,st.lateral)){leftRoad=true;break;}
   if(r.crashed)break;
 }
 assert.ok(leftRoad,"unsteered ship should eventually fly out of an authored curve");
 assert.ok(Math.abs(st.heading-initial)<1e-9,"road heading must not steer the craft");
 assert.ok(st.offRoadSeconds>0,"telemetry must record real off-deck travel");
 const code=src("trial-v041.mjs");
 assert.doesNotMatch(code,/state\.heading\s*=\s*headingAt\(state\.s\)/);
 assert.doesNotMatch(code,/state\.sideVelocity=lerp\(state\.sideVelocity,\s*steer\*TRIAL\.sideSpeed/);
 assert.doesNotMatch(code,/turnLoadAt/);
});

test("left and right input change craft heading and real x-z velocity independently",()=>{
 const left=newFlightState(),right=newFlightState(),idle=newFlightState();
 for(let i=0;i<50;i++){
   stepFlight(left,dt,{steer:-1});
   stepFlight(right,dt,{steer:1});
   stepFlight(idle,dt,{steer:0});
 }
 assert.ok(left.heading<idle.heading-.2);
 assert.ok(right.heading>idle.heading+.2);
 assert.ok(left.worldX<idle.worldX-.3);
 assert.ok(right.worldX>idle.worldX+.3);
 assert.equal(left.steerSeconds>0,true);
 assert.equal(idle.steerSeconds,0);
});

test("all 6 authored platform leaps remain jumpable with manual world flight",()=>{
 // Each scenario starts on the REAL deck before a gap, with no teleport during
 // its flight. Turned island-two requires actual rightward yaw to cross lanes.
 const cases=[
  {g:"launch-leap",l:0,yaw:0},
  {g:"island-one",l:-3.2,yaw:0},
  {g:"island-two",l:-1.20,yaw:.20},
  {g:"island-three",l:2.6,yaw:-.06},
  {g:"upper-vault",l:0,yaw:0},
  {g:"final-horizon",l:0,yaw:0}
 ];
 for(const c of cases){
   const gap=GAPS.find(g=>g.id===c.g);
   const st=newFlightState();
   setPose(st,gap.start-2.5,c.l,c.yaw);
   let n=0,landed=false,cleared=false;
   while(n++<240&&st.s<gap.end+8&&!st.failed){
     const result=stepFlight(st,dt,{steer:0,jumpPressed:n===1,jumpHeld:st.vy>0});
     landed ||=result.landed;
     cleared ||=st.clearedGaps.includes(gap.id);
   }
   assert.ok(cleared,c.g+" should be crossed with a true independent trajectory");
   assert.ok(landed,c.g+" must allow a real landing without hidden lane alignment");
   assert.equal(st.falls,0,c.g+" had an unavoidable fall");
 }
});

test("checkpoint resets craft world pose AND heading consistently",()=>{
 const st=newFlightState();
 setPose(st,488,60,1.1);st.y=-500;st.checkpoint=475;
 let r=stepFlight(st,dt,{steer:0});
 assert.ok(r.crashed);
 const expected=positionAt(st.s,0,0);
 assert.ok(Math.abs(st.worldX-expected.x)<1e-8);
 assert.ok(Math.abs(st.worldZ-expected.z)<1e-8);
 assert.ok(Math.abs(st.heading-headingAt(st.s))<1e-8);
 assert.equal(st.steering,0);
 assert.ok(Math.abs(st.y-surfaceHeightAt(st.s,0)-TRIAL.hoverHeight)<1e-8);
});

test("new road paint follows banked geometry and remains on collision-solid deck",()=>{
 const plan=createSurfacePlan();
 assert.deepEqual(validateSurfacePlan(plan),[]);
 assert.ok(plan.length<80);
 for(const mark of plan)
   for(const s of [mark.start+.01,(mark.start+mark.end)*.5,mark.end-.01])
     assert.ok(roadIntervals(s).some(([a,b])=>mark.left>a+.07&&mark.right<b-.07));
 const game=src("game-v041.mjs");
 assert.match(game,/const p1=toVec\(d,a\),p2=toVec\(d,b\)/);
 assert.match(game,/import \{ installCleanTrack \} from "\.\/identity-v041\.mjs"/);
 assert.match(game,/ship\.position\.set\(flight\.worldX/);
 assert.match(game,/ship\.rotation\.y=-flight\.heading/);
 assert.match(game,/SHADOW_NORMAL\.set\(normal\.x,normal\.y,normal\.z\)/);
});

test("camera and engine trails follow pilot heading, not track tangent",()=>{
 const game=src("game-v041.mjs"),fx=src("premium-v041.mjs");
 assert.match(game,/flight\.worldX-fx\*17\.8/);
 assert.match(game,/flight\.worldZ-fz\*17\.8/);
 assert.doesNotMatch(game,/ship\.rotation\.y=-poseAt/);
 assert.match(fx,/const heading=flight\.heading/);
 assert.match(fx,/const x=flight\.worldX\+rx\*offset/);
 assert.doesNotMatch(fx,/shipPose\.forwardX/);
 assert.match(game,/renderer\.info\.autoReset=false/);
 assert.match(game,/renderer\.info\?\.reset\(\)/);
});

test("active website serves 0.4.1, retains HDR, fullscreen and fresh per-trial records",()=>{
 const html=src("index.html"),game=src("game-v041.mjs");
 assert.match(html,/game-v041\.mjs\?v=0\.4\.1/);
 assert.match(html,/style-v041\.css\?v=0\.4\.1/);
 assert.match(html,/id="fullscreen-btn"/);
 assert.match(game,/from "\.\/fullscreen-v02\.mjs"/);
 assert.match(game,/from "\.\/neon-v032\.mjs"/);
 assert.match(game,/from "\.\/space-v04\.mjs"/);
 assert.match(game,/skyshift-first-flight-best-v041/);
 assert.match(game,/skyshift-first-flight-v041-audit\.json/);
 assert.match(game,/version:"0\.4\.1"/);
});
