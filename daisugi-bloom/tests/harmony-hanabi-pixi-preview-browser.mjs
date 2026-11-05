import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!executablePath)throw Error("Chromium required");
const browser=await puppeteer.launch({executablePath,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],warnings=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",m=>{if(m.type()==="warning")warnings.push(m.text());});
const KEY="japanese-harmony-puzzle-v2";
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 // A CDN/WebGL outage must never break a real round. Force the CDN to fail
 // quickly, then verify that the proven Classic Hanabi VFX still plays.
 await page.setRequestInterception(true);
 page.on("request",request=>{
  if(request.url().includes("cdn.jsdelivr.net/npm/pixi.js"))request.abort("failed");
  else request.continue();
 });
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/?hanabiVfx=pixi",
  {waitUntil:"networkidle2",timeout:45000});
 await page.waitForFunction(()=>window.HarmonyHanabiPixi?.inspect().failed,
  {timeout:12000});
 const initial=await page.evaluate(()=>({
  select:document.querySelector("#hanabiVfxMode")?.value,
  status:HarmonyHanabiPixi.inspect(),
  currentDefault:document.querySelector("#gameDirectorMode")?.value
 }));
 assert.equal(initial.select,"pixi");
 assert.equal(initial.status.mode,"pixi");
 assert.equal(initial.status.failed,true);
 assert.equal(initial.status.ready,false);
 assert.equal(initial.currentDefault,"auto");

 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=4;
  save.run=null;save.tutorialHelpSeen={};
  delete save.journeyProgression;
  localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 await page.reload({waitUntil:"networkidle2",timeout:45000});
 await page.waitForFunction(()=>window.HarmonyHanabiPixi?.inspect().failed,{timeout:12000});
 await page.evaluate(()=>{
  window.__pixiPilotVfx={classicApex:0,classicHits:0,canvasCreated:0};
  const w=window.__pixiPilotVfx;
  const observer=new MutationObserver(records=>{
   for(const record of records)for(const n of record.addedNodes){
    if(n.nodeType!==1||!n.classList)continue;
    if(n.classList.contains("hanabi-apex-flower"))w.classicApex++;
    if(n.classList.contains("hanabi-impact-bloom"))w.classicHits++;
    if(n.classList.contains("jh-hanabi-pixi-preview"))w.canvasCreated++;
   }
  });
  observer.observe(document.body,{childList:true,subtree:true});
 });
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:16000});
 await page.evaluate(()=>document.querySelector("#modalActions .jh-tutorial-ok")?.click());
 await page.waitForFunction(()=>document.querySelector("#modal").hidden,{timeout:5000});
 const click=async(a,b)=>page.evaluate(([source,dest])=>{
  document.querySelector('.tile[data-index="'+source+'"]').click();
  document.querySelector('.tile[data-index="'+dest+'"]').click();
 },[a,b]);
 await click(32,33);
 await page.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false"&&
  document.querySelector("#movesCount").textContent==="29",{timeout:35000});
 await click(32,39);
 await page.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false"&&
  window.__pixiPilotVfx.classicApex===1,{timeout:45000});
 const result=await page.evaluate(key=>({
  metrics:window.HarmonyHanabiPixi.inspect(),
  effect:window.__pixiPilotVfx,
  save:JSON.parse(localStorage.getItem(key)),
  boardCount:document.querySelectorAll("#board .tile").length,
  director:document.querySelector("#paceStatus")?.title||"",
  scrollWidth:document.documentElement.scrollWidth,innerWidth
 }),KEY);
 assert.equal(result.effect.classicApex,1,"Failed Pixi must use exactly one Classic aerial firework");
 assert(result.effect.classicHits>=9,"Classic keeps real impacts");
 assert.equal(result.effect.canvasCreated,0,"Failed Pixi may not leave a transparent broken canvas");
 assert.equal(result.metrics.failed,true);
 assert.equal(result.boardCount,49);
 assert.equal(result.save.run?.level,4,"Pixi selection must not change the current game");
 assert(result.scrollWidth<=result.innerWidth+1,"No mobile overflow");
 assert.deepEqual(errors,[]);
 console.log("PASS Pixi Hanabi 390px · opt-in GPU load failure falls back to full Classic, no lost turn or blank screen");
}finally{await browser.close();}
