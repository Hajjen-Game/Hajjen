/* CHROMA RUSH — Arcade Progression UI: formatted DOM only, no unlock decisions. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaArcadeUI=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const number=n=>Math.floor(n).toLocaleString('en-US');
  const zone=n=>String(n).padStart(2,'0');
  function menu(elements,progress){
    elements.recordScore.textContent=number(progress.bestScore);
    elements.recordZone.textContent=zone(progress.bestZone);
    elements.recordStreak.textContent=number(progress.bestStreak);
    elements.milestoneProgress.textContent=`MILESTONES ${progress.milestoneCount}/${progress.milestones.length}`;
    const next=progress.nextMilestone;
    elements.milestoneNext.textContent=next?`NEXT: ${next.name}`:'ALL MILESTONES COMPLETE';
    const unlocked=progress.unlockedZones;
    const previous=Number(elements.practiceSelect.value);
    elements.practiceSelect.innerHTML=unlocked.map(n=>`<option value="${n}">ZONE ${zone(n)}</option>`).join('');
    elements.practiceSelect.disabled=unlocked.length===0;
    elements.practiceButton.disabled=unlocked.length===0;
    elements.practiceSelect.value=unlocked.includes(previous)?String(previous):String(unlocked[unlocked.length-1]||2);
    elements.practiceHint.textContent=unlocked.length
      ?'TRAIN AT UNLOCKED SPEED · UNRANKED':'REACH ZONE 02 TO UNLOCK PRACTICE';
  }
  function hud(elements,isPractice){
    elements.modeIndicator.classList.toggle('hidden',!isPractice);
    elements.modeIndicator.textContent=isPractice?'PRACTICE · NO RECORDS':'';
  }
  function results(elements,{practice,score,zone:currentZone,runStreak,perfectZones,bestScore,recordScore,earned=[]}){
    elements.finalMode.textContent=practice?'PRACTICE RUN · UNRANKED':'ARCADE RUN · RANKED';
    elements.finalScore.textContent=number(score);
    elements.finalZone.textContent=zone(currentZone);
    elements.finalBest.textContent=number(bestScore);
    elements.finalPerfect.textContent=String(perfectZones);
    elements.finalStreak.textContent=number(runStreak);
    elements.finalRecord.textContent=practice?'TRAINING DOES NOT SAVE RECORDS'
      :recordScore?'NEW HIGH SCORE':'KEEP PUSHING YOUR RECORD';
    elements.finalRecord.classList.toggle('new-record',!practice&&recordScore);
    // Pure presentation state: practice is visibly identified and a new PB
    // earns a small accent without altering rewards or saved records.
    elements.gameover?.classList.toggle('is-practice',Boolean(practice));
    elements.gameover?.classList.toggle('is-new-best',Boolean(!practice&&recordScore));
    elements.finalMilestones.textContent=practice?'RANKED MILESTONES PAUSED'
      :earned.length?`NEW: ${earned.map(m=>m.name).join(' · ')}`:'MILESTONES EARNED IN ARCADE MODE';
  }
  function milestones(elements,progress){
    // Entries originate only from the static built-in achievement catalog.
    elements.milestoneGrid.innerHTML=progress.milestones.map(m=>
      `<div class="milestone-item ${m.earned?'achieved':'locked'}"><span>${m.earned?'✓ UNLOCKED':'◇ LOCKED'}</span><strong>${m.name}</strong><small>${m.description}</small></div>`
    ).join('');
  }
  return {menu,hud,results,milestones};
});
