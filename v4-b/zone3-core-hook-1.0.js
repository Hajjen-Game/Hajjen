(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==3||window.HAJJEN_ZONE3_CORE_HOOK)return;

  const NativeMap=window.Map;
  let captured=false;

  class Zone3EntityMap extends NativeMap{
    constructor(...args){
      super(...args);
      if(!captured){
        captured=true;
        window.HAJJEN_ZONE3_ENTITY_MAP=this;
      }
    }
  }

  window.Map=Zone3EntityMap;
  window.HAJJEN_ZONE3_CORE_HOOK={
    restore(){if(window.Map===Zone3EntityMap)window.Map=NativeMap;},
    nativeMap:NativeMap
  };
})();
