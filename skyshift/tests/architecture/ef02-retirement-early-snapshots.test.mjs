import {restoreEF02H} from './ef02h-path-overlay.mjs';
// EF02E: absence, immutable recoverability, syntax, original reader identity and no executable consumers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {retirementEF02E as m,readHistorical} from './legacy-retirement-l1a.mjs';
import {inventory} from './dependency-inventory-v2.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const hash=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const replacement='import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";';
test('EF02E: all 31 snapshots remain exact, absent and syntactically valid from Git',()=>{
 assert.equal(m.files.length,31);assert.equal(m.readers.length,15);
 const graph=inventory().literalBrowserGraph.paths;
 for(const f of m.files){
  assert.ok(!existsSync(resolve(repo,f.path)),f.path);
  assert.ok(!graph.includes(f.path.slice('skyshift/'.length)),f.path);
  const original=readHistorical(resolve(repo,f.path));
  assert.equal(hash(original),f.sha,f.path);assert.equal(Buffer.byteLength(original),f.bytes);
  const check=spawnSync(process.execPath,['--check','--input-type='+ (f.path.endsWith('.mjs')?'module':'commonjs')],{input:original,encoding:'utf8'});
  assert.equal(check.status,0,f.path+' '+check.stderr);
 }
 for(const r of m.readers){
  const source=restoreEF02H(readFileSync(resolve(repo,r.path),'utf8'),r.path);
  assert.equal(source.split(replacement).length,2,r.path);
  assert.equal(hash(source.replace(replacement,r.originalImport)),r.sha,r.path);
 }
 const paths=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 for(const p of paths){
  if(!/\.(?:mjs|js|cjs|ts|html|css|json|yml|yaml|sh|py|txt|gltf)$/.test(p))continue;
  if(p.startsWith('skyshift/tests/architecture/')||p.startsWith('skyshift/docs/architecture/')||/migration-manifest|baseline|consumer-inventory|consumer-queue/.test(p))continue;
  const s=readFileSync(resolve(repo,p),'utf8');
  for(const f of m.files){
   const name=basename(f.path);
   if(!s.includes(name))continue;
   if(f.readers.includes(p))continue;
   if(f.browserRouteAssertions.includes(p)){
    assert.deepEqual(s.split('\n').filter(l=>l.includes(name)),[' await blocked.route("**/'+name+'*",route=>route.abort("failed"));'],p);
    continue;
   }
   assert.fail('Unapproved reference '+p+' -> '+f.path);
  }
 }
 console.log('SKYSHIFT_EF02_RETIRED '+JSON.stringify({files:m.files.length,bytes:m.files.reduce((n,f)=>n+f.bytes,0),readers:m.readers.length,rootFilesRemoved:0}));
});
