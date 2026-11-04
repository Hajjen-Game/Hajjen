/* Japanese Harmony · Journey 2.0 · deliberately authored 7×7 openings.
 * These are ORIGINAL DESIGN FIXTURES, not seed-captured boards: every ordinary
 * square is specified and particular one- or two-phase decisions are planned.
 * Used only by opt-in, unranked Journey previews. Never changes published levels.
 */
(function(root){
"use strict";
const A=root.HarmonyPuzzleArchitect||
 (typeof require==="function"?require("./puzzle-architect.js"):null);
const R=root.HarmonyRules||(typeof require==="function"?require("./rules.js"):null);
const D=root.HarmonyJourneyDrafts||
 (typeof require==="function"?require("./journey-levels-v2.js"):null);
if(!A||!R||!D)throw Error("Journey authored boards need Puzzle Architect and HarmonyRules");
const VERSION=1;
// A..E map to the level's existing four/five treasure families. A dash is a
// truly fixed board object supplied by the Rules.Game fixture adapters.
const boards=Object.freeze({
 4:{
  name:"A single deliberate Hanabi lane",
  rows:["DCDDBCB","DACDCBD","BDBBAAD","BCDACDC","A-AABBC","AABBCAA","D-DBCBD"],
  insight:"First aim a Fusion at B6 so the Hanabi rocket above can descend into its crate.",
  primary:"Hanabi delivery route",secondary:"Fusion destination control",
  sequence:["Find the two matching treasures across A6 and B6",
   "Swap C5 into C6 to complete a horizontal Fusion through B6",
   "Watch the cleared rocket lane deliver Hanabi into the fixed crate"],
  planned:[[30,37]],
  detail:"Cells A6 B6 and C5 create a single-step teachable lane. B5=rocket, B7=crate. The player may pursue other valid swaps."
 },
 10:{
  name:"First reflection requires destination control",
  rows:["EECEAAE","BACDCDA","CCDABBD","CEAB-CC","EBDADAD","EDEECBA","CDABBCC"],
  insight:"A Fusion must land immediately left of the Moon Mirror to send its energy into the right-side target.",
  primary:"Moon Mirror Fusion Resonance",secondary:"Deliberate Fusion destination",
  sequence:["Notice the two A treasures above and below D4",
   "Swap C4 into D4 to complete the vertical A Fusion beside E4's mirror",
   "Observe a reflection toward F4 and use this principle for later goals"],
  planned:[[23,24]],
  detail:"D3/D5 and C4 align after swapping C4 → D4; mirror E4 points right. This is a designed opportunity, not a scripted action."
 },
 15:{
  name:"Predict the third-turn wind shift",
  rows:["DADEDCE","DBCDEBA","BDAEEAA","DABBDCC","BAADBDE","EECBEDA","EBBECAC"],
  insight:"Prepare the board for the third move: a rightward Wind shift carries a missing A into a vertical Fusion.",
  primary:"Wind row forecast",secondary:"Plan several moves ahead",
  sequence:["Read Wind's three-turn forecast and locate its moving row",
   "Keep the A in B4 available while choosing safe Fusions on the first turns",
   "On the scheduled shift B4 moves to C4, aligning the A at C3 and C5"],
  planned:[],
  detail:"Before wind: C3=A, B4=A, C4=B, C5=A. After an undisturbed row-4 right shift: C4=A; match spans C3:C5. Live game may modify this setup during earlier moves."
 },
 17:{
  name:"Wind prepares a Moon Mirror activation",
  rows:["DDCEABB","DADEBEC","AACBAEE","EEAC-CB","BAEAEAD","BADCCBE","EBCDDCA"],
  insight:"The leftward wind moves an A into D3, letting the next Fusion beside the Moon Mirror reach F4.",
  primary:"Wind + Moon Mirror setup",secondary:"Predictive Fusion placement",
  sequence:["Read the leftward Wind row above the mirror",
   "Make safe turns until E3's A shifts left into D3",
   "Move C4 into D4: its vertical A Fusion activates the fixed mirror at E4"],
  planned:[],
  detail:"Wind row 3 shifts left. D3 starts B, E3 starts A. D5=A and C4=A support a mirror-adjacent Fusion after the shift; avoid disturbing them."
 },
 19:{
  name:"Two distinct approaches to the festival mirrors",
  rows:["ACADEBE","BEDCECB","BBAE-DC","DAB-ACB","D-ADD-C","BBCACCD","E-AAB-C"],
  insight:"Two mirrored routes require choosing where to fuse, while both Hanabi rockets still need a clear lane.",
  primary:"Two-direction Moon Mirror planning",secondary:"Hanabi route preparation",
  sequence:["Observe the two rocket columns and the fixed Mirror positions",
   "Swap C4 into D4 for the lower mirror, or G3 into F3 for the upper mirror",
   "Alternate deliberate Mirror Fusions with opening the Hanabi delivery columns"],
  planned:[[22,23],[19,20],[34,41]],
  detail:"Lower Mirror D4 points right; upper Mirror E3 points left. Mirrors can be activated by separate vertical Fusions. G5 to G6 is a designed route-clearing move."
 }
});
function get(index){
 const spec=boards[index];
 if(!spec)return null;
 const familyNames=R.activeFamilies(index,index<10?4:5);
 const mapped=spec.rows.join("");
 if(mapped.length!==49)throw Error("Bad 7×7 authored board at level "+(index+1));
 const grid=[...mapped].map((ch,at)=>{
  if(ch==="-")return null;
  const position="ABCDE".indexOf(ch);
  if(position<0||position>=familyNames.length)
   throw Error("Bad family symbol "+ch+" at "+at);
  return familyNames[position];
 });
 const recipe=D.get(index);
 return A.normalize({
  version:1,id:"journey-authored-"+(index+1),
  insight:spec.insight,primarySkill:spec.primary,secondarySkill:spec.secondary,
  sequence:spec.sequence,designNotes:spec.detail,
  recipe,opening:{grid,provenance:"hand-authored"}
 },R);
}
function summary(){
 return Object.keys(boards).map(key=>{
  const index=Number(key),x=boards[key];
  return {index,level:index+1,name:x.name,insight:x.insight,
   planned:x.planned.map(pair=>pair.slice()),rows:x.rows.slice()};
 });
}
const api=Object.freeze({VERSION,COUNT:Object.keys(boards).length,get,summary});
root.HarmonyJourneyAuthoredOpenings=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
