// SKYSHIFT 0.28.3 — real Chromium/WebGL visual proof, not generated art.
// Main centered boost chevrons must bloom on the actual PBR road, while
// auxiliary SAFE/RISK side pads and their approach stripes must disappear.
// Skyline and published 0.28.2 visual/boost behavior remain unaffected.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const executable=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!executable)throw Error("0.28.3 requires genuine Chromium WebGL");
const server=spawn("python3",["-m","http.server","8873","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],frames=[],proof=[];
function stats(png){
 const {width:w,height:h,data}=png;
 // Physically projected incoming boost pads occupy the central racing deck.
 let warm=0,white=0,dark=0,samples=0,br=0;
 for(let y=Math.floor(h*.42);y<Math.floor(h*.79);y+=3)
 for(let x=Math.floor(w*.27);x<Math.floor(w*.73);x+=3){
  const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2];
  const light=.2126*r+.7152*g+.0722*b;
  samples++;br+=light;
  if(r>70&&r>g*1.12&&r>b*1.42)warm++;
  if(r>245&&g>245&&b>245)white++;
  if(light<20)dark++;
 }
 return {warm,white,dark,samples,mean:+(br/samples).toFixed(2)};
}
function compare(base,current){
 let changed=0,pixels=0,centralChanged=0;
 const {width:w,height:h}=base;
 if(w!==current.width||h!==current.height)throw Error("0.28.3 camera res changed");
 for(let y=Math.floor(h*.43);y<Math.floor(h*.83);y+=3)
 for(let x=Math.floor(w*.18);x<Math.floor(w*.82);x+=3){
  const i=(y*w+x)*4;
  const delta=Math.abs(base.data[i]-current.data[i])+
   Math.abs(base.data[i+1]-current.data[i+1])+
   Math.abs(base.data[i+2]-current.data[i+2]);
  pixels++;if(delta>18)changed++;
  if(x>w*.3&&x<w*.7&&delta>18)centralChanged++;
 }
 return {pixels,changed,centralChanged,changedPct:+(100*changed/pixels).toFixed(2)};
}
try{
 await sleep(700);
 browser=await chromium.launch({headless:true,executablePath:executable,
  args:["--no-sandbox","--disable-dev-shm-usage",
   "--enable-webgl","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader"]});
 async function frame(track,version,memory,at){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  const key=track+"-"+version+"-"+(memory===4?"4GB":"High")+"-"+at;
  page.on("pageerror",err=>errors.push(key+": "+err.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/THREE.WebGLProgram|shader error|INVALID_OPERATION|compile failed/i.test(m.text()))
    errors.push(key+": "+m.text().slice(0,1600));
  });
  await page.addInitScript(value=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>value}),memory);
  const url="http://127.0.0.1:8873/skyshift/?track="+track+"&v="+version+
   "&trackRepairSmoke=1&riskSmoke=1&vaultBoostSmoke=1"+
   "&sharedOpticsSmoke=1";
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:70000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:120000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:45000});
  await page.evaluate(d=>window.__skyshiftTrackRepairTeleport(d),at);
  await page.waitForTimeout(550);
  const audit=await page.evaluate(()=>({
   v:window.__skyshiftVaultBoostAudit(),
   risk:window.__skyshiftRiskProbe(),
   optics:window.__skyshiftSharedOpticsAudit()
  }));
  const hud=await page.locator("#topbar-track-name").textContent();
  if(track==="vault"&&version==="0.28.3"){
   if(!audit.v?.active||audit.v.padCount!==5||audit.v.riskGateCount!==0||
    audit.v.physicalPads.some(p=>p.kind==="risk"||
      p.id.endsWith("-safe")||p.id.endsWith("-risk"))||
    !hud?.includes("0.28.3")||
    !audit.optics?.road?.active||!audit.optics?.ship?.active||
    !audit.optics?.originalSourceActive)
    throw Error(key+" incorrect actual boost/lighting installation "+JSON.stringify({hud,audit}));
   const physics=await page.evaluate(()=>({
    center:window.__skyshiftRiskPhysicsSmoke("safe"),
    side:window.__skyshiftRiskPhysicsSmoke("risk")
   }));
   if(physics.center.picked?.kind!=="boost"||
    physics.side.picked!==null||
    physics.side.activationCount!==0)
    throw Error(key+" old mini/risk boosts still in physics "+JSON.stringify(physics));
  }else if(track==="vault"&&version==="0.28.2"){
   if(audit.v?.active||audit.v?.padCount!==11||
    audit.v?.riskGateCount!==5)throw Error("historical Vault boost changed");
  }else if(track==="skyline"){
   if(audit.v?.active||audit.v?.padCount!==11||
    audit.v?.riskGateCount!==5)throw Error("original Skyline changed");
  }
  const raw=await page.screenshot({path:"skyshift-v0283-"+key+".png",
   timeout:30000});
  const png=PNG.sync.read(raw);
  const result={key,track,version,memory,at,hud,boost:audit.v,
   pixels:stats(png)};
  frames.push({key,png,result});proof.push(result);
  console.log("BOOST_VAULT_0283 "+JSON.stringify(result));
  await page.close();
 }
 for(const args of [
  ["vault","0.28.2",8,37],
  ["vault","0.28.3",8,37],
  ["vault","0.28.3",8,680],
  ["vault","0.28.3",8,2182],
  ["vault","0.28.3",4,37],
  ["skyline","0.26.5",8,37]
 ])await frame(...args);
 const old=frames.find(f=>f.key==="vault-0.28.2-High-37"),
  updated=frames.find(f=>f.key==="vault-0.28.3-High-37");
 const difference=compare(old.png,updated.png);
 if(difference.changedPct<.5||difference.centralChanged<45)
  throw Error("0.28.3 arrow artwork not visibly different in actual native road "+JSON.stringify(difference));
 if(updated.result.pixels.white>old.result.pixels.white*2+90)
  throw Error("0.28.3 boosted chevrons introduced neutral white spill");
 proof.push({comparison:difference});
 writeFileSync("skyshift-v0283-boost-proof.json",JSON.stringify(proof,null,2));
 if(errors.length)throw Error("0.28.3 WebGL errors: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.3 Vault main boost glow, no risk pads, High/4GB & Skyline legacy");
}finally{await browser?.close();server.kill("SIGTERM");}
