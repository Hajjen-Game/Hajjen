(()=>{
  const eventLog=document.getElementById('eventLog');
  const copyBtn=document.getElementById('copyRunReportBtn');
  if(!eventLog||!copyBtn)return;

  const startedAt=new Date();
  const run={
    events:[],combats:[],currentCombat:null,bossUnlockedSnapshot:null,bossEntrySnapshot:null,
    metrics:{maxDanger:0,spawns:0,attractions:0,potionUses:0,potionHealing:0,springUses:0,springHealing:0,levelUps:0,levelUpHealing:0,enemyDamage:0,effectiveDamageTaken:0,spellCasts:0,manipulation:[]}
  };
  let state=null,lastStep=0,lastSnapshot=null,eventSerial=0,pollTimer=null;

  function snapshot(){
    if(!state)return null;
    const c=state.combat;
    return {
      step:state.steps,row:state.row+1,col:state.col+1,hp:state.hp,maxHp:state.maxHp,level:state.level,xp:state.xp,danger:state.danger,potion:state.potion,
      mobKills:state.mobKills,eliteKills:state.eliteKills,bossUnlocked:state.bossUnlocked,bossKilled:state.bossKilled,zoneCleared:state.zoneCleared,gameOver:state.gameOver,
      spells:(state.spells||[]).map(s=>({name:s.name,force:s.force,base:s.damage,cd:s.cooldown||0,fallback:!!s.fallback,enchantDamage:s.enchantDamage||0})),
      combat:c?{title:c.entity?.title||'ENEMY',type:c.entity?.type||'unknown',spawned:!!c.entity?.spawned,enemyHp:c.hp,enemyMaxHp:c.maxHp,attack:c.attack,fromAggro:!!c.fromAggro}:null
    };
  }

  function stateStamp(s){
    if(!s)return'';
    return `Step ${s.step} | HP ${s.hp}/${s.maxHp} | L${s.level} | D ${s.danger}/20 | Pos R${s.row}C${s.col}`;
  }

  function record(kind,text,s=snapshot()){
    run.metrics.maxDanger=Math.max(run.metrics.maxDanger,s?.danger||0);
    run.events.push({n:++eventSerial,kind,text,state:s});
  }

  function syncMoves(s=snapshot()){
    if(!s||s.step<=lastStep)return;
    const delta=s.step-lastStep;
    record('MOVE',delta===1?`Moved to row ${s.row}, column ${s.col}.`:`Moved ${delta} steps since previous recorded event; now row ${s.row}, column ${s.col}.`,s);
    lastStep=s.step;
  }

  function startCombatRecord(s){
    if(!s?.combat)return;
    const c={
      title:s.combat.title,type:s.combat.type,spawned:s.combat.spawned,fromAggro:s.combat.fromAggro,startHp:s.hp,startMaxHp:s.maxHp,startDanger:s.danger,
      enemyMaxHp:s.combat.enemyMaxHp,enemyAttack:s.combat.attack,casts:[],damageTaken:0,enemyDamage:0,lastPlayerHp:s.hp,endHpBeforeRewards:null,result:'IN PROGRESS'
    };
    run.combats.push(c);run.currentCombat=c;
    if(c.type==='boss'&&!run.bossEntrySnapshot)run.bossEntrySnapshot=s;
  }

  function handleLogNode(node){
    if(!(node instanceof Element))return;
    const text=(node.textContent||'').trim();if(!text)return;
    const s=snapshot();syncMoves(s);
    const prev=lastSnapshot;

    if(/ engaged(?: from nearby aggro)?\.?$/i.test(text)&&s?.combat)startCombatRecord(s);

    let m=text.match(/^(.+?) hit (.+?) for (\d+)\.$/i);
    if(m&&run.currentCombat){
      const damage=Number(m[3]);run.metrics.spellCasts++;run.currentCombat.casts.push(`${m[1]} ${damage}`);run.currentCombat.lastPlayerHp=s?.hp??run.currentCombat.lastPlayerHp;
    }

    m=text.match(/ attacked for (\d+)\.$/i);
    if(m){
      const raw=Number(m[1]),effective=prev&&s?Math.max(0,prev.hp-s.hp):raw;
      run.metrics.enemyDamage+=raw;run.metrics.effectiveDamageTaken+=effective;
      if(run.currentCombat){run.currentCombat.enemyDamage+=raw;run.currentCombat.damageTaken+=effective;run.currentCombat.lastPlayerHp=s?.hp??run.currentCombat.lastPlayerHp;}
    }

    m=text.match(/^Healing Potion restored (\d+) HP\.$/i);
    if(m){run.metrics.potionUses++;run.metrics.potionHealing+=Number(m[1]);}
    m=text.match(/^Primal Spring restored (\d+) HP\.$/i);
    if(m){run.metrics.springUses++;run.metrics.springHealing+=Number(m[1]);}
    if(text.startsWith('LEVEL UP')){
      run.metrics.levelUps++;
      if(prev&&s)run.metrics.levelUpHealing+=Math.max(0,s.hp-prev.hp);
    }
    if(/ spawned at row /i.test(text))run.metrics.spawns++;
    if(/heard the fight and is moving toward Sharkan/i.test(text))run.metrics.attractions++;
    if(/Calm Waters reduced Danger/i.test(text))run.metrics.manipulation.push('Calm Waters');
    if(/Ward Sigil will block/i.test(text))run.metrics.manipulation.push('Ward Sigil');
    if(/Steady Nerves protects/i.test(text))run.metrics.manipulation.push('Steady Nerves');

    if(/Rootmaw is now unlocked/i.test(text)&&!run.bossUnlockedSnapshot)run.bossUnlockedSnapshot=s;

    if(/^Sharkan was defeated/i.test(text)&&run.currentCombat){
      run.currentCombat.result='LOSS';run.currentCombat.endHpBeforeRewards=0;run.currentCombat=null;
    }else if(/ defeated\.$/i.test(text)&&!/^Sharkan/i.test(text)&&run.currentCombat){
      run.currentCombat.result='WIN';run.currentCombat.endHpBeforeRewards=run.currentCombat.lastPlayerHp;run.currentCombat=null;
    }else if(/^Sharkan fled/i.test(text)&&run.currentCombat){
      run.currentCombat.result='FLED';run.currentCombat.endHpBeforeRewards=s?.hp??null;run.currentCombat=null;
    }

    record('LOG',text,s);lastSnapshot=s;
  }

  const nativePrepend=eventLog.prepend.bind(eventLog);
  eventLog.prepend=(...nodes)=>{
    nativePrepend(...nodes);
    nodes.forEach(handleLogNode);
  };

  function startPolling(){
    if(pollTimer)return;
    lastStep=state?.steps||0;lastSnapshot=snapshot();record('RUN','Zone 1 run started.',lastSnapshot);
    pollTimer=setInterval(()=>{const s=snapshot();syncMoves(s);lastSnapshot=s||lastSnapshot;},80);
  }

  try{
    Object.defineProperty(window,'HAJJEN_V4B_STATE',{
      configurable:true,enumerable:true,get(){return state;},set(value){state=value;startPolling();}
    });
  }catch{}

  function spellLine(s,currentLevel){
    const current=s.base+(currentLevel-1)*4+(s.enchantDamage||0);
    return `${s.name}${s.fallback?' [fallback]':''} — ${s.force}, base ${s.base}, current ${current}, CD ${s.cd}`;
  }

  function resultText(s){
    if(s?.zoneCleared||s?.bossKilled)return'ZONE 1 CLEARED';
    if(s?.gameOver){const last=run.combats[run.combats.length-1];return last?`DEFEATED BY ${last.title}`:'SHARKAN DEFEATED';}
    if(run.bossEntrySnapshot)return'ROOTMAW ENGAGED / RUN IN PROGRESS';
    if(s?.bossUnlocked)return'ROOTMAW UNLOCKED / NOT YET ENGAGED';
    return'RUN IN PROGRESS';
  }

  function combatCounts(type){return run.combats.filter(c=>c.type===type).length;}
  function buildReport(){
    const s=snapshot()||lastSnapshot;
    const crafted=(s?.spells||[]).filter(x=>!x.fallback);
    const totalHealing=run.metrics.potionHealing+run.metrics.springHealing+run.metrics.levelUpHealing;
    const lines=[];
    lines.push('HAJJEN V4-B — ZONE 1 RUN REPORT');
    lines.push(`Run started: ${startedAt.toISOString()}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('=== RUN SUMMARY ===');
    lines.push(`Result: ${resultText(s)}`);
    lines.push(`Steps: ${s?.step??0}`);
    lines.push(`Level: ${s?.level??'?'} | XP: ${s?.xp??'?'}`);
    lines.push(`HP: ${s?.hp??'?'} / ${s?.maxHp??'?'}`);
    lines.push(`Danger: ${s?.danger??'?'} / 20 | Max Danger: ${run.metrics.maxDanger} / 20`);
    lines.push(`Potion: ${run.metrics.potionUses} used | ${s?.potion??'?'} remaining | +${run.metrics.potionHealing} HP`);
    lines.push(`Primal Spring: ${run.metrics.springUses?'USED':'NOT USED'} | +${run.metrics.springHealing} HP`);
    lines.push(`Level-up healing: +${run.metrics.levelUpHealing} HP across ${run.metrics.levelUps} level-up(s)`);
    lines.push(`Total recorded healing: +${totalHealing} HP`);
    lines.push(`Enemy damage (raw): ${run.metrics.enemyDamage} | Effective HP lost to attacks: ${run.metrics.effectiveDamageTaken}`);
    lines.push(`Combats: ${run.combats.length} total | ${combatCounts('mob')} mobs | ${combatCounts('elite')} elites | ${combatCounts('boss')} boss`);
    lines.push(`Spawned enemies fought: ${run.combats.filter(c=>c.spawned).length} | Enemies spawned: ${run.metrics.spawns} | Combat attractions: ${run.metrics.attractions}`);
    lines.push(`Spell casts: ${run.metrics.spellCasts}`);
    lines.push(`Manipulation played: ${run.metrics.manipulation.length?run.metrics.manipulation.join(', '):'None'}`);
    lines.push(`Crafted spells: ${crafted.length?crafted.map(x=>x.name).join(', '):'None'}`);
    lines.push('');
    lines.push('=== BOSS READINESS ===');
    lines.push(run.bossUnlockedSnapshot?`Rootmaw unlocked at: ${stateStamp(run.bossUnlockedSnapshot)} | Potion ${run.bossUnlockedSnapshot.potion}`:'Rootmaw was not unlocked.');
    lines.push(run.bossEntrySnapshot?`Rootmaw entered at: ${stateStamp(run.bossEntrySnapshot)} | Potion ${run.bossEntrySnapshot.potion}`:'Rootmaw was not entered.');
    if(run.bossEntrySnapshot){
      const bs=run.bossEntrySnapshot.spells.filter(x=>!x.fallback);
      lines.push(`Spells at Rootmaw: ${bs.length?bs.map(x=>spellLine(x,run.bossEntrySnapshot.level)).join(' | '):'No crafted spells'}`);
    }
    lines.push('');
    lines.push('=== CURRENT SPELLS ===');
    (s?.spells||[]).forEach(x=>lines.push(`- ${spellLine(x,s.level)}`));
    if(!(s?.spells||[]).length)lines.push('- None');
    lines.push('');
    lines.push('=== COMBAT BREAKDOWN ===');
    if(!run.combats.length)lines.push('No combats recorded.');
    run.combats.forEach((c,i)=>{
      lines.push(`${i+1}. ${c.title} [${c.type}${c.spawned?' / spawned':''}${c.fromAggro?' / aggro':''}] — ${c.result}`);
      lines.push(`   Start: HP ${c.startHp}/${c.startMaxHp}, Danger ${c.startDanger}/20 | Enemy ${c.enemyMaxHp} HP / ${c.enemyAttack} attack`);
      lines.push(`   Casts: ${c.casts.length?c.casts.join(' → '):'None recorded'}`);
      lines.push(`   Damage taken: ${c.damageTaken} effective (${c.enemyDamage} raw) | HP before rewards: ${c.endHpBeforeRewards??c.lastPlayerHp}`);
    });
    lines.push('');
    lines.push('=== FULL RUN EVENT LOG ===');
    run.events.forEach(e=>lines.push(`${String(e.n).padStart(3,'0')} | ${e.kind.padEnd(4,' ')} | ${stateStamp(e.state)} | ${e.text}`));
    return lines.join('\n');
  }

  async function copyReport(){
    const text=buildReport();
    let copied=false;
    try{await navigator.clipboard.writeText(text);copied=true;}catch{}
    if(!copied){
      const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
      try{copied=document.execCommand('copy');}catch{}ta.remove();
    }
    const original='COPY RUN REPORT';copyBtn.textContent=copied?'RUN REPORT COPIED':'COPY FAILED — TAP AGAIN';
    setTimeout(()=>{copyBtn.textContent=original;},1800);
  }

  copyBtn.addEventListener('click',copyReport);
  window.HAJJEN_V4B_RUN_REPORT={getText:buildReport,data:run};
})();
