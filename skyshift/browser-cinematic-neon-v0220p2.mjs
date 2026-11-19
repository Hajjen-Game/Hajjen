// SKYSHIFT 0.22.0.2 — real Chrome/WebGL Pass 2 neon lighting A/B.
// Exact same frame, banked walls and ceiling, native cyan/gold/jade palette,
// 4GB quality tier and previous Pass 1 regression. No physics step in A/B.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";

const executable=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!executable)throw Error("Chrome unavailable for 0.22.0 Pass 2");
const server=spawn("python3",["-m","http.server","8822","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const errors=[],records=[];
function compare(pair,name){
 const old=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const next=PNG.sync.read(Buffer.from(pair.neon,"base64"));
 if(old.width!==next.width||old.height!==next.height)
  throw Error("P2 neon exact-frame dimensions differ");
 const W=old.width,H=old.height;
 let changed=0,wall=0,crown=0,centerRoad=0,whiteOld=0,whiteNew=0;
 for(let y=Math.floor(H*.09);y<Math.floor(H*.95);y+=2)
  for(let x=Math.floor(W*.04);x<Math.floor(W*.96);x+=2){
   const k=(y*W+x)*4,a=old.data,b=next.data;
   const d=Math.abs(a[k]-b[k])+Math.abs(a[k+1]-b[k+1])+
    Math.abs(a[k+2]-b[k+2]);
   const nearWhiteA=Math.min(a[k],a[k+1],a[k+2])>190;
   const nearWhiteB=Math.min(b[k],b[k+1],b[k+2])>190;
   if(nearWhiteA)whiteOld++;
   if(nearWhiteB)whiteNew++;
   if(d<20)continue;
   changed++;
   if(y<H*.50)crown++;
   if(x<W*.34||x>W*.66)wall++;
   if(x>W*.40&&x<W*.60&&y>H*.76)centerRoad++;
  }
 const row={name,s:pair.position,changed,wall,crown,centerRoad,whiteOld,whiteNew};
 if(changed<220||wall<50||crown<75)
  throw Error("Neon lighting insufficient on vault surfaces "+JSON.stringify(row));
 if(centerRoad>changed*.21+40)
  throw Error("Neon light change leaked into center driving line "+JSON.stringify(row));
 if(whiteNew>whiteOld*1.22+40)
  throw Error("Unwanted white-world spill from P2 "+JSON.stringify(row));
 for(const [mode,bytes] of [["p1",pair.classic],["p2",pair.neon]])
  writeFileSync("skyshift-v0220p2-"+name+"-"+mode+".png",
   Buffer.from(bytes,"base64"));
 return row;
}
try{
 await sleep(1250);
 browser=await chromium.launch({headless:true,executablePath:executable,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function openScene(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,1000));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>v}),memory);
  await page.goto("http://127.0.0.1:8822/skyshift/?v=0.22.0.2"+
   "&artSmoke=1&cinematicNeonSmoke=1&cinematicNeonFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:80000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function shot(page,s,palette,name,memory){
  await page.evaluate(n=>window.__skyshiftTrackRepairTeleport(n),s);
  if(palette>0)await page.evaluate(n=>window.__skyshiftWaveSmoke(n),palette);
  await page.waitForTimeout(800);
  const state=await page.evaluate(()=>window.__skyshiftCinematicNeonProbe?.());
  if(!state?.enabled||!state.cinematicNeonEnabled||
     state.cinematicNeonStatus!=="active"||
     state.cinematicNeonMaterialBatches!==(memory===4?3:4)||
     state.cinematicNeonVertices<1000||
     !state.cinematicNeonNoNewDrawCalls||
     !state.cinematicNeonNoNewLights||
     !state.cinematicNeonNoWhiteSpill||
     state.roadSolarSeal!==1||!state.roadPremium||
     state.drawBatches!==(memory===4?5:9)||
     state.cinematicNeonStrength!==1)
   throw Error("P2 visual pipeline failed to install "+JSON.stringify(state));
  const pair=await page.evaluate(()=>window.__skyshiftCinematicNeonFrameProof());
  const result=compare(pair,name);
  records.push({...result,drawBatches:state.drawBatches,
   localVertices:state.cinematicNeonVertices,
   lowMemory:memory===4});
  console.log("CINEMATIC_NEON_P2 "+JSON.stringify(records.at(-1)));
 }
 const desktop=await openScene(8);
 await shot(desktop,165,0,"cyan-165",8);
 await shot(desktop,165,2,"gold-165",8);
 await shot(desktop,273,3,"jade-273",8);
 await desktop.close();
 const mobile=await openScene(4);
 await shot(mobile,165,2,"mobile-gold-165",4);
 await mobile.close();
 const classic=await openScene(8,"cinematicNeon=classic");
 const old=await classic.evaluate(()=>window.__skyshiftCinematicNeonProbe());
 if(old.enabled||old.cinematicNeonEnabled||old.drawBatches!==9)
  throw Error("Pass 1 A/B lost "+JSON.stringify(old));
 await classic.close();
 if(errors.length)throw Error("P2 real-WebGL shader error "+errors.join(" | "));
 writeFileSync("skyshift-v0220p2-proof.json",JSON.stringify(records,null,2));
 console.log("PASS SKYSHIFT 0.22.0 Pass 2 real GPU material/neon light and mobile");
}finally{await browser?.close();server.kill("SIGTERM")}
