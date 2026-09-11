/* HAJJEN Zone 3 production redesign — gameplay-safe bridge.
   V1.6 keeps the approved Hand/Tactical promotion, stable production Spellbook
   Potion flow, and refreshed compact Fight Window potion layout.
*/
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

  function baseName(src){return src.split('?')[0];}
  function ensureStylesheet(src){
    const base=baseName(src);
    const existing=[...document.querySelectorAll('link[rel="stylesheet"][href]')]
      .find(link=>baseName(link.getAttribute('href')||'')===base);
    if(existing)return Promise.resolve();
    return new Promise(resolve=>{
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=src;
      link.addEventListener('load',resolve,{once:true});
      link.addEventListener('error',()=>{console.warn('[HAJJEN] Zone 3 production CSS failed:',src);resolve();},{once:true});
      document.head.appendChild(link);
    });
  }
  function loadScript(src){
    const base=baseName(src);
    if([...document.scripts].some(script=>baseName(script.getAttribute('src')||'')===base))return Promise.resolve();
    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.addEventListener('load',resolve,{once:true});
      script.addEventListener('error',()=>{console.warn('[HAJJEN] Zone 3 production JS failed:',src);resolve();},{once:true});
      document.body.appendChild(script);
    });
  }

  markApps();
  const observer=new MutationObserver(markApps);
  observer.observe(document.body,{childList:true,subtree:true});

  async function promoteApprovedSystems(){
    await Promise.all([
      ensureStylesheet('shared-hajjen-hand-list-production-1.0.css?v=1'),
      ensureStylesheet('shared-hajjen-tactical-combat-production-1.0.css?v=2')
    ]);
    markApps();
    await loadScript('shared-hajjen-hand-list-production-1.0.js?v=1');
    await loadScript('shared-hajjen-tactical-combat-production-1.0.js?v=2');
    await loadScript('shared-hajjen-spellbook-production-loader-1.0.js?v=3');
    window.HAJJEN_TACTICAL_CARD_PRODUCTION?.sync?.();
    window.HAJJEN_SPELLBOOK_PRODUCTION_POTION?.sync?.();
  }

  promoteApprovedSystems().catch(err=>console.error('[HAJJEN] Zone 3 production promotion failed',err));

  document.dispatchEvent(new CustomEvent('hajjen-ui-redesign-promoted',{
    detail:{version:'zone3-safe-1.6-fight-potion-alignment'}
  }));
})();