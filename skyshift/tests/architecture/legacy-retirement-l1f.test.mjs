import {expectedRootFiles} from './root-count-contract.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {retirementL1F as m,readHistorical} from './legacy-retirement-l1a.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const sha=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')};
test('L1F: exact Git fixtures, exact reader assertions and no unapproved executable consumers',()=>{
 assert.equal(m.files.length,20);assert.equal(m.readers.length,22);
 assert.equal(new Set(m.files.map(f=>f.path)).size,20);
 assert.equal(readdirSync(resolve(repo,'skyshift'),{withFileTypes:true}).filter(e=>e.isFile()).length,expectedRootFiles);
 for(const f of m.files){
  assert.ok(!existsSync(resolve(repo,f.path)),f.path);
  assert.equal(sha(readHistorical(resolve(repo,f.path))),f.sha,f.path);
 }
 for(const r of m.readers){
  const s=readFileSync(resolve(repo,r.path),'utf8');
  const changed='import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";';
  assert.equal(s.split(changed).length,2,r.path);
  assert.equal(sha(s.replace(changed,r.originalImport)),r.sha,r.path);
 }
 const paths=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 for(const p of paths){
  if(!/\.(?:mjs|js|cjs|ts|html|css|json|yml|yaml|sh|py|txt|gltf)$/.test(p))continue;
  if(p.startsWith('skyshift/tests/architecture/')||p.startsWith('skyshift/docs/architecture/')||/migration-manifest|baseline|consumer-inventory|consumer-queue/.test(p))continue;
  const s=readFileSync(resolve(repo,p),'utf8');
  for(const f of m.files)if(!f.readers.includes(p))assert.ok(!s.includes(basename(f.path)),'Unapproved executable reference '+p+' -> '+f.path);
 }
});
