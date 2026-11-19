// SKYSHIFT 0.21.0-B real Chromium/SwiftShader screenshot and functional tests.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome missing for Phase B");
const server=spawn("python3",["-m","http.server","8794","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try {
 await sleep(1200);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function load(query="",mem=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,450));
  });
  await page.addInitScript(m=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>m,configurable:true}),mem);
  await page.goto("http://127.0.0.1:8794/skyshift/?v=0.21.0"+
   "&artSmoke=1&trackRepairSmoke=1&tunnelMega=classic&"+query,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await page.waitForFunction(()=>["active","fallback","fallback-materials"].includes(
   window.__skyshiftArtProbe?.()?.status),null,{timeout:75000});
  const art=await page.evaluate(()=>window.__skyshiftArtProbe?.());
  if(art.status!=="active")throw Error("Phase B failed "+JSON.stringify(art));
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:30000});
  return {page,art};
 }
 async function frame(page,s,name){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(700);
  await page.screenshot({path:name});
 }
 const now=await load();
 if(now.art.variant!=="cinematic-material-light"||
   !now.art.gradeActive||!now.art.metallicHull||
   !now.art.bakedLightBounce||!now.art.staticRoadSheen||
   now.art.drawBatches!==7||now.art.colliders!==0||
   now.art.addedDynamicLights!==0||now.art.addedRenderPasses!==0)
  throw Error("Material grade is not active "+JSON.stringify(now.art));
 for(const s of [104,144,196,245,350])
  await frame(now.page,s,"skyshift-v0210b-after-"+s+".png");
 await now.page.close();
 const before=await load("cinematicGrade=classic");
 if(before.art.variant!=="cinematic-megastructure"||
   before.art.drawBatches!==4||before.art.gradeActive===true)
  throw Error("Phase A comparison broken");
 for(const s of [104,144,196])
  await frame(before.page,s,"skyshift-v0210b-before-"+s+".png");
 await before.page.close();
 const mobile=await load("",4);
 if(mobile.art.variant!=="cinematic-material-light"||
   mobile.art.drawBatches!==5||mobile.art.staticRoadSheen!==false||
   !mobile.art.bakedLightBounce)
  throw Error("4GB mobile static light budget broken");
 await frame(mobile.page,104,"skyshift-v0210b-mobile-104.png");
 await mobile.page.close();
 if(errors.length)throw Error("Browser errors: "+errors.join(" | "));
 console.log("PASS: SKYSHIFT 0.21.0-B Chrome/WebGL: metallic shading and "+
  "baked cyan/magenta wall light, selective road sheen, mobile path, "+
  "same-frame Phase A comparison; no physics, lights, GRIP or renderer changes.");
}finally{await browser?.close();server.kill("SIGTERM")}
