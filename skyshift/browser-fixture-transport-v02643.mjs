// SKYSHIFT 0.26.4.3 — real Chromium/WebGL region-of-interest proof.
// Mirrors the user's marked PC screenshot: upper roof cyan=GOOD CONTROL,
// wall cyan + amber sconces, connected amber floor and short lower rail=RED.
// Same frame, same camera, Gold and Violet, high and 4GB. NO generated images.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const path=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!path)throw Error("0.26.4.3 requires genuine Chromium/WebGL");
const srv=spawn("python3",["-m","http.server","8870","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const regions={
 roofReference:[[.45,.12,.55,.32]],
 cyanWall:[[.10,.09,.33,.29],[.67,.09,.90,.29]],
 amberWall:[[.10,.22,.34,.42],[.66,.22,.90,.42]],
 orangeFoot:[[.03,.42,.30,.68],[.70,.42,.97,.68]],
 lowerRail:[[.08,.57,.32,.86],[.68,.57,.92,.86]],
 darkRoad:[[.40,.62,.60,.92]]
};
let browser;const reports=[],errors=[];
const luma=(p,i)=>p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722;
function region(a,b,rectangles){
 const w=a.width,h=a.height;
 let n=0,diff=0,strong=0,old=0,current=0,coldOld=0,coldNew=0,
  warmOld=0,warmNew=0;
 for(const [x0,y0,x1,y1] of rectangles)
 for(let y=Math.round(y0*h);y<Math.round(y1*h);y+=3)
 for(let x=Math.round(x0*w);x<Math.round(x1*w);x+=3){
  const i=(y*w+x)*4;
  const d=Math.abs(a.data[i]-b.data[i])+
   Math.abs(a.data[i+1]-b.data[i+1])+
   Math.abs(a.data[i+2]-b.data[i+2]);
  n++;if(d>9)diff++;if(d>24)strong++;
  old+=luma(a.data,i);current+=luma(b.data,i);
  if(a.data[i+2]>a.data[i]*1.20&&a.data[i+1]>a.data[i]*1.14&&
   a.data[i+2]>60)coldOld++;
  if(b.data[i+2]>b.data[i]*1.20&&b.data[i+1]>b.data[i]*1.14&&
   b.data[i+2]>60)coldNew++;
  if(a.data[i]>a.data[i+1]*1.17&&a.data[i]>a.data[i+2]*1.40&&
   a.data[i]>60)warmOld++;
  if(b.data[i]>b.data[i+1]*1.17&&b.data[i]>b.data[i+2]*1.40&&
   b.data[i]>60)warmNew++;
 }
 return {pixels:n,diffPct:+(diff/n*100).toFixed(2),
  strongPct:+(strong/n*100).toFixed(2),
  brightnessBefore:+(old/n).toFixed(2),
  brightnessAfter:+(current/n).toFixed(2),
  coldOld,coldNew,warmOld,warmNew};
}
function inspect(frames,label,mobile){
 const a=PNG.sync.read(Buffer.from(frames.classic,"base64"));
 const b=PNG.sync.read(Buffer.from(frames.transport,"base64"));
 if(a.width!==b.width||a.height!==b.height)
  throw Error("0.26.4.3 altered output resolution");
 for(const mode of ["classic","transport"])
  writeFileSync("skyshift-v02643-"+label+"-"+mode+".png",
   Buffer.from(frames[mode],"base64"));
 const area=Object.fromEntries(Object.entries(regions).map(([k,v])=>
  [k,region(a,b,v)]));
 let black0=0,black1=0,white0=0,white1=0,n=0;
 for(let y=70;y<a.height-35;y+=4)
 for(let x=35;x<a.width-35;x+=4){
  const i=(y*a.width+x)*4;n++;
  if(luma(a.data,i)<10)black0++;if(luma(b.data,i)<10)black1++;
  if(Math.min(a.data[i],a.data[i+1],a.data[i+2])>240)white0++;
  if(Math.min(b.data[i],b.data[i+1],b.data[i+2])>240)white1++;
 }
 const report={label,mobile,trackS:frames.s,areas:area,
  full:{black0,black1,white0,white1,pixels:n}};
 reports.push(report);
 writeFileSync("skyshift-v02643-proof.json",JSON.stringify(reports,null,2));
 console.log("FIXTURE_TRANSPORT_02643 "+JSON.stringify(report));
 if(area.darkRoad.brightnessAfter>area.darkRoad.brightnessBefore+5.0)
  throw Error("road black base washed out");
 if(white1>white0*1.12+35)
  throw Error("white external solar spill reintroduced");
 if(black1<black0*.72)
  throw Error("dark graphite seams lost");
 if(!mobile&&label==="high-gold-arch"){
  const changes=["cyanWall","amberWall","orangeFoot","lowerRail"]
   .map(k=>area[k].diffPct);
  const affected=changes.filter(v=>v>.45).length;
  if(affected<2)
   throw Error("insufficient difference in user-marked RED fixture regions "+JSON.stringify(changes));
 }
}
try{
 await sleep(750);
 browser=await chromium.launch({headless:true,executablePath:path,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(m.text()))
    errors.push(m.text().slice(0,2400));
  });
  await page.addInitScript(value=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>value}),memory);
  await page.goto("http://127.0.0.1:8870/skyshift/?v=0.26.4.3"+
   "&artSmoke=1&fixtureTransportSmoke=1&fixtureTransportFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function measure(page,s,zone,name,memory){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  if(zone)await page.evaluate(z=>window.__skyshiftWaveSmoke(z),zone);
  await page.waitForTimeout(640);
  const q=await page.evaluate(()=>window.__skyshiftFixtureTransportProbe());
  if(!q.requested||!q.fixtureTransport02643Active||
   q.fixtureTransport02643Version!=="0.26.4.3"||
   q.fixtureTransport02643PhysicalCount!==(memory===4?1:2)||
   q.fixtureTransport02643SubstrateCount!==(memory===4?3:4)||
   q.fixtureTransport02643RoadCount!==1||
   q.fixtureTransport02643ConnectedAmberCount!==1||
   !q.fixtureTransport02643CeilingCyanProtected||
   !q.fixtureTransport02643StraightCyanProtected||
   !q.fixtureTransport02643NoNewLights||
   !q.fixtureTransport02643NoNewPasses||
   !q.fixtureTransport02643WhiteSolarSealed||
   !q.fixtureTransport02643PhysicsUnchanged||
   !q.fixtureTransport02643NativeWaveUnchanged||
   !q.premiumMetal||!q.previousReflection||
   !q.straightOnly||q.amberBands!==20||!q.roadGGX||
   q.whiteSeal!==1||q.premiumRoadSeal!==1||
   !q.finalHDR||q.originalRoadType!=="MeshStandardMaterial"||
   !q.originalShip||!q.nativeWave||
   Math.abs(q.originalExposure-.96)>.06)
   throw Error("0.26.4.3 original source/solar/GRIP invariants failed "+
    JSON.stringify(q));
  inspect(await page.evaluate(()=>window.__skyshiftFixtureTransportFrameProof()),
   name,memory===4);
 }
 const high=await open(8);
 await measure(high,76,2,"high-gold-straight",8);
 await measure(high,165,2,"high-gold-arch",8);
 await measure(high,195,2,"high-gold-turn",8);
 await measure(high,250,1,"high-violet",8);
 await high.close();
 const low=await open(4);
 await measure(low,165,2,"4gb-gold-arch",4);
 await low.close();
 const classic=await open(8,"fixtureTransport=classic");
 const q=await classic.evaluate(()=>window.__skyshiftFixtureTransportProbe());
 if(q.requested||q.fixtureTransport02643Active||
  !q.premiumMetal||!q.previousReflection||
  !q.straightOnly||q.amberBands!==20||q.whiteSeal!==1)
  throw Error("0.26.4.3 classic did not restore previous 0.26.4.2");
 await classic.close();
 if(errors.length)throw Error("real WebGL shader errors "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.26.4.3 native 8GB/4GB red-region/green-control fixture transport");
}finally{await browser?.close();srv.kill("SIGTERM");}
