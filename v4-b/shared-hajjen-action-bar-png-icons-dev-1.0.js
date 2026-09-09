/* HAJJEN Zone 3 DEV Action Bar PNG icon binder.
   Presentation-only: reads the existing spell name and sets a CSS variable on
   the existing Action Bar button. It never rewrites button children, never
   observes the Action Bar itself and never intercepts gameplay input. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;

  const actionbar=document.getElementById('actionbar');
  if(!actionbar)return;

  const iconFiles={
    'ember bolt':'ember-bolt.png',
    'cinder burst':'cinder-burst.png',
    'thorn bloom':'thorn-bloom.png',
    'tide lash':'tide-lash.png',
    'stone breaker':'stone-breaker.png',
    'razor gust':'razor-gust.png',
    'rift pulse':'rift-pulse.png',
    'healing potion':'healing-potion.png'
  };

  function normalizedName(slot){
    if(slot.classList.contains('shared-potion-slot'))return 'healing potion';
    return (slot.querySelector(':scope > strong')?.textContent||'').trim().toLowerCase();
  }

  function syncIcons(){
    actionbar.querySelectorAll(':scope > .action-slot').forEach(slot=>{
      const name=normalizedName(slot);
      const file=iconFiles[name];
      if(!file){
        slot.classList.remove('has-action-png-icon');
        slot.style.removeProperty('--ab-icon-image');
        delete slot.dataset.actionPngIcon;
        return;
      }

      slot.style.setProperty('--ab-icon-image',`url("assets/action-bar-icons/${file}")`);
      slot.classList.add('has-action-png-icon');
      slot.dataset.actionPngIcon=file;
    });
  }

  let raf=0;
  function schedule(){
    if(raf)cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      raf=0;
      syncIcons();
    });
  }

  syncIcons();
  requestAnimationFrame(syncIcons);

  /* Observe only the spell SOURCE. shared-action-bar already mirrors that source
     into the Action Bar in a microtask; our frame callback runs afterward and
     only refreshes CSS variables/classes on the existing buttons. */
  const spellSource=window.HAJJEN_SHARED_ACTION_BAR?.spellSource||document.getElementById('spellGrid');
  const observer=spellSource&&typeof MutationObserver==='function'
    ?new MutationObserver(schedule)
    :null;
  observer?.observe(spellSource,{childList:true,subtree:true,characterData:true});

  window.HAJJEN_ACTION_BAR_PNG_ICONS_DEV={
    version:'1.0',
    iconFiles,
    sync:syncIcons,
    observer
  };
})();
