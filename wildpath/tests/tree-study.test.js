import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ART_DIRECTION as V1} from '../tree-study/tree-model-v1.js';
import {ART_DIRECTION as V2} from '../tree-study/tree-model.js';
import {ART_DIRECTION as V3} from '../tree-study/tree-model-v3.js';
import {ART_DIRECTION as V4} from '../tree-study/tree-model-v4.js';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('all four standalone tree versions are available for A/B review',()=>{
 assert.equal(V1.name,'Willowglow — hand-shaped forest elder');
 assert.equal(V2.name,'Willowglow — hand-shaped forest elder 2.0');
 assert.equal(V3.name,'Willowglow — sculpted foliage study 3.0');
 assert.equal(V4.name,'Willowglow — layered sculpted leaf clusters 4.0');
 const main=source('../tree-study/main.js');
 const index=source('../tree-study/index.html');
 for(const id of ['buildV1','buildV2','buildV3','buildV4'])assert.match(main,new RegExp(id));
 assert.match(main,/compareV1\?buildV1:compareV2\?buildV2:compareV3\?buildV3:buildV4/);
 assert.match(main,/version=compareV1\?'v1':compareV2\?'v2':compareV3\?'v3':'v4'/);
 assert.match(index,/id="compareLink"/);
 assert.match(index,/id="compareOldLink"/);
 assert.match(index,/main\.js\?v=14\.0/);
});

test('4.0 creates actual layered individual leaves, never a blob shell',()=>{
 const model=source('../tree-study/tree-model-v4.js');
 const previous=source('../tree-study/tree-model-v3.js');
 assert.match(previous,/sculpted foliage pavilions/);
 assert.doesNotMatch(model,/sculpted foliage pavilions/);
 assert.doesNotMatch(model,/B\.MeshBuilder\.CreateSphere/);
 assert.match(model,/multi-layer painted broadleaf foliage/);
 assert.match(model,/const boughs = \[/);
 assert.match(model,/const crowns = \[/);
 assert.match(model,/function leaf\(start,growth,length,width,baseShade,fold,jitter\)/);
 assert.match(model,/layer=p%4===0\?/);
 assert.match(model,/vd\.applyToMesh\(leafMesh\)/);
 assert.match(model,/leafMesh\.useVertexColors=true/);
 assert.match(model,/shadows\?\.addShadowCaster\(mesh\)/);
 assert.doesNotMatch(model,/shadows\?\.addShadowCaster\(leafMesh\)/);
 const patchCount=[...model.matchAll(/patches:(\d+)/g)].map(x=>Number(x[1]));
 assert.equal(patchCount.length,10);
 assert.equal(patchCount.reduce((a,b)=>a+b,0),191);
 assert.match(model,/fans:fanCount/);
});

test('4.0 uses neutral alpha-blended shade and does not modify main game',()=>{
 const main=source('../tree-study/main.js');
 assert.match(main,/if\(version==='v3'\|\|version==='v4'\)/);
 assert.match(main,/const dark=isFourth\?'25,37,29':'27,63,47'/);
 assert.match(main,/softGroundShade\('soft broad canopy shade'/);
 const model=source('../tree-study/tree-model-v4.js');
 assert.doesNotMatch(model,/https?:\/\//);
});
