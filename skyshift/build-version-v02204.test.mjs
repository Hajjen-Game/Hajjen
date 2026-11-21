// Regression: player-facing version, exported audit and copied links agree.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("the current published build is the HUD, audit and shared URL version",()=>{
 const game=read("./game-v0210.mjs");
 const html=read("./index.html");
 const boot=read("./boot-v0210.js");
 const version=boot.match(/game-v0210\.mjs\?v=(0\.26\.\d+)/)?.[1];
 assert.ok(version);
 assert.ok(html.includes("boot-v0210.js?v="+version));
 assert.ok(html.includes("SKYLINE CIRCUIT · "+version));
 assert.match(game,/const SKYSHIFT_BUILD_VERSION=new URL\(/);
 assert.match(game,/querySelector\("script\[data-game-module\]"\)/);
 assert.match(game,/topbarTrack\.textContent=ACTIVE_TRACK_0160\.name\+" · "\+SKYSHIFT_BUILD_VERSION/);
 assert.match(game,/game:"SKYSHIFT",version:SKYSHIFT_BUILD_VERSION/);
 assert.match(game,/buildVersion:SKYSHIFT_BUILD_VERSION/);
 // The original Skyline boot/exports still use 0.26.5 so its physically
 // local, sun-sealed 0.26.x material gating stays untouched. NEON VAULT is
 // independently selectable and MUST retain its 0.27.x route, rather than
 // silently reusing the Skyline build number in navigation.
 assert.equal((game.match(/searchParams\\.set\\("v",SKYSHIFT_BUILD_VERSION\\)/g)||[]).length,1);
 const vaultRoute=game.match(/uri\\.searchParams\\.set\\("v",selected==="vault"\\?"(0\\.27\\.\\d+)":SKYSHIFT_BUILD_VERSION\\)/);
 assert.ok(vaultRoute,"NEON VAULT must use its own real release version");
 const vaultVersion=vaultRoute[1];
 assert.ok(html.includes("NEON VAULT 0.27.1")||
  html.includes("Neon Vault Material Parity · "+vaultVersion));
 assert.match(game,/const vaultMaterialParityEnabled=fullTunnelFoundationEnabled/);
 assert.match(game,/vaultMaterialComparison:"\\?vaultMaterial=classic"/);
 assert.doesNotMatch(game,/topbarTrack\.textContent[^\n]*0\.21\.2\.5/);
});
