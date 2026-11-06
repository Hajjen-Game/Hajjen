const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname,'..');
const director = require('../src/director/adaptive-director.js');
const config = require('../src/core/config.js');
const geometry = require('../src/core/geometry.js');
const hud = require('../src/ui/hud.js');
const flow = require('../src/gameplay/flow.js');

function setup() {
  const objects=new Map();
  function get(id){
    if(!objects.has(id)) {
      const events={};const classes=new Set(['hidden']);
      objects.set(id, {id, textContent:'',style:{},dataset:{}, setAttribute(name,value){this[name]=value},clientWidth:1280,clientHeight:720,
        classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle:(k,val)=>val?classes.add(k):classes.delete(k)},
        addEventListener:(name,fn)=>{(events[name]??=[]).push(fn)},
        click(){for(const fn of events.click??[])fn()},setPointerCapture(){},
        events});
    }
    return objects.get(id);
  }
  const draw={fillRect(){},strokeRect(){},setTransform(){},save(){},restore(){},translate(){},
    beginPath(){},moveTo(){},lineTo(){},arcTo(){},closePath(){},fill(){},stroke(){},arc(){},ellipse(){},fillText(){},
    createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}};
  get('game').getContext=()=>draw;
  let requested;
  const local={};
  const windowEvents={};
  const world={ChromaDirector:director,ChromaConfig:config,ChromaGeometry:geometry,ChromaHud:hud,ChromaFlow:flow,devicePixelRatio:1,
    addEventListener:(name,fn)=>{(windowEvents[name]??=[]).push(fn)},setTimeout(){},
    AudioContext:undefined};
  const document={getElementById:get,addEventListener(){},hidden:false};
  const context=vm.createContext({window:world,document,navigator:{},localStorage:{getItem:k=>local[k],setItem:(k,v)=>local[k]=v},
    requestAnimationFrame:f=>{requested=f},performance:{now:()=>0},setTimeout:()=>{},Math,console});
  vm.runInContext(fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8'),context,{filename:'game.js'});
  return {get,step:(time)=>{assert.ok(requested);requested(time)},context,
    fireWindow:(type,event)=>{for(const fn of windowEvents[type]??[])fn(event)}};
}

test('game initializes, starts, advances zones and updates HUD without runtime exceptions',()=>{
  const g=setup();
  g.step(0);g.get('start-btn').click();
  assert.ok(!g.get('hud').classList.contains('hidden'));
  for(let i=1;i<=1300;i++)g.step(i*16.667);
  assert.match(g.get('zone-display').textContent,/ZONE 0[1-9]/);
  assert.match(g.get('speed-display').textContent,/SPEED \d+\.\d+×/);
  assert.ok(+g.get('hp-number').textContent<=100);
  assert.match(g.get('flow-number').textContent,/^\d+%$/);
  assert.match(g.get('flow-multiplier').textContent,/^\d+(?:\.\d+)?×$/);
});

function duckHarness(){
  const game=setup();let ms=0,pointer=9;
  game.step(0);game.get('start-btn').click();
  return {game,
    advance(frames){for(let i=0;i<frames;i++){ms+=1000/60;game.step(ms)}},
    press(){const id=++pointer;for(const fn of game.get('duck-btn').events.pointerdown??[])fn({pointerId:id,preventDefault(){}});return id},
    release(id){for(const fn of game.get('duck-btn').events.pointerup??[])fn({pointerId:id})},
    active(){return game.get('duck-btn').classList.contains('is-down')},
    keydown(code,repeat=false){game.fireWindow('keydown',{code,repeat,preventDefault(){}})},
    keyup(code){game.fireWindow('keyup',{code})}
  };
}

test('duck tap is a fixed-duration action even if touch stays held',()=>{
  const h=duckHarness();
  const pointer=h.press();assert.equal(h.active(),true);
  h.advance(20);assert.equal(h.active(),true);
  h.advance(20);assert.equal(h.active(),false);
  // No automatic re-duck even when the pointer remains captured/held.
  h.advance(40);assert.equal(h.active(),false);
  h.release(pointer);
  const second=h.press();assert.equal(h.active(),true);
  // Releasing immediately must not cancel the pulse early.
  h.release(second);h.advance(5);assert.equal(h.active(),true);
  h.advance(30);assert.equal(h.active(),false);
});

test('duck has a short recovery and cannot be spammed continuously',()=>{
  const h=duckHarness();
  const first=h.press();h.release(first);
  h.advance(34);assert.equal(h.active(),false);
  const second=h.press();h.release(second);assert.equal(h.active(),false);
  h.advance(9);
  const third=h.press();h.release(third);assert.equal(h.active(),true);
});

test('keyboard hold and key repeat never extend duck; a new keypress works after release',()=>{
  const h=duckHarness();
  h.keydown('ArrowDown');assert.equal(h.active(),true);
  h.advance(35);assert.equal(h.active(),false);
  h.keydown('ArrowDown',true);h.advance(20);assert.equal(h.active(),false);
  h.keyup('ArrowDown');h.keydown('ArrowDown');assert.equal(h.active(),true);
  h.keyup('ArrowDown');
});

test('airborne duck input is not queued for landing',()=>{
  const h=duckHarness();
  h.keydown('Space');
  const p=h.press();assert.equal(h.active(),false);
  h.advance(56);assert.equal(h.active(),false);
  h.release(p);
  const p2=h.press();assert.equal(h.active(),true);
  h.release(p2);
});
