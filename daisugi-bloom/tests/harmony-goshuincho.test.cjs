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
 assert.equal(latest.title,"Daruma's Wish");
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
check("Asset Fidelity 2.0: original square chapter PNGs and star seals",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const names=["sakura","mist","daruma"];
 const verify=(src,width)=>{
  assert.equal(typeof src,"string","Independent PNG required, not an atlas");
  assert(src.includes(".png?v=6.36.0"));
  const data=fs.readFileSync(path.resolve(__dirname,"..",src.split("?")[0]));
  assert(data.length>100000,"Tiny atlas cells are not acceptable");
  assert.equal(data.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.equal(data.readUInt32BE(16),width);
  assert.equal(data.readUInt32BE(20),width);
 };
 for(let c=0;c<3;c++){
  const icon=G.artUrl("chapters",c);
  assert(icon.includes("chapter-icon-"+names[c]+".png"));
  verify(icon,724);
  assert(G.artUrl("cards",c).includes("level-card-"+names[c]+".webp"),
   "Full-size level cards must remain unchanged");
 }
 for(let n=1;n<=3;n++){
  const grade=G.artUrl("grades",n);
  assert(grade.includes("star-seal-"+n+".png"));
  verify(grade,512);
 }
 assert.equal(G.artUrl("chapters",3),null);
 assert.equal(G.artUrl("covers",0),null);
 G.ART.levelStamps[12]="./assets/goshuincho/level-13.webp";
 assert.equal(G.artUrl("stamps",12),"./assets/goshuincho/level-13.webp");
 delete G.ART.levelStamps[12];
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
check("Pagination Rework 1.0 splits ten-stamp chapters into 4+4+2",()=>{
 assert.equal(G.CHAPTER_SIZE,10,"Chapter progression never changes");
 assert.equal(G.PAGE_SIZE,4);
 assert.equal(G.PAGES_PER_CHAPTER,3);
 const state={unlocked:26,bestStars:{20:1,21:2,22:3,24:1,27:2,29:3},
  fourFamilyStars:{},bestScores:{},fourFamilyScores:{}};
 const pages=[0,1,2].map(p=>G.pageSnapshot(state,2,p));
 assert.deepEqual(pages.map(p=>p.visible.map(s=>s.number)),
  [[21,22,23,24],[25,26,27,28],[29,30]]);
 assert.deepEqual(pages.map(p=>p.visible.length),[4,4,2]);
 assert.deepEqual(pages.map(p=>p.isFinalPage),[false,false,true]);
 assert.deepEqual(pages.map(p=>p.earned),[6,6,6]);
 assert.deepEqual(pages.map(p=>p.visibleEarned),[3,2,1]);
 assert.deepEqual(pages.map(p=>p.pageFirst),[21,25,29]);
 assert.deepEqual(pages.map(p=>p.pageLast),[24,28,30]);
 assert.equal(pages[0].stamps.length,10,"All chapter medals stay in the archive");
 assert.equal(G.summary(state).earned,6,"No stamps minted or lost by presentation");
});
check("Opening current chapter on correct 4-stamp page and navigating chapter boundaries",()=>{
 assert.equal(G.pageForLevel(0),0);
 assert.equal(G.pageForLevel(3),0);
 assert.equal(G.pageForLevel(4),1);
 assert.equal(G.pageForLevel(7),1);
 assert.equal(G.pageForLevel(8),2);
 assert.equal(G.pageForLevel(9),2);
 assert.equal(G.pageForLevel(10),0);
 assert.equal(G.pageForLevel(24),1);
 assert.equal(G.pageForLevel(26),1);
 assert.equal(G.pageForLevel(28),2);
 assert.equal(G.pageForLevel(29),2);
 assert.equal(G.pageForLevel(30),0);
 const state={unlocked:25,bestStars:{},fourFamilyStars:{}};
 assert(G.pageSnapshot(state,2,G.pageForLevel(state.unlocked)).visible.some(s=>s.isCurrent));
});
check("Chapter seal progress is counted on the full chapter only",()=>{
 const s={unlocked:20,fourFamilyStars:Object.fromEntries(Array.from({length:9},(_,i)=>[i,1])),
  bestStars:{},fourFamilyScores:{},bestScores:{}};
 for(let p=0;p<3;p++){
  const state=G.pageSnapshot(s,0,p);
  assert.equal(state.earned,9);
  assert.equal(state.completed,false);
 }
 s.fourFamilyStars[9]=2;
 const end=G.pageSnapshot(s,0,2);
 assert.equal(end.earned,10);
 assert.equal(end.completed,true);
 assert.equal(end.visible.length,2);
 assert.equal(G.summary(s).completedChapters,1);
});

check("Artwork Fidelity 1.0 keeps square atlas pixels inside non-square plaques",()=>{
 const fs=require("node:fs");
 const path=require("node:path");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/mobile-game.css"),"utf8");
 const section=css.slice(css.lastIndexOf("/* Goshuincho Artwork Fidelity 1.0"));
 assert(section.length>500,"A dedicated fidelity override must exist");
 assert.match(section, /aspect-ratio:1\s*\/\s*1/, "Atlas cells must stay square");
 assert.match(section, /goshuin-grade \.goshuin-atlas-art/, "Non-square rating plaque needs its own square artwork");
 assert.match(section, /height:calc\(100% - 10px\)/, "Grade should be constrained by available plaque height");
 assert.match(section, /object-fit:contain/, "Independent hi-res PNG/WebP originals must preserve aspect ratio");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert.match(html, /harmony\/mobile-game\.css\?v=[0-9][\w.-]*/, "Latest Goshuincho paper CSS must refresh on mobile");
});



check("Washi Zen UI 1.0: ten level cards per chapter and accurate Japanese labels",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/washi-zen.css"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const state={unlocked:24,bestStars:{20:2,22:3},fourFamilyStars:{},bestScores:{},fourFamilyScores:{}};
 const all=G.chapterSnapshot(state,2);
 assert.equal(all.stamps.length,10);
 assert.equal(all.stamps[0].number,21);
 assert.equal(all.stamps.at(-1).number,30);
 assert.equal(all.stamps.find(x=>x.number===25).isCurrent,true);
 assert.equal(all.stamps.find(x=>x.number===26).locked,true);
 assert(app.includes("G.chapterSnapshot(save,goshuinChapter)"));
 assert(app.includes("for(const stamp of info.stamps)"));
 assert(app.includes('goshuinNode("button","washi-level-tile"'));
 assert(app.includes("G.japaneseNumeral(stamp.number)"));
 assert(app.includes('goshuinArtwork(seal,"grades",stamp.stars)'),
  "Approved 1–3 star seals must remain attached to genuine achievements");
 assert(!app.includes('goshuinArtwork(tile,"cards",info.index)'));
 assert(app.includes('latest.playable)startLevel(stamp.level,latest.resumable)'),
  "A locked stage must never launch and resume must be preserved");
 assert(css.includes("grid-template-columns:repeat(5,minmax(0,1fr))"));
 assert(css.includes("grid-template-rows:repeat(2,minmax(0,1fr))"));
 assert(css.includes("Washi Zen Polish 1.1"));
 assert(app.includes('goshuinNode("span","washi-book-flourish"'));
 assert(app.includes('numeralText.length>=3?'));
 assert(html.includes("washi13"),"Updated app JS must bypass mobile cache");
 assert(app.includes("function activateWashiPlay(button,launch)"),"Play actions must remain visible during transition");
 assert(app.includes("activateWashiPlay(play,()=>"),"Book play button must press");
 assert(app.includes('activateWashiPlay($("continueButton"),()=>'),"Home play button must press");
 assert(css.includes("Washi Zen 1.3"),"Artwork-aligned selected card frame must be loaded");
 assert(css.includes("Washi Zen UI 1.4"),"Transparent detail card and no-halo highlight must remain active");
 assert(css.includes("level-card.webp")&&css.includes("detail-card.webp"));
 assert(css.includes("book-background.webp")&&css.includes("arrow-left.webp"));
 assert(html.includes('washi-zen.css?v=1.4.0'));
 for(const [n,k] of [[1,"一"],[10,"十"],[11,"十一"],[24,"二十四"],[40,"四十"],[123,"百二十三"]])
  assert.equal(G.japaneseNumeral(n),k);
});
check("Washi Zen startsida: preserve controls and no legacy level selector",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 for(const id of ["continueButton","goshuinButton","goshuinProgress","omamoriButton","omamoriProgress",
   "omikujiButton","omikujiStatus","harmonyCoins","gameDirectorMode","levelList","levelPager"]){
  assert(html.includes('id="'+id+'"'),"Retain control "+id);
 }
 assert(html.includes('class="menu-view washi-home"'));
 assert(html.includes('class="washi-home-logo"'));
 assert(html.includes('id="levelList"')&&html.includes('hidden inert aria-hidden="true"'));
 assert(app.includes("function showLevelSelection()"));
 assert(app.includes('showMenu();\n showGoshuincho();'));
 assert(app.includes('saveRun();'),"Leaving gameplay must retain save");
 assert(app.includes('rewardStarsAtLevelStart=G.archivedStars(save,i)'));
});
console.log("Goshuincho ten-level Washi Zen 1.0 + archived stamp invariants passed.");
