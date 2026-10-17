import test from 'node:test';
import assert from 'node:assert/strict';
import {NATURE_PALETTES,NATURE_PALETTE_IDS,NATURE_VARIANTS,NATURE_SCALE,
  chooseNatureLook,natureVisibility} from '../src/nature-variety.js';
test('six coherent colored palettes support roses, violets, orange and mint',()=>{
  assert.ok(NATURE_PALETTE_IDS.length>=6);
  for(const id of ['rose','lilac','amber','mint','aqua','cream']){
    const palette=NATURE_PALETTES[id];
    assert.match(palette.leaf,/^#[0-9a-f]{6}$/);
    assert.match(palette.petal,/^#[0-9a-f]{6}$/);
    assert.equal(typeof palette.fx,'number');
  }
});
test('three unique flowers, three bushes and four tree silhouettes',()=>{
  assert.equal(NATURE_VARIANTS.flower.length,3);
  assert.equal(NATURE_VARIANTS.bush.length,3);
  assert.equal(NATURE_VARIANTS.tree.length,4);
  assert.equal(NATURE_VARIANTS.blossom.length,4);
});
test('repeated ordinary kills still produce ALL palette families',()=>{
  const palettes=new Set();
  for(let id=1;id<=18;id++)palettes.add(chooseNatureLook({id,tier:'flower',species:'mossling'}).palette);
  assert.deepEqual([...palettes].sort(),[...NATURE_PALETTE_IDS].sort());
});
test('tier upgrades preserve existing palette, increase scale and vary shape',()=>{
  const e={id:5,tier:'flower',species:'bramble'};
  const flower=chooseNatureLook(e);
  const bush=chooseNatureLook({...e,tier:'bush'},flower);
  const tree=chooseNatureLook({...e,tier:'tree'},bush);
  const blossom=chooseNatureLook({...e,tier:'blossom'},tree);
  assert.equal(flower.palette,blossom.palette);
  assert.ok(flower.scale<bush.scale&&bush.scale<tree.scale&&tree.scale<blossom.scale);
  assert.ok(tree.scale>1.5&&blossom.scale>2);
  assert.equal(blossom.rare,true);
});
test('canopy occlusion fades individual large trees near the player',()=>{
  assert.equal(natureVisibility(1,'flower'),1);
  assert.ok(natureVisibility(1,'blossom')<.3);
  assert.equal(natureVisibility(20,'blossom'),1);
  assert.equal(natureVisibility(20,'tree'),1);
});
