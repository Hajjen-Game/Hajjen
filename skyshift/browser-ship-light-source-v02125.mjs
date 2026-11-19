// SKYSHIFT 0.21.2.5 diagnostic: same-frame ship white-light source isolation.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome missing");
const server=spawn("python3",["-m","http.server","8808","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1250);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1536,height:870}});
 page.on("pageerror",e=>console.error("PAGEERROR",e.message));
 await page.goto("http://127.0.0.1:8808/skyshift/?v=0.21.2.4"+
  "&shipSourceSmoke=1&trackRepairSmoke=1&waveSmoke=1",
  {waitUntil:"domcontentloaded",timeout:65000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",null,{timeout:75000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:35000});
 const stats=[];
 for(const point of [165,273]){
  await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),point);
  if(point===273)await page.evaluate(()=>window.__skyshiftWaveSmoke(2));
  await page.waitForTimeout(620);
  const {shipId,materials,captures}=await page.evaluate(()=>window.__skyshiftShipSourceSmoke());
  const rasters=Object.fromEntries(Object.entries(captures).map(([k,b64])=>
   [k,PNG.sync.read(Buffer.from(b64,"base64"))]));
  const baseline=rasters.baseline;
  const absent=rasters.noShip;
  let maskCount=0;
  const mask=[];
  const [W,H]=[baseline.width,baseline.height];
  if(W<1000||H<600)throw Error("Invalid frame dimensions "+W+"x"+H);
  for(let y=Math.floor(H*.39);y<Math.floor(H*.91);y+=2){
   for(let x=Math.floor(W*.28);x<Math.floor(W*.72);x+=2){
    const i=(y*W+x)*4;
    const diff=Math.abs(baseline.data[i]-absent.data[i])+
     Math.abs(baseline.data[i+1]-absent.data[i+1])+
     Math.abs(baseline.data[i+2]-absent.data[i+2]);
    if(diff>44){mask.push(i);maskCount++}
   }
  }
  if(maskCount<150)throw Error("Ship silhouette not measurable "+maskCount);
  const output={point,shipId,maskCount,materials,
   samples:[]};
  for(const [mode,bytes] of Object.entries(captures)){
   const raster=rasters[mode];let white=0,bright=0,luma=0;
   for(const i of mask){
    const r=raster.data[i],g=raster.data[i+1],b=raster.data[i+2];
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    if(mn>173&&mx>192)bright++;
    if(mn>215&&mx>226)white++;
    luma+=.2126*r+.7152*g+.0722*b;
   }
   const score={mode,bright,white,meanLuma:+(luma/mask.length).toFixed(2)};
   output.samples.push(score);
   writeFileSync("skyshift-v02125-ship-source-"+point+"-"+mode+".png",
    Buffer.from(bytes,"base64"));
  }
  stats.push(output);
  console.log("SHIP_SOURCE "+JSON.stringify({point,shipId,maskCount,
   samples:output.samples,materials}));
 }
 writeFileSync("skyshift-v02125-ship-source-measurements.json",JSON.stringify(stats,null,2));
 console.log("PASS 0.21.2.5 captured identical-frame white source contrasts");
}finally{await browser?.close();server.kill("SIGTERM")}
