import test from "node:test";
import assert from "node:assert/strict";
import {makeFullscreenController} from "../../ui/fullscreen-v02.mjs";

function environment({blocked=false,supported=true}={}){
  const listeners=new Map();
  const doc={
    fullscreenElement:null,
    addEventListener(type,fn){listeners.set(type,fn);},
    removeEventListener(type){listeners.delete(type);},
    emit(type){listeners.get(type)?.();}
  };
  const events={changes:[],blocked:[],resizes:0,locks:0,unlocks:0};
  const root={};
  if(supported){
    root.requestFullscreen=()=>{
      if(blocked)return Promise.reject(new Error("NotAllowedError"));
      doc.fullscreenElement=root;doc.emit("fullscreenchange");
      return Promise.resolve();
    };
    doc.exitFullscreen=()=>{
      doc.fullscreenElement=null;doc.emit("fullscreenchange");
      return Promise.resolve();
    };
  }
  const deviceScreen={orientation:{
    lock:async direction=>{assert.equal(direction,"landscape");events.locks++;},
    unlock:()=>{events.unlocks++;}
  }};
  const control=makeFullscreenController({
    doc,root,deviceScreen,
    onChange:active=>events.changes.push(active),
    onBlocked:error=>events.blocked.push(error.message),
    onResize:()=>events.resizes++
  });
  return {control,doc,root,events,listeners};
}

test("user-triggered fullscreen enters, syncs UI and exits",async()=>{
  const {control,events}=environment();
  assert.equal(await control.request(),true);
  assert.equal(control.active(),true);
  assert.ok(events.changes.includes(true));
  assert.equal(events.locks,1);
  assert.equal(await control.toggle(),true);
  assert.equal(control.active(),false);
  assert.equal(events.unlocks,1);
  assert.ok(events.resizes>=2);
});
test("fullscreen denied by embedded context exposes actionable failure",async()=>{
  const {control,events}=environment({blocked:true});
  assert.equal(await control.request(),false);
  assert.equal(control.active(),false);
  assert.equal(events.blocked[0],"NotAllowedError");
});
test("automatic quiet attempt does not interrupt user if embedded host blocks",async()=>{
  const {control,events}=environment({blocked:true});
  assert.equal(await control.request(true),false);
  assert.equal(events.blocked.length,0);
});
test("unsupported fullscreen returns false and exposes fallback",async()=>{
  const {control,events}=environment({supported:false});
  assert.equal(await control.request(),false);
  assert.equal(events.blocked[0],"Fullscreen unsupported");
});
test("leaving fullscreen externally updates controls; destroy cleans up",async()=>{
  const {control,doc,events,listeners}=environment();
  await control.request();
  doc.fullscreenElement=null;doc.emit("fullscreenchange");
  assert.equal(control.active(),false);
  assert.equal(events.changes.at(-1),false);
  control.destroy();
  assert.equal(listeners.size,0);
});

test("repeated start or toggle while native request is pending does not exit or request twice",async()=>{
 const {control,doc,root,events}=environment();
 let resolve,requests=0;
 root.requestFullscreen=()=>{requests++;return new Promise(r=>{resolve=r;});};
 const first=control.request(false,"start-run"),second=control.toggle();
 assert.equal(first,second);assert.equal(requests,1);
 doc.fullscreenElement=root;doc.emit("fullscreenchange");resolve();
 assert.equal(await first,true);assert.equal(events.locks,1);
 assert.equal(control.audit().history.filter(e=>e.event==="request").length,1);
 assert.equal(await control.exit(),true);
});
test("already landscape skips optional orientation lock, records true native state",async()=>{
 const {control,doc,root,events}=environment();
 // A separate adapter with a landscape screen and diagnostic context.
 control.destroy();
 const c=makeFullscreenController({doc,root,deviceScreen:{orientation:{type:"landscape-primary",lock(){assert.fail("unnecessary orientation lock");}}},viewport:()=>({width:780,height:360}),userActivation:()=>true});
 assert.equal(await c.request(),true);
 assert.equal(c.audit().active,true);assert.equal(c.audit().width,780);
 assert.equal(c.audit().history[0].userActivation,true);
 await c.exit();c.destroy();
});
test("native denial is logged even on quiet entry, external exit unlocks",async()=>{
 const f=environment({blocked:true});await f.control.request(true,"start-run");
 assert.equal(f.control.audit().history.at(-1).errorMessage,"NotAllowedError");
 assert.equal(f.events.blocked.length,0);
 const e=environment();await e.control.request();
 e.doc.fullscreenElement=null;e.doc.emit("fullscreenchange");
 assert.equal(e.events.unlocks,1);assert.equal(e.control.audit().active,false);
});
test("legacy void fullscreen waits for native change rather than reporting false denial",async()=>{
 const {control,doc,root}=environment();delete root.requestFullscreen;
 root.webkitRequestFullscreen=()=>{queueMicrotask(()=>{doc.webkitFullscreenElement=root;doc.emit("webkitfullscreenchange");});};
 assert.equal(await control.request(),true);assert.equal(control.audit().active,true);
 control.destroy();
});
