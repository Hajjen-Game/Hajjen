(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG||{};
  const text=config.text||{};
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone)return;

  const utility=window.HAJJEN_SHARED_UTILITY;
  let button=utility?.buttons?.copy||document.querySelector('[data-utility-action="copy"]')||document.getElementById('copyRunReportSharedBtn')||document.getElementById('copyRunReportVisibleBtn')||document.getElementById(`copyZone${zone}RunReportBtn`)||document.getElementById('copyRunReportBtn');
  if(!button)return;

  const clean=button.cloneNode(true);
  clean.id='copyRunReportSharedBtn';
  clean.type='button';
  clean.dataset.utilityAction='copy';
  clean.setAttribute('aria-label',text.copyRunReport||'COPY RUN REPORT');
  clean.textContent=text.copyRunReport||'COPY RUN REPORT';
  button.replaceWith(clean);
  button=clean;
  if(utility?.buttons)utility.buttons.copy=button;

  const provider=()=>{
    if(zone===1)return window.HAJJEN_V4B_RUN_REPORT;
    return window[`HAJJEN_V4B_ZONE${zone}_RUN_REPORT`]||window.HAJJEN_CAMPAIGN_RUN_REPORT;
  };
  const getText=()=>{
    try{return provider()?.getText?.()||'';}catch{return'';}
  };

  let feedbackTimer=null;
  function setFeedback(label){
    clearTimeout(feedbackTimer);
    button.textContent=label;
    feedbackTimer=setTimeout(()=>{button.textContent=text.copyRunReport||'COPY RUN REPORT';},1800);
  }

  async function copy(){
    const report=getText();
    if(!report){
      setFeedback(text.runReportNotReady||'RUN REPORT NOT READY');
      return false;
    }

    let copied=false;
    try{
      await navigator.clipboard.writeText(report);
      copied=true;
    }catch{}

    if(!copied){
      const textarea=document.createElement('textarea');
      textarea.value=report;
      textarea.setAttribute('readonly','');
      textarea.style.position='fixed';
      textarea.style.left='-9999px';
      textarea.style.opacity='0';
      document.body.appendChild(textarea);
      textarea.select();
      try{copied=document.execCommand('copy');}catch{}
      textarea.remove();
    }

    setFeedback(copied?(text.runReportCopied||'RUN REPORT COPIED'):(text.runReportCopyFailed||'COPY FAILED — TAP AGAIN'));
    return copied;
  }

  button.addEventListener('click',copy);

  window.HAJJEN_SHARED_RUN_REPORT={
    zone,
    button,
    provider,
    getText,
    copy
  };
})();
