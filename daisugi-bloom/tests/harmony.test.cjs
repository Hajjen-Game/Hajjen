const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const check=(title,fn)=>{fn();console.log("PASS "+title);};
const p=(family,stage=1,id=1)=>({family,stage,id});
const blank=()=>Array.from({length:49},(_,i)=>p(["sakura","lantern","koi","fan"][(Math.floor(i/7)+2*(i%7))%4],1,i+1));
function fixture(){
 const g=new R.Game(0);
 g.board=blank();return g;
}
check("10 first-chapter levels and nine available family identities",()=>{
 assert.equal(R.levels.length,10);
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
console.log("Japanese Harmony rule tests passed");