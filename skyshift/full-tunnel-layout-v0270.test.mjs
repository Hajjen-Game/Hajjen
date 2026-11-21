import test from "node:test";
import assert from "node:assert/strict";
import {VAULT_SECTIONS_0270,VAULT_ELEVATION_KEYS_0270,VAULT_SECTORS_0270,
 FULL_TUNNEL_LAYOUT_0270,validateVaultLayout0270}
 from "./full-tunnel-layout-v0270.mjs";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const read=x=>readFileSync(new URL(x,import.meta.url),"utf8");
function subTrack(track){
 const code=[
  "globalThis.location={search:'?track=REPLACE_TRACK&v=0.27.0'};",
  "const [sel,c,t]=await Promise.all([",
  "import('./skyshift/track-selection-v0160.mjs'),",
  "import('./skyshift/circuit-layout-v0160.mjs'),",
  "import('./skyshift/trial-v0165.mjs')]);",
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
  {cwd:new URL("../",import.meta.url).pathname,encoding:"utf8",timeout:25000});
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
 const tr=read("./track-selection-v0160.mjs"),
  g=read("./game-v0210.mjs"),h=read("./index.html");
 assert.match(tr,/id:"vault",name:"NEON VAULT CIRCUIT"/);
 assert.match(h,/<option value="vault">03 · NEON VAULT/);
 assert.match(g,/installFullTunnelCircuit0270/);
 assert.match(g,/fullTunnelFoundationEnabled=isVault\(\)/);
 assert.match(g,/__skyshiftFullTunnelProbe/);
 assert.match(g,/!isVault\(\)&&inShadowTunnel/);
 assert.match(g,/selected==="vault"\?"0\.27\.(?:0|1)"/);
 assert.match(g,/compareBeforeRailWallResponse/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.5/);
});
