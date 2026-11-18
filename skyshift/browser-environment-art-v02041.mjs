// SKYSHIFT 0.20.4.1 — Premium Integrated Neon real Chrome/WebGL A/B QA.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable for SKYSHIFT 0.20.4.1 QA");
const server=spawn("python3",["-m","http.server","8775","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage",
  "--enable-webgl","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const problems=[];
 async function open(query="",memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>problems.push("JS: "+e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(m.text()))
    problems.push("WebGL: "+m.text().slice(0,900));
  });
  await page.addInitScript(mem=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>mem}),memory);
  await page.goto("http://127.0.0.1:8775/skyshift/?v=0.20.4.1&architecturePass=classic"+
   "&artSmoke=1&heroSmoke=1&worldSmoke=1&envSmoke=1&trackRepairSmoke=1&"+query,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  if(!query.includes("worldArt=classic")&&!query.includes("track=aurora")&&
    !query.includes("env=classic")){
   await page.waitForFunction(()=>["active","fallback"].includes(
    window.__skyshiftArtProbe?.().status),null,{timeout:75000});
  }
  const diag=await page.evaluate(()=>({
   art:window.__skyshiftArtProbe?.(),
   clarity:window.__skyshiftClarityInfo?.(),
   lowMemory:window.__skyshiftClarityInfo?.()?.lowMemory
  }));
  return {page,...diag};
 }
 async function capture(page,s,name){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(420);
  await page.screenshot({path:"skyshift-v02041-"+name+".png"});
 }
 const high=await open("",8);
 const a=high.art;
 if(!a?.active||a.status!=="active"||a.variant!=="sculpted-premium-neon"||
   a.installedBays!==18||a.panoramaWindowBays!==6||
   a.drawBatches!==5||a.importedMeshes?.length!==5||
   !a.neonRenderingActive||!a.haloRenderingActive||
   !a.premiumIntegratedNeon||!a.magentaWallGuides||!a.cyanCeilingCoves||
   !a.lightCoreWhite||!a.staticGlowHalo||
   !a.sculptedArchitecturalLight||!a.nonRepeatingGateAccents||
   !a.cyanWindowJambsAtOuterEdgesOnly||!a.narrowMagentaHalo||
   !a.sculptedLightRenderingActive||a.narrowerHaloOpacity!==.14||
   !a.seamlessCurvedWorld||!a.geometryFromGltf||
   !a.importedMeshes.every(m=>m.roadConforming&&m.vertices>0)||
   a.openRoof!==false||!a.continuousUnderdeck||
   a.colliders!==0||a.dynamicLights!==0||a.extraRenderPasses!==0||
   !a.legacyDecorDisabled)
  throw Error("0.20.4.1 high-end neon scene failed: "+JSON.stringify(a));
 await high.page.locator("#start-btn").click();
 await high.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 for(const [s,n] of [[121,"closed-hall"],[155,"panorama"],[254,"sidewall"]])
  await capture(high.page,s,n);
 await high.page.close();
 const baseline=await open("neonPolish=classic",8);
 if(!baseline.art?.active||baseline.art.variant!=="premium-integrated-neon"||
    baseline.art.drawBatches!==5||baseline.art.sculptedArchitecturalLight===true||
    baseline.art.haloRenderingActive!==true)
  throw Error("0.20.4 original pink/cyan lighting A/B unavailable: "+JSON.stringify(baseline.art));
 await baseline.page.locator("#start-btn").click();
 await baseline.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await capture(baseline.page,155,"original-neon-before-polish");
 await baseline.page.close();
 const previous=await open("neon=classic",8);
 if(!previous.art?.active||previous.art.variant!=="graphite-regrade"||
   previous.art.drawBatches!==4||previous.art.premiumIntegratedNeon===true||
   previous.art.importedMeshes.some(x=>x.name.includes(" · HALO · ")))
  throw Error("0.20.3 graphite A/B mode missing: "+JSON.stringify(previous.art));
 await previous.page.locator("#start-btn").click();
 await previous.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await capture(previous.page,155,"classic-before-neon");
 await previous.page.close();
 const low=await open("",4);
 if(!low.lowMemory||!low.art?.active||
   low.art.variant!=="sculpted-premium-neon"||
   low.art.drawBatches!==3||low.art.staticGlowHalo!==false||
   low.art.haloRenderingActive!==false||
   !low.art.sculptedLightRenderingActive||low.art.narrowerHaloOpacity!==0||
   low.art.neonRenderingActive!==true||
   low.art.importedMeshes.some(x=>x.name.includes(" · HALO · ")||
    x.name.includes(" · GLASS · "))||
   low.art.openRoof!==false||
   low.art.panoramaWindowBays!==6)
  throw Error("4GB Samsung-tier failed: "+JSON.stringify(low.art));
 await low.page.locator("#start-btn").click();
 await low.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await capture(low.page,155,"mobile");
 await low.page.close();
 for(const q of ["materialGrade=classic","windowCleanup=classic","windows=classic",
   "stationStyle=classic","worldArt=classic","track=aurora","env=classic"]){
  const prior=await open(q,8);
  if(q==="materialGrade=classic"&&prior.art?.variant!=="ribbon-cleanup")
   throw Error("Original 0.20.2.1 ribbon comparison broken");
  if(q==="windowCleanup=classic"&&prior.art?.variant!=="observation-balance")
   throw Error("Original window cleanup comparison broken");
  if(q==="windows=classic"&&prior.art?.variant!=="enclosed")
   throw Error("Original 0.20.1 comparison broken");
  if(q==="stationStyle=classic"&&prior.art?.variant!=="classic-open")
   throw Error("Original 0.20.0 comparison broken");
  if(["worldArt=classic","track=aurora","env=classic"].includes(q)&&prior.art?.active)
   throw Error("Unrelated worlds modified: "+q);
  await prior.page.close();
 }
 if(problems.length)throw Error(problems.join(" | "));
 console.log("PASS: SKYSHIFT 0.20.4.1 sculpted neon WebGL: original graphite kept; gate shoulders and window outer-jamb accents,"+
  " cyan roof channels, narrow wall halo, true A/B to previous Pass 3 and white-hot cores in authored glTF."+
  " High fidelity 5 batches with static additive halo, simulated 4GB mobile"+
  " 3 batches without halo but with original neon cores. No dynamic lights,"+
  " colliders or render passes. All classic A/B modes, Skyline physics and"+
  " Aurora are isolated. Screenshots captured from actual race camera.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
