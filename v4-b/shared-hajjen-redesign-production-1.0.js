/* HAJJEN approved UI redesign — production promotion loader.
   V1.5 promotes the approved three-column Hand list and Tactical Fight Window
   slots to production Zones 1–2 while preserving the established zone gameplay.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')==='1')return;

  const html=document.documentElement;
  html.dataset.hajjenDev='zone3';
  html.dataset.hajjenPromoted='1';

  const cssFiles=[
    'shared-hajjen-theme-1.0.css?v=13',
    'shared-hajjen-background-1.0.css?v=3',
    'shared-hajjen-board-frame-1.0.css?v=11',
    'shared-hajjen-side-panels-1.0.css?v=1',
    'shared-hajjen-sharkan-light-background-test-1.0.css?v=1',
    'shared-hajjen-card-decks-1.0.css?v=7',
    'shared-hajjen-objectives-vector-frame-1.0.css?v=9',
    'shared-hajjen-utility-buttons-1.0.css?v=6',
    'shared-hajjen-utility-buttons-vector-fix-1.0.css?v=1',
    'shared-hajjen-title-plaques-1.0.css?v=4',
    'shared-hajjen-title-plaque-vector-1.0.css?v=13',
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
    'shared-hajjen-action-bar-background-fix-1.0.css?v=4',
    'shared-hajjen-hand-list-production-1.0.css?v=1',
    'shared-hajjen-tactical-combat-production-1.0.css?v=1'
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

  async function loadSequential(files,options){for(const file of files)await loadScript(file,options);}

  /* A few remaining presentation prototypes are still literal ?dev=1 gated.
     This compatibility bridge is intentionally limited to those visual modules;
     Card Decks and frame systems no longer depend on it. */
  async function withVisualDevQuery(callback){
    const original=`${location.pathname}${location.search}${location.hash}`;
    const devUrl=new URL(location.href);
    devUrl.searchParams.set('dev','1');
    const devRelative=`${devUrl.pathname}${devUrl.search}${devUrl.hash}`;
    history.replaceState(history.state,'',devRelative);
    try{await callback();}finally{history.replaceState(history.state,'',original);}
  }

  async function promote(){
    await Promise.all(cssFiles.map(ensureStylesheet));
    markApps();

    await loadScript('shared-hajjen-panel-frame-1.0.js?v=3',{force:false});
    mountExistingPanelFrames();

    await withVisualDevQuery(async()=>{
      const presentationScripts=[
        'shared-hajjen-title-plaque-vector-1.0.js?v=13',
        'shared-hajjen-utility-buttons-vector-fix-1.0.js?v=1'
      ];
      if(zoneNumber()!==2)presentationScripts.push('shared-hajjen-hand-manipulation-vector-1.0.js?v=3');
      presentationScripts.push(
        'shared-hajjen-hand-enchantment-vector-1.0.js?v=1',
        'shared-hajjen-hand-locked-vector-1.0.js?v=1',
        'shared-hajjen-header-vector-1.0.js?v=1',
        'shared-hajjen-board-frame-1.0.js?v=6'
      );
      await loadSequential(presentationScripts,{force:true});
    });

    await loadScript('shared-hajjen-hand-panel-frame-1.0.js?v=2',{force:true});
    mountExistingPanelFrames();
    await loadScript('shared-hajjen-objectives-vector-frame-1.0.js?v=11',{force:true});
    await loadScript('shared-hajjen-light-side-panel-backgrounds-1.0.js?v=1',{force:true});

    /* New production Hand + Tactical footer. These proxy existing shared gameplay
       rather than replacing it, so Zone 1–2 progression remains unchanged. */
    await loadScript('shared-hajjen-hand-list-production-1.0.js?v=1',{force:false});
    await loadScript('shared-hajjen-tactical-combat-production-1.0.js?v=1',{force:false});

    markApps();
    mountExistingPanelFrames();
    document.dispatchEvent(new CustomEvent('hajjen-ui-redesign-promoted',{detail:{version:'1.5-hand-tactical-production'}}));
  }

  promote().catch(err=>console.error('[HAJJEN] UI redesign promotion failed',err));
})();
