// SKYSHIFT 0.28.9.8 stage 7 — audit 125 reversible historical unit-test moves.
// Each migrated file must reproduce the original immutable Git blob exactly when
// its local import and import.meta.url bases are reversed. No assertion changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const skyshift = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const testsDir = resolve(skyshift, 'tests/unit');
const workflowsDir = resolve(skyshift, '../.github/workflows');
const manifest = JSON.parse(readFileSync(resolve(testsDir, 'migration-manifest-02898-stage7.json'), 'utf8'));
const names = Object.keys(manifest.entries);

function restore(source) {
  return source
    .replace(/\bnew URL\((\s*)"\.\.\/\.\.\/"\+([^,\r\n()]+?)(\s*,\s*import\.meta\.url\s*\))/g,
      (_m, a, b, z) => 'new URL(' + a + b + z)
    .replace(/^(\s*import\b[^\n]*?\bfrom\s*["'])\.\.\/\.\.\//gm, '$1./')
    .replace(/^(\s*from\s*["'])\.\.\/\.\.\//gm, '$1./')
    .replace(/^(\s*import\s*["'])\.\.\/\.\.\//gm, '$1./')
    .replace(/^(\s*export\b[^\n]*?\bfrom\s*["'])\.\.\/\.\.\//gm, '$1./');
}

test('all 125 migrated tests have exactly the same original Git blob after reversing paths', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(names.length, 125, 'Unexpected number of audited stage-7 files');
  const current = readdirSync(testsDir).filter(n => n.endsWith('.test.mjs'));
  assert.equal(current.length, 198, 'Expected 73 previously moved + 125 stage-7 unit tests');
  for (const name of names) {
    assert.match(name, /^[\w-]+\.test\.mjs$/);
    assert.equal(existsSync(resolve(skyshift, name)), false, 'Stale SKYSHIFT root test: ' + name);
    const file = resolve(testsDir, name);
    assert.ok(existsSync(file), 'Moved test missing: ' + name);
    const contents = readFileSync(file, 'utf8');
    const original = Buffer.from(restore(contents), 'utf8');
    const actual = createHash('sha1').update('blob ' + original.length + '\0').update(original).digest('hex');
    assert.equal(actual, manifest.entries[name], 'Test assertions or source changed: ' + name);
    for (const match of contents.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.\.\/\.\.\/[^"']+)["']/g)) {
      const spec = match[1];
      if (spec.includes('${')) continue; // A string used by a historical source assertion, not an actual import
      const target = resolve(testsDir, spec);
      const rel = relative(skyshift, target);
      assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel), 'Module escapes SKYSHIFT root: ' + name);
      assert.ok(existsSync(target), 'Missing moved-test dependency: ' + name + ' -> ' + spec);
    }
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

test('no unreviewed subprocess-based tests were moved', () => {
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
    assert.ok(existsSync(resolve(skyshift, name)), 'Complex subprocess test must remain in root: ' + name);
    assert.ok(!names.includes(name), 'Complex subprocess test was unexpectedly migrated: ' + name);
  }
});
