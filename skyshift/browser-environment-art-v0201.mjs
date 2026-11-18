// SKYSHIFT 0.20.1 — real Chromium/WebGL enclosed-station visual QA.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable for station enclosure QA");
const port="8771";
const server=spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function open(params="",memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push("JavaScript: "+e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
    errors.push("WebGL: "+msg.text().slice(0,900));
  });
  await page.addInitScript(gb=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>gb}),memory);
  await page.goto("http://127.0.0.1:"+port+
   "/skyshift/?v=0.20.1&windows=classic&artSmoke=1&heroSmoke=1&worldSmoke=1"+
   "&envSmoke=1&trackRepairSmoke=1&"+params,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  if(!params.includes("worldArt=classic")&&!params.includes("env=classic")&&
     !params.includes("track=aurora"))
   await page.waitForFunction(()=>["active","fallback"].includes(
    window.__skyshiftArtProbe?.().status),null,{timeout:75000});
  const state=await page.evaluate(()=>({
   art:window.__skyshiftArtProbe?.(),
   hero:window.__skyshiftHeroProbe?.(),
   world:window.__skyshiftWorldProbe?.(),
   env:window.__skyshiftEnvironmentProbe?.(),
   lowMemory:window.__skyshiftClarityInfo?.()?.lowMemory
  }));
  return {page,...state};
 }
 const high=await open();
 if(!high.art?.active||high.art?.status!=="active"||
    high.art?.variant!=="enclosed"||
    high.art?.assetBytes<200000||
    high.art?.installedBays!==18||high.art?.drawBatches!==4||
    high.art?.panoramaWindowBays!==4||
    high.art?.windowFraction!==.222||
    high.art?.sideWallInsideMeters!==14.5||
    high.art?.openRoof!==false||
    high.art?.closedCeiling!==true||
    high.art?.continuousUnderdeck!==true||
    high.art?.enclosedInterior!==true||
    high.art?.roadWidthChanged!==false||
    high.art?.legacyDecorDisabled!==true||
    !high.art?.seamlessCurvedWorld||
    high.art?.importedMeshes?.length!==4||
    !high.art.importedMeshes.every(x=>x.roadConforming&&x.vertices>0)||
    high.art.colliders!==0||high.art.dynamicLights!==0||
    high.art.extraRenderPasses!==0)
  throw Error("0.20.1 enclosed glTF station incomplete: "+JSON.stringify(high.art));
 await high.page.locator("#start-btn").click();
 await high.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 for(const [s,name] of [[120,"interior"],[202,"observation"],
                         [256,"bulkhead"],[342,"exit"]]){
  await high.page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await high.page.waitForTimeout(550);
  await high.page.screenshot({path:"skyshift-v0201-"+name+".png"});
 }
 await high.page.close();
 const oldOpenStation=await open("stationStyle=classic");
 if(!oldOpenStation.art?.active||
    oldOpenStation.art?.variant!=="classic-open"||
    oldOpenStation.art?.openRoof!==true||
    oldOpenStation.art?.panoramaWindowBays!==14||
    oldOpenStation.art?.drawBatches!==4)
  throw Error("0.20.0 A/B station comparison is not restored");
 await oldOpenStation.page.close();
 const previous=await open("worldArt=classic");
 if(previous.art?.active||previous.art?.importedMeshes?.length||
    !previous.hero?.active||!previous.world?.active||!previous.env?.active)
  throw Error("0.19.2 vintage station art is not preserved");
 await previous.page.close();
 const mobile=await open("",4);
 if(!mobile.lowMemory||!mobile.art?.active||
    mobile.art?.installedBays!==18||
    mobile.art?.drawBatches!==3||
    mobile.art?.openRoof!==false||
    mobile.art?.continuousUnderdeck!==true||
    mobile.art?.sideWallInsideMeters!==14.5||
    mobile.art?.panoramaWindowBays!==4||
    mobile.art.importedMeshes.some(x=>x.name.includes(" · GLASS · ")))
  throw Error("Low-memory enclosed cross section differs: "+JSON.stringify(mobile.art));
 await mobile.page.locator("#start-btn").click();
 await mobile.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await mobile.page.evaluate(()=>window.__skyshiftTrackRepairTeleport(202));
 await mobile.page.waitForTimeout(550);
 await mobile.page.screenshot({path:"skyshift-v0201-mobile.png"});
 await mobile.page.close();
 for(const query of ["track=aurora","env=classic"]){
  const result=await open(query);
  if(result.art.active||result.art.importedMeshes?.length)
   throw Error("0.20.1 art should be off for "+query);
  await result.page.close();
 }
 if(errors.length)throw Error(errors.join(" | "));
 console.log("PASS: SKYSHIFT 0.20.1 Chrome/WebGL: full station roof + underdeck, "+
  "interior sidewall at 14.5m, four selective window bays / 18 total, "+
  "4 curved world draw batches / 3 on simulated 4GB phone, "+
  "original track and physics preserved; ?stationStyle=classic restores 0.20.0, "+
  "?worldArt=classic restores 0.19.2, Aurora unaffected; screenshots captured.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
