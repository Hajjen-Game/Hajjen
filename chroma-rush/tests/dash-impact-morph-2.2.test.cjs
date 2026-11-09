const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME,DASH,JUMP_FEEL,ECHO_SPIRE}=require('../src/core/config.js');
const {ContextualDash}=require('../src/gameplay/contextual-dash.js');
const {PlayerMotion,dashStrength,dashShear,elasticBodyPath,FRONT_BEND_RATIO}=require('../src/render/player-motion.js');
const {playerBox}=require('../src/core/geometry.js');

function distanceFor(speed){
  const dash=new ContextualDash();
  assert.equal(dash.request({zone:1,grounded:false}),'air');
  let total=0;
  for(let i=0;i<40;i++)total+=dash.tick(1/60,speed);
  assert.equal(dash.active,false);
  assert.equal(dash.tick(.03,speed),0);
  return total;
}
function tracePath(shift,mode='air'){
  const w=mode==='air'?42:68,h=mode==='air'?52:21;
  const commands=[];
  const ctx={
    beginPath(){commands.push(['begin'])},
    moveTo(...p){commands.push(['move',...p])},
    lineTo(...p){commands.push(['line',...p])},
    quadraticCurveTo(...p){commands.push(['quadratic',...p])},
    bezierCurveTo(...p){commands.push(['bezier',...p])},
    closePath(){commands.push(['close'])}
  };
  elasticBodyPath(ctx,120,40,w,h,shift,8);
  return {commands,w,h};
}

test('all movement abilities still work in zone 1; physics is untouched',()=>{
  assert.equal(DASH.unlockZone,1);
  assert.equal(JUMP_FEEL.echoUnlockZone,1);
  assert.equal(ECHO_SPIRE.firstZone,2);
  assert.equal(GAME.jumpVelocity,-870);
  assert.equal(GAME.gravity,2140);
  assert.equal(DASH.duration,.30);
  assert.equal(DASH.bonusFactor,1.05);
  assert.ok(distanceFor(370)>110&&distanceFor(370)<140);
  assert.ok(distanceFor(680)>190&&distanceFor(680)<240);
});
test('elastic charge back and forward bend has exactly 28% stronger forward peak',()=>{
  assert.equal(FRONT_BEND_RATIO,1.28);
  assert.equal(dashShear(.30),0);
  const back=dashShear(.255);
  const front=dashShear(.20);
  assert.ok(back<-.999&&back>=-1.001);
  assert.ok(Math.abs(front/Math.abs(back)-1.28)<1e-5,
    'forward top bend is 28 percent stronger than backward wind-up');
  assert.equal(dashShear(0),0);
  assert.ok(dashShear(.295)<0,'charge begins smoothly backward');
  assert.ok(dashShear(.235)<dashShear(.205),'release grows forwards');
  assert.ok(dashShear(.015)<0,'small elastic recoil before returning upright');
});
test('wind-up and dash both show up at low 30fps with no frame-sensitive logic',()=>{
  // 30fps and a slower 26.6fps phone; no frame index, angle or RNG.
  for(const dt of [1/30,1/26.6]){
    assert.ok(dashShear(.30-dt)<0,'first update bends back');
    assert.ok(dashShear(.30-3*dt)>0,'three updates reach forward bend');
    assert.ok(dashShear(.30-3*dt)>.5,'forward bend becomes readable');
  }
});
test('Air Dash bends the TOP while lower side stays anchored and rounded',()=>{
  const m=new PlayerMotion();
  const p={x:330,feet:515,vy:-200,landed:false,duck:false};
  const box=playerBox(p);
  const before=m.sample(p);
  m.dashStart(false);m.tick(.045);
  const wind=m.sample(p);
  assert.ok(wind.shear<-.98,'air top bends backward');
  m.tick(.055);
  const action=m.sample(p);
  assert.ok(action.shear>1.25,'air top springs further forward');
  assert.ok(action.scaleX>before.scaleX+.13&&action.scaleX<before.scaleX+.16);
  assert.ok(action.scaleY<before.scaleY-.075&&action.scaleY>before.scaleY-.095);
  assert.equal(action.dashMode,'air');
  assert.equal('tilt' in action,false,'whole sprite is never rotated');
  assert.deepEqual(playerBox(p),box,'body deformation is not collision geometry');
  m.tick(.205);
  assert.equal(m.sample(p).shear,0);
});
test('Ground Dash has same animation language but much smaller displacement',()=>{
  const m=new PlayerMotion();
  m.duckStart();m.dashStart(true);m.tick(.045);
  const back=m.sample({landed:true,duck:true});
  assert.ok(back.shear<-.98);
  m.tick(.055);
  const front=m.sample({landed:true,duck:true});
  assert.ok(front.shear>1.25);
  assert.equal(front.dashMode,'ground');
  assert.ok(front.scaleX>1.05&&front.scaleX<1.14,'duck remains compact');
  assert.ok(front.scaleY>.95&&front.scaleY<1.01,'duck remains low and compact');
  // Actual top shift in gameplay is based on ORIGINAL collision width:
  const airFrontShift=1.28*36*.35;
  const groundFrontShift=1.28*66*.065;
  assert.ok(airFrontShift>16&&airFrontShift<16.3);
  assert.ok(groundFrontShift>5&&groundFrontShift<6);
  m.duckRelease();
  assert.equal(m.dashTime,0);
  assert.equal(m.sample({landed:true,duck:false}).shear,undefined);
});
test('Elastic Canvas geometry has curved sides and fixed lower corners',()=>{
  const back=tracePath(-13),front=tracePath(13*FRONT_BEND_RATIO),duck=tracePath(5,'ground');
  for(const pose of [back,front,duck]){
    assert.equal(pose.commands.filter(c=>c[0]==='bezier').length,2);
    assert.equal(pose.commands.filter(c=>c[0]==='quadratic').length,4);
    assert.equal(pose.commands.at(-1)[0],'close');
    const first=pose.commands.find(c=>c[0]==='move');
    assert.ok(Number.isFinite(first[1]));
    // A lower-right corner remains fixed to x+w,y+h for either sign of bend.
    const lowerRight=pose.commands.find(c=>c[0]==='quadratic'&&c[1]===120+pose.w);
    assert.deepEqual(lowerRight.slice(1,3),[120+pose.w,40+pose.h]);
    const lowerLeft=pose.commands.find(c=>c[0]==='quadratic'&&c[1]===120&&c[2]===40+pose.h);
    assert.ok(lowerLeft,'lower-left corner stays fixed');
  }
  assert.ok(back.commands.find(c=>c[0]==='move')[1]<
    front.commands.find(c=>c[0]==='move')[1],'top changes direction');
});
test('reduced motion, Ceiling Run and asset versions do not affect gameplay',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(html,/LATEST UPDATE · (?:PREMIUM ARCADE UI 4\.0|ARCADE SIMPLIFICATION 1\.0|CORE PACE 1\.1)/);
  assert.match(html,/player-motion\.js\?v=duck-effects-1\.0-movement-1\.0-dash-squash-stretch-2\.5/);
  assert.match(game,/window\.ChromaMotion\.elasticBodyPath/);
  assert.doesNotMatch(game,/ctx\.rotate\(|dashBodyPath|shape\.tilt/);
  assert.match(game,/gravityShift\.applyCourseTransform\(ctx,H\)/);
  assert.match(game,/reducedMotion\?\.55:1/);
  assert.match(game,/const worldStep=speed\*dt\+dash\.tick\(dt,speed\)/);
  assert.match(game,/o\.x-=worldStep/);
});
