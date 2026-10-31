/* Japanese Harmony · Moon Mirrors 1.0 · playable, opt-in preview.
 * Mirror cells are actual fixed, unmatchable mirror pieces, not family overlays.
 * The first reflection is one hop; reflected cells can start a normal
 * Harmony Pulse wave ONLY if upgrading them produces a genuine stage 5.
 */
(function(root){
"use strict";
const P=root.HarmonyIdentityPrototypes||(typeof require==="function"?require("./identity-prototypes.js"):null);
if(!P)throw Error("Identity prototype planner required");
const VERSION=2;
const SCENARIOS=Object.freeze({
 first:Object.freeze({name:"First Reflection",subtitle:"One Moon Mirror",moves:18,goal:{type:"masterpiece",count:1},
  mirrors:[{at:25,direction:"right"}],mist:[],
  intro:"Fuse the developed treasure from above into the center. The mirror to its right reflects Harmony Pulse one tile farther."}),
 mist:Object.freeze({name:"Moonlit Mist",subtitle:"Reflected light clears distant Mist",moves:22,goal:{type:"mist",count:2},
  mirrors:[{at:25,direction:"right"},{at:31,direction:"down"}],mist:[26,38],
  intro:"Reflect Harmony Pulse toward distant Mist. The mirror is its own fixed cell, never a treasure underneath."}),
 chain:Object.freeze({name:"Reflected Harmony",subtitle:"Grow a second masterpiece with reflected light",moves:24,goal:{type:"pulseHits",count:6},
  mirrors:[{at:25,direction:"right"},{at:33,direction:"down"}],mist:[40],
  intro:"Fuse the developed treasure into the center from above. Reflect Harmony Pulse into another stage-4 treasure to trigger a second wave."})
});
function descriptor(key){
 if(!Object.hasOwn(SCENARIOS,key))throw Error("Unknown Moon Mirrors preview");
 const s=SCENARIOS[key];
 return {version:VERSION,key,name:s.name,subtitle:s.subtitle,moves:s.moves,
  goal:{...s.goal},mirrors:s.mirrors.map(x=>({...x})),mist:s.mist.slice(),intro:s.intro};
}
function normalize(raw,blocked=[]){
 if(raw==null)return [];
 if(!Array.isArray(raw)||raw.length>8)throw Error("Invalid Mirror descriptor");
 return [...P.normalizeMirrors(raw,blocked)].map(([at,direction])=>({at,direction}));
}
function opening(board,families,key){
 if(!Array.isArray(board)||board.length!==49||!families?.length)throw Error("Invalid Moon Mirror board");
 if(!Object.hasOwn(SCENARIOS,key))throw Error("Invalid preview");
 const primary=families[0],other=families[1];
 // A real 17 -> 24 swap completes the horizontal row 22,23,24.
 // Neither of the mirrors occupies a match piece or hides a treasure.
 for(const at of [22,23]){board[at].family=primary;board[at].stage=1;}
 board[17].family=primary;board[17].stage=4;
 board[24].family=other;board[24].stage=1;
 if(key==="chain"){
  // This real stage-4 treasure only upgrades when the reflected beam lands.
  board[26].family=other;board[26].stage=4;
 }
 return board;
}
// Mirrors take up a full cell exactly like a fixed board fixture. They cannot
// match, fall, be swapped, grow or be replaced by refills. No family sprite
// exists underneath their artwork. Direction belongs to its stable cell.
function piece(at){return {family:"moonMirror",stage:0,id:-(3000+at)};}
function install(board,mirrors){
 if(!Array.isArray(board)||board.length!==49)throw Error("Invalid Mirror board");
 for(const {at} of normalize(mirrors)){
  const existing=board[at];
  if(existing?.family==="terrain"||existing?.family==="daruma"||
   existing?.family==="sealedStone"||existing?.family==="lotusSeed")
   throw Error("Mirror overlaps an existing fixed fixture");
  board[at]=piece(at);
 }
 return board;
}
const api=Object.freeze({VERSION,SCENARIOS,descriptor,normalize,opening,install,piece,plan:P.planMirrorPulse});
root.HarmonyMoonMirrors=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
