import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ART_DIRECTION as V1} from '../tree-study/tree-model-v1.js';
import {ART_DIRECTION as V2} from '../tree-study/tree-model.js';
import {ART_DIRECTION as V3} from '../tree-study/tree-model-v3.js';
import {ART_DIRECTION as V4} from '../tree-study/tree-model-v4.js';
import {ART_DIRECTION as V5} from '../tree-study/tree-model-v5.js';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('five independently selectable versions including new default 5.0',()=>{
 assert.equal(V1.name,'Willowglow — hand-shaped forest elder');
 assert.equal(V2.name,'Willowglow — hand-shaped forest elder 2.0');
 assert.equal(V3.name,'Willowglow — sculpted foliage study 3.0');
 assert.equal(V4.name,'Willowglow — layered sculpted leaf clusters 4.0');
 assert.equal(V5.name,'Willowglow — cluster identity and depth 5.0');
 const app=source('../tree-study/main.js');
 const html=source('../tree-study/index.html');
 for(const i of [1,2,3,4,5]){
   assert.match(app,new RegExp('buildV'+i));
 }
 assert.match(app,/compareV4\?buildV4:buildV5/);
 assert.match(app,/compareV4\?'v4':'v5'/);
 assert.match(html,/main\.js\?v=15\.0/);
 assert.match(html,/id="infoButton"/);
 assert.match(html,/id="quickCompare"/);
 assert.match(html,/id="compareLink"/);
 assert.match(html,/id="compareOldLink"/);
});

test('5.0 uses nine named, staggered crowns with layered leaf meshes not smooth blobs',()=>{
 const model=source('../tree-study/tree-model-v5.js');
 const old=source('../tree-study/tree-model-v4.js');
 assert.match(model,/Nine \*individually readable\* crowns/);
 const counts=[...model.matchAll(/patches:(\d+),lean:/g)].map(m=>Number(m[1]));
 assert.equal(counts.length,9);
 assert.equal(counts.reduce((a,b)=>a+b,0),209);
 assert.match(model,/dark interior \/ separate leaf layers/);
 assert.match(model,/sunlit exterior \/ separate curved leaf layers/);
 assert.match(model,/const PHI=2\.399963229728653/);
 assert.match(model,/function buildLeaf\(/);
 assert.match(model,/finishBatch\(/);
 assert.match(model,/deepest=C\('#1f4936'\)/);
 assert.doesNotMatch(model,/sculpted foliage pavilions/);
 assert.doesNotMatch(model,/B\.MeshBuilder\.CreateSphere/);
 assert.doesNotMatch(model,/addShadowCaster\(leafMesh\)/);
 assert.match(old,/const crowns = \[/);
});

test('5.0 focus view allows mobile art review without obscuring the tree',()=>{
 const app=source('../tree-study/main.js');
 const css=source('../tree-study/style.css');
 assert.match(app,/document\.body\.classList\.add\('focus-view'\)/);
 assert.match(app,/focusInfo\.addEventListener\('click'/);
 assert.match(app,/softShades\.forEach\(shade=>shade\.setEnabled\(hasShadows\)\)/);
 assert.match(css,/body\.tree-study-v5\.focus-view \.scorecard\{display:none\}/);
 assert.match(css,/\.quick-compare/);
 assert.match(app,/softGroundShade\('soft broad canopy shade'/);
});
