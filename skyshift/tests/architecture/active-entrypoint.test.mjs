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
  const {poseAt,widthAt,positionAt,surfaceNormalAt,GUARDRAIL,CIRCUIT}=await import('./tracks/trials/trial-v0165.mjs');
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


// EF02J: retain the complete historical time-trial behavior suite against the
// current time-trial implementation before retiring any old test or source.
// The existing cross-track process probe above remains mandatory.
{
const {
 TIME_TRIAL_0160,GHOST_TOGGLE_KEY,formatTrialTime,formatTrialDelta,
 createTimeTrialState,startTimeTrial,captureTimeTrialSample,
 finishTimeTrial,validateGhost,loadPersonalGhost,savePersonalGhost,
 clearPersonalGhost,readGhostEnabled,saveGhostEnabled,
 ghostPoseAt,ghostTimeAtDistance,updateGhostDelta,ghostAudit
}=await import('../../time-trial-v0160.mjs');
const {ghostGeometryData,GHOST_VISUAL_0130,createPersonalGhostVisual}=await import('../../ghost-visual-v0130.mjs');
function memory(){
 const db=new Map();
 return {db,getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v)),
  removeItem:k=>db.delete(k)};
}
function fixture(store,{duration=151,ship="stingray",grounded=true}={}){
 const st=createTimeTrialState();
 startTimeTrial(st,{mode:"time-trial",storage:store,ship});
 const laps=[65,47,39].map(x=>x*duration/151);
 const intervals=Math.round(duration*10);
 for(let i=0;i<=intervals;i++){
  const t=duration*i/intervals,s=5+(TIME_TRIAL_0160.raceMeters-5)*i/intervals;
  const yaw=i%400===0?3.13:3.13-.001*i;
  captureTimeTrialSample(st,{elapsed:t,s,worldX:s*.6,
   worldZ:s*.35+12*Math.sin(t/8),y:1.5+Math.sin(t*.3)*.9,
   heading:yaw,roll:.2*Math.sin(t*.15),
   pitch:.05*Math.sin(t*.13)});
 }
 captureTimeTrialSample(st,{elapsed:duration,
  s:TIME_TRIAL_0160.raceMeters,worldX:6120,
  worldZ:3560,y:1.2,heading:0,roll:0,pitch:0},{force:true});
 const result=finishTimeTrial(st,{won:true,elapsed:duration,laps,
  falls:grounded?0:1,storage:store});
 return {st,result,stored:loadPersonalGhost(store)};
}
test("current ghost: Time Trial is an actual independent three lap mode",()=>{
 const st=createTimeTrialState(),store=memory();
 startTimeTrial(st,{storage:store,mode:"standard",ship:"stingray"});
 assert.equal(st.mode,"standard");
 assert.equal(st.previousBest,null);
 assert.equal(captureTimeTrialSample(st,{elapsed:1,s:100}),false);
 assert.equal(finishTimeTrial(st,{won:true,elapsed:151}),null);
 startTimeTrial(st,{storage:store,mode:"time-trial",ship:"stingray"});
 assert.equal(st.mode,"time-trial");
 assert.equal(st.active.ship,"stingray");
 assert.equal(TIME_TRIAL_0160.timeTrialSameFlightPhysics,true);
});
test("current ghost: three laps record a locally saved valid real trajectory",()=>{
 const store=memory(),x=fixture(store);
 assert.equal(x.result.saved,true);
 assert.equal(x.result.improved,true);
 assert.ok(x.st.samplesWritten>1200);
 assert.ok(x.st.samplesWritten<3600);
 assert.equal(x.st.invalidSamples,0);
 assert.ok(x.stored);
 assert.equal(x.stored.duration,151);
 assert.equal(x.stored.laps.length,3);
 assert.equal(x.stored.ship,"stingray");
 assert.ok(store.db.get(TIME_TRIAL_0160.storageKey).length<
  TIME_TRIAL_0160.maxStorageChars);
 assert.ok(x.stored.samples.at(-1)[1]>=10200-1);
});
test("current ghost: recording detects real lateral lines and ghost interpolates in space",()=>{
 const x=fixture(memory()),g=x.stored;
 const h=ghostPoseAt(g,74.37);
 assert.ok(Math.abs(h.worldZ-h.s*.35)>1,"ghost preserves pilot lateral deviation");
 const a=ghostPoseAt(g,74.30),b=ghostPoseAt(g,74.40);
 assert.ok(h.worldX>a.worldX&&h.worldX<b.worldX);
 assert.equal(ghostPoseAt(g,g.duration+.001),null);
 assert.equal(ghostPoseAt(null,20),null);
 assert.ok(Math.abs(ghostTimeAtDistance(g,5102.5)-75.5)<.25);
});
test("current ghost: same-distance delta never compares progress at unequal checkpoints",()=>{
 const store=memory(),x=fixture(store);
 startTimeTrial(x.st,{mode:"time-trial",storage:store,ship:"manta"});
 const ahead=updateGhostDelta(x.st,{distance:5102.5,elapsed:73});
 const behind=updateGhostDelta(x.st,{distance:5102.5,elapsed:79});
 assert.ok(ahead<0&&behind>0);
 assert.ok(x.st.peakDeltaAhead>=2);
 assert.ok(x.st.peakDeltaBehind>=3);
 assert.ok(ghostAudit(x.st).hasPersonalBest);
});
test("current ghost: slower second run cannot replace PB, faster clean run does",()=>{
 const store=memory();fixture(store,{duration:151});
 const slow=fixture(store,{duration:161});
 assert.equal(slow.result.saved,false);
 assert.equal(slow.result.reason,"slower");
 assert.equal(loadPersonalGhost(store).duration,151);
 const fast=fixture(store,{duration:144});
 assert.equal(fast.result.saved,true);
 assert.equal(loadPersonalGhost(store).duration,144);
});
test("current ghost: incomplete race, crash or damaged trajectory never overwrite saved ghost",()=>{
 const store=memory();fixture(store);
 const crash=fixture(store,{duration:138,grounded:false});
 assert.equal(crash.result.saved,false);
 assert.equal(crash.result.reason,"ineligible");
 assert.equal(loadPersonalGhost(store).duration,151);
 const partial=createTimeTrialState();
 startTimeTrial(partial,{mode:"time-trial",storage:store});
 captureTimeTrialSample(partial,{elapsed:0,s:5,worldX:0,y:0,worldZ:0,heading:0});
 assert.equal(finishTimeTrial(partial,{won:false,elapsed:150,laps:[60,50,40],storage:store}).saved,false);
 assert.equal(loadPersonalGhost(store).duration,151);
});
test("current ghost: crash/checkpoint backwards invalidates compact distance trace",()=>{
 const st=createTimeTrialState();startTimeTrial(st,{mode:"time-trial"});
 assert.equal(captureTimeTrialSample(st,{elapsed:0,s:5,
   worldX:0,y:0,worldZ:0,heading:0}),true);
 assert.equal(captureTimeTrialSample(st,{elapsed:.2,s:15,
   worldX:10,y:0,worldZ:0,heading:0}),true);
 assert.equal(captureTimeTrialSample(st,{elapsed:.4,s:7,
   worldX:4,y:0,worldZ:0,heading:0}),false);
 assert.equal(st.invalidSamples,1);
});
test("current ghost: corrupted / wrong-track local data is rejected without crashing",()=>{
 const store=memory(),x=fixture(store);
 for(const bad of ['{bad',JSON.stringify({...x.stored,track:"other-track"}),
  JSON.stringify({...x.stored,samples:[...[...x.stored.samples].slice(0,2),
  ["bad"]]}),'x'.repeat(TIME_TRIAL_0160.maxStorageChars+1)]){
  store.setItem(TIME_TRIAL_0160.storageKey,bad);
  assert.equal(loadPersonalGhost(store),null);
 }
 assert.equal(validateGhost({...x.stored,samples:null}),null);
 const broken={getItem(){throw Error("restricted")},setItem(){throw Error("restricted")}};
 assert.equal(loadPersonalGhost(broken),null);
 assert.equal(savePersonalGhost(broken,x.stored),false);
});
test("current ghost: ghost visibility preference is independently persisted; OFF is not deletion",()=>{
 const store=memory();fixture(store);
 assert.equal(readGhostEnabled(store),true);
 assert.equal(saveGhostEnabled(store,false),true);
 assert.equal(store.db.get(GHOST_TOGGLE_KEY),"off");
 assert.equal(readGhostEnabled(store),false);
 assert.ok(loadPersonalGhost(store));
 assert.equal(saveGhostEnabled(store,true),true);
 assert.equal(readGhostEnabled(store),true);
 assert.equal(clearPersonalGhost(store),true);
 assert.equal(loadPersonalGhost(store),null);
});
test("current ghost: format uses centiseconds and conventional signed delta",()=>{
 assert.equal(formatTrialTime(65.899),"01:05.89");
 assert.equal(formatTrialTime(151),"02:31.00");
 assert.equal(formatTrialTime(-1),"--:--.--");
 assert.equal(formatTrialDelta(-1.245),"−1.25");
 assert.equal(formatTrialDelta(2.1),"+2.10");
 assert.equal(formatTrialDelta(null),"—");
});
test("current ghost: ghost mesh is tiny, readable and never creates lights or colliders",()=>{
 const g=ghostGeometryData();
 assert.ok(g.triangles>10&&g.triangles<80);
 assert.equal(g.body.length%9,0);
 assert.equal(g.edge.length%9,0);
 assert.ok([...g.body,...g.edge].every(Number.isFinite));
 assert.equal(GHOST_VISUAL_0130.drawCalls,2);
 assert.equal(GHOST_VISUAL_0130.colliders,0);
 assert.equal(GHOST_VISUAL_0130.extraLights,0);
 assert.equal(GHOST_VISUAL_0130.noRoadCenterlineApproximation,true);
});
test("current ghost: data audit excludes bulky samples and records actual ghost state",()=>{
 const x=fixture(memory());const a=ghostAudit(x.st);
 assert.equal("samples" in a,false);
 assert.equal(a.savedNewBest,true);
 assert.equal(a.samplingHz,10);
 assert.equal(a.physicalFlightUnchanged,true);
 assert.equal(a.maxGhostDrawCalls,2);
});

test('live ghost renderer consumes current recorded pose and hides or disposes without adding lights',()=>{
 class Geometry {
  setAttribute(name,value){this[name]=value}
  computeVertexNormals(){}
  computeBoundingSphere(){}
  dispose(){this.disposed=true}
 }
 class Attribute {constructor(array,itemSize){this.array=array;this.itemSize=itemSize}}
 class Material {constructor(options){Object.assign(this,options)}dispose(){this.disposed=true}}
 class Mesh {constructor(geometry,material){this.geometry=geometry;this.material=material}}
 class Group {
  constructor(){this.children=[];this.position={set:(...v)=>{this.xyz=v}};this.rotation={set:(...v)=>{this.angles=v}}}
  add(...children){this.children.push(...children)}
  removeFromParent(){this.removed=true}
 }
 const THREE={BufferGeometry:Geometry,Float32BufferAttribute:Attribute,MeshBasicMaterial:Material,Mesh,Group,AdditiveBlending:3,DoubleSide:2};
 const scene={children:[],add(x){this.children.push(x)}};
 const visual=createPersonalGhostVisual(THREE,scene);
 const {stored:best}=fixture(memory());
 assert.equal(scene.children.length,1);
 const group=scene.children[0];
 assert.equal(group.children.length,2);
 assert.ok(group.children.every(m=>m instanceof Mesh&&m.material.depthWrite===false&&m.castShadow!==true&&m.receiveShadow!==true));
 assert.equal(group.visible,false);
 // Compare the actual renderer's recorded pose to today's active module, including a yaw wrap.
 for(const elapsed of [0,.15,39.95,40.05,74.37,best.duration]){
  const p=ghostPoseAt(best,elapsed);
  assert.ok(p);
  assert.equal(visual.frame({active:true,enabled:true,best,elapsed}),true);
  assert.deepEqual(group.xyz,[p.worldX,p.y+.20,p.worldZ]);
  assert.deepEqual(group.angles,[p.pitch,-p.heading,p.roll,'XYZ']);
 }
 assert.equal(visual.frame({active:true,enabled:false,best,elapsed:1}),false);
 assert.equal(group.visible,false);
 assert.equal(visual.frame({active:true,enabled:true,best,elapsed:best.duration+.001}),false);
 assert.equal(visual.frame({active:false,enabled:true,best,elapsed:1}),false);
 assert.equal(visual.frame({active:true,enabled:true,best:null,elapsed:1}),false);
 assert.equal(visual.frame({active:true,enabled:true,best,elapsed:1}),true);
 visual.hide();
 assert.equal(group.visible,false);
 const stats=visual.stats();
 assert.equal(stats.ghostSceneObjects,2);
 assert.equal(stats.extraLights,0);
 assert.equal(stats.colliders,0);
 assert.equal(stats.renderPasses,0);
 visual.dispose();
 assert.equal(group.removed,true);
 assert.ok(group.children.every(m=>m.geometry.disposed&&m.material.disposed));
});
}


// EF02J: all supported historical time-trial APIs delegate to the same pure
// playback functions; configuration and persistence remain version-specific.
test('ghost playback shares one implementation across all four Time Trial APIs',async()=>{
 const shared=await import('../../core/ghost-playback.mjs');
 const versions=['0130','0150','0151','0160'];
 const expectedKeys=['skyshift-time-trial-ghost-0130','skyshift-time-trial-ghost-0150','skyshift-time-trial-ghost-0151','skyshift-time-trial-ghost-0151'];
 const expectedRevisions=['skyline-0130-v1','skyline-risk-choice-0150','skyline-risk-diversity-0151','skyline-risk-diversity-0151'];
 const best={duration:2,samples:[
  [0,0,1,2,3,3.13,.2,-.1],
  [1,10,3,4,5,-3.13,.4,.1],
  [2,30,9,8,7,-3,.6,.3]
 ]};
 const ghostSource=readFileSync(at('ghost-visual-v0130.mjs'),'utf8');
 assert.match(ghostSource,/from "\.\/core\/ghost-playback\.mjs"/);
 assert.doesNotMatch(ghostSource,/from "\.\/time-trial-v0130\.mjs"/);
 for(let i=0;i<versions.length;i++){
  const v=versions[i],tt=await import('../../time-trial-v'+v+'.mjs');
  assert.equal(tt.ghostPoseAt,shared.ghostPoseAt);
  assert.equal(tt.ghostTimeAtDistance,shared.ghostTimeAtDistance);
  const config=tt['TIME_TRIAL_'+v];
  assert.equal(config.storageKey,expectedKeys[i]);
  assert.equal(config.trackRevision,expectedRevisions[i]);
  assert.equal(config.raceMeters,10200);
  assert.equal(config.laps,3);
  const out={};const p=tt.ghostPoseAt(best,.5,out);
  assert.equal(p,out);
  assert.deepEqual([p.elapsed,p.s,p.worldX,p.y,p.worldZ],[.5,5,2,3,4]);
  assert.ok(Math.abs(p.heading-Math.PI)<1e-10);
  assert.ok(Math.abs(p.roll-.3)<1e-10);
  assert.ok(Math.abs(p.pitch)<1e-10);
  assert.equal(tt.ghostTimeAtDistance(best,20),1.5);
  assert.equal(tt.ghostTimeAtDistance(best,-1),0);
  assert.equal(tt.ghostTimeAtDistance(best,31),2);
  assert.equal(tt.ghostTimeAtDistance(best,NaN),null);
  assert.equal(tt.ghostPoseAt(best,2.001),null);
  assert.equal(tt.ghostPoseAt(best,-.001),null);
 }
});


test('shared Time Trial preserves all versioned PB APIs, exact payloads and storage boundaries',async()=>{
 const versions=['0130','0150','0151','0160'];
 const tt=await Promise.all(versions.map(v=>import('../../time-trial-v'+v+'.mjs')));
 const {createTimeTrialAPI}=await import('../../core/time-trial.mjs');
 const cfg=tt.map((m,i)=>m['TIME_TRIAL_'+versions[i]]);
 const keys=cfg.map(c=>c.storageKey);
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const capture=(m,c,duration=150)=>{
  const st=m.startTimeTrial(m.createTimeTrialState(),{mode:'time-trial',storage,ship:'manta'});
  for(let i=0;i<=1500;i++){
   const elapsed=duration*i/1500,s=c.raceMeters*i/1500;
   m.captureTimeTrialSample(st,{elapsed,s,worldX:s*.6,y:1.5,worldZ:s*.35+Math.sin(i/8),heading:.5,roll:0,pitch:0});
  }
  return {st,result:m.finishTimeTrial(st,{won:true,elapsed:duration,laps:[duration/3,duration/3,duration/3],storage})};
 };
 const payloads=[];
 for(let i=0;i<tt.length;i++){
  const m=tt[i],c=cfg[i],api=createTimeTrialAPI(c);
  assert.deepEqual(Object.keys(api).sort(),["GHOST_TOGGLE_KEY","captureTimeTrialSample","clearPersonalGhost","createTimeTrialState","finishTimeTrial","formatTrialDelta","formatTrialTime","ghostAudit","loadPersonalGhost","readGhostEnabled","saveGhostEnabled","savePersonalGhost","startTimeTrial","updateGhostDelta","validateGhost"]);
  for(const name of Object.keys(api))assert.equal(typeof m[name],typeof api[name]);
  const prior=new Map(data);
  const {st,result}=capture(m,c);
  // 0151 and default current Skyline intentionally share the old PB fingerprint.
  const expectedPrevious=i===3&&keys[2]===keys[3]&&cfg[2].trackRevision===c.trackRevision;
  assert.equal(result.saved,!expectedPrevious);
  assert.equal(m.loadPersonalGhost(storage).duration,150);
  assert.equal(m.ghostAudit(st).track,c.trackId+'|'+c.trackRevision+'|'+c.raceMeters+'|'+c.laps);
  const raw=data.get(c.storageKey),decoded=JSON.parse(raw);
  assert.equal(decoded.track,m.ghostAudit(st).track);
  for(const [k,v] of prior)if(k!==c.storageKey)assert.equal(data.get(k),v);
  assert.equal(m.validateGhost({...decoded,track:'other-track'}),null);
  const {track,...payload}=decoded;
  payloads.push(payload);
  assert.equal(m.saveGhostEnabled(storage,false),true);
  assert.equal(m.readGhostEnabled(storage),false);
  assert.equal(data.get(c.storageKey),raw);
 }
 for(const p of payloads.slice(1))assert.deepEqual(p,payloads[0]);
 for(const [i,m] of tt.entries()){
  const c=cfg[i],before=new Map(data);
  assert.equal(m.clearPersonalGhost(storage),true);
  assert.equal(m.loadPersonalGhost(storage),null);
  for(const [k,v] of before)if(k!==c.storageKey)assert.equal(data.get(k),v);
 }
});


test('shared Power Carve retains legacy parity and protected track presentation',async()=>{
 const {execFileSync}=await import('node:child_process');
 const probe=async track=>{
  const {default:assert}=await import('node:assert/strict');
  globalThis.location={search:'?track='+track};
  const old=await import('./racing-experience-v0121.mjs');
  const current=await import('./racing-experience-v0160.mjs');
  const {createPowerCarveAPI}=await import('./flight/power-carve.mjs');
  const aurora=track==='aurora';
  const config=current.RACING_0121;
  const shared=createPowerCarveAPI(config,()=>aurora);
  const a=current.createRacingExperience(),b=shared.createRacingExperience(),legacy=old.createRacingExperience();
  const step=(m,st,v)=>m.stepRacingExperience(st,1/120,v);
  const flight={s:0,grounded:true,gripIntensity:.95,steering:.85,yawRate:.7,railContacts:0,elapsed:0};
  const w=config.precisionWindows[0];
  assert.equal(current.raceWindowAt(w.start),0);
  assert.equal(current.raceWindowAt(w.end),-1);
  assert.equal(current.raceWindowAt(w.start+3400),0);
  assert.equal(current.raceRhythmAt(1300),aurora?'SWITCHBACK':'LINK');
  for(let lap=0;lap<2;lap++){
   for(let i=0;i<100;i++){
    flight.s=lap*3400+w.start+1+(w.end-w.start-2)*i/100;
    flight.elapsed+=1/120;
    const before={...flight};
    assert.deepEqual(current.observeRacingStep(a,flight,1/120),shared.observeRacingStep(b,flight,1/120));
    if(!aurora)old.observeRacingStep(legacy,flight,1/120);
    assert.deepEqual(flight,before);
   }
   flight.s=lap*3400+w.end+.1;
   const award=current.observeRacingStep(a,flight,1/120);
   assert.deepEqual(award,shared.observeRacingStep(b,flight,1/120));
   if(!aurora)assert.deepEqual(award,old.observeRacingStep(legacy,flight,1/120));
   assert.equal(award.id,w.id);
   assert.equal(award.lap,lap+1);
  }
  const v={s:w.start+5,steering:.93,yawRate:.78,gripIntensity:1,speed:95,grounded:true,wall:false,corkscrew:false,playing:true};
  for(let i=0;i<100;i++){
   step(current,a,v);step(shared,b,v);if(!aurora)step(old,legacy,v);
  }
  assert.ok(a.gripEnergy>.64);
  assert.ok(Math.abs(a.hullCarve)>.04);
  for(const protectedView of [{grounded:false},{wall:true},{corkscrew:true}]){
   for(let i=0;i<180;i++){
    const frame={...v,...protectedView};
    step(current,a,frame);step(shared,b,frame);if(!aurora)step(old,legacy,frame);
   }
   assert.ok(Math.abs(a.cameraLean)<1e-5);
   assert.ok(Math.abs(a.hullCarve)<1e-5);
   assert.ok(a.fovAddition<.003);
  }
  const before=current.racingExperienceAudit(a);
  step(current,a,{...v,playing:false});
  assert.deepEqual(current.racingExperienceAudit(a),before);
  assert.deepEqual(a,b);
  if(!aurora)assert.deepEqual(a,legacy);
  current.resetRacingExperience(a);
  assert.deepEqual(a,current.createRacingExperience());
 };
 for(const track of ['vault','skyline','aurora']){
  execFileSync(process.execPath,['--input-type=module','-e','await ('+probe.toString()+')('+JSON.stringify(track)+');'],{cwd:root,timeout:30000,stdio:'pipe'});
 }
});
