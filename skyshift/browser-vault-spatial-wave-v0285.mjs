// SKYSHIFT 0.28.5 — real Chromium/WebGL proof of SAME spatial color front
// on tunnel wall/roof AND existing indexed road across source module seams.
// No generated imagery, no gameplay changes; QA helper pins original 120Hz
// simulation and changes ONLY the shared uniform wavefront.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.28.5 needs genuine Chromium WebGL");
const server=spawn("python3",["-m","http.server","8875","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const proof=[],errors=[];
const wall=[[.04,.16,.35,.59],[.65,.16,.96,.59]];
const road=[[.27,.43,.73,.81]];
function pixels(a,b,rects){
 if(a.width!==b.width||a.height!==b.height)
  throw Error("0.28.5 A/B changes resolution/camera");
 const w=a.width,h=a.height;let n=0,changed=0,
  lightA=0,lightB=0,whiteA=0,whiteB=0,blueGain=0,pinkGain=0;
 for(const [x0,y0,x1,y1] of rects)
 for(let y=Math.floor(h*y0);y<Math.ceil(h*y1);y+=3)
 for(let x=Math.floor(w*x0);x<Math.ceil(w*x1);x+=3){
  const i=(y*w+x)*4,a0=a.data[i],a1=a.data[i+1],a2=a.data[i+2],
   b0=b.data[i],b1=b.data[i+1],b2=b.data[i+2];
  const l0=.2126*a0+.7152*a1+.0722*a2,
   l1=.2126*b0+.7152*b1+.0722*b2;
  n++;lightA+=l0;lightB+=l1;
  if(Math.abs(b0-a0)+Math.abs(b1-a1)+Math.abs(b2-a2)>10)changed++;
  if(Math.min(a0,a1,a2)>245)whiteA++;
  if(Math.min(b0,b1,b2)>245)whiteB++;
  if(b2>a2+4&&b0>a0+2)pinkGain++;
  if(b2<a2-4&&b1<a1-2)blueGain++;
 }
 return {samples:n,changed,changedPct:+(100*changed/n).toFixed(2),
  meanBefore:+(lightA/n).toFixed(2),
  meanAfter:+(lightB/n).toFixed(2),whiteA,whiteB,pinkGain,blueGain};
}
async function capture(track,version,memory,s,fronts){
 const page=await browser.newPage({viewport:{width:1536,height:870}});
 const name=track+"-"+version+"-"+(memory===4?"4GB":"High")+"-"+s;
 page.on("pageerror",e=>errors.push(name+": "+e.message));
 page.on("console",m=>{if(m.type()==="error"&&
  /THREE.WebGLProgram|shader error|INVALID_OPERATION|compile failed/i.test(m.text()))
  errors.push(name+": "+m.text().slice(0,1600));});
 await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",{
  configurable:true,get:()=>v}),memory);
 const url="http://127.0.0.1:8875/skyshift/?track="+track+"&v="+version+
  "&waveParitySmoke=1&trackRepairSmoke=1&sharedTunnelSmoke=1";
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:70000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:140000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:45000});
 await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),s);
 await page.waitForTimeout(350);
 let audits=[],frames=[];
 for(let i=0;i<fronts.length;i++){
  const audit=await page.evaluate(front=>
   window.__skyshiftVaultWaveParitySetFront(front),fronts[i]);
  if(!audit?.nativeRoadWave||!audit?.originalSharedRendererActive||
   !audit.physicsUntouched||!audit.gripUntouched||!audit.boostUntouched)
   throw Error(name+" source renderer, road or flight unavailable "+JSON.stringify(audit));
  if(version==="0.28.5"&&track==="vault"){
   if(!audit.enabled||audit.modules.length!==10||
    audit.tunnelPatches<40||audit.checks.length!==10||
    audit.checks.some(c=>c.delta>1e-5))
    throw Error(name+" source module drift from road front "+JSON.stringify(audit));
  }else if(audit.enabled||audit.tunnelPatches)
   throw Error(name+" legacy/other-track source unexpectedly modified");
  const file="skyshift-v0285-"+name+"-"+(i?"behind":"ahead")+".png";
  const bytes=await page.screenshot({path:file,timeout:30000});
  frames.push(PNG.sync.read(bytes));audits.push(audit);
 }
 const result={name,track,version,memory,s,fronts,
  active:audits[0].enabled,
  patched:audits[0].tunnelPatches,
  maxSpatialDrift:Math.max(0,...audits[0].checks.map(c=>c.delta)),
  wall:pixels(frames[0],frames[1],wall),
  road:pixels(frames[0],frames[1],road)};
 proof.push(result);
 writeFileSync("skyshift-v0285-spatial-wave-proof.json",
  JSON.stringify(proof,null,2));
 console.log("SPATIAL_WAVE_0285 "+JSON.stringify(result));
 if(track==="vault"&&version==="0.28.5"){
  if(result.wall.changedPct<.12||result.road.changedPct<.12)
   throw Error(name+" same wavefront fails to recolor both WALL and ROAD");
  if(result.wall.whiteB>result.wall.whiteA*2+140||
   result.road.whiteB>result.road.whiteA*2+140)
   throw Error(name+" bad neutral white spill during wave");
 }
 await page.close();
}
try{
 await sleep(650);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage",
   "--enable-webgl","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader"]});
 for(const args of [
  ["vault","0.28.5",8,350,[270,430]],
  ["vault","0.28.5",8,1840,[1760,1920]],
  ["vault","0.28.5",8,3230,[3150,3310]],
  ["vault","0.28.5",4,1840,[1760,1920]],
  ["vault","0.28.4",8,1840,[1760,1920]]
 ])await capture(...args);
 if(errors.length)throw Error("0.28.5 real WebGL shader/runtime errors "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.5 synchronized spatial wave on actual Vault wall+road High/4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
