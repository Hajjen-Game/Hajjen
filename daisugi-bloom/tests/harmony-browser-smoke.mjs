import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const browserPaths=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"];
const exe=browserPaths.find(p=>fs.existsSync(p));
if(!exe)throw new Error("Chrome/Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
// A gameplay level may legitimately launch its one-time illustrated tutorial.
// The general mechanics smoke acknowledges it; separate tutorial tests assert
// that it stays open until OK and is not acknowledged by a timeout.
async function acknowledgeTutorial(page){
 const open=await page.$eval("#modal",node=>!node.hidden&&!!node.querySelector(".jh-tutorial"));
 if(open)await page.click("#modalActions .jh-tutorial-ok");
}
// Transitional smoke utility: exercise legacy engine-start regression cases
// without reintroducing a second visible level selector to production.
async function clickLegacyLevel(page,selector){
 await page.evaluate(selector=>{
  const node=document.querySelector(selector);
  if(!node)throw new Error("Legacy level regression selector missing: "+selector);
  node.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));
 },selector);
 await acknowledgeTutorial(page);
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
  const logo=document.querySelector(".washi-home-logo");
  const play=document.querySelector("#continueButton");
  const buttons=document.querySelectorAll(".washi-home-link");
  return {
    logoVisible:!!logo&&getComputedStyle(logo).display!=="none",
    playVisible:!!play&&play.getBoundingClientRect().height>=46,
    buttons:buttons.length,
    advancedOpen:document.querySelector("#menuAdvanced").open,
    legacyListHidden:getComputedStyle(document.querySelector("#levelList")).display==="none"&&
     getComputedStyle(document.querySelector("#levelPager")).display==="none",
    bodyWidth:document.body.scrollWidth
  };
 });
 assert(uiMenu.logoVisible&&uiMenu.playVisible&&uiMenu.buttons===3,
  "Washi Zen menu needs logo, play and the three collection actions");
 assert(uiMenu.legacyListHidden,"Old level list must remain hidden");
 assert.equal(uiMenu.advancedOpen,false);
 assert(uiMenu.bodyWidth<=390,"Mobile menu must have no horizontal overflow");
 // Washi Zen 1.2: the 3:1 watercolor brush must remain undistorted and
 // provide unmistakable visual touch-down feedback before game launch.
 const brush=await page.evaluate(()=>{
  const btn=document.querySelector("#continueButton");
  const rect=btn.getBoundingClientRect();
  const style=getComputedStyle(btn);
  return {ratio:rect.width/rect.height,image:style.backgroundImage,
   color:style.backgroundColor,transform:style.transform};
 });
 assert(Math.abs(brush.ratio-849/283)<.08,
  "Play brush must use its native source aspect ratio, not a stretched pill");
 assert(brush.image.includes("play-brush.webp"),"Use the approved painted asset");
 assert(brush.color==="rgba(0, 0, 0, 0)","No solid rectangle behind the brush");
 assert(!!brush.transform,"Brush needs a transform to animate the press");

 await page.$eval("#continueButton",b=>b.classList.add("is-pressed"));
 const down=await page.$eval("#continueButton",b=>({
  transform:getComputedStyle(b).transform,
  filter:getComputedStyle(b).filter
 }));
 assert(down.filter.includes("brightness")||down.transform!==brush.transform,
  "Pressing the button must visibly darken and depress it");
 await page.$eval("#continueButton",b=>b.classList.remove("is-pressed"));

 // Washi Zen 1.1: main menu must be one mobile viewport, not a scrollable
 // document with empty space after the background.
 const homeFit=await page.evaluate(()=>{
  const menu=document.querySelector("#menuView").getBoundingClientRect();
  const choices=document.querySelector(".washi-home-links").getBoundingClientRect();
  const settings=document.querySelector("#menuAdvanced").getBoundingClientRect();
  window.scrollTo(0,500);
  return {offset:window.scrollY,docHeight:document.documentElement.scrollHeight,
   viewport:window.innerHeight,menuHeight:menu.height,
   actionsVisible:choices.bottom<=window.innerHeight+1,
   settingsVisible:settings.bottom<=window.innerHeight+1};
 });
 assert.equal(homeFit.offset,0,"Home must not scroll into blank space");
 assert(homeFit.docHeight<=homeFit.viewport+2,
  "Home document must not exceed the visible mobile viewport");
 assert(homeFit.actionsVisible&&homeFit.settingsVisible,
  "Main actions and settings must remain reachable without scrolling");

 // Reset Progress 1.0: verify the actual Settings -> confirm -> reload flow
 // in an isolated browser profile; never mutate the main smoke test's save.
 const cleanContext=await browser.createBrowserContext();
 try{
  const clean=await cleanContext.newPage();
  await clean.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await clean.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
  await clean.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   const data=JSON.parse(localStorage.getItem(key));
   data.unlocked=44;data.bestStars={40:3};data.fourFamilyStars={0:3};
   data.economy={version:1,coins:900,paidStars:{0:3},owned:["koi"],equipped:null};
   data.omamoriCards={version:2,counts:{koi:2},discovered:["koi"],replay:{day:"2026-10-29",claims:4}};
   data.run={level:44,data:new window.HarmonyRules.Game(44,null,{seed:20261030}).save()};
   localStorage.setItem(key,JSON.stringify(data));
   localStorage.setItem("another-game-key","keep me");
  });
  await clean.reload({waitUntil:"networkidle2"});
  await clean.click("#settingsButton");
  assert.equal(await clean.$eval("#modalActions button:nth-child(2)",e=>e.textContent),"Reset my progress…");
  await clean.click("#modalActions button:nth-child(2)");
  assert.equal(await clean.$eval("#modalTitle",e=>e.textContent),"Start from level 1?");
  await clean.click("#modalActions button:first-child");
  assert.equal(await clean.$eval("#modalTitle",e=>e.textContent),"Settings",
   "Cancel must never delete a profile");
  const stillOwned=await clean.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).economy.coins);
  assert.equal(stillOwned,900);
  await clean.click("#modalActions button:nth-child(2)");
  await Promise.all([
   clean.waitForNavigation({waitUntil:"networkidle2"}),
   clean.click("#modalActions button.primary")
  ]);
  const reset=await clean.evaluate(()=>{
   const s=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   return {unlocked:s.unlocked,run:s.run,stars:s.bestStars,introStars:s.fourFamilyStars,
    coins:s.economy?.coins,omamori:s.omamoriCards?.counts,playMode:s.playMode,
    unrelated:localStorage.getItem("another-game-key")};
  });
  assert.equal(reset.unlocked,0);
  assert.equal(reset.run,null);
  assert.deepEqual(reset.stars,{});
  assert.deepEqual(reset.introStars,{});
  assert.equal(reset.coins,0);
  assert.deepEqual(reset.omamori,{});
  assert.equal(reset.playMode,"auto");
  assert.equal(reset.unrelated,"keep me","Reset must not clear other same-origin storage");
 }finally{await cleanContext.close();}

 // Goshuincho Primary Navigation 1.0: game -> book -> saved level ->
 // Home -> book -> menu; no old level-list interaction in this flow.
 const bookNavContext=await browser.createBrowserContext();
 try{
  const nav=await bookNavContext.newPage();
  await nav.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await nav.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
  await nav.click("#continueButton");await nav.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(nav);
  assert.equal(await nav.$eval("#gameView",e=>e.hidden),false);
  await nav.click("#pauseButton");
  await nav.click(".pause-levels");
  assert.equal(await nav.$eval("#modalTitle",e=>e.textContent),"Goshuincho");
  assert.equal(await nav.$$eval(".washi-level-tile",els=>els.length),10);
  assert.equal(await nav.$eval(".washi-detail-play",e=>e.textContent),"CONTINUE");
  // Onboarding 2.0: book preview exposes the real mission and remaining moves.
  const detail=await nav.$eval(".washi-level-detail",e=>e.textContent);
  assert(detail.includes("GOAL")&&detail.includes("MOVES LEFT"),
    "Goshuincho must show goal and remaining moves before resuming");
  // Clarity 2.1: keep precisely four legible rows inside the paper.
  const compact=await nav.$eval(".washi-level-detail",element=>{
    const paper=element.getBoundingClientRect();
    const copy=element.querySelector(".washi-detail-copy");
    const rows=Array.from(copy.children).map(node=>node.getBoundingClientRect());
    return {rows:rows.length,hasLongLesson:!!copy.querySelector(".washi-detail-lesson"),
      top:Math.min(...rows.map(r=>r.top)),bottom:Math.max(...rows.map(r=>r.bottom)),
      paperTop:paper.top,paperBottom:paper.bottom};
  });
  assert.equal(compact.rows,4,"Selected-level preview should contain four short rows");
  assert.equal(compact.hasLongLesson,false,"Full tutorials should open in the game");
  assert(compact.top>=compact.paperTop+4&&compact.bottom<=compact.paperBottom-4,
    "Level summary must fit inside the painted frame");
  await nav.click(".washi-detail-play");await nav.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(nav);
  assert.equal(await nav.$eval("#gameView",e=>e.hidden),false);
  assert.equal(await nav.$eval("#modal",e=>e.hidden),true);
  // Goal help must be voluntary, non-destructive and dismissible.
  assert(await nav.$eval("#goalHelpButton",e=>e.getBoundingClientRect().width>=20));
  const beforeHelp=await nav.$eval("#movesCount",e=>e.textContent);
  const progressLabel=await nav.$eval("#goalProgress",e=>e.getAttribute("aria-label"));
  assert(progressLabel?.length>8,"Goal progress must explain what remains for screen readers");
  assert.equal(await nav.evaluate(()=>typeof window.HarmonyObjectiveFeedback),"object");
  await nav.click("#goalHelpButton");
  assert((await nav.$eval(".jh-guide-goal",e=>e.textContent)).includes("GOAL"));
  assert((await nav.$eval(".jh-guide-state",e=>e.textContent)).length>8,
    "Goal help must explain remaining progress, not only show a counter");
  await nav.click("#modalActions .primary");
  assert.equal(await nav.$eval("#modal",e=>e.hidden),true);
  assert.equal(await nav.$eval("#movesCount",e=>e.textContent),beforeHelp,
    "Reading goal guidance must never spend a move");
  await nav.click("#pauseButton");
  await nav.click(".pause-levels");
  await nav.click(".washi-book-close");
  assert.equal(await nav.$eval("#menuView",e=>e.hidden),false);
  assert.equal(await nav.$eval("#modal",e=>e.hidden),true);
  await nav.click("#goshuinButton");
  assert.equal(await nav.$$eval(".washi-level-tile",e=>e.length),10);
  await nav.click(".washi-book-close");
 }finally{await bookNavContext.close();}
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
  await dp.click("#continueButton");await dp.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(dp);
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
  assert(visual.aria.includes("two eyes left"));
  fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
  await dp.screenshot({path:"/tmp/daisugi-bloom/daruma-l21.png"});
  await dp.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   const store=JSON.parse(localStorage.getItem(key));
   store.run.data.daruma[24]=1;
   localStorage.setItem(key,JSON.stringify(store));
  });
  await dp.reload({waitUntil:"networkidle2"});
  await dp.click("#continueButton");await dp.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(dp);
  const half=await dp.$eval('.tile[data-index="24"]',tile=>({
   state:tile.querySelector(".daruma-art")?.className,aria:tile.getAttribute("aria-label")}));
  assert(half.state.includes("state-1")&&half.aria.includes("one eye left"),
   "A half-painted Daruma must resume with the right second sprite");
 }finally{await darumaContext.close();}
 // Goshuincho Collection 1.0 — independent profile, no archive writes.
 const journalContext=await browser.createBrowserContext();
 try{
  const journal=await journalContext.newPage();
  await journal.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await journal.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
  await journal.click("#goshuinButton");
  const initial=await journal.evaluate(()=>({
   count:document.querySelectorAll(".washi-level-tile").length,
   first:document.querySelector(".washi-level-tile")?.dataset.level,
   last:document.querySelector(".washi-level-tile:last-child")?.dataset.level,
   stampCount:document.querySelectorAll(".washi-level-tile.is-earned").length,
   play:document.querySelector(".washi-detail-play")?.disabled,
   width:document.documentElement.scrollWidth
  }));
  assert.deepEqual([initial.count,initial.first,initial.last,initial.stampCount,initial.play],
   [10,"1","10",0,false]);
  assert(initial.width<=390,"Goshuincho must fit the phone");
  assert.equal(await journal.$eval('.washi-level-tile[data-level="10"] .washi-tile-jp',x=>x.textContent),"十");
  // Check actual phone geometry, not only stylesheet text. Long Japanese
  // numerals, labels and stamps must not paint over the card borders.
  const cardFit=await journal.evaluate(()=>{
   const card=document.querySelector('.washi-level-tile[data-level="10"]');
   const top=card.getBoundingClientRect();
   const label=card.querySelector(".washi-tile-label").getBoundingClientRect();
   const numeral=card.querySelector(".washi-tile-jp").getBoundingClientRect();
   const seal=card.querySelector(".washi-tile-seal").getBoundingClientRect();
   const detail=document.querySelector(".washi-level-detail").getBoundingClientRect();
   return {topPadding:label.top-top.top,hasOverlap:label.bottom>numeral.top+.5||
     numeral.bottom>seal.bottom+.5,detailVisible:detail.bottom<=window.innerHeight+1,
     gridWidth:document.querySelector(".washi-level-grid").getBoundingClientRect().width};
  });
  assert(cardFit.topPadding>=9,"Level labels must clear painted card frames");
  assert(!cardFit.hasOverlap,"Card heading, Japanese numerals and seal must not collide");
  assert(cardFit.detailVisible&&cardFit.gridWidth<=390,
   "The full ten-card book and detail panel must fit mobile width and height");
  const painted=await journal.$eval(".washi-level-tile.is-selected",tile=>{
   const style=getComputedStyle(tile),accent=getComputedStyle(tile,"::after");
   const artwork=getComputedStyle(tile,"::before");
   return {background:style.backgroundImage,fill:style.backgroundColor,outline:style.outlineWidth,
    shadow:style.boxShadow,paper:artwork.backgroundImage,accent:accent.borderTopWidth,
    left:accent.left,top:accent.top};
  });
  assert(painted.background==="none"&&painted.fill==="rgba(0, 0, 0, 0)",
   "No default beige rectangle can appear behind the painted level card");
  assert(painted.outline==="0px"&&painted.shadow==="none",
   "No red selection frame can outline the full transparent button canvas");
  assert(painted.paper.includes("level-card.webp")&&parseFloat(painted.accent)>0,
   "The painted card and inset red selection outline must both render");
  assert(parseFloat(painted.left)>0&&parseFloat(painted.top)>0,
   "Selection must be inset to match actual painted pixels");
  const finish=await journal.evaluate(()=>{
   const tile=document.querySelector(".washi-level-tile.is-selected");
   const art=getComputedStyle(tile,"::before");
   const ring=getComputedStyle(tile,"::after");
   const detail=document.querySelector(".washi-level-detail");
   const panel=getComputedStyle(detail);
   const rect=detail.getBoundingClientRect();
   return {
    ringShadow:ring.boxShadow,
    artFilter:art.filter,
    ringInsetLeft:parseFloat(ring.left),
    ringInsetTop:parseFloat(ring.top),
    tileWidth:tile.getBoundingClientRect().width,
    tileHeight:tile.getBoundingClientRect().height,
    detailImage:panel.backgroundImage,
    detailFill:panel.backgroundColor,
    detailBorder:panel.borderTopWidth,
    detailShadow:panel.boxShadow,
    detailHeight:rect.height,
    detailWidth:rect.width
   };
  });
  assert.equal(finish.ringShadow,"none","No extra light halo can extend beyond the red selection");
  assert.equal(finish.artFilter,"none","No painted-card shadow beyond a selected frame");
  assert(finish.ringInsetLeft/finish.tileWidth>.025&&finish.ringInsetTop/finish.tileHeight>.055,
    "Red selection must be inset by the painted artwork's proportional alpha edges");
  assert(finish.detailImage.includes("detail-card.webp"),
    "The approved transparent horizontal card must remain visible");
  assert.equal(finish.detailFill,"rgba(0, 0, 0, 0)",
    "No oversized opaque beige backing behind the detail-card artwork");
  assert.equal(finish.detailBorder,"0px","Detail card must not have a rectangular CSS border");
  assert.equal(finish.detailShadow,"none","No extra rectangular detail-card shadow");
  assert(finish.detailHeight>40&&finish.detailWidth>200,
    "The detail card remains readable on mobile");


  const cardZones=await journal.$eval(".washi-level-tile",tiles=>Array.from(tiles).map(tile=>{
   const rect=tile.getBoundingClientRect();
   const label=tile.querySelector(".washi-tile-label").getBoundingClientRect();
   const jp=tile.querySelector(".washi-tile-jp").getBoundingClientRect();
   const seal=tile.querySelector(".washi-tile-seal").getBoundingClientRect();
   return {
    level:tile.dataset.level,
    labelTop:(label.top-rect.top)/rect.height,
    labelBottom:label.bottom,jpTop:jp.top,jpBottom:jp.bottom,
    sealTop:seal.top,sealBottom:seal.bottom,sealMiddleX:(seal.left+seal.right)/2,
    cardMiddleX:(rect.left+rect.right)/2,
    bottomGap:(rect.bottom-seal.bottom)/rect.height
   };
  }));
  for(const tile of cardZones){
   assert(tile.labelTop>.11&&tile.labelTop<.23,
    "Level "+tile.level+" text must start safely inside the painted border");
   assert(tile.labelBottom<tile.jpTop+1,
    "Level "+tile.level+" English and Japanese text must be separate");
   assert(tile.jpBottom<tile.sealTop+1,
    "Level "+tile.level+" stamp must not overlap the Japanese numeral");
   assert(Math.abs(tile.sealMiddleX-tile.cardMiddleX)<1.5,
    "Level "+tile.level+" stamp must be horizontally centered");
   assert(tile.bottomGap>.08&&tile.bottomGap<.22,
    "Level "+tile.level+" stamp must have a consistent bottom margin");
  }


  await journal.click('.washi-level-tile[data-level="2"]');
  assert.equal(await journal.$eval(".washi-detail-play",x=>x.disabled),true);
  await journal.click(".washi-book-close");
  await journal.evaluate(()=>{
   const key="japanese-harmony-puzzle-v2";
   const state=JSON.parse(localStorage.getItem(key));
   state.unlocked=24;
   state.fourFamilyStars={0:3,1:2};
   state.bestStars={20:2,22:3};
   const g=new window.HarmonyRules.Game(24,null,{seed:54321,directorMode:"v3"});
   state.run={level:24,data:g.save(),backgroundId:0};
   localStorage.setItem(key,JSON.stringify(state));
  });
  await journal.reload({waitUntil:"networkidle2"});
  await journal.click("#goshuinButton");
  assert.equal(await journal.$$eval(".washi-level-tile",x=>x.length),10);
  assert.equal(await journal.$eval(".washi-level-tile.is-selected",x=>x.dataset.level),"25");
  assert.equal(await journal.$eval(".washi-detail-play",x=>x.textContent),"CONTINUE");
  assert.equal(await journal.$eval('.washi-level-tile[data-level="26"]',x=>x.classList.contains("is-locked")),true);
  await journal.click('.washi-level-tile[data-level="26"]');
  assert.equal(await journal.$eval(".washi-detail-play",x=>x.disabled),true);
  await journal.click('.washi-level-tile[data-level="21"]');
  assert.equal(await journal.$eval(".washi-detail-play",x=>x.disabled),false);
  assert.equal(await journal.$eval(".washi-detail-name",x=>x.textContent),
   await journal.evaluate(()=>window.HarmonyRules.levelConfig(20).name));
  await journal.click(".washi-prev");
  assert.equal(await journal.$eval(".washi-chapter-count",x=>x.textContent),"LEVEL 11–20");
  assert.equal(await journal.$eval('.washi-level-tile[data-level="11"] .washi-tile-jp',x=>x.textContent),"十一");
  await journal.click(".washi-next");
  assert.equal(await journal.$eval(".washi-chapter-count",x=>x.textContent),"LEVEL 21–30");
  await journal.click('.washi-level-tile[data-level="25"]');
  await journal.click(".washi-detail-play");await journal.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(journal);
  assert.equal(await journal.$eval("#gameView",x=>x.hidden),false);
  assert.equal(await journal.$eval("#modal",x=>x.hidden),true);
 }finally{await journalContext.close();}
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
  assert.equal(await demo.$eval("#gameDirectorMode",n=>n.value),"auto");
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
   // Automatic level gate: fresh level 10 uses 4.0, first nine retain 3.0.
   await demo.click("#pauseButton");
   await demo.click("#modalActions button:last-child");
   await demo.$eval("#menuAdvanced",e=>e.open=true);
   await demo.select("#gameDirectorMode","auto");
   await demo.evaluate(()=>{
    const key="japanese-harmony-puzzle-v2",state=JSON.parse(localStorage.getItem(key));
    state.unlocked=9;state.run=null;localStorage.setItem(key,JSON.stringify(state));
   });
   await demo.reload({waitUntil:"networkidle2"});
   await clickLegacyLevel(demo,".level-tile:nth-child(10)");
   const level10=await demo.evaluate(()=>{
    const run=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run;
    return {mode:run.data.directorMode,level:run.level,status:document.querySelector("#paceStatus")?.textContent};
   });
   assert.equal(level10.level,9);
   assert.equal(level10.mode,"v4","Level 10 must default to Harmony Director 4.0");
   assert(level10.status.includes("OBJECTIVE 4.0"));
 }finally{await directorContext.close();}
 // Fixed family progression: 4 in stages 1–10 and 5 from stage 11.
 // Old five-family saved runs and BOTH historical score archives survive.
 const progressionContext=await browser.createBrowserContext();
 try{
  const preview=await progressionContext.newPage();
  await preview.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await preview.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
  assert.equal(await preview.$("#gameFamilyCount"),null,"The experiment selector is no longer needed");
  assert(await preview.$eval(".washi-home-logo",e=>e.getBoundingClientRect().height>0));
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
    introBookStars:window.HarmonyGoshuincho.archivedStars(saved,0),
    journeyBookStars:window.HarmonyGoshuincho.archivedStars(saved,10),
    migration:saved.familyProgressionVersion};
  });
  assert.equal(records.introRecord,9000);
  assert.equal(records.introStars,3);
  assert.equal(records.preservedOld,9000);
  assert.equal(records.journeyRecord,7200);
  assert.equal(records.migration,1);
  assert.equal(records.introBookStars,3,"Goshuincho should use the migrated intro stars");
  assert.equal(records.journeyBookStars,1,"Journey stamp should keep its legacy score achievement");
  await clickLegacyLevel(preview,".level-tile:first-child");
  const four=await preview.evaluate(()=>{
   const run=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data;
   const icons=[...document.querySelectorAll("#masterpieceCollection .collection-card")];
   return {families:run.familyCount,unique:new Set(run.board.map(p=>p.family)).size,
    cardCount:icons.length,mode:run.directorMode,
    hidden:document.querySelector("#masterpieceCollection").hidden,
    classified:document.querySelector("#masterpieceCollection").classList.contains("four-families")};
  });
  assert.equal(four.families,4);assert.equal(four.unique,4);assert.equal(four.cardCount,4);
  assert.equal(four.mode,"v3");assert(four.classified&&four.hidden,"Collection bookkeeping must remain hidden");
  await preview.click("#pauseButton");
  await preview.click("#modalActions button:last-child");
  await clickLegacyLevel(preview,".level-tile:nth-child(11)");
  const five=await preview.evaluate(()=>{
   const run=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data;
   return {count:run.familyCount,unique:new Set(run.board.map(p=>p.family)).size,
    cards:document.querySelectorAll("#masterpieceCollection .collection-card").length,
    hidden:document.querySelector("#masterpieceCollection").hidden};
  });
  assert.equal(five.count,5);assert.equal(five.unique,5);assert.equal(five.cards,5);
  // Collection bookkeeping survives the HUD cleanup, but the old panel is
  // deliberately hidden. Verify both family counts without asserting retired
  // collection icon sizes or a visible masterpiece panel.
  assert(five.hidden,"Five-family collection bookkeeping must remain hidden");
  assert.equal(await preview.evaluate(()=>document.body.scrollWidth<=390),true,
   "Five-family gameplay must not cause horizontal overflow");
  // A pre-upgrade stage-1 run without familyCount must keep its fifth family.
  await preview.evaluate(()=>{
   const old=new window.HarmonyRules.Game(0,null,{seed:991,familyCount:5,directorMode:"v3"});
   const save=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   const snapshot=old.save();delete snapshot.familyCount;
   save.run={level:0,data:snapshot};
   localStorage.setItem("japanese-harmony-puzzle-v2",JSON.stringify(save));
  });
  await preview.reload({waitUntil:"networkidle2"});
  await preview.click("#continueButton");await preview.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(preview);
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
   const R=window.HarmonyRules,G=window.HarmonyGoshuincho;
   return {unlocked:saved.unlocked,record:saved.bestScores["10"],
    stars:saved.bestStars["10"],nextStars:saved.bestStars["11"],
    bookStars:[G.archivedStars(saved,10),G.archivedStars(saved,11)],
    target:R.levelConfig(10).goal.count,oldTarget:R.legacyScoreConfig(10).goal.count};
  });
  assert.equal(migrated.unlocked,12,"Already unlocked future levels must stay unlocked");
  assert.equal(migrated.record,1600,"Original high score must not be overwritten");
  assert.equal(migrated.stars,1,"Old overly generous 3 stars should be adjusted to 1");
  assert.equal(migrated.nextStars,3,"Excellent prior score must still earn 3 stars");
  assert.deepEqual(migrated.bookStars,[1,3],
   "Goshuincho must display accurate achievements from migrated legacy scores");
  assert.equal(migrated.target,24,"Level 11 uses the current calibrated fusion goal");
  assert.equal(migrated.oldTarget,7500,"Legacy score milestones remain preserved");
  await clickLegacyLevel(legacy,".level-tile:nth-child(11)");
  const milestones=await legacy.evaluate(()=>({
   hidden:document.querySelector("#starTargets").hidden,
   goal:document.querySelector("#goalLabel").textContent,
   mist:document.querySelectorAll(".tile.misted").length
  }));
  assert(milestones.hidden,"New mission levels use moves-based stars, not score milestones");
  assert.equal(milestones.goal,"Fusions");
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
    bookStars:[10,11,12,13].map(i=>window.HarmonyGoshuincho.archivedStars(data,i))};
  });
  assert.deepEqual(rebalanced.scores,[4710,7900,9125,9388]);
  assert.deepEqual(rebalanced.stars,[1,1,1,1],
   "Revised Journey rewards must recognize existing performance automatically");
  assert.deepEqual(rebalanced.bookStars,[1,1,1,1],
   "Goshuincho must retain a genuine completion stamp for older Journey wins");

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
  await praisePage.click("#continueButton");await praisePage.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(praisePage);
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
       oldStage:Number(tile?.getAttribute("aria-label")?.match(/tier (\d+)/)?.[1]),
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
  await proof.click("#continueButton");await proof.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(proof);
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
 await page.$eval("#menuAdvanced",element=>element.open=true);
 await page.click("#devButton");
 assert.equal(await page.$eval("#modalTitle",el=>el.textContent),"Harmony Intelligence");
 await page.select(".engine-controls select","0");
 await page.select(".engine-controls label:nth-child(2) select","2");
 await page.select("#engineMode","compare");
 await page.click("#modalActions button:first-child");
 await page.waitForFunction(()=>document.querySelector(".engine-lab-status")?.textContent.includes("Analysis complete"),{timeout:45000});
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
  return status?.includes("Analysis complete")&&
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
  return status?.includes("Analysis complete")&&
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
 await page.click("#continueButton");await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(page);await page.waitForSelector(".tile");
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
   const playStyle=getComputedStyle(document.body,"::before");
   const goalStyle=getComputedStyle(document.querySelector(".goal"));
   return {id:document.body.dataset.festival,
     imageSrc:backdrop.currentSrc||backdrop.src,
     imageReady:backdrop.complete&&backdrop.naturalWidth>0,
     imageNaturalWidth:backdrop.naturalWidth,
     imageVisible:backdropStyle.display!=="none"&&Number(backdropStyle.opacity)>.95,
     imageFit:backdropStyle.objectFit,
     backdropWidth:backdropRect.width,backdropHeight:backdropRect.height,
     playBackground:playStyle.backgroundImage,playBackgroundSize:playStyle.backgroundSize,
     playPosition:playStyle.position,goalBorder:goalStyle.borderImageSource,
     dims};
 });
 assert.deepEqual(background.dims,[[768,1536],[768,1536],[768,1536]],
  "The three supplied Festival Night images must remain at original sharp resolution");
 assert(Number(background.id)>=1&&Number(background.id)<=3,"Only approved HD backgrounds should rotate");
 assert(background.imageReady&&background.imageNaturalWidth===768,"Native HD image must be decoded in the real backdrop element");
 assert(!background.imageVisible,"Legacy festival image is intentionally hidden during gameplay");
 assert(background.playBackground.includes("play-background-20261029.jpg")&&
   background.playBackground.includes("linear-gradient"),
   "Gameplay must paint its approved background and readability tint together");
 assert(background.playPosition==="fixed"&&background.playBackgroundSize.includes("cover"),
  "The visible gameplay background must fill the viewport without a second fullscreen image");
 assert(background.imageSrc.includes("festival-hd-"),"Native image source must reference a genuine HD file");

 assert(background.goalBorder.includes("goal-omamori-original-20261029.png"),
  "Approved original goal panel artwork must render with border-image slicing");
 const festivalAtStart=background.id;

 assert.equal(await page.$$eval(".tile",els=>els.length),49);
 assert.equal(await page.$$eval(".tile",els=>els.filter(el=>el.getAttribute("aria-label")?.includes("tier 1,")).length),49,"All newly generated mobile tiles must start at stage one");
 assert.equal(await page.$$eval(".tile .stage",els=>els.length),0,"Stage fraction labels should never obscure tiles");
 await page.click(".tile");
 assert((await page.$eval("#selectedInfo",e=>e.textContent)).includes("stage"),"Selecting a tile should provide stage information in the status line");
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
 // Masterpieces still accumulate internally, but the collection artwork
 // panel was intentionally removed from the gameplay hierarchy.
 const collection=await page.evaluate(()=>{
  const node=document.querySelector("#masterpieceCollection");
  return {hidden:node.hidden,ariaHidden:node.getAttribute("aria-hidden"),
   cards:node.querySelectorAll(".collection-card").length,
   counters:[...node.querySelectorAll(".collection-count")].map(e=>e.textContent),
   visible:getComputedStyle(node).display!=="none"};
 });
 assert.equal(collection.cards,4,"Four family masterpiece counters must remain tracked");
 assert.deepEqual(collection.counters,["0","0","0","0"],"All four counters start empty");
 assert(collection.hidden&&collection.ariaHidden==="true"&&!collection.visible,
  "The retired masterpiece panel must remain hidden without losing its bookkeeping");
 assert.equal(await page.$eval("#gameView",e=>e.hidden),false);
 const start=await page.evaluate(()=>{let g=new HarmonyRules.Game(0);return {moves:g.moves,stage:g.board.length,ready:HarmonyRules.validSwaps(g.board).length,level8Goal:HarmonyRules.levels[7].goal.type,level8Count:HarmonyRules.levels[7].goal.count,level8Moves:HarmonyRules.levels[7].moves};});
 assert.equal(start.moves,18);assert.equal(start.stage,49);assert(start.ready>=3);assert.equal(start.level8Goal,"mist");assert.equal(start.level8Count,5);assert.equal(start.level8Moves,33);
 const endless=await page.evaluate(()=>{
  const R=window.HarmonyRules;
  return [10,49,100].map(i=>({number:i+1,type:R.levelConfig(i).goal.type,
   families:R.activeFamilies(i).length,moves:R.levelConfig(i).moves}));
 });
 assert(endless.every(x=>x.type!=="score"&&x.families===5&&
  (x.number<=20?(x.moves>=25&&x.moves<=43):(x.moves>=34))),
  "Journey 11–20 must have reduced moves while the later Journey stays unchanged");
 assert(endless[0].type==="fusion"&&endless[1].type==="familyMasterpiece"&&endless[2].type==="mist",
  "Journey starts with fusion, Lantern Path ends with its masterpiece, and Endless Garden retains Mist");
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
 assert.equal(floor.label,"Moves with a four-tile match");
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
  await mistPage.click("#continueButton");await mistPage.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(mistPage);
  assert.equal(await mistPage.$eval("#goalLabel",x=>x.textContent),"Clear Mist");
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

 // Gameplay Washi 2026-10-29: the old gold frame and separate festival
 // image were deliberately retired. Verify the *actual* approved paper
 // textures, original HUD art, non-obstructing controls and board geometry.
 const visual=await page.evaluate(()=>{
  const q=s=>document.querySelector(s);
  const board=q("#board"),shell=q(".board-shell"),first=q(".tile");
  const boardRect=board.getBoundingClientRect(),shellRect=shell.getBoundingClientRect();
  const cell=first.getBoundingClientRect();
  const hit=document.elementFromPoint(cell.left+cell.width/2,cell.top+cell.height/2);
  const originalTile=q(".game-view .tile:nth-child(3)");
  const stateImages={};
  for(const state of ["selected","swapped","pulsed","harvested","shuffling"]){
   originalTile.classList.add(state);
   stateImages[state]=getComputedStyle(originalTile).backgroundImage;
   originalTile.classList.remove(state);
  }
  const backdrop=getComputedStyle(document.body,"::before");
  const moveBox=q(".moves").getBoundingClientRect(),scoreBox=q("#scorePanel").getBoundingClientRect();
  return {
   image:backdrop.backgroundImage,size:backdrop.backgroundSize,
   position:backdrop.position,
   festivalHidden:getComputedStyle(q("#festivalBackdrop")).display==="none",
   boardFrameHidden:getComputedStyle(q(".board-frame-art")).display==="none",
   shellFrameHidden:getComputedStyle(shell,"::after").display==="none",
   goalArt:getComputedStyle(q(".goal")).borderImageSource,
   tileImage:getComputedStyle(first).backgroundImage,
   tileEvenImage:getComputedStyle(q(".tile:nth-child(2)")).backgroundImage,
   stateImages,
   tileReachable:first===hit||first.contains(hit),
   count:board.querySelectorAll(".tile").length,
   boardWidth:boardRect.width,boardHeight:boardRect.height,
   shellWidth:shellRect.width,boardTop:boardRect.top,boardBottom:boardRect.bottom,
   header:getComputedStyle(q(".topbar")).display,
   movesBottom:moveBox.bottom,scoreBottom:scoreBox.bottom,scoreWidth:scoreBox.width,
   viewportHeight:window.innerHeight,viewportWidth:window.innerWidth,
   bodyWidth:document.body.scrollWidth
  };
 });
 assert(visual.image.includes("play-background-20261029.jpg")&&
   visual.image.includes("linear-gradient")&&visual.size.includes("cover")&&
   visual.position==="fixed"&&visual.festivalHidden,
  "Approved gameplay painting and warm tint must cover the viewport without duplicate festival art");
 assert(visual.goalArt.includes("goal-omamori-original-20261029.png"),
  "The original user-approved goal plaque must retain its sliced artwork");
 assert(visual.boardFrameHidden&&visual.shellFrameHidden,
  "Retired gold board ornament must stay hidden and never obscure the grid");
 assert.equal(visual.count,49,"All seven-by-seven board cells must remain rendered");
 assert(visual.tileReachable,"Decorative backgrounds must never capture board touches");
 assert(visual.boardWidth>=300&&Math.abs(visual.boardWidth-visual.boardHeight)<2,
  "The mobile puzzle board must remain square and readable");
 assert(visual.tileImage.includes("gameplay-washi/tile.webp")&&
  visual.tileEvenImage.includes("gameplay-washi/tile.webp"),
  "Both alternating cells must display the approved textured paper");
 for(const [state,texture] of Object.entries(visual.stateImages))
  assert(texture.includes("gameplay-washi/tile.webp"),
   "The "+state+" feedback may tint a cell but must retain the paper texture");
 assert(visual.stateImages.selected.includes("linear-gradient"),
  "Selected cells must have clear, visually different feedback");
 assert.equal(visual.header,"none","The game must not show the homepage top bar");
 assert(visual.boardTop>=Math.max(visual.movesBottom,visual.scoreBottom)-2,
  "The board must not overlap interactive score and moves controls");
 assert(visual.boardWidth>visual.scoreWidth*1.7,
  "The puzzle grid must remain the primary visual element");
 assert(visual.bodyWidth<=visual.viewportWidth,
  "The gameplay layout must not introduce horizontal scrolling");
 assert.equal(await page.$(".game-dock"),null,
  "Retired level/restart dock must not return beneath the puzzle");
 assert.equal(await page.$("#gameTip"),null,
  "Tutorial text must not crowd the playing board");
 fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
 await page.screenshot({path:"/tmp/daisugi-bloom/japanese-harmony-mobile.png",fullPage:true});

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
 assert(boardReadability.width>=365,"Phone playfield must use the larger 1.4 frame-free grid: "+JSON.stringify(boardReadability));
 assert(Math.abs(boardReadability.width-boardReadability.height)<2,"Expanded 7x7 board must remain square");
 assert(boardReadability.cell>=48,"Phone tile interaction area must grow alongside board");
 assert(boardReadability.artRatio>=.99&&boardReadability.spriteRatio>=1.03,
  "Illustrated objects should fill more of their own tile, without remapping atlases");
 assert.equal(boardReadability.count,49,"Larger board must retain exactly 49 playable cells");
 await page.click("#pauseButton");assert.equal(await page.$eval("#modal",x=>x.hidden),false);
 assert.equal(await page.$eval("#modalTitle",e=>e.textContent),"Game Menu");
 assert((await page.$eval("#modalActions",e=>e.textContent)).includes("Restart level"));
 assert((await page.$eval("#modalActions",e=>e.textContent)).includes("Back to Goshuincho"));
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
 assert.equal(pauseLayout.primary,"Resume game");
 assert(pauseLayout.resumeHeight>=44,"Resume remains the prominent tap target");
 assert(pauseLayout.utilityWidths.every(w=>w>70),"Help and settings must remain tappable");
 assert(pauseLayout.modalHeight<=pauseLayout.screenHeight,"Pause modal should fit the phone view");
 await page.evaluate(()=>document.querySelector("#modalActions button:nth-child(3)").click());
 assert.equal(await page.$eval("#modalTitle",e=>e.textContent),"How to Play");
 assert((await page.$eval("#modalContent",e=>e.textContent)).includes("Harmony Pulse"));
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
  const families={Sakura:"sakura",Lantern:"lantern",Koi:"koi",Fan:"fan",Bonsai:"bonsai"};
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
  const fromName={Sakura:"sakura",Lantern:"lantern",Koi:"koi",Fan:"fan",Bonsai:"bonsai"};
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
   window.__scoreFxSeen={score:0,trail:0,particle:0,shotColors:[],shotSizes:[],shotDurations:[],shotPaths:[],shotLifetimes:[],shotCore:0,shotLeaders:0,shotTrailers:0,shotGlows:[],burst:0,ring:0,impact:0,milestone:0,family:0,stage:0,fusionFlow:0,fusionAfterglow:0,afterglowPositions:[],afterglowColors:[],afterglowOnEmpty:true,pulseTrace:0,pulseLanding:0,pulseSource:0,masterpiece:0,flowers:0,diamonds:0,stars:0,diamondColor:"",diamondGlow:"",diamondFontSize:0,unified:0,maxTokenWidth:0,maxFamilyToTileRatio:0};
   window.__scoreFxWatcher=new MutationObserver(records=>{
     for(const rec of records)for(const node of rec.addedNodes){
       if(node.nodeType!==1||!node.classList)continue;
       if(node.classList.contains("score-flight-token"))window.__scoreFxSeen.score++;
       if(node.classList.contains("score-trail-dot"))window.__scoreFxSeen.trail++;
       if(node.classList.contains("score-shot-mote")){
        window.__scoreFxSeen.particle++;
        window.__scoreFxSeen.shotColors.push(node.className);
        window.__scoreFxSeen.shotSizes.push(parseFloat(getComputedStyle(node).width));
        if(node.classList.contains("shot-core"))window.__scoreFxSeen.shotCore++;
        if(node.classList.contains("shot-lead"))window.__scoreFxSeen.shotLeaders++;
        if(node.classList.contains("shot-trailer"))window.__scoreFxSeen.shotTrailers++;
        window.__scoreFxSeen.shotGlows.push(getComputedStyle(node).boxShadow);
        const animation=node.getAnimations()[0],timing=animation?.effect?.getTiming();
        if(timing){
         window.__scoreFxSeen.shotDurations.push(timing.duration);
         window.__scoreFxSeen.shotLifetimes.push(timing.duration+(timing.delay||0));
         window.__scoreFxSeen.shotPaths.push(animation.effect?.getKeyframes()?.at(-1)?.transform||"");
        }
       }
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
 assert(scoreAfterTween>beforePoints,"Score must count upward as the last golden particles reach SCORE");
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
 assert.equal(fx.score,0,"There must be no visible flying +points pill");
 assert.equal(fx.trail,0,"There must be no old score beam/trail nodes");
 assert(fx.particle>=12&&fx.shotCore>=1&&fx.shotLeaders>=3&&fx.shotTrailers>=9,
  "A small swarm of individual score motes must fly to SCORE: "+JSON.stringify(fx));
 assert(fx.shotColors.some(cls=>cls.includes("shot-pearl"))&&
  fx.shotColors.some(cls=>cls.includes("shot-gold"))&&
  fx.shotColors.some(cls=>cls.includes("shot-sakura"))&&
  fx.shotColors.some(cls=>cls.includes("shot-star")),
  "Match the pearl/gold/sakura/star magic dust on vacated tiles: "+JSON.stringify(fx));
 assert(fx.shotSizes.every(w=>w>=6&&w<=11),
  "Brightened motes stay small sparkles rather than another flying score badge");
 assert(fx.shotGlows.some(glow=>glow.includes("22px")||glow.includes("20px")),
  "Some leading particles need a strong luminous halo");
 assert(fx.shotLifetimes.length>=12&&Math.max(...fx.shotLifetimes)-Math.min(...fx.shotLifetimes)>=140,
  "Particle tail must persist well behind the leading motes without slowing the score flight");
 assert(fx.shotDurations.length>=5&&fx.shotDurations.every(ms=>ms>=475&&ms<=540),
  "Point stream should retain the original fast ~500ms flight, with no extra pause");
 assert(fx.shotPaths.every(path=>path.includes("translate3d(")),
  "Every mote must travel toward the SCORE counter");
 assert.equal(fx.ring,0,"The disliked circular ring must not appear on ordinary fusions");
 assert(fx.impact>=1,"Incoming points must pulse at the score field: "+JSON.stringify(fx));
 assert.equal(fx.maxTokenWidth,0,"Flying point badges have been intentionally removed");
 assert.equal(await page.evaluate(()=>document.querySelectorAll(".score-flight-token, .score-trail-dot").length),0,
  "Old score pill/trail may not return to the DOM");
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
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Game Menu",{timeout:5000});
 await page.evaluate(()=>{
  const button=[...document.querySelectorAll("#modalActions button")].find(b=>b.textContent==="Performance");
  if(!button)throw new Error("Performance action missing from open game menu");
  button.click();
 });
 assert.equal(await page.$eval("#modalTitle",e=>e.textContent),"Performance");
 const report=await page.$eval("#modalContent",e=>e.textContent);
 assert(report.includes("Measured moves")&&report.includes("95th percentile")&&report.includes("Animations started"),
  "Performance report should expose turn metrics, not fake benchmark values");
 assert(report.includes("No data is sent."),"Diagnostics must be local-only");
 await page.click("#modalActions button");assert.equal(await page.$eval("#modal",x=>x.hidden),true);


 await page.click("#pauseButton");
 await page.evaluate(()=>{
  const restart=[...document.querySelectorAll("#modalActions button")].find(b=>b.textContent==="Restart level");
  if(!restart)throw new Error("Restart option missing from pause menu");
  restart.click();
 });
 const festivalAfterRestart=await page.evaluate(()=>document.body.dataset.festival);
 assert.notEqual(festivalAfterRestart,festivalAtStart,"A restarted level must choose a different background");
 assert.equal(await page.$$eval(".tile",els=>els.length),49);
  await page.click("#pauseButton");
 await page.evaluate(()=>[...document.querySelectorAll("#modalActions button")].find(b=>b.textContent==="Back to Goshuincho").click());
 assert.equal(await page.$eval("#menuView",x=>x.hidden),false);
 assert.equal(await page.$eval("#gameView",x=>x.hidden),true);
 assert.equal(await page.$eval("#modalTitle",x=>x.textContent),"Goshuincho",
  "Returning from the pause menu must open the primary level book");
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
  assert(ryu.families.includes("Ryu Dragon")&&ryu.visible,
   "Level 5 should display Ryu's atlas sprite in the four-family game");
 // Economy Onboarding 2.0: after level 11 coins, level 12 should award
 // just enough for an entry Omamori and show one concise, actionable invite.
 const omamoriIntroContext=await browser.createBrowserContext();
 try{
  const intro=await omamoriIntroContext.newPage();
  await intro.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await intro.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
  await intro.evaluate(()=>{
   const R=window.HarmonyRules,key="japanese-harmony-puzzle-v2";
   const g=new R.Game(11,null,{seed:120012,directorMode:"v4"});
   const pair=R.validSwaps(g.board)[0];
   // A real stage-3 creation is now available from one legitimate fusion.
   g.board[pair[0]].stage=2;
   g.board[pair[1]].stage=2;
   g.stage3=g.target()-1;
   const s=JSON.parse(localStorage.getItem(key));
   s.unlocked=11;s.bestStars={10:3};s.run={level:11,data:g.save()};
   s.economy={version:1,coins:36,paidStars:{10:3},owned:[],equipped:null};
   s.omamoriCards={version:2,counts:{},discovered:[],replay:{day:"",claims:0}};
   localStorage.setItem(key,JSON.stringify(s));
  });
  await intro.reload({waitUntil:"networkidle2"});
  await intro.click("#continueButton");
  await intro.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});
  await acknowledgeTutorial(intro);
  const pair=await intro.evaluate(()=>{
   const s=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   return window.HarmonyRules.validSwaps(s.run.data.board)[0];
  });
  await intro.evaluate(([a,b])=>{
   document.querySelector('.tile[data-index="'+a+'"]').click();
   document.querySelector('.tile[data-index="'+b+'"]').click();
  },pair);
  await intro.waitForFunction(()=>!document.querySelector("#modal").hidden&&
   !!document.querySelector(".victory-compact"),{timeout:35000});
  const reward=await intro.evaluate(()=>{
   const s=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
   return {coins:s.economy.coins,flag:s.omamoriIntroSeen,
    invited:!!document.querySelector(".jh-omamori-welcome"),
    shop:!!document.querySelector(".jh-omamori-shop-button")};
  });
  assert.equal(reward.coins,72,"Levels 11+12 at three stars should yield 72 coins");
  assert(reward.invited&&reward.shop&&reward.flag,
   "First affordable card must be introduced exactly when the player can buy it");
  await intro.click(".jh-omamori-shop-button");
  assert.equal(await intro.$eval("#modalTitle",e=>e.textContent),"Omamori");
  assert.equal(await intro.$eval(".omamori-wallet strong",e=>e.textContent),"72 Harmony Coins");
  assert.equal(await intro.$eval(".omamori-action",nodes=>nodes.filter(n=>!n.disabled).length),2,
   "Starter cards should be available in the introduced shop");
 }finally{await omamoriIntroContext.close();}

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
  await clarity.click("#continueButton");await clarity.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});await acknowledgeTutorial(clarity);
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
   return !dialog.hidden&&dialog.querySelector("#modalTitle")?.textContent==="Beautiful harmony!";
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
  assert(reached.buttons.includes("Next level →")&&reached.buttons.includes("Keep playing for a high score"));
  assert(reached.buttons.includes("Main Menu")&&!reached.buttons.includes("Goshuincho · Level Select"),
   "Victory must offer Main Menu, not direct book navigation");
  assert.equal(await clarity.$eval(".victory-details",e=>e.open),false,
   "Optional statistics must be collapsed on first view");
  assert.equal(await clarity.$eval(".victory-reward-copy span",e=>e.textContent),
   "Harmony Coins unlock after level 10",
   "Tutorial victories must not award coins");
  assert.equal(await clarity.$eval(".victory-compact",e=>!e.querySelector(".jh-omamori-welcome")),true,
   "Tutorial victories must not advertise affordable Omamori");
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
     record:computed(".victory-record").backgroundColor,
     firstIcon:computed(".victory-stat:first-child .victory-stat-icon").backgroundColor,
     secondIcon:computed(".victory-stat:nth-child(2) .victory-stat-icon").backgroundColor,
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
   assert(colors.header.includes("linear-gradient")&&
    colors.header.includes("255, 245, 229")&&
    colors.score.includes("linear-gradient")&&
    colors.record.includes("255, 231, 184")&&
    colors.firstIcon.includes("255, 246, 228")&&
    colors.secondIcon.includes("255, 246, 228")&&
    colors.action.includes("linear-gradient")&&colors.star.includes("linear-gradient"),
    "Victory must use the current warm paper, bronze score and red action styling: "+JSON.stringify(colors));
   assert(colors.stars==="★★★"&&colors.stats===4&&colors.contentScroll==="auto",
    "Accent pass cannot change the reward content or scroll behaviour");
   assert(colors.docWidth<=colors.viewWidth&&colors.innerHeight<=colors.viewHeight&&
    colors.nextTop>=0&&colors.nextBottom<=colors.viewHeight,
    "Both mobile sizes must keep the primary Next Level button in view");
  }
  await clarity.setViewport({width:390,height:844,deviceScaleFactor:2,
   isMobile:true,hasTouch:true});
  assert(reached.scoreLabel.startsWith("SCORE"),"The score label must remain clear");
  await clarity.evaluate(()=>[...document.querySelectorAll("#modalActions button")].find(x=>x.textContent.includes("Keep playing for a high score")).click());
  assert.equal(await clarity.$eval("#modal",x=>x.hidden),true,
   "Voluntary record play must resume immediately");
  assert.equal(await clarity.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data.complete),true);
  await clarity.click("#pauseButton");
  await clarity.evaluate(()=>[...document.querySelectorAll("#modalActions button")].find(x=>x.textContent==="Finish and view results").click());
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
