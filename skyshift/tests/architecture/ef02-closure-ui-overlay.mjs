// UI ownership: exact reversible source records, historical checks only.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
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
// The live game is now intentionally mutable under EF04. Historical migration
// identity is evaluated against the exact accepted EF03 baseline, never against
// a substitute current implementation. All other migration records stay strict.
export const historicalGameCommit='89b1ca990b72a3321303585fa48b924b3e04ed5e';
export const historicalGameSha='615e2f0ae14bd630ba1780281f4f67b977579e0d';
let historicalGame;
export function readHistoricalGameMigrationSource(){
 if(historicalGame===undefined){
  const data=execFileSync('git',['show',historicalGameCommit+':skyshift/game-v0210.mjs'],{cwd:repo,maxBuffer:2*1024*1024});
  assert.equal(createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex'),historicalGameSha,'Accepted EF03 game baseline Git identity');
  historicalGame=data.toString('utf8');
 }
 return historicalGame;
}
export function restoreUiMove(s,p){
 const r=byTarget.get(key(p))||byPath.get(key(p));if(!r)return s;
 if(r.path==='skyshift/game-v0210.mjs')s=readHistoricalGameMigrationSource();
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
