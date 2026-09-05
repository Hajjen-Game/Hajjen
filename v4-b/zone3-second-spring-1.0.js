(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const system=window.HAJJEN_ZONE3_SYSTEM;
  const springCfg=cfg?.spring2;
  const entities=system?.entities;
  const world=document.getElementById('world');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!cfg||cfg.zone!==3||!state||!springCfg||!(entities instanceof Map)||!world||!eventLog)return;

  const key=(r,c)=>`${r},${c}`;
  const springEntity={
    type:'spring',mark:'✧',title:springCfg.title||'PRIMAL SPRING',
    r:Number(springCfg.row),c:Number(springCfg.col),depleted:false,zone3SecondSpring:true
  };
  if(!Number.isInteger(springEntity.r)||!Number.isInteger(springEntity.c))return;
  if(entities.has(key(springEntity.r,springEntity.c)))return;
  entities.set(key(springEntity.r,springEntity.c),springEntity);

  let used=false;
  let wasOn=false;
  const healAmount=Math.max(1,Number(springCfg.heal)||75);
  const tile=()=>world.querySelector(`.tile[data-r="${springEntity.r}"][data-c="${springEntity.c}"]`);

  function addLog(text,type='reward'){
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
  function syncHpUi(){
    const hpText=document.getElementById('hpText');
    if(hpText)hpText.textContent=`${state.hp} / ${state.maxHp}`;
    const hpFill=document.getElementById('hpFill');
    if(hpFill)hpFill.style.width=`${state.maxHp?state.hp/state.maxHp*100:0}%`;
    const combatHpText=document.getElementById('combatHpText');
    if(combatHpText&&state.combat)combatHpText.textContent=`${state.hp} / ${state.maxHp}`;
    const combatHpFill=document.getElementById('combatHpFill');
    if(combatHpFill&&state.combat)combatHpFill.style.width=`${state.maxHp?state.hp/state.maxHp*100:0}%`;
  }
  function decorate(){
    const node=tile();
    if(!node)return;
    node.classList.add('special','spring');
    node.dataset.mark=used?'×':'✧';
    node.classList.toggle('completed',used);
  }
  function showInfo(){
    const title=document.getElementById('tileTitle');
    const sub=document.getElementById('tileSub');
    const desc=document.getElementById('tileDesc');
    if(title)title.textContent='PRIMAL SPRING';
    if(sub)sub.textContent=used?'Depleted':'Restorative site · One use';
    if(desc)desc.textContent=used
      ?'The spring has already restored Sharkan this run.'
      :`Step here while injured to restore up to ${healAmount} HP. It becomes depleted after use.`;
  }
  function activate(){
    if(used||state.combat||state.gameOver||state.hp>=state.maxHp)return false;
    const heal=Math.min(healAmount,state.maxHp-state.hp);
    state.hp+=heal;
    used=true;
    springEntity.depleted=true;
    state.zone3SecondSpringUsed=true;
    state.zone3SpringHealing=(state.zone3SpringHealing||0)+heal;
    addLog(`Primal Spring restored ${heal} HP.`,'reward');
    addToast(`PRIMAL SPRING · +${heal} HP`,'reward');
    syncHpUi();
    decorate();
    showInfo();
    return true;
  }
  function check(){
    decorate();
    const on=state.row===springEntity.r&&state.col===springEntity.c;
    if(on&&!wasOn&&!used&&!state.combat&&!state.gameOver){
      if(state.hp>=state.maxHp){
        addLog('Primal Spring remains unused because Sharkan is already at full HP.','system');
        addToast('HP FULL — SPRING REMAINS','system');
      }else activate();
    }
    wasOn=on;
  }
  function preActivate(targetR,targetC){
    if(state.combat||state.gameOver)return;
    if(Math.abs(targetR-state.row)+Math.abs(targetC-state.col)!==1)return;
    if(targetR===springEntity.r&&targetC===springEntity.c&&!used&&state.hp<state.maxHp)activate();
  }

  const keyMoves={ArrowUp:[-1,0],w:[-1,0],W:[-1,0],ArrowDown:[1,0],s:[1,0],S:[1,0],ArrowLeft:[0,-1],a:[0,-1],A:[0,-1],ArrowRight:[0,1],d:[0,1],D:[0,1]};
  window.addEventListener('keydown',event=>{
    const move=keyMoves[event.key];
    if(move)preActivate(state.row+move[0],state.col+move[1]);
  },true);
  world.addEventListener('click',event=>{
    const node=event.target instanceof Element?event.target.closest('.tile'):null;
    if(!node)return;
    preActivate(Number(node.dataset.r),Number(node.dataset.c));
  },true);
  world.addEventListener('mouseover',event=>{
    const node=event.target instanceof Element?event.target.closest('.tile'):null;
    if(node===tile())queueMicrotask(showInfo);
  });
  world.addEventListener('click',event=>{
    const node=event.target instanceof Element?event.target.closest('.tile'):null;
    if(node===tile())queueMicrotask(showInfo);
  });

  setInterval(check,80);
  decorate();
  window.HAJJEN_ZONE3_SECOND_SPRING={version:'1.0',entity:springEntity,get used(){return used;},activate};
})();
