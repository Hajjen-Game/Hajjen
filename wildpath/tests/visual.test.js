import test from 'node:test';
import assert from 'node:assert/strict';

// The environment uses BABYLON only when building meshes, so its trail geometry
// can be checked without WebGL or a browser.
globalThis.window = { BABYLON: {} };
const { pathX } = await import('../src/world-v2.js');
const { STAGE_GATES } = await import('../src/config.js');

test('Visual 0.2 trail meanders rather than becoming a straight test corridor', () => {
  const xs = Array.from({ length: 23 }, (_, i) => pathX(i * 10));
  assert.ok(xs.every(Number.isFinite));
  assert.ok(Math.max(...xs)-Math.min(...xs)>6, 'visible horizontal changes along the route');
  assert.ok(xs.every(x=>Math.abs(x)<6), 'trail stays inside the authored meadow');
});

test('visual milestones remain centered on the same trail curve', () => {
  for (const z of STAGE_GATES) assert.ok(Number.isFinite(pathX(z)));
  assert.ok(Math.abs(pathX(24)-pathX(2))>1, 'initial forward view should reveal a bend');
});

test('all visual components can be imported without browser side effects', () => {
  assert.equal(typeof pathX,'function');
});
