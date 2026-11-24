// L1A: no runtime or ordinary QA may depend on the retired snapshots.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {retirement,readHistorical} from './legacy-retirement-l1a.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
test('L1A: all 22 retired snapshots are absent, Git-recoverable and have no remaining executable consumers',()=>{
 assert.equal(retirement.archiveCommit,'06754fc69e87b23e63b73e1552f99883fadc3897');
 assert.equal(retirement.files.length,22);
 assert.equal(new Set(retirement.files.map(f=>f.path)).size,22);
 assert.equal(retirement.files.filter(f=>/\/boot-v\d+\.js$/.test(f.path)).length,19);
 assert.equal(retirement.files.filter(f=>/\/game-v\d+\.mjs$/.test(f.path)).length,3);
 for(const f of retirement.files){
  assert.match(f.path,/^skyshift\/legacy\/(?:boot\/boot-v\d+\.js|game\/game-v\d+\.mjs)$/);
  assert.ok(!existsSync(resolve(repo,f.path)),f.path);
  assert.ok(readHistorical(resolve(repo,f.path)).length>0,f.path);
 }
 const names=retirement.files.map(f=>basename(f.path));
 const paths=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 for(const p of paths){
  if(!/\.(?:mjs|js|cjs|ts|html|css|json|yml|yaml|sh|py|txt|gltf)$/.test(p))continue;
  if(p.startsWith('skyshift/tests/architecture/')||p.startsWith('skyshift/docs/architecture/')||/migration-manifest|baseline|consumer-inventory|consumer-queue/.test(p))continue;
  const source=readFileSync(resolve(repo,p),'utf8');
  for(const name of names)assert.ok(!source.includes(name),'Remaining executable reference '+p+' -> '+name);
 }
});
