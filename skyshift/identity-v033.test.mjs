import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TRIAL,GAPS,SPLITS,RISK_CUTS,roadIntervals,SECTORS,GEOMETRY_BREAKS} from "./trial-v03.mjs";
import {
 IDENTITY_RULES,createSurfacePlan,validateSurfacePlan
} from "./identity-v033.mjs";
import {NEON_TUNING} from "./neon-balance-v032.mjs";

const read=file=>readFileSync(new URL(file,import.meta.url),"utf8");
const plan=createSurfacePlan();
test("surface language is a substantial but controlled authored design system",()=>{
  assert.ok(plan.length>130,"expected meaningful deck detailing");
  assert.ok(plan.length<900,"do not overwhelm GPU with material spam");
  assert.ok(plan.some(p=>p.kind==="plate"));
  assert.ok(plan.some(p=>p.kind==="seam"));
  assert.ok(plan.some(p=>p.kind==="nav"));
  assert.ok(plan.some(p=>p.kind==="energy"));
  assert.ok(plan.some(p=>p.kind==="island"));
  assert.deepEqual(validateSurfacePlan(plan),[]);
});

test("all added surface graphics remain entirely inside collision-solid platforms",()=>{
  for(const [i,p] of plan.entries()){
    const lateral=(p.left+p.right)/2;
    for(const s of [p.start+.01,(p.start+p.end)*.5,p.end-.01]){
      assert.ok(roadIntervals(s).some(([a,b])=>lateral>a+.05&&lateral<b-.05),
        "graphic "+i+" over an actual gap or off the road");
    }
    assert.ok(!GEOMETRY_BREAKS.some(s=>s>p.start+.001&&s<p.end-.001),
      "graphic "+i+" incorrectly crosses a split, gap or sector boundary");
  }
});

test("cyan navigation, magenta risk and amber warnings keep semantic separation",()=>{
  const split=SPLITS[0];
  const withinSplit=plan.filter(p=>p.start>=split.start+9&&p.end<split.end);
  assert.ok(withinSplit.some(p=>p.kind==="energy"&&p.left>0),
    "risk lane should have magenta visual instructions");
  assert.ok(withinSplit.some(p=>p.kind==="nav"&&p.right<0),
    "safe lane should have cyan visual instructions");
  for(const p of plan.filter(p=>p.kind==="energy"&&p.start>split.start&&p.end<split.end)){
    assert.ok(p.left>0,"magenta route decoration should be confined to right lane");
  }
  assert.notEqual(IDENTITY_RULES.nav,IDENTITY_RULES.energy);
  assert.notEqual(IDENTITY_RULES.energy,IDENTITY_RULES.hazard);
  assert.ok(IDENTITY_RULES.energyLuminance<NEON_TUNING.bloomThreshold,
    "decorative energy is lower than the rail bloom trigger");
  assert.ok(IDENTITY_RULES.navLuminance<NEON_TUNING.bloomThreshold);
});

test("all Sky Island accents stay inside their real offset landing platforms",()=>{
  const island=plan.filter(p=>p.kind==="island");
  assert.ok(island.length>=6,"separate island landings should be visually authored");
  for(const p of island){
    for(const d of [p.start+.01,(p.start+p.end)*.5,p.end-.01]){
      assert.ok(roadIntervals(d).some(([a,b])=>p.left>=a&&p.right<=b));
    }
    assert.ok(GAPS.every(g=>p.end<=g.start||p.start>=g.end));
  }
});

test("identity implementation uses batched surface geometry and instanced world silhouettes",()=>{
  const src=read("identity-v033.mjs");
  assert.match(src,/const batches=\{plate:\[\],seam:\[\],nav:\[\],energy:\[\],island:\[\]\}/);
  assert.match(src,/new THREE\.InstancedMesh\(towerGeo,dark,30\)/);
  assert.match(src,/worldFloorOffset:-24/);
  assert.match(src,/decorateHeroShip/);
  assert.match(src,/new THREE\.MeshPhysicalMaterial/);
  assert.match(src,/new THREE\.BufferGeometry/);
});

test("active HTML and game load 0.3.3 without changing flight physics",()=>{
  const page=read("index.html"),game=read("game-v033.mjs");
  assert.match(page,/game-v034\.mjs\?v=0\.3\.4/);
  assert.match(read("game-v0331.mjs"),/from "\.\/identity-v0331\.mjs"/);
  assert.match(game,/from "\.\/trial-v03\.mjs"/);
  assert.match(game,/from "\.\/identity-v033\.mjs"/);
  assert.match(game,/from "\.\/neon-v032\.mjs"/);
  assert.match(game,/from "\.\/fullscreen-v02\.mjs"/);
  assert.match(game,/installSurfaceLanguage\(THREE,world\)/);
  assert.match(game,/installWorldIdentity\(THREE,world\)/);
  assert.match(game,/decorateHeroShip\(THREE,ship\)/);
  assert.match(game,/new THREE\.InstancedMesh\(\s*new THREE\.BoxGeometry\(\.30,2\.12,\.34\)/);
  assert.match(game,/version:"0\.3\.3"/);
  assert.equal(TRIAL.length,1300);
  assert.equal(GAPS.length,6);
  assert.equal(SECTORS.length,3);
});
