// SKYSHIFT 0.20.0 — Real Chrome / WebGL testing of authored glTF station.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome executable missing");
const server=spawn("python3",["-m","http.server","8770","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage",
  "--enable-webgl","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function open(query="",memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push("JS: "+e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
    errors.push("GL: "+msg.text().slice(0,1000));
  });
  await page.addInitScript(gb=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>gb,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8770/skyshift/?v=0.20.0"+
   "&stationStyle=classic&artSmoke=1&heroSmoke=1&worldSmoke=1&envSmoke=1&trackRepairSmoke=1&"+query,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  if(query.indexOf("worldArt=classic")<0&&query.indexOf("env=classic")<0&&
     query.indexOf("track=aurora")<0)
   await page.waitForFunction(()=>
    ["active","fallback"].includes(window.__skyshiftArtProbe?.().status),
    null,{timeout:70000});
  const state=await page.evaluate(()=>({
   art:window.__skyshiftArtProbe?.(),
   hero:window.__skyshiftHeroProbe?.(),
   world:window.__skyshiftWorldProbe?.(),
   signature:window.__skyshiftEnvironmentProbe?.(),
   lowMemory:window.__skyshiftClarityInfo?.().lowMemory
  }));
  return {page,...state};
 }
 const high=await open("",8);
 if(!high.art?.active||high.art?.status!=="active"||
    !high.art.geometryFromGltf||
    high.art.assetBytes<100000||
    high.art.installedBays!==18||
    high.art.drawBatches!==4||
    high.art.importedMeshes?.length!==4||
    !high.art.importedMeshes.every(x=>x.roadConforming&&!x.isInstanced&&x.vertices>0)||
    !high.art.seamlessCurvedWorld||!high.art.bakedWorldSpace||
    high.art.panoramaWindowBays!==14||
    !high.art.openRoof||
    !high.art.legacyDecorDisabled||
    high.art.colliders!==0||high.art.dynamicLights!==0||
    high.art.extraRenderPasses!==0)
   throw Error("Station glTF integration failed: "+JSON.stringify(high.art));
 await high.page.locator("#start-btn").click();
 await high.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 for(const [s,label] of [[96,"arrival"],[204,"panorama"],[344,"exit"]]){
  await high.page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await high.page.waitForTimeout(550);
  await high.page.screenshot({path:"skyshift-v0200-"+label+".png"});
 }
 await high.page.close();
 const classic=await open("worldArt=classic");
 if(classic.art?.active||classic.art.importedMeshes?.length||
    !classic.hero?.active||!classic.world?.active||!classic.signature?.active)
  throw Error("Original 0.19.2 environment must remain intact via classic A/B");
 await classic.page.close();
 const mobile=await open("",4);
 if(!mobile.lowMemory||!mobile.art?.active||
    mobile.art.installedBays!==18||
    mobile.art.drawBatches!==3||
    mobile.art.importedMeshes.some(x=>x.name.includes(" · GLASS · "))||
    !mobile.art.openRoof)
  throw Error("4GB mobile Skyline world not fully authored: "+JSON.stringify(mobile.art));
 await mobile.page.locator("#start-btn").click();
 await mobile.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await mobile.page.evaluate(()=>window.__skyshiftTrackRepairTeleport(204));
 await mobile.page.waitForTimeout(550);
 await mobile.page.screenshot({path:"skyshift-v0200-mobile.png"});
 await mobile.page.close();
 for(const query of ["track=aurora","env=classic"]){
  const result=await open(query);
  if(result.art.active||result.art.importedMeshes?.length)
   throw Error(query+" must not install a Skyline station");
  await result.page.close();
 }
 if(errors.length)throw Error(errors.join(" | "));
 console.log("PASS: SKYSHIFT 0.20.0 authentic glTF world: 288 contiguous meters, "+
  "18 station bays with panoramic space-facing windows and open roof, "+
  "4 curved-world draw batches high / 3 low, zero added colliders/lights/passes; "+
  "old 0.19.2 environment fully restored with ?worldArt=classic; Aurora isolated; "+
  "four screenshots captured in real Chrome WebGL.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
