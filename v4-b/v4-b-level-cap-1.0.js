(()=>{
  const saveKey='hajjen-v4b-campaign';
  const xpCaps={1:120,2:330,3:630};
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(key===saveKey){
      try{
        const data=JSON.parse(value),cap=xpCaps[data.zone];
        if(Number.isFinite(cap)&&Number.isFinite(data.xp))data.xp=Math.min(data.xp,cap);
        value=JSON.stringify(data);
      }catch{}
    }
    return original.call(this,key,value);
  };

  // Zone 1 boss balance: keep Rootmaw at 180 HP but lower base attack to 17.
  // The core world is created by the next synchronous script, so intercept only that entity creation.
  const originalMapSet=Map.prototype.set;
  Map.prototype.set=function(key,value){
    if(value?.title==='ROOTMAW'&&value?.type==='boss'&&value?.baseHp===180&&value?.baseAttack===19){
      value={...value,baseAttack:17};
    }
    return originalMapSet.call(this,key,value);
  };
  setTimeout(()=>{Map.prototype.set=originalMapSet;},0);
})();
