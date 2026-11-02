/* Japanese Harmony · Journey 2.0 · Step B, authored draft levels 1–20.
 * Preview-only catalogue; does not alter published levelConfig or saves.
 * Levels 1–10 stay unchanged; levels 11–20 gradually teach five families and Daruma.
 */
(function(root){
"use strict";
const ARCH=root.HarmonyLevelArchitecture||(typeof require==="function"?require("./level-architecture.js"):null);
if(!ARCH)throw Error("Journey Drafts require Level Architecture 2.0");
const VERSION=2,FIRST=0;
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
 {id:"koi-masterpiece-finale",name:"Koi Masterpiece Finale",subtitle:"Two Koi, one final harmony",
  intro:"Create TWO stage-5 Koi Masterpieces. Other Masterpieces still trigger Harmony Pulse and can help develop your Koi, but only Koi count toward the goal.",
  moves:40,starPar:17,difficulty:"challenge",goal:{type:"familyMasterpiece",family:"koi",count:2},mechanics:{}},
 // Chapter 2: introduce the fifth family, then Daruma gradually on level 15.
 // Each blocker is deliberate; opening, movement and Pulse remain unscripted.
 {id:"five-family-garden",name:"Five-Family Garden",subtitle:"One more family joins the festival",
  intro:"Five treasure families now share the garden. Discover matches across a larger variety of treasures and create ten fusions.",
  moves:32,starPar:16,difficulty:"gentle",goal:{type:"fusion",count:10},mechanics:{}},
 {id:"mist-ribbons",name:"Mist Ribbons",subtitle:"Two paths through the morning haze",
  intro:"Clear four separated Mist tiles by landing a Fusion on them or reaching them with Harmony Pulse. The fifth family gives more choices.",
  moves:36,starPar:18,difficulty:"standard",goal:{type:"mist",count:4},mechanics:{mist:[9,16,32,39]}},
 {id:"rising-treasures",name:"Rising Treasures",subtitle:"Develop your treasure garden",
  intro:"Upgrade four treasures to stage 4. Build purposeful matches across five families; large cascades can help.",
  moves:36,starPar:19,difficulty:"standard",goal:{type:"stage4",count:4},mechanics:{}},
 {id:"mist-crossroads",name:"Mist Crossroads",subtitle:"One more step toward the shrine",
  intro:"Clear five Mist tiles. Work toward the center and plan the destination of your Fusions.",
  moves:39,starPar:21,difficulty:"standard",goal:{type:"mist",count:5},mechanics:{mist:[10,17,24,31,38]}},
 {id:"first-daruma",name:"First Daruma",subtitle:"A wish needs two hits",
  intro:"Clear the central Daruma. It stays fixed and needs two separate hits from an adjacent Fusion or Harmony Pulse. Only one hit counts per move.",
  moves:38,starPar:20,difficulty:"gentle",goal:{type:"daruma",count:1},mechanics:{daruma:[24]}},
 {id:"daruma-pair",name:"Daruma Pair",subtitle:"Two wishes, one garden",
  intro:"Clear both Daruma. Each needs two separate hits. Plan adjacent Fusions and use Harmony Pulse to reach them efficiently.",
  moves:44,starPar:25,difficulty:"standard",goal:{type:"daruma",count:2},mechanics:{daruma:[16,32]}},
 {id:"open-harmony",name:"Open Harmony",subtitle:"A clear garden for bigger chains",
  intro:"The obstacles are gone for one level. Make twelve Fusions and enjoy developing treasures into larger chains.",
  moves:34,starPar:19,difficulty:"standard",goal:{type:"fusion",count:12},mechanics:{}},
 {id:"mist-around-daruma",name:"Mist Around Daruma",subtitle:"The center holds its ground",
  intro:"Clear five Mist tiles around a fixed Daruma. The Daruma does not need clearing, but its position changes where Fusions can land.",
  moves:44,starPar:26,difficulty:"challenge",goal:{type:"mist",count:5},
  mechanics:{mist:[10,17,23,31,38],daruma:[24]}},
 {id:"pulse-and-wishes",name:"Pulse and Wishes",subtitle:"Let your Masterpieces do the work",
  intro:"Create two Masterpieces. The Daruma in the middle can be hit by their Harmony Pulses, but it is not the required objective.",
  moves:42,starPar:24,difficulty:"standard",goal:{type:"masterpiece",count:2},mechanics:{daruma:[24]}},
 {id:"daruma-festival",name:"Daruma Festival",subtitle:"Three wishes close the chapter",
  intro:"Clear all three Daruma with carefully aimed Fusions and Harmony Pulse. Two nearby Mist cells change your options but are not required goals.",
  moves:52,starPar:32,difficulty:"challenge",goal:{type:"daruma",count:3},
  mechanics:{daruma:[17,24,31],mist:[10,38]}}
];
const ALL=Object.freeze(DESIGNS.map((design,i)=>{
 const raw={version:2,index:i,...design,id:"journey2-"+design.id};
 const validated=ARCH.normalize(raw,i);
 return Object.freeze({version:validated.version,index:validated.index,id:validated.id,
  name:validated.name,subtitle:validated.subtitle,intro:validated.intro,
  moves:validated.moves,starPar:validated.starPar,difficulty:validated.difficulty,
  goal:Object.freeze({...validated.goal}),
  mechanics:Object.freeze({
   mist:Object.freeze(validated.mechanics.mist.slice()),
   ...(i>=10?{daruma:Object.freeze(validated.mechanics.daruma.slice())}:{})
  })});
}));
function get(index){
 if(!Number.isInteger(index)||index<FIRST||index>=FIRST+ALL.length)return null;
 const r=ALL[index-FIRST];
 return {version:r.version,index:r.index,id:r.id,name:r.name,
  subtitle:r.subtitle,intro:r.intro,moves:r.moves,starPar:r.starPar,
  difficulty:r.difficulty,goal:{...r.goal},
  mechanics:{mist:r.mechanics.mist.slice(),
   ...(r.mechanics.daruma?{daruma:r.mechanics.daruma.slice()}:{})}};
}
const api=Object.freeze({VERSION,FIRST,COUNT:ALL.length,get,
 summary:()=>ALL.map(x=>({index:x.index,name:x.name,goal:{...x.goal},
  moves:x.moves,starPar:x.starPar,difficulty:x.difficulty,
  mechanics:Object.keys(x.mechanics).filter(k=>x.mechanics[k].length)}))});
root.HarmonyJourneyDrafts=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
