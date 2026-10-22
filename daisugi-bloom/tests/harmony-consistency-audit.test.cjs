"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");

// Broad, deterministic invariants from the shipped game engine. A CI guard,
// not a claim that the human experience or level-balance is perfect.
function rng(seed){
 let x=seed|0;
 return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
}
const results=[];
let turns=0,waves=0,masterpieceEvents=0;
for(let level=0;level<R.levels.length;level++){
 let won=0;
 for(let sample=1;sample<=12;sample++){
  const game=new R.Game(level,null,{seed:(sample*73471+level*10007)>>>0});
  const pick=rng((sample*1234567+level)|0);
  assert.equal(game.board.length,49);
  assert.equal(R.scan(game.board).length,0);
  assert(R.validSwaps(game.board).length>=3);
  assert(game.board.every(p=>p.stage===1&&R.activeFamilies(level).includes(p.family)));
  const initial=game.save(),illegal=game.swap(0,48);
  assert.equal(illegal.ok,false);
  assert.deepEqual(game.save(),initial,"An invalid non-neighbour swap must be free");
  while(game.moves>0&&!game.failed&&!game.complete){
   const legal=R.validSwaps(game.board);
   assert(legal.length>0,"A playable board must offer legal moves");
   const [a,b]=legal[Math.floor(pick()*legal.length)];
   const beforeScore=game.score,beforeMoves=game.moves;
   const outcome=game.swap(a,b);
   assert.equal(outcome.ok,true);
   assert.equal(game.moves,beforeMoves-1);
   assert.equal(game.score-beforeScore,outcome.events.reduce((sum,e)=>sum+(e.scoreDelta||0),0),
    "Displayed award events must account for the full score change");
   const ids=new Set(game.board.map(p=>p.id));
   assert.equal(ids.size,49,"Board must have 49 unique object identities");
   assert(game.board.every(p=>p&&p.stage>=1&&p.stage<=4&&R.activeFamilies(level).includes(p.family)));
   assert.equal(R.scan(game.board).length,0,"All cascades must resolve before returning control");
   assert.equal(game.complete,game.fulfilled(),"Completion must agree with current level goal");
   waves+=outcome.events.filter(e=>e.type==="fusion").length;
   masterpieceEvents+=outcome.events.filter(e=>e.type==="hero").length;
   turns++;
   if(beforeMoves===game.config.moves){
    const clone=new R.Game(level,game.save(),{fastRestore:true});
    assert.deepEqual(clone.save(),game.save(),"Seed, stages and progress must persist on reload");
   }
  }
  if(game.complete)won++;
 }
 results.push({level:level+1,wins:won,samples:12});
}
// A single-stage-5 Sakura triggers the same fusion / hero / pulse / harvest
// sequence on levels 4 and 9: goal differences must not swap the engine.
function crafted(index){
 const g=new R.Game(index,null,{seed:123});
 const family=g.families;
 for(let r=0;r<7;r++)for(let c=0;c<7;c++)
  g.board[r*7+c]={family:family[(r+2*c)%5],stage:1,id:r*7+c+1};
 for(const n of [8,9,10])g.board[n].family="sakura";
 g.board[9].stage=4;
 assert.deepEqual(R.scan(g.board),[[8,9,10]]);
 return g;
}
const four=crafted(3),nine=crafted(8);
const eventsA=four.resolve(-1),eventsB=nine.resolve(-1);
const signature=ev=>ev.filter(e=>["fusion","hero","pulse","harvest"].includes(e.type))
 .slice(0,4).map(e=>({type:e.type,score:e.scoreDelta||0,
  groups:e.groups?.map(g=>({from:g.from,to:g.to,number:g.number})),chain:e.chain}));
assert.deepEqual(signature(eventsA),signature(eventsB),
 "Levels 4 and 9 must apply identical rules to the same handcrafted fusion");
console.log("Japanese Harmony comprehensive invariants: "+turns+" swaps, "+waves+
 " fusion waves, "+masterpieceEvents+" hero events");
console.log("Seeded unskilled baselines (12 starts per level): "+JSON.stringify(results));
console.log("Note: chain semantics and level-6/9 difficulty are explicitly tracked in the audit report.");
