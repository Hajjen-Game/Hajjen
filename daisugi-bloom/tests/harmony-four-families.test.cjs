"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
check("4-family mode is opt-in, deterministic, and keeps all nine identities in rotation",()=>{
 const seen=new Set();
 for(const level of [0,1,5,9,10,11,19,30,49,100]){
  const five=R.activeFamilies(level),four=R.activeFamilies(level,4);
  assert.equal(five.length,5);
  assert.deepEqual(four,five.slice(0,4));
  assert.equal(new Set(four).size,4);
  four.forEach(f=>seen.add(f));
 }
 assert.equal(seen.size,9);
});
check("start boards have no free matching, use one stage, and contain all selected families",()=>{
 for(const count of [4,5])for(const level of [0,7,10,12,29])for(let trial=0;trial<12;trial++){
  const seed=(level*111+trial*301+9977)>>>0;
  const a=new R.Game(level,null,{seed,familyCount:count,directorMode:"v3"});
  const b=new R.Game(level,null,{seed,familyCount:count,directorMode:"v3"});
  assert.equal(a.familyCount,count);
  assert.deepEqual(a.save(),b.save());
  assert.equal(R.scan(a.board).length,0);
  assert(R.validSwaps(a.board).length>=3);
  assert.equal(new Set(a.board.map(p=>p.family)).size,count);
  assert(a.board.every(p=>p.stage===1&&a.families.includes(p.family)));
 }
});
check("4-family mode preserves exact save/resume, including Director 3.0",()=>{
 const g=new R.Game(12,null,{seed:1022,directorMode:"v3",familyCount:4});
 for(let i=0;i<4;i++){
  const pair=R.validSwaps(g.board)[0];
  assert(g.swap(...pair,{decisionMs:5500+i*750}).ok);
 }
 const snapshot=g.save();
 assert.equal(snapshot.familyCount,4);
 assert.equal(snapshot.directorMode,"v3");
 const resumed=new R.Game(12,snapshot);
 assert.deepEqual(resumed.save(),snapshot);
 assert.equal(resumed.families.length,4);
 assert.deepEqual(resumed.board,g.board);
});
check("older five-family saves remain exactly intact, never remap fifth family",()=>{
 const g=new R.Game(12,null,{seed:333,directorMode:"v3"});
 const old=g.save();delete old.familyCount;
 const previous=JSON.stringify(old.board),bag=JSON.stringify(old.bag);
 const loaded=new R.Game(12,old,{fastRestore:true});
 assert.equal(loaded.familyCount,5);
 assert.equal(loaded.families.length,5);
 assert.equal(JSON.stringify(loaded.board),previous);
 assert.equal(JSON.stringify(loaded.bag),bag);
});
check("refill, Masterpiece and Harmony keep only the four chosen families",()=>{
 for(const mode of ["standard","v2","v3"])for(let level of [0,12,29])for(let seed=20;seed<27;seed++){
  const g=new R.Game(level,null,{seed,directorMode:mode,familyCount:4});
  for(let i=0;i<10;i++){
   const opts=R.validSwaps(g.board);
   assert(opts.length>0);
   assert(g.swap(...opts[0],{decisionMs:4500}).ok);
   assert(g.board.every(p=>p&&g.families.includes(p.family)));
  }
  assert.equal(g.families.length,4);
 }
});
console.log("Four Families Experiment 1.0 checks passed");
