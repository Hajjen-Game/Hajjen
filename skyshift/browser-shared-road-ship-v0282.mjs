// SKYSHIFT 0.28.2 — genuine Chromium/WebGL pixels, not concept images.
// Source scene, exact same camera position, one indexed road, one ship.
// Compare road-only, ship-only and combined native PBR responses.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const executable=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable",
 "/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!executable)throw Error("0.28.2 requires real Chromium");
const server=spawn("python3",["-m","http.server","8878","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const proof=[],errors=[];
function roi(a,b,rects){
 const w=a.width,h=a.height;let count=0,changed=0,brightness0=0,brightness1=0,
   whites0=0,whites1=0,cyanAdded=0,amberAdded=0;
 for(const [x0,y0,x1,y1] of rects)for(let y=Math.round(y0*h);y<Math.round(y1*h);y+=3)
 for(let x=Math.round(x0*w);x<Math.round(x1*w);x+=3){
  const i=(y*w+x)*4,ra=a.data[i],ga=a.data[i+1],ba=a.data[i+2],
   rb=b.data[i],gb=b.data[i+1],bb=b.data[i+2];
  const light0=.2126*ra+.7152*ga+.0722*ba,
   light1=.2126*rb+.7152*gb+.0722*bb;
  count++;brightness0+=light0;brightness1+=light1;
  if(Math.abs(rb-ra)+Math.abs(gb-ga)+Math.abs(bb-ba)>8)changed++;
  if(Math.min(ra,ga,ba)>239)whites0++;
  if(Math.min(rb,gb,bb)>239)whites1++;
  if(bb>ba+2&&gb>ga+2)cyanAdded++;
  if(rb>ra+2&&rb>gb*1.13)amberAdded++;
 }
 return {pixels:count,diffPct:+(100*changed/count).toFixed(2),
  meanBefore:+(brightness0/count).toFixed(3),
  meanAfter:+(brightness1/count).toFixed(3),
  whites0,whites1,cyanAdded,amberAdded};
}
function compare(frames,label,mobile){
 const raws=Object.fromEntries(Object.entries(frames)
  .filter(([k])=>["classic","road","ship","both"].includes(k))
  .map(([k,v])=>[k,PNG.sync.read(Buffer.from(v,"base64"))]));
 for(const key of ["classic","road","ship","both"]){
  if(raws[key].width!==raws.classic.width||
   raws[key].height!==raws.classic.height)
   throw Error("0.28.2 changed camera or render target");
  writeFileSync("skyshift-v0282-"+label+"-"+key+".png",
   Buffer.from(frames[key],"base64"));
 }
 const roadRoi=[[.08,.35,.43,.77],[.57,.35,.92,.77]];
 const shipRoi=[[.35,.69,.65,.94]];
 const entry={label,mobile,s:frames.s,
  road:roi(raws.classic,raws.road,roadRoi),
  ship:roi(raws.classic,raws.ship,shipRoi),
  combined:roi(raws.classic,raws.both,
   [[.08,.22,.92,.92]])};
 proof.push(entry);
 writeFileSync("skyshift-v0282-proof.json",JSON.stringify(proof,null,2));
 console.log("SHARED_OPTICS_0282 "+JSON.stringify(entry));
 if(entry.road.diffPct<.04)
  throw Error("0.28.2 road missing REAL source-dependent specular response");
 if(entry.ship.diffPct<.04)
  throw Error("0.28.2 physical ship silhouette unchanged");
 if(entry.combined.whites1>entry.combined.whites0*1.35+55)
  throw Error("0.28.2 reintroduced exterior white spill");
}
try{
 await sleep(650);
 browser=await chromium.launch({headless:true,executablePath:executable,
  args:["--no-sandbox","--disable-dev-shm-usage",
   "--enable-webgl","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader"]});
 async function capture(track,version,s,memory,classic=false){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  const name=track+"-"+(memory===4?"4GB":"High")+
   (classic?"-classic":"-shared")+"-"+s;
  page.on("pageerror",e=>errors.push(name+": "+e.message));
  page.on("console",m=>{if(m.type()==="error"&&
   /THREE.WebGLProgram|shader error|INVALID_OPERATION|compile failed/i.test(m.text()))
   errors.push(name+": "+m.text().slice(0,1800));});
  await page.addInitScript(v=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>v}),memory);
  const url="http://127.0.0.1:8878/skyshift/?track="+track+
   "&v="+version+
   "&sharedOpticsSmoke=1&sharedTunnelSmoke=1"+
   "&trackRepairSmoke=1&waveSmoke=1"+
   (classic?"&sharedRoadLight=classic&sharedShipLight=classic":"");
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:70000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:120000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:45000});
  if(Number.isFinite(s)){
   await page.evaluate(d=>window.__skyshiftTrackRepairTeleport(d),s);
   await page.evaluate(()=>window.__skyshiftWaveSmoke(1));
  }
  await page.waitForTimeout(850);
  const audit=await page.evaluate(()=>window.__skyshiftSharedOpticsAudit());
  if(!audit?.originalShip||!audit?.originalGrip||!audit?.physicsUnchanged)
   throw Error(name+" ship or GRIP regression "+JSON.stringify(audit));
  if(track==="vault"&&!classic&&version==="0.28.2"){
   if(!audit.originalSourceActive||!audit.road?.active||!audit.ship?.active||
    audit.road.sourceModules!==10||audit.ship.sourceModules!==10||
    audit.road.litVertices<150||
    audit.road.originalShader!=="patchCinematicRoadRebuild0263"||
    audit.road.addedDrawCalls!==0||audit.road.addedLights!==0||
    audit.ship.physicalHullMaterials<1||audit.ship.worldLightsAdded!==0)
    throw Error(name+" shared original source not active "+JSON.stringify(audit));
   const frames=await page.evaluate(()=>window.__skyshiftSharedOpticsFrameProof());
   compare(frames,name,memory===4);
  }else{
   if(audit.road?.active||audit.ship?.active)
    throw Error(name+" legacy or other track changed "+JSON.stringify(audit));
   await page.screenshot({path:"skyshift-v0282-"+name+".png"});
  }
  const hud=await page.locator("#topbar-track-name").textContent();
  if(track==="vault"&&version==="0.28.2"&&!classic&&
   !hud?.includes("0.28.2"))
   throw Error(name+" HUD did not display Vault's actual 0.28.2: "+hud);
  console.log("PASS_FRAME_0282 "+JSON.stringify({name,hud,
   road:audit.road?.stats?.()??audit.road,
   ship:audit.ship?.stats?.()??audit.ship}));
  await page.close();
 }
 for(const args of [
  ["vault","0.28.2",110,8,false],
  ["vault","0.28.2",1840,8,false],
  ["vault","0.28.2",3230,8,false],
  ["vault","0.28.2",110,4,false],
  ["vault","0.28.2",1910,4,false],
  ["vault","0.28.2",110,8,true],
  ["vault","0.28.1",110,8,false],
  ["skyline","0.26.5",120,8,false],
  ["aurora","0.28.2",120,8,false]
 ])await capture(...args);
 if(errors.length)throw Error("0.28.2 GPU errors: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.2 original shared road GGX & finite ship light High/4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
