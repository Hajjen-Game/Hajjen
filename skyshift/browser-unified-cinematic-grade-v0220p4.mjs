// SKYSHIFT 0.22.0.4 — Chrome/WebGL Unified Cinematic Grade pixel QA.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable");
const server=spawn("python3",["-m","http.server","8824","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const errors=[],proofs=[];
function inspect(pair,label){
 const a=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const b=PNG.sync.read(Buffer.from(pair.graded,"base64"));
 if(a.width!==b.width||a.height!==b.height)
  throw Error("P4 same-frame dimensions changed");
 const W=a.width,H=a.height;
 let changed=0,wall=0,upperTunnel=0,road=0,whiteOld=0,whiteNew=0;
 for(let y=Math.floor(H*.08);y<Math.floor(H*.95);y+=2)
  for(let x=Math.floor(W*.035);x<Math.floor(W*.965);x+=2){
   const i=4*(y*W+x),old=a.data,next=b.data;
   const delta=Math.abs(old[i]-next[i])+Math.abs(old[i+1]-next[i+1])+
    Math.abs(old[i+2]-next[i+2]);
   if(Math.min(old[i],old[i+1],old[i+2])>192)whiteOld++;
   if(Math.min(next[i],next[i+1],next[i+2])>192)whiteNew++;
   if(delta<12)continue;
   changed++;
   // PNG pixels are indexed TOP-to-BOTTOM. The previous test incorrectly
   // measured the bottom half as the ceiling and the top as the road.
   if(y<H*.50)upperTunnel++;
   if(x<W*.31||x>W*.69)wall++;
   if(x>W*.39&&x<W*.61&&y>H*.50)road++;
  }
 const row={label,position:pair.flightS,changed,wall,upperTunnel,road,whiteOld,whiteNew};
 if(changed<90||wall<45||upperTunnel<40)
  throw Error("Cinematic material/neon grade not perceptible "+JSON.stringify(row));
 if(road>changed*.32+45)
  throw Error("Protected driving corridor altered "+JSON.stringify(row));
 if(whiteNew>whiteOld*1.25+55)
  throw Error("New neutral white solar spill "+JSON.stringify(row));
 for(const [tag,img] of [["classic",pair.classic],["graded",pair.graded]])
  writeFileSync("skyshift-v0220p4-"+label+"-"+tag+".png",Buffer.from(img,"base64"));
 return row;
}
try{
 await sleep(1250);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(msg.text()))
    errors.push(msg.text().slice(0,950));
  });
  await page.addInitScript(n=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>n,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8824/skyshift/?v=0.22.0.4"+
   "&artSmoke=1&unifiedGradeSmoke=1&unifiedGradeFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:80000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 const hi=await open(8);
 for(const [s,zone,label] of [[165,0,"cyan"],[165,2,"gold"],[273,3,"jade"]]){
  await hi.evaluate(n=>window.__skyshiftTrackRepairTeleport(n),s);
  if(zone)await hi.evaluate(n=>window.__skyshiftWaveSmoke(n),zone);
  await hi.waitForTimeout(700);
  const q=await hi.evaluate(()=>window.__skyshiftUnifiedGradeProbe());
  if(!q.requested||!q.active||!q.outputFinal||
     !q.blurBeforeGrade||q.passIndex>=q.outputIndex||
     q.roadSolarSeal!==1||!q.originalExposurePreserved||
     !q.oldBloomPreserved||!q.nativeWave)
   throw Error("Unified HDR pipeline not active "+JSON.stringify(q));
  const capture=await hi.evaluate(()=>window.__skyshiftUnifiedGradeFrameProof());
  proofs.push(inspect(capture,label));
  console.log("UNIFIED_GRADE_P4 "+JSON.stringify(proofs.at(-1)));
 }
 await hi.close();
 const low=await open(4);
 const q=await low.evaluate(()=>window.__skyshiftUnifiedGradeProbe());
 if(!q.requested||q.active||q.disabledReason!=="low-memory"||
    !q.outputFinal||q.roadSolarSeal!==1)
  throw Error("4GB device did not retain original composer "+JSON.stringify(q));
 await low.close();
 const classic=await open(8,"unifiedGrade=classic");
 const old=await classic.evaluate(()=>window.__skyshiftUnifiedGradeProbe());
 if(old.requested||old.active||old.disabledReason!=="comparison")
  throw Error("Pass 3 A/B broken "+JSON.stringify(old));
 await classic.close();
 if(errors.length)throw Error("WebGL shader errors "+errors.join(" | "));
 writeFileSync("skyshift-v0220p4-proof.json",JSON.stringify(proofs,null,2));
 console.log("PASS SKYSHIFT 0.22.0.4: real WebGL grades cyan gold jade, 4GB and no sun");
}finally{await browser?.close();server.kill("SIGTERM")}
