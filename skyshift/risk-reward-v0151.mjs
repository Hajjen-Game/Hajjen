// SKYSHIFT 0.15.1 — Risk Line Diversity & Track Flow.
// Five intentional decision beats per 3,400m lap. Each has a safe central
// lane and a skill-based LEFT or RIGHT option with its own difficulty/reward.
// Racing geometry, steering, GRIP, 120Hz collision and camera are untouched.
import {CIRCUIT} from "./tracks/shared/circuit-layout-v082.mjs";
export const RISK_REWARD_0151=Object.freeze({
 version:"risk-line-diversity-track-flow-0151",
 lapMeters:CIRCUIT.lapLength,
 totalGatesPerLap:5,
 safeLane:"CENTER",
 intro:"after-landing easy left",
 dynamicDirection:true,
 distinctRewardTiers:4,
 physicsSteeringUnchanged:true,roadGeometryUnchanged:true,
 additionalMeshes:0,additionalDrawCalls:0
});
// Written in physical local-arc metres and track lateral metres. All five
// sit inside authored straight segments, except the EXISTING corkscrew pad
// whose 360-degree road frame is a deliberate and optional special challenge.
export const RHYTHM_GATES_0151=Object.freeze([
 Object.freeze({
  id:"horizon-recovery",name:"HORIZON RECOVERY",difficulty:"INTRO",
  start:692,end:724,approach:615,
  safeMin:-2.65,safeMax:2.65,
  riskMin:-5.70,riskMax:-3.55,direction:"LEFT",
  safeMultiplier:1.12,safeDurationSeconds:.60,
  riskMultiplier:1.22,riskDurationSeconds:.52,
  priorFeature:"skyline-leap",beat:"RECOVER",
  note:"Short low-intensity bonus after the landing; ends before narrow apex"
 }),
 Object.freeze({
  id:"back-sweeper-exit",name:"SWEEPER RELEASE",difficulty:"ADVANCED",
  start:2200,end:2240,approach:2075,
  safeMin:-2.35,safeMax:2.35,
  riskMin:4.45,riskMax:6.45,direction:"RIGHT",
  safeMultiplier:1.14,safeDurationSeconds:.72,
  riskMultiplier:1.40,riskDurationSeconds:.98,
  priorFeature:"back-sweeper",beat:"ACCELERATE",
  note:"Original 0.15.0 post-sweeper line preserved"
 }),
 Object.freeze({
  id:"coastline-cut",name:"COASTLINE CUT",difficulty:"EXPERT",
  start:2380,end:2416,approach:2250,
  safeMin:-2.35,safeMax:2.35,
  riskMin:-6.65,riskMax:-5.05,direction:"LEFT",
  safeMultiplier:1.14,safeDurationSeconds:.72,
  riskMultiplier:1.34,riskDurationSeconds:.70,
  priorFeature:"coast-straight",beat:"REPOSITION",
  note:"Cross right-to-left after the previous gate, tighter outer window"
 }),
 Object.freeze({
  id:"final-corner-exit",name:"FINAL CORNER EXIT",difficulty:"INTERMEDIATE",
  start:2818,end:2854,approach:2698,
  safeMin:-2.50,safeMax:2.50,
  riskMin:-5.8,riskMax:-3.8,direction:"LEFT",
  safeMultiplier:1.14,safeDurationSeconds:.72,
  riskMultiplier:1.30,riskDurationSeconds:.76,
  priorFeature:"final-corner",beat:"RELEASE",
  note:"Prepare the line through the last large corner, then accelerate on exit"
 }),
 Object.freeze({
  id:"final-drive",name:"ROLL LINE FINALE",difficulty:"SPECIAL",
  start:3150,end:3190,approach:3025,
  safeMin:-2.35,safeMax:2.35,
  riskMin:4.45,riskMax:6.45,direction:"RIGHT",
  safeMultiplier:1.14,safeDurationSeconds:.72,
  riskMultiplier:1.40,riskDurationSeconds:.98,
  priorFeature:"corkscrew",beat:"ROTATE",
  note:"Original 0.15.0 risk gate preserved, optional during corkscrew roll"
 })
]);
export const BOOST_CHOICES_0151=Object.freeze([
 Object.freeze({id:"launch",group:"launch",kind:"launch",
  start:58,end:86,lateralMin:-4.6,lateralMax:4.6,
  multiplier:1.40,durationSeconds:.92,direction:"CENTER"}),
 ...RHYTHM_GATES_0151.flatMap(g=>[
  Object.freeze({id:g.id+"-safe",group:g.id,kind:"safe",
   start:g.start,end:g.end,lateralMin:g.safeMin,lateralMax:g.safeMax,
   multiplier:g.safeMultiplier,durationSeconds:g.safeDurationSeconds,
   direction:"CENTER",difficulty:g.difficulty}),
  Object.freeze({id:g.id+"-risk",group:g.id,kind:"risk",
   start:g.start,end:g.end,lateralMin:g.riskMin,lateralMax:g.riskMax,
   multiplier:g.riskMultiplier,durationSeconds:g.riskDurationSeconds,
   direction:g.direction,difficulty:g.difficulty})
 ])
]);
export const RACE_BOOST_CHOICES_0151=Object.freeze(
 Array.from({length:CIRCUIT.laps},(_,lap)=>BOOST_CHOICES_0151.map(p=>
  Object.freeze({...p,id:p.id+"-lap"+(lap+1),
   group:p.group+"-lap"+(lap+1),
   start:p.start+lap*CIRCUIT.lapLength,
   end:p.end+lap*CIRCUIT.lapLength}))).flat());
export function riskChoiceAt(s,lateral){
 if(!Number.isFinite(s)||!Number.isFinite(lateral))return null;
 for(const p of RACE_BOOST_CHOICES_0151)
  if(s>=p.start&&s<p.end&&lateral>=p.lateralMin&&lateral<=p.lateralMax)
   return p;
 return null;
}
export function approachingRiskGate(s){
 if(!Number.isFinite(s)||s<0||s>=CIRCUIT.totalDistance)return null;
 const lap=Math.min(CIRCUIT.laps-1,Math.floor(s/CIRCUIT.lapLength));
 const local=s-lap*CIRCUIT.lapLength;
 return RHYTHM_GATES_0151.find(g=>local>=g.approach&&local<g.end)??null;
}
export function riskCueAt(s,lateral,earnedGroups=null){
 const gate=approachingRiskGate(s);
 if(!gate)return null;
 const lap=Math.min(CIRCUIT.laps-1,Math.floor(s/CIRCUIT.lapLength));
 const group=gate.id+"-lap"+(lap+1);
 // Accept both the old single-last-group API and the full per-lap collection.
 const earned=Array.isArray(earnedGroups)?
  earnedGroups.includes(group):earnedGroups===group;
 if(earned)return null;
 const distance=Math.max(0,gate.start-(s-lap*CIRCUIT.lapLength));
 const risk=gate.riskMultiplier, safe=gate.safeMultiplier;
 return {id:gate.id,name:gate.name,group,side:gate.direction,
  beat:gate.beat,difficulty:gate.difficulty,
  remainingMeters:+distance.toFixed(1),
  safePercent:Math.round((safe-1)*100),
  riskPercent:Math.round((risk-1)*100),
  selectedLane:lateral>=gate.riskMin&&lateral<=gate.riskMax?"risk":
   lateral>=gate.safeMin&&lateral<=gate.safeMax?"safe":"approach",
  text:gate.name+" · "+gate.difficulty+" · "+gate.direction+
   " RISK +"+Math.round((risk-1)*100)+"% / CENTER +"+
   Math.round((safe-1)*100)+"%"};
}
export const RHYTHM_FLOW_0151=Object.freeze([
 Object.freeze({id:"open",start:0,end:573,kind:"accelerate"}),
 Object.freeze({id:"leap",start:573,end:724,kind:"recover"}),
 Object.freeze({id:"technical",start:724,end:1647,kind:"technical"}),
 Object.freeze({id:"wall-sweeper",start:1647,end:2200,kind:"spectacle"}),
 Object.freeze({id:"coast",start:2200,end:2514,kind:"risk-reposition"}),
 Object.freeze({id:"final-corner",start:2514,end:2818,kind:"technical"}),
 Object.freeze({id:"final-release",start:2818,end:3005,kind:"accelerate"}),
 Object.freeze({id:"corkscrew",start:3005,end:3338,kind:"spectacle"}),
 Object.freeze({id:"cooldown",start:3338,end:3400,kind:"reset"})
]);
export function trackFlowAt(s){
 if(!Number.isFinite(s))return null;
 const local=(s%CIRCUIT.lapLength+CIRCUIT.lapLength)%CIRCUIT.lapLength;
 return RHYTHM_FLOW_0151.find(b=>local>=b.start&&local<b.end)??null;
}
