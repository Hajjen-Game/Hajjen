// EF02F: exact historical CSS archive identity, unchanged reader contract and no runtime references.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {retirementEF02F as m,readHistorical} from './legacy-retirement-l1a.mjs';
import {expectedRootFiles} from './root-count-contract.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const hash=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
test('EF02F: 19 old CSS originals recover exactly and no executable consumers remain',()=>{
 assert.equal(m.files.length,19);
 assert.equal(new Set(m.files.map(f=>f.path)).size,19);
 assert.equal(readdirSync(resolve(repo,'skyshift'),{withFileTypes:true}).filter(e=>e.isFile()).length,expectedRootFiles);
 for(const f of m.files){
  assert.ok(!existsSync(resolve(repo,f.path)),f.path);
  const css=readHistorical(resolve(repo,f.path));
  assert.equal(hash(css),f.sha,f.path);assert.equal(Buffer.byteLength(css),f.bytes);
  assert.doesNotMatch(css,/@import\b|url\s*\(/i,f.path+' path-dependent CSS');
  for(const reader of f.readers){
   const s=readFileSync(resolve(repo,reader),'utf8');
   assert.ok(s.includes('import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";'),reader);
   assert.ok(s.includes(basename(f.path)),reader);
  }
 }
 const paths=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 for(const p of paths){
  if(!/\.(?:mjs|js|cjs|ts|html|css|json|yml|yaml|sh|py|txt|gltf)$/.test(p))continue;
  if(p.startsWith('skyshift/tests/architecture/')||p.startsWith('skyshift/docs/architecture/')||/migration-manifest|baseline|consumer-inventory|consumer-queue/.test(p))continue;
  const s=readFileSync(resolve(repo,p),'utf8');
  for(const f of m.files){
   if(!s.includes(basename(f.path)))continue;
   assert.ok(f.readers.includes(p),'Unapproved executable CSS reference '+p+' -> '+f.path);
  }
 }
 for(const p of m.activeDocumentPaths){
  const html=readFileSync(resolve(repo,p),'utf8');
  const links=[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["']/g)].map(x=>x[1]);
  assert.ok(links.length>=8,p);
  for(const href of links)if(href.startsWith('./')){
   const path=resolve(dirname(resolve(repo,p)),href.split('?')[0]);
   assert.ok(existsSync(path),p+' '+href);
   assert.ok(!m.files.some(f=>resolve(repo,f.path)===path),p+' references retired CSS');
  }
 }
 console.log('SKYSHIFT_EF02_ROOT_CSS_RETIRED '+JSON.stringify({files:m.files.length,bytes:m.files.reduce((n,f)=>n+f.bytes,0),rootFiles:expectedRootFiles,archiveReaders:m.files.flatMap(f=>f.readers).length}));
});
