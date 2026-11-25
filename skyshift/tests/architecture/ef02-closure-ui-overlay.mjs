// UI ownership: exact reversible source records, historical checks only.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
export const uiManifest=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02-closure-ui-moves.json'),'utf8'));
const key=p=>relative(repo,resolve(repo,p)).replaceAll('\\','/');
const byTarget=new Map(uiManifest.records.map(r=>[r.target,r]));
const byPath=new Map(uiManifest.records.map(r=>[r.path,r]));
const moves=new Map(uiManifest.moves.map(r=>[r.path,r]));
export function uiPreviousPath(p){return resolve(repo,byTarget.get(key(p))?.path||key(p));}
export function uiCurrentPath(p){const m=moves.get(key(p));return m?resolve(repo,m.target):p;}
export function restoreUiMove(s,p){
 const r=byTarget.get(key(p))||byPath.get(key(p));if(!r)return s;
 for(const e of [...r.edits].reverse()){
  assert.equal(s.split(e.after).length-1,e.count,r.path+' UI inverse '+e.after);
  if(!e.after.includes(e.before))assert.ok(!s.includes(e.before),r.path+' stale UI reference '+e.before);
  s=s.split(e.after).join(e.before);
 }
 const b=Buffer.from(s);assert.equal(createHash('sha1').update('blob '+b.length).update(Buffer.from([0])).update(b).digest('hex'),r.sha,r.path+' pre-UI identity');
 return s;
}
export function uiHistoricalExists(p){
 const m=moves.get(key(p));if(!m)return null;
 assert.ok(!existsSync(resolve(repo,m.path)),m.path);
 const t=resolve(repo,m.target);restoreUiMove(readFileSync(t,'utf8'),t);return true;
}
