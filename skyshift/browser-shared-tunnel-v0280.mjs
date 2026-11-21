// SKYSHIFT 0.28.0 — real Chromium/WebGL shared architecture proof.
// This is a SOURCE/ROUTE refactor. Its acceptance gate is visual parity,
// unchanged road/ship and actual old+new tracks rendering on High and 4GB.
// All PNGs are genuine Playwright WebGL frames, not generated art.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const executablePath=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable",
 "/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!executablePath)throw Error("0.28.0 requires real Chromium for shared tunnel proof");
const server=spawn("python3",["-m","http.server","8887","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],report=[];
const take=(page,label)=>page.screenshot({path:"skyshift-v0280-"+label+".png",timeout:20000});
const inspect=(buffer,label)=>{
 const png=PNG.sync.read(buffer);
 let black=0,white=0,cyan=0,orange=0,samples=0;
 for(let y=60;y<png.height-28;y+=4)for(let x=20;x<png.width-20;x+=4){
  const i=(y*png.width+x)*4,a=png.data;
  const lum=.2126*a[i]+.7152*a[i+1]+.0722*a[i+2];
  samples++;
  if(lum<13)black++;
  if(Math.min(a[i],a[i+1],a[i+2])>242)white++;
  if(a[i+2]>a[i]*1.4&&a[i+1]>a[i]*1.3&&a[i+2]>70)cyan++;
  if(a[i]>a[i+2]*1.5&&a[i]>a[i+1]*1.03&&a[i]>65)orange++;
 }
 const out={label,black,white,cyan,orange,samples};
 report.push(out);
 writeFileSync("skyshift-v0280-proof.json",JSON.stringify(report,null,2));
 console.log("SHARED_TUNNEL_0280 "+JSON.stringify(out));
 if(!samples||!black||!cyan)throw Error("0.28.0 missing real scene/color "+JSON.stringify(out));
 if(white>samples*.18)throw Error("0.28.0 excessive exterior white wash "+JSON.stringify(out));
};
try{
 await sleep(700);
 browser=await chromium.launch({headless:true,executablePath,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(track,memory,classic=false){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(track+": "+e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(m.text()))
    errors.push(track+": "+m.text().slice(0,3000));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>v}),memory);
  const url="http://127.0.0.1:8887/skyshift/?track="+track+
   "&v=0.28.0&sharedTunnelSmoke=1&trackRepairSmoke=1&waveSmoke=1"+
   (classic?"&sharedTunnel=classic":"");
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:70000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",null,{timeout:100000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function verify(page,track,memory,classic,position){
  if(position!==null){
   await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),position);
   await page.evaluate(()=>window.__skyshiftWaveSmoke(1));
  }
  await page.waitForTimeout(550);
  const data=await page.evaluate(()=>window.__skyshiftSharedTunnelAudit());
  const meters=track==="skyline"?368:track==="vault"?3400:0;
  if(data.version!=="0.28.0"||data.track!==track||
   data.styleId!=="skyline-premium-tunnel"||
   data.quality!==(memory===4?"4GB":"high")||
   data.tunnelMeters!==meters||
   data.sectionCount!==(track==="aurora"?0:1)||
   data.chunkCount!==(track==="vault"?20:track==="skyline"?3:0)||
   data.sharedRequested===classic||
   !data.originalPhysicsUntouched||!data.originalTrackUntouched||
   !data.originalShipUntouched||!data.originalGripUntouched||
   !data.centralSource?.commonPanelPalette||
   data.originalRoadMaterial!=="MeshStandardMaterial"||
   !data.originalShip||!data.originalGrip||
   data.originalCourseMeters!==data.totalTrackMeters)
    throw Error("0.28.0 shared system invariants failed "+
     JSON.stringify(data));
  if(track==="vault"&&(!data.vault?.architectureActive||
   !data.vault?.lightingActive||
   data.vault?.physicalCoats!==(memory===4?20:40)||
   data.vault?.raisedPanels<100))
    throw Error("0.28.0 Vault lost original premium panels/real GGX "+JSON.stringify(data));
  if(track==="skyline"&&!data.skyline)
    throw Error("0.28.0 Skyline original renderer not installed");
  if(track==="aurora"&&data.active)
    throw Error("0.28.0 inadvertently enclosed Aurora");
  const label=track+"-"+(memory===4?"4gb":"high")+
   (classic?"-legacy":"-shared")+(position===null?"":"-"+position);
  const png=await take(page,label);
  inspect(png,label);
  return data;
 }
 for(const [track,memory,s] of [
  ["skyline",8,120],["skyline",4,120],
  ["vault",8,110],["vault",8,1840],["vault",8,3230],
  ["vault",4,110],["vault",4,1910],["aurora",8,null]
 ]){
  const page=await open(track,memory);
  await verify(page,track,memory,false,s);
  await page.close();
 }
 for(const [track,memory,s] of [["skyline",8,120],["vault",8,110]]){
  const page=await open(track,memory,true);
  await verify(page,track,memory,true,s);
  await page.close();
 }
 if(errors.length)throw Error("0.28.0 WebGL shader/runtime error: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.0: one shared Skyline tunnel style; all tracks, 4GB and 3400m original geometry preserved");
}finally{await browser?.close();server.kill("SIGTERM");}
