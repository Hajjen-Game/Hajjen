(()=>{
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  const state=zone===1?window.HAJJEN_V4B_STATE:window.HAJJEN_CAMPAIGN_STATE;
  if((zone!==1&&zone!==2)||!state)return;

  const $=id=>document.getElementById(id);
  const SAVE_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const modal=$('spellbookModal');
  const legacyPanel=modal?.querySelector('.spell-panel');
  const body=modal?.querySelector('.spellbook-modal-body')||legacyPanel?.parentElement;
  const spellSource=$(zone===1?'spells':'spellGrid');
  const ingredientSource=zone===1?$('ingredients'):($('spellIngredientText')||$('spellResources'));
  const legacyCraftBtn=$(zone===1?'craftBtn':'craftSpellBtn');
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
  const ingredientInventory=()=>zone===1?(state.ingredients||[]):(state.spellIngredients||[]);
  const forceClass=force=>String(force||'').toLowerCase();
  const isLocked=()=>!!state.combat||!!state.gameOver;
  const spellDamage=spell=>(Number(spell?.damage)||0)+(Math.max(1,Number(state.level)||1)-1)*4+(Number(spell?.enchantDamage)||0);
  const cooldown=spell=>Math.max(0,(Number(spell?.cooldown)||0)-(Number(spell?.cooldownReduction)||0));

  if(zone===1&&!localStorage.getItem(SAVE_KEY))localStorage.removeItem(LIBRARY_KEY);

  let library=[];
  try{
    const saved=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'null');
    if(Array.isArray(saved?.spells))library=saved.spells.filter(spell=>spell&&!spell.fallback);
  }catch{}

  let selectedIngredients=[];
  let lastCreatedId=null;
  let syncQueued=false;

  function persistLibrary(){
    localStorage.setItem(LIBRARY_KEY,JSON.stringify({version:1,spells:library}));
  }

  function persistActiveState(){
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw)return;
    try{
      const saved=JSON.parse(raw)||{};
      saved.spells=state.spells;
      saved.ingredients=ingredientInventory();
      localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
    }catch{}
  }

  function addKnown(spell){
    if(!spell||spell.fallback)return;
    if(!spell.id)spell.id=`crafted-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const index=library.findIndex(item=>item?.id===spell.id);
    if(index>=0)library[index]=spell;
    else library.push(spell);
  }
  state.spells.forEach(addKnown);
  persistLibrary();

  modal.classList.add('shared-spellbook-v2-modal');
  body.classList.add('shared-spellbook-v2-body');
  legacyPanel.classList.add('shared-spellbook-v2-compat');
  legacyPanel.setAttribute('aria-hidden','true');

  const root=document.createElement('div');
  root.className='shared-spellbook-v2';
  root.dataset.sharedComponent='spellbook-v2';
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
        <p class="sbv2-section-copy">Crafted spells stay in your library when another spell takes their Action Bar slot.</p>
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

  function detailLine(spell){return `${spell.force} · ${spellDamage(spell)} DAMAGE · CD ${cooldown(spell)}`;}
  function loadedIndex(spell){return state.spells.findIndex(item=>item?.id===spell?.id);}

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

    const inventory=ingredientInventory();
    const text=inventory.length?inventory.map(item=>`${item.name} (${item.force})`).join(' · '):'None';
    if(zone===1)ingredientSource.textContent=text;
    else if(ingredientSource.id==='spellResources')ingredientSource.textContent=`Spell ingredients: ${text}`;
    else ingredientSource.textContent=text;

    if(zone===1){
      const objective=$('spellQuest');
      if(objective)objective.textContent=state.spellQuestCompleted?'Spell: CREATED':'Spell: NOT CREATED';
    }

    legacyCraftBtn.disabled=inventory.length<2||isLocked();
    legacyCraftBtn.textContent='CREATE SPELL';
    persistActiveState();
    window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
    window.HAJJEN_SHARED_UI?.sync?.();
  }

  function equipToSlot(spell,slotNumber){
    if(!spell||isLocked()||slotNumber<2||slotNumber>4)return;
    const targetIndex=slotNumber-1;
    const currentIndex=loadedIndex(spell);
    if(targetIndex>state.spells.length||currentIndex===targetIndex)return;

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

    state.spells.forEach(addKnown);
    persistLibrary();
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
      button.title='Fill the open slot with a spell from the library first.';
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
    const ingredient=selectedIngredients[index];
    if(!ingredient)return `<strong>INGREDIENT ${index+1}</strong><span>${index===0?'Determines Primal Force':'Adds modifier'}</span><em>NOT SELECTED</em>`;
    return `<strong>INGREDIENT ${index+1}</strong><span>${index===0?'PRIMAL FORCE':'MODIFIER'}</span><em>${ingredient.name} · ${ingredient.force}</em>`;
  }

  function renderCreate(){
    const inventory=ingredientInventory();
    selectedIngredients=selectedIngredients.filter(item=>inventory.includes(item)).slice(0,2);
    createSlots.innerHTML=`<div class="sbv2-create-slot ${selectedIngredients[0]?'filled':''}">${selectionLabel(0)}</div><div class="sbv2-plus">+</div><div class="sbv2-create-slot ${selectedIngredients[1]?'filled':''}">${selectionLabel(1)}</div>`;
    createPicker.replaceChildren();

    inventory.forEach(ingredient=>{
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
    ingredientInventory().forEach(item=>{
      const key=`${item.force}::${item.name}`;
      const current=groups.get(key)||{force:item.force,name:item.name,count:0};
      current.count++;
      groups.set(key,current);
    });
    return groups;
  }

  function renderIngredients(){
    const inventory=ingredientInventory();
    ingredientCount.textContent=`${inventory.length} AVAILABLE`;
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
    const note=document.createElement('div');
    note.className='toast reward';
    note.textContent=text;
    area.prepend(note);
    setTimeout(()=>note.remove(),1750);
  }

  function createSpell(){
    if(selectedIngredients.length!==2||isLocked())return;
    const inventory=ingredientInventory();
    const [first,second]=selectedIngredients;
    if(!inventory.includes(first)||!inventory.includes(second))return;
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
      .map(item=>inventory.indexOf(item))
      .filter(index=>index>=0)
      .sort((a,b)=>b-a)
      .forEach(index=>inventory.splice(index,1));

    if(zone===1)state.spellQuestCompleted=true;
    selectedIngredients=[];
    persistLibrary();
    syncCompatibilitySource();
    addEvent(`Created ${spell.name} from ${first.name} + ${second.name}. It was added to the Spell Library.`);
    toast(`${spell.name.toUpperCase()} ADDED TO LIBRARY`);
    render();
  }

  function render(){
    state.spells.forEach(addKnown);
    persistLibrary();
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

  const resetBtn=$('resetBtn');
  resetBtn?.addEventListener('click',()=>localStorage.removeItem(LIBRARY_KEY),true);

  const helpSpellLine=[...document.querySelectorAll('#helpModal .help-copy li')].find(li=>/free crafted-spell slot|create another spell|replace/i.test(li.textContent||''));
  if(helpSpellLine)helpSpellLine.textContent='Crafted spells stay in the Spell Library. Choose which three are loaded beside the permanent Ember Bolt.';

  syncCompatibilitySource();
  render();

  window.HAJJEN_SHARED_SPELLBOOK_V2={
    version:'1.0',
    zone,
    root,
    library,
    state,
    render,
    equipToSlot,
    createSpell,
    persist:persistLibrary
  };
})();