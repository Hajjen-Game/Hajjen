/* Japanese Harmony · Bamboo Paths 1.0 · hand-authored levels 51–60.
 * Preserve these ten deliberate layouts, distinct goals and gentle chapter
 * learning curve. Indexes are zero-based; level 51 has index 50.
 * Challenge variation comes from geometry, never from altering family odds.
 */
(function(root){
"use strict";
const VERSION=1,FIRST=50;
const CHAPTER=Object.freeze([
 {name:"First Bamboo",subtitle:"Discover closed garden tiles",moves:26,starPar:9,
  goal:{type:"fusion",count:10},boardMechanics:{blocked:[23,25]},
  intro:"Bamboo stones are closed cells. They cannot move or match. Fuse around the two stones to create ten matches."},
 {name:"Narrow Paths",subtitle:"Learn how falling treasures travel",moves:34,starPar:13,
  goal:{type:"stage3",count:7},boardMechanics:{blocked:[16,18,30,32]},
  intro:"Closed cells split each column. Treasures fall only inside open sections. Upgrade seven treasures to stage 3."},
 {name:"Temple Gate",subtitle:"Enter the narrow passages",moves:35,starPar:12,
  goal:{type:"fusion",count:14},boardMechanics:{layout:"templeGate"},
  intro:"Temple Gate has narrow openings. Use the connected paths to set up fourteen fusions around fixed stones."},
 {name:"Gate of Echoes",subtitle:"Create Harmony in the passage",moves:46,starPar:24,
  goal:{type:"pulseHits",count:7},boardMechanics:{layout:"templeGate"},
  intro:"Create a stage-5 Masterpiece inside Temple Gate. Its Harmony Pulse upgrades open neighboring tiles, not blocked stones."},
 {name:"Twin Gardens",subtitle:"Two garden wings, one crossing",moves:38,starPar:12,
  goal:{type:"fusion",count:16},boardMechanics:{layout:"twinGardens"},
  intro:"The two gardens connect through the middle crossing. Match across each side to make sixteen fusions."},
 {name:"Bridge of Harmony",subtitle:"Grow treasures across the crossing",moves:43,starPar:21,
  goal:{type:"stage3",count:9},boardMechanics:{layout:"twinGardens"},
  intro:"Use the open center row to plan matches between the garden wings. Grow nine treasures to stage 3."},
 {name:"Bamboo Breeze",subtitle:"An open garden to enjoy",moves:34,starPar:12,
  goal:{type:"fusion",count:16},boardMechanics:{},
  intro:"A peaceful, open board after the narrow paths. Enjoy bigger cascades and complete sixteen fusions."},
 {name:"Central Shrine",subtitle:"Think around the sacred center",moves:40,starPar:13,
  goal:{type:"fusion",count:15},boardMechanics:{layout:"centralShrine"},
  intro:"The central shrine is closed. Plan fifteen fusions around its ring of stones instead of through the middle."},
 {name:"Heart of the Garden",subtitle:"Release Harmony around the shrine",moves:48,starPar:18,
  goal:{type:"masterpiece",count:2},boardMechanics:{layout:"centralShrine"},
  intro:"Create two Masterpieces around the Central Shrine. Harmony Pulse reaches adjacent open tiles, not the closed center."},
 {name:"Path of Harmony",subtitle:"Bamboo Paths chapter finale",moves:58,starPar:31,
  goal:{type:"mist",count:3},boardMechanics:{layout:"centralShrine",mist:[9,13,35]},
  intro:"Clear three Mist tiles around the sacred shrine. Fuse onto Mist or reach it with Harmony Pulse; the central stones remain closed."}
]);
for(const item of CHAPTER){
 Object.freeze(item.goal);
 Object.freeze(item.boardMechanics);
 Object.freeze(item);
}
function get(index){
 if(!Number.isInteger(index)||index<FIRST||index>=FIRST+CHAPTER.length)return null;
 const item=CHAPTER[index-FIRST];
 return {...item,goal:{...item.goal},
  boardMechanics:{...item.boardMechanics,
   ...(item.boardMechanics.blocked?{blocked:item.boardMechanics.blocked.slice()}:{}),
   ...(item.boardMechanics.mist?{mist:item.boardMechanics.mist.slice()}:{} )},
  chapter:6,bambooVersion:VERSION,objectiveVersion:2,balanceVersion:2};
}
const api=Object.freeze({VERSION,FIRST,CHAPTER,get});
root.HarmonyBambooPaths=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
