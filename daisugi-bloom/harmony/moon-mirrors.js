/* Japanese Harmony · Moon Mirrors 1.0 · playable, opt-in preview.
 * Mirror cells are actual fixed, unmatchable mirror pieces, not family overlays.
 * The first reflection is one hop; reflected cells can start a normal
 * Harmony Pulse wave ONLY if upgrading them produces a genuine stage 5.
 */
(function(root){
"use strict";
const P=root.HarmonyIdentityPrototypes||(typeof require==="function"?require("./identity-prototypes.js"):null);
if(!P)throw Error("Identity prototype planner required");
const VERSION=2; // Saved fixture schema remains compatible; new Fusion Resonance needs no migration.
const SCENARIOS=Object.freeze({
 first:Object.freeze({name:"First Reflection",subtitle:"One Moon Mirror",moves:18,goal:{type:"masterpiece",count:1},
  mirrors:[{at:25,direction:"right"}],mist:[],
  intro:"Fuse the developed treasure from above into the center. The mirror to its right reflects Harmony Pulse one tile farther."}),
 mist:Object.freeze({name:"Moonlit Mist",subtitle:"Reflected light clears distant Mist",moves:22,goal:{type:"mist",count:2},
  mirrors:[{at:25,direction:"right"},{at:31,direction:"down"}],mist:[26,38],
  intro:"Reflect Harmony Pulse toward distant Mist. The mirror is its own fixed cell, never a treasure underneath."}),
 chain:Object.freeze({name:"Reflected Harmony",subtitle:"Grow a second masterpiece with reflected light",moves:24,goal:{type:"pulseHits",count:5},
  mirrors:[{at:25,direction:"right"},{at:33,direction:"down"}],mist:[40],
  intro:"Fuse the developed treasure into the center. Two neighboring masterpieces then send a shared Harmony Pulse wave."}),
 echo:Object.freeze({name:"Mirror Echo",subtitle:"Fusion activates a Moon Mirror",moves:13,
  goal:{type:"stage4",count:1},mirrors:[{at:25,direction:"right"}],mist:[],
  fusionStage:2,remoteStage:3,
  intro:"Make an ordinary fusion into the center. Its neighboring mirror upgrades a distant stage-3 treasure to stage 4 — no Masterpiece required."}),
 obstacle:Object.freeze({name:"Echo Across Stone",subtitle:"A fusion reaches obstacles",moves:16,
  goal:{type:"mist",count:1},mirrors:[{at:25,direction:"right"},{at:31,direction:"down"}],
  mist:[38],sealedStone:[26],fusionStage:2,
  intro:"A normal fusion beside two mirrors strikes a Sealed Stone and clears Mist. No stage-five Pulse is needed."}),
 spark:Object.freeze({name:"Moonlit Chain",subtitle:"Fusion Echo creates a Masterpiece",moves:16,
  goal:{type:"mist",count:1},mirrors:[{at:25,direction:"right"},{at:33,direction:"down"}],
  mist:[40],fusionStage:2,remoteStage:4,
  intro:"Your ordinary fusion reaches the first mirror, upgrades a distant stage-4 treasure into a Masterpiece, then its genuine Harmony Pulse reaches Mist through a second mirror."})
});
function descriptor(key){
 if(!Object.hasOwn(SCENARIOS,key))throw Error("Unknown Moon Mirrors preview");
 const s=SCENARIOS[key];
 return {version:VERSION,key,name:s.name,subtitle:s.subtitle,moves:s.moves,
  goal:{...s.goal},mirrors:s.mirrors.map(x=>({...x})),mist:s.mist.slice(),
  sealedStone:(s.sealedStone||[]).slice(),intro:s.intro};
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
 board[17].family=primary;board[17].stage=SCENARIOS[key].fusionStage||4;
 board[24].family=other;board[24].stage=1;
 if(key==="chain"||key==="echo"||key==="spark"){
  // This remote developed treasure changes only if a directed reflection
  // reaches it. Its existing stage is visible and earns no free growth.
  board[26].family=other;board[26].stage=SCENARIOS[key].remoteStage||4;
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
// Fusion Destination Control: ONLY the survivor/output cell is a trigger.
 // Each mirror may fire at most once per entire player decision, and each
 // remote destination may be resolved once. No recursive Mirror -> Mirror
 // traversal, no off-board effect, no reflected hit onto the fusion itself.
function planFusionResonance(records,mirrors,options={}){
 const installed=normalize(mirrors,options.blocked||[]);
 const occupied=new Set(options.used||[]),targeted=new Set(options.targeted||[]);
 const blocked=new Set(options.blocked||[]),echoes=[];
 for(const record of records){
  const source=typeof record==="number"?record:record?.at;
  if(!Number.isInteger(source)||source<0||source>=49)throw Error("Invalid fusion destination");
  for(const mirror of installed){
   if(occupied.has(mirror.at)||!P.adjacent(source).includes(mirror.at))continue;
   const to=P.step(mirror.at,mirror.direction);
   if(to===null||to===source||blocked.has(to)||targeted.has(to))continue;
   occupied.add(mirror.at);targeted.add(to);
   echoes.push({from:source,mirrorAt:mirror.at,to,direction:mirror.direction});
  }
 }
 return echoes;
}
const api=Object.freeze({VERSION,SCENARIOS,descriptor,normalize,opening,install,piece,
 plan:P.planMirrorPulse,planFusionResonance});
root.HarmonyMoonMirrors=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
