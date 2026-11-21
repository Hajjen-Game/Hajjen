// Regression: Skyline's original 0.26.5 source-gated shader chain and
// NEON VAULT's independently selectable 0.27.x route must BOTH survive.
// Prior 0.22.0 test incorrectly required two identical Skyline URL paths.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");

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
 assert.match(game,/game:"SKYSHIFT",version:SKYSHIFT_BUILD_VERSION/);
 assert.match(game,/buildVersion:SKYSHIFT_BUILD_VERSION/);
 // Copied/share links retain the actual boot source build version.
 assert.equal((game.match(/searchParams\.set\("v",SKYSHIFT_BUILD_VERSION\)/g)||[]).length,1);
 assert.doesNotMatch(game,/topbarTrack\.textContent[^\n]*0\.21\.2\.5/);
});

test("third Neon Vault course has a distinct 0.27.x versioned menu URL",()=>{
 const game=read("./game-v0210.mjs"),html=read("./index.html");
 const version=game.match(/uri\.searchParams\.set\("v",selected==="vault"\?"(0\.(?:27|28)\.\d+)":SKYSHIFT_BUILD_VERSION\)/)?.[1];
 assert.ok(version,"Vault route must use its distinct 0.27.x/0.28.x release version");
 assert.ok(html.includes("Neon Vault Material Parity · "+version)||
  html.includes("Architectural Geometry & Panel Parity · "+version)||
   html.includes("Full Tunnel Lighting & Visual Parity · "+version)||
   html.includes("Premium Tunnel Cohesion & Finish · "+version)||
   html.includes("Shared Tunnel Architecture 1.0 · "+version)||
   html.includes("True Shared Tunnel Renderer · "+version));
 assert.match(html,/<option value="vault">03 · NEON VAULT/);
 assert.match(game,/const vaultMaterialParityEnabled=fullTunnelFoundationEnabled/);
 assert.match(game,/vaultMaterialComparison:"\?vaultMaterial=classic"/);
});
