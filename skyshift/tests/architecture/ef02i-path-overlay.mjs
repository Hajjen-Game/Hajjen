import {premiumHistoricalExists} from './ef02-closure-premium-overlay.mjs';
import {restoreDeckMove,deckCurrentPath} from './ef02-closure-deck-overlay.mjs';
// EF02I: reverse only declared path edits and verify original Git identity.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
export const ef02iManifest=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02i-legacy-rendering-ownership.json'),'utf8'));
const ef02j=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02j-retired-visual-leaves.json'),'utf8'));
const key=p=>relative(repo,resolve(repo,p)).replaceAll('\\','/');
const hash=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
export function restoreEF02I(source,path){
 source=restoreDeckMove(source,path);
 const k=key(path);
 // Retired historical premium adapters are verified by the closed-cohort Git archive, not reconstructed from live obsolete sources.
 if(k===ef02j.workflow.path){
  // Only reconstruct the two archived syntax-only commands for historical hash evidence.
  for(const x of [...ef02j.workflow.edits].reverse()){
   assert.equal(source.split(x.after).length-1,1,k+' EF02J anchor');
   assert.ok(!source.includes(x.before),k+' stale EF02J command');
   source=source.replace(x.after,x.before);
  }
  assert.equal(hash(source),ef02j.workflow.sha,k+' EF02J workflow inverse');
 }
 const e=ef02iManifest.consumers.find(x=>x.path===k)||ef02iManifest.moves.find(x=>x.newPath===k);
 if(!e)return source;
 let s=source;
 for(const x of [...e.edits].reverse()){
  assert.equal(s.split(x.after).length-1,x.count,k+' '+x.after);
  assert.ok(!s.includes(x.before),k+' '+x.before);
  s=s.split(x.after).join(x.before);
 }
 assert.equal(hash(s),e.sha,k+' EF02I inverse');
 return s;
}
export function ef02iHistoricalExists(path){
 const move=ef02iManifest.moves.find(x=>x.oldPath===key(path));
 if(!move)return premiumHistoricalExists(path);
 assert.ok(!existsSync(resolve(repo,move.oldPath)),move.oldPath);
 restoreEF02I(readFileSync(resolve(repo,move.newPath),'utf8'),move.newPath);
 return true;
}
