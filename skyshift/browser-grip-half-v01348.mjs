// SKYSHIFT 0.13.4.8 — REAL WebGL gameplay smoke with 50% extra yaw boost.
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
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1536,height:691}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto("http://127.0.0.1:8765/skyshift/",
  {waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:70000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 const real=await page.evaluate(async()=>{
  const [trial,old]=await Promise.all([
   import("./trial-v01348.mjs"),
   import("./flight/steering-authority-v0901.mjs")]);
  const speeds=[trial.TRIAL.startSpeed,75,trial.TRIAL.endSpeed],rows=[];
  for(const speed of speeds){
   const f=trial.newFlightState();
   f.currentSpeed=speed;
   f.zoneCruiseSpeed=speed;
   f.gripIntensity=1;
   trial.stepFlight(f,1/120,{steer:1,grip:true});
   const n=trial.normalYawFactorAt(speed);
   const prior=old.yawAuthorityAt(speed,1);
   const actual=trial.yawAuthorityAt(speed,1);
   rows.push({speed,n,prior,actual,yawRate:f.yawRate,
    mid:trial.yawAuthorityAt(speed,.5),
    delta:Math.abs((actual-n)-.5*(prior-n))});
  }
  return {rows,version:document.title,
   active:window.__skyshiftPerfProbe?.().state,
   canvasWidth:document.querySelector("#game")?.width};
 });
 if(!real.version.includes("0.13.4.8")||
    real.active!=="playing"||!real.canvasWidth)
  throw Error("Gameplay boot failed "+JSON.stringify(real));
 for(const row of real.rows){
  if(row.delta>1e-10||!(row.n<row.actual&&row.actual<row.prior)||
    !(row.yawRate>0))
   throw Error("Actual GRIP not half power "+JSON.stringify(row));
 }
 if(errors.length)throw Error("Browser errors: "+errors.join("; "));
 console.log("PASS: half-strength GRIP extra yaw in real gameplay",
  JSON.stringify(real.rows));
 await page.screenshot({path:"skyshift-v01348-grip-half-gameplay.png"});
}finally{await browser?.close();server.kill("SIGTERM");}
