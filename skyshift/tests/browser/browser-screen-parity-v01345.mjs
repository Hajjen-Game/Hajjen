// SKYSHIFT 0.13.4.5: actual camera-projected full wing silhouettes in Chrome.
import {spawn} from "node:child_process";
import {chromium} from "playwright-core";
import {setTimeout as sleep} from "node:timers/promises";
import {existsSync} from "node:fs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable on CI");
const server=spawn("python3",["-m","http.server","8765","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1536,height:691}});
 page.on("pageerror",e=>console.error("PAGE ERROR",e.message));
 await page.goto("http://127.0.0.1:8765/skyshift/?fleetSmoke=1",
  {waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:70000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 const manta=await page.evaluate(()=>window.__skyshiftScreenBeamProbe?.());
 if(manta?.shipId!=="manta"||!Number.isFinite(manta?.screenRatio)||
    Math.abs(manta.screenRatio-1)>.025)
  throw Error("Real Manta projection disagrees with reference "+JSON.stringify(manta));
 await page.locator("#pause-btn").click();
 await page.locator("#pause-menu-btn").click();
 await page.locator("#hangar-btn").click();
 await page.evaluate(()=>window.__skyshiftFleetSmokeUnlock());
 await page.locator('[data-fleet-equip="stingray"]').click();
 await page.locator("#hangar-back").click();
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing"&&
  window.__skyshiftPerfProbe?.().shipArt?.heroApplied,
  null,{timeout:75000});
 await sleep(500);
 const ray=await page.evaluate(()=>window.__skyshiftScreenBeamProbe?.());
 if(ray?.shipId!=="stingray"||!ray.heroApplied||
    !Number.isFinite(ray.screenRatio)||ray.screenRatio<.80||ray.screenRatio>1.13)
  throw Error("Actual Stingray remains too wide in matched race camera "+
   JSON.stringify({manta,ray}));
 const p=await page.evaluate(()=>window.__skyshiftPerfProbe?.());
 if(p.stingrayPresentation.screenSpaceCorrection!==170/210||
    p.stingrayPresentation.modifyPhysicalHover||
    p.stingrayPresentation.modifySteering||
    p.stingrayPresentation.useDynamicWingClearance)
  throw Error("Visual change altered original flight physics "+
   JSON.stringify(p.stingrayPresentation));
 console.log("PASS: matched camera-space wings",JSON.stringify({manta,ray}));
 await page.screenshot({path:"skyshift-v01345-camera-parity.png"});
}finally{await browser?.close();server.kill("SIGTERM");}
