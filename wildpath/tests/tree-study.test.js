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

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('8.0 is the default; studies 1–7 remain selectable',()=>{
 assert.equal(V8.name,'Willowglow — leaf layering and richer shading 8.0');
 for(const v of [V1,V2,V3,V4,V5,V6,V7])assert.ok(v.name.startsWith('Willowglow'));
 const main=source('../tree-study/main.js'),html=source('../tree-study/index.html');
 for(let i=1;i<=8;i++)assert.ok(main.includes('buildV'+i));
 assert.ok(main.includes("compareV7?buildV7:buildV8"));
 assert.ok(main.includes("compareV7?'v7':'v8'"));
 assert.ok(main.includes("tree-model-v8.js?v=18.0"));
 assert.ok(html.includes('id="passLabel">WILDPATH / PASS 18'));
 assert.ok(html.includes('id="silhouette"'));
 assert.ok(html.includes('main.js?v=18.0'));
 assert.ok(html.includes('style.css?v=18.0'));
 assert.ok(html.includes('tree=v7&amp;rev=18'));
});

test('8.0 preserves the 7.0 artist-designed silhouette and creates three actual leaf layers',()=>{
 const model=source('../tree-study/tree-model-v8.js');
 const old=source('../tree-study/tree-model-v7.js');
 const counts=s=>[...s.matchAll(/leaves:(\d+),lean:/g)].map(x=>Number(x[1]));
 assert.deepEqual(counts(model),counts(old));
 assert.equal(counts(model).length,9);
 assert.equal(counts(model).reduce((a,b)=>a+b,0),2711);
 assert.ok(model.includes('dark inner foliage'));
 assert.ok(model.includes('rich middle foliage'));
 assert.ok(model.includes('lit exterior foliage'));
 assert.ok(model.includes('ratio:.24,radius:.58'));
 assert.ok(model.includes('ratio:.37,radius:.80'));
 assert.ok(model.includes('ratio:.78,radius:.96'));
 assert.ok(model.includes('B.VertexData.ComputeNormals'));
 assert.ok(model.includes('const innerMesh=finishBatch(batches[0],0)'));
 assert.ok(model.includes('const middleMesh=finishBatch(batches[1],1)'));
 assert.ok(model.includes('const outerMesh=finishBatch(batches[2],2)'));
 assert.ok(!model.includes('sculpted foliage pavilions'));
 assert.ok(!model.includes('B.MeshBuilder.CreateSphere'));
});

test('8.0 provides contrasting leaf shading pockets and a cleaner A51 review UI',()=>{
 const model=source('../tree-study/tree-model-v8.js');
 const main=source('../tree-study/main.js');
 const css=source('../tree-study/style.css');
 assert.ok(model.includes('const pocket=Math.max(0,Math.sin(az*2.7+ci*.94)'));
 assert.ok(model.includes('if(layer===2&&(i+ci*7)%11===0)'));
 assert.ok(model.includes('mat.twoSidedLighting=true'));
 assert.ok(main.includes("version==='v7'||version==='v8'"));
 assert.ok(main.includes("document.body.classList.toggle('tree-study-v8',version==='v8')"));
 assert.ok(main.includes("quickCompare.href=version==='v8'?'./?tree=v7&'+revision"));
 assert.ok(css.includes('body.tree-study-v8 .controls{'));
 assert.ok(css.includes('background:transparent;border:0;box-shadow:none'));
 assert.ok(main.includes('hero.root.getChildMeshes(false)'));
 assert.ok(main.includes('softShades.forEach(shade=>shade.setEnabled(hasShadows))'));
});
