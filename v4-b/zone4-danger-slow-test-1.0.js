/* HAJJEN Zone 4 DEV — slower Danger gain test.
   Movement Danger cadence: every 4 steps instead of 3.
   Mob/Elite defeat Danger: +1 instead of +2.
   Harvesting remains +1. */
(()=>{
  if(window.HAJJEN_ZONE4_DANGER_SLOW_TEST)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const dev=!!(window.HAJJEN_ZONE4_DEV_MODE||window.HAJJEN_ZONE4_DEV_REQUESTED||document.documentElement.dataset.hajjenDev==='zone4');
  if(Number(cfg?.zone)!==4||!state||!dev)return;

  const MOVEMENT_STEPS=4;

  // Core counts nextAmbient down to 0, then resets it to its native value (3).
  // Only translate that RESET from 3 -> 4. Do not translate a normal countdown
  // step from 4 -> 3, otherwise the counter can never reach 0.
  const nextDesc=Object.getOwnPropertyDescriptor(state,'nextAmbient');
  if(!nextDesc||nextDesc.configurable){
    let next=Math.max(1,Number(state.nextAmbient)||3);
    if(next===3)next=MOVEMENT_STEPS;
    Object.defineProperty(state,'nextAmbient',{
      configurable:true,enumerable:true,
      get(){return next;},
      set(value){
        let incoming=Number(value);if(!Number.isFinite(incoming))return;
        const isCoreReset=incoming===3&&next<=0;
        next=isCoreReset?MOVEMENT_STEPS:incoming;
      }
    });
  }

  // Core logs kill Danger synchronously. Intercept only those two +2 events,
  // make the real gain +1, and keep the visible event log/report accurate.
  const log=document.getElementById('eventLog');
  if(log&&!log.dataset.zone4DangerSlowWrapped){
    log.dataset.zone4DangerSlowWrapped='1';
    const nativePrepend=log.prepend.bind(log);
    log.prepend=(...nodes)=>{
      for(const node of nodes){
        if(!(node instanceof Element))continue;
        const text=(node.textContent||'').trim();
        const match=text.match(/^Danger \+2 \((mob|elite) defeated\) → (\d+)\/20\.$/i);
        if(!match)continue;
        state.danger=Math.max(0,Math.min(20,(Number(state.danger)||0)-1));
        node.textContent=`Danger +1 (${match[1].toLowerCase()} defeated) → ${Number(state.danger)||0}/20.`;
      }
      return nativePrepend(...nodes);
    };
  }

  window.HAJJEN_ZONE4_DANGER_SLOW_TEST={
    version:'1.2-four-step-reset-safe',movementSteps:MOVEMENT_STEPS,killDanger:1,harvestDanger:1
  };
})();
