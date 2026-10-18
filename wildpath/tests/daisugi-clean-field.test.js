import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {daisugiTextPlan,daisugiDamageLabel,DAISUGI_TEXT_LIMITS}
  from '../src/daisugi-combat-text.js';
import {WILD_RADIUS,WILD_CAMERA_WIDTH} from '../src/open-layout.js';
import {CLASS_DATA} from '../src/config.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('only Daisugi hides static vegetation, not the original world or Nature Rebirth',()=>{
  const main=read('../src/main.js'),world=read('../src/world-open.js');
  assert.match(main,/createOpenWorld\(scene,\{\s*staticVegetation:!DAISUGI_MODE/);
  assert.match(world,/createOpenWorld\(scene,\{staticVegetation=true,hexGrass=false\}/);
  for(const snippet of [
    "if(staticVegetation)for(let i=0;i<160;i++)",
    "if(staticVegetation)for(let ring=0;ring<3;ring++)",
    "if(staticVegetation)for(let i=0;i<15;i++)",
    "if(staticVegetation)for(let i=0;i<195;i++)",
    "if(staticVegetation)trunk(x,z",
    "if(staticVegetation)instance(choose(shrubs)"
  ])assert.ok(world.includes(snippet),snippet);
  assert.ok(main.includes("const nature=OPEN_WORLD?new NatureGrowth(scene,"));
  assert.ok(main.includes('nature?.apply(event,game)'));
  assert.ok(world.includes("CreateGround('continuous woodland floor'"));
  assert.equal(WILD_RADIUS,43);
  assert.equal(WILD_CAMERA_WIDTH,29.5);
  assert.equal(CLASS_DATA.caster.speed,5.25);
  assert.ok(main.includes('const DAISUGI_CAMERA_WORLD_WIDTH=24.5'));
});

test('normal and critical attacks aggregate into one short readable group',()=>{
  const origin={x:2,z:1};
  const first=daisugiTextPlan([],origin,'normal','12');
  assert.equal(first.action,'new-damage');
  assert.equal(first.points,12);
  const target={damageGroup:true,kind:'normal',life:.5,pos:{x:3,z:2}};
  const second=daisugiTextPlan([target],origin,'crit','CRIT! 28');
  assert.equal(second.action,'merge-damage');
  assert.equal(second.points,28);
  assert.equal(second.crit,true);
  assert.equal(daisugiDamageLabel(40,1),'✦ 40');
  assert.equal(daisugiDamageLabel(1203,0),'1,203');
});

test('three separated damage groups are maximum; fewer messages are shown',()=>{
  const texts=[{damageGroup:true,kind:'normal',life:.4,pos:{x:0,z:0}},
    {damageGroup:true,kind:'crit',life:.5,pos:{x:12,z:0}},
    {damageGroup:true,kind:'normal',life:.5,pos:{x:-12,z:0}}];
  assert.equal(daisugiTextPlan(texts,{x:0,z:.2},'normal','20').action,'merge-damage');
  assert.equal(daisugiTextPlan(texts,{x:0,z:18},'normal','20').action,'hide');
  assert.equal(DAISUGI_TEXT_LIMITS.damage,3);
});

test('score text is in HUD only while important nature and hit text remains',()=>{
  assert.equal(daisugiTextPlan([],{x:0,z:0},'score','+300').action,'hide');
  const energy={kind:'energy',life:.6,pos:{x:0,z:0}};
  assert.equal(daisugiTextPlan([energy],{x:0,z:0},'energy','✦ +1 MAGIC').action,'merge-energy');
  const nature={kind:'nature',life:.6,pos:{x:1,z:0}};
  assert.equal(daisugiTextPlan([nature],{x:1,z:1},'nature','✿ BUSH').action,'merge-nature');
  assert.equal(daisugiTextPlan([],{x:0,z:0},'hurt','-14').action,'new');
  const main=read('../src/main.js'),css=read('../styles.css');
  assert.ok(main.includes("if(host&&(!DAISUGI_MODE||reason==='stage'))"));
  assert.ok(main.includes("if(source&&reason!=='stage'&&!DAISUGI_MODE)"));
  assert.ok(css.includes('body.daisugi-rework #scoreBursts{display:none!important}'));
  assert.ok(css.includes('body.daisugi-rework.wildpath-open .float-damage.crit'));
});

test('other game modes keep original floating damage, score, and world',()=>{
  const main=read('../src/main.js');
  assert.ok(main.includes('if(DAISUGI_MODE){\n    const plan=daisugiTextPlan'));
  assert.ok(main.includes("if(OPEN_WORLD){\n    // Readability cap"));
  assert.ok(main.includes("const world=OPEN_WORLD?createOpenWorld(scene,"));
});
