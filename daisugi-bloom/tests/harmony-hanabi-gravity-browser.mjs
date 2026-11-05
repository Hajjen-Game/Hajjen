import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
// Test the actual browser DOM animation, not just the physics snapshots.
// A Hanabi launch promotes a stage-4 treasure to a Masterpiece and harvests
// it. The ORIGINAL treasure above must physically drop into the new hole.
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(path=>fs.existsSync(path));
if(!exe)throw Error("Chrome required");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"no-preference"}]);
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 // Level 61 is an unranked Game Dev preview, not a published Journey level.
 // Instrument only the fixture's real Game constructor during preview creation
 // to guarantee the stage-four tile which proves FLIP after Hanabi harvesting.
 const baseline=await page.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")));
 await page.evaluate(()=>{
  const original=HarmonyRules.Game;
  HarmonyRules.Game=new Proxy(original,{construct(target,args,newTarget){
   const game=Reflect.construct(target,args,newTarget);
   if(args[0]===60&&args[2]?.lotusPreview==="pilot"){
    if(!game.board[22]||game.board[22].stage<1)throw Error("Missing real Hanabi stage-four fixture");
    game.board[22].stage=4;game.stage4=1;
    window.__hanabiGravityGame=game;
   }
   return game;
  }});
  window.__hanabiRestoreGame=()=>{HarmonyRules.Game=original;};
 });
 await page.$eval("#menuAdvanced",e=>e.open=true);
 await page.$eval("#devPreviews",e=>e.open=true);
 await page.click("#lotusPreviewButton");
 await page.waitForSelector('.lotus-preview-choice[data-preview="pilot"]');
 await page.click('.lotus-preview-choice[data-preview="pilot"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:15000});
 await page.evaluate(()=>window.__hanabiRestoreGame());
 assert.equal(await page.$eval("#modal",e=>e.hidden),true);
 const state=await page.evaluate(()=>({
  tile:document.querySelector('.tile[data-index="22"]').getAttribute("aria-label"),
  box:document.querySelectorAll(".hanabi-crate").length
 }));
 assert.equal(state.box,2);
 assert(state.tile.includes("tier 4"),"Reloaded fixture must really contain the stage-four treasure");
 await page.evaluate(()=>{
  window.__hanabiGravity={afterLaunch:false,moves:[],traversed:false};
  const observer=new MutationObserver(records=>{
   for(const record of records)for(const node of record.addedNodes){
    if(node.nodeType===1&&node.classList?.contains("hanabi-glitter-mote"))
     window.__hanabiGravity.afterLaunch=true;
   }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(keyframes,options){
   const at=Number(this.closest?.(".tile")?.dataset?.index);
   if(window.__hanabiGravity.afterLaunch&&this.classList?.contains("piece")&&
      Number.isInteger(at)){
    const frames=Array.isArray(keyframes)?keyframes:[];
    const start=frames[0]?.transform||"";
    if(start.startsWith("translate3d(")&&start.includes("px")){
     window.__hanabiGravity.moves.push({at,start,
      duration:options?.duration||0,easing:options?.easing||""});
    }
   }
   return animate.apply(this,arguments);
  };
  document.querySelector('.tile[data-index="37"]').click();
  document.querySelector('.tile[data-index="44"]').click();
 });
 await page.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false"&&
  document.querySelector("#goalProgress").textContent==="1 / 2",
  {timeout:40000});
 const result=await page.evaluate(()=>({
  witness:window.__hanabiGravity,
  saved:window.__hanabiGravityGame.save(),
  persisted:JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"))
 }));
 for(const key of ["unlocked","run","journeyProgression","economy","bestStars","omamoriCards"])
  assert.deepEqual(result.persisted[key],baseline[key],
   "Unranked Hanabi FLIP fixture must preserve actual "+key);
 const events=result.saved.roundTrace.moves[0].events;
 const launch=events.find(e=>e.type==="hanabi-launch"&&e.targets?.some(t=>t.stage===5));
 assert(launch,"A real Hanabi stage-five promotion must occur");
 const destination=launch.targets.find(t=>t.stage===5).to;
 const fall=result.witness.moves.filter(m=>m.at===destination);
 assert(fall.some(m=>/translate3d\([^,]+,-[\d.]+px,0\)/.test(m.start)&&
  m.duration>=195&&m.duration<=265),
  "Hanabi refill must reuse Fusion's stable-identity downward FLIP at the harvested target");
 assert.deepEqual(errors,[]);
 console.log("PASS Hanabi Gravity: original treasure physically falls into Hanabi's harvested hole with ordinary Fusion FLIP");
}finally{await browser.close();}
