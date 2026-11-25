import {restoreUiMove,uiPreviousPath,uiCurrentPath,uiHistoricalExists} from './ef02-closure-ui-overlay.mjs';
// Exact reversible live physics ownership migration, historical checks only.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
export const trialManifest=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02-closure-trial-moves.json'),'utf8'));
const key=p=>relative(repo,resolve(repo,p)).replaceAll('\\','/');
const byTarget=new Map(trialManifest.records.map(r=>[r.target,r]));
const byPath=new Map(trialManifest.records.map(r=>[r.path,r]));
const moves=new Map(trialManifest.moves.map(r=>[r.path,r]));
export function trialPreviousPath(p){p=uiPreviousPath(p);return resolve(repo,byTarget.get(key(p))?.path||key(p));}
export function trialCurrentPath(p){const m=moves.get(key(p));return uiCurrentPath(m?resolve(repo,m.target):p);}
export function restoreTrialMove(s,p){
 s=restoreUiMove(s,p);p=uiPreviousPath(p);
 const r=byTarget.get(key(p))||byPath.get(key(p));if(!r)return s;
 for(const e of [...r.edits].reverse()){
  assert.equal(s.split(e.after).length-1,e.count,r.path+' trial inverse '+e.after);
  if(!e.after.includes(e.before))assert.ok(!s.includes(e.before),r.path+' stale trial reference '+e.before);
  s=s.split(e.after).join(e.before);
 }
 const b=Buffer.from(s);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),r.sha,r.path+' pre-trial identity');
 return s;
}
export function trialHistoricalExists(p){
 const m=moves.get(key(p));if(!m)return uiHistoricalExists(p);
 assert.ok(!existsSync(resolve(repo,m.path)),m.path);
 const t=resolve(repo,m.target);restoreTrialMove(readFileSync(t,'utf8'),t);return true;
}
