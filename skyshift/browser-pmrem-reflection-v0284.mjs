// SKYSHIFT 0.28.4 — REAL Chromium/WebGL PMREM A/B.
// No generated/promotional images: each frame comes from the game canvas,
// same ship, same camera and same 120 Hz frozen race pose before and after.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.28.4 requires genuine Chromium WebGL");
const server=spawn("python3",["-m","http.server","8874","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const errors=[],proof=[];
function measure(a,b,rects){
 if(a.width!==b.width||a.height!==b.height)
  throw Error("0.28.4 camera/resolution differs in exact-frame A/B");
 let n=0,diff=0,mean0=0,mean1=0,white0=0,white1=0;
 const w=a.width,h=a.height;
 for(const [x0,y0,x1,y1] of rects)
 for(let y=Math.floor(h*y0);y<Math.ceil(h*y1);y+=3)
 for(let x=Math.floor(w*x0);x<Math.ceil(w*x1);x+=3){
  const i=(y*w+x)*4;
  const a0=a.data[i],a1=a.data[i+1],a2=a.data[i+2],
    b0=b.data[i],b1=b.data[i+1],b2=b.data[i+2];
  const la=.2126*a0+.7152*a1+.0722*a2,
   lb=.2126*b0+.7152*b1+.0722*b2;
  n++;mean0+=la;mean1+=lb;
  if(Math.abs(a0-b0)+Math.abs(a1-b1)+Math.abs(a2-b2)>8)diff++;
  if(Math.min(a0,a1,a2)>242)white0++;
  if(Math.min(b0,b1,b2)>242)white1++;
 }
 return {pixels:n,changed:diff,changedPct:+(100*diff/n).toFixed(3),
  meanBefore:+(mean0/n).toFixed(3),meanAfter:+(mean1/n).toFixed(3),
  whiteBefore:white0,whiteAfter:white1};
}
const wallRoi=[[.03,.18,.35,.58],[.65,.18,.97,.58]];
const shipRoi=[[.34,.68,.66,.94]];
const roadRoi=[[.28,.40,.72,.83]];
async function boot(track,version,memory){
 const page=await browser.newPage({viewport:{width:1536,height:870}});
 const name=track+"-"+version+"-"+(memory===4?"4GB":"High");
 page.on("pageerror",e=>errors.push(name+": "+e.message));
 page.on("console",m=>{
  if(m.type()==="error"&&/THREE.WebGLProgram|shader error|INVALID_OPERATION|compile failed/i.test(m.text()))
   errors.push(name+": "+m.text().slice(0,1800));
 });
 await page.addInitScript(v=>Object.defineProperty(navigator,
  "deviceMemory",{configurable:true,get:()=>v}),memory);
 const url="http://127.0.0.1:8874/skyshift/?track="+track+
  "&v="+version+"&pmremSmoke=1&trackRepairSmoke=1&sharedTunnelSmoke=1";
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:70000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:140000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:45000});
 return {page,name};
}
async function probe(page,name,s,{expected=false}={}){
 await page.evaluate(distance=>window.__skyshiftTrackRepairTeleport(distance),s);
 await page.waitForTimeout(550);
 const audit=await page.evaluate(()=>window.__skyshiftPmremAudit());
 if(!audit?.originalShip||!audit?.originalGrip||
   audit.changedPhysics||audit.changedBoost||audit.addedRenderPasses!==0)
  throw Error(name+" geometry/physics/GRIP altered "+JSON.stringify(audit));
 if(expected){
  const v=audit.probe;
  if(!audit.requested||!audit.originalTunnelActive||
   !audit.roadSourceActive||!audit.shipSourceActive||
   !v?.active||!v?.genuinePmrem||
   v?.method!=="PMREMGenerator.fromScene"||
   v.tunnelMaterials<10||v.shipMaterials<1||
   v.sourceLocalGGXPreserved!==true||
   v.roadTouched||v.boostTouched||v.addedLights||
   v.updatesEachFrame!==0||v.fullTrackDynamicProbe!==false)
   throw Error(name+" not genuine physically filtered Vault PMREM "+JSON.stringify(audit));
  if(v.faceSize!==(name.includes("4GB")?128:256))
   throw Error(name+" quality profile ungrounded "+JSON.stringify(v));
  const f=await page.evaluate(()=>window.__skyshiftPmremFrameProof());
  if(!f?.classic||!f?.pmrem)throw Error(name+" exact frame proof absent");
  const before=Buffer.from(f.classic,"base64"),
   after=Buffer.from(f.pmrem,"base64");
  writeFileSync("skyshift-v0284-"+name+"-"+s+"-classic.png",before);
  writeFileSync("skyshift-v0284-"+name+"-"+s+"-pmrem.png",after);
  const b0=PNG.sync.read(before),b1=PNG.sync.read(after);
  const record={name,s,pmrem:v,
   wall:measure(b0,b1,wallRoi),
   ship:measure(b0,b1,shipRoi),
   road:measure(b0,b1,roadRoi)};
  proof.push(record);
  console.log("VAULT_PMREM_0284 "+JSON.stringify(record));
  if(record.wall.changedPct<.025||record.ship.changedPct<.015)
   throw Error(name+" PMREM not visually affecting REAL tunnel and ship "+JSON.stringify(record));
  if(record.road.meanAfter>record.road.meanBefore+5.0)
   throw Error(name+" washed out black road with environment radiance");
  if(record.wall.whiteAfter>record.wall.whiteBefore*1.5+65)
   throw Error(name+" added neutral white spill to sealed tunnel");
  if(record.ship.whiteAfter>record.ship.whiteBefore*1.5+60)
   throw Error(name+" added white exterior light to ship");
 }else{
  if(audit.requested||audit.probe?.active)
   throw Error(name+" modified baseline/Aurora/Skyline "+JSON.stringify(audit));
  await page.screenshot({path:"skyshift-v0284-"+name+"-"+s+".png"});
  proof.push({name,s,baseline:true});
  console.log("PASS_BASELINE_0284 "+JSON.stringify({name,s,probe:audit.probe}));
 }
 writeFileSync("skyshift-v0284-proof.json",JSON.stringify(proof,null,2));
}
try{
 await sleep(700);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage",
   "--enable-webgl","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader"]});
 for(const [track,v,memory,positions,expected] of [
  ["vault","0.28.4",8,[110,1840,3230],true],
  ["vault","0.28.4",4,[110,1840],true],
  ["vault","0.28.3",8,[110],false],
  ["skyline","0.26.5",8,[110],false],
  ["aurora","0.28.4",8,[110],false]
 ]){
  const {page,name}=await boot(track,v,memory);
  for(const s of positions)await probe(page,name,s,{expected});
  await page.close();
 }
 if(errors.length)throw Error("0.28.4 PMREM WebGL/shader errors: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.4 native live-scene PMREM High/4GB with isolated baselines");
}finally{await browser?.close();server.kill("SIGTERM");}
