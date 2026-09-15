/* HAJJEN Zone 4 DEV — testing reset + death restart guard.
   Production keeps permanent progression. DEV can deliberately return to the
   Level 10 Zone 4 baseline for repeatable balancing runs. */
(()=>{
  if(window.HAJJEN_ZONE4_DEV_RESET_CONTROLS)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const dev=!!(window.HAJJEN_ZONE4_DEV_MODE||window.HAJJEN_ZONE4_DEV_REQUESTED||document.documentElement.dataset.hajjenDev==='zone4');
  if(Number(cfg?.zone)!==4||!state||!dev)return;

  function freshUrl(){
    const url=new URL(location.href);
    url.searchParams.set('dev','1');
    url.searchParams.set('fresh','1');
    return `${url.pathname}${url.search}${url.hash}`;
  }
  function resetToLevel10(){
    location.replace(freshUrl());
  }
  function restartExpedition(){
    if(window.HAJJEN_ZONE4_SAVE_GAME?.restartExpedition){window.HAJJEN_ZONE4_SAVE_GAME.restartExpedition();return;}
    const url=new URL(location.href);url.searchParams.set('dev','1');location.replace(`${url.pathname}${url.search}${url.hash}`);
  }
  function secured(){return Math.max(0,Number(window.HAJJEN_RPG_STATE?.getProfile?.()?.currencies?.securedEssence)||0);}
  function runReportText(){
    try{return window.HAJJEN_SHARED_RUN_REPORT?.getText?.()||window.HAJJEN_V4B_ZONE4_RUN_REPORT?.getText?.()||'';}catch{return'';}
  }
  async function copyRunReport(button){
    const report=runReportText();
    if(!report){if(button)button.textContent='RUN REPORT NOT READY';return false;}
    let copied=false;
    try{await navigator.clipboard.writeText(report);copied=true;}catch{}
    if(!copied){
      const area=document.createElement('textarea');area.value=report;area.setAttribute('readonly','');area.style.position='fixed';area.style.left='-9999px';area.style.opacity='0';document.body.appendChild(area);area.select();
      try{copied=document.execCommand('copy');}catch{}area.remove();
    }
    if(button){
      const original='COPY RUN REPORT';button.textContent=copied?'RUN REPORT COPIED':'COPY FAILED — TAP AGAIN';
      clearTimeout(button._hajjenCopyTimer);button._hajjenCopyTimer=setTimeout(()=>{button.textContent=original;},1800);
    }
    return copied;
  }

  function ensureButtons(modal){
    if(!modal)return;
    const section=modal.querySelector('section');if(!section)return;

    let restart=section.querySelector('[data-death-restart]');
    if(!restart){
      restart=[...section.querySelectorAll('button')].find(button=>/RESTART EXPEDITION/i.test(button.textContent||''))||null;
      if(!restart){restart=document.createElement('button');restart.type='button';restart.textContent='RESTART EXPEDITION';restart.addEventListener('click',restartExpedition);section.appendChild(restart);}
      restart.dataset.deathRestart='1';
    }

    if(!section.querySelector('[data-death-copy]')){
      const copy=document.createElement('button');copy.type='button';copy.dataset.deathCopy='1';copy.textContent='COPY RUN REPORT';copy.style.marginRight='8px';copy.addEventListener('click',()=>copyRunReport(copy));section.insertBefore(copy,restart);
    }

    if(!section.querySelector('[data-dev-reset-l10]')){
      const reset=document.createElement('button');reset.type='button';reset.dataset.devResetL10='1';reset.textContent='RESET DEV TO LEVEL 10';reset.style.marginLeft='8px';reset.addEventListener('click',resetToLevel10);section.appendChild(reset);
    }
  }
  function createFallback(){
    let modal=document.getElementById('zone4SavegameFailureModal');
    if(!modal){
      modal=document.createElement('div');modal.id='zone4SavegameFailureModal';modal.className='zone4-savegame-failure';modal.setAttribute('aria-hidden','true');
      modal.innerHTML='<div class="zone4-savegame-failure-backdrop"></div><section role="dialog" aria-modal="true"><span>EXPEDITION FAILED</span><h2>SHARKAN RETURNS</h2><p>Gear, level and Secured Essence are safe. Restart Expedition keeps permanent progression. DEV reset returns the test profile to the start of Zone 4.</p><div class="zone4-savegame-failure-meta"><small>SECURED ESSENCE</small><strong data-secured>0</strong></div><button type="button" data-death-restart="1">RESTART EXPEDITION</button></section>';
      document.body.appendChild(modal);
      modal.querySelector('[data-death-restart]')?.addEventListener('click',restartExpedition);
    }
    ensureButtons(modal);
    const value=modal.querySelector('[data-secured]');if(value)value.textContent=String(secured());
    return modal;
  }
  function showDeathControls(){
    if(!state.gameOver)return;
    const modal=createFallback();
    modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');
  }

  let deathSeen=false;
  const timer=setInterval(()=>{
    if(state.gameOver){
      if(!deathSeen){deathSeen=true;setTimeout(showDeathControls,80);}
      else if(!document.querySelector('#zone4SavegameFailureModal.is-open'))showDeathControls();
    }else deathSeen=false;
  },100);

  window.HAJJEN_ZONE4_DEV_RESET_CONTROLS={version:'1.1-death-copy-report',resetToLevel10,restartExpedition,copyRunReport,showDeathControls,stop:()=>clearInterval(timer)};
})();
