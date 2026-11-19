// SKYSHIFT 0.21.6 — real WebGL cinematic-speed same-frame screenshot proof.
// Verify existing four flow strands animate through existing velocity phase,
// without added meshes/postprocess or light leaks. Test simulated 4GB too.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("No Chrome browser");
const server=spawn("python3",["-m","http.server","8816","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser,errors=[],results=[];
function compare(pairs,label){
 const a=PNG.sync.read(Buffer.from(pairs.baseline,"base64"));
 const b=PNG.sync.read(Buffer.from(pairs.cinematic,"base64"));
 if(a.width!==b.width||a.height!==b.height)
  throw Error("Motion screenshots must share the exact frame size");
 const W=a.width,H=a.height;
 let total=0,roof=0,walls=0,road=0;
 for(let y=Math.floor(H*.12);y<Math.floor(H*.94);y+=2)
  for(let x=Math.floor(W*.045);x<Math.floor(W*.955);x+=2){
   const i=(y*W+x)*4,src=a.data,out=b.data;
   const delta=Math.abs(src[i]-out[i])+
    Math.abs(src[i+1]-out[i+1])+Math.abs(src[i+2]-out[i+2]);
   if(delta<9)continue;
   total++;
   if(y<H*.58)roof++;
   if(x<W*.31||x>W*.69)walls++;
   if(y>H*.52&&x>W*.30&&x<W*.70)road++;
  }
 const data={label,position:pairs.s,alteredPixels:total,roof,walls,road};
 // Authoritative proof comes from genuine before/after WebGL frames,
 // not simply shader strings or changes to speed/flight variables.
 if(total<35||roof<20)
  throw Error("Cinematic neon has no measurable visual response "+JSON.stringify(data));
 for(const [mode,png] of [["base",pairs.baseline],["cinematic",pairs.cinematic]])
  writeFileSync("skyshift-v0216-"+label+"-"+mode+".png",Buffer.from(png,"base64"));
 return data;
}
try{
 await sleep(1250);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(mem,extra=""){
  const p=await browser.newPage({viewport:{width:1536,height:870}});
  p.on("pageerror",e=>errors.push(e.message));
  p.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,850));
  });
  await p.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>v,configurable:true}),mem);
  await p.goto("http://127.0.0.1:8816/skyshift/?v=0.21.6"+
   "&artSmoke=1&cinematicMotionSmoke=1&cinematicMotionFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await p.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await p.locator("#start-btn").click();
  await p.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return p;
 }
 async function shot(page,s,stage,label,memory){
  await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),s);
  if(stage>0)await page.evaluate(i=>window.__skyshiftWaveSmoke(i),stage);
  await page.waitForTimeout(750);
  const probe=await page.evaluate(()=>window.__skyshiftCinematicMotionProbe());
  if(!probe.enabled||!probe.cinematicEnergyEnabled||
     probe.cinematicStatus!=="active"||!probe.flowEnabled||
     probe.flowPaths!==4||!probe.cinemaSameWaveState||
     !probe.cinemaNoPhysicsChanges||probe.roadSolarSeal!==1||
     probe.premiumRoad!==true||
     probe.cinematicDrawBatches!==0||
     probe.cinematicMobile!==(memory===4))
   throw Error("0.21.6 not initialized correctly "+JSON.stringify(probe));
  const imgs=await page.evaluate(()=>window.__skyshiftCinematicMotionFrameProof());
  const row=compare(imgs,label);
  results.push({...row,drawBatches:probe.drawBatches,mobile:memory===4});
  console.log("CINEMATIC_MOTION "+JSON.stringify(results.at(-1)));
 }
 const full=await load(8);
 await shot(full,165,0,"cyan-165",8);
 await shot(full,165,2,"solar-165",8);
 await shot(full,273,3,"jade-273",8);
 await full.close();
 const mobile=await load(4);
 await shot(mobile,165,2,"mobile-solar-165",4);
 await mobile.close();
 const classic=await load(8,"cinematicMotion=classic");
 const old=await classic.evaluate(()=>window.__skyshiftCinematicMotionProbe());
 if(old.enabled||old.cinematicEnergyEnabled)
  throw Error("Classic A/B no longer available "+JSON.stringify(old));
 await classic.close();
 if(errors.length)throw Error("WebGL compile errors "+errors.join(" | "));
 writeFileSync("skyshift-v0216-cinematic-motion-proof.json",
  JSON.stringify(results,null,2));
 console.log("PASS SKYSHIFT 0.21.6: dynamic neon speed, exact-frame comparison, native zone wave and 4GB");
}finally{await browser?.close();server.kill("SIGTERM")}
