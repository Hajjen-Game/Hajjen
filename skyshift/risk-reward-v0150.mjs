// SKYSHIFT 0.15.0 — Track Rhythm & Risk/Reward.
// Two deliberate dual-line decisions AFTER difficult corners, on broad straights.
// Exactly one reward per gate per lap. No walls, gaps, hidden steering or new
// geometry. All source lane bounds are used by the shader and 120Hz collision.
import {CIRCUIT} from "./tracks/shared/circuit-layout-v082.mjs";
export const RISK_REWARD_0150=Object.freeze({
 version:"track-rhythm-risk-reward-0150",
 lapMeters:CIRCUIT.lapLength,
 cueDistanceMeters:125,
 safeMultiplier:1.14,riskMultiplier:1.40,
 safeDurationSeconds:.72,riskDurationSeconds:.98,
 safeLane:"CENTER",riskLane:"RIGHT",
 physicsSteeringUnchanged:true,roadGeometryUnchanged:true,
 additionalMeshes:0,additionalDrawCalls:0
});
export const RHYTHM_GATES_0150=Object.freeze([
 Object.freeze({id:"back-sweeper-exit",name:"SWEEPER RELEASE",
  start:2200,end:2240,approach:2075,
  safeMin:-2.35,safeMax:2.35,riskMin:4.45,riskMax:6.45,
  priorCorner:"back-sweeper",direction:"RIGHT"}),
 Object.freeze({id:"final-drive",name:"FINAL SLINGSHOT",
  start:3150,end:3190,approach:3025,
  safeMin:-2.35,safeMax:2.35,riskMin:4.45,riskMax:6.45,
  priorCorner:"final-corner",direction:"RIGHT"})
]);
export const BOOST_CHOICES_0150=Object.freeze([
 Object.freeze({id:"launch",group:"launch",kind:"launch",
  start:58,end:86,lateralMin:-4.6,lateralMax:4.6,
  multiplier:1.40,durationSeconds:.92}),
 ...RHYTHM_GATES_0150.flatMap(g=>[
  Object.freeze({id:g.id+"-safe",group:g.id,kind:"safe",
   start:g.start,end:g.end,lateralMin:g.safeMin,lateralMax:g.safeMax,
   multiplier:RISK_REWARD_0150.safeMultiplier,
   durationSeconds:RISK_REWARD_0150.safeDurationSeconds}),
  Object.freeze({id:g.id+"-risk",group:g.id,kind:"risk",
   start:g.start,end:g.end,lateralMin:g.riskMin,lateralMax:g.riskMax,
   multiplier:RISK_REWARD_0150.riskMultiplier,
   durationSeconds:RISK_REWARD_0150.riskDurationSeconds})
 ])
]);
export const RACE_BOOST_CHOICES_0150=Object.freeze(
 Array.from({length:CIRCUIT.laps},(_,lap)=>BOOST_CHOICES_0150.map(p=>
  Object.freeze({...p,id:p.id+"-lap"+(lap+1),
   group:p.group+"-lap"+(lap+1),
   start:p.start+lap*CIRCUIT.lapLength,
   end:p.end+lap*CIRCUIT.lapLength}))).flat());
export function riskChoiceAt(s,lateral){
 for(const p of RACE_BOOST_CHOICES_0150)
  if(s>=p.start&&s<p.end&&lateral>=p.lateralMin&&lateral<=p.lateralMax)
   return p;
 return null;
}
export function approachingRiskGate(s){
 if(!Number.isFinite(s)||s<0||s>=CIRCUIT.totalDistance)return null;
 const lap=Math.min(CIRCUIT.laps-1,Math.floor(s/CIRCUIT.lapLength));
 const local=s-lap*CIRCUIT.lapLength;
 return RHYTHM_GATES_0150.find(g=>
  local>=g.approach&&local<g.end)??null;
}
export function riskCueAt(s,lateral,earnedGroup=null){
 const gate=approachingRiskGate(s);
 if(!gate)return null;
 const lap=Math.min(CIRCUIT.laps-1,Math.floor(s/CIRCUIT.lapLength));
 const group=gate.id+"-lap"+(lap+1);
 if(earnedGroup===group)return null;
 const distance=Math.max(0,gate.start-(s-lap*CIRCUIT.lapLength));
 return {id:gate.id,name:gate.name,group,side:gate.direction,
  remainingMeters:+distance.toFixed(1),
  selectedLane:lateral>=gate.riskMin&&lateral<=gate.riskMax?"risk":
   lateral>=gate.safeMin&&lateral<=gate.safeMax?"safe":"approach",
  text:gate.name+" · RISK RIGHT +40%  /  SAFE CENTER +14%"};
}
