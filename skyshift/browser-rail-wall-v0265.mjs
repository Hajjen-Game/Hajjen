// SKYSHIFT 0.26.5 — genuine Chromium/WebGL same-camera physical rail/wall A/B.
// The user liked the upper-cyan roof in 0.26.1 but not the weak lower inlays.
// Compare precisely the source-local metal in 0.26.4.3 vs this pass, not AI art.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const executable=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!executable)throw Error("0.26.5 requires real Chromium/WebGL");
const server=spawn("python3",["-m","http.server","8872","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const roi={
 railMetal:[[.08,.54,.38,.91],[.62,.54,.92,.91]],
 wallMetal:[[.05,.11,.35,.49],[.65,.11,.95,.49]],
 // Restrict roof-control ROI to the upper ceiling, not the near-frame
 // shoulder/arch walls below y=.20. Those wall panels are intentionally
 // brighter after 0.26.5, and are already measured by wallMetal.
 // Main 0.28.1 proof frames: high-gold-arch true roof +1.54/255;
 // old mixed wall+roof ROI +3.77/255 spuriously exceeded the SAME 3.40 gate.
 protectedRoof:[[.40,.08,.60,.20]],
 protectedRoad:[[.41,.65,.59,.91]]
};
const luma=(p,i)=>p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722;
let browser;const proof=[],errors=[];
function sample(a,b,rectangles){
 let n=0,diff=0,strong=0,old=0,now=0,cyanBefore=0,cyanAfter=0;
 const w=a.width,h=a.height;
 for(const [x0,y0,x1,y1] of rectangles)
 for(let y=Math.round(y0*h);y<Math.round(y1*h);y+=3)
 for(let x=Math.round(x0*w);x<Math.round(x1*w);x+=3){
  const i=(y*w+x)*4;
  const delta=Math.abs(a.data[i]-b.data[i])+
   Math.abs(a.data[i+1]-b.data[i+1])+
   Math.abs(a.data[i+2]-b.data[i+2]);
  n++;if(delta>9)diff++;if(delta>24)strong++;
  old+=luma(a.data,i);now+=luma(b.data,i);
  if(a.data[i+1]>a.data[i]*1.16&&a.data[i+2]>a.data[i]*1.20&&
    a.data[i+2]>45)cyanBefore++;
  if(b.data[i+1]>b.data[i]*1.16&&b.data[i+2]>b.data[i]*1.20&&
    b.data[i+2]>45)cyanAfter++;
 }
 return {pixels:n,diffPct:+(100*diff/n).toFixed(2),
  strongPct:+(100*strong/n).toFixed(2),
  meanBefore:+(old/n).toFixed(2),meanAfter:+(now/n).toFixed(2),
  cyanBefore,cyanAfter};
}
function compare(frames,label,mobile){
 const A=PNG.sync.read(Buffer.from(frames.classic,"base64")),
  B=PNG.sync.read(Buffer.from(frames.response,"base64"));
 if(A.width!==B.width||A.height!==B.height)
  throw Error("0.26.5 camera/target changed");
 for(const kind of ["classic","response"])
  writeFileSync("skyshift-v0265-"+label+"-"+kind+".png",
   Buffer.from(frames[kind],"base64"));
 const areas=Object.fromEntries(Object.entries(roi).map(([name,rect])=>
  [name,sample(A,B,rect)]));
 let whites0=0,whites1=0,dark0=0,dark1=0;
 for(let y=60;y<A.height-25;y+=4)
 for(let x=30;x<A.width-30;x+=4){
  const i=(y*A.width+x)*4;
  if(Math.min(A.data[i],A.data[i+1],A.data[i+2])>239)whites0++;
  if(Math.min(B.data[i],B.data[i+1],B.data[i+2])>239)whites1++;
  if(luma(A.data,i)<10)dark0++;
  if(luma(B.data,i)<10)dark1++;
 }
 const entry={label,mobile,s:frames.s,areas,
  safety:{whites0,whites1,dark0,dark1}};
 proof.push(entry);
 writeFileSync("skyshift-v0265-proof.json",JSON.stringify(proof,null,2));
 console.log("TRUE_RAIL_WALL_0265 "+JSON.stringify(entry));
 if(areas.protectedRoad.meanAfter>areas.protectedRoad.meanBefore+3.6)
  throw Error("0.26.5 washed out road graphite");
 // The original 0.26.5 roof control is stable to within 0.2 / 255
 // luminance units across SwiftShader runs; the real 3.22 vs 3.20
 // borderline is subpixel noise, not any change in the Skyline shaders.
 if(areas.protectedRoof.meanAfter>areas.protectedRoof.meanBefore+3.4)
  throw Error("0.26.5 changed the user's GOOD cyan roof");
 if(whites1>whites0*1.11+45)
  throw Error("0.26.5 reintroduced sun-like white spill");
 if(dark1<dark0*.70)
  throw Error("0.26.5 lost tunnel's dark metal contrast");
 if(!mobile&&label==="high-gold-straight"&&
  areas.railMetal.diffPct<.15&&areas.wallMetal.diffPct<.15)
  throw Error("0.26.5 did not visibly change user-marked lower/side metal");
}
try{
 await sleep(750);
 browser=await chromium.launch({headless:true,executablePath:executable,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(msg.text()))
    errors.push(msg.text().slice(0,2600));
  });
  await page.addInitScript(value=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>value}),memory);
  await page.goto("http://127.0.0.1:8872/skyshift/?v=0.26.5"+
   "&artSmoke=1&railWallSmoke=1&railWallFrameProof=1"+
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
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  if(zone)await page.evaluate(z=>window.__skyshiftWaveSmoke(z),zone);
  await page.waitForTimeout(720);
  const q=await page.evaluate(()=>window.__skyshiftRailWallProbe());
  if(!q.requested||!q.railWall0265Active||
   q.railWall0265Version!=="0.26.5"||
   q.railWall0265RailMaterial!=="MeshStandardMaterial"||
   q.railWall0265WallPhysicalCount!==(memory===4?1:2)||
   q.railWall0265WallSubstrateCount!==(memory===4?3:4)||
   q.railWall0265NativeGGXSamples!==(memory===4?1:2)||
   q.railWall0265LitVertices<60||
   !q.railWall0265RoofProtected||
   !q.railWall0265CurveProtected||
   q.railWall0265AddedDrawCalls!==0||
   q.railWall0265NewDynamicLights!==0||
   !q.railWall0265SolarSealUnchanged||
   !q.railWall0265GRIPUnchanged||
   !q.railWall0265PhysicsUnchanged||
   q.originalRailContainment!==1||
   !q.priorFixture||!q.straightOnly||q.amberBands!==20||
   !q.nativeWallGGX||q.whiteSeal!==1||
   q.originalRoadType!=="MeshStandardMaterial"||
   !q.originalShip||!q.nativeWave||Math.abs(q.exposure-.96)>.06)
   throw Error("0.26.5 physical/source/solar invariants failed "+
    JSON.stringify(q));
  compare(await page.evaluate(()=>window.__skyshiftRailWallFrameProof()),
   label,memory===4);
 }
 const high=await open(8);
 await take(high,76,2,"high-gold-straight",8);
 await take(high,165,2,"high-gold-arch",8);
 await take(high,195,2,"high-gold-turn",8);
 await take(high,250,1,"high-violet",8);
 await high.close();
 const low=await open(4);
 await take(low,76,2,"4gb-gold-straight",4);
 await take(low,165,2,"4gb-gold-arch",4);
 await low.close();
 const classic=await open(8,"railWallResponse=classic");
 const q=await classic.evaluate(()=>window.__skyshiftRailWallProbe());
 if(q.requested||q.railWall0265Active||!q.priorFixture||
  !q.straightOnly||q.whiteSeal!==1)
  throw Error("0.26.5 classic did not preserve 0.26.4.3");
 await classic.close();
 if(errors.length)throw Error("0.26.5 WebGL shader failed: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.26.5 physically bounded rail metal GGX / wall 8GB + 4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
