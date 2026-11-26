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
// Exact inverse for the active-entrypoint race-session wiring migration.
const raceSessionReaderEdits=[
 {
  "before": "  assert.match(body('enterPlaying','returnToMainMenu'),/selectedRaceMode=currentChallenge\\?\"standard\":\"time-trial\"/);",
  "after": "  const session=readFileSync(at('core/race-session.mjs'),'utf8');\n  assert.match(body('enterPlaying','returnToMainMenu'),/raceSession\\.selectMode\\(currentChallenge\\)/);\n  assert.match(session,/mode=challenge\\?\"standard\":\"time-trial\"/);"
 },
 {
  "before": "  assert.match(app,/startTimeTrial\\(timeTrialState,\\{mode:selectedRaceMode/);",
  "after": "  assert.match(app,/raceSession\\.start\\(activeShipId\\|\\|fleetProgress\\.selected\\)/);\n  assert.match(session,/api\\.startTimeTrial\\(trial,\\{mode,storage:storage\\(\\),ship,ghostEnabled\\}/);"
 },
 {
  "before": "  assert.match(app,/captureTimeTrialSample\\(timeTrialState,p,\\{force\\}\\)/);",
  "after": "  assert.match(app,/raceSession\\.record\\(flight,force\\)/);\n  assert.match(session,/api\\.captureTimeTrialSample\\(trial,pose,\\{force\\}\\)/);"
 },
 {
  "before": "  assert.match(app,/ghostVisual\\?\\.frame\\(\\{active:true,enabled:ghostEnabled/);",
  "after": "  assert.match(app,/ghostVisual\\?\\.frame\\(\\{active:true,enabled:raceSession\\.ghostEnabled/);"
 },
 {
  "before": "  assert.match(app,/finishTimeTrial\\(timeTrialState,\\{won,elapsed:flight\\.elapsed/);",
  "after": "  assert.match(app,/raceSession\\.finish\\(won,flight\\)/);\n  assert.match(session,/api\\.finishTimeTrial\\(trial,\\{won,elapsed:flight\\.elapsed/);"
 },
 {
  "before": "  assert.match(app,/timeTrialState\\.ghostEnabled=ghostEnabled/);\n  assert.match(app,/saveGhostEnabled\\(fleetStorage\\(\\),ghostEnabled\\)/);",
  "after": "  assert.match(app,/raceSession\\.toggleGhost\\(\\)/);\n  assert.match(session,/trial\\.ghostEnabled=ghostEnabled/);\n  assert.match(session,/api\\.saveGhostEnabled\\(storage\\(\\),ghostEnabled\\)/);"
 },
 {
  "before": "  assert.doesNotMatch(leave,/\\b(?:finishTimeTrial|savePersonalGhost|clearPersonalGhost)\\s*\\(/);",
  "after": "  assert.doesNotMatch(leave,/\\b(?:finishTimeTrial|savePersonalGhost|clearPersonalGhost|raceSession\\.finish)\\s*\\(/);"
 }
];
function restoreRaceSessionReader(s,p){
 if(key(p)!=='skyshift/tests/architecture/active-entrypoint.test.mjs')return s;
 for(const e of [...raceSessionReaderEdits].reverse()){
  assert.equal(s.split(e.after).length-1,1,'EF04 race session reader inverse');
  s=s.replace(e.after,e.before);
 }
 return s;
}
const ef08EntryWorkflowEdits=[
  {
    "before": "      - name: Fetch immutable historical test fixtures\n        run: git fetch --no-tags --depth=1 origin 06754fc69e87b23e63b73e1552f99883fadc3897\n",
    "after": "      - name: Fetch immutable historical test fixtures\n        run: |\n          git fetch --no-tags --depth=1 origin 06754fc69e87b23e63b73e1552f99883fadc3897\n          git fetch --no-tags --depth=1 origin 89b1ca990b72a3321303585fa48b924b3e04ed5e\n"
  },
  {
    "before": "          node --check skyshift/game.mjs\n",
    "after": "          node --test skyshift/tests/architecture/ef08-retired-entry-sources.test.mjs\n"
  },
  {
    "before": "          node --check skyshift/game-v0101.mjs\n          node --check skyshift/boot-v0101.js\n          node --check skyshift/tests/browser/legacy/browser-smoke-v0101.mjs\n",
    "after": "          node --check skyshift/tests/browser/legacy/browser-smoke-v0101.mjs\n"
  },
  {
    "before": "          node --check skyshift/game-v0103.mjs\n          node --check skyshift/boot-v0103.js\n          node --check skyshift/tests/browser/legacy/browser-smoke-v0103.mjs\n",
    "after": "          node --check skyshift/tests/browser/legacy/browser-smoke-v0103.mjs\n"
  }
];
export function restoreUiMove(s,p){
 // EF08 archives five obsolete source-only entrypoints, preserving exact older workflow bytes.
 if(key(p)==='.github/workflows/skyshift-tests.yml' && s.includes('node --test skyshift/tests/architecture/ef08-retired-entry-sources.test.mjs')){
  for(const e of [...ef08EntryWorkflowEdits].reverse()){
   assert.equal(s.split(e.after).length-1,1,'EF08 exact entry archive workflow inverse');
   s=s.replace(e.after,()=>e.before);
  }
 }
 const ef08Reader='import {readEF08Source as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";';
 if(s.includes(ef08Reader))s=s.replace(ef08Reader,'import {readFileSync} from "node:fs";');
 // EF05 corrected neon geometry QA is an explicit main push trigger. Reverse
 // only this single path-filter exception before earlier workflow identities.
 if(key(p)==='.github/workflows/skyshift-tests.yml'){
  const trigger="      - 'skyshift/tests/unit/neon-interior-v0212.test.mjs'\n";
  assert.equal(s.split(trigger).length-1,1,'EF05 exact neon aftercheck trigger');
  s=s.replace(trigger,'');
 }
 // EF06 owns the live menu listeners; reverse only those five exact
 // reader-registration edits before the earlier EF04 and EF02 inverses.
 if(key(p)==='skyshift/tests/architecture/active-entrypoint.test.mjs'){
  const edits=[
    {
      "after": "runtimeLifetime\\.listenActive\\(UI\\.settingsOpen,",
      "before": "UI\\.settingsOpen\\.addEventListener\\("
    },
    {
      "after": "runtimeLifetime\\.listenActive\\(UI\\.settingsBack,",
      "before": "UI\\.settingsBack\\.addEventListener\\("
    },
    {
      "after": "runtimeLifetime\\.listenActive\\(UI\\.start,",
      "before": "UI\\.start\\.addEventListener\\("
    },
    {
      "after": "runtimeLifetime\\.listenActive\\(UI\\.pauseGhostToggle,",
      "before": "UI\\.pauseGhostToggle\\.addEventListener\\("
    },
    {
      "after": "runtimeLifetime\\.listenActive\\(UI\\.pauseMenu,",
      "before": "UI\\.pauseMenu\\.addEventListener\\("
    }
  ];
  for(const e of edits){
   assert.equal(s.split(e.after).length-1,1,'EF06 menu listener reader inverse');
   assert.ok(!s.includes(e.before),'EF06 stale menu listener assertion');
   s=s.replace(e.after,e.before);
  }
 }
 // EF05 archival materialization is an exact additive setup change.
 if(key(p)==='.github/workflows/skyshift-tests.yml'){
  const step="      - name: Materialize exact archived station QA assets\n        run: |\n          git fetch --no-tags --depth=1 origin 06754fc69e87b23e63b73e1552f99883fadc3897\n          node skyshift/build/archived-world-assets.mjs --materialize\n";
  assert.equal(s.split(step).length-1,9,'EF05 exact station QA setup count');
  s=s.split(step).join('');
 }
 // EF04 retirement is newer than every historical path migration. Restore its
 // exact workflow edit here, before any historical identity is checked.
 if(key(p)==='.github/workflows/skyshift-tests.yml'){
  const {workflow:w}=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef04-retired-engine.json'),'utf8'));
  assert.equal(w.path,key(p),'EF04 workflow path');
  assert.equal(s.split(w.after).length-1,1,'EF04 workflow inverse anchor');
  assert.ok(!s.includes(w.before),'EF04 stale retired syntax command');
  s=s.replace(w.after,w.before);
  const data=Buffer.from(s);
  assert.equal(createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex'),w.previousSha,'EF04 exact workflow inverse');
 }
 if(key(p)==='skyshift/tests/architecture/active-entrypoint.test.mjs')for(const e of [
  {
    "before": " assert.match(game,/__skyshiftSparkInfo/);",
    "after": " assert.match(game,/installRaceQa\\(/);\n assert.match(readFileSync(at('qa/race-probes.mjs'),'utf8'),/__skyshiftSparkInfo/);"
  },
  {
    "before": "/ghostVisual\\?\\.hide\\(\\)/,/UI\\.trialHud",
    "after": "/ctx\\.hideGhost\\(\\)/,/UI\\.trialHud"
  },
  {
    "before": "  const leave=body('returnToMainMenu','pause');",
    "after": "  assert.match(body('returnToMainMenu','pause'),/raceLifecycle\\.returnToMainMenu\\(\\)/);\n  const leave=lifecycle.slice(lifecycle.indexOf('function returnToMainMenu('),lifecycle.indexOf('function pause('));"
  },
  {
    "before": "  assert.match(body('enterPlaying','returnToMainMenu'),/raceSession\\.selectMode\\(currentChallenge\\)/);",
    "after": "  const lifecycle=readFileSync(at('core/race-lifecycle.mjs'),'utf8');\n  assert.match(body('enterPlaying','returnToMainMenu'),/raceLifecycle\\.enterPlaying\\(challenge\\)/);\n  assert.match(lifecycle,/raceSession\\.selectMode\\(ctx\\.currentChallenge\\)/);"
  }
]){
  assert.equal(s.split(e.after).length-1,1,'EF04 lifecycle/QA reader inverse');s=s.replace(e.after,e.before);
 }
 s=restoreRaceSessionReader(s,p);
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
