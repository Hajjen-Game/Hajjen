// SKYSHIFT 0.26.4.1 — REAL Chromium/WebGL same-frame source/metal A/B.
// Test high and 4GB, gold/violet, straight/turn. Preserve all original
// physical render, white-sun seal, straight-only cyan, orange floor and ship.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.26.4.1 requires real Chromium/WebGL");
const server=spawn("python3",["-m","http.server","8868","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],report=[];
const luminance=(data,i)=>.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
function analyse(frames,label,mobile){
 const a=PNG.sync.read(Buffer.from(frames.classic,"base64"));
 const b=PNG.sync.read(Buffer.from(frames.balanced,"base64"));
 if(b.width!==a.width||b.height!==a.height)
  throw Error("0.26.4.1 changed racing camera/viewport");
 for(const mode of ["classic","balanced"])
  writeFileSync("skyshift-v02641-"+label+"-"+mode+".png",
   Buffer.from(frames[mode],"base64"));
 let total=0,changed=0,upper=0,upperDelta=0,
  side=0,sideDelta=0,road=0,roadOld=0,roadNew=0,
  blackOld=0,blackNew=0,whiteOld=0,whiteNew=0,
  cyanOld=0,cyanNew=0,warmOld=0,warmNew=0;
 const W=a.width,H=a.height;
 for(let y=Math.floor(H*.10);y<Math.floor(H*.93);y+=3)
 for(let x=Math.floor(W*.025);x<Math.floor(W*.975);x+=3){
  const i=(y*W+x)*4;
  const d=Math.abs(a.data[i]-b.data[i])+
   Math.abs(a.data[i+1]-b.data[i+1])+
   Math.abs(a.data[i+2]-b.data[i+2]);
  const l0=luminance(a.data,i),l1=luminance(b.data,i);
  const xx=x/W,yy=y/H;
  total++;if(d>10)changed++;
  if(yy<.50){upper++;upperDelta+=l1-l0;}
  if(xx<.32||xx>.68){side++;sideDelta+=l1-l0;}
  if(yy>.58&&xx>.28&&xx<.72){road++;roadOld+=l0;roadNew+=l1;}
  if(l0<9)blackOld++;
  if(l1<9)blackNew++;
  if(Math.min(a.data[i],a.data[i+1],a.data[i+2])>240)whiteOld++;
  if(Math.min(b.data[i],b.data[i+1],b.data[i+2])>240)whiteNew++;
  const cold=(p)=>p[i+2]>p[i]*1.24&&p[i+1]>p[i]*1.13&&p[i+2]>60;
  const warm=(p)=>p[i]>p[i+1]*1.17&&p[i]>p[i+2]*1.45&&p[i]>58;
  if(cold(a.data))cyanOld++;
  if(cold(b.data))cyanNew++;
  if(warm(a.data))warmOld++;
  if(warm(b.data))warmNew++;
 }
 const r={label,mobile,trackS:frames.trackS,total,changed,
  changedPct:+(100*changed/total).toFixed(2),
  upperDelta:+(upperDelta/upper).toFixed(2),
  sideDelta:+(sideDelta/side).toFixed(2),
  roadOld:+(roadOld/road).toFixed(2),roadNew:+(roadNew/road).toFixed(2),
  blackOld,blackNew,whiteOld,whiteNew,cyanOld,cyanNew,warmOld,warmNew};
 report.push(r);
 writeFileSync("skyshift-v02641-proof.json",JSON.stringify(report,null,2));
 console.log("UNIFIED_METAL_02641 "+JSON.stringify(r));
 if(changed<(mobile?75:150))
  throw Error("0.26.4.1 new titanium/source response invisible "+JSON.stringify(r));
 if(r.roadNew>r.roadOld+5.0)
  throw Error("0.26.4.1 increased road global light "+JSON.stringify(r));
 if(whiteNew>whiteOld*1.10+25)
  throw Error("0.26.4.1 recreated neutral white solar spill "+JSON.stringify(r));
 if(blackNew<blackOld*.7)
  throw Error("0.26.4.1 lifted dark seams and lost contrast "+JSON.stringify(r));
}
try{
 await sleep(750);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function start(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(m.text()))
    errors.push(m.text().slice(0,2600));
  });
  await page.addInitScript(m=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>m}),memory);
  await page.goto("http://127.0.0.1:8868/skyshift/?v=0.26.4.1"+
   "&artSmoke=1&unifiedLightSmoke=1&unifiedLightFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function take(page,s,zone,label,memory){
  await page.evaluate(x=>window.__skyshiftTrackRepairTeleport(x),s);
  if(zone)await page.evaluate(x=>window.__skyshiftWaveSmoke(x),zone);
  await page.waitForTimeout(700);
  const q=await page.evaluate(()=>window.__skyshiftUnifiedLightProbe());
  if(!q.requested||!q.unifiedMetal02641Active||
   q.unifiedMetal02641Version!=="0.26.4.1"||
   q.unifiedMetal02641Status!=="active"||
   q.unifiedMetal02641PhysicalCoats!==(memory===4?1:2)||
   q.unifiedMetal02641Substrates!==(memory===4?3:4)||
   q.unifiedMetal02641NewLights!==0||
   q.unifiedMetal02641NewPasses!==0||
   q.unifiedMetal02641NewMeshes!==0||
   q.unifiedMetal02641NewTextures!==0||
   q.unifiedMetal02641LowMemory!==(memory===4)||
   !q.unifiedMetal02641WhiteSolarSealed||
   !q.unifiedMetal02641StraightOnlyCyanUnchanged||
   !q.unifiedMetal02641ConnectedAmberUnchanged||
   !q.unifiedMetal02641NativeGGX||
   !q.unifiedMetal02641NativeWaveUnchanged||
   !q.unifiedMetal02641PhysicsUnchanged||
   !q.premiumMetal||!q.localGGX||!q.finalHDR||!q.straightOnly||
   q.amberBands!==20||!q.originalRoad||
   q.roadSolarSeal!==1||q.premiumRoadSeal!==1||
   !q.nativeWave||!q.originalShip||
   Math.abs(q.originalExposure-.96)>.06)
   throw Error("0.26.4.1 physical titanium/source invariants failed "+JSON.stringify(q));
  const frames=await page.evaluate(()=>window.__skyshiftUnifiedLightFrameProof());
  analyse(frames,label,memory===4);
 }
 const high=await start(8);
 await take(high,76,2,"high-gold-straight",8);
 await take(high,165,2,"high-gold-arch",8);
 await take(high,195,2,"high-gold-turn",8);
 await take(high,250,1,"high-violet",8);
 await high.close();
 const mobile=await start(4);
 await take(mobile,165,2,"4gb-gold-arch",4);
 await mobile.close();
 const classic=await start(8,"unifiedLight=classic");
 const q=await classic.evaluate(()=>window.__skyshiftUnifiedLightProbe());
 if(q.requested||q.unifiedMetal02641Active||
  !q.finalHDR||!q.premiumMetal||!q.straightOnly||
  q.amberBands!==20||q.roadSolarSeal!==1)
  throw Error("0.26.4.1 classic did not restore exact 0.26.4 "+JSON.stringify(q));
 await classic.close();
 if(errors.length)throw Error("0.26.4.1 real WebGL shader error: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.26.4.1 — real 8GB/4GB native GGX titanium and local emitter response");
}finally{await browser?.close();server.kill("SIGTERM");}
