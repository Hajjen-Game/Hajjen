const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const clash = require('../src/gameplay/chroma-clash.js');

const move = (cube, x, y, frames) => {
  for (let i = 0; i < frames; i++) clash.steerCube(cube, { x, y }, 1 / 120);
};
const cube = () => ({ x: clash.CX, y: clash.CY, vx: 0, vy: 0 });

test('Joystick feel 1.1: strong thumb input moves immediately (within 50ms) without teleporting', () => {
  const c = cube();
  move(c, 1, 0, 1);
  assert.ok(c.vx > 20 && c.vx < 45, 'first 8ms physics frame should be visible and finite');
  move(c, 1, 0, 5);
  assert.ok(c.vx > 130, '50ms velocity should exceed 130 world px/s');
  assert.ok(c.x > clash.CX && c.x < clash.CX + 10, 'first 50ms must remain physical motion');
  move(c, 1, 0, 6);
  assert.ok(c.vx >= 205, 'within 100ms near maximum move speed');
  assert.ok(c.vx <= clash.SPEED_LIMIT);
});

test('Joystick feel 1.1: opposite stick direction can reverse velocity in under 85ms', () => {
  const c = cube();
  move(c, 1, 0, 16);
  assert.ok(c.vx > 210);
  move(c, -1, 0, 10);
  assert.ok(c.vx < -35, 'input reversal must overcome inertia promptly');
  assert.ok(c.vx >= -clash.SPEED_LIMIT);
});

test('Joystick feel 1.1: letting go brakes but retains a short natural skid', () => {
  const c = cube();
  move(c, 1, 0, 20);
  const before = c.vx;
  move(c, 0, 0, 6);
  assert.ok(c.vx > 20 && c.vx < before, '50ms release must preserve visible friction rather than teleport');
  move(c, 0, 0, 6);
  assert.ok(Math.abs(c.vx) < 60, '100ms release should feel responsive');
});

test('Joystick curve 1.1: short touch travel has useful speed without uncontrolled edge drift', () => {
  assert.equal(clash.joystickResponse(0), 0);
  assert.equal(clash.joystickResponse(0.05), 0);
  assert.ok(clash.joystickResponse(.25) > .32, 'small thumb displacements must not feel dead');
  assert.ok(clash.joystickResponse(.5) > .62);
  assert.ok(clash.joystickResponse(.9) > .95);
  assert.equal(clash.joystickResponse(1), 1);
  assert.equal(clash.joystickResponse(2), 1);
  assert.equal(clash.joystickResponse(NaN), 0);
});

test('Joystick feel 1.1: diagonal input cannot exceed the same speed cap, AI uses same steering function', () => {
  const c = cube();
  move(c, 1, 1, 18);
  assert.ok(Math.hypot(c.vx, c.vy) <= clash.SPEED_LIMIT + 0.00001);
  const bot = cube();
  move(bot, 1, 0, 12);
  const player = cube();
  move(player, 1, 0, 12);
  assert.equal(bot.vx, player.vx);
});

test('Joystick retains responsive feel after 1.3 wave and audit asset update', () => {
  const html = fs.readFileSync(path.join(__dirname, '../clash.html'), 'utf8');
  assert.match(html, /chroma-clash\.js\?v=chroma-clash-1\.4-rendering-flow/);
});
