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
   mainGlitterSeen:false,burstAfterMain:false,
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
    if(n.classList.contains("hanabi-spread-glow")){
     w.sideMarks.push(Number(n.dataset.to));
     w.burstAfterMain=w.burstAfterMain||w.mainGlitterSeen;
    }
    if(n.classList.contains("hanabi-spread-spark"))
     w.sideSparks.push(Number(n.dataset.to));
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
 assert(result.vfx.sideSparks.length>=6,"Fan sparks must actually fly to upgraded neighbors");
 assert(result.vfx.sideSparks.every(to=>result.targets.includes(to)));
 assert.deepEqual(result.vfx.audio,[
  "hanabi-load","hanabi-charge","hanabi-launch","hanabi-burst"
 ],"Load, charge, launch and canopy explosion need audible order");
 assert.equal(result.goal,1);assert.equal(result.winner,true);
 assert.equal(result.initialState,"lotus");
 assert(result.width<=result.screen+1,"No horizontal mobile overflow");
 assert.deepEqual(errors,[]);
 console.log("PASS Hanabi Spread 2.0 · 390px full refill, center launch, 3 true random side upgrades, colored fan and burst audio");
}finally{await browser.close();}
