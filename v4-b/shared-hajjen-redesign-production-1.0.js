/* HAJJEN approved UI redesign — production promotion loader.
   V1.2 keeps Zone 1–2 on the approved visual skin while avoiding late visual
   decorators that can flicker when a live gameplay component rebuilds DOM. */
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
    'shared-hajjen-hand-manipulation-zone2-stable-icon-1.0.css?v=1',
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

  function zoneNumber(){
    return Number(window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:0));
  }

  function markApps(){
    document.querySelectorAll('.app,.campaign-zone-app').forEach(app=>{
      app.classList.add('zone3-app','hajjen-redesign-app');
    });

    /* Zone 1 uses the legacy .board-wrap name while Zones 2–3 call the same
       visual viewport .viewport. Add only the compatibility class so the
       approved responsive vector board frame can mount without changing the
       Zone 1 board dimensions or movement logic. */
    if(zoneNumber()===1){
      document.querySelector('.hajjen-redesign-app .board-wrap')?.classList.add('viewport');
    }
  }

  function mountExistingPanelFrames(){
    const mount=window.HAJJEN_PANEL_FRAME?.mount;
    if(typeof mount!=='function')return;
    const selectors=[
      '.zone3-app .objectives.shared-objectives',
      '.zone3-app .shared-status',
      '.zone3-app .shared-event-log',
      '.zone3-app .shared-card-decks-panel',
      '.zone3-app .cards-hud .shared-hand-panel'
    ];
    const seen=new Set();
    selectors.forEach(selector=>document.querySelectorAll(selector).forEach(panel=>{
      if(seen.has(panel))return;
      seen.add(panel);
      mount(panel);
    }));
  }

  markApps();
  const appObserver=new MutationObserver(()=>{
    markApps();
    mountExistingPanelFrames();
  });
  appObserver.observe(document.body,{childList:true,subtree:true});

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

  /* Several approved visual modules were intentionally gated by the literal
     ?dev=1 URL while they were prototypes. Temporarily expose that query only
     while those allow-listed presentation scripts execute. replaceState does
     not reload the page and therefore cannot start zone3-dev-entry, which has
     already executed and returned in normal campaign mode. */
  async function withVisualDevQuery(callback){
    const original=`${location.pathname}${location.search}${location.hash}`;
    const devUrl=new URL(location.href);
    devUrl.searchParams.set('dev','1');
    const devRelative=`${devUrl.pathname}${devUrl.search}${devUrl.hash}`;
    history.replaceState(history.state,'',devRelative);
    try{
      await callback();
    }finally{
      history.replaceState(history.state,'',original);
    }
  }

  async function promote(){
    await Promise.all(cssFiles.map(ensureStylesheet));
    markApps();

    /* Zone 1–2 originally initialized Objectives/Status/Event Log before the
       decorative frame helper existed. Load it now and explicitly adopt the
       already-live panels before any vector frame/plaque pass. */
    await loadScript('shared-hajjen-panel-frame-1.0.js?v=2',{force:false});
    mountExistingPanelFrames();

    await withVisualDevQuery(async()=>{
      /* Re-run Card Decks in visual DEV mode. The normal instance deliberately
         built the old production pile markup; this pass rebuilds the same live
         component with the approved clean vector rows while preserving state. */
      await loadScript('shared-card-decks-1.0.js?v=5',{force:true});
      mountExistingPanelFrames();
      await loadScript('shared-hajjen-card-decks-height-lock-1.0.js?v=3',{force:true});

      /* Presentation-only modules. Tactical preview is intentionally absent.
         Zone 2 uses the stable CSS Manipulation medallion instead of the DEV
         MutationObserver decorator, because its live cards are rebuilt during
         movement renders. */
      const presentationScripts=[
        'shared-hajjen-title-plaque-vector-1.0.js?v=13',
        'shared-hajjen-utility-buttons-vector-fix-1.0.js?v=1'
      ];
      if(zoneNumber()!==2)presentationScripts.push('shared-hajjen-hand-manipulation-vector-1.0.js?v=3');
      presentationScripts.push(
        'shared-hajjen-hand-enchantment-vector-1.0.js?v=1',
        'shared-hajjen-hand-locked-vector-1.0.js?v=1',
        'shared-hajjen-header-vector-1.0.js?v=1',
        'shared-hajjen-board-frame-1.0.js?v=5'
      );
      await loadSequential(presentationScripts,{force:true});
    });

    /* Hand outer frame is not DEV-gated. Re-run after the live Hand component
       has settled, then mount every eligible panel before the shared SVG frame
       family is generated. */
    await loadScript('shared-hajjen-hand-panel-frame-1.0.js?v=2',{force:true});
    mountExistingPanelFrames();

    /* Force a fresh shared vector-frame pass. This removes any legacy sliced
       frame that existed before promotion and gives Objectives, Status, Event
       Log, Card Decks, Hand and Action Bar the approved thin frame family. */
    await loadScript('shared-hajjen-objectives-vector-frame-1.0.js?v=11',{force:true});

    /* Reuse the exact approved Sharkan texture for Objectives + Event Log. */
    await loadScript('shared-hajjen-light-side-panel-backgrounds-1.0.js?v=1',{force:true});

    markApps();
    mountExistingPanelFrames();
    document.dispatchEvent(new CustomEvent('hajjen-ui-redesign-promoted',{detail:{version:'1.2'}}));
  }

  promote().catch(err=>console.error('[HAJJEN] UI redesign promotion failed',err));
})();
