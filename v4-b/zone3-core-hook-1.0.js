(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==3||window.HAJJEN_ZONE3_CORE_HOOK)return;

  // Spell ingredients are zone-local. Clear leftovers from Zone 2 before
  // campaign-zone.js builds the Zone 3 state. Crafted spells remain intact.
  const SAVE_KEY='hajjen-v4b-campaign';
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    if(saved&&Number(saved.zone??2)<3){
      saved.ingredients=[];
      localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
      window.HAJJEN_ZONE_ENTRY_INGREDIENT_RESET={version:'1.1',from:Number(saved.zone??2),to:3};
    }
  }catch{}

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
