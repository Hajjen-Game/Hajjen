// Rift Expedition 1.0: a route through five connected locations.
// Shares the real combat/creature/boss systems, but deliberately does NOT
// inherit Planet Defense's automatic wave-to-wave intermissions and rewards.
import {EnergyMatch,canStand,hasLineOfSight} from "./EnergyMatch.js?v=20261015-voidlab2";
import {EnergyPlanetDefense} from "./EnergyPlanetDefense.js?v=20261015-voidlab2";
import {MODES} from "./EnergyProgression.js?v=20261015-voidlab1";
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const RIFT_SECTORS=5;
export const RIFT_GATE_RADIUS=112;

export class EnergyRiftExpedition extends EnergyPlanetDefense{
  constructor(build,arena,options={}){
    if(arena?.mode!=="rift"||arena.route?.length!==RIFT_SECTORS)
      throw Error("Rift Expedition requires the five-sector Rift world.");
    super(build,arena,options);
    // PlanetDefense calls beginWave() during its own constructor. Our override
    // safely defers that until the route and mode are fully initialised.
    this.modeId="rift";
    this.mode=MODES.rift;
    this.riftReady=true;
    this.wave=0;
    this.waveState="starting";
    this.riftHistory=[];
    this.riftGate=null;
    this.riftCleared=0;
    this.riftHazard=null;this.riftHazardHits=[];
    this.beginWave();
  }
  get sector(){return this.arena.route[this.wave-1]||null;}
  get objective(){
    if(this.ended)return this.winner==="friendly"?"RIFT HEART CONQUERED":"EXPEDITION LOST";
    if(this.waveState==="advance")return "FOLLOW THE GLOWING GATE · "+this.sector?.name;
    if(this.wave===RIFT_SECTORS)return "DEFEAT THE RIFT HEART GUARDIAN";
    return this.sector?.focus||"FIGHT THROUGH THE RIFT";
  }
  beginWave(){
    // Base-class constructor invokes this virtually before riftReady exists.
    if(!this.riftReady)return;
    if(this.wave>=RIFT_SECTORS||this.ended)return;
    this.wave++;
    this.waveState="active";
    this.waveSpawned=0;this.waveDefeated=0;this.summonedThisWave=0;
    this.spawnQueue=[...this.currentWave.enemies];
    this.spawnClock=0;
    this.riftGate=null;
    this.riftHazard=null;
    this.nextRiftHazardAt=this.time+5.5;
    this.ai.planTick=0;
    // If AI allies remained behind a distant rock formation, reunite them
    // at a safe spot near the player; the player always travels on foot.
    for(const ally of this.living("friendly")){
      if(ally===this.player||distance(ally,this.player)<360)continue;
      for(const offset of [{x:-63,y:-48},{x:-63,y:48},{x:70,y:70}]){
        const point={x:this.player.x+offset.x,y:this.player.y+offset.y};
        if(canStand(point.x,point.y,this.arena,34)){
          ally.x=point.x;ally.y=point.y;break;
        }
      }
    }
    this.spawnNext();
    this.log("RIFT EXPEDITION · "+this.sector.name+
      " · SECTOR "+this.wave+"/"+RIFT_SECTORS);
    this.emit({type:"rift-sector-start",actorId:"player",wave:this.wave,
      waveName:this.sector.name,focus:this.sector.focus});
    this.emit({type:"wave-start",wave:this.wave,waveName:this.sector.name,
      encounterTier:this.encounter.tier,encounterStage:"RIFT EXPEDITION",
      waveFocus:this.sector.focus});
  }
  // Only sectors 3 and 4 carry simple positional challenges; these are
  // world mechanics, not hidden spell effects, and never run outside Rift.
  updateRiftHazard(){
    if(this.waveState!=="active"||this.ended)return;
    const hazard=this.arena.hazards?.find(h=>h.sector===this.wave);
    if(!hazard||!this.living("enemy").length)return;
    const now=this.time,active=this.riftHazard;
    if(active?.phase==="warning"){
      if(now<active.until)return;
      const affected=[];
      for(const actor of this.actors){
        if(!actor.alive||distance(actor,hazard)>hazard.radius||
          !hasLineOfSight(hazard,actor,this.arena))continue;
        if(hazard.kind==="flux"){
          const before=actor.flux;
          actor.flux=Math.max(0,actor.flux-hazard.fluxLoss);
          if(before>actor.flux)affected.push(actor.id);
        }else{
          const guard=actor.statuses.find(q=>q.kind==="guard"&&q.remaining>0);
          const raw=Math.round(actor.maxHp*hazard.damageRatio*(1-(guard?.amount||0)));
          const absorb=Math.min(actor.shield,raw);
          actor.shield-=absorb;
          const amount=Math.max(0,raw-absorb);
          actor.hp=Math.max(0,actor.hp-amount);
          actor.healthPct=actor.hp/actor.maxHp;
          if(raw>0)affected.push(actor.id);
          if(actor.hp<=0){
            actor.alive=false;actor.cast=null;actor.charge=null;
            this.log(actor.name+" fell to "+hazard.name);
            this.emit({type:"death",actorId:actor.id,targetId:actor.id,
              killerId:"rift-environment",spellId:hazard.id});
          }
        }
      }
      this.riftHazardHits.push({sector:this.wave,name:hazard.name,
        time:now,affected:[...affected]});
      this.emit({type:"rift-hazard-impact",actorId:"rift-environment",
        hazardId:hazard.id,kind:hazard.kind,sector:this.wave,
        x:hazard.x,y:hazard.y,radius:hazard.radius,affected});
      this.riftHazard={...hazard,phase:"impact",until:now+.42};
      this.nextRiftHazardAt=now+hazard.interval;
      return;
    }
    if(active?.phase==="impact"){
      if(now>=active.until)this.riftHazard=null;
      return;
    }
    if(now<this.nextRiftHazardAt)return;
    this.riftHazard={...hazard,phase:"warning",until:now+hazard.warning};
    this.emit({type:"rift-hazard-warning",actorId:"rift-environment",
      hazardId:hazard.id,kind:hazard.kind,sector:this.wave,
      x:hazard.x,y:hazard.y,radius:hazard.radius,duration:hazard.warning});
    this.log(hazard.name+" · MOVE OUT OF THE WARNING RING");
  }
  // Deliberately no intermission or between-wave Overcharge selection:
  // progress is determined by traversing the world and opening seals.
  chooseResonance(){return false;}
  resonanceChoices(){return [];}
  update(dt){
    if(this.ended)return;
    if(this.waveState==="advance"){
      EnergyMatch.prototype.update.call(this,dt);
      if(this.ended)return;
      if(this.riftGate&&distance(this.player,this.riftGate)<=RIFT_GATE_RADIUS){
        const gate=this.riftGate;
        this.riftHistory.push({sector:this.wave,gate,time:this.time});
        this.emit({type:"rift-gate-activated",actorId:"player",
          wave:this.wave,x:gate.x,y:gate.y});
        // Light recovery is earned by activating the seal; no free
        // resurrection or automatic permanent reward.
        for(const ally of this.living("friendly")){
          ally.hp=Math.min(ally.maxHp,ally.hp+Math.round(ally.maxHp*.18));
          ally.healthPct=ally.hp/ally.maxHp;
          ally.flux=Math.min(100,ally.flux+25);
          ally.cooldowns={};ally.gcd=0;
        }
        this.log("RIFT SEAL OPENED · THE PATH DEEPENS");
        this.beginWave();
      }
      return;
    }
    if(this.waveState!=="active")return;
    this.spawnClock+=Math.max(0,dt);
    if(this.spawnQueue.length&&this.living("enemy").length<this.currentWave.maxAlive&&
      this.spawnClock>=this.currentWave.spawnGap){
      this.spawnClock=0;this.spawnNext();
    }
    EnergyMatch.prototype.update.call(this,dt);
    if(this.ended)return;
    this.updateEncounters();
    this.updateRiftHazard();
    if(this.ended)return;
    const casualties=this.actors.filter(a=>a.team==="enemy"&&
      a.id.startsWith("wave-"+this.wave+"-")&&!a.alive).length;
    if(casualties>this.waveDefeated){
      this.totalKills+=casualties-this.waveDefeated;
      this.waveDefeated=casualties;
    }
    if(!this.spawnQueue.length&&!this.living("enemy").length){
      // Sector is cleared: cancel unfinished ground warnings immediately.
      this.riftHazard=null;
      this.riftCleared=this.wave;
      this.emit({type:"rift-sector-clear",actorId:"player",wave:this.wave,
        waveName:this.sector.name});
      if(this.wave>=RIFT_SECTORS){
        this.waveState="complete";this.ended=true;this.winner="friendly";
        this.emit({type:"end",winner:"friendly"});
        this.log("RIFT EXPEDITION COMPLETE · HEART GUARDIAN DEFEATED");
      }else{
        this.waveState="advance";
        this.riftGate={...this.sector.gate};
        for(const ally of this.living("friendly")){
          ally.cast=null;ally.charge=null;
        }
        this.log("SECTOR CLEARED · REACH THE GLOWING RIFT GATE TO CONTINUE");
        this.emit({type:"rift-gate-open",actorId:"player",wave:this.wave,
          x:this.riftGate.x,y:this.riftGate.y});
      }
    }
  }
}
