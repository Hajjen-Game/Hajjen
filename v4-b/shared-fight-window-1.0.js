(()=>{
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone)return;

  const $=id=>document.getElementById(id);
  const modal=$('combatModal');
  const card=modal?.querySelector('.modal-card');
  const tier=$('combatTier');
  const title=$('combatTitle');
  const stats=modal?.querySelector('.combat-stats');
  const message=$('combatMessage');
  const spells=$('combatSpells');
  const footer=modal?.querySelector('.combat-footer');
  const potion=$('combatPotionBtn');
  const flee=$('fleeBtn');
  if(!modal||!card||!tier||!title||!stats||!message||!spells||!footer||!potion||!flee)return;

  const state=()=>zone===1?window.HAJJEN_V4B_STATE:window.HAJJEN_CAMPAIGN_STATE;
  const forceClasses=['ember','growth','flow','stone','gale','aether'];

  modal.classList.add('shared-fight-window');
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','combatTitle');
  card.classList.add('combat-card','shared-fight-card');

  let header=card.querySelector('.shared-fight-header');
  if(!header){
    header=document.createElement('div');
    header.className='shared-fight-header';
    card.prepend(header);
  }
  tier.classList.remove('eyebrow');
  tier.classList.add('modal-kicker','shared-fight-tier');
  title.classList.add('shared-fight-title');
  header.append(tier,title);

  stats.classList.add('shared-fight-stats');
  const statRows=[...stats.children].filter(node=>node instanceof Element);

  function normalizeStat(row,fillId,textId,label,kind){
    if(!row)return;
    const fill=$(fillId);
    const value=$(textId);
    const bar=fill?.closest('.bar');
    if(!fill||!value||!bar)return;

    row.classList.add('shared-fight-stat',`shared-fight-${kind}-stat`);
    bar.classList.add('shared-fight-bar',`shared-fight-${kind}-bar`);
    if(kind==='enemy')bar.classList.add('enemy-bar');
    if(kind==='sharkan')bar.classList.add('hp-bar');
    value.classList.add('shared-fight-stat-value');

    let labelNode=row.querySelector('.shared-fight-stat-label');
    if(!labelNode){
      labelNode=document.createElement('span');
      labelNode.className='shared-fight-stat-label';
    }
    labelNode.textContent=label;
    row.replaceChildren(labelNode,value,bar);
  }

  normalizeStat(statRows[0],'enemyHpFill','enemyHpText','ENEMY HP','enemy');
  normalizeStat(statRows[1],'combatHpFill','combatHpText','SHARKAN HP','sharkan');

  message.classList.add('shared-fight-message');
  message.setAttribute('role','status');
  message.setAttribute('aria-live','polite');
  spells.classList.add('shared-fight-spells');
  spells.setAttribute('role','group');
  spells.setAttribute('aria-label','Combat spells');
  footer.classList.add('shared-fight-footer');
  potion.classList.add('shared-fight-potion');
  potion.setAttribute('aria-label','Use Healing Potion');
  flee.classList.add('ghost-btn','shared-fight-flee');
  flee.setAttribute('aria-label','Flee combat');

  card.replaceChildren(header,stats,message,spells,footer);
  footer.replaceChildren(potion,flee);

  function normalizeTier(){
    const combat=state()?.combat;
    const type=combat?.entity?.type;
    const desired=type==='boss'?'BOSS ENCOUNTER':type==='elite'?'ELITE ENCOUNTER':type==='mob'?'MOB ENCOUNTER':null;
    if(desired&&tier.textContent!==desired)tier.textContent=desired;
  }

  function normalizeSpellButtons(){
    const source=state()?.spells||[];
    [...spells.querySelectorAll('button')].forEach((button,index)=>{
      button.classList.add('shared-fight-spell');
      forceClasses.forEach(force=>button.classList.remove(force));
      const force=String(source[index]?.force||'').toLowerCase();
      if(forceClasses.includes(force))button.classList.add(force);
      if(index<4){
        const hotkey=String(index+1);
        button.dataset.hotkey=hotkey;
        button.setAttribute('aria-keyshortcuts',hotkey);
      }else{
        delete button.dataset.hotkey;
        button.removeAttribute('aria-keyshortcuts');
      }
    });
  }

  function sync(){
    normalizeTier();
    normalizeSpellButtons();
    potion.classList.toggle('is-disabled',potion.disabled);
    flee.classList.toggle('is-disabled',flee.disabled);
  }

  new MutationObserver(()=>queueMicrotask(normalizeSpellButtons)).observe(spells,{childList:true,subtree:true});
  new MutationObserver(()=>queueMicrotask(sync)).observe(modal,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>queueMicrotask(normalizeTier)).observe(tier,{childList:true,subtree:true,characterData:true});
  new MutationObserver(()=>queueMicrotask(sync)).observe(potion,{attributes:true,attributeFilter:['disabled']});
  new MutationObserver(()=>queueMicrotask(sync)).observe(flee,{attributes:true,attributeFilter:['disabled']});

  sync();

  window.HAJJEN_SHARED_FIGHT_WINDOW={
    zone,
    root:modal,
    card,
    header,
    stats,
    message,
    spells,
    footer,
    buttons:{potion,flee},
    sync
  };
})();
