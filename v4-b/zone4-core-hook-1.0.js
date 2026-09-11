(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==4||window.HAJJEN_ZONE4_CORE_HOOK)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    if(saved&&Number(saved.zone??3)<4){
      saved.ingredients=[];
      saved.potionIngredients=[];
      localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
      window.HAJJEN_ZONE_ENTRY_INGREDIENT_RESET={version:'1.2',from:Number(saved.zone??3),to:4};
    }
  }catch{}

  const NativeMap=window.Map;
  let captured=false;
  class Zone4EntityMap extends NativeMap{
    constructor(...args){
      super(...args);
      if(!captured){
        captured=true;
        window.HAJJEN_ZONE4_ENTITY_MAP=this;
      }
    }
  }

  window.Map=Zone4EntityMap;
  window.HAJJEN_ZONE4_CORE_HOOK={
    restore(){if(window.Map===Zone4EntityMap)window.Map=NativeMap;},
    nativeMap:NativeMap
  };
})();
