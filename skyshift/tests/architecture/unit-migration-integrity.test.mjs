// SKYSHIFT 0.28.9.8 stage 5: prove relocated unit tests are assertion-identical.
// Only static source import paths may change from ./module to ../../module.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const testDir = resolve(root, 'tests/unit');
const manifest = JSON.parse(readFileSync(resolve(testDir, 'migration-manifest-02898-stage5.json'), 'utf8'));

test('relocated historical unit tests retain assertions, source imports and original Git hashes', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(Object.keys(manifest.entries).length, 10);
  for (const [name, old] of Object.entries(manifest.entries)) {
    assert.match(name, /^[A-Za-z0-9-]+\.test\.mjs$/);
    assert.match(old.originalGitBlob, /^[a-f0-9]{40}$/);
    assert.equal(existsSync(resolve(root, name)), false, 'Old root test still present: ' + name);
    const target = resolve(testDir, name);
    assert.equal(existsSync(target), true, 'Moved test is missing: ' + name);
    const migrated = readFileSync(target, 'utf8');
    const movedImports = [...migrated.matchAll(/\bfrom\s*["']\.\.\/\.\.\/([^"']+)["']/g)];
    assert.equal(movedImports.length, old.replacedStaticImports, 'Unreviewed source imports in ' + name);
    for (const match of movedImports) {
      const imported = resolve(testDir, '../../' + match[1]);
      const localPath = relative(root, imported);
      assert.ok(localPath && localPath !== '..' && !localPath.startsWith('..' + sep) && !isAbsolute(localPath), 'Import escapes game root: ' + name);
      assert.ok(existsSync(imported), 'Moved test cannot import source: ' + name + ' -> ' + match[1]);
    }
    const original = restoreStageCRenderingReferences(restoreStageDTunnelReferences(restoreStageEVaultReferences(restoreStageFTrackReferences(restoreStageGShipReferences(restoreStageHFlightReferences(restoreStageICoreReferences(restoreStageJPaths(restoreStageMPaths(restoreR1BBootPaths(restoreR1CBootPaths(migrated))))))))))).replace(/(\bfrom\s*["'])\.\.\/\.\.\//g, '$1./');
    const bytes = Buffer.from(original, 'utf8');
    const gitHash = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    assert.equal(gitHash, old.originalGitBlob, 'Test assertions or source changed: ' + name);
  }
  const extras = readdirSync(testDir).filter(name => name.endsWith('.test.mjs'));
  assert.equal(extras.length, 210, 'Unexpected total after stages 4–8');
});
