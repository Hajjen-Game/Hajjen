// SKYSHIFT 0.21.2.4 – strict optical A/B from the SAME GPU camera frame.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(existsSync).at(0);
if(!chrome)throw Error("Chromium missing");
const server=spawn("python3",["-m","http.server","8807","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1536,height:691}});
 page.on("pageerror",e=>{throw e});
 await page.goto("http://127.0.0.1:8807/skyshift/?v=0.21.2.5"+
  "&railFrameProof=1&trackRepairSmoke=1&waveSmoke=1&shipWhite=classic",
  {waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:35000});
 const stats=[];
 for(const s of [165,273]){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(700);
  const pair=await page.evaluate(()=>window.__skyshiftRailFrameProof());
  if(!pair.original||!pair.contained)throw Error("Missing exact frame canvas");
  const raster=(b64)=>PNG.sync.read(Buffer.from(b64,"base64"));
  const a=raster(pair.original),b=raster(pair.contained);
  if(a.width!==b.width||a.height!==b.height||a.width<500)
   throw Error("GPU frame dimensions wrong");
  const white=(p)=>{
   const boxes=[[130,560,350,645],[1020,1450,320,660]];
   let nBright=0,nWhite=0; 
   for(const [x0,x1,y0,y1] of boxes)
    for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){
     const k=(y*p.width+x)*4;
     const r=p.data[k],g=p.data[k+1],b=p.data[k+2];
     if(Math.min(r,g,b)>175&&Math.max(r,g,b)>195)nBright++;
     if(Math.min(r,g,b)>220&&Math.max(r,g,b)>230)nWhite++;
    }
   return {nBright,nWhite};
  };
  writeFileSync("skyshift-v02124-exact-original-"+s+".png",Buffer.from(pair.original,"base64"));
  writeFileSync("skyshift-v02124-exact-contained-"+s+".png",Buffer.from(pair.contained,"base64"));
  const original=white(a),contained=white(b);
  stats.push({s,original,contained,
   reductionPct:Math.round(100*(1-contained.nBright/Math.max(1,original.nBright)))});
  if(s===165){
   if(original.nBright<1000)
    throw Error("Baseline white glare not reproduced "+JSON.stringify(original));
   if(contained.nBright>original.nBright*.40||contained.nWhite>original.nWhite*.40)
    throw Error("Same frame white glare not fixed "+JSON.stringify(stats));
  }
 }
 writeFileSync("skyshift-v02124-exact-frame-proof.json",JSON.stringify(stats,null,2));
 console.log("PASS same exact-frame rail white glare removal "+JSON.stringify(stats));
}finally{await browser?.close();server.kill("SIGTERM")}
