import {restoreEF02H} from './ef02h-path-overlay.mjs';
// EF02H: exact path-only moves and consumer rewrites; no physics or test assertion removal.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {expectedRootFiles} from './root-count-contract.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const read=p=>readFileSync(resolve(repo,p),'utf8');
const m=JSON.parse(read('skyshift/docs/architecture/ef02h-track-geometry-ownership.json'));
const hash=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
test('EF02H: all seven layout/elevation modules preserve exact original Git blobs and relative dependency targets',()=>{
 assert.equal(m.moves.length,7);
 assert.equal(new Set(m.moves.map(x=>x.newPath)).size,7);
 assert.equal(readdirSync(resolve(repo,'skyshift'),{withFileTypes:true}).filter(e=>e.isFile()).length,expectedRootFiles);
 for(const f of m.moves){
  assert.ok(!existsSync(resolve(repo,f.oldPath)),f.oldPath);
  const s=read(f.newPath);
  assert.equal(hash(s),f.sha,f.newPath);
  for(const match of s.matchAll(/\b(?:from\s*|import\s*|import\s*\(\s*)["'](\.\.?\/[^"']+)["']/g)){
   assert.ok(existsSync(resolve(dirname(resolve(repo,f.newPath)),match[1])),f.newPath+' '+match[1]);
  }
 }
});
test('EF02H: all recorded consumer changes invert to their exact pre-migration Git blobs',()=>{
 assert.equal(m.consumers.length,32);
 for(const c of m.consumers){
  // Use the same verified inverse as downstream historical identity guards.
  // It enforces every original edit count, stale-path assertion and blob SHA,
  // including the exact reconstruction of the two EF02J trial adapters.
  const s=restoreEF02H(read(c.path),resolve(repo,c.path));
  assert.equal(hash(s),c.sha,c.path);
 }
});
