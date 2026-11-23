// SKYSHIFT 0.19.0 — real browser/WebGL checks of the whole new world.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable");
const port="8767";
const server=spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1536,height:691}});
 const errors=[];
 page.on("pageerror",e=>errors.push("JS: "+e.message));
 page.on("console",msg=>{
  if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
   errors.push("GLSL: "+msg.text().slice(0,900));
 });
 async function load(params){
  await page.goto("http://127.0.0.1:"+port+"/skyshift/?v=0.19.0&worldArt=classic&worldSmoke=1&envSmoke=1&"+params,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  return page.evaluate(()=>window.__skyshiftWorldProbe());
 }
 const live=await load("trackRepairSmoke=1");
 if(!live.active||live.track!=="skyline"||live.chapters?.length!==3||
    live.beams<340||live.actualDrawBatches<3||live.actualDrawBatches>4||
    live.colliders!==0||live.dynamicLights!==0||live.renderPasses!==0||
    !live.legacyConduit?.active||
    live.worldMesh.length!==live.actualDrawBatches||
    !live.worldMesh.every(x=>x.isInstanced&&x.count>0))
  throw Error("Cinematic world missing from real WebGL: "+JSON.stringify(live));
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 for(const [s,name] of [[125,"orbital-expanse"],[1335,"celestial-conduit"],[2320,"void-cathedral"]]){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(380);
  await page.screenshot({path:"skyshift-v0190-"+name+".png"});
 }
 const legacy=await load("world=classic");
 if(legacy.active||!legacy.legacyConduit?.active||legacy.worldMesh.length>0)
  throw Error("0.18.0 comparison is not truly reversible: "+JSON.stringify(legacy));
 const minimal=await load("env=classic");
 if(minimal.active||minimal.legacyConduit?.active)
  throw Error("Pre-environment view should hide both world layers: "+JSON.stringify(minimal));
 const aurora=await load("track=aurora");
 if(aurora.active||aurora.track!=="aurora"||
    aurora.worldMesh.length!==0||aurora.actualDrawBatches)
  throw Error("Aurora must not gain Skyline architecture: "+JSON.stringify(aurora));
 if(errors.length)throw Error(errors.join(" | "));
 console.log("PASS: 0.19.0 real Chrome/WebGL: three chapters, "+live.beams+
  " world beams in "+live.actualDrawBatches+" instanced batches. Original "+
  "0.18 Celestial Conduit retained; classic rollback true; env=classic clean; "+
  "Aurora untouched; no added colliders, dynamic lights or render passes. "+
  "Screenshots captured for orbital, conduit and cathedral.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
