const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME,ECHO_SPIRE}=require('../src/core/config.js');
const GEO=require('../src/core/geometry.js');
const {PATTERNS,candidates}=require('../src/director/patterns.js');
const {AdaptiveRushDirector,minimumGap}=require('../src/director/adaptive-director.js');

// Flight uses the *actual* player half-width, gravity, jump and Echo impulse.
// The obstacle is moving left while the player remains anchored in screen X.
function flight({speed=473,width=273,height=73,lead=.35,echoAt=null}={}){
  const dt=1/240,ground=515;
  let feet=ground,vy=GAME.jumpVelocity,echoUsed=false,contacts=0,collisions=0,peak=0;
  for(let i=0;i<480;i++){
    const time=i*dt;
    if(echoAt!==null&&!echoUsed&&time>=echoAt){
      vy=Math.max(GAME.jumpVelocity,Math.min(GAME.echoJumpVelocity,
        vy-GAME.echoUpwardBoost));echoUsed=true;
    }
    vy+=GAME.gravity*dt;feet+=vy*dt;peak=Math.max(peak,ground-feet);
    const p=GEO.playerBox({x:300,feet,duck:false,landed:false});
    const x=300+speed*(lead-time);
    if(x<p.x+p.w&&x+width>p.x){
      contacts++;
      if(GEO.verticalOverlap(p,GEO.obstacleBox({type:'echo',x,width,height},ground)))
        collisions++;
    }
  }
  return {contacts,collisions,peak};
}
test('old tall Spire is fully replaced by a broad low Echo Rail',()=>{
  assert.equal(ECHO_SPIRE.firstZone,2);
  assert.ok(ECHO_SPIRE.maxHeight<=90);
  assert.ok(ECHO_SPIRE.introMaxHeight<=76);
  assert.ok(ECHO_SPIRE.minWidth>=300);
  assert.ok(ECHO_SPIRE.introMinWidth>=260);
  assert.ok(ECHO_SPIRE.introMaxWidth<ECHO_SPIRE.maxWidth);
  assert.ok(ECHO_SPIRE.introMaxHeight<ECHO_SPIRE.maxHeight);
  assert.ok(ECHO_SPIRE.energyHeightRatio>=.4);
  const box=GEO.obstacleBox({type:'echo',x:300,
    width:ECHO_SPIRE.introMaxWidth,height:ECHO_SPIRE.introMaxHeight},515);
  assert.equal(box.y,515-ECHO_SPIRE.introMaxHeight);
  assert.equal(box.y+box.h,515);
  const duck=GEO.playerBox({x:320,feet:515,landed:true,duck:true});
  assert.equal(GEO.verticalOverlap(duck,box),true,
    'energy below solid platform physically occupies the floor, no crawl-through');
});

test('zone-2 Echo lesson has multiple valid second-jump timings and no easy solo bypass',()=>{
  const speed=GAME.speedAt(GAME.zoneSeconds,2);
  let combinations=0,normalClears=0,wideWindow=0;
  for(const width of [ECHO_SPIRE.introMinWidth,ECHO_SPIRE.introMaxWidth]){
    for(const height of [ECHO_SPIRE.introMinHeight,ECHO_SPIRE.introMaxHeight]){
      let validLeads=0;
      for(let lead=.24;lead<=.58;lead+=.01){
        const ordinary=flight({speed,width,height,lead});
        if(ordinary.contacts>0&&ordinary.collisions===0)normalClears++;
        const echo=flight({speed,width,height,lead,echoAt:.34});
        if(echo.contacts>0&&echo.collisions===0){validLeads++;combinations++;}
      }
      wideWindow=Math.max(wideWindow,validLeads);
      assert.ok(validLeads>=12,
        JSON.stringify({speed,width,height,validLeads})+
          'should have a forgiving >=120ms Echo timing window');
    }
  }
  assert.equal(normalClears,0,'single Jump must not silently bypass the first Echo lesson');
  assert.ok(combinations>=48);
  assert.ok(wideWindow>=16);
});

test('higher-speed repeats can be passed with a normal well-timed jump',()=>{
  const width=ECHO_SPIRE.maxWidth,height=ECHO_SPIRE.maxHeight;
  let soloSolutions=0;
  for(const lead of [.22,.26,.30,.34,.38,.42,.46,.50,.54]){
    const result=flight({speed:1600,width,height,lead});
    if(result.contacts>0&&result.collisions===0)soloSolutions++;
  }
  assert.ok(soloSolutions>=3,
    'once speeds rise, the rail becomes passable without forced double jump');
});

test('mirrored ceiling mode uses precisely the same visible low hitbox',()=>{
  const ground=515,obstacle={type:'echo',x:300,width:270,height:74};
  const b=GEO.obstacleBox(obstacle,ground);
  const reflect=a=>({...a,y:720-a.y-a.h});
  for(const feet of [515,470,390,300]){
    const p=GEO.playerBox({x:322,feet,landed:feet===515,duck:false});
    assert.equal(GEO.verticalOverlap(reflect(p),reflect(b)),
      GEO.verticalOverlap(p,b));
  }
  assert.equal(reflect(b).y,720-515);
});

test('Arcade Simplification retires the former Echo Rail from active Director patterns',()=>{
  assert.ok(PATTERNS.every(p=>!p.steps.includes('echo')));
  assert.ok(candidates('PEAK',8,3).every(p=>!p.steps.includes('echo')));
  const d=new AdaptiveRushDirector(()=>.5);
  d.phase='PEAK';d.phaseElapsed=0;d.phaseDuration=6;d.spawnCountdown=0;
  d.confidence=.8;
  const ctx={zone:2,hp:100,speed:480,surface:'floor',zoneElapsed:2};
  assert.notEqual(d.selectPattern(ctx).id,'single-echo');
  let type;
  d.tick(1/60,ctx,step=>{type=step.type;return true;});
  assert.ok(type==='jump'||type==='duck');
  assert.equal(d.echoIntroduced,false);
});

test('legacy Echo Rail geometry remains testable but is not generated',()=>{
  assert.ok(minimumGap('echo','jump',820)>1.5);
  assert.ok(minimumGap('duck','echo',820)>1.1);
  const d=new AdaptiveRushDirector(()=>.5);
  d.phase='PEAK';d.phaseDuration=7;d.spawnCountdown=0;d.confidence=.8;
  const spawned=[];
  for(let i=0;i<120;i++)d.tick(.10,{zone:5,hp:100,speed:620,
    surface:i%2?'floor':'ceiling',zoneElapsed:4},step=>{
      spawned.push(step.type);return true;
    });
  assert.ok(spawned.every(t=>t!=='echo'&&t!=='dash-jump'));
});

test('renderer gives the low Echo Rail a solid top and visible underside energy only',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const render=game.slice(game.indexOf('  function drawObstacle(o){'),
    game.indexOf('  function drawPlayer(){'));
  assert.match(render,/if\(isEcho\)/);
  assert.match(render,/const echoBeam=isEcho\?\{x:b\.x,y:b\.y,w:b\.w,/);
  assert.match(render,/h:Math\.max\(44,Math\.min\(58,Math\.round\(b\.h\*\.65\)\)\)/);
  assert.match(render,/const energyTop=echoBeam\.y\+echoBeam\.h/);
  assert.match(render,/const energyBottom=b\.y\+b\.h/);
  assert.match(render,/ctx\.fillRect\(b\.x\+3,energyTop,b\.w-6,energyHeight\)/);
  assert.match(render,/ctx\.fillStyle=rgba\(color,material\?\.veil\?\?\.10\)/,
    'Echo curtain stays the same physical translucent veil, now sharing the ambient light budget');
  const veil=render.slice(render.indexOf('if(isEcho){'),
    render.indexOf('// Exact same low-barrier shell'));
  assert.match(veil,/ctx\.moveTo\(rx,energyTop\+1\)/);
  assert.match(veil,/ctx\.lineTo\(rx,energyBottom-1\)/);
  assert.doesNotMatch(veil,/k%2===0|ctx\.lineTo\(xx,yy\)/,
    'no zigzag, waves or diagonal segments inside the underbody veil');
  assert.match(veil,/glowLine\(b\.x\+2,energyTop\+1,b\.x\+2,energyBottom-1,color,/,
    'visible LEFT curtain boundary must continue from the raised beam to the track');
  assert.match(veil,/glowLine\(b\.x\+b\.w-2,energyTop\+1,b\.x\+b\.w-2,energyBottom-1,color,/,
    'visible RIGHT curtain boundary must continue from the raised beam to the track');
  assert.match(render,/\[isEcho\?echoBeam:b\]/);
  assert.match(render,/ctx\.fillRect\(x\+2,y\+h-12,w-4,10\)/,
    'raised beam shares the ordinary jump plinth');
  assert.doesNotMatch(render,/glowLine\(b\.x,energyBottom/,
    'the veil has no extra ground-level glow');
  assert.doesNotMatch(render,/TALL two-chamber|double-jump Spire/);
  assert.doesNotMatch(render,/fillText\s*\(/);
  assert.match(html,/id="jump-btn"/);
  assert.doesNotMatch(html,/id="dash-btn"/);
});
