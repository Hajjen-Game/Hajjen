import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('no retired Willowglow experiment is mounted in playable Wildpath',()=>{
  const main=read('../src/main.js'),html=read('../index.html');
  assert.ok(main.includes('const world=OPEN_WORLD?createOpenWorld(scene):createWorld(scene);'));
  assert.ok(main.includes('camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;'));
  assert.ok(!main.includes('mountWillowglowPreview'));
  assert.ok(!main.includes('isWillowglowPreviewRequested'));
  assert.ok(!main.includes('willowglow-preview.js'));
  assert.ok(!main.includes('treeStyleFromUrl'));
  assert.ok(!main.includes('treeReadabilityPanel'));
  assert.ok(!html.includes('treeReadabilityPanel'));
  assert.ok(!html.includes('data-tree-palette'));
  assert.ok(!html.includes('willowglowPreviewNote'));
  assert.ok(!read('../styles.css').includes('.tree-readability-panel'));
});

test('no decorative wet terrain, permanent ponds or pond HUD remain',()=>{
  const main=read('../src/main.js'),html=read('../index.html');
  const pixi=read('../src/pixi-combat.js');
  assert.ok(!main.includes('new LivingWater'));
  assert.ok(!main.includes('living-water.js'));
  assert.ok(!main.includes('water?.cast'));
  assert.ok(!main.includes('water?.kill'));
  assert.ok(!main.includes('water?.update'));
  assert.ok(!main.includes('previewWaterGarden'));
  assert.ok(!main.includes('waterSurfaces'));
  assert.ok(!pixi.includes('drawWaterSurfaces'));
  assert.ok(!html.includes('waterBadge'));
  assert.ok(!read('../styles.css').includes('water-badge'));
});

test('water spells, combat damage, nature growth and fusion remain intact',()=>{
  const main=read('../src/main.js');
  assert.ok(main.includes('visibleWaterSpell(name,OPEN_WORLD)'));
  assert.ok(main.includes('const power=casterBloom(game.upgrades,OPEN_WORLD);'));
  assert.ok(main.includes('hurtEnemy(e,power.damage'));
  assert.ok(main.includes('game.areas.push({x,z,radius,life:power.life'));
  assert.ok(main.includes('nature?.apply(event,game)'));
  assert.ok(main.includes('nature?.update(dt,game)'));
  assert.ok(main.includes('director.tick(dt,game)'));
  assert.ok(read('../src/pixi-combat.js').includes('drawRainfallField'));
  assert.ok(read('../src/nature-growth.js').includes('onFusion'));
});

test('art study and water prototype source remains archived, unmounted',()=>{
  assert.ok(read('../tree-study/tree-model-v11.js').includes('buildHeroTree'));
  assert.ok(read('../src/willowglow-lowpoly.js').includes('buildLowPolyWillowglow'));
  assert.ok(read('../src/water-life.js').includes('waterCast'));
  assert.ok(read('../src/living-water.js').includes('class LivingWater'));
});
