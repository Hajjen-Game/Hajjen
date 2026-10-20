const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const win={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../src/rules.js"),"utf8"),{window:win,Date,Math,Set,Array,Object,Number,console});
const R=win.DaisugiRules;
function check(label,fn){fn();console.log("PASS "+label);}
check("Five fair initial 7x7 boards",()=>{
 for(let i=0;i<5;i++){const g=new R.Game(i);assert.equal(g.board.length,49);assert.equal(R.scan(g.board).length,0);assert(R.hasMove(g.board));}
});
check("Invalid move costs no turn",()=>{const g=new R.Game(0),m=g.moves;assert(!g.swap(0,48).ok);assert.equal(g.moves,m);});
check("Intro tree harvest and pulse",()=>{const g=new R.Game(2),r=g.swap(18,25);assert(r.ok&&g.complete&&g.trees>0);assert(r.events.some(e=>e.type==="pulse"));});
check("Level 4 planned multi-tree pulse",()=>{const g=new R.Game(3);assert(g.swap(18,25).ok);assert(g.complete&&g.bestChain>=3);});
check("Orthogonal and single-hit pulse",()=>{
 const g=new R.Game(3),events=g.swap(18,25).events;let seen=new Set();
 for(const e of events){if(e.type==="harvest"){seen.clear();continue;}if(e.type!=="pulse")continue;for(const p of e.targets){assert([1,7].includes(Math.abs(p.from-p.to)));assert(!seen.has(p.to));seen.add(p.to);}}
});
check("Power Move starts a free match and grants life force, not energy",()=>{
 const g=new R.Game(4),moves=g.moves,r=g.power(25,"verdant");
 assert(r.ok&&g.complete&&g.bestChain>=3);assert.equal(g.moves,moves);assert.equal(g.energy,0);
});
check("Refill only produces stage-one seeds",()=>{
 const g=new R.Game(3),known=new Set(g.board.map(p=>p&&p.id));for(const e of g.swap(18,25).events){if(e.type==="fall")e.board.forEach(p=>{if(p&&!known.has(p.id))assert.equal(p.stage,1);});e.board.forEach(p=>{if(p)known.add(p.id);});}
});
check("Save/restore retains plants and moves",()=>{
 const g=new R.Game(0),reloaded=new R.Game(0,g.save());
 assert.equal(JSON.stringify(g.board),JSON.stringify(reloaded.board));assert.equal(g.moves,reloaded.moves);
});
console.log("All Daisugi Bloom logic tests passed.");
