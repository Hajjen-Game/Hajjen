const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME}=require('../src/core/config.js');
const DASH=require('../src/gameplay/dash-hazards.js');
const GEO=require('../src/core/geometry.js');
const FAIR=require('../src/director/high-speed-fairness.js');
const {AdaptiveCamera}=require('../src/camera/adaptive-camera.js');
const root=path.join(__dirname,'..');

// Integrate the REAL impulse, gravity and 95ms echo delay. A clearance
// window is measured from first rising above a 62px obstacle until landing
// below it again. Covers early/mid/late jump physics with no Dash.
function clearance(echoAt=null){
 const dt=.001,h=62;let y=0,vy=GAME.jumpVelocity,used=false,
    first=null,last=null,peak=0;
 for(let i=0;i<2600;i++){
  const t=i*dt;
  if(echoAt!==null&&!used&&t>=echoAt){
   vy=Math.max(GAME.jumpVelocity,Math.min(GAME.echoJumpVelocity,
     vy-GAME.echoUpwardBoost));used=true;
  }
  vy+=GAME.gravity*dt;y+=vy*dt;peak=Math.max(peak,-y);
  if(y<=-h){if(first===null)first=t;last=t;}
  if(t>.14&&y>=0)break;
 }
 return {time:last===null?0:last-first,peak};
}
test('ordinary jump vs double-jump at both boxes is physical, never forced Dash',()=>{
 const solo=clearance(),echos=[];
 for(let at=.095;at<=.80;at+=.005)echos.push(clearance(at));
 const best=echos.reduce((m,e)=>Math.max(m,e.time),0);
 assert.ok(solo.time>.64&&solo.time<.67,JSON.stringify(solo));
 assert.ok(best>1.23&&best<1.28,best);
 for(const zone of [3,4,5,8,12,15,20,24,30,40,60]){
  const v=GAME.speedAt((zone-1)*GAME.zoneSeconds,zone);
  const width=DASH.widthFor(DASH.AIR,v);
  // Include actual 36px airborne square: the second box is behind us only
  // after the whole player body has passed. No invisible bridge center.
  const crossing=(width+36)/v;
  assert.ok(best>crossing,JSON.stringify({zone,v,width,crossing,best}),
    'Echo Jump must always remain a valid solution to the two-box geometry');
 }
 const high=GAME.speedAt(420,36),span=(DASH.widthFor(DASH.AIR,high)+36)/high;
 assert.ok(solo.time>span,
   'at sufficiently high speed, an ordinary jump can physically clear both boxes');
 const early=GAME.speedAt(24,3),spanEarly=(DASH.widthFor(DASH.AIR,early)+36)/early;
 assert.ok(solo.time<spanEarly,
   'early two-box bridge should reward Echo Jump or movement creativity');
});

test('air center and grounded duck passage have no energy checkpoint',()=>{
 const v=1450,air={type:DASH.AIR,x:440,
    width:DASH.widthFor(DASH.AIR,v),height:62};
 const boxes=GEO.obstacleBoxes(air,515);
 const middle=(boxes[0].x+boxes[0].w+boxes[1].x)/2;
 const standing={x:middle-18,y:463,w:36,h:52};
 assert.ok(boxes.every(b=>standing.x+standing.w<=b.x||standing.x>=b.x+b.w),
   'standing in the EMPTY area must not collide with a hidden blocker');
 const highJump={...standing,y:350};
 assert.ok(boxes.every(b=>!GEO.verticalOverlap(highJump,b)));
 const lowGate={type:DASH.GROUND,x:440,width:DASH.widthFor(DASH.GROUND,v),
    height:DASH.heightFor(DASH.GROUND)};
 const b=GEO.obstacleBox(lowGate,515);
 const duck={x:b.x+10,y:494,w:66,h:21};
 const tall={...duck,y:471,h:44};
 assert.equal(GEO.verticalOverlap(duck,b),false,'ordinary Duck remains legal');
 assert.equal(GEO.verticalOverlap(tall,b),true,'ordinary standing movement is not legal');
});

test('real zoom-adjusted horizon provides safe lead at 60% for both action families',()=>{
 const px=339,W=1280;
 const camera=new AdaptiveCamera();camera.reset(2500);
 assert.equal(camera.zoom,.6);
 for(const speed of [GAME.speedAt(36,4),GAME.speedAt(180,16),
    GAME.speedAt(300,26),GAME.speedAt(420,36),2500]){
  camera.reset(speed);
  const right=camera.visibleRight(W,px);
  for(const type of [DASH.AIR,DASH.GROUND]){
   const x=FAIR.horizonFor(type,{speed,playerX:px,viewportWidth:right});
   const m=FAIR.metrics(type,{x,playerX:px,viewportWidth:right,speed});
   assert.ok(m.fair&&m.leadSeconds>=FAIR.rule(type).lead,
    JSON.stringify({type,speed,zoom:camera.zoom,m}));
   assert.ok(x>=right+FAIR.STANDARD_PAD);
   assert.ok(FAIR.warning({hurdles:[{type,x,worldX:80000}],
     playerX:px,viewportWidth:right,speed})?.type===type||!m.needsCue);
  }
 }
});

test('only two separately drawn plinths and one visible long gate remain',()=>{
 const engine=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
 const geometry=fs.readFileSync(path.join(root,'src/core/geometry.js'),'utf8');
 const body=engine.slice(engine.indexOf('  function drawObstacle(o){'),
   engine.indexOf('  function drawPlayer(){'));
 assert.match(body,/const chunks=o.type==='dash-jump'\?GEO\.obstacleBoxes\(o,o\.groundY\):\[b\]/);
 assert.match(body,/const extended=o\.type==='dash-duck'/);
 assert.doesNotMatch(body,/sealX|zigzag|layer\?7:15|o\.dashSatisfied|chargeFlash/);
 assert.doesNotMatch(body,/fillText\s*\(/);
 assert.match(geometry,/obstacle\.type!=='dash-jump'\)return \[obstacleBox/);
 const index=engine.indexOf('  function update(dt){');
 assert.ok(index>0);
 const update=engine.slice(index,engine.indexOf('  function draw(){'));
 assert.doesNotMatch(update,/reachedSeal|sealPassed|if\(!o\.dashAssisted\)onHit/);
 assert.match(update,/const yOverlap=hitBoxes\.some\(/);
});

test('Speed Curve 3.2 and Adaptive Camera 1.1 are unchanged by geometry pass',()=>{
 assert.equal(GAME.speedRise,1350);
 assert.equal(GAME.speedEaseSeconds,170);
 assert.equal(GAME.cruiseAcceleration,.9);
 const cam=new AdaptiveCamera();
 assert.equal(cam.targetForSpeed(1450),1-.2*Math.pow(800/1200,2)*(3-2*(800/1200)));
 assert.equal(cam.targetForSpeed(2200),.6);
});
