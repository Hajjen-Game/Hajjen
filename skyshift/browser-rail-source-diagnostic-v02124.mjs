// Non-release diagnostic: isolate the source of the user-circled WHITE light.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome missing");
const server=spawn("python3",["-m","http.server","8804","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1200);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1536,height:691}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto("http://127.0.0.1:8804/skyshift/?v=0.21.2.3"+
  "&railSourceSmoke=1&trackRepairSmoke=1&artSmoke=1",{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",null,{timeout:75000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",null,{timeout:35000});
 const out=[];
 const measure=(bytes)=>{
  const p=PNG.sync.read(bytes);let nBright=0,nWhite=0,luma=0;
  // Rail-side and adjacent deck, matching user-circled left/right areas.
  const regions=[
   [130,560,350,645],
   [1020,1450,320,660]
  ];
  for(const [x0,x1,y0,y1] of regions){
   for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){
    const i=(y*p.width+x)*4,r=p.data[i],g=p.data[i+1],b=p.data[i+2];
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    if(max>195&&min>175)nBright++;
    if(max>230&&min>220)nWhite++;
    luma+=(r*.2126+g*.7152+b*.0722);
   }
  }
  return {nBright,nWhite,meanLuma:+(luma/((430*295+430*340)/4)).toFixed(2)};
 };
 for(const point of [165,273]){
  for(const mode of ["baseline","noInlay","noBody","bodyMatte","noBloom","noWorldKey","noRails"]){
   await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),point);
   const state=await page.evaluate(m=>window.__skyshiftRailSourceSmoke(m),mode);
   await page.waitForTimeout(550);
   const bytes=await page.screenshot();
   writeFileSync("skyshift-rail-source-"+point+"-"+mode+".png",bytes);
   out.push({point,mode,state,metric:measure(bytes)});
  }
 }
 writeFileSync("skyshift-rail-source-measurements.json",JSON.stringify(out,null,2));
 console.log("RAIL SOURCE METRICS "+JSON.stringify(out,null,2));
 await page.evaluate(()=>window.__skyshiftRailSourceSmoke("baseline"));
 if(errors.length)throw Error(errors.join(" | "));
 console.log("PASS: real WebGL source-isolation screenshots produced");
}finally{await browser?.close();server.kill("SIGTERM")}
