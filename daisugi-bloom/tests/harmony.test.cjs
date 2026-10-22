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
  const selection=R.activeFamilies(i);
  assert.equal(selection.length,5,"Five families, never nine, on level "+(i+1));
  assert.equal(new Set(selection).size,5);
  for(const family of selection)seen.add(family);
  if(i===2)assert.equal(seen.size,9,"Every family must be introduced by level 3");
 }
 assert.deepEqual([...seen].sort(),R.families.slice().sort());
 assert(R.activeFamilies(5).includes("lantern"),"Lantern Festival needs lanterns");
 for(let i=0;i<10;i++){let g=new R.Game(i);assert.equal(g.board.length,49);assert(g.board.every(p=>p&&p.stage===1),"Every new level must begin with only stage-one objects");assert.equal(R.scan(g.board).length,0);assert(R.validSwaps(g.board).length>=3);assert.equal(g.moves,R.levels[i].moves);assert.deepEqual(new Set(g.board.map(p=>p.family)),new Set(R.activeFamilies(i)));}
});
check("level 8 is achievable through five stage-three evolutions, not a rare T/L formation",()=>{
 const cfg=R.levels[7];
 assert.equal(cfg.name,"Garden in Bloom");
 assert.deepEqual(cfg.goal,{type:"stage3",count:5});
 assert.equal(cfg.moves,20);
 assert.equal(cfg.par,12);
 const g=new R.Game(7);
 assert.equal(g.moves,20);
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
check("Endless Journey levels use repeatable score goals, families and meaningful star thresholds",()=>{
 for(const level of [10,19,29,49,50,100,1000,23000]){
  const cfg=R.levelConfig(level),again=R.levelConfig(level);
  assert.deepEqual(cfg,again);
  assert.equal(cfg.goal.type,"score");
  assert(cfg.moves>=17&&cfg.moves<=22);
  assert(cfg.stars[0]===cfg.goal.count&&cfg.stars[1]>cfg.stars[0]&&cfg.stars[2]>cfg.stars[1]);
  const families=R.activeFamilies(level);
  assert.equal(families.length,5);assert.equal(new Set(families).size,5);
  const a=new R.Game(level,null,{seed:1001}),b=new R.Game(level,null,{seed:1001});
  assert.deepEqual(a.board,b.board);
  assert.equal(a.level,level);
  a.score=cfg.stars[1];
  assert.equal(a.progress(),cfg.stars[1]);assert.equal(a.stars(),2);
  a.score=cfg.stars[2];
  assert.equal(a.stars(),3);
 }
 assert(R.levelConfig(23000).goal.count<10000,"Late-stage goals must not grow impossibly without bounds");
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
console.log("Japanese Harmony rule tests passed");