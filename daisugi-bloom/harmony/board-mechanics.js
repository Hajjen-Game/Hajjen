/* Japanese Harmony · Board Mechanics Foundation 1.0
 * Pure, reusable 7x7 board descriptors. Objectives remain independent:
 * a level may target Masterpieces while placing Mist, Daruma or Stones.
 * Layouts are templates, NOT automatically activated for live levels.
 *
 * Legend: "." playable, "#" permanently closed garden/stone cell.
 * Future chapters add new behavior through separately versioned adapters.
 */
(function(root){
"use strict";
const SIZE=7,CELLS=SIZE*SIZE,VERSION=1;
const PRESETS=Object.freeze({
 templeGate:Object.freeze([
  ".......",".#...#.","..#.#..",".......","..#.#..",".#...#.","......."
 ]),
 twinGardens:Object.freeze([
  ".......","...#...","...#...",".......","...#...","...#...","......."
 ]),
 centralShrine:Object.freeze([
  ".......",".......","..###..","..#.#..","..###..",".......","......."
 ])
});
function checkedIndices(value,name){
 if(value===undefined||value===null)return [];
 if(!Array.isArray(value))throw Error(name+" must be an array of 7x7 indices");
 const out=new Set();
 for(const at of value){
  if(!Number.isInteger(at)||at<0||at>=CELLS)throw Error("Invalid "+name+" index");
  if(out.has(at))throw Error("Duplicate "+name+" index "+at);
  out.add(at);
 }
 return [...out].sort((a,b)=>a-b);
}
function fromRows(rows){
 if(!Array.isArray(rows)||rows.length!==SIZE||
  rows.some(row=>typeof row!=="string"||row.length!==SIZE||/[^.#]/.test(row)))
  throw Error("Layout requires seven strings of seven '.' or '#' symbols");
 const blocked=[];
 for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)
  if(rows[r][c]==="#")blocked.push(r*SIZE+c);
 return blocked;
}
function normalize(input){
 if(input===undefined||input===null)return {version:VERSION,layout:null,blocked:[],mist:[],daruma:[],sealedStone:[]};
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid board mechanics descriptor");
 if(input.version!==undefined&&input.version!==VERSION)throw Error("Unsupported board mechanics version");
 const layout=input.layout??null;
 if(layout!==null&&!Object.hasOwn(PRESETS,layout))throw Error("Unknown board layout: "+layout);
 const base=layout?fromRows(PRESETS[layout]):[];
 const additional=checkedIndices(input.blocked,"blocked");
 const blocked=[...new Set([...base,...additional])].sort((a,b)=>a-b);
 const mist=checkedIndices(input.mist,"mist");
 const daruma=checkedIndices(input.daruma,"daruma");
 const sealedStone=checkedIndices(input.sealedStone,"sealedStone");
 if(blocked.length>16)throw Error("Too many closed tiles for a fair 7x7 puzzle");
 const closed=new Set(blocked),dolls=new Set(daruma),stones=new Set(sealedStone);
 for(const at of [...mist,...daruma,...sealedStone])
  if(closed.has(at))throw Error("Cannot place mechanics on a closed tile "+at);
 for(const at of dolls)if(stones.has(at))throw Error("Daruma and Sealed Stone overlap at "+at);
 return {version:VERSION,layout,blocked,mist,daruma,sealedStone};
}
function terrainPiece(at){
 if(!Number.isInteger(at)||at<0||at>=CELLS)throw Error("Invalid terrain position");
 return {family:"terrain",stage:0,id:-(1000+at)};
}
const api=Object.freeze({VERSION,SIZE,CELLS,PRESETS,fromRows,normalize,terrainPiece});
root.HarmonyBoardMechanics=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
