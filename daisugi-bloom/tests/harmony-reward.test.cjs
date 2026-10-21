"use strict";
// Harmony 4.2 reward counter contracts. Zero dependency on an actual DOM;
// the exact runtime counter function is executed with a deterministic clock.
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const source=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
const start=source.indexOf("function animateScoreCount(){");
const end=source.indexOf("function choose(i){",start);
assert(start>=0&&end>start,"Cannot find score count-up implementation");
const implementation=source.slice(start,end);
let now=0,serial=0,reduced=false,hidden=false;
const pending=new Map(),displayHistory=[];
const env={
 get now(){return now},
 get reduced(){return reduced},
 get hidden(){return hidden},
 get serial(){return ++serial},
 pending,displayHistory
};
const body=[
 "let scoreShown=0,scoreDisplayed=0,scoreRaf=0;",
 "const save={get reduceMotion(){return env.reduced}};",
 "const window={matchMedia:()=>({matches:false})};",
 "const document={get hidden(){return env.hidden}};",
 "const performance={now:()=>env.now};",
 "const requestAnimationFrame=fn=>{const id=env.serial;env.pending.set(id,fn);return id;};",
 "const cancelAnimationFrame=id=>env.pending.delete(id);",
 "const renderScoreOnly=()=>env.displayHistory.push(scoreDisplayed);",
 implementation,
 "return {",
 " add(points){scoreShown+=points;animateScoreCount();},",
 " state(){return {target:scoreShown,displayed:scoreDisplayed,raf:scoreRaf}},",
 " cancel(){if(scoreRaf)cancelAnimationFrame(scoreRaf);scoreRaf=0;scoreDisplayed=scoreShown;}",
 "};"
].join("\n");
const counter=new Function("env",body)(env);
function advance(ms){
 now+=ms;
 const todo=[...pending.values()];pending.clear();
 for(const fn of todo)fn(now);
}
assert.deepEqual(counter.state(),{target:0,displayed:0,raf:0});
counter.add(150);
advance(120);
assert(counter.state().displayed>0&&counter.state().displayed<150,"Count-up should interpolate");
counter.add(250);
advance(280);
assert.equal(counter.state().displayed,400,"Concurrent rewards must reach the exact sum");
assert.equal(pending.size,0,"No RAF remains after finishing");
reduced=true;counter.add(100);
assert.equal(counter.state().displayed,500,"Reduced motion must update immediately");
reduced=false;counter.add(700);
advance(60);
assert(counter.state().displayed<1200);
counter.cancel();
assert.equal(counter.state().displayed,1200,"End/reset should flush pending reward points");
assert.equal(pending.size,0,"Reset must cancel RAF");
hidden=true;counter.add(250);
assert.equal(counter.state().displayed,1450,"Hidden tabs must not queue score animations");
assert(displayHistory.length>=2);
console.log("PASS Harmony 4.2 – exact counter totals, multi-arrivals, reduced motion & reset");
