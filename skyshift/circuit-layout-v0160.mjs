import {ACTIVE_TRACK_0160,isAurora,isVault} from "./track-selection-v0160.mjs";
import {VAULT_SECTIONS_0270,VAULT_SECTORS_0270} from "./full-tunnel-layout-v0270.mjs";
// SKYSHIFT 0.16.0 — selected, genuinely closed three-lap Skyline or Aurora geometry.
// Each TURN integrates a quintic-curvature entry/exit; straights are exactly
// straight. Paired S-bends and four right-angle corners close the loop
// mathematically, rather than drawing a random continuous scribble.
export const CIRCUIT=Object.freeze({
 id:ACTIVE_TRACK_0160.id+"-circuit",name:ACTIVE_TRACK_0160.name,lapLength:3400,laps:3,
 totalDistance:10200,trackWidth:23.2,zeroBank:true,
 sectors:Object.freeze(isVault()?VAULT_SECTORS_0270:isAurora()?[
  Object.freeze({id:"flow",name:"AURORA FLOW",start:0,end:1240}),
  Object.freeze({id:"switchback",name:"SWITCHBACK RIDGE",start:1240,end:2287.411}),
  Object.freeze({id:"finale",name:"HORIZON RETURN",start:2287.411,end:3400})
 ]:[
  Object.freeze({id:"high-speed",name:"HIGH-SPEED FLOW",start:0,end:1007.12101754}),
  Object.freeze({id:"technical",name:"TECHNICAL RHYTHM",start:1007.12101754,end:2168.91737525}),
  Object.freeze({id:"finale",name:"VELOCITY FINALE",start:2168.91737525,end:3400})
 ])
});
const deg=a=>a*Math.PI/180;
// Offline constrained closure: 3400m, total yaw exactly +2PI, identical
// center, forward direction, elevation and guardrail alignment at start/finish.
// The first 235 metres are moved to the final straight. Both straights share\n// the seam's exact direction, so 2π heading and centreline loop closure survive.
// Aurora's two 180° broad switchbacks and two offset S sequences are a
// deliberately NEW road, not a reskin. The second 1700m half is different
// from the first. Closure was optimized so XY drift is below centimetres;
// original Skyline layout is retained bit-for-bit.
const AURORA_SECTIONS=[
 ["aurora-acceleration",250,0,0],
 ["aurora-glass-sweep",200,deg(40),38],
 ["aurora-open-straight",260,0,0],
 ["aurora-counter-arc",170,deg(-40),32],
 ["aurora-crest-run",360,0,0],
 ["aurora-north-switchback",460,deg(180),68],
 ["aurora-return-release",287.411,0,0],
 ["aurora-luminous-sweep",208.268,deg(45),40],
 ["aurora-skyway",223.144,0,0],
 ["aurora-counterflow",178.273,deg(-45),34],
 ["aurora-highland-run",357.412,0,0],
 ["aurora-south-switchback",445.492,deg(180),70]
];
export const AUTHORED_SECTIONS=Object.freeze((isVault()?VAULT_SECTIONS_0270:isAurora()?AURORA_SECTIONS:[
 ["launch-straight",160.13576152,0,0],
 ["high-speed-sweep",305,deg(90),48],
 ["horizon-sprint",331.98525602,0,0],
 ["precision-apex",210,deg(90),40],
 ["technical-entry",130,0,0],
 ["s-hook-in",95,deg(-33),22],
 ["s-link-a",65,0,0],
 ["s-hook-switch",190,deg(66),35],
 ["s-link-b",65,0,0],
 ["s-hook-out",95,deg(-33),22],
 ["technical-release",261.79635771,0,0],
 ["back-sweeper",260,deg(90),48],
 ["coast-straight",344.94686322,0,0],
 ["final-corner",235,deg(90),42],
 ["finish-drive",651.13576153,0,0]
]).map(([id,length,turnAngle,entry])=>Object.freeze({
 id,length,turnAngle,entry,
 type:turnAngle?"turn":"straight",
 curvature:turnAngle?turnAngle/(length-entry):0
})));
let cursor=0;
export const COURSE_SEGMENTS=Object.freeze(AUTHORED_SECTIONS.map(section=>{
 const start=cursor;
 cursor+=section.length;
 return Object.freeze({...section,start,end:cursor,exit:section.entry,
  hold:section.type==="turn"?section.length-2*section.entry:section.length,
  label:section.id.replaceAll("-"," ").toUpperCase()});
}));
export const CIRCUIT_LENGTH=COURSE_SEGMENTS.at(-1).end;
export const lapPosition=s=>{
 const len=CIRCUIT.lapLength;
 const n=(s%len+len)%len;
 return Math.abs(n-len)<1e-7?0:n;
};
export function sectionAt(s){
 const p=lapPosition(s);
 return CIRCUIT.sectors.find(x=>p>=x.start&&p<x.end)??CIRCUIT.sectors.at(-1);
}
export function sectionIndexAt(s){
 const p=lapPosition(s);
 const index=COURSE_SEGMENTS.findIndex(x=>p>=x.start&&p<x.end);
 return Math.max(0,index);
}
export function circuitPlanSummary(){
 return {id:CIRCUIT.id,length:CIRCUIT.lapLength,laps:CIRCUIT.laps,
  totalDistance:CIRCUIT.totalDistance,
  turnCount:COURSE_SEGMENTS.filter(x=>x.type==="turn").length,
  straightCount:COURSE_SEGMENTS.filter(x=>x.type==="straight").length,
  maximumCurvature:Math.max(...COURSE_SEGMENTS.map(x=>Math.abs(x.curvature))),
  uniqueTurnRadii:COURSE_SEGMENTS.filter(x=>x.type==="turn")
   .map(x=>+(1/Math.abs(x.curvature)).toFixed(1)),
  sectors:CIRCUIT.sectors.map(s=>s.name)};
}
