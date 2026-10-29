"use strict";
const assert=require("node:assert/strict");
const T=require("../harmony/omamori-targets.js");
const R=require("../harmony/rules.js");
const P=require("../harmony/powers.js");
const board=Array.from({length:49},(_,id)=>({id,family:"sakura",stage:1}));
const eq=(id,anchor,expected)=>assert.deepEqual(T.preview(id,[anchor],board),expected,id+" "+anchor);
assert.equal(T.required("grandBloom"),2);
assert.equal(T.required("twinSealbreaker"),2);
assert.equal(T.required("koi"),1);
assert.deepEqual(T.preview("grandBloom",[2,9],board),[2,9]);
assert.deepEqual(T.preview("twinSealbreaker",[23,22],board),[23,22]);
assert.deepEqual(T.preview("sakura",[24],board),[24]);
assert.deepEqual(T.preview("koi",[],board),[]);
assert.deepEqual(T.preview("tsuki",[],board),[]);
eq("koi",0,[0,1,7,8]);
eq("koi",48,[40,41,47,48]);
eq("koi",24,[24,25,31,32]);
eq("deepCurrent",0,[0,1,2,7,8,9,14,15,16]);
eq("deepCurrent",24,[16,17,18,23,24,25,30,31,32]);
eq("deepCurrent",48,[32,33,34,39,40,41,46,47,48]);
board[40]={id:40,family:"daruma",stage:1};
board[47]={id:47,family:"sealedStone",stage:1};
eq("koi",48,[41,48]); // Exactly the cells Powers.shuffleArea can change.
assert.equal(T.area("koi",-1,board).length,0);
assert.equal(T.area("koi",50,board).length,0);
const game=new R.Game(12,null,{seed:831});
for(const [id,at] of [["koi",24],["deepCurrent",24]]){
 const wanted=T.area(id,at,game.board);
 const copy=new R.Game(12,game.save(),{fastRestore:true});
 const result=P.apply(copy,id,at);
 assert(result.ok,id);
 assert.deepEqual(result.events.find(e=>e.type==="shuffle").cells,wanted,
  "The gold shuffle preview must match the REAL affected cells");
}
console.log("PASS Omamori Target Feedback 1.0: gold preview coordinates match real 2x2/3x3 and fixed blocker exclusions");
