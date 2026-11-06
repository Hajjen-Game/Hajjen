/* CHROMA RUSH — shared HUD presentation; no gameplay decisions. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaHud=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function update(elements,{hp,zone,color,phase,score,speed,baseSpeed,status,flow}){
    elements.hpNumber.textContent=String(hp);
    elements.hp.style.width=hp+'%';
    elements.hp.style.background=hp<=25?'linear-gradient(90deg,#ff315e,#ff8f7d)':hp<=50?'linear-gradient(90deg,#ffaf5d,#ffc95c)':'linear-gradient(90deg,#34b9e8,#6bf2ea)';
    elements.hp.style.boxShadow=hp<=25?'0 0 18px #fa3769':'0 0 13px #40e8ff';
    elements.critical.classList.toggle('active',hp<=25&&hp>0&&status==='running');
    elements.zone.textContent='ZONE '+String(zone).padStart(2,'0');
    elements.zone.style.color=color;
    elements.phase.textContent=phase;elements.phase.style.color=color;
    elements.score.textContent=String(Math.floor(score)).padStart(6,'0');
    elements.speed.textContent='SPEED '+(speed/baseSpeed).toFixed(2)+'×';
    if(flow){
      const tier=flow.tier;
      elements.flowNumber.textContent=Math.round(flow.value)+'%';
      elements.flowBar.style.width=flow.value+'%';
      elements.flowOuter.setAttribute('aria-valuenow',String(Math.round(flow.value)));
      elements.flowOuter.dataset.tier=String(tier);
      elements.flowMultiplier.textContent=flow.multiplier.toFixed(flow.multiplier%1?2:0).replace(/0$/,'')+'×';
      elements.flowState.textContent=flow.stateName;
      elements.flowStreak.textContent=flow.streak+' STREAK';
      elements.flowState.classList.toggle('chroma-live',tier===3);
    }
  }
  function showZoneCallout(elements,{zone,name,color,perfectReward=null}){
    elements.zoneCallout.classList.remove('hidden');
    elements.zoneCallout.style.animation='none';void elements.zoneCallout.offsetWidth;elements.zoneCallout.style.animation='';
    elements.zoneCalloutTag.textContent='ZONE '+String(zone).padStart(2,'0');
    elements.zoneCalloutName.textContent=name;
    elements.zoneCalloutName.style.color=color;
    if(elements.zonePerfect){
      elements.zonePerfect.classList.toggle('hidden',!perfectReward);
      elements.zonePerfect.textContent=perfectReward?('PERFECT ZONE '+String(perfectReward.zone).padStart(2,'0')+'  •  '+(perfectReward.heal>0?'+'+perfectReward.heal+' SHIELD':'FULL SHIELD')):'';
    }
  }
  return {update,showZoneCallout};
});
