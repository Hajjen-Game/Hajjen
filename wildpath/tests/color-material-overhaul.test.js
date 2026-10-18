import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NATURE_PALETTES,NATURE_PALETTE_IDS} from '../src/nature-variety.js';
const src=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('Color & Material A.1: saturated low-cost ground gradient, not new puddles',()=>{
  const world=src('../src/world-open.js'),main=src('../src/main.js');
  assert.ok(world.includes('subdivisions:20'));
  assert.ok(world.includes('ground.setVerticesData(B.VertexBuffer.ColorKind,colors)'));
  assert.ok(world.includes('ground.useVertexColors=true'));
  assert.ok(world.includes('Math.pow(r,1.55)'));
  assert.ok(main.includes('sunshine.intensity = .64;'));
  assert.ok(main.includes('ambient.intensity = .63;'));
  assert.ok(!main.includes('new LivingWater'));
  assert.ok(!main.includes('mountWillowglowPreview'));
});

test('Color & Material 1.0: six coherent vivid nature families and glossy materials',()=>{
  assert.deepEqual(NATURE_PALETTE_IDS,['rose','lilac','amber','mint','aqua','cream']);
  for(const id of NATURE_PALETTE_IDS){
    const pal=NATURE_PALETTES[id];
    for(const key of ['leaf','light','petal','accent','glow'])
      assert.match(pal[key],/^#[0-9a-f]{6}$/);
    const chroma=hex=>{
      const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
      return (Math.max(...rgb)-Math.min(...rgb))/255;
    };
    assert.ok(chroma(pal.petal)>.20,id+' petals must have a clear colored identity');
  }
  const material=src('../src/nature-growth.js');
  assert.ok(material.includes('m.specularPower=67'));
  assert.ok(material.includes('from \'./nature-variety.js?v=3.1.0\''));
  assert.ok(material.includes('this.shadowTexture'));
  assert.ok(material.includes('planNatureFusions'));
});

test('Color & Material 1.0: hero and enemy shader colors, no expensive postprocess',()=>{
  const actors=src('../src/actors-v2.js');
  assert.ok(actors.includes('m.specularPower=85'));
  assert.ok(actors.includes('hero top pearl glint'));
  assert.ok(actors.includes('if(!enemy)'));
  assert.ok(actors.includes('#00bddf'));
  assert.ok(actors.includes('#ff9450'));
  assert.ok(!actors.includes('GlowLayer'));
  assert.ok(!actors.includes('ShadowGenerator'));
});

test('Color & Material 1.0: water spells and pickups remain distinctly colored',()=>{
  const pixi=src('../src/pixi-combat.js');
  const water=src('../src/water-pixi.js');
  const main=src('../src/main.js');
  assert.ok(pixi.includes('0xffb52f'));
  assert.ok(pixi.includes('0x0ac2df'));
  assert.ok(water.includes('0x08c7ea'));
  assert.ok(pixi.includes('drawRainfallField'));
  assert.ok(!pixi.includes('drawWaterSurfaces'));
  assert.ok(main.includes("lightOrb(scene,'#ffa933',.81)"));
  assert.ok(main.includes('hurtEnemy(e,power.damage'));
});

test('Color & Material 1.0: glossy panels without moving HUD or changing combat rules',()=>{
  const css=src('../styles.css'),html=src('../index.html'),main=src('../src/main.js');
  assert.ok(css.includes('Color & Material Overhaul 1.0'));
  for(const selector of ['.wildpath-open .hud-left',
    '.wildpath-open .energy-panel','.wildpath-open #goal',
    '.wildpath-open #bottomHud .ability.special.is-ready'])
      assert.ok(css.includes(selector),selector);
  assert.ok(html.includes('2.8.1-color-material-a1'));
  assert.ok(main.includes('director.tick(dt,game)'));
  assert.ok(main.includes('nature?.update(dt,game)'));
  assert.ok(main.includes('water:null,willowglow:null'));
  assert.ok(!html.includes('treeReadabilityPanel'));
  assert.ok(!html.includes('waterBadge'));
});

test('Pass A.1 reduces blown highlights while keeping distinct saturated hues',()=>{
  const main=src('../src/main.js'), world=src('../src/world-open.js'),
    nature=src('../src/nature-growth.js'), actors=src('../src/actors-v2.js'),
    css=src('../styles.css'), pixi=src('../src/pixi-combat.js'),
    water=src('../src/water-pixi.js');
  assert.ok(main.includes("scene.fogColor=B.Color3.FromHexString('#21483d')"));
  assert.ok(world.includes("sun=B.Color3.FromHexString('#44966c')"));
  assert.ok(world.includes("perimeter=B.Color3.FromHexString('#245949')"));
  assert.ok(world.includes("m.emissiveColor=c.scale(emit*.58)"));
  assert.ok(nature.includes("m.emissiveColor=c.scale(.055)"));
  assert.ok(actors.includes("m.specularColor=new B.Color3(.24,.28,.29)"));
  assert.ok(actors.includes("['#00bddf','#61daef','#056c91']"));
  assert.ok(css.includes('Exposure & Saturation Correction 1.1'));
  assert.ok(pixi.includes("core:0x8be8ea"));
  assert.ok(water.includes("0x68dfe9"));
  assert.ok(!main.includes('new LivingWater'));
  assert.ok(!main.includes('mountWillowglowPreview'));
});
