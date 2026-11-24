// SKYSHIFT 0.16.0 — two distinct playable tracks, same shared physics
// and correct matched road/rails/materials, real Chromium WebGL integration.
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
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1536,height:691}});
 const errors=[];
 page.on("pageerror",e=>errors.push("JS: "+e.message));
 page.on("console",msg=>{
  if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
    errors.push("GLSL: "+msg.text().slice(0,850));
 });
 async function ready(track){
  await page.goto("http://127.0.0.1:8765/skyshift/?track="+track+"&v=0.16.0",
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  return await page.evaluate(async()=>{
   const [trial,selection,premium,boost,shadow,record,racing]=await Promise.all([
    import("./trial-v0160.mjs"),import("./tracks/shared/track-selection-v0160.mjs"),
    import("./premium-track-v0160.mjs"),import("./flight/boost/boost-v0160.mjs"),
    import("./shadow-tunnel-v0160.mjs"),import("./time-trial-v0160.mjs"),
    import("./racing-experience-v0160.mjs")]);
   const p=trial.positionAt(550);
   const end=trial.positionAt(3400);
   const start=trial.positionAt(0);
   return {
    selected:selection.TRACK_ID_0160,name:trial.CIRCUIT.name,
    picker:document.querySelector("#track-picker").value,
    title:document.querySelector("#topbar-track-name").textContent,
    pads:boost.BOOST_PADS.length,
    renderPads:premium.GLSL_BOOST_PADS.length,
    roadBatches:premium.PREMIUM_TRACK.drawBatches,
    launchGap:trial.GAPS.length,gripApexWidth:trial.GRIP_APEX.minWidthMeters,
    special:{roll:trial.TRACK_3D.corkscrew,wall:trial.TRACK_3D.wallRide},
    at550:[p.x,p.y,p.z],closure:Math.hypot(end.x-start.x,end.z-start.z),
    tunnel:[shadow.SHADOW_TUNNEL.start,shadow.SHADOW_TUNNEL.end],
    PB:record.TIME_TRIAL_0160.storageKey,
    challengeHidden:document.querySelector("#challenges-btn").classList.contains("hidden"),
    labels:racing.RACING_0121.precisionWindows.map(x=>x.id)
   };
  });
 }
 const aurora=await ready("aurora");
 if(aurora.selected!=="aurora"||aurora.picker!=="aurora"||
  !aurora.name.includes("AURORA")||aurora.pads!==0||aurora.renderPads!==0||
  aurora.launchGap!==0||aurora.special.wall||aurora.special.roll||
  !aurora.challengeHidden||aurora.roadBatches!==1||aurora.closure>1e-6||
  !aurora.labels.every(x=>x.startsWith("aurora-")))
  throw Error("New 3D circuit not fully active: "+JSON.stringify(aurora));
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await page.screenshot({path:"skyshift-v0160-aurora-open-racing.png"});
 // A race participant cannot change tracks without leaving the race;
 // return to the menu through the actual pause control.
 await page.locator("#pause-btn").click();
 await page.locator("#pause-menu-btn").click();
 await page.locator("#track-picker").selectOption("skyline");
 await page.waitForURL(url=>url.searchParams.get("track")===null,
  {timeout:30000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:75000});
 const skyline=await page.evaluate(async()=>{
  const [trial,premium,record,selection,boost]=await Promise.all([
   import("./trial-v0160.mjs"),import("./premium-track-v0160.mjs"),
   import("./time-trial-v0160.mjs"),import("./tracks/shared/track-selection-v0160.mjs"),
   import("./flight/boost/boost-v0160.mjs")]);
  const p=trial.positionAt(550);
  return {selected:selection.TRACK_ID_0160,
   picker:document.querySelector("#track-picker").value,
   name:trial.CIRCUIT.name,pads:boost.BOOST_PADS.length,
   renderPads:premium.GLSL_BOOST_PADS.length,
   challengeVisible:!document.querySelector("#challenges-btn").classList.contains("hidden"),
   at550:[p.x,p.y,p.z],PB:record.TIME_TRIAL_0160.storageKey};
 });
 const difference=Math.hypot(aurora.at550[0]-skyline.at550[0],
  aurora.at550[2]-skyline.at550[2]);
 if(skyline.selected!=="skyline"||skyline.picker!=="skyline"||
  skyline.pads!==11||skyline.renderPads!==11||
  !skyline.challengeVisible||difference<20||
  skyline.PB===aurora.PB||skyline.PB!=="skyshift-time-trial-ghost-0151")
  throw Error("Skyline regression or same visual geometry: "+
   JSON.stringify({skyline,aurora,difference}));
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:30000});
 await page.screenshot({path:"skyshift-v0160-skyline-original.png"});
 if(errors.length)throw Error("WebGL/JS errors: "+errors.join(" | "));
 console.log("PASS: two distinct real 3D courses selectable in menu;"+
  " AURORA has no risk lines, 0 gaps, own rail geometry and PB; "+
  "SKYLINE retains its 11 pads and challenges. "+
  JSON.stringify({aurora:{name:aurora.name,pads:aurora.pads},
    skyline:{name:skyline.name,pads:skyline.pads},metersDifferentAt550:difference}));
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
