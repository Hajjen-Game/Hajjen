/* Lotus Stream 1.1 — routing and difficulty prototypes.
 * DIAGNOSTIC ONLY. No recipe is assigned to production levels 62–70.
 * Pure functions: no RNG, DOM, storage, automatic moves or free rewards.
 */
(function(root){
"use strict";
const L=root.HarmonyLotusStream||(typeof require==="function"?require("./lotus-stream.js"):null);
const B=root.HarmonyBoardMechanics||(typeof require==="function"?require("./board-mechanics.js"):null);
if(!L||!B)throw Error("Lotus routing requires cargo and board mechanics");
const VERSION=1;
const prototypes=Object.freeze({
 "long-drop":Object.freeze({
  name:"Long Lotus Crossing",moves:48,starPar:24,
  lotus:Object.freeze({version:1,starts:[15,19],exits:[43,47]}),
  boardMechanics:Object.freeze({})
 }),
 "three-lanes":Object.freeze({
  name:"Three Lotus Channels",moves:54,starPar:32,
  lotus:Object.freeze({version:1,starts:[22,24,26],exits:[43,45,47]}),
  boardMechanics:Object.freeze({})
 }),
 "shared-gate":Object.freeze({
  name:"Two Seeds, One River Gate",moves:56,starPar:33,
  lotus:Object.freeze({version:1,starts:[8,22,12],exits:[43,47]}),
  boardMechanics:Object.freeze({})
 }),
 "garden-route":Object.freeze({
  name:"Garden Lotus Crossing",moves:50,starPar:26,
  lotus:Object.freeze({version:1,starts:[15,19],exits:[43,47]}),
  boardMechanics:Object.freeze({blocked:[23,25]})
 })
});
function validate(lotusInput,mechanicsInput){
 const lotus=L.normalize(lotusInput),mechanics=B.normalize(mechanicsInput);
 const blocked=new Set(mechanics.blocked);
 for(const start of lotus.starts){
  if(blocked.has(start))throw Error("Lotus cannot start on a closed tile");
  const col=start%7,gate=lotus.exits.find(x=>x%7===col);
  if(gate===undefined)throw Error("Lotus seed has no gate in its lane");
  for(let at=start+7;at<=gate;at+=7)
   if(blocked.has(at))throw Error("Lotus route blocked by permanent terrain at "+at);
 }
 for(const exit of lotus.exits)
  if(blocked.has(exit))throw Error("Collection gate cannot be closed");
 return {lotus,mechanics};
}
function get(name){
 if(!Object.hasOwn(prototypes,name))throw Error("Unknown Lotus prototype: "+name);
 const recipe=prototypes[name],{lotus,mechanics}=validate(recipe.lotus,recipe.boardMechanics);
 return {name:recipe.name,key:name,moves:recipe.moves,starPar:recipe.starPar,
  lotus,boardMechanics:mechanics};
}
function remaining(board,lotusInput){
 const lotus=L.normalize(lotusInput),gates=new Map(lotus.exits.map(i=>[i%7,i]));
 return board.map((p,i)=>{
  if(!L.isSeed(p))return null;
  const target=gates.get(i%7);
  return target===undefined?null:{id:p.id,at:i,gate:target,
   distance:Math.floor((target-i)/7)};
 }).filter(Boolean);
}
function distance(board,lotus){return remaining(board,lotus).reduce((s,p)=>s+p.distance,0);}
function advance(before,after,lotus){
 const old=new Map(remaining(before,lotus).map(p=>[p.id,p.distance]));
 return remaining(after,lotus).reduce((s,p)=>
  s+Math.max(0,(old.get(p.id)??p.distance)-p.distance),0);
}
// Director awareness: prefer *existing real* legal swaps in a seed's lane
// below the seed. This never constructs a match, moves cargo or awards coins.
function opportunity(board,lotus,validSwaps){
 const seeds=remaining(board,lotus);
 if(!seeds.length||typeof validSwaps!=="function")return 0;
 const legal=validSwaps(board),quality=new Map();
 for(const seed of seeds){
  const col=seed.at%7,row=Math.floor(seed.at/7);
  let local=0;
  for(const [a,b] of legal){
   let power=0;
   for(const at of [a,b]){
    const r=Math.floor(at/7),c=at%7;
    if(r<=row)continue;
    const vertical=1/(1+Math.max(0,r-row-1)*.24);
    if(c===col)power=Math.max(power,vertical);
    else if(Math.abs(c-col)===1)power=Math.max(power,vertical*.28);
   }
   local=Math.max(local,power);
  }
  quality.set(seed.id,local);
 }
 return [...quality.values()].reduce((s,x)=>s+x,0)/Math.max(1,quality.size)*3.3;
}
// Guide one-move hints primarily by actual collection and legitimate descent.
// A delivery vanishes from the after-board, so calculate it from the
// objective progress counter rather than manufacturing virtual motion.
function hintBonus(before,after,lotus,deliveredDelta){
 const down=advance(before,after,lotus);
 return Math.max(0,deliveredDelta)*7500+down*3400;
}
// The prototype opener offers two standard, player-executed bottom row
// matches where possible; it does not script a victory or teleport seeds.
function opening(board,families){
 const [a,c,b,d,e]=families;
 for(const [at,family] of [[42,a],[43,a],[44,b],[45,e],[46,c],[47,c],[48,d],
  [37,a],[41,c]])board[at]={...board[at],family,stage:1};
 return board;
}
const api=Object.freeze({VERSION,prototypes,get,validate,remaining,distance,
 advance,opportunity,hintBonus,opening});
root.HarmonyLotusRouting=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
