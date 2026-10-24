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
check("Moves Expansion 1.0 doubles all 10 introductions and the entire Journey",()=>{
 const original=[12,18,16,18,18,20,18,20,20,24];
 for(let index=0;index<original.length;index++){
  assert.equal(R.levelConfig(index).moves,original[index]*2,"Level "+(index+1));
  assert.equal(new R.Game(index).moves,original[index]*2);
 }
 for(const index of [10,11,15,29,49,50,150,23000]){
  const tier=Math.floor((index-10)/10);
  const before=Math.max(17,22-((index-10)%5)-Math.floor(tier/4));
  assert.equal(R.levelConfig(index).moves,2*before,"Journey level "+(index+1));
  assert.equal(new R.Game(index).moves,2*before);
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
  assert(cfg.moves>=34&&cfg.moves<=44,"Move budgets must be unchanged");
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
 const legacy=R.legacyScoreConfig(10);
 assert.deepEqual(legacy.goal,{type:"score",count:7500});
 assert.deepEqual(legacy.stars,[7500,11250,16875]);
});
check("Harmony Mist clears cell positions through matching and Harmony Pulse, once each",()=>{
 const g=new R.Game(10,null,{seed:451,directorMode:"v3"});
 g.board=blank();
 for(const i of [23,24,25])g.board[i].family="sakura";
 g.board[24].stage=4;
 const cells=[23,24,25,17,31,38];
 g.mist=Array(49).fill(0);for(const i of cells)g.mist[i]=1;
 const events=g.resolve(-1);
 const fusion=events.find(e=>e.type==="fusion");
 const pulse=events.find(e=>e.type==="pulse");
 assert(fusion&&pulse,"Stage-five fusion must create a real Pulse");
 assert.deepEqual(new Set(fusion.clearedMist),new Set([23,24,25]));
 assert.deepEqual(new Set(pulse.clearedMist),new Set([17,31]));
 assert.equal(g.progress(),5);
 assert.equal(g.mist[38],1,"Unhit mist must remain on its cell");
 assert.equal(g.mist.filter(Boolean).length,1);
 assert.equal(g.clearMist([23,23,24]).length,0,"Already cleansed cells cannot score again");
 const saved=g.save(),restored=new R.Game(10,saved,{fastRestore:true});
 assert.deepEqual(restored.mist,g.mist);
 assert.equal(restored.mistCleared,5);
 assert.equal(restored.progress(),5);
 const oldBefore=JSON.stringify(g.save());
 assert.equal(g.clearMist([38,38]).length,1);
 assert(g.fulfilled());
 assert.equal(g.mistCleared,6);
 assert.equal(g.mist.filter(Boolean).length,0);
 assert.notEqual(JSON.stringify(g.save()),oldBefore);
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