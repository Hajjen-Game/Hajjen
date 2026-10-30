/* Japanese Harmony · Omamori Target Feedback 1.0.
 * Pure, deterministic footprint calculation for the visual preview only.
 * No card, board, RNG or save state is mutated by this module.
 * Shuffle geometry intentionally mirrors Powers.shuffleArea().
 */
(function(root){
"use strict";
const SIZE=7;
const valid=i=>Number.isInteger(i)&&i>=0&&i<SIZE*SIZE;
const multi=id=>id==="grandBloom"||id==="twinSealbreaker";
const shuffle=id=>id==="koi"||id==="deepCurrent";
function area(id,at,board){
 if(!shuffle(id)||!valid(at))return [];
 const size=id==="koi"?2:3;
 const row=Math.floor(at/SIZE),col=at%SIZE;
 const firstRow=Math.min(SIZE-size,Math.max(0,row-(size===3?1:0)));
 const firstCol=Math.min(SIZE-size,Math.max(0,col-(size===3?1:0)));
 const cells=[];
 for(let dr=0;dr<size;dr++)for(let dc=0;dc<size;dc++){
  const index=(firstRow+dr)*SIZE+firstCol+dc;
  // Powers.shuffleArea excludes fixed Daruma and Sealed Stones.
  const piece=board?.[index];
  if(piece?.family!=="daruma"&&piece?.family!=="sealedStone"&&piece?.family!=="terrain"&&piece?.family!=="lotusSeed")cells.push(index);
 }
 return cells;
}
function preview(id,targets,board){
 if(!Array.isArray(targets)||!targets.length)return [];
 const chosen=targets.filter(valid);
 if(!chosen.length)return [];
 return shuffle(id)?area(id,chosen[chosen.length-1],board):[...new Set(chosen)];
}
function required(id){return multi(id)?2:1;}
const api=Object.freeze({area,preview,required});
root.HarmonyOmamoriTargets=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
