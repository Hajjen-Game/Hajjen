/* Japanese Harmony · Journey 2.0 · Step B, authored draft levels 1–20.
 * Preview-only catalogue; does not alter published levelConfig or saves.
 * Levels 1–4 and the Koi level-10 finale stay intact. Hanabi starts at 5, Mirror at 11, Wind at 16; Daruma moves to 21.
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
 {id:"first-firework",name:"First Firework",subtitle:"Light the festival sky",intro:"Guide one firework into its wooden crate. Match treasures below the rocket so it falls into the crate and launches a bright vertical Harmony Pulse.",moves:30,starPar:13,difficulty:"gentle",goal:{type:"lotus",count:1},mechanics:{hanabi:{starts:[29],crates:[43]}}},
 {id:"twin-fireworks",name:"Twin Fireworks",subtitle:"Two rockets, two launch paths",intro:"Deliver both fireworks to their crates. Make matches in the two columns and choose which rocket to launch first. Also make a four-object match on three separate moves; two immediate launches alone no longer finish the puzzle.",moves:38,starPar:21,difficulty:"standard",goal:{type:"lotus",count:2,requires:[{type:"fourTurns",count:3}]},mechanics:{hanabi:{starts:[29,33],crates:[43,47]}}},
 {id:"fireworks-through-mist",name:"Fireworks Through Mist",subtitle:"Use the launch to clear the garden",intro:"Clear four Mist cells. A Hanabi launch sweeps upward and can clear the Mist in its column; one extra patch needs your own well-placed Fusion. You must also deliver the rocket and complete five Fan fusions. A single vertical blast is not the whole solution.",moves:38,starPar:21,difficulty:"standard",goal:{type:"mist",count:4,requires:[{type:"lotus",count:1},{type:"familyFusion",family:"fan",count:5}]},mechanics:{hanabi:{starts:[29],crates:[43]},mist:[8,15,22,24]}},
 {id:"festival-bloom",name:"Festival Bloom",subtitle:"Use fireworks to grow Masterpieces",intro:"Create two Masterpieces. Delivering the firework is optional, but its upward Pulse can upgrade treasures and start beautiful chains. The level also requires the rocket to launch and one Koi Masterpiece, not just any two Masterpieces.",moves:39,starPar:23,difficulty:"challenge",goal:{type:"masterpiece",count:2,requires:[{type:"lotus",count:1},{type:"familyMasterpiece",family:"koi",count:1}]},mechanics:{hanabi:{starts:[29],crates:[43]}}},
 {id:"firework-finale",name:"Firework Finale",subtitle:"Plan two launches through lingering Mist",intro:"Deliver both fireworks. Mist remains on two separate cells and can be cleared by Fusion or Harmony Pulse, but only delivered rockets count toward this goal. Deliver both rockets, clear both Mist tiles, and make six Lantern fusions. Finishing the prebuilt launches is no longer enough.",moves:41,starPar:23,difficulty:"challenge",goal:{type:"lotus",count:2,requires:[{type:"mist",count:2},{type:"familyFusion",family:"lantern",count:6}]},mechanics:{hanabi:{starts:[29,33],crates:[43,47]},mist:[9,26]}},
 {id:"koi-masterpiece-finale",name:"Koi Masterpiece Finale",subtitle:"Two Koi, one final harmony",
  intro:"Create TWO stage-5 Koi Masterpieces. Other Masterpieces still trigger Harmony Pulse and can help develop your Koi, but only Koi count toward the goal.",
  moves:40,starPar:17,difficulty:"challenge",goal:{type:"familyMasterpiece",family:"koi",count:2},mechanics:{}},
 // Chapter 2: introduce the fifth family, then Daruma gradually on level 15.
 // Each blocker is deliberate; opening, movement and Pulse remain unscripted.
 {id:"first-moon-mirror",name:"First Moon Mirror",subtitle:"A fusion can reach beyond its neighbor",intro:"A Moon Mirror stays fixed and reflects the energy of an adjacent Fusion one step farther. Develop two treasures to stage 4 using well-placed Fusions. Trigger the mirror with a real Fusion on three separate moves; upgrades alone will not finish this level.",moves:39,starPar:21,difficulty:"standard",goal:{type:"stage4",count:2,requires:[{type:"mirrorResonances",count:3}]},mechanics:{mirrors:[{at:25,direction:"right"}]}},
 {id:"moonlit-mist",name:"Moonlit Mist",subtitle:"Let reflected light reach the Mist",intro:"Clear three Mist cells. Fuse beside the Moon Mirror to reflect energy toward a distant tile; ordinary Fusion and Harmony Pulse can clear the other patches. In addition to clearing Mist, activate Moon Mirror by Fusion on four separate moves.",moves:43,starPar:24,difficulty:"standard",goal:{type:"mist",count:3,requires:[{type:"mirrorResonances",count:4}]},mechanics:{mirrors:[{at:25,direction:"right"}],mist:[26,33,40]}},
 {id:"moon-and-fireworks",name:"Moon and Fireworks",subtitle:"Plan two rocket paths around the mirror",intro:"Deliver two fireworks while a fixed Moon Mirror reflects nearby Fusions. Its reflection can grow treasures but the fireworks still need to reach their own crates. The moon must resonate on four separate Fusion moves, in addition to delivering both rockets.",moves:45,starPar:25,difficulty:"challenge",goal:{type:"lotus",count:2,requires:[{type:"mirrorResonances",count:4}]},mechanics:{hanabi:{starts:[29,33],crates:[43,47]},mirrors:[{at:24,direction:"right"}]}},
 {id:"double-reflection",name:"Double Reflection",subtitle:"The moon lights two directions",intro:"Develop three treasures to stage 4. Two Moon Mirrors change where the energy of a Fusion can go; their directions matter. Activate one of the fixed mirrors on five separate Fusion moves as well as growing the required treasures.",moves:45,starPar:26,difficulty:"challenge",goal:{type:"stage4",count:3,requires:[{type:"mirrorResonances",count:5}]},mechanics:{mirrors:[{at:25,direction:"right"},{at:31,direction:"down"}]}},
 {id:"moonlit-bloom",name:"Moonlit Bloom",subtitle:"A spectacular reflected chain",intro:"Create two Masterpieces using a Moon Mirror and one optional firework. The firework's vertical Pulse does not reflect automatically through the mirror. Two Masterpieces, four real Mirror activations and the rocket are all required to finish.",moves:46,starPar:26,difficulty:"challenge",goal:{type:"masterpiece",count:2,requires:[{type:"mirrorResonances",count:4},{type:"lotus",count:1}]},mechanics:{mirrors:[{at:24,direction:"right"}],hanabi:{starts:[29],crates:[43]}}},
 {id:"first-wind-garden",name:"First Wind Garden",subtitle:"Watch the shifting row",intro:"After every third successful move, Wind Garden shifts a marked row one cell to the right. Plan your Fusions around the coming shift. Also create four-object matches on four separate player moves. Position them before the scheduled wind shifts.",moves:37,starPar:22,difficulty:"standard",goal:{type:"fusion",count:14,requires:[{type:"fourTurns",count:4}]},mechanics:{wind:{every:3,steps:[{row:3,direction:"right"}]}}},
 {id:"wind-and-fireworks",name:"Wind and Fireworks",subtitle:"A breeze above the launch path",intro:"Deliver one firework. The wind shifts an upper row every third move, so watch where your treasures will land while preparing the crate below. A rocket launch alone is not enough: plan four separate four-object matches and five stage-4 upgrades.",moves:40,starPar:23,difficulty:"challenge",goal:{type:"lotus",count:1,requires:[{type:"fourTurns",count:4},{type:"stage4",count:5}]},mechanics:{hanabi:{starts:[29],crates:[43]},wind:{every:3,steps:[{row:2,direction:"right"}]}}},
 {id:"wind-and-moonlight",name:"Wind and Moonlight",subtitle:"Bring your treasures to the mirror",intro:"Develop three stage-4 treasures. Wind shifts row three every third move; the Moon Mirror beside it can reflect a Fusion's energy. Trigger the mirror through five different player-created Fusions while Wind changes the surrounding row.",moves:46,starPar:27,difficulty:"challenge",goal:{type:"stage4",count:3,requires:[{type:"mirrorResonances",count:5}]},mechanics:{mirrors:[{at:25,direction:"right"}],wind:{every:3,steps:[{row:2,direction:"left"}]}}},
 {id:"crossing-winds",name:"Crossing Winds",subtitle:"Two breezes, one changing garden",intro:"Create two Masterpieces. Every third successful move, the wind alternates between two shifting rows, so the next row matters. Two Masterpieces are only part of the puzzle. Make four-object matches on five distinct turns as the wind alternates.",moves:48,starPar:29,difficulty:"challenge",goal:{type:"masterpiece",count:2,requires:[{type:"fourTurns",count:5}]},mechanics:{wind:{every:3,steps:[{row:1,direction:"left"},{row:3,direction:"right"}]}}},
 {id:"festival-of-reflections",name:"Festival of Reflections",subtitle:"Two launches under the moon",intro:"Deliver both fireworks and enjoy the upward Pulse. Two Moon Mirrors can reshape Fusion opportunities, but the rockets still launch straight up. This chapter finale requires two fireworks, six deliberate Mirror activations on separate moves, and two Masterpieces. The rockets alone will never finish the level.",moves:48,starPar:28,difficulty:"challenge",goal:{type:"lotus",count:2,requires:[{type:"mirrorResonances",count:6},{type:"masterpiece",count:2}]},mechanics:{hanabi:{starts:[29,33],crates:[43,47]},mirrors:[{at:18,direction:"left"},{at:24,direction:"right"}]}}
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
