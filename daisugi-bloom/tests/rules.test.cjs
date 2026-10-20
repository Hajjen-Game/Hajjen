const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const win={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../src/rules.js"),"utf8"),{window:win,Date,Math,Set,Array,Object,Number,console});
const R=win.DaisugiRules;
function check(label,fn){fn();console.log("PASS "+label);}
function fixture(){
 const g=new R.Game(0);
 // Fully controlled mature arrangement for testing resolution only,
 // not for players to receive as an introductory level.
 g.board[23].family="sakura";g.board[23].stage=1;
 g.board[24].family="sakura";g.board[24].stage=4;
 g.board[25].family="verdant";g.board[25].stage=1;
 g.board[18].family="sakura";g.board[18].stage=1;
 g.board[17].family="verdant";g.board[17].stage=4;
 g.board[31].family="sunleaf";g.board[31].stage=4;
 return g;
}
check("Five 7x7 start boards, no ready-made matches or bushes",()=>{
 for(let i=0;i<5;i++){
  const g=new R.Game(i);assert.equal(g.board.length,49);
  assert.equal(R.scan(g.board).length,0);assert(R.hasMove(g.board));
  assert.equal(g.trees,0);assert(!g.complete);
  assert(g.board.every(p=>p.stage<=3),"pre-completed shrub leaked into gameplay");
 }
});
check("Tutorial objectives now require more than one trivial growth step",()=>{
 const g=new R.Game(0);assert(g.target()>=8);
 assert(R.levels[2].goal.count>=3);assert(R.levels[3].goal.count>=2&&R.levels[3].goal.trees>=4);assert(R.levels[4].goal.count>=5);
});
check("Invalid move costs no turn",()=>{const g=new R.Game(0),m=g.moves;assert(!g.swap(0,48).ok);assert.equal(g.moves,m);});
check("Three-tree Bloom Pulse still functions in real rules",()=>{
 const g=fixture(),r=g.swap(18,25);
 assert(r.ok);assert(g.trees>=3);assert(g.essence>=90);
 assert(r.events.some(e=>e.type==="pulse"));
});
check("No diagonal pulse and no plant grows twice per connected pulse",()=>{
 const g=fixture(),events=g.swap(18,25).events;let seen=new Set();
 for(const e of events){
  if(e.type==="harvest"){seen.clear();continue;}
  if(e.type!=="pulse")continue;
  for(const p of e.targets){assert([1,7].includes(Math.abs(p.from-p.to)));assert(!seen.has(p.to));seen.add(p.to);}
 }
});
check("Free Power Move still allows instant fusion and cannot recharge itself",()=>{
 const g=fixture(),turns=g.moves;
 g.powers=1;g.board[23].family="verdant";g.board[24].family="verdant";g.board[25].family="mistbloom";
 const r=g.power(25,"verdant");
 assert(r.ok);assert(g.trees>=3);assert.equal(g.moves,turns);assert.equal(g.energy,0);
});
check("Refill only spawns stage-one seeds; later cascades may evolve them",()=>{
 const g=fixture(),known=new Set(g.board.map(p=>p.id));
 for(const e of g.swap(18,25).events){
  if(e.type==="fall")e.board.forEach(p=>{if(p&&!known.has(p.id))assert.equal(p.stage,1);});
  e.board.forEach(p=>{if(p)known.add(p.id);});
 }
});
check("Snapshot persists grown plants and move count",()=>{
 const g=new R.Game(0),reloaded=new R.Game(0,g.save());
 assert.equal(JSON.stringify(g.board),JSON.stringify(reloaded.board));assert.equal(g.moves,reloaded.moves);
});
console.log("Daisugi Bloom 1.1 rule tests passed.");
