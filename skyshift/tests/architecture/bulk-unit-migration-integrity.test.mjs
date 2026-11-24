import {restoreR1GGamePaths,restoreR1GBootImport} from './r1g-game-test-path-overlay.mjs';
// SKYSHIFT 0.28.9.8 stage 6 — bulk relocation audit.
// 60 migrated tests must be assertion-identical to the original Git blobs;
// the only permitted changes are local import bases and import.meta.url file bases.
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
const unitDir = resolve(skyshift, 'tests/unit');
const repoRoot = resolve(skyshift, '..');
const manifest = JSON.parse(readFileSync(resolve(unitDir, 'migration-manifest-02898-stage6.json'), 'utf8'));

function restoreOriginalImports(source) {
  // Inverse of the audited stage-6 moves; do not normalize source formatting.
  return source
    .replace(/\bnew URL\((\s*)"\.\.\/\.\.\/"\+([^,\r\n()]+?)(\s*,\s*import\.meta\.url\s*\))/g,
      (_all, left, arg, right) => 'new URL(' + left + arg + right)
    .replace(/\bfrom(\s*["'])\.\.\/\.\.\//g, (_all, quote) => 'from' + quote + './')
    .replace(/\bimport(\s*\(\s*["'])\.\.\/\.\.\//g, (_all, quote) => 'import' + quote + './')
    .replace(/\bimport(\s*["'])\.\.\/\.\.\//g, (_all, quote) => 'import' + quote + './');
}

test('60 bulk-migrated tests exactly preserve their original assertions and sources', () => {
  assert.equal(manifest.schemaVersion, 1, 'Unexpected manifest schema');
  const entries = Object.entries(manifest.entries);
  assert.equal(entries.length, 60, 'Expected 60 test migrations in stage 6');
  const discovered = readdirSync(unitDir).filter(name => name.endsWith('.test.mjs'));
  assert.equal(discovered.length, 210, 'Expected stages 4–8 combined test count');

  for (const [filename, expectedBlobSha] of entries) {
    assert.match(filename, /^[A-Za-z0-9-]+\.test\.mjs$/);
    assert.match(expectedBlobSha, /^[a-f0-9]{40}$/);
    assert.equal(existsSync(resolve(skyshift, filename)), false, 'Stale root test: ' + filename);
    const migratedPath = resolve(unitDir, filename);
    assert.equal(existsSync(migratedPath), true, 'Missing migrated test: ' + filename);
    const source = readFileSync(migratedPath, 'utf8');
    const inverse = restoreOriginalImports(restoreStageCRenderingReferences(restoreStageDTunnelReferences(restoreStageEVaultReferences(restoreStageFTrackReferences(restoreStageGShipReferences(restoreStageHFlightReferences(restoreStageICoreReferences(restoreStageJPaths(restoreStageMPaths(restoreR1BBootPaths(restoreR1CBootPaths(restoreR1DBootPaths(restoreR1EGamePaths(restoreR1FGamePaths(restoreR1GGamePaths(source))))))))))))))));
    const bytes = Buffer.from(inverse, 'utf8');
    const sha = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    assert.equal(sha, expectedBlobSha, 'Unexpected test content change: ' + filename);

    for (const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.\.\/\.\.\/[^"']+)["']/g)) {
      const target = resolve(unitDir, match[1]);
      const rel = relative(skyshift, target);
      assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel), 'Import escaped SKYSHIFT: ' + filename);
      assert.ok(existsSync(target), 'Broken imported module from ' + filename + ': ' + match[1]);
    }
  }
});

test('all GitHub Actions workflows reference new locations, not migrated root tests', () => {
  const workflowDir = resolve(repoRoot, '.github/workflows');
  const workflows = readdirSync(workflowDir).filter(name => /\.ya?ml$/.test(name))
    .map(name => ({ name, source: readFileSync(resolve(workflowDir, name), 'utf8') }));
  for (const filename of Object.keys(manifest.entries)) {
    const oldPath = 'skyshift/' + filename;
    for (const workflow of workflows) {
      assert.ok(!workflow.source.includes(oldPath), 'Stale workflow test reference: ' + workflow.name + ' -> ' + oldPath);
    }
  }
});
