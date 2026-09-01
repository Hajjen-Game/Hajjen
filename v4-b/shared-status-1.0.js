(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG;
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!config||!zone)return;

  const panel=document.querySelector('.status')||(zone>=2?document.querySelector('.rightcol > .panel:first-child,.right-side > .panel:first-child'):null);
  if(!panel)return;

  const $=id=>document.getElementById(id);
  const existingExpanded=panel.querySelector('.danger-expanded');

  const hpFill=$('hpFill');
  const hpText=$('hpText');
  const xpFill=$('xpFill');
  const xpText=$('xpText');
  const levelText=$('levelText');
  const dangerFill=$('dangerFill');
  const dangerText=$('dangerText');
  const dangerState=$('dangerState');
  const dangerRule=$('dangerRule')||existingExpanded?.querySelector('.danger-rule');
  const thresholds=existingExpanded?.querySelector('.thresholds')||document.querySelector('.danger-info .thresholds');
  const pressureGrid=existingExpanded?.querySelector('.pressure-grid')||document.querySelector('.pressure-panel .pressure-grid');
  const pressureNote=existingExpanded?.querySelector('.panel-note')||document.querySelector('.pressure-panel .panel-note');

  if(!hpFill||!hpText||!xpFill||!xpText||!levelText||!dangerFill||!dangerText||!dangerState)return;

  function metricLine(label,fill,text,barClass,extraClass=''){
    const row=document.createElement('div');
    row.className=`status-line${extraClass?` ${extraClass}`:''}`;
    const name=document.createElement('span');
    name.textContent=label;
    const bar=document.createElement('div');
    bar.className=`bar ${barClass}`;
    bar.appendChild(fill);
    row.append(name,bar,text);
    return row;
  }

  panel.classList.add('status','shared-status');
  panel.dataset.sharedComponent='status-1.0';
  panel.replaceChildren();

  const heading=document.createElement('h2');
  heading.textContent=config.text?.sharkan||'SHARKAN';
  panel.appendChild(heading);
  panel.appendChild(metricLine('HP',hpFill,hpText,'hp-bar'));
  panel.appendChild(metricLine('XP',xpFill,xpText,'xp-bar'));

  const levelLine=document.createElement('div');
  levelLine.className='level-line';
  const levelLabel=document.createElement('span');
  levelLabel.textContent='LEVEL';
  levelLine.append(levelLabel,levelText);
  panel.appendChild(levelLine);

  panel.appendChild(metricLine('DANGER',dangerFill,dangerText,'danger-bar','danger-line'));
  panel.appendChild(dangerState);

  if(dangerRule||thresholds||pressureGrid||pressureNote){
    const expanded=document.createElement('div');
    expanded.className='danger-expanded';
    if(existingExpanded?.classList.contains('danger-compact'))expanded.classList.add('danger-compact');

    const title=document.createElement('div');
    title.className='danger-expanded-title';
    const left=document.createElement('span');
    left.textContent='DANGER SYSTEM';
    const right=document.createElement('span');
    right.textContent='PRESSURE + SCALING';
    title.append(left,right);
    expanded.appendChild(title);

    if(dangerRule)expanded.appendChild(dangerRule);
    if(thresholds)expanded.appendChild(thresholds);
    if(pressureGrid)expanded.appendChild(pressureGrid);
    if(pressureNote)expanded.appendChild(pressureNote);
    panel.appendChild(expanded);
  }

  window.HAJJEN_SHARED_STATUS={version:'1.0',zone,panel};
})();
