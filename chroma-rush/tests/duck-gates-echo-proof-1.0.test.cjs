const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const GEO=require('../src/core/geometry.js');
const {GAME}=require('../src/core/config.js');
const {GravityShift,SHIFT_SECONDS}=require('../src/gameplay/gravity-shift.js');
const box=(feet=515)=>GEO.obstacleBox({type:'duck',x:300,width:62,height:135},feet);
const player=(feet=515,duck=false,landed=true)=>GEO.playerBox({x:330,feet,duck,landed});
const intersects=(a,b)=>GEO.sweptXOverlap(a,300,{x:300,width:62})&&GEO.verticalOverlap(a,b);

test('duck obstacle is a continuous overhead gate, not a bypassable floating block',()=>{
  const b=box(),core=GEO.duckGateCoreBox({type:'duck',x:300,width:62,height:135},515);
  assert.equal(GEO.DUCK_CLEARANCE,28);
  assert.ok(b.y<0,'gate must extend beyond the upper viewport');
  assert.equal(b.y,GEO.DUCK_GATE_TOP);
  assert.equal(b.y+b.h,515-GEO.DUCK_CLEARANCE);
  assert.equal(core.y+core.h,b.y+b.h);
  assert.ok(core.y-b.y>300,'the visible energy field bridges to the sky');
});

test('duck passes under high gate, whereas standing and regular jumping collide',()=>{
  const b=box();
  assert.equal(intersects(player(515,true,true),b),false);
  assert.equal(intersects(player(515,false,true),b),true);
  assert.equal(intersects(player(465,false,false),b),true);
});

test('Echo Jump can no longer leap above the gate core even at the apex',()=>{
  const b=box(),core=GEO.duckGateCoreBox({type:'duck',x:300,width:62,height:135},515);
  // Two launch impulses, integrated with real gravity. The second beat must
  // remain a meaningful jump without providing a route around DUCK.
  let feet=515,vy=GAME.jumpVelocity,minimum=feet;
  const dt=1/240;
  for(let i=0;i<400;i++){
    const time=i*dt;
    if(i===Math.round(.36/dt)){
      vy=Math.max(GAME.jumpVelocity,Math.min(GAME.echoJumpVelocity,vy-GAME.echoUpwardBoost));
    }
    vy+=GAME.gravity*dt;feet+=vy*dt;minimum=Math.min(minimum,feet);
  }
  assert.ok(minimum>0,'the echo jump stays inside the visible sky');
  assert.equal(GEO.verticalOverlap(player(minimum,false,false),core),false,
    'regression: the former floating beam could be bypassed');
  assert.equal(intersects(player(minimum,false,false),b),true,
    'the new full-height beam still collides visibly at the maximum apex');
});

test('ceiling mode reflects the entire colliding gate and its crawl-through slot',()=>{
  const g=new GravityShift(),H=720,b=box(),reflect=b=>({...b,y:H-b.y-b.h});
  g.ceiling=true;
  assert.equal(g.mix,1);
  const duck=player(515,true,true),air=player(210,false,false);
  assert.equal(GEO.verticalOverlap(duck,b),false);
  assert.equal(GEO.verticalOverlap(reflect(duck),reflect(b)),false);
  assert.equal(GEO.verticalOverlap(air,b),true);
  assert.equal(GEO.verticalOverlap(reflect(air),reflect(b)),true);
  const mirrored=reflect(b);
  assert.equal(mirrored.y,H-(515-28));
  assert.ok(mirrored.y+mirrored.h>H,
    'in ceiling mode the upper gate field must extend beyond the lower viewport');
});

test('normal ground obstacles remain the same exact shapes and still require jump',()=>{
  const low=GEO.obstacleBox({type:'jump',x:300,width:58,height:63},515);
  assert.deepEqual(low,{x:300,y:452,w:58,h:63});
  assert.equal(intersects(player(515,false,true),low),true);
  assert.equal(intersects(player(400,false,false),low),false);
});

test('full gate is drawn visibly in the same coordinates used for collision',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(s,/const b=GEO\.obstacleBox\(o,o\.groundY\),isLow=o\.type==='jump'/);
  assert.match(s,/GEO\.duckGateCoreBox\(o,o\.groundY\)/);
  assert.match(s,/ctx\.fillRect\(b\.x,b\.y,b\.w,b\.h\)/);
  assert.match(s,/ctx\.lineTo\(b\.x\+1,by\)/);
  assert.match(s,/ctx\.lineTo\(b\.x\+b\.w-1,by\)/);
  assert.match(s,/ctx\.fillText\(isLow\?'↑ JUMP':'↓ DUCK',cx,core\.y/);
  assert.doesNotMatch(s,/gravityShift\.shifting\)return;\s*\/\/ force duck input/,
    'duck gates must stay playable through the existing control');
});
