// SKYSHIFT 0.4.8.3 — actual browser/WebGL shader smoke.
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
 await page.goto("http://127.0.0.1:8765/skyshift/?smoke=0483",
  {waitUntil:"networkidle",timeout:60000});
 await page.locator("#start-btn").waitFor({state:"visible",timeout:25000});
 await page.locator("#start-btn").click();
 await sleep(2600);
 const result=await page.evaluate(()=>{
  const visible=el=>!!el&&!el.classList.contains("hidden");
  return {
   title:document.title,
   hudVisible:visible(document.querySelector("#hud")),
   errorVisible:visible(document.querySelector("#error")),
   errorMessage:document.querySelector("#error")?.textContent??"",
   speed:document.querySelector("#speed")?.textContent??"",
   zone:document.querySelector("#sector-name")?.textContent??"",
   canvasWidth:document.querySelector("#game")?.width??0
  };
 });
 await page.screenshot({path:"skyshift-v0483-browser-smoke.png"});
 console.log("Browser smoke result:",JSON.stringify(result));
 if(errors.length)console.error("Browser errors:\n"+errors.join("\n"));
 if(!result.title.includes("0.4.8.3")||
    !result.hudVisible||result.errorVisible||!result.canvasWidth||
    errors.length)throw new Error("0.4.8.3 browser/WebGL rendering smoke failed");
 console.log("PASS: 0.4.8.3 launched and rendered a live WebGL frame.");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
