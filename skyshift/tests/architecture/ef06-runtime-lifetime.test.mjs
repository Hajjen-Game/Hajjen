import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRuntimeLifetime} from '../../core/runtime-lifetime.mjs';

function fixture(){
 let id=0;const frames=new Map(),calls=[];
 const page=new EventTarget(),canvas=new EventTarget();
 const life=createRuntimeLifetime({
  requestFrame:fn=>{frames.set(++id,fn);return id;},
  cancelFrame:i=>frames.delete(i),
  frame:now=>calls.push(['frame',now,frames.size]),
  resetClock:()=>calls.push('reset'),onSuspend:()=>calls.push('pause'),
  onContextLost:()=>calls.push('lost'),onContextRestored:()=>calls.push('reload'),
  onDispose:state=>calls.push(['dispose',state.contextLost])
 });
 const event=(target,type,persisted)=>{const e=new Event(type,{cancelable:true});if(persisted!==undefined)Object.defineProperty(e,'persisted',{value:persisted});target.dispatchEvent(e);return e;};
 const tick=now=>{for(const [i,fn] of [...frames])if(frames.delete(i))fn(now);};
 life.bind(page,canvas);return {life,frames,calls,page,canvas,event,tick};
}
test('EF06 single RAF chain, original scheduling order, auxiliary resize and idempotent permanent teardown',()=>{
 const f=fixture();f.life.start();f.life.start();assert.equal(f.frames.size,1);
 f.life.once(t=>f.calls.push(['resize',t]));assert.equal(f.frames.size,2);
 // At frame entry the next recurring frame and the current pending resize coexist.
 f.tick(10);assert.deepEqual(f.calls,[['frame',10,2],['resize',10]]);
 assert.equal(f.frames.size,1);f.tick(20);assert.equal(f.frames.size,1);
 let resize=0;f.life.listen(f.page,'resize',()=>resize++);
 f.event(f.page,'resize');assert.equal(resize,1);
 f.life.once(()=>assert.fail('cancelled callback ran'));f.event(f.page,'pagehide',false);
 assert.equal(f.frames.size,0);assert.equal(f.life.audit().listeners,0);
 f.event(f.page,'resize');assert.equal(resize,1);f.life.start();f.life.dispose();f.tick(30);
 assert.deepEqual(f.calls.at(-1),['dispose',false]);
 assert.equal(f.calls.filter(c=>Array.isArray(c)&&c[0]==='dispose').length,1);
});
test('EF06 bfcache suspends frames without releasing GPU ownership, resumes exactly one with reset clock',()=>{
 const f=fixture();f.life.start();f.event(f.page,'pagehide',true);f.event(f.page,'pagehide',true);
 assert.equal(f.frames.size,0);assert.equal(f.life.disposed,false);assert.deepEqual(f.calls,['pause']);
 f.life.once(()=>assert.fail('suspended resize'));f.event(f.page,'pageshow',true);f.event(f.page,'pageshow',true);
 assert.equal(f.frames.size,1);assert.deepEqual(f.calls,['pause','reset']);f.tick(45);
 assert.deepEqual(f.calls.at(-1),['frame',45,1]);
});
test('EF06 context loss stops all rendering and requests one clean recovery, no stale resize',()=>{
 const f=fixture();f.life.start();f.life.once(()=>assert.fail('lost context resize'));
 assert.equal(f.event(f.canvas,'webglcontextlost').defaultPrevented,true);
 assert.equal(f.life.contextLost,true);assert.equal(f.frames.size,0);
 f.event(f.canvas,'webglcontextlost');f.event(f.page,'pagehide',true);f.event(f.page,'pageshow',true);
 assert.equal(f.frames.size,0);f.event(f.canvas,'webglcontextrestored');f.event(f.canvas,'webglcontextrestored');
 assert.deepEqual(f.calls,['lost','pause','reload']);
 f.life.dispose();assert.deepEqual(f.calls.at(-1),['dispose',true]);
});
test('EF06 actual game uses the single frame owner and protects pending ship load callbacks',()=>{
 const source=readFileSync(new URL('../../game-v0210.mjs',import.meta.url),'utf8');
 assert.match(source,/runtimeLifetime\.bind\(window,UI\.canvas\);\s*initScene\(\);/);
 assert.match(source,/runtimeLifetime\.start\(\);\s*\}catch\(error\)\{\s*runtimeLifetime\.dispose\(\);/);
 assert.doesNotMatch(source,/requestAnimationFrame\(loop\)/);
 assert.match(source,/runtimeLifetime\.listen\(window,"resize",resize\)/);
 assert.match(source,/runtimeLifetime\.disposed\|\|runtimeLifetime\.contextLost/);
 assert.match(source,/function resize\(\)\{\s*if\(runtimeLifetime\.disposed\|\|runtimeLifetime\.contextLost\|\|!renderer\)return;/);
 assert.match(source,/onContextLost:\(\)=>\{[\s\S]*?sceneReady=false;shipArtController\.dispose\(\);/);
});
