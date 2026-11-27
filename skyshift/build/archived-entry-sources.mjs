// EF08: read only explicit retired historical entry source blobs, never live imports.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../',import.meta.url));
export const entryArchive=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef08-retired-entry-sources.json'),'utf8'));
assert.equal(entryArchive.schema,1);
assert.match(entryArchive.archiveCommit,/^[a-f0-9]{40}$/);
const files=new Map(entryArchive.files.map(f=>[f.path,f]));
const cache=new Map();
export function readArchivedEntrySource(path){
 const entry=files.get(path);
 assert.ok(entry,'Not an approved archived entry source: '+path);
 assert.ok(!existsSync(resolve(repo,path)),'Retired entry unexpectedly present: '+path);
 if(!cache.has(path)){
  const bytes=execFileSync('git',['show',entryArchive.archiveCommit+':'+path],{cwd:repo,maxBuffer:2*1024*1024});
  assert.equal(bytes.length,entry.bytes,path+' exact archived size');
  assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),entry.sha,path+' exact Git blob identity');
  cache.set(path,bytes);
 }
 return Buffer.from(cache.get(path));
}
