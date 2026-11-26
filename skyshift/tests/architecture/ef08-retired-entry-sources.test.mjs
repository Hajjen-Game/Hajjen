// EF08: verify exact archived bytes, no live or executable test dependencies,
// unchanged historical reader assertions and preserved syntax coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {entryArchive,readArchivedEntrySource} from '../../build/archived-entry-sources.mjs';
import {readHistorical,historicalExists} from './legacy-retirement-l1a.mjs';
import {inventory} from './dependency-inventory-v2.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const currentRetirement=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef08-obsolete-cohort.json'),'utf8'));
const retiredReaders=new Map(currentRetirement.unitTests.map(f=>[f.path,f]));
function isExplicitlyRetiredReader(path){
 const entry=retiredReaders.get(path);
 if(!entry)return false;
 assert.match(entry.sha,/^[a-f0-9]{40}$/);assert.ok(entry.bytes>0);
 assert.ok(!existsSync(resolve(repo,path)),path+' obsolete reader unexpectedly restored');
 return true;
}
const sha=bytes=>{const b=Buffer.from(bytes);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
test('EF08 old entry source cohort is absent and byte-exact in Git, with no live dependency',()=>{
 const graph=new Set(inventory().literalBrowserGraph.paths);
 const paths=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 const workflow=readFileSync(resolve(repo,'.github/workflows/skyshift-tests.yml'),'utf8');
 assert.equal(entryArchive.files.length,5);
 assert.equal(new Set(entryArchive.files.map(f=>f.path)).size,5);
 assert.equal(entryArchive.files.reduce((n,f)=>n+f.bytes,0),204887);
 assert.ok(workflow.includes('node --test skyshift/tests/architecture/ef08-retired-entry-sources.test.mjs'));
 for(const f of entryArchive.files){
  assert.ok(!existsSync(resolve(repo,f.path)),f.path);
  assert.ok(!paths.includes(f.path),f.path+' remains tracked');
  assert.ok(!graph.has(f.path.slice('skyshift/'.length)),f.path+' live graph');
  const bytes=readArchivedEntrySource(f.path);
  assert.equal(sha(bytes),f.sha);assert.equal(bytes.length,f.bytes);
  assert.equal(readHistorical(resolve(repo,f.path)),bytes.toString('utf8'));
  const check=spawnSync(process.execPath,['--check','--input-type='+(f.path.endsWith('.mjs')?'module':'commonjs')],{input:bytes,encoding:'utf8'});
  assert.equal(check.status,0,f.path+' '+check.stderr);
  assert.ok(!workflow.includes('node --check '+f.path),f.path+' stale syntax command');
  // Historical dependencies resolve either in the current tree or verified archive.
  for(const match of bytes.toString('utf8').matchAll(/\b(?:from\s*|import\s*|import\s*\(\s*)["'](\.{1,2}\/[^"'?#]+)(?:\?[^"']*)?["']/g)){
   assert.ok(historicalExists(resolve(dirname(resolve(repo,f.path)),match[1])),f.path+' -> '+match[1]);
  }
  for(const reader of f.readers){
   if(isExplicitlyRetiredReader(reader))continue;
   const source=readFileSync(resolve(repo,reader),'utf8');
   assert.match(source,/import \{(?:readHistorical|readEF08Source) as readFileSync\} from "\.\.\/architecture\/legacy-retirement-l1a\.mjs";/);
   assert.ok(source.includes(basename(f.path)),reader+' explicit historical source reference');
  }
  // Existing documentation, old architecture SHA checks and historical read-only
  // consumers are allowed; active imports or unreviewed literal references are not.
  for(const p of paths){
   if(!/\.(?:mjs|js|html|css|yml|yaml)$/.test(p)||p.startsWith('skyshift/tests/architecture/'))continue;
   const source=readFileSync(resolve(repo,p),'utf8');
   if(!source.includes(basename(f.path)))continue;
   assert.ok(f.readers.includes(p),p+' unexpected retired entry reference '+f.path);
   for(const m of source.matchAll(/\b(?:from\s*|import\s*|import\s*\(\s*)["'](\.{1,2}\/[^"'?#]+)(?:\?[^"']*)?["']/g)){
    assert.notEqual(resolve(dirname(resolve(repo,p)),m[1]),resolve(repo,f.path),'Executable retired import '+p);
   }
  }
 }
});
test('EF08 reader migration changes only the seven filesystem imports',()=>{
 assert.equal(entryArchive.readerChanges.length,7);
 for(const r of entryArchive.readerChanges){
  if(isExplicitlyRetiredReader(r.path))continue;
  const source=readFileSync(resolve(repo,r.path),'utf8');
  assert.equal(source.split(r.after).length-1,1,r.path);
  assert.equal(sha(source.replace(r.after,()=>r.before)),r.sha,r.path+' historical assertions altered');
 }
});
