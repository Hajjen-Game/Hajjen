import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(fs.existsSync);
if(!executablePath)throw Error("Chromium is required");
const browser=await puppeteer.launch({executablePath,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
const KEY="japanese-harmony-puzzle-v2";
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"no-preference"}]);
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",
  {waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonyHanabiCrate?.VERSION===3&&
  !!window.HarmonyJourneyAuthoredOpenings);
 // Install a legitimately unlocked Puzzle Architect level-five run. Do not
 // bypass the public startLevel path or use retired generated levels.
 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=4;
  save.run=null;
  save.tutorialHelpSeen={};
  delete save.journeyProgression;
  localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 await page.reload({waitUntil:"networkidle2",timeout:40000});
 const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 await page.evaluate(()=>{
  window.__hanabiPlayedEvents=[];
  const Original=HarmonyRules.Game;
  HarmonyRules.Game=new Proxy(Original,{construct(Target,args,newTarget){
   const game=Reflect.construct(Target,args,newTarget);
   if(args[0]===4&&game.levelRecipe){
    window.__hanabiLiveGame=game;
    const play=game.swap.bind(game);
    game.swap=(...input)=>{
     const result=play(...input);
     if(result.ok)window.__hanabiPlayedEvents.push(...result.events);
     return result;
    };
   }
   return game;
  }});
 });
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden&&
  !!window.__hanabiLiveGame,{timeout:12000});
 await page.evaluate(()=>document.querySelector("#modalActions .jh-tutorial-ok")?.click());
 await page.waitForFunction(()=>document.querySelector("#modal").hidden,{timeout:5000});
 const initial=await page.evaluate(()=>({
  rocket:document.querySelector('.tile[data-index="31"]')?.classList.contains("lotus-seed-tile"),
  box:document.querySelector('.tile[data-index="45"]')?.classList.contains("hanabi-box-tile"),
  title:document.querySelector("#levelTitle")?.textContent,
  director:window.__hanabiLiveGame.directorMode,
  recipe:window.__hanabiLiveGame.levelRecipe?.id
 }));
 assert(initial.rocket&&initial.box,"Tutorial fixtures must align in the center column");
 assert.equal(initial.title,"First Firework");
 assert.equal(initial.director,"v63");
 assert(initial.recipe?.startsWith("journey2-"));
 await page.evaluate(()=>{
  window.__hanabiSpreadVfx={
   mainMarks:[],sideMarks:[],sideSparks:[],audio:[],
   impactBlooms:[],impactParticles:[],mainGlitterSeen:false,burstAfterMain:false,
   apexFlowers:[],apexRays:0,apexFlash:false,sideAfterApex:false,
   fullBoardAtLaunch:null,initialMarkedBeforeGlitter:false,
   firstMainParticle:false
  };
  const audio=window.HarmonyAudio;
  window.HarmonyAudio={...audio,play(kind,detail){
   if(kind.startsWith("hanabi-"))window.__hanabiSpreadVfx.audio.push(kind);
   return audio.play(kind,detail);
  }};
  const w=window.__hanabiSpreadVfx;
  const observer=new MutationObserver(records=>{
   for(const record of records)for(const n of record.addedNodes){
    if(n.nodeType!==1||!n.classList)continue;
    if(n.classList.contains("hanabi-telegraph-glow"))
     w.mainMarks.push(Number(n.dataset.to));
    if(n.classList.contains("hanabi-glitter-mote")&&!n.classList.contains("hanabi-spread-spark")){
     if(!w.firstMainParticle){
      w.firstMainParticle=true;
      w.initialMarkedBeforeGlitter=w.mainMarks.length===6;
      w.fullBoardAtLaunch=[...document.querySelectorAll("#board .tile")].length===49&&
       [...document.querySelectorAll("#board .tile")].every(cell=>
        !!cell.querySelector(".piece,.hanabi-crate,.lotus-seed-art,.hanabi-firework-art"));
     }
     w.mainGlitterSeen=true;
    }
    if(n.classList.contains("hanabi-apex-flower"))
     w.apexFlowers.push({
      duration:n.getAnimations()[0]?.effect?.getTiming()?.duration??0,
      width:parseFloat(getComputedStyle(n).width)||0,
      cellWidth:document.querySelector(".tile")?.getBoundingClientRect().width||1
     });
    if(n.classList.contains("hanabi-apex-ray"))w.apexRays++;
    if(n.classList.contains("hanabi-apex-flash"))w.apexFlash=true;
    if(n.classList.contains("hanabi-spread-glow")){
     w.sideMarks.push(Number(n.dataset.to));
     w.burstAfterMain=w.burstAfterMain||w.mainGlitterSeen;
     w.sideAfterApex=w.sideAfterApex||w.apexFlowers.length===1;
    }
    if(n.classList.contains("hanabi-spread-spark"))
     w.sideSparks.push(Number(n.dataset.to));
    if(n.classList.contains("hanabi-impact-bloom")){
     w.impactBlooms.push({
      to:Number(n.dataset.to),kind:n.dataset.kind,
      duration:n.getAnimations()[0]?.effect?.getTiming()?.duration??0,
      revealed:n.dataset.kind!=="canopy"||
       !!n.closest(".tile")?.getAttribute("aria-label")?.includes("tier ")
     });
    }
    if(n.classList.contains("hanabi-hit-particle"))
     w.impactParticles.push({to:Number(n.dataset.to),kind:n.dataset.kind});
   }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.__hanabiSpreadObserver=observer;
 });
 // Two authentic moves. The first sets up the route; the second collects
 // the firework, fills every gap, launches, then sparks into the upper rows.
 const click=async(a,b)=>page.evaluate(([source,dest])=>{
  document.querySelector('.tile[data-index="'+source+'"]').click();
  document.querySelector('.tile[data-index="'+dest+'"]').click();
 },[a,b]);
 await click(32,33);
 await page.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false"&&
  document.querySelector("#movesCount").textContent==="29",{timeout:30000});
 await click(32,39);
 await page.waitForFunction(()=>window.__hanabiLiveGame?.complete&&
  document.querySelector("#board").getAttribute("aria-busy")==="false"&&
  window.__hanabiSpreadVfx.sideMarks.length===3,{timeout:50000});
 const result=await page.evaluate(key=>{
  const g=window.__hanabiLiveGame,w=window.__hanabiSpreadVfx;
  const events=window.__hanabiPlayedEvents;
  const delivery=events.findIndex(e=>e.type==="hanabi-delivery");
  const filled=events.findIndex(e=>e.type==="hanabi-prelaunch-fill");
  const launched=events.findIndex(e=>e.type==="hanabi-launch");
  const launchedEvent=events[launched],filledEvent=events[filled];
  return {
   delivery,filled,launched,
   filledCells:filledEvent?.board.filter(Boolean).length,
   targets:launchedEvent?.spreadTargets.map(x=>x.to),
   main:launchedEvent?.targets.map(x=>x.to),
   upgradeProof:launchedEvent?.spreadTargets.every(hit=>
    launchedEvent.board[hit.to].stage===filledEvent.board[hit.to].stage+1),
   goal:g.lotusDelivered,
   winner:g.complete,
   vfx:w,width:document.documentElement.scrollWidth,screen:innerWidth,
   saved:JSON.parse(localStorage.getItem(key)),
   initialState:g.config.goal.type
  };
 },KEY);
 assert(result.delivery>=0&&result.filled>result.delivery&&result.launched>result.filled);
 assert.equal(result.filledCells,49);
 assert.equal(result.upgradeProof,true);
 assert.deepEqual([...result.vfx.sideMarks].sort((a,b)=>a-b),
  [...result.targets].sort((a,b)=>a-b),
  "Side spark targets must be exactly the engine's three REAL upgrades");
 assert.equal(result.vfx.mainMarks.length,6);
 assert(result.vfx.mainMarks.every(to=>to%7===3));
 assert(result.vfx.initialMarkedBeforeGlitter);
 assert.equal(result.vfx.fullBoardAtLaunch,true,"No fireworks may launch into blank tiles");
 assert(result.vfx.burstAfterMain);
 assert.equal(result.vfx.apexFlowers.length,1,
  "The firework MUST have a single unmistakable explosion at the top");
 assert(result.vfx.apexFlowers[0].duration>=950,
  "The main explosion must outlive the grid charge and not flicker away");
 assert(result.vfx.apexFlowers[0].width>=result.vfx.apexFlowers[0].cellWidth*2.7,
  "The apex blossom should span almost three full game tiles");
 assert(result.vfx.apexRays>=12&&result.vfx.apexFlash,
  "A radial, colorful spark shower must erupt from the actual apex");
 assert(result.vfx.sideAfterApex,
  "The three real side impacts must arrive AFTER the explosion starts");
 assert(result.vfx.sideSparks.length>=6,"Fan sparks must actually fly to upgraded neighbors");
 assert(result.vfx.sideSparks.every(to=>result.targets.includes(to)));
 const mainBloom=result.vfx.impactBlooms.filter(x=>x.kind==="column"),
  canopyBloom=result.vfx.impactBlooms.filter(x=>x.kind==="canopy");
 assert.deepEqual(mainBloom.map(x=>x.to).sort((a,b)=>a-b),
  [3,10,17,24,31,38],"Every real vertical hit must bloom");
 assert.deepEqual(canopyBloom.map(x=>x.to).sort((a,b)=>a-b),
  [...result.targets].sort((a,b)=>a-b),
  "Each of the 3 extra upgraded treasures needs its own visible starfire");
 assert(mainBloom.every(x=>x.duration>=550),"Column impacts must be readable");
 assert(canopyBloom.every(x=>x.duration>=800),
  "The actual firework explosion must be longer than the old 440ms flash");
 assert(canopyBloom.every(x=>x.revealed),
  "Upgraded treasure artwork must already be revealed DURING the explosion");
 assert(result.vfx.impactParticles.length>=24,
  "The genuine hit cells need outward-travelling firework sparks, not just borders");
 assert.deepEqual(result.vfx.audio,[
  "hanabi-load","hanabi-charge","hanabi-launch","hanabi-burst"
 ],"Load, charge, launch and canopy explosion need audible order");
 assert.equal(result.goal,1);assert.equal(result.winner,true);
 assert.equal(result.initialState,"lotus");
 assert(result.width<=result.screen+1,"No horizontal mobile overflow");
 assert.deepEqual(errors,[]);
 console.log("PASS Hanabi Spread 2.0 · 390px full refill, center launch, 3 true random side upgrades, colored fan and burst audio");
}finally{await browser.close();}
