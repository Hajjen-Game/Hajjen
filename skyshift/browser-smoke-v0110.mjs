// SKYSHIFT 0.11.0 – real WebGL, world-anchored dynamic wake, airborne and Android GRIP smoke.
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
 await page.goto("http://127.0.0.1:8765/skyshift/?tunnelSmoke=1",
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
 if(!live.title.includes("0.11.0")||live.error||!live.canvas||!live.hud||
     live.grip<60)
  throw new Error("0.11.0 real WebGL UI not ready: "+JSON.stringify(live));
 // Passive default profiling must retain the complete 0.10.9.1 game presentation.
 const baseline=await page.evaluate(()=>window.__skyshiftPerfProbe?.());
 if(!baseline||baseline.settings.enabled||baseline.pipeline.fixedQuality||
    !baseline.pipeline.bloom||!baseline.pipeline.smaa||baseline.physicsHz!==120)
  throw Error("0.11.0 normal game profile regression "+JSON.stringify(baseline));
 // REAL production ESM, not reimplemented geometry or an image-only fake.
 const physical=await page.evaluate(async()=>{
  const [m,road,rail,cinema,boost]=await Promise.all([
   import("./trial-v0901.mjs"),import("./smooth-track-v084.mjs"),
   import("./aero-barrier-v084.mjs"),import("./cinematic-v0901.mjs"),
   import("./boost-v082.mjs")]);
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
  throw new Error("Physical 0.11.0 authored 3D rhythm regression: "+
    JSON.stringify(physical));
 console.log("PASS: Chrome real 3D shader + first corner / GRIP throat / 3D spectacles:",
  JSON.stringify(physical));
 // REAL 0.11.0 camera module, verified in the same software-WebGL
 // browser as the game. 0.8.4 pilot physics stays unchanged.
 const cameraRig=await page.evaluate(async()=>{
  const [rig,flight]=await Promise.all([
   import("./flight/kinetic-camera-v090.mjs"),import("./trial-v0901.mjs")]);
  const classic=rig.kineticFovAt(flight.TRIAL.startSpeed);
  const top=rig.kineticFovAt(flight.TRIAL.endSpeed);
  const st=rig.createKineticCameraState();
  for(let i=0;i<180;i++)rig.stepKineticCamera(st,1/60,{
   speed:90,steering:.8,yawRate:.9,gripIntensity:1,grounded:true});
  const carve={side:st.sideMeters,roll:st.rollRadians};
  const screw=rig.createKineticCameraState();
  for(let i=0;i<180;i++)rig.stepKineticCamera(screw,1/60,{
   speed:90,steering:.8,yawRate:.9,gripIntensity:1,
   grounded:true,corkscrew:true});
  return {classic,top,carve,screwSide:screw.sideMeters,
   stats:rig.kineticCameraAudit(st)};
 });
 if(cameraRig.classic!==65.4||cameraRig.top<76||
   cameraRig.carve.side>-.5||cameraRig.screwSide<-.15||
   cameraRig.stats.extraDrawCalls!==0)
  throw new Error("Kinetic Camera Rig verification failed: "+
   JSON.stringify(cameraRig));
 console.log("PASS: 0.11.0 Kinetic turn anticipation, safe bank and extended FOV",
  JSON.stringify(cameraRig));
 // Verify new motion in the actual production browser module.
 const signature=await page.evaluate(async()=>{
  const m=await import("./flight/signature-flight-v091.mjs");
  const st=m.createSignatureFlightState();
  const base={speed:100,steering:.9,yawRate:1.0,
   gripIntensity:0,grounded:true,boostMultiplier:1};
  for(let i=0;i<120;i++)m.stepSignatureFlight(st,1/120,base);
  const ordinary=Math.abs(st.roll);
  base.gripIntensity=1;base.boostMultiplier=1.4;
  m.triggerSignatureBoost(st);
  for(let i=0;i<120;i++)m.stepSignatureFlight(st,1/120,base);
  return {ordinary,grip:Math.abs(st.roll),engine:st.engineEnergy,
   split:st.engineSplit,audit:m.signatureFlightAudit(st)};
 });
 if(signature.grip<signature.ordinary*2.5||
    signature.engine<.6||Math.abs(signature.split)<.6||
    !signature.audit.pilotPhysicsUnchanged||
    signature.audit.extraDrawCalls!==0)
  throw new Error("0.11.0 live signature flight dynamics failed: "+
   JSON.stringify(signature));
 console.log("PASS: Signature Flight GRIP carve / twin engine response",
  JSON.stringify(signature));
 // Desktop's regular GRIP input must still operate while driving.
 await page.keyboard.down("Shift");
 await page.keyboard.down("ArrowRight");
 await page.waitForFunction(()=>document.getElementById("grip-btn")
  ?.classList.contains("active"),null,{timeout:18000});
 await page.keyboard.up("ArrowRight");await page.keyboard.up("Shift");
 // Inspect an actual in-tunnel pose: the world geometry and road shader
 // are rendered in software WebGL, not just unit-tested as raw numbers.
 const tunnel=await page.evaluate(()=>window.__skyshiftTunnelSmoke?.(2450));
 if(!tunnel?.inside||tunnel.darkness<.99||
    tunnel.geometry.lengthMeters!==760||
    tunnel.geometry.drawBatches!==4||
    tunnel.geometry.additionalLights!==0)
  throw new Error("Shadow Tunnel render probe failed: "+JSON.stringify(tunnel));
 // Software WebGL and HDR can take more than 700ms per frame on CI.
 // Wait for the REAL production lighting controller to observe the pose.
 await page.waitForFunction(()=>{
  const result=window.__skyshiftTunnelLightInfo?.();
  return result?.levels?.darkness>.98&&
    result?.lightIntensity?.ambient<.03;
 },null,{timeout:30000});
 // The actual production WebGL scene—not a synthesized mock—must have
 // its world lights nearly off. Keep local twin-engine light sources on.
 const light=await page.evaluate(()=>window.__skyshiftTunnelLightInfo?.());
 if(!light||light.levels.darkness<.99||
   light.levels.ambient>.01||light.levels.key>.02||
   light.levels.fill>.01||light.levels.roadBody>.005||
   light.lightIntensity.ambient>.03||light.lightIntensity.key>.05||
   light.lightIntensity.fill>.01||
   light.bladeTipOpacity>.02||
   light.engineIntensity.length!==2||
   light.engineIntensity.some(x=>x<=0)||
   !light.state.engineLightsIntact||
   light.state.hiddenCameraBackdrop<3)
  throw new Error("0.11.0 black-room lighting or twin engines broken: "+
   JSON.stringify(light));
 console.log("PASS: near-zero PBR world lights, black Manta hull and rail body, "+
   "bright unaffected twin engines and neon",JSON.stringify(light));
 await page.screenshot({path:"skyshift-v01091-blackout-tunnel.png"});
 console.log("PASS: visible 760m Shadow Tunnel at 2450m in real Chrome",
  JSON.stringify(tunnel));
 await page.close();
 // The real 3D browser should witness ACTUAL world-position history,
 // not just a growing white line attached to the current ship.
 const wake=await browser.newPage({viewport:{width:1440,height:810}});
 wake.on("pageerror",e=>errs.push(e.message));
 wake.on("console",msg=>{if(msg.type()==="error")errs.push(msg.text())});
 await wake.goto("http://127.0.0.1:8765/skyshift/?wakeSmoke=1",
  {waitUntil:"domcontentloaded",timeout:60000});
 await wake.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:65000});
 await wake.locator("#start-btn").click();
 await wake.waitForFunction(()=>document.querySelector("#menu")
  ?.classList.contains("hidden"),null,{timeout:25000});
 const state=async(stage,load,minSamples=10)=>{
  await wake.evaluate(([speed,mode])=>window.__skyshiftWakeSmoke(speed,mode),
   [stage,load]);
  await wake.waitForFunction(n=>{
   const fx=window.__skyshiftWakeInfo?.();
   return fx?.sampleCount>=n && fx?.historicalSpanMeters>3 &&
    fx?.activeSegments>0;
  },minSamples,{timeout:50000});
  return wake.evaluate(()=>window.__skyshiftWakeInfo());
 };
 const straight=await state(8,"straight");
 const grip=await state(8,"grip");
 await wake.screenshot({path:"skyshift-v01091-grip-wake.png"});
 const airborne=await state(8,"air");
 const boost=await state(8,"boost");
 await wake.screenshot({path:"skyshift-v01091-boost-wake.png"});
 if(!grip.additiveLightOnly||!grip.materialFogDisabled||
    grip.colorRgbaItemSize!==4||
    !straight.additiveLightOnly||!boost.additiveLightOnly)
  throw new Error("0.11.0 wake must be bright WHITE additive light "+
    "without black/grey fog-composited strips: "+
    JSON.stringify({straight,grip,boost}));
 if(!straight.worldAnchored||!grip.worldAnchored||
    !(grip.peakLightEnergy>straight.peakLightEnergy*2.5)||
    !(airborne.peakLightEnergy>straight.peakLightEnergy)||
    !(boost.peakLightEnergy>straight.peakLightEnergy)||
    grip.sampleCount<10||grip.historicalSpanMeters<3||
    grip.peakSegments<3||grip.tipXMeters!==2.9||
    grip.extraDrawCalls!==1||grip.peakLightEnergy>.46||
    !grip.physicsUnchanged)
  throw new Error("0.11.0 world history, subtle energy or turn activation: "+
   JSON.stringify({straight,grip,airborne,boost}));
 console.log("PASS: WHITE additive world-space wake, no darkened pixels; GRIP wakes up "+
  "and straight cruise remains subdued",JSON.stringify({straight,grip,airborne,boost}));
 await wake.close();
 // Actual Chrome WebGL check of mechanically hinged surfaces, not a source
 // string test or decorative animation simulated outside the live game.
 const flaps=await browser.newPage({viewport:{width:1440,height:810}});
 flaps.on("pageerror",e=>errs.push(e.message));
 flaps.on("console",msg=>{if(msg.type()==="error")errs.push(msg.text())});
 await flaps.goto("http://127.0.0.1:8765/skyshift/?flapSmoke=1",
  {waitUntil:"domcontentloaded",timeout:60000});
 await flaps.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:65000});
 await flaps.locator("#start-btn").click();
 await flaps.waitForFunction(()=>document.querySelector("#menu")
  ?.classList.contains("hidden"),null,{timeout:25000});
 const setFlap=async(steer,grip,check)=>{
  await flaps.evaluate(([a,b])=>window.__skyshiftFlapSet(a,b),[steer,grip]);
  await flaps.waitForFunction(check,null,{timeout:25000});
  return flaps.evaluate(()=>window.__skyshiftFlapProbe());
 };
 const idle=await flaps.evaluate(()=>window.__skyshiftFlapProbe());
 const normal=await setFlap(1,0,()=>{
  const f=window.__skyshiftFlapProbe();
  return f?.starboardDegrees>12&&f?.portDegrees>3&&
   f.starboardDegrees>f.portDegrees*1.6;
 });
 const gripRight=await setFlap(1,1,()=>{
  const f=window.__skyshiftFlapProbe();
  return f?.starboardDegrees>26&&f?.portDegrees>10&&
   f.peakGlowOpacity>.43;
 });
 await flaps.screenshot({path:"skyshift-v01091-flaps-grip-right.png"});
 const gripLeft=await setFlap(-1,1,()=>{
  const f=window.__skyshiftFlapProbe();
  return f?.portDegrees>26&&
   f.portDegrees>f.starboardDegrees+10;
 });
 await flaps.screenshot({path:"skyshift-v01091-flaps-grip-left.png"});
 const released=await setFlap(0,0,()=>{
  const f=window.__skyshiftFlapProbe();
  return Math.abs(f?.portDegrees??100)<1.5&&
   Math.abs(f?.starboardDegrees??100)<1.5;
 });
 if(idle.wingCount!==2||normal.starboardDegrees<=normal.portDegrees||
    !(gripRight.starboardDegrees>normal.starboardDegrees)||
    gripLeft.portDegrees<=gripLeft.starboardDegrees||
    gripRight.peakGlowOpacity<=.43||gripRight.peakDegrees<=26||
    released.steeringFrames<1||released.gripFrames<1||
    released.maxDrawCalls>6||!released.physicsUnchanged)
  throw new Error("0.11.0 live reactive wing flap controls broken: "+
   JSON.stringify({idle,normal,gripRight,gripLeft,released}));
 console.log("PASS: live hinged Manta flaps, right/left asymmetric "+
  "actuation, premium edge glow, GRIP deployment and spring recovery",
  JSON.stringify({normal,gripRight,gripLeft,released}));
 await flaps.close();
 // Real collision simulation is physics-owned (railContacting/side/serial).
 // Freeze only the test flight physics. Sparks must be world-space, appear
 // at the contacting wall and continue ballistic motion AFTER release.
 const spark=await browser.newPage({viewport:{width:1440,height:810}});
 spark.on("pageerror",e=>errs.push(e.message));
 spark.on("console",msg=>{if(msg.type()==="error")errs.push(msg.text())});
 await spark.goto("http://127.0.0.1:8765/skyshift/?sparkSmoke=1",
  {waitUntil:"domcontentloaded",timeout:60000});
 await spark.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:65000});
 await spark.locator("#start-btn").click();
 await spark.waitForFunction(()=>document.querySelector("#menu")
  ?.classList.contains("hidden"),null,{timeout:25000});
 const quietSparks=await spark.evaluate(()=>window.__skyshiftSparkInfo());
 if(quietSparks.emitted!==0||quietSparks.impactBursts!==0)
  throw Error("0.11.0 emitted sparks without rail contact "+JSON.stringify(quietSparks));
 await spark.evaluate(()=>window.__skyshiftSparkSmoke(1,7,true));
 await spark.waitForFunction(()=>{
  const f=window.__skyshiftSparkInfo?.();
  return f?.impactBursts>=1&&f?.activeSparks>=2&&f?.lastSide===1;
 },null,{timeout:25000});
 const rightSparks=await spark.evaluate(()=>window.__skyshiftSparkInfo());
 await spark.screenshot({path:"skyshift-v01091-rail-sparks-right.png"});
 await spark.evaluate(()=>window.__skyshiftSparkSmoke(-1,7,true));
 await spark.waitForFunction(()=>{
  const f=window.__skyshiftSparkInfo?.();
  return f?.impactBursts>=2&&f?.lastSide===-1&&f?.emitted>=12;
 },null,{timeout:25000});
 const leftSparks=await spark.evaluate(()=>window.__skyshiftSparkInfo());
 await spark.screenshot({path:"skyshift-v01091-rail-sparks-left.png"});
 if(rightSparks.lastSide!==1||leftSparks.lastSide!==-1||
    rightSparks.peakParticleWidthMeters<.048||
    rightSparks.peakFlashOpacity<.55||
    rightSparks.impactFlashes<1||
    leftSparks.impactFlashes!==2||
    rightSparks.sparkCoreWhite!==true||
    rightSparks.lastContact?.x===undefined||
    Math.hypot(rightSparks.lastContact.x-leftSparks.lastContact.x,
      rightSparks.lastContact.z-leftSparks.lastContact.z)<8||
    !leftSparks.additiveLightOnly||
    leftSparks.rgbaColorAttribute!==4||
    leftSparks.peakTravelFromContact<=0||
    leftSparks.peakSparks>104||
    leftSparks.addedDrawCalls!==1||
    !leftSparks.physicsUnchanged)
  throw Error("0.11.0 physical rail side, world travel, or quality regression "+
   JSON.stringify({quietSparks,rightSparks,leftSparks}));
 await spark.evaluate(()=>window.__skyshiftSparkSmoke(0,7,false));
 await spark.waitForFunction(()=>{
  const f=window.__skyshiftSparkInfo?.();
  return f?.activeSparks===0;
 },null,{timeout:25000});
 const releasedSparks=await spark.evaluate(()=>window.__skyshiftSparkInfo());
 if(releasedSparks.impactBursts!==2||releasedSparks.travelFrames<2||
    releasedSparks.flashVisible!==false)
  throw Error("0.11.0 sparks did not fly off and decay after wall release "+
   JSON.stringify(releasedSparks));
 console.log("PASS: BRIGHT mobile-readable white-gold rail sparks and contact flashes "+
  "impact bursts, world flight, graceful release; no fake proximity",
  JSON.stringify({quietSparks,rightSparks,leftSparks,releasedSparks}));
 await spark.close();
 // Real Hangar UI + actual curved manta mesh, then unlock/equip persistence.
 const hangar=await browser.newPage({viewport:{width:1440,height:810}});
 hangar.on("pageerror",e=>errs.push(e.message));
 hangar.on("console",msg=>{if(msg.type()==="error")errs.push(msg.text())});
 await hangar.goto("http://127.0.0.1:8765/skyshift/?fleetSmoke=1",
  {waitUntil:"domcontentloaded",timeout:60000});
 await hangar.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:65000});
 await hangar.locator("#hangar-btn").click();
 await hangar.waitForTimeout(550);
  const initialFleet=await hangar.evaluate(()=>window.__skyshiftFleetProbe());
 if(initialFleet.surfacePolish?.extraDrawCalls!==4)
  throw new Error("0.11.0 premium Manta surfaces inactive: "+
   JSON.stringify(initialFleet));
 if(!initialFleet.hangarVisible||initialFleet.selected!=="manta"||
   initialFleet.unlocked.includes("stingray")||
   !(await hangar.locator('[data-fleet-equip="stingray"]').isDisabled()))
  throw new Error("0.11.0 locked fleet defaults broken: "+
   JSON.stringify(initialFleet));
 await hangar.locator('[data-fleet-preview="stingray"]').click();
 await hangar.waitForFunction(()=>{
  const info=window.__skyshiftFleetProbe?.();
  return info?.activeShipId==="stingray"&&info?.tail?.updates>8;
 },null,{timeout:20000});
 await hangar.waitForTimeout(1150);
 const preview=await hangar.evaluate(()=>window.__skyshiftFleetProbe());
 if(preview.surfacePolish?.extraDrawCalls!==4||
    preview.surfacePolish.updates<5||
    preview.wingFlaps?.model!=="stingray"||
    preview.wingFlaps.updates<5||
    preview.wingFlaps.wingCount!==2)
  throw new Error("0.11.0 Stingray premium surfaces absent: "+
   JSON.stringify(preview));
 if(preview.showroomWorldHidden||!preview.previewTrackVisible||
   !(preview.projectedShipX>.54&&preview.projectedShipX<.92)||
   preview.tail.peakTipDeflectionDegrees<4)
  throw new Error("0.11.0 showroom framing or kinetic tail missing: "+
   JSON.stringify(preview));
  if(preview.tail.segmentCount!==9||preview.tail.physicsUnchanged!==true||
    preview.selected!=="manta")
  throw new Error("0.11.0 articulated preview not working: "+
   JSON.stringify(preview));
 const direction=await hangar.evaluate(async()=>{
  const m=await import("./stingray-evo-v0104.mjs");
  const pose=(direction)=>{
   const st=m.createTailState();
   for(let i=0;i<120;i++)m.tailPoseStep(st,1/60,{
    steering:direction*.94,yawRate:direction*.82,gripIntensity:.9,
    boostMultiplier:1,speed:110,grounded:true
   });
   return [...st.yaw].reduce((a,b)=>a+b,0);
  };
  return {right:pose(1),left:pose(-1)};
 });
 if(!(direction.right>.16&&direction.left<-.16))
  throw new Error("Tail moves against steering input: "+JSON.stringify(direction));
 const neutral=await hangar.evaluate(async()=>{
   const m=await import("./stingray-evo-v0104.mjs");
   const st=m.createTailState(),samples=[];
   for(let k=0;k<360;k++){
    m.tailPoseStep(st,1/60,{speed:112,steering:0,
     yawRate:0,gripIntensity:0,grounded:true,boostMultiplier:1});
    if(k%15===0)samples.push(st.tipX);
   }
   return {peakIdleTipMeters:st.peakIdleTipMeters,
    neutralSamples:st.neutralSamples,
    leftmost:Math.min(...samples),rightmost:Math.max(...samples)};
 });
 if(neutral.peakIdleTipMeters<=.10||
    neutral.rightmost-neutral.leftmost<=.17||
    neutral.neutralSamples!==360)
  throw new Error("0.11.0 straight-line tail remains too still: "+
   JSON.stringify(neutral));
 console.log("PASS: Stingray living tail waves during straight flight",
   JSON.stringify(neutral));
  console.log("PASS: Tail bends RIGHT on right steering and LEFT on left",
  JSON.stringify(direction));
  await hangar.screenshot({path:"skyshift-v01091-stingray-hangar.png"});
 console.log("PASS: live Stingray articulated-tail 3D preview while still locked",
  JSON.stringify(preview));
 const reward=await hangar.evaluate(()=>window.__skyshiftFleetSmokeUnlock());
 if(!reward.unlocked.includes("stingray")||
   (await hangar.locator('[data-fleet-equip="stingray"]').isDisabled()))
  throw new Error("0.11.0 full-race reward did not unlock Hangar ship");
 await hangar.locator('[data-fleet-equip="stingray"]').click();
 await hangar.locator("#hangar-back").click();
 const afterClose=await hangar.evaluate(()=>window.__skyshiftFleetProbe());
 if(afterClose.showroomWorldHidden||!afterClose.previewTrackVisible)
  throw new Error("0.11.0 track world remained invisible after leaving Hangar");
 await hangar.reload({waitUntil:"domcontentloaded"});
 await hangar.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:65000});
 const saved=await hangar.evaluate(()=>window.__skyshiftFleetProbe());
 if(saved.selected!=="stingray"||saved.activeShipId!=="stingray"||
    !saved.unlocked.includes("stingray"))
  throw new Error("0.11.0 fleet selection not persisted after reload: "+
   JSON.stringify(saved));
 await hangar.locator("#start-btn").click();
 await hangar.waitForFunction(()=>{
  const f=window.__skyshiftFleetProbe?.();
  return f?.activeShipId==="stingray"&&f?.tail?.updates>5;
 },null,{timeout:25000});
 console.log("PASS: new selectable fleet, unlock persistence and real Stingray gameplay",
  JSON.stringify(saved));
 await hangar.close();
 const perfPage=await browser.newPage({viewport:{width:1000,height:560}});
 await perfPage.goto("http://127.0.0.1:8765/skyshift/?perf=1&perfPreset=no-bloom",
   {waitUntil:"domcontentloaded",timeout:60000});
 await perfPage.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",null,{timeout:60000});
 await perfPage.locator("#start-btn").click();
 await perfPage.waitForTimeout(1200);
 const testProfile=await perfPage.evaluate(()=>window.__skyshiftPerfProbe());
 if(!testProfile.settings.enabled||testProfile.settings.preset!=="no-bloom"||
   testProfile.pipeline.bloom||!testProfile.pipeline.smaa||!testProfile.pipeline.fixedQuality||
   testProfile.summary.frames<10||testProfile.summary.breakdown.frameMs.p95===null)
  throw Error("0.11.0 benchmark instrumentation regression "+JSON.stringify(testProfile));
 await perfPage.close();
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
 // Test the real production user-facing cue and low-memory profiles,
 // without faking steering or triggering GRIP on the player's behalf.
 const clarity=await mobile.evaluate(async()=>{
  const [c,guide,trial,steering]=await Promise.all([
   import("./image-clarity-v083.mjs"),
   import("./flight/racing-feel-v083.mjs"),
   import("./trial-v0901.mjs"),
   import("./flight/steering-authority-v0901.mjs")]);
  const cue=guide.gripApexCue(900,true,false,false,trial.GRIP_APEX);
  const low=c.clarityProfile(4,3),high=c.clarityProfile(8,3);
  const node=document.getElementById("grip-cue");
  const rect=node.getBoundingClientRect();
  const btn=document.getElementById("grip-btn").getBoundingClientRect();
  return {cue,low,high,normalStart:steering.normalYawFactorAt(44),
   normalFast:steering.normalYawFactorAt(trial.TRIAL.endSpeed),
   gripFull:steering.yawAuthorityAt(trial.TRIAL.endSpeed,1),
   gripCueNode:Boolean(node),
   cueStyle:document.styleSheets.length>0,
   buttonVisible:btn.width>70,
   hiddenInitially:node.classList.contains("hidden")};
 });
 if(!clarity.cue.visible||!clarity.cue.text.includes("GRIP")||
   clarity.low.internalTiers[2]!==.82||
   clarity.high.internalTiers[0]!==2||
   clarity.normalStart!==.69||clarity.normalFast!==.40||
   Math.abs(clarity.gripFull-1.55)>1e-8||
   !clarity.gripCueNode||!clarity.cueStyle||
   !clarity.buttonVisible||!clarity.hiddenInitially)
  throw new Error("SKYSHIFT 0.11.0 HUD/GRIP clarity readiness: "+
   JSON.stringify(clarity));
 console.log("PASS: responsive GRIP cue and low-RAM adaptive HDR",JSON.stringify(clarity));
 await mobile.close();
 if(errs.length)throw new Error("Browser console JS failures:\n"+errs.join("\n"));
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
