// Regression: Skyline's original 0.26.5 source-gated shader chain and
// NEON VAULT's independently selectable 0.27.x route must BOTH survive.
// Prior 0.22.0 test incorrectly required two identical Skyline URL paths.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");

test("Skyline's published source build remains aligned with HUD/audit/links",()=>{
 const game=read("./game-v0210.mjs"),html=read("./index.html");
 const boot=read("./boot-v0210.js");
 const version=boot.match(/game-v0210\.mjs\?v=(0\.26\.\d+)/)?.[1];
 assert.ok(version,"the original Skyline 0.26.x PBR shader gate must be retained");
 assert.ok(html.includes("boot-v0210.js?v="+version));
 assert.ok(html.includes("SKYLINE CIRCUIT · "+version));
 assert.match(game,/const SKYSHIFT_BUILD_VERSION=new URL\(/);
 assert.match(game,/querySelector\("script\[data-game-module\]"\)/);
 assert.match(game,/topbarTrack\.textContent=ACTIVE_TRACK_0160\.name\+" · "\+SKYSHIFT_BUILD_VERSION/);
 // 0.29.2 records the selected Vault release, while historical Skyline
 // keeps its original source-build version. Require both branches.
 assert.match(game,/game:"SKYSHIFT",version:VAULT_COMPACT_ACTIVE\?VAULT_JUMP_VERSION:SKYSHIFT_BUILD_VERSION/);
 assert.match(game,/buildVersion:SKYSHIFT_BUILD_VERSION/);
 // Copied/share links retain the actual boot source build version.
 assert.equal((game.match(/searchParams\.set\("v",SKYSHIFT_BUILD_VERSION\)/g)||[]).length,1);
 assert.doesNotMatch(game,/topbarTrack\.textContent[^\n]*0\.21\.2\.5/);
});

test("Neon Vault menu resolves the live production catalog while source QA keeps its baseline",async()=>{
 const game=read("./game-v0210.mjs"),html=read("./index.html");
 const {PRODUCTION_TRACK,PRODUCTION_RELEASE_NAME,productionRouteUrl}=await import("../../tracks/shared/production-catalog.mjs");
 assert.match(game,/uri\.searchParams\.set\("v",selected==="vault"\?PRODUCTION_TRACK\.version:SKYSHIFT_BUILD_VERSION\)/);
 assert.equal(PRODUCTION_TRACK.id,"vault");
 assert.match(PRODUCTION_TRACK.version,/^0\.(?:27|28)\.\d+(?:\.\d+)?$/);
 assert.ok(PRODUCTION_RELEASE_NAME.length>0);
 const route=new URL(productionRouteUrl("https://example.test/skyshift/?track=skyline&v=0.26.5&startupAudit=1"));
 assert.equal(route.searchParams.get("track"),"vault");
 assert.equal(route.searchParams.get("v"),PRODUCTION_TRACK.version);
 assert.equal(route.searchParams.get("startupAudit"),"1");
 assert.match(html,/Startup Stability & Shared Resource Deduplication · 0\.28\.9\.7/);
 // The generated production title and menu are validated by verify-build.mjs.
 assert.match(html,/<option value="vault">03 · NEON VAULT/);
 assert.match(game,/const vaultMaterialParityEnabled=fullTunnelFoundationEnabled/);
 assert.match(game,/vaultMaterialComparison:"\?vaultMaterial=classic"/);
});

test("0.29.2 explicit endurance route retains correct version and rollback",async()=>{
 const {productionRouteUrl,PRODUCTION_TRACK}=await import("../../tracks/shared/production-catalog.mjs");
 const base="https://example.test/skyshift/";
 for(const version of ["0.29.0","0.29.1","0.29.2","0.29.3","0.29.3.1","0.29.4","0.29.4.1","0.29.4.2","0.29.5","0.29.5.1"]){
  const route=new URL(productionRouteUrl(base+"?track=vault&v="+version));
  assert.equal(route.searchParams.get("v"),version);
  assert.equal(route.searchParams.get("vaultJump"),"1");
 }
 const rollback=new URL(productionRouteUrl(base+"?track=vault&v=0.29.2&vaultJump=0"));
 assert.equal(rollback.searchParams.get("v"),PRODUCTION_TRACK.version);
});
