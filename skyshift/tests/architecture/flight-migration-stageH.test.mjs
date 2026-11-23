// SKYSHIFT Architecture Cleanup 2.0 Stage H flight module relocation safety guard.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const flight=resolve(root,'flight'),repository=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(flight,'stageH-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
function hash(bytes){return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')}
function walk(dir,out=[]){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const f=join(dir,entry.name);
  if(entry.isDirectory())walk(f,out);
  else if(entry.isFile()&&['.mjs','.js','.html','.yml','.yaml'].includes(extname(f)))out.push(f);
 }return out;
}
test('Stage H: all 18 flight/steering/camera source files are SHA-equivalent to original Git blobs',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(names.length,18);
 for(const name of names){
  assert.match(name,/^[a-z0-9-]+\.mjs$/);
  assert.ok(!existsSync(resolve(root,name)),'Old root flight module remains: '+name);
  const file=resolve(flight,name);
  assert.ok(existsSync(file),'Missing relocated flight module: '+name);
  const content=readFileSync(file,'utf8');let original=content;
  for(const external of manifest.files[name].externalImports){
   assert.ok(content.includes('../'+external),'Missing approved root-external import rebase: '+name+' -> '+external);
   assert.ok(existsSync(resolve(root,external)),'Missing flight external dependency: '+external);
   original=original.split('../'+external).join('./'+external);
  }
  assert.equal(hash(Buffer.from(original,'utf8')),manifest.files[name].originalGitBlobSha,
   'Flight/GRIP/camera/boost source content differs from original: '+name);
  for(const match of content.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)){
   const target=resolve(dirname(file),match[1].split(/[?#]/)[0]);
   assert.ok(existsSync(target),'Unresolved flight dependency: '+name+' -> '+match[1]);
   const rel=relative(root,target);
   assert.ok(rel&&rel!=='..'&&!rel.startsWith('..'+sep),'Flight dependency escapes SKYSHIFT: '+name);
  }
 }
});
test('Stage H: no executable import or CI command references stale root flight module paths',()=>{
 const files=[...walk(root),...walk(resolve(repository,'.github/workflows'))];
 assert.ok(files.length>250,'Unexpectedly few source files audited');
 for(const file of files){
  // Only the Stage H historical-hash inversion helper intentionally spells obsolete paths.
  // Its reversibility is independently enforced by the original Stage 5–8 source SHA audits.
  if(file===fileURLToPath(import.meta.url)||file===resolve(root,'tests/architecture/flight-test-path-overlay-stageH.mjs'))continue;
  const source=readFileSync(file,'utf8');
  for(const name of names){
   assert.equal(source.includes('skyshift/'+name),false,'Stale repository-root flight import: '+relative(repository,file)+' -> '+name);
   if(file.startsWith(flight+sep))continue; // moved flight siblings retain ./ imports
   const escaped=name.replaceAll('.','\\.');
   const stale=new RegExp('["\\x27](?:\\./|(?:\\.\\./)+)'+escaped+'["\\x27]');
   assert.doesNotMatch(source,stale,'Stale relative flight import: '+relative(repository,file)+' -> '+name);
  }
 }
});
