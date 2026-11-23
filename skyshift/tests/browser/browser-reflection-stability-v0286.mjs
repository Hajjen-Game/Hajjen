// SKYSHIFT 0.28.6 — REAL Chromium/WebGL images from active game canvas.
// Frozen 120Hz state / identical camera; change only the original shader
// uniforms for stable metal, cyan cove and softened original amber foot.
// Compare Vault 0.28.5 baseline + 0.28.6 High and 4GB, plus Skyline.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable",
 "/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.28.6 real WebGL proof requires Chromium");
const server=spawn("python3",["-m","http.server","8876","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const proof=[],errors=[];
const roof=[[.17,.04,.43,.30],[.57,.04,.83,.30]];
const sides=[[.06,.25,.35,.62],[.65,.25,.94,.62]];
const road=[[.31,.44,.69,.84]];
function pixelDelta(a,b,rects){
 if(a.width!==b.width||a.height!==b.height)
  throw Error("0.28.6 changed render target or camera");
 const w=a.width,h=a.height;let n=0,changed=0,lightA=0,lightB=0,
  peak0=0,peak1=0,white0=0,white1=0;
 for(const [x0,y0,x1,y1] of rects)
 for(let y=Math.floor(h*y0);y<Math.ceil(h*y1);y+=3)
 for(let x=Math.floor(w*x0);x<Math.ceil(w*x1);x+=3){
  const i=(y*w+x)*4;
  const ar=a.data[i],ag=a.data[i+1],ab=a.data[i+2],
   br=b.data[i],bg=b.data[i+1],bb=b.data[i+2];
  const la=.2126*ar+.7152*ag+.0722*ab,
   lb=.2126*br+.7152*bg+.0722*bb;
  n++;lightA+=la;lightB+=lb;
  peak0+=Math.max(ar,ag,ab)>215?1:0;
  peak1+=Math.max(br,bg,bb)>215?1:0;
  if(Math.abs(br-ar)+Math.abs(bg-ag)+Math.abs(bb-ab)>9)changed++;
  if(Math.min(ar,ag,ab)>242)white0++;
  if(Math.min(br,bg,bb)>242)white1++;
 }
 return {samples:n,changed,changedPct:+(100*changed/n).toFixed(3),
  meanBefore:+(lightA/n).toFixed(3),
  meanAfter:+(lightB/n).toFixed(3),hotBefore:peak0,hotAfter:peak1,
  whiteBefore:white0,whiteAfter:white1};
}
async function frame(track,version,memory,s,expected){
 const page=await browser.newPage({viewport:{width:1536,height:870}});
 const tag=track+"-"+version+"-"+(memory===4?"4GB":"High")+"-"+s;
 page.on("pageerror",e=>errors.push(tag+": "+e.message));
 page.on("console",m=>{if(m.type()==="error"&&
  /THREE.WebGLProgram|shader error|INVALID_OPERATION|compile failed/i.test(m.text()))
  errors.push(tag+": "+m.text().slice(0,1700));});
 await page.addInitScript(v=>Object.defineProperty(navigator,
  "deviceMemory",{configurable:true,get:()=>v}),memory);
 const url="http://127.0.0.1:8876/skyshift/?track="+track+"&v="+version+
  "&reflectionStabilitySmoke=1&trackRepairSmoke=1&sharedTunnelSmoke=1";
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:70000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:150000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:50000});
 await page.evaluate(distance=>window.__skyshiftTrackRepairTeleport(distance),s);
 await page.waitForTimeout(650);
 const audit=await page.evaluate(()=>window.__skyshiftReflectionStabilityAudit());
 if(!audit?.ship||!audit?.grip||audit.source.physicsUntouched!==true||
  audit.source.extraLights!==0||audit.source.extraDrawCalls!==0)
  throw Error(tag+" gameplay source corrupted "+JSON.stringify(audit));
 let out;
 if(expected){
  const v=audit.tunnel;
  if(!audit.originalShared||!audit.pmremActive||
   !audit.originalWave||!audit.requested||!v?.active||
   v.sourceModules!==10||v.coveBatches!==10||
   v.amberFootBatches!==10||
   v.physicalCoats!==(memory===4?10:20)||
   v.strength!==1||v.addedLights!==0||v.addedDrawCalls!==0||
   v.originalGGXKept!==true||v.originalPMREMKept!==true)
   throw Error(tag+" original native PBR/PMREM fixture missing "+JSON.stringify(audit));
  const frames=await page.evaluate(()=>window.__skyshiftReflectionStabilityFrames());
  const base=Buffer.from(frames.classic,"base64"),
   stable=Buffer.from(frames.stable,"base64");
  writeFileSync("skyshift-v0286-"+tag+"-classic.png",base);
  writeFileSync("skyshift-v0286-"+tag+"-stable.png",stable);
  const a=PNG.sync.read(base),b=PNG.sync.read(stable);
  out={tag,s,memory,release:"0.28.6",actualOriginalSource:audit.originalShared,
   roof:pixelDelta(a,b,roof),sides:pixelDelta(a,b,sides),
   road:pixelDelta(a,b,road)};
  // Pixel difference is not proof of reduced shimmer in motion;
  // anti-aliasing design itself is unit-tested in the physical shader.
  if(out.roof.changedPct<.06||out.sides.changedPct<.06)
   throw Error(tag+" no real PBR/strip change in wall+roof "+JSON.stringify(out));
  if(out.roof.whiteAfter>out.roof.whiteBefore*1.35+45||
   out.sides.whiteAfter>out.sides.whiteBefore*1.40+70)
   throw Error(tag+" reintroduced washed-out bright ceiling "+JSON.stringify(out));
  if(out.road.meanAfter>out.road.meanBefore+4.0)
   throw Error(tag+" road unexpectedly brightened "+JSON.stringify(out));
 }else{
  if(audit.requested||audit.tunnel?.active)
   throw Error(tag+" historical/other-track art unexpectedly altered");
  await page.screenshot({path:"skyshift-v0286-"+tag+"-baseline.png"});
  out={tag,s,release:version,legacyProtected:true};
 }
 proof.push(out);
 writeFileSync("skyshift-v0286-proof.json",JSON.stringify(proof,null,2));
 console.log("STABLE_REFLECTIONS_0286 "+JSON.stringify(out));
 await page.close();
}
try{
 await sleep(650);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage",
   "--enable-webgl","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader"]});
 for(const args of [
  ["vault","0.28.6",8,110,true],
  ["vault","0.28.6",8,1840,true],
  ["vault","0.28.6",8,3230,true],
  ["vault","0.28.6",4,1840,true],
  ["vault","0.28.5",8,110,false],
  ["skyline","0.26.5",8,110,false]
 ])await frame(...args);
 if(errors.length)
  throw Error("0.28.6 real WebGL shader errors: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.6 REAL metal stability + cyan/amber source strips High/4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
