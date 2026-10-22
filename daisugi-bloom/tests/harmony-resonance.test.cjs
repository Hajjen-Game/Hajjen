"use strict";
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const F=R.activeFamilies(0);
function check(name,fn){fn();console.log("PASS "+name);}
function board(){
 return Array.from({length:49},(_,i)=>({
  id:i+1,stage:1,family:F[(Math.floor(i/7)+i%7)%5]
 }));
}
function setup(stage=3,createdOnly=false){
 const g=new R.Game(0,null,{seed:141});
 g.board=board();
 g.board[22]={id:23,stage,family:"lantern"};
 g.board[23]={id:24,stage:1,family:createdOnly?"koi":"lantern"};
 g.board[24]={id:25,stage:1,family:createdOnly?"lantern":"koi"};
 g.board[25]={id:26,stage:1,family:"lantern"};
 if(createdOnly)g.board[16]={id:17,stage:1,family:"lantern"};
 assert.equal(R.scan(g.board).length,0);
 return g;
}
function totalPoints(events){return events.reduce((n,e)=>n+(e.scoreDelta||0),0);}
check("Stage 3 and stage 4 anchors link only to orthogonal same-family neighbors",()=>{
 const g=setup(3);
 const link=R.resonanceLinks(g.board).find(l=>l.anchor===22&&l.partner===23);
 assert(link);
 assert.equal(link.stage,3);
 assert.equal(link.anchorId,23);
 assert.equal(link.partnerId,24);
 const g4=setup(4);
 assert.equal(R.resonanceLinks(g4.board).find(l=>l.anchor===22&&l.partner===23).stage,4);
 assert.equal(R.resonanceLinks(setup(2).board).filter(l=>l.anchor===22).length,0);
});
check("Pre-existing stage-3 resonance awards exactly one +125 Echo on real player fusion",()=>{
 const g=setup();
 const start=g.score,played=g.swap(24,25),echoes=played.events.filter(e=>e.type==="echo");
 assert.equal(played.ok,true);
 assert.equal(echoes.length,1);
 assert.equal(echoes[0].scoreDelta,125);
 assert.equal(echoes[0].stage,3);
 assert.equal(echoes[0].at,22);
 assert.equal(echoes[0].anchorId,23);
 assert.equal(echoes[0].partnerId,24);
 assert.equal(g.echoes,1);
 assert.equal(g.score-start,totalPoints(played.events));
 assert.equal(played.events.findIndex(x=>x.type==="echo"),
  played.events.findIndex(x=>x.type==="fusion")+1);
});
check("Stage 4 anchors get capped +200 but no free stage or move",()=>{
 const g=setup(4),old=g.moves;
 const played=g.swap(24,25);
 assert.equal(played.events.filter(e=>e.type==="echo").length,1);
 assert.equal(played.events.find(e=>e.type==="echo").scoreDelta,200);
 assert.equal(g.echoes,1);
 assert.equal(g.moves,old-1);
 assert(played.events.some(x=>x.type==="hero"));
});
check("No reward for stage 2, invalid swaps or newly connected pairs",()=>{
 const g2=setup(2),normal=g2.swap(24,25);
 assert(normal.ok);
 assert.equal(g2.echoes,0);
 assert.equal(normal.events.filter(e=>e.type==="echo").length,0);
 const invalid=setup(3),before=invalid.save();
 assert.equal(invalid.swap(10,11).ok,false);
 assert.deepEqual(invalid.save(),before);
 const newOnly=setup(3,true);
 assert.equal(R.resonanceLinks(newOnly.board).filter(l=>l.anchorId===23).length,0);
 const swap=newOnly.swap(16,23);
 assert.equal(swap.ok,true);
 assert.equal(swap.events.filter(e=>e.type==="echo").length,0,
  "Resonance first created by the swap must not pay immediately");
});
check("Passive fusion via resolve does not award Echo, even if links exist",()=>{
 const g=setup(3);
 g.board[24].family="lantern";
 assert(R.scan(g.board).length>0);
 const evt=g.resolve(24);
 assert.equal(evt.filter(e=>e.type==="echo").length,0);
 assert.equal(g.echoes,0);
});
check("Echo count persists through save/resume and does not disturb game RNG or bag",()=>{
 const g=setup(3);g.swap(24,25);
 const snapshot=g.save(),restored=new R.Game(0,snapshot,{fastRestore:true});
 assert.equal(restored.echoes,1);
 assert.equal(snapshot.echoes,1);
 assert.deepEqual(restored.save(),snapshot);
 assert.equal(g.bag.length,snapshot.bag.length);
});
check("Completed live sessions never generate more than one Echo per move",()=>{
 let awards=0,runs=0;
 for(let level=0;level<10;level++)for(let seed=0;seed<12;seed++){
  const g=new R.Game(level,null,{seed:20261022+level*1000+seed});
  let n=0;
  while(g.moves>0&&!g.complete){
   const choices=R.validSwaps(g.board);
   assert(choices.length>0);
   const result=g.swap(...choices[(seed+n*5)%choices.length]);
   const echoes=result.events.filter(e=>e.type==="echo");
   assert(echoes.length<=1);
   if(echoes.length){
    assert.equal(echoes[0].scoreDelta,echoes[0].stage===4?200:125);
    awards++;
   }
   assert.equal(R.scan(g.board).length,0);
   n++;
  }
  runs++;
 }
 assert(awards>0,"At least one natural Resonance activation should occur");
 console.log("Measured "+awards+" legitimate Harmony Echo events across "+runs+" games");
});
console.log("Harmony Resonance 1.0 contracts passed");
