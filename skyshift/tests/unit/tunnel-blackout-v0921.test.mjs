// SKYSHIFT 0.10.3 – True darkness tunnel, PBR blackout and engine-only glow.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {CIRCUIT} from "../../tracks/trials/trial-v0901.mjs";
import {tunnelIntensityAt,SHADOW_TUNNEL} from "../../tunnel/shadow-tunnel-v092.mjs";
import {TUNNEL_BLACKOUT,blackoutLevelsAt,patchBlackoutRoadFragment,
 createTunnelBlackoutController,separateBladeTipMaterial}
 from "../../tunnel/tunnel-blackout-v0921.mjs";
const src=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const close=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} should equal ${b}`);
test("black room fades smoothly inside tunnel, repeated across three laps",()=>{
 assert.equal(TUNNEL_BLACKOUT.version,"shadow-tunnel-blackout-0921");
 assert.equal(TUNNEL_BLACKOUT.start,2050);
 assert.equal(TUNNEL_BLACKOUT.end,2810);
 assert.equal(TUNNEL_BLACKOUT.ambientLightAtCore,.004);
 assert.ok(TUNNEL_BLACKOUT.keyLightAtCore<.01);
 assert.ok(TUNNEL_BLACKOUT.roadBodyAtCore<.005);
 for(let lap=0;lap<3;lap++){
  const s=lap*CIRCUIT.lapLength;
  close(blackoutLevelsAt(s+100).darkness,0);
  close(blackoutLevelsAt(s+2050).ambient,1);
  close(blackoutLevelsAt(s+2065).darkness,.5);
  const core=blackoutLevelsAt(s+2450);
  close(core.darkness,1);
  close(core.ambient,.004);
  close(core.key,.008);
  close(core.fill,.004);
  close(core.roadBody,.003);
  close(core.roadBaseEmissive,.002);
  close(core.bladeTip,.018);
  close(blackoutLevelsAt(s+2810).darkness,0);
  assert.equal(tunnelIntensityAt(s+2900),0);
 }
 assert.equal(TUNNEL_BLACKOUT.keepsEnginePointLights,true);
 assert.equal(TUNNEL_BLACKOUT.keepsEnergyWave,true);
 assert.equal(TUNNEL_BLACKOUT.addedLights,0);
 assert.equal(TUNNEL_BLACKOUT.addedMeshes,0);
 assert.equal(TUNNEL_BLACKOUT.addedPasses,0);
});
test("deck body and baseline emissive black out BEFORE neon and white-core emission",()=>{
 const fragment=`float tunnelShade = 1.0;
  float tunnelGuide=1.0;
  vec3 road=vec3(.5);
  diffuseColor.rgb = road * (1.0 - tunnelShade * (.88 - .82 * tunnelGuide));
  totalEmissiveRadiance += zoneGuide *
   max(guided,1.0)*.24 + waveSpectrum*(waveCrest*.18);
  totalEmissiveRadiance += uTrackBoost * insetGold * tunnelShade * .18;
  `;
 const patched=patchBlackoutRoadFragment(fragment);
 assert.match(patched,/tunnelShade \* 0\.997/);
 assert.match(patched,/totalEmissiveRadiance \*=\s*\(1\.0 - tunnelShade \* 0\.998\)/);
 assert.ok(patched.indexOf("totalEmissiveRadiance *=")<
  patched.indexOf("totalEmissiveRadiance += zoneGuide"));
 assert.match(patched,/waveSpectrum\*\(waveCrest/);
 assert.match(patched,/uTrackBoost \* insetGold \* tunnelShade/);
 assert.throws(()=>patchBlackoutRoadFragment("void main(){}"),/missing/);
});
test("decorative blade tips are independently dimmed, engine FX materials unaffected",()=>{
 const original={opacity:.63,clone(){return {opacity:this.opacity,cloned:true}}};
 const tips=[{name:"Manta blade tip luminescence",material:original},
  {name:"Manta blade tip luminescence",material:original}];
 const engine={name:"Wing thrust aperture",material:original};
 const ship={traverse(f){for(const o of [...tips,engine])f(o)}};
 const result=separateBladeTipMaterial(ship,original);
 assert.equal(result.count,2);
 assert.notEqual(tips[0].material,original);
 assert.equal(tips[0].material,tips[1].material);
 assert.equal(engine.material,original);
 assert.equal(result.baseOpacity,.63);
});
test("only world PBR lights and starfield dim, existing engine local point lights unaffected",()=>{
 const lights={ambient:{intensity:1.62},key:{intensity:2.55},
  fill:{intensity:.72}};
 const engineLights=[{intensity:3.5},{intensity:3.5}];
 const bladeTips={material:{opacity:.63},baseOpacity:.63};
 const star={isPoints:true,material:{opacity:.5}};
 const nebula={isSprite:true,material:{opacity:.07}};
 const controller=createTunnelBlackoutController({
  worldLights:lights,camera:{children:[star,nebula]},bladeTips});
 const core=controller.apply(2450);
 assert.equal(core.darkness,1);
 close(lights.ambient.intensity,1.62*.004);
 close(lights.key.intensity,2.55*.008);
 close(lights.fill.intensity,.72*.004);
 close(star.material.opacity,.5*.008);
 close(nebula.material.opacity,.07*.008);
 close(bladeTips.material.opacity,.63*.018);
 assert.deepEqual(engineLights,[{intensity:3.5},{intensity:3.5}]);
 // Point cloud opacity is restored once per frame by the backdrop velocity
 // animator. Nebula sprites do not get that reset and must NEVER compound.
 star.material.opacity=.5;
 controller.apply(2460);
 close(nebula.material.opacity,.07*.008);
 const stats=controller.audit();
 assert.equal(stats.engineLightsIntact,true);
 assert.equal(stats.addedDrawCalls,0);
 controller.reset();
 close(lights.ambient.intensity,1.62);
 close(lights.key.intensity,2.55);
 close(lights.fill.intensity,.72);
 close(nebula.material.opacity,.07);
 close(bladeTips.material.opacity,.63);
 close(controller.levels.darkness,0);
 assert.ok(stats.blackoutFrames>=2);
});
test("live 0.10.3 remains 3 laps, 0.9.0.1 handling and 0.9.1 flight motion",()=>{
 const game=src("./game-v0103.mjs"),
  html=src("./index.html"),boot=src("./boot-v0103.js"),
  previous=src("./legacy/game/game-v092.mjs");
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/tunnel-blackout-v0921\.mjs/);
 assert.match(game,/installBlackoutRoadShading/);
 assert.match(game,/createTunnelBlackoutController/);
 assert.match(game,/tunnelBlackout\?\.apply\(uiState\.mode==="hangar"\?0:flight\.s\)/);
 assert.match(game,/shadowTunnel.*getStats/);
 assert.match(game,/kinetic-camera-v090\.mjs/);
 assert.match(game,/signature-flight-v091\.mjs/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(previous,/version:"0\.9\.2"/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.equal(SHADOW_TUNNEL.lengthMeters,760);
});
