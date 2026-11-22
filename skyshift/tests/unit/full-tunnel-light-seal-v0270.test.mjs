import test from "node:test";
import assert from "node:assert/strict";
import {VAULT_LIGHT_SEAL_0270,vaultLightLevels0270}
 from "../../full-tunnel-light-seal-v0270.mjs";
import {readFileSync} from "node:fs";
const game=readFileSync(new URL("../../"+"./game-v0210.mjs",import.meta.url),"utf8");
test("Vault full lap uses exactly one source-independent sun seal at any distance",()=>{
 const a=vaultLightLevels0270(0);
 for(const s of [1,367,368,851,2050,2810,3230,3400,9999])
  assert.deepEqual(vaultLightLevels0270(s),a);
 assert.equal(VAULT_LIGHT_SEAL_0270.end,3400);
 assert.ok(a.key<.04&&a.fill<.04&&a.ambient<.20);
 assert.equal(a.roadBody,1);assert.equal(a.roadBaseEmissive,1);
 assert.equal(a.bladeTip,1);
 assert.equal(VAULT_LIGHT_SEAL_0270.originalSkylineUnchanged,true);
 assert.throws(()=>vaultLightLevels0270(NaN));
});
test("original tunnel controller remains selected for Skyline, static seal only for Vault",()=>{
 assert.match(game,/unifiedTunnelLightingEnabled\?\s*createUnifiedTunnelLightingController:createTunnelBlackoutController/);
 assert.match(game,/isVault\(\)\?\{levelsAt:vaultLightLevels0270\}:\{\}/);
 assert.match(game,/vaultGlobalLightSeal:isVault\(\)\?VAULT_LIGHT_SEAL_0270/);
 assert.match(game,/installFullTunnelCircuit0270/);
});
