// SKYSHIFT 0.15.0: real Chrome WebGL boot + safe/risk physics + catalog preservation.
import {spawn} from "node:child_process";
import {chromium} from "playwright-core";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("No Chrome available");
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
 page.on("console",msg=>{
  if(msg.type()==="error"&&/shader|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
   errors.push(msg.text());
 });
 await page.goto("http://127.0.0.1:8765/skyshift/?riskSmoke=1",
  {waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:75000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 const report=await page.evaluate(async()=>{
  const [road,boost,risk,timeTrial]=await Promise.all([
    import("./rendering/legacy/premium-track-v0150.mjs"),
    import("./flight/boost/boost-v0150.mjs"),
    import("./risk-reward-v0150.mjs"),
    import("./time-trial-v0150.mjs")
  ]);
  const probe=window.__skyshiftRiskProbe();
  const safe=window.__skyshiftRiskPhysicsSmoke("safe");
  const choice=window.__skyshiftRiskPhysicsSmoke("risk");
  const cue=risk.riskCueAt(2110,0);
  return {probe,safe,choice,cue,shaderPads:road.GLSL_BOOST_PADS.length,
   physicsPads:boost.BOOST_PADS.length,timeTrial:timeTrial.TIME_TRIAL_0150};
 });
 if(report.probe.mode!=="playing"||report.probe.configuredPads.length!==5||
    report.safe.picked?.kind!=="safe"||report.choice.picked?.kind!=="risk"||
    report.safe.activationCount!==1||report.choice.activationCount!==1||
    report.safe.secondChoice!==null||report.choice.secondChoice!==null||
    report.safe.targetMultiplier!==1.14||report.choice.targetMultiplier!==1.40||
    report.shaderPads!==report.physicsPads||report.shaderPads!==5||
    !report.cue.text.includes("RISK RIGHT")||
    !report.timeTrial.trackRevision.includes("risk-choice"))
  throw Error("Real safe/risk gameplay or shader mismatch: "+JSON.stringify(report));
 if(!await page.locator("#risk-line-cue").count())
  throw Error("Risk cue missing from production HUD");
 await page.screenshot({path:"skyshift-v0150-risk-lane.png"});
 await page.locator("#pause-btn").click();
 await page.locator("#pause-menu-btn").click();
 await page.locator("#challenges-btn").click();
 const count=await page.locator("[data-challenge-id]").count();
 if(count!==8)throw Error("Skyline Challenges regression: "+count);
 if(errors.length)throw Error("JS / WebGL errors "+errors.join(" | "));
 console.log("PASS: WebGL 0.15.0 SAFE +14%, RISK +40%, one per gate/lap, " +
  "new Time Trial fingerprint, 8 unchanged challenges",JSON.stringify({
   safe:report.safe, risk:report.choice, gates:report.shaderPads}));
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
