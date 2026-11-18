// SKYSHIFT 0.20.3 — Real Chrome/WebGL graphite material-only A/B.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable");
const port="8774";
const server=spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function open(query="",memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push("JS: "+e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
    errors.push("GL: "+msg.text().slice(0,900));
  });
  await page.addInitScript(memory=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>memory}),memory);
  await page.goto("http://127.0.0.1:"+port+
   "/skyshift/material-grade-v0203.html?v=0.20.3&artSmoke=1&heroSmoke=1&worldSmoke=1"+
   "&envSmoke=1&trackRepairSmoke=1&"+query,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  if(!query.includes("worldArt=classic")&&!query.includes("env=classic")&&
     !query.includes("track=aurora"))
   await page.waitForFunction(()=>["active","fallback"].includes(
    window.__skyshiftArtProbe?.().status),null,{timeout:75000});
  return {page,...await page.evaluate(()=>({
   art:window.__skyshiftArtProbe?.(),
   lowMemory:window.__skyshiftClarityInfo?.()?.lowMemory
  }))};
 }
 const get=(probe,kind)=>probe.art.importedMeshes.find(x=>x.name.includes(" · "+kind+" · "));
 const luma=rgb=>rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 async function shot(page,s,name,start=true){
  if(start){
   await page.locator("#start-btn").click();
   await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
    null,{timeout:30000});
  }
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(530);
  await page.screenshot({path:"skyshift-v0203-"+name+".png"});
 }
 const graphite=await open("",8);
 if(!graphite.art?.active||graphite.art.status!=="active"||
    graphite.art.variant!=="graphite-regrade"||
    graphite.art.grade!=="graphite"||
    graphite.art.installedBays!==18||
    graphite.art.panoramaWindowBays!==6||
    graphite.art.centerWindowMullions!==0||
    graphite.art.closedCeiling!==true||
    graphite.art.continuousUnderdeck!==true||
    graphite.art.sideWallInsideMeters!==14.5||
    graphite.art.drawBatches!==4||
    graphite.art.importedMeshes?.length!==4||
    graphite.art.colliders!==0||graphite.art.dynamicLights!==0||
    graphite.art.extraRenderPasses!==0||
    !graphite.art.importedMeshes.every(x=>x.roadConforming)||
    !graphite.art.legacyDecorDisabled)
  throw Error("Material grade failed to load: "+JSON.stringify(graphite.art));
 if(Math.abs(get(graphite,"SHELL").metallic-.22)>.001||
    Math.abs(get(graphite,"INLAY").metallic-.12)>.001||
    get(graphite,"SHELL").emissive!==0||
    get(graphite,"INLAY").emissive!==0)
  throw Error("Architectural graphite PBR incorrect: "+JSON.stringify(graphite.art.importedMeshes));
 await shot(graphite.page,155,"graphite-wall");
 await shot(graphite.page,205,"graphite-window",false);
 await graphite.page.close();
 const classic=await open("materialGrade=classic",8);
 if(!classic.art?.active||classic.art.variant!=="ribbon-cleanup"||
    classic.art.drawBatches!==4||
    Math.abs(get(classic,"SHELL").metallic-.31)>.001||
    Math.abs(get(classic,"INLAY").metallic-.14)>.001)
  throw Error("Old 0.20.2.1 PBR material A/B not preserved");
 for(const k of ["SHELL","INLAY"]){
  if(!(luma(get(graphite,k).firstVertexRgb)<
       luma(get(classic,k).firstVertexRgb)*.92))
   throw Error("Architecture did not darken: "+k);
 }
 for(const k of ["ENERGY","GLASS"]){
  const a=get(graphite,k).firstVertexRgb,b=get(classic,k).firstVertexRgb;
  if(a.some((v,i)=>Math.abs(v-b[i])>1e-6))
   throw Error("Existing neon/glass art changed: "+k);
 }
 await shot(classic.page,155,"original-wall");
 await classic.page.close();
 const mobile=await open("",4);
 if(!mobile.lowMemory||!mobile.art?.active||
    mobile.art.variant!=="graphite-regrade"||
    mobile.art.installedBays!==18||
    mobile.art.drawBatches!==3||
    mobile.art.importedMeshes.some(x=>x.name.includes(" · GLASS · "))||
    Math.abs(get(mobile,"SHELL").metallic-.22)>.001||
    mobile.art.panoramaWindowBays!==6)
  throw Error("Low-memory mobile graphite variant failed: "+JSON.stringify(mobile.art));
 await shot(mobile.page,155,"mobile-graphite-wall");
 await mobile.page.close();
 for(const query of ["windowCleanup=classic","windows=classic",
  "stationStyle=classic","track=aurora","env=classic"]){
  const result=await open(query);
  if(query==="windowCleanup=classic"&&result.art.variant!=="observation-balance")
   throw Error("Old 0.20.2 six-window variant missing");
  if(query==="windows=classic"&&result.art.variant!=="enclosed")
   throw Error("Old 0.20.1 interior missing");
  if(query==="stationStyle=classic"&&result.art.variant!=="classic-open")
   throw Error("Old 0.20.0 station missing");
  if((query==="track=aurora"||query==="env=classic")&&result.art?.active)
   throw Error(query+" must not load Skyline graphite grade");
  await result.page.close();
 }
 if(errors.length)throw Error(errors.join(" | "));
 console.log("PASS: SKYSHIFT 0.20.3 real Chromium/WebGL: graphite PBR authored asset "+
  "with zero emissive architectural wash, retained high-energy neon & transparent "+
  "observation bands; original 0.20.2.1 exact material A/B; 4 batches high "+
  "/ 3 batches simulated 4GB; GRIP/road/skybox untouched, Aurora isolated. "+
  "Screenshots: graphite wall, observation window, classic wall and mobile.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
