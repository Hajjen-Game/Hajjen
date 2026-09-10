(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const api=window.HAJJEN_SHARED_SPELLBOOK_V2;
  const eventLog=document.getElementById('eventLog');
  if(!cfg||cfg.zone!==2||!state||!api||api.zone!==2||!eventLog)return;

  const ZONE2_CRAFT_BONUS=4;
  const root=api.root;
  const createBtn=root?.querySelector('[data-sbv2-create]');
  const sourcePicker=root?.querySelector('[data-sbv2-create-picker]');
  const preview=root?.querySelector('[data-sbv2-preview]');
  const baseDamage={Growth:24,Ember:32,Flow:26,Stone:29,Gale:23,Aether:35};
  const baseCooldown={Growth:1,Ember:2,Flow:1,Stone:2,Gale:1,Aether:3};
  const spellName={Growth:'Thorn Bloom',Ember:'Cinder Burst',Flow:'Tide Lash',Stone:'Stone Breaker',Gale:'Razor Gust',Aether:'Rift Pulse'};
  const modifierBonus={Growth:2,Ember:5,Flow:3,Stone:4,Gale:4,Aether:5};
  const keyOf=spell=>`${String(spell?.force||'').toLowerCase()}::${String(spell?.name||'').toLowerCase()}`;
  const rawDamage=spell=>Number(spell?.damage)||0;
  const rawCooldown=spell=>Math.max(0,Number(spell?.cooldown)||0);
  const levelBonus=()=>Math.max(0,(Math.max(1,Number(state.level)||1)-1)*4);
  let lastEarlyAppliedRecipe='';
  let guardQueued=false;

  function patchPreview(){
    const line=preview?.querySelector('p');
    const note=preview?.querySelector('small:not(.sbv2-upgrade-note)');
    if(!line||!note||!/\bDAMAGE\b/i.test(line.textContent||'')||/Zone 2 potency/i.test(note.textContent||''))return;
    line.textContent=(line.textContent||'').replace(/(·\s*)(\d+)(\s+DAMAGE\b)/i,(_,before,value,after)=>`${before}${Number(value)+ZONE2_CRAFT_BONUS}${after}`);
    note.textContent=`${note.textContent} Zone 2 potency adds +${ZONE2_CRAFT_BONUS} base damage.`;
  }

  function selectedData(){
    if(!sourcePicker)return [];
    return [...sourcePicker.querySelectorAll(':scope > .sbv2-pick')].map(button=>({
      order:Number.parseInt(button.querySelector(':scope > span')?.textContent||'',10)||0,
      name:button.querySelector('strong')?.textContent?.trim()||'',
      force:button.querySelector('small')?.textContent?.trim()||''
    }));
  }

  function selectedRecipe(){
    const data=selectedData();
    const first=data.find(item=>item.order===1),second=data.find(item=>item.order===2);
    if(!first||!second)return null;
    return {first,second,key:`${first.name}\u0000${second.name}`};
  }

  function candidateSpell(){
    const recipe=selectedRecipe();
    if(!recipe||baseDamage[recipe.first.force]==null||modifierBonus[recipe.second.force]==null)return null;
    return {
      name:spellName[recipe.first.force],
      force:recipe.first.force,
      damage:baseDamage[recipe.first.force]+modifierBonus[recipe.second.force]+ZONE2_CRAFT_BONUS,
      cooldown:baseCooldown[recipe.first.force]||0,
      recipe
    };
  }

  function bestKnown(candidate){
    if(!candidate)return null;
    return (api.library||[])
      .filter(spell=>spell&&!spell.fallback&&keyOf(spell)===keyOf(candidate))
      .reduce((best,spell)=>!best||rawDamage(spell)>rawDamage(best)||(rawDamage(spell)===rawDamage(best)&&rawCooldown(spell)<rawCooldown(best))?spell:best,null);
  }

  function setUpgradeNote(text,tone){
    if(!preview)return;
    let note=preview.querySelector(':scope > .sbv2-upgrade-note');
    if(!text){note?.remove();return;}
    if(!note){
      note=document.createElement('small');
      note.className='sbv2-upgrade-note';
      note.style.display='block';
      note.style.marginTop='6px';
      note.style.fontWeight='800';
      preview.appendChild(note);
    }
    note.textContent=text;
    note.style.color=tone==='good'?'#365733':'#7a3d31';
  }

  function syncUpgradeGuard(){
    guardQueued=false;
    if(!createBtn)return;
    const candidate=candidateSpell();
    if(!candidate)return;
    const known=bestKnown(candidate);
    const locked=!!state.combat||!!state.gameOver;
    if(!known){
      if(!locked)createBtn.disabled=false;
      createBtn.removeAttribute('data-sbv2-upgrade-blocked');
      setUpgradeNote('');
      return;
    }
    const stronger=candidate.damage>rawDamage(known)||(candidate.damage===rawDamage(known)&&candidate.cooldown<rawCooldown(known));
    const knownShown=rawDamage(known)+levelBonus();
    const candidateShown=candidate.damage+levelBonus();
    if(stronger){
      if(!locked)createBtn.disabled=false;
      createBtn.removeAttribute('data-sbv2-upgrade-blocked');
      setUpgradeNote(`UPGRADE · replaces your ${knownShown} damage ${candidate.name}.`,'good');
    }else{
      createBtn.disabled=true;
      createBtn.dataset.sbv2UpgradeBlocked='1';
      setUpgradeNote(candidate.damage===rawDamage(known)?`You already know this ${candidate.name} (${knownShown} damage).`:`You already know a stronger ${candidate.name} (${knownShown} vs ${candidateShown} damage).`,'bad');
    }
  }

  function scheduleUpgradeGuard(){
    if(guardQueued)return;
    guardQueued=true;
    setTimeout(syncUpgradeGuard,0);
  }

  function matchingFreshSpell(firstName,secondName){
    return [...(api.library||[])].reverse().find(spell=>{
      if(!spell||spell.zone2PotencyBonus||spell.zone3PotencyBonus)return false;
      const from=Array.isArray(spell.craftedFrom)?spell.craftedFrom:[];
      return from[0]===firstName&&from[1]===secondName;
    })||null;
  }

  function applyPotency(spell){
    if(!spell||spell.zone2PotencyBonus||spell.zone3PotencyBonus)return false;
    spell.damage=(Number(spell.damage)||0)+ZONE2_CRAFT_BONUS;
    spell.ingredientBonus=(Number(spell.ingredientBonus)||0)+ZONE2_CRAFT_BONUS;
    spell.zone2PotencyBonus=ZONE2_CRAFT_BONUS;
    const active=(state.spells||[]).find(item=>item?.id===spell.id);
    if(active&&active!==spell){
      active.damage=spell.damage;
      active.ingredientBonus=spell.ingredientBonus;
      active.zone2PotencyBonus=ZONE2_CRAFT_BONUS;
    }
    api.persist?.();
    api.render?.();
    window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
    window.HAJJEN_SHARED_UI?.sync?.();
    scheduleUpgradeGuard();
    return true;
  }

  // Apply Zone 2 potency before the production strongest-version pruner gets a
  // chance to compare and collapse a freshly crafted duplicate.
  createBtn?.addEventListener('click',()=>{
    const recipe=selectedRecipe();
    if(!recipe)return;
    const beforeIds=new Set((api.library||[]).map(spell=>spell?.id).filter(Boolean));
    queueMicrotask(()=>{
      const fresh=[...(api.library||[])].reverse().find(spell=>spell&&!spell.fallback&&!beforeIds.has(spell.id));
      if(applyPotency(fresh))lastEarlyAppliedRecipe=recipe.key;
    });
  },true);

  new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      const text=(node.textContent||'').trim();
      const match=/^Created .+? from (.+?) \+ (.+?)\. It was added to the Spell Library\.$/i.exec(text);
      if(!match)continue;
      const recipeKey=`${match[1]}\u0000${match[2]}`;
      queueMicrotask(()=>{
        if(lastEarlyAppliedRecipe===recipeKey){
          lastEarlyAppliedRecipe='';
          node.textContent=`${text} Zone 2 potency: +${ZONE2_CRAFT_BONUS} base damage.`;
          scheduleUpgradeGuard();
          return;
        }
        const spell=matchingFreshSpell(match[1],match[2]);
        if(applyPotency(spell))node.textContent=`${text} Zone 2 potency: +${ZONE2_CRAFT_BONUS} base damage.`;
      });
    }
  }).observe(eventLog,{childList:true});

  sourcePicker&&new MutationObserver(scheduleUpgradeGuard).observe(sourcePicker,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled']});
  createBtn&&new MutationObserver(scheduleUpgradeGuard).observe(createBtn,{attributes:true,attributeFilter:['disabled']});
  root?.addEventListener('click',()=>{queueMicrotask(patchPreview);scheduleUpgradeGuard();});
  patchPreview();
  scheduleUpgradeGuard();

  window.HAJJEN_ZONE2_SPELL_POTENCY={
    version:'1.2-upgrade-guard',
    craftBonus:ZONE2_CRAFT_BONUS,
    syncUpgradeGuard
  };
})();
