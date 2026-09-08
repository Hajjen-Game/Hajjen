(()=>{
  /* Zone 3 DEV visual prototype only.
     Reuse the exact rendered Sharkan ::before background for Objectives and
     Event Log so all three side panels share the same approved light texture
     without duplicating the embedded image data. */
  if(document.documentElement.dataset.hajjenDev!=="zone3")return;

  const STYLE_ID="hajjen-light-side-panel-backgrounds";

  function apply(){
    const sharkan=document.querySelector('.zone3-app .shared-status.hajjen-framed-panel');
    if(!sharkan)return false;

    const rendered=getComputedStyle(sharkan,'::before');
    const backgroundImage=rendered.backgroundImage;
    if(!backgroundImage||backgroundImage==='none')return false;

    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent=`
html[data-hajjen-dev="zone3"] .zone3-app .objectives.shared-objectives::before,
html[data-hajjen-dev="zone3"] .zone3-app .shared-event-log.hajjen-framed-panel::before{
  background-color:#efe1c2!important;
  background-image:${backgroundImage}!important;
  background-repeat:no-repeat!important;
  background-position:center center!important;
  background-size:cover!important;
}
`;
    return true;
  }

  if(apply())return;

  const observer=new MutationObserver(()=>{
    if(apply())observer.disconnect();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),5000);
})();
