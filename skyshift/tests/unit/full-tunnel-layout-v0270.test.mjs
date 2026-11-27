import test from "node:test";
import assert from "node:assert/strict";
import {VAULT_SECTIONS_0270,VAULT_ELEVATION_KEYS_0270,VAULT_SECTORS_0270,
 FULL_TUNNEL_LAYOUT_0270,validateVaultLayout0270}
 from "../../tracks/vault/full-tunnel-layout-v0270.mjs";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const read=x=>readFileSync(new URL("../../"+x,import.meta.url),"utf8");
function subTrack(track){
 const code=[
  "globalThis.location={search:'?track=REPLACE_TRACK&v=0.27.0'};",
  "const [sel,c,t]=await Promise.all([",
  "import('./skyshift/tracks/shared/track-selection-v0160.mjs'),",
  "import('./skyshift/tracks/shared/circuit-layout-v0160.mjs'),",
  "import('./skyshift/tracks/trials/trial-v0165.mjs')]);",
  "const {CIRCUIT,COURSE_SEGMENTS}=c;",
  "const {poseAt,headingAt,bankAt,elevationAudit,TRIAL,GAPS,GRIP_APEX,LOOP_CLOSURE_ERROR_METERS,widthAt}=t;",
  "const a=poseAt(0),b=poseAt(3400);",
  "const p={track:sel.ACTIVE_TRACK_0160.id,name:sel.ACTIVE_TRACK_0160.name,",
  "len:CIRCUIT.lapLength,race:TRIAL.raceLength,segments:COURSE_SEGMENTS.length,",
  "totalPlan:COURSE_SEGMENTS.reduce((s,x)=>s+x.length,0),",
  "start:[a.x,a.y,a.z],end:[b.x,b.y,b.z],yaw:headingAt(3400)-headingAt(0),",
  "bank:[bankAt(0),bankAt(3400)],height:elevationAudit(),",
  "closure:LOOP_CLOSURE_ERROR_METERS,gaps:GAPS.length,",
  "width:widthAt(900),apex:GRIP_APEX.id};",
  "console.log(JSON.stringify(p));"
 ].join("\n").replace("REPLACE_TRACK",track);
 const cmd=spawnSync(process.execPath,["--input-type=module","-e",code],
  {cwd:new URL("../../"+"../",import.meta.url).pathname,encoding:"utf8",timeout:25000});
 assert.equal(cmd.status,0,cmd.stderr?.slice(0,3000));
 return JSON.parse(cmd.stdout.trim().split("\n").at(-1));
}
test("0.27.0 authored mirrored C2 segments close 3400m loop analytically",()=>{
 const x=validateVaultLayout0270();
 assert.equal(x.length,3400);assert.equal(x.halfLength,1700);
 assert.ok(Math.abs(x.halfYaw-Math.PI)<1e-10);
 assert.ok(Math.abs(x.totalYaw-2*Math.PI)<1e-10);
 assert.equal(x.startsAtZero,true);assert.equal(x.closedElevation,true);
 assert.equal(x.nonnegativeHold,true);assert.equal(x.mirroredHalves,true);
 assert.equal(VAULT_SECTIONS_0270.length,16);
 assert.equal(VAULT_SECTIONS_0270.filter(x=>x[2]!==0).length,8);
 assert.equal(VAULT_ELEVATION_KEYS_0270[0][0],0);
 assert.equal(VAULT_SECTORS_0270.at(-1).end,3400);
 assert.equal(FULL_TUNNEL_LAYOUT_0270.tunnelMeters,3400);
 assert.equal(FULL_TUNNEL_LAYOUT_0270.raceMeters,10200);
});
test("runtime uses separate Vault geometry, same physics and closed race",()=>{
 const x=subTrack("vault");
 assert.equal(x.track,"vault");
 assert.equal(x.name,"NEON VAULT CIRCUIT");
 assert.equal(x.len,3400);assert.equal(x.race,10200);
 assert.equal(x.totalPlan,3400);assert.equal(x.segments,16);
 assert.ok(Math.abs(x.yaw-2*Math.PI)<1e-8);
 assert.ok(x.closure<.3,"raw C2 path closure correction "+x.closure);
 assert.ok(Math.hypot(x.end[0]-x.start[0],x.end[2]-x.start[2])<1e-9);
 assert.equal(x.end[1],x.start[1]);
 assert.equal(x.bank[0],0);assert.equal(x.bank[1],0);
 assert.equal(x.gaps,0);assert.equal(x.width,23.2);
 assert.equal(x.apex,"no-narrow-apex");
});
test("Skyline and Aurora retain original profiles and challenges",()=>{
 const a=subTrack("skyline"),b=subTrack("aurora");
 assert.equal(a.track,"skyline");assert.equal(b.track,"aurora");
 assert.equal(a.segments,15);assert.equal(b.segments,12);
 assert.equal(a.gaps,1);assert.equal(b.gaps,0);
 assert.equal(a.apex,"precision-grip-apex");
 assert.equal(b.apex,"no-narrow-apex");
 assert.ok(Math.abs(a.yaw-2*Math.PI)<1e-8);
 assert.ok(Math.abs(b.yaw-2*Math.PI)<1e-8);
});
test("0.27.0 menu/QA routes keep original 0.26.5 branch",()=>{
 const tr=read("./tracks/shared/track-selection-v0160.mjs"),
  g=read("./game-v0210.mjs"),h=read("./index.html");
 assert.match(tr,/id:"vault",name:"NEON VAULT CIRCUIT"/);
 assert.match(h,/<option value="vault">03 · NEON VAULT/);
 assert.match(g,/installFullTunnelCircuit0270/);
 assert.match(g,/fullTunnelFoundationEnabled=isVault\(\)/);
 assert.match(g,/__skyshiftFullTunnelProbe/);
 assert.match(g,/!isVault\(\)&&inShadowTunnel/);
 assert.match(g,/selected==="vault"\?PRODUCTION_TRACK\.version:SKYSHIFT_BUILD_VERSION/);
 const catalog=read("./tracks/shared/production-catalog.mjs");
 assert.match(catalog,/id:\x27vault\x27,version:\x270\.(?:27|28)\.\d+(?:\.\d+)?\x27/);
 assert.match(g,/compareBeforeRailWallResponse/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.5/);
});

test("Vault third bend: live deck shares full 23.2m width and every vertex with physics",()=>{
 const code=`
 globalThis.location={search:'?track=vault&v=0.28.9.11'};
 const assert=(await import('node:assert/strict')).default;
 const route=await import('./skyshift/tracks/trials/trial-v0165.mjs');
 const legacy=await import('./skyshift/tracks/trials/trial-v0160.mjs');
 const {premiumTrackCoordinates}=await import('./skyshift/rendering/road/premium-track-v0160.mjs');
 const {authoritativeDeckEnabled028911,PRODUCTION_TRACK}=await import('./skyshift/tracks/shared/production-catalog.mjs');
 assert.equal(authoritativeDeckEnabled028911('?track=vault&v='+PRODUCTION_TRACK.version),true);
 assert.equal(authoritativeDeckEnabled028911('?track=vault&v=0.28.9.10'),false);
 assert.equal(authoritativeDeckEnabled028911('?track=skyline&v=0.28.9.11'),false);
 assert.equal(legacy.widthAt(847),14);
 assert.equal(route.widthAt(847),23.2);
 const previous=premiumTrackCoordinates(),fixed=premiumTrackCoordinates(route);
 const {data,coords}=fixed;
 assert.deepEqual(data.indices,previous.data.indices);
 for(let row=0;row<data.rows;row++){
  const s=row*route.TRIAL.length/(data.rows-1);
  const w=route.widthAt(s);
  for(let col=0;col<data.cols;col++){
   const k=row*data.cols+col,l=w*(col/(data.cols-1)-.5);
   const p=route.positionAt(s,l,0);
   assert.ok(Math.abs(coords[2*k]-s)<1e-8);
   assert.ok(Math.abs(coords[2*k+1]-l)<1e-8);
   assert.ok(Math.hypot(data.positions[3*k]-p.x,data.positions[3*k+1]-p.y,data.positions[3*k+2]-p.z)<1e-7);
  }
 }
 const row=Math.round(847*(data.rows-1)/route.TRIAL.length),first=row*data.cols;
 assert.equal(coords[2*(first+data.cols-1)+1]-coords[2*first+1],23.2);
 assert.equal(previous.coords[2*(first+data.cols-1)+1]-previous.coords[2*first+1],14);
 console.log('actual 847m deck: 14m -> 23.2m; all rows match current route');
 `;
 const cmd=spawnSync(process.execPath,["--input-type=module","-e",code],
  {cwd:new URL("../../"+"../",import.meta.url).pathname,encoding:"utf8",timeout:25000});
 assert.equal(cmd.status,0,cmd.stderr?.slice(0,3000));
 assert.match(cmd.stdout,/14m -> 23.2m/);
});

test("0.29.0 opt-in chamber, real gap and shared ballistic flight",()=>{
 const code=`
 globalThis.location={search:'?track=vault&v=0.28.9.11&vaultJump=1'};
 const assert=(await import('node:assert/strict')).default;
 const route=await import('./skyshift/tracks/trials/trial-v0165.mjs');
 const {VAULT_MEGA_JUMP:j,VAULT_MEGA_JUMP_ACTIVE,megaJumpRise,megaJumpGrade,chamberProfileAt,vaultMegaJumpEnabled}=await import('./skyshift/tracks/vault/vault-mega-jump.mjs');
 const {createTunnelProfileSampler}=await import('./skyshift/tunnel/profile-sampler.mjs');
 const {premiumTrackCoordinates}=await import('./skyshift/rendering/road/premium-track-v0160.mjs');
 assert.equal(VAULT_MEGA_JUMP_ACTIVE,true);
 assert.equal(vaultMegaJumpEnabled('?track=vault&v=0.28.9.11'),false);
 assert.equal(vaultMegaJumpEnabled('?track=skyline&v=0.28.9.11&vaultJump=1'),false);
 assert.equal(route.GAPS.length,1);
 assert.equal(route.GAPS[0].id,j.id);
 for(let lap=0;lap<3;lap++){
  const s=lap*3400+j.start;
  assert.ok(route.onRoad(s-1,0));assert.ok(!route.onRoad(s+1,0));
  assert.ok(route.onRoad(lap*3400+j.end+1,0));
 }
 assert.equal(megaJumpRise(j.chamberStart),0);
 assert.equal(megaJumpRise(j.chamberEnd),0);
 assert.equal(megaJumpGrade(j.chamberStart),0);
 assert.equal(megaJumpGrade(j.chamberEnd),0);
 assert.deepEqual(chamberProfileAt(j.start,12,.1),[12,.1]);
 assert.ok(chamberProfileAt(j.start,20,20)[0]>24);
 assert.ok(chamberProfileAt(j.start,0,30)[1]>45);
 assert.deepEqual(chamberProfileAt(j.chamberEnd,20,20),[20,20]);
 const source=createTunnelProfileSampler(route.positionAt,chamberProfileAt);
 assert.deepEqual(source(j.start,12,.1),route.positionAt(j.start,12,.1));
 const {data,coords}=premiumTrackCoordinates(route);
 for(let i=0;i<data.indices.length;i+=3){
  const ds=data.indices.slice(i,i+3).map(k=>coords[k*2]);
  assert.ok((Math.min(...ds)+Math.max(...ds))/2<j.start||(Math.min(...ds)+Math.max(...ds))/2>=j.end,'deck triangle inside gap');
 }
 for(const stage of [0,4,8]){
  const st=route.newFlightState(),s=j.start-24,p=route.positionAt(s);
  Object.assign(st,{s,worldX:p.x,worldZ:p.z,heading:route.headingAt(s),y:route.surfaceHeightAt(s)+route.TRIAL.hoverHeight,zoneSpeedStage:stage,zoneCruiseSpeed:route.speedAt(s,stage),currentSpeed:route.speedAt(s,stage),checkpoint:1020,checkpointsPassed:3});
  for(let i=0;i<1200&&!st.cleanLeapLandings&&!st.falls;i++){
   const rolling=!st.grounded&&!st.trickReady;
   route.stepFlight(st,1/120,{grip:rolling,steer:rolling?.65:0});
  }
  assert.equal(st.autoLaunches,1,'stage '+stage);
  assert.equal(st.falls,0,'stage '+stage);
  assert.equal(st.cleanLeapLandings,1,'stage '+stage);
  assert.equal(st.trickFullRotations,1,'stage '+stage);
  assert.equal(st.landingBoostActivations,1,'stage '+stage+' '+st.lastTrickFailReason);
  assert.ok(st.s<j.chamberEnd,'landing after chamber');
 }
 console.log('actual opt-in route: three speed stages, roll and clean landing');
 `;
 const cmd=spawnSync(process.execPath,["--input-type=module","-e",code],
  {cwd:new URL("../../"+"../",import.meta.url).pathname,encoding:"utf8",timeout:25000});
 assert.equal(cmd.status,0,cmd.stderr?.slice(0,3000));
 assert.match(cmd.stdout,/three speed stages/);
});
