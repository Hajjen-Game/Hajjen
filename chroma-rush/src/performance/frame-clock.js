/* CHROMA RUSH — fixed-step game clock.
 * Decouple physics from draw FPS. Handle browser stalls without giant physics jumps.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaFrameClock=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  class FixedStepClock{
    constructor({step=1/60,maxSteps=6,maxElapsed=.125}={}){
      this.step=step;this.maxSteps=maxSteps;this.maxElapsed=maxElapsed;this.reset();
    }
    reset(timestamp=null){this.previous=Number.isFinite(timestamp)?timestamp:null;this.accumulator=0;this.droppedSeconds=0;}
    advance(timestamp,active,simulate){
      if(this.previous===null){this.previous=timestamp;return {elapsed:0,steps:0,dropped:0};}
      const elapsed=Math.max(0,(timestamp-this.previous)/1000);
      this.previous=timestamp;
      if(!active){this.accumulator=0;return {elapsed:Math.min(elapsed,.033),steps:0,dropped:0};}
      const clamped=Math.min(elapsed,this.maxElapsed);
      let dropped=Math.max(0,elapsed-clamped);
      this.accumulator+=clamped;
      let steps=0;
      while(this.accumulator+1e-9>=this.step&&steps<this.maxSteps){
        this.accumulator-=this.step;steps++;
        if(simulate(this.step)===false){this.accumulator=0;break;}
      }
      if(steps===this.maxSteps&&this.accumulator>=this.step){
        dropped+=this.accumulator-(this.accumulator%this.step);
        this.accumulator%=this.step;
      }
      this.droppedSeconds+=dropped;
      return {elapsed:clamped,steps,dropped};
    }
  }
  return {FixedStepClock};
});
