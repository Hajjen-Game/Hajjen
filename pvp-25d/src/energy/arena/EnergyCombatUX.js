// Energy Arena combat feedback: adapted from arena3v3 UIManager/3v3 Pixi
// semantics (GCD/cooldown radial, cast-success/interrupted/failed/ready,
// range/LOS/resource distinctions and a player-centred CC icon).
// Visual only: never changes casting rules, status duration or targeting.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const SELF_MODES=new Set(["heal","guard","shield","hot","link","cleanse"]);
const FLASH_TYPES=["cast-success","cast-interrupted","cast-failed","cooldown-ready","input-pressed"];
const CC_ORDER=["stun","fear","incapacitate","root","schoolLock"];
const ICONS={
  stun:'<path d="M32 7 39 24 55 18 45 32 57 44 39 42 33 57 26 41 9 47 19 32 7 21 25 24Z"/><circle cx="32" cy="32" r="5"/>',
  fear:'<path d="M13 24q8-9 16 0M35 24q8-9 16 0M17 45q15-17 30 0M10 12l7 8m37-8-7 8"/>',
  incapacitate:'<path d="m32 7 5 17 16-5-12 14 13 11-17-4-5 17-5-17-17 4 13-12-12-13 17 5Z"/><circle cx="32" cy="32" r="5"/>',
  root:'<path d="M32 7v30m0-18-12-9m12 16 14-10M32 36 15 55m17-19 17 19M25 45l-12-3m26 3 12-3"/>',
  schoolLock:'<path d="M20 28v-8a12 12 0 0 1 24 0v8m-27 0h30v27H17Z"/><path d="m29 39 6 5-6 7m6-7-6 0"/>'
};
const TITLES={stun:"STUNNED",fear:"FEARED",incapacitate:"INCAPACITATED",
  root:"ROOTED",schoolLock:"INTERRUPTED"};
const ccMarkup=kind=>'<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[kind]||ICONS.incapacitate)+'</svg>';

export class EnergyCombatUX{
  constructor(stage,rules,abilities,disciplines,hasLOS){
    this.stage=stage;this.rules=rules;this.abilities=abilities;
    this.disciplines=disciplines;this.hasLOS=hasLOS;
    this.flashUntil=new Map();this.previousCD=new Map();
    this.ccRoot=document.createElement("div");
    this.ccRoot.className="energy-player-cc";this.ccRoot.hidden=true;
    this.ccRoot.setAttribute("role","status");
    this.ccRoot.setAttribute("aria-label","Crowd control");
    const disc=document.createElement("div");disc.className="energy-cc-disc";
    const icon=document.createElement("div");icon.className="energy-cc-glyph";
    const timer=document.createElement("span");timer.className="energy-cc-time";
    disc.append(icon,timer);
    const title=document.createElement("div");title.className="energy-cc-title";
    const sub=document.createElement("div");sub.className="energy-cc-sub";
    this.ccRoot.append(disc,title,sub);stage.appendChild(this.ccRoot);
    this.ccDisc=disc;this.ccIcon=icon;this.ccTime=timer;this.ccTitle=title;this.ccSub=sub;
    this.ccKind=null;this.ccInitial=0;this.ccPrevious=0;
  }
  decorate(entry){
    if(entry.fx)return;
    const icon=entry.node.querySelector(".spell-icon");
    const gcd=document.createElement("span");gcd.className="energy-action-gcd";
    const sweep=document.createElement("span");sweep.className="energy-action-cooldown";
    const cast=document.createElement("span");cast.className="energy-action-cast";
    const flash=document.createElement("span");flash.className="energy-action-flash";
    gcd.setAttribute("aria-hidden","true");sweep.setAttribute("aria-hidden","true");
    cast.setAttribute("aria-hidden","true");flash.setAttribute("aria-hidden","true");
    icon?.append(gcd,sweep);
    entry.node.append(cast,flash);
    entry.fx={gcd,sweep,cast,flash};
    const hex=this.disciplines[entry.ability.discipline]?.color||"#90d9ed";
    entry.node.style.setProperty("--energy-spell",hex);
  }
  pulse(entry,type,now=performance.now()){
    if(!entry)return;
    const node=entry.node;
    for(const name of FLASH_TYPES)node.classList.remove(name);
    // Restart the transient CSS keyframe for repeated consecutive actions.
    void node.offsetWidth;
    node.classList.add(type);
    const durations={"input-pressed":130,"cast-success":480,
      "cast-interrupted":640,"cast-failed":430,"cooldown-ready":540};
    this.flashUntil.set(entry.slot.id,{type,until:now+(durations[type]||360)});
  }
  pulseSpell(entries,spellId,type,now){
    const entry=entries.find(e=>e.slot.id===spellId);
    this.pulse(entry,type,now);
  }
  onEvent(event,entries,now=performance.now()){
    if(event.type==="ability"&&event.actorId==="player")
      this.pulseSpell(entries,event.spellId,"cast-success",now);
    if(event.type==="fizzle"&&event.actorId==="player")
      this.pulseSpell(entries,event.spellId,"cast-failed",now);
    if(event.type==="nothing"&&event.actorId==="player")
      this.pulseSpell(entries,event.spellId,"cast-failed",now);
    if(event.type==="interrupt"&&event.targetId==="player"&&event.interruptedSpell)
      this.pulseSpell(entries,event.interruptedSpell,"cast-interrupted",now);
  }
  updateActionBar(match,entries,pending,now=performance.now()){
    if(!match)return;
    const player=match.player;
    for(const entry of entries){
      this.decorate(entry);
      const {node,slot,ability,cd,fx}=entry,rule=this.rules[slot.id];
      const remaining=player.cooldowns[slot.id]||0;
      const lock=player.schoolLocks[ability.discipline]||0;
      const gcd=player.gcd||0;
      const activeCast=player.cast?.spellId===slot.id;
      const target=rule.mode==="dash"?null:match.currentTarget(player,rule.mode,player.targetId);
      const wrongTarget=!target&&rule.mode!=="dash";
      const range=!!target&&rule.mode!=="dash"&&
        Math.hypot(target.x-player.x,target.y-player.y)>(rule.range||490);
      const los=!!target&&!range&&rule.mode!=="dash"&&
        !this.hasLOS(player,target,match.arena);
      const resource=player.flux<match.cost(player,rule,slot.id);
      const controlled=(player.statuses||[]).some(s=>
        ["stun","fear","incapacitate"].includes(s.kind)&&s.remaining>0);
      const mobility=["dash","rush"].includes(rule.mode)&&player.dashGate>0;
      const notReady=!player.alive||match.ended;
      const cooldownRatio=clamp(remaining/Math.max(.01,rule.cd||1),0,1);
      const gcdRatio=clamp(gcd/1.3,0,1);
      node.classList.toggle("cooling",remaining>.015);
      node.classList.toggle("school-locked",lock>.015);
      node.classList.toggle("gcd",gcd>.015);
      node.classList.toggle("casting",activeCast);
      node.classList.toggle("queued",pending?.ability===slot.id);
      node.classList.toggle("out-of-range",range);
      node.classList.toggle("los-blocked",los);
      node.classList.toggle("no-resource",resource);
      node.classList.toggle("controlled",controlled);
      node.classList.toggle("invalid-target",wrongTarget);
      node.classList.toggle("mobility-locked",mobility);
      node.classList.toggle("player-dead",notReady);
      node.classList.toggle("available",
        !notReady&&!controlled&&!resource&&!wrongTarget&&!range&&!los&&!mobility
        &&lock<=.015&&remaining<=.015&&gcd<=.015);
      // Cooldown/GCD are icon-local radial sweeps, not whole-slot grey-outs.
      fx.gcd.style.setProperty("--gcd-angle",(gcdRatio*360).toFixed(1)+"deg");
      fx.sweep.style.setProperty("--cd-angle",(cooldownRatio*360).toFixed(1)+"deg");
      fx.gcd.hidden=gcd<=.015;
      fx.sweep.hidden=remaining<=.015;
      const progress=activeCast?clamp(
        1-player.cast.remainingMs/Math.max(1,player.cast.totalMs),0,1):0;
      fx.cast.style.width=(progress*100).toFixed(1)+"%";
      cd.textContent=remaining>.015?(remaining>=10?Math.ceil(remaining):remaining.toFixed(1))+"s"
        :lock>.015?"LOCK "+Math.ceil(lock)+"s":"";
      // Preserve reason in tooltip and accessibility even when hiding its
      // large floating banner and the button stays tappable for feedback.
      const blocker=notReady?"MATCH ENDED":controlled?"CONTROLLED"
        :lock>.015?"SCHOOL LOCKED":remaining>.015?"COOLDOWN"
        :resource?"LOW FLUX":wrongTarget?"SELECT A TARGET"
        :range?"OUT OF RANGE":los?"LINE OF SIGHT"
        :mobility?"MOBILITY LOCK":activeCast?"CASTING":gcd>.015?"GLOBAL COOLDOWN":"READY";
      const title=ability.name+" — "+ability.description+"\n"+blocker
        +(remaining>.015?" "+remaining.toFixed(1)+"s":"")
        +(lock>.015?" · "+lock.toFixed(1)+"s school lock":"");
      if(node.title!==title)node.title=title;
      const aria=ability.name+" · "+blocker;
      if(node.getAttribute("aria-label")!==aria)node.setAttribute("aria-label",aria);
      const flash=this.flashUntil.get(slot.id);
      if(flash&&now>=flash.until){
        node.classList.remove(flash.type);this.flashUntil.delete(slot.id);
      }
      const prev=this.previousCD.get(slot.id);
      if(Number.isFinite(prev)&&prev>.015&&remaining<=.015&&!notReady)
        this.pulse(entry,"cooldown-ready",now);
      this.previousCD.set(slot.id,remaining);
    }
  }
  updateCC(match){
    const player=match?.player;
    if(!player?.alive||match.ended){this.ccRoot.hidden=true;return;}
    const statuses=(player.statuses||[]).filter(s=>s.remaining>0&&CC_ORDER.includes(s.kind));
    let effect=null;
    for(const kind of CC_ORDER){
      effect=statuses.find(s=>s.kind===kind);
      if(effect)break;
    }
    let info=null;
    if(effect)info={kind:effect.kind,seconds:effect.remaining,
      total:effect.remaining,detail:effect.kind==="root"?"MOVEMENT LOCKED":"CONTROL EFFECT"};
    else{
      const locks=Object.entries(player.schoolLocks||{}).filter(([,t])=>t>.015)
        .sort((a,b)=>b[1]-a[1]);
      if(locks.length)info={kind:"schoolLock",seconds:locks[0][1],
        total:3,detail:locks[0][0].toUpperCase()+" LOCKED"};
    }
    if(!info){this.ccRoot.hidden=true;this.ccKind=null;this.ccInitial=0;return;}
    this.ccRoot.hidden=false;
    // Preserve the total time across frames so the sweep actually
    // counts DOWN. Restart only if a new/longer CC replaces the old one.
    if(this.ccKind!==info.kind||info.seconds>this.ccPrevious+.10){
      this.ccInitial=Math.max(info.seconds,.01);
    }
    this.ccPrevious=info.seconds;
    info.total=Math.max(this.ccInitial,.01);
    if(this.ccKind!==info.kind){
      this.ccKind=info.kind;this.ccRoot.dataset.kind=info.kind;
      this.ccIcon.innerHTML=ccMarkup(info.kind);
      this.ccTitle.textContent=TITLES[info.kind];
    }
    this.ccTime.textContent=info.seconds.toFixed(1)+"s";
    this.ccSub.textContent=info.detail;
    this.ccDisc.style.setProperty("--cc-remaining",
      (clamp(info.seconds/info.total,0,1)*360).toFixed(1)+"deg");
  }
  dispose(){
    this.ccRoot.remove();this.previousCD.clear();this.flashUntil.clear();
  }
}
