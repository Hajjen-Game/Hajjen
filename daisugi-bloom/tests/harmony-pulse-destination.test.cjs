#!/usr/bin/env node
"use strict";
// Harmony Pulse × Fusion Destination Control 1.0: explicitly verify that
// Pulse always radiates from the REAL stage-five location after relocation,
// before harvest, gravity and refill. No rendering mocks or arbitrary wins.
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const p=(family,stage=1,id=1)=>({family,stage,id});
const blank=()=>Array.from({length:49},(_,i)=>
 p(["sakura","lantern","koi","fan"][(Math.floor(i/7)+2*(i%7))%4],1,i+1));
const fixture=(level=10)=>{
 const g=new R.Game(level,null,{seed:20261024,directorMode:"standard"});
 g.board=blank();
 g.mist=Array(49).fill(0);
 return g;
};
const test=(name,fn)=>{fn();console.log("PASS "+name);};
const sorted=a=>a.slice().sort((x,y)=>x-y);
const targetCells=evt=>sorted(evt.targets.map(t=>t.to));
test("Moved stage-four identity becomes stage five ONLY on the selected destination",()=>{
 const g=fixture();
 for(const i of [17,23,25])g.board[i].family="sakura";
 g.board[23].stage=4;
 const strongestId=g.board[23].id;
 g.config={...g.config,goal:{type:"mist",count:5}};
 for(const at of [16,17,23,24,31])g.mist[at]=1;
 assert.equal(R.scan(g.board).length,0);
 const result=g.swap(17,24);
 assert(result.ok);
 const fusion=result.events.find(e=>e.type==="fusion");
 const hero=result.events.find(e=>e.type==="hero");
 const pulse=result.events.find(e=>e.type==="pulse");
 const harvest=result.events.find(e=>e.type==="harvest");
 assert(fusion&&hero&&pulse&&harvest);
 assert.equal(fusion.groups[0].at,24);
 assert.equal(fusion.groups[0].origin,23);
 assert.equal(fusion.board[24].id,strongestId);
 assert.equal(fusion.board[24].stage,5);
 assert.equal(fusion.board[23],null);
 assert.deepEqual(hero.positions,[24]);
 assert.deepEqual(pulse.sources,[24]);
 assert.deepEqual(targetCells(pulse),[17,31],"Only occupied orthogonal neighbours of destination are hit");
 assert.equal(pulse.targets.some(t=>t.from===23),false,"Old position never emits Pulse");
 assert.deepEqual(fusion.clearedMist,[24]);
 assert.deepEqual(sorted(pulse.clearedMist),[17,31]);
 assert.equal(pulse.mist[23],1,"Consumed former source remains mist-covered");
 assert.equal(pulse.mist[16],1,"Fog adjacent to the OLD position does not clear");
 assert.equal(harvest.positions.includes(24),true);
 assert.equal(result.events.findIndex(e=>e.type==="harvest")<result.events.findIndex(e=>e.type==="fall"),true);
});
test("Reversed input orientation chooses the actual matching cell and the same Pulse origin",()=>{
 const setup=()=>{
  const g=fixture();
  for(const i of [17,23,25])g.board[i].family="sakura";
  g.board[23].stage=4;
  return g;
 };
 const a=setup(),b=setup();
 const forward=a.swap(17,24),backward=b.swap(24,17);
 assert(forward.ok&&backward.ok);
 for(const outcome of [forward,backward]){
  const fusion=outcome.events.find(e=>e.type==="fusion");
  const pulse=outcome.events.find(e=>e.type==="pulse");
  assert.equal(fusion.groups[0].at,24);
  assert.deepEqual(pulse.sources,[24]);
  assert.deepEqual(targetCells(pulse),[17,31]);
 }
 assert.deepEqual(a.board,b.board,"Orientation must not change post-turn identities");
});
test("Pulse from an edge destination never reaches a former top-left source or diagonals",()=>{
 const g=fixture();
 for(const at of [0,1,2])g.board[at].family="sakura";
 g.board[0].stage=4;
 g.config={...g.config,goal:{type:"mist",count:2}};
 g.mist[7]=1;g.mist[8]=1;
 const events=g.resolve(1);
 const fusion=events.find(e=>e.type==="fusion");
 const pulse=events.find(e=>e.type==="pulse");
 assert(fusion&&pulse);
 assert.equal(fusion.groups[0].at,1);
 assert.equal(fusion.groups[0].origin,0);
 assert.deepEqual(pulse.sources,[1]);
 assert.deepEqual(targetCells(pulse),[8]);
 assert.deepEqual(pulse.clearedMist,[8]);
 assert.equal(pulse.mist[7],1);
});
test("A Pulse-created masterpiece propagates in a subsequent wave at its own actual cell",()=>{
 const g=fixture();
 for(const i of [23,24,25])g.board[i].family="sakura";
 g.board[24].stage=4;g.board[17].stage=4;
 const events=g.resolve(-1);
 const pulses=events.filter(e=>e.type==="pulse");
 const heroes=events.filter(e=>e.type==="hero");
 const harvest=events.find(e=>e.type==="harvest");
 assert(pulses.length>=2&&heroes.length>=2&&harvest);
 assert.deepEqual(pulses[0].sources,[24]);
 assert.deepEqual(targetCells(pulses[0]),[17,31]);
 assert.deepEqual(pulses[1].sources,[17]);
 assert.deepEqual(targetCells(pulses[1]),[10,16,18]);
 assert.deepEqual(heroes[1].positions,[17]);
 assert.deepEqual(sorted(harvest.positions),[17,24]);
 assert.equal(events.findIndex(e=>e.type==="harvest")<events.findIndex(e=>e.type==="fall"),true);
});
test("A four-match bonus that makes a masterpiece launches Pulse from the bonus location",()=>{
 const g=fixture();
 for(const i of [28,29,30,31])g.board[i].family="sakura";
 g.board[31].stage=3;
 g.board[24]=p("koi",4,60);
 const events=g.resolve(-1);
 const bonus=events.find(e=>e.type==="bonus");
 const pulses=events.filter(e=>e.type==="pulse");
 assert(bonus&&pulses.length>=1);
 assert(bonus.targets.some(t=>t.to===24&&t.stage===5));
 assert.deepEqual(pulses[0].sources,[24]);
 assert(pulses[0].targets.every(hit=>R.neighbors(hit.from).includes(hit.to)));
 assert(events.find(e=>e.type==="hero").positions.includes(24));
});
test("Distant simultaneous masterpieces do not produce impossible cross-board Pulse beams",()=>{
 const g=fixture();
 for(const i of [8,9,10])g.board[i].family="sakura";
 for(const i of [36,37,38])g.board[i].family="lantern";
 g.board[9].stage=4;g.board[37].stage=4;
 const events=g.resolve(-1),hero=events.find(e=>e.type==="hero");
 const first=events.find(e=>e.type==="pulse");
 assert(hero&&first);
 assert.deepEqual(sorted(hero.positions),[9,37]);
 assert.deepEqual(sorted(first.sources),[9,37]);
 assert(first.targets.every(t=>R.neighbors(t.from).includes(t.to)));
 assert(first.targets.some(t=>t.from===9)&&first.targets.some(t=>t.from===37));
});
test("Seeded full games keep pulses orthogonal, source-grounded, and fog clearance exact",()=>{
 let pulses=0,swaps=0;
 for(const level of [2,3,8,12,15,16,18,19,20,23]){
  for(let seed=1;seed<=6;seed++){
   const g=new R.Game(level,null,{seed:seed*7919+level,directorMode:"v3"});
   for(let turn=0;turn<14&&!g.complete&&!g.failed&&g.moves>0;turn++){
    const pairs=R.validSwaps(g.board);
    assert(pairs.length>0);
    const pair=pairs[(seed+turn*7)%pairs.length];
    const before=g.mistCleared,events=g.swap(...pair);
    assert(events.ok);
    swaps++;
    let previousMist=null;
    for(const evt of events.events){
     if(evt.type==="pulse"){
      pulses++;
      assert(evt.sources.length>0&&evt.targets.length>0);
      const unique=new Set();
      for(const hit of evt.targets){
       assert(evt.sources.includes(hit.from));
       assert(R.neighbors(hit.from).includes(hit.to),"A pulse hit a non-adjacent cell");
       assert.equal(evt.board[hit.from].stage,5,"Pulse source is not a real stage-five object");
       assert.equal(evt.board[hit.to].stage,hit.stage);
       assert(!unique.has(hit.to),"Double indirect upgrade within wave");
       unique.add(hit.to);
      }
      assert(evt.clearedMist.every(at=>unique.has(at)),"Mist cleared outside actual Pulse targets");
     }
     if(previousMist&&evt.clearedMist){
      for(const at of evt.clearedMist)assert(previousMist[at]===1&&evt.mist[at]===0);
     }
     previousMist=evt.mist;
    }
    assert(g.mistCleared>=before);
   }
  }
 }
 assert(swaps>=100);
 assert(pulses>0,"Stress run did not exercise any real Pulse");
 console.log("Measured "+swaps+" swaps and "+pulses+" actual Pulse waves");
});
console.log("Harmony Pulse relocation audit passed");
