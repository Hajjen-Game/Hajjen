const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {GAME,DASH}=require('../src/core/config.js');
const H=require('../src/gameplay/dash-hazards.js');
const GEO=require('../src/core/geometry.js');
const FAIR=require('../src/director/high-speed-fairness.js');
const {AdaptiveCamera}=require('../src/camera/adaptive-camera.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {ContextualDash}=require('../src/gameplay/contextual-dash.js');
const root=path.join(__dirname,'..');

// Fixed-step horizontal/vertical collision search, matching real 3-body
// energy geometry, configured Echo impulse and actual Dash thrust curve.
// No required-action flags, special collision immunity or arbitrary seals.
function traverse(v,dist,echoAt=null,dashAt=null){
  const dt=1/120,width=H.widthFor(H.AIR,v);
  let feet=0,vy=GAME.jumpVelocity,x=-dist,
    echoUsed=false,dashUsed=false,remaining=0;
  const o={type:H.AIR,x:0,width,height:H.heightFor(H.AIR)};
  const shapes=GEO.obstacleBoxes(o,0);
  for(let i=0;i<300;i++){
    const t=i*dt;
    if(echoAt!==null&&!echoUsed&&t>=echoAt){
      vy=Math.max(GAME.jumpVelocity,
        Math.min(GAME.echoJumpVelocity,vy-GAME.echoUpwardBoost));
      echoUsed=true;
    }
    if(dashAt!==null&&!dashUsed&&t>=dashAt){
      remaining=DASH.duration;dashUsed=true;
    }
    let extra=0;
    if(remaining>0){
      const used=Math.min(dt,remaining),bonus=Math.max(DASH.minBonusSpeed,
        Math.min(DASH.maxBonusSpeed,v*DASH.bonusFactor));
      const phase=Math.max(0,Math.min(1,1-remaining/DASH.duration));
      extra=used*bonus*(.84+.40*(1-phase)*(1-phase));
      remaining=Math.max(0,remaining-used);
    }
    const prior=x;
    x+=v*dt+extra;vy+=GAME.gravity*dt;feet+=vy*dt;
    const box={x:x-18,y:feet-52,w:36,h:52};
    for(const b of shapes){
      const swept=prior+18>b.x&&prior-18<b.x+b.w||
        x+18>b.x&&x-18<b.x+b.w||
        prior+18<=b.x&&x+18>=b.x;
      if(swept&&GEO.verticalOverlap(box,b))return false;
    }
    if(x-18>width)return true;
    if(feet>0)return false;
  }
  return false;
}
function reachable(v,mode){
  for(let d=50;d<=440;d+=20){
    for(let echo=.15;echo<=.77;echo+=.04){
      for(let dash=.16;dash<=.95;dash+=.06){
        const e=mode==='echo'||mode==='echo-dash'?echo:null;
        const a=mode==='jump-dash'||mode==='echo-dash'?dash:null;
        if(traverse(v,d,e,a))return true;
      }
    }
  }
  return false;
}

test('zone 5–7 Twin Vault is shorter and fully solvable without forcing a perfect Dash',()=>{
  for(const v of [570,745,800,900,950]){
    const width=H.widthFor(H.AIR,v);
    const crossing=(width+36)/v;
    assert.ok(crossing<=1.045&&crossing>=.99,
      JSON.stringify({v,width,crossing}));
    assert.equal(reachable(v,'solo'),false,
      'two low boxes plus live zigzag should still be a real movement challenge at '+v);
    assert.equal(reachable(v,'echo'),true,
      'Echo Jump must now have a realistic no-Dash solution at '+v);
    assert.equal(reachable(v,'echo-dash'),true,
      'Air Dash must remain a fast, fun alternate solution at '+v);
    assert.equal(H.needsDashFor(H.AIR,v),false,
      'do not lie to the player about a mandatory Dash');
  }
  const oldSpan=(v)=>Math.min(1200,
    Math.max(280,Math.round((v*1.36-36)/10)*10));
  for(const v of [745,800,900]){
    assert.ok(H.widthFor(H.AIR,v)<=oldSpan(v)*.78,
      'early shape must shrink by roughly 22–30% at '+v);
  }
});

test('higher speed restores the 1200px spectacle without adding hidden rules',()=>{
  assert.equal(H.widthFor(H.AIR,1200),H.AIR_MAX_WIDTH);
  assert.equal(H.widthFor(H.AIR,1450),H.AIR_MAX_WIDTH);
  assert.equal(reachable(1812,'echo'),true);
  assert.equal(reachable(1812,'jump-dash'),true);
  assert.equal(reachable(1812,'solo'),false);
  assert.equal(reachable(2500,'solo'),true,
    'very high speed can clear through normal flight, as originally agreed');
});

test('ground gate explicitly exceeds 0.55s Duck early; physical Ground Dash covers it',()=>{
  for(const v of [570,660,745,800,900,1000]){
    const width=H.widthFor(H.GROUND,v);
    assert.ok((width+66)/v>GAME.duckDuration,
      'ordinary Duck should run out early at '+v);
    assert.equal(H.needsDashFor(H.GROUND,v),true);
    const dash=new ContextualDash();
    dash.onDuckStart();
    const action=dash.request({zone:4,grounded:true,ducking:true});
    assert.equal(action,'ground');
    let extra=0;for(let i=0;i<18;i++)extra+=dash.tick(1/60,v);
    // Early Duck .55, deliberate second press during Duck around .15s,
    // actual extended remainder .62s. The body passes the full gate.
    const totalTravel=v*(.15+.62)+extra;
    assert.ok(totalTravel>width+66,
      JSON.stringify({v,width,totalTravel}), 'Dash must be a viable exit');
  }
  for(const v of [1100,1350,1812,2400]){
    assert.equal(H.needsDashFor(H.GROUND,v),false,
      'at higher pace ordinary Duck should work: '+v);
  }
});

test('zigzag energy is REAL low floor collision, and 60% zoom stays geometrically honest',()=>{
  for(const v of [570,745,1000,1450,1812,2400]){
    const w=H.widthFor(H.AIR,v),o={type:H.AIR,x:460,width:w,height:62};
    const boxes=GEO.obstacleBoxes(o,515);
    assert.equal(boxes.length,3);
    assert.equal(boxes[0].w,H.AIR_BOX_WIDTH);
    assert.equal(boxes[1].h,H.AIR_BRIDGE_HEIGHT);
    assert.equal(boxes[1].w,H.boxGapFor(v));
    assert.equal(boxes[2].w,H.AIR_BOX_WIDTH);
    assert.equal(boxes[2].x,boxes[1].x+boxes[1].w);
    const center=boxes[1].x+boxes[1].w/2;
    assert.ok(GEO.verticalOverlap({x:center-18,y:492,w:36,h:21},boxes[1]),
      'landing in the middle is dangerous and visually indicated');
    assert.ok(!GEO.verticalOverlap({x:center-18,y:300,w:36,h:52},boxes[1]),
      'high flight remains legal; no hidden full-height seal');
    const cam=new AdaptiveCamera();cam.reset(v);
    for(const type of [H.AIR,H.GROUND]){
      const right=cam.visibleRight(1280,339);
      const x=FAIR.horizonFor(type,{speed:v,playerX:339,viewportWidth:right});
      const m=FAIR.metrics(type,{x,playerX:339,viewportWidth:right,speed:v});
      assert.ok(m.fair&&m.leadSeconds>=FAIR.rule(type).lead);
    }
  }
  const cam=new AdaptiveCamera();cam.reset(2500);assert.equal(cam.zoom,.6);
});

test('floor-first terrain lesson reserves a genuinely long continuous flat runway',()=>{
  const t=new TerrainSystem({random:()=>.5});
  t.reset(515);
  const added=t.ensure(2100,5,745,()=>({dashLearningRunway:true,
    gapChance:0,slopeChance:0,allowGap:false,phase:'BUILD'}));
  assert.ok(added.length>=1);
  assert.ok(added.some(s=>s.type==='flat'&&s.end-s.start>=2700),
    'safe advanced span is authored without modifying existing terrain');
  const x=2200,width=H.widthFor(H.AIR,745);
  assert.equal(t.canSpawnObstacle(x,width,745),true);
  assert.equal(t.groundAt(x+width/2),515);
});

test('rendered glow follows exactly the three physical boxes; no invisible action gate',()=>{
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const geo=fs.readFileSync(path.join(root,'src/core/geometry.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const renderer=game.slice(game.indexOf('  function drawObstacle(o){'),
    game.indexOf('  function drawPlayer(){'));
  assert.match(renderer,/const wire=GEO\.obstacleBoxes\(o,o\.groundY\)\[1\]/);
  assert.match(renderer,/ctx\.fillRect\(start,wire\.y,span,wire\.h\)/);
  assert.match(renderer,/const layers=quality\.profile\.density>=\.60\?2:1/);
  assert.match(renderer,/ctx\.shadowBlur=\(layer\?10:19\)\*quality\.profile\.glow/);
  assert.match(renderer,/Standard Duck Gate renderer for BOTH duck and dash-duck/);
  assert.doesNotMatch(renderer,/const extended=o\.type==='dash-duck'/);
  assert.doesNotMatch(renderer,/if\(extended\)/,
    'long duck obstacles must use the same standard duck shape');
  assert.doesNotMatch(renderer,/sealX\(|o\.dashSatisfied|chargeFlash|fillText\s*\(/);
  assert.match(geo,/AIR_BRIDGE_HEIGHT=36/);
  assert.match(game,/method:o\.dashAssisted\?'dash-assisted':'geometry'/);
  assert.doesNotMatch(game,/DASH_HAZARDS\.reachedSeal|if\(!o\.dashAssisted\)onHit\(o\)/);
  assert.match(html,/src\/gameplay\/dash-hazards\.js\?v=[^"]*zigzag-geometry-2\.1/);
});

test('Speed Curve 3.2, camera 1.1 and free contextual Dash are unchanged',()=>{
  assert.equal(GAME.speedRise,1350);assert.equal(GAME.speedEaseSeconds,170);
  assert.equal(GAME.cruiseAcceleration,.9);
  assert.equal(DASH.duration,.30);
  assert.equal(DASH.maxBonusSpeed,760);
  const cam=new AdaptiveCamera();
  assert.equal(cam.targetForSpeed(2200),.6);
});
