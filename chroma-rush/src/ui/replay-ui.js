/* CHROMA RUSH — Replay Challenge 1.0; presentation only. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ChromaReplayUI=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const fmt=v=>Math.floor(Math.max(0,Number(v)||0)).toLocaleString('en-US');
 function menu(el,profile){el.recordDistance.textContent=fmt(profile.bestDistance)}
 function hud(el,{practice=false,score=0,previousScore=0}={}){
  const show=!practice&&previousScore>0;
  el.replayProgress.classList.toggle('hidden',!show);
  if(!show)return;
  const beaten=score>previousScore,pct=Math.min(100,Math.max(0,score/previousScore*100));
  el.replayProgress.classList.toggle('beaten',beaten);
  el.replayTarget.textContent=beaten?'NEW SCORE BEST':'PB '+fmt(previousScore);
  el.replayPercent.textContent=beaten?'BEATEN':Math.min(99,Math.floor(pct))+'%';
  el.replayFill.style.width=pct+'%';
 }
 function toast(el,type){
  el.replayToast.textContent=type==='distance'?'DISTANCE RECORD':'NEW SCORE RECORD';
  el.replayToast.classList.remove('hidden');el.replayToast.classList.remove('replay-toast-live');
  void el.replayToast.offsetWidth;el.replayToast.classList.add('replay-toast-live');
 }
 function results(el,{practice,score,distance,previousScore,previousDistance,newScore,newDistance,nextChallenge}){
  el.finalDistance.textContent=fmt(distance);
  el.finalChallenge.classList.toggle('hidden',Boolean(practice));
  el.finalChallenge.textContent=practice?'':'NEXT RUN · '+nextChallenge;
  if(practice){el.finalComparison.textContent='PRACTICE · RECORDS UNCHANGED';return}
  const parts=[previousScore>0?'PREVIOUS SCORE '+fmt(previousScore):'FIRST RANKED SCORE',
   previousDistance>0?'DISTANCE PB '+fmt(previousDistance):'FIRST DISTANCE RECORD'];
  if(newScore)parts.push('SCORE +'+fmt(score-previousScore));
  if(newDistance)parts.push('DIST +'+fmt(distance-previousDistance));
  el.finalComparison.textContent=parts.join(' · ');
 }
 return {menu,hud,toast,results};
});
