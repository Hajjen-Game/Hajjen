/* Japanese Harmony · Moon Mirrors 1.0 · playable, opt-in preview.
 * Fixed-cell mirror overlays, never moving treasures or changing refill odds.
 * The first reflection is one hop; reflected cells can start a normal
 * Harmony Pulse wave ONLY if upgrading them produces a genuine stage 5.
 */
(function(root){
"use strict";
const P=root.HarmonyIdentityPrototypes||(typeof require==="function"?require("./identity-prototypes.js"):null);
if(!P)throw Error("Identity prototype planner required");
const VERSION=1;
const SCENARIOS=Object.freeze({
 first:Object.freeze({name:"First Reflection",subtitle:"One Moon Mirror",moves:18,goal:{type:"masterpiece",count:1},
  mirrors:[{at:25,direction:"right"}],mist:[],
  intro:"Fuse the developed treasure into the center. The mirror to its right extends Harmony Pulse one more tile."}),
 mist:Object.freeze({name:"Moonlit Mist",subtitle:"Reflected light clears distant Mist",moves:22,goal:{type:"mist",count:2},
  mirrors:[{at:25,direction:"right"},{at:23,direction:"left"}],mist:[22,26],
  intro:"Use reflected Harmony Pulse to cleanse distant Mist. Mirrors are fixed to board cells, not the objects above them."}),
 chain:Object.freeze({name:"Reflected Harmony",subtitle:"Grow a second masterpiece with reflected light",moves:24,goal:{type:"pulseHits",count:7},
  mirrors:[{at:25,direction:"right"},{at:33,direction:"down"}],mist:[40],
  intro:"Reflect Harmony Pulse into a stage-4 treasure to create another masterpiece. Chain effects are earned, not automatic."})
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
 // The swap 23 -> 24 forms a vertical three-match at 24. The stage-4
 // source upgrades to stage 5; Moon Mirrors are immediately testable.
 for(const at of [17,31]){board[at].family=primary;board[at].stage=1;}
 board[23].family=primary;board[23].stage=4;
 board[24].family=other;board[24].stage=1;
 if(key==="chain"){
  // This real stage-4 treasure only upgrades when the reflected beam lands.
  board[26].family=other;board[26].stage=4;
 }
 return board;
}
const api=Object.freeze({VERSION,SCENARIOS,descriptor,normalize,opening,plan:P.planMirrorPulse});
root.HarmonyMoonMirrors=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
