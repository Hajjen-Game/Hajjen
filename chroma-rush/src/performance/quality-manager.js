/* CHROMA RUSH — Mobile Performance Optimization 1.0.
 * Rendering-only settings and local frame statistics. NEVER alters gameplay RNG.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaQuality=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const KEY='chromaRushGraphicsV1';
  const MODES=Object.freeze(['auto','high','balanced','performance']);
  const PROFILES=Object.freeze({
    high:Object.freeze({name:'high',dprCap:2,pixels:3200000,glow:1,density:1,particles:1,terrainStep:16,gridStep:105}),
    balanced:Object.freeze({name:'balanced',dprCap:1.5,pixels:1700000,glow:.64,density:.65,particles:.7,terrainStep:24,gridStep:145}),
    performance:Object.freeze({name:'performance',dprCap:1,pixels:900000,glow:.24,density:.36,particles:.42,terrainStep:36,gridStep:210})
  });
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const round=v=>Math.round(v*10)/10;
  function initialTier(device={}){
    if((device.deviceMemory>0&&device.deviceMemory<=2)||(device.hardwareConcurrency>0&&device.hardwareConcurrency<=2))return 'performance';
    if((device.deviceMemory>0&&device.deviceMemory<=4)||(device.hardwareConcurrency>0&&device.hardwareConcurrency<=4))return 'balanced';
    // Unknown mobile devices start conservatively. Strong known phones can start high.
    return device.deviceMemory>=6&&device.hardwareConcurrency>=6?'high':'balanced';
  }
  class QualityManager{
    constructor({storage=null,device={}}={}){
      this.storage=storage;
      this.device=device;
      let saved=null;
      try{saved=storage?.getItem(KEY)}catch(_){}
      this.mode=MODES.includes(saved)?saved:'auto';
      this.tier=this.mode==='auto'?initialTier(device):this.mode;
      this.history=[];this.samples=0;this.averageFrame=0;this.cooldown=0;this.slowSeconds=0;this.fastSeconds=0;
      this.render={background:0,terrain:0,actors:0,effects:0,total:0,update:0};
      this.lastFrame=0;this.fps=0;this.frameP90=0;
    }
    get profile(){return PROFILES[this.tier]}
    get options(){return MODES}
    setMode(mode){
      if(!MODES.includes(mode))return false;
      this.mode=mode;
      this.tier=mode==='auto'?initialTier(this.device):mode;
      this.history=[];this.samples=0;this.cooldown=0;this.slowSeconds=0;this.fastSeconds=0;
      try{this.storage?.setItem(KEY,mode)}catch(_){}
      return true;
    }
    effectiveDpr(deviceDpr,width,height){
      const p=this.profile;
      const maxByPixels=Math.sqrt(p.pixels/Math.max(1,width*height));
      return clamp(Math.min(deviceDpr||1,p.dprCap,maxByPixels),.6,p.dprCap);
    }
    // Only active frames; hidden/paused/resumed frames do not trigger downgrades.
    observe(elapsedMs,{background=0,terrain=0,actors=0,effects=0,total=0,update=0}={}){
      if(!(elapsedMs>=5&&elapsedMs<=160))return false;
      this.lastFrame=elapsedMs;
      this.render={background,terrain,actors,effects,total,update};
      this.history.push(elapsedMs);
      if(this.history.length>180)this.history.shift();
      // Sorting every RAF is unnecessary overhead, especially on old phones.
      // Recalculate 90th percentile and average only every 30 active frames.
      if(++this.samples%30===0){
        const values=this.history.slice().sort((a,b)=>a-b);
        this.averageFrame=this.history.reduce((a,b)=>a+b,0)/this.history.length;
        this.fps=round(1000/this.averageFrame);
        this.frameP90=round(values[Math.min(values.length-1,Math.floor(values.length*.9))]);
      }
      if(this.mode!=='auto'||this.history.length<45)return false;
      const seconds=elapsedMs/1000;
      this.cooldown=Math.max(0,this.cooldown-seconds);
      const struggling=this.averageFrame>27||this.frameP90>39;
      const veryStable=this.averageFrame>0&&this.averageFrame<18.7&&this.frameP90<24;
      this.slowSeconds=struggling?this.slowSeconds+seconds:Math.max(0,this.slowSeconds-seconds*2);
      this.fastSeconds=veryStable?this.fastSeconds+seconds:0;
      if(this.cooldown>0)return false;
      if(this.slowSeconds>=6&&this.tier!=='performance'){
        this.tier=this.tier==='high'?'balanced':'performance';
        this.cooldown=18;this.slowSeconds=0;this.fastSeconds=0;this.history=[];
        return true;
      }
      if(this.fastSeconds>=32&&this.tier!=='high'){
        this.tier=this.tier==='performance'?'balanced':'high';
        this.cooldown=35;this.fastSeconds=0;this.slowSeconds=0;this.history=[];
        return true;
      }
      return false;
    }
    snapshot(){return {mode:this.mode,tier:this.tier,fps:this.fps,frameP90Ms:this.frameP90,
      frameMs:round(this.lastFrame),renderMs:Object.fromEntries(Object.entries(this.render).map(([k,v])=>[k,round(v)]))};}
  }
  return {QualityManager,PROFILES,MODES,KEY,initialTier};
});
