const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {versionFromHTML,monitor}=require('../src/ui/build-freshness.js');
const next=()=>new Promise(resolve=>setImmediate(resolve));

function harness({local='replay-1.0',remote='flow-1.2',menuHidden=false,hidden=false,href='https://example.com/Hajjen/chroma-rush/'}={}){
  const classes=new Set(menuHidden?['hidden']:[]);
  const listeners={};
  const menu={classList:{contains:v=>classes.has(v),add:v=>classes.add(v),remove:v=>classes.delete(v)}};
  const calls=[],replaces=[];
  let callback=null;
  const doc={visibilityState:hidden?'hidden':'visible',
    querySelector:s=>s==='meta[name="chroma-build"]'?{content:local}:null,
    getElementById:s=>s==='menu'?menu:null,
    addEventListener:(name,fn)=>{listeners['document:'+name]=fn}};
  const scope={document:doc,location:{href,replace:u=>replaces.push(u)},
    fetch:async (url,opts)=>{calls.push({url,opts});return{ok:true,text:async()=>'<meta name="chroma-build" content="'+remote+'" />'};},
    addEventListener:(name,fn)=>{listeners[name]=fn},
    MutationObserver:class{constructor(fn){callback=fn} observe(){}}};
  return {scope,doc,menu,calls,replaces,listeners,activateMenu(){classes.delete('hidden');callback?.()},setVisible(){doc.visibilityState='visible';listeners['document:visibilitychange']?.()}};
}

test('build metadata reader extracts the exact HTML release marker',()=>{
  assert.equal(versionFromHTML('<meta name="chroma-build" content="flow-1.2-pages-recovery-1.0" />'),
    'flow-1.2-pages-recovery-1.0');
  assert.equal(versionFromHTML('<html><head></head></html>'),null);
  assert.equal(versionFromHTML(null),null);
});

test('a stale build is checked with no-store and reloaded with unique release query',async()=>{
  const h=harness();
  monitor(h.scope,{minimumIntervalMs:30000,clock:()=>12000});
  await next();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].opts.cache,'no-store');
  assert.match(h.calls[0].url,/[?&]_chroma_probe=12000/);
  assert.equal(h.replaces.length,1);
  assert.ok(h.replaces[0].includes('build=flow-1.2'));
});

test('an up-to-date build never reloads and respects the check interval',async()=>{
  const h=harness({local:'flow-1.2',remote:'flow-1.2'});
  const m=monitor(h.scope,{clock:()=>20000});
  await next();
  assert.equal(h.replaces.length,0);
  await m.check();
  assert.equal(h.calls.length,1);
});

test('a published update never reloads in the middle of a run',async()=>{
  const h=harness({menuHidden:true});
  monitor(h.scope,{minimumIntervalMs:0,clock:()=>22000});
  await next();
  assert.equal(h.calls.length,0);
  h.activateMenu();await next();
  assert.equal(h.calls.length,1);
  assert.equal(h.replaces.length,1);
});

test('a hidden tab never probes; visibility change permits checking',async()=>{
  const h=harness({hidden:true});
  monitor(h.scope,{minimumIntervalMs:0,clock:()=>23000});
  await next();
  assert.equal(h.calls.length,0);
  h.setVisible();await next();
  assert.equal(h.calls.length,1);
});

test('an already-pinned build never loops if a CDN ignores query parameters',async()=>{
  const h=harness({href:'https://example.com/Hajjen/chroma-rush/?build=flow-1.2'});
  monitor(h.scope,{minimumIntervalMs:0,clock:()=>24000});
  await next();
  assert.equal(h.calls.length,1);
  assert.equal(h.replaces.length,0);
});

test('network failure does not block menu or gameplay',async()=>{
  const h=harness();
  h.scope.fetch=async()=>{throw new Error('offline')};
  const m=monitor(h.scope,{clock:()=>25000});
  await next();
  assert.equal(h.replaces.length,0);
  assert.equal(await m.check(),false);
});

test('entrypoint includes build metadata, versioned code and a post-game freshness monitor',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/<meta name="chroma-build" content="original-background-restored-1\.0-chroma-pulse-1\.0-gravity-1\.0-ceiling-sync-1\.0-movement-1\.0-duck-gate-1\.0-echo-spire-1\.0-aware-1\.0-fairness-1\.0-jump-visual-1\.0-combo-1\.0-speed-curve-2\.0-echo-polish-1\.1-echo-zone2-1\.2-no-scout-1\.1-tide-2\.0-spectacle-1\.0-dash-2\.5-shield-core-1\.0"/);
  assert.ok(html.includes('src/core/config.js?v=flow-1.2-movement-1.0-echo-spire-1.0'));
  assert.ok(html.includes('src/gameplay/flow.js?v=flow-1.2'));
  const game=html.indexOf('src/gameplay/game.js?v=arcade-animation-2.0');
  const monitorScript=html.indexOf('src/ui/build-freshness.js?v=pages-recovery-1.0');
  assert.ok(game>0&&monitorScript>game);
});
