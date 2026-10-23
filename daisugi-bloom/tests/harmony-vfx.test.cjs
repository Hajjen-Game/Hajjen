"use strict";
// Isolated deterministic contract tests for Harmony 4.1.1 visible feedback.
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
const family=part("const EVOLUTION_FAMILIES","// Board Praise 1.0");
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
const makeFamily=new Function("FAST","MOBILE_LITE","Element","indexRect","fxAt","animateNode","boardTiles",
 family+"return {evolveFamilyFx,evolutionStageLabels};");
const {evolveFamilyFx,evolutionStageLabels}=makeFamily(
 ()=>false,true,{prototype:{animate(){}}},indexRect,fxAt,animateNode,boardTiles);
const masterpiecePart=part("function masterpieceMoment(positions){","// Harmony Firework 1.0 —");
const masterpieceMoment=new Function("FAST","MOBILE_LITE","Element","indexRect","fxAt","animateNode","boardTiles",
 masterpiecePart+"return masterpieceMoment;")(
 ()=>false,true,{prototype:{animate(){}}},indexRect,fxAt,animateNode,boardTiles);
const names=["sakura","lantern","koi","fan","bonsai"];
for(const familyName of names)evolveFamilyFx([{family:familyName,at:14}]);
assert.deepEqual(trace.filter(x=>x[0]==="fx").map(x=>x[1]),
 names.map(n=>"evo-family evo-"+n+" harmony-evolution harmony-small"),
 "Every family must share the new Sakura-inspired gold-glow evolution, keeping family hooks");
assert(css.includes(".evo-family.harmony-evolution::before")&&
 css.includes(".evo-family.harmony-evolution::after"),
 "The shared Sakura glow should include a pink flower and gold glint");
for(const shape of ["flower","diamond","star"])
 assert(css.includes(".fusion-spark.harmony-"+shape),"Missing colored "+shape+" glow");
const gemCss=css.slice(css.indexOf(".fusion-spark.harmony-diamond{"),
 css.indexOf(".fusion-spark.harmony-star{"));
assert(gemCss.includes("color:#fff9ee")&&gemCss.includes("#dcb36d"),
 "Diamond should use pearl-white and champagne gold, not blue");
assert(!/#(?:a9ebff|71d7ff|58b8f9)/i.test(gemCss),
 "Previous ice-blue accent should be entirely absent");
assert(css.includes("font-weight:900;font-size:18px;line-height:18px"),
 "Phone symbols should be more prominent than VFX 1.0");
assert(script.includes("const pop=1.30+"),
 "Pop animation should be clearer without adding particle density");
assert(script.includes('glyph:"✿"')&&script.includes('glyph:"◆"')&&script.includes('glyph:"✦"'),
 "Three recognizable mini-firework shapes are required");
assert(script.includes('fusionBurst(evt.positions||[],[],"hero")'),
 "Real Masterpieces must trigger the large tier");
const beforeStages=trace.length;
evolutionStageLabels([{at:14,to:2},{at:15,to:3},{at:16,to:4}]);
assert.equal(trace.slice(beforeStages).filter(x=>x[1]==="evolution-stage-label").length,2,
 "Every ordinary fusion must have visible but capped stage-up labels");
assert(trace.some(x=>x[0]==="anim"&&x[2]===540),"Shared gold Sakura evolution should remain visible for roughly half a second");
assert(trace.some(x=>x[0]==="anim"&&x[2]===650),"Stage labels must stay readable for roughly 0.65 seconds");
evolveFamilyFx(Array.from({length:18},(_,i)=>({family:"koi",at:i})));
assert.equal(trace.filter(x=>x[0]==="fx"&&x[1].startsWith("evo-family")).length,7,"Mobile family cue budget = 2");
masterpieceMoment([0,1,2,3,4,5]);
assert.equal(trace.filter(x=>x[1]==="masterpiece-halo").length,2,"Mobile masterpiece halo budget = 2");
// Board Praise replaces all ordinary tier chips with three rare, queued words.
const praiseCode=part("// Board Praise 1.0","function masterpieceMoment(positions){");
let visible=[];
const praiseRoot={replaceChildren(...nodes){visible=nodes;}};
const scheduled=new Map();let timerId=0;
const fakeTimers={
 set(fn,ms){scheduled.set(++timerId,{fn,ms});return timerId;},
 clear(id){scheduled.delete(id);},
 tick(){
  const next=scheduled.entries().next().value;
  assert(next,"Expected one queued praise timer");
  scheduled.delete(next[0]);next[1].fn();
 }
};
const makePraise=new Function("document","FAST","$","setTimeout","clearTimeout",
 praiseCode+"return {praise,clearPraise};");
const {praise,clearPraise}=makePraise(
 {createElement:()=>({className:"",textContent:""})},
 ()=>false,()=>praiseRoot,
 fakeTimers.set.bind(fakeTimers),fakeTimers.clear.bind(fakeTimers)
);
praise("echo");praise("echo");praise("masterpiece");praise("pulse");
assert.equal(visible.length,1,"Only one centered word is allowed at once");
assert.equal(visible[0].textContent,"HARMONY ECHO!");
assert.equal(scheduled.size,1,"One timer must drive the active word");
fakeTimers.tick();
assert.equal(visible[0].textContent,"MASTERPIECE!");
fakeTimers.tick();
assert.equal(visible[0].textContent,"HARMONY PULSE!");
fakeTimers.tick();
assert.equal(visible.length,0,"Callout must clean up after its short display");
assert.equal(scheduled.size,0);
praise("pulse");assert.equal(visible.length,0,"Do not replay a word during one turn");
clearPraise();
praise("masterpiece");
assert.equal(visible[0].textContent,"MASTERPIECE!","A new turn may show a reward again");
clearPraise();
assert.equal(visible.length,0,"Leaving the board must remove any active word");
assert(!praiseCode.includes("VACKERT!")&&!praiseCode.includes("HARMONI!"),
 "Ordinary fusion labels must no longer appear in the praise system");

// Visual Harmony 2.0: a common art direction without collapsing the
// different event semantics into one giant spark explosion.
const polish=css.slice(css.indexOf("VISUAL HARMONY VFX 2.0"));
assert(polish.includes("--jh-vfx-pearl:#fff9ee")&&
 polish.includes("--jh-vfx-sakura:#ffafd2")&&
 polish.includes("--jh-vfx-champagne:#ffe3ac"),
 "Reward colors must share the warm Firework VFX identity");
for(const selector of [".resonance-link::after",".pulse-trace",
 ".pulse-target-hit",".score-flight-token",".collection-bonus",
 ".board-praise-word.praise-echo",".board-praise-word.praise-pulse",
 ".board-praise-word.praise-masterpiece",".fusion-intake[class*="]){
 assert(polish.includes(selector),"Unpolished visual subsystem: "+selector);
}
for(const shape of ["star","diamond","flower"]){
 assert(polish.includes(".harmony-reward-accent.harmony-"+shape),
  "Echo/Pulse/Collection shared symbols missing: "+shape);
}
assert(script.includes('rewardAccentAt(x,y,"echo")'),
 "Harmony Echo needs one restrained shared accent");
assert(script.includes('rewardAccentAt(r.left+r.width/2,r.top+r.height/2,"pulse")'),
 "Harmony Pulse needs one restrained shared accent");
assert(script.includes('rewardAccentAt(r.left+r.width*.5,r.top+r.height*.52,"collection")'),
 "Masterpiece collection needs shared reward accents");

const directed=part("function pulseBeams(evt){","async function animateEvent(evt){");
const travel=[];
let cleaned=false;
const makeBeams=new Function("FAST","MOBILE_LITE","indexRect","fxAt","makeFxLayer","document","animateNode","boardTiles","Element","sound","LITE_FX","rewardAccentAt",
 directed+"return {pulseBeams,pulseLandingCues};");
const {pulseBeams,pulseLandingCues}=makeBeams(()=>false,true,indexRect,
 name=>{travel.push(name);return {style:{},remove(){}};},
 ()=>({rect:{left:0,top:0},node:{appendChild(node){travel.push(node.className)},remove(){cleaned=true}}}),
 {createElement:()=>({style:{},className:""})},
 ()=>Promise.resolve(),boardTiles,{prototype:{animate(){}}},()=>{},()=>false,
 (...args)=>travel.push("reward-accent:"+args.at(-1)));
const targets=Array.from({length:40},(_,i)=>({from:i%3,to:(i*2+5)%49}));
async function run(){
 await pulseBeams({targets});
 assert.equal(travel.filter(x=>x==="pulse-dot").length,5,"Mobile pulse core cap = 5");
 assert.equal(travel.filter(x=>x==="pulse-trace").length,5,"Visible energy trails should accompany the cores");
 assert.equal(travel.filter(x=>x==="pulse-source-halo").length,2,"Mobile source ring cap = 2");
 assert(cleaned,"Pulse temporary layer must always be released");
 pulseLandingCues(targets);
 assert.equal(travel.filter(x=>x==="pulse-target-hit").length,3,"Three clear target impacts on mobile");
 assert.equal(travel.filter(x=>x==="reward-accent:pulse").length,1,
  "One subtle pearl/rose/gold accent per Pulse wave, not per target");

 const eventCode=part("async function animateEvent(evt){","async function playEvents(events){");
 const order=[];
 const createEvent=new Function("presentedBoard","MOBILE_LITE","pulseAnticipation","pulseBeams","renderBoard","animateNode",
  "boardTiles","flipMove","playFusion","masterpieceMoment","pulseLandingCues",eventCode+"return animateEvent;");
 const animateEvent=createEvent([],true,
  async()=>{order.push("charge");return ()=>order.push("release");},
  async()=>order.push("travel"),()=>order.push("render"),()=>{order.push("land");return Promise.resolve()},
  boardTiles,async()=>{},async()=>{},()=>order.push("masterpiece"),()=>order.push("impact"));
 await animateEvent({type:"pulse",wave:1,board:[],targets:[{from:0,to:1},{from:0,to:7}]});
 assert.deepEqual(order,["charge","travel","release","render","impact","land","land"],
  "Pulse must charge targets, travel, release glow and only then reveal the upgraded art/impacts");
 console.log("PASS Harmony 4.1.1 – clearly visible family FX, stage-up labels, energy trails and impacts");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
