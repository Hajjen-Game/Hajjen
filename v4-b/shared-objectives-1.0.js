(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG;
  if(!config)return;

  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  const zoneConfig=config.zones?.[zone];
  const objectives=zoneConfig?.objectives;
  if(!zone||!Array.isArray(objectives)||!objectives.length)return;

  const state=zone===1?window.HAJJEN_V4B_STATE:window.HAJJEN_CAMPAIGN_STATE;
  if(!state)return;

  const panel=document.querySelector('.objectives')||(zone>=2?document.querySelector('.left-side > .panel:first-child'):null);
  if(!panel)return;

  const previousStatus={};
  objectives.forEach(item=>{
    const node=document.getElementById(item.statusId);
    if(node?.textContent?.trim())previousStatus[item.statusId]=node.textContent;
  });

  function fallbackStatus(item){
    if(item.kind==='intro'){
      const complete=zone===1?!!state.spellQuestCompleted:!!state.introComplete;
      return zone===1?(complete?'Spell: CREATED':'Spell: NOT CREATED'):(complete?'COMPLETE':'NOT COMPLETE');
    }
    if(item.kind==='mob')return `Mobs: ${Math.min(Number(state.mobKills)||0,item.target||4)} / ${item.target||4}`;
    if(item.kind==='elite')return `Elites: ${Math.min(Number(state.eliteKills)||0,item.target||2)} / ${item.target||2}`;
    if(item.kind==='level'){
      const target=item.target||zoneConfig.levelTarget;
      return Number(state.level)>=target?'COMPLETE':`Level ${state.level} / ${target}`;
    }
    if(item.kind==='boss')return state.bossKilled?'Boss: DEFEATED':state.bossUnlocked?'Boss: READY':'Boss: LOCKED';
    return '';
  }

  panel.classList.add('objectives','shared-objectives');
  panel.dataset.sharedComponent='objectives-1.0';
  panel.replaceChildren();

  const heading=document.createElement('h2');
  heading.textContent='OBJECTIVES';
  panel.appendChild(heading);

  objectives.forEach(item=>{
    const row=document.createElement('div');
    row.className='quest';
    if(item.kind==='intro')row.classList.add('intro','intro-quest');
    if(item.kind==='level')row.classList.add('level-objective');

    const icon=document.createElement('span');
    icon.className='quest-icon';
    if(item.colorClass)icon.classList.add(item.colorClass);
    icon.textContent=item.icon||'•';

    const copy=document.createElement('div');
    const title=document.createElement('strong');
    title.textContent=item.title;
    const status=document.createElement('small');
    status.id=item.statusId;
    status.textContent=previousStatus[item.statusId]||fallbackStatus(item);
    copy.append(title,status);
    row.append(icon,copy);
    panel.appendChild(row);
  });

  window.HAJJEN_SHARED_OBJECTIVES={version:'1.0',zone,panel};
})();
