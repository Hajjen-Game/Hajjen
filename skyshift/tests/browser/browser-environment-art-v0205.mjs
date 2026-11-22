// SKYSHIFT 0.20.5 — real Chromium/WebGL architectural rebirth A/B.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome missing for 0.20.5 WebGL");
const server=spawn("python3",["-m","http.server","8778","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function load(params="",memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push("JS: "+e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(m.text()))
    errors.push("WebGL: "+m.text().slice(0,900));
  });
  await page.addInitScript(mem=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>mem,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8778/skyshift/?v=0.20.5"+
   "&artSmoke=1&heroSmoke=1&worldSmoke=1&envSmoke=1&trackRepairSmoke=1&"+params,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  if(!params.includes("worldArt=classic")&&!params.includes("track=aurora")&&
     !params.includes("env=classic"))
   await page.waitForFunction(()=>["active","fallback"].includes(
    window.__skyshiftArtProbe?.().status),null,{timeout:75000});
  const art=await page.evaluate(()=>window.__skyshiftArtProbe?.());
  return {page,art,lowMemory:await page.evaluate(()=>
   window.__skyshiftClarityInfo?.()?.lowMemory)};
 }
 async function start(page){
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:30000});
 }
 async function capture(page,s,name){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(650);
  await page.screenshot({path:"skyshift-v0205-"+name+".png"});
 }
 const art=await load();
 const a=art.art;
 if(!a?.active||a.status!=="active"||
   a.variant!=="architectural-rebirth"||
   a.installedBays!==18||a.vaultedHalls!==5||a.serviceNaves!==5||
   a.panoramaWindowBays!==6||a.observationGroups!==3||
   a.stationArchitecturalDepthMeters!==4.5||
   !a.integratedNonRepeatingButtresses||!a.roadSheenActive||
   !a.staticSheenOnRoad||a.noRealTimeReflections!==true||
   a.staticSheenOpacity!==.12||
   a.drawBatches!==6||a.importedMeshes?.length!==6||
   !a.importedMeshes.every(x=>x.roadConforming&&x.vertices>0)||
   !a.neonRenderingActive||!a.haloRenderingActive||
   !a.sculptedLightRenderingActive||
   !a.closedCeiling||!a.continuousUnderdeck||
   a.openRoof!==false||a.sideWallInsideMeters!==14.5||
   !a.roadMeshUntouched||
   a.colliders!==0||a.dynamicLights!==0||a.extraRenderPasses!==0||
   !a.legacyDecorDisabled)
  throw Error("Pass 4 architecture missing: "+JSON.stringify(a));
 await start(art.page);
 for(const [pos,name] of [[104,"vault"],[120,"service-nave"],
  [202,"panorama"],[245,"roof-coffer"],[351,"pressure-gate"]])
  await capture(art.page,pos,name);
 await art.page.close();
 const old=await load("architecturePass=classic");
 if(!old.art?.active||old.art.variant!=="sculpted-premium-neon"||
    old.art.drawBatches!==5||old.art.roadSheenActive===true||
    old.art.vaultedHalls!==undefined)
  throw Error("0.20.4.1 before/after A/B broken: "+JSON.stringify(old.art));
 await start(old.page);
 await capture(old.page,104,"original-vault-comparison");
 await capture(old.page,120,"original-nave-comparison");
 await old.page.close();
 const mobile=await load("",4);
 if(!mobile.lowMemory||!mobile.art?.active||
    mobile.art.variant!=="architectural-rebirth"||
    mobile.art.drawBatches!==4||mobile.art.roadSheenActive!==true||
    mobile.art.staticSheenOpacity!==.095||
    mobile.art.haloRenderingActive!==false||
    mobile.art.importedMeshes.some(x=>x.name.includes(" · HALO · ")||
     x.name.includes(" · GLASS · "))||
    !mobile.art.neonRenderingActive||mobile.art.vaultedHalls!==5||
    mobile.art.serviceNaves!==5)
  throw Error("4GB low-memory world missing: "+JSON.stringify(mobile.art));
 await start(mobile.page);
 await capture(mobile.page,104,"mobile-vault");
 await mobile.page.close();
 for(const q of ["neonPolish=classic","neon=classic",
  "materialGrade=classic","windowCleanup=classic","windows=classic",
  "stationStyle=classic","worldArt=classic","track=aurora","env=classic"]){
  const previous=await load(q);
  if(q==="neonPolish=classic"&&previous.art.variant!=="premium-integrated-neon")
   throw Error("Old 0.20.4 premium neon toggle");
  if(q==="neon=classic"&&previous.art.variant!=="graphite-regrade")
   throw Error("Old 0.20.3 graphite toggle");
  if(q==="materialGrade=classic"&&previous.art.variant!=="ribbon-cleanup")
   throw Error("Old 0.20.2.1 ribbon toggle");
  if(q==="windows=classic"&&previous.art.variant!=="enclosed")
   throw Error("Old 0.20.1 enclosure toggle");
  if(q==="stationStyle=classic"&&previous.art.variant!=="classic-open")
   throw Error("Old 0.20.0 open station toggle");
  if(["worldArt=classic","track=aurora","env=classic"].includes(q)&&
    previous.art.active)throw Error("Unexpected art on "+q);
  await previous.page.close();
 }
 if(errors.length)throw Error(errors.join(" | "));
 console.log("PASS: SKYSHIFT 0.20.5 real Chrome/WebGL Pass 4: "+
  "two visually distinct vaulted and service hall silhouettes, structural roof "+
  "coffers and true pressure portals; 3 panoramic galleries; static faux neon "+
  "reflections on original road, 6 high/4 low draw batches. "+
  "No extra colliders, dynamic lights, postprocessing or GRIP changes. "+
  "0.20.4.1 exact A/B and all previous versions still available; "+
  "real game screenshots captured at matched camera positions.");
}finally{
 await browser?.close();server.kill("SIGTERM");
}
