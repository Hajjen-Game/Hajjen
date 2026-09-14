/* HAJJEN Zone 4 — first Talent Tree MVP.
   Unlocks at Level 10 with one point, then +1 point per level.
   Talents are permanent Profile progression. New points may be spent during an
   expedition, but free respec is only available before the expedition starts. */
(()=>{
  if(window.HAJJEN_ZONE4_TALENTS)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(Number(cfg?.zone)!==4||!state)return;

  const BRANCHES=[
    {id:'explorer',name:'EXPLORER',icon:'E',subtitle:'Danger · movement · Essence',nodes:[
      {id:'scavenger',name:'Scavenger',text:'Enemy kills yield 20% more Primal Essence.',effect:'+20% kill Essence'},
      {id:'trailwise',name:'Trailwise',text:'Every 6th movement step reduces Danger by 1.',effect:'-1 Danger every 6 steps',requires:'scavenger'},
      {id:'pressure-control',name:'Pressure Control',text:'The first time Danger reaches 15 each expedition, immediately reduce it by 3.',effect:'Once per expedition · Danger -3',requires:'trailwise'}
    ]},
    {id:'spellweaver',name:'SPELLWEAVER',icon:'S',subtitle:'Spells · Forces · Enchantments',nodes:[
      {id:'arcane-edge',name:'Arcane Edge',text:'Gain +2 Power.',effect:'+2 spell damage'},
      {id:'crafted-mastery',name:'Crafted Mastery',text:'Crafted spells deal +3 additional damage.',effect:'+3 crafted spell damage',requires:'arcane-edge'},
      {id:'enchanters-insight',name:"Enchanter's Insight",text:'Enchanted spells deal +4 additional damage.',effect:'+4 enchanted spell damage',requires:'crafted-mastery'}
    ]},
    {id:'survivor',name:'SURVIVOR',icon:'V',subtitle:'Health · defence · Springs',nodes:[
      {id:'hardy',name:'Hardy',text:'Gain +2 Vitality.',effect:'+10 Max HP'},
      {id:'iron-will',name:'Iron Will',text:'Gain +2 Resolve.',effect:'-1 incoming damage',requires:'hardy'},
      {id:'deep-renewal',name:'Deep Renewal',text:'Primal Springs restore up to 25 additional HP.',effect:'+25 Spring healing',requires:'iron-will'}
    ]}
  ];
  const ALL=BRANCHES.flatMap(branch=>branch.nodes.map((node,index)=>({...node,branch:branch.id,tier:index+1})));
  const byId=new Map(ALL.map(node=>[node.id,node]));
  const rpg=()=>window.HAJJEN_RPG_STATE;
  const getProfile=()=>rpg()?.getProfile?.()||null;
  const learnedIds=()=>Array.isArray(getProfile()?.talents?.nodes)?getProfile().talents.nodes.filter(id=>byId.has(id)):[];
  const learnedSet=()=>new Set(learnedIds());
  const totalPoints=()=>Math.max(0,Math.floor(Number(state.level)||0)-9);
  const unspentPoints=()=>Math.max(0,totalPoints()-learnedIds().length);
  const has=id=>learnedSet().has(id);
  let syncing=false;
  let lastLevel=Number(state.level)||0;
  let introTimer=0;

  function addLog(text,type='reward'){
    const root=document.getElementById('eventLog');if(!root)return;
    const row=document.createElement('div');row.className=`event ${type}`;row.textContent=text;root.prepend(row);while(root.children.length>9)root.lastChild.remove();
  }
  function toast(text,type='reward'){
    const root=document.getElementById('toastArea');if(!root)return;
    const row=document.createElement('div');row.className=`toast ${type}`;row.textContent=text;root.prepend(row);setTimeout(()=>row.remove(),1800);
  }

  function syncProfilePoints(reason='talent-point-sync'){
    const api=rpg(),profile=getProfile();if(syncing||!api?.updateProfile||!profile)return false;
    const ids=learnedIds();const expected=Math.max(0,totalPoints()-ids.length);
    const current=Math.max(0,Number(profile.talents?.unspent)||0);
    const unlocked=!!profile.unlocks?.talents;
    if(current===expected&&unlocked===(totalPoints()>0))return false;
    syncing=true;
    api.updateProfile(p=>{
      p.talents=p.talents||{unspent:0,nodes:[]};p.talents.nodes=Array.isArray(p.talents.nodes)?p.talents.nodes.filter(id=>byId.has(id)):[];
      p.talents.unspent=Math.max(0,totalPoints()-p.talents.nodes.length);
      p.unlocks=p.unlocks||{};p.unlocks.talents=totalPoints()>0;
      return p;
    },reason);
    syncing=false;return true;
  }

  function canRespec(){
    return !state.combat&&!state.gameOver&&Number(state.steps||0)===0&&Number(state.mobKills||0)===0&&Number(state.eliteKills||0)===0&&!state.bossKilled;
  }
  function canLearn(node){
    if(!node||has(node.id)||unspentPoints()<1||state.gameOver||state.combat)return false;
    return !node.requires||has(node.requires);
  }
  function learn(id){
    const node=byId.get(id),api=rpg();if(!node||!api?.updateProfile||!canLearn(node))return false;
    syncing=true;
    api.updateProfile(profile=>{
      profile.talents=profile.talents||{unspent:0,nodes:[]};
      const nodes=Array.isArray(profile.talents.nodes)?profile.talents.nodes:[];
      if(!nodes.includes(id))nodes.push(id);
      profile.talents.nodes=nodes;
      profile.talents.unspent=Math.max(0,totalPoints()-nodes.length);
      profile.unlocks=profile.unlocks||{};profile.unlocks.talents=true;
      return profile;
    },`talent-learned:${id}`);
    syncing=false;
    if(id==='trailwise')state.talentTrailwiseMilestone=Math.floor((Number(state.steps)||0)/6);
    addLog(`Talent learned: ${node.name}.`,'reward');toast(`${node.name.toUpperCase()} LEARNED`,'reward');
    window.HAJJEN_ZONE4_RPG_STATS_RUNTIME?.sync?.();render();syncButton();return true;
  }
  function respec(){
    const api=rpg();if(!api?.updateProfile||!canRespec())return false;
    syncing=true;
    api.updateProfile(profile=>{
      profile.talents=profile.talents||{unspent:0,nodes:[]};profile.talents.nodes=[];profile.talents.unspent=totalPoints();return profile;
    },'talent-respec');
    syncing=false;
    state.talentTrailwiseMilestone=0;state.talentPressureControlUsed=false;
    addLog('Talent Tree reset before expedition start.','system');toast('TALENTS RESET','system');
    window.HAJJEN_ZONE4_RPG_STATS_RUNTIME?.sync?.();render();syncButton();return true;
  }

  function statBonuses(){
    const set=learnedSet();return{
      power:set.has('arcane-edge')?2:0,
      vitality:set.has('hardy')?2:0,
      resolve:set.has('iron-will')?2:0
    };
  }
  function spellDamageBonus(spell){
    const set=learnedSet();let bonus=0;
    if(set.has('crafted-mastery')&&!spell?.fallback)bonus+=3;
    if(set.has('enchanters-insight')&&Array.isArray(spell?.enchantments)&&spell.enchantments.length)bonus+=4;
    return bonus;
  }

  function talentIconMarkup(){
    return '<svg class="hajjen-utility-vector-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16 4v6M8 8l4 4M24 8l-4 4M6 16h6M26 16h-6M10 25l6-9 6 9z"/><circle cx="16" cy="15" r="3"/></svg>';
  }
  function createModal(){
    let modal=document.getElementById('zone4TalentsModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='zone4TalentsModal';modal.className='zone4-talents-modal';modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="zone4-talents-backdrop" data-talents-close="1"></div><section class="zone4-talents-card" role="dialog" aria-modal="true" aria-labelledby="zone4TalentsTitle"><header class="zone4-talents-head"><div><span>SHARKAN PROGRESSION · UNLOCKED AT LEVEL 10</span><h2 id="zone4TalentsTitle">TALENT TREE</h2></div><button type="button" class="zone4-talents-close" data-talents-close="1" aria-label="Close Talent Tree">×</button></header><div class="zone4-talents-summary"></div><div class="zone4-talents-body"><div class="zone4-talents-branches"></div><div class="zone4-talents-foot"><div class="zone4-talents-lock"></div><button type="button" class="zone4-talents-respec">RESET TREE</button></div></div></section>';
    document.body.appendChild(modal);
    modal.addEventListener('click',event=>{if(event.target instanceof Element&&event.target.closest('[data-talents-close="1"]'))close();});
    modal.querySelector('.zone4-talents-respec')?.addEventListener('click',respec);
    return modal;
  }
  function render(){
    const modal=createModal(),summary=modal.querySelector('.zone4-talents-summary'),branches=modal.querySelector('.zone4-talents-branches'),lock=modal.querySelector('.zone4-talents-lock'),reset=modal.querySelector('.zone4-talents-respec');
    if(!summary||!branches)return;
    const spent=learnedIds().length,total=totalPoints(),free=unspentPoints();
    summary.innerHTML=`<div><strong>BUILD SHARKAN</strong><p>Level 10 grants the first Talent Point. Each later level grants one more. New points may be spent during a run; respec is free between expeditions.</p></div><div class="zone4-talents-points"><div class="zone4-talents-pointbox"><span>AVAILABLE</span><b>${free}</b></div><div class="zone4-talents-pointbox"><span>SPENT</span><b>${spent} / ${total}</b></div></div>`;
    branches.innerHTML='';
    BRANCHES.forEach(branch=>{
      const section=document.createElement('section');section.className='zone4-talent-branch';section.dataset.branch=branch.id;
      const head=document.createElement('div');head.className='zone4-talent-branch-head';head.innerHTML=`<div class="zone4-talent-branch-icon">${branch.icon}</div><div><strong>${branch.name}</strong><small>${branch.subtitle}</small></div>`;section.appendChild(head);
      branch.nodes.forEach((def,index)=>{
        const active=has(def.id),available=canLearn(def),button=document.createElement('button');button.type='button';button.className=`zone4-talent-node${active?' is-learned':''}${available?' is-available':''}`;button.disabled=active||!available;
        const requirement=def.requires&&!has(def.requires)?`REQUIRES ${byId.get(def.requires)?.name?.toUpperCase()||'PREVIOUS TALENT'}`:active?'LEARNED':available?'1 TALENT POINT':'NO POINT AVAILABLE';
        button.innerHTML=`<i class="tier">${index+1}</i><b>${def.name}</b><span>${def.text}</span><em>${active?'✓ ':''}${def.effect} · ${requirement}</em>`;
        button.addEventListener('click',()=>learn(def.id));section.appendChild(button);
      });branches.appendChild(section);
    });
    const respec=canRespec();if(lock)lock.textContent=respec?'RESPEC AVAILABLE · before the first movement step':'EXPEDITION ACTIVE · learned talents are locked until the next fresh expedition';if(reset)reset.disabled=!respec||spent===0;
  }
  function open(){
    if(totalPoints()<1){toast('TALENTS UNLOCK AT LEVEL 10','system');return false;}
    syncProfilePoints();const modal=createModal();render();modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');document.documentElement.classList.add('zone4-talents-open-state');
    const profile=getProfile();if(!profile?.unlocks?.talentsIntroduced&&rpg()?.updateProfile){
      syncing=true;rpg().updateProfile(p=>{p.unlocks=p.unlocks||{};p.unlocks.talentsIntroduced=true;return p;},'talents-introduced');syncing=false;
    }
    return true;
  }
  function close(){const modal=document.getElementById('zone4TalentsModal');modal?.classList.remove('is-open');modal?.setAttribute('aria-hidden','true');document.documentElement.classList.remove('zone4-talents-open-state');}

  function mountButton(){
    const utility=document.querySelector('.shared-utility-hud');if(!utility)return false;
    let button=utility.querySelector(':scope > .zone4-talents-open');if(button){syncButton();return true;}
    button=document.createElement('button');button.type='button';button.className='zone4-talents-open hajjen-vector-utility-button';button.dataset.utilityAction='talents';button.dataset.utilityVector='talents';button.setAttribute('aria-label','TALENTS');button.innerHTML=`<span class="hajjen-utility-vector-content"><span class="hajjen-utility-vector-icon-wrap">${talentIconMarkup()}</span><span class="hajjen-utility-vector-label">TALENTS</span></span>`;button.addEventListener('click',open);
    const help=utility.querySelector(':scope > button[data-utility-action="help"]');utility.insertBefore(button,help||null);syncButton();return true;
  }
  function syncButton(){const b=document.querySelector('.shared-utility-hud > .zone4-talents-open');if(!b)return;b.classList.toggle('has-points',unspentPoints()>0);b.title=unspentPoints()>0?`${unspentPoints()} Talent Point${unspentPoints()===1?'':'s'} available`:'Talent Tree';}

  function explorerTick(){
    if(has('trailwise')){
      const milestone=Math.floor((Number(state.steps)||0)/6),seen=Math.max(0,Number(state.talentTrailwiseMilestone)||0);
      if(milestone>seen){state.talentTrailwiseMilestone=milestone;if(Number(state.danger)>0){state.danger=Math.max(0,Number(state.danger)-1);addLog('Trailwise reduced Danger by 1.','reward');toast('TRAILWISE · DANGER -1','reward');}}
    }
    if(has('pressure-control')&&!state.talentPressureControlUsed&&Number(state.danger)>=15){state.talentPressureControlUsed=true;state.danger=Math.max(0,Number(state.danger)-3);addLog('Pressure Control triggered at high Danger · Danger -3.','reward');toast('PRESSURE CONTROL · DANGER -3','reward');}
  }

  document.addEventListener('hajjen:rpg-essence-changed',event=>{
    if(event.detail?.reason!=='earned'||!has('scavenger'))return;
    const base=Math.max(0,Number(event.detail?.amount)||0),bonus=Math.floor(base*.20);if(!bonus)return;
    state.unsecuredEssence=Math.max(0,Number(state.unsecuredEssence)||0)+bonus;addLog(`Scavenger yielded +${bonus} bonus Primal Essence.`,'reward');
    setTimeout(()=>window.HAJJEN_ZONE4_RPG_ESSENCE?.sync?.(),0);
  });
  document.addEventListener('hajjen:primal-spring-used',event=>{
    if(Number(event.detail?.zone)!==4||!has('deep-renewal')||!(Number(event.detail?.heal)>0))return;
    const bonus=Math.min(25,Math.max(0,Number(state.maxHp)-Number(state.hp)));if(!bonus)return;state.hp=Number(state.hp)+bonus;addLog(`Deep Renewal restored ${bonus} additional HP.`,'reward');toast(`DEEP RENEWAL · +${bonus} HP`,'reward');
  });
  document.addEventListener('hajjen:rpg-profile-changed',()=>{if(syncing)return;render();syncButton();window.HAJJEN_ZONE4_RPG_STATS_RUNTIME?.sync?.();});
  document.addEventListener('hajjen-ui-redesign-promoted',()=>{setTimeout(mountButton,0);});
  document.addEventListener('keydown',event=>{const modal=document.getElementById('zone4TalentsModal');if(!modal?.classList.contains('is-open'))return;if(event.key==='Escape')close();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}},true);

  window.HAJJEN_ZONE4_TALENTS={version:'1.0-nine-node-mvp',branches:BRANCHES,totalPoints,unspentPoints,has,learn,respec,canRespec,statBonuses,spellDamageBonus,open,close,render,sync:()=>{syncProfilePoints();render();syncButton();}};

  function start(){
    if(!rpg()?.getProfile)return false;syncProfilePoints('talent-tree-init');createModal();mountButton();
    [100,300,800,1800,3000].forEach(delay=>setTimeout(mountButton,delay));
    clearInterval(introTimer);introTimer=setInterval(()=>{
      explorerTick();
      const level=Number(state.level)||0;if(level!==lastLevel){const before=Math.max(0,lastLevel-9),after=Math.max(0,level-9);lastLevel=level;syncProfilePoints('talent-point-level-up');syncButton();if(after>before)toast(`TALENT POINT +${after-before}`,'reward');}
    },100);
    const profile=getProfile();if(totalPoints()>0&&canRespec()&&!profile?.unlocks?.talentsIntroduced){setTimeout(()=>{if(canRespec())open();},900);}
    return true;
  }
  if(!start())[50,120,250,500,1000].forEach(delay=>setTimeout(start,delay));
})();