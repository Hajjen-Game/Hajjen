"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js");
const p=(family,stage=1,id=1)=>({family,stage,id});
const blank=()=>Array.from({length:49},(_,i)=>p(
 ["sakura","lantern","koi","fan","bonsai"][(Math.floor(i/7)+2*(i%7))%5],1,i+1));
const expect=(label,fn)=>{fn();console.log("PASS "+label);};
const setStone=(g,at,hp)=>{
 g.board[at]=p("sealedStone",0,-(at+100));g.sealed[at]=hp;
};
const forceNorthFusion=g=>{
 for(const i of [17,18,19])g.board[i].family="sakura";
};
expect("Exactly stages 31–40 use 4-hit Sealed Stone missions",()=>{
 for(let i=30;i<40;i++){
  const g=new R.Game(i,null,{seed:20261025+i,directorMode:"v3"});
  const at=R.sealedPositions(i),count=at.length;
  assert.equal(g.config.goal.type,"sealedStone");
  assert.equal(g.config.goal.count,count);
  assert.equal(g.sealedStoneVersion,1);
  assert.equal(g.goalText(),"Broken seals");
  assert.equal(g.progress(),0);
  assert.equal(g.sealed.filter(Boolean).length,count);
  assert.equal(g.board.filter(c=>c?.family==="sealedStone").length,count);
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).length>=3,"Playable opening "+(i+1));
  for(const pos of at){
   assert.equal(g.sealed[pos],4);
   assert.equal(g.board[pos].id,-(pos+100));
   assert(R.validSwaps(g.board).every(([a,b])=>a!==pos&&b!==pos));
   assert.equal(g.swap(pos,R.neighbors(pos)[0]).ok,false);
  }
 }
 assert.notEqual(new R.Game(29,null,{seed:7}).config.goal.type,"sealedStone");
 assert.notEqual(new R.Game(40,null,{seed:7}).config.goal.type,"sealedStone");
});
expect("Four separate decisions, one hit max even during big multi-wave fusion",()=>{
 const g=new R.Game(30,null,{seed:234});
 const seen=[];
 for(let move=1;move<=4;move++){
  g.board=blank();
  if(move<4){setStone(g,24,5-move);}else setStone(g,24,1);
  forceNorthFusion(g);
  g.moves--;
  const events=g.resolve(-1);
  const hits=events.flatMap(e=>e.type==="sealed-hit"?e.hits:[]);
  assert.equal(hits.filter(h=>h.at===24).length,1,"Only one seal hit per turn");
  assert.equal(g.sealed[24],Math.max(0,4-move));
  seen.push(events);
  if(move<4){
   assert.equal(g.sealedCleared,0);
   assert.equal(g.board[24].family,"sealedStone");
   assert(!events.some(e=>e.type==="awakening"));
  }
 }
 assert.equal(g.sealedCleared,1);
 assert.equal(g.progress(),1);
 assert.equal(g.config.goal.count,1);
 assert(g.complete);
 assert(seen.at(-1).some(e=>e.type==="goal"));
 assert(seen.at(-1).some(e=>e.type==="awakening"));
});
expect("Awakening hits all 8 neighbours, upgrades pieces once, and gives real score",()=>{
 const g=new R.Game(30,null,{seed:1234});
 g.board=blank();g.sealed=Array(49).fill(0);setStone(g,24,1);
 forceNorthFusion(g);g.moves--;
 const events=g.resolve(-1);
 const awaken=events.find(e=>e.type==="awakening");
 assert(awaken,"Stone must release an 8-direction pulse");
 const effects=[...(awaken.targets||[]),...(awaken.visualOnlyTargets||[]),
  ...(awaken.stoneTargets||[]),...(awaken.darumaTargets||[]),...(awaken.mistTargets||[])];
 assert.deepEqual([...new Set(effects.map(x=>x.to))].sort((a,b)=>a-b),
  R.neighbors8(24).slice().sort((a,b)=>a-b));
 assert.equal(awaken.source,24);
 assert.equal(awaken.scoreDelta,75*awaken.targets.length);
 assert(awaken.targets.some(x=>Math.abs(Math.floor(x.to/7)-3)===1&&Math.abs(x.to%7-3)===1),
  "Pulse must evolve diagonal neighbors, not just cardinal");
 const unique=new Set(awaken.targets.map(t=>t.to));
 assert.equal(unique.size,awaken.targets.length);
 assert.equal(g.board.filter(x=>x?.family==="sealedStone").length,0);
});
expect("Awakening can release another weakened stone diagonally",()=>{
 const g=new R.Game(33,null,{seed:211});
 g.board=blank();g.sealed=Array(49).fill(0);
 setStone(g,24,1);setStone(g,32,1);
 forceNorthFusion(g);
 g.moves--;
 const events=g.resolve(-1);
 assert.equal(g.sealedCleared,2);
 assert.equal(g.sealed[32],0);
 assert.equal(events.filter(e=>e.type==="awakening").length,2);
 assert(events.some(e=>e.type==="sealed-hit"&&e.hits.some(h=>h.at===32&&h.via==="awakening")));
 assert.equal(new Set(events.flatMap(e=>e.type==="sealed-hit"?e.hits.map(h=>h.at):[])).size,2);
});
expect("A stone hit can only happen once per player decision",()=>{
 const g=new R.Game(30,null,{seed:224});
 g.board=blank();g.sealed=Array(49).fill(0);setStone(g,24,4);
 for(const i of [15,16,17]){g.board[i].family="sakura";g.board[i].stage=i===17?4:1;}
 g.moves--;const events=g.resolve(-1);
 assert.equal(g.sealed[24],3);
 assert.equal(events.flatMap(e=>e.type==="sealed-hit"?e.hits:[]).filter(h=>h.at===24).length,1);
 assert(events.filter(e=>e.type==="pulse").every(e=>e.targets.every(t=>t.to!==24)));
});
expect("Harmony Pulse damages a Sealed Stone even when no fusion lands beside it",()=>{
 const g=new R.Game(30,null,{seed:3030,directorMode:"v4"});
 for(let turn=1;turn<=4;turn++){
  g.board=blank();g.sealed=Array(49).fill(0);setStone(g,24,5-turn);
  // A stage-five at 16 upgrades 17 to stage five. Only the latter
  // sends a Pulse to the stone at 24; the fusion at 16 is too far away.
  for(const at of [14,15,16])g.board[at].family="sakura";
  g.board[16].stage=4;g.board[17].family="koi";g.board[17].stage=4;
  g.moves--;
  const events=g.resolve(-1);
  assert(!events.filter(e=>e.type==="fusion").some(e=>e.groups.some(group=>
   R.neighbors(group.at).includes(24))),"No adjacent fusion can damage the stone");
  const beam=events.filter(e=>e.type==="pulse").flatMap(e=>e.stoneTargets||[])
   .find(target=>target.to===24);
  assert(beam,"The regular Harmony Pulse must visibly reach the fixed stone");
  assert.equal(beam.alreadyHit,false,"Pulse is the first hit this turn");
  const hits=events.filter(e=>e.type==="sealed-hit").flatMap(e=>e.hits)
   .filter(hit=>hit.at===24);
  assert.equal(hits.length,1);
  assert.equal(hits[0].via,"pulse");
  assert.equal(hits[0].remaining,4-turn);
  assert.equal(g.sealed[24],4-turn);
  assert.equal(g.sealedCleared,turn===4?1:0);
  assert.equal(events.some(e=>e.type==="awakening"),turn===4);
 }
 assert(g.complete,"The fourth Pulse hit must complete a one-stone objective");
});
expect("A Pulse beam remains visible after a fusion hit but grants no extra damage",()=>{
 const g=new R.Game(30,null,{seed:3031,directorMode:"v4"});
 g.board=blank();g.sealed=Array(49).fill(0);setStone(g,24,4);
 for(const at of [15,16,17])g.board[at].family="sakura";
 g.board[17].stage=4;
 g.moves--;
 const events=g.resolve(-1);
 const hits=events.filter(e=>e.type==="sealed-hit").flatMap(e=>e.hits)
  .filter(hit=>hit.at===24);
 assert.equal(hits.length,1,"Still a maximum of one stone hit per turn");
 assert.equal(hits[0].via,"fusion");
 assert.equal(g.sealed[24],3,"A fusion plus a Pulse is not two hits");
 const beam=events.filter(e=>e.type==="pulse").flatMap(e=>e.stoneTargets||[])
  .find(target=>target.to===24);
 assert(beam,"The Pulse must not disappear visually when the stone was already hit");
 assert.equal(beam.from,17);
 assert.equal(beam.alreadyHit,true,"The beam must mark that damage was already applied");
 assert.equal(g.sealedCleared,0);
});
expect("Fixed stone is retained through gravity, fair shuffle, and save/resume",()=>{
 const g=new R.Game(30,null,{seed:888,directorMode:"v3"});
 g.board=blank();g.sealed=Array(49).fill(0);setStone(g,24,3);
 g.board[10]=null;forceNorthFusion(g);
 g.moves--;const events=g.resolve(-1);
 const fall=events.find(e=>e.type==="fall");
 assert(fall);
 assert.equal(fall.board[24].family,"sealedStone");
 assert.equal(g.sealed[24],2);
 assert(g.board.every(Boolean));
 assert(R.validSwaps(g.board).length>0);
 const restored=new R.Game(30,g.save(),{fastRestore:true});
 assert.equal(restored.config.goal.type,"sealedStone");
 assert.equal(restored.sealed[24],2);
 assert.equal(restored.board[24].id,-124);
 assert.equal(restored.moves,g.moves);
});
expect("Existing saved levels 31–40 retain the pre-stone mission",()=>{
 for(const level of [30,34,39]){
  const g=new R.Game(level,null,{seed:2026});
  const old=g.save();old.board=blank();
  delete old.sealed;delete old.sealedCleared;delete old.sealedStoneVersion;
  const loaded=new R.Game(level,old,{fastRestore:true});
  assert.notEqual(loaded.config.goal.type,"sealedStone");
  assert.equal(loaded.sealedStoneVersion,0);
  assert.equal(loaded.board.filter(x=>x?.family==="sealedStone").length,0);
  assert.equal(new R.Game(level,loaded.save(),{fastRestore:true}).config.goal.type,loaded.config.goal.type);
 }
});
expect("Approved assets are independent high-resolution transparent WebP files",()=>{
 for(let n=0;n<4;n++){
  const buf=fs.readFileSync(path.resolve(__dirname,"../assets/sealed-stone-"+n+".webp"));
  assert(buf.length>40_000);
  assert.equal(buf.toString("ascii",0,4),"RIFF");
  assert.equal(buf.toString("ascii",8,12),"WEBP");
 }
 const app=fs.readFileSync(path.resolve(__dirname,"../harmony/app.js"),"utf8");
 const css=fs.readFileSync(path.resolve(__dirname,"../harmony/mobile-game.css"),"utf8");
 for(let n=0;n<4;n++)assert(css.includes("sealed-stone-"+n+".webp?v=6.39.0"));
 assert(app.includes('className="sealed-stone-art state-"+stoneStage'));
 assert(app.includes('case "awakening":'));
 assert(app.includes('praise("awakening")'));
});
console.log("Sealed Stone & Awakening Pulse 1.0 QA passed.");
