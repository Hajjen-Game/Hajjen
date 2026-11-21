// SKYSHIFT 0.26.4.2: real WebGL/SWIFTSHADER same-frame visual validation.
// 1536x870, high Gold straight, Gold turn and Violet, plus 4 GB Gold.
// Uploaded before/after PNGs come from the actual game, never image synthesis.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const executable=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!executable)throw Error("0.26.4.2 requires real Chromium/WebGL");
const server=spawn("python3",["-m","http.server","8869","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],data=[];
const lum=(a,i)=>a[i]*.2126+a[i+1]*.7152+a[i+2]*.0722;
function inspect(pair,label,mobile){
 const A=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const B=PNG.sync.read(Buffer.from(pair.refined,"base64"));
 if(A.width!==B.width||A.height!==B.height)
  throw Error("0.26.4.2 changed camera/viewport");
 for(const mode of ["classic","refined"])
  writeFileSync("skyshift-v02642-"+label+"-"+mode+".png",
   Buffer.from(pair[mode],"base64"));
 const w=A.width,h=A.height;let n=0,diffs=0,colors=0,white0=0,white1=0,
  black0=0,black1=0,wall0=0,wall1=0,wallN=0,
  center0=0,center1=0,centerN=0,shimmer0=0,shimmer1=0;
 for(let y=Math.floor(h*.075);y<Math.floor(h*.94);y+=3)
 for(let x=Math.floor(w*.03);x<Math.floor(w*.97);x+=3){
  const i=(y*w+x)*4,xx=x/w,yy=y/h;
  const d=Math.abs(A.data[i]-B.data[i])+
   Math.abs(A.data[i+1]-B.data[i+1])+
   Math.abs(A.data[i+2]-B.data[i+2]);
  const l0=lum(A.data,i),l1=lum(B.data,i);n++;
  if(d>9)diffs++;
  if(d>24)colors++;
  if(l0<12)black0++;
  if(l1<12)black1++;
  if(Math.min(A.data[i],A.data[i+1],A.data[i+2])>240)white0++;
  if(Math.min(B.data[i],B.data[i+1],B.data[i+2])>240)white1++;
  if(xx<.28||xx>.72||yy<.40){wallN++;wall0+=l0;wall1+=l1;}
  if(xx>.33&&xx<.67&&yy>.60){centerN++;center0+=l0;center1+=l1;}
  if((xx<.26||xx>.74)&&yy>.38&&yy<.82){
   if(l0>40)shimmer0++;if(l1>40)shimmer1++;
  }
 }
 const stats={label,mobile,s:pair.trackS,n,
  diffPct:+(100*diffs/n).toFixed(2),
  strongPct:+(100*colors/n).toFixed(2),
  wallBefore:+(wall0/wallN).toFixed(2),
  wallAfter:+(wall1/wallN).toFixed(2),
  roadBefore:+(center0/centerN).toFixed(2),
  roadAfter:+(center1/centerN).toFixed(2),
  wallBrightBefore:shimmer0,wallBrightAfter:shimmer1,
  white0,white1,black0,black1};
 data.push(stats);
 writeFileSync("skyshift-v02642-proof.json",JSON.stringify(data,null,2));
 console.log("REFLECTION_FINISH_02642 "+JSON.stringify(stats));
 if(diffs<(mobile?40:110))
  throw Error("0.26.4.2 reflection pass not visible "+JSON.stringify(stats));
 if(stats.roadAfter>stats.roadBefore+5.5)
  throw Error("0.26.4.2 washed out dark lane "+JSON.stringify(stats));
 if(white1>white0*1.14+32)
  throw Error("0.26.4.2 reintroduced white solar spill "+JSON.stringify(stats));
 if(black1<black0*.7)
  throw Error("0.26.4.2 crushed negative space "+JSON.stringify(stats));
}
try{
 await sleep(700);
 browser=await chromium.launch({headless:true,executablePath:executable,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(m.text()))
    errors.push(m.text().slice(0,2300));
  });
  await page.addInitScript(memory=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>memory}),memory);
  await page.goto("http://127.0.0.1:8869/skyshift/?v=0.26.4.2"+
   "&artSmoke=1&reflectionFinishSmoke=1&reflectionFinishFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function capture(page,position,zone,label,memory){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),position);
  if(zone)await page.evaluate(z=>window.__skyshiftWaveSmoke(z),zone);
  await page.waitForTimeout(680);
  const q=await page.evaluate(()=>window.__skyshiftReflectionFinishProbe());
  if(!q.requested||!q.reflectionFinish02642Active||
   q.reflectionFinish02642Version!=="0.26.4.2"||
   q.reflectionFinish02642MetalCoats!==(memory===4?1:2)||
   q.reflectionFinish02642RoadMaterials!==1||
   q.reflectionFinish02642JoinedAmber!==1||
   q.reflectionFinish02642NewLights!==0||
   q.reflectionFinish02642NewPasses!==0||
   q.reflectionFinish02642NewDrawCalls!==0||
   q.reflectionFinish02642NewTextures!==0||
   !q.reflectionFinish02642WhiteSolarSealed||
   !q.reflectionFinish02642StraightOnlyCyan||
   !q.reflectionFinish02642GraphiteUnchanged||
   !q.reflectionFinish02642NativeWaveUnchanged||
   !q.sourceMetal||!q.roadGGX||!q.straightOnly||!q.finalHDR||
   q.amberBands!==20||q.whiteSeal!==1||q.premiumRoadSeal!==1||
   q.originalRoadType!=="MeshStandardMaterial"||
   !q.originalShip||!q.nativeWave||
   Math.abs(q.originalExposure-.96)>.06)
   throw Error("0.26.4.2 missing active physical shaders "+JSON.stringify(q));
  inspect(await page.evaluate(()=>window.__skyshiftReflectionFinishFrameProof()),
   label,memory===4);
 }
 const high=await open(8);
 await capture(high,76,2,"high-gold-straight",8);
 await capture(high,165,2,"high-gold-arch",8);
 await capture(high,195,2,"high-gold-turn",8);
 await capture(high,250,1,"high-violet",8);
 await high.close();
 const mobile=await open(4);
 await capture(mobile,165,2,"4gb-gold-arch",4);
 await mobile.close();
 const classic=await open(8,"reflectionFinish=classic");
 const previous=await classic.evaluate(()=>window.__skyshiftReflectionFinishProbe());
 if(previous.requested||previous.reflectionFinish02642Active||
  !previous.sourceMetal||!previous.roadGGX||
  !previous.straightOnly||!previous.finalHDR||
  previous.amberBands!==20||previous.whiteSeal!==1)
  throw Error("0.26.4.2 classic does not restore 0.26.4.1 "+
   JSON.stringify(previous));
 await classic.close();
 if(errors.length)throw Error("0.26.4.2 actual WebGL shader errors: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.26.4.2 — native reflection high & 4GB, dark road and original lights");
}finally{await browser?.close();server.kill("SIGTERM");}
