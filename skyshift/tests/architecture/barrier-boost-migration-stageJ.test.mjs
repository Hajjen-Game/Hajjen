import {restoreEF02H,ef02hCurrentPath} from './ef02h-path-overlay.mjs';
// SKYSHIFT Architecture Cleanup 2.0 Stage J: preserve immutable source, paths and runtime imports.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'docs/architecture/stageJ-migration-manifest.json'),'utf8'));
const entries=Object.entries(manifest.files);
const originalAbs=new Map(entries.map(([name,{destination}])=>[resolve(root,destination),resolve(root,name)]));
const originalNames=new Set(entries.map(([name])=>name));
function hash(text){const bytes=Buffer.from(text,'utf8');return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')}
function importSpec(from,to){let spec=relative(dirname(from),to).split(sep).join('/');return spec.startsWith('.')?spec:'./'+spec}
function walk(dir,out=[]){for(const d of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,d.name);if(d.isDirectory())walk(p,out);else if(d.isFile()&&['.mjs','.js','.html','.yml','.yaml'].includes(extname(p)))out.push(p)}return out}
test('Stage J preserves exact 35 original barrier/boost Git blobs after only import rebases',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(entries.length,35);
 assert.equal(entries.filter(([name])=>name.startsWith('aero-barrier-')).length,24);
 assert.equal(entries.filter(([name])=>name.startsWith('boost-')).length,11);
 for(const [name,{destination,originalGitBlobSha}] of entries){
  assert.equal(existsSync(resolve(root,name)),false,'Unmoved old root module '+name);
  const relocated=resolve(root,destination);assert.ok(existsSync(relocated),'Missing relocated module '+name);
  const source=restoreEF02H(readFileSync(relocated,'utf8'),relocated);
  const reconstructed=source.replace(/(["'])(\.{1,2}\/[^"'\r\n]+)\1/g,(ent,quote,spec)=>{
   const pure=spec.split(/[?#]/)[0],suffix=spec.slice(pure.length);
   const current=resolve(dirname(relocated),pure);
   assert.ok(existsSync(ef02hCurrentPath(current)),'Unresolved Stage J ESM/file reference '+name+' -> '+spec);
   const oldTarget=originalAbs.get(current)||current;
   return quote+importSpec(resolve(root,name),oldTarget)+suffix+quote;
  });
  assert.equal(hash(reconstructed),originalGitBlobSha,'Unexpected runtime logic/graphics change in '+name);
 }
});
test('Stage J leaves no stale root references in executable sources or workflow checks',()=>{
 const candidates=[...walk(root),...walk(resolve(repo,'.github/workflows'))];
 assert.ok(candidates.length>200,'Incomplete executable source audit');
 for(const path of candidates){
  if(path===fileURLToPath(import.meta.url))continue;
  const src=readFileSync(path,'utf8');
  for(const name of originalNames)assert.ok(!src.includes('skyshift/'+name),'Stale workflow/command path '+name+' in '+relative(repo,path));
  for(const match of src.matchAll(/["'](\.{1,2}\/[^"'\r\n]+)["']/g)){
   const target=resolve(dirname(path),match[1].split(/[?#]/)[0]);
   assert.ok(!originalNames.has(relative(root,target)),'Stale root import '+relative(repo,path)+' -> '+match[1]);
  }
 }
});
