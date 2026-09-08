(()=>{
  const eventLog=document.getElementById('eventLog');
  if(!eventLog)return;

  const panel=eventLog.closest('.panel');
  if(!panel)return;

  const config=window.HAJJEN_SHARED_UI_CONFIG;
  const titleText=config?.text?.eventLog||'EVENT LOG';

  panel.classList.add('event-panel','shared-event-log','hajjen-event-panel');
  panel.dataset.sharedComponent='event-log-1.1';

  const heading=document.createElement('h2');
  heading.textContent=titleText;

  panel.replaceChildren();
  window.HAJJEN_PANEL_FRAME?.mount?.(panel);
  panel.append(heading,eventLog);

  window.HAJJEN_SHARED_EVENT_LOG={
    version:'1.1',
    panel,
    eventLog
  };

  /* Zone 3 DEV visual prototype: reuse the exact approved Sharkan light
     background for Objectives and Event Log. Kept behind the dev marker so
     the real campaign zones are unaffected. */
  if(document.documentElement.dataset.hajjenDev==='zone3' && !document.getElementById('hajjen-light-side-panel-backgrounds-loader')){
    const script=document.createElement('script');
    script.id='hajjen-light-side-panel-backgrounds-loader';
    script.src='shared-hajjen-light-side-panel-backgrounds-1.0.js?v=1';
    document.body.appendChild(script);
  }
})();
