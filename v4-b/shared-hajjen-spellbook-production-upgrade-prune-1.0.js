/* HAJJEN Spellbook production strongest-version rule — Zones 1–3. */
(()=>{
  const params=new URLSearchParams(location.search);
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone||(zone===3&&params.get('dev')==='1'))return;
  if(window.HAJJEN_SPELLBOOK_PRODUCTION_UPGRADES)return;

  let attempts=0;
  function boot(){
    const api=window.HAJJEN_SHARED_SPELLBOOK_V2;
    if(!api?.root||!Array.isArray(api.library)||!api.state){if(attempts++<120)setTimeout(boot,25);return;}
    const {root,library,state}=api;
    const SAVE_KEY='hajjen-v4b-campaign';
    const createBtn=root.querySelector('[data-sbv2-create]');
    const preview=root.querySelector('[data-sbv2-preview]');
    const sourcePicker=root.querySelector('[data-sbv2-create-picker]');
    if(!createBtn||!preview||!sourcePicker)return;

    const baseDamage={Growth:24,Ember:32,Flow:26,Stone:29,Gale:23,Aether:35};
    const spellName={Growth:'Thorn Bloom',Ember:'Cinder Burst',Flow:'Tide Lash',Stone:'Stone Breaker',Gale:'Razor Gust',Aether:'Rift Pulse'};
    const modifierBonus={Growth:2,Ember:5,Flow:3,Stone:4,Gale:4,Aether:5};
    const keyOf=spell=>`${String(spell?.force||'').toLowerCase()}::${String(spell?.name||'').toLowerCase()}`;
    const rawDamage=spell=>Number(spell?.damage)||0;
    const rawCooldown=spell=>Math.max(0,Number(spell?.cooldown)||0);
    const better=(a,b)=>rawDamage(a)>rawDamage(b)||(rawDamage(a)===rawDamage(b)&&rawCooldown(a)<rawCooldown(b));

    function copyCraftCore(target,source){
      if(!target||!source)return;
      target.name=source.name;target.force=source.force;target.damage=source.damage;target.ingredientBonus=source.ingredientBonus;target.cooldown=source.cooldown;
      target.craftedFrom=Array.isArray(source.craftedFrom)?[...source.craftedFrom]:source.craftedFrom;
    }
    function persistActiveState(){
      try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{};saved.spells=state.spells;localStorage.setItem(SAVE_KEY,JSON.stringify(saved));}catch{}
    }
    function addToast(text){
      const area=document.getElementById('toastArea');if(!area)return;
      const toast=document.createElement('div');toast.className='toast reward';toast.textContent=text;area.prepend(toast);setTimeout(()=>toast.remove(),1900);
    }

    function normalizeLibrary({notify=false}={}){
      if(!library.length)return [];
      const groups=new Map();
      library.forEach(spell=>{if(!spell||spell.fallback)return;const key=keyOf(spell);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(spell);});
      const upgrades=[],canonicalByKey=new Map();
      groups.forEach((items,key)=>{
        if(!items.length)return;
        let strongest=items[0];items.slice(1).forEach(item=>{if(better(item,strongest))strongest=item;});
        const activeMatches=(state.spells||[]).filter(spell=>spell&&!spell.fallback&&keyOf(spell)===key);
        const canonical=activeMatches[0]||strongest;
        const oldDamage=rawDamage(canonical),oldCooldown=rawCooldown(canonical);
        if(better(strongest,canonical)){copyCraftCore(canonical,strongest);upgrades.push({name:canonical.name,oldDamage,newDamage:rawDamage(canonical),oldCooldown,newCooldown:rawCooldown(canonical)});}
        activeMatches.slice(1).forEach(active=>{if(better(strongest,active))copyCraftCore(active,strongest);});
        canonicalByKey.set(key,canonical);
      });
      const next=[],emitted=new Set();
      library.forEach(spell=>{if(!spell||spell.fallback){next.push(spell);return;}const key=keyOf(spell);if(emitted.has(key))return;emitted.add(key);next.push(canonicalByKey.get(key)||spell);});
      if(next.length!==library.length||upgrades.length){
        library.splice(0,library.length,...next);api.persist?.();persistActiveState();api.render?.();window.HAJJEN_SHARED_ACTION_BAR?.sync?.();window.HAJJEN_ZONE3_ENCHANTMENTS?.sync?.();
        if(notify&&upgrades.length){const last=upgrades[upgrades.length-1];addToast(`${last.name.toUpperCase()} UPGRADED · ${last.oldDamage} → ${last.newDamage}`);}
      }
      return upgrades;
    }

    function selectedForces(){
      const picks=[...sourcePicker.querySelectorAll(':scope > .sbv2-pick')];
      const selected=order=>picks.find(button=>Number.parseInt(button.querySelector(':scope > span')?.textContent||'',10)===order);
      return {first:selected(1)?.querySelector('small')?.textContent?.trim()||'',second:selected(2)?.querySelector('small')?.textContent?.trim()||''};
    }
    function candidateSpell(){const {first,second}=selectedForces();if(!first||!second||baseDamage[first]==null||modifierBonus[second]==null)return null;return {name:spellName[first],force:first,damage:baseDamage[first]+modifierBonus[second]};}
    function bestKnown(candidate){if(!candidate)return null;return library.filter(spell=>spell&&!spell.fallback&&keyOf(spell)===keyOf(candidate)).reduce((best,spell)=>!best||better(spell,best)?spell:best,null);}
    function setUpgradeNote(text,tone){
      let note=preview.querySelector(':scope > .sbv2-upgrade-note');
      if(!text){note?.remove();return;}
      if(!note){note=document.createElement('small');note.className='sbv2-upgrade-note';note.style.display='block';note.style.marginTop='6px';note.style.fontWeight='800';preview.appendChild(note);}
      note.textContent=text;note.style.color=tone==='good'?'#365733':'#7a3d31';
    }
    function syncCraftGuard(){
      const candidate=candidateSpell(),known=bestKnown(candidate);
      if(!candidate||!known){createBtn.removeAttribute('data-sbv2-upgrade-blocked');setUpgradeNote('');return;}
      const levelBonus=(Math.max(1,Number(state.level)||1)-1)*4;
      if(candidate.damage<=rawDamage(known)){
        createBtn.disabled=true;createBtn.dataset.sbv2UpgradeBlocked='1';
        const knownShown=rawDamage(known)+levelBonus,candidateShown=candidate.damage+levelBonus;
        setUpgradeNote(candidate.damage===rawDamage(known)?`You already know this ${candidate.name} (${knownShown} damage).`:`You already know a stronger ${candidate.name} (${knownShown} vs ${candidateShown} damage).`,'bad');
      }else{
        createBtn.removeAttribute('data-sbv2-upgrade-blocked');
        setUpgradeNote(`UPGRADE · replaces your ${rawDamage(known)+levelBonus} damage ${candidate.name}.`,'good');
      }
    }

    normalizeLibrary();syncCraftGuard();
    let queued=false;function scheduleGuard(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;syncCraftGuard();});}
    new MutationObserver(scheduleGuard).observe(sourcePicker,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled']});
    createBtn.addEventListener('click',()=>queueMicrotask(()=>{normalizeLibrary({notify:true});syncCraftGuard();}));
    window.HAJJEN_SPELLBOOK_PRODUCTION_UPGRADES={version:'1.0',normalizeLibrary,syncCraftGuard};
  }
  boot();
})();