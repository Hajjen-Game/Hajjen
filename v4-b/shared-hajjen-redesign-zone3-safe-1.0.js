/* HAJJEN Zone 3 production redesign — gameplay-safe bridge.
   IMPORTANT: this file never changes the URL, never emulates ?dev=1 and never
   re-executes gameplay-adjacent shared components. It only enables the approved
   visual CSS marker after the real Zone 3 systems have initialized. */
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

  /* Campaign/gameplay systems are already initialized. Keep this bridge
     presentation-only: no script reinjection, URL spoofing, board rebuilding,
     component rerenders or live gameplay-DOM rewriting. */
  const observer=new MutationObserver(markApps);
  observer.observe(document.body,{childList:true,subtree:true});

  document.dispatchEvent(new CustomEvent('hajjen-ui-redesign-promoted',{
    detail:{version:'zone3-safe-1.2'}
  }));
})();