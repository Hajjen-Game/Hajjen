(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==2||window.HAJJEN_ZONE2_ENTITY_MAP)return;

  const NativeMap=window.Map;
  let captured=false;

  class Zone2EntityMap extends NativeMap{
    constructor(...args){
      super(...args);
      if(!captured){
        captured=true;
        window.HAJJEN_ZONE2_ENTITY_MAP=this;
        if(window.Map===Zone2EntityMap)window.Map=NativeMap;
      }
    }
  }

  window.Map=Zone2EntityMap;
})();
