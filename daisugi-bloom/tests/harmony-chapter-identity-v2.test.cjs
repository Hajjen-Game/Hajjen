"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js"),G=require("../harmony/goshuincho.js"),O=require("../harmony/onboarding.js");
const missions=[
 ["familyFusion",5],["stage3",10],["familyMasterpiece",1],["fourTurns",4],
 ["familyFusion",7],["pulseHits",12],["masterpiece",4],["familyFusion",9],
 ["pulseHits",15],["familyMasterpiece",2]
];
const uniqueNames=new Set();
for(let offset=0;offset<10;offset++){
 const i=40+offset,cfg=R.levelConfig(i);
 assert.equal(cfg.chapterIdentityVersion,2);
 assert.equal(cfg.goal.type,missions[offset][0],"L"+(i+1)+" goal type");
 assert.equal(cfg.goal.count,missions[offset][1],"L"+(i+1)+" goal count");
 if(["familyFusion","familyMasterpiece"].includes(cfg.goal.type))
  assert.equal(cfg.goal.family,"lantern","Must be a real Lantern-specific objective");
 assert(cfg.moves>=30,"Realistic move budget");
 assert(cfg.par>0&&cfg.par<cfg.moves);
 assert(cfg.intro.includes("Lantern")||cfg.intro.includes("Harmony Pulse")||
  cfg.intro.includes("four-tile")||cfg.intro.includes("masterpiece"));
 assert(R.activeFamilies(i).includes("lantern"),"Lantern tiles available on every new Chapter 5 board");
 assert.equal(R.activeFamilies(i).length,5);
 uniqueNames.add(cfg.name);
 const g=new R.Game(i,null,{seed:20261029+i,directorMode:"v4"});
 assert.equal(g.chapterIdentityVersion,2);
 assert.equal(g.save().chapterIdentityVersion,2);
 assert.equal(g.config.goal.type,cfg.goal.type);
 assert.equal(g.board.length,49);
 assert.equal(g.familyCount,5);
 assert(R.validSwaps(g.board).length>=3);
 assert.equal(g.progress(),0);
 assert.equal(g.goalText().includes("Lantern"),["familyFusion","familyMasterpiece"].includes(cfg.goal.type));
 const restored=new R.Game(i,g.save(),{fastRestore:true});
 assert.equal(restored.config.name,g.config.name);
 assert.deepEqual(restored.board,g.board);
 assert.equal(restored.moves,g.moves);
 assert.equal(restored.chapterIdentityVersion,2);
}
assert.equal(uniqueNames.size,10,"Each authored Lantern level needs a distinctive name");
const fusion=new R.Game(40,null,{seed:61042,directorMode:"v4"});
// Make a reproducible legal Lantern swap without changing normal match rules.
fusion.board[0]={id:2000,family:"lantern",stage:1};
fusion.board[1]={id:2001,family:"lantern",stage:1};
fusion.board[2]={id:2002,family:"koi",stage:1};
fusion.board[9]={id:2003,family:"lantern",stage:2};
const action=fusion.swap(2,9);
assert(action.ok,"Lantern swaps are ordinary legal matches");
assert(fusion.familyFusions.lantern>=1,"Lantern-only match increments the new objective");
assert.equal(fusion.progress(),fusion.familyFusions.lantern);
const replay=new R.Game(40,fusion.save(),{fastRestore:true});
assert.equal(replay.progress(),fusion.progress(),"Lantern fusion progress persists");

for(const i of [40,42,47,49]){
 const historic=new R.Game(i,null,{seed:1200+i,directorMode:"v4"});
 const snapshot=historic.save();
 delete snapshot.chapterIdentityVersion;
 delete snapshot.familyFusions;
 // Snapshot from previous deployments: old general-purpose objective and
 // board remain unchanged on resume, including the user's remaining moves.
 snapshot.moves-=5;snapshot.score=2780;snapshot.objectiveVersion=2;
 if(R.endlessConfig(i,true,true,false).goal.type==="mist"){
  snapshot.mist=Array.from({length:49},(_,k)=>+R.mistLayout(i,
   R.endlessConfig(i,true,true,false).goal.count).includes(k));
 }
 const oldGoal=R.endlessConfig(i,true,true,false).goal;
 const oldMoves=R.endlessConfig(i,true,true,false).moves;
 const restored=new R.Game(i,snapshot,{fastRestore:true});
 assert.deepEqual(restored.config.goal,oldGoal,"Legacy active goal may not change");
 assert.equal(restored.config.moves,oldMoves);
 assert.equal(restored.moves,snapshot.moves);
 assert.equal(restored.score,snapshot.score);
 assert.equal(restored.chapterIdentityVersion,0);
 // The synthetic old snapshot above was built from a new Lantern family
 // recipe. The restore may remap that artificial obsolete family; real older
 // saved boards already use the original pool and do not need remapping.
 assert.deepEqual(restored.board.map(p=>p?.id),snapshot.board.map(p=>p?.id));
 assert.deepEqual(restored.board.map(p=>p?.stage),snapshot.board.map(p=>p?.stage));
 assert.equal(restored.familyFusions.lantern||0,0);
}
assert.deepEqual(R.levelConfig(27).goal,{type:"mist",count:14},"Old Daruma relief mission intact");
assert.equal(R.levelConfig(37).goal.type,"sealedStone","Stone chapter remains intact");
assert.equal(G.chapter(4).title,"Lantern Path");
assert(G.chapter(4).subtitle.includes("Lantern"));
assert.equal(G.chapter(5).title,"Bamboo Paths");
assert(G.chapter(5).subtitle.includes("Temple Gate"));
assert.equal(G.chapter(6).title,"Endless Garden · 1");
assert.equal(R.levelConfig(50).name,"First Bamboo");
assert(R.levelConfig(60).name.startsWith("Endless · "));
assert(R.activeFamilies(50).length===5);
assert.equal(O.lesson(40).key,"lantern");
assert.equal(O.lesson(49).key,"lantern-finale");
assert.equal(O.preview(47,R.levelConfig(47)).objective,"9 Lantern fusions");
assert.equal(O.preview(49,R.levelConfig(49)).objective,"2 Lantern masterpieces");

const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
assert(app.includes('level===49?"Enter Bamboo Paths →"'));
assert(app.includes("washi-book-subtitle"));
assert(app.includes("info.name:\"Level \""),"Book play button must reference its selected preview");
assert(html.includes("chapter-identity.css"),"Book chapter focus styles are linked");
console.log("PASS Chapter Identity 2.0: ten Lantern levels, mission tracking, saved-run compatibility, Bamboo handoff");
