// SKYSHIFT 0.28.1 — actual WebGL original-renderer parity acceptance gate.
// Images come from real Chromium/SwiftShader, never synthesized screenshots.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const browserPath=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable",
 "/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!browserPath)throw Error("0.28.1 needs real Chromium/WebGL for release proof");
const server=spawn("python3",["-m","http.server","8887","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const errors=[],proof=[];
const imageStats=(buffer,label)=>{
 const png=PNG.sync.read(buffer),rgba=png.data;
 let samples=0,black=0,cyan=0,amber=0,white=0;
 for(let y=50;y<png.height-45;y+=4)for(let x=16;x<png.width-16;x+=4){
  const i=(y*png.width+x)*4,r=rgba[i],g=rgba[i+1],b=rgba[i+2];
  const brightness=.213*r+.715*g+.072*b;
  samples++;
  if(brightness<18)black++;
  if(b>r*1.30&&g>r*1.35&&g>65)cyan++;
  if(r>g*1.13&&r>b*1.65&&r>72)amber++;
  if(r>243&&g>243&&b>243)white++;
 }
 const result={label,samples,black,cyan,amber,white};
 proof.push(result);
 writeFileSync("skyshift-v0281-proof.json",JSON.stringify(proof,null,2));
 if(!samples||!black||!cyan||white>samples*.19)
  throw Error("0.28.1 genuine WebGL lighting/black-room failure "+JSON.stringify(result));
 return result;
};
try{
 await sleep(700);
 browser=await chromium.launch({headless:true,executablePath:browserPath,
  args:["--no-sandbox","--disable-dev-shm-usage",
   "--enable-webgl","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader"]});
 async function view(track,memory,s,classic=false){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  const key=track+"-"+(memory===4?"4GB":"High")+
   (classic?"-classic":"-shared")+"-"+s;
  page.on("pageerror",e=>errors.push(key+": "+e.message));
  page.on("console",message=>{
   if(message.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(message.text()))
    errors.push(key+": "+message.text().slice(0,1800));
  });
  await page.addInitScript(value=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>value}),memory);
  const url="http://127.0.0.1:8887/skyshift/?track="+track+
   "&v="+(track==="skyline"?"0.26.5":"0.28.1")+
   "&sharedTunnelSmoke=1&trackRepairSmoke=1&waveSmoke=1"+
   (classic?"&trueSharedRenderer=classic":"");
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:70000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:120000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:45000});
  if(s!==null){
   await page.evaluate(d=>window.__skyshiftTrackRepairTeleport(d),s);
   await page.evaluate(()=>window.__skyshiftWaveSmoke(1));
  }
  await page.waitForTimeout(700);
  const audit=await page.evaluate(()=>window.__skyshiftSharedTunnelAudit());
  if(!audit||audit.originalCourseMeters!==audit.totalTrackMeters||
   !audit.originalPhysicsUntouched||!audit.originalGripUntouched||
   !audit.originalShipUntouched)
   throw Error(key+" physics/route audit failed "+JSON.stringify(audit));
  if(track==="vault"&&!classic){
   const original=audit.trueSharedRenderer;
   if(!audit.actualOriginalSourceActive||!original?.active||
    original.sourceModules!==10||
    original.physicalModules!==10||
    original.commonResponseModules!==10||
    original.authentic0265WallModules!==10||
    original.originalAmberFootBands<100||
    original.originalShortCyanInlays<100||
    original.coverageMeters!==3400||
    original.legacyVaultRendererUsed!==false||
    audit.vault?.foundationActive)
     throw Error(key+" not the genuine ORIGINAL Skyline renderer "+JSON.stringify(audit));
  }
  if(track==="vault"&&classic&&
   (audit.actualOriginalSourceActive||!audit.vault?.foundationActive||
    !audit.vault?.architectureActive||!audit.vault?.lightingActive))
    throw Error(key+" lost independent legacy A/B rendering "+JSON.stringify(audit));
  if(track==="skyline"&&!audit.skyline)
   throw Error(key+" Skyline source not installed");
  if(track==="aurora"&&audit.active)
   throw Error(key+" empty Aurora incorrectly enclosed");
  const bytes=await page.screenshot({
   path:"skyshift-v0281-"+key+".png",timeout:30000});
  const pixels=imageStats(bytes,key);
  if(track==="vault"&&!classic&&pixels.amber<2)
   throw Error(key+" lost original warm/cyan practical light");
  console.log("TRUE_SHARED_0281 "+JSON.stringify({...pixels,audit}));
  await page.close();
 }
 for(const [track,memory,s,classic] of [
  ["skyline",8,120,false],["vault",8,110,false],
  ["vault",8,1840,false],["vault",8,3230,false],
  ["vault",4,110,false],["vault",4,1910,false],
  ["vault",8,110,true],["aurora",8,null,false]
 ])await view(track,memory,s,classic);
 if(errors.length)throw Error("0.28.1 runtime/GPU failure: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.1 True Shared Tunnel Renderer High/4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
