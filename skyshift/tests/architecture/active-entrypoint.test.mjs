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


// EF02J: run retained rail-spark behavior against the actual shared renderer
// and the current track adapter, instead of obsolete versioned entrypoints.
{
 const {RAIL_SPARKS,railContactPoint,sparkDemand,createSparkState,advanceSparkState,resetSparkState,createRailScrapeSparks}=await import('../../rail-scrape-sparks-v0165.mjs');
const speed=stage=>44*1.11**stage;
test("not near-rail steering; zero emission without REAL physical contact",()=>{
 const scenarios=[
  {contacting:false,side:1,speed:speed(8),scrubIntensity:1},
  {contacting:true,side:0,speed:speed(8),scrubIntensity:1},
  {contacting:true,side:1,grounded:false,speed:speed(8)},
  {contacting:false,side:-1,started:true,speed:speed(8)}
 ];
 for(const info of scenarios){
  const d=sparkDemand(info);
  assert.equal(d.active,false);
  assert.equal(d.burst,0);
  assert.equal(d.rate,0);
 }
 const light=sparkDemand({contacting:true,side:-1,grounded:true,
  speed:speed(1),scrubIntensity:0,started:true});
 const heavy=sparkDemand({contacting:true,side:-1,grounded:true,
  speed:speed(8),scrubIntensity:1,started:true});
 assert.ok(light.burst>=3&&light.burst<=9);
 assert.ok(heavy.burst>light.burst);
 assert.ok(heavy.rate>light.rate);
 assert.ok(heavy.pressure>light.pressure);
});
test("initial impact once, sustained scrape stochastic and old particles fly away",()=>{
 const st=createSparkState(),root=railContactPoint(520,1);
 const info={contacting:true,side:1,grounded:true,speed:speed(8),
  scrubIntensity:1,contactSerial:1};
 advanceSparkState(st,1/60,info,root);
 assert.equal(st.bursts,1);
 assert.ok(st.flash.active,"the impact creates a brief white flash");
 assert.equal(st.impactFlashes,1);
 assert.ok(st.emitted>=8);
 assert.ok(st.live>0);
 const first=st.particles.find(p=>p.active);
 const from={x:first.x,y:first.y,z:first.z};
 for(let i=0;i<15;i++)
  advanceSparkState(st,1/60,info,root);
 assert.equal(st.bursts,1,"continuous rail scraping never retriggers initial burst");
 assert.ok(st.emitted>10,"intermittent flecks keep spawning during scrape");
 assert.ok(st.contactSeconds>.20);
 const beforeEnd=st.emitted;
 const release={contacting:false,side:0,grounded:true,speed:speed(8),
  scrubIntensity:0,contactSerial:1};
 for(let i=0;i<10;i++)advanceSparkState(st,1/60,release,null);
 assert.equal(st.emitted,beforeEnd,"release MUST stop emitter");
 assert.ok(st.travelFrames>0);
 assert.notDeepEqual({x:first.x,y:first.y,z:first.z},from);
 for(let i=0;i<50;i++)advanceSparkState(st,1/60,release,null);
 assert.equal(st.live,0,"flecks die rather than remaining static behind ship");
 assert.equal(st.flash.active,false,"flash must vanish after a fraction of a second");
 assert.equal(st.emitted,beforeEnd);
 assert.equal(st.bursts,1);
 resetSparkState(st);
 assert.equal(st.emitted,0);
 assert.equal(st.peakVisible,0);
 assert.equal(st.impactFlashes,0);
});
test("contact side changes generate an independent new impact on correct wall",()=>{
 const st=createSparkState();
 const right={contacting:true,side:1,grounded:true,
  speed:speed(6),scrubIntensity:.7,contactSerial:1};
 const left={...right,side:-1,contactSerial:2};
 advanceSparkState(st,1/60,right,railContactPoint(520,1));
 const rightEmission=st.emitted;
 advanceSparkState(st,1/60,left,railContactPoint(520,-1));
 assert.equal(st.bursts,2);
 assert.ok(st.emitted>rightEmission);
 assert.equal(st.recentSource.side,-1);
 assert.ok(st.peakVisible<=RAIL_SPARKS.cap);
});
function fakeThree(){
 class Attribute{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.needsUpdate=false}
  setUsage(){return this}
 }
 class Geometry{
  constructor(){this.attributes={};this.drawRange={start:0,count:0}}
  setAttribute(name,attr){this.attributes[name]=attr}
  setDrawRange(start,count){this.drawRange={start,count}}
  dispose(){}
 }
 class Material{constructor(options){Object.assign(this,options)}dispose(){}}
 class Mesh{
  constructor(geometry,material){this.geometry=geometry;this.material=material}
  removeFromParent(){}
 }
 return {BufferAttribute:Attribute,BufferGeometry:Geometry,MeshBasicMaterial:Material,
  Mesh,AdditiveBlending:3,DoubleSide:2,DynamicDrawUsage:1};
}
test("actual batched geometry emits white-gold RGBA streaks and no scene lights",()=>{
 const THREE=fakeThree(),scene={add(x){this.last=x}};
 for(const lowMemory of [false,true]){
  const fx=createRailScrapeSparks(THREE,scene,{lowMemory});
  const camera={position:{x:0,y:7,z:15}};
  const root=railContactPoint(520,1);
  assert.equal(scene.last,fx.mesh);
  const state=fx.state,geo=fx.mesh.geometry;
  assert.equal(geo.attributes.color.itemSize,4);
  assert.equal(geo.attributes.position.itemSize,3);
  assert.equal(fx.mesh.material.blending,THREE.AdditiveBlending);
  assert.equal(fx.mesh.material.fog,false);
  assert.equal(fx.mesh.material.depthWrite,false);
  fx.frame(1/60,{playing:true,camera,railContact:null,
   contacting:false,side:0,speed:speed(8)});
  assert.equal(fx.mesh.visible,false);
  fx.frame(1/60,{playing:true,camera,railContact:root,
   contacting:true,side:1,grounded:true,scrubIntensity:1,speed:speed(8),
   contactSerial:1});
  const loaded=fx.stats();
  assert.equal(loaded.impactBursts,1);
  assert.ok(loaded.activeSparks>0);
  assert.ok(loaded.lastDrawVertices>0);
  assert.equal(loaded.lastDrawVertices,
   loaded.activeSparks*12+RAIL_SPARKS.flashVertices,
   "white contact flash shares the sparks' single draw call");
  assert.ok(loaded.peakParticleWidthMeters>=.048);
  assert.ok(loaded.peakFlashOpacity>.55);
  assert.equal(loaded.impactFlashes,1);
  assert.equal(loaded.flashVisible,true);
  assert.equal(loaded.sparkCoreWhite,true);
  assert.ok(geo.attributes.position.array.some(v=>v!==0));
  assert.ok(geo.attributes.color.array.some((v,i)=>
   i%4===3&&v>.03&&v<1));
  assert.equal(loaded.additiveLightOnly,true);
  assert.equal(loaded.rgbaColorAttribute,4);
  assert.equal(loaded.noExtraLights,true);
  assert.equal(loaded.physicsUnchanged,true);
  for(let k=0;k<42;k++)fx.frame(1/60,{playing:true,camera,
   railContact:null,contacting:false,side:0,speed:speed(8)});
  assert.equal(fx.stats().activeSparks,0);
  assert.equal(fx.stats().flashVisible,false);
  assert.equal(fx.mesh.visible,false);
  fx.frame(1/60,{playing:false,camera});
  assert.equal(fx.stats().emitted,0);
  assert.equal(geo.drawRange.count,0);
  fx.dispose();
  assert.equal(state.cap,lowMemory?52:104);
 }
 assert.equal(RAIL_SPARKS.maxAddedDrawCalls,1);
 assert.equal(RAIL_SPARKS.physicsChanged,false);
 assert.equal(RAIL_SPARKS.colliderChanged,false);
 assert.equal(RAIL_SPARKS.shieldChanged,false);
});
test("visible white cores and brief contact flare never emit without collision",()=>{
 const st=createSparkState(),contact=railContactPoint(520,1);
 const collision={contacting:true,side:1,grounded:true,
  speed:speed(8),scrubIntensity:1,contactSerial:1};
 advanceSparkState(st,1/60,collision,contact);
 const active=st.particles.filter(p=>p.active);
 assert.ok(active.length>=10);
 assert.ok(active.every(p=>p.width>=.048&&p.tail>=.34));
 assert.ok(st.peakParticleWidth>=RAIL_SPARKS.minVisibleCoreWidthMeters);
 assert.ok(st.flash.active);
 assert.ok(Math.abs(st.flash.x-contact.x)<1e-10);
 const count=st.emitted;
 for(let i=0;i<10;i++)advanceSparkState(st,1/60,
  {...collision,contacting:false,side:0},null);
 assert.ok(!st.flash.active);
 assert.equal(st.impactFlashes,1);
 assert.equal(st.emitted,count);
 assert.equal(RAIL_SPARKS.maxAddedDrawCalls,1);
 assert.equal(RAIL_SPARKS.flashVertices,12);
});

}
test('current rail spark contact anchors follow the real rail face on all retained tracks',async()=>{
 const {execFileSync}=await import('node:child_process');
 const probe=async track=>{
  const {default:assert}=await import('node:assert/strict');
  globalThis.location={search:'?track='+track};
  const selection=await import('./tracks/shared/track-selection-v0160.mjs');
  assert.equal(selection.ACTIVE_TRACK_0160.id,track);
  const {poseAt,widthAt,positionAt,surfaceNormalAt,GUARDRAIL,CIRCUIT}=await import('./trial-v0165.mjs');
  const {railContactPoint}=await import('./rail-scrape-sparks-v0165.mjs');
  assert.ok(CIRCUIT.lapLength>0);
  // Sample the entire authored course, not old fixed release coordinates.
  for(let i=0;i<64;i++){
   const s=CIRCUIT.lapLength*(i+.5)/64;
   const p=poseAt(s),n=surfaceNormalAt(s),width=widthAt(s);
   assert.ok(width/2-GUARDRAIL.collisionMargin>0);
   for(const side of [-1,1]){
    const contact=railContactPoint(s,side),lateral=side*(width*.5-.69);
    const expected=positionAt(s,lateral,.68),base=positionAt(s,lateral,0);
    assert.equal(contact.side,side);
    assert.ok([contact.x,contact.y,contact.z].every(Number.isFinite));
    assert.ok(Math.hypot(contact.x-expected.x,contact.y-expected.y,contact.z-expected.z)<1e-6);
    assert.ok(Math.abs((contact.x-base.x)*n.x+(contact.y-base.y)*n.y+(contact.z-base.z)*n.z-.68)<1e-5);
    assert.ok(Math.abs(contact.backwardX+p.forwardX)<1e-9);
    assert.ok(Math.abs(contact.backwardZ+p.forwardZ)<1e-9);
    assert.ok(Math.abs(contact.upX-n.x)+Math.abs(contact.upY-n.y)+Math.abs(contact.upZ-n.z)<1e-8);
   }
   assert.equal(railContactPoint(s,0),null);
  }
 };
 for(const track of ['vault','skyline','aurora']){
  execFileSync(process.execPath,['--input-type=module','-e','await ('+probe.toString()+')('+JSON.stringify(track)+');'],{cwd:root,timeout:30000,stdio:'pipe'});
 }
});
test('live game feeds physics-owned grounded rail contact to shared sparks, and resets/disposes it',()=>{
 const html=readFileSync(at('index.html'),'utf8');
 const entry=html.match(/data-game-module="([^"]+)"/)?.[1];
 assert.ok(entry);
 const game=readFileSync(at(entry),'utf8');
 assert.match(game,/from "\.\/rail-scrape-sparks-v0165\.mjs"/);
 const adapter=readFileSync(at('rail-scrape-sparks-v0165.mjs'),'utf8');
 assert.match(adapter,/from "\.\/rendering\/rail-scrape-sparks\.mjs"/);
 assert.match(game,/createRailScrapeSparks\(THREE,scene/);
 assert.match(game,/railSparks\?\.dispose\(\)/);
 assert.match(game,/railSparks\?\.reset\(\)/);
 assert.match(game,/const sparkSide=flight\.railContacting\?flight\.lastRailSide:0/);
 assert.match(game,/railContact:sparkSide&&view\.grounded\?\s*railContactPoint\(view\.s,sparkSide\):null/);
 assert.match(game,/contacting:flight\.railContacting,side:sparkSide/);
 assert.match(game,/grounded:view\.grounded,speed:flight\.currentSpeed/);
 assert.match(game,/contactSerial:flight\.railContactStarts/);
 assert.match(game,/__skyshiftSparkInfo/);
 assert.match(game,/railScrapeSparks:\{\.\.\.RAIL_SPARKS/);
 assert.match(game,/reactiveWingFlaps\?\.frame\(showroom\?dt:presentationDt/);
 assert.match(game,/livingWake\?\.frame\(presentationDt/);
 assert.doesNotMatch(game,/stepFlight=.*railSpark|const contacted=\s*railSpark/);
});
