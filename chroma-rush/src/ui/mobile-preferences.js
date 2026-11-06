/* CHROMA RUSH — Mobile Arcade Polish 1.0
 * Persistent mobile presentation preferences; independent of gameplay.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaMobilePreferences=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const KEY='chromaRushMobilePolishV1';
  const DEFAULTS=Object.freeze({music:true,effects:true,haptics:true,effectsVolume:100});
  function normalize(input={}){
    const result={...DEFAULTS};
    for(const name of ['music','effects','haptics']){
      if(typeof input[name]==='boolean')result[name]=input[name];
    }
    if(Number.isFinite(input.effectsVolume))
      result.effectsVolume=Math.min(100,Math.max(0,Math.round(input.effectsVolume)));
    return result;
  }
  class MobilePreferences{
    constructor(storage=null){
      this.storage=storage;this.values={...DEFAULTS};
      try{const raw=storage&&storage.getItem(KEY);if(raw)this.values=normalize(JSON.parse(raw))}catch(_){}
    }
    get music(){return this.values.music}
    get effects(){return this.values.effects}
    get haptics(){return this.values.haptics}
    get effectsVolume(){return this.values.effectsVolume}
    set(name,value){
      if(!Object.prototype.hasOwnProperty.call(DEFAULTS,name))return false;
      const changed=normalize({...this.values,[name]:value});
      if(Object.is(changed[name],this.values[name]))return false;
      this.values=changed;
      try{if(this.storage)this.storage.setItem(KEY,JSON.stringify(this.values))}catch(_){}
      return true;
    }
    snapshot(){return {...this.values}}
  }
  return {MobilePreferences,KEY,DEFAULTS,normalize};
});
