// SKYSHIFT 0.28.8 — actual Chromium/WebGL SAME FRAME 0.28.7 vs 0.28.8.
// No generated imagery: image bytes are read from the live game canvas.
// The only changed runtime parameter between captures is the shader uniform.
import {spawn} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.28.8 requires real Chromium/WebGL");
const port=8891;
const server=spawn("python3",["-m","http.server",String(port),
 "--bind","127.0.0.1"],{cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],proof=[];
const base="skyshift/previews/";
mkdirSync(base,{recursive:true});
function compare(a,b){
 const old=PNG.sync.read(a),now=PNG.sync.read(b);
 if(old.width!==now.width||old.height!==now.height)
  throw Error("0.28.8 frame dimensions changed");
 let touched=0,significant=0,whiteBefore=0,whiteAfter=0;
 let road0=0,road1=0,roadN=0,wall0=0,wall1=0,wallN=0;
 const w=old.width,h=old.height;
 for(let y=8;y<h-8;y+=3)for(let x=8;x<w-8;x+=3){
  const i=(y*w+x)*4;
  const a0=old.data[i],a1=old.data[i+1],a2=old.data[i+2];
  const b0=now.data[i],b1=now.data[i+1],b2=now.data[i+2];
  const diff=Math.abs(a0-b0)+Math.abs(a1-b1)+Math.abs(a2-b2);
  if(diff>4)touched++;
  if(diff>18)significant++;
  if(y<h*.28 && x>w*.05&&x<w*.95){
   if(Math.min(a0,a1,a2)>246)whiteBefore++;
   if(Math.min(b0,b1,b2)>246)whiteAfter++;
  }
  const oldL=.2126*a0+.7152*a1+.0722*a2;
  const newL=.2126*b0+.7152*b1+.0722*b2;
  if(y>h*.7 && x>w*.36&&x<w*.64){
   road0+=oldL;road1+=newL;roadN++;
  }else if(y>h*.2 && y<h*.8 &&
    ((x>w*.07&&x<w*.37)||(x>w*.63&&x<w*.93))){
   wall0+=oldL;wall1+=newL;wallN++;
  }
 }
 return {touched,significant,whiteBefore,whiteAfter,
  roadBefore:+(road0/Math.max(1,roadN)).toFixed(2),
  roadAfter:+(road1/Math.max(1,roadN)).toFixed(2),
  wallBefore:+(wall0/Math.max(1,wallN)).toFixed(2),
  wallAfter:+(wall1/Math.max(1,wallN)).toFixed(2)};
}
async function capture(track,v,memory,s){
 const tag=track+"-"+v+"-"+(memory===4?"4GB":"High")+"-"+s;
 const page=await browser.newPage({viewport:{width:1536,height:870}});
 page.on("pageerror",e=>errors.push(tag+": "+e.message));
 page.on("console",m=>{
  if(m.type()==="error"&&
   /THREE.WebGLProgram|shader error|INVALID_OPERATION|compile failed/i.test(m.text()))
   errors.push(tag+": "+m.text().slice(0,1300));
 });
 await page.addInitScript(value=>Object.defineProperty(navigator,
  "deviceMemory",{configurable:true,get:()=>value}),memory);
 const url="http://127.0.0.1:"+port+"/skyshift/?track="+track+
  "&v="+v+"&precisionNeonSmoke=1&trackRepairSmoke=1&sharedTunnelSmoke=1";
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:70000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:145000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:45000});
 await page.evaluate(distance=>window.__skyshiftTrackRepairTeleport(distance),s);
 await page.waitForTimeout(650);
 const audit=await page.evaluate(()=>window.__skyshiftPrecisionNeonAudit());
 if(!audit?.originalShip||!audit.grip||!audit.physicsUntouched||
  !audit.boostUntouched||!audit.noExtraWorldLights)
  throw Error(tag+" original racing mechanics unexpectedly unavailable "+
   JSON.stringify(audit));
 const record={tag,track,v,memory,s,requested:audit.requested};
 if(track==="vault"&&v==="0.28.8"){
  const p=audit.precision;
  if(!p?.active||p.sourceModules!==10||
   p.physicalCoats!==(memory===4?10:20)||
   p.cyanSources!==10||p.archFootSources!==10||
   p.addedLights!==0||p.addedRenderPasses!==0||
   !audit.pmremActive||!audit.stability?.active||
   !audit.arch?.active||audit.arch?.sourceFixtures!==200||
   !audit.waveAligned)
   throw Error(tag+" missing actual shared 0.28.8 hardware proof "+
    JSON.stringify(audit));
  const frames=await page.evaluate(()=>
   window.__skyshiftPrecisionNeonFrameProof());
  const before=Buffer.from(frames.before,"base64");
  const after=Buffer.from(frames.after,"base64");
  writeFileSync(base+"v0288-"+tag+"-before-0287.png",before);
  writeFileSync(base+"v0288-"+tag+"-after-0288.png",after);
  record.delta=compare(before,after);
  record.precision=p;
  // No false screenshot success: require visible real in-game pixels.
  if(record.delta.touched<100||record.delta.significant<22)
   throw Error(tag+" new neon is not visibly different: "+
    JSON.stringify(record.delta));
  if(record.delta.whiteAfter>record.delta.whiteBefore+180)
   throw Error(tag+" new white-core roof spill: "+
    JSON.stringify(record.delta));
  if(record.delta.roadAfter>record.delta.roadBefore+4)
   throw Error(tag+" new broad road wash: "+
    JSON.stringify(record.delta));
 }else{
  if(audit.requested||audit.precision?.active)
   throw Error(tag+" protected historical course changed");
  record.olderReleaseProtected=true;
 }
 proof.push(record);
 writeFileSync(base+"v0288-proof.json",JSON.stringify(proof,null,2));
 console.log("PRECISION_0288 "+JSON.stringify(record));
 await page.close();
}
try{
 await sleep(750);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage",
   "--enable-webgl","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader"]});
 for(const args of [
  ["vault","0.28.8",8,110],
  ["vault","0.28.8",8,1840],
  ["vault","0.28.8",8,3230],
  ["vault","0.28.8",4,1840],
  ["vault","0.28.7",8,110],
  ["skyline","0.26.5",8,110]
 ])await capture(...args);
 if(errors.length)throw Error("0.28.8 shader/browser failures "+
  errors.join(" | "));
 console.log("PASS 0.28.8 original game WebGL 0.28.7/0.28.8 High and 4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
