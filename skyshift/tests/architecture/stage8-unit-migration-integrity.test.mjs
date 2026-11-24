// SKYSHIFT 0.28.9.8 Stage 8 — reversible migration integrity for the final 12 path-sensitive unit tests.
// No assertion rewrite, subprocess target move, production source change or historical-version workaround.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, sep, isAbsolute } from 'node:path';
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
const unitDir = resolve(skyshift, 'tests/unit');
const workflowDir = resolve(skyshift, '../.github/workflows');
const manifest = JSON.parse(readFileSync(resolve(unitDir, 'migration-manifest-02898-stage8.json'), 'utf8'));
const names = Object.keys(manifest.entries);

function restore(source) {
  return source
    .replace(/\bnew URL\((\s*)"\.\.\/\.\.\/"\+p(\s*,\s*import\.meta\.url\s*\))/g, (_m, left, right) => 'new URL(' + left + 'p' + right)
    .replace(/\bnew URL\((\s*["'])\.\.\/\.\.\//g, (_m, quote) => 'new URL(' + quote + './')
    .replace(/\bfrom(\s*["'])\.\.\/\.\.\//g, (_m, quote) => 'from' + quote + './')
    .replace(/\bimport(\s*\(\s*["'])\.\.\/\.\.\//g, (_m, quote) => 'import' + quote + './')
    .replace(/\bimport(\s*["'])\.\.\/\.\.\//g, (_m, quote) => 'import' + quote + './');
}

function verifyTarget(name, spec) {
  const path = resolve(unitDir, spec);
  const rel = relative(skyshift, path);
  assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel),
    'Import/probe escapes SKYSHIFT: ' + name + ' -> ' + spec);
  assert.ok(existsSync(path), 'Unresolved import/probe after relocation: ' + name + ' -> ' + spec);
}

test('all 12 final unit tests preserve their exact original Git blobs after path inversion', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(names.length, 12);
  assert.equal(readdirSync(unitDir).filter(n => n.endsWith('.test.mjs')).length, 210);
  assert.equal(readdirSync(skyshift).filter(n => n.endsWith('.test.mjs')).length, 0,
    'No root-level test files should remain');

  for (const name of names) {
    assert.match(name, /^[A-Za-z0-9-]+\.test\.mjs$/);
    assert.equal(existsSync(resolve(skyshift, name)), false, 'Stale root test: ' + name);
    const file = resolve(unitDir, name);
    assert.ok(existsSync(file), 'Migrated test missing: ' + name);
    const source = readFileSync(file, 'utf8');
    const bytes = Buffer.from(restore(restoreStageCRenderingReferences(restoreStageDTunnelReferences(restoreStageEVaultReferences(restoreStageFTrackReferences(restoreStageGShipReferences(restoreStageHFlightReferences(restoreStageICoreReferences(restoreStageJPaths(restoreStageMPaths(restoreR1BBootPaths(restoreR1CBootPaths(restoreR1DBootPaths(restoreR1EGamePaths(restoreR1FGamePaths(source))))))))))))))), 'utf8');
    const actual = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    assert.equal(actual, manifest.entries[name], 'Original test source changed: ' + name);

    for (const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.\.\/\.\.\/[^"']+)["']/g)) {
      verifyTarget(name, match[1]);
    }
    for (const match of source.matchAll(/\bnew URL\(\s*["'](\.\.\/\.\.\/[^"']+)["']/g)) {
      verifyTarget(name, match[1]);
    }
    for (const match of source.matchAll(/\b(?:src|read|source)\(\s*["'](\.\/[^"']+)["']\s*\)/g)) {
      verifyTarget(name, '../../' + match[1]);
    }
  }
});

test('the two subprocess physics probes still exist at their original module paths', () => {
  for (const version of ['v0164', 'v0165']) {
    const name = 'track-physics-parity-' + version + '.test.mjs';
    const source = readFileSync(resolve(unitDir, name), 'utf8');
    assert.ok(source.includes('new URL("../../track-physics-parity-probe-' + version + '.mjs",import.meta.url)'));
    assert.ok(existsSync(resolve(skyshift, 'track-physics-parity-probe-' + version + '.mjs')));
  }
});

test('all GitHub workflows use relocated final-stage test paths', () => {
  for (const file of readdirSync(workflowDir).filter(f => /\.ya?ml$/.test(f))) {
    const body = readFileSync(resolve(workflowDir, file), 'utf8');
    for (const name of names) {
      assert.ok(!body.includes('skyshift/' + name),
        'Stale root path in workflow ' + file + ': ' + name);
    }
  }
});
