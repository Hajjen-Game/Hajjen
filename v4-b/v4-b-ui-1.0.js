(()=>{
  const $=id=>document.getElementById(id);
  const build=document.querySelector('.build');
  if(build)build.textContent='V4-B 1.0 · ZONES 1–3 SYSTEM PASS';
  const meta=document.querySelector('meta[name="hajjen-build"]');
  if(meta)meta.content='v4-b-1.0-zones-1-3';
  document.title='HAJJEN V4-B – Zones 1–3';

  const tactical=document.querySelector('.deck-pile.tactical');
  if(tactical)tactical.remove();
  const enhancement=document.querySelector('.deck-pile.enhancement');
  if(enhancement){enhancement.classList.remove('enhancement');enhancement.classList.add('enchantment');const strong=enhancement.querySelector('strong');if(strong)strong.textContent='ENCHANTMENT';const span=enhancement.querySelector('span');if(span)span.textContent='LOCKED · INTRODUCED IN ZONE 3';}

  const deckRow=document.querySelector('.deck-row');
  if(deckRow)deckRow.classList.add('two-decks');

  const actionHud=document.querySelector('.action-hud');
  const actionbar=$('actionbar');
  if(actionbar&&!actionbar.querySelector('[data-action-spell="3"]')){
    const fourth=document.createElement('button');fourth.type='button';fourth.className='action-slot spell-slot empty';fourth.dataset.actionSpell='3';fourth.textContent='EMPTY SPELL';
    const divider=actionbar.querySelector('.action-divider');actionbar.insertBefore(fourth,divider||actionbar.firstChild);
    fourth.addEventListener('click',()=>document.querySelector('.spellbook-open')?.click());
  }
  const title=actionHud?.querySelector('.action-hud-title span:last-child');if(title)title.textContent='4 SPELLS · POTION';

  const forceClasses=['ember','growth','flow','stone','gale','aether'];
  function syncFourSpellSlots(){
    const spellEls=[...document.querySelectorAll('#spells .spell')];
    [...document.querySelectorAll('[data-action-spell]')].forEach((btn,i)=>{
      btn.className='action-slot spell-slot';const src=spellEls[i];
      if(!src){btn.classList.add('empty');btn.textContent='EMPTY SPELL';return;}
      const force=forceClasses.find(c=>src.classList.contains(c));if(force)btn.classList.add(force);
      const strong=src.querySelector('strong')?.textContent||'SPELL';const spans=[...src.querySelectorAll('span')].map(x=>x.textContent);
      btn.innerHTML=`<strong>${strong}</strong><span>${spans[0]||''}</span><small>${spans[1]||''}</small>`;
    });
  }
  const spells=$('spells');if(spells)new MutationObserver(syncFourSpellSlots).observe(spells,{childList:true,subtree:true,characterData:true});syncFourSpellSlots();

  const help=document.querySelector('#helpModal .help-copy');
  if(help)help.innerHTML='<strong>ZONE 1 GOAL</strong><ul><li>Create a spell as an introduction quest. It gives no XP.</li><li>Defeat 4 normal mobs and both Guardians to unlock Rootmaw.</li><li>After Rootmaw falls, Zone 1 becomes safe. Explore freely, then use the Zone 2 portal.</li></ul><strong>DANGER</strong><ul><li>Every 3 movement steps adds +1 Danger. Harvesting and combat also add pressure.</li><li>Higher Danger increases spawn pressure, enemy power and aggro.</li></ul><strong>MANIPULATION</strong><ul><li>Zone 1 has 3 Manipulation cards. Later zones expand this to 4.</li><li>Tactical cards have been removed from the design.</li></ul><strong>SPELLS</strong><ul><li>Ember Bolt is a permanent Cooldown 0 fallback.</li><li>You can create up to 3 additional spells.</li><li>Cooldown is measured in other spell casts, not real time.</li><li>Primal spells no longer have built-in healing or defense effects. Enchantments take that role from Zone 3 onward.</li></ul><strong>LEVELS</strong><ul><li>Zone 1 cap: Level 4.</li><li>Zone 2 cap: Level 7.</li><li>Zone 3 cap: Level 10.</li></ul><strong>PRIMAL SPRING</strong><ul><li>Restores up to 45 HP once per run. At full HP it remains unused.</li></ul>';
})();
