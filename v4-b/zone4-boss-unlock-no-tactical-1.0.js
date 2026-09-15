/* HAJJEN Zone 4 DEV — boss unlock no longer requires spending Tactical cards.
   Tactical remains a run tool, not a mandatory gate. */
(()=>{
  if(window.HAJJEN_ZONE4_BOSS_NO_TACTICAL)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(Number(cfg?.zone)!==4||!state)return;

  cfg.requireIntroForBoss=false;
  if(cfg.introType==='tactical-pair')state.introComplete=true;

  const ui=window.HAJJEN_SHARED_UI_CONFIG?.zones?.[4];
  if(ui){
    if(Array.isArray(ui.objectives))ui.objectives=ui.objectives.filter(item=>item?.kind!=='intro');
    if(Array.isArray(ui.help)){
      const goal=ui.help.find(section=>section?.title==='ZONE 4 GOAL');
      if(goal&&Array.isArray(goal.items)){
        goal.items=goal.items.filter(item=>!/use both tactical cards/i.test(String(item||'')));
      }
    }
  }

  const log=document.getElementById('eventLog');
  if(log&&!log.dataset.zone4BossNoTacticalWrapped){
    log.dataset.zone4BossNoTacticalWrapped='1';
    const nativePrepend=log.prepend.bind(log);
    log.prepend=(...nodes)=>{
      for(const node of nodes){
        if(!(node instanceof Element))continue;
        const text=(node.textContent||'').trim();
        if(/^Zone 4 boss unlocked:/i.test(text)){
          node.textContent=`Zone 4 boss unlocked: ${Number(cfg.mobTarget)||7} mobs, ${Number(cfg.eliteTarget)||2} elites, Level ${Number(cfg.bossLevelTarget)||13}.`;
        }
      }
      return nativePrepend(...nodes);
    };
  }

  const world=document.getElementById('world');
  function patchBossInfo(){
    if(state.bossUnlocked)return;
    const desc=document.getElementById('tileDesc');
    const title=document.getElementById('tileTitle');
    if(!desc||!title||title.textContent!==cfg.bossTitle)return;
    desc.textContent=`Defeat ${Number(cfg.mobTarget)||7} mobs and both elites, and reach Level ${Number(cfg.bossLevelTarget)||13}.`;
  }
  const schedulePatch=()=>queueMicrotask(()=>queueMicrotask(patchBossInfo));
  world?.addEventListener('mouseover',schedulePatch);
  world?.addEventListener('click',schedulePatch);

  window.HAJJEN_ZONE4_BOSS_NO_TACTICAL={version:'1.0',requirements:{mobs:Number(cfg.mobTarget)||7,elites:Number(cfg.eliteTarget)||2,level:Number(cfg.bossLevelTarget)||13}};
})();
