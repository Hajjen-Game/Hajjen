// Read-only inventory guard: verify extraction is conservative, never deletion advice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { normalizeExplicitAssetBaseReferences, extractLiteralReferences, resolveLocalReference, inventory } from './dependency-inventory-v2.mjs';

test('literal ESM and HTML references include imports and real boot entrypoint', () => {
  const js = 'import "./m.mjs";\nimport("./n.mjs?v=2");\nexport {x} from "./x.mjs";';
  assert.deepEqual(extractLiteralReferences(js, '.mjs').sort(), ['./m.mjs', './n.mjs?v=2', './x.mjs']);
  assert.deepEqual(extractLiteralReferences('<script src="./boot-v0210.js"></script><main data-game-module="game-v0210.mjs">', '.html').sort(),
    ['./boot-v0210.js', 'game-v0210.mjs']);
});

test('nonlocal paths and bare specifiers never become deletable local assets', () => {
  const root = resolve('/tmp/inventory-sample');
  const owner = resolve(root, 'index.html');
  assert.equal(resolveLocalReference(root, owner, 'https://example.org/a.js'), null);
  assert.equal(resolveLocalReference(root, owner, '../../../outside.js'), null);
  assert.equal(resolveLocalReference(root, resolve(root, 'boot.js'), 'three'), null);
  assert.equal(resolveLocalReference(root, owner, 'game-v0210.mjs'), resolve(root, 'game-v0210.mjs'));
});

test('minimal file census only traces the literal browser graph; all other files remain unconfirmed', () => {
  const root = mkdtempSync(join(tmpdir(), 'skyshift-inventory-'));
  try {
    mkdirSync(join(root, 'tests', 'unit'), {recursive: true});
    writeFileSync(join(root, 'index.html'), '<script src="./boot-v0210.js"></script>');
    writeFileSync(join(root, 'boot-v0210.js'), 'import("./game-v0210.mjs?v=1");');
    writeFileSync(join(root, 'game-v0210.mjs'), 'import "./module.mjs";');
    writeFileSync(join(root, 'module.mjs'), 'export const x=1;');
    writeFileSync(join(root, 'game-v010.mjs'), 'export const historic=1;');
    writeFileSync(join(root, 'tests', 'unit', 'legacy.test.mjs'), 'import "../../game-v010.mjs";');
    const report = inventory(root);
    assert.equal(report.fileCount, 6);
    assert.equal(report.literalBrowserGraph.count, 4);
    assert.ok(report.unconfirmedOutsideLiteralBrowserGraph.includes('game-v010.mjs'));
    assert.ok(report.directTestAndBrowserQaReferences.paths.includes('game-v010.mjs'));
    assert.match(report.warning, /NOT proof/);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('explicit parent asset base resolves the actual asset path without hiding missing references', () => {
  const root = resolve('/tmp/inventory-sample');
  const owner = resolve(root, 'ships/loader.mjs');
  const base = 'const shipAssetBase=new URL("../",import.meta.url);';
  const expr = 'new URL("./assets/ships/",shipAssetBase);';
  const missing = 'new URL("./assets/missing.gltf",shipAssetBase);';
  const direct = 'new URL("./local.gltf",import.meta.url);';
  const source = [base,expr,missing,direct].join('\n');
  const refs = extractLiteralReferences(source,'.mjs');
  for (const [spec,target] of [['../assets/ships/','assets/ships'],['../assets/missing.gltf','assets/missing.gltf'],['./local.gltf','ships/local.gltf']]) {
    assert.ok(refs.includes(spec),spec);
    assert.equal(resolveLocalReference(root,owner,spec),resolve(root,target));
  }
  assert.ok(!refs.includes('./assets/ships/'));
  assert.equal(normalizeExplicitAssetBaseReferences(expr),expr);
  assert.equal(normalizeExplicitAssetBaseReferences(base+'\n'+base+'\n'+expr),base+'\n'+base+'\n'+expr);
});
