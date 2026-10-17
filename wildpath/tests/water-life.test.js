import test from 'node:test';import assert from 'node:assert/strict';
import {newWaterLedger,waterCast,waterKill,ageWater,waterState,visibleWaterSpell,
  WATER_MAX_SPOTS,WATER_MAX_PONDS} from '../src/water-life.js';
test('new Glintweaver names exist only in open forest',()=>{
 assert.equal(visibleWaterSpell('Crystal Bloom'), 'Tidal Bloom');
 assert.equal(visibleWaterSpell('Winter Pool'), 'Rainfall');
 assert.equal(visibleWaterSpell('Glint Dart'), 'Water Dart');
 assert.equal(visibleWaterSpell('Pale Guard'), 'Tide Guard');
 assert.equal(visibleWaterSpell('Crystal Bloom',false), 'Crystal Bloom');
});
test('rain and tidal blooms leave temporary wet patches; merge overlaps',()=>{
 const w=newWaterLedger();
 assert.ok(waterCast(w,{x:0,z:0,kind:'rain',time:1,radius:4}));
 const p=waterCast(w,{x:.6,z:.4,kind:'tide',time:2,radius:3});
 assert.equal(p.existing,true);assert.equal(waterState(w).spots,1);
 assert.equal(waterState(w).temporary,1);
});
test('three genuine kills inside the same wet patch promote a permanent pond',()=>{
 const w=newWaterLedger();waterCast(w,{x:2,z:3,kind:'rain',time:1,radius:5});
 assert.equal(waterKill(w,{x:2,z:3,time:2}).length,0);
 assert.equal(waterKill(w,{x:2,z:3,time:2.1}).length,0);
 const events=waterKill(w,{x:3,z:4,time:2.2});
 assert.equal(events.length,1);assert.equal(events[0].promoted,true);
 assert.equal(waterState(w).ponds,1);
 assert.deepEqual(ageWater(w,100),[]);
 assert.equal(waterState(w).ponds,1);
});
test('dry kills, expired water, out-of-range kills cannot grow ponds',()=>{
 const w=newWaterLedger();
 assert.deepEqual(waterKill(w,{x:0,z:0,time:1}),[]);
 waterCast(w,{x:0,z:0,kind:'tide',time:1,radius:2.4});
 for(let i=0;i<4;i++)waterKill(w,{x:20,z:20,time:2+i});
 assert.equal(waterState(w).ponds,0);
 assert.equal(ageWater(w,50).length,1);assert.equal(waterState(w).spots,0);
});
test('caps bound retained water and do not remove earned permanent ponds',()=>{
 const w=newWaterLedger();
 for(let i=0;i<30;i++)waterCast(w,{x:i*12,z:0,kind:'rain',time:i,radius:2});
 assert.equal(waterState(w).spots,WATER_MAX_SPOTS);
 assert.ok(WATER_MAX_PONDS<=WATER_MAX_SPOTS);
 assert.equal(waterCast(w,{x:NaN,z:0,kind:'rain',time:40}),null);
});
test('two overlapping wet zones never double-count a kill',()=>{
 const w=newWaterLedger();waterCast(w,{x:0,z:0,kind:'rain',time:1,radius:3});
 waterCast(w,{x:3.4,z:0,kind:'rain',time:1,radius:3});
 waterKill(w,{x:1.7,z:0,time:2});
 assert.equal(w.spots.reduce((n,p)=>n+p.kills,0),1);
});

test('a mature lily pond gains rare status at six nearby kills',()=>{
 const w=newWaterLedger();
 waterCast(w,{x:0,z:0,kind:'tide',time:1,radius:3});
 for(let i=0;i<5;i++)waterKill(w,{x:0,z:0,time:i+2});
 const events=waterKill(w,{x:0,z:0,time:7});
 assert.equal(events.length,1);assert.equal(events[0].evolved,true);
 assert.equal(waterState(w).rarePonds,1);
});

test('mobile water surfaces use explicit pastel geometry rather than black texture fallback',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../src/living-water.js',import.meta.url),'utf8');
 assert.match(src,/CreateDisc\(/);
 assert.match(src,/turquoise water body/);
 assert.match(src,/MATERIAL_ALPHABLEND/);
 assert.doesNotMatch(src,/DynamicTexture/);
});
