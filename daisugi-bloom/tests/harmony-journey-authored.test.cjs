"use strict";
/* Journey 2.0: five genuinely specified 7x7 puzzles, not just legal RNG starts.
 * The only production link is the opt-in unranked preview.
 */
const assert=require("node:assert/strict");
const R=require("../harmony/rules.js");
const A=require("../harmony/puzzle-architect.js");
const Authored=require("../harmony/journey-authored-openings.js");
const Drafts=require("../harmony/journey-levels-v2.js");
const check=(label,fn)=>{fn();console.log("PASS "+label);};
const levels=[4,10,15,17,19],seeds=[123,20261104,88331];
function physical(i,seed=123){
 const bp=Authored.get(i);
 return A.build(R,bp,{seed,directorMode:"v62"});
}
function supports(g,from,to){
 return R.validSwaps(g.board).some(([a,b])=>
  (a===from&&b===to)||(a===to&&b===from));
}
check("Exactly five authored puzzles preserve the intended 49-cell geometry",()=>{
 assert.equal(Authored.VERSION,1);
 assert.equal(Authored.COUNT,5);
 assert.deepEqual(Authored.summary().map(x=>x.index),levels);
 assert.equal(Authored.get(9),null,"Koi level-10 finale is unchanged");
 for(const index of levels){
  const bp=Authored.get(index);
  assert.equal(bp.version,1);
  assert.equal(bp.recipe.index,index);
  assert.equal(bp.opening.provenance,"hand-authored");
  assert.equal(bp.opening.grid.length,49);
  assert.equal(bp.sequence.length,3);
  assert(bp.insight.length>20);
  assert.deepEqual(bp.recipe,Drafts.get(index));
  const draft=JSON.stringify(bp);
  const other=Authored.get(index);
  other.opening.grid[0]="koi";
  assert.equal(JSON.stringify(bp),draft,"User edits cannot leak back into the registry");
  for(const seed of seeds){
   const game=physical(index,seed);
   assert.equal(game.board.length,49);
   assert.equal(game.config.name,bp.recipe.name);
   assert.deepEqual(A.cellsOf(game),bp.opening.grid);
   assert.equal(game.levelRecipe.id,bp.recipe.id);
   assert.equal(game.moves,bp.recipe.moves);
   assert.equal(R.scan(game.board).length,0);
   assert(R.validSwaps(game.board).length>=3);
   assert.equal(game.board.filter(p=>p?.family==="moonMirror").length,bp.recipe.mechanics.mirrors.length);
   assert.equal(game.board.filter(p=>p?.family==="lotusSeed").length,bp.recipe.mechanics.hanabi?.starts.length||0);
   assert.equal(game.board.filter(p=>p?.family==="hanabiCrate").length,bp.recipe.mechanics.hanabi?.crates.length||0);
   const restored=new R.Game(index,game.save(),{fastRestore:true});
   assert.deepEqual(restored.board,game.board);
   assert.deepEqual(restored.config.goal,game.config.goal);
  }
 }
});
check("Level 5: deliberately clear the column immediately below Hanabi",()=>{
 const g=physical(4);
 assert.equal(g.board[29]?.family,"lotusSeed");
 assert.equal(g.board[43]?.family,"hanabiCrate");
 assert.equal(g.board[35]?.family,g.board[36]?.family);
 assert.notEqual(g.board[30]?.family,g.board[36]?.family,
  "Hanabi should NOT be a one-swap tutorial shortcut");
 assert.equal(g.board[31]?.family,g.board[36]?.family);
 assert.notEqual(g.board[37]?.family,g.board[36]?.family);
 assert(supports(g,30,31),"First move must set up the rocket lane");
 const first=g.swap(30,31);
 assert.equal(first.ok,true);
 assert.equal(g.lotusDelivered,0,"The setup move must not win immediately");
 assert(supports(g,30,37),"The second move must be available after the setup");
 const second=g.swap(30,37);
 assert.equal(second.ok,true);
 assert(g.lotusDelivered>=1,"Second Fusion must launch the real Hanabi rocket");
});
check("Level 11: player-created vertical Fusion next to Moon Mirror",()=>{
 const g=physical(10);
 assert.equal(g.board[25]?.family,"moonMirror");
 assert.equal(g.board[17]?.family,g.board[31]?.family);
 assert.equal(g.board[23]?.family,g.board[17]?.family);
 assert.notEqual(g.board[24]?.family,g.board[23]?.family);
 assert(supports(g,23,24));
 const step=g.swap(23,24);
 assert.equal(step.ok,true);
 assert(step.events.some(e=>e.type==="mirror-resonance"),
  "The taught move must actually fire Mirror Fusion Resonance");
 assert.equal(g.mirrorResonances,1);
});
check("Level 16: a rightward third-turn wind would complete the planned column",()=>{
 const g=physical(15);
 assert.deepEqual(g.windGarden,{every:3,steps:[{row:3,direction:"right"}]});
 assert.equal(g.board[16]?.family,g.board[30]?.family);
 assert.equal(g.board[22]?.family,g.board[16]?.family);
 assert.notEqual(g.board[23]?.family,g.board[16]?.family);
 const shifted=g.board.map(p=>p?{...p}:p);
 const row=shifted.slice(21,28);
 shifted.splice(21,7,row[6],...row.slice(0,6));
 assert(R.scan(shifted).some(x=>x.includes(16)&&x.includes(23)&&x.includes(30)),
  "Predicted wind result must create a real column match if setup is untouched");
});
check("Level 18: wind shifts an A to enable a mirror-adjacent next Fusion",()=>{
 const g=physical(17);
 assert.equal(g.board[25]?.family,"moonMirror");
 assert.deepEqual(g.windGarden,{every:3,steps:[{row:2,direction:"left"}]});
 assert.equal(g.board[18]?.family,g.board[23]?.family);
 assert.equal(g.board[31]?.family,g.board[23]?.family);
 assert.notEqual(g.board[17]?.family,g.board[18]?.family);
 const shifted=g.board.map(p=>p?{...p}:p);
 const row=shifted.slice(14,21);
 shifted.splice(14,7,...row.slice(1),row[0]);
 const after=new R.Game(17,g.save(),{fastRestore:true});
 after.board=shifted;
 assert(supports(after,23,24));
 const next=after.board.map(p=>p?{...p}:p);
 [next[23],next[24]]=[next[24],next[23]];
 assert(R.scan(next).some(x=>x.includes(17)&&x.includes(24)&&x.includes(31)),
  "Wind makes the subsequent destination-controlled mirror setup possible");
});
check("Level 20: two different real Mirror activations are available",()=>{
 const g=physical(19);
 assert.deepEqual(g.moonMirrors.map(x=>x.at),[18,24]);
 assert.equal(g.board[29]?.family,"lotusSeed");
 assert.equal(g.board[33]?.family,"lotusSeed");
 assert.equal(g.board[43]?.family,"hanabiCrate");
 assert.equal(g.board[47]?.family,"hanabiCrate");
 for(const [a,b] of [[22,23],[19,20],[34,41]])assert(supports(g,a,b),
  "Expected intentional legal setup "+a+" ↔ "+b);
 for(const [a,b] of [[22,23],[19,20]]){
  const separate=physical(19);
  const step=separate.swap(a,b);
  assert.equal(step.ok,true);
  assert(step.events.some(e=>e.type==="mirror-resonance"),
   "Each taught route must cause a real directional reflection");
  assert.equal(separate.mirrorResonances,1);
 }
});
check("Normal saves and published Journey never inherit hand-authored boards",()=>{
 for(const index of levels){
  const live=new R.Game(index,null,{seed:123});
  assert.equal(live.levelRecipe,null);
  assert(!Object.hasOwn(live.save(),"levelRecipe"));
  assert.notDeepEqual(A.cellsOf(live),Authored.get(index).opening.grid);
  const saved=live.save();
  const restored=new R.Game(index,saved,{fastRestore:true});
  assert.deepEqual(restored.board,live.board);
 }
});
console.log("PASS five playable hand-authored Journey 2.0 puzzle references");
