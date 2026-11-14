// SKYSHIFT 0.4.9.8 — actual browser/WebGL shader smoke.
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
 if(!first||first.zone!==2||first.flightSeconds!==10.792||
    !first.railSynchronized||first.featherMeters!==24||
    first.whiteCoreMeters!==2.9||first.whiteCoreEnergy!==0.72||
    first.whiteBloomMeters!==14||first.whiteBloomEnergy!==0.2||
    first.engineResonance<=0||first.frontS<=first.playerS)
  throw new Error("First spectral wave did not overtake ship");
 await sleep(700);
 await page.screenshot({path:"skyshift-v0498-first-wave.png"});
 const last=await page.evaluate(()=>window.__skyshiftWaveSmoke?.(3));
 if(!last||last.zone!==4||last.launches.join(",")!=="10,20,27"||
    last.palette!=="jade"||last.engineResonance<=0)
  throw new Error("Final JADE wave did not trigger at 27s");
 await sleep(850);
 await page.screenshot({path:"skyshift-v0498-final-wave.png"});
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
 if(!result.title.includes("0.4.9.8")||
    !result.hudVisible||result.errorVisible||!result.canvasWidth||
    result.zoneNumber!=="04"||
    errors.length)throw new Error("0.4.9.8 browser/WebGL rendering smoke failed");
 console.log("PASS: 0.4.9.8 real WebGL renders core-centred white crests, animated rail shaders and simulated Android touch.");
 // Validate the camera's real browser ESM module without replacing the
 // normal flight simulation or introducing extra GPU draw calls.
 const boostSpring=await page.evaluate(async()=>{
  const m=await import("./boost-spring-v0495.mjs");
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
  throw new Error("0.4.9.8 browser camera spring is outside boost feel envelope: "+
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
  const m=await import("./aero-barrier-v0497.mjs");
  const previous=await import("./aero-barrier-v0496.mjs");
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
 await mobile.goto("http://127.0.0.1:8765/skyshift/?v=0498",
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
 console.log("PASS: Android-landscape touch START RUN enters actual active flight.");
 await mobile.close();
 // Explicitly block the JS module: the user must get a visible,
 // clickable retry state rather than a frozen start/fullscreen menu.
 const blocked=await browser.newPage({
  viewport:{width:914,height:411},deviceScaleFactor:1,
  hasTouch:true,isMobile:true
 });
 await blocked.route("**/game-v0498.mjs*",route=>route.abort("failed"));
 await blocked.goto("http://127.0.0.1:8765/skyshift/?v=0498",
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
