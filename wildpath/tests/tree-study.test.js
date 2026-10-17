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
import {ART_DIRECTION as V10} from '../tree-study/tree-model-v10.js';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('v10 is the default and all studies 1–9 remain available',()=>{
  assert.equal(V10.name,'Willowglow — trunk character and branch weight 10.0');
  assert.ok([V1,V2,V3,V4,V5,V6,V7,V8,V9].every(a=>a.name.startsWith('Willowglow')));
  const js=source('../tree-study/main.js'),html=source('../tree-study/index.html');
  for(let i=1;i<=10;i++)assert.ok(js.includes('buildV'+i),'Missing v'+i);
  assert.ok(js.includes('compareV9?buildV9:buildV10'));
  assert.ok(js.includes("compareV9?'v9':'v10'"));
  assert.ok(js.includes('tree-model-v10.js?v=20.0'));
  assert.ok(html.includes('WILDPATH / PASS 20'));
  assert.ok(html.includes('Tree Study 10.0'));
  assert.ok(html.includes('main.js?v=20.0'));
  assert.ok(html.includes('style.css?v=20.0'));
  assert.ok(html.includes('tree=v9&amp;rev=20'));
  assert.ok(html.includes('tree=v8&amp;rev=20'));
});

test('v10 foliage and all nine crown envelopes remain byte-for-byte equivalent to v9',()=>{
  const old=source('../tree-study/tree-model-v9.js');
  const now=source('../tree-study/tree-model-v10.js');
  const crown=s=>s.slice(s.indexOf('  // These nine design envelopes'),s.indexOf('  // Four fine secondary branches'));
  assert.equal(crown(now),crown(old));
  const leaf=s=>s.slice(s.indexOf('  // REAL curved leaf blades'),s.indexOf('  // Painted blossom geometry'));
  assert.equal(leaf(now).replaceAll("'10.0 / '","'9.0 / '"),leaf(old));
  const counts=[...now.matchAll(/leaves:(\d+),lean:/g)].map(x=>Number(x[1]));
  assert.equal(counts.length,9);
  assert.equal(counts.reduce((sum,n)=>sum+n,0),2711);
  assert.ok(!now.includes('B.MeshBuilder.CreateSphere'));
  assert.ok(!now.includes('sculpted foliage pavilions'));
});

test('v10 trunk has flared continuous profile, subdued buried roots, 6 different weighted boughs',()=>{
  const code=source('../tree-study/tree-model-v10.js');
  assert.ok(code.includes('function sculptedWood('));
  assert.ok(code.includes("sculptedWood('sculpted continuous trunk'"));
  assert.ok(code.includes('const buttress=.135*Math.exp(-t*23)'));
  assert.ok(code.includes('const fork=.055*Math.exp('));
  assert.ok(code.includes('const roots=['));
  assert.equal((code.match(/subtle root buttress/g)||[]).length,1); // generated runtime prefix
  assert.ok(code.includes("roots.forEach((r,i)=>sculptedWood('subtle root buttress '"));
  assert.ok(code.includes('const boughs=['));
  assert.ok(code.includes('for(const b of boughs)sculptedWood('));
  assert.ok(code.includes('const shoots=['));
  assert.ok(code.includes('B.VertexData.ComputeNormals(positions,indices,vd.normals)'));
  assert.ok(code.includes('mesh.useVertexColors=true'));
  assert.ok(code.includes('shadows?.addShadowCaster(mesh)'));
  assert.ok(!code.includes('B.MeshBuilder.CreateTube'));
});

test('v10 viewer stays mobile-friendly with silhouette review and v9 comparison',()=>{
  const app=source('../tree-study/main.js');
  const css=source('../tree-study/style.css');
  assert.ok(app.includes("const hasSilhouette=['v7','v8','v9','v10'].includes(version)"));
  assert.ok(app.includes("document.body.classList.toggle('tree-study-v10',version==='v10')"));
  assert.ok(app.includes("quickCompare.href=version==='v10'?'./?tree=v9&'+revision"));
  assert.ok(app.includes("const revision='rev=20'"));
  assert.ok(app.includes('hero.root.getChildMeshes(false)'));
  assert.ok(app.includes('softShades.forEach(shade=>shade.setEnabled(hasShadows))'));
  assert.ok(css.includes('body.tree-study-v10 .quick-compare'));
  assert.ok(css.includes('body.tree-study-v8 .controls{'));
});
