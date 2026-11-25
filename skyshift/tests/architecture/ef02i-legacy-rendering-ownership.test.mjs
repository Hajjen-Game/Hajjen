import {restoreDeckMove,deckCurrentPath} from './ef02-closure-deck-overlay.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreEF02I,ef02iManifest as m,ef02iHistoricalExists} from './ef02i-path-overlay.mjs';
import {expectedRootFiles} from './root-count-contract.mjs';
import {inventory} from './dependency-inventory-v2.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
test('EF02I: fifteen QA rendering modules retain original source identity and equivalent dependencies outside live graph',()=>{
 assert.equal(m.moves.length,15);
 assert.equal(new Set(m.moves.map(x=>x.newPath)).size,15);
 assert.equal(readdirSync(resolve(repo,'skyshift'),{withFileTypes:true}).filter(x=>x.isFile()).length,expectedRootFiles);
 const graph=inventory().literalBrowserGraph.paths;
 for(const f of m.moves){
  assert.ok(!existsSync(resolve(repo,f.oldPath)),f.oldPath);
  assert.ok(!graph.includes(f.newPath.slice('skyshift/'.length)),f.newPath);
  assert.equal(ef02iHistoricalExists(resolve(repo,f.oldPath)),true);
  const s=restoreDeckMove(readFileSync(resolve(repo,f.newPath),'utf8'),f.newPath);
  for(const e of f.edits){
   const from=e.before.slice(1,-1),to=e.after.slice(1,-1);
   assert.equal(resolve(dirname(resolve(repo,f.oldPath)),from),resolve(dirname(resolve(repo,f.newPath)),to));
   assert.ok(existsSync(deckCurrentPath(resolve(dirname(resolve(repo,f.newPath)),to))),to);
   assert.ok(s.includes(e.after),f.newPath);
  }
 }
});
test('EF02I: all sixteen consumer files reverse to their exact pre-migration hashes',()=>{
 assert.equal(m.consumers.length,16);
 for(const c of m.consumers)restoreEF02I(readFileSync(resolve(repo,c.path),'utf8'),c.path);
});
