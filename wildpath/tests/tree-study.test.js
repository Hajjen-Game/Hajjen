import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ART_DIRECTION as V1} from '../tree-study/tree-model-v1.js';
import {ART_DIRECTION as V2} from '../tree-study/tree-model.js';
import {ART_DIRECTION as V3} from '../tree-study/tree-model-v3.js';

const source = path => readFileSync(new URL(path,import.meta.url),'utf8');
test('Tree Study versions remain available for user A/B testing',()=>{
 assert.equal(V1.name,'Willowglow — hand-shaped forest elder');
 assert.equal(V2.name,'Willowglow — hand-shaped forest elder 2.0');
 assert.equal(V3.name,'Willowglow — sculpted foliage study 3.0');
 const main=source('../tree-study/main.js');
 assert.match(main,/compareV1\?buildV1:compareV2\?buildV2:buildV3/);
 assert.match(main,/selectedVersion==='v2'/);
 assert.match(source('../tree-study/index.html'),/id="compareLink"/);
 assert.match(source('../tree-study/index.html'),/id="compareOldLink"/);
});
test('3.0 uses actual sculpted and vertex-colored canopy volumes, not sphere crowns',()=>{
 const model=source('../tree-study/tree-model-v3.js');
 const second=source('../tree-study/tree-model.js');
 assert.match(model,/sculpted foliage pavilions/);
 assert.match(model,/massPositions/);
 assert.match(model,/massData\.applyToMesh/);
 assert.match(model,/canopyMat\.twoSidedLighting=true/);
 assert.match(model,/leafMesh\.useVertexColors=true/);
 assert.match(model,/const boughs = \[/);
 assert.doesNotMatch(model,/B\.MeshBuilder\.CreateSphere/);
 assert.doesNotMatch(second,/sculpted foliage pavilions/);
 const values=[...model.matchAll(/,n:(\d+)\}/g)].map(m=>Number(m[1]));
 assert.equal(values.length,12);
 assert.equal(values.reduce((a,b)=>a+b,0),775);
});
test('3.0 explicitly removes hard foliage mesh shadows and paints soft gradations',()=>{
 const model=source('../tree-study/tree-model-v3.js');
 const main=source('../tree-study/main.js');
 assert.doesNotMatch(model,/addShadowCaster\(leafMesh\)/);
 assert.doesNotMatch(model,/addShadowCaster\(volume\)/);
 assert.match(main,/softGroundShade\('soft broad canopy shade'/);
 assert.match(main,/createRadialGradient/);
 assert.match(main,/if\(version==='v3'\)/);
});
