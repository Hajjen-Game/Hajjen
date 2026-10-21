"use strict";
// Isolated deterministic contract tests for Harmony 4.1 visual feedback.
// No browser DOM or asset network required. Browser smoke tests the real page.
const fs=require("node:fs");
const assert=require("node:assert/strict");
const path=require("node:path");
const script=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../harmony/mobile-game.css"),"utf8");
function part(a,b){
 const from=script.indexOf(a),to=script.indexOf(b,from);
 assert(from>=0&&to>from,"Missing code contract: "+a);
 return script.slice(from,to);
}
const family=part("const EVOLUTION_FAMILIES","// A clearly readable but compact reward");
const trace=[];
const boardTiles=Array.from({length:49},()=>({querySelector:()=>({})}));
const indexRect=i=>({left:(i%7)*48,top:Math.floor(i/7)*48,width:47,height:47});
function fxAt(name){
 trace.push(["fx",name]);
 return {style:{setProperty(){}},remove(){trace.push(["remove",name])}};
}
function animateNode(node,frames,ms){
 trace.push(["anim",frames.length,ms]);
 return Promise.resolve();
}
const chip={textContent:"",dataset:{},hidden:true};
const makeFamily=new Function("FAST","MOBILE_LITE","Element","indexRect","fxAt","animateNode","boardTiles","$","clearTimeout","setTimeout",
 "let comboTimer=0;\n"+family+"return {evolveFamilyFx,announceReward,masterpieceMoment};");
const {evolveFamilyFx,announceReward,masterpieceMoment}=makeFamily(
 ()=>false,true,{prototype:{animate(){}}},indexRect,fxAt,animateNode,boardTiles,
 ()=>chip,()=>{},()=>1);
const names=["sakura","lantern","koi","fan","bonsai"];
for(const familyName of names)evolveFamilyFx([{family:familyName,at:14}]);
assert.deepEqual(trace.filter(x=>x[0]==="fx").map(x=>x[1]),names.map(n=>"evo-family evo-"+n),
 "Every family should create a distinct evolution signature");
for(const familyName of names)assert(css.includes(".evo-"+familyName+"::"),"Missing CSS for "+familyName);
evolveFamilyFx(Array.from({length:18},(_,i)=>({family:"koi",at:i})));
assert.equal(trace.filter(x=>x[0]==="fx").length,7,"Mobile family cue budget = 2");
masterpieceMoment([0,1,2,3,4,5]);
assert.equal(trace.filter(x=>x[1]==="masterpiece-halo").length,2,"Mobile masterpiece halo budget = 2");
announceReward(1,"VACKERT!");
announceReward(3,"MÄSTERVERK!");
announceReward(2,"HARMONI!");
assert.equal(chip.textContent,"✦ MÄSTERVERK!","Lower-tier feedback cannot overwrite a better reward");

const directed=part("function pulseBeams(evt){","async function animateEvent(evt){");
const travel=[];
let cleaned=false;
const makeBeams=new Function("FAST","MOBILE_LITE","indexRect","fxAt","makeFxLayer","document","animateNode",
 directed+"return pulseBeams;");
const pulseBeams=makeBeams(()=>false,true,indexRect,
 name=>{travel.push(name);return {style:{},remove(){}};},
 ()=>({rect:{left:0,top:0},node:{appendChild(node){travel.push(node.className)},remove(){cleaned=true}}}),
 {createElement:()=>({style:{},className:""})},
 ()=>Promise.resolve());
const targets=Array.from({length:40},(_,i)=>({from:i%3,to:(i*2+5)%49}));
async function run(){
 await pulseBeams({targets});
 assert.equal(travel.filter(x=>x==="pulse-dot").length,5,"Mobile pulse beam cap = 5");
 assert.equal(travel.filter(x=>x==="pulse-source-halo").length,2,"Mobile source ring cap = 2");
 assert(cleaned,"Pulse temporary layer must always be released");

 const eventCode=part("async function animateEvent(evt){","async function playEvents(events){");
 const order=[];
 const createEvent=new Function("presentedBoard","MOBILE_LITE","pulseBeams","renderBoard","animateNode",
  "boardTiles","flipMove","playFusion","masterpieceMoment",eventCode+"return animateEvent;");
 const animateEvent=createEvent([],true,
  async()=>order.push("travel"),()=>order.push("render"),()=>{order.push("land");return Promise.resolve()},
  boardTiles,async()=>{},async()=>{},()=>order.push("masterpiece"));
 await animateEvent({type:"pulse",board:[],targets:[{from:0,to:1},{from:0,to:7}]});
 assert.deepEqual(order,["travel","render","land","land"],"Energy must arrive before upgrading logical targets");
 console.log("PASS Harmony 4.1 – family signatures, mobile limits, reward priorities, directed Pulse");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
