// CI Optimization 2.0: ensure no live runtime edits get classified as documentation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyChanges, isNonRuntimePath } from './ci-change-scope-v2.mjs';

test('non-runtime-only changes skip heavyweight browser jobs', () => {
  const paths = ['skyshift/tests/unit/track.test.mjs', 'skyshift/tests/architecture/ci-change-scope-v2.mjs',
    'skyshift/docs/architecture/CI-OPTIMIZATION-2.md', 'skyshift/previews/comparison.png',
    'skyshift/README.md', 'skyshift/ROLLBACK-REFERENCE-0285-BEFORE-0286.md'];
  for (const p of paths) assert.equal(isNonRuntimePath(p), true, p);
  assert.deepEqual(classifyChanges(paths), { visual: false, tier: 'non-runtime-only' });
});

test('live game, tunnel, renderer, lighting, CSS, artwork and CI still run every WebGL job', () => {
  const runtime = ['skyshift/index.html', 'skyshift/boot-v0210.js', 'skyshift/game-v0210.mjs',
    'skyshift/shared-tunnel-architecture-v0280.mjs', 'skyshift/tunnel/road-spill-wave-coves-v02895.mjs',
    'skyshift/style-v061.css', 'skyshift/assets/ships/model.glb',
    'skyshift/browser-shared-tunnel-v0280.mjs', '.github/workflows/skyshift-ci-fast.yml',
    '.github/workflows/skyshift-tests.yml', '.github/workflows/skyshift-architecture-guard.yml',
    'skyshift/unknown.bin', 'another-project/src/game.js'];
  for (const p of runtime) {
    assert.equal(isNonRuntimePath(p), false, p);
    assert.equal(classifyChanges(['skyshift/tests/unit/track.test.mjs', p]).visual, true, p);
  }
});

test('unknown diff and move into live runtime fail safely to full WebGL QA', () => {
  assert.equal(classifyChanges([]).visual, true);
  assert.equal(classifyChanges(null).visual, true);
  assert.equal(classifyChanges(['']).visual, true);
  assert.equal(classifyChanges(['skyshift/docs/file.md', 'skyshift/game-v0210.mjs']).visual, true);
  assert.equal(classifyChanges(['skyshift/previews/img.png', 'skyshift/assets/worlds/img.png']).visual, true);
  assert.equal(classifyChanges(['skyshift/docs/notes.md']).visual, false);
});
