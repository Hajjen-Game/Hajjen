// SKYSHIFT Architecture Cleanup 2.0 Stage B — exact Git-blob QA runner relocation proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const browser = resolve(root, 'tests/browser');
const repo = resolve(root, '..');
const manifest = JSON.parse(readFileSync(resolve(browser, 'stageB-migration-manifest.json'), 'utf8'));
const names = Object.keys(manifest.entries);

test('all 42 WebGL QA harnesses are byte-identical to original Git blobs', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(names.length, 42);
  for (const name of names) {
    assert.match(name, /^browser-[\w-]+\.mjs$/);
    assert.equal(existsSync(resolve(root, name)), false, 'Stale root browser QA runner: ' + name);
    const target = resolve(browser, name);
    assert.ok(existsSync(target), 'Missing migrated browser QA: ' + name);
    const contents = readFileSync(target);
    const hash = createHash('sha1').update('blob ' + contents.length + '\0').update(contents).digest('hex');
    assert.equal(hash, manifest.entries[name], 'QA source changed unexpectedly: ' + name);
    const source = contents.toString('utf8');
    assert.doesNotMatch(source, /\bimport\.meta\.url\b/, 'Source-relative URL requires dedicated review: ' + name);
    assert.doesNotMatch(source, /\b(?:from\s*|import\s*\(\s*|import\s*)["']\.{1,2}\//,
      'Unrebased local module import: ' + name);
  }
});

test('all workflows reference the new browser QA runner locations', () => {
  const workflows = resolve(repo, '.github/workflows');
  for (const file of readdirSync(workflows).filter(f => /\.ya?ml$/.test(f))) {
    const source = readFileSync(resolve(workflows, file), 'utf8');
    for (const name of names) {
      assert.equal(source.includes('skyshift/' + name), false,
        'Stale browser QA path: ' + file + ' -> ' + name);
    }
  }
});

test('known source-sensitive browser QA harnesses remain present at approved paths', () => {
  for (const name of manifest.excluded) {
    if (["browser-fairness-v0135.mjs","browser-grip-half-v01348.mjs","browser-grip-trick-v0165.mjs","browser-multi-track-v0160.mjs"].includes(name)) {
      assert.equal(existsSync(resolve(root, name)), false, 'Stale L1G root runner: ' + name);
      assert.ok(existsSync(resolve(browser, name)), 'Missing L1G runner: ' + name);
      continue; // Exact original Git blob and CI commands verified by independent L1G gate.
    }
    assert.ok(!existsSync(resolve(root, name)), 'Stale L1H root browser QA runner: ' + name);
    assert.ok(existsSync(resolve(browser, name)), 'Missing L1H browser QA runner: ' + name);
  }
});
