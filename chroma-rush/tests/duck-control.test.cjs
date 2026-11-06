const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const director = require('../director.js');

function setup() {
  const objects=new Map(),windowEvents={};
  function get(id) {
    if(!objects.has(id)) {
      const events={},classes=new Set(['hidden']);
      objects.set(id,{id,textContent:'',style:{},clientWidth:1280,clientHeight:720,
        classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle:(k,on)=>on?classes.add(k):classes.delete(k)},
        addEventListener:(name,fn)=>{(events[name]??=[]).push(fn)},
        click(){for(const fn of events.click??[])fn()},setPointerCapture(){},events});
    }
    return objects.get(id);
  }
  const ctx={fillRect(){},strokeRect(){},setTransform(){},save(){},restore(){},translate(){},
    beginPath(){},moveTo(){},lineTo(){},arcTo(){},closePath(){},fill(){},stroke(){},arc(){},ellipse(){},fillText(){},
    createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}};
  get('game').getContext=()=>ctx;
  let frame;
  const world={ChromaDirector:director,devicePixelRatio:1,
    addEventListener:(name,fn)=>{(windowEvents[name]??=[]).push(fn)},setTimeout(){},AudioContext:undefined};
  const context=vm.createContext({window:world,document:{getElementById:get,addEventListener(){},hidden:false},
    navigator:{},localStorage:{getItem(){return 0},setItem(){}},requestAnimationFrame:f=>{frame=f},
    performance:{now:()=>0},setTimeout(){},Math,console});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8'),context,{filename:'game.js'});
  let ms=0,pointer=9;
  assert.ok(frame);frame(0);get('start-btn').click();
  return {
    advance(n){for(let i=0;i<n;i++){ms+=1000/60;frame(ms)}},
    active(){return get('duck-btn').classList.contains('is-down')},
    press(){const id=++pointer;for(const fn of get('duck-btn').events.pointerdown??[])fn({pointerId:id,preventDefault(){}});return id},
    release(id){for(const fn of get('duck-btn').events.pointerup??[])fn({pointerId:id})},
    keydown(code,repeat=false){for(const fn of windowEvents.keydown??[])fn({code,repeat,preventDefault(){}})},
    keyup(code){for(const fn of windowEvents.keyup??[])fn({code})}
  };
}

test('duck duration is fixed and hold does not extend or repeat',()=>{
  const g=setup(),p=g.press();
  assert.equal(g.active(),true);
  g.advance(20);assert.equal(g.active(),true);
  g.advance(20);assert.equal(g.active(),false);
  g.advance(40);assert.equal(g.active(),false);
  g.release(p);
  const second=g.press();assert.equal(g.active(),true);
  g.release(second);g.advance(5);assert.equal(g.active(),true);
  g.advance(30);assert.equal(g.active(),false);
});
test('recovery prevents immediate re-duck and a new tap works after recovery',()=>{
  const g=setup(),p=g.press();g.release(p);
  g.advance(34);assert.equal(g.active(),false);
  let q=g.press();g.release(q);assert.equal(g.active(),false);
  g.advance(9);q=g.press();g.release(q);assert.equal(g.active(),true);
});
test('keyboard hold and repeat do not repeat duck until released',()=>{
  const g=setup();g.keydown('ArrowDown');assert.equal(g.active(),true);
  g.advance(35);assert.equal(g.active(),false);
  g.keydown('ArrowDown',true);g.advance(20);assert.equal(g.active(),false);
  g.keyup('ArrowDown');g.keydown('ArrowDown');assert.equal(g.active(),true);
});
test('duck pressed during a jump does not activate or queue on landing',()=>{
  const g=setup();g.keydown('Space');
  let p=g.press();assert.equal(g.active(),false);
  g.advance(56);assert.equal(g.active(),false);
  g.release(p);p=g.press();assert.equal(g.active(),true);g.release(p);
});
