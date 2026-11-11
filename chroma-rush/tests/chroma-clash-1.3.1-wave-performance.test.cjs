const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../src/gameplay/chroma-clash.js');
const { ClashRunAudit } = require('../src/diagnostics/chroma-clash-audit.js');

test('The new renderer uses a cached old scene and ONE live draw per transition frame', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/gameplay/chroma-clash.js'), 'utf8');
  const body = src.slice(src.indexOf('  function drawCornerTransition('),
    src.indexOf('  function render(time)'));
  assert.ok(body.includes('ctx.drawImage(tideCacheCanvas'), 'old scene must be cached');
  assert.equal((body.match(/drawArena\(active,/g) || []).length, 2,
    'one live draw plus an emergency scene fallback, not multiple full passes');
  assert.doesNotMatch(body, /drawBackground\(time/);
  assert.doesNotMatch(body, /floorOnly/);
  assert.doesNotMatch(body, /ctx\.clip\('evenodd'\)/);
  assert.ok(body.includes('TIDE.clipNewColor(ctx, screen, progress)'));
  assert.ok(body.includes('drawActiveEdgeWarning'));
});

test('An accepted frame or rendering stall is visible in the next Run Log', () => {
  const match = core.createMatch(99);
  const log = match.audit;
  log.noteFrame(16, 2);
  log.noteFrame(68, 17.33);
  log.noteFrame(124, 80.15);
  log.noteGraphicsFallback(10, 'large frame interval', true);
  const report = log.snapshot(match);
  assert.deepEqual(report.summary.performance, {
    frames: 3, slowFrames50ms: 2, severeFrames100ms: 1,
    worstFrameMs: 124, renderSamples: 3, worstRenderMs: 80.15,
    rendererFallbacks: 0, adaptiveTideDisables: 1
  });
  assert.ok(report.events.some(e=>e.type==='graphics_fallback' && e.adaptive));
});

test('The change does not touch match physics, ten-second zone timing or collide cooldown', () => {
  const match = core.createMatch(11);
  match.elapsed = 9.995;
  core.updateMatch(match, {x:0,y:0}, 1/120);
  assert.equal(match.zone, 1);
  assert.equal(core.speedForZone(match.zone), 157);
  assert.equal(core.COLOR_FADE_SECONDS, 1.55);
  assert.equal(match.stage, 0);
  const a = match.cubes[0], b = match.cubes[1];
  a.x=460; a.y=270; b.x=485; b.y=270;
  a.vx=145; a.vy=0; b.vx=-25;b.vy=0;
  core.collide(a,b,match);
  assert.ok(b.knockVx>150);
});

test('Wave is disabled after repeated slow frames without disabling any match logic', () => {
  const src=fs.readFileSync(path.join(__dirname,'../src/gameplay/chroma-clash.js'),'utf8');
  assert.ok(src.includes('if (tideSlowFrames >= 3)'));
  assert.ok(src.includes('tideDisabled = true; tideCacheCanvas = null;'));
  assert.ok(src.includes("match.audit.noteGraphicsFallback(match.elapsed,"));
  assert.ok(src.includes('active.cubes.forEach(c => drawCube(c, time))'));
  assert.ok(src.includes('match.audit.noteFrame(frameMs, performance.now() - renderStart)'));
});

test('New page uses cache-busted 1.3.1 assets on mobile', () => {
  const html=fs.readFileSync(path.join(__dirname,'../clash.html'),'utf8');
  assert.match(html,/chroma-clash\.js\?v=chroma-clash-1\.3\.1-mobile-wave-stability/);
  assert.match(html,/chroma-corner-tide\.js\?v=chroma-clash-1\.3\.1/);
  assert.match(html,/chroma-clash-audit\.js\?v=chroma-clash-1\.3\.1/);
});
