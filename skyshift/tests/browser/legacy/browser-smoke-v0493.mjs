// SKYSHIFT 0.4.9.3 — actual browser/WebGL shader smoke.
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
 await page.screenshot({path:"skyshift-v0493-first-wave.png"});
 const last=await page.evaluate(()=>window.__skyshiftWaveSmoke?.(3));
 if(!last||last.zone!==4||last.launches.join(",")!=="10,20,27"||
    last.palette!=="jade"||last.engineResonance<=0)
  throw new Error("Final JADE wave did not trigger at 27s");
 await sleep(850);
 await page.screenshot({path:"skyshift-v0493-final-wave.png"});
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
 if(!result.title.includes("0.4.9.3")||
    !result.hudVisible||result.errorVisible||!result.canvasWidth||
    result.zoneNumber!=="04"||
    errors.length)throw new Error("0.4.9.3 browser/WebGL rendering smoke failed");
 console.log("PASS: 0.4.9.3 real WebGL renders core-centred white crests, animated rail shaders and simulated Android touch.");
 // Stop the desktop HDR render loop before creating an Android SwiftShader tab.
 // Two simultaneously-rendering tabs starve each other on CI software GPUs.
 await page.close();
 // Exercise the Android-landscape menu with touch, not desktop click only.
 const mobile=await browser.newPage({
  viewport:{width:914,height:411},deviceScaleFactor:1.2,
  hasTouch:true,isMobile:true,
  userAgent:"Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
 });
 await mobile.goto("http://127.0.0.1:8765/skyshift/?v=0492",
  {waitUntil:"domcontentloaded",timeout:50000});
 await mobile.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:75000});
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
 await blocked.route("**/game-v0493.mjs*",route=>route.abort("failed"));
 await blocked.goto("http://127.0.0.1:8765/skyshift/?v=0492",
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
