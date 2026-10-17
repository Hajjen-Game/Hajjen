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
import {ART_DIRECTION as V8} from '../tree-study/tree-model-v8.js';
import {ART_DIRECTION as V9} from '../tree-study/tree-model-v9.js';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('v9 is default with earlier eight versions still available',()=>{
 assert.equal(V9.name,'Willowglow — sharper leaf cards and deeper occlusion 9.0');
 assert.ok([V1,V2,V3,V4,V5,V6,V7,V8].every(x=>x.name.startsWith('Willowglow')));
 const app=source('../tree-study/main.js'),html=source('../tree-study/index.html');
 for(let i=1;i<=9;i++)assert.ok(app.includes('buildV'+i));
 assert.ok(app.includes("compareV8?buildV8:buildV9"));
 assert.ok(app.includes("compareV8?'v8':'v9'"));
 assert.ok(app.includes("tree-model-v9.js?v=19.0"));
 assert.ok(html.includes('PASS 19'));
 assert.ok(html.includes('main.js?v=19.0'));
 assert.ok(html.includes('style.css?v=19.0'));
 assert.ok(html.includes('tree=v8&amp;rev=19'));
});

test('v9 preserves all nine art-directed crown envelopes from 8.0',()=>{
 const old=source('../tree-study/tree-model-v8.js');
 const now=source('../tree-study/tree-model-v9.js');
 const crown=s=>s.slice(s.indexOf('  const crowns = ['),s.indexOf('  // Four fine secondary branches'));
 assert.equal(crown(old),crown(now));
 const count=[...now.matchAll(/leaves:(\d+),lean:/g)].map(m=>Number(m[1]));
 assert.equal(count.length,9);
 assert.equal(count.reduce((a,b)=>a+b,0),2711);
 assert.ok(!now.includes('B.MeshBuilder.CreateSphere'));
 assert.ok(!now.includes('rosetteAxis'));
});

test('v9 creates sharper curved leaf tips, layered overlap shade and mobile budget',()=>{
 const now=source('../tree-study/tree-model-v9.js');
 for(const needle of [
 'const taper=t<.36?', 'raised=spine.add(lift.scale(w*.22))',
 'const d2=dx*dx+dy*dy+dz*dz',
 'const occlusion=clamp(overlap*.55+underside',
 'pigment=mix(pigment,deep,occlusion)',
 'if(layer===2&&i%13===0)',
 'ratio:.28,radius:.59', 'ratio:.43,radius:.80', 'ratio:.70,radius:.96',
 "9.0 / '+batch.name", 'B.VertexData.ComputeNormals'
 ])assert.ok(now.includes(needle),needle);
 const crowns=[...now.matchAll(/leaves:(\d+),lean:/g)].map(m=>Number(m[1]));
 const estimate=crowns.reduce((s,n)=>s+Math.round(n*.28)+Math.round(n*.43)+Math.round(n*.70)+Math.ceil(Math.round(n*.70)/13),0);
 assert.ok(estimate<4300,'Mobile leaf count exceeds safety target: '+estimate);
});

test('v9 stays accessible in compact mobile viewer and monochrome silhouette',()=>{
 const app=source('../tree-study/main.js');
 const css=source('../tree-study/style.css');
 assert.ok(app.includes("const hasSilhouette=version==='v7'||version==='v8'||version==='v9'"));
 assert.ok(app.includes("document.body.classList.toggle('tree-study-v9',version==='v9')"));
 assert.ok(app.includes("quickCompare.href=version==='v9'?'./?tree=v8&'+revision"));
 assert.ok(app.includes('hero.root.getChildMeshes(false)'));
 assert.ok(app.includes('softShades.forEach(shade=>shade.setEnabled(hasShadows))'));
 assert.ok(css.includes('body.tree-study-v9 .quick-compare'));
 assert.ok(css.includes('body.tree-study-v8 .controls{'));
});
