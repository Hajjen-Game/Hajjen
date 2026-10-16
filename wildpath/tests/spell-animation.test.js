import test from 'node:test';
import assert from 'node:assert/strict';
import {SPELL_STAGES,SPELL_PRESENTATION,effectBudget,pickSpell,stageDuration,createSpellAnimator,createRibbonTrail} from '../src/spell-animation.js';
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


test('Glint Dart ribbon updates a single updatable tube and disposes it',()=>{
  class Vec {constructor(x,y,z){this.x=x;this.y=y;this.z=z;}}
  class C {static FromHexString(){return new C();}static Black(){return new C();}scale(){return this;}}
  class M {dispose(){this.released=true;}}
  let builds=0,updates=0,released=0;
  const existing={dispose(){released++;}};
  globalThis.window={BABYLON:{
    Vector3:Vec,Color3:C,StandardMaterial:M,
    MeshBuilder:{CreateTube(_name,opts){
      if(opts.instance){updates++;return opts.instance;}
      builds++;return existing;
    }}
  }};
  const tail=createRibbonTrail({},{color:'#79e4ff'});
  for(let i=0;i<20;i++)tail.move(i/3,1.4,i/5);
  assert.equal(builds,1);
  assert.equal(updates,20);
  tail.dispose();
  assert.equal(released,1);
});
test('audio launch and impact layers can sound in the same combat moment',()=>{
  const first=[];
  class Audio {
    constructor(){this.currentTime=1;this.state='running';this.destination={};}
    createOscillator(){return {
      frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
      connect(){},start(t){first.push(t);},stop(){},disconnect(){}
    };}
    createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
    createBiquadFilter(){return {frequency:{setValueAtTime(){}},connect(){},disconnect(){}};}
    close(){this.state='closed';}
  }
  globalThis.window={AudioContext:Audio,BABYLON:{}};
  const audio=createSpellAnimator({});
  audio.unlock();
  audio.sound('Glint Dart','launch');
  audio.sound('Glint Dart','impact');
  assert.equal(first.length,2);
  assert.ok(first[1]>first[0]);
  audio.setMuted(true);
  audio.sound('Glint Dart','launch');
  assert.equal(first.length,2);
  audio.dispose();
});
