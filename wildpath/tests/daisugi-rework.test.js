import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASS_DATA} from '../src/config.js';
import {WILD_RADIUS,WILD_CAMERA_WIDTH} from '../src/open-layout.js';
import {DAISUGI_BOOSTS,daisugiVolleyCount,daisugiVolleyTargets,
  daisugiSplash,daisugiAttackInterval,daisugiPool,daisugiBloom,
  daisugiGuardHp,clusteredTarget,autoSpellChoice} from '../src/daisugi-rework.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('Daisugi magic never changes original 2.x geometry, camera or walk speed',()=>{
  assert.equal(WILD_RADIUS,43);
  assert.equal(WILD_CAMERA_WIDTH,29.5);
  assert.equal(CLASS_DATA.caster.speed,5.25);
  const main=read('../src/main.js');
  assert.ok(main.includes("params.get('daisugi')==='1'"));
  assert.ok(main.includes("const dz=OPEN_WORLD?z*game.spec.speed*dt:"));
  assert.ok(main.includes("game.spec=DAISUGI_MODE?{...CLASS_DATA.caster,"));
  assert.ok(main.includes("if(!DAISUGI_MODE)cast(Number(btn.dataset.slot))"));
  assert.ok(!read('../src/open-layout.js').includes('daisugi'));
});
test('original spells are opt-in; classic mode continues without auto casting',()=>{
  const main=read('../src/main.js');
  assert.ok(main.includes('if(DAISUGI_MODE&&!director.ready)'));
  assert.ok(main.includes('if(!DAISUGI_MODE&&game.state'));
  assert.ok(main.includes("document.body.classList.toggle('daisugi-rework',DAISUGI_MODE)"));
  assert.ok(read('../styles.css').includes('body.daisugi-rework #bottomHud'));
});
test('auto volley starts with three homing darts and can grow to nine',()=>{
  assert.equal(daisugiVolleyCount(new Set()),3);
  assert.equal(daisugiVolleyCount(new Set(['double'])),4);
  assert.equal(daisugiVolleyCount(new Set(['double','triple','crosscurrent'])),7);
  assert.equal(daisugiVolleyCount(new Set(['glintstorm','crosscurrent'])),9);
  const hero={x:0,z:0},first={x:3,z:0,alive:true},
    second={x:4,z:0,alive:true},third={x:4,z:1,alive:true};
  const volley=daisugiVolleyTargets([first,second,third],hero,13.5,9,first);
  assert.equal(volley.length,9);
  assert.equal(volley[0],first);
  assert.equal(new Set(volley).size,3);
});
test('each glint splashes and slows multiple enemies, especially with Frostwave',()=>{
  const initial=daisugiSplash(new Set());
  const frost=daisugiSplash(new Set(['frostwave']));
  assert.ok(initial.targets>=3);
  assert.ok(frost.radius>initial.radius);
  assert.ok(frost.slow>initial.slow);
  assert.equal(frost.targets,7);
  const main=read('../src/main.js');
  assert.ok(main.includes('DAISUGI_MODE?daisugiSplash(game.upgrades)'));
  assert.ok(main.includes('slow:DAISUGI_MODE?splash.slow:0'));
  assert.ok(main.includes('slow:DAISUGI_MODE?1.7:0'));
});
test('smart target selection favors actual packs within cast range',()=>{
  const hero={x:0,z:0};
  const lone={x:1,z:0,alive:true},group=[
    {x:9,z:1,alive:true},{x:9.7,z:1,alive:true},{x:8.9,z:2,alive:true}
  ];
  assert.equal(clusteredTarget([lone,...group],hero,17,4.3),group[0]);
});
test('automatic spells select survival before rainfall, bloom or empty space',()=>{
  const hero={x:0,z:0},enemies=[
    {alive:true,x:1,z:1},{alive:true,x:2,z:0}
  ];
  const s={enemies,player:hero,upgrades:new Set(),cooldowns:[0,0,0],
    hp:100,maxHp:100,shield:30};
  assert.equal(autoSpellChoice(s),0);
  assert.equal(autoSpellChoice({...s,cooldowns:[1,0,0]}),1);
  assert.equal(autoSpellChoice({...s,hp:49,shield:0}),2);
  assert.equal(autoSpellChoice({...s,enemies:[]}),-1);
});
test('the Daisugi-only blessings amplify auto spells without changing speed',()=>{
  const ids=DAISUGI_BOOSTS.map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.includes('crosscurrent')&&ids.includes('frostwave'));
  assert.ok(ids.includes('downpour')&&ids.includes('tidalecho'));
  assert.ok(daisugiAttackInterval(.78,new Set(['flowstate']))<
    daisugiAttackInterval(.78,new Set()));
  const rain={radius:3.2,damage:6,entryDamage:0,tick:.65,slow:2.5};
  const enhanced=daisugiPool(rain,new Set(['downpour']));
  assert.ok(enhanced.damage>rain.damage&&enhanced.slow>rain.slow);
  assert.equal(daisugiPool(rain,new Set()),rain);
  const bloom={radius:3.4,damage:29};
  assert.equal(daisugiBloom(bloom,new Set(['tidalecho'])).echoBursts,2);
  assert.ok(daisugiGuardHp(new Set(['guardianpulse']))>daisugiGuardHp(new Set()));
});
