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
 assert.match(html, /mobile-game\.css\?v=6\.49\.0-omamori-powers/, "Latest Goshuincho paper CSS must refresh on mobile");
});


check("Level Card Rework 1.0: three user-approved full-resolution artworks mapped by chapter",()=>{
 const fs=require("node:fs");
 const path=require("node:path");
 const expected=["sakura","mist","daruma"];
 for(let chapter=0;chapter<3;chapter++){
  const src=G.artUrl("cards",chapter);
  assert.equal(typeof src,"string");
  assert(src.includes("level-card-"+expected[chapter]+".webp"));
  const pathOnDisk=path.resolve(__dirname,"..",src.split("?")[0]);
  const data=fs.readFileSync(pathOnDisk);
  assert(data.length>50_000,"The chapter card must be a real high-fidelity file, not a 96px cell");
  assert.equal(data.toString("ascii",0,4),"RIFF");
  assert.equal(data.toString("ascii",8,12),"WEBP");
 }
 assert.equal(G.artUrl("cards",3),null,"Unillustrated chapters must use their paper fallback");
 const app=fs.readFileSync(path.resolve(__dirname,"../harmony/app.js"),"utf8");
 assert(!app.includes('goshuinArtwork(tile,"cards",info.index)'));
 assert(app.includes('goshuinArtwork(crest,"chapters",info.index)'));
 assert(!app.includes('goshuinNode("span","goshuin-stamp-slot")'),
  "Old circle slots may not render off-center again");
 const css=fs.readFileSync(path.resolve(__dirname,"../harmony/mobile-game.css"),"utf8");
 const section=css.slice(css.lastIndexOf("/* Goshuincho Level Card Rework 1.0"));
 assert(section.includes("aspect-ratio:4 / 5"));
 assert(section.includes("object-fit:contain"));
 assert(section.includes(".goshuin-grade"));
});

check("Asset Fidelity 2.0 has independent high-density images with no distortion",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/mobile-game.css"),"utf8");
 const fidelity=css.slice(css.lastIndexOf("/* Goshuincho Asset Fidelity 2.0"));
 assert(fidelity.includes("object-fit:contain"));
 assert(fidelity.includes("aspect-ratio:1 / 1"));
 assert(fidelity.includes(".goshuin-grade > img.goshuin-art"));
 assert(fidelity.includes(".goshuin-cover-slot > img.goshuin-art"));
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 assert(app.includes('goshuinArtwork(crest,"chapters",info.index)'));
 assert(!app.includes('goshuinArtwork(tile,"cards",info.index)'));
 assert(app.includes('goshuinArtwork(grade,"grades",stamp.stars)'));
});

check("Optical Alignment 1.0 aligns actual chapter silhouettes and seal ink, not card geometry",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/mobile-game.css"),"utf8");
 const f=css.slice(css.lastIndexOf("/* Goshuincho Optical Alignment 1.0"));
 assert(f.length>1200,"Separate optical-only layer should be present");
 assert(f.includes('#modal .goshuin-cover-slot[data-art-key="chapter-01"]'));
 assert(f.includes('#modal .goshuin-cover-slot[data-art-key="chapter-02"]'));
 assert(f.includes('#modal .goshuin-cover-slot[data-art-key="chapter-03"]'));
 assert(f.includes('--goshuin-optical-x:-2%'));
 assert(f.includes('--goshuin-optical-x:0%'));
 assert(f.includes('--goshuin-optical-x:1.85%'));
 assert(f.includes('translate(var(--goshuin-optical-x,0%),1.4%) scale(1)'),
  "All three header images must remain exactly the same size");
 for(let grade=1;grade<=3;grade++)
  assert(f.includes('.goshuin-grade[data-grade="'+grade+'"]'));
 assert(f.includes('--goshuin-seal-optical-scale:.970'));
 assert(f.includes('--goshuin-seal-optical-scale:1.030'));
 assert(f.includes('--goshuin-seal-optical-scale:.945'));
 // Based on native PNG alpha bounding boxes measured at >=128; equalize the
 // three apparent ink diameters rather than the already-equal 512px canvases.
 const effective=[453*.970,425*1.030,465*.945];
 assert(Math.max(...effective)-Math.min(...effective)<3,
  "Ink footprint should be visually consistent to under 1% across ratings");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert(html.includes("mobile-game.css?v=6.49.0-omamori-powers"),
  "Paper-card CSS cache must be refreshed on phones");
 assert(html.includes('goshuincho.js?v=6.43.0-japanese-numerals'),
  "Data mapping must stay untouched");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 assert(!app.includes('goshuinArtwork(tile,"cards",info.index)'),
  "All level cards use dynamic parchment instead of per-chapter picture overlays");
 assert(app.includes('goshuinArtwork(crest,"chapters",info.index)'),
  "Square chapter icons must remain independent from portraits");
});

check("Warm Parchment 2.0 renders all chapter cards with real level names",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/mobile-game.css"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert(app.includes('G.japaneseNumeral(stamp.number)'),"All chapter levels use the dynamic Japanese numbering");
 assert(!app.includes('stamp.level>=0&&stamp.level<4'),"No first-page-only gate remains");
 assert(app.includes('tile.classList.add("is-omikuji-preview")'),"Every stamp has parchment styling");
 assert(app.includes('goshuinNode("strong","goshuin-paper-title",levelConfig.name)'));
 assert(app.includes('goshuinArtwork(grade,"grades",stamp.stars)'),"Original star seals survive");
 assert(!app.includes('goshuinArtwork(tile,"cards",info.index)'),"No watercolor level tiles remain");
 assert(app.includes('goshuinArtwork(crest,"chapters",info.index)'),"Keep approved chapter header pictures");
 const cases=[[1,"一"],[4,"四"],[9,"九"],[10,"十"],[11,"十一"],[20,"二十"],
  [23,"二十三"],[32,"三十二"],[40,"四十"],[49,"四十九"],
  [99,"九十九"],[100,"百"],[101,"百一"],[110,"百十"],[123,"百二十三"],
  [1000,"千"],[10000,"一万"],[12345,"一万二千三百四十五"]];
 for(const [level,expected] of cases)assert.equal(G.japaneseNumeral(level),expected);
 assert.equal(G.japaneseNumeral(0),"0");
 assert.equal(G.japaneseNumeral(1.3),"1.3");
 assert(css.includes("Goshuincho Warm Parchment 2.0"));
 assert(css.includes("#fbedd0")&&css.includes("#f5dfb4")&&css.includes("#efd09a"),
  "Every card must use the approved warm golden parchment palette");
 const scoped=css.slice(css.indexOf("/* Goshuincho Warm Parchment 2.0"));
 assert(!scoped.includes("rgba(240,174,151"),"Old pink tint removed");
 assert(scoped.includes("rgba(214,170,103,.16)")&&scoped.includes("rgba(255,239,204,.30)"),
  "Additional honey-gold highlights must replace the flat gray-beige appearance");
 assert(scoped.includes("rgba(184,129,67,.58)"),
  "The inked card frame must be warm sepia");
 assert(scoped.includes("font-size:clamp(11px,3.35vw,14px)"),
  "Stage number/eyebrow must be larger");
 assert(scoped.includes("font-size:clamp(12px,3.2vw,16px)"),
  "Actual level title must be smaller");
 assert(scoped.includes("@media(max-width:360px)"),
  "Small phones retain legible paper typography");
 for(const className of ["goshuin-paper-title","goshuin-paper-kanji","goshuin-paper-eyebrow","goshuin-paper-sakura"])
  assert(css.includes("#modal .goshuin-stamp.is-omikuji-preview ."+className),
   "Paper typography applies to all Goshuincho level cards");
 assert(css.includes(".goshuin-paper-kanji.is-multi-kanji")&&css.includes(".goshuin-paper-title.is-long"),
  "Long Japanese numerals and titles must scale on small screens");
 assert(html.includes('goshuincho.js?v=6.43.0-japanese-numerals'));
 assert(html.includes('app.js?v=6.49.0-active-blessings'));
 assert(html.includes('mobile-game.css?v=6.49.0-omamori-powers'));
 const names=Array.from({length:4},(_,i)=>require("../harmony/rules.js").levelConfig(i).name);
 assert.deepEqual(names,["First Harmony","Growing Beauty","First Masterpiece","First Mist"]);
});
check("Primary Goshuincho navigation hides the old level list without removing progression",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/mobile-game.css"),"utf8");
 assert.match(html, /id="levelList"[^>]*\bhidden\b[^>]*aria-hidden="true"/,
  "The old list must not be visible or accessible");
 assert.match(html, /id="levelPager"[^>]*\bhidden\b[^>]*aria-hidden="true"/);
 assert(css.includes("#levelList[hidden],#levelPager[hidden]{display:none!important}"));
 assert(html.includes('id="goshuinButton"')&&html.includes("Goshuincho · Välj nivå"));
 assert(app.includes("function showLevelSelection()"));
 assert(app.includes('showMenu();\n showGoshuincho();'),
  "Leaving a run must open book on the player's current chapter");
 assert(app.includes('modalButton(actions,"Goshuincho · Nivåval"'));
 assert(app.includes('add("Till Goshuincho"'));
 assert(!html.includes('class="primary" id="continueButton"'),
  "Quick Continue should not outrank primary book level selection");
});

check("Menu Focus & Reward Hierarchy 1.0 makes Goshuincho the primary menu action",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/mobile-game.css"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 assert(html.includes("Harmony Director 4.0"));
 assert(html.indexOf('id="goshuinButton"')<html.indexOf('id="continueButton"'),
  "The album is presented before its subordinate quick-play shortcut");
 assert(html.indexOf('id="continueButton"')<html.indexOf('class="menu-rewards"'),
  "Collection rewards must follow the two gameplay actions");
 assert(html.includes('id="menuRewardsTitle"')&&html.includes("Samling &amp; belöningar"));
 assert(html.includes('id="omamoriButton"')&&html.includes('id="omikujiButton"'),
  "Coin shop and daily luck remain accessible");
 assert(html.includes('id="devButton"')&&html.includes('id="menuAdvanced"'),
  "Developer tools remain accessible");
 assert(css.includes("/* Menu Focus & Reward Hierarchy 1.0"));
 assert(css.includes(".menu-view .panel-footer #continueButton"));
 assert(css.includes(".menu-view .hero h1,.menu-view .hero p,.menu-view .hero-pills{display:none}"));
 assert(css.includes(".menu-view .family-progression-note{display:none}"));
 assert(app.includes('showMenu();\n showGoshuincho();'),
  "Leaving gameplay must still open Goshuincho");
 assert(app.includes('canResume?"Fortsätt nivå "'),
  "The quick-play action must retain saved run support");
});

check("Reward Polish only marks legitimately earned chapter stamps",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const state={unlocked:30,bestStars:{20:1},fourFamilyStars:{0:1}};
 assert.equal(G.chapterSnapshot(state,2).earned,1);
 assert.equal(G.chapterSnapshot(state,2).completed,false);
 for(let i=20;i<30;i++)state.bestStars[i]=1;
 assert.equal(G.chapterSnapshot(state,2).earned,10);
 assert.equal(G.chapterSnapshot(state,2).completed,true);
 assert(app.includes('stamp.earned?" is-earned":""'));
 assert(app.includes('rewardStarsAtLevelStart=G.archivedStars(save,i)'));
 assert(app.includes('const chapterReward=G.chapterSnapshot(save,Math.floor(level/G.CHAPTER_SIZE))'));
});
console.log("Goshuincho Collection + Level Cards + Asset Fidelity 2.0, Optical Alignment 1.0 and Menu Focus 1.0 tests passed.");
