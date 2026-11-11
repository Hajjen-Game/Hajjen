const test = require('node:test');
const assert = require('node:assert/strict');
const clash = require('../src/gameplay/chroma-clash.js');

const step = (match, seconds = 1 / 120, input = {x: 0, y: 0}) =>
  clash.updateMatch(match, input, seconds);

test('Clash 1.2 color zones use a strict ten-second clock, not the floor collapse timer', () => {
  const times = [
    [0, 0], [9.999, 0], [10, 1], [19.999, 1],
    [20, 2], [29.999, 2], [30, 3], [39.999, 3],
    [40, 4], [49.999, 4], [50, 5], [59.999, 5],
    [60, 6], [69.999, 6], [70, 7], [99.999, 9], [100, 10]
  ];
  assert.equal(clash.ZONE_SECONDS, 10);
  for (const [time, zone] of times) {
    assert.equal(clash.zoneForElapsed(time), zone, 'zone at ' + time + 's');
  }
  assert.equal(clash.paletteForZone(0)[0], clash.paletteForZone(7)[0],
    'colors loop after the seventh palette, allowing further ten-second changes');
  assert.notDeepEqual(clash.paletteForZone(0), clash.paletteForZone(1));
  assert.notDeepEqual(clash.paletteForZone(5), clash.paletteForZone(6));
});

test('Clash 1.2 zone pacing is deliberately slower at first, then accelerates at every 10s boundary', () => {
  const expected = [145, 157, 169, 181, 193, 205, 217, 229];
  expected.forEach((speed, zone) => assert.equal(clash.speedForZone(zone), speed));
  assert.ok(clash.speedForZone(4) < clash.SPEED_LIMIT,
    'at 45s the new movement cap should remain below the too-fast 1.1 cap');
  assert.ok(clash.speedForZone(8) > clash.speedForZone(7));
  assert.equal(clash.speedForZone(500), clash.MAX_ZONE_SPEED,
    'late escalation needs a physically manageable upper limit');
});

test('Color change at 10s changes speed and zone but does not shrink the arena at that time', () => {
  const m = clash.createMatch(602);
  m.elapsed = 9.995;
  step(m, 1 / 120);
  assert.equal(m.zone, 1);
  assert.equal(m.stage, 0);
  assert.equal(m.half, clash.HALVES[0]);
  assert.equal(m.paletteFade, clash.COLOR_FADE_SECONDS);
  assert.equal(m.event, 'ZONE 02 · SPEED UP');
  assert.equal(m.eventId, 1);
  assert.equal(clash.speedForZone(m.zone), 157);
  assert.deepEqual(clash.activePalette(m), clash.paletteForZone(0),
    'immediately on transition the color must start from the old palette');
  step(m, 1 / 120);
  assert.notDeepEqual(clash.activePalette(m), clash.paletteForZone(0),
    'color must begin to interpolate without new hazard-like visuals');
  assert.notDeepEqual(clash.activePalette(m), clash.paletteForZone(1));
});

test('At a scheduled edge collapse the arena shrinks without causing an extra color/speed step', () => {
  const m = clash.createMatch(404);
  m.elapsed = clash.COLLAPSES[0] - .005;
  m.zone = 1;
  step(m, 1 / 120);
  assert.equal(m.stage, 1);
  assert.equal(m.zone, 1);
  assert.equal(m.half, clash.HALVES[1]);
  assert.equal(clash.speedForZone(m.zone), 157);
  assert.deepEqual(clash.activePalette(m), clash.paletteForZone(1));
});

test('Clock zones advance even between the original uneven collapse times', () => {
  const m = clash.createMatch(77);
  m.stage = 2;
  m.half = clash.HALVES[2];
  m.zone = 2;
  m.elapsed = 29.995;
  step(m, 1 / 120);
  assert.equal(m.zone, 3);
  assert.equal(m.stage, 2);
  assert.equal(m.half, clash.HALVES[2]);
});

test('All cubes share the exact zone-specific speed cap and keep quick analog steering', () => {
  for (const zone of [0, 1, 4, 7]) {
    const max = clash.speedForZone(zone);
    const player = {x: 480, y: 270, vx: 0, vy: 0};
    const cpu = {x: 480, y: 270, vx: 0, vy: 0};
    for (let t = 0; t < 24; t++) {
      clash.steerCube(player, {x: 1, y: 0}, 1 / 120, max);
      clash.steerCube(cpu, {x: 1, y: 0}, 1 / 120, max);
    }
    assert.equal(player.vx, max, 'full joystick should reach zone cap quickly');
    assert.equal(cpu.vx, player.vx, 'same physical response for bots');
    assert.ok(player.vx > 0 && player.x > clash.CX);
  }
});

test('Chroma zone rules remain valid after all six outer rings have fallen', () => {
  const m = clash.createMatch(11);
  m.elapsed = 79.995;
  m.stage = 6;
  m.half = clash.HALVES[6];
  m.zone = 7;
  // Put all four cubes safely on the final tiny platform: otherwise the
  // normal elimination event intentionally supersedes the zone announcement.
  m.cubes.forEach((c, i) => {
    c.x = clash.CX + (i % 2 ? 18 : -18);
    c.y = clash.CY + (i < 2 ? -18 : 18);
  });
  step(m, 1 / 120);
  assert.equal(m.zone, 8);
  assert.equal(m.stage, 6);
  assert.equal(m.event, 'ZONE 09 · SPEED UP');
  assert.equal(clash.speedForZone(m.zone), 241);
});
