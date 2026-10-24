"use strict";
const assert=require("node:assert/strict");
const G=require("../harmony/goshuincho.js");
const check=(title,fn)=>{fn();console.log("PASS "+title);};
const snapshot=(s)=>JSON.parse(JSON.stringify(s));
check("An untouched player sees an empty first chapter, never fake rewards",()=>{
 const fresh={unlocked:0,fourFamilyStars:{},bestStars:{},fourFamilyScores:{},bestScores:{}};
 const first=G.chapterSnapshot(fresh,0),summary=G.summary(fresh);
 assert.equal(G.CHAPTER_SIZE,10);
 assert.equal(first.first,0);assert.equal(first.last,9);
 assert.equal(first.earned,0);assert.equal(first.stars,0);assert(!first.completed);
 assert(first.stamps.every(x=>!x.earned&&x.stars===0));
 assert.equal(first.stamps[0].artKey,"level-001");
 assert.deepEqual(summary,{earned:0,stars:0,completedChapters:0,visibleChapters:1,currentChapter:0});
});
check("Stamps reflect correct real 4-family/5-family archived stars",()=>{
 const s={unlocked:20,fourFamilyStars:{0:3,1:2,9:1},
  bestStars:{0:1,10:2,19:3,20:3},fourFamilyScores:{},bestScores:{}};
 assert.equal(G.archivedStars(s,0),3,"Introduction uses four-family archive");
 assert.equal(G.archivedStars(s,10),2,"Journey uses regular archive");
 assert.equal(G.archivedStars(s,9),1);
 assert.equal(G.archivedStars(s,20),3);
 const intro=G.chapterSnapshot(s,0),journey=G.chapterSnapshot(s,1);
 assert.equal(intro.earned,3);assert.equal(intro.stars,6);
 assert.equal(journey.earned,2);assert.equal(journey.stars,5);
 const latest=G.chapterSnapshot(s,2);
 assert.equal(latest.title,"Darumas önskan");
 assert.equal(latest.stamps[0].stars,3);
 assert.equal(G.summary(s).earned,6);
});
check("Historical genuine records/finished runs count as one stamp without minting stars",()=>{
 const s={unlocked:30,bestStars:{},fourFamilyStars:{},bestScores:{10:1500},fourFamilyScores:{0:1000},
  run:{level:22,data:{complete:true,starsAtGoal:2}}};
 assert.equal(G.archivedStars(s,0),1);
 assert.equal(G.archivedStars(s,10),1);
 assert.equal(G.archivedStars(s,22),2);
 assert.equal(G.archivedStars(s,12),0);
 assert.equal(G.archivedStars(s,25),0);
 assert.equal(G.archivedStars({unlocked:99},98),0,"Unlock alone is not an achievement");
});
check("Chapter sigil only appears after all ten achievements, stars can improve",()=>{
 const s={unlocked:10,bestStars:{},fourFamilyStars:{},fourFamilyScores:{},bestScores:{}};
 for(let i=0;i<9;i++)s.fourFamilyStars[i]=1;
 assert.equal(G.chapterSnapshot(s,0).earned,9);
 assert.equal(G.chapterSnapshot(s,0).completed,false);
 s.fourFamilyStars[9]=1;
 assert.equal(G.chapterSnapshot(s,0).completed,true);
 assert.equal(G.summary(s).completedChapters,1);
 s.fourFamilyStars[1]=3;
 assert.equal(G.chapterSnapshot(s,0).stars,12);
 assert.equal(G.chapterSnapshot(s,0).earned,10);
});
check("Collectible art URLs are optional external mappings, not baked art or broken requests",()=>{
 assert.equal(G.artUrl("chapters",0),null);
 assert.equal(G.artUrl("stamps",10),null);
 assert.equal(G.artUrl("grades",3),null);
 G.ART.grades[3]="./assets/goshuincho/three-star-seal.webp";
 assert.equal(G.artUrl("grades",3),"./assets/goshuincho/three-star-seal.webp");
 delete G.ART.grades[3];
});
check("The entire collection is pure/read-only and scales beyond the first 50 stages",()=>{
 const state={unlocked:213,bestStars:{10:1,19:2,200:3},fourFamilyStars:{1:3},bestScores:{},fourFamilyScores:{}};
 const before=snapshot(state);
 const sum=G.summary(state);
 assert.equal(sum.currentChapter,21);
 assert.equal(G.chapterSnapshot(state,21).number,22);
 assert.equal(G.chapterSnapshot(state,20).stamps[0].number,201);
 assert.equal(G.chapterSnapshot(state,20).stamps[0].stars,3);
 assert.equal(sum.earned,4);
 assert.deepEqual(state,before);
});
check("Invalid archive star values are safely clamped",()=>{
 const state={unlocked:10,fourFamilyStars:{0:9,1:-1,2:"2",3:"oops"},bestStars:{}};
 assert.equal(G.archivedStars(state,0),3);
 assert.equal(G.archivedStars(state,1),0);
 assert.equal(G.archivedStars(state,2),2);
 assert.equal(G.archivedStars(state,3),0);
});
check("Level Select 2.0 distinguishes current, past, locked and no-star playable cells",()=>{
 const state={unlocked:24,bestStars:{20:2,22:3},fourFamilyStars:{0:1},
  bestScores:{20:6000},fourFamilyScores:{}};
 const old=G.levelStatus(state,20);
 assert.deepEqual(old,{playable:true,earned:true,stars:2,isCurrent:false,resumable:false,locked:false});
 const current=G.levelStatus(state,24);
 assert.equal(current.playable,true);assert.equal(current.isCurrent,true);
 assert.equal(current.earned,false);assert.equal(current.resumable,false);
 const locked=G.levelStatus(state,25);
 assert.equal(locked.playable,false);assert.equal(locked.locked,true);
 assert.equal(locked.earned,false);
 const page=G.chapterSnapshot(state,2);
 assert.equal(page.stamps.find(x=>x.level===24).isCurrent,true);
 assert.equal(page.stamps.find(x=>x.level===25).locked,true);
 assert.equal(page.stamps.find(x=>x.level===20).earned,true);
});
check("An in-progress run enables resume only for its own available level",()=>{
 const state={unlocked:24,bestStars:{},fourFamilyStars:{},
  run:{level:24,data:{moves:11,failed:false,score:4000}}};
 assert.equal(G.levelStatus(state,24).resumable,true);
 assert.equal(G.levelStatus(state,23).resumable,false);
 state.run.data.failed=true;
 assert.equal(G.levelStatus(state,24).resumable,false);
 state.run.data.failed=false;state.run.data.moves=0;
 assert.equal(G.levelStatus(state,24).resumable,false);
 state.run.level=30;state.run.data.moves=10;
 assert.equal(G.levelStatus(state,30).resumable,false,"Locked future cannot resume");
});
console.log("Goshuincho Collection 2.0 tests passed.");
