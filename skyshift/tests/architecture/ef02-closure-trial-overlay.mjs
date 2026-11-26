import {restoreUiMove,uiPreviousPath,uiCurrentPath,uiHistoricalExists} from './ef02-closure-ui-overlay.mjs';
// Exact reversible live physics ownership migration, historical checks only.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
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
// EF04 deliberately changes the active trial into a track adapter. Preserve the
// historical inverse proof against the accepted EF03 Git object only.
export const historicalTrialCommit='89b1ca990b72a3321303585fa48b924b3e04ed5e';
export const historicalTrialSha='cc3fefd138bb250e5aaf2599c181c5c163afd7c0';
let historicalTrial;
export function readHistoricalTrialMigrationSource(){
 if(historicalTrial===undefined){
  const data=execFileSync('git',['show',historicalTrialCommit+':skyshift/tracks/trials/trial-v0165.mjs'],{cwd:repo,maxBuffer:2*1024*1024});
  assert.equal(createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex'),historicalTrialSha,'Accepted EF03 flight source identity');
  historicalTrial=data.toString('utf8');
 }
 return historicalTrial;
}
// Exact inverse of EF04 test-source ownership changes; retain all pre-EF04
// hash assertions and reject any unrelated change to these historical readers.
const ef04ReaderEdits=[
 {
  "path": "skyshift/tests/unit/grip-trick-lock-v0165.test.mjs",
  "edits": [
   {
    "before": " const f=src(\"./tracks/trials/trial-v0165.mjs\");",
    "after": " const f=src(\"./flight/flight-physics.mjs\");"
   },
   {
    "before": " const physics=f.slice(f.indexOf(\"export function stepFlight(\"));",
    "after": " const start=f.indexOf(\"function stepFlight(\");\n assert.ok(start>=0,\"Shared physics implementation must exist\");\n const physics=f.slice(start);"
   }
  ]
 },
 {
  "path": "skyshift/tests/unit/track-physics-parity-v0165.test.mjs",
  "edits": [
   {
    "before": " const integration=code.slice(code.indexOf(\"export function stepFlight(\"));",
    "after": " const engine=source(\"./flight/flight-physics.mjs\");\n const start=engine.indexOf(\"function stepFlight(\");\n assert.ok(start>=0,\"Shared physics implementation must exist\");\n const integration=engine.slice(start);"
   }
  ]
 }
];
function restoreEF04Reader(s,p){
 const record=ef04ReaderEdits.find(x=>x.path===key(p));
 if(!record)return s;
 for(const e of [...record.edits].reverse()){
  // Historical inverse callers can hand us an already restored reader.
  if(s.includes(e.before)&&!s.includes(e.after))continue;
  assert.equal(s.split(e.after).length-1,1,record.path+' EF04 reader inverse');
  s=s.replace(e.after,e.before);
 }
 return s;
}
export function restoreTrialMove(s,p){
 s=restoreEF04Reader(s,p);
 s=restoreUiMove(s,p);p=uiPreviousPath(p);
 const r=byTarget.get(key(p))||byPath.get(key(p));if(!r)return s;
 if(r.target==='skyshift/tracks/trials/trial-v0165.mjs')s=readHistoricalTrialMigrationSource();
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
