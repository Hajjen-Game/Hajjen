// SKYSHIFT 0.5.1 — actual browser/WebGL shader smoke.
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
 await page.screenshot({path:"skyshift-v051-first-wave.png"});
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
 await page.screenshot({path:"skyshift-v051-final-wave.png"});
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
 if(!result.title.includes("0.5.1")||
    !result.hudVisible||result.errorVisible||!result.canvasWidth||
    result.zoneNumber!=="04"||
    errors.length)throw new Error("0.5.1 browser/WebGL rendering smoke failed");
 console.log("PASS: 0.5.1 real WebGL renders core-centred white crests, animated rail shaders and simulated Android touch.");
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
  throw new Error("0.5.1 browser camera spring is outside boost feel envelope: "+
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
 // Verify a full 10.4km course and real zone-coupled physics on Chrome's
 // JS engine, independent of software WebGL's unstable frame throughput.
 const marathon=await page.evaluate(async()=>{
   const [trial,wave,boost]=await Promise.all([
     import("./trial-v051.mjs"),import("./zone-wave-v051.mjs"),
     import("./flight/boost/boost-v050.mjs")]);
   const steps=Array.from({length:9},(_,i)=>trial.speedAt(0,i));
   const progress=trial.newFlightState();
   const base=progress.currentSpeed;
   trial.setZoneSpeedStage(progress,1);
   for(let i=0;i<180;i++)trial.stepFlight(progress,1/120,{steer:0});
   return {length:trial.TRIAL.length,zones:wave.ZONE_PALETTES.length,
    triggers:wave.ZONE_WAVE.triggers,speeds:steps,
    banks:[100,260,1700,5100,9000].map(x=>trial.bankAt(x)),
    geometryEnds:[trial.COURSE_SEGMENTS[0].start,
      trial.COURSE_SEGMENTS.at(-1).end],
    acceleration:progress.currentSpeed-base,
    pads:boost.BOOST_PADS.length,
    maxCurvature:Math.max(...trial.COURSE_SEGMENTS.map(s=>Math.abs(s.curvature||0))),
    sections:trial.COURSE_SEGMENTS.length,
    sLink:trial.COURSE_SEGMENTS.some(s=>s.id==="s-link-right")&&
      trial.COURSE_SEGMENTS.some(s=>s.id==="s-link-left")};
 });
 if(marathon.length!==10400||marathon.zones!==9||
    marathon.triggers.join(",")!=="18,36,54,72,90,108,126,144"||
    marathon.geometryEnds.join(",")!=="0,10400"||
    marathon.sections!==27||marathon.maxCurvature<.008||
    !marathon.sLink||
    marathon.pads!==5||!marathon.banks.every(x=>x===0)||
    marathon.speeds[8]<100||marathon.acceleration<3)
   throw new Error("Full course / real zone acceleration failed in Chrome: "+
    JSON.stringify(marathon));
 console.log("PASS: complete 10.4km route, nine palette zones and real physical speed steps:",
  JSON.stringify(marathon));
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
 await blocked.route("**/game-v051.mjs*",route=>route.abort("failed"));
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
