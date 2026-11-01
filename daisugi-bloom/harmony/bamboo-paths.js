/* Japanese Harmony · Bamboo Paths 1.0 · hand-authored levels 51–60.
 * Preserve these ten deliberate layouts, distinct goals and gentle chapter
 * learning curve. Indexes are zero-based; level 51 has index 50.
 * Challenge variation comes from geometry, never from altering family odds.
 */
(function(root){
"use strict";
const VERSION=1,FIRST=50;
const GATE_LEGACY_INTRO="Create a stage-5 Masterpiece inside Temple Gate. Its Harmony Pulse upgrades open neighboring tiles, not blocked stones.";
// The uninterrupted seventh row can rotate without moving any Bamboo stone.
const GATE_BOTTOM_WIND=Object.freeze({every:3,
 steps:Object.freeze([Object.freeze({row:6,direction:"right"})])});
const CHAPTER=Object.freeze([
 {name:"First Bamboo",subtitle:"Discover missing board tiles",moves:26,starPar:9,
  goal:{type:"fusion",count:10},boardMechanics:{blocked:[23,25]},
  intro:"Two squares are missing from the board. They cannot hold treasures or matches. Plan ten fusions along the remaining paths."},
 {name:"Narrow Paths",subtitle:"Learn how falling treasures travel",moves:34,starPar:13,
  goal:{type:"stage3",count:7},boardMechanics:{blocked:[16,18,30,32]},
  intro:"Missing squares split their columns. Treasures fall only within connected sections of the board. Upgrade seven treasures to stage 3."},
 {name:"Temple Gate",subtitle:"Enter the narrow passages",moves:33,starPar:12,
  goal:{type:"fusion",count:14},boardMechanics:{layout:"templeGate"},
  intro:"Temple Gate has missing squares that create narrow paths. Make fourteen fusions along the playable tiles."},
 {name:"Gate of Echoes",subtitle:"Wind beneath the gate",moves:46,starPar:24,
  goal:{type:"pulseHits",count:7},boardMechanics:{layout:"templeGate"},
  windGarden:GATE_BOTTOM_WIND,
  intro:"Reach seven Harmony Pulse hits. Every three valid moves Wind shifts the bottom row right by one; the missing squares remain empty and impassable."},
 {name:"Twin Gardens",subtitle:"Two garden wings, one crossing",moves:35,starPar:12,
  goal:{type:"fusion",count:16},boardMechanics:{layout:"twinGardens"},
  intro:"Missing tiles divide the two sides; a central crossing stays playable. Make sixteen fusions along the remaining paths."},
 {name:"Bridge of Harmony",subtitle:"Grow treasures across the crossing",moves:43,starPar:21,
  goal:{type:"stage3",count:9},boardMechanics:{layout:"twinGardens"},
  intro:"Use the remaining center crossing to connect the two sides of the board. Upgrade nine treasures to stage 3."},
 {name:"Bamboo Breeze",subtitle:"An open garden to enjoy",moves:28,starPar:12,
  goal:{type:"fusion",count:16},boardMechanics:{},
  intro:"A full board after the winding gaps. Enjoy bigger cascades and complete sixteen fusions."},
 {name:"Central Shrine",subtitle:"An open space through the center",moves:37,starPar:13,
  goal:{type:"fusion",count:15},boardMechanics:{layout:"centralShrine",blocked:[24]},
  intro:"Nine missing board tiles form an open 3×3 space in the center. Treasures can move and fuse only on the remaining paths around the opening."},
 {name:"Heart of the Garden",subtitle:"Release Harmony around the open center",moves:46,starPar:18,
  goal:{type:"masterpiece",count:2},boardMechanics:{layout:"centralShrine",blocked:[24]},
  intro:"Create two Masterpieces around the nine-tile central opening. Harmony Pulse can affect treasures beside an opening, never the missing squares."},
 {name:"Path of Harmony",subtitle:"Find a route around the opening",moves:58,starPar:31,
  goal:{type:"mist",count:3},boardMechanics:{layout:"centralShrine",blocked:[24],mist:[9,13,35]},
  intro:"Clear three Mist tiles around the missing center squares. Fuse onto Mist or reach it with Harmony Pulse; the central gap is not playable."}
]);
for(const item of CHAPTER){
 Object.freeze(item.goal);
 Object.freeze(item.boardMechanics);
 Object.freeze(item);
}
function get(index){
 if(!Number.isInteger(index)||index<FIRST||index>=FIRST+CHAPTER.length)return null;
 const item=CHAPTER[index-FIRST];
 return {...item,par:item.starPar,goal:{...item.goal},
  ...(item.windGarden?{windGarden:{every:item.windGarden.every,
   steps:item.windGarden.steps.map(step=>({...step}))}}:{}),
  boardMechanics:{...item.boardMechanics,
   ...(item.boardMechanics.blocked?{blocked:item.boardMechanics.blocked.slice()}:{}),
   ...(item.boardMechanics.mist?{mist:item.boardMechanics.mist.slice()}:{} )},
  chapter:6,bambooVersion:VERSION,objectiveVersion:2,balanceVersion:2};
}
const api=Object.freeze({VERSION,FIRST,CHAPTER,get,GATE_LEGACY_INTRO});
root.HarmonyBambooPaths=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
