const test=require('node:test');
const assert=require('node:assert/strict');
const {replay,LEGACY}=require('../scripts/flow-balance-replay.cjs');
const {FLOW}=require('../src/core/config.js');

test('a fixed clean run reaches Chroma but spends less time saturated',()=>{
  const events=[{type:'start',time:0}];
  for(let i=0;i<32;i++)events.push({type:'obstacle_clear',time:2+i*1.1,precision:i%8===0});
  const log={format:'chroma-rush-round-audit',durationSeconds:38,events};
  const old=replay(log,LEGACY),current=replay(log,FLOW);
  assert.ok(old.chromaSeconds>current.chromaSeconds);
  assert.ok(old.maxedSeconds>current.maxedSeconds);
  assert.ok(current.chromaSeconds>0);
  assert.ok(current.firstChromaAt>old.firstChromaAt);
});
test('audit replay validates input and incorporates real damage events',()=>{
  assert.throws(()=>replay({}),/round audit/);
  const log={format:'chroma-rush-round-audit',durationSeconds:30,events:[
    {type:'start',time:0},
    ...Array.from({length:16},(_,i)=>({type:'obstacle_clear',time:1+i*.8})),
    {type:'obstacle_hit',time:16},{type:'perfect_zone',time:24}
  ]};
  assert.ok(replay(log).chromaSeconds<replay(log,LEGACY).chromaSeconds);
});
