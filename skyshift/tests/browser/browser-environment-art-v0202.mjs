// SKYSHIFT 0.20.2 / Pass 1 — Real Chromium WebGL window balance and A/B.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome executable unavailable");
const port="8772";
const server=spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function open(args="",memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push("JS: "+e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
    errors.push("GL: "+msg.text().slice(0,850));
  });
  await page.addInitScript(gb=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>gb}),memory);
  await page.goto("http://127.0.0.1:"+port+
   "/skyshift/?v=0.20.2&windowCleanup=classic&artSmoke=1&heroSmoke=1&worldSmoke=1"+
   "&envSmoke=1&trackRepairSmoke=1&"+args,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  if(!args.includes("worldArt=classic")&&!args.includes("env=classic")&&
     !args.includes("track=aurora"))
   await page.waitForFunction(()=>["active","fallback"].includes(
    window.__skyshiftArtProbe?.().status),null,{timeout:75000});
  return {page,...await page.evaluate(()=>({
   art:window.__skyshiftArtProbe?.(),
   hero:window.__skyshiftHeroProbe?.(),
   world:window.__skyshiftWorldProbe?.(),
   env:window.__skyshiftEnvironmentProbe?.(),
   lowMemory:window.__skyshiftClarityInfo?.()?.lowMemory
  }))};
 }
 async function capture(page,s,name){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(480);
  await page.screenshot({path:"skyshift-v0202-"+name+".png"});
 }
 const high=await open("",8);
 if(!high.art?.active||high.art?.status!=="active"||
    high.art.variant!=="observation-balance"||
    high.art.assetBytes<200000||
    high.art.installedBays!==18||
    high.art.panoramaWindowBays!==6||
    high.art.windowFraction!==.333||
    high.art.observationGroups!==3||
    high.art.unbrokenSolidHallBays!==12||
    high.art.openRoof!==false||!high.art.closedCeiling||
    !high.art.continuousUnderdeck||
    high.art.sideWallInsideMeters!==14.5||
    high.art.roadWidthChanged!==false||
    high.art.drawBatches!==4||
    high.art.importedMeshes?.length!==4||
    !high.art.importedMeshes.every(x=>x.roadConforming&&x.vertices>0)||
    !high.art.geometryFromGltf||
    high.art.colliders!==0||high.art.dynamicLights!==0||
    high.art.extraRenderPasses!==0||
    !high.art.legacyDecorDisabled)
  throw Error("0.20.2 station observatory not active: "+JSON.stringify(high.art));
 await high.page.locator("#start-btn").click();
 await high.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 for(const [s,name] of [[140,"new-observation"],[203,"main-observation"],
   [251,"enclosed-interval"],[292,"third-observation"]])
  await capture(high.page,s,name);
 await high.page.close();
 const classic=await open("windows=classic");
 if(!classic.art?.active||classic.art.variant!=="enclosed"||
    classic.art.panoramaWindowBays!==4||
    classic.art.windowFraction!==.222||
    classic.art.sideWallInsideMeters!==14.5||
    classic.art.openRoof!==false||
    classic.art.drawBatches!==4)
  throw Error("0.20.1 windows A/B is broken: "+JSON.stringify(classic.art));
 await classic.page.locator("#start-btn").click();
 await classic.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await capture(classic.page,140,"classic-at-same-position");
 await classic.page.close();
 const prior=await open("stationStyle=classic");
 if(!prior.art?.active||prior.art.variant!=="classic-open"||
    prior.art.openRoof!==true||prior.art.panoramaWindowBays!==14)
  throw Error("0.20.0 open station A/B changed");
 await prior.page.close();
 const ancient=await open("worldArt=classic");
 if(ancient.art.active||ancient.art.importedMeshes?.length||
    !ancient.hero?.active||!ancient.world?.active||!ancient.env?.active)
  throw Error("0.19.2 classic station not preserved");
 await ancient.page.close();
 const mobile=await open("",4);
 if(!mobile.lowMemory||!mobile.art?.active||
    mobile.art.installedBays!==18||
    mobile.art.panoramaWindowBays!==6||
    mobile.art.observationGroups!==3||
    mobile.art.openRoof!==false||
    mobile.art.drawBatches!==3||
    mobile.art.importedMeshes.some(x=>x.name.includes(" · GLASS · ")))
  throw Error("Samsung 4GB profile has different observatory: "+JSON.stringify(mobile.art));
 await mobile.page.locator("#start-btn").click();
 await mobile.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await capture(mobile.page,140,"mobile-observation");
 await mobile.page.close();
 for(const args of ["track=aurora","env=classic"]){
  const res=await open(args);
  if(res.art?.active||res.art?.importedMeshes?.length)
   throw Error("Observation windows must not affect "+args);
  await res.page.close();
 }
 if(errors.length)throw Error(errors.join(" | "));
 console.log("PASS: SKYSHIFT 0.20.2 Pass 1 real WebGL: "+
  "three paired observatories, 6 of 18 bays with framed views (33.3%); "+
  "closed roof and station underdeck intact; 4 / 3 curved-world draw batches; "+
  "no new colliders, lights, or render passes; 0.20.1 windows=classic comparison "+
  "and 0.20.0 stationStyle=classic intact; 4GB mobile and Aurora unchanged. "+
  "Six real game screenshots captured.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
