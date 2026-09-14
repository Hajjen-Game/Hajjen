/* HAJJEN Zone 4 DEV — isolated RPG Backpack prototype.
   Mounts only after the approved UI promotion has settled.
   No MutationObserver, no shared Backpack rewrite, no Hand/board mutation. */
(()=>{
  if(window.HAJJEN_ZONE4_RPG_BACKPACK_ISOLATED)return;

  const isDev=()=>!!(
    window.HAJJEN_ZONE4_DEV_MODE||
    window.HAJJEN_ZONE4_DEV_REQUESTED||
    new URLSearchParams(location.search).get('dev')==='1'
  );
  const zone=()=>Number(window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||0);
  const SLOT_DEFS=[
    {id:'armor',label:'ARMOR',hint:'Health / defence'},
    {id:'charm',label:'CHARM',hint:'Spells / Enchantments'},
    {id:'relic',label:'RELIC',hint:'Unique passive'},
    {id:'tool',label:'TOOL',hint:'Exploration / Danger'}
  ];
  const STAT_DEFS=[
    {id:'power',label:'POWER',text:'Spell damage',formula:v=>`+${v} damage`},
    {id:'vitality',label:'VITALITY',text:'Maximum health',formula:v=>`+${v*5} Max HP`},
    {id:'resolve',label:'RESOLVE',text:'Incoming damage reduction',formula:v=>`-${Math.floor(v/2)} damage`}
  ];

  function iconMarkup(){
    return '<svg class="hajjen-utility-vector-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M11 8.3c.7-2.2 2.4-3.5 5-3.5s4.3 1.3 5 3.5"/><path d="M9 9.5h14l3 5.2-1.8 12H7.8L6 14.7z"/><path d="M10 16.2h12v8.2H10z"/><path d="M8.4 12H5.8M23.6 12h2.6"/></svg>';
  }

  function totals(profile){
    const out={power:Number(profile?.stats?.power)||0,vitality:Number(profile?.stats?.vitality)||0,resolve:Number(profile?.stats?.resolve)||0};
    SLOT_DEFS.forEach(slot=>{
      const stats=profile?.equipment?.[slot.id]?.stats||{};
      out.power+=Number(stats.power)||0;
      out.vitality+=Number(stats.vitality)||0;
      out.resolve+=Number(stats.resolve)||0;
    });
    const talent=window.HAJJEN_ZONE4_TALENTS?.statBonuses?.()||{};
    out.power+=Number(talent.power)||0;
    out.vitality+=Number(talent.vitality)||0;
    out.resolve+=Number(talent.resolve)||0;
    return out;
  }

  function statText(item){
    if(!item)return '';
    const stats=item.stats||{};
    const parts=[];
    if(Number(stats.power))parts.push(`+${Number(stats.power)} Power`);
    if(Number(stats.vitality))parts.push(`+${Number(stats.vitality)} Vitality`);
    if(Number(stats.resolve))parts.push(`+${Number(stats.resolve)} Resolve`);
    return parts.join(' · ')||'No stat bonus';
  }

  function createModal(){
    let modal=document.getElementById('zone4RpgBackpackModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='zone4RpgBackpackModal';
    modal.className='zone4-rpg-isolated-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="zone4-rpg-isolated-backdrop" data-rpg-close="1"></div><section class="zone4-rpg-isolated-card" role="dialog" aria-modal="true" aria-labelledby="zone4RpgBackpackTitle"><header><div><span>SHARKAN PROFILE</span><h2 id="zone4RpgBackpackTitle">BACKPACK</h2></div><button type="button" class="zone4-rpg-isolated-close" data-rpg-close="1" aria-label="Close Backpack">×</button></header><div class="zone4-rpg-isolated-body"></div></section>';
    document.body.appendChild(modal);
    modal.addEventListener('click',event=>{
      if(event.target instanceof Element&&event.target.closest('[data-rpg-close="1"]'))close();
    });
    return modal;
  }

  function equipItem(itemId){
    const rpg=window.HAJJEN_RPG_STATE;
    if(!rpg?.updateProfile)return false;
    const changed=rpg.updateProfile(profile=>{
      const inventory=Array.isArray(profile.inventory)?profile.inventory:[];
      const item=inventory.find(entry=>entry?.id===itemId);
      const slot=String(item?.slot||'').toLowerCase();
      if(!item||!SLOT_DEFS.some(def=>def.id===slot))return profile;
      profile.equipment=profile.equipment||{};
      profile.equipment[slot]=JSON.parse(JSON.stringify(item));
      return profile;
    },'equipment-change');
    if(changed)render();
    return changed;
  }

  function render(){
    const modal=createModal();
    const body=modal.querySelector('.zone4-rpg-isolated-body');
    if(!body)return;
    const rpg=window.HAJJEN_RPG_STATE;
    const profile=rpg?.getProfile?.()||{
      stats:{power:0,vitality:0,resolve:0},equipment:{armor:null,charm:null,relic:null,tool:null},inventory:[],currencies:{securedEssence:0},traits:{capacity:0,active:[]}
    };
    const state=window.HAJJEN_CAMPAIGN_STATE||{};
    const sum=totals(profile);
    const inventory=Array.isArray(profile.inventory)?profile.inventory:[];
    const equippedIds=new Set(SLOT_DEFS.map(slot=>profile.equipment?.[slot.id]?.id).filter(Boolean));

    body.innerHTML='';

    const summary=document.createElement('div');
    summary.className='zone4-rpg-summary';
    summary.innerHTML=`<div><span>PERMANENT CHARACTER</span><strong>SHARKAN</strong><small>Level ${Math.max(1,Number(state.level)||Number(profile.progression?.level)||1)} · Equipment, Talents and RPG progression persist between expeditions.</small></div><div class="zone4-rpg-summary-meta"><span>SECURED ESSENCE</span><strong>${Math.max(0,Number(profile.currencies?.securedEssence)||0)}</strong></div>`;
    body.appendChild(summary);

    const top=document.createElement('div');
    top.className='zone4-rpg-top-grid';

    const equipment=document.createElement('section');
    equipment.className='zone4-rpg-panel';
    equipment.innerHTML='<div class="zone4-rpg-panel-title"><strong>EQUIPMENT</strong><span>4 permanent slots</span></div>';
    const eqGrid=document.createElement('div');
    eqGrid.className='zone4-rpg-equipment-grid';
    SLOT_DEFS.forEach(slot=>{
      const item=profile.equipment?.[slot.id]||null;
      const el=document.createElement('article');
      el.className=`zone4-rpg-slot${item?' is-equipped':''}`;
      el.innerHTML=item
        ?`<div class="zone4-rpg-slot-head"><strong>${slot.label}</strong><span>RANK ${Math.max(1,Number(item.rank)||1)}</span></div><div class="zone4-rpg-slot-content"><b>${item.name||'Unnamed item'}</b><small>${statText(item)}</small>${item.trait?.name?`<em>Trait · ${item.trait.name}</em>`:''}</div>`
        :`<div class="zone4-rpg-slot-head"><strong>${slot.label}</strong><span>${slot.hint}</span></div><div class="zone4-rpg-slot-content is-empty"><i>+</i><b>EMPTY</b><small>No item equipped</small></div>`;
      eqGrid.appendChild(el);
    });
    equipment.appendChild(eqGrid);

    const stats=document.createElement('section');
    stats.className='zone4-rpg-panel';
    stats.innerHTML='<div class="zone4-rpg-panel-title"><strong>SHARKAN STATS</strong><span>Equipment + Talents · deterministic</span></div>';
    const statList=document.createElement('div');
    statList.className='zone4-rpg-stat-list';
    STAT_DEFS.forEach(def=>{
      const value=Math.max(0,Number(sum[def.id])||0);
      const row=document.createElement('div');
      row.className='zone4-rpg-stat';
      row.innerHTML=`<div><strong>${def.label}</strong><span>${def.text}</span></div><b>${value}</b><small>${def.formula(value)}</small>`;
      statList.appendChild(row);
    });
    stats.appendChild(statList);
    top.append(equipment,stats);
    body.appendChild(top);

    const inventoryPanel=document.createElement('section');
    inventoryPanel.className='zone4-rpg-panel zone4-rpg-inventory';
    inventoryPanel.innerHTML=`<div class="zone4-rpg-panel-title"><strong>INVENTORY</strong><span>${inventory.length} permanent item${inventory.length===1?'':'s'}</span></div>`;
    const grid=document.createElement('div');
    grid.className='zone4-rpg-inventory-grid';
    if(!inventory.length){
      grid.innerHTML='<div class="zone4-rpg-empty"><strong>NO PERMANENT LOOT YET</strong><span>Defeat an elite to receive your first equipment choice.</span></div>';
    }else{
      inventory.forEach(item=>{
        const slot=String(item?.slot||'').toLowerCase();
        const validSlot=SLOT_DEFS.some(def=>def.id===slot);
        const equipped=!!item?.id&&equippedIds.has(item.id);
        const card=document.createElement('article');
        card.className=`zone4-rpg-item${equipped?' is-equipped':''}`;
        card.innerHTML=`<span>${String(item.slot||'ITEM').toUpperCase()} · RANK ${Math.max(1,Number(item.rank)||1)}</span><strong>${item.name||'Unnamed item'}</strong><small>${statText(item)}</small>${item.trait?.name?`<em>Trait · ${item.trait.name}</em>`:''}<div class="zone4-rpg-item-action"></div>`;
        const action=card.querySelector('.zone4-rpg-item-action');
        const button=document.createElement('button');
        button.type='button';
        button.disabled=!validSlot||equipped;
        button.textContent=equipped?'EQUIPPED':'EQUIP';
        if(!equipped&&validSlot)button.addEventListener('click',()=>equipItem(item.id));
        action?.appendChild(button);
        grid.appendChild(card);
      });
    }
    inventoryPanel.appendChild(grid);
    body.appendChild(inventoryPanel);
  }

  function open(){
    const modal=createModal();
    render();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('zone4-rpg-modal-open');
  }
  function close(){
    const modal=document.getElementById('zone4RpgBackpackModal');
    modal?.classList.remove('is-open');
    modal?.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('zone4-rpg-modal-open');
  }

  function mountButton(){
    if(!isDev()||zone()!==4)return false;
    const utility=document.querySelector('.shared-utility-hud');
    if(!utility)return false;
    if(utility.querySelector(':scope > .zone4-rpg-backpack-open'))return true;

    const template=utility.querySelector(':scope > button[data-utility-action="spellbook"]')||utility.querySelector(':scope > button');
    const button=document.createElement('button');
    button.type='button';
    if(template){[...template.classList].forEach(name=>button.classList.add(name));}
    button.classList.remove('spellbook-open','help-open');
    button.classList.add('zone4-rpg-backpack-open','hajjen-vector-utility-button');
    button.dataset.utilityAction='backpack';
    button.dataset.utilityVector='isolated';
    button.setAttribute('aria-label','BACKPACK');
    button.innerHTML=`<span class="hajjen-utility-vector-content"><span class="hajjen-utility-vector-icon-wrap">${iconMarkup()}</span><span class="hajjen-utility-vector-label">BACKPACK</span></span>`;
    button.addEventListener('click',open);

    const help=utility.querySelector(':scope > button[data-utility-action="help"]');
    utility.insertBefore(button,help||null);
    return true;
  }

  function mountWhenSettled(){
    if(!isDev()||zone()!==4)return;
    createModal();
    if(mountButton())return;
    [80,180,400,800].forEach(delay=>setTimeout(mountButton,delay));
  }

  document.addEventListener('hajjen-ui-redesign-promoted',mountWhenSettled,{once:true});
  document.addEventListener('hajjen:rpg-profile-changed',()=>{
    const modal=document.getElementById('zone4RpgBackpackModal');
    if(modal?.classList.contains('is-open'))render();
  });
  if(document.documentElement.dataset.hajjenRedesignReady==='1')setTimeout(mountWhenSettled,0);
  setTimeout(mountWhenSettled,2700);

  document.addEventListener('keydown',event=>{
    const modal=document.getElementById('zone4RpgBackpackModal');
    if(!modal?.classList.contains('is-open'))return;
    if(event.key==='Escape')close();
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  window.HAJJEN_ZONE4_RPG_BACKPACK_ISOLATED={version:'1.2-talent-stats',open,close,render,mountButton,equipItem,totals};
})();
