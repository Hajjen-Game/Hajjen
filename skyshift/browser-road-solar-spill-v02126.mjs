// SKYSHIFT 0.21.2.6 — Road PBR daylight removal, same-frame WebGL proof.
// Three captures per sample: old exterior-lit road, sealed road, absent road.
// The absent exposure provides an actual pixel mask for the physical deck,
// avoiding false positives from ship, rails, architecture or HUD.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome missing");
const server=spawn("python3",["-m","http.server","8811","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const records=[],errors=[];
let browser;
const lum=(a,i)=>.2126*a[i]+.7152*a[i+1]+.0722*a[i+2];
function measure(pair,label){
 const rasters=Object.fromEntries(["classic","contained","absent"].map(k=>
  [k,PNG.sync.read(Buffer.from(pair[k],"base64"))]));
 const a=rasters.classic,b=rasters.contained,no=rasters.absent;
 const W=a.width,H=a.height;
 if(b.width!==W||no.width!==W||b.height!==H||no.height!==H)
  throw Error("Mismatched same-frame resolutions");
 const stats={label,s:pair.s,width:W,height:H,deckSamples:0,
  alteredDeckSamples:0,alteredOutsideSamples:0,neutralWhiteGainsOutside:0,
  classicMean:0,containedMean:0,whiteClassic:0,whiteContained:0};
 let classicLight=0,containedLight=0;
 // Exclude thin top UI and bottom buttons, sample in every lateral sector.
 for(let y=Math.floor(H*.24);y<Math.floor(H*.96);y+=3)
  for(let x=Math.floor(W*.04);x<Math.floor(W*.96);x+=3){
   const i=(y*W+x)*4,ad=a.data,bd=b.data,nd=no.data;
   const absence=Math.abs(ad[i]-nd[i])+Math.abs(ad[i+1]-nd[i+1])+
    Math.abs(ad[i+2]-nd[i+2]);
   const change=Math.abs(ad[i]-bd[i])+Math.abs(ad[i+1]-bd[i+1])+
    Math.abs(ad[i+2]-bd[i+2]);
   if(absence>52){
    stats.deckSamples++;
    classicLight+=lum(ad,i);containedLight+=lum(bd,i);
    if(change>9)stats.alteredDeckSamples++;
    if(Math.min(ad[i],ad[i+1],ad[i+2])>178)stats.whiteClassic++;
    if(Math.min(bd[i],bd[i+1],bd[i+2])>178)stats.whiteContained++;
   }else if(change>24){
    stats.alteredOutsideSamples++;
    // Reducing road HDR illumination also reduces bloom beyond the road
    // footprint. Count NEW neutral-white glare, not all changed pixels.
    if(Math.min(bd[i],bd[i+1],bd[i+2])>182&&
       Math.min(ad[i],ad[i+1],ad[i+2])<158)
     stats.neutralWhiteGainsOutside++;
   }
  }
 stats.classicMean=+(classicLight/Math.max(1,stats.deckSamples)).toFixed(2);
 stats.containedMean=+(containedLight/Math.max(1,stats.deckSamples)).toFixed(2);
 stats.meanReduction=+(stats.classicMean-stats.containedMean).toFixed(2);
 // A source-specific fix must visibly modify actual road pixels without
 // brightening the neutral washed-out parts. No geometry/physics delta.
 if(stats.deckSamples<400||stats.alteredDeckSamples<150)
  throw Error("Solar fix did not affect the real road "+JSON.stringify(stats));
 if(stats.meanReduction<.35)
  throw Error("Solar fix did not reduce integrated road illumination "+JSON.stringify(stats));
 if(stats.whiteContained>stats.whiteClassic*1.10+5)
  throw Error("New near-white road pixels "+JSON.stringify(stats));
 // The previous outside-pixel count also counted legitimate changes to
 // bloom from the dimmer sealed road. Reject any new white hotspot instead.
 if(stats.neutralWhiteGainsOutside>Math.max(36,stats.deckSamples*.015))
  throw Error("New neutral-white off-road solar hotspot "+JSON.stringify(stats));
 for(const k of ["classic","contained","absent"])
  writeFileSync("skyshift-v02126-"+label+"-"+k+".png",Buffer.from(pair[k],"base64"));
 return stats;
}
try{
 await sleep(1200);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(memory){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,650));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>v,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8811/skyshift/?v=0.21.2.6"+
   "&artSmoke=1&roadSolarSmoke=1&roadSolarFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1",
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  const proof=await page.evaluate(()=>window.__skyshiftRoadSolarProbe());
  if(!proof.enabled||proof.seal!==1||
     proof.roadMaterial!=="MeshStandardMaterial"||
     proof.whiteCrestUnchanged!==true||proof.paletteUnchanged!==true||
     proof.exteriorKeyIntensity<=0)
   throw Error("Solar seal did not initialize "+JSON.stringify(proof));
  return page;
 }
 async function scene(page,s,stage,label){
  await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),s);
  if(stage>0)await page.evaluate(i=>window.__skyshiftWaveSmoke(i),stage);
  await page.waitForTimeout(860);
  const pair=await page.evaluate(()=>window.__skyshiftRoadSolarFrameProof());
  if(pair.sealBefore!==0||pair.sealAfter!==1)
   throw Error("A/B failed to change road shader uniform");
  const result=measure(pair,label);
  records.push(result);console.log("ROAD_SOLAR "+JSON.stringify(result));
 }
 const main=await load(8);
 await scene(main,165,0,"cyan-165");
 await scene(main,165,2,"solar-gold-165");
 await scene(main,273,3,"jade-273");
 await main.close();
 const mobile=await load(4);
 const art=await mobile.evaluate(()=>window.__skyshiftArtProbe());
 if(art?.drawBatches!==3)
  throw Error("4GB draw batch regression "+JSON.stringify(art));
 await scene(mobile,165,2,"mobile-gold-165");
 await mobile.close();
 if(errors.length)throw Error("WebGL compilation "+errors.join(" | "));
 writeFileSync("skyshift-v02126-road-solar-proof.json",JSON.stringify(records,null,2));
 console.log("PASS SKYSHIFT 0.21.2.6: road-only solar spill reduced in real WebGL");
}finally{await browser?.close();server.kill("SIGTERM")}
