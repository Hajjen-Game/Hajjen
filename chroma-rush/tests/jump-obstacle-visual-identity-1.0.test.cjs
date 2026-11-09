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
  const isDuck=type==='duck'||type==='dash-duck';
  const obstacle={type,x:300,width:type==='echo'?273:type==='dash-duck'?470:isDuck?62:52,
    height:type==='echo'?74:isDuck?135:60,groundY:515,pulse:1};
  const lines=[];
  const camera={visibleRight:w=>w,visibleLeft:()=>0,screenX:x=>x,screenY:y=>y};
  const player={x:339};
  const env={ctx,camera,player,GEO,DASH_HAZARDS,W:1280,H:720,floorY:515,worldTime:1.75,
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

test('short Jump inherits Duck Gate visual grammar with unchanged collider',()=>{
  for(const width of [43,58])for(const height of [53,66]){
    const run=renderObstacle('jump');
    const obstacle={...run.obstacle,width,height};
    const b=GEO.obstacleBox(obstacle,515);
    assert.deepEqual(b,{x:300,y:515-height,w:width,h:height});
  }
  const jump=renderObstacle('jump'),duck=renderObstacle('duck'),b=jump.box;
  assert.ok(jump.events.some(e=>e[0]==='roundRectPath'),
    'Jump uses the same soft-corner beam housing as Duck');
  assert.ok(duck.events.some(e=>e[0]==='roundRectPath'));
  const fills=jump.events.filter(e=>e[0]==='fillRect');
  assert.ok(fills.length>=1,'Jump retains its translucent energy field');
  for(const e of fills){
    assert.ok(e[1]>=b.x&&e[1]+e[3]<=b.x+b.w+1e-6);
    assert.ok(e[2]>=b.y&&e[2]+e[4]<=b.y+b.h+1e-6);
  }
  assert.ok(jump.lines.some(l=>l.y1===b.y),
    'Jump structural bar is anchored to its top');
  assert.ok(duck.lines.some(l=>l.y1===duck.box.y+duck.box.h),
    'hanging Duck Gate retains its original lower bar');
  assert.equal(jump.events.filter(e=>e[0]==='fillText').length,0);
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

test('long dash-duck uses EXACT standard duck rendering, just with larger width',()=>{
  const short=renderObstacle('duck'),long=renderObstacle('dash-duck');
  assert.equal(short.box.y,long.box.y);
  assert.equal(short.box.h,long.box.h);
  assert.equal(short.box.y+short.box.h,515-GEO.DUCK_CLEARANCE);
  assert.ok(long.box.w>short.box.w*5);
  // Same draw calls, stroke counts, layer density and glow weights: only
  // the lateral coordinates/width differ. No long-only ornament allowed.
  assert.deepEqual(long.events.map(e=>e[0]),short.events.map(e=>e[0]));
  assert.deepEqual(long.lines.map(({width,shadow,alpha,y1,y2})=>
    ({width,shadow,alpha,y1,y2})),
    short.lines.map(({width,shadow,alpha,y1,y2})=>
      ({width,shadow,alpha,y1,y2})));
  const bottom=515-GEO.DUCK_CLEARANCE;
  assert.ok(long.lines.some(l=>l.y1===bottom&&l.y2===bottom&&l.width===5),
    'standard duck underside and clearance preserved at full long width');
  const duckSection=sourceCode.slice(sourceCode.indexOf('    }else{\n      // Standard Duck Gate renderer'),
    sourceCode.indexOf('    // Every glowing segment'));
  assert.doesNotMatch(duckSection,/if\(extended\)|extended\?|k%2===0|Math\.sin\(/,
    'no alternate pattern or long-only decoration in the duck renderer');
});

test('new Echo Rail is low and broad with visually integrated underbody energy',()=>{
  const run=renderObstacle('echo'),b=run.box;
  assert.deepEqual(b,{x:300,y:515-74,w:273,h:74});
  const beamHeight=Math.max(44,Math.min(58,Math.round(b.h*.65)));
  const split=b.y+beamHeight;
  assert.ok(run.events.some(e=>e[0]==='fillRect'&&e[1]===b.x+3&&
    e[2]===split&&e[3]===b.w-6&&e[4]===b.h-beamHeight),
    'translucent Duck-style energy begins BELOW the raised jump beam');
  assert.ok(run.lines.some(l=>l.y1===split-3&&l.y2===split-3),
    'the bright bottom plinth belongs to the raised normal jump beam');
  assert.ok(!run.lines.some(l=>l.width>1.5&&l.y1===b.y+b.h-3),
    'no thick glowing line at the track level');
  assert.ok(run.lines.length>=7,
    'raised Echo also has two illuminated vertical energy borders');
  const veilBottom=b.y+b.h,veilTop=split;
  const edgeLines=run.lines.filter(l=>l.width===2.1&&
    l.y1===veilTop+1&&l.y2===veilBottom-1);
  assert.equal(edgeLines.length,2,
    'matching left and right energy field boundaries');
  assert.deepEqual(edgeLines.map(l=>l.x1).sort((a,b)=>a-b),
    [b.x+2,b.x+b.w-2]);
  assert.ok(!run.lines.some(l=>l.width>=2&&l.y1===veilBottom&&l.y2===veilBottom),
    'no extra thick bottom line across the track');
  assert.ok(ECHO_SPIRE.maxHeight<=90);
  assert.ok(ECHO_SPIRE.minWidth>=300);
  assert.equal(ECHO_SPIRE.introMinHeight,70);
  assert.equal(ECHO_SPIRE.introMaxHeight,76);
  assert.equal(ECHO_SPIRE.introMinWidth,265);
  assert.equal(ECHO_SPIRE.introMaxWidth,280);
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

test('spawn sizes are centralised while action-specific fairness stays unchanged',()=>{
  assert.match(original,/OBSTACLE_BALANCE\.dimensionsFor\(data\.type/);
  assert.match(original,/const \{width,height\}=sized/);
  assert.match(original,/const x=spawnXFor\(data\.type\)/);
  assert.match(original,/FAIR\.metrics\(data\.type/);
});

test('former Echo Rail keeps historical visual geometry but cannot spawn in active arcade',()=>{
  const echo=renderObstacle('echo'),b=echo.box;
  assert.ok(echo.events.some(e=>e[0]==='close'),
    'legacy Echo Rail visual remains readable in archived diagnostics');
  assert.ok(echo.events.some(e=>e[0]==='fillRect'&&e[3]>200));
  assert.match(original,/if\(data\.type==='echo'\|\|data\.type==='dash-jump'\)return false/);
  const jump=renderObstacle('jump');
  assert.ok(jump.events.some(e=>e[0]==='roundRectPath'));
});
