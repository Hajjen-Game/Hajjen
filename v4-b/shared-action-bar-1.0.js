(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG;
  if(!config)return;

  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone)return;

  const text=config.text||{};
  const slotTarget=Math.max(1,Number(config.layout?.spellSlots)||4);
  const actionHud=document.querySelector('.action-hud');
  const actionbar=document.getElementById('actionbar');
  const spellSource=document.getElementById(zone===1?'spells':'spellGrid');
  const potionBtn=document.getElementById(zone===1?'restBtn':'usePotionBtn');
  if(!actionHud||!actionbar||!spellSource)return;

  const forceClasses=['ember','growth','flow','stone','gale','aether'];
  let observer=null;
  let queued=false;

  function ensureHeading(){
    let heading=actionHud.querySelector('.action-hud-title');
    if(!heading){
      heading=document.createElement('div');
      heading.className='action-hud-title';
      actionHud.prepend(heading);
    }
    let spans=[...heading.querySelectorAll(':scope > span')];
    while(spans.length<2){
      const span=document.createElement('span');
      heading.appendChild(span);
      spans.push(span);
    }
    spans[0].textContent=text.actionBar||'ACTION BAR';
    spans[1].textContent=`${slotTarget} SPELLS · ${text.potionShort||'POTION'}`;
  }

  function makeSlot(index){
    const button=document.createElement('button');
    button.type='button';
    button.className='action-slot spell-slot empty';
    button.dataset.actionSpell=String(index);
    button.textContent=text.emptySpell||'EMPTY SPELL';
    button.addEventListener('click',()=>document.querySelector('.spellbook-open')?.click());
    return button;
  }

  function ensureStructure(){
    actionHud.dataset.sharedComponent='action-bar-1.0';
    actionHud.classList.add('shared-action-bar');
    actionbar.classList.add('actionbar','shared-actionbar-grid');
    ensureHeading();

    let slots=[...actionbar.querySelectorAll(':scope > [data-action-spell]')];
    slots.sort((a,b)=>(Number(a.dataset.actionSpell)||0)-(Number(b.dataset.actionSpell)||0));

    while(slots.length<slotTarget){
      const slot=makeSlot(slots.length);
      const divider=actionbar.querySelector(':scope > .action-divider');
      actionbar.insertBefore(slot,divider||potionBtn||null);
      slots.push(slot);
    }
    slots.slice(slotTarget).forEach(slot=>slot.remove());
    slots=slots.slice(0,slotTarget);
    slots.forEach((slot,index)=>slot.dataset.actionSpell=String(index));

    let divider=actionbar.querySelector(':scope > .action-divider');
    if(!divider){
      divider=document.createElement('div');
      divider.className='action-divider';
    }
    const firstAfterSpells=potionBtn||null;
    if(divider.parentElement!==actionbar)actionbar.insertBefore(divider,firstAfterSpells);
    else if(potionBtn&&divider.nextElementSibling!==potionBtn)actionbar.insertBefore(divider,potionBtn);

    if(potionBtn){
      potionBtn.classList.add('action-slot','shared-potion-slot');
      potionBtn.dataset.actionPotion='1';
      if(potionBtn.parentElement!==actionbar)actionbar.appendChild(potionBtn);
    }
  }

  function syncSlots(){
    queued=false;
    const spells=[...spellSource.querySelectorAll('.spell')];
    const slots=[...actionbar.querySelectorAll(':scope > [data-action-spell]')]
      .sort((a,b)=>(Number(a.dataset.actionSpell)||0)-(Number(b.dataset.actionSpell)||0));

    slots.forEach((button,index)=>{
      const spell=spells[index];
      button.className='action-slot spell-slot';
      button.dataset.actionSpell=String(index);
      if(!spell){
        button.classList.add('empty');
        button.textContent=text.emptySpell||'EMPTY SPELL';
        button.setAttribute('aria-label',`Spell slot ${index+1}, empty`);
        return;
      }

      const sourceText=spell.querySelector('span')?.textContent||'';
      const force=forceClasses.find(name=>spell.classList.contains(name)||sourceText.toLowerCase().startsWith(name));
      if(force)button.classList.add(force);
      const name=spell.querySelector('strong')?.textContent||'SPELL';
      const spans=[...spell.querySelectorAll('span')].map(node=>node.textContent);
      button.replaceChildren();
      const strong=document.createElement('strong');
      strong.textContent=name;
      const detail=document.createElement('span');
      detail.textContent=spans[0]||'';
      const meta=document.createElement('small');
      meta.textContent=spans[1]||'';
      button.append(strong,detail,meta);
      button.setAttribute('aria-label',`${name}${detail.textContent?`, ${detail.textContent}`:''}${meta.textContent?`, ${meta.textContent}`:''}`);
    });
  }

  function sync(){
    ensureStructure();
    syncSlots();
  }

  observer=new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    queueMicrotask(syncSlots);
  });
  observer.observe(spellSource,{childList:true,subtree:true,characterData:true});

  sync();

  window.HAJJEN_SHARED_ACTION_BAR={
    version:'1.0',
    zone,
    panel:actionHud,
    actionbar,
    spellSource,
    potionBtn,
    slots:slotTarget,
    sync
  };
})();
