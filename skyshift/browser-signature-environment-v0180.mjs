// SKYSHIFT 0.18.0 — real Chrome/WebGL environment, fallback and Aurora QA.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable for signature environment QA");
const server=spawn("python3",["-m","http.server","8766","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const expectedBase="http://127.0.0.1:8766/skyshift/";
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1536,height:691}});
 const errors=[];
 page.on("pageerror",error=>errors.push("JS: "+error.message));
 page.on("console",msg=>{
  if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
   errors.push("GLSL: "+msg.text().slice(0,850));
 });
 async function load(query){
  await page.goto(expectedBase+"?worldArt=classic&"+query,{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
    null,{timeout:75000});
  return page.evaluate(()=>window.__skyshiftEnvironmentProbe?.());
 }
 const skyline=await load("v=0.18.0&envSmoke=1&trackRepairSmoke=1");
 if(!skyline||!skyline.active||!skyline.enabled||
    skyline.track!=="skyline"||skyline.portals!==6||
    skyline.section[0]!==1185||skyline.section[1]!==1485||
    skyline.realDrawBatches<3||skyline.realDrawBatches>4||
    skyline.addedColliders!==0||skyline.dynamicLights!==0||
    skyline.worldMesh.length!==skyline.realDrawBatches||
    !skyline.worldMesh.every(x=>x.isInstanced&&x.count>0))
  throw Error("0.18.0 signature environment invalid: "+JSON.stringify(skyline));
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await page.evaluate(()=>window.__skyshiftTrackRepairTeleport(1285));
 await page.waitForTimeout(450);
 await page.screenshot({path:"skyshift-v0180-celestial-conduit.png"});
 const classic=await load("v=0.18.0&env=classic&envSmoke=1");
 if(classic.active||classic.worldMesh.length!==0||classic.enabled)
  throw Error("Classic environment must preserve existing 0.17.0 geometry: "+
   JSON.stringify(classic));
 await page.screenshot({path:"skyshift-v0180-env-classic.png"});
 const aurora=await load("track=aurora&v=0.18.0&envSmoke=1");
 if(aurora.active||aurora.track!=="aurora"||
    aurora.worldMesh.length!==0||aurora.extraDrawCalls!==0)
  throw Error("Aurora circuit was changed by Skyline visual architecture: "+
   JSON.stringify(aurora));
 if(errors.length)throw Error("Renderer errors: "+errors.join(" | "));
 console.log("PASS: 0.18.0 real Chromium/WebGL environment, "+skyline.beams+
  " instanced beams / "+skyline.realDrawBatches+" draw batches; "+
  "300m Skyline S-link intact; A/B classic empty; Aurora remains pristine; "+
  "0 new colliders/dynamic lights/render passes.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
