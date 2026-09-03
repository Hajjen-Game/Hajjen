(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const system=window.HAJJEN_ZONE3_SYSTEM;
  const hand=document.getElementById('manipCards');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!cfg||cfg.zone!==3||!state||!system||!hand||!eventLog)return;

  const card=system.cards?.find(item=>item?.name==='Calm Waters');
  if(!card)return;

  function syncDangerUi(){
    const danger=Math.max(0,Math.min(20,Number(state.danger)||0));
    const text=document.getElementById('dangerText');
    if(text)text.textContent=`${danger} / 20`;
    const fill=document.getElementById('dangerFill');
    if(fill)fill.style.width=`${danger*5}%`;
    const tier=danger>=20?'CRITICAL':danger>=15?'HOSTILE':danger>=10?'DANGEROUS':danger>=5?'UNEASY':'CALM';
    const badge=document.getElementById('dangerState');
    if(badge)badge.textContent=state.zoneCleared?'CLEARED':tier;
    const power=document.getElementById('powerText');
    if(power){
      const bonus=danger>=20?50:danger>=15?35:danger>=10?20:danger>=5?10:0;
      power.textContent=`+${state.zoneCleared?0:bonus}%`;
    }
  }

  function addLog(text,type='reward'){
    const row=document.createElement('div');
    row.className=`event ${type}`;
    row.textContent=text;
    eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }

  function addToast(text,type='reward'){
    if(!toastArea)return;
    const row=document.createElement('div');
    row.className=`toast ${type}`;
    row.textContent=text;
    toastArea.prepend(row);
    setTimeout(()=>row.remove(),1700);
  }

  function decorate(){
    const node=hand.querySelector('[data-zone3-manip="Calm Waters"]');
    if(!node)return;
    const text=node.querySelector('span');
    if(text&&text.textContent!=='Reduce Danger by 3.')text.textContent='Reduce Danger by 3.';
    const button=node.querySelector('button');
    if(button&&card.used){button.disabled=true;button.textContent='USED';}
  }

  hand.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('[data-zone3-manip="Calm Waters"] button'):null;
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(card.used||state.zoneCleared||state.gameOver)return;

    const before=Number(state.danger)||0;
    state.danger=Math.max(0,before-3);
    card.used=true;
    addLog(`Calm Waters reduced Danger ${before} → ${state.danger}.`,'reward');
    addToast('CALM WATERS · DANGER -3','reward');
    syncDangerUi();
    decorate();
  },true);

  new MutationObserver(decorate).observe(hand,{childList:true,subtree:true});
  decorate();

  window.HAJJEN_ZONE3_CALM_WATERS={version:'1.0',card};
})();
