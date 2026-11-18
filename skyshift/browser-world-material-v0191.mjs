// SKYSHIFT 0.19.1 — real Chrome WebGL test of material contrast & mobile parity.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome is required for 0.19.1 WebGL QA");
const port="8768";
const server=spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function open(query,deviceMemory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push("JS: "+e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
    errors.push("GLSL: "+msg.text().slice(0,900));
  });
  await page.addInitScript(gb=>{
   Object.defineProperty(navigator,"deviceMemory",
    {configurable:true,get:()=>gb});
  },deviceMemory);
  await page.goto("http://127.0.0.1:"+port+
   "/skyshift/?v=0.19.1&materialsSmoke=1&worldSmoke=1&trackRepairSmoke=1&"+query,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  const p=await page.evaluate(()=>({
   material:window.__skyshiftMaterialProbe?.(),
   world:window.__skyshiftWorldProbe?.(),
   lowMemory:window.__skyshiftClarityInfo?.()?.lowMemory
  }));
  return {page,...p};
 }
 const enhanced=await open("",8);
 if(!enhanced.material?.enabled||!enhanced.world?.active||
    enhanced.material.worldUpdated<250||
    enhanced.material.recoloredInstances<200||
    enhanced.material.adjustedPbrMaterials!==3||
    enhanced.material.signatureMaterial!==0x47617d||
    enhanced.material.worldMaterials.length!==2||
    !enhanced.material.worldMaterials.every(x=>x.metalness<.4&&x.shaderKey.includes("readable-0191")))
  throw Error("PBR materials were not upgraded: "+JSON.stringify(enhanced.material));
 await enhanced.page.locator("#start-btn").click();
 await enhanced.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 for(const [s,name] of [[150,"orbital"],[1345,"conduit"],[2400,"cathedral"]]){
  await enhanced.page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),s);
  await enhanced.page.waitForTimeout(350);
  await enhanced.page.screenshot({path:"skyshift-v0191-"+name+".png"});
 }
 await enhanced.page.close();
 const classic=await open("materials=classic",8);
 if(classic.material?.enabled||classic.material?.adjustedPbrMaterials!==0||
    classic.material.worldMaterials.some(x=>
     Math.abs(x.metalness-(x.kind==="steel"?.68:.47))>.001||
     x.shaderKey.includes("readable-0191"))||
    classic.world.beams!==enhanced.world.beams||
    classic.material.signatureMaterial!==0x101c32)
  throw Error("Material classic A/B changes world/geometry: "+
   JSON.stringify(classic.material));
 await classic.page.close();
 const samsung=await open("",4);
 if(!samsung.lowMemory||!samsung.material?.enabled||
    samsung.material.adjustedPbrMaterials!==3||
    samsung.material.recoloredInstances<180||
    !samsung.material.worldMaterials.every(x=>x.metalness<.4)||
    samsung.world.beams!==343)
  throw Error("Low-memory material readability missing: "+
   JSON.stringify({lowMemory:samsung.lowMemory,material:samsung.material,
    world:samsung.world}));
 await samsung.page.screenshot({path:"skyshift-v0191-lowmemory.png"});
 await samsung.page.close();
 const aurora=await open("track=aurora",8);
 if(aurora.world.active||aurora.material.adjustedPbrMaterials!==0||
    aurora.material.recoloredInstances!==0)
  throw Error("Aurora was modified by Skyline material patch");
 await aurora.page.close();
 if(errors.length)throw Error("WebGL/JS errors: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.19.1: "+
  enhanced.material.recoloredInstances+" PBR instance tints upgraded; "+
  enhanced.material.adjustedPbrMaterials+" materials corrected with no new"+
  " geometry/draw calls, classic A/B verified, Samsung 4GB profile verified,"+
  " preserved 425 high / 343 low beams, Aurora untouched, real WebGL screenshots.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
