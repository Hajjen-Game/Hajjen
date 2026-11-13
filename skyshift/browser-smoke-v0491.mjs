// SKYSHIFT 0.4.9.1 — actual browser/WebGL shader smoke.
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
 await page.locator("#start-btn").click();
 // SwiftShader is not real-time; explicitly advance fixed-time world fronts
 // while retaining the real Three.js renderer / rail+road shaders.
 await sleep(1100);
 const first=await page.evaluate(()=>window.__skyshiftWaveSmoke?.(1));
 if(!first||first.zone!==2||first.flightSeconds!==10.85||
    !first.railSynchronized||first.featherMeters!==24||
    first.engineResonance<=0||first.frontS<=first.playerS)
  throw new Error("First spectral wave did not overtake ship");
 await sleep(700);
 await page.screenshot({path:"skyshift-v0491-first-wave.png"});
 const last=await page.evaluate(()=>window.__skyshiftWaveSmoke?.(3));
 if(!last||last.zone!==4||last.launches.join(",")!=="10,20,27"||
    last.palette!=="jade"||last.engineResonance<=0)
  throw new Error("Final JADE wave did not trigger at 27s");
 await sleep(850);
 await page.screenshot({path:"skyshift-v0491-final-wave.png"});
 console.log("Spectral first/last front:",JSON.stringify({first,last}));
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
 if(!result.title.includes("0.4.9.1")||
    !result.hudVisible||result.errorVisible||!result.canvasWidth||
    result.zoneNumber!=="04"||
    errors.length)throw new Error("0.4.9.1 browser/WebGL rendering smoke failed");
 console.log("PASS: 0.4.9.1 real WebGL renders first and final spectral fronts plus synchronized rail shaders.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
