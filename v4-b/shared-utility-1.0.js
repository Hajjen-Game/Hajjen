(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG||{};
  const text=config.text||{};
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone)return;

  const current=document.querySelector('.utility-hud');
  if(!current)return;

  const spellbook=document.querySelector('.spellbook-open');
  const backpack=document.querySelector('.backpack-open');
  const help=document.querySelector('.help-open');
  let copy=document.getElementById('copyRunReportVisibleBtn')||document.getElementById('copyZone2RunReportBtn')||document.getElementById('copyRunReportBtn');
  const reset=document.getElementById('resetBtn');

  if(!copy){
    copy=document.createElement('button');
    copy.id='copyRunReportSharedBtn';
    copy.type='button';
    copy.textContent=text.copyRunReport||'COPY RUN REPORT';
  }

  const utility=document.createElement('div');
  utility.className='utility-hud shared-utility-hud';
  utility.setAttribute('role','group');
  utility.setAttribute('aria-label','Utility actions');

  const entries=[
    {node:spellbook,key:'spellbook',label:text.spellbook||'SPELLBOOK'},
    {node:backpack,key:'backpack',label:text.backpack||'BACKPACK'},
    {node:help,key:'help',label:text.help||'HELP'},
    {node:copy,key:'copy',label:text.copyRunReport||'COPY RUN REPORT'},
    {node:reset,key:'reset',label:text.resetCampaign||'RESET CAMPAIGN'}
  ];

  entries.forEach(({node,key,label})=>{
    if(!node)return;
    node.dataset.utilityAction=key;
    node.setAttribute('aria-label',label);
    if(key!=='copy'||!node.textContent?.trim()||/^COPY RUN REPORT$/i.test(node.textContent.trim()))node.textContent=label;
    utility.appendChild(node);
  });

  current.replaceWith(utility);

  window.HAJJEN_SHARED_UTILITY={
    zone,
    root:utility,
    buttons:{spellbook,backpack,help,copy,reset}
  };
})();
