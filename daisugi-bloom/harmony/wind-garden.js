/* Japanese Harmony · Wind Garden 1.0 · opt-in playable row-shift prototype.
 * No global changes to level recipes or live refills.
 * Wind acts AFTER a valid player's fully settled match/cascade, never on
 * invalid taps. Shifts preserve identity and stages, not fixed-cell Mist.
 */
(function(root){
"use strict";
const P=root.HarmonyIdentityPrototypes||(typeof require==="function"?require("./identity-prototypes.js"):null);
if(!P)throw Error("Wind Garden needs identity-prototypes.js");
const VERSION=1;
const SCENARIOS=Object.freeze({
 breeze:Object.freeze({name:"First Breeze",subtitle:"Follow the moving row",moves:14,
  goal:{type:"fusion",count:18},schedule:{every:1,steps:[{row:3,direction:"right"}]},
  mist:[],intro:"After every valid move, row 4 shifts one cell right. The rightmost treasure wraps around to the left. Plan where your upgrades will land."}),
 crossing:Object.freeze({name:"Crossing Winds",subtitle:"Two rows take turns",moves:18,
  goal:{type:"stage3",count:4},schedule:{every:2,steps:[{row:2,direction:"left"},{row:4,direction:"right"}]},
  mist:[],intro:"Every second valid move, the wind shifts a marked row. Watch which row moves next before choosing your match."}),
 tide:Object.freeze({name:"Garden Tide",subtitle:"Wind changes direction",moves:18,
  goal:{type:"mist",count:2},schedule:{every:1,steps:[{row:3,direction:"left"},{row:3,direction:"right"}]},
  mist:[24,32],intro:"The wind changes direction after each valid move. Mist stays on its own cells while treasures travel — position fusions carefully to clear both patches."})
});
function descriptor(key){
 if(!Object.hasOwn(SCENARIOS,key))throw Error("Unknown Wind Garden preview");
 const s=SCENARIOS[key];
 return {version:VERSION,key,name:s.name,subtitle:s.subtitle,intro:s.intro,moves:s.moves,
  goal:{...s.goal},mist:s.mist.slice(),
  schedule:{every:s.schedule.every,steps:s.schedule.steps.map(x=>({...x}))}};
}
function normalize(raw){
 if(raw==null)return null;
 if(!raw||typeof raw!=="object"||!Number.isInteger(raw.every)||raw.every<1||raw.every>100||
  !Array.isArray(raw.steps)||!raw.steps.length||raw.steps.length>20)
  throw Error("Invalid Wind Garden schedule");
 const steps=raw.steps.map(s=>{
  if(!s||!Number.isInteger(s.row)||s.row<0||s.row>=7||
   !["left","right"].includes(s.direction))throw Error("Invalid Wind Garden direction or row");
  return {row:s.row,direction:s.direction};
 });
 return {every:raw.every,steps};
}
function opening(board,families,key){
 if(!Array.isArray(board)||board.length!==49||!families?.length||
  !Object.hasOwn(SCENARIOS,key))throw Error("Invalid Wind Garden opening");
 const primary=families[0],secondary=families[1];
 // The demonstration begins with ONE genuine, legal match:
 // move row 3, col 4 (index 17) into row 4, col 4 (index 24).
 // It still requires the player to choose and make that swap.
 for(const at of [22,23]){board[at].family=primary;board[at].stage=1;}
 board[17].family=primary;board[17].stage=key==="tide"?3:2;
 board[24].family=secondary;board[24].stage=1;
 return board;
}
function next(movesUsed,schedule){return P.nextWindShift(movesUsed,normalize(schedule));}
function shift(board,row,direction){return P.planWindShift(board,row,direction);}
const api=Object.freeze({VERSION,SCENARIOS,descriptor,normalize,opening,next,shift});
root.HarmonyWindGarden=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
