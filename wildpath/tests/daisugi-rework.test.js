import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASS_DATA} from '../src/config.js';
import {WILD_RADIUS,WILD_CAMERA_WIDTH} from '../src/open-layout.js';
import {
  DAISUGI_BOOSTS,DAISUGI_CORE_IDS,chooseDaisugiBoosts,daisugiCoreMode,
  daisugiVolleyCount,daisugiVolleyTargets,daisugiSplash,
  daisugiAttackInterval,daisugiAttackDamage,daisugiChainPlan,
  daisugiBounceCount,nextDaisugiHop,daisugiWaveTargets,autoSpellChoice
} from '../src/daisugi-rework.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('Daisugi preserves original map, camera, movement and original game entry',()=>{
  assert.equal(WILD_RADIUS,43);
  assert.equal(WILD_CAMERA_WIDTH,29.5);
  assert.equal(CLASS_DATA.caster.speed,5.25);
  const main=read('../src/main.js');
  assert.ok(main.includes("params.get('daisugi')==='1'"));
  assert.ok(main.includes("const dz=OPEN_WORLD?z*game.spec.speed*dt:"));
  assert.ok(main.includes("game.spec=DAISUGI_MODE?{...CLASS_DATA.caster,"));
  assert.ok(main.includes("if(!DAISUGI_MODE)cast(Number(btn.dataset.slot))"));
  assert.ok(read('../index.html').includes('main.js?v=2.9.7-hex-grass-crisp-texture'));
});

test('no spell buttons: original route remains unaffected',()=>{
  const css=read('../styles.css');
  assert.ok(css.includes('body.daisugi-rework #bottomHud{display:none!important}'));
  assert.ok(!css.includes('#touchControls{display:none!important}'));
  const main=read('../src/main.js');
  assert.ok(main.includes("document.querySelector('#bottomHud').hidden=true"));
  assert.ok(main.includes('if(DAISUGI_MODE)return;'));
  assert.ok(main.includes("if(!DAISUGI_MODE&&game.state"));
});

test('first wave fires exactly ONE plain Water Dart without splash or specials',()=>{
  assert.equal(daisugiCoreMode(new Set()),'dart');
  assert.equal(daisugiVolleyCount(new Set()),1);
  assert.equal(daisugiSplash(new Set()),null);
  const hero={x:0,z:0},foes=[{x:2,z:0,alive:true},{x:3,z:0,alive:true}];
  assert.equal(autoSpellChoice({player:hero,enemies:foes,upgrades:new Set(),
    hp:10,maxHp:100,shield:0,cooldowns:[0,0,0]}),-1);
  assert.equal(daisugiAttackInterval(.78,new Set()),.78);
});

test('first upgrade always offers three choices from attack transformations',()=>{
  for(const random of [0,.22,.5,.78]){
    const picks=chooseDaisugiBoosts(new Set(),0,()=>random);
    assert.equal(picks.length,3);
    assert.equal(new Set(picks.map(x=>x.id)).size,3);
    assert.ok(picks.every(x=>DAISUGI_CORE_IDS.includes(x.id)));
  }
  assert.deepEqual([...DAISUGI_CORE_IDS].sort(),
    ['aquavolley','aquachain','aquabounce','aquawave'].sort());
});

test('three/five homing shots split targets after upgrade',()=>{
  assert.equal(daisugiCoreMode(new Set(['aquavolley'])),'volley');
  assert.equal(daisugiVolleyCount(new Set(['aquavolley'])),3);
  assert.equal(daisugiVolleyCount(new Set(['aquavolley','greatercurrent'])),5);
  const player={x:0,z:0},a={x:3,z:0,alive:true},
    b={x:4,z:1,alive:true},c={x:5,z:-1,alive:true};
  const volleys=daisugiVolleyTargets([a,b,c],player,13.5,5,a);
  assert.equal(volleys.length,5);
  assert.equal(new Set(volleys).size,3);
});

test('chain-lightning water and bouncing projectiles choose distinct living foes',()=>{
  assert.equal(daisugiCoreMode(new Set(['aquachain'])),'chain');
  assert.equal(daisugiChainPlan(new Set()).hops,3);
  assert.equal(daisugiChainPlan(new Set(['chainstorm'])).hops,6);
  assert.equal(daisugiBounceCount(new Set()),2);
  assert.equal(daisugiBounceCount(new Set(['skippingstorm'])),4);
  const a={x:0,z:0,alive:false},b={x:2,z:0,alive:true},
    c={x:2.5,z:1,alive:true},far={x:20,z:0,alive:true};
  assert.equal(nextDaisugiHop([a,b,c,far],a,new Set([a]),4.5),b);
  assert.equal(nextDaisugiHop([a,b,c,far],b,new Set([a,b]),4.5),c);
  assert.equal(nextDaisugiHop([a,b,c,far],b,new Set([a,b,c]),4.5),null);
});

test('wide wave genuinely hits an enemy group in front, not one behind',()=>{
  const hero={x:0,z:0},target={x:3,z:0,alive:true};
  const front={x:6,z:2,alive:true},
    side={x:4,z:3.5,alive:true},behind={x:-2,z:0,alive:true};
  const targets=daisugiWaveTargets([target,front,side,behind],
    hero,target,new Set(['aquawave']));
  assert.ok(targets.includes(target)&&targets.includes(front));
  assert.ok(!targets.includes(behind));
  const wider=daisugiWaveTargets([target,front,side,behind],
    hero,target,new Set(['aquawave','widewave']));
  assert.ok(wider.length>=targets.length);
});

test('later upgrades improve chosen attack but never replace its core',()=>{
  for(const core of DAISUGI_CORE_IDS){
    const selected=new Set([core]);
    const options=chooseDaisugiBoosts(selected,1,()=>.5);
    assert.ok(options.length>0&&options.length<=3);
    assert.ok(options.every(x=>!DAISUGI_CORE_IDS.includes(x.id)));
    assert.equal(daisugiCoreMode(selected),
      {aquavolley:'volley',aquachain:'chain',aquabounce:'bounce',
        aquawave:'wave'}[core]);
  }
  assert.equal(daisugiSplash(new Set(['frostsplash'])).targets,5);
  assert.ok(daisugiAttackInterval(.78,new Set(['flowstate']))<.78);
  assert.ok(daisugiAttackDamage(11,new Set(['deepcurrent']))>11);
});

test('optional Rain Garden / Tidal Bloom / Ward never trigger until unlocked',()=>{
  const player={x:0,z:0},enemies=[
    {x:1,z:0,alive:true},{x:2,z:0,alive:true},{x:3,z:0,alive:true}
  ],base={player,enemies,cooldowns:[0,0,0],hp:55,maxHp:100,shield:0};
  assert.equal(autoSpellChoice({...base,upgrades:new Set()}),-1);
  assert.equal(autoSpellChoice({...base,upgrades:new Set(['watergarden'])}),0);
  assert.equal(autoSpellChoice({...base,upgrades:new Set(['tidalflower'])}),1);
  assert.equal(autoSpellChoice({...base,upgrades:new Set(['tideguard'])}),2);
});

test('functional Pixi water-link and wave visuals and distinct fusion sounds',()=>{
  const pixi=read('../src/pixi-combat.js'),
    sound=read('../src/spell-animation.js'),
    main=read('../src/main.js');
  assert.ok(pixi.includes("waterLink(from,to,type='chain')"));
  assert.ok(pixi.includes('waterWave(x,z,angle,length,width)'));
  assert.ok(main.includes('daisugiFireWave(target)'));
  assert.ok(main.includes('daisugiChainFrom(struck,p.damage)'));
  assert.ok(main.includes("p.daisugiMode==='bounce'"));
  assert.ok(main.includes("spellFX.sound('Nature Fusion',event.kind)"));
  for(const signature of ['Water Chain','Water Ricochet','Water Wave',
    'Daisugi Upgrade','Nature Fusion','Nature Bloom'])
    assert.ok(sound.includes("name==='"+signature+"'"),signature);
});

test('Daisugi zooms only its camera while leaving the original world and walk pace intact',()=>{
  const main=read('../src/main.js');
  const layout=read('../src/open-layout.js');
  assert.ok(main.includes('const DAISUGI_CAMERA_WORLD_WIDTH=24.5;'));
  assert.ok(main.includes('?(DAISUGI_MODE?DAISUGI_CAMERA_WORLD_WIDTH:WILD_CAMERA_WIDTH)'));
  assert.ok(layout.includes('WILD_CAMERA_WIDTH=29.5'));
  assert.ok(layout.includes('WILD_RADIUS=43'));
  assert.equal(CLASS_DATA.caster.speed,5.25);
  assert.ok(main.includes("const dz=OPEN_WORLD?z*game.spec.speed*dt:"));
});
test('Daisugi boost and result panels stay readable instead of white on white',()=>{
  const css=read('../styles.css'),html=read('../index.html');
  assert.ok(css.includes('/* DAISUGI 1.2 • camera and dark dialog'));
  for(const id of ['boostScreen','resultScreen']){
    assert.ok(css.includes('.wildpath-open.daisugi-rework #'+id+' .dialog'));
  }
  assert.ok(css.includes('background:linear-gradient(155deg,#206772f7'));
  assert.ok(css.includes('#boostScreen .boost-card strong{color:#fff2ad}'));
  assert.ok(css.includes('#resultScreen #resultScore'));
  assert.ok(html.includes('styles.css?v=2.9.7-hex-grass-crisp-texture'));
  assert.ok(html.includes('main.js?v=2.9.7-hex-grass-crisp-texture'));
});
