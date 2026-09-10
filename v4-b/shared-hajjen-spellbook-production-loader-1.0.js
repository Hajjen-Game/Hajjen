/* HAJJEN Spellbook production promotion loader — Zones 1–3.
   Reuses the approved DEV CSS verbatim by scoping it to a production-only body class,
   then loads the production-safe JS binders in the same order as the tested DEV stack. */
(()=>{
  const params=new URLSearchParams(location.search);
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone||(zone===3&&params.get('dev')==='1'))return;
  if(window.HAJJEN_SPELLBOOK_PRODUCTION_LOADER)return;
  window.HAJJEN_SPELLBOOK_PRODUCTION_LOADER={version:'1.1-potency-guard',state:'waiting'};

  const cssFiles=[
    'shared-hajjen-spellbook-dev-1.0.css',
    'shared-hajjen-spellbook-dev-v2-picker-1.0.css',
    'shared-hajjen-spellbook-dev-v3-frame-surface-fix-1.0.css',
    'shared-hajjen-spellbook-dev-v5-create-ux-1.0.css'
  ];
  const scriptFiles=[
    'shared-hajjen-spellbook-production-visual-1.0.js',
    'shared-hajjen-spellbook-production-picker-1.0.js',
    'shared-hajjen-spellbook-production-upgrade-prune-1.0.js',
    'shared-hajjen-spellbook-production-create-ux-1.0.js'
  ];

  function waitForV2(){
    return new Promise(resolve=>{
      let attempts=0;
      const check=()=>{
        if(window.HAJJEN_SHARED_SPELLBOOK_V2?.root){resolve(true);return;}
        if(attempts++>=160){resolve(false);return;}
        setTimeout(check,25);
      };
      check();
    });
  }

  async function installCss(){
    const chunks=await Promise.all(cssFiles.map(async file=>{
      try{
        const response=await fetch(`${file}?v=production-2`,{cache:'force-cache'});
        if(!response.ok)throw new Error(`${response.status}`);
        return await response.text();
      }catch(error){
        console.error('[HAJJEN] Spellbook production CSS failed:',file,error);
        return '';
      }
    }));
    const style=document.createElement('style');
    style.id='hajjen-spellbook-production-styles';
    style.textContent=chunks.join('\n\n').replaceAll('body.zone3-dev-mode','body.hajjen-spellbook-production');
    document.head.appendChild(style);
  }

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-hajjen-spellbook-production-src="${src}"]`);
      if(existing){resolve();return;}
      const script=document.createElement('script');
      script.src=`${src}?v=2`;
      script.dataset.hajjenSpellbookProductionSrc=src;
      script.onload=()=>resolve();
      script.onerror=()=>reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  (async()=>{
    const ready=await waitForV2();
    if(!ready){window.HAJJEN_SPELLBOOK_PRODUCTION_LOADER.state='v2-timeout';return;}
    document.body.classList.add('hajjen-spellbook-production');
    await installCss();
    for(const src of scriptFiles){
      try{await loadScript(src);}catch(error){console.error('[HAJJEN] Spellbook production script failed:',error);window.HAJJEN_SPELLBOOK_PRODUCTION_LOADER.state='script-error';return;}
    }
    window.HAJJEN_SPELLBOOK_PRODUCTION_LOADER.state='ready';
    window.HAJJEN_SPELLBOOK_PRODUCTION_VISUAL?.sync?.();
    window.HAJJEN_SPELLBOOK_PRODUCTION_PICKER?.sync?.();
    window.HAJJEN_SPELLBOOK_PRODUCTION_UPGRADES?.syncCraftGuard?.();
    window.HAJJEN_SPELLBOOK_PRODUCTION_CREATE_UX?.sync?.();
  })();
})();