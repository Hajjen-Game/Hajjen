import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const browserPaths=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"];
const exe=browserPaths.find(p=>fs.existsSync(p));
if(!exe)throw new Error("Chrome/Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
// Transitional smoke utility: exercise legacy engine-start regression cases
// without reintroducing a second visible level selector to production.
async function clickLegacyLevel(page,selector){
 await page.evaluate(selector=>{
  const node=document.querySelector(selector);
  if(!node)throw new Error("Legacy level regression selector missing: "+selector);
  node.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));
 },selector);
}
const page=await browser.newPage();const errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",m=>{if(m.type()==="error"&&!/harmony-atlas|404/.test(m.text()))errors.push(m.text());});
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>!!window.HarmonyRules);
 // Goshuincho Primary Navigation 1.0: the old list is absent visually.
 // The Director remains hidden behind the accessible disclosure.
 const uiMenu=await page.evaluate(()=>{
  const a=document.querySelector(".hero").getBoundingClientRect();
  const b=document.querySelector("#goshuinButton").getBoundingClientRect();
  const advanced=document.querySelector("#menuAdvanced");
  return {heroHeight:a.height,levelTop:b.top,advancedOpen:advanced.open,
   directorHidden:getComputedStyle(document.querySelector("#gameDirectorMode")).display,
   legacyListHidden:getComputedStyle(document.querySelector("#levelList")).display==="none"&&
    getComputedStyle(document.querySelector("#levelPager")).display==="none",
   goshuinVisible:!!document.querySelector("#goshuinButton").offsetParent,
   introduction:document.querySelector(".hero p").textContent,
   familyCopy:document.querySelector(".family-progression-note").textContent,
   bodyWidth:document.body.scrollWidth};
 });
 assert(uiMenu.heroHeight<210,"Shorter hero should no longer bury level selection");
 assert(uiMenu.levelTop<780,"Goshuincho must appear on the initial phone view");
 assert(uiMenu.legacyListHidden&&uiMenu.goshuinVisible,
  "The old level list is hidden and Goshuincho is the visible level selector");
 assert.equal(uiMenu.advancedOpen,false,"Director controls should start folded");
 assert(!uiMenu.introduction.includes("fem per nivå"),"Intro must not claim five families on every level");
 assert(uiMenu.familyCopy.includes("4 familjer")&&uiMenu.familyCopy.includes("5 familjer"));
 assert(uiMenu.bodyWidth<=390,"Premium menu must have no horizontal overflow");
 // Daruma Awakening 1.0: the approved 3-state transparent WebP is shipped
 // and its actual state is rendered as a fixed tile on a narrow mobile board.
 const darumaArt=await page.evaluate(async()=>{
  const image=new Image();image.src="./assets/daruma-states.webp?v=7.0";
  await image.decode();
  const canvas=document.createElement("canvas");canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const c=canvas.getContext("2d",{willReadFrequently:true});c.drawImage(image,0,0);
  return {width:image.naturalWidth,height:image.naturalHeight,
   transparent:c.getImageData(0,0,1,1).data[3]===0,
   centers:[0,1,2].map(i=>c.getImageData(i*56+28,28,1,1).data[3])};
 });
 assert.equal(darumaArt.width,168);assert.equal(darumaArt.height,56);
 assert(darumaArt.transparent&&darumaArt.centers.every(v=>v>100),
  "All three approved Daruma images must have transparent backing");
 const darumaContext=await browser.createBrowserContext();
 try{
  const dp=await darumaContext.newPage();
  await dp.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await dp.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
  await dp.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   const store=JSON.parse(localStorage.getItem(key));
   store.unlocked=20;
   const g=new window.HarmonyRules.Game(20,null,{seed:20261024,directorMode:"v3"});
   store.run={level:20,data:g.save(),backgroundId:0};
   localStorage.setItem(key,JSON.stringify(store));
  });
  await dp.reload({waitUntil:"networkidle2"});
  await dp.click("#continueButton");
  const visual=await dp.evaluate(()=>{
   const tile=document.querySelector('.tile[data-index="24"]');
   const img=tile.querySelector(".daruma-art");
   return {title:document.querySelector("#levelTitle")?.textContent,
    goal:document.querySelector("#goalLabel")?.textContent,
    locked:tile.classList.contains("daruma-tile"),
    state:img?.className,background:img&&getComputedStyle(img).backgroundImage,
    aria:tile.getAttribute("aria-label"),
    count:document.querySelectorAll(".tile.daruma-tile").length};
  });
  assert(visual.title.includes("Daruma")&&visual.goal.includes("Daruma"));
  assert(visual.locked&&visual.count===1&&visual.state.includes("state-0"));
  assert(visual.background.includes("daruma-states.webp"));
  assert(visual.aria.includes("två ögon kvar"));
  fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
  await dp.screenshot({path:"/tmp/daisugi-bloom/daruma-l21.png"});
  await dp.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   const store=JSON.parse(localStorage.getItem(key));
   store.run.data.daruma[24]=1;
   localStorage.setItem(key,JSON.stringify(store));
  });
  await dp.reload({waitUntil:"networkidle2"});
  await dp.click("#continueButton");
  const half=await dp.$eval('.tile[data-index="24"]',tile=>({
   state:tile.querySelector(".daruma-art")?.className,aria:tile.getAttribute("aria-label")}));
  assert(half.state.includes("state-1")&&half.aria.includes("ett öga kvar"),
   "A half-painted Daruma must resume with the right second sprite");
 }finally{await darumaContext.close();}
 // Goshuincho Collection 1.0 — independent profile, no archive writes.
 const journalContext=await browser.createBrowserContext();
 try{
  const journal=await journalContext.newPage();
  await journal.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await journal.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
  assert.equal(await journal.$eval("#goshuinProgress",x=>x.textContent),"0 / 10 stämplar");
  await journal.click("#goshuinButton");
  const empty=await journal.evaluate(()=>({
   title:document.querySelector("#modalTitle")?.textContent,
   tiles:document.querySelectorAll(".goshuin-stamp").length,
   earned:document.querySelectorAll(".goshuin-stamp.is-earned").length,
   text:document.querySelector(".goshuin-chapter-status")?.textContent,
   page:document.querySelector(".goshuin-page-count")?.textContent,
   nextDisabled:document.querySelectorAll(".goshuin-nav-button")[1]?.disabled,
   scroll:document.documentElement.scrollWidth
  }));
  assert.equal(empty.title,"Goshuincho");
  assert.equal(empty.tiles,4);
  assert.equal(empty.earned,0);
  assert(empty.text.includes("0 av 10"));
  assert.equal(empty.page,"Kapitel 1 · Sida 1 / 3");
  assert.equal(empty.nextDisabled,false,"Next chapter can be previewed");
  assert(empty.scroll<=390,"The album must not overflow the phone viewport");
  // Warm Parchment 2.0: first chapter is the reference for all later cards.
  // The large dark heading must be the actual title, not a repeated "Nivå X".
  const freshPaper=await journal.evaluate(()=>Array.from(document.querySelectorAll(".goshuin-stamp")).map(tile=>({
   number:tile.dataset.level,paper:tile.classList.contains("is-omikuji-preview"),
   eyebrow:tile.querySelector(".goshuin-paper-eyebrow")?.textContent,
   kanji:tile.querySelector(".goshuin-paper-kanji")?.textContent,
   title:tile.querySelector(".goshuin-paper-title")?.textContent,
   watercolor:!!tile.querySelector(":scope > img.goshuin-art"),
   grade:!!tile.querySelector(".goshuin-grade")
  })));
  assert.deepEqual(freshPaper,[
   {number:"1",paper:true,eyebrow:"第一番 · NIVÅ 1",kanji:"一",title:"First Harmony",watercolor:false,grade:false},
   {number:"2",paper:true,eyebrow:"第二番 · NIVÅ 2",kanji:"二",title:"Growing Beauty",watercolor:false,grade:false},
   {number:"3",paper:true,eyebrow:"第三番 · NIVÅ 3",kanji:"三",title:"First Masterpiece",watercolor:false,grade:false},
   {number:"4",paper:true,eyebrow:"第四番 · NIVÅ 4",kanji:"四",title:"First Mist",watercolor:false,grade:false}
  ]);
  // Aged Paper Polish 1.1: compare actual computed typography and sand
  // gradient on a 390px handset (not just CSS string literals).
  const aged390=await journal.$eval(".goshuin-stamp.is-omikuji-preview",tile=>({
   paper:getComputedStyle(tile).backgroundImage,
   header:parseFloat(getComputedStyle(tile.querySelector(".goshuin-paper-eyebrow")).fontSize),
   title:parseFloat(getComputedStyle(tile.querySelector(".goshuin-paper-title")).fontSize)
  }));
  assert(aged390.paper.includes("251, 237, 208")&&aged390.paper.includes("239, 208, 154"),
   "Warm parchment must have approved honey-cream-to-golden gradient stops");
  assert(aged390.header>=12&&aged390.header>aged390.title,
   "Level number now has the stronger visual hierarchy on 390px");
  assert(aged390.title<15,"Level name should be less dominant than before");
  // Stamp Slot Polish 1.0: load the real nine-asset transparent atlas.
  await journal.waitForSelector(".goshuin-cover-slot.has-art > img.goshuin-art");
  const initialArt=await journal.evaluate(async()=>{
   const image=new Image();image.src="./assets/goshuincho/goshuincho-nine-atlas.avif?v=6.34.0";
   await image.decode();
   const c=document.createElement("canvas");c.width=image.naturalWidth;c.height=image.naturalHeight;
   const ctx=c.getContext("2d");ctx.drawImage(image,0,0);
   return {width:image.naturalWidth,height:image.naturalHeight,
    corner:ctx.getImageData(0,0,1,1).data[3],
    cells:Array.from({length:9},(_,i)=>ctx.getImageData((i%3)*96+48,Math.floor(i/3)*96+48,1,1).data[3]),
    chapter:document.querySelector(".goshuin-cover-slot > img.goshuin-art")?.getAttribute("src")};
  });
  assert.equal(initialArt.width,288);assert.equal(initialArt.height,288);
  assert.equal(initialArt.corner,0,"Approved artwork should have transparent surroundings");
  assert(initialArt.cells.every(a=>a>100),"All nine artwork cells must be nonempty");
  assert(initialArt.chapter?.includes("chapter-icon-sakura.png"),"Chapter 1 uses original square Sakura icon");
  assert.equal(await journal.$eval(".goshuin-cover-slot",
   e=>getComputedStyle(e).getPropertyValue("--goshuin-optical-x").trim()),"-2%",
   "Sakura source silhouette shifts slightly left");
  await journal.click(".goshuin-nav-button:last-child");
  assert.equal(await journal.$eval(".goshuin-page-count",x=>x.textContent),"Kapitel 1 · Sida 2 / 3");
  assert.equal(await journal.$eval(".goshuin-stamp",x=>x.dataset.level),"5");
  assert.equal(await journal.evaluate(()=>document.querySelectorAll(".goshuin-stamp").length),4);
  assert.equal(await journal.evaluate(()=>document.querySelectorAll(".goshuin-stamp.is-omikuji-preview").length),4,
   "Levels 5–8 must use the same parchment cards as levels 1–4");
  assert.equal(await journal.evaluate(()=>document.querySelectorAll(".goshuin-stamp > img.goshuin-art").length),0);
  assert.equal(await journal.$eval('.goshuin-stamp[data-level="8"] .goshuin-paper-kanji',el=>el.textContent),"八");
  await journal.click(".goshuin-nav-button:last-child");
  assert.equal(await journal.$eval(".goshuin-page-count",x=>x.textContent),"Kapitel 1 · Sida 3 / 3");
  assert.equal(await journal.$eval(".goshuin-stamp",x=>x.dataset.level),"9");
  assert.equal(await journal.$$eval(".goshuin-stamp",xs=>xs.length),2);
  assert.equal(await journal.$eval(".goshuin-finale-progress",el=>el.getAttribute("aria-valuenow")),"0");
  assert.equal(await journal.$eval(".goshuin-chapter-sigil",el=>el.classList.contains("is-earned")),false);
  await journal.click(".goshuin-nav-button:last-child");
  assert.equal(await journal.$eval(".goshuin-chapter-copy h3",x=>x.textContent),"Dimträdgården");
  assert.equal(await journal.$eval(".goshuin-page-count",x=>x.textContent),"Kapitel 2 · Sida 1 / 3");
  assert.equal(await journal.$eval(".goshuin-stamp",x=>x.dataset.level),"11");
  assert.equal(await journal.$eval('.goshuin-stamp[data-level="11"] .goshuin-paper-kanji',e=>e.textContent),"十一");
  assert.equal(await journal.$eval('.goshuin-stamp[data-level="11"] .goshuin-paper-eyebrow',e=>e.textContent),"第十一番 · NIVÅ 11");
  assert.equal(await journal.evaluate(()=>document.querySelectorAll(".goshuin-stamp.is-omikuji-preview").length),4);
  assert.equal(await journal.evaluate(()=>document.querySelectorAll(".goshuin-stamp > img.goshuin-art").length),0);
  await journal.waitForSelector(".goshuin-cover-slot.has-art > img.goshuin-art");
  assert((await journal.$eval(".goshuin-cover-slot > img.goshuin-art",x=>x.getAttribute("src"))).includes("chapter-icon-mist.png"));
  assert.equal(await journal.$eval(".goshuin-cover-slot",
   e=>getComputedStyle(e).getPropertyValue("--goshuin-optical-x").trim()),"0%",
   "Mist source silhouette stays horizontally centered");
  await journal.click(".goshuin-nav-button:first-child");
  assert.equal(await journal.$eval(".goshuin-page-count",x=>x.textContent),"Kapitel 1 · Sida 3 / 3");
  assert.equal(await journal.$eval(".goshuin-stamp",x=>x.dataset.level),"9");
  await journal.click(".goshuin-close");
  assert.equal(await journal.$eval("#modal",x=>x.hidden),true);
  const seeded=await journal.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2",data=JSON.parse(localStorage.getItem(key));
   data.unlocked=21;data.run=null;
   data.fourFamilyStars=Object.fromEntries(Array.from({length:10},(_,i)=>[i,i===2?3:1]));
   data.bestStars={10:2,12:3,20:1};
   data.bestScores={10:1250,12:5000,20:250};
   localStorage.setItem(key,JSON.stringify(data));
   return {fourFamilyStars:data.fourFamilyStars,bestStars:data.bestStars};
  });
  await journal.reload({waitUntil:"networkidle2"});
  assert.equal(await journal.$eval("#goshuinProgress",x=>x.textContent),"13 / 30 stämplar");
  await journal.click("#goshuinButton");
  assert.equal(await journal.$eval(".goshuin-chapter-copy h3",x=>x.textContent),"Darumas önskan");
  assert.equal(await journal.$eval(".goshuin-stamp.is-earned",x=>x.dataset.level),"21");
  assert.equal(await journal.$eval(".goshuin-stamp.is-earned",x=>x.dataset.stars),"1");
  await journal.waitForSelector(".goshuin-stamp .goshuin-grade.has-art");
  const thirdChapter=await journal.evaluate(()=>({
   chapter:document.querySelector(".goshuin-cover-slot > img.goshuin-art")?.getAttribute("src"),
   card:document.querySelector(".goshuin-stamp.is-earned > img.goshuin-art")?.getAttribute("src"),
   kanji:document.querySelector(".goshuin-stamp.is-earned .goshuin-paper-kanji")?.textContent,
   paperCount:document.querySelectorAll(".goshuin-stamp.is-omikuji-preview").length,
   legacySlotCount:document.querySelectorAll(".goshuin-stamp-slot").length,
   grade:document.querySelector(".goshuin-stamp.is-earned .goshuin-grade > img.goshuin-art")?.getAttribute("src")
  }));
  assert(thirdChapter.chapter?.includes("chapter-icon-daruma.png"));
  assert.equal(await journal.$eval(".goshuin-cover-slot",
   e=>getComputedStyle(e).getPropertyValue("--goshuin-optical-x").trim()),"1.85%",
   "Daruma source silhouette shifts right");
  assert.equal(thirdChapter.card,undefined,"No watercolor Daruma card overlays remain");
  assert.equal(thirdChapter.kanji,"二十一","Chapter 3 uses compound Japanese numeral");
  assert.equal(thirdChapter.paperCount,4,"All chapter 3 levels use warm paper");
  assert.equal(thirdChapter.legacySlotCount,0,"Repeated round stamp is removed");
  assert(thirdChapter.grade?.includes("star-seal-1.png"),"One-star Japanese grade must be its original full-resolution PNG");
  assert(Math.abs(await journal.$eval(".goshuin-grade.grade-1 > img.goshuin-art",
   el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).a)-.97)<.002,
   "One-star native PNG uses optical ink size, not canvas size");
  // Level Select 2.0: same book serves as a level browser without mutating
  // progress or bypassing existing stage unlocks.
  assert.equal(await journal.$eval('.goshuin-stamp[data-level="22"]',
   x=>x.classList.contains("is-current")),true);
  assert.equal(await journal.$eval(".goshuin-play",x=>x.textContent),"Spela nivå 22 →");
  assert.equal(await journal.$eval(".goshuin-play",x=>x.disabled),false);
  await journal.click('.goshuin-stamp[data-level="23"]');
  assert.equal(await journal.$eval('.goshuin-stamp[data-level="23"]',
   x=>x.dataset.state),"is-locked");
  assert.equal(await journal.$eval(".goshuin-play",x=>x.disabled),true,
   "Locked stages must never launch from the book");
  assert((await journal.$eval(".goshuin-detail",x=>x.textContent)).includes("låst"));
  assert.equal(await journal.$eval("#gameView",x=>x.hidden),true);
  await journal.click('.goshuin-stamp[data-level="21"]');
  assert.equal(await journal.$eval(".goshuin-play",x=>x.textContent),"Spela nivå 21 igen →");
  assert((await journal.$eval(".goshuin-level-objective",x=>x.textContent)).includes("Daruma"));
  // Back from chapter 3 / page 1 means chapter 2 / page 3 (not chapter 2 / page 1).
  await journal.click(".goshuin-nav-button:first-child");
  assert.equal(await journal.$eval(".goshuin-page-count",x=>x.textContent),"Kapitel 2 · Sida 3 / 3");
  assert.equal(await journal.$$eval(".goshuin-stamp",xs=>xs.length),2);
  await journal.click(".goshuin-nav-button:first-child");
  assert.equal(await journal.$eval(".goshuin-page-count",x=>x.textContent),"Kapitel 2 · Sida 2 / 3");
  await journal.click(".goshuin-nav-button:first-child");
  assert.equal(await journal.$eval(".goshuin-chapter-copy h3",x=>x.textContent),"Dimträdgården");
  assert.equal(await journal.$$eval(".goshuin-stamp.is-earned",xs=>xs.length),2);
  assert.equal(await journal.$eval('.goshuin-stamp[data-level="13"]',x=>x.dataset.stars),"3");
  await journal.waitForSelector('.goshuin-stamp[data-level="13"] .goshuin-grade.has-art');
  assert((await journal.$eval('.goshuin-stamp[data-level="13"] .goshuin-grade > img.goshuin-art',
   x=>x.getAttribute("src"))).includes("star-seal-3.png"),"Three-star Japanese seal uses original PNG");
  const seal2and3=await journal.evaluate(()=>({
   second:new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.goshuin-stamp[data-level="11"] .goshuin-grade > img.goshuin-art')).transform).a,
   third:new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.goshuin-stamp[data-level="13"] .goshuin-grade > img.goshuin-art')).transform).a
  }));
  assert(Math.abs(seal2and3.second-1.03)<.002,"Two-star stamp has balanced visible ink size");
  assert(Math.abs(seal2and3.third-.945)<.002,"Gold three-star stamp has balanced visible ink size");
  await journal.click('.goshuin-stamp[data-level="13"]');
  const recordColor=await journal.$eval(".goshuin-level-record",x=>getComputedStyle(x).color);
  assert.equal(recordColor,"rgb(92, 71, 62)","Recorded score must be readable on paper");
  await journal.click(".goshuin-nav-button:first-child");
  assert.equal(await journal.$eval(".goshuin-chapter-copy h3",x=>x.textContent),"Första harmonin");
  assert.equal(await journal.$eval(".goshuin-page-count",x=>x.textContent),"Kapitel 1 · Sida 3 / 3");
  assert.equal(await journal.$$eval(".goshuin-stamp",xs=>xs.length),2);
  assert.equal(await journal.$eval(".goshuin-chapter-sigil",x=>x.classList.contains("is-earned")),true);
  assert.equal(await journal.$eval(".goshuin-finale-progress",x=>x.getAttribute("aria-valuenow")),"10");
  assert.equal(await journal.$eval(".goshuin-chapter-seal-slot",x=>x.dataset.artKey),"chapter-01-complete");
  assert.equal(await journal.$eval(".goshuin-chapter-seal-slot",x=>x.getBoundingClientRect().width>=50),true);
  fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
  await journal.screenshot({path:"/tmp/daisugi-bloom/goshuincho-finale-390.png"});
  await journal.click(".goshuin-nav-button:first-child");
  assert.equal(await journal.$eval(".goshuin-page-count",x=>x.textContent),"Kapitel 1 · Sida 2 / 3");
  await journal.click(".goshuin-nav-button:first-child");
  assert.equal(await journal.$eval(".goshuin-page-count",x=>x.textContent),"Kapitel 1 · Sida 1 / 3");
  assert.equal(await journal.$$eval(".goshuin-stamp.is-earned",xs=>xs.length),4);
  assert.equal(await journal.$$eval(".goshuin-chapter-sigil",xs=>xs.length),0);
  const layout=await journal.evaluate(()=>({
   width:innerWidth,doc:document.documentElement.scrollWidth,
   modal:document.querySelector(".modal-inner").getBoundingClientRect().width,
   grid:document.querySelector(".goshuin-stamp-grid").getBoundingClientRect().width,
   artSlots:document.querySelectorAll(".goshuin-stamp-slot[data-art-key]").length,
   cards:document.querySelectorAll(".goshuin-stamp > img.goshuin-art").length,
   grades:document.querySelectorAll(".goshuin-grade[data-art-key]").length,
   imgs:document.querySelectorAll(".goshuin-art").length,
   atlas:document.querySelectorAll(".goshuin-atlas-art").length,
   sampleGradeWidth:document.querySelector(".goshuin-grade").getBoundingClientRect().width,
   cardShape:document.querySelector(".goshuin-stamp").getBoundingClientRect().height/
      document.querySelector(".goshuin-stamp").getBoundingClientRect().width,
   papers:document.querySelectorAll(".goshuin-stamp.is-omikuji-preview").length,
   titles:[...document.querySelectorAll(".goshuin-paper-title")].map(e=>e.textContent),
   cardsWithTextSeal:[...document.querySelectorAll(".goshuin-stamp")].every(tile=>{
    const title=tile.querySelector(".goshuin-paper-title");
    const seal=tile.querySelector(".goshuin-grade");
    const kanji=tile.querySelector(".goshuin-paper-kanji");
    return title&&seal&&kanji&&
     title.getBoundingClientRect().bottom<=seal.getBoundingClientRect().top+2&&
     kanji.getBoundingClientRect().bottom<=title.getBoundingClientRect().top+2;
   }),
   className:document.querySelector(".goshuin-stamp.is-earned").className
  }));
  assert(layout.doc<=layout.width&&layout.modal<=layout.width&&layout.grid<=layout.modal);
  assert.equal(layout.artSlots,0,"No old circular artwork slot remains");
  assert.equal(layout.papers,4,"The first page shares the paper design used by every other page");
  assert.deepEqual(layout.titles,["First Harmony","Growing Beauty","First Masterpiece","First Mist"]);
  assert.equal(layout.cards,0,"No level cards load the old watercolor illustrations");
  assert.equal(layout.grades,4,"All earned grades keep their one Japanese seal");
  assert.equal(layout.imgs,5,"Chapter cover and four sharp original grade PNGs remain");
  assert(layout.cardsWithTextSeal,"Kanji, stage names, and seals do not overlap");
  assert.equal(layout.atlas,0,"No atlas art is used for chapters or star grade");
  assert(layout.sampleGradeWidth>=38&&layout.sampleGradeWidth<=58,"The seal no longer needs a giant plaque");
  const imageQuality=await journal.evaluate(async()=>({
   icon:document.querySelector(".goshuin-cover-slot > img.goshuin-art")?.naturalWidth,
   seal:document.querySelector(".goshuin-grade > img.goshuin-art")?.naturalWidth,
   cover:(()=>{const e=document.querySelector(".goshuin-cover-slot");const r=e.getBoundingClientRect();return {w:r.width,h:r.height}})(),
   grade:(()=>{const e=document.querySelector(".goshuin-grade");const r=e.getBoundingClientRect();return {w:r.width,h:r.height}})()
  }));
  assert.equal(imageQuality.icon,724,"Chapter header loads the original 724px square illustration");
  assert.equal(imageQuality.seal,512,"Star grade loads the original 512px PNG");
  assert(Math.abs(imageQuality.cover.w-imageQuality.cover.h)<1,"Chapter header keeps a true square, not rectangular distortion");
  assert(Math.abs(imageQuality.grade.w-imageQuality.grade.h)<1,"The grade image keeps square proportions");
  assert(layout.cardShape>1.22&&layout.cardShape<1.28,"Cards preserve their portrait 4:5 proportion");
  assert(layout.className.includes("is-omikuji-preview"));
  fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
  await journal.screenshot({path:"/tmp/daisugi-bloom/goshuincho-390.png"});
  await journal.click('.goshuin-stamp[data-level="3"]');
  assert((await journal.$eval(".goshuin-detail",el=>el.textContent)).includes("3 av 3 stjärnor"));
  const objectiveColor=await journal.$eval(".goshuin-level-objective",x=>getComputedStyle(x).color);
  assert.equal(objectiveColor,"rgb(92, 71, 62)");
  const preserved=await journal.evaluate(()=>{
   const s=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   return {fourFamilyStars:s.fourFamilyStars,bestStars:s.bestStars};
  });
  assert.deepEqual(preserved,seeded,"Browsing the book must never mutate saved star archives");
  await journal.setViewport({width:320,height:640,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await journal.screenshot({path:"/tmp/daisugi-bloom/goshuincho-320.png"});
  const small=await journal.evaluate(()=>({
   doc:document.documentElement.scrollWidth,width:innerWidth,
   modal:document.querySelector(".modal-inner").getBoundingClientRect().width,
   cols:getComputedStyle(document.querySelector(".goshuin-stamp-grid")).gridTemplateColumns.split(" ").length,
   titleSealsDoNotOverlap:[...document.querySelectorAll(".goshuin-stamp")].every(tile=>{
    const title=tile.querySelector(".goshuin-paper-title").getBoundingClientRect();
    const seal=tile.querySelector(".goshuin-grade").getBoundingClientRect();
    return title.bottom<=seal.top+2&&title.width>40;
   })
  }));
  assert(small.doc<=small.width&&small.modal<=small.width,"320px book must have no horizontal overflow");
  assert.equal(small.cols,2,"320px album uses two large columns of stamps");
  assert(small.titleSealsDoNotOverlap,"Paper title and star stamp must not collide at 320px");
  const aged320=await journal.$eval(".goshuin-stamp.is-omikuji-preview",tile=>({
   header:parseFloat(getComputedStyle(tile.querySelector(".goshuin-paper-eyebrow")).fontSize),
   title:parseFloat(getComputedStyle(tile.querySelector(".goshuin-paper-title")).fontSize)
  }));
  assert(aged320.header>=10&&aged320.title<=13,
   "320px phones keep the level number legible and the title restrained");
  await journal.click(".goshuin-close");
  assert.equal(await journal.$eval("#modal",x=>x.hidden),true);
  assert.equal(await journal.$eval(".level-tile.is-current",x=>x.getAttribute("aria-current")),"step");
  assert.equal(await journal.$$eval(".level-tile",els=>els.length),20,
   "The original twenty-row level list stays available during migration");
  // Replaying a completed stage via the BOOK routes to the existing startLevel.
  await journal.click("#goshuinButton");
  await journal.click('.goshuin-stamp[data-level="21"]');
  assert.equal(await journal.$eval(".goshuin-play",x=>x.disabled),false);
  await journal.click(".goshuin-play");
  assert.equal(await journal.$eval("#gameView",x=>x.hidden),false);
  assert.equal(await journal.$eval("#levelNumber",x=>x.textContent),"NIVÅ 21");
  assert.equal(await journal.$eval("#modal",x=>x.hidden),true);
 }finally{await journalContext.close();}
 // Warm Parchment 2.0: all later levels must use the same paper, including
 // the 3-character Japanese numerals on level 31–40 and locked stage 40.
 const lateBookContext=await browser.createBrowserContext();
 try{
  const late=await lateBookContext.newPage();
  await late.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await late.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
  await late.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   const state=JSON.parse(localStorage.getItem(key));
   state.unlocked=38;state.run=null;
   state.bestStars={30:2,31:3};
   localStorage.setItem(key,JSON.stringify(state));
  });
  await late.reload({waitUntil:"networkidle2"});
  await late.click("#goshuinButton");
  assert.equal(await late.$eval(".goshuin-page-count",e=>e.textContent),"Kapitel 4 · Sida 3 / 3");
  assert.equal(await late.$eval('.goshuin-stamp[data-level="39"] .goshuin-paper-kanji',e=>e.textContent),"三十九");
  assert.equal(await late.$eval('.goshuin-stamp[data-level="40"] .goshuin-paper-kanji',e=>e.textContent),"四十");
  assert.equal(await late.$eval('.goshuin-stamp[data-level="40"]',e=>e.dataset.state),"is-locked");
  await late.click(".goshuin-nav-button:first-child");
  await late.click(".goshuin-nav-button:first-child");
  assert.equal(await late.$eval(".goshuin-page-count",e=>e.textContent),"Kapitel 4 · Sida 1 / 3");
  const sample=await late.evaluate(()=>[...document.querySelectorAll(".goshuin-stamp")].map(tile=>({
   level:Number(tile.dataset.level),
   paper:tile.classList.contains("is-omikuji-preview"),
   label:tile.querySelector(".goshuin-paper-eyebrow")?.textContent,
   kanji:tile.querySelector(".goshuin-paper-kanji")?.textContent,
   fit:tile.querySelector(".goshuin-paper-kanji")?.classList.contains("is-multi-kanji"),
   title:tile.querySelector(".goshuin-paper-title")?.textContent,
   name:window.HarmonyRules.levelConfig(Number(tile.dataset.level)-1).name,
   watercolor:!!tile.querySelector(":scope > img.goshuin-art"),
   stamp:!!tile.querySelector(".goshuin-grade")
  })));
  assert.deepEqual(sample.map(x=>x.kanji),["三十一","三十二","三十三","三十四"]);
  assert(sample.every(x=>x.paper&&x.fit&&x.title===x.name&&!x.watercolor),
   "All chapter 4 stages must display dynamic names and sized kanji on paper");
  assert(sample[0].stamp&&sample[1].stamp,"Recorded chapter 4 stars keep their real seal images");
  await late.setViewport({width:320,height:640,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const narrow=await late.evaluate(()=>({
   scrollWidth:document.documentElement.scrollWidth,
   viewport:innerWidth,
   cards:[...document.querySelectorAll(".goshuin-stamp")].map(tile=>{
    const kanji=tile.querySelector(".goshuin-paper-kanji"),title=tile.querySelector(".goshuin-paper-title");
    const seal=tile.querySelector(".goshuin-grade");
    return {kanjiFont:parseFloat(getComputedStyle(kanji).fontSize),
     hasLongTitleClass:title.textContent.length<=20||title.classList.contains("is-long"),
     textFits:!seal||title.getBoundingClientRect().bottom<=seal.getBoundingClientRect().top+2};
   })
  }));
  assert(narrow.scrollWidth<=narrow.viewport,"Chapter 4 must not overflow on 320px phones");
  assert(narrow.cards.every(x=>x.kanjiFont<=32&&x.hasLongTitleClass&&x.textFits),
   "Compound kanji, long titles and star seals stay readable on narrow phones");
  fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
  await late.screenshot({path:"/tmp/daisugi-bloom/goshuincho-chapter4-320.png"});
 }finally{await lateBookContext.close();}
 // Resume is a separate launch path and must reuse the exact saved board,
 // moves and score. Opening/inspecting the book itself is read-only.
 const resumeJournalContext=await browser.createBrowserContext();
 try{
  const rp=await resumeJournalContext.newPage();
  await rp.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await rp.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
  await rp.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   const data=JSON.parse(localStorage.getItem(key));
   data.unlocked=24;
   const g=new window.HarmonyRules.Game(24,null,{seed:54321,directorMode:"v3"});
   const saved=g.save();
   saved.moves=11;saved.score=4102;
   data.run={level:24,data:saved,backgroundId:0};
   localStorage.setItem(key,JSON.stringify(data));
  });
  await rp.reload({waitUntil:"networkidle2"});
  await rp.click("#goshuinButton");
  assert.equal(await rp.$eval(".goshuin-page-count",x=>x.textContent),"Kapitel 3 · Sida 2 / 3");
  assert.equal(await rp.$eval(".goshuin-stamp.is-in-progress",x=>x.dataset.level),"25");
  assert.equal(await rp.$eval(".goshuin-play",x=>x.textContent),"Fortsätt nivå 25 →");
  assert.equal(await rp.$eval(".goshuin-level-status",x=>x.textContent),"PÅBÖRJAD");
  assert.equal(await rp.$eval(".goshuin-play",x=>x.disabled),false);
  await rp.click(".goshuin-play");
  assert.equal(await rp.$eval("#gameView",x=>x.hidden),false);
  assert.equal(await rp.$eval("#levelNumber",x=>x.textContent),"NIVÅ 25");
  assert.equal(await rp.$eval("#movesCount",x=>Number(x.textContent)),11);
  assert.equal(await rp.$eval("#scoreCount",x=>Number(x.textContent.replaceAll(" ","").replaceAll("\u00a0",""))),4102);
  assert.equal(await rp.$eval("#modal",x=>x.hidden),true);
 }finally{await resumeJournalContext.close();}
 await page.$eval("#menuAdvanced",e=>e.open=true);
 const advancedVisible=await page.$eval("#gameDirectorMode",e=>getComputedStyle(e).display);
 assert.notEqual(advancedVisible,"none","Advanced Director choice remains available");
 await page.$eval("#menuAdvanced",e=>e.open=false);
 // Stage-1 art: both actual uploaded PNGs were converted to alpha AVIF.
 // Check transparent corners and the exact live-rendered sprite overrides.
 const iconContext=await browser.createBrowserContext();
 try{
  const art=await iconContext.newPage();
  await art.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await art.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  const imageChecks=await art.evaluate(async()=>{
   const check=async filename=>{
    const image=new Image();
    image.src="./assets/"+filename;
    await image.decode();
    const canvas=document.createElement("canvas");
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const c=canvas.getContext("2d",{willReadFrequently:true});c.drawImage(image,0,0);
    return {w:image.naturalWidth,h:image.naturalHeight,
     corners:[[0,0],[image.naturalWidth-1,0],[0,image.naturalHeight-1],
      [image.naturalWidth-1,image.naturalHeight-1]].map(([x,y])=>
       c.getImageData(x,y,1,1).data[3]),
     center:c.getImageData(image.naturalWidth>>1,image.naturalHeight>>1,1,1).data[3]};
   };
   return {koi:await check("koi-stage1.avif"),maneki:await check("maneki-stage1.avif")};
  });
  for(const [name,item] of Object.entries(imageChecks)){
   assert(item.w>=100&&item.h>=100);
   assert(item.corners.every(v=>v===0),"Stage-1 "+name+" must have real alpha: "+JSON.stringify(item));
   assert(item.center>170,"Stage-1 "+name+" artwork should be visible");
  }
  await art.waitForFunction(()=>["has-atlas","has-new-atlas","has-koi-stage1","has-maneki-stage1"]
   .every(cls=>document.documentElement.classList.contains(cls)),{timeout:18000});
  await clickLegacyLevel(art,".level-tile:first-child");
  const koiTile=await art.evaluate(()=>{
   const el=document.querySelector(".piece .sprite.sprite-stage1-koi");
   const bg=el&&getComputedStyle(el);
   return {exists:!!el,display:bg?.display,
    fallback:el&&getComputedStyle(el.parentElement.querySelector(".fallback")).display,
    background:bg?.backgroundImage,size:bg?.backgroundSize,position:bg?.backgroundPosition};
  });
  assert(koiTile.exists&&koiTile.background.includes("koi-stage1.avif"),"Live Koi stage 1 must show new transparent sprite");
  assert.equal(koiTile.size,"100% 100%");
  assert.equal(koiTile.display,"block","Koi must be VISIBLE, not merely have a URL in CSS");
  assert.equal(koiTile.fallback,"none","The blue fallback emoji must be hidden");
  await art.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   const old=JSON.parse(localStorage.getItem(key));
   old.unlocked=7;old.run=null;
   localStorage.setItem(key,JSON.stringify(old));
  });
  await art.reload({waitUntil:"networkidle2"});
  await clickLegacyLevel(art,".level-tile:nth-child(8)");
  const manekiTile=await art.evaluate(()=>{
   const el=document.querySelector(".piece.new-family .sprite.sprite-stage1-maneki");
   const bg=el&&getComputedStyle(el);
   return {exists:!!el,display:bg?.display,
    fallback:el&&getComputedStyle(el.parentElement.querySelector(".fallback")).display,
    background:bg?.backgroundImage,size:bg?.backgroundSize,
    atlasProtected:[...document.querySelectorAll(".sprite")].every(s=>
     s.classList.contains("sprite-stage1-koi")||s.classList.contains("sprite-stage1-maneki")||
     !getComputedStyle(s).backgroundImage.includes("stage1.avif"))};
  });
  assert(manekiTile.exists&&manekiTile.background.includes("maneki-stage1.avif"),
   "Live Maneki-neko stage 1 must show the new centered paw");
  assert.equal(manekiTile.size,"100% 100%");
  assert.equal(manekiTile.display,"block","Paw must be VISIBLE");
  assert.equal(manekiTile.fallback,"none","The cat fallback emoji must be hidden");
  assert(manekiTile.atlasProtected,"Other stages and object families must retain their atlas sprites");
 }finally{await iconContext.close();}
 // Art Recovery 1.1: simulate the screenshot's broken-atlas scenario.
 // The individual two stage-1 assets must STILL render, with no emojis.
 const offlineContext=await browser.createBrowserContext();
 try{
  const offline=await offlineContext.newPage();
  await offline.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await offline.setRequestInterception(true);
  offline.on("request",request=>{
   if(/\/assets\/(harmony-atlas\.webp|harmony-new-families\.avif)/.test(request.url()))
    request.abort("failed");
   else request.continue();
  });
  await offline.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"domcontentloaded",timeout:40000});
  await offline.waitForFunction(()=>document.documentElement.classList.contains("has-koi-stage1")&&
   document.documentElement.classList.contains("has-maneki-stage1"),{timeout:18000});
  await clickLegacyLevel(offline,".level-tile:first-child");
  const koiOffline=await offline.evaluate(()=>{
   const el=document.querySelector(".sprite-stage1-koi");
   return {sprite:el?getComputedStyle(el).display:null,
    fallback:el?getComputedStyle(el.parentElement.querySelector(".fallback")).display:null,
    atlas:document.documentElement.classList.contains("has-atlas")};
  });
  assert.equal(koiOffline.sprite,"block","Koi art must not depend on the full atlas");
  assert.equal(koiOffline.fallback,"none");
  assert.equal(koiOffline.atlas,false);
  await offline.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2",save=JSON.parse(localStorage.getItem(key));
   save.unlocked=7;save.run=null;localStorage.setItem(key,JSON.stringify(save));
  });
  await offline.reload({waitUntil:"domcontentloaded"});
  await offline.waitForFunction(()=>document.documentElement.classList.contains("has-maneki-stage1"),{timeout:18000});
  await clickLegacyLevel(offline,".level-tile:nth-child(8)");
  const pawOffline=await offline.evaluate(()=>{
   const el=document.querySelector(".sprite-stage1-maneki");
   return {sprite:el?getComputedStyle(el).display:null,
    fallback:el?getComputedStyle(el.parentElement.querySelector(".fallback")).display:null,
    atlas:document.documentElement.classList.contains("has-new-atlas")};
  });
  assert.equal(pawOffline.sprite,"block","Maneki paw art must not depend on the new-family atlas");
  assert.equal(pawOffline.fallback,"none");
  assert.equal(pawOffline.atlas,false);
 }finally{await offlineContext.close();}

 // Reproduce a temporary 4G failure: first request fails, recovered URL
 // succeeds; BOTH regular atlases need visible sprite + hidden emoji.
 const recoverContext=await browser.createBrowserContext();
 try{
  const recover=await recoverContext.newPage();
  await recover.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const failed=new Set();
  await recover.setRequestInterception(true);
  recover.on("request",request=>{
   const name=["harmony-atlas.webp","harmony-new-families.avif"]
    .find(name=>request.url().includes("/assets/"+name));
   if(name&&!failed.has(name)){
    failed.add(name);request.abort("failed");
   }else request.continue();
  });
  await recover.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"domcontentloaded",timeout:40000});
  await recover.waitForFunction(()=>["has-atlas","has-new-atlas"]
    .every(cls=>document.documentElement.classList.contains(cls)),{timeout:22000});
  assert.deepEqual([...failed].sort(),["harmony-atlas.webp","harmony-new-families.avif"],
   "The first atlas fetch should really have failed in this recovery test");
  await clickLegacyLevel(recover,".level-tile:first-child");
  const recovered=await recover.evaluate(()=>{
   const el=document.querySelector(".piece .sprite:not(.sprite-new):not(.sprite-stage1-koi)");
   const style=el&&getComputedStyle(el);
   return {visible:style?.display,background:style?.backgroundImage,
    fallback:el&&getComputedStyle(el.parentElement.querySelector(".fallback")).display};
  });
  assert.equal(recovered.visible,"block");
  assert.equal(recovered.fallback,"none");
  assert(recovered.background.includes("recovery=1"),
   "Atlas CSS must use the recovered URL rather than a failed cached URL");
 }finally{await recoverContext.close();}
 // Live player-mode picker: new sessions default to Pacing 3.0 (including
 // Opportunity 2.0), while 2.0 and Standard are explicitly selectable.
 const directorContext=await browser.createBrowserContext();
 try{
  const demo=await directorContext.newPage();
  await demo.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await demo.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  assert.equal(await demo.$eval("#gameDirectorMode",n=>n.value),"v3");
  await clickLegacyLevel(demo,".level-tile:first-child");
  const fresh=await demo.evaluate(()=>{
   const saved=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   return {mode:saved.run?.data?.directorMode,status:document.querySelector("#paceStatus")?.textContent};
  });
  assert.equal(fresh.mode,"v3","New live levels must ACTUALLY use Pacing 3.0");
  assert(fresh.status.includes("PACING 3.0"));
  const pair=await demo.evaluate(()=>{
   const data=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data;
   return window.HarmonyRules.validSwaps(data.board)[0];
  });
  await demo.evaluate(([a,b])=>{
   const first=document.querySelector('.tile[data-index="'+a+'"]');
   const second=document.querySelector('.tile[data-index="'+b+'"]');
   first.click();second.click();
  },pair);
  await demo.waitForFunction(()=>{
   const run=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"))?.run?.data;
   return run&&run.paceTimes.length>0&&run.moves<24;
  },{timeout:18000});
  const persisted=await demo.evaluate(()=>{
   const data=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data;
   return {mode:data.directorMode,samples:data.paceTimes.length,phase:data.pacePhase};
  });
  assert.equal(persisted.mode,"v3");
  assert.equal(persisted.samples,1,"A completed user move should persist its real decision interval");
  assert(["build","flow","recovery","relax"].includes(persisted.phase));
  await demo.click("#pauseButton");
  await demo.click("#modalActions button:last-child");
  await demo.$eval("#menuAdvanced",e=>e.open=true);
  await demo.select("#gameDirectorMode","v2");
  await demo.reload({waitUntil:"networkidle2"});
  assert.equal(await demo.$eval("#gameDirectorMode",el=>el.value),"v2",
   "A selected engine mode must persist across reload");
  await clickLegacyLevel(demo,".level-tile:first-child");
  const v2=await demo.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data.directorMode);
  assert.equal(v2,"v2","Director 2.0 must remain available in live gameplay");
  await demo.click("#pauseButton");
  await demo.click("#modalActions button:last-child");
  await demo.$eval("#menuAdvanced",e=>e.open=true);
  await demo.select("#gameDirectorMode","standard");
  await clickLegacyLevel(demo,".level-tile:first-child");
  const standard=await demo.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data.directorMode);
  assert.equal(standard,"standard","Standard remains selectable");
  await demo.click("#pauseButton");
  await demo.click("#modalActions button:last-child");
  await demo.$eval("#menuAdvanced",e=>e.open=true);
  await demo.select("#gameDirectorMode","v31");
  await clickLegacyLevel(demo,".level-tile:first-child");
  const objectiveMode=await demo.evaluate(()=>{
   const data=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data;
   return {mode:data.directorMode,drought:data.objectiveDrought,status:document.querySelector("#paceStatus")?.textContent};
  });
  assert.equal(objectiveMode.mode,"v31","Objective 3.1 must be playable without replacing 3.0");
  assert.equal(objectiveMode.drought,0);
  assert(objectiveMode.status.includes("OBJECTIVE 3.1"));
  await demo.click("#pauseButton");
  await demo.click("#modalActions button:last-child");
  await demo.$eval("#menuAdvanced",e=>e.open=true);
  await demo.select("#gameDirectorMode","v311");
  await clickLegacyLevel(demo,".level-tile:first-child");
  const endgameMode=await demo.evaluate(()=>{
   const run=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data;
   return {mode:run.directorMode,status:document.querySelector("#paceStatus")?.textContent};
  });
  assert.equal(endgameMode.mode,"v311","Endgame 3.1.1 must be separately playable");
  assert(endgameMode.status.includes("ENDGAME 3.1.1"));
 }finally{await directorContext.close();}
 // Fixed family progression: 4 in stages 1–10 and 5 from stage 11.
 // Old five-family saved runs and BOTH historical score archives survive.
 const progressionContext=await browser.createBrowserContext();
 try{
  const preview=await progressionContext.newPage();
  await preview.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await preview.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  assert.equal(await preview.$("#gameFamilyCount"),null,"The experiment selector is no longer needed");
  assert((await preview.$eval(".family-progression-note",e=>e.textContent)).includes("4 familjer"));
  // Migrate an earlier five-family intro record and preserve the better
  // experimental four-family record. This migration is idempotent.
  await preview.evaluate(()=>{
   localStorage.setItem("japanese-harmony-puzzle-v2",JSON.stringify({
    unlocked:10,bestStars:{"0":3,"10":1},bestScores:{"0":9000,"10":7200},
    bestChain:{"0":4},fourFamilyStars:{"0":2},fourFamilyScores:{"0":4000},
    fourFamilyChain:{"0":2},playMode:"v3",run:null,sound:false
   }));
  });
  await preview.reload({waitUntil:"networkidle2"});
  const records=await preview.evaluate(()=>{
   const saved=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   return {introRecord:saved.fourFamilyScores["0"],introStars:saved.fourFamilyStars["0"],
    preservedOld:saved.bestScores["0"],journeyRecord:saved.bestScores["10"],
    visibleIntro:document.querySelector(".level-tile:first-child")?.textContent,
    visibleJourney:document.querySelector(".level-tile:nth-child(11)")?.textContent,
    migration:saved.familyProgressionVersion};
  });
  assert.equal(records.introRecord,9000);
  assert.equal(records.introStars,3);
  assert.equal(records.preservedOld,9000);
  assert.equal(records.journeyRecord,7200);
  assert.equal(records.migration,1);
  assert(records.visibleIntro.replace(/\s/g," ").includes("9 000"),"Migrated intro record should show 9 000");
  assert(records.visibleJourney.replace(/\s/g," ").includes("7 200"),"Stage 11 should show original Journey record 7 200");
  await clickLegacyLevel(preview,".level-tile:first-child");
  const four=await preview.evaluate(()=>{
   const run=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data;
   const icons=[...document.querySelectorAll("#masterpieceCollection .collection-card")];
   return {families:run.familyCount,unique:new Set(run.board.map(p=>p.family)).size,
    cardCount:icons.length,mode:run.directorMode,
    width:icons[0]?.querySelector(".collection-icon").getBoundingClientRect().width,
    classified:document.querySelector("#masterpieceCollection").classList.contains("four-families")};
  });
  assert.equal(four.families,4);assert.equal(four.unique,4);assert.equal(four.cardCount,4);
  assert.equal(four.mode,"v3");assert(four.classified&&four.width>58);
  await preview.click("#pauseButton");
  await preview.click("#modalActions button:last-child");
  await clickLegacyLevel(preview,".level-tile:nth-child(11)");
  const five=await preview.evaluate(()=>{
   const run=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data;
   return {count:run.familyCount,unique:new Set(run.board.map(p=>p.family)).size,
    cards:document.querySelectorAll("#masterpieceCollection .collection-card").length,
    width:document.querySelector("#masterpieceCollection .collection-icon").getBoundingClientRect().width};
  });
  assert.equal(five.count,5);assert.equal(five.unique,5);assert.equal(five.cards,5);
  assert(four.width>five.width,"Four-family intro icons should be bigger than five-family Journey icons");

  // Masterpiece Size & Collection Readability 1.0: verify real 4/5 column
  // artwork footprints, readable badges and narrow-phone containment.
  assert(four.width>=80,"Four-family collection art should fill its wider column: "+four.width);
  assert(five.width>=64,"Five-family art should exceed the old ~45px cap: "+five.width);
  const fiveFit=await preview.evaluate(()=>{
   const panel=document.querySelector(".masterpiece-collection");
   const icons=[...panel.querySelectorAll(".collection-icon")];
   const labels=[...panel.querySelectorAll(".collection-label")];
   const badges=[...panel.querySelectorAll(".collection-count")];
   const p=panel.getBoundingClientRect();
   return {height:p.height,bodyWidth:document.body.scrollWidth,
    allInside:icons.every(icon=>{
     const r=icon.getBoundingClientRect();
     return r.left>=p.left&&r.right<=p.right&&Math.abs(r.width-r.height)<1;
    }),
    labelsFit:labels.every(label=>label.scrollWidth<=label.clientWidth+1),
    countersVisible:badges.every(b=>getComputedStyle(b).display!=="none"
      &&b.getBoundingClientRect().width>=24)};
  });
  assert(fiveFit.allInside&&fiveFit.labelsFit&&fiveFit.countersVisible,
   "Larger five-family collection must fit with readable names/counters: "+JSON.stringify(fiveFit));
  assert(fiveFit.bodyWidth<=390,"Larger masterpiece art must not create horizontal scrolling");
  assert(fiveFit.height<175,"Expanded collection must remain a compact panel");
  await preview.setViewport({width:360,height:760,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const narrow=await preview.evaluate(()=>{
   const p=document.querySelector(".masterpiece-collection").getBoundingClientRect();
   const icons=[...document.querySelectorAll(".collection-icon")].map(x=>x.getBoundingClientRect());
   return {width:icons[0].width,bodyWidth:document.body.scrollWidth,
    allInside:icons.every(r=>r.left>=p.left&&r.right<=p.right)};
  });
  assert(narrow.width>=59&&narrow.bodyWidth<=360&&narrow.allInside,
   "Five larger masterpieces must fit a 360px phone: "+JSON.stringify(narrow));
  await preview.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  // A pre-upgrade stage-1 run without familyCount must keep its fifth family.
  await preview.evaluate(()=>{
   const old=new window.HarmonyRules.Game(0,null,{seed:991,familyCount:5,directorMode:"v3"});
   const save=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   const snapshot=old.save();delete snapshot.familyCount;
   save.run={level:0,data:snapshot};
   localStorage.setItem("japanese-harmony-puzzle-v2",JSON.stringify(save));
  });
  await preview.reload({waitUntil:"networkidle2"});
  await preview.click("#continueButton");
  const older=await preview.evaluate(()=>{
   const run=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data;
   return {count:run.familyCount,unique:new Set(run.board.map(p=>p.family)).size};
  });
  assert.equal(older.count,5);
  assert.equal(older.unique,5,"Legacy level-one run must resume with its original five families");
 }finally{await progressionContext.close();}
 // Directed idle hint 1.2: a real legal swap is shown after 30 seconds.
 // Shorten only this 30-second hint timer inside the isolated browser.
 const hintContext=await browser.createBrowserContext();
 try{
  const hintPage=await hintContext.newPage();
  await hintPage.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await hintPage.evaluateOnNewDocument(()=>{
   const realSetTimeout=window.setTimeout.bind(window);
   window.setTimeout=(fn,ms,...args)=>{
    if(ms===30000){window.__idleHintScheduledDelay=ms;return realSetTimeout(fn,300,...args);}
    return realSetTimeout(fn,ms,...args);
   };
  });
  await hintPage.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  await hintPage.waitForFunction(()=>!!window.HarmonyRules);
  await hintPage.evaluate(()=>{
   const original=window.HarmonyRules.bestHint;
   window.__originalBestHint=original;
   window.__bestHintCalls=0;
   window.HarmonyRules.bestHint=(...args)=>{window.__bestHintCalls++;return original(...args);};
  });
  await clickLegacyLevel(hintPage,".level-tile:first-child");
  assert.equal(await hintPage.evaluate(()=>document.querySelectorAll(".tile.idle-hint-source,.tile.idle-hint-target").length),0);
  await hintPage.waitForFunction(()=>
   document.querySelectorAll(".tile.idle-hint-source").length===1&&
   document.querySelectorAll(".tile.idle-hint-target").length===1,{timeout:7000});
  const hint=await hintPage.evaluate(()=>{
   const source=document.querySelector(".tile.idle-hint-source");
   const target=document.querySelector(".tile.idle-hint-target");
   const from=Number(source?.dataset.index),to=Number(target?.dataset.index);
   const saved=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   const R=window.HarmonyRules,options=R.validSwaps(saved.run.data.board);
   return {
    from,to,legal:options.some(pair=>pair.includes(from)&&pair.includes(to)),
    directed:JSON.stringify(R.directedHint(saved.run.data.board,[from,to]))===JSON.stringify({from,to}),
    moveUsed:saved.run.data.moves!==R.levels[0].moves,
    sourceColor:getComputedStyle(source).outlineColor,
    sourceAnimation:getComputedStyle(source).animationName,
    targetAnimation:getComputedStyle(target).animationName,
    sourceGlow:getComputedStyle(source).boxShadow,
    targetGlow:getComputedStyle(target).boxShadow,
    bestIsShown:(()=>{
     const live=new R.Game(0,saved.run.data,{fastRestore:true});
     const chosen=window.__originalBestHint(live);
     return !!chosen&&chosen.from===from&&chosen.to===to;
    })(),
    tappable:getComputedStyle(source).pointerEvents!=="none"&&getComputedStyle(target).pointerEvents!=="none"
   };
  });
  assert(hint.legal&&hint.directed&&hint.bestIsShown&&!hint.moveUsed&&hint.tappable,
   "The hint must show the best evaluated legal move, without consuming score or moves");
  assert.equal(await hintPage.evaluate(()=>window.__idleHintScheduledDelay),30000,"Hint must schedule a 30-second interval");
  assert(hint.sourceAnimation.includes("jh-idle-source-glow"),"Source should glow visibly in gold");
  assert(hint.targetAnimation.includes("jh-idle-target-pulse"),"Destination must pulse softly");
  assert.equal(await hintPage.evaluate(()=>window.__bestHintCalls),1,"First idle period evaluates the legal moves once");
  assert(hint.sourceGlow!==hint.targetGlow,"The two tile hints must be visually differentiated");
  await hintPage.click(".tile.idle-hint-source");
  assert.equal(await hintPage.evaluate(()=>document.querySelectorAll(".tile.idle-hint-source,.tile.idle-hint-target").length),0,
   "Any board interaction clears both highlighted tiles immediately");

  // Previously a selected tile was barred from the hint CSS selectors.
  await hintPage.waitForFunction(()=>!!document.querySelector(".tile.idle-hint-source.selected"),{timeout:7000});
  const selectedHint=await hintPage.$eval(".tile.idle-hint-source.selected",tile=>({
   animation:getComputedStyle(tile).animationName,outline:getComputedStyle(tile).outlineWidth
  }));
  assert(selectedHint.animation.includes("jh-idle-source-glow")&&parseFloat(selectedHint.outline)>=3,
   "Recommended source must glow even when it is already selected");
  assert.equal(await hintPage.evaluate(()=>window.__bestHintCalls),1,"Harmless tap must reuse the cached move suggestion");
  await hintPage.click("#pauseButton");
  await new Promise(resolve=>setTimeout(resolve,420));
  assert.equal(await hintPage.evaluate(()=>document.querySelectorAll(".tile.idle-hint-source,.tile.idle-hint-target").length),0,
   "Hints must never display behind the pause menu");
  await hintPage.click("#modalActions button:first-child");
  await hintPage.waitForFunction(()=>!!document.querySelector(".tile.idle-hint-target"),{timeout:7000});
  await hintPage.evaluate(()=>document.body.classList.add("harmony-reduced-motion"));
  const reduced=await hintPage.$eval(".tile.idle-hint-target",tile=>({
   animation:getComputedStyle(tile).animationName,
   glow:getComputedStyle(tile).boxShadow
  }));
  assert.equal(reduced.animation,"none","Reduced motion disables the target pulse");
  assert(reduced.glow!=="none","Reduced motion keeps a static highlight");
  assert.equal(await hintPage.evaluate(()=>window.__bestHintCalls),1,"Opening the pause menu must not recompute an unchanged board");

  // Invalid swap triggers an async busy bounce. It must not leave the
  // timer permanently disabled once the animation settles.
  await hintPage.evaluate(()=>{
   document.body.classList.remove("harmony-reduced-motion");
   document.querySelector(".tile.selected")?.click();
  });
  const invalid=await hintPage.evaluate(()=>{
   const board=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data.board;
   const R=window.HarmonyRules;
   for(let i=0;i<board.length;i++)for(const j of R.neighbors(i)){
    if(j<=i)continue;
    const copy=board.map(p=>({...p}));
    [copy[i],copy[j]]=[copy[j],copy[i]];
    if(!R.scan(copy).some(g=>g.includes(i)||g.includes(j)))return [i,j];
   }
   return null;
  });
  assert(invalid,"Generated board must have an invalid adjacent swap");
  const beforeInvalid=await hintPage.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data.moves);
  await hintPage.click('.tile[data-index="'+invalid[0]+'"]');
  await hintPage.click('.tile[data-index="'+invalid[1]+'"]');
  await hintPage.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false",{timeout:5000});
  await hintPage.waitForFunction(()=>
   document.querySelectorAll(".tile.idle-hint-source").length===1&&
   document.querySelectorAll(".tile.idle-hint-target").length===1,{timeout:7000});
  const afterInvalid=await hintPage.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data.moves);
  assert.equal(afterInvalid,beforeInvalid,"Invalid swap must not consume a move");
 }finally{await hintContext.close();}
 // Regression: old 10-level saves capped unlocked at index 9 despite level-10 completion.
 const legacyContext=await browser.createBrowserContext();
 try{
  const legacy=await legacyContext.newPage();
  await legacy.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await legacy.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  await legacy.evaluate(()=>{
   localStorage.setItem("japanese-harmony-puzzle-v2",JSON.stringify({
    unlocked:9,bestStars:{"9":3},bestScores:{"9":24436},
    bestChain:{"9":4},run:null,sound:false,reduceMotion:false
   }));
  });
  await legacy.reload({waitUntil:"networkidle2"});
  const recovered=await legacy.evaluate(()=>{
   const saved=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   const tile=document.querySelectorAll(".level-tile")[10];
   return {unlocked:saved.unlocked,playable:!!tile&&!tile.disabled};
  });
  assert.equal(recovered.unlocked,10,"Old win of level 10 should unlock level 11 automatically");
  assert(recovered.playable,"Level 11 should be clickable after legacy migration");
  await legacy.evaluate(()=>{
   localStorage.setItem("japanese-harmony-puzzle-v2",JSON.stringify({
    unlocked:9,bestStars:{},bestScores:{},bestChain:{},
    run:{level:9,data:{complete:false}},sound:false,reduceMotion:false
   }));
  });
  await legacy.reload({waitUntil:"networkidle2"});
  const incomplete=await legacy.evaluate(()=>({
   unlocked:JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).unlocked,
   locked:document.querySelectorAll(".level-tile")[10].disabled
  }));
  assert.equal(incomplete.unlocked,9,"An unfinished level 10 must not unlock level 11");
  assert(incomplete.locked);
  // Legacy 3 stars were earned against obsolete 1,600-point target.
  // Keep wins and record values, but recalibrate star ratings to the actual scores.
  await legacy.evaluate(()=>{
   localStorage.setItem("japanese-harmony-puzzle-v2",JSON.stringify({
    unlocked:12,bestStars:{"10":3,"11":2},
    bestScores:{"10":1600,"11":18000},bestChain:{},run:null,
    sound:false,reduceMotion:false
   }));
  });
  await legacy.reload({waitUntil:"networkidle2"});
  const migrated=await legacy.evaluate(()=>{
   const saved=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   const nodes=document.querySelectorAll(".level-tile");
   const R=window.HarmonyRules;
   return {unlocked:saved.unlocked,record:saved.bestScores["10"],
    stars:saved.bestStars["10"],nextStars:saved.bestStars["11"],
    shown:nodes[10].textContent,second:nodes[11].textContent,
    target:R.levelConfig(10).goal.count,oldTarget:R.legacyScoreConfig(10).goal.count};
  });
  assert.equal(migrated.unlocked,12,"Already unlocked future levels must stay unlocked");
  assert.equal(migrated.record,1600,"Original high score must not be overwritten");
  assert.equal(migrated.stars,1,"Old overly generous 3 stars should be adjusted to 1");
  assert.equal(migrated.nextStars,3,"Excellent prior score must still earn 3 stars");
  assert(migrated.shown.replace(/\s/g," ").includes("1 600")&&migrated.second.replace(/\s/g," ").includes("18 000"),
   "The level list must display personal best scores for completed stages");
  assert.equal(migrated.target,20,"Level 11 now requires twenty fusions rather than a brief cascade");
  assert.equal(migrated.oldTarget,7500,"Legacy score milestones remain preserved");
  await clickLegacyLevel(legacy,".level-tile:nth-child(11)");
  const milestones=await legacy.evaluate(()=>({
   hidden:document.querySelector("#starTargets").hidden,
   goal:document.querySelector("#goalLabel").textContent,
   mist:document.querySelectorAll(".tile.misted").length
  }));
  assert(milestones.hidden,"New mission levels use moves-based stars, not score milestones");
  assert.equal(milestones.goal,"Fusioner");
  assert.equal(milestones.mist,0,"Fifth family should begin without an additional Mist challenge");
  // The user's actual 11–14 history should automatically earn the revised
  // stars, without deleting records or revoking old level completions.
  await legacy.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   const old=JSON.parse(localStorage.getItem(key));
   old.unlocked=14;
   Object.assign(old.bestScores,{"10":4710,"11":7900,"12":9125,"13":9388});
   Object.assign(old.bestStars,{"10":1,"11":1,"12":1,"13":1});
   old.run=null;
   localStorage.setItem(key,JSON.stringify(old));
  });
  await legacy.reload({waitUntil:"networkidle2"});
  const rebalanced=await legacy.evaluate(()=>{
   const data=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   return {scores:[10,11,12,13].map(i=>data.bestScores[i]),
    stars:[10,11,12,13].map(i=>data.bestStars[i]),
    shown:[10,11,12,13].map(i=>document.querySelectorAll(".level-tile")[i].textContent)};
  });
  assert.deepEqual(rebalanced.scores,[4710,7900,9125,9388]);
  assert.deepEqual(rebalanced.stars,[1,1,1,1],
   "Revised Journey rewards must recognize existing performance automatically");
  assert(rebalanced.shown[1].includes("★")&&!rebalanced.shown[1].includes("★★"),
   "Old achievements keep a completion star but the 50% higher 2-star milestone applies");

 }finally{await legacyContext.close();}
 // New public release: every existing browser must wipe archived scores,
 // stars, unlocked progression and active runs exactly once on first launch.
 const freshStartContext=await browser.createBrowserContext();
 try{
  const freshStart=await freshStartContext.newPage();
  await freshStart.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await freshStart.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  await freshStart.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   localStorage.setItem(key,JSON.stringify({
    unlocked:19,bestScores:{"0":4444,"11":22222},bestStars:{"0":3,"11":2},
    bestChain:{"0":8},fourFamilyScores:{"0":1234},
    fourFamilyStars:{"0":3},fourFamilyChain:{"0":4},
    run:{level:19,data:{moves:3}},sound:false,reduceMotion:true,playMode:"v31"
   }));
   localStorage.removeItem("japanese-harmony-first20-reset-20261024-v1");
  });
  await freshStart.reload({waitUntil:"networkidle2"});
  const reset=await freshStart.evaluate(()=>{
   const data=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   return {
    unlocked:data.unlocked,run:data.run,sound:data.sound,motion:data.reduceMotion,
    playMode:data.playMode,marker:localStorage.getItem("japanese-harmony-first20-reset-20261024-v1"),
    archives:["bestScores","bestStars","bestChain","fourFamilyScores",
      "fourFamilyStars","fourFamilyChain"].map(k=>Object.keys(data[k]||{}).length),
    firstOpen:document.querySelectorAll(".level-tile")[0]?.disabled,
    secondLocked:document.querySelectorAll(".level-tile")[1]?.disabled,
    level1:window.HarmonyRules.levelConfig(0).goal,
    introMist:window.HarmonyRules.levelConfig(3).goal.type
   };
  });
  assert.equal(reset.marker,"done");
  assert.equal(reset.unlocked,0);
  assert.equal(reset.run,null);
  assert.deepEqual(reset.archives,[0,0,0,0,0,0],
   "All six score, star and combo archives are wiped on every profile's first updated visit");
  assert.equal(reset.firstOpen,false);
  assert.equal(reset.secondLocked,true);
  assert.deepEqual(reset.level1,{type:"fusion",count:3});
  assert.equal(reset.introMist,"mist");
  assert.equal(reset.sound,false);assert.equal(reset.motion,true);
  assert.equal(reset.playMode,"v31","User settings survive, not progress");
  await freshStart.reload({waitUntil:"networkidle2"});
  assert.equal(await freshStart.evaluate(()=>
    JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).unlocked),0,
   "Reset never reintroduces stale achievements on repeated loads");
 }finally{await freshStartContext.close();}
 // Board Praise 1.0: a real seeded swap triggers all three approved words.
 const praiseContext=await browser.createBrowserContext();
 try{
  const praisePage=await praiseContext.newPage();
  await praisePage.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await praisePage.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  const fixture=await praisePage.evaluate(()=>{
   const R=window.HarmonyRules;
   const game=new R.Game(0,null,{seed:113});
   const families=R.activeFamilies(0);
   for(let i=0;i<49;i++)game.board[i]={
    id:i+1,stage:1,family:families[(Math.floor(i/7)*2+i%7)%families.length]
   };
   game.board[15].family=families[0];game.board[15].stage=4;
   game.board[16].family=families[0];game.board[24].family=families[0];
   game.board[17].family=families[1];
   if(R.scan(game.board).length)throw new Error("Praise fixture starts with illegal match");
   const snap=game.save();
   const result=new R.Game(0,snap,{fastRestore:true}).swap(17,24);
   const types=result.events.map(e=>e.type);
   if(!result.ok||!["echo","hero","pulse"].every(t=>types.includes(t))){
    throw new Error("Fixture missing Echo / Masterpiece / Pulse: "+JSON.stringify(types));
   }
   localStorage.setItem("japanese-harmony-puzzle-v2",JSON.stringify({
    unlocked:0,bestStars:{},bestScores:{},bestChain:{},sound:false,reduceMotion:false,
    run:{level:0,data:snap}
   }));
   return {types,pulseEvents:result.events.filter(evt=>evt.type==="pulse").map(evt=>({
    wave:evt.wave,targets:evt.targets.map(t=>({to:t.to,stage:t.stage}))
   })),harvestCells:result.events.filter(evt=>evt.type==="harvest").flatMap(evt=>
    evt.positions.filter(at=>!evt.board[at])),
    vacatedCells:result.events.flatMap(evt=>
     evt.type==="fusion"?evt.groups.flatMap(g=>g.removed.filter(at=>!evt.board[at])):
     evt.type==="harvest"?evt.positions.filter(at=>!evt.board[at]):[])
   };
  });
  await praisePage.reload({waitUntil:"networkidle2"});
  await praisePage.click("#continueButton");
  await praisePage.evaluate(()=>{
   window.__masterpieceFireworks={big:0,flowers:0,diamonds:0,stars:0};

   // Observe REAL Wave events: affected cells must charge before travelling
   // beams, while their prior stage remains visible, with no extra targets.
   window.__pulseProbe={charge:[],chargeAnimations:[],timeline:[],impacts:0,sparkles:[],dustWhileRefill:false};
   const realAnimate=Element.prototype.animate;
   Element.prototype.animate=function(frames,options){
    if(this.classList?.contains("pulse-anticipation-glow")){
     window.__pulseProbe.chargeAnimations.push({
      wave:Number(this.dataset.wave),to:Number(this.dataset.to),
      delay:options.delay,duration:options.duration,
      startOpacity:frames[0]?.opacity,endOpacity:frames.at(-1)?.opacity,
      endScale:frames.at(-1)?.transform
     });
    }
    return realAnimate.call(this,frames,options);
   };
   const pulseObserver=new MutationObserver(records=>{
    for(const rec of records)for(const node of rec.addedNodes){
     if(node.nodeType!==1||!node.classList)continue;
     if(node.classList.contains("pulse-anticipation-glow")){
      const tile=node.closest(".tile");
      const style=getComputedStyle(node);
      window.__pulseProbe.timeline.push("charge");
      const ring=getComputedStyle(node,"::before");
      const shimmer=getComputedStyle(node,"::after");
      window.__pulseProbe.charge.push({
       to:Number(node.dataset.to),wave:Number(node.dataset.wave),
       oldStage:Number(tile?.getAttribute("aria-label")?.match(/stadium (\d+)/)?.[1]),
       isMasterpiece:node.classList.contains("pulse-anticipation-masterpiece"),
       pointer:style.pointerEvents,bg:style.backgroundImage,shadow:style.boxShadow,
       mask:style.maskImage,webkitMask:style.webkitMaskImage,
       ringAnimation:ring.animationName,ringDuration:parseFloat(ring.animationDuration),
       ringBackground:ring.backgroundImage,
       shimmerAnimation:shimmer.animationName,shimmerBackground:shimmer.backgroundImage,
       rimWidth:parseFloat(style.paddingTop),
       centreTransparent:style.backgroundColor==="rgba(0, 0, 0, 0)"
      });
     }else if(node.classList.contains("fusion-afterglow-spark")){
      const tile=document.querySelector('.tile[data-index="'+node.dataset.at+'"]');
      const style=getComputedStyle(node);
      window.__pulseProbe.sparkles.push({
       at:Number(node.dataset.at),isEmpty:tile?.getAttribute("aria-label")==="Tom ruta",
       left:node.style.left,top:node.style.top,delay:Number(node.dataset.delay),
       isStar:node.classList.contains("dust-star"),shade:node.className,phase:node.dataset.phase,
       layer:!!node.closest(".magic-dust-layer"),duration:parseFloat(node.getAnimations()[0]?.effect?.getTiming()?.duration||0),
       bg:style.backgroundImage
      });
      window.__pulseProbe.timeline.push("dust");
     }else if(node.classList.contains("piece")&&document.querySelector(".magic-dust")){
      window.__pulseProbe.dustWhileRefill=true;
     }else if(node.classList.contains("pulse-trace")){
      window.__pulseProbe.timeline.push("beam");
     }else if(node.classList.contains("pulse-target-hit")){
      window.__pulseProbe.timeline.push("impact");
      window.__pulseProbe.impacts++;
     }
    }
   });
   pulseObserver.observe(document.body,{childList:true,subtree:true});
   window.__pulseProbe.disconnect=()=>pulseObserver.disconnect();
   window.__rewardAccents={echo:0,pulse:0,collection:0,shapes:[]};
   window.__masterpieceObserver=new MutationObserver(records=>{
    for(const rec of records)for(const node of rec.addedNodes){
     if(node.nodeType!==1||!node.classList)continue;
     if(node.classList.contains("harmony-reward-accent")){
      for(const kind of ["echo","pulse","collection"])
       if(node.classList.contains("harmony-accent-"+kind))window.__rewardAccents[kind]++;
      for(const shape of ["star","diamond","flower"])
       if(node.classList.contains("harmony-"+shape))window.__rewardAccents.shapes.push(shape);
     }
     if(node.classList.contains("harmony-firework-particle")&&node.classList.contains("harmony-masterpiece")){
      window.__masterpieceFireworks.big++;
      const shape=node.dataset.fireworkShape;
      if(shape==="flower")window.__masterpieceFireworks.flowers++;
      if(shape==="diamond")window.__masterpieceFireworks.diamonds++;
      if(shape==="star")window.__masterpieceFireworks.stars++;
     }
    }
   });
   window.__masterpieceObserver.observe(document.body,{childList:true,subtree:true});
  });
  await praisePage.evaluate(()=>{
   const root=document.querySelector("#boardPraise");
   window.__praiseWordsSeen=[];
   window.__praiseMaxOverlap=0;
   const observe=()=>{
    const words=root.querySelectorAll(".board-praise-word");
    window.__praiseMaxOverlap=Math.max(window.__praiseMaxOverlap,words.length);
    const word=words[0];
    if(word && window.__praiseWordsSeen.at(-1)!==word.textContent)
     window.__praiseWordsSeen.push(word.textContent);
   };
   window.__praiseObserver=new MutationObserver(observe);
   window.__praiseObserver.observe(root,{childList:true,subtree:true});
  });
  await praisePage.click('.tile[data-index="17"]');
  await praisePage.click('.tile[data-index="24"]');
  await praisePage.waitForFunction(()=>window.__praiseWordsSeen?.length===3,{timeout:20000});
  const praise=await praisePage.evaluate(()=>{
   window.__praiseObserver.disconnect();
   window.__masterpieceObserver.disconnect();
   const root=document.querySelector("#boardPraise");
   const word=root.querySelector(".board-praise-word");
   return {seen:window.__praiseWordsSeen,maxOverlap:window.__praiseMaxOverlap,fireworks:window.__masterpieceFireworks,accents:window.__rewardAccents,
    hitTest:getComputedStyle(root).pointerEvents,
    ariaHidden:root.getAttribute("aria-hidden"),
    animation:word?getComputedStyle(word).animationName:"",
    oldChip:!!document.querySelector("#combo")};
  });
  assert.deepEqual(praise.seen,["HARMONY ECHO!","MASTERPIECE!","HARMONY PULSE!"],
   "Only approved center-board words should appear in real event order: "+JSON.stringify(praise));
  assert.equal(praise.hitTest,"none");
  assert.equal(praise.ariaHidden,"true");
  assert.equal(praise.maxOverlap,1,"Praise words must never overlap");
  assert(praise.animation.includes("harmony-praise-pop"),"Words require a real pop animation");
  assert(!praise.oldChip,"The old small reward chip must not remain");
  assert(fixture.types.includes("echo")&&fixture.types.includes("hero")&&fixture.types.includes("pulse"));
  assert(praise.accents.echo>=1&&praise.accents.pulse>=1,
   "Real Echo and Pulse need small matching celebration accents: "+JSON.stringify(praise.accents));
  assert(praise.accents.shapes.includes("diamond")&&praise.accents.shapes.includes("flower"),
   "Echo/Pulse accents must share the pearl, Sakura and gold language");
  assert(praise.fireworks.big>=5&&praise.fireworks.flowers>=1&&
   praise.fireworks.diamonds>=1&&praise.fireworks.stars>=1,
   "A real Masterpiece must launch the stronger tri-color mini-firework: "+JSON.stringify(praise.fireworks));

  await praisePage.waitForFunction(()=>
   document.querySelector("#board").getAttribute("aria-busy")==="false",{timeout:12000});
  const pulse=await praisePage.evaluate(()=>{
   window.__pulseProbe.disconnect();
   return {...window.__pulseProbe,
    remaining:document.querySelectorAll(".pulse-anticipation-glow").length};
  });
  const expected=fixture.pulseEvents.flatMap(evt=>
   evt.targets.map(t=>({wave:evt.wave,to:t.to,stage:t.stage})));
  const sortPosition=(a,b)=>a.wave-b.wave||a.to-b.to;
  assert.deepEqual(pulse.charge.map(({wave,to})=>({wave,to})).sort(sortPosition),
   expected.map(({wave,to})=>({wave,to})).sort(sortPosition),
   "Anticipation must glow on EVERY and ONLY target of the actual Pulse events");
  assert(pulse.charge.every(c=>c.pointer==="none"&&c.bg==="none"&&
   c.shadow==="none"&&c.centreTransparent&&c.rimWidth===1),
   "Pulse target rings must have a transparent centre, with NO old tile-filling glow");
  assert(pulse.charge.every(c=>
    c.mask!=="none"&&c.ringAnimation.includes("jh-pulse-target-orbit")&&
    c.shimmerAnimation.includes("jh-pulse-target-orbit")&&
    c.ringBackground.includes("conic-gradient")&&
    c.shimmerBackground.includes("conic-gradient")),
   "Bright separated segments must orbit a stationary masked rim");
  assert(pulse.charge.every(c=>{
   const expectedDuration=c.wave===1?1.04:c.wave===2?.76:.58;
   return Math.abs(c.ringDuration-expectedDuration)<.025;
  }),"Pulse chain waves must rotate faster without changing their charge timing");
  assert(pulse.charge.every(c=>{
   const target=expected.find(t=>t.wave===c.wave&&t.to===c.to);
   return target&&c.oldStage===target.stage-1&&c.isMasterpiece===(target.stage===5);
  }),"Anticipation must precede each target's stage change, accenting future masterpieces");
  assert(pulse.chargeAnimations.length===pulse.charge.length);
  assert(pulse.chargeAnimations.every(a=>
   a.startOpacity===0&&a.endOpacity===1&&a.delay>=20&&a.duration>=135&&
   a.endScale.includes("1.035")),
   "Glows must charge gradually from zero to full strength with wave-scaled timing");
  assert(pulse.timeline.includes("beam")&&pulse.timeline.includes("impact")&&
   pulse.timeline.indexOf("charge")<pulse.timeline.indexOf("beam")&&
   pulse.timeline.indexOf("beam")<pulse.timeline.indexOf("impact"),
   "Target charging must appear before travelling beams and the final impact");
  assert(pulse.impacts>0&&pulse.remaining===0,
   "Every Pulse must land with a flash and clean up its temporary glow layers");
  const sparkleCells=new Set(pulse.sparkles.map(p=>p.at));
  assert(fixture.harvestCells.length>=1,
   "The seeded Harmony Pulse fixture must create a harvested masterpiece");
  assert(fixture.vacatedCells.every(at=>sparkleCells.has(at)),
   "Every emptied cell in a real fusion or Harmony Pulse harvest must glitter");
  assert(pulse.sparkles.every(p=>p.layer&&
   (p.phase==="fusion"||p.isEmpty)&&
   /px$/.test(p.left)&&/px$/.test(p.top)&&p.bg.includes("gradient")),
   "Fusion dust may start while original pieces are visible; harvest dust begins on empty cells");
  assert(fixture.harvestCells.every(at=>pulse.sparkles.filter(p=>p.at===at).length>=3),
   "Pulse-harvest empty cells need a visible cluster of sparkle particles");
  assert(pulse.sparkles.some(p=>p.isStar)&&
   new Set(pulse.sparkles.map(p=>p.shade.match(/dust-(gold|pearl|sakura)/)?.[1])).size>=3,
   "Floating magic dust needs occasional tiny stars and pearl/gold/Sakura variation");
  assert(pulse.dustWhileRefill,
   "Floating dust should keep drifting while new board pieces refill the grid");
  assert(new Set(pulse.sparkles.map(p=>p.delay)).size>=4,
   "Pulse-harvest dust should appear at independently staggered times");
  assert.equal(await praisePage.evaluate(()=>document.querySelectorAll(".fusion-afterglow-spark").length),0,
   "Floating motes should be cleaned up after the chain finishes");
 }finally{await praiseContext.close();}
 // Confirm a REAL resumed board with an eligible stage-3 neighbour pair creates
 // a visible, animated thread. Previous CSS-only tests missed this integration.
 const isolated=await browser.createBrowserContext();
 try{
  const proof=await isolated.newPage();
  await proof.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await proof.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  const pair=await proof.evaluate(()=>{
   const R=window.HarmonyRules,g=new R.Game(0,null,{seed:173});
   let selected=null;
   for(let i=0;i<49&&!selected;i++)for(const j of R.neighbors(i)){
    if(g.board[i].family===g.board[j].family){selected=[i,j];break;}
   }
   if(!selected)throw new Error("No adjacent same-family objects on fixture board");
   g.board[selected[0]].stage=3;
   if(!R.resonanceLinks(g.board).length)throw new Error("Resonance rules rejected known pair");
   localStorage.setItem("japanese-harmony-puzzle-v2",JSON.stringify({
    unlocked:0,bestStars:{},bestScores:{},bestChain:{},
    run:{level:0,data:g.save()},sound:false,reduceMotion:false
   }));
   return selected;
  });
  await proof.reload({waitUntil:"networkidle2"});
  await proof.click("#continueButton");
  await proof.waitForFunction(()=>document.querySelectorAll("#resonanceLinks .resonance-link").length>0,{timeout:6000});
  const actual=await proof.evaluate(pair=>{
   const line=document.querySelector("#resonanceLinks .resonance-link");
   const anchor=document.querySelectorAll(".tile")[pair[0]];
   const linked=document.querySelectorAll(".tile")[pair[1]];
   const css=getComputedStyle(line),stream=getComputedStyle(line,"::after");
   return {width:parseFloat(line.style.width),left:parseFloat(line.style.left),
    anim:stream.animationName,duration:parseFloat(stream.animationDuration),
    pointer:css.pointerEvents,anchor:anchor.classList.contains("resonance-anchor")||
      anchor.classList.contains("resonance-partner"),
    partner:linked.classList.contains("resonance-partner")||
      linked.classList.contains("resonance-anchor")};
  },pair);
  assert(actual.width>5&&Number.isFinite(actual.left),
   "Real Resonance filament needs nonzero board coordinates: "+JSON.stringify(actual));
  assert(actual.anim.includes("resonance-current")&&actual.duration>=4,
   "Real Resonance pair must use the flowing energy animation");
  assert.equal(actual.pointer,"none");
  assert(actual.anchor&&actual.partner,"Actual linked tiles must receive Resonance CSS classes");
  const visual=await proof.evaluate(pair=>{
   const line=document.querySelector("#resonanceLinks .resonance-link");
   const root=document.querySelector("#resonanceLinks");
   const tiles=document.querySelectorAll(".tile");
   window.__resonanceProofBeam=line;
   return {contain:getComputedStyle(line).contain,overflow:getComputedStyle(line).overflow,
    paused:root.classList.contains("resonance-paused"),
    pulse:tiles[pair[0]].classList.contains("resonance-awakening")&&
      tiles[pair[1]].classList.contains("resonance-awakening"),
    pulseAnimation:getComputedStyle(tiles[pair[0]],"::before").animationName};
  },pair);
  assert(!visual.contain.includes("paint")&&visual.overflow==="visible",
   "The flowing energy must not be clipped to the beam's 3px box");
  assert(!visual.paused&&visual.pulse&&visual.pulseAnimation.includes("resonance-discovery"),
   "Both real tiles must get a one-off discovery pulse");

  // Performance audit: selecting a tile should reuse settled Resonance
  // geometry rather than reread up to 13 layout rectangles on every tap.
  const layoutReads=await proof.evaluate(()=>{
   const original=Element.prototype.getBoundingClientRect;
   let reads=0;
   try{
    Element.prototype.getBoundingClientRect=function(...args){
     if(this.id==="resonanceLinks"||this.classList?.contains("tile"))reads++;
     return original.apply(this,args);
    };
    document.querySelector(".tile:nth-child(49)").click();
   }finally{Element.prototype.getBoundingClientRect=original;}
   return reads;
  });
  assert.equal(layoutReads,0,
   "Plain tile selection must reuse settled Resonance geometry");
  // The viewport resize still needs a new measurement and alignment.
  const resizedReads=await proof.evaluate(()=>{
   const original=Element.prototype.getBoundingClientRect;
   let reads=0;
   try{
    Element.prototype.getBoundingClientRect=function(...args){
     if(this.id==="resonanceLinks"||this.classList?.contains("tile"))reads++;
     return original.apply(this,args);
    };
    window.dispatchEvent(new Event("resize"));
   }finally{Element.prototype.getBoundingClientRect=original;}
   return reads;
  });
  assert(resizedReads>0,"Resonance must recompute filament geometry after a resize");
  const stable=await proof.evaluate(()=>{
   const beam=document.querySelector("#resonanceLinks .resonance-link");
   return {same:beam===window.__resonanceProofBeam,
    pulseCount:document.querySelectorAll(".tile.resonance-awakening").length,
    stillFlowing:getComputedStyle(beam,"::after").animationName.includes("resonance-current")};
  });
  assert(stable.same&&stable.pulseCount===0&&stable.stillFlowing,
   "Selecting an unrelated tile must preserve the running beam without replaying its pulse");
  fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
  await proof.screenshot({path:"/tmp/daisugi-bloom/japanese-harmony-resonance-live.png"});
 }finally{await isolated.close();}
 assert.equal(await page.evaluate(()=>document.querySelectorAll(".level-tile").length),20,
  "Hidden legacy regression data temporarily retains pagination; Goshuincho is the visible selector");
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector("#levelList")).display),"none");
 assert.equal(await page.$eval("#continueButton",x=>x.disabled),false);
 // Engine Lab 2.0 compares paired Standard/Director simulations on the real phone-sized menu,
 // with a computed report that is exportable and no player-save changes.
 const beforeLab=await page.evaluate(()=>localStorage.getItem("japanese-harmony-puzzle-v2"));
 await page.click("#devButton");
 assert.equal(await page.$eval("#modalTitle",el=>el.textContent),"Harmony Intelligence");
 await page.select(".engine-controls select","0");
 await page.select(".engine-controls label:nth-child(2) select","2");
 await page.select("#engineMode","compare");
 await page.click("#modalActions button:first-child");
 await page.waitForFunction(()=>document.querySelector(".engine-lab-status")?.textContent.includes("Analysen klar"),{timeout:45000});
 assert.equal(await page.evaluate(()=>document.querySelectorAll(".engine-table tbody tr").length),16,
  "Developer lab must show 4 bots × 4 paired engine modes");
 const comparisonUI=await page.evaluate(()=>({
  versions:[...document.querySelectorAll(".engine-table tbody tr")]
   .map(tr=>tr.querySelector("td:nth-child(2)")?.textContent),
  summaries:document.querySelectorAll(".engine-comparison p").length,
  versionShown:document.querySelector(".engine-lab-output")?.textContent.includes("6.30.0")
 }));
 assert.equal(comparisonUI.versions.filter(x=>x==="Standard").length,4);
 assert.equal(comparisonUI.versions.filter(x=>x==="Director 1.0").length,4);
 assert.equal(comparisonUI.versions.filter(x=>x==="Director 2.0").length,4);
 assert.equal(comparisonUI.versions.filter(x=>x==="Pacing 3.0").length,4);
 assert.equal(comparisonUI.summaries,12);
 assert(comparisonUI.versionShown,"The report must expose the game engine version");
 // Paired A/B must be available independently of the original four-engine lab.
 await page.select("#engineMode","compare31");
 await page.click("#modalActions button:first-child");
 await page.waitForFunction(()=>{
  const status=document.querySelector(".engine-lab-status")?.textContent;
  return status?.includes("Analysen klar")&&
   document.querySelectorAll(".engine-table tbody tr").length===8;
 },{timeout:45000});
 const objectiveCompare=await page.evaluate(()=>({
  modes:[...document.querySelectorAll(".engine-table tbody tr")]
   .map(tr=>tr.querySelector("td:nth-child(2)")?.textContent),
  summaries:document.querySelectorAll(".engine-comparison p").length
 }));
 assert.equal(objectiveCompare.modes.filter(x=>x==="Pacing 3.0").length,4);
 assert.equal(objectiveCompare.modes.filter(x=>x==="Objective 3.1").length,4);
 assert.equal(objectiveCompare.summaries,4,"3.0-vs-3.1 comparison must include paired outcome rows");
 await page.select("#engineMode","compare311");
 await page.click("#modalActions button:first-child");
 await page.waitForFunction(()=>{
  const status=document.querySelector(".engine-lab-status")?.textContent;
  return status?.includes("Analysen klar")&&
   document.querySelectorAll(".engine-table tbody tr").length===8;
 },{timeout:45000});
 const endgameCompare=await page.evaluate(()=>({
  modes:[...document.querySelectorAll(".engine-table tbody tr")]
   .map(tr=>tr.querySelector("td:nth-child(2)")?.textContent),
  summaries:document.querySelectorAll(".engine-comparison p").length
 }));
 assert.equal(endgameCompare.modes.filter(x=>x==="Objective 3.1").length,4);
 assert.equal(endgameCompare.modes.filter(x=>x==="Endgame 3.1.1").length,4);
 assert.equal(endgameCompare.summaries,4,"3.1-vs-3.1.1 must have paired rows");
 assert.equal(await page.$eval("#modalActions button:nth-child(3)",b=>b.disabled),false,
  "A finished report must be exportable as JSON");
 assert.equal(await page.evaluate(()=>localStorage.getItem("japanese-harmony-puzzle-v2")),beforeLab,
  "Running diagnostics must not overwrite a real player's saved game");
 await page.click("#modalActions button:last-child");
 assert.equal(await page.$eval("#modal",el=>el.hidden),true);
 await page.click("#continueButton");await page.waitForSelector(".tile");
 await page.waitForFunction(()=>document.documentElement.classList.contains("has-festival-art"),{timeout:10000});
 const background=await page.evaluate(async()=>{
   const scenes=[1,2,3].map(n=>"./assets/backgrounds/festival-hd-"+n+".avif");
   const dims=[];
   for(const src of scenes){
     const img=new Image();img.src=src;await img.decode();
     dims.push([img.naturalWidth,img.naturalHeight]);
   }
   const backdrop=document.querySelector("#festivalBackdrop");
   const backdropStyle=getComputedStyle(backdrop),backdropRect=backdrop.getBoundingClientRect();
   return {id:document.body.dataset.festival,
     imageSrc:backdrop.currentSrc||backdrop.src,
     imageReady:backdrop.complete&&backdrop.naturalWidth>0,
     imageNaturalWidth:backdrop.naturalWidth,
     imageVisible:backdropStyle.display!=="none"&&Number(backdropStyle.opacity)>.95,
     imageFit:backdropStyle.objectFit,
     backdropWidth:backdropRect.width,backdropHeight:backdropRect.height,
     overlay:getComputedStyle(document.body,"::after").backgroundImage,
     dims,glass:getComputedStyle(document.querySelector(".goal")).backgroundImage};
 });
 assert.deepEqual(background.dims,[[768,1536],[768,1536],[768,1536]],
  "The three supplied Festival Night images must remain at original sharp resolution");
 assert(Number(background.id)>=1&&Number(background.id)<=3,"Only approved HD backgrounds should rotate");
 assert(background.imageReady&&background.imageNaturalWidth===768,"Native HD image must be decoded in the real backdrop element");
 assert(background.imageVisible&&background.imageFit==="cover","The backdrop must actually be visible and cover the screen");
 assert(background.backdropWidth>=390&&background.backdropHeight>=844,"Backdrop layer must cover the phone viewport");
 assert(background.imageSrc.includes("festival-hd-"),"Native image source must reference a genuine HD file");
 assert(background.overlay.includes("gradient"),"Readability scrim must be enabled");
 assert(background.glass.includes("gradient"),"The translucent goal strip must render");
 const festivalAtStart=background.id;

 assert.equal(await page.$$eval(".tile",els=>els.length),49);
 assert.equal(await page.$$eval(".tile",els=>els.filter(el=>el.getAttribute("aria-label")?.includes("stadium 1,")).length),49,"All newly generated mobile tiles must start at stage one");
 assert.equal(await page.$$eval(".tile .stage",els=>els.length),0,"Stage fraction labels should never obscure tiles");
 await page.click(".tile");
 assert((await page.$eval("#selectedInfo",e=>e.textContent)).includes("stadium"),"Selecting a tile should provide stage information in the status line");
 await page.waitForFunction(()=>document.documentElement.classList.contains("has-atlas"),{timeout:10000});
 const atlasState=await page.evaluate(()=>{
  const old=document.querySelector(".tile .piece:not(.new-family) .sprite:not(.sprite-stage1-koi)");
  const style=old?getComputedStyle(old):null;
  const fallback=old?getComputedStyle(old.parentElement.querySelector(".fallback")):null;
  return {
   images:document.querySelectorAll(".tile .sprite").length,
   style:style?.backgroundImage,
   visible:style?.display,
   fallback:fallback?.display,
   loaded:document.documentElement.classList.contains("has-atlas")
  };
 });
 assert.equal(atlasState.images,49,"All 49 cells must have art sprites");
 assert(atlasState.loaded&&atlasState.style?.includes("harmony-atlas.webp"),
  "Approved Japanese art atlas must render on a CLASSIC sprite, not a custom Koi sprite");
 assert.equal(atlasState.visible,"block","Classic sprites must actually be visible");
 assert.equal(atlasState.fallback,"none","Classic atlas must hide emoji fallback");
 assert.equal(await page.$eval("#scorePanel",e=>e.contains(document.querySelector("#scoreCount"))),true,"Score panel must own the score counter");
 assert.equal(await page.$eval("#levelTitle",e=>e.textContent),"First Harmony");
 const collection=await page.evaluate(()=>({
  icons:document.querySelectorAll("#masterpieceCollection .collection-card").length,
  labels:[...document.querySelectorAll("#masterpieceCollection .collection-count")].map(e=>e.textContent),
  noFractions:!document.querySelector("#masterpieceCollection").textContent.includes("/5"),
  visible:!!document.querySelector(".masterpiece-collection")
 }));
 assert.equal(collection.icons,4,"Four active families must appear in the tutorial");
 assert.deepEqual(collection.labels,["0","0","0","0"],"All four counters begin at zero");
 assert(collection.noFractions&&collection.visible);
 const collectionLayout=await page.evaluate(()=>{
  const icon=document.querySelector(".collection-icon");
  const badge=icon.querySelector(".collection-count");
  const main=icon.getBoundingClientRect(),counter=badge.getBoundingClientRect();
  const css=getComputedStyle(icon);
  return {noRing:css.backgroundImage==="none"&&css.borderTopWidth==="0px",
   noFrame:getComputedStyle(icon,"::before").content==="none",
   overlaid:badge.parentElement===icon&&getComputedStyle(badge).position==="absolute",
   lowerLeft:counter.left<main.left+main.width*.5&&counter.top>=main.top+main.height*.4};
 });
 assert(collectionLayout.noRing&&collectionLayout.noFrame,
  "Stage-five art must float freely with no large ring, frame or background");
 assert(collectionLayout.overlaid&&collectionLayout.lowerLeft,
  "One circular integer badge must sit over the icon's lower-left corner");
 assert.equal(await page.$eval("#gameView",e=>e.hidden),false);
 const start=await page.evaluate(()=>{let g=new HarmonyRules.Game(0);return {moves:g.moves,stage:g.board.length,ready:HarmonyRules.validSwaps(g.board).length,level8Goal:HarmonyRules.levels[7].goal.type,level8Count:HarmonyRules.levels[7].goal.count,level8Moves:HarmonyRules.levels[7].moves};});
 assert.equal(start.moves,18);assert.equal(start.stage,49);assert(start.ready>=3);assert.equal(start.level8Goal,"mist");assert.equal(start.level8Count,5);assert.equal(start.level8Moves,33);
 const endless=await page.evaluate(()=>{
  const R=window.HarmonyRules;
  return [10,49,100].map(i=>({number:i+1,type:R.levelConfig(i).goal.type,
   families:R.activeFamilies(i).length,moves:R.levelConfig(i).moves}));
 });
 assert(endless.every(x=>x.type!=="score"&&x.families===5&&
  (x.number<=20?(x.moves>=26&&x.moves<=43):(x.moves>=34))),
  "Journey 11–20 must have reduced moves while the later Journey stays unchanged");
 assert(endless[0].type==="fusion"&&endless[1].type==="mist");
 const missionMix=await page.evaluate(()=>
  [10,11,12,13,14,15,16,17,18,19].map(i=>HarmonyRules.levelConfig(i).goal.type));
 assert.deepEqual(missionMix,["fusion","stage3","mist","fourTurns","mist",
  "pulseHits","mist","fusion","mist","masterpiece"],
  "Objectives 2.0 must vary concrete mission types from Level 11 onwards");
 // Distinct-turn four-match level must preserve pre-update in-flight saves.
 const floor=await page.evaluate(()=>{
  const R=window.HarmonyRules,fresh=new R.Game(13,null,{seed:20261024});
  const old=fresh.save();old.objectiveBalanceVersion=2;
  const restored=new R.Game(13,old,{fastRestore:true});
  return {fresh:fresh.config.goal,old:restored.config.goal,
   label:fresh.goalText(),balance:fresh.objectiveBalanceVersion};
 });
 assert.deepEqual(floor.fresh,{type:"fourTurns",count:4});
 assert.deepEqual(floor.old,{type:"four",count:2});
 assert.equal(floor.label,"Drag med fyrmatchning");
 assert.equal(floor.balance,3);
 // Real 390px phone: faster fog drifts; fusion clears only its output
 // cell, while Harmony Pulse clears cells it actually hits.
 const mistContext=await browser.createBrowserContext();
 try{
  const mistPage=await mistContext.newPage();
  await mistPage.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await mistPage.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  const fixture=await mistPage.evaluate(()=>{
   const R=window.HarmonyRules;
   let chosen=null;
   for(let seed=102;seed<400&&!chosen;seed++){
    const g=new R.Game(12,null,{seed,directorMode:"v3"});
    for(const [a,b] of R.validSwaps(g.board)){
     const board=g.board.map(p=>({...p}));
     [board[a],board[b]]=[board[b],board[a]];
     const survivors=R.scan(board).map(indices=>
      indices.slice().sort((i,j)=>board[j].stage-board[i].stage||
       (i===b?-1:j===b?1:i-j))[0]);
     if(survivors.some(i=>g.mist[i])){chosen={g,pair:[a,b],survivors};break;}
    }
   }
   if(!chosen)throw Error("No seeded valid fusion SURVIVOR on a mist cell");
   const {g,pair,survivors}=chosen;
   localStorage.setItem("japanese-harmony-puzzle-v2",JSON.stringify({
    unlocked:12,bestStars:{},bestScores:{},bestChain:{},sound:false,reduceMotion:false,
    playMode:"v3",run:{level:12,data:g.save()}
   }));
   return {pair,mist:g.mist.filter(Boolean).length,moves:g.moves,
    expectedFirstClear:survivors.filter(i=>g.mist[i])};
  });
  await mistPage.reload({waitUntil:"networkidle2"});
  await mistPage.click("#continueButton");
  assert.equal(await mistPage.$eval("#goalLabel",x=>x.textContent),"Rena dimman");
  assert((await mistPage.$eval("#goalLabel",x=>x.title)).includes("Harmony Pulse"),
   "Mist instructions must explain that Harmony Pulse also clears fog");
  assert.equal(await mistPage.evaluate(()=>document.querySelectorAll(".tile.misted").length),fixture.mist);
  const mistLook=await mistPage.evaluate(()=>{
   const tile=document.querySelector(".tile.misted"),overlay=tile?.querySelector(".harmony-mist");
   const computed=getComputedStyle(overlay);
   const wisp=getComputedStyle(overlay,"::before"),farWisp=getComputedStyle(overlay,"::after");
   return {overlay:!!overlay,back:computed.backgroundImage,
    mask:computed.maskImage||computed.webkitMaskImage,
    animation:computed.animationName,wispAnimation:wisp.animationName,
    farWispAnimation:farWisp.animationName,
    wispDuration:wisp.animationDuration,farWispDuration:farWisp.animationDuration,
    opacity:parseFloat(computed.opacity),wispBack:wisp.backgroundImage,
    farWispBack:farWisp.backgroundImage,pointer:computed.pointerEvents,aria:tile?.getAttribute("aria-label"),
    sprite:!!tile?.querySelector(".piece .sprite")};
  });
  assert(mistLook.overlay&&mistLook.back.includes("gradient")&&
   mistLook.pointer==="none"&&mistLook.aria.includes("magisk dimma")&&mistLook.sprite,
   "Harmony Mist must stay translucent, accessible and preserve the original sprite");
  assert(mistLook.mask.includes("radial-gradient")&&
   mistLook.animation.includes("harmony-mist-breathe")&&
   mistLook.wispAnimation.includes("harmony-mist-drift"),
   "Mist must retain a softened centre and animate cloud wisps");
  assert(mistLook.farWispAnimation.includes("harmony-mist-drift-far")&&
   mistLook.wispDuration!==mistLook.farWispDuration,
   "Motion 1.0 must drift cloud banks independently in opposite directions");
  assert(parseFloat(mistLook.wispDuration)<=2.1&&
   parseFloat(mistLook.farWispDuration)<=2.7,
   "Motion 1.2 must show appreciable flowing cloud movement in the first second");
  assert(mistLook.opacity>=.8&&mistLook.wispBack.includes("gradient")&&
   mistLook.farWispBack.includes("gradient"),
   "Mist 2.1 must render both visible cloud banks on mobile");
  await mistPage.evaluate(()=>{
   window.__mistReleaseSeen=[];
   const observer=new MutationObserver(records=>{
    for(const rec of records)for(const node of rec.addedNodes){
     if(node.nodeType!==1||!node.classList?.contains("mist-release"))continue;
     window.__mistReleaseSeen.push({
      at:Number(node.dataset.at),
      separate:!!node.closest(".mist-release-layer"),
      duration:node.getAnimations()[0]?.effect?.getTiming()?.duration||0
     });
    }
   });
   observer.observe(document.querySelector(".board-shell"),{childList:true,subtree:true});
  });
  const [a,b]=fixture.pair;
  await mistPage.click(".tile:nth-child("+(a+1)+")");
  await mistPage.click(".tile:nth-child("+(b+1)+")");
  await mistPage.waitForFunction(old=>Number(document.querySelector("#movesCount").textContent)<old,
   {timeout:7000},fixture.moves);
  await mistPage.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false",
   {timeout:12000});
  const result=await mistPage.evaluate(()=>{
   const save=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")||"{}");
   return {mistCells:document.querySelectorAll(".tile.misted").length,
    progress:document.querySelector("#goalProgress")?.textContent,
    storedMist:save.run?.data?.mist,storedCleared:save.run?.data?.mistCleared,
    stars:save.run?.data?.starsAtGoal,active:document.querySelectorAll(".harmony-mist").length};
  });
  assert(result.mistCells<=fixture.mist-fixture.expectedFirstClear.length&&
   result.active===result.mistCells&&Number(result.progress.split("/")[0])>=fixture.expectedFirstClear.length,
   "Fusion on a mist-covered output cell must cleanse fog and update goal");
  assert(Array.isArray(result.storedMist)&&result.storedMist.filter(Boolean).length===result.mistCells&&
   result.storedCleared>=1,
   "Fog state must persist in the regular save without moving to falling pieces");
  const releases=await mistPage.evaluate(()=>window.__mistReleaseSeen);
  assert(releases.length>=1&&releases.every(item=>item.separate&&item.duration===440),
   "Every newly-cleared mist patch must float away in its own short FX layer");
  await mistPage.waitForFunction(()=>!document.querySelector(".mist-release"),{timeout:3500});
  // New skill-based stars must survive a restart even with a modest score.
  // The legacy score recalibration is only for archives predating Objectives.
  await mistPage.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   const save=JSON.parse(localStorage.getItem(key));
   save.run=null;save.objectiveArchiveVersion=2;save.unlocked=11;
   save.bestScores={...save.bestScores,"10":2400};
   save.bestStars={...save.bestStars,"10":3};
   localStorage.setItem(key,JSON.stringify(save));
  });
  await mistPage.reload({waitUntil:"networkidle2"});
  const skillStars=await mistPage.evaluate(()=>({
   saved:JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).bestStars["10"],
   label:document.querySelectorAll(".level-tile")[10]?.textContent||""
  }));
  assert.equal(skillStars.saved,3,"New mission stars must not be downgraded by historical score recalibration");
  assert(skillStars.label.includes("★★★"),"The level list must retain three earned mission stars");
 }finally{await mistContext.close();}
 // Harmony Resonance 1.0: noninteractive board links, semantic scoring and
 // successful manual fusion from an already-linked stage-three object.
 const resonanceVisual=await page.evaluate(()=>{
  const layer=document.querySelector("#resonanceLinks");
  const style=getComputedStyle(layer);
  const anchor=document.querySelector(".tile");
  return {layerExists:!!layer,pointerEvents:style.pointerEvents,zIndex:style.zIndex,
   boardChildren:document.querySelectorAll(".board .tile").length,
   overlaySibling:layer.previousElementSibling?.id==="board"};
 });
 assert(resonanceVisual.layerExists&&resonanceVisual.overlaySibling);
 assert.equal(resonanceVisual.pointerEvents,"none","Resonance overlay must never swallow tap gestures");
 assert.equal(resonanceVisual.boardChildren,49);
 // Visual Polish 1.1: the glow must FLOW (not remain a static gradient),
 // a new link must have a one-shot discovery pulse, and both surfaces must
 // stay non-interactive. These are measured in the rendered mobile CSS.
 const resonancePolish=await page.evaluate(()=>{
  const layer=document.querySelector("#resonanceLinks");
  const line=document.createElement("span");
  line.className="resonance-link resonance-new mature";
  line.style.width="22px";layer.append(line);
  const styles=getComputedStyle(line);
  const stream=getComputedStyle(line,"::after");
  const tile=document.querySelector(".tile");
  tile.classList.add("resonance-awakening");
  const discovery=getComputedStyle(tile,"::before");
  const data={
   linkPointer:styles.pointerEvents,
   streamName:stream.animationName,
   streamDuration:parseFloat(stream.animationDuration),
   pulseName:discovery.animationName,
   pulseDuration:parseFloat(discovery.animationDuration),
   pseudoPointer:discovery.pointerEvents
  };
  tile.classList.remove("resonance-awakening");
  line.remove();
  return data;
 });
 assert.equal(resonancePolish.linkPointer,"none","Animated thread must not block touches");
 assert(resonancePolish.streamName.includes("resonance-current"),"The filament must visibly flow");
 assert(resonancePolish.streamDuration>=4,"The filament must flow slowly");
 assert(resonancePolish.pulseName.includes("resonance-discovery"),"New opportunities need a one-shot pulse");
 assert(resonancePolish.pulseDuration>0&&resonancePolish.pulseDuration<=1.1);
 assert.equal(resonancePolish.pseudoPointer,"none"); 
 const resonanceReduced=await page.evaluate(()=>{
  document.body.classList.add("harmony-reduced-motion");
  const layer=document.querySelector("#resonanceLinks");
  const line=document.createElement("span");line.className="resonance-link mature";
  layer.append(line);
  const tile=document.querySelector(".tile");tile.classList.add("resonance-awakening");
  const data={
   streamDisplay:getComputedStyle(line,"::after").display,
   streamAnimation:getComputedStyle(line,"::after").animationName,
   bloomDisplay:getComputedStyle(tile,"::before").display
  };
  line.remove();tile.classList.remove("resonance-awakening");
  document.body.classList.remove("harmony-reduced-motion");
  return data;
 });
 assert.equal(resonanceReduced.streamDisplay,"none");
 assert.equal(resonanceReduced.bloomDisplay,"none");
 assert.equal(resonanceReduced.streamAnimation,"none");

 const resonanceLogic=await page.evaluate(()=>{
  const R=window.HarmonyRules,families=R.activeFamilies(0);
  const b=Array.from({length:49},(_,i)=>({
   id:i+1,stage:1,family:families[(Math.floor(i/7)+i%7)%5]
  }));
  b[22]={id:23,stage:3,family:"lantern"};
  b[23]={id:24,stage:1,family:"lantern"};
  b[24]={id:25,stage:1,family:"koi"};
  b[25]={id:26,stage:1,family:"lantern"};
  const links=R.resonanceLinks(b);
  const game=new R.Game(0,null,{seed:141});
  game.board=b;
  const before=game.moves;
  const result=game.swap(24,25);
  const echoes=result.events.filter(e=>e.type==="echo");
  return {link:links.some(l=>l.anchor===22&&l.partner===23),
   valid:result.ok,echoCount:echoes.length,bonus:echoes[0]?.scoreDelta,
   spent:before-game.moves,echoesSaved:game.save().echoes};
 });
 assert(resonanceLogic.link&&resonanceLogic.valid);
 assert.equal(resonanceLogic.echoCount,1);
 assert.equal(resonanceLogic.bonus,125);
 assert.equal(resonanceLogic.spent,1);
 assert.equal(resonanceLogic.echoesSaved,1);
 // Engine Lab 2.0 must expose Echo metrics for longitudinal tuning.
 assert(await page.evaluate(()=>!!window.HarmonyDiagnostics?.create(window.HarmonyRules).run({
  levels:[0],strategies:["random"],modes:["standard"],trials:1,seed:19
 }).results[0].hasOwnProperty("avgEchoes")));
 const box=await page.$eval("#board",e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
 assert(box.width>300&&Math.abs(box.width-box.height)<2,"7x7 board should be square and fill phone width");

 // Board Glass 1.0: the playable 7x7 surface and ordinary cell backgrounds
 // must actually be translucent midnight blue after ALL mobile CSS overrides.
 // This is a computed-style check, not just a brittle source-string assertion.
 const glass=await page.evaluate(()=>{
  const bg=selector=>{
   const style=getComputedStyle(document.querySelector(selector));
   return {background:style.backgroundColor,image:style.backgroundImage,
    border:style.borderColor,shadow:style.boxShadow};
  };
  return {shell:bg(".game-view .board-shell"),board:bg(".game-view .board"),
   goal:bg(".game-view .goal"),odd:bg(".game-view .tile:nth-child(3)"),
   even:bg(".game-view .tile:nth-child(2)")};
 });
 const channels=color=>{
  const match=color.match(/^rgba?\(([^)]+)\)$/);
  assert(match,"Expected CSS color, received "+color);
  return match[1].split(",").map(Number);
 };
 for(const [name,item] of [["odd",glass.odd],["even",glass.even]]){
  const [r,g,b,a]=channels(item.background);
  assert(b>r&&g>r,"Regular "+name+" tile must be blue/teal rather than beige: "+item.background);
  assert(a<1&&a>.55,"Regular "+name+" tile must be partly transparent, not solid: "+item.background);
 }
 assert(glass.shell.image.includes("linear-gradient")&&glass.board.image.includes("linear-gradient"),
  "Shell and board must share dark blue translucent glass gradients");
 assert(glass.shell.shadow.includes("216, 173, 114")||glass.shell.shadow.includes("216,173,114"),
  "Existing gold inset frame should remain around the glass playfield");

 // Board Glass 1.1: tile center light is an image layer, not an opaque
 // replacement that would erase the existing selected/swap/pulse tints.
 const polish=await page.evaluate(()=>{
  const board=document.querySelector(".game-view .board");
  const tile=document.querySelector(".game-view .tile:nth-child(3)");
  const even=document.querySelector(".game-view .tile:nth-child(2)");
  // Measure the final CSS states, not the first frame of the 80ms tint transition.
  tile.style.setProperty("transition","none","important");
  const view=e=>({color:getComputedStyle(e).backgroundColor,image:getComputedStyle(e).backgroundImage});
  const base=view(tile),alternate=view(even);
  const states={};
  for(const state of ["swapped","pulsed","harvested","shuffling"]){
   tile.classList.add(state);
   states[state]=view(tile);
   tile.classList.remove(state);
  }
  return {gap:getComputedStyle(board).gap,base,alternate,states,
   spriteFilter:getComputedStyle(tile.querySelector(".piece .sprite")).filter,
   selectedBorder:(()=>{
    tile.classList.add("selected");
    const shadow=getComputedStyle(tile).boxShadow;
    tile.classList.remove("selected");
    return shadow;
   })()};
 });
 const gridGap=parseFloat(polish.gap);
 assert(gridGap>=1.4&&gridGap<=1.9,
  "Polished grid should be subtly thinner than the former 2px: "+polish.gap);
 assert(polish.base.image.includes("radial-gradient")&&polish.alternate.image.includes("radial-gradient"),
  "All glass tiles require a subtle central highlight, not a flat fill");
 assert.notEqual(polish.base.image,polish.alternate.image,
  "Alternating glass rows should have slightly different depth");
 assert(polish.spriteFilter.includes("drop-shadow"),
  "Transparent item art must have a subtle silhouette shadow");
 for(const [name,state] of Object.entries(polish.states)){
  assert.notEqual(state.color,polish.base.color,
   "Glass depth must preserve "+name+" event tint rather than overwrite it");
  assert(state.image.includes("radial-gradient"),
   "Glass depth should persist throughout "+name+" state");
 }
 assert(polish.selectedBorder.includes("242, 198, 110"),
  "Gold selected-state marker must remain visible after polish");


 fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
 await page.waitForFunction(()=>document.documentElement.classList.contains("has-festival-hd"),{timeout:15000});
 const loadedBackground=await page.evaluate(()=>{
   const img=document.querySelector("#festivalBackdrop");
   return {url:img.currentSrc||img.src,ready:img.complete&&img.naturalWidth>0,
     display:getComputedStyle(img).display,
     pseudo:getComputedStyle(document.body,"::before").display};
 });
 assert(loadedBackground.ready&&loadedBackground.url.includes("festival-hd-"),"HD image must be rendered by an actual loaded DOM image");
 assert.equal(loadedBackground.display,"block","Background element must be visible");
 assert.equal(loadedBackground.pseudo,"none","Old atlas should not be composited when HD is loaded");
 await page.screenshot({path:"/tmp/daisugi-bloom/japanese-harmony-mobile.png",fullPage:true});
 const layout=await page.evaluate(()=>{
  const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width}};
  return {header:getComputedStyle(document.querySelector(".topbar")).display,
   moves:rect(".moves"),score:rect("#scorePanel"),board:rect(".board-shell"),
   viewport:window.innerHeight,bodyWidth:document.body.scrollWidth};
 });
 assert.equal(layout.header,"none","Playing must not show the web-style header");
 assert(layout.moves.bottom<layout.board.top&&layout.score.bottom<layout.board.top,"Gameplay plaques should float above the board");
 assert(layout.board.width>layout.score.width*1.7,"Board must visually dominate the mobile HUD");
 assert(layout.board.bottom<layout.viewport,"Board should fit on the initial phone screen");
 assert.equal(await page.$(".game-dock"),null,"No level/restart dock belongs below the board");
 assert.equal(await page.$("#gameTip"),null,"Gameplay must not show instructional text beneath the board");
 assert.equal(await page.$("#endButton"),null,"End-level action belongs in the pause menu only");
 assert(layout.board.top-layout.moves.bottom>55,"Board should sit below HUD with breathing room");
 assert(layout.bodyWidth<=390,"Gameplay must not scroll horizontally");

 // Board & Icon Readability 1.0: genuine cell and art dimensions on 390px mobile.
 const boardReadability=await page.evaluate(()=>{
  const board=document.querySelector("#board").getBoundingClientRect();
  const tile=document.querySelector(".tile").getBoundingClientRect();
  const piece=document.querySelector(".tile .piece").getBoundingClientRect();
  const sprite=document.querySelector(".tile .piece .sprite").getBoundingClientRect();
  return {width:board.width,height:board.height,cell:tile.width,
   artRatio:piece.width/tile.width,spriteRatio:sprite.width/tile.width,
   count:document.querySelectorAll("#board > .tile").length};
 });
 assert(boardReadability.width>=355,"Phone playfield must reclaim frame space: "+JSON.stringify(boardReadability));
 assert(Math.abs(boardReadability.width-boardReadability.height)<2,"Expanded 7x7 board must remain square");
 assert(boardReadability.cell>=48,"Phone tile interaction area must grow alongside board");
 assert(boardReadability.artRatio>=.99&&boardReadability.spriteRatio>=1.03,
  "Illustrated objects should fill more of their own tile, without remapping atlases");
 assert.equal(boardReadability.count,49,"Larger board must retain exactly 49 playable cells");
 await page.click("#pauseButton");assert.equal(await page.$eval("#modal",x=>x.hidden),false);
 assert.equal(await page.$eval("#modalTitle",e=>e.textContent),"Spelmeny");
 assert((await page.$eval("#modalActions",e=>e.textContent)).includes("Börja om nivån"));
 assert((await page.$eval("#modalActions",e=>e.textContent)).includes("Till Goshuincho"));
 const pauseLayout=await page.evaluate(()=>{
  const actions=document.querySelector("#modalActions");
  const buttons=[...actions.querySelectorAll("button")];
  return {columns:getComputedStyle(actions).gridTemplateColumns.split(" ").length,
   compact:actions.classList.contains("pause-menu-actions"),
   primary:buttons[0].textContent,buttonCount:buttons.length,
   resumeHeight:buttons[0].getBoundingClientRect().height,
   utilityWidths:[buttons[3],buttons[4]].map(b=>b?.getBoundingClientRect().width||0),
   modalHeight:document.querySelector(".modal-inner").getBoundingClientRect().height,
   screenHeight:window.innerHeight};
 });
 assert(pauseLayout.compact&&pauseLayout.columns===2,"Pause menu should group secondary actions in two columns");
 assert.equal(pauseLayout.primary,"Fortsätt spela");
 assert(pauseLayout.resumeHeight>=44,"Resume remains the prominent tap target");
 assert(pauseLayout.utilityWidths.every(w=>w>70),"Help and settings must remain tappable");
 assert(pauseLayout.modalHeight<=pauseLayout.screenHeight,"Pause modal should fit the phone view");
 await page.evaluate(()=>document.querySelector("#modalActions button:nth-child(3)").click());
 assert((await page.$eval("#modalContent",e=>e.textContent)).includes("Power Moves"));
 await page.click("#modalActions button");assert.equal(await page.$eval("#modal",x=>x.hidden),true);
 // Coordinate regression: position real sprite clones at a far-right and
 // lower-row tile, not at the fusion layer's top-left. The previous
 // "inset:auto!important" declaration overrode JS inline left/top and failed
 // exactly this check on mobile.
 // The real fusion animation below verifies ghost positions inside the actual game's FX layer.
 // Regression: a real mobile fusion must reuse the same 49 tile DOM nodes.
 // Recreating those nodes for every event previously caused expensive mobile jank.
 // Previous assertion selected tile 0. Clear that selection before the swap test.
 await page.click(".tile:nth-child(1)");
 const stableTile=await page.$(".tile");
 // Invalid adjacent swaps are visual-only. They rebound without consuming
 // moves, changing the grid, or leaving the board permanently busy.
 const invalid=await page.evaluate(()=>{
  const families={Sakura:"sakura",Lykta:"lantern",Koi:"koi",Solfjäder:"fan",Bonsai:"bonsai"};
  const board=[...document.querySelectorAll(".tile")].map((el,i)=>({
   family:families[el.getAttribute("aria-label").split(",")[0]],stage:1,id:i+1
  }));
  for(let a=0;a<49;a++)for(const b of HarmonyRules.neighbors(a)){
   const trial=board.map(p=>({...p}));
   [trial[a],trial[b]]=[trial[b],trial[a]];
   if(!HarmonyRules.scan(trial).some(g=>g.includes(a)||g.includes(b)))return [a,b];
  }
  return null;
 });
 assert(invalid,"A generated board should contain an invalid adjacent swap");
 await page.evaluate(()=>{
  window.__invalidMotion=[];
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   if(this.matches(".piece"))window.__invalidMotion.push(frames);
   return animate.call(this,frames,options);
  };
 });
 const invalidMoves=await page.$eval("#movesCount",el=>el.textContent);
 const invalidScore=await page.$eval("#scoreCount",el=>el.textContent);
 const invalidBoard=await page.$$eval(".tile",els=>els.map(e=>e.getAttribute("aria-label")).join("|"));
 await page.click(".tile:nth-child("+(invalid[0]+1)+")");
 await page.click(".tile:nth-child("+(invalid[1]+1)+")");
 await page.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false",{timeout:5000});
 const bounced=await page.evaluate(()=>window.__invalidMotion.filter(frames=>
  frames.length>=4&&frames.some(k=>typeof k.transform==="string" &&
   k.transform.includes("translate3d(")&&
   !k.transform.includes("translate3d(0,0,0)"))).length>=2);
 assert(bounced,"Invalid swap must animate a physical forward-and-back rebound");
 assert.equal(await page.$eval("#movesCount",el=>el.textContent),invalidMoves);
 assert.equal(await page.$eval("#scoreCount",el=>el.textContent),invalidScore);
 assert.equal(await page.$$eval(".tile",els=>els.map(e=>e.getAttribute("aria-label")).join("|")),invalidBoard);
 assert.equal(await page.$$eval(".tile",els=>els.length),49);
 // The rejected target remains selected; clear it before the valid swap.
 await page.click(".tile:nth-child("+(invalid[1]+1)+")");
 const swap=await page.evaluate(()=>{
  const fromName={Sakura:"sakura",Lykta:"lantern",Koi:"koi",Solfjäder:"fan",Bonsai:"bonsai"};
  const cells=Array.from(document.querySelectorAll(".tile")).map((el,i)=>{
   const family=fromName[el.getAttribute("aria-label").split(",")[0]];
   return {family,stage:1,id:i+1};
  });
  return HarmonyRules.validSwaps(cells)[0];
 });
 assert(swap&&swap.length===2,"At least one playable swap must be visible");
 await page.evaluate(()=>{
   window.__kineticAnimationCount=0;
   window.__gatherMotion=[];
   window.__sparkleMotions=[];
   window.__dustOverlappedGather=false;
   const realAnimate=Element.prototype.animate;
   Element.prototype.animate=function(...args){
     if(this.matches(".piece, .fusion-ghost, .pulse-dot"))window.__kineticAnimationCount++;
     if(this.matches(".fusion-afterglow-spark")){
      const moving=[...document.querySelectorAll(".fusion-ghost")].some(g=>
       g.getAnimations().some(a=>a.playState==="running"));
      if(moving)window.__dustOverlappedGather=true;
      window.__sparkleMotions.push({
       frames:args[0],duration:args[1]?.duration,delay:args[1]?.delay,
       phase:this.dataset.phase,easing:args[1]?.easing
      });
     }
     if(this.matches(".fusion-ghost")){
      const frames=args[0]||[],options=args[1]||{};
      const ghostRect=this.getBoundingClientRect();
      const sourceIndex=[...document.querySelectorAll(".tile")].findIndex(tile=>{
       const tileRect=tile.getBoundingClientRect();
       return Math.abs(ghostRect.left-tileRect.left)<2&&Math.abs(ghostRect.top-tileRect.top)<2;
      });
      window.__gatherMotion.push({frames,duration:options.duration,sourceIndex});
     }
     return realAnimate.apply(this,args);
   };
 });
 await page.evaluate(()=>{
   window.__scoreFxSeen={score:0,trail:0,burst:0,ring:0,impact:0,milestone:0,family:0,stage:0,fusionFlow:0,fusionAfterglow:0,afterglowPositions:[],afterglowColors:[],afterglowOnEmpty:true,pulseTrace:0,pulseLanding:0,pulseSource:0,masterpiece:0,flowers:0,diamonds:0,stars:0,diamondColor:"",diamondGlow:"",diamondFontSize:0,unified:0,maxTokenWidth:0,maxFamilyToTileRatio:0};
   window.__scoreFxWatcher=new MutationObserver(records=>{
     for(const rec of records)for(const node of rec.addedNodes){
       if(node.nodeType!==1||!node.classList)continue;
       if(node.classList.contains("score-flight-token"))window.__scoreFxSeen.score++;
       if(node.classList.contains("score-trail-dot"))window.__scoreFxSeen.trail++;
       if(node.classList.contains("fusion-spark"))window.__scoreFxSeen.burst++;
       if(node.classList.contains("fusion-flow-bead"))window.__scoreFxSeen.fusionFlow++;
       if(node.classList.contains("fusion-afterglow-spark")){
        window.__scoreFxSeen.fusionAfterglow++;
        window.__scoreFxSeen.afterglowPositions.push(node.style.left+"|"+node.style.top);
        window.__scoreFxSeen.afterglowColors.push(node.className);
        if(node.dataset.phase!=="fusion"&&
         document.querySelector('.tile[data-index="'+node.dataset.at+'"]')?.getAttribute("aria-label")!=="Tom ruta")
          window.__scoreFxSeen.afterglowOnEmpty=false;
       }
       if(node.classList.contains("harmony-firework-particle")){
        const shape=node.dataset.fireworkShape;
        if(shape==="flower")window.__scoreFxSeen.flowers++;
        if(shape==="diamond"){
         window.__scoreFxSeen.diamonds++;
         const style=getComputedStyle(node);
         window.__scoreFxSeen.diamondColor=style.color;
         window.__scoreFxSeen.diamondGlow=style.textShadow;
         window.__scoreFxSeen.diamondFontSize=parseFloat(style.fontSize);
        }
        if(shape==="star")window.__scoreFxSeen.stars++;
       }
       if(node.classList.contains("harmony-evolution"))window.__scoreFxSeen.unified++;
       if(node.classList.contains("fusion-ring"))window.__scoreFxSeen.ring++;
       if(node.classList.contains("score-impact-ring"))window.__scoreFxSeen.impact++;
       if(node.classList.contains("fusion-milestone"))window.__scoreFxSeen.milestone++;
        if(node.classList.contains("evo-family")){
         window.__scoreFxSeen.family++;
         const tileWidth=document.querySelector(".tile")?.getBoundingClientRect().width||1;
         window.__scoreFxSeen.maxFamilyToTileRatio=Math.max(window.__scoreFxSeen.maxFamilyToTileRatio,
          parseFloat(getComputedStyle(node).width)/tileWidth);
       }
       if(node.classList.contains("evolution-stage-label"))window.__scoreFxSeen.stage++;
       if(node.classList.contains("pulse-trace"))window.__scoreFxSeen.pulseTrace++;
       if(node.classList.contains("pulse-target-hit"))window.__scoreFxSeen.pulseLanding++;
        if(node.classList.contains("pulse-source-halo"))window.__scoreFxSeen.pulseSource++;
        if(node.classList.contains("masterpiece-halo"))window.__scoreFxSeen.masterpiece++;
       if(node.classList.contains("score-flight-token"))window.__scoreFxSeen.maxTokenWidth=Math.max(window.__scoreFxSeen.maxTokenWidth,node.getBoundingClientRect().width);
     }
   });
   window.__scoreFxWatcher.observe(document.body,{childList:true,subtree:true});
 });
 assert(await page.evaluate(()=>!!window.HarmonyAudio&&typeof window.HarmonyAudio.play==="function"),
  "Japanese Harmony 4.2 audio must load before the game script");
 const beforePoints=Number((await page.$eval("#scoreCount",e=>e.textContent)).replace(/\D/g,""));
 const beforeMoves=Number(await page.$eval("#movesCount",e=>e.textContent));
 await page.click(".tile:nth-child("+(swap[0]+1)+")");
 await page.click(".tile:nth-child("+(swap[1]+1)+")");
 await page.waitForFunction(moves=>Number(document.querySelector("#movesCount").textContent)===moves-1,{timeout:7000},beforeMoves);
 assert(await page.evaluate(tile=>tile===document.querySelector(".tile"),stableTile),
  "Tile DOM was replaced during fusion; expected a stable mobile render surface");
 assert.equal(await page.$$eval(".tile",els=>els.length),49);
 
 await page.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false",{timeout:7000});
 const kineticCount=await page.evaluate(()=>window.__kineticAnimationCount||0);
 assert(kineticCount>=3,"Swap and fusion should animate actual moving objects, not just pause and redraw: "+kineticCount);
 const gather=await page.evaluate(()=>window.__gatherMotion);
 assert(gather.length>=2,"A normal fusion must physically carry two source pieces into the survivor");
 assert(gather.every(g=>g.sourceIndex>=0),"Every real fusion ghost must start at a board cell, not the FX layer origin: "+JSON.stringify(gather.map(g=>g.sourceIndex)));
 assert(new Set(gather.map(g=>g.sourceIndex)).size>=2,"Fusion sources must originate from different board cells");
 assert(gather.every(g=>g.duration===280&&g.frames.length===6&&
  g.frames.slice(0,-1).every(k=>k.opacity===1)&&g.frames.at(-1).opacity>=.9&&
  g.frames.at(-1).offset===1),
  "A 3–5 match must use the restored 280ms gathering animation on its real board coordinates");

 const sparkleMotions=await page.evaluate(()=>window.__sparkleMotions);
 assert(sparkleMotions.length>=8,
  "Vacated squares need several drifting motes, not static centre dots");
 assert(new Set(sparkleMotions.map(m=>m.delay)).size>=4,
  "Dust should appear at different moments");
 assert(await page.evaluate(()=>window.__dustOverlappedGather),
  "Seamless fusion dust must start while the original moving ghosts are still animating");
 assert(sparkleMotions.every(m=>m.frames.length===5&&m.easing==="linear"&&
  m.phase==="fusion"&&m.frames[0].opacity===0&&m.frames.at(-1).opacity===0&&
  m.frames[2].opacity>=.70&&m.duration>=395&&m.duration<=470&&
  m.delay>=75&&m.duration+m.delay<=670&&
  m.frames[2].transform!==m.frames[0].transform),
  "Fusion dust must begin during the original gathering and gently linger into refill");
 assert(gather.every(g=>{
  const xs=g.frames.map(k=>Number(/translate3d\(([-\d.]+)px,/.exec(k.transform)?.[1]));
  const ys=g.frames.map(k=>Number(/,([-\d.]+)px,0\)/.exec(k.transform)?.[1]));
  if(xs.some(x=>!Number.isFinite(x))||ys.some(y=>!Number.isFinite(y)))return false;
  const x0=xs[0],y0=ys[0],dist=Math.hypot(xs.at(-1)-x0,ys.at(-1)-y0);
  return Math.abs(xs.at(-1)-x0)+Math.abs(ys.at(-1)-y0)>0&&
   g.frames.every((k,i)=>i===0||k.offset>g.frames[i-1].offset)&&
   xs.every((x,i)=>i===0||Math.hypot(x-x0,ys[i]-y0)>=
    Math.hypot(xs[i-1]-x0,ys[i-1]-y0)-.5);
 }),"Consumed sprites must smoothly converge without jumping backwards");
 assert(await page.evaluate(()=>!!window.__invalidMotion.length),"Rebound keyframes should have been recorded");
 await page.waitForFunction(previous=>Number((document.querySelector("#scoreCount")?.textContent||"").replace(/\D/g,""))>previous,{timeout:5000},beforePoints);
 // Count animation must finish with the earned amount, not stick on an
 // intermediate number or drift while multiple rewards are arriving.
 await new Promise(resolve=>setTimeout(resolve,600));
 const scoreAfterTween=Number((await page.$eval("#scoreCount",e=>e.textContent)).replace(/\D/g,""));
 assert(scoreAfterTween>beforePoints,"Score must visibly count upward after the flying token arrives");
 const fx=await page.evaluate(()=>window.__scoreFxSeen);
 assert(fx.burst>=3,"Expected a small fusion burst around the survivor: "+JSON.stringify(fx));
 assert.equal(fx.fusionFlow,0,"Fusion Flow travelling beads must be removed when restoring original movement");
 assert(fx.fusionAfterglow>=10&&fx.afterglowOnEmpty,
  "Every emptied fusion cell needs several twinkling points rather than one dot: "+JSON.stringify(fx));
 assert(new Set(fx.afterglowPositions).size>=4&&
  fx.afterglowColors.some(cls=>cls.includes("dust-star"))&&
  fx.afterglowColors.some(cls=>cls.includes("dust-mote")),
  "Magic dust should vary in position and size with occasional tiny stars");
 assert.equal(await page.evaluate(()=>document.querySelectorAll(".fusion-flow-bead, .fusion-afterglow-spark").length),0,
  "All short-lived fusion particles should be removed by the end of the move");
 assert(fx.flowers>=1&&fx.diamonds>=1&&fx.stars>=1,
  "Every fusion needs glowing pink flowers, pearl-white crystals and golden stars: "+JSON.stringify(fx));
 assert.equal(fx.diamondColor,"rgb(255, 249, 238)",
  "The diamond should be pearl-white rather than the former ice blue: "+JSON.stringify(fx));
 assert(fx.diamondGlow.includes("rgb(")&&fx.diamondGlow!=="none",
  "The pearl-white diamond needs champagne-gold glow");
 assert(fx.diamondFontSize>=18,
  "The mini-firework symbols should read more clearly on a phone");
 assert(fx.unified>=1,"All families must use the shared Sakura-inspired evolution glow");
 assert(fx.family>=1,"Every successful fusion must show its family identity: "+JSON.stringify(fx));
 assert(fx.stage>=1,"Even a basic 3-match must display its upgraded stage clearly: "+JSON.stringify(fx));
 assert(fx.maxFamilyToTileRatio>=1.25,"Family effect must be visibly larger than its tile on mobile: "+JSON.stringify(fx));
 assert(fx.score>=1&&fx.trail>=2,"Expected a flying point label with a lightweight trailing stream: "+JSON.stringify(fx));
 assert.equal(fx.ring,0,"The disliked circular ring must not appear on ordinary fusions");
 assert(fx.impact>=1,"Incoming points must pulse at the score field: "+JSON.stringify(fx));
 assert(fx.maxTokenWidth>=35,"Points must have a legible sized label: "+JSON.stringify(fx));
 assert.equal(await page.$$eval(".tile .stage",els=>els.length),0,"Score FX must not reintroduce permanent labels");
 assert.equal(await page.evaluate(()=>document.body.dataset.festival),festivalAtStart,"Backdrop must not change during a turn");
 await page.evaluate(()=>window.__scoreFxWatcher.disconnect());
 assert(await page.evaluate(()=>!!window.HarmonyPerf&&typeof window.HarmonyPerf.create==="function"),
  "Mobile 4.3 frame profiler should load before gameplay");
 // The score FX can finish before the turn's async cleanup has released
 // its busy guard. Pause must be tested after the actual turn completes.
 await page.waitForFunction(()=>document.querySelector("#board")?.getAttribute("aria-busy")==="false",{timeout:12000});
 // A complete goal may already have opened the result overlay. Close only
 // that overlay before checking the dedicated in-game pause menu.
 await page.evaluate(()=>{const modal=document.querySelector("#modal");if(!modal.hidden)modal.hidden=true;});
 await page.click("#pauseButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Spelmeny",{timeout:5000});
 await page.evaluate(()=>{
  const button=[...document.querySelectorAll("#modalActions button")].find(b=>b.textContent==="Prestanda");
  if(!button)throw new Error("Performance action missing from open game menu");
  button.click();
 });
 assert.equal(await page.$eval("#modalTitle",e=>e.textContent),"Prestanda");
 const report=await page.$eval("#modalContent",e=>e.textContent);
 assert(report.includes("Mätta drag")&&report.includes("95:e percentilen")&&report.includes("Startade animationer"),
  "Performance report should expose turn metrics, not fake benchmark values");
 assert(report.includes("Inga data skickas"),"Diagnostics must be local-only");
 await page.click("#modalActions button");assert.equal(await page.$eval("#modal",x=>x.hidden),true);


 await page.click("#pauseButton");
 await page.evaluate(()=>{
  const restart=[...document.querySelectorAll("#modalActions button")].find(b=>b.textContent==="Börja om nivån");
  if(!restart)throw new Error("Restart option missing from pause menu");
  restart.click();
 });
 const festivalAfterRestart=await page.evaluate(()=>document.body.dataset.festival);
 assert.notEqual(festivalAfterRestart,festivalAtStart,"A restarted level must choose a different background");
 assert.equal(await page.$$eval(".tile",els=>els.length),49);
  await page.click("#pauseButton");
 await page.evaluate(()=>[...document.querySelectorAll("#modalActions button")].find(b=>b.textContent==="Till nivåval").click());
 assert.equal(await page.$eval("#menuView",x=>x.hidden),false);
 assert.equal(await page.$eval("#gameView",x=>x.hidden),true);
 assert.notEqual(await page.$eval(".topbar",e=>getComputedStyle(e).display),"none","Level select must restore main header");
 // Regression: if an HD URL fails after deployment, a known-good image must
 // replace it, not leave a plain dark background.
 await page.evaluate(()=>{document.querySelector("#festivalBackdrop").src="./assets/backgrounds/missing-hd-regression.avif";});
 await page.waitForFunction(()=>document.body.classList.contains("festival-fallback"),{timeout:5000});
 const fallback=await page.evaluate(()=>({image:getComputedStyle(document.body,"::before").backgroundImage,
   visible:getComputedStyle(document.body,"::before").display}));
 assert(fallback.image.includes("festival-night-six.avif")&&fallback.visible!=="none","Broken HD URL must trigger the legacy scenic fallback");
 // Fair Refill & Shuffle 2.0: execute a real identity-safe reshuffle
 // in the mobile browser, including developed objects and the no-free-match
 // contract. The historical shuffle changed family labels in place.
 const shuffleContract=await page.evaluate(()=>{
  const R=window.HarmonyRules;
  const families=R.activeFamilies(0);
  const input=Array.from({length:49},(_,i)=>({
   id:i+1,stage:i%4+1,
   family:families[(Math.floor(i/7)+i%7)%5]
  }));
  let x=20261022;
  const rand=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
  const shuffled=R.fairShuffle(input,rand);
  const sorted=board=>board.slice().sort((a,b)=>a.id-b.id);
  return {
   oldMoves:R.validSwaps(input).length,
   legal:R.validSwaps(shuffled).length,
   freebies:R.scan(shuffled).length,
   identical:JSON.stringify(sorted(input))===JSON.stringify(sorted(shuffled)),
   moved:shuffled.filter((p,i)=>p.id!==input[i].id).length
  };
 });
 assert.equal(shuffleContract.oldMoves,0,"Shuffling requires a genuinely locked board");
 assert.equal(shuffleContract.freebies,0,"Fair shuffle must never give a free fusion");
 assert(shuffleContract.legal>=3,"Fair shuffle must create playable moves");
 assert(shuffleContract.identical&&shuffleContract.moved>0,
  "Fair shuffle must move physical object identities, including all evolved stages");

 // Expansion 5.0 regression: all nine identities appear in the first
 // three levels; exactly five, with every selected family represented.
 const expansion=await page.evaluate(()=>{
  const rows=[0,1,2,3,4,5,6,7,8,9].map(index=>{
   const g=new HarmonyRules.Game(index);
   return {index,active:g.families,actual:[...new Set(g.board.map(p=>p.family))],
    freeMatches:HarmonyRules.scan(g.board).length,valid:HarmonyRules.validSwaps(g.board).length};
  });
  return {all:HarmonyRules.families,rows};
 });
 assert.equal(expansion.all.length,9);
 const appeared=new Set();
 for(const row of expansion.rows){
  assert.equal(row.active.length,4);
  assert.deepEqual(row.actual.slice().sort(),row.active.slice().sort(),
   "All four chosen families must actually be on board for level "+(row.index+1));
  assert.equal(row.freeMatches,0);
  assert(row.valid>=3);
  row.active.forEach(f=>appeared.add(f));
  if(row.index===7)assert.equal(appeared.size,9,"All nine families must have appeared by level 8");
 }
 // Level 3 features Origami and level 5 features Ryu in the four-family
 // introduction. Both should use the approved transparent atlas.
 await page.evaluate(()=>{
  const key="japanese-harmony-puzzle-v2",save=JSON.parse(localStorage.getItem(key)||"{}");
  save.unlocked=4;save.run=null;localStorage.setItem(key,JSON.stringify(save));
 });
 await page.reload({waitUntil:"networkidle2"});
 await page.waitForFunction(()=>document.documentElement.classList.contains("has-new-atlas"),{timeout:15000});
 const atlas=await page.evaluate(async()=>{
  const src="./assets/harmony-new-families.avif?v=5.0";
  const image=new Image();image.src=src;await image.decode();
  return {width:image.naturalWidth,height:image.naturalHeight};
 });
 assert.deepEqual(atlas,{width:960,height:768},"Twenty 192px transparent sprites must decode as 5 × 4 atlas");
 await clickLegacyLevel(page,"#levelList .level-tile:nth-child(3)");
 const renderedNew=await page.evaluate(()=>{
  const items=[...document.querySelectorAll(".piece.new-family")];
  const present=new Set([...document.querySelectorAll(".tile")].map(x=>x.getAttribute("aria-label")?.split(",")[0]));
  return {count:items.length,present:[...present],visible:items.every(x=>{
   const sprite=x.querySelector(".sprite-new"),style=getComputedStyle(sprite);
   return style.display==="block"&&style.backgroundImage.includes("harmony-new-families.avif");
  })};
 });
 assert(renderedNew.count>0&&renderedNew.visible,
  "Level 3 needs visible Origami sprites from the new transparent atlas");
 assert(renderedNew.present.includes("Origami"));
  await page.click("#pauseButton");
  await page.click("#modalActions button:last-child");
  await clickLegacyLevel(page,"#levelList .level-tile:nth-child(5)");
  const ryu=await page.evaluate(()=>({
   families:[...new Set([...document.querySelectorAll(".tile")].map(e=>e.getAttribute("aria-label")?.split(",")[0]))],
   visible:[...document.querySelectorAll(".piece.new-family")].every(e=>{
    const sprite=e.querySelector(".sprite-new");
    return getComputedStyle(sprite).display==="block";
   })
  }));
  assert(ryu.families.includes("Ryu-drake")&&ryu.visible,
   "Level 5 should display Ryu's atlas sprite in the four-family game");
 // Core Gameplay & Clarity 1.0: real mobile completion should show the
 // result immediately without consuming the player's remaining moves.
 const clarityContext=await browser.createBrowserContext();
 try{
  const clarity=await clarityContext.newPage();
  await clarity.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await clarity.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  await clarity.evaluate(()=>{
   const R=window.HarmonyRules;
   const g=new R.Game(0,null,{seed:20261024,directorMode:"v311"});
   g.fusions=g.target()-1;
   g.moves=15;
   const key="japanese-harmony-puzzle-v2";
   const store=JSON.parse(localStorage.getItem(key));
   store.unlocked=0;store.run={level:0,data:g.save()};
   store.sound=false;store.reduceMotion=true;
   localStorage.setItem(key,JSON.stringify(store));
  });
  await clarity.reload({waitUntil:"networkidle2"});
  await clarity.click("#continueButton");
  const finishingPair=await clarity.evaluate(()=>{
   const saved=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data;
   return window.HarmonyRules.validSwaps(saved.board)[0];
  });
  await clarity.evaluate(([a,b])=>{
   document.querySelector('.tile[data-index="'+a+'"]').click();
   document.querySelector('.tile[data-index="'+b+'"]').click();
  },finishingPair);
  await clarity.waitForFunction(()=>{
   const dialog=document.querySelector("#modal");
   return !dialog.hidden&&dialog.querySelector("#modalTitle")?.textContent==="Vilken harmoni!";
  },{timeout:35000});
  const reached=await clarity.evaluate(()=>{
   const data=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   return {star:data.run?.data?.starsAtGoal,version:data.run?.data?.rewardVersion,
    remaining:data.run?.data?.moves,completed:data.run?.data?.complete,
    starText:document.querySelector(".big-stars")?.textContent,
    buttons:[...document.querySelectorAll("#modalActions button")].map(x=>x.textContent),
    scoreLabel:document.querySelector(".hud-score .hud-label")?.textContent,
    progress:document.querySelector("#goalProgress")?.textContent};
  });
  assert.equal(reached.version,3);
  assert.equal(reached.star,3);
  assert(reached.completed&&reached.remaining>0,"Completion must retain optional turns");
  assert.equal(reached.starText,"★★★");
  assert(reached.buttons.includes("Nästa nivå →")&&reached.buttons.includes("Fortsätt för poängrekord"));
  // Victory Accent 1.1: ensure the Sakura/peach hues are actually rendered,
  // limited to the victory dialog and do not displace actions on small phones.
  for(const width of [390,320]){
   await clarity.setViewport({width,height:width===320?640:844,
    deviceScaleFactor:2,isMobile:true,hasTouch:true});
   const colors=await clarity.evaluate(()=>{
    const root=document.querySelector(".modal");
    const computed=e=>getComputedStyle(document.querySelector(e));
    const frame=document.querySelector(".modal-inner").getBoundingClientRect();
    const next=document.querySelector(".victory-actions .victory-next").getBoundingClientRect();
    return {
     sakura:computed(".modal").getPropertyValue("--victory-sakura").trim(),
     peach:computed(".modal").getPropertyValue("--victory-peach").trim(),
     header:computed(".modal-inner").backgroundImage,
     score:computed(".victory-score").backgroundImage,
     star:computed(".victory-star.is-earned").backgroundImage,
     record:computed(".victory-record").backgroundImage,
     firstIcon:computed(".victory-stat:first-child .victory-stat-icon").backgroundImage,
     secondIcon:computed(".victory-stat:nth-child(2) .victory-stat-icon").backgroundImage,
     action:computed(".victory-next").backgroundImage,
     stars:document.querySelector(".big-stars").textContent,
     stats:document.querySelectorAll(".victory-stat").length,
     contentScroll:getComputedStyle(document.querySelector("#modalContent")).overflowY,
     innerHeight:frame.height,viewHeight:innerHeight,
     nextTop:next.top,nextBottom:next.bottom,
     docWidth:document.documentElement.scrollWidth,viewWidth:innerWidth,
     isOpen:!root.hidden
    };
   });
   assert(colors.isOpen&&colors.sakura==="#F2A9BF"&&colors.peach==="#F7B489",
    "Victory must apply the Sakura and peach design tokens");
   assert(colors.header.includes("rgba(230, 124, 160")&&
    colors.score.includes("rgba(255, 151, 107")&&
    colors.record.includes("rgba(233, 127, 149")&&
    colors.firstIcon.includes("rgba(245, 143, 179")&&
    colors.secondIcon.includes("rgba(253, 160, 109")&&
    colors.action.includes("linear-gradient")&&colors.star.includes("linear-gradient"),
    "Victory rose, orange and gold gradients must render on mobile");
   assert(colors.stars==="★★★"&&colors.stats===4&&colors.contentScroll==="auto",
    "Accent pass cannot change the reward content or scroll behaviour");
   assert(colors.docWidth<=colors.viewWidth&&colors.innerHeight<=colors.viewHeight&&
    colors.nextTop>=0&&colors.nextBottom<=colors.viewHeight,
    "Both mobile sizes must keep the primary Next Level button in view");
  }
  await clarity.setViewport({width:390,height:844,deviceScaleFactor:2,
   isMobile:true,hasTouch:true});
  assert.equal(reached.scoreLabel,"BONUSPOÄNG");
  await clarity.evaluate(()=>[...document.querySelectorAll("#modalActions button")].find(x=>x.textContent.includes("Fortsätt för poängrekord")).click());
  assert.equal(await clarity.$eval("#modal",x=>x.hidden),true,
   "Voluntary record play must resume immediately");
  assert.equal(await clarity.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data.complete),true);
  await clarity.click("#pauseButton");
  await clarity.evaluate(()=>[...document.querySelectorAll("#modalActions button")].find(x=>x.textContent==="Avsluta med resultat").click());
  const archived=await clarity.evaluate(()=>{
   const data=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   return {record:data.fourFamilyStars["0"],unlocked:data.unlocked,run:data.run};
  });
  assert.equal(archived.record,3,"New wins archive the earned efficiency rating");
  assert(archived.unlocked>=1,"Completion must unlock the next stage");
  assert.equal(archived.run,null,"Finishing should close the saved run");
 }finally{await clarityContext.close();}
 assert(!errors.length,"Unexpected browser errors: "+errors.join("; "));
 console.log("PASS Japanese Harmony mobile first playable",box);
}finally{await browser.close();}
