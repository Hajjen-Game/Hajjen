import {restorePremiumMove,premiumPreviousPath,premiumCurrentPath,premiumHistoricalExists} from './ef02-closure-premium-overlay.mjs';
// EF02 closure: reversible import/path-only migration evidence. No live import fallback.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
export const deckMoveManifest=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02-closure-deck-moves.json'),'utf8'));
const key=p=>relative(repo,resolve(repo,p)).replaceAll('\\','/');
const records=new Map(deckMoveManifest.records.map(x=>[x.target,x]));
const moves=new Map(deckMoveManifest.moves.map(x=>[x.path,x]));
export const deckBlobHash=s=>{const bytes=Buffer.from(s);return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');};
export function restoreDeckMove(source,path){
 source=restorePremiumMove(source,path);
 path=premiumPreviousPath(path);
 const record=records.get(key(path))||deckMoveManifest.records.find(x=>x.path===key(path));
 if(!record)return source;
 let result=source;
 for(const e of [...record.edits].reverse()){
  assert.equal(result.split(e.after).length-1,e.count,record.path+' closure replacement '+e.after);
  if(!e.after.includes(e.before))assert.ok(!result.includes(e.before),record.path+' stale closure path '+e.before);
  result=result.split(e.after).join(e.before);
 }
 assert.equal(deckBlobHash(result),record.sha,record.path+' pre-closure identity');
 return result;
}
export function deckCurrentPath(path){
 const move=moves.get(key(path));
 return move?resolve(repo,move.target):premiumCurrentPath(path);
}
export function deckHistoricalExists(path){
 const move=moves.get(key(path));
 if(!move)return premiumHistoricalExists(path);
 assert.ok(!existsSync(resolve(repo,move.path)),move.path+' stale root deck');
 const target=resolve(repo,move.target);
 restoreDeckMove(readFileSync(target,'utf8'),target);
 return true;
}
