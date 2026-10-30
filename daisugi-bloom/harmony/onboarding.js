/* Japanese Harmony · Gameplay Clarity & Onboarding 2.0
 * Pure instructional projections: only established rules and authored goals.
 * No gameplay, rewards, RNG, moves, or saved records are changed here.
 */
(function(root){
"use strict";
const LESSONS=Object.freeze({
 0:Object.freeze({key:"match",jp:"合わせる",title:"Match three",short:"Swap two neighboring treasures to make a match of three or more.",detail:"Match at least three objects of the same family in a line. Their stages do not need to match. Only successful swaps use a move."}),
 1:Object.freeze({key:"stages",jp:"成長",title:"Grow your treasures",short:"Matching a family upgrades its strongest object by one stage.",detail:"A fusion creates an object one stage higher than the highest matched object. Choose where your swap lands: that position controls the first fusion's destination."}),
 2:Object.freeze({key:"pulse",jp:"調和",title:"Create a masterpiece",short:"Reach stage 5 to release Harmony Pulse toward four neighbors.",detail:"A stage-5 masterpiece releases Harmony Pulse to its four orthogonal neighbors. The pulse upgrades eligible objects and can clear Mist or damage blockers."}),
 3:Object.freeze({key:"mist",jp:"霧",title:"Clear the Mist",short:"Fuse onto a misty tile or reach it with Harmony Pulse.",detail:"Mist stays on its board tile, but treasures can move through it. Only a fusion landing on that tile or Harmony Pulse reaching it clears the Mist—even when the tile becomes empty."}),
 5:Object.freeze({key:"four",jp:"四",title:"Four of a kind",short:"Make a match of four on separate moves to complete the goal.",detail:"A four-tile match can upgrade a neighboring treasure when one is eligible. For this objective, make a match of four on four different moves. Cascades in one move count only once."}),
 10:Object.freeze({key:"families",jp:"仲間",title:"A new family joins",short:"There are now five families on the board.",detail:"Look for matches within the same family—even when pieces have different stages. The new family gives you more combinations to consider."}),
 20:Object.freeze({key:"daruma",jp:"達磨",title:"Daruma wishes",short:"Hit each Daruma twice, on separate moves.",detail:"Daruma dolls are fixed in place. Fuse on a neighboring tile or reach the doll with Harmony Pulse. Each doll needs two hits, no more than one per move."}),
 30:Object.freeze({key:"stone",jp:"封印",title:"Break the Sealed Stones",short:"Each stone needs four hits; the final hit releases Awakening Pulse.",detail:"Sealed Stones cannot move. Fuse next to them or reach them with Harmony Pulse. A stone can take only one hit per move. Breaking one releases Awakening Pulse to all eight neighbors, including diagonals."}),
 40:Object.freeze({key:"lantern",jp:"灯",title:"Lantern Path begins",short:"Match Lanterns across stages. Each Lantern fusion helps light the path.",detail:"The Lantern family appears in every level of Lantern Path. Match at least three Lanterns to earn Lantern fusions. Each successful Lantern match, including cascades, counts once. Other families can still be matched normally."}),
 42:Object.freeze({key:"lantern-masterpiece",jp:"光",title:"Light a masterpiece",short:"Build a Lantern up to stage 5 to create a Lantern masterpiece.",detail:"Only a stage-5 Lantern counts for this goal. Fuse Lanterns at different stages to grow one. Harmony Pulse still upgrades all four orthogonal neighbors."}),
 49:Object.freeze({key:"lantern-finale",jp:"祭",title:"Festival of Lights",short:"Create two Lantern masterpieces to complete the festival.",detail:"The final Lantern Path challenge requires two stage-5 Lantern masterpieces. Each sends Harmony Pulse, helping you develop the next. You can build them across separate moves."}),
 50:Object.freeze({key:"bamboo-intro",jp:"竹",title:"The Bamboo Paths",short:"Stone tiles are closed. Build matches around the stones.",detail:"Closed garden stones are permanent. You cannot move, fuse, shuffle, or upgrade them. Treasures above a closed tile fall only within that open section of their column. All other puzzle rules stay the same."}),
 52:Object.freeze({key:"temple-gate",jp:"門",title:"Temple Gate",short:"The path narrows. Plan your matches through the open passages.",detail:"Temple Gate uses fixed stones to divide parts of the 7×7 board. A row or column of matching treasures must be uninterrupted: stones never count as treasures. Keep working with the open passages."}),
 54:Object.freeze({key:"twin-gardens",jp:"庭",title:"Twin Gardens",short:"Two garden wings meet at one central crossing.",detail:"The closed stones divide upper and lower sections of the center column. Matching, falling and Harmony Pulse still obey their usual rules; use the open center row to plan your next moves."}),
 57:Object.freeze({key:"central-shrine",jp:"社",title:"Central Shrine",short:"The shrine occupies the center. Build Harmony around it.",detail:"The eight closed center tiles are part of the garden, not obstacles you have to break. They never move or take Pulse hits. Plan chains and fusions along the edges of the shrine."}),
 59:Object.freeze({key:"bamboo-finale",jp:"和",title:"Path of Harmony",short:"Clear Mist around the sacred shrine to complete Bamboo Paths.",detail:"Fuse onto each misty tile or reach it with Harmony Pulse. The shrine stays closed and does not need clearing. All three Mist tiles must be removed to complete the chapter."}),
 60:Object.freeze({key:"lotus-intro",jp:"蓮",title:"First Lotus Stream",short:"Match treasures beneath a lotus seed to guide it into the glowing river gate.",detail:"Lotus seeds cannot be swapped, matched, grown or destroyed with Harmony Pulse. They fall vertically when matches make room below them. Collect both seeds at their glowing gates along the bottom row. The seeds stay intact through shuffle and saving."})
});
const clean=n=>Number.isInteger(n)&&n>=0?n:0;
function lesson(level){return LESSONS[clean(level)]||null;}
function objective(config){
 const g=config?.goal||{},count=clean(g.count);
 const labels={
  mist:["Mist tile","Mist tiles"],fusion:["fusion","fusions"],
  stage3:["object to stage 3","objects to stage 3"],
  stage4:["object to stage 4","objects to stage 4"],
  masterpiece:["masterpiece","masterpieces"],pulseHits:["Harmony upgrade","Harmony upgrades"],
  four:["four-tile match","four-tile matches"],
  fourTurns:["move with a four-tile match","moves with a four-tile match"],
  daruma:["Daruma","Daruma"],sealedStone:["Sealed Stone","Sealed Stones"],
  shape:["T/L match","T/L matches"],score:["point","points"],
  chain:["masterpiece in one chain","masterpieces in one chain"],
  familyMasterpiece:["Lantern masterpiece","Lantern masterpieces"],
  familyFusion:["Lantern fusion","Lantern fusions"]
 };
 const name=(labels[g.type]||["objective","objectives"])[count===1?0:1];
 return count+" "+name;
}
function preview(level,config,moveStarTargets){
 const stars=typeof moveStarTargets==="function"?moveStarTargets(config):null;
 return {level:clean(level),name:String(config?.name||"Harmony Journey"),
  objective:objective(config),moves:clean(config?.moves),lesson:lesson(level),
  tip:String(config?.intro||config?.subtitle||"Complete the goal to earn a star."),
  threeStars:stars?.three??null,twoStars:stars?.two??null};
}
const api=Object.freeze({LESSONS,lesson,objective,preview});
root.HarmonyOnboarding=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
