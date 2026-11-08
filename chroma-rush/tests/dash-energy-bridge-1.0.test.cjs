const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {GAME,DASH}=require('../src/core/config.js');
const {AIR,AIR_BOX_WIDTH,bridgeGapFor,widthFor,sealX,sealWorldX,
  mayCharge,reachedSeal}=require('../src/gameplay/dash-hazards.js');
const GEO=require('../src/core/geometry.js');
const FAIR=require('../src/director/high-speed-fairness.js');
const root=path.join(__dirname,'..');

// Reproduce launchEcho()'s actual clamped extra impulse at 1ms resolution.
function clearance(echoAt=null){
 const dt=.001,h=62;let y=0,vy=GAME.jumpVelocity,done=false,
   first=null,last=null,peak=0;
 for(let i=0;i<2600;i++){
  const t=i*dt;
  if(echoAt!==null&&!done&&t>=echoAt){
   vy=Math.max(GAME.jumpVelocity,Math.min(GAME.echoJumpVelocity,
     vy-GAME.echoUpwardBoost));
   done=true;
  }
  vy+=GAME.gravity*dt;y+=vy*dt;peak=Math.max(peak,-y);
  if(y<=-h){if(first===null)first=t;last=t;}
  if(t>.14&&y>=0)break;
 }
 return {time:last===null?0:last-first,peak};
}
test('actual Echo Jump reach is considered, not the earlier single-hop estimate',()=>{
 const solo=clearance(),echo=[];
 for(let at=.095;at<=.80;at+=.005)echo.push(clearance(at));
 const best=echo.reduce((a,b)=>Math.max(a,b.time),0);
 const highest=echo.reduce((a,b)=>Math.max(a,b.peak),0);
 assert.ok(solo.time>.64&&solo.time<.67,solo.time);
 assert.ok(best>1.23&&best<1.28,best);
 assert.ok(highest>270&&highest<285,highest);
 assert.ok(best>solo.time*1.85);
});
test('speed-adjusted Energy Bridge has two actual standard-size colliders',()=>{
 for(const z of [3,5,8,12,16,20,24]){
  const speed=GAME.speedAt((z-1)*GAME.zoneSeconds,z),gap=bridgeGapFor(speed);
  const width=widthFor(AIR,speed);
  assert.equal(width,100+gap);
  assert.ok(Math.abs(gap/speed-.42)<.012);
  const o={type:AIR,x:460,worldX:12000,width,height:62};
  const boxes=GEO.obstacleBoxes(o,515);
  assert.equal(boxes.length,2);assert.equal(boxes[0].w,AIR_BOX_WIDTH);
  assert.equal(boxes[1].w,AIR_BOX_WIDTH);
  assert.equal(boxes[0].x,460);
  assert.equal(boxes[1].x,460+AIR_BOX_WIDTH+gap);
  assert.ok(boxes.every(b=>!GEO.sweptXOverlap(
    {x:460+width/2-18,w:36},460+width/2,b)));
  assert.equal(sealX(o),o.x+width/2);
  assert.equal(sealWorldX(o),o.worldX+width/2);
  const tolerance=Math.max(160,speed*.35,width/2+44);
  assert.ok(width/2+22<tolerance,
    'Air Dash can be triggered before entering the first box');
  assert.equal(mayCharge(o,{action:'air',playerWorld:sealWorldX(o)-tolerance*.95,
    speed,airborne:true}),true);
  assert.equal(mayCharge(o,{action:'air',playerWorld:sealWorldX(o)-tolerance*1.1,
    speed,airborne:true}),false);
  const playerX=900*.265;
  const x=FAIR.horizonFor(AIR,{speed,viewportWidth:900,playerX});
  assert.ok(FAIR.metrics(AIR,{x,speed,viewportWidth:900,playerX}).fair);
 }
});
test('Echo over both boxes still crosses the mandatory visible Dash checkpoint',()=>{
 const v=GAME.speedAt(228,20),w=widthFor(AIR,v);
 const o={type:AIR,x:490,worldX:12000,width:w,height:62};
 assert.ok(clearance(.71).time*v>w+44,
   'Echo is more than long enough to physically bypass two isolated boxes');
 const boxes=GEO.obstacleBoxes(o,515);
 assert.ok(boxes.every(b=>!GEO.verticalOverlap(
   {x:b.x,y:315,w:36,h:52},b)));
 const playerFront=300,priorX=playerFront-w/2+24,newX=playerFront-w/2-24;
 assert.equal(reachedSeal({...o,x:newX},{priorX,playerFront}),true);
 assert.equal(mayCharge(o,{action:null,playerWorld:sealWorldX(o),
   speed:v,airborne:true}),false);
 assert.equal(mayCharge(o,{action:'air',playerWorld:sealWorldX(o)-v*.2,
   speed:v,airborne:true}),true);
 assert.equal(mayCharge(o,{action:'ground',playerWorld:sealWorldX(o)-v*.2,
   speed:v,airborne:true}),false);
 assert.equal(DASH.duration,.30);
});
test('visual bridge and collision share geometry; Performance draws one energy strand',()=>{
 const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(game,/GEO\.obstacleBoxes\(o,o\.groundY\)/);
 assert.match(game,/const sweptX=hitBoxes\.some\(overlapsX\)/);
 assert.match(game,/const yOverlap=hitBoxes\.some\(/);
 assert.match(game,/DASH_HAZARDS\.reachedSeal\(o/);
 assert.match(game,/if\(!o\.dashSatisfied\)onHit\(o\)/);
 assert.match(game,/const top=o\.type==='dash-jump'\?0/);
 assert.match(game,/const layers=quality\.profile\.density>=\.60\?2:1/);
 const body=game.slice(game.indexOf('  function drawObstacle(o){'),
  game.indexOf('  function drawPlayer(){'));
 assert.doesNotMatch(body,/fillText\s*\(/);
 assert.match(html,/src\/gameplay\/dash-hazards\.js\?v=[^"]*energy-bridge-1\.0/);
});
