// Historical path-only reconstruction; no live resolution fallback.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
export const premiumManifest=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02-closure-premium-moves.json'),'utf8'));
const key=p=>relative(repo,resolve(repo,p)).replaceAll('\\','/');
const byTarget=new Map(premiumManifest.records.map(r=>[r.target,r]));
const byPath=new Map(premiumManifest.records.map(r=>[r.path,r]));
const moves=new Map(premiumManifest.moves.map(r=>[r.path,r]));
export function premiumPreviousPath(p){return resolve(repo,byTarget.get(key(p))?.path||key(p));}
export function premiumCurrentPath(p){const m=moves.get(key(p));return m?resolve(repo,m.target):p;}
export function restorePremiumMove(s,p){
 const r=byTarget.get(key(p))||byPath.get(key(p));if(!r)return s;
 for(const e of [...r.edits].reverse()){
  assert.equal(s.split(e.after).length-1,e.count,r.path+' premium inverse '+e.after);
  if(!e.after.includes(e.before))assert.ok(!s.includes(e.before),r.path+' stale premium reference '+e.before);
  s=s.split(e.after).join(e.before);
 }
 const b=Buffer.from(s);
 assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),r.sha,r.path+' pre-premium identity');
 return s;
}
export function premiumHistoricalExists(p){
 const m=moves.get(key(p));if(!m)return null;
 assert.ok(!existsSync(resolve(repo,m.path)),m.path);
 const t=resolve(repo,m.target);restorePremiumMove(readFileSync(t,'utf8'),t);return true;
}
