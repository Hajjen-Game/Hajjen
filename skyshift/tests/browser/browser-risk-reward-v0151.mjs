// SKYSHIFT 0.15.1 — real Chromium/WebGL gameplay: five left/right risk choices,
// mutually exclusive physical rewards, shaders and old Challenges preserved.
import {spawn} from "node:child_process";
import {chromium} from "playwright-core";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable");
const server=spawn("python3",["-m","http.server","8765","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1000);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1536,height:691}});
 const errors=[];
 page.on("pageerror",e=>errors.push("JS: "+e.message));
 page.on("console",msg=>{
  if(msg.type()==="error"&&/shader|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
   errors.push("GPU: "+msg.text());
 });
 await page.goto("http://127.0.0.1:8765/skyshift/?riskSmoke=1",
  {waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:75000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:35000});
 const report=await page.evaluate(async()=>{
  const [road,boost,risk,trial,records]=await Promise.all([
   import("./premium-track-v0151.mjs"),
   import("./flight/boost/boost-v0151.mjs"),
   import("./risk-reward-v0151.mjs"),
   import("./trial-v0151.mjs"),
   import("./time-trial-v0151.mjs")
  ]);
  const probe=window.__skyshiftRiskProbe();
  const pads=risk.RHYTHM_GATES_0151.map(g=>{
   const side=(g.riskMin+g.riskMax)/2;
   const s=g.start+5;
   const runs=["safe","risk"].map(kind=>{
    const lateral=kind==="risk"?side:0;
    const p=trial.positionAt(s,lateral);
    const f=trial.newFlightState();
    Object.assign(f,{s,lateral,worldX:p.x,worldZ:p.z,
     heading:trial.headingAt(s),
     y:trial.surfaceHeightAt(s,lateral)+trial.TRIAL.hoverHeight,
     grounded:true,vy:0});
    const r=trial.stepFlight(f,1/120,{steer:0,grip:false});
    // Safely switch to the opposite lane on the same gate:
    f.lateral=kind==="risk"?0:side;
    const second=trial.stepFlight(f,1/120,{steer:0,grip:false});
    return {kind,picked:r.boostChoice,
     lockWorks:second.boostChoice===null&&f.boostActivations===1,
     target:f.boostTargetMultiplier};
   });
   const cue=risk.riskCueAt(g.approach+.1,0,[]);
   return {id:g.id,direction:g.direction,difficulty:g.difficulty,
    bonus:g.riskMultiplier,safe:g.safeMultiplier,span:[g.start,g.end],
    cueSide:cue?.side,cueText:cue?.text,
    runs};
  });
  return {probe,gateCount:risk.RHYTHM_GATES_0151.length,
   pads,drawBatches:road.PREMIUM_TRACK.drawBatches,
   shaderPads:road.GLSL_BOOST_PADS.length,physicsPads:boost.BOOST_PADS.length,
   recorder:records.TIME_TRIAL_0151.trackRevision,
   originalChallenges:document.querySelector("#challenges-btn")!==null,
   cueExists:document.querySelector("#risk-line-cue")!==null};
 });
 if(report.gateCount!==5||report.pads.length!==5||
    report.probe?.mode!=="playing"||report.probe.configuredPads.length!==11||
    report.drawBatches!==1||report.shaderPads!==11||report.physicsPads!==11||
    !report.recorder.includes("diversity")||!report.originalChallenges||
    !report.cueExists)
  throw Error("Version/physical road map regression "+JSON.stringify(report));
 let left=0,right=0;
 for(const gate of report.pads){
  if(gate.direction==="LEFT")left++;else if(gate.direction==="RIGHT")right++;
  else throw Error("Missing L/R direction "+gate.id);
  if(gate.cueSide!==gate.direction||
    !gate.cueText.includes(gate.direction+" RISK")||
    !gate.cueText.includes("+"+Math.round((gate.bonus-1)*100)+"%"))
   throw Error("Dynamic HUD lane cue wrong "+JSON.stringify(gate));
  for(const run of gate.runs){
   if(run.picked?.kind!==run.kind||!run.lockWorks||
      Math.abs(run.target-(run.kind==="risk"?gate.bonus:gate.safe))>1e-9)
    throw Error("Real 120Hz boost or one-choice lock failed "+JSON.stringify(gate));
  }
 }
 if(left!==3||right!==2)throw Error("Missing direction variety "+left+"/"+right);
 await page.screenshot({path:"skyshift-v0151-flow-and-risk.png"});
 await page.locator("#pause-btn").click();
 await page.locator("#pause-menu-btn").click();
 await page.locator("#challenges-btn").click();
 const cards=await page.locator("[data-challenge-id]").count();
 if(cards!==8)throw Error("Skyline Challenges lost: "+cards);
 if(errors.length)throw Error("Chrome JS or WebGL errors: "+errors.join(" | "));
 console.log("PASS: SKYSHIFT 0.15.1 WebGL, 5 gates per lap, 3 LEFT / 2 RIGHT, "+
  "11 real physical pad choices, correct dynamic HUD, exclusive boosts, "+
  "single PBR deck, new PB ruleset and 8 existing challenges",
  JSON.stringify({left,right,gates:report.pads.map(g=>({
   id:g.id,riskPct:Math.round((g.bonus-1)*100),direction:g.direction}))}));
}finally{await browser?.close();server.kill("SIGTERM");}
