// SKYSHIFT 0.28.7 — REAL WebGL identical-frame before/after
// from the in-game renderer, never generated reference art.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.28.7 requires real Chromium WebGL");
const server=spawn("python3",["-m","http.server","8877","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],proof=[];
function regions(a,b,rects){
 if(a.width!==b.width||a.height!==b.height)
  throw Error("0.28.7 before/after viewport mismatch");
 let samples=0,changed=0,amber0=0,amber1=0,white0=0,white1=0;
 let l0=0,l1=0;
 const w=a.width,h=a.height;
 for(const [x0,y0,x1,y1] of rects){
  for(let y=Math.floor(y0*h);y<Math.floor(y1*h);y+=2){
   for(let x=Math.floor(x0*w);x<Math.floor(x1*w);x+=2){
    const i=4*(w*y+x);
    const [r0,g0,b0]=a.data.slice(i,i+3),
      [r1,g1,b1]=b.data.slice(i,i+3);
    const old=.2126*r0+.7152*g0+.0722*b0,
      now=.2126*r1+.7152*g1+.0722*b1;
    l0+=old;l1+=now;samples++;
    if(Math.abs(r0-r1)+Math.abs(g0-g1)+Math.abs(b0-b1)>18)changed++;
    if(r0>80&&r0>g0*1.15&&g0>b0*1.26)amber0++;
    if(r1>80&&r1>g1*1.15&&g1>b1*1.26)amber1++;
    if(Math.min(r0,g0,b0)>245)white0++;
    if(Math.min(r1,g1,b1)>245)white1++;
   }
  }
 }
 return {samples,changed,changedPct:+(100*changed/samples).toFixed(3),
  amberBefore:amber0,amberAfter:amber1,
  meanBefore:+(l0/samples).toFixed(2),
  meanAfter:+(l1/samples).toFixed(2),
  whiteBefore:white0,whiteAfter:white1};
}
const feet=[[.01,.32,.39,.87],[.61,.32,.99,.87]];
const ceiling=[[.05,.01,.95,.29]];
const roadway=[[.32,.68,.68,.93]];
async function frame(track,version,memory,s,expected){
 const page=await browser.newPage({viewport:{width:1536,height:870}});
 const tag=track+"-"+version+"-"+(memory===4?"4GB":"High")+"-"+s;
 page.on("pageerror",e=>errors.push(tag+": "+e.message));
 page.on("console",m=>{
  if(m.type()==="error"&&/THREE.WebGLProgram|shader error|INVALID_OPERATION|compile failed/i.test(m.text()))
   errors.push(tag+": "+m.text().slice(0,1800));
 });
 await page.addInitScript(v=>Object.defineProperty(navigator,
  "deviceMemory",{configurable:true,get:()=>v}),memory);
 const url="http://127.0.0.1:8877/skyshift/?track="+track+"&v="+version+
  "&archFootSmoke=1&trackRepairSmoke=1&sharedTunnelSmoke=1";
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:70000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:150000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:50000});
 await page.evaluate(distance=>window.__skyshiftTrackRepairTeleport(distance),s);
 await page.waitForTimeout(600);
 const audit=await page.evaluate(()=>window.__skyshiftArchFootAudit());
 if(!audit?.originalShip||!audit.grip||!audit.physicsUntouched||
  !audit.boostUntouched||audit.addedWorldLights!==0)
  throw Error(tag+" native race/grip unexpectedly changed "+JSON.stringify(audit));
 let data={tag,s,track,version,memory,requested:audit.requested};
 if(expected){
  if(!audit.originalShared||!audit.pmremActive||!audit.waveAligned||
   !audit.stability?.active||!audit.arch?.active||
   audit.arch.sourceModules!==10||audit.arch.sourceFixtures!==200||
   audit.arch.mountedSourceBatches!==10||
   audit.arch.duplicateFootMeshes!==0||audit.arch.lightsAdded!==0||
   audit.arch.collidersAdded!==0)
   throw Error(tag+" real 0.28.7 shared source assembly missing "+JSON.stringify(audit));
  const images=await page.evaluate(()=>window.__skyshiftArchFootFrameProof());
  const old=Buffer.from(images.old,"base64"),
   updated=Buffer.from(images.updated,"base64");
  writeFileSync("skyshift-v0287-"+tag+"-original.png",old);
  writeFileSync("skyshift-v0287-"+tag+"-new-L.png",updated);
  const a=PNG.sync.read(old),b=PNG.sync.read(updated);
  data={...data,assembly:audit.arch,
   foot:regions(a,b,feet),roof:regions(a,b,ceiling),
   road:regions(a,b,roadway)};
  if(data.foot.changedPct<.035||data.foot.changed<80)
   throw Error(tag+" new L lighting not actually visible on VAULT wall/foot "+JSON.stringify(data));
  // The FIRST prototype passed mere change detection even when its dark
  // plinth hid the bright L. Require a meaningful warm-foot light signature
  // on actual pixels, while allowing a much smaller footprint than the
  // old broad 14.4m orange wedge.
  if(data.foot.amberAfter<data.foot.amberBefore*.45)
   throw Error(tag+" the brighter integrated amber L has disappeared behind graphite "+JSON.stringify(data));
  if(data.roof.whiteAfter>data.roof.whiteBefore+90)
   throw Error(tag+" new arch feet reintroduced white ceiling light");
  if(data.road.meanAfter>data.road.meanBefore+3.0)
   throw Error(tag+" new arch foot washed out racing road");
 }else{
  if(audit.requested||audit.arch?.active)
   throw Error(tag+" historical original renderer modified "+JSON.stringify(audit));
  await page.screenshot({path:"skyshift-v0287-"+tag+"-baseline.png"});
  data.legacyProtected=true;
 }
 proof.push(data);
 writeFileSync("skyshift-v0287-proof.json",JSON.stringify(proof,null,2));
 console.log("ARCH_FOOT_0287 "+JSON.stringify(data));
 await page.close();
}
try{
 await sleep(650);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 for(const args of [
  ["vault","0.28.7",8,110,true],
  ["vault","0.28.7",8,1840,true],
  ["vault","0.28.7",8,3230,true],
  ["vault","0.28.7",4,1840,true],
  ["vault","0.28.6",8,110,false],
  ["skyline","0.26.5",8,110,false]
 ])await frame(...args);
 if(errors.length)throw Error("0.28.7 WebGL runtime/shader failures: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.7 real shared corner L source + graphite base High/4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
