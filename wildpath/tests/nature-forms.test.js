import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlantForm,describePlantForm} from '../src/nature-forms.js';
import {NATURE_VARIANTS,chooseNatureLook} from '../src/nature-variety.js';
test('every tree palette and variant has a visible fork and multiple crown clusters',()=>{
 for(const tier of ['tree','blossom']){
  for(const variant of NATURE_VARIANTS[tier]){
    const data=describePlantForm({tier,variant},8.17);
    assert.ok(data.trunkSections>=2,tier+variant+' trunk');
    assert.ok(data.branches>=3,tier+variant+' branches');
    assert.ok(data.leafClusters>=6,tier+variant+' canopy');
    assert.ok(data.extentY>2,tier+variant+' height');
    assert.ok(data.parts<=26,'mobile mesh budget per plant');
  }
 }
});
test('each bush has real leaf blades and separate flowers',()=>{
 for(const variant of NATURE_VARIANTS.bush){
  const parts=makePlantForm({tier:'bush',variant},3);
  assert.ok(parts.some(p=>p.kind==='blade'));
  assert.ok(parts.filter(p=>p.kind==='petal'||p.kind==='accent').length>=4);
  assert.ok(parts.length<=30);
 }
});
test('each flower silhouette has stems and distinct radial petals',()=>{
 for(const variant of NATURE_VARIANTS.flower){
  const parts=makePlantForm({tier:'flower',variant},1);
  assert.ok(parts.some(p=>p.kind==='stem'));
  assert.ok(parts.filter(p=>p.kind==='petal'||p.kind==='accent').length>=4);
 }
});
test('nature color choices remain independent from geometry',()=>{
 const palettes=new Set();
 for(let i=1;i<=18;i++){
   const look=chooseNatureLook({id:i,tier:'blossom',species:'mossling'});
   const parts=makePlantForm(look,i);
   assert.ok(parts.length>10);
   palettes.add(look.palette);
 }
 assert.equal(palettes.size,6);
});
