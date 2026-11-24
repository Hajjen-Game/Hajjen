import {restoreEF02H,ef02hCurrentPath} from './ef02h-path-overlay.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {expectedRootFiles} from './root-count-contract.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const m=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/root-relocation-l1h.json'),'utf8'));
const ef02e=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02-retirement-early-snapshots.json'),'utf8'));
const archiveImport='import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";';
const sha=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')};
test('L1H: six protected runners are byte-exact and ten historical readers retain every assertion',()=>{
 assert.equal(m.moves.length,6);assert.equal(m.readers.length,10);
 assert.equal(readdirSync(resolve(repo,'skyshift'),{withFileTypes:true}).filter(e=>e.isFile()).length,expectedRootFiles);
 for(const f of m.moves){
  assert.ok(!existsSync(resolve(repo,f.oldPath)),f.oldPath);
  const s=readFileSync(resolve(repo,f.newPath),'utf8');
  const original=restoreEF02H(s,resolve(repo,f.newPath));
  assert.equal(sha(original),f.sha,f.newPath);
  assert.doesNotMatch(s,/\bimport\.meta\.url\b/);
  assert.doesNotMatch(s,/\b(?:from\s*|import\s*)["']\.{1,2}\//);
  const imports=[...original.matchAll(/\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g)].map(x=>x[1]).sort();
  assert.deepEqual(imports,f.browserImports,f.newPath);
  for(const spec of imports)assert.ok(existsSync(ef02hCurrentPath(resolve(repo,'skyshift',spec))),f.newPath+' '+spec);
 }
 for(const r of m.readers){
  let s=restoreEF02H(readFileSync(resolve(repo,r.path),'utf8'),r.path);
  const retiredReader=ef02e.readers.find(x=>x.path===r.path);
  if(retiredReader){
   assert.equal(s.split(archiveImport).length,2,r.path);
   s=s.replace(archiveImport,retiredReader.originalImport);
   assert.equal(sha(s),retiredReader.sha,r.path+' EF02E inverse');
  }
  for(const e of r.edits){assert.equal(s.split(e.after).length,2,r.path);assert.ok(!s.includes(e.before),r.path);s=s.replace(e.after,e.before);}
  assert.equal(sha(s),r.sha,r.path);
 }
});
test('L1H: original runner syntax/execute commands and no stale workflow paths',()=>{
 const dir=resolve(repo,'.github/workflows');
 for(const n of readdirSync(dir).filter(x=>/\.ya?ml$/.test(x))){
  const s=readFileSync(resolve(dir,n),'utf8');
  for(const f of m.moves)assert.ok(!s.includes(f.oldPath),n+' '+f.oldPath);
 }
 const s=readFileSync(resolve(dir,'skyshift-tests.yml'),'utf8');
 for(const f of m.moves)assert.ok(s.includes('node --check '+f.newPath)||s.includes('node '+f.newPath),f.newPath);
});
