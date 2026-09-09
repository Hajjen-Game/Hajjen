/* HAJJEN Zone 3 production redesign — gameplay-safe bridge.
   IMPORTANT: this file never changes the URL, never emulates ?dev=1 and never
   re-executes gameplay-adjacent shared components. It enables approved visual
   presentation only after the real Zone 3 systems have initialized. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')==='1')return;

  const html=document.documentElement;
  html.dataset.hajjenDev='zone3';
  html.dataset.hajjenPromoted='zone3-safe';

  function markApps(){
    document.querySelectorAll('.app,.campaign-zone-app').forEach(app=>{
      app.classList.add('zone3-app','hajjen-redesign-app');
    });
  }

  markApps();

  /* The campaign UI is already fully initialized before this file runs. Keep
     the bridge presentation-only: no history.replaceState, DEV emulation,
     board rebuilding or gameplay-component rerenders. */
  const observer=new MutationObserver(markApps);
  observer.observe(document.body,{childList:true,subtree:true});

  /* Approved Action Bar promotion. These two resources are intentionally
     presentation-only: the stylesheet changes layout/skin, while the binder
     only reads existing spell names, sets CSS variables/data attributes and
     mounts a pointer-events:none SVG frame overlay. It never rewrites spell
     button children or mutates loadout/game state. */
  function loadActionBarProduction(){
    const cssHref='shared-hajjen-action-bar-cards-production-1.0.css?v=1';
    const jsSrc='shared-hajjen-action-bar-production-1.0.js?v=1';

    if(![...document.querySelectorAll('link[rel="stylesheet"][href]')]
      .some(link=>(link.getAttribute('href')||'').split('?')[0]===cssHref.split('?')[0])){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=cssHref;
      document.head.appendChild(link);
    }

    if(![...document.scripts]
      .some(script=>(script.getAttribute('src')||'').split('?')[0]===jsSrc.split('?')[0])){
      const script=document.createElement('script');
      script.src=jsSrc;
      script.async=false;
      document.body.appendChild(script);
    }
  }

  loadActionBarProduction();

  document.dispatchEvent(new CustomEvent('hajjen-ui-redesign-promoted',{
    detail:{version:'zone3-safe-1.1-actionbar'}
  }));
})();
