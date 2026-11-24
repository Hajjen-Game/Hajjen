// SKYSHIFT 0.21.0 Phase A / real Chrome + SwiftShader geometry acceptance.
// Screenshots for direct visual comparison at the EXACT same positions.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chromium missing");
const server=spawn("python3",["-m","http.server","8791","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let b;
try{
 await sleep(1000);
 b=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function load(extra="",memory=8){
  const page=await b.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(m=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>m,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8791/skyshift/?v=0.21.0"+
   "&artSmoke=1&trackRepairSmoke=1&envSmoke=1&cinematicGrade=classic&tunnelMega=classic&"+extra,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await page.waitForFunction(()=>["active","fallback"].includes(
   window.__skyshiftArtProbe?.()?.status),null,{timeout:75000});
  const art=await page.evaluate(()=>window.__skyshiftArtProbe?.());
  if(art.status!=="active")throw Error("Environment fallback "+JSON.stringify(art));
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:30000});
  return {page,art};
 }
 async function frame(p,s,path){
  await p.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await p.waitForTimeout(700);
  await p.screenshot({path});
 }
 const fresh=await load();
 if(fresh.art.variant!=="cinematic-megastructure"||
    fresh.art.installedBays!==18||fresh.art.drawBatches!==4||
    !fresh.art.roadMeshUntouched||
    fresh.art.colliders!==0||
    fresh.art.trianglesRendered<1500)
  throw Error("Missing real Phase A geometry "+JSON.stringify(fresh.art));
 for(const s of [104,144,196,245,350])
  await frame(fresh.page,s,"skyshift-v0210-hero-"+s+".png");
 await fresh.page.close();
 const before=await load("cinematicHero=classic");
 if(before.art.variant!=="architectural-rebirth"||
    before.art.drawBatches!==6)
  throw Error("Old 0.20.5 baseline no longer comparable");
 await frame(before.page,104,"skyshift-v0210-before-104.png");
 await frame(before.page,144,"skyshift-v0210-before-144.png");
 await before.page.close();
 const mobile=await load("",4);
 if(mobile.art.variant!=="cinematic-megastructure"||
    mobile.art.drawBatches!==3)
  throw Error("Mobile 4GB cinematic hero budget broken");
 await frame(mobile.page,104,"skyshift-v0210-mobile-104.png");
 await mobile.page.close();
 if(errors.length)throw Error("JS errors: "+errors.join(" | "));
 console.log("PASS: SKYSHIFT Phase A WebGL, true station replacement, "+
  "unmodified flight, 4 high/3 mobile draw batches, matched-frame A/B screenshots");
}finally{await b?.close();server.kill("SIGTERM")}
