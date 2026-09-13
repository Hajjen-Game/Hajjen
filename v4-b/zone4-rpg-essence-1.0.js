/* HAJJEN Zone 4 DEV — Primal Essence / expedition stakes.
   Run-local Essence is carried at risk. Mobs/elites/boss grant deterministic
   amounts. Primal Springs secure all carried Essence; death loses only the
   unsecured amount. Successful zone clear secures anything still carried.
   No core combat, movement, loot, or Hand rewrite. */
(()=>{
  if(window.HAJJEN_ZONE4_RPG_ESSENCE)return;

  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(Number(cfg?.zone)!==4||!state)return;

  const VALUES={mob:10,elite:30,boss:60};
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  let started=false;
  let timer=null;

  const carried=()=>Math.max(0,Number(state.unsecuredEssence)||0);
  const secured=()=>Math.max(0,Number(window.HAJJEN_RPG_STATE?.getProfile?.()?.currencies?.securedEssence)||0);

  function addLog(text,type='reward'){
    if(!eventLog)return;
    const row=document.createElement('div');
    row.className=`event ${type}`;
    row.textContent=text;
    eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function addToast(text,type='reward'){
    if(!toastArea)return;
    const row=document.createElement('div');
    row.className=`toast ${type}`;
    row.textContent=text;
    toastArea.prepend(row);
    setTimeout(()=>row.remove(),1700);
  }

  function notify(reason,amount=0){
    document.dispatchEvent(new CustomEvent('hajjen:rpg-essence-changed',{
      detail:{zone:4,reason,amount,carried:carried(),secured:secured()}
    }));
  }

  function mountStatus(){
    const panel=window.HAJJEN_SHARED_STATUS?.panel||document.querySelector('.shared-status');
    if(!panel)return false;
    let row=panel.querySelector('.zone4-rpg-essence-line');
    if(!row){
      row=document.createElement('div');
      row.className='zone4-rpg-essence-line';
      row.innerHTML='<div><span>PRIMAL ESSENCE</span><small>Carried Essence is lost on defeat</small></div><strong data-zone4-essence-carried>0</strong><em>AT RISK</em>';
      const danger=panel.querySelector('.danger-line');
      panel.insertBefore(row,danger||panel.querySelector('.danger-expanded')||null);
    }
    const value=row.querySelector('[data-zone4-essence-carried]');
    if(value)value.textContent=String(carried());
    row.classList.toggle('has-essence',carried()>0);
    return true;
  }

  function syncBackpack(){
    const modal=document.getElementById('zone4RpgBackpackModal');
    const meta=modal?.querySelector('.zone4-rpg-summary-meta');
    if(!meta)return;
    let line=meta.querySelector('.zone4-rpg-carried-essence');
    if(!line){
      line=document.createElement('small');
      line.className='zone4-rpg-carried-essence';
      meta.appendChild(line);
    }
    line.textContent=`${carried()} carried · lost on defeat`;
  }

  function syncUi(){mountStatus();syncBackpack();}

  function award(kind,count=1){
    const unit=VALUES[kind]||0;
    const amount=Math.max(0,unit*Math.max(0,Number(count)||0));
    if(!amount)return;
    state.unsecuredEssence=carried()+amount;
    const label=kind==='elite'?'Elite':kind==='boss'?'Boss':'Mob';
    addToast(`+${amount} PRIMAL ESSENCE`,'reward');
    addLog(`${label} yielded ${amount} Primal Essence · ${carried()} carried.`,'reward');
    syncUi();notify('earned',amount);
  }

  function secure(reason='spring'){
    const amount=carried();
    if(!amount)return 0;
    const rpg=window.HAJJEN_RPG_STATE;
    if(!rpg?.updateProfile)return 0;
    const changed=rpg.updateProfile(profile=>{
      profile.currencies=profile.currencies||{};
      profile.currencies.securedEssence=Math.max(0,Number(profile.currencies.securedEssence)||0)+amount;
      return profile;
    },reason==='spring'?'essence-secured-at-spring':'essence-secured-zone-clear');
    if(!changed)return 0;

    state.unsecuredEssence=0;
    if(reason==='spring'){
      addToast(`ESSENCE SECURED · +${amount}`,'reward');
      addLog(`Primal Spring secured ${amount} Primal Essence. Secured Essence is safe on defeat.`,'reward');
    }else{
      addToast(`EXPEDITION ESSENCE SECURED · +${amount}`,'reward');
      addLog(`Zone cleared · ${amount} carried Primal Essence became secured.`,'reward');
    }
    syncUi();notify('secured',amount);
    return amount;
  }

  function loseOnDefeat(){
    const amount=carried();
    state.unsecuredEssence=0;
    if(amount>0){
      addToast(`-${amount} ESSENCE LOST`,'danger');
      addLog(`Defeat lost ${amount} unsecured Primal Essence. Secured Essence remains safe.`,'danger');
    }else{
      addLog('Defeat lost no Primal Essence because none was unsecured.','system');
    }
    syncUi();notify('lost',amount);
    return amount;
  }

  function wrapRunReport(){
    const report=window.HAJJEN_V4B_ZONE4_RUN_REPORT;
    if(!report||report.__zone4EssenceWrapped||typeof report.getText!=='function')return false;
    const original=report.getText.bind(report);
    report.getText=()=>{
      const text=original();
      const line=`Primal Essence: ${carried()} carried | ${secured()} secured`;
      if(text.includes('Primal Essence:'))return text;
      return text.replace(/(Danger: .*\n)/,`$1${line}\n`);
    };
    report.__zone4EssenceWrapped=true;
    return true;
  }

  function start(){
    if(started||!window.HAJJEN_RPG_STATE)return false;
    started=true;
    state.unsecuredEssence=Math.max(0,Number(state.unsecuredEssence)||0);

    let seenMobKills=Math.max(0,Number(state.mobKills)||0);
    let seenEliteKills=Math.max(0,Number(state.eliteKills)||0);
    let seenBossKilled=!!state.bossKilled;
    let defeatHandled=!!state.gameOver;
    let clearHandled=!!state.zoneCleared;

    document.addEventListener('hajjen:primal-spring-used',event=>{
      if(Number(event.detail?.zone)!==4)return;
      secure('spring');
    });
    document.addEventListener('hajjen:rpg-profile-changed',syncUi);
    document.addEventListener('hajjen-ui-redesign-promoted',()=>setTimeout(syncUi,0),{once:true});

    function tick(){
      const mobs=Math.max(0,Number(state.mobKills)||0);
      const elites=Math.max(0,Number(state.eliteKills)||0);
      if(mobs>seenMobKills){award('mob',mobs-seenMobKills);seenMobKills=mobs;}
      if(elites>seenEliteKills){award('elite',elites-seenEliteKills);seenEliteKills=elites;}
      if(!!state.bossKilled&&!seenBossKilled){seenBossKilled=true;award('boss',1);}

      if(!!state.zoneCleared&&!clearHandled){clearHandled=true;secure('zone-clear');}
      if(!!state.gameOver&&!defeatHandled){defeatHandled=true;loseOnDefeat();}

      wrapRunReport();
      syncUi();
    }

    timer=setInterval(tick,80);
    tick();

    window.HAJJEN_ZONE4_RPG_ESSENCE={
      version:'1.0-carried-secured-death-stakes',
      values:{...VALUES},
      getCarried:carried,
      getSecured:secured,
      award,
      secure,
      loseOnDefeat,
      sync:tick,
      stop:()=>{if(timer)clearInterval(timer);}
    };
    return true;
  }

  if(!start()){
    [50,120,250,500,1000].forEach(delay=>setTimeout(start,delay));
  }
})();
