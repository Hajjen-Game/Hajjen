"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const F=R.activeFamilies(0);
const copy=x=>JSON.parse(JSON.stringify(x));
const byId=board=>board.slice().sort((a,b)=>a.id-b.id);
function seeded(seed){
 let state=seed>>>0;
 return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function check(title,fn){fn();console.log("PASS "+title);}
check("20-entry refill bag places exactly four of each of five families",()=>{
 const g=new R.Game(0,null,{seed:1234});
 const rounds=[];
 for(let cycle=0;cycle<3;cycle++){
  const out=[];
  for(let n=0;n<20;n++)out.push(g.nextFamily());
  rounds.push(out);
  assert.equal(g.bag.length,0);
  for(const family of F)assert.equal(out.filter(x=>x===family).length,4);
 }
 assert.equal(rounds.length,3);
});
check("Dampener redirects to an unconsumed entry without losing proposed family",()=>{
 const g=new R.Game(0,null,{seed:99});
 const board=Array(49).fill(null);
 board[0]={family:"sakura",stage:1,id:1};
 board[1]={family:"sakura",stage:1,id:2};
 g.bag=["sakura","lantern","koi"];
 const rand=[0,.2,.99];g.fresh=()=>rand.shift();
 const picked=g.nextFamily(board,2);
 assert.equal(picked,"koi");
 assert.deepEqual(g.bag,["sakura","lantern"]);
 assert.equal(rand.length,0);
});
check("When no safe family remains, legitimate chain matches are still possible",()=>{
 const g=new R.Game(0,null,{seed:99});
 const board=Array(49).fill(null);
 board[0]={family:"sakura",stage:1,id:1};
 board[1]={family:"sakura",stage:1,id:2};
 g.bag=["sakura"];const rand=[0,.01];g.fresh=()=>rand.shift();
 assert.equal(g.nextFamily(board,2),"sakura");
 assert.equal(g.bag.length,0);
});
check("Constrained refill never invents an object not in the current bag",()=>{
 const g=new R.Game(0,null,{seed:300});
 const board=Array(49).fill(null);
 board[0]={family:"sakura",stage:1,id:1};
 board[1]={family:"sakura",stage:1,id:2};
 const selected=[];
 for(let n=0;n<100;n++){
  const before=g.bag.length?g.bag.slice():g.families.flatMap(f=>Array(4).fill(f));
  const v=g.nextFamily(board,2);selected.push(v);
  assert(before.includes(v),"Only actually contained family can be drawn");
  assert.equal(g.bag.length,before.length-1);
  const oldCounts=new Map(g.families.map(f=>[f,before.filter(x=>x===f).length]));
  for(const f of g.families)assert.equal(g.bag.filter(x=>x===f).length,
   oldCounts.get(f)-Number(f===v),"Unselected bag counts must be conserved");
 }
 assert.equal(selected.length,100);
});
check("Fair shuffle moves whole objects, has no free matches and restores ≥3 swaps",()=>{
 const input=Array.from({length:49},(_,i)=>({id:i+1,stage:i%4+1,family:F[(Math.floor(i/7)+(i%7))%5]}));
 assert.equal(R.scan(input).length,0);
 assert.equal(R.validSwaps(input).length,0);
 const before=copy(input);const shuffled=R.fairShuffle(input,seeded(20261022));
 assert.deepEqual(input,before,"Source board must stay untouched");
 assert.deepEqual(byId(shuffled),byId(input),"Full id+family+stage must be preserved");
 assert.equal(R.scan(shuffled).length,0);
 assert(R.validSwaps(shuffled).length>=3);
 assert(shuffled.some((v,i)=>v.id!==input[i].id),"No-op must not pass");
 assert.deepEqual(R.fairShuffle(input,seeded(20261022)).map(p=>p.id),
  shuffled.map(p=>p.id),"Same seed produces same shuffle");
});
check("Fair shuffle remains safe across staged boards from all ten families pools",()=>{
 for(let level=0;level<10;level++)for(let trial=0;trial<12;trial++){
  const g=new R.Game(level,null,{seed:level*12345+trial+1});
  g.board.forEach((p,i)=>{p.stage=(i+trial)%4+1;});
  const former=copy(g.board);
  const candidate=R.fairShuffle(g.board,seeded((level+1)*31+trial));
  assert.deepEqual(byId(candidate),byId(former));
  assert.equal(R.scan(candidate).length,0);
  assert(R.validSwaps(candidate).length>=3);
  assert.deepEqual(g.board,former);
 }
});
check("Forced shuffle in live engine preserves every developed piece and score",()=>{
 const g=new R.Game(0,null,{seed:20261022});
 g.board=Array.from({length:49},(_,i)=>({id:i+1,stage:i%4+1,family:F[(Math.floor(i/7)+(i%7))%5]}));
 assert.equal(R.validSwaps(g.board).length,0);
 const original=copy(g.board),score=g.score,remaining=g.moves;
 const events=g.resolve(-1);
 assert(events.some(x=>x.type==="shuffle"));
 assert.deepEqual(byId(g.board),byId(original));
 assert.equal(R.scan(g.board).length,0);
 assert(R.validSwaps(g.board).length>=1);
 assert.equal(g.score,score);
 assert.equal(g.moves,remaining);
});
check("Normal play across all levels still ends with legal moves or a completed goal",()=>{
 for(let level=0;level<10;level++)for(let trial=0;trial<8;trial++){
  const game=new R.Game(level,null,{seed:(level+1)*1000+trial});
  let turn=0;
  while(game.moves>0&&!game.complete){
   const options=R.validSwaps(game.board);
   assert(options.length>0,"No deadlock at level "+level);
   const [a,b]=options[(turn*5+trial)%options.length];
   const result=game.swap(a,b);
   assert(result.ok);
   assert.equal(R.scan(game.board).length,0);
   turn++;
  }
 }
});
console.log("Harmony 5.3 Fair Refill & Shuffle contracts passed");
