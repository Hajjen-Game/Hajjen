/* Lotus Stream 1.0 · Drop & Collection Foundation
 * One authored, playable pilot (level 61). Remaining Lotus Stream levels
 * are deliberately not assigned before real difficulty and clarity testing.
 * Seeds are living cargo, not matchable treasures or fixed terrain.
 */
(function(root){
"use strict";
const VERSION=1,FIRST=60;
const PILOT=Object.freeze({
 name:"First Lotus Stream",subtitle:"Guide lotus seeds into the river",
 moves:38,par:20,starPar:17,
 goal:{type:"lotus",count:2},
 lotus:{version:VERSION,starts:[36,40],exits:[43,47]},
 intro:"Collect two lotus seeds. Match treasures BELOW a seed to let it fall down its column. A seed is not a matching treasure and cannot be swapped. Guide each seed into its glowing river gate at the bottom."
});
function normalize(input){
 if(input===null||input===undefined)return {version:VERSION,starts:[],exits:[]};
 if(!input||typeof input!=="object"||input.version!==VERSION)throw Error("Unsupported Lotus Stream descriptor");
 const check=(arr,key)=>{
  if(!Array.isArray(arr)||arr.some(i=>!Number.isInteger(i)||i<0||i>=49)||new Set(arr).size!==arr.length)
   throw Error("Invalid Lotus "+key);
  return arr.slice();
 };
 const starts=check(input.starts,"starts"),exits=check(input.exits,"exits");
 if(starts.length>6||exits.length>7||exits.some(i=>i<42))throw Error("Invalid Lotus collection gate");
 if(starts.some(i=>i>=42)||starts.length!==exits.length||
  starts.some(i=>!exits.some(exitIndex=>exitIndex%7===i%7)))throw Error("Lotus seeds need a reachable exit in their column");
 return {version:VERSION,starts,exits};
}
function get(index){
 if(index!==FIRST)return null;
 return {...PILOT,goal:{...PILOT.goal},lotus:normalize(PILOT.lotus),
  chapter:7,lotusVersion:VERSION,objectiveVersion:2,balanceVersion:2};
}
// Two visible, legitimate bottom-row match opportunities. Both use only
// stage-one treasures from the level's existing five-family pool. Neither
// fusion happens automatically; the player still chooses the swaps.
function opening(board,families){
 const [a,c,b,d,e]=families;
 for(const [at,family] of [[42,a],[43,a],[44,b],[45,e],[46,c],[47,c],[48,d],
  [37,a],[41,c]])board[at]={...board[at],family,stage:1};
 return board;
}
function seed(at){
 if(!Number.isInteger(at)||at<0||at>=42)throw Error("Invalid Lotus seed start");
 return {family:"lotusSeed",stage:0,id:-(2000+at)};
}
function isSeed(piece){return piece?.family==="lotusSeed"&&piece.stage===0;}
function collect(board,exits){
 const collected=[];
 for(const at of exits)if(isSeed(board[at])){
  collected.push({at,id:board[at].id});
  board[at]=null;
 }
 return collected;
}
const api=Object.freeze({VERSION,FIRST,PILOT,normalize,get,opening,seed,isSeed,collect});
root.HarmonyLotusStream=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
