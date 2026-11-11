const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const clash = require('../src/gameplay/chroma-clash.js');

function tick(match, count, input) {
  for (let i = 0; i < count; i++) clash.updateMatch(match, input || { x: 0, y: 0 }, 1 / 120);
}

test('Clash begins with four distinct colored cubes and no jump/dash state', () => {
  const match = clash.createMatch(10);
  assert.equal(match.cubes.length, 4);
  assert.equal(match.stage, 0);
  assert.equal(match.half, 198);
  assert.deepEqual(match.cubes.map(c => c.name), ['YOU', 'NOVA', 'VOLT', 'HEX']);
  assert.equal(new Set(match.cubes.map(c => c.color)).size, 4);
  assert.ok(match.cubes.every(c => c.alive && clash.supported(c.x, c.y, match.half)));
  assert.equal(match.state, 'running');
  assert.ok(match.cubes.every(c => c.dash === undefined && c.jump === undefined));
});

test('Rounded-square corners are not falsely treated as safe AABB floor', () => {
  const h = 198;
  assert.equal(clash.supported(clash.CX, clash.CY, h), true);
  assert.equal(clash.supported(clash.CX + 197, clash.CY, h), true);
  assert.equal(clash.supported(clash.CX + 200, clash.CY, h), true); // grace
  assert.equal(clash.supported(clash.CX + 204, clash.CY, h), false);
  assert.equal(clash.supported(clash.CX + 195, clash.CY + 195, h), false);
  assert.equal(clash.supported(clash.CX + 160, clash.CY + 160, h), true);
});

test('Joystick acceleration has inertia, drag, and a hard cap shared by players', () => {
  const m = clash.createMatch(17);
  tick(m, 25, { x: 1, y: 0 });
  const player = m.cubes[0];
  assert.ok(player.vx > 75);
  assert.ok(Math.hypot(player.vx, player.vy) <= clash.SPEED_LIMIT + 0.001);
  const before = player.vx;
  tick(m, 12, { x: 0, y: 0 });
  assert.ok(player.vx < before);
  assert.ok(player.vx > 0);
});

test('Two colliding cubes exchange momentum and separate instead of ghosting', () => {
  const m = clash.createMatch(6);
  const a = { id: 0, x: 450, y: 270, vx: 85, vy: 0, alive: true, squash: 0 };
  const b = { id: 1, x: 472, y: 270, vx: -45, vy: 0, alive: true, squash: 0 };
  assert.equal(clash.collide(a, b, m), true);
  assert.ok(a.vx < 85);
  assert.ok(b.vx > -45);
  assert.ok(Math.hypot(b.x - a.x, b.y - a.y) >= clash.CUBE_RADIUS * 2 - 1e-8);
  assert.ok(m.impacts.length > 0);
});

test('AI genuinely steers inwards near the falling edge, not toward a guaranteed win', () => {
  const m = clash.createMatch(19);
  const bot = m.cubes[1];
  bot.x = clash.CX + m.half - 12;
  bot.y = clash.CY;
  bot.vx = 125;
  const steering = clash.chooseAI(m, bot);
  assert.ok(steering.x < -0.45);
  assert.ok(Math.hypot(steering.x, steering.y) <= 1.2);
});

test('Falling edge warns before collapse, breaks in stages, and removes unsupported cubes', () => {
  const m = clash.createMatch(21);
  m.elapsed = clash.COLLAPSES[0] - clash.WARNING_SECONDS - .08;
  tick(m, 14);
  assert.equal(m.warning, true);
  assert.equal(m.stage, 0);
  assert.equal(m.half, clash.HALVES[0]);
  m.cubes[0].x = clash.CX + 180;
  m.cubes[0].y = clash.CY;
  m.elapsed = clash.COLLAPSES[0] - .001;
  tick(m, 1);
  assert.equal(m.stage, 1);
  assert.equal(m.half, clash.HALVES[1]);
  assert.equal(m.warning, false);
  assert.equal(m.falling.length, 1);
  assert.equal(m.cubes[0].alive, false);
  assert.equal(m.state, 'ending');
  tick(m, 100);
  assert.equal(m.state, 'finished');
  assert.equal(m.outcome, 'eliminated');
});

test('The player wins only when they truly are the last remaining cube', () => {
  const m = clash.createMatch(25);
  [1, 2, 3].forEach(id => clash.knockOut(m, m.cubes[id]));
  tick(m, 1);
  assert.equal(m.outcome, 'victory');
  assert.equal(m.winner, 0);
  assert.equal(m.state, 'ending');
});

test('Mobile shell exposes ONLY a directional virtual joystick and preserves existing runner entry', () => {
  const page = fs.readFileSync(path.join(__dirname, '../clash.html'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../clash.css'), 'utf8');
  assert.match(page, /id="clash-joystick"/);
  assert.match(page, /id="clash-pause"/);
  assert.match(page, /src="src\/gameplay\/chroma-clash\.js/);
  assert.doesNotMatch(page, /id="clash-(?:jump|dash)"/);
  assert.match(main, /id="clash-mode-link"[^>]*href="\.\/clash\.html"/);
  assert.match(main, /id="start-btn"/);
  assert.match(css, /touch-action:none/);
  assert.match(css, /orientation:portrait/);
});

test('All palette zones and collapse stages remain paired with a smaller platform', () => {
  assert.equal(clash.HALVES.length, clash.COLLAPSES.length + 1);
  assert.equal(clash.PALETTES.length, clash.HALVES.length);
  assert.ok(clash.HALVES.every((h, i) => i === 0 || h < clash.HALVES[i - 1]));
  assert.ok(clash.COLLAPSES.every((t, i) => i === 0 || t > clash.COLLAPSES[i - 1]));
});
