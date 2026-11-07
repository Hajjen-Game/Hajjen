const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JumpController}=require('../src/gameplay/jump-controller.js');
const {PlayerMotion}=require('../src/render/player-motion.js');
const {EffectLanguage}=require('../src/render/effect-language.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {UnifiedTerrainDirector}=require('../src/director/unified-terrain-director.js');
const GEO=require('../src/core/geometry.js');
const {GAME,JUMP_FEEL,TERRAIN}=require('../src/core/config.js');

const jump=(c,props={})=>c.request({grounded:false,worldX:300,echoEnabled:true,...props});

test('Echo Jump unlocks in zone 2, with a weaker second impulse and fixed gravity',()=>{
  assert.equal(JUMP_FEEL.echoUnlockZone,2);
  assert.ok(GAME.echoJumpVelocity<0&&GAME.echoJumpVelocity>GAME.jumpVelocity);
  assert.equal(GAME.gravity,2140);
  assert.equal(GAME.jumpVelocity,-870);
});

test('one second beat per deliberate airborne jump; rapid double-taps are filtered',()=>{
  const c=new JumpController();
  assert.equal(jump(c,{grounded:true}),'jump');
  assert.equal(jump(c),'ignored');
  c.tick(JUMP_FEEL.echoMinAirSeconds+.004,300);
  assert.equal(jump(c),'echo');
  assert.equal(c.echoUsed,true);
  assert.equal(c.echoAvailable,false);
  assert.equal(jump(c),'buffered');
  assert.equal(c.echoUsed,true,'a third tap never re-arms the echo');
});

test('Echo Jump disabled before unlock, and walking off a ledge never grants a free echo',()=>{
  const c=new JumpController();
  assert.equal(jump(c,{grounded:true,echoEnabled:false}),'jump');
  c.tick(.13,300);
  assert.equal(jump(c,{echoEnabled:false}),'buffered');
  c.onLand();
  c.leaveLedge(500);c.tick(.09,535);
  assert.equal(jump(c,{worldX:535}),'buffered');
  assert.equal(c.echoAvailable,false);
});

test('coyote-assisted launch earns one echo; landing and buffered takeoff rearm safely',()=>{
  const c=new JumpController();
  c.leaveLedge(500);c.tick(.035,515);
  assert.equal(jump(c,{worldX:515}),'coyote');
  c.tick(.11,515);
  assert.equal(jump(c,{worldX:515}),'echo');
  c.tick(.3,515);
  assert.equal(c.onLand(),false);
  assert.equal(c.echoAvailable,false);
  assert.equal(jump(c),'buffered');
  c.tick(.07,515);
  assert.equal(c.onLand(),true,'buffered grounded takeoff still works');
  c.tick(.11,515);
  assert.equal(jump(c),'echo','the new flight gets exactly one new echo');
});

test('duck, spectral gap recovery, cancelled runs and Gravity Shift never grant echo',()=>{
  const c=new JumpController();
  assert.equal(jump(c,{grounded:true}),'jump');
  c.tick(.16,300);
  assert.equal(jump(c,{ducking:true}),'ignored');
  assert.equal(jump(c,{recovering:true}),'ignored');
  assert.equal(c.echoAvailable,true,'invalid inputs do not spend the ability');
  c.cancel();
  assert.equal(c.echoAvailable,false);
  assert.equal(jump(c),'buffered');
  const source=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(source,/if\(status!=='running'\|\|gravityShift\.shifting\)return;/);
  assert.match(source,/recovering:Boolean\(gapRecovery\)/);
});

test('echo spring has its own squash / stretch while collision geometry remains unchanged',()=>{
  const motion=new PlayerMotion(),p={x:300,feet:430,landed:false,duck:false};
  const original=GEO.playerBox(p);
  motion.echoJump();
  assert.ok(motion.sample({landed:false,vy:GAME.echoJumpVelocity}).scaleY<1);
  motion.tick(.08);
  const stretched=motion.sample({landed:false,vy:-500});
  assert.ok(stretched.scaleY>1);
  assert.ok(stretched.glow>.4);
  assert.deepEqual(GEO.playerBox(p),original);
  motion.land(560);assert.equal(motion.echoTime,0);
  motion.reset();assert.equal(motion.echoTime,0);
});

test('Echo Jump increases flight time enough for marked gaps without changing run speed',()=>{
  const dt=1/300,gravity=GAME.gravity;
  function duration(echoAt){
    let t=0,y=0,vy=GAME.jumpVelocity,echoed=false;
    while(t<3){
      if(echoAt!==null&&!echoed&&t>=echoAt){vy=GAME.echoJumpVelocity;echoed=true;}
      vy+=gravity*dt;y+=vy*dt;t+=dt;
      if(t>.04&&y>=0)return t;
    }
    return Infinity;
  }
  const single=duration(null),echo=duration(.36);
  assert.ok(single>.79&&single<.84);
  assert.ok(echo>1.14&&echo<1.4);
  assert.ok(echo-single>.3);
});

test('Director authorizes rare Echo Gaps only for confident healthy PEAKs',()=>{
  const terrain=new TerrainSystem({random:()=>.5});
  const director={phase:'PEAK',phaseDuration:5,phaseElapsed:0,stress:0,confidence:.85};
  const system=new UnifiedTerrainDirector({terrain,director});
  const ctx={playerWorld:2000,zone:5,speed:1000,hp:100};
  const safe=system.policyAt(3000,ctx);
  assert.equal(safe.allowGap,true);
  assert.ok(safe.echoGapChance>0);
  assert.equal(system.policyAt(3000,{...ctx,hp:25}).echoGapChance,0);
  assert.equal(system.policyAt(3000,{...ctx,zone:4}).echoGapChance,0);
  director.stress=.55;
  assert.equal(system.policyAt(3000,ctx).echoGapChance,0);
  director.stress=0;director.confidence=.3;
  assert.equal(system.policyAt(3000,ctx).echoGapChance,0);
  director.confidence=.85;director.phase='RELAX';
  assert.equal(system.policyAt(3000,ctx).echoGapChance,0);
});

test('marked Echo Gaps exceed normal distance but keep complete landing segments',()=>{
  const terrain=new TerrainSystem({random:()=>.5});
  terrain._append('flat',1200);
  const gap=terrain._choose(5,900,{allowGap:true,gapChance:1,slopeChance:0,
    echoGapChance:1,echoGapSecondsMin:.92,echoGapSecondsMax:1.015});
  assert.equal(gap.type,'gap');assert.equal(gap.echoChallenge,true);
  assert.ok(gap.end-gap.start>900*.89);
  assert.ok(gap.end-gap.start<=900*1.04);
  const landing=terrain._choose(5,900,{allowGap:true,gapChance:1,slopeChance:0});
  assert.equal(landing.type,'flat');
  assert.ok(landing.end-landing.start>=TERRAIN.minLandingFlat);
  const normal=new TerrainSystem({random:()=>.5});
  normal._append('flat',1200);
  const normalGap=normal._choose(5,900,{allowGap:true,gapChance:1,slopeChance:0,echoGapChance:0});
  assert.equal(Boolean(normalGap.echoChallenge),false);
  assert.ok(normalGap.end-normalGap.start<=TERRAIN.maxGapWidth);
});

test('Echo animation is sharp, quality-scaled, no rings, no extra thumb control',()=>{
  const effects=new EffectLanguage();
  assert.equal(effects.cue('echo',220,330,'#33eeff','#a966ff',{speed:900}),true);
  assert.equal(effects.active[0].kind,'cue-echo');
  assert.equal(effects.cue('echo',220,330,'#33eeff','#a966ff',{reducedMotion:true}),false);
  function draw(density){
    let strokes=0;
    const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes++}};
    effects.draw(ctx,{density,glow:1});
    return strokes;
  }
  assert.ok(draw(1)>draw(.3));
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/id="echo-hint"/);
  assert.match(html,/id="jump-btn"/);
  assert.match(html,/id="duck-btn"/);
  assert.doesNotMatch(html,/id="dash-btn"/);
  assert.match(html,/2× JUMP|ECHO JUMP/);
});
