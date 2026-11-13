// SKYSHIFT fullscreen adapter. No graphics dependencies, and testable outside a browser.
// The fullscreen request is initiated synchronously by a user activation.
export function makeFullscreenController({
  doc, root, deviceScreen, onChange=()=>{}, onBlocked=()=>{}, onResize=()=>{}
}) {
  let landscapeLocked=false;
  let disposed=false;

  function active(){
    return doc.fullscreenElement===root || doc.webkitFullscreenElement===root;
  }

  function sync(){
    if(disposed)return;
    onChange(active());
    onResize();
  }

  function denied(error,quiet){
    if(!quiet)onBlocked(error);
    sync();
    return false;
  }

  function request(quiet=false){
    if(active())return Promise.resolve(true);
    const fn=root.requestFullscreen || root.webkitRequestFullscreen;
    if(typeof fn!=="function")return Promise.resolve(denied(new Error("Fullscreen unsupported"),quiet));
    let operation;
    try {
      // DO NOT defer this call: browser user activation expires after a gesture.
      operation=fn===root.requestFullscreen ?
        fn.call(root,{navigationUI:"hide"}) : fn.call(root);
    } catch(error) {
      return Promise.resolve(denied(error,quiet));
    }
    return Promise.resolve(operation).then(async()=>{
      // If the host rejected us silently, don't claim fullscreen worked.
      if(!active())return denied(new Error("Fullscreen not activated"),quiet);
      sync();
      const orientation=deviceScreen?.orientation;
      if(typeof orientation?.lock==="function") {
        try {
          await orientation.lock("landscape");
          landscapeLocked=true;
        } catch {
          // Orientation lock is optional and is frequently forbidden in embedded tabs.
        }
      }
      return active();
    }).catch(error=>denied(error,quiet));
  }

  function exit(){
    if(!active())return Promise.resolve(false);
    const fn=doc.exitFullscreen || doc.webkitExitFullscreen;
    if(typeof fn!=="function")return Promise.resolve(false);
    let operation;
    try { operation=fn.call(doc); }
    catch(error){ return Promise.resolve(denied(error,false)); }
    return Promise.resolve(operation).then(()=>{
      if(landscapeLocked){
        try{deviceScreen?.orientation?.unlock?.();}catch{}
        landscapeLocked=false;
      }
      sync();
      return !active();
    }).catch(error=>denied(error,false));
  }

  function toggle(){return active()?exit():request(false);}
  doc.addEventListener("fullscreenchange",sync);
  doc.addEventListener("webkitfullscreenchange",sync);
  return {
    active,request,exit,toggle,sync,
    destroy(){
      disposed=true;
      doc.removeEventListener("fullscreenchange",sync);
      doc.removeEventListener("webkitfullscreenchange",sync);
    }
  };
}
