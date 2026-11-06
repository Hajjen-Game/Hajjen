/* CHROMA RUSH — Replay Challenge 1.0; local ranked history, no difficulty edits. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ChromaReplay=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const KEY='chromaRushReplayV1';
 const num=(v,max=1e9)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;
 class ReplayChallenge{
  constructor(storage=null){
   this.storage=storage;
   this.stats={bestDistance:0,bestPeakFlow:0,bestPerfectRun:0,lastRun:null};
   try{
    const s=JSON.parse(storage?.getItem(KEY)||'null');
    if(s&&typeof s==='object'&&!Array.isArray(s)){
     this.stats.bestDistance=num(s.bestDistance);
     this.stats.bestPeakFlow=num(s.bestPeakFlow,100);
     this.stats.bestPerfectRun=num(s.bestPerfectRun);
     if(s.lastRun&&typeof s.lastRun==='object'&&!Array.isArray(s.lastRun))
      this.stats.lastRun={score:num(s.lastRun.score),distance:num(s.lastRun.distance),
       zone:Math.max(1,num(s.lastRun.zone,120)),peakFlow:num(s.lastRun.peakFlow,100),
       perfectZones:num(s.lastRun.perfectZones)};
    }
   }catch(_){}
   this.start();
  }
  get bestDistance(){return this.stats.bestDistance}
  snapshot(){return {...this.stats,lastRun:this.stats.lastRun?{...this.stats.lastRun}:null}}
  start({practice=false,bestScore=0,bestZone=1}={}){
   this.practice=Boolean(practice);this.previousScore=num(bestScore);
   this.previousDistance=this.bestDistance;this.previousZone=Math.max(1,num(bestZone,120));
   this.scoreNotified=false;this.distanceNotified=false;
   return this.nextChallenge({bestScore,bestZone});
  }
  nextChallenge({bestScore=this.previousScore,bestZone=this.previousZone}={}){
   if(num(bestZone,120)<3)return 'REACH ZONE 03';
   if(this.stats.bestPeakFlow<65)return 'HIT 65% FLOW';
   if(this.stats.bestPerfectRun<1)return 'CLEAR 1 PERFECT ZONE';
   if(num(bestZone,120)<5)return 'REACH ZONE 05';
   return 'BEAT '+num(bestScore).toLocaleString('en-US')+' SCORE';
  }
  watch({score=0,distance=0}={}){
   if(this.practice)return [];
   const notices=[];
   if(this.previousScore>0&&!this.scoreNotified&&num(score)>this.previousScore){
    this.scoreNotified=true;notices.push('score');
   }
   if(this.previousDistance>0&&!this.distanceNotified&&num(distance)>this.previousDistance){
    this.distanceNotified=true;notices.push('distance');
   }
   return notices;
  }
  finish({score=0,distance=0,zone=1,peakFlow=0,perfectZones=0,bestScore=0,bestZone=1}={}){
   const run={score:num(score),distance:num(distance),zone:Math.max(1,num(zone,120)),
    peakFlow:num(peakFlow,100),perfectZones:num(perfectZones)};
   const result={ranked:!this.practice,previousScore:this.previousScore,
    previousDistance:this.previousDistance,newScore:!this.practice&&run.score>this.previousScore,
    newDistance:!this.practice&&run.distance>this.previousDistance};
   if(!this.practice){
    this.stats.bestDistance=Math.max(this.bestDistance,run.distance);
    this.stats.bestPeakFlow=Math.max(this.stats.bestPeakFlow,run.peakFlow);
    this.stats.bestPerfectRun=Math.max(this.stats.bestPerfectRun,run.perfectZones);
    this.stats.lastRun=run;
    try{this.storage?.setItem(KEY,JSON.stringify(this.stats))}catch(_){}
   }
   return {...result,bestDistance:this.bestDistance,nextChallenge:this.nextChallenge({bestScore,bestZone})};
  }
 }
 return {ReplayChallenge,KEY};
});
