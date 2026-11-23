// SKYSHIFT Architecture Cleanup 2.0 Stage F — active track source integrity.
// Source bodies are verified against original immutable Git blobs after
// reversing ONLY the allowlisted ESM specifier rebases.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative, join, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const skyshift=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const tracks=resolve(skyshift,'tracks');
const repo=resolve(skyshift,'..');
const manifest=JSON.parse(readFileSync(resolve(tracks,'shared/stageF-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
function sha(bytes){
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function walk(dir,out=[]){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,entry.name);
  if(entry.isDirectory())walk(p,out);
  else if(entry.isFile()&&['.js','.mjs','.html','.yml','.yaml'].includes(extname(p)))out.push(p);
 }
 return out;
}

test('4 track modules reproduce immutable original Git blob after only rebasing imports',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(names.length,4);
 const expected={
  'track-selection-v0160.mjs':'tracks/shared/',
  'circuit-layout-v0160.mjs':'tracks/shared/',
  'track-3d-v0160.mjs':'tracks/shared/',
  'skyline-challenges-v0140.mjs':'tracks/skyline/'
 };
 assert.deepEqual(Object.keys(manifest.files).sort(),Object.keys(expected).sort());
 for(const name of names){
  const cfg=manifest.files[name];
  assert.equal(cfg.targetPath,'skyshift/'+expected[name]+name);
  assert.equal(existsSync(resolve(skyshift,name)),false,'Root track module not removed: '+name);
  const file=resolve(repo,cfg.targetPath);
  assert.ok(existsSync(file),'Moved track file absent: '+name);
  const source=readFileSync(file,'utf8');
  let original=source;
  for(const external of cfg.externalImports){
   assert.ok(source.includes('../../'+external),'Missing moved external import: '+name+' -> '+external);
   assert.ok(existsSync(resolve(skyshift,external)),'Missing old root-external import target '+external);
   original=original.split('../../'+external).join('./'+external);
  }
  assert.equal(sha(Buffer.from(original,'utf8')),cfg.originalGitBlobSha,
    'Unexpected track logic, physics or source change in '+name);
  for(const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)){
   const dest=resolve(dirname(file),match[1].split(/[?#]/)[0]);
   assert.ok(existsSync(dest),'Unresolved moved track import '+name+' -> '+match[1]);
   const rel=relative(skyshift,dest);
   assert.ok(rel && rel!=='..' && !rel.startsWith('..'+sep),'Import escaped SKYSHIFT: '+name);
  }
 }
});

test('original root module references are absent from runtime, historic tests, and workflows',()=>{
 const files=[...walk(skyshift),...walk(resolve(repo,'.github/workflows'))];
 let checked=0;
 for(const file of files){
  if(file===fileURLToPath(import.meta.url))continue;
  const contents=readFileSync(file,'utf8');
  checked++;
  for(const name of names){
   if(file.startsWith(resolve(repo,'.github/workflows')+sep)){
    assert.equal(contents.includes('skyshift/'+name),false,
      'Old CI executable module path: '+relative(repo,file)+' -> '+name);
   }else if(!file.startsWith(resolve(tracks,'shared')+sep) &&
            !file.startsWith(resolve(tracks,'skyline')+sep)){
    assert.equal(contents.includes('skyshift/'+name),false,
      'Unrebased repository-root spawned process path: '+relative(skyshift,file)+' -> '+name);
    const escaped=name.replaceAll('.','\\.');
    const old=new RegExp('["\\x27](?:\\./|(?:\\.\\./)+)'+escaped+'["\\x27]');
    assert.doesNotMatch(contents,old,'Stale source/test relative path: '+relative(skyshift,file)+' -> '+name);
   }
  }
 }
 assert.ok(checked>200,'Too few files audited');
});
