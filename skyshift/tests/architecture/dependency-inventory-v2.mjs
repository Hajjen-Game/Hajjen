// SKYSHIFT Architecture Cleanup 2.0 — READ-ONLY dependency census.
// A literal import graph is a LOWER BOUND on live dependencies, not proof
// that unvisited files are unused. No writes, moves or deletions are performed.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, extname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const skyshiftRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = new Set(['.js', '.mjs']);
const readable = new Set(['.js', '.mjs', '.css', '.html']);
const normalize = p => p.replaceAll('\\', '/');

export function extractLiteralReferences(contents, ext) {
  const refs = [];
  const patterns = ext === '.html'
    ? [/\b(?:src|href|data-game-module)\s*=\s*["']([^"']+)["']/g]
    : ext === '.css'
      ? [/@import\s+(?:url\(\s*)?["']([^"']+)["']/g,
         /url\(\s*["']?([^"')\s]+)["']?\s*\)/g]
      : [/\bfrom\s*["']([^"']+)["']/g,
         /\bimport\s*\(\s*["']([^"']+)["']/g,
         /\bimport\s*["']([^"']+)["']/g,
         /\bnew\s+URL\s*\(\s*["']([^"']+)["']/g];
  for (const pattern of patterns) for (const match of contents.matchAll(pattern)) refs.push(match[1]);
  return [...new Set(refs)];
}

export function resolveLocalReference(root, owner, value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().split(/[?#]/, 1)[0];
  if (!raw || /^(?:https?:|data:|blob:|#|\/\/)/i.test(raw)) return null;
  let dest;
  if (raw.startsWith('./') || raw.startsWith('../'))
    dest = resolve(dirname(owner), raw);
  else if (raw.startsWith('/skyshift/'))
    dest = resolve(root, raw.slice('/skyshift/'.length));
  else if (raw.startsWith('/')) return null;
  else if (owner.endsWith('.html') && !raw.includes(':'))
    dest = resolve(dirname(owner), raw); // e.g. data-game-module=game-v0210.mjs
  else return null; // bare npm specifier / dynamic path unknown
  const rel = relative(root, dest);
  return rel === '..' || rel.startsWith('..' + sep) || rel.startsWith('../') ? null : dest;
}

function walk(dir, files) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) walk(full, files);
    else if (item.isFile()) files.push(full);
  }
}

export function inventory(root = skyshiftRoot) {
  const files = [];
  walk(root, files);
  files.sort();
  const fileSet = new Set(files);
  const refs = new Map();
  const missing = new Set();
  for (const file of files) {
    const ext = extname(file);
    if (!readable.has(ext)) continue;
    const contents = readFileSync(file, 'utf8');
    const found = [];
    for (const spec of extractLiteralReferences(contents, ext)) {
      const dest = resolveLocalReference(root, file, spec);
      if (!dest) continue;
      if (fileSet.has(dest)) found.push(dest);
      else if (code.has(ext) || ext === '.html') missing.add(normalize(relative(root, file)) + ' -> ' + spec);
    }
    refs.set(file, [...new Set(found)]);
  }
  const entry = resolve(root, 'index.html');
  const visited = new Set(), queue = [entry];
  while (queue.length) {
    const current = queue.pop();
    if (!current || visited.has(current) || !fileSet.has(current)) continue;
    visited.add(current);
    queue.push(...(refs.get(current) || []));
  }
  // Historical test/QA references are deliberately separate from the browser
  // graph. Their existence prevents any unvisited file from being auto-deleted.
  const qaSources = files.filter(f => f.endsWith('.test.mjs') ||
    /^browser-/.test(f.slice(f.lastIndexOf(sep) + 1)));
  const qaRefs = new Set();
  for (const f of qaSources) for (const dep of refs.get(f) || []) qaRefs.add(dep);
  const names = files.map(f => normalize(relative(root, f)));
  const active = [...visited].map(f => normalize(relative(root, f))).sort();
  const qa = [...qaRefs].map(f => normalize(relative(root, f))).sort();
  const extensionCounts = {};
  for (const f of names) {
    const ext = extname(f).slice(1) || 'other';
    extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
  }
  const result = {
    schemaVersion: 1, generatedFrom: 'read-only local repository scan',
    warning: 'Not in the literal graph is NOT proof that a file is unused: dynamic imports, name-constructed resources, CI references and historical screenshots must be reviewed manually.',
    fileCount: names.length,
    rootFileCount: names.filter(n => !n.includes('/')).length,
    extensions: extensionCounts,
    rootVersionCounts: {
      game: names.filter(n => /^game-v[\w.-]+\.mjs$/.test(n)).length,
      boot: names.filter(n => /^boot-v[\w.-]+\.js$/.test(n)).length
    },
    literalBrowserGraph: { entrypoint: 'index.html', count: active.length, paths: active },
    directTestAndBrowserQaReferences: { sourceFileCount: qaSources.length, distinctTargetCount: qa.length, paths: qa },
    unconfirmedOutsideLiteralBrowserGraph: names.filter(n => !visited.has(resolve(root, n))),
    unresolvedLiteralPaths: [...missing].sort()
  };
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inventory();
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
