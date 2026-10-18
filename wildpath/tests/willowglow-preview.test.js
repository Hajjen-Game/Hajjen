import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isWillowglowPreviewRequested,WILLOWGLOW_IN_GAME,WILLOWGLOW_SIZES,
  WILLOWGLOW_STYLES,WILLOWGLOW_PALETTES} from '../src/willowglow-preview.js';
import {lowpolyPaletteForLobe} from '../src/willowglow-lowpoly.js';
import {NATURE_PALETTES,NATURE_PALETTE_IDS} from '../src/nature-variety.js';
import {ART_DIRECTION} from '../tree-study/tree-model-v11.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('opt-in experiment: normal open world and classic world stay untouched',()=>{
  assert.equal(isWillowglowPreviewRequested('',true),false);
  assert.equal(isWillowglowPreviewRequested('?debug=1',true),false);
  assert.equal(isWillowglowPreviewRequested('?willowglow=0',true),false);
  assert.equal(isWillowglowPreviewRequested('?willowglow=1',false),false);
  assert.equal(isWillowglowPreviewRequested('?willowglow=1',true),true);
  assert.equal(ART_DIRECTION.name,'Willowglow — lower trunk and softer fork 11.0');
  const main=read('../src/main.js');
  assert.ok(main.includes("get('world')!=='classic'"));
  assert.ok(main.includes('const world=OPEN_WORLD?createOpenWorld(scene):createWorld(scene);'));
  assert.ok(main.includes('camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;'));
  assert.ok(main.includes('nature?.update(dt,game)'));
  assert.ok(main.includes('director.tick(dt,game)'));
  assert.ok(!read('../src/nature-growth.js').includes('buildLowPolyWillowglow'));
  assert.ok(!read('../src/world-open.js').includes('buildLowPolyWillowglow'));
});

test('preserve one tree, single ground contact and three existing scale choices',()=>{
  const {x,z,scale}=WILLOWGLOW_IN_GAME;
  assert.equal(WILLOWGLOW_IN_GAME.version,'low-poly-1.0');
  assert.ok(x>3.5&&x<8&&z>3&&z<9&&Math.hypot(x,z)>5);
  assert.equal(scale,1.32);
  assert.deepEqual(WILLOWGLOW_SIZES,{S:1.056,M:1.32,L:1.584});
  assert.equal(WILLOWGLOW_IN_GAME.baseScale,.66);
  assert.deepEqual(WILLOWGLOW_STYLES,['lowpoly','original']);
  const source=read('../src/willowglow-preview.js');
  assert.ok(source.includes('buildHeroTree(B,scene,null)'));
  assert.ok(source.includes('buildLowPolyWillowglow(B,scene,{palette:selectedPalette})'));
  assert.ok(source.includes('tree.root.scaling.setAll(scale)'));
  assert.ok(source.includes('shadow.scaling.setAll(scale/baseScale)'));
  assert.ok(source.includes("selectedSize='M'"));
  assert.ok(source.includes('function setStyle(style)'));
  assert.ok(source.includes('function setPalette(palette)'));
  assert.ok(source.includes('disposeTree(old)'));
  assert.ok(source.includes('get meshes(){return tree.root.getChildMeshes(false).length;}'));
  assert.ok(source.includes('mesh.isPickable=false'));
  assert.ok(source.includes('shadow.isPickable=false'));
  assert.ok(source.includes('shadowMat.opacityTexture=texture'));
  assert.ok(!source.includes('new B.ShadowGenerator'));
});

test('faceted polygonal geometry rather than recolored V11 leaves or sphere canopy',()=>{
  const model=read('../src/willowglow-lowpoly.js');
  assert.ok(model.includes('const sides=7;'));
  assert.ok(model.includes('function prism(path,sides=7)'));
  assert.ok(model.includes('function clump('));
  assert.ok(model.includes('B.VertexData.ComputeNormals'));
  assert.ok(model.includes('mat.twoSidedLighting=true'));
  assert.ok(model.includes('mesh('));
  assert.ok(!model.includes('MeshBuilder.CreateSphere'));
  assert.ok(!model.includes('buildHeroTree'));
  assert.ok(!model.includes('new B.ShadowGenerator'));
  assert.ok(model.includes('tuftCount++'));
  // Original V11 remains an untouched genuine fine-leaf sculpt.
  const original=read('../tree-study/tree-model-v11.js');
  assert.ok(original.includes('const layers=['));
  assert.ok(original.includes('const crownLowering=.62;'));
});

test('every palette reuses exact real game Nature Rebirth colors',()=>{
  assert.deepEqual(WILLOWGLOW_PALETTES,['mixed',...NATURE_PALETTE_IDS]);
  for(const name of NATURE_PALETTE_IDS){
    assert.equal(lowpolyPaletteForLobe(name,0),NATURE_PALETTES[name]);
    assert.equal(lowpolyPaletteForLobe(name,8),NATURE_PALETTES[name]);
  }
  assert.notEqual(lowpolyPaletteForLobe('mixed',0),lowpolyPaletteForLobe('mixed',4));
  assert.throws(()=>lowpolyPaletteForLobe('unknown',0),/Unknown/);
});

test('game exposes live original/low-poly, palette, size controls and QA metrics',()=>{
  const html=read('../index.html'),main=read('../src/main.js');
  assert.ok(html.includes('main.js?v=2.7.3-tree-lowpoly1'));
  assert.ok(html.includes('id="treeReadabilityPanel"'));
  assert.ok(html.includes('id="treeReadabilityPalettes"'));
  for(const size of ['S','M','L'])assert.ok(html.includes('data-tree-size="'+size+'"'));
  for(const style of WILLOWGLOW_STYLES)
    assert.ok(html.includes('data-tree-style="'+style+'"'));
  for(const palette of WILLOWGLOW_PALETTES)
    assert.ok(html.includes('data-tree-palette="'+palette+'"'));
  assert.ok(main.includes('chooseWillowglowSize(button.dataset.treeSize)'));
  assert.ok(main.includes('chooseWillowglowStyle(button.dataset.treeStyle)'));
  assert.ok(main.includes('chooseWillowglowPalette(button.dataset.treePalette)'));
  assert.ok(main.includes("treeReadabilityPanel.hidden=!WILLOWGLOW_PREVIEW"));
  assert.ok(main.includes("style:willowglow.style,palette:willowglow.palette"));
  assert.ok(main.includes('triangles:willowglow.stats.triangles'));
  assert.ok(read('../styles.css').includes('.tree-palette-grid'));
  assert.ok(read('../styles.css').includes('.tree-palette-choices[hidden]'));
});
