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
})();
