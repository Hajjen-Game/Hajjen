import test from 'node:test';
import assert from 'node:assert/strict';
import {SPELL_STAGES,SPELL_PRESENTATION,effectBudget,pickSpell,stageDuration,createSpellAnimator} from '../src/spell-animation.js';
test('all eight spells expose the eight common VFX stages',()=>{
 assert.deepEqual(SPELL_STAGES,['charge','core','trail','burst','reaction','sound','aftermath','damage']);
 assert.equal(Object.keys(SPELL_PRESENTATION).length,8);
 for(const [name,spell] of Object.entries(SPELL_PRESENTATION)){
  assert.deepEqual(spell.steps,SPELL_STAGES,name);
  assert.ok(spell.primary.startsWith('#'));
  assert.ok(stageDuration('aftermath')>stageDuration('burst'));
 }
});
test('effect budget caps transient effects',()=>{
 assert.equal(effectBudget(154,155),true);
 assert.equal(effectBudget(155,155),false);
 assert.equal(pickSpell('not existing').kind,'ice');
});
test('eight stages remain valid if audio API is unavailable',()=>{
 class Vec {constructor(x,y,z){this.x=x;this.y=y;this.z=z;}setAll(v){this.x=v;this.y=v;this.z=v;}}
 class C{static FromHexString(){return new C();}static Black(){return new C();}scale(){return this;}}
 class M{dispose(){}}
 class Mesh{constructor(){this.position=new Vec(0,0,0);this.scaling=new Vec(1,1,1);}dispose(){}}
 const make=()=>new Mesh();
 globalThis.window={BABYLON:{
  Color3:C,StandardMaterial:M,Vector3:Vec,
  MeshBuilder:{CreateSphere:make,CreateTorus:make,CreatePolyhedron:make}
 }};
 const f=createSpellAnimator({}, {maxEffects:8});
 for(const stage of SPELL_STAGES){
  f.emit('Glint Dart',stage,{x:0,z:0});
  f.tick(.035);
 }
 assert.ok(f.activeCount<=8);
 f.tick(4);
 assert.equal(f.activeCount,0);
 f.sound('Glint Dart');
 f.clear();f.dispose();
});
