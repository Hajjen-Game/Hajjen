// SKYSHIFT 0.17.0 — deterministic, no WebGL or DOM required.
import test from "node:test";
import assert from "node:assert/strict";
import {
 CINEMATIC_SPACE_0170,cinematicLightLevels,patchCinematicRoadFragment,
 installCinematicRoadLighting
} from "../../world/cinematic-space-lighting-v0170.mjs";
test("cinematic hierarchy: darker ambient/fill, directional readable key",()=>{
 const s=cinematicLightLevels();
 assert.ok(s.ambient<1.62&&s.ambient>.80);
 assert.ok(s.fill<.72&&s.fill>.25);
 assert.ok(s.key>2.55);
 assert.equal(CINEMATIC_SPACE_0170.additionalDynamicLights,0);
 assert.equal(CINEMATIC_SPACE_0170.additionalRenderPasses,0);
 assert.equal(CINEMATIC_SPACE_0170.gamePhysicsUnchanged,true);
 assert.equal(CINEMATIC_SPACE_0170.cameraPhysicsUnchanged,true);
});
test("authored light pockets retain the blackout road anchor and HDR emission",()=>{
 const shader="float trackS = vTrackCoord.x;\n"+
  "float absL = abs(trackL);\n"+
  "diffuseColor.rgb = road;\n"+
  "totalEmissiveRadiance += zoneGuide * 0.24;";
 const patched=patchCinematicRoadFragment(shader);
 assert.ok(patched.includes("float cinemaPool = max("));
 assert.ok(patched.includes("diffuseColor.rgb = road;"));
 assert.ok(patched.includes("totalEmissiveRadiance += zoneGuide * 0.24;"));
 assert.ok(!patched.includes("uCinemaTime"));
 assert.throws(()=>patchCinematicRoadFragment("void main(){}"),/anchors/);
});
test("Cinematic decorator chains before tunnel and updates material cache key",()=>{
 const material={
  needsUpdate:false,
  onBeforeCompile(shader){shader.fragmentShader="float trackS = vTrackCoord.x;\n"+
    "float absL = abs(trackL);\ndiffuseColor.rgb = road;";},
  customProgramCacheKey(){return "premium-fidelity";}
 };
 installCinematicRoadLighting(material);
 const shader={fragmentShader:""};
 material.onBeforeCompile(shader,null);
 assert.ok(shader.fragmentShader.includes("cinemaPool"));
 assert.equal(material.customProgramCacheKey(),"premium-fidelity-cinema-0170");
 assert.equal(material.needsUpdate,true);
});
