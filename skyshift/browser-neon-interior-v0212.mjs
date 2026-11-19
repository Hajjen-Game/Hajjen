import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome missing for SKYSHIFT 0.21.2");
const server=spawn("python3",["-m","http.server","8798","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1150);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function load(query="",mem=8){
  const p=await browser.newPage({viewport:{width:1536,height:691}});
  p.on("pageerror",e=>errors.push(e.message));
  p.on("console",m=>{if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
   errors.push(m.text().slice(0,500))});
  await p.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",{get:()=>v,configurable:true}),mem);
  await p.goto("http://127.0.0.1:8798/skyshift/?v=0.21.2.2&artSmoke=1&trackRepairSmoke=1&tunnelSpectrum=classic&"+query,
   {waitUntil:"domcontentloaded",timeout:60000});
  await p.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",null,{timeout:75000});
  await p.waitForFunction(()=>["active","fallback","fallback-materials"].includes(
   window.__skyshiftArtProbe?.()?.status),null,{timeout:75000});
  const art=await p.evaluate(()=>window.__skyshiftArtProbe?.());
  if(art.status!=="active")throw Error("Interior material fallback "+JSON.stringify(art));
  await p.locator("#start-btn").click();
  await p.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",null,{timeout:35000});
  return {p,art};
 }
 async function capture(page,s,name){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(700);await page.screenshot({path:name});
 }
 const lit=await load();
 if(lit.art.variant!=="neon-driven-interior"||lit.art.drawBatches!==5||
   !lit.art.interiorNeonPrimary||!lit.art.diffuseNeonWallResponse||
   lit.art.globalLightsChanged!==0||lit.art.exteriorLightInfluence!==0||
   lit.art.dynamicLightsAdded!==0||lit.art.colliders!==0||
   lit.art.originalGRIPUntouched!==true)
  throw Error("Not neon-driven tunnel "+JSON.stringify(lit.art));
 for(const s of [104,165,245,350])await capture(lit.p,s,"skyshift-v0212-neon-"+s+".png");
 await lit.p.close();
 const old=await load("interiorLight=classic");
 if(old.art.variant!=="continuous-vault-tunnel"||old.art.drawBatches!==4)
  throw Error("Original 0.21.1.1 not preserved "+JSON.stringify(old.art));
 for(const s of [104,165,245])await capture(old.p,s,"skyshift-v0212-classic-"+s+".png");
 await old.p.close();
 const low=await load("",4);
 if(low.art.variant!=="neon-driven-interior"||low.art.drawBatches!==3||
   low.art.localNeonRoadResponse!==false||!low.art.diffuseNeonWallResponse)
  throw Error("Mobile tier failed "+JSON.stringify(low.art));
 await capture(low.p,165,"skyshift-v0212-mobile-165.png");
 await low.p.close();
 if(errors.length)throw Error("WebGL errors: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.21.2 WebGL: source-limited interior light, matched "+
  "classic 0.21.1.1 screenshots, 5/3 draw batches, flight unchanged");
}finally{await browser?.close();server.kill("SIGTERM")}
