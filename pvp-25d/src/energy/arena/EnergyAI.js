// Energy Combat AI — role/team planner, spell priorities and obstacle-aware paths.
// Adapts the proven 3v3 Pixi AISystem's PRESSURE/BURST/PEEL/RECOVER,
// triage, LOS repositioning and anti-flip concepts to Flux + energy loadouts.
// No imports from arena3v3 Actor/Combat classes: the data models differ.
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const damageModes=new Set(["damage","dot"]);
const supportModes=new Set(["heal","hot","guard","shield","cleanse","link"]);

export class EnergyAI {
  constructor(match,{rules,hasLOS,segmentHitsRect,canStand}) {
    this.match=match;
    this.rules=rules;
    this.hasLOS=hasLOS;
    this.segmentHitsRect=segmentHitsRect;
    this.canStand=canStand;
    this.planTick=0;
    this.plans={friendly:{state:"PRESSURE",targetId:null},enemy:{state:"PRESSURE",targetId:null}};
    this.navCorners=this.buildCorners();
    this.lastPressureAt=0;
    this.lastPositions=new Map();
  }

  buildCorners(){
    // Corner visibility graph: go around pillars instead of running into
    // one wall or alternating between two equally attractive dead ends.
    const nodes=[];
    const margin=48;
    for(const obstacle of this.match.arena.obstacles||[]){
      for(const x of [obstacle.x-margin,obstacle.x+obstacle.w+margin]){
        for(const y of [obstacle.y-margin,obstacle.y+obstacle.h+margin]){
          if(this.canStand(x,y,this.match.arena,24))
            nodes.push({x,y,id:obstacle.id+":"+x+":"+y});
        }
      }
    }
    return nodes;
  }
  clearNav(a,b){
    return !(this.match.arena.obstacles||[]).some(o=>this.segmentHitsRect(a,b,o,25));
  }
  shortestRoute(start,destination){
    if(this.clearNav(start,destination))return [destination];
    const nodes=[start,...this.navCorners,destination];
    const n=nodes.length,goal=n-1;
    const costs=Array(n).fill(Infinity),before=Array(n).fill(-1),done=new Set();
    costs[0]=0;
    for(let j=0;j<n;j++){
      let u=-1;
      for(let i=0;i<n;i++)if(!done.has(i)&&(u<0||costs[i]<costs[u]))u=i;
      if(u<0||!Number.isFinite(costs[u])||u===goal)break;
      done.add(u);
      for(let v=1;v<n;v++){
        if(v===u||done.has(v)||!this.clearNav(nodes[u],nodes[v]))continue;
        const next=costs[u]+dist(nodes[u],nodes[v]);
        if(next+0.01<costs[v]){costs[v]=next;before[v]=u;}
      }
    }
    if(before[goal]<0)return [];
    const route=[];
    for(let at=goal;at>0&&at!==-1;at=before[at])route.unshift(nodes[at]);
    return route;
  }

  tick(dt){
    this.planTick-=dt;
    if(this.planTick>0)return;
    this.planTick=.55;
    for(const team of ["friendly","enemy"])this.planTeam(team);
  }
  planTeam(team){
    const m=this.match,allies=m.living(team);
    if(!allies.length)return;
    const opponents=m.living(team==="friendly"?"enemy":"friendly");
    if(!opponents.length)return;
    const healer=allies.find(a=>a.role==="healer");
    const enemyHealer=opponents.find(a=>a.role==="healer");
    const threat=healer&&opponents.find(a=>a.role==="melee"&&dist(a,healer)<145);
    const vulnerable=allies.some(a=>a.hp/a.maxHp<.35);
    const playerIntent=team==="friendly"&&m.player.alive&&m.getActor(m.player.targetId);
    const selected=playerIntent&&m.getActor(m.player.targetId).team==="enemy"
      ?m.getActor(m.player.targetId):null;

    const last=this.plans[team],now=m.time;
    const scores=opponents.map(o=>{
      const hp=o.hp/o.maxHp;
      const pressure=allies.filter(a=>a.role!=="healer").some(a=>dist(a,o)<390);
      let score=(1-hp)*115 + (pressure?16:0);
      if(o.role==="healer")score+=14+(o.flux<28?38:0);
      if(o.statuses.some(s=>s.kind==="incapacitate"))score-=48;
      if(selected&&selected.id===o.id)score+=50;
      if(last.targetId===o.id&&now<(last.holdUntil||0))score+=50;
      return {actor:o,score};
    }).sort((a,b)=>b.score-a.score);
    let chosen=scores[0]?.actor||enemyHealer||opponents[0];
    // Focus player's living enemy target when the player is explicitly targeting an opponent.
    if(selected)chosen=selected;
    const hp=chosen.hp/chosen.maxHp;
    let state="PRESSURE";
    if((healer&&healer.hp/healer.maxHp<.42)||vulnerable)state="RECOVER";
    else if(threat&&healer&&healer.hp/healer.maxHp<.78)state="PEEL";
    else if(hp<.42||opponents.length===1)state="BURST";
    this.plans[team]={state,targetId:chosen.id,changedAt:now,holdUntil:now+2.6};
  }
  target(actor){
    const m=this.match,enemies=m.opponents(actor);
    if(!enemies.length)return null;
    const plan=this.plans[actor.team],focus=m.getActor(plan.targetId);
    const own=m.getActor(actor.targetId);
    const healer=m.allies(actor).find(a=>a.role==="healer");
    const peeling=healer&&healer.hp/healer.maxHp<.78
      ?enemies.find(a=>a.role==="melee"&&dist(a,healer)<125):null;
    const hero=m.player;
    // An allied DPS supports the player's pressure unless an urgent peel is needed.
    const target=peeling&&actor.role!=="healer"?peeling:
      focus?.alive?focus:own?.alive?own:enemies[0];
    if(actor.targetId!==target.id) {
      actor.targetId=target.id;
      actor.waypoint=null;
      actor.aiPath=null;
    }
    return target;
  }
  ready(actor,id,target){
    return !!id&&actor.abilities.includes(id)&&this.match.reason(actor,id,target?.id||null)===null;
  }
  tryCast(actor,abilities,target){
    for(const id of abilities){
      if(!id||!actor.abilities.includes(id))continue;
      if(this.ready(actor,id,target)){
        return this.match.castAbility(actor,id,target?.id||null,{silent:true});
      }
    }
    return false;
  }
  triage(actor){
    const allies=this.match.allies(actor);
    return allies.sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0]||actor;
  }
  isIncapacitated(actor){return this.match.isControlled(actor,"incapacitate");}
  isRooted(actor){return this.match.isControlled(actor,"root");}

  decision(actor,target){
    const m=this.match,health=actor.hp/actor.maxHp,allies=m.allies(actor),enemies=m.opponents(actor);
    if(!actor.alive||this.isIncapacitated(actor)||actor.cast||actor.gcd>.02)return;
    const urgent=this.triage(actor),urgentHealth=urgent.hp/urgent.maxHp;
    const healer=allies.find(a=>a.role==="healer");
    const healerHealth=healer?.hp/healer?.maxHp??1;
    const priority=actor.role==="healer"||actor.abilities.includes("pulse-mend");
    const enemyCasting=enemies.filter(e=>e.cast&&e.alive
      &&e.cast.remainingMs>120&&!this.isIncapacitated(e))
      .sort((a,b)=>a.cast.remainingMs-b.cast.remainingMs);
    for(const e of enemyCasting) {
      if(this.tryCast(actor,["pulse-sever","resonance-cut"],e))return;
    }
    if(health<.45) {
      if(this.tryCast(actor,["resonance-guard","photon-barrier"],actor))return;
      if(this.tryCast(actor,["phase-slip","vector-rush"],null))return;
    }
    if(urgentHealth<.45){
      if(this.tryCast(actor,["resonance-guard","photon-barrier"],urgent))return;
    }
    if(priority){
      // Dispels high-impact CC first: never cleanse a harmless slow while an ally is imprisoned.
      const controlled=allies.find(a=>a.statuses.some(s=>s.negative&&(s.kind==="incapacitate"||s.kind==="root")));
      if(controlled&&this.tryCast(actor,["cleanse-flux"],controlled))return;
      if(urgentHealth<.80){
        if(this.tryCast(actor,["pulse-mend"],urgent))return;
        if(urgentHealth<.9&& !urgent.statuses.some(s=>s.kind==="reactive-thread")&&
          this.tryCast(actor,["reactive-thread"],urgent))return;
      }
      if(urgentHealth<.93&& !urgent.statuses.some(s=>s.kind==="reactive-thread")
        &&this.tryCast(actor,["reactive-thread"],urgent))return;
      if(healerHealth<.6&&this.tryCast(actor,["photon-barrier"],healer))return;
    }
    if(!target)return;
    const enemyHealer=enemies.find(a=>a.role==="healer");
    const focus=target;
    const controlled=this.isIncapacitated(focus);
    if(!controlled&&actor.role!=="healer"&&enemyHealer&&enemyHealer!==focus
      &&!this.isIncapacitated(enemyHealer)&&enemyHealer.healthPct>.15
      &&!enemyHealer.statuses.some(s=>s.kind==="dot")){
      if(this.tryCast(actor,["null-prison"],enemyHealer))return;
    }
    const rootTarget=focus;
    if(actor.role!=="healer"&&dist(actor,focus)>145&&!this.isRooted(focus)){
      if(this.tryCast(actor,["crystal-snare"],rootTarget))return;
    }
    if(actor.role==="melee"){
      const d=dist(actor,focus);
      if(d>107&&d<450&&this.tryCast(actor,["phase-rush"],focus))return;
      if(d>122)return; // travel rather than wasting AI decisions against an out-of-range foe.
      if(this.tryCast(actor,["gravity-hammer","rift-slash","arc-strike"],focus))return;
      if(this.tryCast(actor,["entropy-mark"],focus))return;
    }else{
      const keepDot=!focus.statuses.some(s=>s.kind==="dot"&&s.sourceId===actor.id);
      if(keepDot&&this.tryCast(actor,["entropy-mark"],focus))return;
      if(this.tryCast(actor,["fracture-spear","zenith-crash","sun-lance","crystal-bolt","flux-bolt"],focus))return;
    }
    // A support healer MUST stay offensive whenever healing is not needed.
    if(actor.role==="healer"){
      this.tryCast(actor,["sun-lance","crystal-bolt","flux-bolt","entropy-mark"],focus);
    }
  }

  navigate(actor,target,dt) {
    const m=this.match;
    if(!target?.alive||this.isRooted(actor)||this.isIncapacitated(actor)){
      actor.lastMove={x:0,y:0};return;
    }
    // Healers path to a wounded teammate if LOS or healing range is broken.
    // Chasing an enemy while the patient bleeds behind a pillar is not triage.
    const patient=actor.role==="healer"?this.triage(actor):null;
    const saving=patient&&patient.hp/patient.maxHp<.8
      &&(dist(actor,patient)>420||!this.hasLOS(actor,patient,m.arena));
    if(saving)target=patient;
    const d=dist(actor,target),los=this.hasLOS(actor,target,m.arena);
    const closeThreat=m.opponents(actor).find(e=>e.role==="melee"&&dist(e,actor)<155);
    let desired=actor.role==="melee"?77:actor.role==="caster"?285:saving?240:300;
    // Ranged actors need to be inside the usable range, not parked at their
    // preferred distance with a pillar between them and the focus.
    desired=Math.min(desired,390);
    if(closeThreat&&actor.role!=="melee"&&d<250){
      const dx=actor.x-closeThreat.x,dy=actor.y-closeThreat.y;
      const away={x:dx,y:dy};
      const tangents=[{x:-dy,y:dx},{x:dy,y:-dx}];
      // Don't pin a ranged character to the arena boundary. Pick a walkable
      // escape vector with a small tangent component if directly blocked.
      const directions=[away,...tangents].filter(v=>this.canStand(
        actor.x+v.x*1.1,actor.y+v.y*1.1,m.arena,24));
      if(directions.length){
        actor.aiPath=null;
        const direction=directions[0];
        m.move(actor,direction.x,direction.y,dt);return;
      }
    }
    if(los&&d<=desired+35&&d>=Math.max(38,desired-90)){
      actor.aiPath=null;actor.lastMove={x:0,y:0};return;
    }
    if(los&&d<desired-90&&actor.role!=="melee"){
      actor.aiPath=null;
      m.move(actor,actor.x-target.x,actor.y-target.y,dt);
      return;
    }
    const snapshot=actor.aiPath;
    const needRefresh=!snapshot||snapshot.targetId!==target.id
      ||m.time-snapshot.at>.95||dist(snapshot.destination,target)>62
      ||!snapshot.points?.length;
    if(needRefresh){
      const points=this.shortestRoute(actor,target);
      actor.aiPath={targetId:target.id,at:m.time,
        destination:{x:target.x,y:target.y},points};
    }
    let points=actor.aiPath.points;
    while(points.length>1&&dist(actor,points[0])<30)points.shift();
    let goal=points[0]||target;
    if(goal===target&&los&&d<=desired+35){
      actor.lastMove={x:0,y:0};return;
    }
    const before={x:actor.x,y:actor.y};
    m.move(actor,goal.x-actor.x,goal.y-actor.y,dt);
    const moved=dist(before,actor);
    if(moved<.1){
      actor.aiBlockedSeconds=(actor.aiBlockedSeconds||0)+dt;
      if(actor.aiBlockedSeconds>.45){
        actor.aiPath=null;
        // Break symmetry on opposing sides of an obstacle.
        actor.aiDetourFlips=(actor.aiDetourFlips||0)+1;
        actor.aiBlockedSeconds=0;
        const turn=actor.aiDetourFlips%2===0?1:-1;
        const side={x:-(goal.y-actor.y)*turn,y:(goal.x-actor.x)*turn};
        m.move(actor,side.x,side.y,dt);
      }
    }else actor.aiBlockedSeconds=0;
  }

  updateActor(actor,dt){
    if(!actor.alive)return;
    const target=this.target(actor);
    if(!target)return;
    if(!actor.cast)this.navigate(actor,target,dt);
    actor.decision=(actor.decision||0)-dt;
    if(actor.decision>0)return;
    actor.decision=.22+(actor.role==="healer"?.09:.04);
    this.decision(actor,target);
  }
}
