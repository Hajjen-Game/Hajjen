// SKYSHIFT 0.19.2 — real Chromium/WebGL Pass 2 visual smoke.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable");
const port="8769";
const server=spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const issues=[];
 async function open(query,memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>issues.push("JS: "+e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
    issues.push("WebGL: "+msg.text().slice(0,850));
  });
  await page.addInitScript(gb=>
   Object.defineProperty(navigator,"deviceMemory",
    {configurable:true,get:()=>gb}),memory);
  await page.goto("http://127.0.0.1:"+port+
   "/skyshift/?v=0.19.2&worldArt=classic&heroSmoke=1&worldSmoke=1&trackRepairSmoke=1&"+query,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  const info=await page.evaluate(()=>({
   hero:window.__skyshiftHeroProbe?.(),
   world:window.__skyshiftWorldProbe?.(),
   lowMemory:window.__skyshiftClarityInfo?.()?.lowMemory
  }));
  return {page,...info};
 }
 const high=await open("",8);
 if(!high.hero?.active||high.hero.track!=="skyline"||
    high.hero.maskedPrimitiveBeams!==55||
    high.hero.armorSegments!==20||high.hero.recessedFaces!==20||
    high.hero.addedDrawMeshes!==3||high.hero.additionalLights!==1||
    high.hero.heroGroup?.length!==4||
    !high.hero.heroGroup.some(x=>x.light)||
    high.world?.beams!==425||high.world.chapters?.length!==3||
    !high.hero.legacyVaultsActive)
  throw Error("0.19.2 high-detail scene is not the correct sculpted hero: "+
   JSON.stringify(high.hero));
 await high.page.locator("#start-btn").click();
 await high.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 for(const [s,name] of [[198,"approach"],[247,"hero"]]){
  await high.page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await high.page.waitForTimeout(430);
  await high.page.screenshot({path:"skyshift-v0192-"+name+".png"});
 }
 await high.page.close();
 const classic=await open("architecture=classic",8);
 if(classic.hero?.active||classic.hero?.maskedPrimitiveBeams!==0||
    !classic.world?.active||classic.hero.heroGroup.length!==0)
  throw Error("Classic must show complete original 0.19.0 station");
 await classic.page.locator("#start-btn").click();
 await classic.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await classic.page.evaluate(()=>window.__skyshiftTrackRepairTeleport(247));
 await classic.page.waitForTimeout(430);
 await classic.page.screenshot({path:"skyshift-v0192-classic.png"});
 await classic.page.close();
 const low=await open("",4);
 if(!low.lowMemory||!low.hero?.active||low.hero.maskedPrimitiveBeams!==21||
    low.hero.armorSegments!==12||low.hero.beacons!==4||
    low.hero.addedDrawMeshes!==3||low.hero.additionalLights!==0||
    low.world.beams!==343)
  throw Error("0.19.2 low-memory visual parity failed: "+
   JSON.stringify({hero:low.hero,lowMemory:low.lowMemory}));
 await low.page.locator("#start-btn").click();
 await low.page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await low.page.evaluate(()=>window.__skyshiftTrackRepairTeleport(247));
 await low.page.waitForTimeout(430);
 await low.page.screenshot({path:"skyshift-v0192-mobile.png"});
 await low.page.close();
 for(const query of ["track=aurora","world=classic"]){
  const {page,hero,world}=await open(query,8);
  if(hero?.active||hero?.maskedPrimitiveBeams||hero?.heroGroup?.length)
   throw Error("Hero must be absent on "+query);
  if(query==="track=aurora"&&world?.active)
   throw Error("Aurora should not be modified by Skyline world");
  await page.close();
 }
 if(issues.length)throw Error(issues.join(" | "));
 console.log("PASS: 0.19.2 real Chrome/WebGL: Asterion sculpted hero, 55 crude station "+
  "beams replaced, 3 authored hard-surface batches, 1 local unshadowed light; "+
  "classic 0.19.0 rollback verified; 4GB Samsung-tier retained 12 armor segments "+
  "and 4 light windows with no new lights; Aurora and world=classic untouched.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
