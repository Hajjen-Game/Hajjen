// SKYSHIFT fullscreen adapter: one in-flight native operation, honest state,
// and bounded diagnostic history. Native requests always start in the gesture.
export function makeFullscreenController({
  doc,root,deviceScreen,onChange=()=>{},onBlocked=()=>{},onResize=()=>{},
  viewport=()=>({}),userActivation=()=>null
}){
  let landscapeLocked=false,disposed=false,pending=null,generation=0,lastActive=false;
  const history=[];
  function element(){return doc.fullscreenElement||doc.webkitFullscreenElement||null;}
  function active(){return element()===root||element()===doc.documentElement&&Boolean(element());}
  function snapshot(){return {active:active(),element:element()?.id||element()?.tagName||null,
    supported:typeof (root.requestFullscreen||root.webkitRequestFullscreen)==="function",
    fullscreenEnabled:doc.fullscreenEnabled??doc.webkitFullscreenEnabled??null,
    orientation:deviceScreen?.orientation?.type??null,
    userActivation:userActivation(),...viewport()};}
  function record(event,detail={}){
    history.push({event,...snapshot(),...detail});
    if(history.length>32)history.shift();
  }
  function unlock(){
    if(!landscapeLocked)return;
    landscapeLocked=false;
    try{deviceScreen?.orientation?.unlock?.();}catch{}
  }
  function sync(){
    if(disposed)return;
    const now=active();
    if(now!==lastActive){generation++;record(now?"entered":"exited");if(!now)unlock();lastActive=now;}
    onChange(now);onResize();
  }
  function denied(error,quiet,source){
    record("denied",{source,errorName:error?.name??"Error",errorMessage:String(error?.message??error)});
    if(!disposed){if(!quiet)onBlocked(error);sync();}
    return false;
  }
  async function settleEntry(quiet,source){
    if(disposed)return false;
    if(!active())return denied(new Error("Fullscreen not activated"),quiet,source);
    sync();
    const orientation=deviceScreen?.orientation;
    // Already-landscape phones need no orientation lock. Some Android
    // browsers reject or disrupt optional locks. Do not hold up entry.
    if(typeof orientation?.lock==="function"&&!String(orientation.type??"").startsWith("landscape")){
      const token=generation;
      try{
        await orientation.lock("landscape");
        if(disposed||token!==generation||!active()){
          try{orientation.unlock?.();}catch{}
        }else landscapeLocked=true;
      }catch(error){record("orientation-lock-denied",{errorName:error?.name??"Error",errorMessage:String(error?.message??error)});}
    }
    return !disposed&&active();
  }
  function request(quiet=false,source="manual"){
    if(disposed)return Promise.resolve(false);
    if(active())return Promise.resolve(true);
    if(pending)return pending;
    const fn=root.requestFullscreen||root.webkitRequestFullscreen;
    record("request",{source,quiet});
    if(typeof fn!=="function")return Promise.resolve(denied(new Error("Fullscreen unsupported"),quiet,source));
    let operation;
    try{
      // Standard options are optional, not a second request after activation
      // expires. Old WebKit may return void and notify via change event.
      operation=fn===root.requestFullscreen?fn.call(root,{navigationUI:"hide"}):fn.call(root);
    }catch(error){return Promise.resolve(denied(error,quiet,source));}
    let result;
    if(operation===undefined&&!active()){
      result=new Promise(resolve=>{
        let timer;
        const finish=()=>{clearTimeout(timer);doc.removeEventListener("fullscreenchange",finish);doc.removeEventListener("webkitfullscreenchange",finish);doc.removeEventListener("fullscreenerror",finish);doc.removeEventListener("webkitfullscreenerror",finish);resolve();};
        doc.addEventListener("fullscreenchange",finish);doc.addEventListener("webkitfullscreenchange",finish);
        doc.addEventListener("fullscreenerror",finish);doc.addEventListener("webkitfullscreenerror",finish);
        timer=setTimeout(finish,1500);
      });
    }else result=Promise.resolve(operation);
    pending=result.then(()=>settleEntry(quiet,source)).catch(error=>denied(error,quiet,source)).finally(()=>{pending=null;});
    return pending;
  }
  function exit(){
    if(disposed)return Promise.resolve(false);
    if(pending)return pending;
    if(!active())return Promise.resolve(false);
    const fn=doc.exitFullscreen||doc.webkitExitFullscreen;
    if(typeof fn!=="function")return Promise.resolve(false);
    record("exit-request");
    let operation;
    try{operation=fn.call(doc);}catch(error){return Promise.resolve(denied(error,false,"exit"));}
    pending=Promise.resolve(operation).then(()=>{sync();if(!active())unlock();return !active();})
      .catch(error=>denied(error,false,"exit")).finally(()=>{pending=null;});
    return pending;
  }
  function toggle(){return pending|| (active()?exit():request(false,"button"));}
  function nativeError(){if(!disposed)record("fullscreenerror");}
  doc.addEventListener("fullscreenchange",sync);doc.addEventListener("webkitfullscreenchange",sync);
  doc.addEventListener("fullscreenerror",nativeError);doc.addEventListener("webkitfullscreenerror",nativeError);
  return {active,request,exit,toggle,sync,audit:()=>({...snapshot(),pending:Boolean(pending),history:history.map(x=>({...x}))}),
    destroy(){disposed=true;generation++;unlock();
      doc.removeEventListener("fullscreenchange",sync);doc.removeEventListener("webkitfullscreenchange",sync);
      doc.removeEventListener("fullscreenerror",nativeError);doc.removeEventListener("webkitfullscreenerror",nativeError);}
  };
}
