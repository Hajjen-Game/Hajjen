// SKYSHIFT 0.10.3 — Shadow Tunnel authored layout, glow shader, release safety.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {CIRCUIT,positionAt,TRIAL} from "../../trial-v0901.mjs";
import {MAGNETIC_WALL,CORKSCREW,SKYLINE_LEAP} from "../../track-3d-v082.mjs";
import {ZONE_PALETTES} from "../../zone-wave-v060.mjs";
import {SHADOW_TUNNEL,TUNNEL_SECTION,inShadowTunnel,tunnelIntensityAt,
 createShadowTunnelData,shadeTunnelRoadGLSL} from "../../shadow-tunnel-v092.mjs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const near=(a,b,eps=.00001)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
test("shadow tunnel is long, well after start, beyond wall, before corkscrew",()=>{
 assert.equal(CIRCUIT.lapLength,3400);
 assert.equal(SHADOW_TUNNEL.start,2050);
 assert.equal(SHADOW_TUNNEL.end,2810);
 assert.equal(SHADOW_TUNNEL.lengthMeters,760);
 assert.ok(SHADOW_TUNNEL.start>MAGNETIC_WALL.end+180);
 assert.ok(SHADOW_TUNNEL.end<CORKSCREW.start-150);
 assert.ok(SHADOW_TUNNEL.start>SKYLINE_LEAP.end+1000);
 assert.equal(SHADOW_TUNNEL.noNewColliders,true);
 assert.equal(SHADOW_TUNNEL.physicsUnchanged,true);
 assert.equal(SHADOW_TUNNEL.drawBatches,4);
 assert.equal(SHADOW_TUNNEL.dynamicLightsAdded,0);
});
test("tunnel fade/blackout recurs on all 3 laps and never masks the start",()=>{
 for(let lap=0;lap<3;lap++){
  const s=lap*CIRCUIT.lapLength;
  assert.equal(tunnelIntensityAt(s),0);
  assert.equal(inShadowTunnel(s+2000),false);
  assert.equal(inShadowTunnel(s+2050),true);
  assert.equal(tunnelIntensityAt(s+2050),0);
  near(tunnelIntensityAt(s+2050+SHADOW_TUNNEL.fadeMeters*.5),.5);
  near(tunnelIntensityAt(s+2350),1);
  near(tunnelIntensityAt(s+2810-SHADOW_TUNNEL.fadeMeters*.5),.5);
  assert.equal(inShadowTunnel(s+2810),false);
  assert.equal(tunnelIntensityAt(s+2810),0);
  assert.equal(tunnelIntensityAt(s+3005),0);
 }
});
test("tunnel sampled geometry follows 3D track, has open road and safe clearances",()=>{
 const data=createShadowTunnelData();
 const count=Math.ceil(SHADOW_TUNNEL.lengthMeters/SHADOW_TUNNEL.sampleStepMeters);
 assert.equal(data.segments,count);
 assert.equal(data.shellTriangles,count*(TUNNEL_SECTION.length-1)*2);
 assert.equal(data.trim.length/9,count*2*2*2); // two pipes per side
 assert.ok(data.ribCount>=18);
 assert.ok(data.totalTriangles<6500,"keep mobile geometry compact");
 assert.ok(Math.min(...TUNNEL_SECTION.map(x=>x[1]))>TRIAL.hoverHeight);
 assert.ok(Math.max(...TUNNEL_SECTION.map(x=>x[1]))>=18);
 assert.ok(TUNNEL_SECTION[0][0]<-CIRCUIT.trackWidth/2-4);
 assert.ok(TUNNEL_SECTION.at(-1)[0]>CIRCUIT.trackWidth/2+4);
 const p=positionAt(SHADOW_TUNNEL.start,TUNNEL_SECTION[0][0],TUNNEL_SECTION[0][1]);
 near(data.shell[0],p.x);near(data.shell[1],p.y);near(data.shell[2],p.z);
 assert.ok(data.shell.every(Number.isFinite));
 assert.ok(data.trim.every(Number.isFinite));
 assert.ok(data.ribs.every(Number.isFinite));
 assert.ok(data.portals.every(Number.isFinite));
});
test("PBR deck darkens only INSIDE while guide, boost and zone emission survive",()=>{
 const fragment=`void main() {
  float trackS=2100.,guided=1.,insetGold=1.,spine=0.,whiteCore=0.,whiteBloom=0.;
  vec3 road=vec3(.5),zoneGuide=vec3(1.),uTrackBoost=vec3(1.);
  float velocityGlint=0.;
  vec3 totalEmissiveRadiance=vec3(0.);
  diffuseColor.rgb = road;
  totalEmissiveRadiance += zoneGuide * guided * .24
    + zoneGuide*velocityGlint*.35;
 }`;
 const patched=shadeTunnelRoadGLSL(fragment);
 assert.match(patched,/tunnelShade = smoothstep\(2050\.0,2080\.0,trackS\)/);
 assert.match(patched,/smoothstep\(2780\.0,2810\.0,trackS\)/);
 assert.match(patched,/tunnelGuide/);
 assert.match(patched,/zoneGuide \* guided \* tunnelShade/);
 assert.match(patched,/uTrackBoost \* insetGold \* tunnelShade/);
 assert.match(patched,/totalEmissiveRadiance \+=/);
 assert.throws(()=>shadeTunnelRoadGLSL("void main() {}"),/unsupported/);
 assert.ok(ZONE_PALETTES.length>=9);
});
test("active 0.10.3 uses tunnel geometry and dark/glow shader, preserves 0.9.1 handling",()=>{
 const html=read("./index.html"),boot=read("./boot-v0103.js"),
  game=read("./game-v0103.mjs"),archived=read("./legacy/game/game-v091.mjs");
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/shadow-tunnel-v092\.mjs/);
 assert.match(game,/installShadowTunnel/);
 assert.match(game,/installTunnelRoadShading/);
 assert.match(game,/tunnelIntensityAt\(flight\.s\)/);
 assert.match(game,/shadowTunnel:.*getStats/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(game,/kinetic-camera-v090\.mjs/);
 assert.match(game,/signature-flight-v091\.mjs/);
 assert.match(archived,/version:"0\.9\.1"/);
});
