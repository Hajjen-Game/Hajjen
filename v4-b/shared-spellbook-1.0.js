(()=>{
  const uiConfig=window.HAJJEN_SHARED_UI_CONFIG;
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  const state=zone===1?window.HAJJEN_V4B_STATE:window.HAJJEN_CAMPAIGN_STATE;
  if(!zone||!state)return;

  const $=id=>document.getElementById(id);
  const SAVE_KEY='hajjen-v4b-campaign';
  const spellSlots=Math.max(2,Number(uiConfig?.layout?.spellSlots)||4);
  const maxCrafted=spellSlots-1;
  const craftBtn=zone===1?$('craftBtn'):$('craftSpellBtn');
  const spellWrap=zone===1?$('spells'):$('spellGrid');
  const ingredientWrap=zone===1?$('ingredients'):$('spellIngredientText')||$('spellResources');
  if(!craftBtn||!spellWrap)return;

  const forceSpell={Growth:{name:'Thorn Bloom',damage:24,cooldown:1},Ember:{name:'Cinder Burst',damage:32,cooldown:2},Flow:{name:'Tide Lash',damage:26,cooldown:1},Stone:{name:'Stone Breaker',damage:29,cooldown:2},Gale:{name:'Razor Gust',damage:23,cooldown:1},Aether:{name:'Rift Pulse',damage:35,cooldown:3}};
  const modifierBonus=force=>({Growth:2,Ember:5,Flow:3,Stone:4,Gale:4,Aether:5}[force]||2);
  const forceClasses=['growth','ember','flow','stone','gale','aether'];

  const ingredients=()=>zone===1?(state.ingredients||[]):(state.spellIngredients||[]);
  const craftedIndices=()=>state.spells.map((spell,index)=>spell?.fallback?null:index).filter(index=>index!==null);
  const isFull=()=>craftedIndices().length>=maxCrafted;
  const canCraft=()=>ingredients().length>=2&&!state.gameOver&&!state.combat;
  const spellDamage=spell=>(Number(spell.damage)||0)+(Math.max(1,Number(state.level)||1)-1)*4+(Number(spell.enchantDamage)||0);
  const cooldown=spell=>Math.max(0,(Number(spell.cooldown)||0)-(Number(spell.cooldownReduction)||0));

  function ingredientText(){
    const list=ingredients();
    return list.length?list.map(i=>`${i.name} (${i.force})`).join(' · '):'None';
  }

  function syncCraftButton(){
    const shouldEnable=canCraft();
    if(craftBtn.disabled===shouldEnable)craftBtn.disabled=!shouldEnable;
    craftBtn.textContent=isFull()?'CREATE & REPLACE':'CREATE SPELL';
    craftBtn.title=isFull()?'Create a new spell and replace one crafted spell. Ember Bolt stays as the fallback.':'';
  }

  function renderSpellbook(){
    spellWrap.innerHTML='';
    state.spells.forEach(spell=>{
      const card=document.createElement('div');
      const force=String(spell.force||'').toLowerCase();
      card.className=`spell ${forceClasses.includes(force)?force:''}`.trim();
      const extra=spell.fallback?' · FALLBACK':'';
      const effect=spell.enchantmentName||((spell.enchantDamage||0)>0?`Enchanted: +${spell.enchantDamage} damage`:spell.fallback?'Always available.':'No extra effect.');
      card.innerHTML=`<strong>${spell.name}</strong><span>${spell.force} · ${spellDamage(spell)} damage · CD ${cooldown(spell)}${extra}</span><span>${effect}</span>`;
      spellWrap.appendChild(card);
    });
    if(zone===1){
      if($('ingredients'))$('ingredients').textContent=ingredientText();
    }else{
      if($('spellIngredientText'))$('spellIngredientText').textContent=ingredientText();
      else if($('spellResources'))$('spellResources').textContent=`Spell ingredients: ${ingredientText()}`;
    }
    syncCraftButton();
    window.HAJJEN_SHARED_UI?.sync?.();
  }

  function persist(){
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{};}catch{}
    saved.spells=state.spells;
    saved.ingredients=zone===1?(state.ingredients||[]):(state.spellIngredients||[]);
    localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
  }

  function addEvent(text){
    const log=$('eventLog');
    if(!log)return;
    const entry=document.createElement('div');
    entry.className='event reward';
    entry.textContent=text;
    log.prepend(entry);
    while(log.children.length>8)log.lastChild.remove();
  }

  function toast(text){
    const area=$('toastArea');
    if(!area)return;
    const item=document.createElement('div');
    item.className='toast reward';
    item.textContent=text;
    area.prepend(item);
    setTimeout(()=>item.remove(),1750);
  }

  let selectedIngredients=[];
  let replacementIndex=null;

  const modal=document.createElement('div');
  modal.id='sharedSpellReplaceModal';
  modal.className='modal shared-spell-replace-modal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','sharedSpellReplaceTitle');
  modal.innerHTML=`<div class="modal-card shared-spell-replace-card">
    <div class="shared-spell-replace-heading"><div><div class="eyebrow">SPELL CREATION</div><h2 id="sharedSpellReplaceTitle">CREATE & REPLACE SPELL</h2></div><button type="button" class="shared-spell-replace-close">CLOSE</button></div>
    <p class="shared-spell-replace-copy">Your loadout is full. Choose two ingredients, then choose which crafted spell to replace. Ember Bolt remains your permanent fallback.</p>
    <section><h3>1 · CHOOSE 2 INGREDIENTS</h3><div class="shared-spell-ingredients"></div></section>
    <section><h3>2 · REPLACE A CRAFTED SPELL</h3><div class="shared-spell-loadout"></div></section>
    <div class="shared-spell-preview">Choose two ingredients and a spell to replace.</div>
    <div class="shared-spell-actions"><button type="button" class="shared-spell-confirm" disabled>CREATE & REPLACE</button><button type="button" class="shared-spell-cancel">CANCEL</button></div>
  </div>`;
  document.body.appendChild(modal);

  const ingredientChoices=modal.querySelector('.shared-spell-ingredients');
  const loadoutChoices=modal.querySelector('.shared-spell-loadout');
  const preview=modal.querySelector('.shared-spell-preview');
  const confirmBtn=modal.querySelector('.shared-spell-confirm');

  function closeModal(){
    modal.classList.remove('show');
    selectedIngredients=[];
    replacementIndex=null;
  }

  function renderReplacement(){
    const list=ingredients();
    selectedIngredients=selectedIngredients.filter(index=>index>=0&&index<list.length);
    ingredientChoices.innerHTML='';
    list.forEach((ingredient,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='shared-spell-ingredient-choice';
      const selectedAt=selectedIngredients.indexOf(index);
      if(selectedAt>=0)button.classList.add('selected');
      button.innerHTML=`<span class="shared-spell-order">${selectedAt>=0?selectedAt+1:''}</span><strong>${ingredient.name}</strong><small>${ingredient.force}${selectedAt===0?' · determines spell':selectedAt===1?' · modifier':''}</small>`;
      button.addEventListener('click',()=>{
        const pos=selectedIngredients.indexOf(index);
        if(pos>=0)selectedIngredients.splice(pos,1);
        else if(selectedIngredients.length<2)selectedIngredients.push(index);
        renderReplacement();
      });
      ingredientChoices.appendChild(button);
    });

    loadoutChoices.innerHTML='';
    craftedIndices().forEach(index=>{
      const spell=state.spells[index];
      const button=document.createElement('button');
      button.type='button';
      button.className=`shared-spell-loadout-choice ${String(spell.force||'').toLowerCase()}`;
      if(index===replacementIndex)button.classList.add('selected');
      button.innerHTML=`<strong>${spell.name}</strong><span>${spell.force} · ${spellDamage(spell)} damage · CD ${cooldown(spell)}</span><small>${index===replacementIndex?'WILL BE REPLACED':'Choose to replace'}</small>`;
      button.addEventListener('click',()=>{replacementIndex=index;renderReplacement();});
      loadoutChoices.appendChild(button);
    });

    const chosen=selectedIngredients.map(index=>list[index]).filter(Boolean);
    if(chosen.length===2){
      const base=forceSpell[chosen[0].force];
      if(base){
        const storedDamage=base.damage+modifierBonus(chosen[1].force);
        const currentDamage=storedDamage+(Math.max(1,Number(state.level)||1)-1)*4;
        const old=replacementIndex!==null?state.spells[replacementIndex]:null;
        preview.innerHTML=`<strong>${base.name}</strong> · ${chosen[0].force} · ${currentDamage} damage · CD ${base.cooldown}<br><span>${chosen[0].name} sets the Primal Force; ${chosen[1].name} adds +${modifierBonus(chosen[1].force)} damage.${old?` Replaces ${old.name}.`:' Choose a crafted spell to replace.'}</span>`;
      }
    }else{
      preview.textContent=`Choose 2 ingredients (${chosen.length}/2). The first determines the Primal Force; the second modifies it.`;
    }
    confirmBtn.disabled=chosen.length!==2||replacementIndex===null;
  }

  function openReplacement(){
    if(!isFull()||!canCraft())return;
    selectedIngredients=[];
    replacementIndex=null;
    renderReplacement();
    modal.classList.add('show');
  }

  function confirmReplacement(){
    const list=ingredients();
    if(selectedIngredients.length!==2||replacementIndex===null||!isFull()||!canCraft())return;
    const first=list[selectedIngredients[0]],second=list[selectedIngredients[1]],old=state.spells[replacementIndex];
    const base=first&&forceSpell[first.force];
    if(!first||!second||!old||old.fallback||!base)return;

    const bonus=modifierBonus(second.force);
    const next={id:`crafted-${Date.now()}`,name:base.name,force:first.force,damage:base.damage+bonus,ingredientBonus:bonus,cooldown:base.cooldown};
    state.spells.splice(replacementIndex,1,next);
    [...selectedIngredients].sort((a,b)=>b-a).forEach(index=>list.splice(index,1));
    if(zone===1)state.spellQuestCompleted=true;

    persist();
    renderSpellbook();
    addEvent(`${next.name} created from ${first.name} + ${second.name}, replacing ${old.name}.`);
    toast(`${next.name.toUpperCase()} REPLACED ${old.name.toUpperCase()}`);
    closeModal();
  }

  craftBtn.addEventListener('click',event=>{
    if(!isFull())return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openReplacement();
  },true);

  modal.querySelector('.shared-spell-replace-close').addEventListener('click',closeModal);
  modal.querySelector('.shared-spell-cancel').addEventListener('click',closeModal);
  confirmBtn.addEventListener('click',confirmReplacement);
  modal.addEventListener('click',event=>{if(event.target===modal)closeModal();});

  let queued=false;
  const scheduleSync=()=>{
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{queued=false;syncCraftButton();});
  };
  new MutationObserver(scheduleSync).observe(craftBtn,{attributes:true,attributeFilter:['disabled']});
  new MutationObserver(scheduleSync).observe(spellWrap,{childList:true,subtree:true});
  if(ingredientWrap)new MutationObserver(scheduleSync).observe(ingredientWrap,{childList:true,subtree:true,characterData:true});

  const helpSpellLine=[...document.querySelectorAll('#helpModal .help-copy li')].find(li=>/free crafted-spell slot/i.test(li.textContent||''));
  if(helpSpellLine)helpSpellLine.textContent='With all three crafted-spell slots full, you can still create a new spell and choose which crafted spell to replace. Ember Bolt remains the fallback.';

  syncCraftButton();
  window.HAJJEN_SHARED_SPELLBOOK={openReplacement,sync:syncCraftButton,maxCrafted};
})();
