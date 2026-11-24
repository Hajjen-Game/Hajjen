// SKYSHIFT 0.28.9.8 — architecture-only guard.
// Verify that the LIVE GitHub Pages entrypoint can reach its local JS/CSS imports.
// This does not change the game or load WebGL; full visual/flight QA remains mandatory.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import './final-course-reuse-stageN.test.mjs';
import './root-consolidation-inventory.test.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const at = relativePath => resolve(root, relativePath);
const local = specifier => specifier.replace(/[?#].*$/, '');
const codeImportPattern = /\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.[^"']+)["']/g;

function assertContained(file) {
  const rel = relative(root, file);
  assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel),
    'Local import must remain within skyshift/: ' + file);
}

test('live HTML keeps the current stable bootstrap and all local assets resolvable', () => {
  const html = readFileSync(at('index.html'), 'utf8');
  assert.match(html, /data-game-module="game-v0210\.mjs"/);
  for (const id of ['skyline', 'aurora', 'vault']) {
    assert.ok(html.includes('value="' + id + '"'), 'Missing live track picker: ' + id);
  }
  const references = [
    ...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g),
    ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/g)
  ].map(match => match[1]).filter(ref => ref.startsWith('./'));
  assert.ok(references.length > 0, 'No relative HTML assets found');
  for (const ref of references) {
    const asset = resolve(root, local(ref));
    assertContained(asset);
    assert.ok(existsSync(asset), 'HTML asset missing: ' + ref);
  }
});

test('active boot module and all reachable local module imports exist', () => {
  const bootstrap = at('boot-v0210.js');
  const boot = readFileSync(bootstrap, 'utf8');
  const entryMatch = boot.match(/\bimport\s*\(\s*["']\.\/([^"']+\.mjs)(?:\?[^"']*)?["']\s*\)/);
  assert.ok(entryMatch, 'Could not resolve active game entrypoint from bootstrap');
  assert.equal(entryMatch[1], 'game-v0210.mjs', 'Unexpected active game module: review deliberately');

  const visited = new Set();
  const queue = [at(entryMatch[1])];
  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    assertContained(file);
    assert.ok(existsSync(file), 'Module missing: ' + relative(root, file));
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(codeImportPattern)) {
      const target = resolve(dirname(file), local(match[1]));
      assertContained(target);
      assert.ok(existsSync(target), 'Broken import ' + match[1] + ' in ' + relative(root, file));
      if (/\.m?js$/.test(target) && !visited.has(target)) queue.push(target);
    }
  }
  assert.ok(visited.size > 20, 'Unexpectedly small reachable module graph: verify the scanner');
});


// EF02J: protect today's navigation and ghost wiring, not archived release identifiers.
test('live menu, settings and pause expose the supported controls', () => {
  const html=readFileSync(at('index.html'),'utf8');
  const section=id=>{
    const match=html.match(new RegExp('<section\\s+id="'+id+'"[^>]*>([\\s\\S]*?)</section>'));
    assert.ok(match,'Missing section '+id);return match[1];
  };
  const has=(s,id)=>s.includes('id="'+id+'"');
  const menu=section('menu'),settings=section('settings-screen'),pause=section('pause-screen');
  for(const id of ['start-btn','hangar-btn','tt-menu-status'])assert.ok(has(menu,id),id);
  assert.ok(has(html,'menu-settings-btn'));
  assert.match(html,/aria-label="Inställningar"/);
  for(const id of ['fidelity-btn','menu-fullscreen-btn','settings-back-btn','fullscreen-help']){
    assert.ok(has(settings,id),id);assert.ok(!has(menu,id),id+' must live in settings');
  }
  for(const id of ['resume-btn','restart-paused-btn','pause-ghost-toggle','pause-menu-btn'])assert.ok(has(pause,id),id);
  assert.doesNotMatch(html,/id="(?:time-trial-btn|ghost-toggle)"|menu-utility-row|tt-start-row/);
  const styles=[...html.matchAll(/<link\b[^>]*\bhref=["'](\.\/[^"']+\.css)(?:\?[^"']*)?["']/g)]
    .map(m=>readFileSync(at(m[1]),'utf8')).join('\n');
  assert.match(styles,/#app>\.topbar\s*\{\s*z-index:\s*9\b/);
});

test('active game wires default Time Trial, settings and safe ghost abandonment', () => {
  const html=readFileSync(at('index.html'),'utf8');
  const entry=html.match(/data-game-module="([^"]+)"/)?.[1];
  const bootPath=html.match(/<script\b[^>]*src="(\.\/[^"?]+\.js)(?:\?[^"]*)?"[^>]*data-game-module=/)?.[1];
  assert.ok(entry&&bootPath);
  const app=readFileSync(at(entry),'utf8'),boot=readFileSync(at(bootPath),'utf8');
  const body=(name,next)=>{
    const start=app.indexOf('function '+name+'('),end=app.indexOf('function '+next+'(',start+1);
    assert.ok(start>=0&&end>start,name);return app.slice(start,end);
  };
  assert.match(app,/UI\.settingsOpen\.addEventListener\("click",openSettings\)/);
  assert.match(app,/UI\.settingsBack\.addEventListener\("click",closeSettings\)/);
  assert.match(body('openSettings','closeSettings'),/uiState\.mode="settings"/);
  assert.match(body('closeSettings','startImmersiveTrial'),/uiState\.mode="menu"/);
  assert.match(app,/UI\.start\.addEventListener\("click",\(\)=>startImmersiveTrial\(null\)\)/);
  assert.match(body('enterPlaying','returnToMainMenu'),/selectedRaceMode=currentChallenge\?"standard":"time-trial"/);
  assert.match(app,/startTimeTrial\(timeTrialState,\{mode:selectedRaceMode/);
  assert.match(app,/captureTimeTrialSample\(timeTrialState,p,\{force\}\)/);
  assert.match(app,/ghostVisual\?\.frame\(\{active:true,enabled:ghostEnabled/);
  assert.match(app,/finishTimeTrial\(timeTrialState,\{won,elapsed:flight\.elapsed/);
  assert.match(boot,/pendingMode:"time-trial"/);
  assert.doesNotMatch(boot,/time-trial-btn/);
  assert.match(app,/UI\.pauseGhostToggle\.addEventListener\("click"/);
  assert.match(app,/timeTrialState\.ghostEnabled=ghostEnabled/);
  assert.match(app,/saveGhostEnabled\(fleetStorage\(\),ghostEnabled\)/);
  assert.match(app,/UI\.pauseMenu\.addEventListener\("click",returnToMainMenu\)/);
  const leave=body('returnToMainMenu','pause');
  for(const pattern of [/if\(uiState\.mode!=="paused"\)return/,/uiState\.mode="menu"/,/ghostVisual\?\.hide\(\)/,/UI\.trialHud\.classList\.add\("hidden"\)/,/UI\.settingsOpen\.classList\.remove\("hidden"\)/,/resetFlight\(\)/])assert.match(leave,pattern);
  assert.doesNotMatch(leave,/\b(?:finishTimeTrial|savePersonalGhost|clearPersonalGhost)\s*\(/);
});

test('current time-trial module preserves a PB through ghost toggle, abandonment and invalid races on Vault and retained tracks', async () => {
  const {execFileSync}=await import('node:child_process');
  // Fresh process for each track: track selection is currently evaluated at module load.
  const probe=async track=>{
    const {default:assert}=await import('node:assert/strict');
    globalThis.location={search:'?track='+track};
    const selection=await import('./tracks/shared/track-selection-v0160.mjs');
    assert.equal(selection.ACTIVE_TRACK_0160.id,track);
    const tt=await import('./time-trial-v0160.mjs');
    const config=tt.TIME_TRIAL_0160;
    assert.equal(config.trackRevision,selection.ACTIVE_TRACK_0160.trackRevision);
    const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
    const start=()=>tt.startTimeTrial(tt.createTimeTrialState(),{mode:'time-trial',storage,ship:'stingray'});
    const pose=(elapsed,s)=>({elapsed,s,worldX:s*.6,y:1.5,worldZ:s*.35+12*Math.sin(elapsed/8),heading:.5,roll:0,pitch:0});
    const run=(duration,falls=0)=>{
      const st=start(),steps=Math.round(duration*10);
      for(let i=0;i<=steps;i++)tt.captureTimeTrialSample(st,pose(duration*i/steps,config.raceMeters*i/steps));
      return tt.finishTimeTrial(st,{won:true,elapsed:duration,laps:[duration/3,duration/3,duration/3],falls,storage});
    };
    assert.equal(run(150).saved,true);
    const saved=data.get(config.storageKey);
    assert.ok(saved);
    assert.equal(tt.loadPersonalGhost(storage).duration,150);
    assert.equal(tt.saveGhostEnabled(storage,false),true);
    assert.equal(tt.readGhostEnabled(storage),false);
    assert.equal(data.get(config.storageKey),saved);
    const unfinished=start();
    assert.equal(unfinished.previousBest.duration,150);
    tt.captureTimeTrialSample(unfinished,pose(0,0));
    tt.captureTimeTrialSample(unfinished,pose(.2,10));
    // resetFlight calls startTimeTrial, not a PB write.
    tt.startTimeTrial(unfinished,{mode:'time-trial',storage,ship:'stingray',ghostEnabled:false});
    assert.equal(unfinished.active.samples.length,0);
    assert.equal(unfinished.previousBest.duration,150);
    assert.equal(data.get(config.storageKey),saved);
    assert.equal(run(160).saved,false);
    assert.equal(run(140,1).saved,false);
    assert.equal(data.get(config.storageKey),saved);
    assert.equal(run(140).saved,true);
    const pb=tt.loadPersonalGhost(storage);
    assert.equal(pb.duration,140);
    assert.ok(tt.ghostPoseAt(pb,73).worldX>0);
    assert.equal(tt.validateGhost({...pb,track:'wrong-track'}),null);
    assert.equal(tt.saveGhostEnabled(storage,true),true);
    assert.equal(tt.readGhostEnabled(storage),true);
    assert.equal(tt.loadPersonalGhost(storage).duration,140);
  };
  for(const track of ['vault','skyline','aurora']){
    const script='await ('+probe.toString()+')('+JSON.stringify(track)+');';
    execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:root,timeout:30000,stdio:'pipe'});
  }
});
