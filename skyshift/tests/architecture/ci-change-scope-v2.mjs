// SKYSHIFT CI Optimization 2.0: conservative path-based WebGL selection.
// Input is NUL-delimited Git changed paths. Unknown paths always require full visual QA.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function isNonRuntimePath(path) {
  if (typeof path !== 'string' || !path || path.includes('\0')) return false;
  return path.startsWith('skyshift/tests/') ||
    path.startsWith('skyshift/docs/') ||
    path.startsWith('skyshift/previews/') ||
    /^skyshift\/[^/]+\.md$/.test(path);
}

export function classifyChanges(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return { visual: true, tier: 'full-visual-unknown-diff' };
  }
  if (paths.every(isNonRuntimePath)) {
    return { visual: false, tier: 'non-runtime-only' };
  }
  return { visual: true, tier: 'full-visual' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const changed = readFileSync(0).toString('utf8').split('\0').filter(Boolean);
  const result = classifyChanges(changed);
  process.stdout.write('visual=' + result.visual + '\n');
  process.stdout.write('tier=' + result.tier + '\n');
}
