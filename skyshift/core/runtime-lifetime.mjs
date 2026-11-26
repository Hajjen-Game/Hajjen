// EF06: single owner for the live page frame chain and page/context events.
// The renderer-specific cleanup is injected; do not dispose shared scene resources here.
export function createRuntimeLifetime({requestFrame,cancelFrame,frame,resetClock,onSuspend,onContextLost,onContextRestored,onDispose}){
 let started=false,suspended=false,lost=false,disposed=false,restoring=false,raf=null;
 const pending=new Set(),listeners=[];
 const running=()=>started&&!suspended&&!lost&&!disposed;
 function queue(){
  if(!running()||raf!==null)return;
  raf=requestFrame(now=>{
   raf=null;
   if(!running())return;
   queue(); // Preserve the original schedule-before-render order.
   frame(now);
  });
 }
 function stopFrames(){
  if(raf!==null){cancelFrame(raf);raf=null;}
  for(const id of pending)cancelFrame(id);
  pending.clear();
 }
 function once(callback){
  if(disposed||suspended||lost)return;
  const id=requestFrame(now=>{
   if(!pending.delete(id)||disposed||suspended||lost)return;
   callback(now);
  });
  pending.add(id);
 }
 function listen(target,type,callback,options){
  if(disposed)throw Error('Runtime lifetime disposed');
  target.addEventListener(type,callback,options);
  listeners.push(()=>target.removeEventListener(type,callback,options));
 }
 function dispose(){
  if(disposed)return;
  disposed=true;stopFrames();
  for(const remove of listeners.splice(0).reverse())remove();
  onDispose?.({contextLost:lost});
 }
 function bind(page,canvas){
  listen(page,'pagehide',event=>{
   if(!event.persisted){dispose();return;}
   if(disposed||suspended)return;
   suspended=true;stopFrames();onSuspend?.();
  });
  listen(page,'pageshow',event=>{
   if(!event.persisted||disposed||!suspended)return;
   suspended=false;
   if(!lost){resetClock();queue();}
  });
  listen(canvas,'webglcontextlost',event=>{
   event.preventDefault();
   if(disposed||lost)return;
   lost=true;stopFrames();onContextLost?.();
  });
  listen(canvas,'webglcontextrestored',()=>{
   if(disposed||!lost||restoring)return;
   restoring=true;onContextRestored?.();
  });
 }
 return Object.freeze({start(){if(disposed||started)return;started=true;queue();},
  once,listen,bind,dispose,get disposed(){return disposed},get contextLost(){return lost},
  audit:()=>({started,suspended,contextLost:lost,disposed,pendingFrames:Number(raf!==null)+pending.size,listeners:listeners.length})});
}
