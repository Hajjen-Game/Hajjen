(()=>{
  const saveKey='hajjen-v4b-campaign';
  const xpCaps={1:120,2:330,3:630};
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(key===saveKey){
      try{
        const data=JSON.parse(value),cap=xpCaps[data.zone];
        if(Number.isFinite(cap)&&Number.isFinite(data.xp))data.xp=Math.min(data.xp,cap);
        const zone1=window.HAJJEN_V4B_STATE;
        if(data.zone===1&&Array.isArray(zone1?.ingredients)){
          data.ingredients=zone1.ingredients.map(i=>({name:i.name,force:i.force}));
        }
        value=JSON.stringify(data);
      }catch{}
    }
    return original.call(this,key,value);
  };
})();
