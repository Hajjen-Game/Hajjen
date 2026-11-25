// SKYSHIFT 0.7.2 — actual browser/WebGL shader smoke.
// GitHub runner includes Chrome; install only the small playwright-core driver.
import {spawn} from "node:child_process";
import {chromium} from "playwright-core";
import {setTimeout as sleep} from "node:timers/promises";
import {existsSync} from "node:fs";
const executables=[
 process.env.CHROME_PATH,
 "/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable",
 "/usr/bin/chromium"
].filter(Boolean);
const executablePath=executables.find(existsSync);
if(!executablePath)throw new Error("Chrome unavailable on test runner");
const server=spawn("python3",["-m","http.server","8765","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1440,height:810}});
 const errors=[];
 page.on("pageerror",e=>errors.push("JS exception: "+e.message));
 page.on("console",m=>{
  if(m.type()==="error")errors.push("Console: "+m.text());
 });
 page.on("requestfailed",request=>{
  if(/\.mjs|three\.module\.js/.test(request.url()))
   errors.push("Script fetch: "+request.url());
 });
 await page.goto("http://127.0.0.1:8765/skyshift/?waveSmoke=1",
  {waitUntil:"networkidle",timeout:60000});
 await page.locator("#start-btn").waitFor({state:"visible",timeout:25000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:50000});
 await page.locator("#start-btn").click();
 // Exercise REAL desktop keyboard inputs while the production WebGL scene
 // is running. Grip must affect authoritative flight state, not a fake pulse.
 await page.keyboard.down("Shift");
 await page.keyboard.down("ArrowRight");
 await page.waitForFunction(()=>{
  const g=window.__skyshiftGripInfo?.();
  return g?.activations>=1&&g?.active&&g?.visual?.activeFrames>0;
 },null,{timeout:25000});
 const liveGrip=await page.evaluate(()=>({
  ...window.__skyshiftGripInfo?.(),
  pressed:document.getElementById("grip-btn")?.getAttribute("aria-pressed"),
  controlClass:document.getElementById("mobile-controls")?.className
 }));
 if(liveGrip.pressed!=="true"||liveGrip.intensity<=0||
   liveGrip.visual.maximumExtraDrawCalls!==2||
   !liveGrip.controlClass.includes("grip-pressed"))
  throw new Error("Desktop Shift+steer did not engage real grip/thrusters: "+
   JSON.stringify(liveGrip));
 await page.keyboard.up("ArrowRight");
 await page.keyboard.up("Shift");
 await page.waitForFunction(()=>window.__skyshiftGripInfo?.()?.active===false,
  null,{timeout:12000});
 console.log("PASS: live desktop Shift+steer uses actual GRIP physics and side jets:",
  JSON.stringify(liveGrip));
 // New HUD must be instrument-like, DOM-only, and clearly separated from
 // the circuit. Capture actual desktop layout instead of trusting CSS strings.
 const hudLayout=await page.evaluate(()=>{
  const ids=[".hud-left",".hud-center",".hud-right"].map(s=>{
    const r=document.querySelector("#hud "+s)?.getBoundingClientRect();
    return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom}:null;
  });
  return {parts:ids,style:document.querySelector("#hud")?.className,
    speed:document.getElementById("speed")?.textContent,
    zone:document.getElementById("zone-number")?.textContent,
    controls:document.getElementById("stick")?.getBoundingClientRect().width};
 });
 if(!hudLayout.parts.every(Boolean)||
   !(hudLayout.parts[0].right<hudLayout.parts[1].left&&
     hudLayout.parts[1].right<hudLayout.parts[2].left)||
   !hudLayout.style.includes("hud-v2")||hudLayout.controls<145)
  throw new Error("HUD 2.0 desktop layout not separated/readable: "+
   JSON.stringify(hudLayout));
 // Explicitly inspect rendered meter thickness, open cockpit cards
 // and absence of the redundant subpixel roll indicator.
 const racingMeters=await page.evaluate(()=>{
  const px=sel=>parseFloat(getComputedStyle(
   document.querySelector(sel)).height);
  const css=sel=>getComputedStyle(document.querySelector(sel));
  const label=document.querySelector(".hud-left");
  return {
   shield:px("#hud .shield-track"),
   velocity:px("#hud .speed-energy-track"),
   course:px("#hud .zone-progress"),
   hasBankWidget:!!document.querySelector("#hud-bank-gauge,.hud-bank-instrument"),
   hasRacingClass:document.querySelector("#hud").classList.contains("hud-v21"),
   openPanelRadius:css(".hud-left").borderTopLeftRadius,
   shieldTrackShape:css("#hud .shield-track").clipPath,
   speedTrackShape:css("#hud .speed-energy-track").clipPath,
   leftHeight:label.getBoundingClientRect().height
  };
 });
 if(Math.abs(racingMeters.shield-9)>.1||
    Math.abs(racingMeters.velocity-8)>.1||
    Math.abs(racingMeters.course-6)>.1||
    racingMeters.hasBankWidget||!racingMeters.hasRacingClass||
    !racingMeters.shieldTrackShape.includes("polygon")||
    !racingMeters.speedTrackShape.includes("polygon")||
    racingMeters.leftHeight>125)
  throw new Error("Racing HUD 2.1 desktop visual specification failed: "+
   JSON.stringify(racingMeters));
 console.log("PASS: thicker racing HUD bars and removed roll gauge:",
  JSON.stringify(racingMeters));
 // Verify actual live composer pass order and low-RAM planning math.
 const clarity=await page.evaluate(async()=>{
  const live=window.__skyshiftClarityInfo?.();
  const m=await import("./image-clarity-v0498.mjs");
  const samsung=m.clarityProfile(4,2.625);
  return {live,samsung};
 });
 if(!clarity.live||clarity.live.antiAliasing!=="SMAA"||
  clarity.live.actualPassOrder.join(",")!=="RenderPass,UnrealBloomPass,SMAAPass,OutputPass"||
  !clarity.live.smaaEnabled||!clarity.samsung.lowMemory||
  Math.abs(clarity.samsung.renderDpr-1.35)>.001||
  clarity.samsung.internalTiers[1]>=clarity.samsung.internalTiers[0]||
  clarity.samsung.internalTiers[2]>=clarity.samsung.internalTiers[1])
  throw new Error("Live SMAA or low-memory quality profile failed: "+
    JSON.stringify(clarity));
 console.log("PASS: live HDR SMAA chain and Samsung adaptive quality:",JSON.stringify(clarity));
 // SwiftShader is not real-time; explicitly advance fixed-time world fronts
 // while retaining the real Three.js renderer / rail+road shaders.
 await sleep(1100);
 const first=await page.evaluate(()=>window.__skyshiftWaveSmoke?.(1));
 const activeHud=await page.evaluate(()=>({
  zoneActive:document.querySelector("#hud")?.classList.contains("hud-zone-active"),
  zoneEvents:window.__skyshiftHudInfo?.().zoneEvents,
  zoneColor:getComputedStyle(document.documentElement).getPropertyValue("--neon").trim()
 }));
 if(!activeHud.zoneActive||activeHud.zoneEvents!==1||
   !activeHud.zoneColor.startsWith("#"))
  throw new Error("The physical first spectral wave did not trigger HUD zone feedback: "+
   JSON.stringify(activeHud));
 console.log("PASS: world zone crossing animates the real HUD:",JSON.stringify(activeHud));
 if(!first||first.zone!==2||first.flightSeconds!==18.792||
    !first.railSynchronized||first.featherMeters!==24||
    first.whiteCoreMeters!==2.9||first.whiteCoreEnergy!==0.72||
    first.whiteBloomMeters!==14||first.whiteBloomEnergy!==0.2||
    first.engineResonance<=0||first.frontS<=first.playerS)
  throw new Error("First spectral wave did not overtake ship");
 await sleep(700);
 await page.screenshot({path:"skyshift-v072-first-wave.png"});
 const last=await page.evaluate(()=>window.__skyshiftWaveSmoke?.(3));
 const finalHud=await page.evaluate(()=>({
  zoneEvents:window.__skyshiftHudInfo?.().zoneEvents,
  zone:document.getElementById("zone-number")?.textContent,
  name:document.getElementById("sector-name")?.textContent
 }));
 if(finalHud.zoneEvents!==3||finalHud.zone!=="04"||finalHud.name!=="JADE SURGE")
  throw new Error("Final physical zone stages did not reach HUD: "+
   JSON.stringify(finalHud));
 if(!last||last.zone!==4||last.launches.join(",")!=="18,36,54,72,90,108,126,144"||
    last.palette!=="jade"||last.engineResonance<=0)
  throw new Error("Final JADE wave did not trigger at 27s");
 await sleep(850);
 await page.screenshot({path:"skyshift-v072-final-wave.png"});
 console.log("White-core first/last front:",JSON.stringify({first,last}));
 const result=await page.evaluate(()=>{
  const visible=el=>!!el&&!el.classList.contains("hidden");
  return {
   title:document.title,
   hudVisible:visible(document.querySelector("#hud")),
   errorVisible:visible(document.querySelector("#error")),
   errorMessage:document.querySelector("#error")?.textContent??"",
   speed:document.querySelector("#speed")?.textContent??"",
   zone:document.querySelector("#sector-name")?.textContent??"",
   zoneNumber:document.querySelector("#zone-number")?.textContent?.trim()??"",
   canvasWidth:document.querySelector("#game")?.width??0
  };
 });

 console.log("Browser smoke result:",JSON.stringify(result));
 if(errors.length)console.error("Browser errors:\n"+errors.join("\n"));
 if(!result.title.includes("0.7.2")||
    !result.hudVisible||result.errorVisible||!result.canvasWidth||
    result.zoneNumber!=="04"||
    errors.length)throw new Error("0.7.2 browser/WebGL rendering smoke failed");
 console.log("PASS: 0.7.2 real WebGL renders core-centred white crests, animated rail shaders and simulated Android touch.");
 // Validate the camera's real browser ESM module without replacing the
 // normal flight simulation or introducing extra GPU draw calls.
 const boostSpring=await page.evaluate(async()=>{
  const m=await import("./flight/boost/boost-spring-v0495.mjs");
  const s=m.createBoostSpringState();
  m.triggerBoostSpring(s,44,1.4);
  let speedMult=1,peak=0,peakTime=0;
  for(let i=0;i<144;i++){
   const dt=1/120,t=(i+1)*dt,active=t<.92;
   speedMult+=((active?1.4:1)-speedMult)*
    (1-Math.exp(-dt/(active?.15:.23)));
   const lag=m.stepBoostSpring(s,dt,44*(speedMult-1));
   if(lag>peak){peak=lag;peakTime=t;}
  }
  return {peak,peakTime,finalLag:s.lagMeters,
   fov:m.boostFovTarget(70.5,1.4,1.4),events:s.activations};
 });
 if(boostSpring.events!==1||boostSpring.peak<3.6||
    boostSpring.peak>=5.2||boostSpring.peakTime<.12||
    boostSpring.peakTime>.22||boostSpring.finalLag>.2||
    Math.abs(boostSpring.fov-74.2)>.01)
  throw new Error("0.7.2 browser camera spring is outside boost feel envelope: "+
   JSON.stringify(boostSpring));
 console.log("PASS: browser-executed boost spring and speed FOV:",JSON.stringify(boostSpring));
 // Validate production velocity language in the browser, independent of
 // artificial framebuffer timings on CI's SwiftShader software GPU.
 const velocity=await page.evaluate(async()=>{
  const m=await import("./velocity-language-v0496.mjs");
  const v=m.createVelocityState();
  m.igniteVelocity(v);
  let boost=1,maxFlow=0;
  for(let i=0;i<160;i++){
   const h=1/120,active=i*h<.92;
   boost+=((active?1.4:1)-boost)*(1-Math.exp(-h/(active?.15:.23)));
   m.stepVelocityState(v,h,44*boost,44,boost);
   maxFlow=Math.max(maxFlow,v.worldFlow);
  }
  return {events:v.activations,maxFlow,
   phase:v.flowPhaseMeters,peakRecoil:v.peakRecoilMeters,
   peakEngine:v.peakEngineFlow,tail:v.worldFlow};
 });
 if(velocity.events!==1||velocity.maxFlow<.8||velocity.maxFlow>1||
   velocity.peakRecoil<.10||velocity.peakRecoil>.27||
   velocity.phase<50||velocity.peakEngine<.8)
  throw new Error("Velocity language outside envelope "+JSON.stringify(velocity));
 console.log("PASS: browser-executed world and thruster velocity:",JSON.stringify(velocity));
 // Validate the physical new profile with the real Three.js browser graph.
 const railProfile=await page.evaluate(async()=>{
  const m=await import("./tracks/barriers/aero-barrier-v0497.mjs");
  const previous=await import("./tracks/barriers/aero-barrier-v0496.mjs");
  const straight=m.railHeightAt(30);
  const corner=m.railHeightAt(158);
  const arrows=m.createAeroDetailData();
  const old=previous.createAeroDetailData();
  return {straight,corner,arrows:arrows.curveChevrons,
   previousArrows:old.curveChevrons,
   physicalCollider:m.AERO_BARRIER.physicalColliderHeightMeters,
   drawBatches:m.AERO_BARRIER.drawBatches};
 });
 if(Math.abs(railProfile.straight-.99)>.0001||
   railProfile.corner<1.09||railProfile.corner>1.111||
   railProfile.arrows<=railProfile.previousArrows*1.3||
   railProfile.physicalCollider!==.78||railProfile.drawBatches!==3)
  throw new Error("Rail elevation/corner visibility outside bounds: "+
   JSON.stringify(railProfile));
 console.log("PASS: browser-evaluated elevated rails/chevrons:",
  JSON.stringify(railProfile));
 // Inspect the same closed lap and collision code used by the LIVE browser.
 const circuit=await page.evaluate(async()=>{
  const [trial,wave,boost,layout]=await Promise.all([
   import("./trial-v072.mjs"),import("./zone-wave-v060.mjs"),
   import("./flight/boost/boost-v060.mjs"),import("./tracks/shared/circuit-layout-v060.mjs")]);
  const p0=trial.poseAt(0),p1=trial.poseAt(3400),p2=trial.poseAt(6800);
  const flight=trial.newFlightState(),before=flight.currentSpeed;
  trial.setZoneSpeedStage(flight,1);
  for(let i=0;i<180;i++)trial.stepFlight(flight,1/120,{steer:0});
  const crossings=[];
  for(let lap=1;lap<=3;lap++){
   const state=trial.newFlightState(),gate=lap*3400;
   state.s=gate-2;
   const p=trial.positionAt(state.s,0,0);
   state.worldX=p.x;state.worldZ=p.z;
   state.heading=trial.headingAt(state.s);
   state.checkpoint=gate-340;state.checkpointsPassed=lap*10-1;
   state.lapsCompleted=lap-1;state.lap=lap;
   let notifications=0;
   for(let i=0;i<18;i++)
    if(trial.stepFlight(state,1/120,{steer:0}).lapCompleted)notifications++;
   crossings.push({lap,notifications,
    completed:state.lapsCompleted,finished:state.finished});
  }
  return {lapLength:trial.TRIAL.length,raceLength:trial.TRIAL.raceLength,
   laps:layout.CIRCUIT.laps,zones:wave.ZONE_PALETTES.length,
   triggers:wave.ZONE_WAVE.triggers,
   seamError:Math.hypot(p0.x-p1.x,p0.z-p1.z),
   secondSeamError:Math.hypot(p0.x-p2.x,p0.z-p2.z),
   headingCycle:p1.heading-p0.heading,
   segments:trial.COURSE_SEGMENTS.length,
   maxCurvature:Math.max(...trial.COURSE_SEGMENTS.map(x=>Math.abs(x.curvature))),
   banked:trial.COURSE_SEGMENTS.some(x=>trial.bankAt(x.start)!==0),
   padInlays:boost.BOOST_PADS.length,
   physicalPadVisits:boost.RACE_BOOST_PADS.length,
   physicalSpeedDelta:flight.currentSpeed-before,
   crossings};
 });
 if(circuit.lapLength!==3400||circuit.raceLength!==10200||
    circuit.laps!==3||circuit.zones!==9||
    circuit.triggers.join(",")!=="18,36,54,72,90,108,126,144"||
    circuit.segments!==15||circuit.maxCurvature<.009||
    circuit.seamError>1e-5||circuit.secondSeamError>1e-5||
    Math.abs(circuit.headingCycle-Math.PI*2)>1e-5||
    circuit.banked||circuit.padInlays!==3||
    circuit.physicalPadVisits!==9||circuit.physicalSpeedDelta<3||
    circuit.crossings.some(x=>x.notifications!==1||x.completed!==x.lap||
      x.finished!==(x.lap===3)))
  throw new Error("Closed-loop three-lap physics/geometry failed in Chrome: "+
   JSON.stringify(circuit));
 console.log("PASS: real Chrome sees seamless 3x3400m, timed laps, pads and 9 zones:",
  JSON.stringify(circuit));
 const lapDom=await page.evaluate(()=>({
  display:document.getElementById("lap-info")?.textContent,
  active:document.getElementById("lap-info")?.getBoundingClientRect().height
 }));
 if(!lapDom.display?.includes("LAP")||lapDom.active<10)
  throw new Error("Lap HUD is missing in the live race: "+JSON.stringify(lapDom));
 console.log("PASS: realtime LAP 1/3 instrument is rendered:",JSON.stringify(lapDom));
 // Verify real ELEVATED geometry, one physical missing road region, and
 // ballistic impulse/landings on first and fastest final lap in Chrome.
 const skylineLeap=await page.evaluate(async()=>{
  const [trial,terrain,deck,rails,cinema]=await Promise.all([
   import("./trial-v072.mjs"),import("./tracks/shared/track-3d-v072.mjs"),
   import("./tracks/shared/smooth-track-v072.mjs"),import("./tracks/barriers/aero-barrier-v072.mjs"),
   import("./cinematic-v072.mjs")]);
  const mesh=deck.createSmoothDeckData(),barrier=rails.createAeroBarrierData();
  const fullQuads=(mesh.rows-1)*(mesh.cols-1)*2;
  const fly=stage=>{
   const f=trial.newFlightState(),s=(stage?2:0)*3400+790;
   f.s=s;f.lap=stage?3:1;f.zoneSpeedStage=stage;
   f.zoneCruiseSpeed=trial.speedAt(s,stage);
   f.currentSpeed=f.zoneCruiseSpeed;
   const p=trial.positionAt(s,0,0);
   f.worldX=p.x;f.worldZ=p.z;
   f.heading=trial.headingAt(s);
   f.y=trial.surfaceHeightAt(s)+trial.TRIAL.hoverHeight;
   let launches=0,lands=0,air=0;
   for(let i=0;i<240;i++){
    const result=trial.stepFlight(f,1/120,{steer:0,grip:false});
    if(result.jumped)launches++;
    if(result.landed)lands++;
    if(!f.grounded)air++;
    if(lands)break;
   }
   return {stage,launches,lands,air,falls:f.falls,
    clean:f.cleanLeapLandings,jumps:f.jumps,
    actualSpeed:+f.currentSpeed.toFixed(2)};
  };
  const start=trial.poseAt(0),finish=trial.poseAt(3400);
  const view={s:280,worldX:0,worldZ:0,
   y:trial.surfaceHeightAt(280)+trial.TRIAL.hoverHeight,
   steering:0,clearance:0,heading:trial.headingAt(280)};
  const look=cinema.chasePose(view,{cameraHeading:view.heading,hover:0},
   {preview:0});
  return {high:terrain.elevationAt(1700),
   low:terrain.elevationAt(2580),
   gap:trial.GAPS.map(x=>[x.start,x.end]),
   hiddenDeckTriangles:fullQuads-mesh.triangles,
   railTriangles:barrier.triangles,
   startFinishVerticalError:Math.abs(start.y-finish.y),
   gradeSeamError:Math.abs(terrain.gradeAt(0)-terrain.gradeAt(3400)),
   cameraLookHeight:look.lookY,
   shipHeight:view.y,
   runs:[fly(0),fly(8)]};
 });
 if(skylineLeap.high<11.8||skylineLeap.low> -4.4||
    skylineLeap.gap.length!==1||
    skylineLeap.hiddenDeckTriangles<160||
    skylineLeap.startFinishVerticalError>1e-6||
    skylineLeap.gradeSeamError>1e-8||
    skylineLeap.cameraLookHeight<=skylineLeap.shipHeight+1.25||
    skylineLeap.runs.some(r=>r.launches!==1||r.lands!==1||
      r.clean!==1||r.falls!==0||r.air<25)||
    skylineLeap.runs[1].actualSpeed<=95)
  throw new Error("3D terrain / ballistic leap browser regression: "+
   JSON.stringify(skylineLeap));
 console.log("PASS: real Chrome has elevated 3D road, opened deck, two-speed LEAP landings:",
  JSON.stringify(skylineLeap));
 // Browser-native proof: the road, guardrail and camera all occupy the
 // same inclined 70-degree physical frame at a repeatable world location.
 const wallRide=await page.evaluate(async()=>{
  const [trial,track,rails,camera]=await Promise.all([
   import("./trial-v072.mjs"),import("./tracks/shared/track-3d-v072.mjs"),
   import("./tracks/barriers/aero-barrier-v072.mjs"),import("./cinematic-v072.mjs")]);
  const s=2558,n=trial.surfaceNormalAt(s);
  const center=trial.positionAt(s,0,0),left=trial.positionAt(s,-6,0),
    right=trial.positionAt(s,6,0);
  const f=trial.newFlightState(),lap=1;
  f.s=s;f.heading=trial.headingAt(s);f.lateral=0;
  f.worldX=center.x;f.worldZ=center.z;
  f.y=trial.surfaceHeightAt(s)+trial.TRIAL.hoverHeight*n.y;
  f.grounded=true;f.zoneSpeedStage=3;
  f.zoneCruiseSpeed=trial.speedAt(s,3);f.currentSpeed=f.zoneCruiseSpeed;
  let active=0;
  for(let i=0;i<45;i++){
   trial.stepFlight(f,1/120,{steer:0,grip:false});
   if(f.magneticActive)active++;
  }
  const chase=camera.chasePose({
    s,heading:trial.headingAt(s),worldX:center.x,worldZ:center.z,
    y:f.y,steering:0,clearance:0
  },{cameraHeading:trial.headingAt(s),hover:0},{preview:0});
  const rail=rails.sampleAeroProfile(s,1);
  return {angle:trial.bankDegreesAt(s),normal:n,deltaHeight:left.y-right.y,
    wallEntries:f.magneticEntries,active,railRise:rail[5].y-rail[0].y,
    cameraLateral:Math.hypot(chase.x-center.x,chase.z-center.z)};
 });
 if(Math.abs(wallRide.angle-70)>.01||
    wallRide.normal.y>.40||wallRide.deltaHeight<10||
    wallRide.wallEntries!==1||wallRide.active<40||
    wallRide.cameraLateral<12)
  throw new Error("Chrome Magnetic Wall Ride geometry/adhesion regression: "+
    JSON.stringify(wallRide));
 console.log("PASS: real Chrome validates 70° bank, normal grip and world camera:",
    JSON.stringify(wallRide));
 // Full-corkscrew browser check uses production ESM/physics and the
 // actual renderer graph, not a drawing of a twist. Validate the inverted
 // normal and drive the segment at two physical zone speeds.
 const corkscrew=await page.evaluate(async()=>{
  const [trial,track,cinema,deck]=await Promise.all([
   import("./trial-v072.mjs"),import("./tracks/shared/track-3d-v072.mjs"),
   import("./cinematic-v072.mjs"),import("./tracks/shared/smooth-track-v072.mjs")]);
  const center=3171.5,n=trial.surfaceNormalAt(center);
  const samples=[3005,3075,3171.5,3255,3337.9,3338]
    .map(s=>({s,bank:trial.bankDegreesAt(s),
       normal:trial.surfaceNormalAt(s)}));
  const run=(stage,lateral)=>{
   const s=2975,p=trial.positionAt(s,lateral),f=trial.newFlightState();
   Object.assign(f,{s,lap:1,lateral,worldX:p.x,worldZ:p.z,
    y:trial.surfaceHeightAt(s,lateral)+trial.TRIAL.hoverHeight*
      trial.surfaceNormalAt(s).y,heading:trial.headingAt(s),
    zoneSpeedStage:stage,zoneCruiseSpeed:trial.speedAt(s,stage),
    currentSpeed:trial.speedAt(s,stage)});
   let entries=0,exits=0,ceilingFrames=0,steps=0;
   while(f.s<3370&&steps++<1600){
    const r=trial.stepFlight(f,1/120,{steer:0,grip:false});
    entries+=Number(r.corkscrewEntered);
    exits+=Number(r.corkscrewExited);
    if(f.corkscrewActive&&trial.surfaceNormalAt(f.s).y<-.8)ceilingFrames++;
    if(!f.grounded||f.failed)break;
   }
   return {entries,exits,ceilingFrames,steps,clean:f.corkscrewCleanExits,
    invertedNormal:n.y,finalS:f.s,finalLateral:f.lateral,
    peak:f.corkscrewPeakDegrees,falls:f.falls,rail:f.railContacts};
  };
  const a=trial.positionAt(center,-5,0),b=trial.positionAt(center,5,0);
  return {samples,wallUnchanged:trial.bankDegreesAt(2555),
   upsideDown:n.y,trackCeiling:track.TRACK_3D.ceilingRun,
   fullCameraRoll:cinema.cameraBankAt(center),
   triangleCount:deck.createSmoothDeckData().triangles,
   laneHeightDifference:Math.abs(a.y-b.y),runs:[run(3,3),run(8,-4)]};
 });
 if(!corkscrew.trackCeiling||corkscrew.upsideDown>-.98||
    Math.abs(corkscrew.fullCameraRoll+Math.PI)>.02||
    Math.abs(corkscrew.wallUnchanged-70)>.1||
    corkscrew.triangleCount<26000||
    corkscrew.runs.some(x=>x.entries!==1||x.exits!==1||
      x.ceilingFrames<20||x.peak<359.5||x.falls!==0||x.finalS<3370))
  throw new Error("Live WebGL Corkscrew Spectacle regression: "+
    JSON.stringify(corkscrew));
 console.log("PASS: genuine 360° inverted road, continuous bank and two-speed magnetic flight:",
   JSON.stringify(corkscrew));
 // Stop the desktop HDR render loop before creating an Android SwiftShader tab.
 // Two simultaneously-rendering tabs starve each other on CI software GPUs.
 await page.close();
 // Exercise the Android-landscape menu with touch, not desktop click only.
 const mobile=await browser.newPage({
  viewport:{width:914,height:411},deviceScaleFactor:1.2,
  hasTouch:true,isMobile:true,
  userAgent:"Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
 });
 // Force the Samsung 4GB memory path, independently of the CI host.
 await mobile.addInitScript(()=>{
  Object.defineProperty(navigator,"deviceMemory",{configurable:true,
   get(){return 4;}});
 });
 await mobile.goto("http://127.0.0.1:8765/skyshift/?v=04991",
  {waitUntil:"domcontentloaded",timeout:50000});
 await mobile.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:75000});
 const mobileClarity=await mobile.evaluate(()=>window.__skyshiftClarityInfo?.());
 if(!mobileClarity?.lowMemory||mobileClarity.antiAliasing!=="SMAA"||
    mobileClarity.canvasDpr>1.35||!mobileClarity.smaaEnabled)
  throw new Error("Samsung memory path did not enable bounded SMAA: "+
   JSON.stringify(mobileClarity));
 console.log("PASS: emulated older Samsung renders through SMAA:",
  JSON.stringify(mobileClarity));
 // Direct touchscreen event avoids Playwright's pixel-stability
 // heuristic, which can time out while software WebGL is drawing.
 await mobile.locator("#start-btn").waitFor({state:"visible",timeout:20000});
 const tapRect=await mobile.locator("#start-btn").boundingBox();
 if(!tapRect)throw new Error("Android start button has no bounds");
 await mobile.touchscreen.tap(tapRect.x+tapRect.width/2,
  tapRect.y+tapRect.height/2);
 await mobile.waitForFunction(()=>{
  const menu=document.getElementById("menu");
  return menu?.classList.contains("hidden")&&
   !document.getElementById("hud")?.classList.contains("hidden");
 },null,{timeout:45000});
 const mobileHud=await mobile.evaluate(()=>{
  const hud=document.getElementById("hud").getBoundingClientRect();
  const ctl=document.getElementById("stick").getBoundingClientRect();
  const a=document.querySelector(".hud-left").getBoundingClientRect();
  const b=document.querySelector(".hud-center").getBoundingClientRect();
  const c=document.querySelector(".hud-right").getBoundingClientRect();
  const left=ctl.left,buttons=document.getElementById("fullscreen-btn");
  return {hudBottom:hud.bottom,controlTop:ctl.top,controlWidth:ctl.width,
   leftRight:a.right,centerLeft:b.left,centerRight:b.right,rightLeft:c.left,
   rightEdge:c.right,viewport:innerWidth,
   fullscreenVisible:!buttons.classList.contains("hidden")};
 });
 if(!(mobileHud.hudBottom<mobileHud.controlTop)&&
    mobileHud.hudBottom>mobileHud.controlTop+4)
  throw new Error("HUD overlaps steering controls: "+JSON.stringify(mobileHud));
 if(!(mobileHud.leftRight<mobileHud.centerLeft&&
      mobileHud.centerRight<mobileHud.rightLeft&&
      mobileHud.rightEdge<=mobileHud.viewport+2)&&
    mobileHud.viewport>=810)
  throw new Error("HUD modules overlap on landscape phone: "+JSON.stringify(mobileHud));
 if(!mobileHud.fullscreenVisible||mobileHud.controlWidth<140)
  throw new Error("HUD breaks fullscreen/steer: "+JSON.stringify(mobileHud));
 const phoneBars=await mobile.evaluate(()=>{
   const px=selector=>parseFloat(getComputedStyle(
    document.querySelector(selector)).height);
   return {
    shield:px("#hud .shield-track"),
    speed:px("#hud .speed-energy-track"),
    zone:px("#hud .zone-progress"),
    hasBank:!!document.getElementById("hud-bank-gauge")
   };
 });
 if(phoneBars.hasBank||Math.abs(phoneBars.shield-9)>.1||
    Math.abs(phoneBars.speed-8)>.1||Math.abs(phoneBars.zone-6)>.1)
   throw new Error("Old Samsung racing bars are not full-size: "+
    JSON.stringify(phoneBars));
 console.log("PASS: Samsung landscape shield/speed/zone bar size:",JSON.stringify(phoneBars));
 // One additional right-thumb input without reducing the existing left stick.
 const mobileGrip=await mobile.evaluate(()=>{
  const s=document.getElementById("stick").getBoundingClientRect();
  const b=document.getElementById("grip-btn").getBoundingClientRect();
  const hud=document.getElementById("hud").getBoundingClientRect();
  return {stickRight:s.right,buttonLeft:b.left,buttonRight:b.right,
   buttonTop:b.top,buttonWidth:b.width,buttonHeight:b.height,
   hudBottom:hud.bottom,viewport:innerWidth,visible:b.width>0&&b.height>0,
   pressed:document.getElementById("grip-btn").getAttribute("aria-pressed")};
 });
 if(!mobileGrip.visible||mobileGrip.buttonWidth<82||
    mobileGrip.buttonHeight<72||
    mobileGrip.stickRight+20>=mobileGrip.buttonLeft||
    mobileGrip.buttonRight>mobileGrip.viewport+2||
    mobileGrip.hudBottom>=mobileGrip.buttonTop||
    mobileGrip.pressed!=="false")
  throw new Error("Mobile two-thumb GRIP geometry is unusable: "+
   JSON.stringify(mobileGrip));
 console.log("PASS: Samsung landscape grip button is separate from steer and HUD:",
   JSON.stringify(mobileGrip));
 // Real Chrome multitouch: each thumb captures an independent pointer.
 // An actual analog stick move while holding GRIP must activate the
 // presentation button, then BOTH controls must release safely.
 const stickBox=await mobile.locator("#stick").boundingBox();
 const gripBox=await mobile.locator("#grip-btn").boundingBox();
 const touch=await mobile.context().newCDPSession(mobile);
 const steerPt={id:11,x:stickBox.x+stickBox.width*.5,
  y:stickBox.y+stickBox.height*.62};
 const gripPt={id:12,x:gripBox.x+gripBox.width*.5,
  y:gripBox.y+gripBox.height*.5};
 try{
  await touch.send("Input.dispatchTouchEvent",{
   type:"touchStart",touchPoints:[steerPt]});
  await touch.send("Input.dispatchTouchEvent",{
   type:"touchStart",touchPoints:[steerPt,gripPt]});
  await touch.send("Input.dispatchTouchEvent",{
   type:"touchMove",touchPoints:[{...steerPt,x:steerPt.x+39},gripPt]});
  await mobile.waitForFunction(()=>{
   const b=document.getElementById("grip-btn");
   const k=document.getElementById("stick-knob");
   return b?.classList.contains("active")&&
    b?.getAttribute("aria-pressed")==="true"&&
    k?.style.transform?.includes("translateX");
  },null,{timeout:20000});
  console.log("PASS: physical Android multitouch GRIP + STEER engaged together.");
 }finally{
  await touch.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await touch.detach();
 }
 await mobile.waitForFunction(()=>{
  const b=document.getElementById("grip-btn");
  return !b?.classList.contains("armed")&&
   b?.getAttribute("aria-pressed")==="false";
 },null,{timeout:15000});
 console.log("PASS: both thumb inputs release without latched GRIP.");
 console.log("PASS: responsive Samsung HUD keeps steering and fullscreen reachable:",
  JSON.stringify(mobileHud));
 console.log("PASS: Android-landscape touch START RUN enters actual active flight.");
 await mobile.close();
 // Explicitly block the JS module: the user must get a visible,
 // clickable retry state rather than a frozen start/fullscreen menu.
 const blocked=await browser.newPage({
  viewport:{width:914,height:411},deviceScaleFactor:1,
  hasTouch:true,isMobile:true
 });
 await blocked.route("**/game-v072.mjs*",route=>route.abort("failed"));
 await blocked.goto("http://127.0.0.1:8765/skyshift/?v=04991",
  {waitUntil:"domcontentloaded",timeout:50000});
 await blocked.waitForFunction(()=>window.__skyshiftBoot?.phase==="failed",
  null,{timeout:30000});
 const failureState=await blocked.evaluate(()=>({
  button:document.getElementById("start-btn").textContent,
  visible:!document.getElementById("boot-state").classList.contains("hidden"),
  message:document.getElementById("boot-state").textContent,
  fullscreenEnabled:!document.getElementById("menu-fullscreen-btn").disabled
 }));
 if(!failureState.button.includes("FÖRSÖK IGEN")||!failureState.visible||
   !failureState.fullscreenEnabled||!failureState.message.includes("STARTFEL"))
   throw new Error("Import failure left Android menu unresponsive");
 console.log("PASS: failed module import provides visible retry & independent fullscreen control.");
 await blocked.close();

}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
