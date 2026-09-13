/* HAJJEN Zone 4 DEV — RPG Backpack / Equipment prototype.
   First visible pass of progression roadmap step 2.
   Uses the permanent Profile schema introduced by shared-rpg-state-1.1.js,
   but does not change combat balance or seed fake loot. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const backpack=window.HAJJEN_SHARED_BACKPACK;
  const rpg=window.HAJJEN_RPG_STATE;
  if(!window.HAJJEN_ZONE4_DEV_MODE||!cfg||Number(cfg.zone)!==4||!state||!backpack?.body||!rpg)return;
  if(window.HAJJEN_ZONE4_RPG_BACKPACK)return;

  const modal=backpack.root;
  const body=backpack.body;
  const openButton=document.querySelector('.backpack-open');
  const title=modal?.querySelector('.modal-heading h2');
  if(title)title.textContent='BACKPACK';
  modal?.classList.add('zone4-rpg-backpack-modal');

  const SLOT_DEFS=[
    {id:'armor',label:'ARMOR',hint:'Health / defence'},
    {id:'charm',label:'CHARM',hint:'Spells / Enchantments'},
    {id:'relic',label:'RELIC',hint:'Unique passive'},
    {id:'tool',label:'TOOL',hint:'Exploration / Danger'}
  ];
  const STAT_DEFS=[
    {id:'power',label:'POWER',formula:value=>`+${value} spell damage`,description:'Increases every spell by 1 damage per point.'},
    {id:'vitality',label:'VITALITY',formula:value=>`+${value*5} Max HP`,description:'Adds 5 Max HP per point.'},
    {id:'resolve',label:'RESOLVE',formula:value=>`-${Math.floor(value/2)} incoming damage`,description:'Every 2 Resolve reduces incoming damage by 1.'}
  ];

  const shell=document.createElement('div');
  shell.className='zone4-rpg-backpack';
  body.replaceChildren(shell);

  function safeText(value,fallback='—'){
    const text=String(value??'').trim();
    return text||fallback;
  }
  function itemStats(item){
    const stats=item?.stats&&typeof item.stats==='object'?item.stats:{};
    return {
      power:Math.max(0,Number(stats.power)||0),
      vitality:Math.max(0,Number(stats.vitality)||0),
      resolve:Math.max(0,Number(stats.resolve)||0)
    };
  }
  function profileTotals(profile){
    const base=profile?.stats||{};
    const totals={
      power:Math.max(0,Number(base.power)||0),
      vitality:Math.max(0,Number(base.vitality)||0),
      resolve:Math.max(0,Number(base.resolve)||0)
    };
    SLOT_DEFS.forEach(slot=>{
      const stats=itemStats(profile?.equipment?.[slot.id]);
      totals.power+=stats.power;
      totals.vitality+=stats.vitality;
      totals.resolve+=stats.resolve;
    });
    return totals;
  }
  function rankLabel(item){
    const rank=Math.max(1,Number(item?.rank)||1);
    return `RANK ${['I','II','III'][Math.min(rank,3)-1]||rank}`;
  }
  function statLine(item){
    const stats=itemStats(item);
    const parts=[];
    if(stats.power)parts.push(`+${stats.power} Power`);
    if(stats.vitality)parts.push(`+${stats.vitality} Vitality`);
    if(stats.resolve)parts.push(`+${stats.resolve} Resolve`);
    return parts.join(' · ')||'No stat bonus';
  }

  function render(){
    const profile=rpg.getProfile();
    const totals=profileTotals(profile);
    const inventory=Array.isArray(profile.inventory)?profile.inventory:[];
    const equippedIds=new Set(SLOT_DEFS.map(slot=>profile.equipment?.[slot.id]?.id).filter(Boolean));

    shell.replaceChildren();

    const hero=document.createElement('section');
    hero.className='rpg-backpack-hero';
    const heroCopy=document.createElement('div');
    heroCopy.className='rpg-backpack-hero-copy';
    heroCopy.innerHTML=`<span class="rpg-kicker">PERMANENT PROFILE</span><strong>SHARKAN</strong><small>Level ${Math.max(1,Number(state.level)||Number(profile.progression?.level)||1)} · Zone ${cfg.zone} expedition</small>`;
    const permanence=document.createElement('div');
    permanence.className='rpg-backpack-permanence';
    permanence.innerHTML='<strong>PERMANENT</strong><span>Equipment and character progression persist between expeditions.</span>';
    hero.append(heroCopy,permanence);
    shell.appendChild(hero);

    const columns=document.createElement('div');
    columns.className='rpg-backpack-columns';

    const equipmentPanel=document.createElement('section');
    equipmentPanel.className='rpg-backpack-section rpg-equipment-section';
    equipmentPanel.innerHTML='<div class="rpg-section-heading"><div><span>EQUIPMENT</span><strong>4 SLOTS</strong></div><small>Permanent gear</small></div>';
    const equipmentGrid=document.createElement('div');
    equipmentGrid.className='rpg-equipment-grid';
    SLOT_DEFS.forEach(slot=>{
      const item=profile.equipment?.[slot.id]||null;
      const node=document.createElement('article');
      node.className=`rpg-equipment-slot${item?' is-equipped':' is-empty'}`;
      node.dataset.equipmentSlot=slot.id;
      const top=document.createElement('div');top.className='rpg-equipment-slot-top';
      top.innerHTML=`<span>${slot.label}</span><small>${item?rankLabel(item):slot.hint}</small>`;
      const center=document.createElement('div');center.className='rpg-equipment-slot-center';
      if(item){
        center.innerHTML=`<strong>${safeText(item.name,'Unnamed item')}</strong><span>${statLine(item)}</span>${item.trait?.name?`<small>Trait · ${safeText(item.trait.name)}</small>`:''}`;
      }else{
        center.innerHTML='<i aria-hidden="true">+</i><strong>EMPTY</strong><span>No item equipped</span>';
      }
      node.append(top,center);equipmentGrid.appendChild(node);
    });
    equipmentPanel.appendChild(equipmentGrid);

    const statsPanel=document.createElement('section');
    statsPanel.className='rpg-backpack-section rpg-stats-section';
    statsPanel.innerHTML='<div class="rpg-section-heading"><div><span>SHARKAN STATS</span><strong>DETERMINISTIC</strong></div><small>No random combat stats</small></div>';
    const statsList=document.createElement('div');
    statsList.className='rpg-stats-list';
    STAT_DEFS.forEach(def=>{
      const value=Math.max(0,Number(totals[def.id])||0);
      const row=document.createElement('div');
      row.className='rpg-stat-row';
      row.innerHTML=`<div class="rpg-stat-name"><strong>${def.label}</strong><span>${def.description}</span></div><b>${value}</b><small>${def.formula(value)}</small>`;
      statsList.appendChild(row);
    });
    const note=document.createElement('p');
    note.className='rpg-stats-note';
    note.textContent='Stats are now part of Sharkan’s permanent profile. Gear will add to these values in the loot pass.';
    statsPanel.append(statsList,note);

    columns.append(equipmentPanel,statsPanel);
    shell.appendChild(columns);

    const inventoryPanel=document.createElement('section');
    inventoryPanel.className='rpg-backpack-section rpg-inventory-section';
    inventoryPanel.innerHTML='<div class="rpg-section-heading"><div><span>INVENTORY</span><strong>PERMANENT LOOT</strong></div><small id="rpgInventoryCount"></small></div>';
    const count=inventoryPanel.querySelector('#rpgInventoryCount');
    if(count)count.textContent=`${inventory.length} item${inventory.length===1?'':'s'}`;
    const inventoryGrid=document.createElement('div');
    inventoryGrid.className='rpg-inventory-grid';

    if(!inventory.length){
      const empty=document.createElement('div');
      empty.className='rpg-inventory-empty';
      empty.innerHTML='<strong>NO PERMANENT LOOT YET</strong><span>Elite and boss equipment rewards will populate this inventory in the next progression pass.</span>';
      inventoryGrid.appendChild(empty);
    }else{
      inventory.forEach(item=>{
        const slot=String(item?.slot||'').toLowerCase();
        const validSlot=SLOT_DEFS.some(def=>def.id===slot);
        const equipped=!!item?.id&&equippedIds.has(item.id);
        const card=document.createElement('article');
        card.className=`rpg-inventory-item${equipped?' is-equipped':''}`;
        card.innerHTML=`<div><span>${validSlot?slot.toUpperCase():'ITEM'} · ${rankLabel(item)}</span><strong>${safeText(item?.name,'Unnamed item')}</strong><small>${statLine(item)}</small>${item?.trait?.name?`<em>Trait · ${safeText(item.trait.name)}</em>`:''}</div><button type="button" ${!validSlot?'disabled':''}>${equipped?'EQUIPPED':'EQUIP'}</button>`;
        const button=card.querySelector('button');
        button?.addEventListener('click',()=>{
          if(!validSlot||!item?.id)return;
          const updated=rpg.updateProfile?.(draft=>{
            draft.equipment=draft.equipment||{};
            draft.equipment[slot]=item;
            return draft;
          });
          if(updated)queueMicrotask(render);
        });
        inventoryGrid.appendChild(card);
      });
    }
    inventoryPanel.appendChild(inventoryGrid);
    shell.appendChild(inventoryPanel);
  }

  openButton?.addEventListener('click',()=>queueMicrotask(render));
  document.addEventListener('hajjen:rpg-profile-changed',render);
  render();

  window.HAJJEN_ZONE4_RPG_BACKPACK={
    version:'1.0-equipment-stats-foundation',
    render,
    getTotals:()=>profileTotals(rpg.getProfile()),
    slots:SLOT_DEFS.map(slot=>({...slot}))
  };
})();
