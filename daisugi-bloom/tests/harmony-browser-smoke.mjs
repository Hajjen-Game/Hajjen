import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const browserPaths=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"];
const exe=browserPaths.find(p=>fs.existsSync(p));
if(!exe)throw new Error("Chrome/Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage();const errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",m=>{if(m.type()==="error"&&!/harmony-atlas|404/.test(m.text()))errors.push(m.text());});
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>!!window.HarmonyRules);
 // UI Cleanup & Premium Polish 1.0: level list is the primary action,
 // the Director is hidden behind an accessible disclosure until requested.
 const uiMenu=await page.evaluate(()=>{
  const a=document.querySelector(".hero").getBoundingClientRect();
  const b=document.querySelector(".level-tile").getBoundingClientRect();
  const advanced=document.querySelector("#menuAdvanced");
  return {heroHeight:a.height,levelTop:b.top,advancedOpen:advanced.open,
   directorHidden:getComputedStyle(document.querySelector("#gameDirectorMode")).display,
   introduction:document.querySelector(".hero p").textContent,
   familyCopy:document.querySelector(".family-progression-note").textContent,
   bodyWidth:document.body.scrollWidth};
 });
 assert(uiMenu.heroHeight<210,"Shorter hero should no longer bury level selection");
 assert(uiMenu.levelTop<780,"Level selection should appear on the initial phone view");
 assert.equal(uiMenu.advancedOpen,false,"Director controls should start folded");
 assert(!uiMenu.introduction.includes("fem per nivå"),"Intro must not claim five families on every level");
 assert(uiMenu.familyCopy.includes("4 familjer")&&uiMenu.familyCopy.includes("5 familjer"));
 assert(uiMenu.bodyWidth<=390,"Premium menu must have no horizontal overflow");
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
  await art.click(".level-tile:first-child");
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
  await art.click(".level-tile:nth-child(8)");
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
  await offline.click(".level-tile:first-child");
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
  await offline.click(".level-tile:nth-child(8)");
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
  await recover.click(".level-tile:first-child");
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
  await demo.click(".level-tile:first-child");
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
  await demo.click(".level-tile:first-child");
  const v2=await demo.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data.directorMode);
  assert.equal(v2,"v2","Director 2.0 must remain available in live gameplay");
  await demo.click("#pauseButton");
  await demo.click("#modalActions button:last-child");
  await demo.$eval("#menuAdvanced",e=>e.open=true);
  await demo.select("#gameDirectorMode","standard");
  await demo.click(".level-tile:first-child");
  const standard=await demo.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run.data.directorMode);
  assert.equal(standard,"standard","Standard remains selectable");
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
  await preview.click(".level-tile:first-child");
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
  await preview.click(".level-tile:nth-child(11)");
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
  await hintPage.click(".level-tile:first-child");
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
     const chosen=R.bestHint(live);
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
    target:R.levelConfig(10).goal.count};
  });
  assert.equal(migrated.unlocked,12,"Already unlocked future levels must stay unlocked");
  assert.equal(migrated.record,1600,"Original high score must not be overwritten");
  assert.equal(migrated.stars,1,"Old overly generous 3 stars should be adjusted to 1");
  assert.equal(migrated.nextStars,3,"Excellent prior score must still earn 3 stars");
  assert(migrated.shown.replace(/\s/g," ").includes("1 600")&&migrated.second.replace(/\s/g," ").includes("18 000"),
   "The level list must display personal best scores for completed stages");
  assert.equal(migrated.target,5000);
  await legacy.click(".level-tile:nth-child(11)");
  const milestones=await legacy.evaluate(()=>({
   hidden:document.querySelector("#starTargets").hidden,
   text:[...document.querySelector("#starTargets").children].map(x=>x.textContent)
  }));
  assert(!milestones.hidden);
  assert.equal(milestones.text.length,3);
  assert(milestones.text[0].replace(/\s/g," ").includes("5 000"));
  assert(milestones.text[1].replace(/\s/g," ").includes("7 500"));
  assert(milestones.text[2].replace(/\s/g," ").includes("11 250"));
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
  assert.deepEqual(rebalanced.stars,[1,2,2,2],
   "Revised Journey rewards must recognize existing performance automatically");
  assert(rebalanced.shown[1].includes("★★")&&!rebalanced.shown[1].includes("★★★"));

 }finally{await legacyContext.close();}
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
   return types;
  });
  await praisePage.reload({waitUntil:"networkidle2"});
  await praisePage.click("#continueButton");
  await praisePage.evaluate(()=>{
   window.__masterpieceFireworks={big:0,flowers:0,diamonds:0,stars:0};
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
  assert(fixture.includes("echo")&&fixture.includes("hero")&&fixture.includes("pulse"));
  assert(praise.accents.echo>=1&&praise.accents.pulse>=1,
   "Real Echo and Pulse need small matching celebration accents: "+JSON.stringify(praise.accents));
  assert(praise.accents.shapes.includes("diamond")&&praise.accents.shapes.includes("flower"),
   "Echo/Pulse accents must share the pearl, Sakura and gold language");
  assert(praise.fireworks.big>=5&&praise.fireworks.flowers>=1&&
   praise.fireworks.diamonds>=1&&praise.fireworks.stars>=1,
   "A real Masterpiece must launch the stronger tri-color mini-firework: "+JSON.stringify(praise.fireworks));
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
 assert.equal(await page.evaluate(()=>document.querySelectorAll(".level-tile").length),20,"Paged level menu shows 20 at a time");
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
  versionShown:document.querySelector(".engine-lab-output")?.textContent.includes("6.3.0")
 }));
 assert.equal(comparisonUI.versions.filter(x=>x==="Standard").length,4);
 assert.equal(comparisonUI.versions.filter(x=>x==="Director 1.0").length,4);
 assert.equal(comparisonUI.versions.filter(x=>x==="Director 2.0").length,4);
 assert.equal(comparisonUI.versions.filter(x=>x==="Pacing 3.0").length,4);
 assert.equal(comparisonUI.summaries,12);
 assert(comparisonUI.versionShown,"The report must expose the game engine version");
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
 assert.equal(await page.$eval("#levelTitle",e=>e.textContent),"First Match");
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
 assert.equal(start.moves,24);assert.equal(start.stage,49);assert(start.ready>=3);assert.equal(start.level8Goal,"stage3");assert.equal(start.level8Count,5);assert.equal(start.level8Moves,40);
 const endless=await page.evaluate(()=>{
  const R=window.HarmonyRules;
  return [10,49,100].map(i=>({number:i+1,type:R.levelConfig(i).goal.type,
   families:R.activeFamilies(i).length,moves:R.levelConfig(i).moves}));
 });
 assert(endless.every(x=>x.type==="score"&&x.families===5&&x.moves>=34));
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
 assert((await page.$eval("#modalActions",e=>e.textContent)).includes("Till nivåval"));
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
   const realAnimate=Element.prototype.animate;
   Element.prototype.animate=function(...args){
     if(this.matches(".piece, .fusion-ghost, .pulse-dot"))window.__kineticAnimationCount++;
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
   window.__scoreFxSeen={score:0,trail:0,burst:0,ring:0,impact:0,milestone:0,family:0,stage:0,pulseTrace:0,pulseLanding:0,pulseSource:0,masterpiece:0,flowers:0,diamonds:0,stars:0,diamondColor:"",diamondGlow:"",diamondFontSize:0,unified:0,maxTokenWidth:0,maxFamilyToTileRatio:0};
   window.__scoreFxWatcher=new MutationObserver(records=>{
     for(const rec of records)for(const node of rec.addedNodes){
       if(node.nodeType!==1||!node.classList)continue;
       if(node.classList.contains("score-flight-token"))window.__scoreFxSeen.score++;
       if(node.classList.contains("score-trail-dot"))window.__scoreFxSeen.trail++;
       if(node.classList.contains("fusion-spark"))window.__scoreFxSeen.burst++;
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
 assert(await page.evaluate(()=>!!window.__invalidMotion.length),"Rebound keyframes should have been recorded");
 await page.waitForFunction(previous=>Number((document.querySelector("#scoreCount")?.textContent||"").replace(/\D/g,""))>previous,{timeout:5000},beforePoints);
 // Count animation must finish with the earned amount, not stick on an
 // intermediate number or drift while multiple rewards are arriving.
 await new Promise(resolve=>setTimeout(resolve,600));
 const scoreAfterTween=Number((await page.$eval("#scoreCount",e=>e.textContent)).replace(/\D/g,""));
 assert(scoreAfterTween>beforePoints,"Score must visibly count upward after the flying token arrives");
 const fx=await page.evaluate(()=>window.__scoreFxSeen);
 assert(fx.burst>=3,"Expected a small fusion burst around the survivor: "+JSON.stringify(fx));
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
 assert(fx.ring>=1,"The fusion must produce a readable expanding ring: "+JSON.stringify(fx));
 assert(fx.impact>=1,"Incoming points must pulse at the score field: "+JSON.stringify(fx));
 assert(fx.maxTokenWidth>=35,"Points must have a legible sized label: "+JSON.stringify(fx));
 assert.equal(await page.$$eval(".tile .stage",els=>els.length),0,"Score FX must not reintroduce permanent labels");
 assert.equal(await page.evaluate(()=>document.body.dataset.festival),festivalAtStart,"Backdrop must not change during a turn");
 await page.evaluate(()=>window.__scoreFxWatcher.disconnect());
 assert(await page.evaluate(()=>!!window.HarmonyPerf&&typeof window.HarmonyPerf.create==="function"),
  "Mobile 4.3 frame profiler should load before gameplay");
 await page.click("#pauseButton");
 await page.evaluate(()=>[...document.querySelectorAll("#modalActions button")].find(b=>b.textContent==="Prestanda").click());
 assert.equal(await page.$eval("#modalTitle",e=>e.textContent),"Prestanda");
 const report=await page.$eval("#modalContent",e=>e.textContent);
 assert(report.includes("Mätta drag")&&report.includes("95:e percentilen")&&report.includes("Startade animationer"),
  "Performance report should expose turn metrics, not fake benchmark values");
 assert(report.includes("Inga data skickas"),"Diagnostics must be local-only");
 await page.click("#modalActions button");assert.equal(await page.$eval("#modal",x=>x.hidden),true);


 await page.click("#pauseButton");
 await page.evaluate(()=>document.querySelector("#modalActions button:nth-child(2)").click());
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
 await page.click("#levelList .level-tile:nth-child(3)");
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
  await page.click("#levelList .level-tile:nth-child(5)");
  const ryu=await page.evaluate(()=>({
   families:[...new Set([...document.querySelectorAll(".tile")].map(e=>e.getAttribute("aria-label")?.split(",")[0]))],
   visible:[...document.querySelectorAll(".piece.new-family")].every(e=>{
    const sprite=e.querySelector(".sprite-new");
    return getComputedStyle(sprite).display==="block";
   })
  }));
  assert(ryu.families.includes("Ryu-drake")&&ryu.visible,
   "Level 5 should display Ryu's atlas sprite in the four-family game");
 assert(!errors.length,"Unexpected browser errors: "+errors.join("; "));
 console.log("PASS Japanese Harmony mobile first playable",box);
}finally{await browser.close();}
