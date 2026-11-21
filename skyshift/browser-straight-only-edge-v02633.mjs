// SKYSHIFT 0.26.3.3 straight-only rail light visual QA, genuine WebGL.
// Same camera and color zone: road highlights only from authored straights,
// while amber arch footlights, native wave, solar seal and physics survive.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.26.3.3 requires real Chromium/WebGL");
const server=spawn("python3",["-m","http.server","8866","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],report=[];
const lum=(p,i)=>p[i]*.213+p[i+1]*.715+p[i+2]*.072;
function analyze(data,label,mobile){
 const A=PNG.sync.read(Buffer.from(data.off,"base64"));
 const B=PNG.sync.read(Buffer.from(data.straightOnly,"base64"));
 const M=PNG.sync.read(Buffer.from(data.roadMask,"base64"));
 const E=PNG.sync.read(Buffer.from(data.emptyMask,"base64"));
 if([B,M,E].some(p=>p.width!==A.width||p.height!==A.height))
  throw Error("0.26.3.3 screenshot resolution changed");
 for(const mode of ["off","straightOnly"])
  writeFileSync("skyshift-v02633-"+label+"-"+mode+".png",
   Buffer.from(data[mode],"base64"));
 const W=A.width,H=A.height;
 let road=0,roadDiff=0,outside=0,outDiff=0,roadBefore=0,roadAfter=0,
  whiteBefore=0,whiteAfter=0;
 for(let y=Math.floor(H*.10);y<Math.floor(H*.94);y+=3)
 for(let x=Math.floor(W*.025);x<Math.floor(W*.975);x+=3){
  const i=(y*W+x)*4;
  const isRoad=Math.abs(M.data[i]-E.data[i])+
   Math.abs(M.data[i+1]-E.data[i+1])+
   Math.abs(M.data[i+2]-E.data[i+2])>125;
  const d=Math.abs(A.data[i]-B.data[i])+
   Math.abs(A.data[i+1]-B.data[i+1])+
   Math.abs(A.data[i+2]-B.data[i+2]);
  if(isRoad){road++;roadBefore+=lum(A.data,i);roadAfter+=lum(B.data,i);
   if(d>12)roadDiff++;
  }else{outside++;if(d>12)outDiff++;}
  if(Math.min(A.data[i],A.data[i+1],A.data[i+2])>240)whiteBefore++;
  if(Math.min(B.data[i],B.data[i+1],B.data[i+2])>240)whiteAfter++;
 }
 const stats={label,mobile,road,roadDiff,outside,outDiff,
  whiteBefore,whiteAfter,trackS:data.trackS,
  meanRoadBefore:+(roadBefore/Math.max(1,road)).toFixed(2),
  meanRoadAfter:+(roadAfter/Math.max(1,road)).toFixed(2)};
 report.push(stats);
 writeFileSync("skyshift-v02633-proof.json",JSON.stringify(report,null,2));
 console.log("STRAIGHT_ONLY_02633 "+JSON.stringify(stats));
 if(road<200||outside<400||outDiff<15)
  throw Error("0.26.3.3 original rail/foot fixtures invisible "+JSON.stringify(stats));
 if(stats.meanRoadAfter>stats.meanRoadBefore+8.5)
  throw Error("0.26.3.3 road is washed out "+JSON.stringify(stats));
 if(whiteAfter>whiteBefore*1.12+30)
  throw Error("0.26.3.3 white solar spill reappeared "+JSON.stringify(stats));
}
try{
 await sleep(700);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function start(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(msg.text()))
    errors.push(msg.text().slice(0,2600));
  });
  await page.addInitScript(value=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>value}),memory);
  await page.goto("http://127.0.0.1:8866/skyshift/?v=0.26.3.3"+
   "&artSmoke=1&straightEdgeSmoke=1&straightEdgeFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function take(page,s,zone,label,memory){
  await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),s);
  if(zone)await page.evaluate(v=>window.__skyshiftWaveSmoke(v),zone);
  await page.waitForTimeout(720);
  const state=await page.evaluate(()=>window.__skyshiftStraightEdgeProbe());
  const safe=state.straightEdges02633SafeRanges||[];
  if(!state.requested||!state.straightEdges02633Active||
   state.straightEdges02633Status!=="active"||
   state.straightEdges02633Version!=="0.26.3.3"||
   state.straightEdges02633AmberBands!==20||
   state.straightEdges02633AmberSources!==20||
   state.straightEdges02633Segments>14||
   state.straightEdges02633Segments<8||
   state.straightEdges02633LitMeters>115||
   safe.length<1||safe[0].to>148.2||
   state.straightEdges02633CyanWidth!==.18||
   state.straightEdges02633GGXSamples!==(memory===4?1:2)||
   state.straightEdges02633LowMemory!==(memory===4)||
   state.straightEdges02633NewLights!==0||
   state.straightEdges02633NewColliders!==0||
   !state.straightEdges02633CurveArrowsUnchanged||
   !state.straightEdges02633GRIPUnchanged||
   !state.straightEdges02633PhysicsUnchanged||
   !state.straightEdges02633SolarSealed||
   !state.straightEdges02633NativeWaveUnchanged||
   !state.straightEdges02633AmberUnchanged||
   !state.previousRoad||state.originalRoadMaterial!=="MeshStandardMaterial"||
   state.solarSeal!==1||state.premiumRoadSeal!==1||
   !state.originalShip||!state.originalRail||!state.nativeWave)
   throw Error("0.26.3.3 authored straight/curve and flight invariants "+
    JSON.stringify(state));
  const frame=await page.evaluate(()=>window.__skyshiftStraightEdgeFrameProof());
  analyze(frame,label,memory===4);
 }
 const high=await start(8);
 await take(high,76,2,"high-gold-straight",8);
 await take(high,195,2,"high-gold-corner",8);
 await take(high,250,1,"high-violet-corner",8);
 await high.close();
 const mobile=await start(4);
 await take(mobile,76,2,"4gb-gold-straight",4);
 await take(mobile,195,2,"4gb-gold-corner",4);
 await mobile.close();
 const classic=await start(8,"straightEdges=classic");
 const old=await classic.evaluate(()=>window.__skyshiftStraightEdgeProbe());
 if(old.requested||old.straightEdges02633Active||
  !old.edgeSources02632Active||!old.originalShip||old.solarSeal!==1)
  throw Error("0.26.3.3 classic fallback did not restore 0.26.3.2 "+
   JSON.stringify(old));
 await classic.close();
 if(errors.length)throw Error("0.26.3.3 shader/WebGL errors: "+errors.join(" | "));
 console.log("PASS 0.26.3.3 REAL 8GB/4GB — straight-only cyan, curves unlit, amber original");
}finally{await browser?.close();server.kill("SIGTERM");}
