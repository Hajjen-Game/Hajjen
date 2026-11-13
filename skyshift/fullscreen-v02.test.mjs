import test from "node:test";
import assert from "node:assert/strict";
import {makeFullscreenController} from "./fullscreen-v02.mjs";

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
