const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const GEO=require('../src/core/geometry.js');
const DASH_HAZARDS=require('../src/gameplay/dash-hazards.js');
const {GAME,ECHO_SPIRE}=require('../src/core/config.js');

const original=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
const begin=original.indexOf('  function drawObstacle(o){');
const end=original.indexOf('  function drawPlayer(){',begin);
assert.ok(begin>0&&end>begin,'test must render the REAL obstacle drawer');
const sourceCode=original.slice(begin,end).trim();

function renderObstacle(type,{glow=.8,density=.8}={}){
  const events=[];
  const ctx={
    save(){events.push(['save'])},restore(){events.push(['restore'])},
    beginPath(){events.push(['begin'])},closePath(){events.push(['close'])},
    moveTo(x,y){events.push(['moveTo',x,y])},
    lineTo(x,y){events.push(['lineTo',x,y])},
    fill(){events.push(['fill'])},stroke(){events.push(['stroke'])},
    fillRect(x,y,w,h){events.push(['fillRect',x,y,w,h])},
    fillText(text,x,y){events.push(['fillText',text,x,y])}
  };
  const obstacle={type,x:300,width:type==='echo'?49:type==='duck'?62:52,
    height:type==='echo'?194:type==='duck'?135:60,groundY:515,pulse:1};
  const lines=[];
  const env={ctx,GEO,DASH_HAZARDS,W:1280,H:720,worldTime:1.75,
    // This legacy silhouette regression isolates pre-existing obstacle geometry.
    // The separately-tested cosmetic engraving never changes its bounds.
    identity:{drawHazardMark(){}},
    quality:{profile:{glow,density}},
    spectralWave:{colorAt:()=> '#53b5ff'},
    rgba:(hex,alpha)=>hex,
    glowLine:(x1,y1,x2,y2,color,width,shadow,alpha)=>{
      lines.push({x1,y1,x2,y2,color,width,alpha});},
    roundRectPath:(x,y,w,h,r)=>events.push(['roundRectPath',x,y,w,h,r])};
  const fn=vm.runInNewContext('('+sourceCode+')',env);
  fn(obstacle);
  return {obstacle,box:GEO.obstacleBox(obstacle,515),events,lines};
}

test('Jump Visual Identity 1.0 has NO words, arrows or detached gameplay icons',()=>{
  assert.doesNotMatch(sourceCode,/fillText\s*\(/,
    'the actual in-world obstacle renderer must not draw obstacle labels');
  assert.doesNotMatch(sourceCode,/['"](?:↑ JUMP|↓ DUCK|2× JUMP)['"]/);
  assert.match(sourceCode,/Low Neon Barrier/);
  for(const type of ['jump','duck','echo']){
    const result=renderObstacle(type);
    assert.ok(result.events.length>8);
    assert.equal(result.events.filter(e=>e[0]==='fillText').length,0,
      type+' must communicate exclusively through silhouette');
    assert.equal(result.events.filter(e=>e[0]==='save').length,1);
    assert.equal(result.events.filter(e=>e[0]==='restore').length,1);
  }
});

test('low barrier is visually integrated but entirely inside old physical hitbox',()=>{
  for(const width of [43,58]){
    for(const height of [53,66]){
      const run=renderObstacle('jump');
      const obstacle={...run.obstacle,width,height};
      // Geometry remains exactly what previous versions used.
      const b=GEO.obstacleBox(obstacle,515);
      assert.deepEqual(b,{x:300,y:515-height,w:width,h:height});
    }
  }
  const run=renderObstacle('jump'),b=run.box;
  assert.ok(run.events.some(e=>e[0]==='close'),
    'new solid form has an architectural closed/beveled perimeter');
  const points=run.events.filter(e=>e[0]==='moveTo'||e[0]==='lineTo');
  assert.ok(points.length>=12,'bevel, inset ribs and face give shape identity');
  for(const e of points){
    assert.ok(e[1]>=b.x-.001&&e[1]<=b.x+b.w+.001,'body x remains inside collider');
    assert.ok(e[2]>=b.y-.001&&e[2]<=b.y+b.h+.001,'body y remains inside collider');
  }
  const fills=run.events.filter(e=>e[0]==='fillRect');
  assert.ok(fills.length>=2,'the broad contact plinth and inset face are present');
  for(const e of fills){
    assert.ok(e[1]>=b.x&&e[1]+e[3]<=b.x+b.w+1e-6);
    assert.ok(e[2]>=b.y&&e[2]+e[4]<=b.y+b.h+1e-6);
  }
  assert.ok(run.lines.some(l=>l.y1===b.y+5),
    'a single integrated bright cap replaces floating direction labels');
  assert.ok(run.lines.some(l=>l.y1===b.y+b.h-3),
    'contact rail grounds the barrier in the track');
});

test('duck gate preserves continuous sky energy field, its clear slot and core',()=>{
  const run=renderObstacle('duck'),b=run.box;
  assert.equal(b.y,GEO.DUCK_GATE_TOP);
  assert.equal(b.y+b.h,515-GEO.DUCK_CLEARANCE);
  assert.ok(run.events.some(e=>e[0]==='fillRect'&&e[1]===b.x&&e[2]===b.y&&
    e[3]===b.w&&e[4]===b.h),
    'the same full-height energy field remains visible and collidable');
  assert.ok(run.lines.some(l=>l.y1===515-28),
    'bottom energy rail remains; duck gap is unchanged');
  const ducked=GEO.playerBox({x:330,feet:515,landed:true,duck:true});
  const running=GEO.playerBox({x:330,feet:515,landed:true,duck:false});
  assert.equal(GEO.verticalOverlap(ducked,b),false);
  assert.equal(GEO.verticalOverlap(running,b),true);
});

test('Echo Spire retains a special two-chamber silhouette without text arrows',()=>{
  const run=renderObstacle('echo'),b=run.box;
  assert.deepEqual(b,{x:300,y:515-194,w:49,h:194});
  assert.equal(run.events.filter(e=>e[0]==='fillRect'&&e[4]===18).length,2,
    'two distinct luminous horizontal chambers replace floating instructions');
  assert.ok(run.lines.length>=6);
  assert.doesNotMatch(sourceCode,/ctx\.moveTo\(cx-13,yy\+10\)/);
  assert.equal(ECHO_SPIRE.minHeight,190);
  assert.equal(ECHO_SPIRE.maxHeight,200);
  assert.equal(ECHO_SPIRE.introMinHeight,190);
  assert.equal(ECHO_SPIRE.introMaxHeight,194);
});

test('Performance settings and ceiling reflection leave geometry unaffected',()=>{
  for(const type of ['jump','duck','echo']){
    const high=renderObstacle(type,{glow:1,density:1});
    const low=renderObstacle(type,{glow:.2,density:.3});
    assert.deepEqual(low.box,high.box);
    assert.ok(low.events.length>6);
    assert.equal(low.events.filter(e=>e[0]==='fillText').length,0);
    const reflect=b=>({x:b.x,y:720-b.y-b.h,w:b.w,h:b.h});
    const p=GEO.playerBox({x:326,feet:515,landed:true,duck:type==='duck'});
    assert.equal(GEO.verticalOverlap(p,high.box),
      GEO.verticalOverlap(reflect(p),reflect(high.box)),
      'ceiling collisions remain symmetric for '+type);
  }
  assert.equal(GAME.jumpVelocity,-870);
  assert.equal(GAME.echoJumpVelocity,-650);
  assert.equal(GAME.gravity,2140);
});

test('spawn sizes and all action-specific fairness planning are unchanged',()=>{
  assert.match(original,/data\.type==='jump'\?rand\(43,58\):rand\(54,71\)/);
  assert.match(original,/data\.type==='jump'\?rand\(53,66\):rand\(115,158\)/);
  assert.match(original,/const x=spawnXFor\(data\.type\)/);
  assert.match(original,/FAIR\.metrics\(data\.type/);
});

test('Echo uses precisely the same shell silhouette as Jump, with two added energy chambers',()=>{
  const jump=renderObstacle('jump'),echo=renderObstacle('echo');
  for(const run of [jump,echo]){
    const b=run.box;
    assert.ok(run.events.some(e=>e[0]==='close'),'shared beveled course housing');
    assert.ok(run.lines.some(l=>l.y1===b.y+5),'same bright top cap');
    assert.ok(run.lines.some(l=>l.y1===b.y+b.h-3),'same bright bottom plinth');
    assert.ok(run.events.some(e=>e[0]==='fillRect'&&e[2]===b.y+b.h-12&&e[4]===10),
      'identical grounded foot rail');
    const solid=run.events.filter(e=>e[0]==='fillRect');
    for(const e of solid){
      assert.ok(e[1]>=b.x&&e[1]+e[3]<=b.x+b.w);
      assert.ok(e[2]>=b.y&&e[2]+e[4]<=b.y+b.h);
    }
  }
  assert.equal(jump.events.filter(e=>e[0]==='fillRect'&&e[4]===18).length,0);
  assert.equal(echo.events.filter(e=>e[0]==='fillRect'&&e[4]===18).length,2);
});
