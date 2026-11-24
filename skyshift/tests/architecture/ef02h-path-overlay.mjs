import {restoreEF02I} from './ef02i-path-overlay.mjs';
// Reverse only manifest-approved EF02H path edits, checking exact pre-migration identity.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const m=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02h-track-geometry-ownership.json'),'utf8'));
const sha=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')};
export function restoreEF02H(source,path){
 source=restoreEF02I(source,path);
 const key=relative(repo,resolve(repo,path)).replaceAll('\\','/');
 const c=m.consumers.find(x=>x.path===key);
 if(!c)return source;
 let s=source;
 for(const e of [...c.edits].reverse()){
  assert.equal(s.split(e.after).length-1,e.count,key+' '+e.after);
  assert.ok(!s.includes(e.before),key+' '+e.before);
  s=s.split(e.after).join(e.before);
 }
 assert.equal(sha(s),c.sha,key+' EF02H inverse');
 return s;
}
export function ef02hCurrentPath(path){
 const key=relative(repo,resolve(repo,path)).replaceAll('\\','/');
 const move=m.moves.find(x=>x.oldPath===key);
 return move?resolve(repo,move.newPath):path;
}
