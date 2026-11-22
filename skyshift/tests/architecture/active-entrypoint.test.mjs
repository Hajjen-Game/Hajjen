// SKYSHIFT 0.28.9.8 — architecture-only guard.
// Verify that the LIVE GitHub Pages entrypoint can reach its local JS/CSS imports.
// This does not change the game or load WebGL; full visual/flight QA remains mandatory.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const at = relativePath => resolve(root, relativePath);
const local = specifier => specifier.replace(/[?#].*$/, '');
const codeImportPattern = /\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.[^"']+)["']/g;

function assertContained(file) {
  const rel = relative(root, file);
  assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel),
    'Local import must remain within skyshift/: ' + file);
}

test('live HTML keeps the current stable bootstrap and all local assets resolvable', () => {
  const html = readFileSync(at('index.html'), 'utf8');
  assert.match(html, /data-game-module="game-v0210\.mjs"/);
  for (const id of ['skyline', 'aurora', 'vault']) {
    assert.ok(html.includes('value="' + id + '"'), 'Missing live track picker: ' + id);
  }
  const references = [
    ...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g),
    ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/g)
  ].map(match => match[1]).filter(ref => ref.startsWith('./'));
  assert.ok(references.length > 0, 'No relative HTML assets found');
  for (const ref of references) {
    const asset = resolve(root, local(ref));
    assertContained(asset);
    assert.ok(existsSync(asset), 'HTML asset missing: ' + ref);
  }
});

test('active boot module and all reachable local module imports exist', () => {
  const bootstrap = at('boot-v0210.js');
  const boot = readFileSync(bootstrap, 'utf8');
  const entryMatch = boot.match(/\bimport\s*\(\s*["']\.\/([^"']+\.mjs)(?:\?[^"']*)?["']\s*\)/);
  assert.ok(entryMatch, 'Could not resolve active game entrypoint from bootstrap');
  assert.equal(entryMatch[1], 'game-v0210.mjs', 'Unexpected active game module: review deliberately');

  const visited = new Set();
  const queue = [at(entryMatch[1])];
  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    assertContained(file);
    assert.ok(existsSync(file), 'Module missing: ' + relative(root, file));
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(codeImportPattern)) {
      const target = resolve(dirname(file), local(match[1]));
      assertContained(target);
      assert.ok(existsSync(target), 'Broken import ' + match[1] + ' in ' + relative(root, file));
      if (/\.m?js$/.test(target) && !visited.has(target)) queue.push(target);
    }
  }
  assert.ok(visited.size > 20, 'Unexpectedly small reachable module graph: verify the scanner');
});
