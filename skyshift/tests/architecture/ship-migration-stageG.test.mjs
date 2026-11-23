// SKYSHIFT Architecture Cleanup 2.0 – Stage G ships relocation integrity.
// Restores ONLY permitted external ESM import paths before comparing with
// immutable Git blob IDs of the original eight ship source files.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const ships=resolve(root,'ships');
const repo=resolve(root,'..');
const workflows=resolve(repo,'.github/workflows');
const manifest=JSON.parse(readFileSync(resolve(ships,'stageG-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
function gitBlobSha(bytes){
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function walk(dir,out=[]){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const full=join(dir,entry.name);
  if(entry.isDirectory())walk(full,out);
  else if(entry.isFile()&&['.js','.mjs','.html','.yml','.yaml'].includes(extname(full)))out.push(full);
 }
 return out;
}

test('eight ships/fleet/wing modules retain immutable original source and fully resolved ESM imports',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(names.length,8);
 const originalNames=[
 'fleet-v010.mjs','manta-blade-v0103.mjs','stingray-evo-v01342.mjs',
 'stingray-presentation-v01347.mjs','wing-clearance-v01341.mjs',
 'reactive-wing-flaps-v0108.mjs','ship-white-spill-v02125.mjs','ship-polish-v0103.mjs'];
 assert.deepEqual([...names].sort(),originalNames.sort());
 for(const name of names){
  assert.match(name,/^[a-z0-9-]+\.mjs$/);
  assert.ok(!existsSync(resolve(root,name)),'Unmoved root ship module: '+name);
  const path=resolve(ships,name);
  assert.ok(existsSync(path),'Missing relocated ship module: '+name);
  const contents=readFileSync(path,'utf8');
  let original=contents;
  for(const external of manifest.files[name].externalImports){
   assert.ok(contents.includes('../'+external),'External root import not rebased: '+name+' -> '+external);
   assert.ok(existsSync(resolve(root,external)),'Missing external ship dependency: '+external);
   original=original.split('../'+external).join('./'+external);
  }
  assert.equal(gitBlobSha(Buffer.from(original,'utf8')),manifest.files[name].originalGitBlobSha,
   'Unexpected ship model, material, animation or steering source change: '+name);
  for(const match of contents.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)){
   const target=resolve(dirname(path),match[1].split(/[?#]/)[0]);
   assert.ok(existsSync(target),'Unresolved ship ESM import '+name+' -> '+match[1]);
   const rel=relative(root,target);
   assert.ok(rel && rel!=='..' && !rel.startsWith('..'+sep),'Ship ESM import escaped SKYSHIFT: '+name);
  }
 }
});

test('no stale root ship module specifiers in game, historical tests, browser QA or CI',()=>{
 const files=[...walk(root),...walk(workflows)];
 let audited=0;
 for(const file of files){
  if(file===fileURLToPath(import.meta.url))continue;
  const source=readFileSync(file,'utf8');
  audited++;
  for(const name of names){
   assert.equal(source.includes('skyshift/'+name),false,
     'Stale repository-root ship path: '+relative(repo,file)+' -> '+name);
   if(file.startsWith(ships+sep))continue; // moved ship siblings still use ./ imports
   const escaped=name.replaceAll('.','\\.');
   const stale=new RegExp('["\\x27](?:\\./|(?:\\.\\./)+)'+escaped+'["\\x27]');
   assert.doesNotMatch(source,stale,'Stale ESM/test-relative ship reference: '+relative(repo,file)+' -> '+name);
  }
 }
 assert.ok(audited>200,'Unexpectedly few executable source files audited');
});
