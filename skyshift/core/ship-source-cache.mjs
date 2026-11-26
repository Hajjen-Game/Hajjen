// Single-entry, page-owned source cache; never share mutable GPU objects.
export function createShipSourceCache({fetchSource,maxBytes}){
 let entry=null,closed=false,hits=0,requests=0;
 function clear({pendingOnly=false}={}){
  if(!entry||pendingOnly&&entry.ready)return;
  const old=entry;entry=null;
  if(!old.ready)old.controller.abort();
 }
 function acquire(){
  if(closed)return Promise.reject(Error("Ship source cache disposed"));
  if(entry){hits++;return entry.promise;}
  const controller=new AbortController();
  const next={controller,ready:false,bytes:0,promise:null};
  entry=next;requests++;
  next.promise=(async()=>{
   try{
    const source=await fetchSource(controller.signal);
    if(controller.signal.aborted||entry!==next)throw Error("Ship source request cancelled");
    const bytes=typeof source==="string"?new TextEncoder().encode(source).byteLength:source.byteLength;
    if(bytes>maxBytes)throw Error("Hero mesh exceeds mobile budget: "+bytes);
    next.ready=true;next.bytes=bytes;
    return source;
   }catch(error){
    if(entry===next)entry=null;
    throw error;
   }
  })();
  return next.promise;
 }
 return Object.freeze({acquire,cancelPending:()=>clear({pendingOnly:true}),
  invalidate:()=>clear(),dispose(){closed=true;clear();},
  audit:()=>({closed,requests,hits,pending:Boolean(entry&&!entry.ready),bytes:entry?.ready?entry.bytes:0})});
}
