// SKYSHIFT 0.28.9 - actual in-game Chromium WebGL snapshots (NEVER AI art).
// Identical frame and original 0.28.8 PMREM; separate contrast/strips/road.
import {spawn} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.28.9 requires real Chromium WebGL");
const port=8892,dir="skyshift/previews/";mkdirSync(dir,{recursive:true});
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],proof=[];
const lerp=(r,g,b)=>.2126*r+.7152*g+.0722*b;
function measure(a,b){
 const old=PNG.sync.read(a),after=PNG.sync.read(b);
 if(old.width!==after.width||old.height!==after.height)
  throw Error("0.28.9 unequal before/after dimensions");
 const w=old.width,h=old.height;let touched=0,significant=0,white0=0,white1=0;
 let wall0=0,wall1=0,wallN=0,road0=0,road1=0,roadN=0;
 let cold0=0,cold1=0,warm0=0,warm1=0;
 for(let y=8;y<h-8;y+=3)for(let x=8;x<w-8;x+=3){
  const i=(y*w+x)*4;
  const aa=[old.data[i],old.data[i+1],old.data[i+2]];
  const bb=[after.data[i],after.data[i+1],after.data[i+2]];
  const d=aa.reduce((v,c,j)=>v+Math.abs(c-bb[j]),0);
  if(d>4)touched++;if(d>18)significant++;
  if(y<h*.27&&x>w*.06&&x<w*.94){
   if(Math.min(...aa)>247)white0++;
   if(Math.min(...bb)>247)white1++;
  }
  if(y>h*.24&&y<h*.79&&
    ((x>w*.04&&x<w*.38)||(x>w*.62&&x<w*.96))){
   wall0+=lerp(...aa);wall1+=lerp(...bb);wallN++;
   if(aa[2]>aa[0]*1.28&&aa[1]>aa[0]*1.2)cold0++;
   if(bb[2]>bb[0]*1.28&&bb[1]>bb[0]*1.2)cold1++;
   if(aa[0]>aa[2]*1.6&&aa[0]>aa[1]*1.17)warm0++;
   if(bb[0]>bb[2]*1.6&&bb[0]>bb[1]*1.17)warm1++;
  }
  if(y>h*.70&&x>w*.33&&x<w*.67){
   road0+=lerp(...aa);road1+=lerp(...bb);roadN++;
  }
 }
 return {touched,significant,whiteBefore:white0,whiteAfter:white1,
  wallBefore:+(wall0/Math.max(1,wallN)).toFixed(2),
  wallAfter:+(wall1/Math.max(1,wallN)).toFixed(2),
  roadBefore:+(road0/Math.max(1,roadN)).toFixed(2),
  roadAfter:+(road1/Math.max(1,roadN)).toFixed(2),
  cyanBefore:cold0,cyanAfter:cold1,amberBefore:warm0,amberAfter:warm1};
}
async function capture(track,v,memory,distance){
 const tag=track+"-"+v+"-"+(memory===4?"4GB":"High")+"-"+distance;
 const page=await browser.newPage({viewport:{width:1536,height:870}});
 page.on("pageerror",e=>errors.push(tag+": "+e.message));
 page.on("console",m=>{
  if(m.type()==="error"&&
   /THREE.WebGLProgram|shader error|INVALID_OPERATION|compile failed|WebGL:/i.test(m.text()))
   errors.push(tag+": "+m.text().slice(0,1500));
 });
 await page.addInitScript(m=>Object.defineProperty(navigator,"deviceMemory",
  {configurable:true,get:()=>m}),memory);
 const url="http://127.0.0.1:"+port+"/skyshift/?track="+track+
  "&v="+v+"&cinematicMetalSmoke=1&trackRepairSmoke=1&sharedTunnelSmoke=1";
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:70000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:160000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:60000});
 await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),distance);
 await page.waitForTimeout(650);
 const a=await page.evaluate(()=>window.__skyshiftCinematicMetalAudit());
 if(!a?.originalShip||!a.grip||!a.physicsUntouched||
  !a.boostUntouched||!a.geometryUntouched||a.newWorldLights!==0)
  throw Error(tag+" handling or original assets lost: "+JSON.stringify(a));
 let result={tag,track,v,memory,distance,requested:a.requested};
 if(track==="vault"&&v==="0.28.9"){
  const t=a.tunnel,road=a.road;
  if(!a.originalShared||!a.pmremActive||!a.zoneWave||
   !t?.active||t?.sourceModules!==10||
   t?.physicalCoats!==(memory===4?10:20)||
   t?.substrates!==(memory===4?30:40)||
   t?.addedLights!==0||t?.addedRenderPasses!==0||
   !road?.active||!road?.originalRoadMaterial||
   road?.addedDrawCalls!==0||
   !a.archFoot?.active||a.archFoot.sourceFixtures!==200||
   !a.originalSource?.active||!a.stableMetal?.active)
   throw Error(tag+" native 0.28.9 shared model or original source missing "+
    JSON.stringify(a));
  const images=await page.evaluate(()=>window.__skyshiftCinematicMetalFrames());
  const fn={before:"before-0288",after:"after-0289",
   contrastOnly:"contrast-only",stripsOnly:"strips-only",roadOnly:"road-only"};
  const bytes={};
  for(const [key,suffix] of Object.entries(fn)){
   bytes[key]=Buffer.from(images[key],"base64");
   writeFileSync(dir+"v0289-"+tag+"-"+suffix+".png",bytes[key]);
  }
  result.full=measure(bytes.before,bytes.after);
  result.contrast=measure(bytes.before,bytes.contrastOnly);
  result.strips=measure(bytes.before,bytes.stripsOnly);
  result.road=measure(bytes.before,bytes.roadOnly);
  result.tunnel=t;result.roadMaterial=road;
  // Avoid "passing" a 0.28.8-sized barely visible visual difference.
  const minChanged=memory===4?550:1500;
  if(result.full.significant<minChanged)
   throw Error(tag+" 0.28.9 change too subtle to ship "+JSON.stringify(result));
  if(result.full.whiteAfter>result.full.whiteBefore+160)
   throw Error(tag+" ceiling white-core spill regressed "+JSON.stringify(result.full));
  if(result.full.roadAfter>result.full.roadBefore+8)
   throw Error(tag+" road became globally overexposed "+JSON.stringify(result.full));
  if(result.contrast.significant<Math.round(minChanged*.22))
   throw Error(tag+" dark contrast has no material effect "+JSON.stringify(result.contrast));
  if(result.road.significant<50)
   throw Error(tag+" road reflectivity pass invisible "+JSON.stringify(result.road));
 }else{
  if(a.requested||a.tunnel?.active||a.road?.active)
   throw Error(tag+" historical release unexpectedly modified");
  result.oldReleaseProtected=true;
 }
 proof.push(result);
 writeFileSync(dir+"v0289-proof.json",JSON.stringify(proof,null,2));
 console.log("CINEMATIC_0289 "+JSON.stringify(result));
 await page.close();
}
try{
 await sleep(650);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 for(const args of [
  ["vault","0.28.9",8,110],
  ["vault","0.28.9",8,1840],
  ["vault","0.28.9",8,3230],
  ["vault","0.28.9",4,1840],
  ["vault","0.28.8",8,110],
  ["skyline","0.26.5",8,110]
 ])await capture(...args);
 if(errors.length)throw Error("0.28.9 browser/shader failures "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.9 cinematic graphite, streaks and road WebGL High/4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
