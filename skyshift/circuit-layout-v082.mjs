// SKYSHIFT 0.8.2 — Track Rhythm & GRIP Apex Skyline Circuit: authored, genuinely closed lap geometry.
// Each TURN integrates a quintic-curvature entry/exit; straights are exactly
// straight. Paired S-bends and four right-angle corners close the loop
// mathematically, rather than drawing a random continuous scribble.
export const CIRCUIT=Object.freeze({
 id:"skyline-circuit",name:"SKYLINE CIRCUIT",lapLength:3400,laps:3,
 totalDistance:10200,trackWidth:23.2,zeroBank:true,
 sectors:Object.freeze([
  Object.freeze({id:"high-speed",name:"HIGH-SPEED FLOW",start:0,end:1007.12101754}),
  Object.freeze({id:"technical",name:"TECHNICAL RHYTHM",start:1007.12101754,end:2168.91737525}),
  Object.freeze({id:"finale",name:"VELOCITY FINALE",start:2168.91737525,end:3400})
 ])
});
const deg=a=>a*Math.PI/180;
// Offline constrained closure: 3400m, total yaw exactly +2PI, identical
// center, forward direction, elevation and guardrail alignment at start/finish.
// The first 235 metres are moved to the final straight. Both straights share\n// the seam's exact direction, so 2π heading and centreline loop closure survive.
export const AUTHORED_SECTIONS=Object.freeze([
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
].map(([id,length,turnAngle,entry])=>Object.freeze({
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
