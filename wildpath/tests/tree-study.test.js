import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ART_DIRECTION as V1} from '../tree-study/tree-model-v1.js';
import {ART_DIRECTION as V2} from '../tree-study/tree-model.js';
import {ART_DIRECTION as V3} from '../tree-study/tree-model-v3.js';
import {ART_DIRECTION as V4} from '../tree-study/tree-model-v4.js';
import {ART_DIRECTION as V5} from '../tree-study/tree-model-v5.js';
import {ART_DIRECTION as V6} from '../tree-study/tree-model-v6.js';
import {ART_DIRECTION as V7} from '../tree-study/tree-model-v7.js';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('Tree Study 7.0 is selected by default and earlier versions are preserved',()=>{
 assert.match(V7.name,/silhouette first 7\.0/);
 for(const old of [V1,V2,V3,V4,V5,V6])assert.ok(old.name.startsWith('Willowglow'));
 const app=source('../tree-study/main.js');
 const html=source('../tree-study/index.html');
 for(let n=1;n<=7;n++) assert.match(app,new RegExp('buildV'+n));
 assert.match(app,/compareV6\?buildV6:buildV7/);
 assert.match(app,/compareV6\?'v6':'v7'/);
 assert.match(app,/tree-model-v7\.js\?v=17\.0/);
 assert.match(html,/id="passLabel">WILDPATH \/ PASS 17/);
 assert.match(html,/id="studyTagline"/);
 assert.match(html,/id="silhouette"/);
 assert.match(html,/main\.js\?v=17\.0/);
 assert.match(html,/style\.css\?v=17\.0/);
 assert.match(html,/tree=v4&amp;rev=17/);
});

test('Silhouette is defined first, before curved leaves are distributed',()=>{
 const model=source('../tree-study/tree-model-v7.js');
 assert.match(model,/These nine design envelopes define the intended finished silhouette/);
 assert.match(model,/NOT rendered/);
 assert.match(model,/const crowns = \[/);
 const counts=[...model.matchAll(/leaves:(\d+),lean:/g)].map(x=>Number(x[1]));
 assert.equal(counts.length,9);
 assert.equal(counts.reduce((a,b)=>a+b,0),2711);
 assert.match(model,/const GOLDEN_ANGLE=2\.399963229728653/);
 assert.match(model,/tangential/);
 assert.match(model,/function addLeaf\(/);
 assert.match(model,/curved/);
 assert.doesNotMatch(model,/sculpted foliage pavilions/);
 assert.doesNotMatch(model,/CreateSphere/);
 assert.doesNotMatch(model,/rosetteAxis/);
 assert.doesNotMatch(model,/const count=10\+\(p%3\)/);
 assert.doesNotMatch(model,/addShadowCaster\(leafMesh\)/);
});

test('Real geometry can be inspected in single-color silhouette mode',()=>{
 const app=source('../tree-study/main.js');
 assert.match(app,/hero\.root\.getChildMeshes\(false\)/);
 assert.match(app,/B\.StandardMaterial\('true flat silhouette ink'/);
 assert.match(app,/mono\.disableLighting=true/);
 assert.match(app,/mesh\.material=silhouetteEnabled\?mono:material/);
 assert.match(app,/document\.body\.classList\.toggle\('silhouette-active',silhouetteEnabled\)/);
 assert.match(app,/focusInfo\.addEventListener\('click'/);
 assert.match(app,/softShades\.forEach\(shade=>shade\.setEnabled\(hasShadows\)\)/);
});
