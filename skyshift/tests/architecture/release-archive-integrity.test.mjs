// SKYSHIFT 0.28.9.8 stage 3 — immutable release-note archive integrity.
// Checks every documented move by original Git blob hash; NO production imports.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const docs = resolve(root, 'docs/releases');
const manifest = JSON.parse(readFileSync(resolve(docs, 'release-manifest.json'), 'utf8'));

test('all archived release notes keep their original Git blob bytes and valid index links', () => {
  assert.equal(manifest.schemaVersion, 1, 'Unknown manifest format');
  const entries = Object.entries(manifest.entries);
  assert.equal(entries.length, 53, 'Unexpected stage-4 archived release-note count');
  const index = readFileSync(resolve(docs, 'README.md'), 'utf8');
  const names = [];
  for (const [filename, expectedBlobSha] of entries) {
    assert.match(filename, /^RELEASE-[A-Z0-9-]+\.md$/);
    assert.match(expectedBlobSha, /^[a-f0-9]{40}$/);
    assert.ok(!existsSync(resolve(root, filename)), 'Unmigrated historical root note: ' + filename);
    const newPath = resolve(docs, filename);
    assert.ok(existsSync(newPath), 'Missing archived release note: ' + filename);
    const bytes = readFileSync(newPath);
    const hash = createHash('sha1')
      .update('blob ' + bytes.length + '\0')
      .update(bytes)
      .digest('hex');
    assert.equal(hash, expectedBlobSha, 'Historical release note contents changed: ' + filename);
    assert.ok(index.includes('](' + filename + ')'), 'Missing index link: ' + filename);
    names.push(filename);
  }
  assert.deepEqual(
    readdirSync(docs).filter(name => /^RELEASE-.*\.md$/.test(name)).sort(),
    names.sort(),
    'Archived release-note listing and integrity manifest disagree'
  );
});
