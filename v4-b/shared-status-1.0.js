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
  let pressureGrid=existingExpanded?.querySelector('.pressure-grid')||document.querySelector('.pressure-panel .pressure-grid');
  let pressureNote=existingExpanded?.querySelector('.panel-note')||document.querySelector('.pressure-panel .panel-note');

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

  function pressureValue(id,fallback=''){
    let node=$(id);
    if(!node){
      node=document.createElement('strong');
      node.id=id;
      node.textContent=fallback;
    }
    return node;
  }

  function pressureCell(label,value){
    const cell=document.createElement('div');
    const name=document.createElement('span');
    name.textContent=label;
    cell.append(name,value);
    return cell;
  }

  if(zone>=2){
    const campaignState=window.HAJJEN_CAMPAIGN_STATE;
    const campaignConfig=window.HAJJEN_CAMPAIGN_CONFIG||window.HAJJEN_ZONE_CONFIG||{};
    const visible=pressureValue('visibleText');
    const clock=pressureValue('clockText',campaignState?.zoneCleared?'SAFE':`${campaignState?.nextAmbient??3} steps`);
    const power=pressureValue('powerText','+0%');
    const cap=document.createElement('strong');
    cap.textContent=String(campaignConfig.levelCap??'—');

    if(!pressureGrid){
      pressureGrid=document.createElement('div');
      pressureGrid.className='pressure-grid';
    }
    pressureGrid.classList.add('pressure-grid');
    pressureGrid.replaceChildren(
      pressureCell('Visible',visible),
      pressureCell('Zone level cap',cap),
      pressureCell('Next ambient Danger',clock),
      pressureCell('Enemy power',power)
    );

    if(!pressureNote){
      pressureNote=document.createElement('p');
      pressureNote.className='panel-note';
      pressureNote.textContent='Every 3 movement steps adds +1 Danger. Harvesting adds +1. Fixed mob kills add +2; spawned mobs add 0.';
    }
  }

  panel.classList.add('status','shared-status','hajjen-status-panel');
  panel.dataset.sharedComponent='status-1.1';
  panel.replaceChildren();
  window.HAJJEN_PANEL_FRAME?.mount?.(panel);

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

  function initPlayerAvatar(){
    const player=$('player');
    if(!player)return;
    const campaignConfig=window.HAJJEN_CAMPAIGN_CONFIG||window.HAJJEN_ZONE_CONFIG||{};
    const cols=zone===1?15:(Number(campaignConfig.cols)||15);
    const rows=zone===1?10:(Number(campaignConfig.rows)||10);

    player.textContent='';
    player.setAttribute('aria-label','Sharkan');
    player.style.width=`${86/cols}%`;
    player.style.height=`${90/rows}%`;

    let facing='right';
    try{
      const saved=sessionStorage.getItem('hajjen-player-facing');
      if(saved==='left'||saved==='right')facing=saved;
    }catch{}
    player.dataset.facing=facing;

    let lastLeft=parseFloat(player.style.left);
    if(!Number.isFinite(lastLeft))lastLeft=null;

    const syncFacing=()=>{
      const nextLeft=parseFloat(player.style.left);
      if(!Number.isFinite(nextLeft))return;
      if(lastLeft!==null){
        if(nextLeft>lastLeft+0.0001)facing='right';
        else if(nextLeft<lastLeft-0.0001)facing='left';
        else{lastLeft=nextLeft;return;}
        player.dataset.facing=facing;
        try{sessionStorage.setItem('hajjen-player-facing',facing);}catch{}
      }
      lastLeft=nextLeft;
    };

    new MutationObserver(syncFacing).observe(player,{attributes:true,attributeFilter:['style']});
    syncFacing();
  }

  initPlayerAvatar();

  window.HAJJEN_SHARED_STATUS={version:'1.1',zone,panel};
})();