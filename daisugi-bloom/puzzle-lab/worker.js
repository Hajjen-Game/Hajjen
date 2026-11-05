/* Puzzle Architect developer-only Difficulty Lab worker.
 * Nothing here touches the real game UI, localStorage or player progress.
 */
"use strict";
importScripts(
 "../harmony/board-mechanics.js",
 "../harmony/bamboo-paths.js",
 "../harmony/hanabi-crate.js",
 "../harmony/lotus-stream.js",
 "../harmony/lotus-routing.js",
 "../harmony/identity-prototypes.js",
 "../harmony/moon-mirrors.js",
 "../harmony/wind-garden.js",
 "../harmony/level-architecture.js",
 "../harmony/journey-levels-v2.js",
 "../harmony/omamori-afterglow.js",
 "../harmony/player-insight.js",
 "../harmony/player-intent.js",
 "../harmony/director-v6.js",
 "../harmony/director-v61.js",
 "../harmony/director-v62.js",
  "../harmony/director-v63.js",
 "../harmony/rules.js",
 "../harmony/puzzle-architect.js",
 "../harmony/difficulty-lab.js"
);
self.onmessage=event=>{
 const {blueprint,options}=event.data||{};
 try{
  const result=HarmonyDifficultyLab.analyze(HarmonyRules,HarmonyPuzzleArchitect,
   blueprint,options||{});
  self.postMessage({ok:true,result});
 }catch(error){
  self.postMessage({ok:false,error:String(error?.message||error)});
 }
};
