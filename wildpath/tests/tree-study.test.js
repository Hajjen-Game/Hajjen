import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ART_DIRECTION as V1} from '../tree-study/tree-model-v1.js';
import {ART_DIRECTION as V2} from '../tree-study/tree-model.js';
import {ART_DIRECTION as V3} from '../tree-study/tree-model-v3.js';
import {ART_DIRECTION as V4} from '../tree-study/tree-model-v4.js';
import {ART_DIRECTION as V5} from '../tree-study/tree-model-v5.js';
import {ART_DIRECTION as V6} from '../tree-study/tree-model-v6.js';

const source = path => readFileSync(new URL(path,import.meta.url),'utf8');

test('six tree versions remain available and 6.0 is the default',()=>{
 assert.equal(V1.name,'Willowglow — hand-shaped forest elder');
 assert.equal(V2.name,'Willowglow — hand-shaped forest elder 2.0');
 assert.equal(V3.name,'Willowglow — sculpted foliage study 3.0');
 assert.equal(V4.name,'Willowglow — layered sculpted leaf clusters 4.0');
 assert.equal(V5.name,'Willowglow — cluster identity and depth 5.0');
 assert.equal(V6.name,'Willowglow — organic foliage massing 6.0');
 const app=source('../tree-study/main.js');
 for(const i of [1,2,3,4,5,6]) assert.match(app,new RegExp('buildV'+i));
 assert.match(app,/compareV5\?buildV5:buildV6/);
 assert.match(app,/compareV5\?'v5':'v6'/);
 const html=source('../tree-study/index.html');
 assert.match(html,/main\.js\?v=16\.0/);
 assert.match(html,/Tree Study 6\.0/);
 assert.match(html,/id="quickCompare"/);
 assert.match(html,/id="infoButton"/);
});

test('6.0 reshapes foliage into alternate leaves on curving twigs, not rosettes',()=>{
 const model=source('../tree-study/tree-model-v6.js');
 assert.match(model,/organic foliage massing 6\.0/);
 assert.match(model,/const crowns = \[/);
 const sprays=[...model.matchAll(/sprays:(\d+),sweep:/g)].map(m=>Number(m[1]));
 assert.equal(sprays.length,9);
 assert.equal(sprays.reduce((a,b)=>a+b,0),201);
 assert.match(model,/function leafyTwig\(/);
 assert.match(model,/const stagger=\(node%2===0\?1:-1\)/);
 assert.match(model,/const tilt=crown\.hang/);
 assert.match(model,/staggered sequence of leafy nodes/);
 assert.match(model,/shaded hanging undergrowth \/ leaf twigs/);
 assert.match(model,/natural sunlit layered foliage \/ leaf twigs/);
 assert.doesNotMatch(model,/const count=10\+\(p%3\)/);
 assert.doesNotMatch(model,/const theta=2\*Math\.PI\*k\/count/);
 assert.doesNotMatch(model,/sculpted foliage pavilions/);
 assert.doesNotMatch(model,/B\.MeshBuilder\.CreateSphere/);
 assert.doesNotMatch(model,/addShadowCaster\(leafMesh\)/);
});

test('focus review and soft shadow controls continue working for 6.0',()=>{
 const app=source('../tree-study/main.js');
 assert.match(app,/const isFocus=version==='v5'\|\|version==='v6'/);
 assert.match(app,/quickCompare\.href=version==='v6'\?'\.\/\?tree=v5'/);
 assert.match(app,/if\(version==='v3'\|\|version==='v4'\|\|version==='v5'\|\|version==='v6'\)/);
 assert.match(app,/softShades\.forEach\(shade=>shade\.setEnabled\(hasShadows\)\)/);
 const css=source('../tree-study/style.css');
 assert.match(css,/body\.tree-study-v5\.focus-view \.scorecard\{display:none\}/);
});
