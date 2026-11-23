// SKYSHIFT 0.8.2 – focused real WebGL/Chrome and Android GRIP smoke.
import {spawn} from "node:child_process";
import {chromium} from "playwright-core";
import {setTimeout as sleep} from "node:timers/promises";
import {existsSync} from "node:fs";
const browserPath=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean)
 .find(existsSync);
if(!browserPath)throw new Error("Chrome unavailable on CI worker");
const server=spawn("python3",["-m","http.server","8765","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:browserPath,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1440,height:810}});
 const errs=[];
 page.on("pageerror",e=>errs.push(e.message));
 page.on("console",msg=>{if(msg.type()==="error")errs.push(msg.text())});
 await page.goto("http://127.0.0.1:8765/skyshift/",
  {waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:60000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>document.querySelector("#menu")
  ?.classList.contains("hidden"),null,{timeout:25000});
 const live=await page.evaluate(()=>({
  title:document.title,
  canvas:document.querySelector("#game")?.width,
  hud:!document.querySelector("#hud")?.classList.contains("hidden"),
  grip:document.getElementById("grip-btn")?.getBoundingClientRect().width,
  error:!document.querySelector("#error")?.classList.contains("hidden")
 }));
 if(!live.title.includes("0.8.2")||live.error||!live.canvas||!live.hud||
     live.grip<60)
  throw new Error("0.8.2 real WebGL UI not ready: "+JSON.stringify(live));
 // REAL production ESM, not reimplemented geometry or an image-only fake.
 const physical=await page.evaluate(async()=>{
  const [m,road,rail,cinema,boost]=await Promise.all([
   import("./trial-v082.mjs"),import("./smooth-track-v082.mjs"),
   import("./tracks/barriers/aero-barrier-v082.mjs"),import("./cinematic-v082.mjs"),
   import("./flight/boost/boost-v082.mjs")]);
  const corner=m.COURSE_SEGMENTS.find(x=>x.id==="high-speed-sweep");
  const wall=()=>{const s=1645,p=m.positionAt(s),f=m.newFlightState();
   Object.assign(f,{s,worldX:p.x,worldZ:p.z,
    y:m.surfaceHeightAt(s)+m.TRIAL.hoverHeight,
    heading:m.headingAt(s),zoneSpeedStage:4,
    zoneCruiseSpeed:m.speedAt(s,4),currentSpeed:m.speedAt(s,4)});
   let entries=0,exits=0;
   for(let i=0;i<1000&&f.s<1905;i++){
    const r=m.stepFlight(f,1/120,{steer:0,grip:false});
    entries+=Number(r.wallEntered);exits+=Number(r.wallExited);
    if(r.crashed)break;
   }
   return {entries,exits,peak:f.magneticPeakDegrees,falls:f.falls,
    finalS:f.s};
  };
  const screw=()=>{const s=2990,p=m.positionAt(s),f=m.newFlightState();
   Object.assign(f,{s,worldX:p.x,worldZ:p.z,
    y:m.surfaceHeightAt(s)+m.TRIAL.hoverHeight,
    heading:m.headingAt(s),zoneSpeedStage:7,
    zoneCruiseSpeed:m.speedAt(s,7),currentSpeed:m.speedAt(s,7)});
   let entries=0,exits=0,ceiling=0;
   for(let i=0;i<1300&&f.s<3348;i++){
    const r=m.stepFlight(f,1/120,{steer:0,grip:false});
    entries+=Number(r.corkscrewEntered);
    exits+=Number(r.corkscrewExited);
    if(f.corkscrewActive&&m.surfaceNormalAt(f.s).y<-.8)ceiling++;
    if(r.crashed)break;
   }
   return {entries,exits,ceiling,peak:f.corkscrewPeakDegrees,
    falls:f.falls,finalS:f.s};
  };
  return {firstCorner:corner.start,gripWidth:m.widthAt(900),
   normalWidth:m.widthAt(120),gap:m.SKYLINE_LEAP.start,
   wallStart:m.MAGNETIC_WALL.start,wallEnd:m.MAGNETIC_WALL.end,
   corkStart:m.CORKSCREW.start,
   separated:m.CORKSCREW.start-m.MAGNETIC_WALL.end,
   closure:m.validateTrial(),roadTriangles:road.createSmoothDeckData().triangles,
   railTriangles:rail.createAeroBarrierData().triangles,
   roll:cinema.cameraBankAt(3171.5),boosts:boost.BOOST_PADS.length,
   wall:wall(),screw:screw()};
 });
 if(physical.firstCorner>165||physical.firstCorner<155||
   physical.gripWidth!==14||physical.normalWidth!==23.2||
   physical.gap!==573||physical.wallStart!==1662||physical.wallEnd!==1842||
   physical.separated<1000||physical.boosts!==3||
   physical.closure.length||physical.roadTriangles<25000||
   physical.railTriangles<20000||
   Math.abs(physical.roll+Math.PI)>.04||
   physical.wall.entries!==1||physical.wall.exits!==1||
   physical.wall.peak<69.5||physical.wall.falls!==0||
   physical.screw.entries!==1||physical.screw.exits!==1||
   physical.screw.ceiling<20||physical.screw.falls!==0)
  throw new Error("Physical 0.8.2 authored 3D rhythm regression: "+
    JSON.stringify(physical));
 console.log("PASS: Chrome real 3D shader + first corner / GRIP throat / 3D spectacles:",
  JSON.stringify(physical));
 // Desktop's regular GRIP input must still operate while driving.
 await page.keyboard.down("Shift");
 await page.keyboard.down("ArrowRight");
 await page.waitForFunction(()=>document.getElementById("grip-btn")
  ?.classList.contains("active"),null,{timeout:18000});
 await page.keyboard.up("ArrowRight");await page.keyboard.up("Shift");
 await page.close();
 const mobile=await browser.newPage({viewport:{width:914,height:411},
  deviceScaleFactor:1.2,hasTouch:true,isMobile:true});
 await mobile.goto("http://127.0.0.1:8765/skyshift/",
  {waitUntil:"domcontentloaded",timeout:60000});
 await mobile.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:70000});
 const start=await mobile.locator("#start-btn").boundingBox();
 await mobile.touchscreen.tap(start.x+start.width*.5,start.y+start.height*.5);
 await mobile.waitForFunction(()=>document.querySelector("#menu")
  ?.classList.contains("hidden"),null,{timeout:30000});
 const controls=await mobile.evaluate(()=>{
  const r=id=>document.getElementById(id).getBoundingClientRect();
  const steer=r("stick"),grip=r("grip-btn"),hud=r("hud");
  return {stickWidth:steer.width,stickEnd:steer.right,
   gripLeft:grip.left,gripWidth:grip.width,gripTop:grip.top,
   hudBottom:hud.bottom,
   jumpHidden:getComputedStyle(document.getElementById("jump-btn")).display==="none"};
 });
 if(!controls.jumpHidden||controls.stickWidth<140||
     controls.gripWidth<70||controls.stickEnd+20>=controls.gripLeft||
     controls.hudBottom>=controls.gripTop)
  throw new Error("Mobile two-thumb GRIP or HUD interferes: "+
    JSON.stringify(controls));
 console.log("PASS: touch-first Android GRID + GRIP layout",JSON.stringify(controls));
 await mobile.close();
 if(errs.length)throw new Error("Browser console JS failures:\n"+errs.join("\n"));
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
