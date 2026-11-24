import {restoreEF02H,ef02hCurrentPath} from './ef02h-path-overlay.mjs';
// SKYSHIFT Architecture Cleanup 2.0 — Stage E Vault track relocation guard.
// Every live Vault module must recreate its original Git blob after reversing
// ONLY the approved relative ESM path changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,join,relative,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const vault=resolve(root,'tracks/vault');
const workflows=resolve(root,'../.github/workflows');
const manifest=JSON.parse(readFileSync(resolve(vault,'stageE-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
const codeImport=/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g;
function gitSha(b){return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');}
function walk(dir,out=[]){for(const f of readdirSync(dir,{withFileTypes:true})){
 const full=join(dir,f.name);
 if(f.isDirectory())walk(full,out);
 else if(f.isFile()&&['.js','.mjs','.html','.yml','.yaml'].includes(extname(full)))out.push(full);
}return out;}

test('seven Vault-only track modules preserve exact original source except approved import rebases',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(names.length,7);
 for(const name of names){
  assert.match(name,/^[a-z0-9-]+\.mjs$/);
  assert.ok(!existsSync(resolve(root,name)),'Original Vault module still in root: '+name);
  const target=resolve(vault,name);
  assert.ok(existsSync(target),'Missing moved Vault module: '+name);
  const source=readFileSync(target,'utf8');
  const preEF02H=restoreEF02H(source,target);
  let original=preEF02H;
  const config=manifest.files[name];
  for(const external of config.externalImports){
   assert.ok(existsSync(ef02hCurrentPath(resolve(root,external))),'External source missing: '+external);
   assert.ok(preEF02H.includes('../../'+external),'Expected ../../ import for '+name+' -> '+external);
   original=original.split('../../'+external).join('./'+external);
  }
  assert.equal(gitSha(Buffer.from(original,'utf8')),config.originalGitBlobSha,
    'Unexpected change to Vault track implementation: '+name);
  for(const match of source.matchAll(codeImport)){
   const dest=resolve(dirname(target),match[1].split(/[?#]/)[0]);
   assert.ok(existsSync(dest),'Broken Vault ESM import '+name+' -> '+match[1]);
   const rel=relative(root,dest);
   assert.ok(rel&&rel!=='..'&&!rel.startsWith('..'+sep),'Source escaped SKYSHIFT: '+name);
  }
 }
});

test('no live source, historical unit test or workflow references old Vault paths',()=>{
 let visited=0;
 for(const file of [...walk(root),...walk(workflows)]){
  if(file===fileURLToPath(import.meta.url))continue;
  const source=readFileSync(file,'utf8');
  visited++;
  for(const name of names){
   const escaped=name.replaceAll('.','\\.');
   if(file.startsWith(workflows)){
    assert.equal(source.includes('skyshift/'+name),false,
      'Unrebased historical workflow reference '+relative(root,file)+' -> '+name);
   }else if(!file.startsWith(vault+sep)){
    const old=new RegExp('["\\x27](?:\\./|(?:\\.\\./)+)'+escaped+'["\\x27]');
    assert.doesNotMatch(source,old,'Unrebased source or test reference '+relative(root,file)+' -> '+name);
   }
  }
 }
 assert.ok(visited>200,'Unexpectedly few source files enumerated');
});
