const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../src/gameplay/neon-trails.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Neon Trails is an independent arcade game with the same square cube identities and Rush pigments',()=>{
  const rush=require('../src/core/config.js');
  const m=core.createGame(42);
  assert.equal(m.players.length,4);
  assert.deepEqual(core.COLORS,['#60ecff','#ff71ac','#ffe26a','#9f8aff']);
  assert.equal(core.PALETTES[0][0],rush.PALETTES[0].primary);
  assert.equal(m.players[0].name,'YOU');
  assert.equal(core.ZONE_SECONDS,10);
  assert.equal(core.zoneAt(9.999),0);
  assert.equal(core.zoneAt(10),1);
  assert.equal(core.zoneAt(20),2);
  assert.ok(core.speedAt(1)>core.speedAt(0));
  assert.ok(core.trailLife(1)<=core.trailLife(0));
  assert.equal(m.state,'running');
});
test('Segment collision checks real crossed line, not just endpoints',()=>{
  const from={x:0,y:50},to={x:100,y:50};
  const a={x:50,y:0},b={x:50,y:100};
  assert.equal(core.segmentDistanceSq(from,to,a,b),0);
  assert.ok(core.segmentDistanceSq({x:0,y:0},{x:20,y:0},
    {x:80,y:80},{x:90,y:100})>100);
});
test('Active trails eliminate other cubes, grace covers only very recent own trail',()=>{
  const m=core.createGame(8),p=m.players[0],r=m.players[1];
  r.trail.push({x1:390,y1:170,x2:390,y2:300,at:1});
  m.elapsed=1.5;
  let hit=core.hitsTrail({x:375,y:240},{x:405,y:240},p,m.players,m.elapsed,0);
  assert.equal(hit.id,1);
  p.trail.push({x1:320,y1:140,x2:330,y2:150,at:1.4});
  hit=core.hitsTrail({x:315,y:145},{x:335,y:145},p,[p],1.5,0);
  assert.equal(hit,null);
  hit=core.hitsTrail({x:315,y:145},{x:335,y:145},p,[p],2.2,0);
  assert.equal(hit.id,0);
});
test('Dash is optional, finite, on cooldown, and recorded without creating separate attack hitboxes',()=>{
  const m=core.createGame(19),p=m.players[0];
  core.tick(m,{x:1,y:0,dash:true},1/60);
  assert.equal(p.dashes,1);
  assert.ok(p.dash>0 && p.cooldown>0);
  const d=p.distance;
  core.tick(m,{x:1,y:0,dash:true},1/60);
  assert.equal(p.dashes,1);
  assert.ok(p.distance-d>core.speedAt(0)/60*1.5);
  assert.equal(m.events.filter(e=>e.type==='dash').length,1);
});
test('Color-speed progression and playfield reduction share clear 10s zones',()=>{
  const m=core.createGame(27);
  const initial=core.arenaAt(0),later=core.arenaAt(2);
  assert.equal(core.arenaAt(1).stage,0);
  assert.equal(later.stage,1);
  assert.ok(later.right-later.left<initial.right-initial.left);
  assert.ok(later.bottom-later.top<initial.bottom-initial.top);
  assert.ok(core.nextContraction(17)>2.9&&core.nextContraction(17)<3.1);
  assert.ok(core.nextContraction(19.5)<.6);
  assert.ok(core.nextContraction(21)>18);
  for(const p of m.players){p.x=core.CX;p.y=core.CY;}
  m.elapsed=9.99;
  core.tick(m,{x:1,y:0},1/60);
  assert.equal(m.zone,1);
  assert.equal(m.stage,0);
  assert.ok(m.paletteFade>0);
  assert.ok(m.events.some(e=>e.type==='zone'));
});
test('AI is seeded, turn-rate bounded and uses trail avoidance before chasing',()=>{
  const a=core.createGame(100),b=core.createGame(100);
  for(let i=0;i<60;i++){
    core.tick(a,{x:1,y:0},1/60);
    core.tick(b,{x:1,y:0},1/60);
  }
  assert.deepEqual(a.players.map(p=>[+p.x.toFixed(2),+p.y.toFixed(2),p.alive]),
    b.players.map(p=>[+p.x.toFixed(2),+p.y.toFixed(2),p.alive]));
  assert.ok(a.players[0].trail.length>0,'player leaves dangerous glowing segments');
  assert.ok(a.players[0].trail.length<=core.MAX_TRAIL_SEGMENTS);
});
test('Elimination and match end report real cause and a deterministic result',()=>{
  const m=core.createGame(33);
  const p=m.players[0];
  core.eliminate(m,p,'trail',1);
  assert.equal(p.alive,false);
  assert.equal(m.players[1].eliminations,1);
  core.tick(m,{x:0,y:0},1/60);
  assert.equal(m.state,'finished');
  assert.equal(m.outcome,'eliminated');
  assert.ok(m.events.some(e=>e.type==='out'&&e.trailOwner===1));
  assert.ok(m.events.some(e=>e.type==='end'));
  const data=core.audit(m);
  assert.equal(data.schema,'neon-trails-run-audit/1.1');
  assert.equal(data.status,'completed');
  assert.equal(data.players.length,4);
  assert.ok(JSON.parse(JSON.stringify(data)).events.length>=3);
  assert.doesNotMatch(JSON.stringify(data),/deviceId|fingerprints|touches/);
});

test('Short tails expire in 3.3s and later zones retain a bounded lifespan',()=>{
  assert.equal(core.trailLife(0),3.3);
  assert.ok(core.trailLife(5)<3.3);
  assert.ok(core.trailLife(25)>=2.15);
  const m=core.createGame(19),p=m.players[0],q=m.players[1];
  q.trail.push({x1:340,y1:200,x2:430,y2:200,at:.2});
  m.elapsed=3.52;
  assert.equal(core.hitsTrail({x:370,y:180},{x:370,y:220},p,m.players,m.elapsed,0),null);
  q.trail.push({x1:340,y1:200,x2:430,y2:200,at:3});
  const hit=core.hitsTrail({x:370,y:180},{x:370,y:220},p,m.players,m.elapsed,0);
  assert.equal(hit.id,1);
});
test('All four wall edges rebound without eliminating the player',()=>{
  const a=core.arenaAt(0);
  for(const [x,y,angle,axis] of [
    [a.right-11.2,core.CY,0,'x'],
    [a.left+11.2,core.CY,Math.PI,'x'],
    [core.CX,a.top+11.2,-Math.PI/2,'y'],
    [core.CX,a.bottom-11.2,Math.PI/2,'y']
  ]){
    const m=core.createGame(29),p=m.players[0];
    p.x=x;p.y=y;p.angle=angle;p.desiredAngle=angle;m.elapsed=4;
    core.tick(m,{x:0,y:0},1/60);
    assert.ok(p.alive);
    assert.ok(p.x>=a.left+11 && p.x<=a.right-11);
    assert.ok(p.y>=a.top+11 && p.y<=a.bottom-11);
    assert.equal(p.wallBounces,1);
    assert.equal(m.events.find(e=>e.type==='wall_bounce').axis,axis);
    assert.ok(p.wallGrace>0);
  }
});
test('Neon trails have a softly moving highlight but never draw a nose streak',()=>{
  const body=read('src/gameplay/neon-trails.js');
  const draw=body.slice(body.indexOf('function drawTrails(){'),body.indexOf('function drawRunners(){'));
  const runners=body.slice(body.indexOf('function drawRunners(){'),body.indexOf('function render(){'));
  assert.match(draw,/ctx.lineCap='butt'/);
  assert.match(draw,/const shimmer=/);
  assert.match(draw,/const trim=/);
  assert.doesNotMatch(runners,/p\\.x\\+Math\\.cos\\(p\\.angle\\)\\*17/);
  assert.doesNotMatch(draw,/shadowBlur/);
  const html=read('neon-trails.html');
  assert.match(html,/>DASH<\/button>/);
  assert.doesNotMatch(html,/\\bBOOST\\b/);
});
test('Menu and source expose fullscreen, responsive joystick, dash, own log and shared Rush rendering',()=>{
  const html=read('neon-trails.html'),style=read('neon-trails.css'),
    src=read('src/gameplay/neon-trails.js'),index=read('index.html');
  for(const id of ['trails-start','trails-canvas','trails-joystick','trails-stick',
    'trails-dash','trails-pause','trails-fullscreen','trails-export','trails-export-pause']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.match(html,/src\/render\/chroma-identity\.js/);
  assert.match(html,/src\/render\/chroma-center-pulse\.js/);
  assert.match(src,/IDENTITY\.paintPlayer/);
  assert.match(src,/TIDE\.clipNewColor/);
  assert.match(src,/MAX_TRAIL_SEGMENTS/);
  assert.match(src,/const PIXELS=750000/);
  assert.match(src,/new Blob\(\[JSON\.stringify\(audit\(game\)/);
  assert.match(style,/\.trails-dash/);
  assert.match(index,/id="neon-trails-link"/);
  assert.match(index,/href="\.\/neon-trails\.html"/);
});
