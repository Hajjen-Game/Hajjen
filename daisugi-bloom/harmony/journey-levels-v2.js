/* Japanese Harmony · Journey 2.0 · official 1–20 and chapter 3–4 previews (2026-11-04).
 * Opt-in, unranked previews only. Mirror is deliberately parked.
 * Four meaningful pillars: Hanabi, Wind, Daruma and Sealed Stones.
 * Short tutorials → spatial challenges → connected festival finale.
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
 {id:"first-firework",name:"First Firework",subtitle:"Learn the launch",
  intro:"Open the column below the rocket with a real Fusion. The rocket falls into its wooden crate and sends a Hanabi Pulse upwards.",
  moves:30,starPar:13,difficulty:"gentle",goal:{type:"lotus",count:1},mechanics:{hanabi:{starts:[29],crates:[43]}}},
 {id:"long-fuse",name:"Long Fuse",subtitle:"The rocket starts at the top",
  intro:"This time the rocket begins in the top row. Plan several Fusions in its column to guide it all the way to the crate. There is no shortcut at the bottom.",
  moves:36,starPar:20,difficulty:"standard",goal:{type:"lotus",count:1},mechanics:{hanabi:{starts:[1],crates:[43]}}},
 {id:"twin-ascent",name:"Twin Ascent",subtitle:"Two long routes",
  intro:"Both rockets start at the top. Open their lanes deliberately; completing one column does not automatically open the other.",
  moves:43,starPar:26,difficulty:"challenge",goal:{type:"lotus",count:2},mechanics:{hanabi:{starts:[1,5],crates:[43,47]}}},
 {id:"festival-bloom",name:"Festival Bloom",subtitle:"Use the launch to grow treasures",
  intro:"Guide the top-row rocket to its crate and create two Masterpieces. Hanabi's upward Pulse can help develop the treasures, but timing the launch matters.",
  moves:44,starPar:27,difficulty:"challenge",goal:{type:"masterpiece",count:2,requires:[{type:"lotus",count:1}]},mechanics:{hanabi:{starts:[3],crates:[45]}}},
 {id:"festival-clearing",name:"Festival Clearing",subtitle:"One launch is not the whole answer",
  intro:"Deliver both top-row rockets and clear the three Mist patches. The fireworks can clear Mist in their own columns; a patch away from the blast needs a deliberate Fusion.",
  moves:47,starPar:30,difficulty:"challenge",goal:{type:"mist",count:3,requires:[{type:"lotus",count:2}]},mechanics:{hanabi:{starts:[1,5],crates:[43,47]},mist:[8,15,24]}},
 {id:"koi-masterpiece-finale",name:"Koi Masterpiece Finale",subtitle:"Two Koi, one final harmony",
  intro:"Create TWO stage-5 Koi Masterpieces. Other Masterpieces still trigger Harmony Pulse and can help develop your Koi, but only Koi count toward the goal.",
  moves:40,starPar:17,difficulty:"challenge",goal:{type:"familyMasterpiece",family:"koi",count:2},mechanics:{}},
 {id:"first-wind-garden",name:"First Wind Garden",subtitle:"Read the shifting row",
  intro:"After every third successful move, the marked row shifts one cell right. Plan where a useful Fusion will form after Wind moves the treasures.",
  moves:38,starPar:22,difficulty:"standard",goal:{type:"fusion",count:12},mechanics:{wind:{every:3,steps:[{row:3,direction:"right"}]}}},
 {id:"crossing-winds",name:"Crossing Winds",subtitle:"Choose which row will shift",
  intro:"Every third move, Wind alternates between the two marked rows. Prepare a Masterpiece without losing your setup, and make two separate four-object match turns.",
  moves:43,starPar:26,difficulty:"challenge",goal:{type:"masterpiece",count:1,requires:[{type:"fourTurns",count:2}]},mechanics:{wind:{every:3,steps:[{row:1,direction:"left"},{row:3,direction:"right"}]}}},
 {id:"wind-and-fireworks",name:"Wind and Fireworks",subtitle:"Let the breeze open a route",
  intro:"Watch the upper wind row while preparing a Hanabi launch below. Deliver the rocket and grow two treasures to stage four; make each Fusion serve the route.",
  moves:43,starPar:26,difficulty:"challenge",goal:{type:"lotus",count:1,requires:[{type:"stage4",count:2}]},mechanics:{hanabi:{starts:[29],crates:[43]},wind:{every:3,steps:[{row:2,direction:"right"}]}}},
 {id:"first-daruma",name:"First Daruma",subtitle:"Two hits wake the doll",
  intro:"The Daruma is fixed in place and needs two separate hits. Fuse beside it or direct Harmony Pulse into it. Think about where your Fusion lands.",
  moves:38,starPar:22,difficulty:"standard",goal:{type:"daruma",count:1},mechanics:{daruma:[24]}},
 {id:"twin-daruma",name:"Twin Daruma",subtitle:"Work around the guardians",
  intro:"Two Daruma block the central garden. A well-placed Fusion or Harmony Pulse can strike more than one; clear both without relying on random chains.",
  moves:44,starPar:27,difficulty:"challenge",goal:{type:"daruma",count:2},mechanics:{daruma:[23,25]}},
 {id:"festival-guardian",name:"Festival Guardian",subtitle:"Two guardians, two fireworks",
  intro:"Each Daruma guards its own Hanabi column. Guide both rockets into their separate crates, then finish any remaining Daruma hits. One launch cannot clear both routes.",
  moves:46,starPar:29,difficulty:"challenge",goal:{type:"daruma",count:2,requires:[{type:"lotus",count:2}]},mechanics:{daruma:[15,19],hanabi:{starts:[29,33],crates:[43,47]}}},
 {id:"wind-shrine",name:"Wind Shrine",subtitle:"Bring matches to the guardians",
  intro:"Wind shifts an upper row left. Prepare Fusion destinations that can strike both Daruma. Read the wind and protect your useful setup.",
  moves:48,starPar:30,difficulty:"challenge",goal:{type:"daruma",count:2},mechanics:{daruma:[24,32],wind:{every:3,steps:[{row:2,direction:"left"}]}}},
 {id:"first-sealed-stone",name:"First Sealed Stone",subtitle:"Four cracks release a pulse",
  intro:"A Sealed Stone needs four hits. Fuse next to it or reach it with Harmony Pulse; breaking it releases an Awakening Pulse to the eight surrounding cells.",
  moves:46,starPar:28,difficulty:"standard",goal:{type:"sealedStone",count:1},mechanics:{sealedStones:[24]}},
 {id:"awakening-pair",name:"Awakening Pair",subtitle:"One awakening helps the next",
  intro:"Two neighboring Sealed Stones need four hits each. Breaking one creates an eight-direction Awakening Pulse that can help damage the other.",
  moves:52,starPar:34,difficulty:"challenge",goal:{type:"sealedStone",count:2},mechanics:{sealedStones:[24,31]}},
 {id:"festival-seal",name:"Festival Seal",subtitle:"Fireworks against the stones",
  intro:"Break all four Sealed Stones and guide both rockets into their crates. Each stone can take one hit per move, even when multiple Harmony Pulses reach it. Use Hanabi blasts to open the center.",
  moves:64,starPar:44,difficulty:"challenge",goal:{type:"sealedStone",count:4,requires:[{type:"lotus",count:2}]},mechanics:{sealedStones:[15,19,22,26],hanabi:{starts:[29,33],crates:[43,47]}}},
{"id":"guardian-crossroads","name":"Guardian Crossroads","subtitle":"Plan the route","intro":"Plan your Fusion destinations and the order of your objectives. Every move should advance the puzzle.","moves":48,"starPar":31,"difficulty":"challenge","goal":{"type":"daruma","count":2},"mechanics":{"daruma":[17,31]}},
{"id":"lantern-route","name":"Lantern Route","subtitle":"Plan the route","intro":"Plan your Fusion destinations and the order of your objectives. Every move should advance the puzzle.","moves":49,"starPar":32,"difficulty":"challenge","goal":{"type":"daruma","count":1,"requires":[{"type":"lotus","count":1}]},"mechanics":{"daruma":[10],"hanabi":{"starts":[24],"crates":[45]}}},
{"id":"two-winds","name":"Two Winds","subtitle":"Plan the route","intro":"Plan your Fusion destinations and the order of your objectives. Every move should advance the puzzle.","moves":50,"starPar":33,"difficulty":"challenge","goal":{"type":"masterpiece","count":1,"requires":[{"type":"fourTurns","count":2}]},"mechanics":{"wind":{"every":3,"steps":[{"row":1,"direction":"right"},{"row":4,"direction":"left"}]}}},
{"id":"sealed-corner","name":"Sealed Corner","subtitle":"Plan the route","intro":"Plan your Fusion destinations and the order of your objectives. Every move should advance the puzzle.","moves":54,"starPar":36,"difficulty":"challenge","goal":{"type":"sealedStone","count":2},"mechanics":{"sealedStones":[16,23]}},
{"id":"festival-gates","name":"Festival Gates","subtitle":"Plan the route","intro":"Plan your Fusion destinations and the order of your objectives. Every move should advance the puzzle.","moves":57,"starPar":38,"difficulty":"challenge","goal":{"type":"daruma","count":2,"requires":[{"type":"lotus","count":2}]},"mechanics":{"daruma":[8,12],"hanabi":{"starts":[22,26],"crates":[43,47]}}},
{"id":"windward-shrine","name":"Windward Shrine","subtitle":"Sequence the obstacles","intro":"Choose the first target carefully. Use Fusion placement, Harmony Pulse and predictable mechanics to unlock the next route.","moves":56,"starPar":37,"difficulty":"expert","goal":{"type":"sealedStone","count":2},"mechanics":{"sealedStones":[24,32],"wind":{"every":3,"steps":[{"row":1,"direction":"left"}]}}},
{"id":"hanabi-split","name":"Hanabi Split","subtitle":"Sequence the obstacles","intro":"Choose the first target carefully. Use Fusion placement, Harmony Pulse and predictable mechanics to unlock the next route.","moves":55,"starPar":37,"difficulty":"expert","goal":{"type":"lotus","count":2,"requires":[{"type":"masterpiece","count":1}]},"mechanics":{"hanabi":{"starts":[1,33],"crates":[43,47]}}},
{"id":"awakening-circle","name":"Awakening Circle","subtitle":"Sequence the obstacles","intro":"Choose the first target carefully. Use Fusion placement, Harmony Pulse and predictable mechanics to unlock the next route.","moves":61,"starPar":42,"difficulty":"expert","goal":{"type":"sealedStone","count":3},"mechanics":{"sealedStones":[16,17,24]}},
{"id":"guardian-wind","name":"Guardian Wind","subtitle":"Sequence the obstacles","intro":"Choose the first target carefully. Use Fusion placement, Harmony Pulse and predictable mechanics to unlock the next route.","moves":60,"starPar":41,"difficulty":"expert","goal":{"type":"daruma","count":3},"mechanics":{"daruma":[17,24,31],"wind":{"every":3,"steps":[{"row":1,"direction":"right"},{"row":5,"direction":"left"}]}}},
{"id":"festival-trials-finale","name":"Festival Trials Finale","subtitle":"Sequence the obstacles","intro":"Choose the first target carefully. Use Fusion placement, Harmony Pulse and predictable mechanics to unlock the next route.","moves":68,"starPar":47,"difficulty":"expert","goal":{"type":"sealedStone","count":3,"requires":[{"type":"lotus","count":2}]},"mechanics":{"sealedStones":[9,17,25],"hanabi":{"starts":[29,33],"crates":[43,47]}}},
{"id":"stone-garden","name":"Stone Garden","subtitle":"Awakening geometry","intro":"A broken Sealed Stone releases Awakening Pulse into eight neighboring cells. Plan the order of the breaks to build a chain.","moves":60,"starPar":41,"difficulty":"challenge","goal":{"type":"sealedStone","count":3},"mechanics":{"sealedStones":[16,24,32]}},
{"id":"first-echo","name":"First Echo","subtitle":"Awakening geometry","intro":"A broken Sealed Stone releases Awakening Pulse into eight neighboring cells. Plan the order of the breaks to build a chain.","moves":64,"starPar":44,"difficulty":"challenge","goal":{"type":"sealedStone","count":4},"mechanics":{"sealedStones":[16,18,24,30]}},
{"id":"wind-carved","name":"Wind Carved","subtitle":"Awakening geometry","intro":"A broken Sealed Stone releases Awakening Pulse into eight neighboring cells. Plan the order of the breaks to build a chain.","moves":60,"starPar":42,"difficulty":"challenge","goal":{"type":"sealedStone","count":2,"requires":[{"type":"fourTurns","count":2}]},"mechanics":{"sealedStones":[24,31],"wind":{"every":3,"steps":[{"row":1,"direction":"left"},{"row":5,"direction":"right"}]}}},
{"id":"hanabi-awakening","name":"Hanabi Awakening","subtitle":"Awakening geometry","intro":"A broken Sealed Stone releases Awakening Pulse into eight neighboring cells. Plan the order of the breaks to build a chain.","moves":64,"starPar":45,"difficulty":"challenge","goal":{"type":"sealedStone","count":2,"requires":[{"type":"lotus","count":2}]},"mechanics":{"sealedStones":[8,12],"hanabi":{"starts":[29,33],"crates":[43,47]}}},
{"id":"sealed-bridge","name":"Sealed Bridge","subtitle":"Awakening geometry","intro":"A broken Sealed Stone releases Awakening Pulse into eight neighboring cells. Plan the order of the breaks to build a chain.","moves":65,"starPar":46,"difficulty":"challenge","goal":{"type":"sealedStone","count":3},"mechanics":{"sealedStones":[23,24,25]}}
];
function freezeWind(w){
 if(!w)return null;
 return Object.freeze({every:w.every,steps:Object.freeze(w.steps.map(x=>Object.freeze({...x})))});
}
function freezeHanabi(h){
 if(!h)return null;
 return Object.freeze({starts:Object.freeze(h.starts.slice()),crates:Object.freeze(h.crates.slice())});
}
function copyMechanics(m){
 return {
  mist:m.mist.slice(),
  daruma:m.daruma.slice(),
  sealedStones:m.sealedStones.slice(),
  mirrors:m.mirrors.map(x=>({...x})),
  ...(m.wind?{wind:{every:m.wind.every,steps:m.wind.steps.map(x=>({...x}))}}:{}),
  ...(m.hanabi?{hanabi:{starts:m.hanabi.starts.slice(),crates:m.hanabi.crates.slice()}}:{})
 };
}
const ALL=Object.freeze(DESIGNS.map((design,i)=>{
 const raw={version:2,index:i,...design,id:"journey2-"+design.id};
 const validated=ARCH.normalize(raw,i),m=validated.mechanics;
 return Object.freeze({version:validated.version,index:validated.index,id:validated.id,
  name:validated.name,subtitle:validated.subtitle,intro:validated.intro,
  moves:validated.moves,starPar:validated.starPar,difficulty:validated.difficulty,
  goal:Object.freeze({...validated.goal,
   ...(validated.goal.requires?{requires:Object.freeze(validated.goal.requires.map(x=>Object.freeze({...x})))}:{})}),
  mechanics:Object.freeze({
   mist:Object.freeze(m.mist.slice()),
   daruma:Object.freeze(m.daruma.slice()),
   sealedStones:Object.freeze(m.sealedStones.slice()),
   mirrors:Object.freeze(m.mirrors.map(x=>Object.freeze({...x}))),
   wind:freezeWind(m.wind),
   hanabi:freezeHanabi(m.hanabi)
  })});
}));
function get(index){
 if(!Number.isInteger(index)||index<FIRST||index>=FIRST+ALL.length)return null;
 const r=ALL[index-FIRST];
 return {version:r.version,index:r.index,id:r.id,name:r.name,
  subtitle:r.subtitle,intro:r.intro,moves:r.moves,starPar:r.starPar,
  difficulty:r.difficulty,goal:{...r.goal,
   ...(r.goal.requires?{requires:r.goal.requires.map(x=>({...x}))}:{})},
  mechanics:copyMechanics(r.mechanics)};
}
const api=Object.freeze({VERSION,FIRST,COUNT:ALL.length,get,
 summary:()=>ALL.map(x=>({index:x.index,name:x.name,goal:{...x.goal,
  ...(x.goal.requires?{requires:x.goal.requires.map(t=>({...t}))}:{})},
  moves:x.moves,starPar:x.starPar,difficulty:x.difficulty,
  mechanics:Object.keys(x.mechanics).filter(k=>{
   const v=x.mechanics[k];return k==="wind"||k==="hanabi"?!!v:v.length>0;
  })}))});
root.HarmonyJourneyDrafts=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
