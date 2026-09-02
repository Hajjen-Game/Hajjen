(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==3||window.HAJJEN_ZONE3_ATTRACTION_BRIDGE)return;

  const source=cfg.combatAttraction||{};
  window.HAJJEN_ZONE3_ATTRACTION_RULES={
    enabled:source.enabled!==false,
    radius:Number(source.radius)||2,
    chance:{...(source.chance||{})}
  };

  // Disable the legacy immediate synthetic-click attraction. The visual layer
  // loaded after Zone 3 system owns the same rules and performs the pull first.
  source.enabled=false;

  const world=document.getElementById('world');
  const nativeWorldAdd=world?.addEventListener;
  const nativeWindowAdd=window.addEventListener;

  if(world&&nativeWorldAdd){
    world.addEventListener=function(type,listener,options){
      if(type==='click'&&typeof listener==='function'){
        const wrapped=function(event){
          if(window.HAJJEN_ZONE3_SYNTHETIC_ENGAGE||window.HAJJEN_ZONE3_ATTRACTION_PULLING)return;
          return listener.call(this,event);
        };
        return nativeWorldAdd.call(this,type,wrapped,options);
      }
      return nativeWorldAdd.call(this,type,listener,options);
    };
  }

  window.addEventListener=function(type,listener,options){
    if(type==='keydown'&&typeof listener==='function'){
      const wrapped=function(event){
        if(window.HAJJEN_ZONE3_ATTRACTION_PULLING)return;
        return listener.call(this,event);
      };
      return nativeWindowAdd.call(this,type,wrapped,options);
    }
    return nativeWindowAdd.call(this,type,listener,options);
  };

  window.HAJJEN_ZONE3_ATTRACTION_BRIDGE={
    version:'1.0',
    restore(){
      if(world&&Object.prototype.hasOwnProperty.call(world,'addEventListener'))delete world.addEventListener;
      if(Object.prototype.hasOwnProperty.call(window,'addEventListener'))delete window.addEventListener;
    }
  };
})();
