(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==2||window.HAJJEN_ZONE2_ENTITY_BRIDGE)return;

  const NativeMap=window.Map;
  let captured=false;
  window.Map=function(...args){
    const map=new NativeMap(...args);
    if(!captured){
      captured=true;
      queueMicrotask(()=>{
        if(map instanceof NativeMap&&map.size>=0)window.HAJJEN_ZONE2_ENTITY_MAP=map;
      });
    }
    return map;
  };
  window.Map.prototype=NativeMap.prototype;
  Object.setPrototypeOf(window.Map,NativeMap);

  window.HAJJEN_ZONE2_ENTITY_BRIDGE={
    version:'1.0',
    restore(){if(window.Map!==NativeMap)window.Map=NativeMap;}
  };
})();
