const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../src/gameplay/chroma-clash.js');
const tide = require('../src/render/chroma-center-pulse.js');
const audit = require('../src/diagnostics/chroma-clash-audit.js');

test('Center-out pulse recolors the middle first, not the platform corners', () => {
  const rect = { x: 282, y: 72, w: 396, h: 396 };
  assert.equal(tide.reached(core.CX, core.CY, rect, .2), true);
  assert.equal(tide.reached(rect.x + 15, rect.y + 15, rect, .2), false);
  assert.equal(tide.reached(rect.x + 15, rect.y + 15, rect, 1), true);
  assert.ok(tide.radiusAt(.75, rect) > tide.radiusAt(.25, rect));
  assert.ok(tide.radiusAt(1, rect) >= Math.hypot(rect.w, rect.h)/2);
  assert.deepEqual(tide.center(rect), {x:core.CX,y:core.CY});
});
test('Pulse uses the full viewport; visual-only palette changes never move the floor', () => {
  const scene={x:0,y:0,w:core.WIDTH,h:core.HEIGHT};
  const tiny={x:core.CX-44,y:core.CY-44,w:88,h:88};
  for(const rect of [scene,tiny]){
    const middle=tide.center(rect);
    assert.equal(tide.reached(middle.x,middle.y,rect,.15),true);
    assert.equal(tide.reached(rect.x,rect.y,rect,.15),false);
    assert.equal(tide.reached(rect.x,rect.y,rect,1),true);
  }
  const m=core.createMatch(23);
  m.elapsed=9.995;
  core.updateMatch(m,{x:0,y:0},1/120);
  assert.equal(m.zone,1);
  assert.equal(m.paletteFade,core.COLOR_FADE_SECONDS);
  assert.ok(core.COLOR_FADE_SECONDS>=1.0);
  assert.equal(m.half,198);
  assert.equal(core.speedForZone(m.zone),157);
  assert.equal(m.cubes[0].color,core.COLORS[0]);
});

test('Arcade impact generates real decaying shove beyond ordinary movement cap', () => {
  const m = core.createMatch(75);
  const a = m.cubes[0], b = m.cubes[1];
  a.x = 470; a.y = 270; a.vx = 145; a.vy = 0;
  b.x = 496; b.y = 270; b.vx = -55; b.vy = 0;
  assert.equal(core.collide(a,b,m), true);
  assert.ok(b.knockVx > 200, 'opponent receives a persistent arcade shove');
  assert.ok(a.knockVx < -200, 'impact uses equal and opposite knock velocities');
  assert.ok(m.audit.totalContacts === 1);
  assert.equal(b.lastHitBy, 0);
  const before = b.x;
  for (let i = 0; i < 5; i++) core.steerCube(b,{x:-1,y:0},1/120,core.speedForZone(0));
  assert.ok(b.x > before + 4, 'opponent travels visibly backward despite pressing into impact');
  const kick = b.knockVx;
  for (let i = 0; i < 40; i++) core.steerCube(b,{x:0,y:0},1/120,core.speedForZone(0));
  assert.ok(b.knockVx < kick * .35, 'strong impact fades; does not permanently disable control');
});

test('A stationary overlap does not generate free impacts and repeated contact is rate-limited', () => {
  const m = core.createMatch(4);
  const a = m.cubes[0], b = m.cubes[1];
  a.x = 466; a.y = 270; b.x = 491; b.y = 270;
  a.vx = 0; b.vx = 0;
  core.collide(a,b,m);
  assert.equal(m.audit.totalContacts,0,'no speed = no fabricated hit');
  a.x = 466; b.x = 491; a.vx = 145; b.vx = -25;
  core.collide(a,b,m);
  assert.equal(m.audit.totalContacts,1);
  m.elapsed += .03; a.x = 466; b.x = 491;
  core.collide(a,b,m);
  assert.equal(m.audit.totalContacts,1,'no repeated impulse every physics tick');
});

test('Knockout credits the actual recent attacker, not simply the closest cube', () => {
  const m = core.createMatch(44);
  const a = m.cubes[0], b = m.cubes[1];
  a.x=470; a.y=270; a.vx=145; b.x=495; b.y=270; b.vx=0;
  core.collide(a,b,m);
  assert.equal(b.lastHitBy,0);
  m.elapsed += .3;
  core.knockOut(m,b);
  assert.equal(a.knocks,1);
  assert.equal(m.audit.eliminations[0].creditedTo,0);
  assert.equal(m.audit.eliminations[0].cause,'push');
  // Unrelated passive falls cannot award random nearby players.
  core.knockOut(m,m.cubes[2]);
  assert.equal(m.audit.eliminations[1].creditedTo,null);
});

test('Run audit exports truthful per-run events, snapshots and a final result', () => {
  const m = core.createMatch(129);
  m.elapsed=9.995;
  core.updateMatch(m,{x:0,y:0},1/120);
  const partial=m.audit.snapshot(m);
  assert.equal(partial.schema,'chroma-clash-run-audit/1.0');
  assert.equal(partial.status,'in_progress');
  assert.equal(partial.summary.highestZone,2);
  assert.equal(partial.summary.zoneTransitions,1);
  assert.ok(partial.events.some(e=>e.type==='zone_change' && e.zone===2));
  m.elapsed=13.995;
  core.updateMatch(m,{x:0,y:0},1/120);
  assert.equal(m.audit.ringBreaks,1);
  assert.ok(m.audit.events.some(e=>e.type==='edge_break'));
  m.cubes[1].x=core.CX+300;
  core.updateMatch(m,{x:0,y:0},1/120);
  assert.ok(m.audit.events.some(e=>e.type==='elimination'));
  // Force the player to fall, causing a truthful match-end event.
  m.cubes[0].x=core.CX+400;
  core.updateMatch(m,{x:0,y:0},1/120);
  const result=m.audit.snapshot(m);
  assert.equal(result.status,'completed');
  assert.equal(result.summary.result,'eliminated');
  assert.ok(result.events.some(e=>e.type==='match_end'));
  assert.ok(result.summary.players.length===4);
  assert.ok(JSON.parse(JSON.stringify(result)).events.length);
  assert.ok(!JSON.stringify(result).includes('touches'));
  assert.ok(!JSON.stringify(result).includes('userAgent'));
});

test('Run audit caps event and sample arrays without losing totals', () => {
  const log=new audit.ClashRunAudit(12);
  for(let i=0;i<650;i++) log.noteContact(i/120,{id:0},{id:1},172,0,1,-10);
  assert.equal(log.totalContacts,650);
  assert.equal(log.events.length,audit.MAX_EVENTS);
  assert.equal(log.eventOverflow,51); // first start event also takes a slot
  assert.equal(log.strongContacts,650);
});

test('Pause/result UI exposes an explicit user-triggered log download and both new assets', () => {
  const html=fs.readFileSync(path.join(__dirname,'../clash.html'),'utf8');
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/chroma-clash.js'),'utf8');
  assert.match(html,/id="clash-export"/);
  assert.match(html,/id="clash-export-pause"/);
  assert.match(html,/src="src\/diagnostics\/chroma-clash-audit.js/);
  assert.match(html,/src="src\/render\/chroma-center-pulse.js/);
  assert.match(game,/new Blob\(\[JSON.stringify\(payload/);
  assert.match(game,/URL\.createObjectURL/);
  assert.match(html,/chroma-clash-arena-polish-1\.1/);
  assert.doesNotMatch(html,/id="clash-(?:jump|dash)"/);
});
