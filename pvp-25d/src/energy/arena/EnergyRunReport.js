// Independent Energy Arena combat chronology / post-match investigation.
// Records simulation-time evidence, NOT the delayed cosmetic VFX hit time.
// No combat rule, damage, cast, targeting or AI change belongs in this file.
export const RUN_HISTORY_LIMIT=4000;
const n=v=>Number.isFinite(v)?v:0;
const fix=(v,digits=1)=>n(v).toFixed(digits);
const val=v=>Math.round(n(v)*10)/10;
const status=a=>(a?.statuses||[]).filter(s=>s.remaining>0)
  .map(s=>s.kind+"("+fix(s.remaining)+"s)").join(", ")||"none";
const safe=(x,fallback="—")=>x==null||x===""?fallback:String(x);
const name=(match,id)=>match.getActor?.(id)?.name||safe(id);
const actorLine=(match,a)=>{
  const stats=match.telemetry?.get(a.id)||{};
  const types=Object.entries(stats.abilities||{}).map(([id,count])=>id+"×"+count).join(", ")||"none";
  return a.name+" ["+a.id+"; "+a.team+"/"+a.role+"] "
    +(a.alive?"ALIVE":"DEAD")+" HP "+fix(a.hp)+"/"+fix(a.maxHp,0)
    +" Shield "+fix(a.shield)+" Flux "+fix(a.flux,0)
    +" | damage "+fix(stats.damage||0)+" healing "+fix(stats.healing||0)
    +" | actions "+(stats.casts||0)+" hits "+(stats.hits||0)
    +" | abilities "+types;
};
const important=new Set([
  "hit","heal","death","shield","guard","control","interrupt","immune",
  "cleanse","break","windup","ability","end","link",
]);
const getTargetId=e=>e.targetId||(e.type==="death"?e.actorId:null);
const harmful=e=>e.type==="hit"&&n(e.amount)>0;
const total=(arr)=>arr.reduce((v,e)=>v+n(e.amount),0);
const sortedHistory=match=>[...(match.runHistory||[])].sort((a,b)=>a.time-b.time||a.seq-b.seq);

function worstWindow(history,targetId,seconds){
  const hits=history.filter(e=>harmful(e)&&e.targetId===targetId);
  let begin=0,sum=0,max=0,best=null;
  for(let end=0;end<hits.length;end++){
    sum+=n(hits[end].amount);
    while(begin<=end&&hits[end].time-hits[begin].time>seconds+.000001){
      sum-=n(hits[begin].amount);begin++;
    }
    if(sum>max){
      max=sum;
      best={amount:sum,start:hits[begin].time,end:hits[end].time,
        hits:hits.slice(begin,end+1)};
    }
  }
  return best;
}
function hitText(match,e){
  const b=Number.isFinite(e.hpBefore)?fix(e.hpBefore):"?";
  const a=Number.isFinite(e.hpAfter)?fix(e.hpAfter):fix(e.targetHp);
  const raw=Number.isFinite(e.rawDamage)?fix(e.rawDamage):"?";
  const shield=n(e.absorbed),guard=n(e.guardReduction);
  const parts=["raw "+raw,"guard prevented "+fix(guard),"shield absorbed "+fix(shield)];
  if(e.guardActive)parts.push("guard ACTIVE");
  return name(match,e.actorId)+" → "+name(match,e.targetId)
    +" | "+safe(e.spellId)+" "+fix(e.amount)+" damage"
    +" | HP "+b+" → "+a
    +" | shield "+fix(e.shieldBefore)+" → "+fix(e.shieldAfter)
    +" | "+parts.join("; ")
    +" | target statuses "+safe(e.targetStatuses,"none");
}
function eventText(match,e){
  switch(e.type){
    case "hit":return "HIT "+hitText(match,e);
    case "heal":return "HEAL "+name(match,e.actorId)+" → "+name(match,e.targetId)
      +" | "+safe(e.spellId)+" +"+fix(e.amount)+" HP "
      +fix(e.hpBefore)+" → "+fix(e.hpAfter)
      +" (overheal "+fix(e.overheal)+")";
    case "death":return "DEATH "+name(match,e.actorId)
      +" | killer "+name(match,e.killerId)+" | last spell "+safe(e.spellId);
    case "shield":return "SHIELD "+name(match,e.actorId)+" → "+name(match,e.targetId)
      +" | "+safe(e.spellId)+" "+fix(e.shieldBefore)+" → "+fix(e.shieldAfter)
      +" (requested "+fix(e.amount)+")";
    case "guard":return "GUARD "+name(match,e.actorId)+" → "+name(match,e.targetId)
      +" | "+safe(e.spellId)+" "+fix(e.guardPercent*100,0)+"% / "+fix(e.duration)+"s";
    case "control":return "CC "+name(match,e.actorId)+" → "+name(match,e.targetId)
      +" | "+safe(e.spellId)+" "+safe(e.ccKind)+" "+fix(e.duration)+"s"
      +" | DR "+safe(e.drScale);
    case "interrupt":return "INTERRUPT "+name(match,e.actorId)+" → "+name(match,e.targetId)
      +" | "+safe(e.spellId)+" stops "+safe(e.interruptedSpell);
    case "immune":return "IMMUNE "+name(match,e.targetId)+" | "+safe(e.spellId);
    case "cleanse":return "CLEANSE "+name(match,e.actorId)+" → "+name(match,e.targetId)
      +" | "+safe(e.removedStatus)+" via "+safe(e.spellId);
    case "break":return "CC BROKEN on "+name(match,e.targetId)+" by "+name(match,e.actorId);
    case "windup":return "CAST START "+name(match,e.actorId)+" → "+name(match,e.targetId)
      +" | "+safe(e.spellId)+" (cast "+fix(e.castSeconds)+"s)";
    case "ability":return "EXECUTED "+name(match,e.actorId)+" → "+name(match,e.targetId)
      +" | "+safe(e.spellId);
    case "link":return "LINK "+name(match,e.actorId)+" → "+name(match,e.targetId);
    case "end":return "MATCH END | "+safe(e.winner);
    default:return e.type.toUpperCase()+" "+name(match,e.actorId)+" "+safe(e.spellId);
  }
}
function timeline(lines,match,events){
  if(!events.length){lines.push("  No events recorded.");return;}
  for(const e of events)lines.push("  ["+fix(e.time,2)+"s] "+eventText(match,e));
}

export function formatEnergyRunReport(match){
  const history=sortedHistory(match);
  const lines=[
    "ENERGY ARENA — FULL RUN REPORT",
    "Schema: energy-run-v1 · independent 3v3 prototype",
    "Arena: "+(match.arena?.name||match.arena?.id||"unknown"),
    "Result: "+(match.ended?(match.winner==="friendly"?"VICTORY":"DEFEAT"):"IN PROGRESS")
      +" | Elapsed "+fix(match.time,2)+"s | Dampening "+fix(match.dampening*100,0)+"%",
    "Player role: "+safe(match.player?.role)+" | abilities: "
      +(match.loadout?.abilitySlots||[]).map(a=>a.id).join(", "),
    "Timing: all times are SIMULATION hit times, not delayed Pixi/Babylon impact frames.",
    "Recorded events: "+history.length+" | dropped oldest: "+(match.runHistoryDropped||0)
      +" | cap "+RUN_HISTORY_LIMIT,
  ];
  lines.push("","=== FINAL COMBAT STATS ===");
  for(const a of match.actors)lines.push(actorLine(match,a));

  lines.push("","=== BURST WINDOWS / RAPID DAMAGE ===");
  lines.push("Sliding, incoming damage by victim. Damage is actual HP loss after guard/shield.");
  for(const a of match.actors){
    const output=[1,3].map(span=>{
      const w=worstWindow(history,a.id,span);
      if(!w)return span+"s: none";
      const peers=w.hits.map(h=>safe(h.spellId)+" from "+name(match,h.actorId)+" "+fix(h.amount)).join("; ");
      return span+"s: "+fix(w.amount)+" HP over "
        +fix(w.end-w.start,2)+"s ("+fix(w.start,2)+"–"+fix(w.end,2)+"s)"
        +" / "+w.hits.length+" hits ["+peers+"]";
    });
    lines.push(a.name+" ["+a.id+"]: "+output.join(" | "));
  }

  lines.push("","=== DEATH RECONSTRUCTION (6 SECONDS BEFORE) ===");
  const deaths=history.filter(e=>e.type==="death");
  if(!deaths.length)lines.push("  No recorded deaths yet.");
  for(const death of deaths){
    const victim=death.actorId;
    lines.push("","DEATH "+name(match,victim)+" ["+victim+"] at "+fix(death.time,2)+"s"
      +" | killing blow: "+name(match,death.killerId)
      +" / "+safe(death.spellId));
    const last=history.filter(e=>e.time>=death.time-6.00001
      && e.time<=death.time+.00001
      && (getTargetId(e)===victim||e.actorId===victim)
      && e.type!=="ability");
    timeline(lines,match,last);
  }
  lines.push("","=== DAMAGE SOURCES AND SPELLS ===");
  const stats=new Map();
  for(const e of history){
    if(!harmful(e))continue;
    const key=[e.actorId,e.targetId,e.spellId].join("|");
    let s=stats.get(key);
    if(!s){s={actorId:e.actorId,targetId:e.targetId,spellId:e.spellId,hits:0,damage:0};stats.set(key,s)}
    s.hits++;s.damage+=n(e.amount);
  }
  if(!stats.size)lines.push("  No damaging hits recorded.");
  for(const row of [...stats.values()].sort((a,b)=>b.damage-a.damage)){
    lines.push("  "+name(match,row.actorId)+" → "+name(match,row.targetId)
      +" | "+safe(row.spellId)+": "+fix(row.damage)+" HP / "+row.hits+" hits");
  }
  lines.push("","=== COMPLETE CHRONOLOGICAL COMBAT LOG ===");
  timeline(lines,match,history.filter(e=>important.has(e.type)));
  lines.push("","=== END REPORT ===");
  return lines.join("\n");
}
