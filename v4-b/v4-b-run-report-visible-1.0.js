(()=>{
  const utility=document.querySelector('.utility-hud');
  if(!utility||document.getElementById('copyRunReportVisibleBtn'))return;

  const btn=document.createElement('button');
  btn.id='copyRunReportVisibleBtn';
  btn.type='button';
  btn.textContent='COPY RUN REPORT';

  const reset=document.getElementById('resetBtn');
  utility.insertBefore(btn,reset||null);

  btn.addEventListener('click',async()=>{
    const text=window.HAJJEN_V4B_RUN_REPORT?.getText?.();
    if(!text){
      btn.textContent='RUN REPORT NOT READY';
      setTimeout(()=>btn.textContent='COPY RUN REPORT',1800);
      return;
    }

    let copied=false;
    try{await navigator.clipboard.writeText(text);copied=true;}catch{}
    if(!copied){
      const ta=document.createElement('textarea');
      ta.value=text;
      ta.style.position='fixed';
      ta.style.opacity='0';
      document.body.appendChild(ta);
      ta.select();
      try{copied=document.execCommand('copy');}catch{}
      ta.remove();
    }

    btn.textContent=copied?'RUN REPORT COPIED':'COPY FAILED — TAP AGAIN';
    setTimeout(()=>btn.textContent='COPY RUN REPORT',1800);
  });
})();
