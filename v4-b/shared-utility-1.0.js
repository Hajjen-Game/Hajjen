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

  const isDev=new URLSearchParams(location.search).get('dev')==='1';
  const NS='http://www.w3.org/2000/svg';

  function svgEl(name,attrs={}){
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  }

  function utilityIcon(key){
    const svg=svgEl('svg',{
      class:'hajjen-utility-vector-icon',
      viewBox:'0 0 32 32',
      'aria-hidden':'true',
      focusable:'false'
    });

    const addPath=(d,extra={})=>svg.appendChild(svgEl('path',{d,...extra}));
    const addCircle=(cx,cy,r,extra={})=>svg.appendChild(svgEl('circle',{cx,cy,r,...extra}));

    if(key==='spellbook'){
      addPath('M4 7.5c4.5-1.5 8-1 12 1.8v16.2c-4-2.8-7.5-3.3-12-1.8z');
      addPath('M28 7.5c-4.5-1.5-8-1-12 1.8v16.2c4-2.8 7.5-3.3 12-1.8z');
      addPath('M16 9.3v16.2');
      addCircle('11.6','12.8','1.15',{class:'utility-icon-detail'});
    }else if(key==='backpack'){
      addPath('M11 8.3c.7-2.2 2.4-3.5 5-3.5s4.3 1.3 5 3.5');
      addPath('M9 9.5h14l3 5.2-1.8 12H7.8L6 14.7z');
      addPath('M10 16.2h12v8.2H10z');
      addPath('M8.4 12H5.8M23.6 12h2.6');
    }else if(key==='help'){
      addCircle('16','16','11.4');
      addPath('M12.8 12.3c.3-3.1 2.5-4.7 5.3-4.7 3 0 5.1 1.7 5.1 4.4 0 2.2-1.2 3.4-3.4 4.8-2.1 1.3-2.8 2.2-2.8 4.2');
      addCircle('16.8','24.2','1.05',{class:'utility-icon-fill'});
    }else if(key==='copy'){
      addPath('M10 6.5h12v3.2h3v17H7v-17h3z');
      addPath('M12.3 5h7.4v5h-7.4z');
      addPath('M11.5 15h9M11.5 19h9M11.5 23h6.2');
    }else if(key==='reset'){
      addPath('M24.8 11.1A10.2 10.2 0 1 0 26 19');
      addPath('M24.7 5.8v6.4h-6.4');
    }

    return svg;
  }

  function decorateVectorButton(node,key,label){
    if(!isDev||!node)return;
    node.classList.add('hajjen-vector-utility-button');
    node.dataset.utilityVector='1';

    const content=document.createElement('span');
    content.className='hajjen-utility-vector-content';

    const iconWrap=document.createElement('span');
    iconWrap.className='hajjen-utility-vector-icon-wrap';
    iconWrap.appendChild(utilityIcon(key));

    const labelNode=document.createElement('span');
    labelNode.className='hajjen-utility-vector-label';
    labelNode.textContent=label;

    content.append(iconWrap,labelNode);
    node.replaceChildren(content);
  }

  entries.forEach(({node,key,label})=>{
    if(!node)return;
    node.dataset.utilityAction=key;
    node.setAttribute('aria-label',label);
    if(key!=='copy'||!node.textContent?.trim()||/^COPY RUN REPORT$/i.test(node.textContent.trim()))node.textContent=label;
    utility.appendChild(node);
    decorateVectorButton(node,key,label);
  });

  current.replaceWith(utility);

  window.HAJJEN_SHARED_UTILITY={
    version:'1.1',
    zone,
    root:utility,
    buttons:{spellbook,backpack,help,copy,reset}
  };
})();
