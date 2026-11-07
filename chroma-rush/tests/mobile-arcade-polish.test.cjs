const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {MobilePreferences,KEY,DEFAULTS,normalize}=require('../src/ui/mobile-preferences.js');

function storage(data={}){return {data,getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v}}}

test('mobile settings default to the existing playable audio/haptic experience',()=>{
  const p=new MobilePreferences(storage());
  assert.deepEqual(p.snapshot(),{...DEFAULTS});
  assert.equal(p.music,true);assert.equal(p.effects,true);assert.equal(p.haptics,true);
});

test('music, effects, vibration and effects volume persist independently',()=>{
  const s=storage(),a=new MobilePreferences(s);
  assert.equal(a.set('music',false),true);
  assert.equal(a.set('haptics',false),true);
  assert.equal(a.set('effectsVolume',35),true);
  assert.equal(a.set('unknown',true),false);
  const b=new MobilePreferences(s);
  assert.equal(b.music,false);
  assert.equal(b.effects,true);
  assert.equal(b.haptics,false);
  assert.equal(b.effectsVolume,35);
  b.set('effects',false);
  assert.equal(new MobilePreferences(s).effects,false);
});

test('invalid preferences and inaccessible browser storage are safe',()=>{
  const s=storage({[KEY]:'{broken'});
  assert.deepEqual(new MobilePreferences(s).snapshot(),{...DEFAULTS});
  const unavailable={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
  const p=new MobilePreferences(unavailable);
  assert.doesNotThrow(()=>p.set('effectsVolume',22));
  assert.equal(p.effectsVolume,22);
  assert.equal(normalize({music:'false',effectsVolume:300}).music,true);
  assert.equal(normalize({effectsVolume:-10}).effectsVolume,0);
  assert.equal(normalize({effectsVolume:201}).effectsVolume,100);
});

test('existing game HTML exposes settings, fullscreen, and script load order',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const required=['graphics-panel','music-enabled','effects-enabled','effects-volume',
    'effects-volume-value','haptics-enabled','fullscreen-btn','fullscreen-status','run-launch',
    'jump-btn','duck-btn'];
  for(const id of required)assert.ok(html.includes(`id="${id}"`),id);
  const module=html.indexOf('src/ui/mobile-preferences.js?v=mobile-polish-1.0');
  const game=html.indexOf('src/gameplay/game.js?v=arcade-animation-2.0');
  assert.ok(module>0&&game>module);
  assert.ok(html.includes('style.css?v=flow-multiplier-1.0'));
});
