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
 assert.equal(await page.$$eval(".level-tile",els=>els.length),10);
 assert.equal(await page.$eval("#continueButton",x=>x.disabled),false);
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
 const atlasState=await page.evaluate(()=>({
   images:document.querySelectorAll(".tile .sprite").length,
   style:getComputedStyle(document.querySelector(".tile .sprite")).backgroundImage,
   loaded:document.documentElement.classList.contains("has-atlas")
 }));
 assert.equal(atlasState.images,49,"All 49 cells must have art sprites");
 assert(atlasState.loaded&&atlasState.style.includes("harmony-atlas.webp"),"Approved Japanese art atlas missing from live board");
 assert.equal(await page.$eval("#scorePanel",e=>e.contains(document.querySelector("#scoreCount"))),true,"Score panel must own the score counter");
 assert.equal(await page.$eval("#levelTitle",e=>e.textContent),"First Match");
 assert.equal(await page.$eval("#gameView",e=>e.hidden),false);
 const start=await page.evaluate(()=>{let g=new HarmonyRules.Game(0);return {moves:g.moves,stage:g.board.length,ready:HarmonyRules.validSwaps(g.board).length,shape:HarmonyRules.levels[7].goal.type};});
 assert.equal(start.moves,12);assert.equal(start.stage,49);assert(start.ready>=3);assert.equal(start.shape,"shape");
 const box=await page.$eval("#board",e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
 assert(box.width>300&&Math.abs(box.width-box.height)<2,"7x7 board should be square and fill phone width");
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
 await page.click("#pauseButton");assert.equal(await page.$eval("#modal",x=>x.hidden),false);
 assert.equal(await page.$eval("#modalTitle",e=>e.textContent),"Spelmeny");
 assert((await page.$eval("#modalActions",e=>e.textContent)).includes("Börja om nivån"));
 assert((await page.$eval("#modalActions",e=>e.textContent)).includes("Till nivåval"));
 await page.evaluate(()=>document.querySelector("#modalActions button:nth-child(3)").click());
 assert((await page.$eval("#modalContent",e=>e.textContent)).includes("Power Moves"));
 await page.click("#modalActions button");assert.equal(await page.$eval("#modal",x=>x.hidden),true);
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
 const invalidBoard=await page.$eval(".tile",els=>els.map(e=>e.getAttribute("aria-label")).join("|"));
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
 assert.equal(await page.$eval(".tile",els=>els.map(e=>e.getAttribute("aria-label")).join("|")),invalidBoard);
 assert.equal(await page.$eval(".tile",els=>els.length),49);
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
      window.__gatherMotion.push({frames,duration:options.duration});
     }
     return realAnimate.apply(this,args);
   };
 });
 await page.evaluate(()=>{
   window.__scoreFxSeen={score:0,trail:0,burst:0,ring:0,impact:0,milestone:0,family:0,stage:0,pulseTrace:0,pulseLanding:0,pulseSource:0,masterpiece:0,maxTokenWidth:0,maxFamilyToTileRatio:0};
   window.__scoreFxWatcher=new MutationObserver(records=>{
     for(const rec of records)for(const node of rec.addedNodes){
       if(node.nodeType!==1||!node.classList)continue;
       if(node.classList.contains("score-flight-token"))window.__scoreFxSeen.score++;
       if(node.classList.contains("score-trail-dot"))window.__scoreFxSeen.trail++;
       if(node.classList.contains("fusion-spark"))window.__scoreFxSeen.burst++;
       if(node.classList.contains("fusion-ring"))window.__scoreFxSeen.ring++;
       if(node.classList.contains("score-impact-ring"))window.__scoreFxSeen.impact++;
       if(node.classList.contains("fusion-milestone"))window.__scoreFxSeen.milestone++;
        if(node.classList.contains("evo-family")){
         window.__scoreFxSeen.family++;
         const tileWidth=document.querySelector(".tile")?.getBoundingClientRect().width||1;
         window.__scoreFxSeen.maxFamilyToTileRatio=Math.max(window.__scoreFxSeen.maxFamilyToTileRatio,
          node.getBoundingClientRect().width/tileWidth);
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
 assert(gather.every(g=>g.duration>=510&&g.frames.length===7&&
  g.frames.every(k=>k.opacity===1)&&g.frames.at(-1).offset===1&&
  g.frames.at(-1).transform===g.frames.at(-2).transform),
  "A 3–5 match must use slow, fully visible absorption plus a distinct contact hold");
 assert(await page.evaluate(()=>!!window.__invalidMotion.length),"Rebound keyframes should have been recorded");
 await page.waitForFunction(previous=>Number((document.querySelector("#scoreCount")?.textContent||"").replace(/\D/g,""))>previous,{timeout:5000},beforePoints);
 // Count animation must finish with the earned amount, not stick on an
 // intermediate number or drift while multiple rewards are arriving.
 await new Promise(resolve=>setTimeout(resolve,600));
 const scoreAfterTween=Number((await page.$eval("#scoreCount",e=>e.textContent)).replace(/\D/g,""));
 assert(scoreAfterTween>beforePoints,"Score must visibly count upward after the flying token arrives");
 const fx=await page.evaluate(()=>window.__scoreFxSeen);
 assert(fx.burst>=3,"Expected a small fusion burst around the survivor: "+JSON.stringify(fx));
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
 assert(!errors.length,"Unexpected browser errors: "+errors.join("; "));
 console.log("PASS Japanese Harmony mobile first playable",box);
}finally{await browser.close();}
