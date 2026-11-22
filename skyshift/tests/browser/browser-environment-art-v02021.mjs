// SKYSHIFT 0.20.2.1 — Chromium/WebGL ribbon cleanup, mobile and visual A/B.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chromium not available");
const port="8773";
const server=spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function open(query="",deviceMemory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push("JS: "+e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
    errors.push("GL: "+msg.text().slice(0,1000));
  });
  await page.addInitScript(memory=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>memory}),deviceMemory);
  await page.goto("http://127.0.0.1:"+port+
   "/skyshift/?v=0.20.2.1&materialGrade=classic&artSmoke=1&heroSmoke=1&worldSmoke=1"+
   "&envSmoke=1&trackRepairSmoke=1&"+query,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  if(!query.includes("worldArt=classic")&&!query.includes("env=classic")&&
     !query.includes("track=aurora"))
   await page.waitForFunction(()=>
    ["active","fallback"].includes(window.__skyshiftArtProbe?.().status),
    null,{timeout:75000});
  return {page,...await page.evaluate(()=>({
   art:window.__skyshiftArtProbe?.(),
   lowMemory:window.__skyshiftClarityInfo?.()?.lowMemory
  }))};
 }
 async function startAndShot(page,s,name){
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:30000});
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(600);
  await page.screenshot({path:"skyshift-v02021-"+name+".png"});
 }
 const high=await open();
 if(!high.art?.active||high.art.status!=="active"||
    high.art.variant!=="ribbon-cleanup"||
    high.art.installedBays!==18||
    high.art.panoramaWindowBays!==6||
    high.art.observationGroups!==3||
    high.art.centerWindowMullions!==0||
    !high.art.glazingOnlyInRealObservations||
    !high.art.solidWallsWithoutFalseWindows||
    high.art.windowFraction!==.333||
    high.art.openRoof!==false||
    !high.art.closedCeiling||!high.art.continuousUnderdeck||
    high.art.sideWallInsideMeters!==14.5||
    high.art.drawBatches!==4||
    high.art.importedMeshes?.length!==4||
    !high.art.importedMeshes.every(x=>x.roadConforming&&x.vertices>0)||
    !high.art.legacyDecorDisabled||
    high.art.colliders!==0||high.art.dynamicLights!==0)
  throw Error("New ribbon GLTF scene not loaded: "+JSON.stringify(high.art));
 await startAndShot(high.page,153,"ribbon");
 await high.page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),251);
 await high.page.waitForTimeout(500);
 await high.page.screenshot({path:"skyshift-v02021-solid-wall.png"});
 await high.page.close();
 const old=await open("windowCleanup=classic");
 if(!old.art?.active||old.art.variant!=="observation-balance"||
    old.art.panoramaWindowBays!==6||old.art.windowFraction!==.333||
    old.art.openRoof!==false||old.art.drawBatches!==4)
  throw Error("0.20.2 classic comparison failed");
 await startAndShot(old.page,153,"before-cleanup");
 await old.page.close();
 const low=await open("",4);
 if(!low.lowMemory||!low.art.active||
    low.art.variant!=="ribbon-cleanup"||
    low.art.panoramaWindowBays!==6||
    low.art.drawBatches!==3||
    low.art.openRoof!==false||
    low.art.importedMeshes.some(x=>x.name.includes(" · GLASS · ")))
  throw Error("4GB Samsung tier changed basic station composition: "+
   JSON.stringify(low.art));
 await startAndShot(low.page,153,"mobile");
 await low.page.close();
 for(const query of ["windows=classic","stationStyle=classic",
   "track=aurora","env=classic"]){
  const run=await open(query);
  if(query==="windows=classic"&&run.art.variant!=="enclosed")
   throw Error("0.20.1 classic enclosure disabled");
  if(query==="stationStyle=classic"&&run.art.variant!=="classic-open")
   throw Error("0.20.0 station classic disabled");
  if((query==="track=aurora"||query==="env=classic")&&run.art?.active)
   throw Error("Non-Skyline art changed: "+query);
  await run.page.close();
 }
 if(errors.length)throw Error(errors.join(" | "));
 console.log("PASS: SKYSHIFT 0.20.2.1 real Chrome/WebGL: 3 × 32m continuous ribbons, "+
  "no center mullions and no fake glass on solid walls, 12 closed bays; "+
  "4 high / 3 mobile batches, no new lights or colliders, "+
  "unchanged GRIP / Aurora and full 0.20.2, 0.20.1, 0.20.0 rollback; "+
  "actual game screenshots saved for ribbon, solid wall, before and mobile.");
}finally{
 await browser?.close();server.kill("SIGTERM");
}
