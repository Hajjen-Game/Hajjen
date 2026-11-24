// SKYSHIFT 0.28.9.8 stage 7 — audit 125 reversible historical unit-test moves.
// Each migrated file must reproduce the original immutable Git blob exactly when
// its local import and import.meta.url bases are reversed. No assertion changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { restoreStageCRenderingReferences } from './rendering-test-path-overlay-stageC.mjs';
import { restoreStageDTunnelReferences } from './tunnel-test-path-overlay-stageD.mjs';
import { restoreStageEVaultReferences } from './vault-test-path-overlay-stageE.mjs';
import { restoreStageFTrackReferences } from './track-test-path-overlay-stageF.mjs';
import { restoreStageGShipReferences } from './ship-test-path-overlay-stageG.mjs';
import { restoreStageHFlightReferences } from './flight-test-path-overlay-stageH.mjs';
import { restoreStageICoreReferences } from './core-test-path-overlay-stageI.mjs';
import { restoreStageJPaths } from './stageJ-test-path-overlay.mjs';
import { restoreStageMPaths } from './stageM-test-path-overlay.mjs';
import { restoreR1BBootPaths } from './r1b-boot-test-path-overlay.mjs';
import { restoreR1CBootPaths } from './r1c-boot-test-path-overlay.mjs';
import { restoreR1DBootPaths } from './r1d-boot-test-path-overlay.mjs';
import { restoreR1EGamePaths } from './r1e-game-test-path-overlay.mjs';
import { restoreR1FGamePaths } from './r1f-game-test-path-overlay.mjs';

const skyshift = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const testsDir = resolve(skyshift, 'tests/unit');
const workflowsDir = resolve(skyshift, '../.github/workflows');
const manifest = JSON.parse(readFileSync(resolve(testsDir, 'migration-manifest-02898-stage7.json'), 'utf8'));
const names = Object.keys(manifest.entries);

function restore(source) {
  const urlRestored = source.replace(
    /\bnew URL\((\s*)"\.\.\/\.\.\/"\+([^,\r\n()]+?)(\s*,\s*import\.meta\.url\s*\))/g,
    (_m, a, b, z) => 'new URL(' + a + b + z
  );
  const lines = urlRestored.split('\n');
  let inImport = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(?:import|export)\s+/.test(line) && !/^\s*import\s*\(/.test(line)) inImport = true;
    if (inImport) {
      lines[i] = line
        .replace(/(\bfrom\s*["'])\.\.\/\.\.\//g, '$1./')
        .replace(/^(\s*import\s*["'])\.\.\/\.\.\//g, '$1./');
    }
    if (inImport && /;\s*(?:\/\/.*)?$/.test(lines[i])) inImport = false;
  }
  return lines.join('\n');
}

function assertStaticImportsResolve(name, contents) {
  const lines = contents.split('\n');
  let inImport = false;
  for (const line of lines) {
    if (/^\s*(?:import|export)\s+/.test(line) && !/^\s*import\s*\(/.test(line)) inImport = true;
    if (inImport) {
      const from = line.match(/\bfrom\s*["']([^"']+)["']/);
      const bare = line.match(/^\s*import\s*["']([^"']+)["']/);
      const spec = (from || bare)?.[1];
      if (spec && spec.startsWith('.')) {
        const target = resolve(testsDir, spec);
        const rel = relative(skyshift, target);
        assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel), 'Import escapes SKYSHIFT: ' + name + ' -> ' + spec);
        assert.ok(existsSync(target), 'Missing static import: ' + name + ' -> ' + spec);
      }
    }
    if (inImport && /;\s*(?:\/\/.*)?$/.test(line)) inImport = false;
  }
}

test('all 125 migrated tests have exactly the same original Git blob after reversing paths', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(names.length, 125, 'Unexpected number of audited stage-7 files');
  const current = readdirSync(testsDir).filter(n => n.endsWith('.test.mjs'));
  assert.equal(current.length, 210, 'Expected stages 4–8 combined unit tests');
  for (const name of names) {
    assert.match(name, /^[\w-]+\.test\.mjs$/);
    assert.equal(existsSync(resolve(skyshift, name)), false, 'Stale SKYSHIFT root test: ' + name);
    const file = resolve(testsDir, name);
    assert.ok(existsSync(file), 'Moved test missing: ' + name);
    const contents = readFileSync(file, 'utf8');
    const original = Buffer.from(restore(restoreStageCRenderingReferences(restoreStageDTunnelReferences(restoreStageEVaultReferences(restoreStageFTrackReferences(restoreStageGShipReferences(restoreStageHFlightReferences(restoreStageICoreReferences(restoreStageJPaths(restoreStageMPaths(restoreR1BBootPaths(restoreR1CBootPaths(restoreR1DBootPaths(restoreR1EGamePaths(restoreR1FGamePaths(contents))))))))))))))), 'utf8');
    const actual = createHash('sha1').update('blob ' + original.length + '\0').update(original).digest('hex');
    assert.equal(actual, manifest.entries[name], 'Test assertions or source changed: ' + name);
    assertStaticImportsResolve(name, contents);
  }
});

test('all GitHub workflows reference the relocated tests rather than removed root paths', () => {
  for (const workflow of readdirSync(workflowsDir).filter(n => /\.ya?ml$/.test(n))) {
    const yaml = readFileSync(resolve(workflowsDir, workflow), 'utf8');
    for (const name of names) {
      assert.ok(!yaml.includes('skyshift/' + name), 'Stale workflow path in ' + workflow + ': ' + name);
    }
  }
});

test('stage-8 separately audits formerly protected complex tests', () => {
  const protectedNames = [
    'multi-track-aurora-v0160.test.mjs',
    'rail-collision-v0162.test.mjs',
    'rail-contact-quality-v0163.test.mjs',
    'shared-straight-edge-parity-v02891.test.mjs',
    'track-integrity-v0161.test.mjs',
    'track-integrity-v0162.test.mjs',
    'track-integrity-v0163.test.mjs',
    'track-integrity-v0164.test.mjs',
    'track-integrity-v0165.test.mjs',
    'track-physics-parity-v0164.test.mjs',
    'track-physics-parity-v0165.test.mjs',
    'vault-boost-clarity-v0283.test.mjs'
  ];
  for (const name of protectedNames) {
    assert.equal(existsSync(resolve(skyshift, name)), false, 'Complex test must no longer remain in root: ' + name);
    assert.ok(existsSync(resolve(testsDir, name)), 'Stage-8 complex test missing: ' + name);
    assert.ok(!names.includes(name), 'Complex subprocess test was unexpectedly migrated: ' + name);
  }
});
