(()=>{
  const eventLog=document.getElementById('eventLog');
  if(!eventLog)return;

  const panel=eventLog.closest('.panel');
  if(!panel)return;

  const config=window.HAJJEN_SHARED_UI_CONFIG;
  const titleText=config?.text?.eventLog||'EVENT LOG';

  panel.classList.add('event-panel','shared-event-log');
  panel.dataset.sharedComponent='event-log-1.0';

  const heading=document.createElement('h2');
  heading.textContent=titleText;

  panel.replaceChildren(heading,eventLog);

  window.HAJJEN_SHARED_EVENT_LOG={
    version:'1.0',
    panel,
    eventLog
  };
})();
