// SKYSHIFT 0.14.0 — end-to-end CHALLENGES menu -> play -> medal -> unlock -> Time Trial.
import {spawn} from "node:child_process";
import {chromium} from "playwright-core";
import {setTimeout as sleep} from "node:timers/promises";
import {existsSync} from "node:fs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable");
const server=spawn("python3",["-m","http.server","8765","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1050);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1536,height:691}});
 const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.goto("http://127.0.0.1:8765/skyshift/?challengeSmoke=1",
  {waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:70000});
 await page.locator("#challenges-btn").click();
 const first=await page.evaluate(()=>window.__skyshiftChallengeProbe?.());
 if(first?.mode!=="challenges"||!first.visible||
  first.summary.available!==2||first.summary.total!==8)
  throw Error("Challenge catalog failed "+JSON.stringify(first));
 const card=page.locator('[data-challenge-id="first-sweep"]');
 if(await card.isDisabled())throw Error("Starting challenge locked");
 if(!await page.locator('[data-challenge-id="precision-apex"]').isDisabled())
  throw Error("Progression did not lock later challenge");
 await card.click();
 await page.waitForFunction(()=>window.__skyshiftChallengeProbe?.().mode==="playing",
  null,{timeout:35000});
 const driving=await page.evaluate(()=>window.__skyshiftChallengeProbe?.());
 if(driving?.selected!=="first-sweep"||driving.timeTrialMode!=="standard"||
  driving.flightS<5||driving.flightS>100)
  throw Error("Real challenge race start failed "+JSON.stringify(driving));
 const finished=await page.evaluate(()=>window.__skyshiftChallengeSmokeFinish?.());
 if(finished?.medal!=="bronze"||finished.mode!=="ended"||
  finished.summary.bronzeOrBetter!==1||finished.summary.available!==3)
  throw Error("Medal result/unlock failed "+JSON.stringify(finished));
 await page.locator("#challenge-end-back").click();
 if(await page.locator('[data-challenge-id="precision-apex"]').isDisabled())
  throw Error("Earned bronze failed to unlock later challenge");
 await page.screenshot({path:"skyshift-v0140-challenge-medals.png"});
 await page.locator("#challenges-back-btn").click();
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftChallengeProbe?.().mode==="playing",
  null,{timeout:30000});
 const normal=await page.evaluate(()=>window.__skyshiftChallengeProbe?.());
 if(normal.selected!==null||normal.timeTrialMode!=="time-trial"||
  normal.flightS>90)
  throw Error("Original 3-lap Time Trial changed "+JSON.stringify(normal));
 if(errors.length)throw Error("Page JavaScript errors: "+errors.join("; "));
 console.log("PASS: 8 Skyline challenges, bronze unlock, preserved original Time Trial",
  JSON.stringify({initial:first,challengeStart:driving,medal:finished,normal}));
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
