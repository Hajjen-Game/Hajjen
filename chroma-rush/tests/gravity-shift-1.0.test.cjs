const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GravityShift,START_ZONE,INTERVAL_ZONES,WARNING_SECONDS,SHIFT_SECONDS,GRACE_SECONDS,
  CEILING_HOLD_SECONDS}=
  require('../src/gameplay/gravity-shift.js');
const {playerBox,obstacleBox,verticalOverlap}=require('../src/core/geometry.js');

function toCeiling(controller){
  assert.equal(controller.requestForZone(8),true);
  assert.equal(controller.tick(WARNING_SECONDS,{safe:false}),null);
  assert.equal(controller.tick(.016,{safe:true}),'begin');
  assert.equal(controller.tick(SHIFT_SECONDS+.01),'complete');
}

test('zone 8 triggers a short ceiling excursion then auto-returns before zone 16',()=>{
  const g=new GravityShift();
  assert.equal(START_ZONE,8);assert.equal(INTERVAL_ZONES,8);
  assert.equal(CEILING_HOLD_SECONDS,16);
  assert.equal(g.requestForZone(1),false);
  assert.equal(g.requestForZone(2),false);
  toCeiling(g);
  assert.equal(g.ceiling,true);assert.equal(g.mix,1);assert.equal(g.count,1);
  assert.equal(g.tick(CEILING_HOLD_SECONDS-.1,{safe:true}),null);
  assert.equal(g.ceiling,true);
  assert.equal(g.tick(.11,{safe:true}),'return_warning');
  assert.equal(g.pending,true);assert.equal(g.targetCeiling,false);
  assert.equal(g.requestForZone(16),false,'return cannot overlap a scheduled shift');
  assert.equal(g.tick(WARNING_SECONDS,{safe:false}),null);
  assert.equal(g.tick(.3,{safe:false}),null,'never flip before the runway is safe');
  assert.equal(g.tick(.016,{safe:true}),'begin');
  assert.equal(g.tick(SHIFT_SECONDS,{safe:true}),'complete');
  assert.equal(g.ceiling,false);assert.equal(g.mix,0);assert.equal(g.count,2);
  assert.equal(g.requestForZone(16),true,'next zone-16 set-piece can begin on floor');
  g.tick(WARNING_SECONDS,{safe:true});g.tick(SHIFT_SECONDS);
  assert.equal(g.ceiling,true);assert.equal(g.count,3);
});

test('automatic floor return also respects reduced motion and pause-safe dt',()=>{
  const g=new GravityShift();g.requestForZone(8);
  assert.equal(g.tick(WARNING_SECONDS,{safe:true,reducedMotion:true}),'complete');
  assert.equal(g.ceiling,true);
  g.tick(7);g.tick(0);g.tick(-3);
  assert.equal(g.ceilingAge,7,'paused clock never advances the ceiling timer');
  assert.equal(g.tick(9),'return_warning');
  assert.equal(g.tick(WARNING_SECONDS,{safe:false,reducedMotion:true}),null);
  assert.equal(g.ceiling,true);
  assert.equal(g.tick(.01,{safe:true,reducedMotion:true}),'complete');
  assert.equal(g.ceiling,false);assert.equal(g.count,2);
});

test('warning holds indefinitely until the *physical* runway is safe',()=>{
  const g=new GravityShift();
  g.requestForZone(8);
  assert.equal(g.tick(WARNING_SECONDS+1,{safe:false}),null);
  assert.equal(g.pending,true);assert.equal(g.warningLeft,0);
  assert.equal(g.tick(.4,{safe:false}),null);
  assert.equal(g.tick(.016,{safe:true}),'begin');
  assert.equal(g.shifting,true);
  assert.equal(g.protected,true);
  assert.ok(g.mix===0);
  g.tick(SHIFT_SECONDS/2);
  assert.ok(g.mix>.4&&g.mix<.6);
  assert.equal(g.tick(SHIFT_SECONDS/2),'complete');
  assert.ok(g.protected);
  g.tick(GRACE_SECONDS+.01);
  assert.equal(g.protected,false);
});

test('reflection preserves 2D obstacle collision, with jumps away from ceiling',()=>{
  const g=new GravityShift();toCeiling(g);
  const H=720,foot=515;
  const player={x:300,feet:foot,landed:true,duck:false};
  const footScreen=g.screenY(foot,H);
  assert.equal(footScreen,H-foot);
  assert.equal(g.screenY(foot-120,H),footScreen+120);
  const p=playerBox(player),box=obstacleBox({x:290,type:'jump',width:60,height:60},foot);
  assert.equal(verticalOverlap(p,box),true);
  // Mirroring both bounds preserves overlap and exact vertical clearance.
  const mirror=b=>({x:b.x,w:b.w,y:H-b.y-b.h,h:b.h});
  assert.equal(verticalOverlap(mirror(p),mirror(box)),true);
  const duck=playerBox({...player,duck:true});
  const beam=obstacleBox({x:290,type:'duck',width:60,height:120},foot);
  assert.equal(verticalOverlap(duck,beam),false);
  assert.equal(verticalOverlap(mirror(duck),mirror(beam)),false);
});

test('course transformation never moves x; the sky/HUD remains outside it',()=>{
  const g=new GravityShift(),calls=[];
  const ctx={translate:(...args)=>calls.push(['translate',...args]),
    scale:(...args)=>calls.push(['scale',...args])};
  g.applyCourseTransform(ctx,720);assert.equal(calls.length,0);
  toCeiling(g);g.applyCourseTransform(ctx,720);
  assert.deepEqual(calls,[['translate',0,720],['scale',1,-1]]);
  g.reset();assert.equal(g.ceiling,false);assert.equal(g.count,0);
});

test('reduced-motion switches physical orientation safely and instantly',()=>{
  const g=new GravityShift();
  g.requestForZone(8);
  assert.equal(g.tick(WARNING_SECONDS,{safe:false,reducedMotion:true}),null);
  assert.equal(g.tick(.02,{safe:true,reducedMotion:true}),'complete');
  assert.equal(g.ceiling,true);assert.equal(g.shifting,false);assert.equal(g.mix,1);
});

test('warning and ceiling state remain visible even at the lowest graphics preset',()=>{
  const g=new GravityShift(),strokes=[];
  const ctx={save(){},restore(){},fillRect(){strokes.push('rect')},
    fillText(s){strokes.push(s)},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes.push('line')}};
  g.requestForZone(8);
  g.drawOverlay(ctx,{width:900,height:720,quality:{density:.3,glow:.15}});
  assert.ok(strokes.some(x=>x.includes?.('GRAVITY SHIFT')));
  toCeilingAfterWarning(g);
  strokes.length=0;
  g.drawOverlay(ctx,{width:900,height:720,quality:{density:.3,glow:.15}});
  assert.ok(strokes.some(x=>x.includes?.('CEILING RUN')));
});
function toCeilingAfterWarning(g){
  g.tick(WARNING_SECONDS,{safe:true});
  g.tick(SHIFT_SECONDS);
}

test('arcade integration keeps hazard physics canonical and visual course mirrored',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(game,/gravityShift\.requestForZone\(zone\)/);
  assert.match(game,/terrain\.visibleGaps\(playerWorld-speed\*\.35/);
  assert.match(game,/gravityShift\.applyCourseTransform\(ctx,H\)/);
  assert.match(game,/gravityShift\.drawOverlay\(ctx/);
  assert.match(game,/gravityShift\.protected/);
  assert.match(game,/gravity_shift_begin/);
  assert.match(game,/gravityEvent==='return_warning'/);
  assert.match(game,/reason:'ceiling_excursion_end'/);
  const sky=game.indexOf('drawWorld(worldTime);');
  const flip=game.indexOf('gravityShift.applyCourseTransform(ctx,H)');
  const ground=game.indexOf('drawTerrain();',flip);
  const obstacles=game.indexOf('for(const o of hurdles)drawObstacle(o)',flip);
  const overlay=game.indexOf('gravityShift.drawOverlay(ctx',flip);
  assert.ok(sky>=0&&flip>sky&&ground>flip&&obstacles>ground&&overlay>obstacles);
  assert.ok(html.indexOf('src/gameplay/gravity-shift.js?v=gravity-1.0')>
    html.indexOf('src/gameplay/jump-controller.js'));
  assert.ok(html.indexOf('src/gameplay/gravity-shift.js?v=gravity-1.0')<
    html.indexOf('src/gameplay/game.js'));
});
