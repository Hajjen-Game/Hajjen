// Historical station art is recovered from the immutable Git archive only.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../',import.meta.url));
export const worldArchive=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef05-retired-world-assets.json'),'utf8'));
assert.equal(worldArchive.archiveCommit,'06754fc69e87b23e63b73e1552f99883fadc3897');
assert.equal(worldArchive.files.length,8);
export function readArchivedWorldAsset(path){
 const key=path instanceof URL?relative(repo,fileURLToPath(path)):path;
 const entry=worldArchive.files.find(f=>f.path===key);
 assert.ok(entry,'Not an approved archived station asset: '+key);
 const data=execFileSync('git',['show',worldArchive.archiveCommit+':'+entry.path],{cwd:repo,maxBuffer:2*1024*1024});
 assert.equal(data.length,entry.bytes,entry.path+' archive bytes');
 assert.equal(createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex'),entry.sha,entry.path+' archive Git identity');
 const gltf=JSON.parse(data.toString('utf8'));
 for(const item of [...(gltf.buffers||[]),...(gltf.images||[])])if(item.uri)assert.ok(item.uri.startsWith('data:'),entry.path+' must be self-contained');
 return data;
}
export function archivedWorldAssetExists(path){
 const key=relative(repo,resolve(path));
 if(!worldArchive.files.some(f=>f.path===key))return false;
 assert.ok(!existsSync(path),'Retired asset unexpectedly present: '+key);
 readArchivedWorldAsset(key);return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv[2],'--materialize','Use --materialize only in historical QA checkout');
 for(const f of worldArchive.files){
  const dest=resolve(repo,f.path),data=readArchivedWorldAsset(f.path);
  mkdirSync(dirname(dest),{recursive:true});
  if(existsSync(dest))assert.deepEqual(readFileSync(dest),data);
  else writeFileSync(dest,data,{flag:'wx'});
 }
 console.log('SKYSHIFT archived station fixtures materialized: '+worldArchive.files.length);
}
