// EF02G: preserve every historical rendering source in the immutable Git archive.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,basename,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {retirementEF02G as m,readHistorical,historicalExists} from './legacy-retirement-l1a.mjs';
import {expectedRootFiles} from './root-count-contract.mjs';
import {inventory} from './dependency-inventory-v2.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const hash=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
test('EF02G: ten obsolete rendering sources are absent, exact, syntax-valid and have no executable consumers',()=>{
 assert.equal(m.files.length,10);
 assert.equal(new Set(m.files.map(f=>f.path)).size,10);
 assert.equal(readdirSync(resolve(repo,'skyshift'),{withFileTypes:true}).filter(e=>e.isFile()).length,expectedRootFiles);
 const graph=inventory().literalBrowserGraph.paths;
 for(const f of m.files){
  assert.ok(!existsSync(resolve(repo,f.path)),f.path);
  assert.ok(!graph.includes(f.path.slice('skyshift/'.length)),f.path);
  const source=readHistorical(resolve(repo,f.path));
  assert.equal(hash(source),f.sha,f.path);assert.equal(Buffer.byteLength(source),f.bytes);
  const check=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
  assert.equal(check.status,0,f.path+' '+check.stderr);
  for(const match of source.matchAll(/\b(?:from\s*|import\s*|import\s*\(\s*)["'](\.{1,2}\/[^"'?#]+)["']/g))
   assert.ok(historicalExists(resolve(dirname(resolve(repo,f.path)),match[1])),f.path+' historical dependency '+match[1]);
  for(const reader of f.readers){
   const s=readFileSync(resolve(repo,reader),'utf8');
   assert.ok(s.includes('import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";'),reader);
   assert.ok(s.includes(basename(f.path)),reader);
   for(const match of s.matchAll(/\b(?:from\s*|import\s*|import\s*\(\s*)["'](\.{1,2}\/[^"'?#]+)["']/g))
    assert.notEqual(resolve(dirname(resolve(repo,reader)),match[1]),resolve(repo,f.path),reader+' executable import');
  }
 }
 const paths=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 for(const p of paths){
  if(!/\.(?:mjs|js|cjs|ts|html|css|json|yml|yaml|sh|py|txt|gltf)$/.test(p))continue;
  if(p.startsWith('skyshift/tests/architecture/')||p.startsWith('skyshift/docs/architecture/')||/migration-manifest|baseline|consumer-inventory|consumer-queue/.test(p))continue;
  const s=readFileSync(resolve(repo,p),'utf8');
  for(const f of m.files)if(s.includes(basename(f.path)))assert.ok(f.readers.includes(p),'Unapproved executable reference '+p+' -> '+f.path);
 }
 console.log('SKYSHIFT_EF02_RENDERING_RETIRED '+JSON.stringify({files:m.files.length,bytes:m.files.reduce((n,f)=>n+f.bytes,0),rootFiles:expectedRootFiles}));
});
