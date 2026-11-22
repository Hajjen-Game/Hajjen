// SKYSHIFT 0.28.9.8 stage 2 — exact historical release-note migration proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const historicalBlobs = {
  "RELEASE-010.md": "98091fc94863289dfdd35aa42a3619b00023dd85",
  "RELEASE-0101.md": "9e31b821d0055b90117c08942df701c79ef7c07a",
  "RELEASE-0103.md": "b9cfb28b1a4b2a391285a9b8a83a8717a970361b",
  "RELEASE-0104.md": "2e5a4823303d4a937a9de4adf0c81686a6a80602",
  "RELEASE-0105.md": "62d2bb16279e37eefb71af338c40f17562a4a020",
  "RELEASE-0107.md": "9c975f6f6d90ea254a9b0aab6a18ad98a69eba2f",
  "RELEASE-0108.md": "55853b57fc528d1e34f2185426040927ee648c8b",
  "RELEASE-0109.md": "511e38e7bf99b0cf7b434e986a5d23177d381c48",
  "RELEASE-0110.md": "8942061d2af07462c37a6c3409e272602525ba77",
  "RELEASE-0111.md": "82d259a966413f505c7867cb73446dd24c96f62e",
  "RELEASE-0112.md": "eff3e58640c17d6a6bb9a2a77f4e5b14484b5fc6",
  "RELEASE-0113.md": "95156b361b17ff1cb890432982cc0adfc1ccaf07",
  "RELEASE-0114.md": "b9b680699d2c7e8f136054198fa19ccb6c64b5ef"
};

test('13 archived release notes retain their original Git blob bytes', () => {
  assert.equal(Object.keys(historicalBlobs).length, 13);
  const index = readFileSync(resolve(root, 'docs/releases/README.md'), 'utf8');
  for (const [filename, expectedBlobSha] of Object.entries(historicalBlobs)) {
    const oldPath = resolve(root, filename);
    const newPath = resolve(root, 'docs/releases', filename);
    assert.ok(!existsSync(oldPath), 'Unmigrated historical root note: ' + filename);
    assert.ok(existsSync(newPath), 'Missing archived release note: ' + filename);
    const bytes = readFileSync(newPath);
    const hash = createHash('sha1')
      .update('blob ' + bytes.length + '\0')
      .update(bytes)
      .digest('hex');
    assert.equal(hash, expectedBlobSha, 'Historical content changed: ' + filename);
    assert.ok(index.includes('](' + filename + ')'), 'Missing release index link: ' + filename);
  }
});
