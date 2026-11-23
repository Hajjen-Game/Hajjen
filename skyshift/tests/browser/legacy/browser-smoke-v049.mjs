// SKYSHIFT 0.4.9 — actual browser/WebGL shader smoke.
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
 // Software Chrome may simulate only a fraction of real elapsed time while
 // composing HDR frames. Use the explicit test-only hook to advance fixed
 // simulation time through 10 s, then render a real zone-02 shader frame.
 await sleep(1400);
 const wave=await page.evaluate(()=>window.__skyshiftWaveSmoke?.());
 console.log("Injected fixed-time wave integration:",JSON.stringify(wave));
 if(!wave||wave.zone!==2||wave.flightSeconds!==12.5||
    !(wave.frontS>wave.playerS))
  throw new Error("Browser zone wave did not overtake ship from behind");
 await sleep(1600);
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
 await page.screenshot({path:"skyshift-v049-browser-smoke.png"});
 console.log("Browser smoke result:",JSON.stringify(result));
 if(errors.length)console.error("Browser errors:\n"+errors.join("\n"));
 if(!result.title.includes("0.4.9")||
    !result.hudVisible||result.errorVisible||!result.canvasWidth||
    result.zoneNumber!=="02"||
    errors.length)throw new Error("0.4.9 browser/WebGL rendering smoke failed");
 console.log("PASS: 0.4.9 Chrome/WebGL renders a palette wave triggered at fixed-flight time 10 s.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
