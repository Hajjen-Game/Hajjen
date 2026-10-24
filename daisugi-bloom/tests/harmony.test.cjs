const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const check=(title,fn)=>{fn();console.log("PASS "+title);};
const p=(family,stage=1,id=1)=>({family,stage,id});
const blank=()=>Array.from({length:49},(_,i)=>p(["sakura","lantern","koi","fan"][(Math.floor(i/7)+2*(i%7))%4],1,i+1));
function fixture(){
 const g=new R.Game(0);
 g.board=blank();return g;
}
check("Ten tutorial levels and 40 generated Journey previews",()=>{
 assert.equal(R.levels.length,50);
 assert.deepEqual(R.families,["sakura","lantern","koi","fan","bonsai","sushi","maneki","origami","ryu"]);
 assert.equal(R.levelFamilies.length,10);
 const seen=new Set();
 for(let i=0;i<10;i++){
  const selection=R.activeFamilies(i,R.levelFamilyCount(i));
  assert.equal(selection.length,4,"Four families on tutorial level "+(i+1));
  assert.equal(new Set(selection).size,4);
  for(const family of selection)seen.add(family);
  if(i===7)assert.equal(seen.size,9,"All nine identities should be introduced by level 8");
 }
 assert.deepEqual([...seen].sort(),R.families.slice().sort());
 assert(R.activeFamilies(5,4).includes("lantern"),"Lantern Festival needs lanterns");
 for(let i=0;i<10;i++){let g=new R.Game(i);assert.equal(g.board.length,49);assert(g.board.every(p=>p&&p.stage===1),"Every new level must begin with only stage-one objects");assert.equal(R.scan(g.board).length,0);assert(R.validSwaps(g.board).length>=3);assert.equal(g.moves,R.levels[i].moves);assert.equal(g.familyCount,4);assert.deepEqual(new Set(g.board.map(p=>p.family)),new Set(R.activeFamilies(i,4)));}
});
check("Intro 1–10 use four, level 11+ use five; seeded games keep the selected recipe",()=>{
 assert.equal(R.levelFamilyCount(0),4);
 assert.equal(R.levelFamilyCount(9),4);
 for(const level of [10,11,49,100])assert.equal(R.levelFamilyCount(level),5);
 for(const level of [0,5,9,10,11,49]){
  const g=new R.Game(level,null,{seed:20261023,directorMode:"v3"});
  const count=level<10?4:5;
  assert.equal(g.familyCount,count);
  assert.equal(g.families.length,count);
  assert.equal(new Set(g.board.map(p=>p.family)).size,count);
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).length>=3);
 }
 const old=new R.Game(9,null,{seed:20261023,familyCount:5});
 const snapshot=old.save();delete snapshot.familyCount;
 const loaded=new R.Game(9,snapshot,{fastRestore:true});
 assert.equal(loaded.familyCount,5,"A legacy intro session must keep its fifth family");
 assert.deepEqual(loaded.board,old.board);
 assert.deepEqual(loaded.bag,old.bag);
});
check("level 8 is achievable through five stage-three evolutions, not a rare T/L formation",()=>{
 const cfg=R.levels[7];
 assert.equal(cfg.name,"Garden in Bloom");
 assert.deepEqual(cfg.goal,{type:"stage3",count:5});
 assert.equal(cfg.moves,40);
 assert.equal(cfg.par,12);
 const g=new R.Game(7);
 assert.equal(g.moves,40);
 assert.equal(g.goalText(),"Föremål till stadium 3");
 assert.equal(g.target(),5);
 g.stage3=4;assert.equal(g.progress(),4);assert.equal(g.fulfilled(),false);
 g.stage3=5;assert.equal(g.progress(),5);assert.equal(g.fulfilled(),true);
});
check("unfinished old level 8 saves get four extra turns only once",()=>{
 const g=new R.Game(7);
 const old=g.save();
 delete old.level8Revision;
 old.moves=6;old.stage3=2;old.shapes=0;
 const migrated=new R.Game(7,old);
 assert.equal(migrated.moves,10);
 assert.equal(migrated.stage3,2);
 assert.equal(migrated.level8Revision,1);
 assert.deepEqual(migrated.board,g.board);
 const resumed=new R.Game(7,migrated.save());
 assert.equal(resumed.moves,10,"Cannot grant the extra turns twice");
 assert.equal(resumed.stage3,2);
 const finished={...old,complete:true};
 assert.equal(new R.Game(7,finished).moves,6,"Completed saves cannot gain turns");
});
check("Intro stays doubled; Journey 11–20 has smaller balanced budgets, later Journey unchanged",()=>{
 const original=[12,18,16,18,18,20,18,20,20,24];
 for(let index=0;index<original.length;index++){
  assert.equal(R.levelConfig(index).moves,original[index]*2,"Level "+(index+1));
  assert.equal(new R.Game(index).moves,original[index]*2);
 }
 const early=[28,28,27,27,26,28,27,28,27,29];
 for(let index=10;index<20;index++){
  assert.equal(R.levelConfig(index).moves,early[index-10],"Balanced Journey level "+(index+1));
  assert.equal(new R.Game(index).moves,early[index-10]);
 }
 for(const index of [20,29,49,50,150,23000]){
  const tier=Math.floor((index-10)/10);
  const before=Math.max(17,22-((index-10)%5)-Math.floor(tier/4));
  assert.equal(R.levelConfig(index).moves,2*before,"Later Journey unchanged "+(index+1));
 }
});
check("older saved rounds get precisely one additional full move budget",()=>{
 for(const index of [0,7,10,49,50,100]){
  const initial=new R.Game(index,null,{seed:20261023});
  const old=initial.save();delete old.movesExpansionVersion;
  // Snapshot from before the expansion, with several already-played moves.
  const oldBudget=initial.config.moves/2;
  old.moves=Math.max(1,oldBudget-5);
  old.score=1200;old.stage3=2;
  const upgraded=new R.Game(index,old,{fastRestore:true});
  const expected=Math.min(initial.config.moves,
   old.moves+oldBudget+((index===7&&!old.level8Revision)?4:0));
  assert.equal(upgraded.moves,expected,"Saved level "+(index+1));
  assert.equal(upgraded.movesExpansionVersion,1);
  assert.equal(upgraded.score,old.score);
  assert.equal(upgraded.stage3,old.stage3);
  assert.deepEqual(upgraded.board,old.board);
  assert.equal(upgraded.rolls,old.rolls);
  const resumed=new R.Game(index,upgraded.save(),{fastRestore:true});
  assert.equal(resumed.moves,upgraded.moves,"Must never grant the budget twice");
  assert.deepEqual(resumed.board,upgraded.board);
 }
 const finished=new R.Game(10,null,{seed:119});
 const oldFinished=finished.save();delete oldFinished.movesExpansionVersion;
 oldFinished.moves=0;oldFinished.complete=true;
 assert.equal(new R.Game(10,oldFinished,{fastRestore:true}).moves,0,
  "Already ended runs cannot restart for free");
});
check("new controlled starts and retries always contain ONLY stage-one objects",()=>{
 for(let i=0;i<10;i++)for(let attempt=0;attempt<16;attempt++){
  const game=new R.Game(i);
  assert.equal(game.board.length,49);
  assert(game.board.every(p=>p&&p.stage===1),"Level "+(i+1)+", retry "+attempt+" contained developed pieces");
  assert(!R.scan(game.board).length,"Free pre-matched board");
  assert(R.validSwaps(game.board).length>=3,"Start must offer strategic valid swaps");
 }
});
check("T and L overlap with shared intersection counts as a single five-piece group",()=>{
 const b=blank();for(const i of [9,10,11,17,24])b[i].family="sakura";
 const found=R.scan(b).filter(x=>[9,10,11,17,24].every(i=>x.includes(i)));
 assert.equal(found.length,1);assert.equal(found[0].length,5);
});
check("mixed stages match, the strongest survivor stays on its own tile",()=>{
 const g=fixture();
 for(const i of [23,24,25])g.board[i].family="sakura";
 g.board[23].stage=2;g.board[24].stage=4;g.board[25].stage=1;
 const events=g.resolve(-1),fusion=events.find(e=>e.type==="fusion");
 assert(fusion);const record=fusion.groups.find(g=>g.at===24);
 assert(record&&record.to===5);assert(events.some(e=>e.type==="hero"&&e.positions.includes(24)));
});
check("Fusion Destination Control 1.0 places high-stage output at player's matching destination",()=>{
 const g=new R.Game(10,null,{seed:1645,directorMode:"standard"});
 g.config={...g.config,goal:{type:"mist",count:3}};
 g.board=blank();
 for(const i of [17,23,25])g.board[i].family="sakura";
 g.board[23].stage=4; // Strongest does NOT occupy the selected destination.
 const strongestId=g.board[23].id;
 const destinationId=g.board[17].id;
 g.mist=Array(49).fill(0);
 for(const i of [17,23,24])g.mist[i]=1;
 assert.equal(R.scan(g.board).length,0,"Fixture starts without accidental matches");
 const result=g.swap(17,24);
 assert(result.ok,"The swap must be legal");
 const first=result.events.find(e=>e.type==="fusion");
 assert(first,"A fusion event must be emitted");
 const match=first.groups.find(group=>group.at===24);
 assert(match,"The destination cell 24 must receive the fusion");
 assert.equal(match.origin,23,"Stage 4 must be consumed from cell 23");
 assert.equal(match.from,4);assert.equal(match.to,5);
 assert(match.removed.includes(23),"The strongest source must visibly fly into the destination");
 assert.equal(first.board[24].id,strongestId,"Highest-stage identity moves to the target");
 assert.equal(first.board[24].stage,5,"The result is max stage plus one");
 assert.notEqual(first.board[24].id,destinationId,"Stage 1 resident was consumed");
 assert.equal(first.board[23],null);
 assert.deepEqual(first.clearedMist,[24],"Only fusion landing cell is cleansed");
 assert.equal(first.mist[23],1,"Mist under consumed high-stage source stays");
 assert.equal(first.mist[17],1,"Mist at original swap source stays");
 assert(result.events.some(e=>e.type==="pulse"&&e.sources.includes(24)),
  "Stage 5 launches Pulse from the selected destination");
});
check("Fusion destination falls back to the OTHER swapped cell when only it matches",()=>{
 const g=new R.Game(10,null,{seed:1646,directorMode:"standard"});
 g.config={...g.config,goal:{type:"mist",count:1}};
 g.board=blank();
 for(const i of [17,23,25])g.board[i].family="sakura";
 g.board[23].stage=3;
 const strongestId=g.board[23].id;
 g.mist=Array(49).fill(0);g.mist[24]=1;
 const result=g.swap(24,17); // destination 17, but the match is at 24.
 assert(result.ok);
 const fusion=result.events.find(e=>e.type==="fusion");
 assert(fusion.groups.some(group=>group.at===24&&group.origin===23),
  "Fusion must land at the source where the match was actually formed");
 assert.deepEqual(fusion.clearedMist,[24]);
 assert.equal(fusion.board[24].id,strongestId);
 assert.equal(fusion.board[24].stage,4);
});
check("Automatic fusion chains continue to use the highest-stage cell",()=>{
 const g=fixture();
 for(const i of [23,24,25])g.board[i].family="sakura";
 g.board[23].stage=3;g.board[24].stage=1;g.board[25].stage=2;
 const fusion=g.resolve(-1).find(e=>e.type==="fusion");
 assert.equal(fusion.groups[0].at,23);
 assert.equal(fusion.groups[0].origin,23);
 assert.equal(fusion.board[23].stage,4);
});
check("four-match awards one adjacent evolution, bonus can create a masterpiece",()=>{
 const g=fixture();
 // Row four; strongest at the far right, bonus reaches a stage-four fish directly above it.
 for(const i of [28,29,30,31])g.board[i].family="sakura";
 g.board[31].stage=3;
 g.board[24]=p("koi",4,60);g.board[32]=p("fan",1,61);g.board[38]=p("lantern",1,62);
 const ev=g.resolve(-1);
 assert(ev.some(e=>e.type==="bonus"&&e.targets.some(t=>t.to===24&&t.stage===5)));
 assert(ev.some(e=>e.type==="hero"&&e.positions.includes(24)));
 assert(ev.some(e=>e.type==="harvest"&&e.positions.includes(24)));
});
check("a four or five fusion only grows occupied neighbours, fill follows last pulse",()=>{
 const g=fixture();for(const i of [23,24,25])g.board[i].family="sakura";g.board[24].stage=4;
 const ev=g.resolve(-1),lastHarvest=ev.map(e=>e.type).lastIndexOf("harvest"),firstFall=ev.findIndex(e=>e.type==="fall");
 assert(lastHarvest>=0&&firstFall>lastHarvest);assert(ev.filter(e=>e.type==="pulse").every(e=>e.targets.every(t=>R.neighbors(t.from).includes(t.to))));
});
check("no double indirect growth in one chain",()=>{
 const g=fixture();
 for(const i of [16,17,18])g.board[i].family="lantern";
 g.board[17].stage=4;g.board[10].stage=4;g.board[24].stage=4;
 const ev=g.resolve(-1),seen=new Set();
 for(const e of ev){if(e.type==="harvest"){seen.clear();continue;}if(e.type==="bonus"||e.type==="pulse")for(const t of e.targets){assert(!seen.has(t.to),"A cell was indirectly upgraded twice in same chain");seen.add(t.to);}}
});
check("invalid move is free and no Power Move exists",()=>{
 let g=new R.Game(0),moves=g.moves;assert.equal(g.swap(0,48).ok,false);assert.equal(g.moves,moves);assert.equal(typeof g.power,"undefined");
});
check("once goal completes, remaining moves can be played without changing first completion stars",()=>{
 const g=fixture();g.config={...g.config,moves:6,par:3,goal:{type:"fusion",count:1}};g.moves=6;
 // The completed goal survives until remaining moves are exhausted.
 for(const i of [23,24,25])g.board[i].family="sakura";
 const result=g.resolve(-1);
 assert(result.some(e=>e.type==="goal"));assert(g.complete);assert(g.moves>0);const s=g.stars();
 g.fusions+=3;assert.equal(g.stars(),s);assert(g.finish());assert.equal(g.moves,0);
});
check("Core Clarity 1.0 awards one completion star while preserving archived legacy three-star saves",()=>{
 const g=fixture();g.config={...g.config,moves:6,par:3,goal:{type:"fusion",count:1}};g.moves=6;
 assert.equal(g.rewardVersion,2);
 assert.equal(g.stars(),0);
 for(const i of [23,24,25])g.board[i].family="sakura";
 const events=g.resolve(-1);
 assert(events.some(e=>e.type==="goal"));
 assert.equal(g.stars(),1,"One completion star, regardless of bonus points or speed");
 assert.equal(g.starsAtGoal,1);
 assert.equal(g.moves,6,"Reaching the goal doesn't consume leftover optional turns");
 const completed=new R.Game(g.level,g.save(),{fastRestore:true});
 assert.equal(completed.rewardVersion,2);
 assert.equal(completed.stars(),1);
 assert.deepEqual(completed.save(),g.save());
 const old=g.save();delete old.rewardVersion;old.starsAtGoal=3;
 const legacy=new R.Game(g.level,old,{fastRestore:true});
 assert.equal(legacy.rewardVersion,1);
 assert.equal(legacy.stars(),3,"Never discard previously earned legacy three-star ratings");
});
check("Directed swap contract: both orientations preserve identical outcomes for legal two-family swaps",()=>{
 for(const level of [0,10,11])for(const seed of [111,222]){
  const g=new R.Game(level,null,{seed,directorMode:"v311"});
  for(const [a,b] of R.validSwaps(g.board).slice(0,8)){
   const left=new R.Game(level,g.save(),{fastRestore:true});
   const right=new R.Game(level,g.save(),{fastRestore:true});
   assert(left.swap(a,b).ok&&right.swap(b,a).ok);
   assert.deepEqual(left.save(),right.save(),
    "Swap direction changes the animation but not the fusion outcome when only a/b can be match anchors");
  }
 }
});
check("legacy saved levels migrate retired families without deleting progression",()=>{
 const old=new R.Game(1);
 const snapshot=old.save();
 const oldBoard=["sakura","lantern","koi","fan"];
 snapshot.board.forEach((p,i)=>{p.family=oldBoard[i%4];p.stage=i%5+1;});
 snapshot.bag=["lantern","koi","sakura","fan"];
 snapshot.score=3200;snapshot.moves=7;
 const loaded=new R.Game(1,snapshot);
 assert.equal(loaded.score,3200);
 assert.equal(loaded.moves,7);
 assert(loaded.board.every(p=>R.activeFamilies(1).includes(p.family)));
 assert(loaded.board.some(p=>p.family==="sushi"||p.family==="maneki"));
 assert(loaded.board.every((p,i)=>p.stage===snapshot.board[i].stage));
 assert(loaded.bag.every(f=>R.activeFamilies(1).includes(f)));
 const roundtrip=new R.Game(1,loaded.save());
 assert.deepEqual(roundtrip.board,loaded.board);
});
check("save and resume preserve board, score, randomness position and stage milestones",()=>{
 const g=new R.Game(3),snap=g.save(),newGame=new R.Game(3,snap);
 assert.deepEqual(newGame.board,g.board);assert.deepEqual(newGame.bag,g.bag);assert.equal(newGame.moves,g.moves);assert.equal(newGame.rolls,g.rolls);
});
check("Objectives 2.0 turns the Journey into repeatable, varied mission goals",()=>{
 const goalTypes=["mist","mist","masterpiece","mist","fusion","mist","stage3","mist","pulseHits","mist"];
 assert.deepEqual(Array.from({length:10},(_,j)=>R.levelConfig(j+10).goal.type),goalTypes);
 for(const level of [10,11,12,19,29,49,50,100,1000,23000]){
  const cfg=R.levelConfig(level),again=R.levelConfig(level);
  assert.deepEqual(cfg,again,"Same level must have the same objective");
  assert.notEqual(cfg.goal.type,"score","Journey level "+level+" must not be just score chase");
  assert(level<20?(cfg.moves>=26&&cfg.moves<=29):(cfg.moves>=34&&cfg.moves<=44),
   "First ten Journey objectives should have reduced moves, later Journey unchanged");
  assert(cfg.par>0&&cfg.par<cfg.moves);
  const families=R.activeFamilies(level);
  assert.equal(families.length,5);
  assert.equal(new Set(families).size,5);
  const a=new R.Game(level,null,{seed:1001}),b=new R.Game(level,null,{seed:1001});
  assert.deepEqual(a.board,b.board);
  assert.deepEqual(a.mist,b.mist);
  assert.equal(a.level,level);
  assert.equal(a.objectiveVersion,2);
  if(cfg.goal.type==="mist"){
   assert.equal(a.mist.filter(Boolean).length,cfg.goal.count);
   assert.equal(a.goalText(),"Rena dimman");
   assert.equal(a.progress(),0);
  }else assert.equal(a.mist.filter(Boolean).length,0);
 }
 assert.deepEqual([10,11,13,15,17,19].map(i=>R.levelConfig(i).goal.count),
  [9,11,12,13,14,15],"Balanced Mist counts should increase through Chapter II");
 assert.deepEqual([12,14,16,18].map(i=>R.levelConfig(i).goal.count),
  [3,20,10,8],"Non-Mist goals must require meaningful work, not just a few moves");
 const g=new R.Game(10,null,{seed:1001});
 const positions=g.mist.flatMap((v,i)=>v?[i]:[]);
 assert.equal(positions.length,9);
 // Mist Layout 2.0 forms separated, controllable Pulse-friendly patches
 // rather than the old pattern of entirely isolated single cells.
 assert(positions.some(i=>i<14)&&positions.some(i=>i>=35));
 assert.equal(new Set(positions.map(i=>Math.floor(i/7))).size>=5,true);
 const legacy=R.legacyScoreConfig(10);
 assert.deepEqual(legacy.goal,{type:"score",count:7500});
 assert.deepEqual(legacy.stars,[7500,11250,16875]);
});
check("Mist Layout Rebalance 2.0 uses separated 2–3-cell patches, not an isolated-cell field",()=>{
 const oldStage11=[8,12,16,24,30,36,40,20,28];
 assert(oldStage11.every(i=>!R.neighbors(i).some(j=>oldStage11.includes(j))),
  "The old nine-tile mask truly had nine isolated fog tiles");
 for(const [level,count] of [[10,9],[11,11],[13,12],[15,13],[17,14],[19,15],[20,9],[21,11],[30,9]]){
  const mask=R.mistLayout(level,count);
  assert.equal(mask.length,count);
  assert.equal(new Set(mask).size,count);
  assert(mask.every(i=>i>=0&&i<49),"No invalid tiles");
  assert.deepEqual(mask,R.mistLayout(level,count),"Layout must be deterministic");
  const cells=new Set(mask),seen=new Set,components=[];
  for(const i of mask){
   if(seen.has(i))continue;
   const component=[],stack=[i];seen.add(i);
   while(stack.length){
    const p=stack.pop();component.push(p);
    for(const j of R.neighbors(p))
     if(cells.has(j)&&!seen.has(j)){seen.add(j);stack.push(j);}
   }
   components.push(component);
  }
  const isolated=components.filter(group=>group.length===1).length;
  assert(isolated<=1,"Maximum one precision tile on stage "+(level+1));
  assert(components.every(group=>group.length<=3),
   "No unwieldy four-or-more-cell blob on stage "+(level+1));
  assert(components.filter(group=>group.length>=2).length>=3,
   "At least three separate Pulse-relevant patches");
  assert(!mask.some(i=>[0,6,42,48].includes(i)),"Avoid low-access corner fog");
  const actual=new R.Game(level,null,{seed:5255,directorMode:"v311"});
  if(actual.config.goal.type==="mist"){
   assert.equal(actual.mistLayoutVersion,2);
   assert.deepEqual(actual.mist.flatMap((v,i)=>v?[i]:[]).sort((a,b)=>a-b),
    mask.sort((a,b)=>a-b),"New playable masks must use layout 2.0");
   assert.equal(actual.config.goal.count,count,"Do not change objective size");
  }
 }
 assert.equal(R.mistLayout(10,0).length,0);
});
check("Level 11 clustered mist can be cleansed by ONE real non-fog fusion Pulse",()=>{
 const g=new R.Game(10,null,{seed:412,directorMode:"v311"});
 g.board=blank();
 g.board[17].family="sakura";g.board[17].stage=4;
 g.board[18].family="sakura";
 g.board[15].family="lantern"; // Keep mist neighbour occupied but OUTSIDE the match.
 g.board[19].family="lantern"; // No premade match before moving.
 g.board[23].family="sakura";
 assert.equal(R.scan(g.board).length,0);
 assert.equal(g.mist[9],1);assert.equal(g.mist[15],1);
 assert.equal(g.mist[16],0);
 const before=g.mist.filter(Boolean).length;
 const result=g.swap(23,16);
 assert(result.ok);
 const pulse=result.events.find(e=>e.type==="pulse");
 assert(pulse,"The stage-4 fusion must trigger real Harmony Pulse");
 assert(pulse.sources.includes(16));
 assert(pulse.clearedMist.includes(9)&&pulse.clearedMist.includes(15),
  "A non-fog landing can cleanse both neighbouring mist tiles in the same patch");
 assert(g.mist[9]===0&&g.mist[15]===0);
 assert(g.mist.filter(Boolean).length<=before-2);
});
check("Mist Layout 2.0 preserves in-progress historical masks, turns and partial clears",()=>{
 const first=new R.Game(11,null,{seed:9911,directorMode:"v311"});
 const old=first.save();
 delete old.mistLayoutVersion; // Pre-2.0 save, without a layout version.
 const priorMask=[8,12,16,24,30,36,40,20,28,9,32];
 old.mist=Array(49).fill(0);
 for(const i of priorMask.slice(0,6))old.mist[i]=1;
 old.mistCleared=5;old.moves=9;old.score=3540;
 const restored=new R.Game(11,old,{fastRestore:true});
 assert.equal(restored.mistLayoutVersion,1);
 assert.deepEqual(restored.mist,old.mist,"Old fog positions must not jump");
 assert.equal(restored.mistCleared,5);
 assert.equal(restored.moves,9);assert.equal(restored.score,3540);
 assert.equal(restored.target(),11);
 const again=new R.Game(11,restored.save(),{fastRestore:true});
 assert.equal(again.mistLayoutVersion,1);
 assert.deepEqual(again.mist,old.mist);
 assert.equal(again.mistCleared,5);
 assert.equal(again.moves,9);
 const fresh=new R.Game(11,null,{seed:9911,directorMode:"v311"});
 assert.equal(fresh.mistLayoutVersion,2);
 assert.notDeepEqual(fresh.mist,old.mist);
 assert.deepEqual(fresh.board,first.board,"Fog positions must not change the initial board RNG");
 assert.equal(fresh.moves,first.moves,"Move budget unchanged");
});
check("Mist Layout 2.0 enables paired-seed objective comparisons against old placement",()=>{
 const D=require("../harmony/diagnostics.js").create(R);
 const opts={levels:[10,11],strategies:["goal","score"],modes:["director311"],
  trials:4,seed:20261022};
 const old=D.run({...opts,mistLayoutVersion:1});
 const modern=D.run({...opts,mistLayoutVersion:2});
 assert.equal(old.runs.length,16);assert.equal(modern.runs.length,16);
 assert(old.runs.every(r=>r.mistLayoutVersion===1));
 assert(modern.runs.every(r=>r.mistLayoutVersion===2));
 const keys=r=>r.runs.map(x=>[x.level,x.seed,x.strategy,x.mode,x.movesBudget,x.target]);
 assert.deepEqual(keys(old),keys(modern),
  "Only fog placement differs; seeds, AI, level goals and moves are paired");
 assert(old.runs.every(x=>x.zeroLegalTurns===0));
 assert(modern.runs.every(x=>x.zeroLegalTurns===0));
 const summary=r=>r.results.map(x=>({level:x.level+1,
  strategy:x.strategy,wins:x.wins,progress:Number(x.avgGoalRatio.toFixed(3))}));
 console.log("MIST LAYOUT A/B paired-seed baseline "+JSON.stringify(summary(old)));
 console.log("MIST LAYOUT A/B paired-seed revised  "+JSON.stringify(summary(modern)));
});
check("Rebalance 1.0 converts unfinished Mist saves once without making the level impossible",()=>{
 const prior=new R.Game(10,null,{seed:2201,directorMode:"v3"});
 const snapshot=prior.save();
 snapshot.objectiveBalanceVersion=undefined;
 snapshot.moves=39; // Five of the previous 44 turns were used
 snapshot.mist=Array(49).fill(0);
 for(const i of [16,17,23,24])snapshot.mist[i]=1;
 snapshot.mistCleared=2;
 const restored=new R.Game(10,snapshot,{fastRestore:true});
 assert.equal(restored.moves,23,"Preserve five already-used moves from the new 28");
 assert.equal(restored.mistCleared,2,"Do not lose two previously cleaned patches");
 assert.equal(restored.mist.filter(Boolean).length,7,"Remaining fog must equal revised target minus progress");
 assert.equal(restored.mist[16],1,"Uncleansed original cells must persist");
 const roundtrip=new R.Game(10,restored.save(),{fastRestore:true});
 assert.equal(roundtrip.moves,23,"Never shrink moves a second time");
 assert.deepEqual(roundtrip.mist,restored.mist);
 assert.equal(roundtrip.mistCleared,2);
 const legacy=prior.save();delete legacy.objectiveVersion;delete legacy.objectiveBalanceVersion;
 legacy.moves=38;
 const scoreMode=new R.Game(10,legacy,{fastRestore:true});
 assert.equal(scoreMode.config.goal.type,"score");
 assert.equal(scoreMode.moves,38,"Old score-only saves must not receive new balance");
});
check("Mist fusion survivor and Harmony Pulse hits both cleanse fog, not consumed tiles",()=>{
 const g=new R.Game(10,null,{seed:451,directorMode:"v3"});
 g.config={...g.config,goal:{type:"mist",count:6}};
 g.board=blank();
 for(const i of [23,24,25])g.board[i].family="sakura";
 g.board[24].stage=4; // The fusion output is at 24; stage 5 emits Harmony Pulse.
 const cells=[23,24,25,17,31,38];
 g.mist=Array(49).fill(0);for(const i of cells)g.mist[i]=1;
 const events=g.resolve(-1);
 const fusion=events.find(e=>e.type==="fusion");
 const pulse=events.find(e=>e.type==="pulse");
 assert(fusion&&pulse,"The survivor must become a masterpiece and emit Pulse");
 assert.equal(fusion.groups[0].at,24,"The strongest stage-4 piece must retain its cell");
 assert.deepEqual(fusion.clearedMist,[24],"Only the upgraded survivor cell clears");
 assert.deepEqual(pulse.clearedMist,[17,31],"Harmony Pulse must clear every misted neighbour it actually hits");
 assert.equal(fusion.mist[23],1,"Consumed mist-covered source must remain covered");
 assert.equal(fusion.mist[25],1,"Other consumed source must remain covered");
 assert.equal(pulse.mist[17],0,"Pulse target must be cleansed");
 assert.equal(pulse.mist[31],0,"Other Pulse target must also be cleansed");
 assert.equal(fusion.goal,1,"The fusion counter increases at the survivor only");
 assert.equal(pulse.goal,3,"Pulse raises progress by exactly its two newly cleansed cells");
 assert.equal(g.mist.filter(Boolean).length,3,"Consumed and untouched fog must persist");
 assert.equal(g.mist[38],1,"Unhit fog remains fixed in its cell");
 assert.equal(g.mist[24],0,"Survivor's fixed cell is now clear");
 const snap=g.save(),resumed=new R.Game(10,snap,{fastRestore:true});
 assert.deepEqual(resumed.mist,g.mist,"Cleared/foggy fixed cells persist after reload");
 assert.equal(resumed.progress(),g.progress());
 assert.equal(g.clearMist([24,24]).length,0,"A cleared cell cannot count twice");
});
check("Pulse can cleanse mist when the fusion survivor itself is not misted",()=>{
 const g=new R.Game(10,null,{seed:453,directorMode:"standard"});
 g.config={...g.config,goal:{type:"mist",count:4}};
 g.board=blank();
 for(const i of [23,24,25])g.board[i].family="sakura";
 g.board[24].stage=4;
 g.mist=Array(49).fill(0);for(const i of [23,17,31,38])g.mist[i]=1;
 const events=g.resolve(-1);
 const fusion=events.find(e=>e.type==="fusion"),pulse=events.find(e=>e.type==="pulse");
 assert.equal(fusion.groups[0].at,24);
 assert.deepEqual(fusion.clearedMist,[],"Fusion not on fog cannot clear it");
 assert.deepEqual(pulse.clearedMist,[17,31],"Pulse hits neighbouring mist cells");
 assert.equal(fusion.goal,0);
 assert.equal(pulse.goal,2);
 assert.equal(g.mist[23],1,"Consumed matched source cannot clear on its own");
 assert.equal(g.mist[38],1,"Unhit mist remains");
 assert.equal(g.mistCleared,2);
 const restored=new R.Game(10,g.save(),{fastRestore:true});
 assert.deepEqual(restored.mist,g.mist);
 assert.equal(restored.mistCleared,2);
});
check("Mist remains on matched source cells when fusion output is elsewhere",()=>{
 const g=new R.Game(10,null,{seed:452,directorMode:"standard"});
 g.config={...g.config,goal:{type:"mist",count:2}};
 g.board=blank();
 for(const i of [23,24,25])g.board[i].family="sakura";
 g.board[24].stage=3;
 g.mist=Array(49).fill(0);g.mist[23]=1;g.mist[25]=1;
 const fusion=g.resolve(-1).find(e=>e.type==="fusion");
 assert.equal(fusion.groups[0].at,24);
 assert.deepEqual(fusion.clearedMist,[],"Match across two mist cells is not sufficient");
 assert.equal(fusion.mist[23],1);
 assert.equal(fusion.mist[25],1);
 assert.equal(fusion.goal,0);
});
check("Misted objects can still move in both directions and survive reload",()=>{
 const g=new R.Game(10,null,{seed:141,directorMode:"v3"});
 const pair=R.validSwaps(g.board)[0];
 assert(pair,"A legal swap must exist");
 const [a,b]=pair;
 g.mist=Array(49).fill(0);g.mist[a]=1;g.mist[b]=1;
 g.config={...g.config,goal:{type:"mist",count:2}};
 const result=g.swap(a,b);
 assert.equal(result.ok,true,"Fog is not a movement blocker");
 assert(result.events.some(e=>e.type==="fusion"),"Legal swap resolves");
 const everyCleared=result.events.flatMap(e=>e.clearedMist||[]);
 const everySurvivor=result.events.filter(e=>e.type==="fusion").flatMap(e=>e.groups.map(group=>group.at));
 const everyPulseTarget=result.events.filter(e=>e.type==="pulse").flatMap(e=>e.targets.map(hit=>hit.to));
 assert(everyCleared.every(index=>everySurvivor.includes(index)||everyPulseTarget.includes(index)),
  "Every cleared position must be a fusion output OR an actual Pulse target");
 assert.equal(new Set(everyCleared).size,everyCleared.length,"A patch only clears once across all waves");
});
check("Collection bonuses accumulate indefinitely and persist when resuming",()=>{
 const g=fixture();
 g.families=R.activeFamilies(0);
 // Controlled source: stage 4 to stage 5. No manufactured extra points.
 for(const i of [8,9,10])g.board[i].family="sakura";
 g.board[9].stage=4;
 const events=g.resolve(-1);
 const rewards=events.filter(e=>e.type==="collection");
 assert(rewards.length>=1);
 assert(rewards.some(e=>e.awards.some(a=>a.family==="sakura"&&a.count===1&&a.points===100)));
 assert.equal(g.familyMasterpieces.sakura>=1,true);
 assert(g.collectionBonusTotal>=100);
 const snap=g.save(),resumed=new R.Game(0,snap,{fastRestore:true});
 assert.deepEqual(resumed.familyMasterpieces,g.familyMasterpieces);
 assert.equal(resumed.collectionBonusTotal,g.collectionBonusTotal);
 // The reward schedule remains cumulative, NOT a 0/5 win condition.
 assert.equal(g.config.goal.type,"fusion");
 g.familyMasterpieces.sakura=12;
 assert.equal(new R.Game(0,g.save(),{fastRestore:true}).familyMasterpieces.sakura,12);
});
check("Levels 6 and 9 use approachable cumulative masterpiece objectives",()=>{
 assert.deepEqual(R.levels[5].goal,{type:"familyMasterpiece",family:"lantern",count:1});
 assert.deepEqual(R.levels[8].goal,{type:"masterpiece",count:2});
});
check("Level 10 screenshot has exactly one legal move with Koi at row 5 column 4",()=>{
 const rows=[
  ["sushi","bonsai","koi","sushi","bonsai","origami","ryu"],
  ["koi","bonsai","bonsai","sushi","origami","koi","bonsai"],
  ["origami","sushi","ryu","koi","bonsai","ryu","origami"],
  ["sushi","ryu","bonsai","origami","ryu","sushi","koi"],
  ["bonsai","koi","ryu","koi","origami","bonsai","bonsai"],
  ["ryu","origami","sushi","bonsai","sushi","ryu","ryu"],
  ["ryu","bonsai","koi","origami","sushi","koi","origami"]
 ];
 const game=new R.Game(9,null,{seed:31415});
 game.board=rows.flat().map((family,index)=>({family,id:index+1,stage:1}));
 assert.equal(R.scan(game.board).length,0,"Reconstructed screenshot must not start with an automatic match");
 const options=R.validSwaps(game.board);
 assert.deepEqual(options,[[22,23]],"Only legal move is row 4 col 2 (Ryu) right with row 4 col 3 (Bonsai)");
 const result=game.swap(22,23);
 assert.equal(result.ok,true);
 assert(result.events.some(e=>e.type==="fusion"&&e.groups.some(g=>g.family==="ryu")),
  "The move must visibly fuse Ryu, not only consume a turn");
 assert(R.validSwaps(game.board).length>0||game.moves===0,"Next board must not be stuck");
});
check("Directed hint identifies the Sushi piece and the Ryu target from level 13 screenshot",()=>{
 const rows=[
  ["lantern","sushi","sushi","lantern","sakura","lantern","sushi"],
  ["ryu","sushi","ryu","koi","lantern","sushi","sakura"],
  ["ryu","koi","sakura","sakura","koi","lantern","lantern"],
  ["sakura","koi","sakura","lantern","sushi","ryu","sushi"],
  ["lantern","sakura","ryu","sushi","sakura","sushi","lantern"],
  ["sushi","koi","ryu","lantern","ryu","ryu","koi"],
  ["sakura","sakura","sushi","ryu","ryu","sushi","ryu"]
 ];
 const board=rows.flat().map((family,id)=>({id:id+1,family,stage:1}));
 const snapshot=JSON.stringify(board);
 assert(R.validSwaps(board).some(([a,b])=>a===26&&b===33));
 assert.deepEqual(R.directedHint(board,[26,33]),{from:33,to:26},
  "Strong glow on row 5 col 6 Sushi; weak pulse on row 4 col 6 Ryu");
 assert.equal(JSON.stringify(board),snapshot,"Hint must not mutate the board");
});
check("Directed hints always identify both ends of a real swap",()=>{
 for(let level=0;level<10;level++){
  const game=new R.Game(level,null,{seed:900+level});
  for(const pair of R.validSwaps(game.board)){
   const hint=R.directedHint(game.board,pair);
   assert(hint&&pair.includes(hint.from)&&pair.includes(hint.to)&&hint.from!==hint.to);
   const swapped=game.board.slice();[swapped[hint.from],swapped[hint.to]]=[swapped[hint.to],swapped[hint.from]];
   assert(R.scan(swapped).some(g=>g.includes(hint.to)),
    "The target square should be where the moved piece makes a match");
  }
 }
});
check("Smart idle hint prefers the useful Sakura fusion and Harmony Echo",()=>{
 // Reconstructed family layout from the mobile screenshot, with the
 // observed mature Sakura in row 5 col 3 and younger Sakura above/below.
 const rows=[
  ["lantern","koi","ryu","sushi","lantern","ryu","koi"],
  ["lantern","sakura","sakura","lantern","koi","sakura","ryu"],
  ["koi","koi","sakura","lantern","ryu","lantern","sushi"],
  ["sakura","koi","ryu","sushi","koi","sushi","koi"],
  ["koi","sushi","sakura","sushi","lantern","sakura","sushi"],
  ["sushi","koi","sakura","ryu","lantern","sakura","sushi"],
  ["lantern","ryu","koi","lantern","koi","lantern","lantern"]
 ];
 const g=new R.Game(12,null,{seed:27189});
 g.board=rows.flat().map((family,id)=>({
  family,id:id+1,stage:id===30?3:id===23?2:id===18?2:1
 }));
 g.nextId=50;g.moves=17;g.score=800;
 const before=JSON.stringify(g.save()),options=R.validSwaps(g.board);
 assert(options.some(pair=>pair[0]===16&&pair[1]===23));
 assert(options.some(pair=>pair[0]===23&&pair[1]===30));
 const down=new R.Game(12,g.save(),{fastRestore:true});
 const up=new R.Game(12,g.save(),{fastRestore:true});
 down.swap(16,23);up.swap(23,30);
 assert(down.score-g.score>up.score-g.score,
  "Keeping the developed Sakura in place can activate Echo and yield more points");
 assert(down.echoes>g.echoes,"The downwards move should activate an existing Harmony Echo");
 const hint=R.bestHint(g);
 assert.deepEqual({from:hint.from,to:hint.to},{from:16,to:23},
  "Prefer row 3 col 3 DOWN into row 4 col 3, not the bigger Sakura from below");
 assert.equal(JSON.stringify(g.save()),before,"Evaluating previews must never mutate the real board, RNG, moves or score");
 assert(options.some(pair=>pair.includes(hint.from)&&pair.includes(hint.to)));
});
check("Smart hint consistently proposes valid swaps and keeps all saves unchanged",()=>{
 for(const level of [0,2,3,5,7,8,9,10,12,29,49]){
  const g=new R.Game(level,null,{seed:19278+level});
  const before=JSON.stringify(g.save());
  const hint=R.bestHint(g);
  assert(hint&&Number.isFinite(hint.value)&&hint.value>=0);
  const legal=R.validSwaps(g.board);
  assert(legal.some(pair=>pair.includes(hint.from)&&pair.includes(hint.to)));
  assert.equal(JSON.stringify(g.save()),before,"Preview must not affect score, bag, rolls, or any save field");
  const cloned=new R.Game(level,g.save(),{fastRestore:true});
  const result=cloned.swap(hint.from,hint.to);
  assert(result.ok);
  assert.equal(cloned.score-g.score,hint.expectedPoints);
 }
});
check("Historical score-mode thresholds stay intact for saved Journey runs and records",()=>{
 const first=R.legacyScoreConfig(10),middle=R.legacyScoreConfig(29),later=R.legacyScoreConfig(49);
 assert.equal(first.goal.count,7500);
 assert.deepEqual(first.stars,[7500,11250,16875]);
 assert.deepEqual(R.legacyScoreConfig(11).stars,[7575,11400,17100]);
 assert.deepEqual(R.legacyScoreConfig(12).stars,[7650,11550,17325]);
 assert.deepEqual(R.legacyScoreConfig(13).stars,[7725,11700,17550]);

 // Exact +50% vs the previous 6.6 formula, for early and arbitrarily late
 // Journey stages. Rounding is exact because old milestones were multiples of 50.
 for(const index of [10,11,12,13,15,19,29,39,49,50,100,1000,23000]){
  const cfg=R.legacyScoreConfig(index),adv=Math.max(0,index-10);
  const early=Math.min(39,adv),distance=Math.max(0,index-49);
  const base=Math.round((5000+52*early+35*Math.floor(early/5)+
   Math.min(1100,Math.log2(1+distance/12)*180))/50)*50;
  const mastery=Math.min(1,adv/39);
  const oldStars=[base,
   Math.ceil(base*(1.5+.15*mastery)/50)*50,
   Math.ceil(base*(2.25+.2*mastery)/50)*50];
  assert.deepEqual(cfg.stars,oldStars.map(x=>x*1.5),
   "Exactly 50% higher points on Journey "+(index+1));
  assert.equal(cfg.goal.count,cfg.stars[0],"The first star must still be the level goal");
 }
 assert.equal(R.levelConfig(0).moves,24,"Intro move budget stays doubled");
 assert.equal(R.levelConfig(0).par,7,"Intro stars still use goal timing, not score");

 assert(middle.goal.count>first.goal.count&&later.goal.count>middle.goal.count);
 assert(first.stars[1]>=first.stars[0]*1.5);
 assert(first.stars[2]>=first.stars[0]*2.25);
 assert(later.stars[1]/later.stars[0]>first.stars[1]/first.stars[0]);
 assert(later.stars[2]/later.stars[0]>first.stars[2]/first.stars[0]);
 assert.equal(R.scoreStars(11,7900,true),1);
 assert.equal(R.scoreStars(12,9125,true),1);
 assert.equal(R.scoreStars(13,9388,true),1);
 assert.equal(R.scoreStars(10,4710,true),1);
 assert.equal(R.scoreStars(10,4710),0);
 assert.equal(R.pacingProposalCount(10,0,"v3"),5);
 assert.equal(R.pacingProposalCount(10,3,"v3"),6);
 assert.equal(R.pacingProposalCount(15,0,"v3"),4);
 assert.equal(R.pacingProposalCount(15,3,"v3"),5);
 assert.equal(R.pacingProposalCount(20,8,"v3"),4);
 assert.equal(R.pacingProposalCount(10,8,"v2"),4);
 assert.equal(R.pacingProposalCount(10,8,"standard"),4);
 for(const level of [10,11,14,19,29,39,49,100,23000]){
  const cfg=R.legacyScoreConfig(level),[a,b,c]=cfg.stars;
  assert(a===cfg.goal.count&&a<b&&b<c);
  assert.equal(R.scoreStars(level,a-1),0);
  assert.equal(R.scoreStars(level,a),1);
  assert.equal(R.scoreStars(level,b-1),1);
  assert.equal(R.scoreStars(level,b),2);
  assert.equal(R.scoreStars(level,c-1),2);
  assert.equal(R.scoreStars(level,c),3);
  assert.equal(R.scoreStars(level,100,true),1);
  assert.equal(R.scoreStars(level,c,true),3);
 }
});
check("Legacy completed score levels keep their completion and an honest one-star score",()=>{
 const g=new R.Game(10,null,{seed:7894});
 const old=g.save();delete old.objectiveVersion;delete old.mist;delete old.mistCleared;
 old.score=1600;old.complete=true;old.moves=4;
 const restored=new R.Game(10,old,{fastRestore:true});
 assert.equal(restored.complete,true,"Old level 11 win may not be revoked");
 assert.equal(restored.stars(),1,"Old 3-star rating is recalibrated to a grandfathered 1 star");
 assert.equal(restored.score,1600);
 assert.equal(restored.legacyScoreCompletion,true);
 assert.deepEqual(new R.Game(10,restored.save(),{fastRestore:true}).save(),restored.save());
 const fresh=new R.Game(10,null,{seed:7894});
 fresh.score=1600;
 assert.equal(fresh.complete,false);
 assert.equal(fresh.stars(),0,"New attempts cannot clear the level at the old target");
});
console.log("Japanese Harmony rule tests passed");