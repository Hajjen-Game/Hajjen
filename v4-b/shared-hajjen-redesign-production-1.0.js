/* HAJJEN approved UI redesign — production promotion loader.
   Makes the visual skin proven in zone3.html?dev=1 available in the real
   Zone 1–3 pages without enabling the DEV save-state/bootstrap or Tactical
   preview behaviour. The existing shared gameplay components remain owners of
   all progression and interactions; this file only promotes presentation. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')==='1')return;

  const html=document.documentElement;
  html.dataset.hajjenDev='zone3';       // Activates the approved visual CSS selectors.
  html.dataset.hajjenPromoted='1';      // Explicit production marker for diagnostics.

  const cssFiles=[
    'shared-hajjen-theme-1.0.css?v=13',
    'shared-hajjen-background-1.0.css?v=3',
    'shared-hajjen-board-frame-1.0.css?v=10',
    'shared-hajjen-side-panels-1.0.css?v=1',
    'shared-hajjen-sharkan-light-background-test-1.0.css?v=1',
    'shared-hajjen-card-decks-1.0.css?v=4',
    'shared-hajjen-panel-frame-v2-1.0.css?v=1',
    'shared-hajjen-panel-frame-family-a-1.0.css?v=5',
    'shared-hajjen-objectives-vector-frame-1.0.css?v=9',
    'shared-hajjen-utility-buttons-1.0.css?v=6',
    'shared-hajjen-utility-buttons-vector-fix-1.0.css?v=1',
    'shared-hajjen-title-plaques-1.0.css?v=4',
    'shared-hajjen-title-plaque-vector-1.0.css?v=13',
    'shared-hajjen-card-decks-shell-fix-1.0.css?v=3',
    'shared-hajjen-hand-cards-1.1.css?v=6',
    'shared-hajjen-enchantment-card-fix-1.0.css?v=2',
    'shared-hajjen-hand-card-title-layout-1.0.css?v=2',
    'shared-hajjen-hand-clean-v2-1.0.css?v=1',
    'shared-hajjen-hand-mobile-fix-1.0.css?v=2',
    'shared-hajjen-hand-clean-v2-fix-1.0.css?v=2',
    'shared-hajjen-hand-typography-fit-1.0.css?v=2',
    'shared-hajjen-hand-select-text-align-1.0.css?v=1',
    'shared-hajjen-hand-panel-frame-1.0.css?v=2',
    'shared-hajjen-hand-manipulation-vector-1.0.css?v=1',
    'shared-hajjen-hand-manipulation-vector-fix-1.0.css?v=3',
    'shared-hajjen-hand-enchantment-vector-1.0.css?v=1',
    'shared-hajjen-hand-enchantment-vector-fix-1.0.css?v=2',
    'shared-hajjen-hand-tactical-vector-1.0.css?v=1',
    'shared-hajjen-hand-locked-vector-1.0.css?v=1',
    'shared-hajjen-header-vector-1.0.css?v=3',
    'shared-hajjen-header-background-crop-test-1.0.css?v=3',
    'shared-hajjen-action-bar-background-1.0.css?v=2',
    'shared-hajjen-action-bar-background-fix-1.0.css?v=4'
  ];

  function baseName(src){return src.split('?')[0];}
  function hasStylesheet(src){
    const base=baseName(src);
    return [...document.querySelectorAll('link[rel="stylesheet"][href]')]
      .some(link=>baseName(link.getAttribute('href')||'')===base);
  }
  function ensureStylesheet(src){
    if(hasStylesheet(src))return Promise.resolve();
    return new Promise(resolve=>{
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=src;
      link.addEventListener('load',resolve,{once:true});
      link.addEventListener('error',()=>{console.warn('[HAJJEN] redesign CSS failed:',src);resolve();},{once:true});
      document.head.appendChild(link);
    });
  }

  function markApps(){
    document.querySelectorAll('.app,.campaign-zone-app').forEach(app=>{
      app.classList.add('zone3-app','hajjen-redesign-app');
    });

    /* Zone 1 uses the legacy .board-wrap name while Zones 2–3 call the same
       visual viewport .viewport. Add only the compatibility class so the
       approved responsive vector board frame can mount without changing the
       Zone 1 board dimensions or movement logic. */
    const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
    if(Number(zone)===1){
      document.querySelector('.hajjen-redesign-app .board-wrap')?.classList.add('viewport');
    }
  }

  markApps();
  const appObserver=new MutationObserver(markApps);
  appObserver.observe(document.body,{childList:true,subtree:true});

  const standardScripts=[
    'shared-hajjen-panel-frame-1.0.js?v=2',
    'shared-hajjen-card-decks-height-lock-1.0.js?v=3',
    'shared-hajjen-enchantment-card-asset-1.0.js?v=2',
    'shared-hajjen-hand-panel-frame-1.0.js?v=2',
    'shared-hajjen-objectives-vector-frame-1.0.js?v=11'
  ];

  /* These approved visual modules were intentionally gated behind ?dev=1
     during prototyping. Production loads only this allow-list while a temporary
     URLSearchParams shim satisfies that visual gate. Crucially, the Tactical
     preview and zone3-dev-entry are NOT on this list and never run here. */
  const approvedDevVisualScripts=[
    'shared-hajjen-title-plaque-vector-1.0.js?v=13',
    'shared-hajjen-utility-buttons-vector-fix-1.0.js?v=1',
    'shared-hajjen-hand-manipulation-vector-1.0.js?v=3',
    'shared-hajjen-hand-enchantment-vector-1.0.js?v=1',
    'shared-hajjen-hand-locked-vector-1.0.js?v=1',
    'shared-hajjen-header-vector-1.0.js?v=1',
    'shared-hajjen-board-frame-1.0.js?v=5'
  ];

  function scriptExists(src){
    const base=baseName(src);
    return [...document.scripts].some(script=>baseName(script.getAttribute('src')||'')===base);
  }
  function loadScript(src,{force=false}={}){
    if(!force&&scriptExists(src))return Promise.resolve();
    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.src=src+(src.includes('?')?'&':'?')+'promotion=1';
      script.async=false;
      script.addEventListener('load',resolve,{once:true});
      script.addEventListener('error',()=>{console.warn('[HAJJEN] redesign JS failed:',src);resolve();},{once:true});
      document.body.appendChild(script);
    });
  }

  async function loadSequential(files,options){
    for(const file of files)await loadScript(file,options);
  }

  async function promote(){
    await Promise.all(cssFiles.map(ensureStylesheet));
    markApps();

    /* Load missing non-gated visual helpers first. */
    await loadSequential(standardScripts,{force:false});

    const NativeURLSearchParams=window.URLSearchParams;
    try{
      class HajjenPromotedVisualParams extends NativeURLSearchParams{
        get(name){return name==='dev'?'1':super.get(name);}
      }
      window.URLSearchParams=HajjenPromotedVisualParams;
      /* Force a fresh execution in real Zone 3 because these script tags are
         already present there but returned early before the promotion marker. */
      await loadSequential(approvedDevVisualScripts,{force:true});
    }finally{
      window.URLSearchParams=NativeURLSearchParams;
    }

    /* This helper deliberately keys off the visual data attribute and reuses
       the exact Sharkan texture for Objectives + Event Log. */
    await loadScript('shared-hajjen-light-side-panel-backgrounds-1.0.js?v=1',{force:true});
    markApps();

    document.dispatchEvent(new CustomEvent('hajjen-ui-redesign-promoted',{detail:{version:'1.0'}}));
  }

  promote().catch(err=>console.error('[HAJJEN] UI redesign promotion failed',err));
})();
