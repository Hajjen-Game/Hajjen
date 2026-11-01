/* Japanese Harmony · Journey 2.0 · Step B, authored levels 1–10.
 * Preview-only catalogue; does not alter published levelConfig or saves.
 * Four families, no new fixed blockers during first-ten onboarding.
 */
(function(root){
"use strict";
const ARCH=root.HarmonyLevelArchitecture||(typeof require==="function"?require("./level-architecture.js"):null);
if(!ARCH)throw Error("Journey Drafts require Level Architecture 2.0");
const VERSION=1,FIRST=0;
const DESIGNS=[
 {id:"first-harmony",name:"First Harmony",subtitle:"Discover the joy of fusion",
  intro:"Swap neighboring treasures to make a match of three. Every fusion grows the strongest treasure.",
  moves:18,starPar:4,difficulty:"gentle",goal:{type:"fusion",count:3},mechanics:{}},
 {id:"growing-beauty",name:"Growing Beauty",subtitle:"Every treasure has five stages",
  intro:"Fuse treasures of the same family, even when their stages differ. Grow a treasure to stage 3.",
  moves:24,starPar:5,difficulty:"gentle",goal:{type:"stage3",count:1},mechanics:{}},
 {id:"first-masterpiece",name:"First Masterpiece",subtitle:"Discover the Harmony Pulse",
  intro:"Grow a stage-5 Masterpiece. It releases Harmony Pulse into the four neighboring cells.",
  moves:34,starPar:9,difficulty:"gentle",goal:{type:"masterpiece",count:1},mechanics:{}},
 {id:"first-mist",name:"First Mist",subtitle:"Make the garden visible",
  intro:"Clear three Mist cells. Fuse onto a misted tile or strike it with Harmony Pulse. Treasures beneath Mist still move.",
  moves:30,starPar:9,difficulty:"gentle",goal:{type:"mist",count:3},mechanics:{mist:[17,24,31]}},
 {id:"fusion-crossing",name:"Fusion Crossing",subtitle:"A clear board to find your rhythm",
  intro:"The Mist is gone for this puzzle. Focus on finding eight genuine fusions across the open garden.",
  moves:26,starPar:11,difficulty:"standard",goal:{type:"fusion",count:8},mechanics:{}},
 {id:"fourfold-dance",name:"Fourfold Dance",subtitle:"Look beyond matching three",
  intro:"Make a match of four treasures on three separate moves. A cascade cannot count twice on the same move.",
  moves:30,starPar:16,difficulty:"standard",goal:{type:"fourTurns",count:3},mechanics:{}},
 {id:"pulse-garden",name:"Pulse Garden",subtitle:"Grow power by choosing the landing cell",
  intro:"Earn five Harmony Pulse upgrades on occupied neighboring cells. Aim your stage-5 fusions carefully.",
  moves:33,starPar:16,difficulty:"standard",goal:{type:"pulseHits",count:5},mechanics:{}},
 {id:"misty-crossroads",name:"Misty Crossroads",subtitle:"Two small patches, two routes",
  intro:"Clear the five Mist cells in two separated patches. A well-placed fusion can open a route to the next.",
  moves:35,starPar:18,difficulty:"standard",goal:{type:"mist",count:5},mechanics:{mist:[9,10,31,38,39]}},
 {id:"growing-treasures",name:"Growing Treasures",subtitle:"Plan ahead, not just the next match",
  intro:"Upgrade nine treasures to stage 3. Build across different families and let Fusion chains help.",
  moves:34,starPar:19,difficulty:"challenge",goal:{type:"stage3",count:9},mechanics:{}},
 {id:"masterpiece-festival",name:"Masterpiece Festival",subtitle:"Two Masterpieces, one final harmony",
  intro:"Create two stage-5 Masterpieces. Let the first Harmony Pulse prepare your next chain.",
  moves:40,starPar:22,difficulty:"challenge",goal:{type:"masterpiece",count:2},mechanics:{}}
];
const ALL=Object.freeze(DESIGNS.map((design,i)=>{
 const raw={version:2,index:i,...design,id:"journey2-"+design.id};
 const validated=ARCH.normalize(raw,i);
 return Object.freeze({version:validated.version,index:validated.index,id:validated.id,
  name:validated.name,subtitle:validated.subtitle,intro:validated.intro,
  moves:validated.moves,starPar:validated.starPar,difficulty:validated.difficulty,
  goal:Object.freeze({...validated.goal}),
  mechanics:Object.freeze({mist:Object.freeze(validated.mechanics.mist.slice())})});
}));
function get(index){
 if(!Number.isInteger(index)||index<FIRST||index>=FIRST+ALL.length)return null;
 const r=ALL[index-FIRST];
 return {version:r.version,index:r.index,id:r.id,name:r.name,
  subtitle:r.subtitle,intro:r.intro,moves:r.moves,starPar:r.starPar,
  difficulty:r.difficulty,goal:{...r.goal},
  mechanics:{mist:r.mechanics.mist.slice()}};
}
const api=Object.freeze({VERSION,FIRST,COUNT:ALL.length,get,
 summary:()=>ALL.map(x=>({index:x.index,name:x.name,goal:{...x.goal},
  moves:x.moves,starPar:x.starPar,difficulty:x.difficulty,
  mechanics:Object.keys(x.mechanics).filter(k=>x.mechanics[k].length)}))});
root.HarmonyJourneyDrafts=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
