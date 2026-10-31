/* Japanese Harmony · Identity Plan 1.0 · isolated, deterministic mechanics prototypes.
 * Not imported by the live game. No changes to Director, RNG, saves or goals.
 * Moon Mirrors: one-hop directional relay added to the ordinary Pulse targets.
 * Wind Garden: fully scheduled one-cell circular displacement of settled rows.
 */
(function(root){
"use strict";
const SIZE=7,CELLS=SIZE*SIZE;
const DELTAS=Object.freeze({up:[-1,0],right:[0,1],down:[1,0],left:[0,-1]});
const FIXED=new Set(["terrain","daruma","sealedStone","lotusSeed"]);
function cell(at){
 if(!Number.isInteger(at)||at<0||at>=CELLS)throw Error("Invalid board cell");
 return [Math.floor(at/SIZE),at%SIZE];
}
function step(at,direction){
 const delta=DELTAS[direction];
 if(!delta)throw Error("Unknown direction");
 const [r,c]=cell(at),nr=r+delta[0],nc=c+delta[1];
 return nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE?nr*SIZE+nc:null;
}
function adjacent(at){
 return ["up","right","down","left"].map(d=>step(at,d)).filter(i=>i!==null);
}
function checkedBlocked(blocked){
 if(!Array.isArray(blocked))throw Error("blocked must be an array");
 const unique=new Set();
 for(const at of blocked){cell(at);if(unique.has(at))throw Error("Duplicate blocked cell");unique.add(at);}
 return unique;
}
function normalizeMirrors(mirrors,blocked=[]){
 if(!Array.isArray(mirrors))throw Error("mirrors must be an array");
 const closed=checkedBlocked(blocked),out=new Map();
 for(const entry of mirrors){
  if(!entry||typeof entry!=="object")throw Error("Invalid mirror");
  const {at,direction}=entry;cell(at);
  if(!Object.hasOwn(DELTAS,direction)||closed.has(at)||out.has(at))
   throw Error("Invalid or overlapping mirror");
  out.set(at,direction);
 }
 return out;
}
// A mirror is a stationary CELL overlay, not a piece. Its ordinary adjacent
// Pulse target is still hit; ONE extra hit is relayed in the specified direction.
// Duplicates and blocked terrain cells are excluded. Never recursively relay.
function planMirrorPulse(source,mirrors=[],options={}){
 cell(source);
 const closed=checkedBlocked(options.blocked||[]);
 const installed=normalizeMirrors(mirrors,[...closed]);
 if(closed.has(source))throw Error("Pulse source cannot be blocked");
 const direct=adjacent(source).filter(at=>!closed.has(at));
 const reached=new Set(direct),reflections=[];
 for(const mirrorAt of direct){
  const direction=installed.get(mirrorAt);
  if(!direction)continue;
  const to=step(mirrorAt,direction);
  if(to===null||to===source||closed.has(to)||reached.has(to))continue;
  reached.add(to);
  reflections.push({from:mirrorAt,to,direction});
 }
 return {source,direct,reflections,targets:[...reached]};
}
function checkedBoard(board){
 if(!Array.isArray(board)||board.length!==CELLS)throw Error("Expected 49 board cells");
}
// Wind overlays such as Mist remain at fixed indices; only piece references move.
// Can only be used on an already-settled row with no fixed obstacles or cargo.
// The caller decides when and how to resolve matches caused by this shift.
function planWindShift(board,row,direction){
 checkedBoard(board);
 if(!Number.isInteger(row)||row<0||row>=SIZE)throw Error("Invalid wind row");
 if(direction!=="left"&&direction!=="right")throw Error("Wind shifts horizontally");
 const from=row*SIZE;
 const segment=board.slice(from,from+SIZE);
 if(segment.some(p=>!p))return {ok:false,reason:"unsettled-row",row,direction};
 if(segment.some(p=>FIXED.has(p.family)))return {ok:false,reason:"fixed-object-in-row",row,direction};
 const result=board.slice(),moved=[];
 for(let col=0;col<SIZE;col++){
  const target=(col+(direction==="right"?1:SIZE-1))%SIZE;
  const a=from+col,b=from+target;
  result[b]=segment[col];
  moved.push({from:a,to:b,id:segment[col].id??null});
 }
 return {ok:true,row,direction,board:result,moved};
}
// Public preview: after exactly how many valid moves does the next signed
// shift happen? One step per trigger, stable across pause/resume and retries.
function nextWindShift(movesUsed,{every,steps}){
 if(!Number.isInteger(movesUsed)||movesUsed<0)throw Error("Invalid valid-move count");
 if(!Number.isInteger(every)||every<1||every>100||
  !Array.isArray(steps)||!steps.length||steps.length>20)
  throw Error("Invalid wind schedule");
 for(const s of steps){
  if(!s||!Number.isInteger(s.row)||s.row<0||s.row>=SIZE||
   !["left","right"].includes(s.direction))throw Error("Invalid scheduled shift");
 }
 const inMoves=every-movesUsed%every;
 const cycle=Math.floor((movesUsed+inMoves)/every)-1;
 const selected=steps[cycle%steps.length];
 return {inMoves,afterMove:movesUsed+inMoves,row:selected.row,direction:selected.direction};
}
const api=Object.freeze({SIZE,CELLS,step,adjacent,normalizeMirrors,
 planMirrorPulse,planWindShift,nextWindShift});
root.HarmonyIdentityPrototypes=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
