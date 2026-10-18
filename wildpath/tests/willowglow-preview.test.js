import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isWillowglowPreviewRequested,WILLOWGLOW_IN_GAME,WILLOWGLOW_SIZES} from '../src/willowglow-preview.js';
import {ART_DIRECTION} from '../tree-study/tree-model-v11.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('preview only appears when explicitly requested in open world',()=>{
  assert.equal(isWillowglowPreviewRequested('',true),false);
  assert.equal(isWillowglowPreviewRequested('?debug=1',true),false);
  assert.equal(isWillowglowPreviewRequested('?willowglow=0',true),false);
  assert.equal(isWillowglowPreviewRequested('?willowglow=1',false),false);
  assert.equal(isWillowglowPreviewRequested('?willowglow=1',true),true);
  assert.equal(ART_DIRECTION.name,'Willowglow — lower trunk and softer fork 11.0');
});

test('one authored tree has three sizes and never creates additional tree meshes',()=>{
  const {x,z,scale}=WILLOWGLOW_IN_GAME;
  assert.equal(WILLOWGLOW_IN_GAME.version,'11.0');
  assert.ok(x>3.5&&x<8&&z>3&&z<9&&Math.hypot(x,z)>5);
  assert.equal(scale,1.32);
  assert.equal(WILLOWGLOW_SIZES.S,1.056);
  assert.equal(WILLOWGLOW_SIZES.M,1.32);
  assert.equal(WILLOWGLOW_SIZES.L,1.584);
  assert.equal(WILLOWGLOW_IN_GAME.baseScale,.66);
  const source=read('../src/willowglow-preview.js');
  assert.ok(source.includes('buildHeroTree(B,scene,null)'));
  assert.ok(source.includes('tree.root.scaling.setAll(scale)'));
  assert.ok(source.includes('shadow.scaling.setAll(scale/baseScale)'));
  assert.ok(source.includes("let selectedSize='M'"));
  assert.ok(source.includes('function setSize(size)'));
  assert.ok(!source.includes('createInstance('));
  assert.ok(source.includes('get scale(){return WILLOWGLOW_SIZES[selectedSize];}'));
  assert.ok(source.includes('tree.root.position.set(x,0,z)'));
  assert.ok(source.includes('mesh.isPickable=false'));
  assert.ok(source.includes('shadow.isPickable=false'));
  assert.ok(source.includes('shadowMat.opacityTexture=texture'));
  assert.ok(!source.includes('new B.ShadowGenerator'));
});

test('actual game camera, gameplay and normal scenery remain unchanged',()=>{
  const main=read('../src/main.js'),html=read('../index.html');
  assert.ok(main.includes("get('world')!=='classic'"));
  assert.ok(main.includes('camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;'));
  assert.ok(main.includes('const world=OPEN_WORLD?createOpenWorld(scene):createWorld(scene);'));
  assert.ok(main.includes('WILLOWGLOW_PREVIEW ? mountWillowglowPreview(B,scene) : null'));
  assert.ok(main.includes('camera.setTarget(V(camera.position.x+shakeX'));
  assert.ok(main.includes('nature?.update(dt,game)'));
  assert.ok(main.includes('director.tick(dt,game)'));
  assert.ok(main.includes('willowglow:willowglow?'));
  assert.ok(html.includes('id="willowglowPreviewNote"'));
  assert.ok(html.includes('main.js?v=2.7.3-tree-readability1'));
  assert.ok(html.includes('id="treeReadabilityPanel"'));
  for(const size of ['S','M','L'])assert.ok(html.includes('data-tree-size="'+size+'"'));
  assert.ok(main.includes('chooseWillowglowSize(button.dataset.treeSize)'));
  assert.ok(main.includes('treeReadabilityPanel.hidden=!WILLOWGLOW_PREVIEW'));
  assert.ok(main.includes('size:willowglow.size'));
  assert.ok(read('../styles.css').includes('.tree-readability-panel[hidden]'));
  assert.ok(!read('../src/nature-growth.js').includes('buildHeroTree'));
});

test('preview-specific foliage contrast is tuned without changing the master Tree Study',()=>{
  const source=read('../src/willowglow-preview.js');
  for(const name of ['dark inner foliage','rich middle foliage','lit exterior foliage'])
    assert.ok(source.includes(name));
  for(const hex of ['#9aaf97','#d0e4b7','#fff8d3'])
    assert.ok(source.includes(hex));
  assert.ok(source.includes('buildHeroTree(B,scene,null)'));
  const model=read('../tree-study/tree-model-v11.js');
  assert.ok(model.includes('const layers=['));
  assert.ok(model.includes('const crownLowering=.62;'));
});
