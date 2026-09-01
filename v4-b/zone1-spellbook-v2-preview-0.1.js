(()=>{
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  const state=window.HAJJEN_V4B_STATE;
  if(zone!==1||!state)return;

  const $=id=>document.getElementById(id);
  const modal=$('spellbookModal');
  const legacyPanel=modal?.querySelector('.spell-panel');
  const body=modal?.querySelector('.spellbook-modal-body')||legacyPanel?.parentElement;
  const spellSource=$('spells');
  const ingredientSource=$('ingredients');
  const legacyCraftBtn=$('craftBtn');
  if(!modal||!body||!legacyPanel||!spellSource||!ingredientSource||!legacyCraftBtn)return;

  const forces=['Growth','Ember','Flow','Stone','Gale','Aether'];
  const forceSpell={
    Growth:{name:'Thorn Bloom',damage:24,cooldown:1},
    Ember:{name:'Cinder Burst',damage:32,cooldown:2},
    Flow:{name:'Tide Lash',damage:26,cooldown:1},
    Stone:{name:'Stone Breaker',damage:29,cooldown:2},
    Gale:{name:'Razor Gust',damage:23,cooldown:1},
    Aether:{name:'Rift Pulse',damage:35,cooldown:3}
  };
  const modifierBonus=force=>({Growth:2,Ember:5,Flow:3,Stone:4,Gale:4,Aether:5}[force]||2);
  const library=[];
  let selectedIngredients=[];
  let lastCreatedId=null;
  let syncQueued=false;

  const spellDamage=spell=>(Number(spell?.damage)||0)+(Math.max(1,Number(state.level)||1)-1)*4+(Number(spell?.enchantDamage)||0);
  const cooldown=spell=>Math.max(0,(Number(spell?.cooldown)||0)-(Number(spell?.cooldownReduction)||0));
  const forceClass=force=>String(force||'').toLowerCase();
  const isLocked=()=>!!state.combat||!!state.gameOver;

  function addKnown(spell){
    if(!spell||spell.fallback)return;
    if(!spell.id)spell.id=`crafted-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    if(!library.some(item=>item.id===spell.id))library.push(spell);
  }
  state.spells.forEach(addKnown);

  modal.classList.add('zone1-spellbook-v2-modal');
  body.classList.add('zone1-spellbook-v2-body');
  legacyPanel.classList.add('zone1-spellbook-v2-compat');
  legacyPanel.setAttribute('aria-hidden','true');

  const root=document.createElement('div');
  root.className='zone1-spellbook-v2';
  root.innerHTML=`
    <div class="sbv2-intro">
      <div><div class="sbv2-kicker">SPELL MANAGEMENT</div><h3>SHARKAN'S SPELLBOOK</h3></div>
      <p>Craft spells, keep every spell you discover, and choose which three crafted spells are prepared beside Ember Bolt.</p>
    </div>

    <section class="sbv2-section sbv2-loaded-section">
      <div class="sbv2-section-heading"><div><span>01</span><h4>LOADED SPELLS</h4></div><small>These four slots are your combat Action Bar.</small></div>
      <div class="sbv2-loaded" data-sbv2-loaded></div>
    </section>

    <div class="sbv2-middle-grid">
      <section class="sbv2-section sbv2-library-section">
        <div class="sbv2-section-heading"><div><span>02</span><h4>CRAFTED SPELLS</h4></div><small data-sbv2-library-count>0 KNOWN</small></div>
        <p class="sbv2-section-copy">Crafted spells are never destroyed when another spell takes their Action Bar slot.</p>
        <div class="sbv2-library" data-sbv2-library></div>
      </section>

      <section class="sbv2-section sbv2-create-section">
        <div class="sbv2-section-heading"><div><span>03</span><h4>CREATE SPELL</h4></div><small>2 INGREDIENTS</small></div>
        <p class="sbv2-section-copy">Ingredient 1 determines the Primal Force. Ingredient 2 modifies the result. Both are consumed.</p>
        <div class="sbv2-create-slots" data-sbv2-create-slots></div>
        <div class="sbv2-create-picker" data-sbv2-create-picker></div>
        <div class="sbv2-preview" data-sbv2-preview>Choose two ingredients to preview a spell.</div>
        <button class="sbv2-create-button" data-sbv2-create type="button" disabled>CREATE SPELL</button>
      </section>
    </div>

    <section class="sbv2-section sbv2-ingredients-section">
      <div class="sbv2-section-heading"><div><span>04</span><h4>INGREDIENTS</h4></div><small data-sbv2-ingredient-count>0 AVAILABLE</small></div>
      <div class="sbv2-force-grid" data-sbv2-force-grid></div>
    </section>`;
  body.appendChild(root);

  const loadedWrap=root.querySelector('[data-sbv2-loaded]');
  const libraryWrap=root.querySelector('[data-sbv2-library]');
  const libraryCount=root.querySelector('[data-sbv2-library-count]');
  const createSlots=root.querySelector('[data-sbv2-create-slots]');
  const createPicker=root.querySelector('[data-sbv2-create-picker]');
  const preview=root.querySelector('[data-sbv2-preview]');
  const createBtn=root.querySelector('[data-sbv2-create]');
  const ingredientCount=root.querySelector('[data-sbv2-ingredient-count]');
  const forceGrid=root.querySelector('[data-sbv2-force-grid]');

  function detailLine(spell){
    return `${spell.force} · ${spellDamage(spell)} DAMAGE · CD ${cooldown(spell)}`;
  }

  function loadedIndex(spell){
    return state.spells.findIndex(item=>item?.id===spell?.id);
  }

  function syncCompatibilitySource(){
    spellSource.replaceChildren();
    state.spells.forEach(spell=>{
      if(!spell)return;
      const card=document.createElement('div');
      card.className=`spell ${forceClass(spell.force)}`;
      const extra=spell.fallback?' · FALLBACK':'';
      const effect=spell.enchantmentName||((spell.enchantDamage||0)>0?`Enchanted: +${spell.enchantDamage} damage`:spell.fallback?'Always available.':'No extra effect.');
      card.innerHTML=`<strong>${spell.name}</strong><span>${spell.force} · ${spellDamage(spell)} damage · CD ${cooldown(spell)}${extra}</span><span>${effect}</span>`;
      spellSource.appendChild(card);
    });
    ingredientSource.textContent=state.ingredients.length?state.ingredients.map(item=>`${item.name} (${item.force})`).join(' · '):'None';
    const objective=$('spellQuest');
    if(objective)objective.textContent=state.spellQuestCompleted?'Spell: CREATED':'Spell: NOT CREATED';
    window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
    window.HAJJEN_SHARED_UI?.sync?.();
  }

  function equipToSlot(spell,slotNumber){
    if(!spell||isLocked()||slotNumber<2||slotNumber>4)return;
    const targetIndex=slotNumber-1;
    const currentIndex=loadedIndex(spell);

    if(targetIndex>state.spells.length)return;
    if(currentIndex===targetIndex)return;

    if(currentIndex>0){
      if(targetIndex>=state.spells.length)return;
      const displaced=state.spells[targetIndex];
      state.spells[targetIndex]=spell;
      state.spells[currentIndex]=displaced;
    }else if(targetIndex===state.spells.length){
      state.spells.push(spell);
    }else{
      state.spells[targetIndex]=spell;
    }

    syncCompatibilitySource();
    render();
  }

  function renderLoaded(){
    loadedWrap.replaceChildren();
    for(let slot=1;slot<=4;slot++){
      const spell=state.spells[slot-1];
      const card=document.createElement('article');
      card.className=`sbv2-loaded-card${spell?` ${forceClass(spell.force)}`:' empty'}`;
      card.dataset.slot=String(slot);

      const slotLabel=document.createElement('div');
      slotLabel.className='sbv2-slot-label';
      slotLabel.innerHTML=`<span>SLOT ${slot}</span><strong>${slot===1?'PERMANENT':spell?'LOADED':'EMPTY'}</strong>`;
      card.appendChild(slotLabel);

      if(spell){
        const name=document.createElement('h5');
        name.textContent=spell.name;
        const meta=document.createElement('p');
        meta.textContent=detailLine(spell);
        card.append(name,meta);
        if(slot===1){
          const lock=document.createElement('div');
          lock.className='sbv2-permanent-note';
          lock.textContent='LOCKED · FALLBACK';
          card.appendChild(lock);
        }
      }else{
        const empty=document.createElement('div');
        empty.className='sbv2-empty-copy';
        empty.textContent='Choose a crafted spell below.';
        card.appendChild(empty);
      }
      loadedWrap.appendChild(card);
    }
  }

  function slotButton(spell,slot){
    const button=document.createElement('button');
    button.type='button';
    const targetIndex=slot-1;
    const currentIndex=loadedIndex(spell);
    const targetSpell=state.spells[targetIndex];
    const nextOpen=targetIndex===state.spells.length;
    const inaccessible=targetIndex>state.spells.length;

    button.className='sbv2-equip-button';
    if(currentIndex===targetIndex){
      button.textContent=`SLOT ${slot} · LOADED`;
      button.disabled=true;
    }else if(currentIndex>0&&nextOpen){
      button.textContent=`SLOT ${slot}`;
      button.disabled=true;
      button.title='Fill the open loadout slot with an unequipped spell.';
    }else{
      button.textContent=targetSpell?`TO SLOT ${slot}`:`EQUIP SLOT ${slot}`;
      button.disabled=isLocked()||inaccessible;
      button.addEventListener('click',()=>equipToSlot(spell,slot));
    }
    return button;
  }

  function renderLibrary(){
    libraryWrap.replaceChildren();
    libraryCount.textContent=`${library.length} KNOWN`;
    if(!library.length){
      const empty=document.createElement('div');
      empty.className='sbv2-library-empty';
      empty.innerHTML='<strong>NO CRAFTED SPELLS YET</strong><span>Create your first spell using two ingredients.</span>';
      libraryWrap.appendChild(empty);
      return;
    }

    library.forEach(spell=>{
      const loaded=loadedIndex(spell);
      const card=document.createElement('article');
      card.className=`sbv2-library-card ${forceClass(spell.force)}${spell.id===lastCreatedId?' newly-created':''}`;
      const header=document.createElement('div');
      header.className='sbv2-library-card-head';
      const title=document.createElement('div');
      title.innerHTML=`<span>${spell.force}</span><h5>${spell.name}</h5>`;
      const status=document.createElement('strong');
      status.textContent=loaded>0?`LOADED · SLOT ${loaded+1}`:'IN LIBRARY';
      header.append(title,status);

      const meta=document.createElement('p');
      meta.textContent=`${spellDamage(spell)} DAMAGE · COOLDOWN ${cooldown(spell)}`;
      const origin=document.createElement('small');
      origin.textContent=spell.craftedFrom?.length?`Crafted from ${spell.craftedFrom.join(' + ')}`:'Crafted spell';
      const actions=document.createElement('div');
      actions.className='sbv2-library-actions';
      [2,3,4].forEach(slot=>actions.appendChild(slotButton(spell,slot)));
      card.append(header,meta,origin,actions);
      libraryWrap.appendChild(card);
    });
  }

  function selectionLabel(index){
    const ing=selectedIngredients[index];
    if(!ing)return `<strong>INGREDIENT ${index+1}</strong><span>${index===0?'Determines Primal Force':'Adds modifier'}</span><em>NOT SELECTED</em>`;
    return `<strong>INGREDIENT ${index+1}</strong><span>${index===0?'PRIMAL FORCE':'MODIFIER'}</span><em>${ing.name} · ${ing.force}</em>`;
  }

  function renderCreate(){
    selectedIngredients=selectedIngredients.filter(item=>state.ingredients.includes(item)).slice(0,2);
    createSlots.innerHTML=`<div class="sbv2-create-slot ${selectedIngredients[0]?'filled':''}">${selectionLabel(0)}</div><div class="sbv2-plus">+</div><div class="sbv2-create-slot ${selectedIngredients[1]?'filled':''}">${selectionLabel(1)}</div>`;
    createPicker.replaceChildren();

    state.ingredients.forEach(ingredient=>{
      const selectedAt=selectedIngredients.indexOf(ingredient);
      const button=document.createElement('button');
      button.type='button';
      button.className=`sbv2-pick ${forceClass(ingredient.force)}${selectedAt>=0?' selected':''}`;
      button.innerHTML=`<span>${selectedAt>=0?selectedAt+1:'+'}</span><strong>${ingredient.name}</strong><small>${ingredient.force}</small>`;
      button.disabled=isLocked();
      button.addEventListener('click',()=>{
        const pos=selectedIngredients.indexOf(ingredient);
        if(pos>=0)selectedIngredients.splice(pos,1);
        else if(selectedIngredients.length<2)selectedIngredients.push(ingredient);
        else selectedIngredients[1]=ingredient;
        renderCreate();
      });
      createPicker.appendChild(button);
    });

    const [first,second]=selectedIngredients;
    if(first&&second){
      const base=forceSpell[first.force];
      const bonus=modifierBonus(second.force);
      const current=(base?.damage||0)+bonus+(Math.max(1,Number(state.level)||1)-1)*4;
      preview.innerHTML=`<div><span>RESULT</span><strong>${base?.name||'UNKNOWN SPELL'}</strong></div><p>${first.force} · ${current} DAMAGE · COOLDOWN ${base?.cooldown||0}</p><small>${first.name} sets the Primal Force. ${second.name} adds +${bonus} base damage.</small>`;
      createBtn.disabled=isLocked()||!base;
    }else{
      preview.innerHTML=`<div><span>RESULT</span><strong>CHOOSE 2 INGREDIENTS</strong></div><p>${selectedIngredients.length} / 2 SELECTED</p><small>The first ingredient determines the spell. The second modifies it.</small>`;
      createBtn.disabled=true;
    }
  }

  function groupedInventory(){
    const groups=new Map();
    state.ingredients.forEach(item=>{
      const key=`${item.force}::${item.name}`;
      const current=groups.get(key)||{force:item.force,name:item.name,count:0};
      current.count++;
      groups.set(key,current);
    });
    return groups;
  }

  function renderIngredients(){
    ingredientCount.textContent=`${state.ingredients.length} AVAILABLE`;
    forceGrid.replaceChildren();
    const grouped=groupedInventory();
    forces.forEach(force=>{
      const section=document.createElement('article');
      section.className=`sbv2-force ${forceClass(force)}`;
      const items=[...grouped.values()].filter(item=>item.force===force);
      const heading=document.createElement('div');
      heading.className='sbv2-force-heading';
      heading.innerHTML=`<strong>${force.toUpperCase()}</strong><span>${items.reduce((sum,item)=>sum+item.count,0)}</span>`;
      const list=document.createElement('div');
      list.className='sbv2-force-items';
      if(items.length){
        items.forEach(item=>{
          const row=document.createElement('div');
          row.innerHTML=`<span>${item.name}</span><strong>×${item.count}</strong>`;
          list.appendChild(row);
        });
      }else{
        const empty=document.createElement('div');
        empty.className='sbv2-force-empty';
        empty.textContent='None collected';
        list.appendChild(empty);
      }
      section.append(heading,list);
      forceGrid.appendChild(section);
    });
  }

  function createSpell(){
    if(selectedIngredients.length!==2||isLocked())return;
    const [first,second]=selectedIngredients;
    if(!state.ingredients.includes(first)||!state.ingredients.includes(second))return;
    const base=forceSpell[first.force];
    if(!base)return;

    const bonus=modifierBonus(second.force);
    const spell={
      id:`crafted-v2-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      name:base.name,
      force:first.force,
      damage:base.damage+bonus,
      ingredientBonus:bonus,
      cooldown:base.cooldown,
      craftedFrom:[first.name,second.name]
    };
    addKnown(spell);
    lastCreatedId=spell.id;

    [first,second]
      .map(item=>state.ingredients.indexOf(item))
      .filter(index=>index>=0)
      .sort((a,b)=>b-a)
      .forEach(index=>state.ingredients.splice(index,1));

    state.spellQuestCompleted=true;
    selectedIngredients=[];
    syncCompatibilitySource();

    const log=$('eventLog');
    if(log){
      const entry=document.createElement('div');
      entry.className='event reward';
      entry.textContent=`Created ${spell.name} from ${first.name} + ${second.name}. It was added to the Spell Library.`;
      log.prepend(entry);
      while(log.children.length>8)log.lastChild.remove();
    }
    const toast=$('toastArea');
    if(toast){
      const note=document.createElement('div');
      note.className='toast reward';
      note.textContent=`${spell.name.toUpperCase()} ADDED TO LIBRARY`;
      toast.prepend(note);
      setTimeout(()=>note.remove(),1750);
    }
    render();
  }

  function render(){
    state.spells.forEach(addKnown);
    renderLoaded();
    renderLibrary();
    renderCreate();
    renderIngredients();
  }

  createBtn.addEventListener('click',createSpell);

  const scheduleRender=()=>{
    if(syncQueued)return;
    syncQueued=true;
    queueMicrotask(()=>{
      syncQueued=false;
      render();
    });
  };
  new MutationObserver(scheduleRender).observe(ingredientSource,{childList:true,subtree:true,characterData:true});
  new MutationObserver(scheduleRender).observe(spellSource,{childList:true,subtree:true,characterData:true});
  new MutationObserver(scheduleRender).observe(modal,{attributes:true,attributeFilter:['class']});

  syncCompatibilitySource();
  render();

  window.HAJJEN_ZONE1_SPELLBOOK_V2={
    version:'0.1-preview',
    root,
    library,
    state,
    render,
    equipToSlot,
    createSpell
  };
})();