"use strict";
// Identity Plan 1.0: deterministic mechanic contracts only; no live levels.
const assert=require("node:assert/strict");
const P=require("../harmony/identity-prototypes.js");
function check(label,fn){fn();process.stdout.write("OK "+label+"\n");}
function board(){return Array.from({length:49},(_,id)=>({id,family:"sakura",stage:1}));}
check("Mirror preserves all ordinary four-way Pulse neighbors",()=>{
 const pulse=P.planMirrorPulse(24,[]);
 assert.deepEqual(pulse.direct,[17,25,31,23]);
 assert.deepEqual(pulse.targets,pulse.direct);
});
check("A right mirror reaches beyond ordinary Pulse",()=>{
 const mirrors=[{at:25,direction:"right"}];
 const original=JSON.stringify(mirrors);
 const pulse=P.planMirrorPulse(24,mirrors);
 assert.deepEqual(pulse.reflections,[{from:25,to:26,direction:"right"}]);
 assert.deepEqual(pulse.targets,[17,25,31,23,26]);
 assert.equal(JSON.stringify(mirrors),original);
});
check("No self-bounce, out-of-bounds, infinite relay or duplicate hit",()=>{
 assert.equal(P.planMirrorPulse(24,[{at:25,direction:"left"}]).reflections.length,0);
 assert.equal(P.planMirrorPulse(19,[{at:20,direction:"right"}]).reflections.length,0);
 const p=P.planMirrorPulse(24,[{at:17,direction:"right"},{at:25,direction:"up"},{at:18,direction:"right"}]);
 assert.deepEqual(p.reflections,[{from:17,to:18,direction:"right"}]);
 assert.equal(p.targets.filter(x=>x===18).length,1);
 assert.equal(p.targets.includes(19),false,"Remote mirror must not relay again");
});
check("Mirror may hit an objective tile, but not closed terrain",()=>{
 assert(P.planMirrorPulse(24,[{at:25,direction:"right"}]).targets.includes(26));
 assert(!P.planMirrorPulse(24,[{at:25,direction:"right"}],{blocked:[26]}).targets.includes(26));
 assert.throws(()=>P.planMirrorPulse(24,[{at:25,direction:"right"}],{blocked:[25]}));
});
check("Mirror validation rejects conflicting or invalid descriptors",()=>{
 assert.throws(()=>P.normalizeMirrors([{at:25,direction:"north"}]));
 assert.throws(()=>P.normalizeMirrors([{at:25,direction:"right"},{at:25,direction:"left"}]));
 assert.throws(()=>P.planMirrorPulse(49,[]));
 assert.throws(()=>P.planMirrorPulse(24,[],{blocked:[24]}));
});
check("Wind shifts one full settled row, keeps identities and stage",()=>{
 const initial=board();
 initial[17].stage=4;
 const before=JSON.stringify(initial);
 const p=P.planWindShift(initial,2,"right");
 assert.equal(p.ok,true);
 assert.equal(p.board[14].id,20);
 assert.equal(p.board[15].id,14);
 assert.equal(p.board[18].id,17);
 assert.equal(p.board[18].stage,4);
 assert.equal(p.board[21],initial[21]);
 assert.equal(JSON.stringify(initial),before,"Do not mutate original board");
 assert.equal(new Set(p.board.map(x=>x.id)).size,49,"No lost or duplicated tiles");
 assert.equal(p.moved.length,7);
});
check("Wind left wraparound is deterministic and independent of overlays",()=>{
 const p=P.planWindShift(board(),4,"left");
 assert.equal(p.ok,true);
 assert.equal(p.board[28].id,29);
 assert.equal(p.board[34].id,28);
});
check("Wind refuses obstructed and unsettled rows instead of cheating",()=>{
 const b=board();b[17]={id:17,family:"daruma",stage:0};
 assert.deepEqual(P.planWindShift(b,2,"left").ok,false);
 for(const family of ["sealedStone","terrain","lotusSeed"]){
  b[17]={id:17,family,stage:0};
  assert.equal(P.planWindShift(b,2,"left").reason,"fixed-object-in-row");
 }
 b[17]=null;
 assert.equal(P.planWindShift(b,2,"left").reason,"unsettled-row");
 assert.throws(()=>P.planWindShift(board(),7,"left"));
});
check("Wind schedule always previews the next shift in advance",()=>{
 const schedule={every:3,steps:[{row:2,direction:"left"},{row:4,direction:"right"}]};
 assert.deepEqual(P.nextWindShift(0,schedule),{inMoves:3,afterMove:3,row:2,direction:"left"});
 assert.deepEqual(P.nextWindShift(2,schedule),{inMoves:1,afterMove:3,row:2,direction:"left"});
 assert.deepEqual(P.nextWindShift(3,schedule),{inMoves:3,afterMove:6,row:4,direction:"right"});
 assert.deepEqual(P.nextWindShift(5,schedule),{inMoves:1,afterMove:6,row:4,direction:"right"});
 assert.deepEqual(P.nextWindShift(6,schedule),{inMoves:3,afterMove:9,row:2,direction:"left"});
 assert.throws(()=>P.nextWindShift(0,{every:0,steps:schedule.steps}));
 assert.throws(()=>P.nextWindShift(0,{every:3,steps:[{row:7,direction:"up"}]}));
});
console.log("Identity Plan 1.0 prototypes: all contract tests passed");
