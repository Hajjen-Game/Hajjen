const POWER_UP_TYPES = Object.freeze(["power", "haste", "speed"]);

const POWER_UP_META = Object.freeze({
  power: Object.freeze({
    id: "power",
    name: "POWER",
    glyph: "◆",
  }),
  haste: Object.freeze({
    id: "haste",
    name: "HASTE",
    glyph: "✦",
  }),
  speed: Object.freeze({
    id: "speed",
    name: "SPEED",
    glyph: "»",
  }),
});

// Fixed normalized candidates are resolved against each arena's playable bounds.
// Unsafe points are rejected against LOS/collision geometry before each spawn.
const NORMALIZED_SPAWN_POINTS = Object.freeze([
  [.50,.50],
  [.50,.22], [.50,.78],
  [.34,.50], [.66,.50],
  [.30,.30], [.70,.30],
  [.30,.70], [.70,.70],
  [.20,.38], [.80,.38],
  [.20,.62], [.80,.62],
  [.42,.27], [.58,.27],
  [.42,.73], [.58,.73],
]);

function distance(a,b){
  return Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));
}

export class PowerUpSystem {
  constructor(game,{
    firstSpawnSeconds=30,
    intervalSeconds=40,
    pickupLifetimeSeconds=15,
    buffDurationMs=10000,
    pickupRadius=26,
  }={}){
    this.game=game;
    this.firstSpawnSeconds=firstSpawnSeconds;
    this.intervalSeconds=intervalSeconds;
    this.pickupLifetimeSeconds=pickupLifetimeSeconds;
    this.buffDurationMs=buffDurationMs;
    this.pickupRadius=pickupRadius;
    this.reset();
  }

  reset(){
    this.nextSpawnAtSeconds=this.firstSpawnSeconds;
    this.activePickup=null;
    this.lastSpawnKey=null;
    this.spawnSerial=0;
    this.events=[];
  }

  nextSpawnSeconds(elapsedSeconds=this.game?.elapsedSeconds||0){
    return Math.max(0,this.nextSpawnAtSeconds-(Number(elapsedSeconds)||0));
  }

  metaFor(type){
    return POWER_UP_META[type] || POWER_UP_META.power;
  }

  activePowerUpEffect(actor){
    return (actor?.effects||[]).find(effect =>
      effect.powerUp === true && effect.remainingMs > 0
    ) || null;
  }

  damageMultiplierFor(actor){
    const bonus=(actor?.effects||[])
      .filter(effect => effect.kind==="powerUpDamage" && effect.remainingMs>0)
      .reduce((highest,effect)=>Math.max(highest,Number(effect.value)||0),0);
    return 1+Math.min(.75,bonus);
  }

  castTimeMultiplierFor(actor){
    const reduction=(actor?.effects||[])
      .filter(effect => effect.kind==="powerUpHaste" && effect.remainingMs>0)
      .reduce((highest,effect)=>Math.max(highest,Number(effect.value)||0),0);
    return Math.max(.45,1-Math.min(.55,reduction));
  }

  gcdMultiplierFor(actor){
    if(actor?.role!=="melee") return 1;
    const reduction=(actor?.effects||[])
      .filter(effect => effect.kind==="powerUpHaste" && effect.remainingMs>0)
      .reduce(
        (highest,effect)=>Math.max(highest,Number(effect.meleeGcdReduction)||0),
        0,
      );
    return Math.max(.55,1-Math.min(.45,reduction));
  }

  update(){
    const game=this.game;
    if(!game || game.waitingForStart || game.ended) return;

    const now=Number(game.elapsedSeconds)||0;

    if(this.activePickup && now>=this.activePickup.expiresAtSeconds){
      this.recordEvent({
        kind:"expire",
        type:this.activePickup.type,
        x:this.activePickup.x,
        y:this.activePickup.y,
      });
      this.activePickup=null;
    }

    if(!this.activePickup && now>=this.nextSpawnAtSeconds){
      this.spawn(now);
    }

    if(!this.activePickup) return;

    const collector=(game.actors||[])
      .filter(actor=>actor.alive)
      .find(actor =>
        distance(actor,this.activePickup)
        <= this.pickupRadius+(Number(actor.radius)||0)
      );

    if(collector) this.collect(collector);
  }

  spawn(now){
    const point=this.chooseSpawnPoint();
    if(!point){
      // Retry soon rather than creating an invalid pickup inside geometry.
      this.nextSpawnAtSeconds=now+2;
      return;
    }

    const type=POWER_UP_TYPES[Math.floor(Math.random()*POWER_UP_TYPES.length)]
      || POWER_UP_TYPES[0];
    const meta=this.metaFor(type);

    this.spawnSerial+=1;
    this.activePickup={
      id:"powerup-"+this.spawnSerial,
      type,
      name:meta.name,
      glyph:meta.glyph,
      x:point.x,
      y:point.y,
      spawnKey:point.key,
      spawnedAtSeconds:now,
      expiresAtSeconds:now+this.pickupLifetimeSeconds,
    };
    this.lastSpawnKey=point.key;

    this.nextSpawnAtSeconds=now+this.intervalSeconds;
    this.recordEvent({
      kind:"spawn",
      type,
      x:point.x,
      y:point.y,
    });
  }

  collect(actor){
    const pickup=this.activePickup;
    if(!pickup || !actor?.alive) return;

    const effect=this.effectFor(actor,pickup.type);
    if(!effect) return;

    // A player can hold one arena power-up at a time. The cadence prevents
    // normal overlap, but this also makes future tuning deterministic.
    actor.effects=actor.effects.filter(item => item.powerUp !== true);
    actor.effects.push(effect);

    const description=this.descriptionFor(actor,pickup.type);
    this.recordEvent({
      kind:"pickup",
      type:pickup.type,
      x:pickup.x,
      y:pickup.y,
      actorId:actor.id,
      actorName:actor.name,
      classId:actor.classId,
      role:actor.role,
      team:actor.team,
      description,
    });

    this.game.addFloatingText?.(actor,pickup.name+"!", "burst");
    this.game.log?.(
      this.game.combatantLabel(actor)
      +" picks up "+pickup.name+" — "+description+"."
    );

    if(actor.id===this.game.player?.id){
      this.game.ui?.toast?.(pickup.name+" · "+description);
    }

    this.activePickup=null;
  }

  effectFor(actor,type){
    const common={
      sourceId:actor.id,
      durationMs:this.buffDurationMs,
      remainingMs:this.buffDurationMs,
      breakOnDamage:false,
      powerUp:true,
      powerUpType:type,
      visualStyle:"powerup",
    };

    if(type==="power"){
      if(actor.role==="healer"){
        return {
          ...common,
          kind:"damageReduction",
          spellId:"powerup-power-defense",
          value:.30,
          label:"POWER · 30% DAMAGE REDUCTION",
        };
      }
      return {
        ...common,
        kind:"powerUpDamage",
        spellId:"powerup-power-damage",
        value:.30,
        label:"POWER · +30% DAMAGE",
      };
    }

    if(type==="haste"){
      return {
        ...common,
        kind:"powerUpHaste",
        spellId:"powerup-haste",
        value:.30,
        meleeGcdReduction:.25,
        label:actor.role==="melee"
          ? "HASTE · 30% FASTER CASTS · 25% FASTER GCD"
          : "HASTE · 30% FASTER CASTS",
      };
    }

    return {
      ...common,
      kind:"powerUpSpeed",
      spellId:"powerup-speed",
      value:.35,
      label:"SPEED · +35% MOVEMENT",
    };
  }

  descriptionFor(actor,type){
    if(type==="power"){
      return actor.role==="healer"
        ? "30% damage reduction for 10s"
        : "+30% damage for 10s";
    }
    if(type==="haste"){
      return actor.role==="melee"
        ? "30% faster casts and 25% faster GCD for 10s"
        : "30% faster casts for 10s";
    }
    return "+35% movement speed for 10s";
  }

  chooseSpawnPoint(){
    const safe=this.safeSpawnPoints();
    if(safe.length===0) return null;

    const notRepeated=safe.filter(point=>point.key!==this.lastSpawnKey);
    const candidates=notRepeated.length>0?notRepeated:safe;
    const alive=(this.game.actors||[]).filter(actor=>actor.alive);
    const awayFromActors=candidates.filter(point =>
      alive.every(actor => distance(point,actor) >= 115+(Number(actor.radius)||0))
    );
    const pool=awayFromActors.length>0?awayFromActors:candidates;
    return pool[Math.floor(Math.random()*pool.length)] || pool[0] || null;
  }

  safeSpawnPoints(){
    const arena=this.game?.arena;
    const bounds=arena?.bounds;
    if(!bounds) return [];

    const candidates=NORMALIZED_SPAWN_POINTS.map(([nx,ny],index)=>({
      key:String(index),
      x:Math.round(bounds.x+bounds.w*nx),
      y:Math.round(bounds.y+bounds.h*ny),
    }));

    return candidates.filter(point=>this.pointIsSafe(point,arena));
  }

  pointIsSafe(point,arena){
    const bounds=arena.bounds;
    const edge=54;
    if(
      point.x<bounds.x+edge
      || point.x>bounds.x+bounds.w-edge
      || point.y<bounds.y+edge
      || point.y>bounds.y+bounds.h-edge
    ) return false;

    const clearance=52;
    return !(arena.obstacles||[]).some(rect =>
      point.x>=rect.x-clearance
      && point.x<=rect.x+rect.w+clearance
      && point.y>=rect.y-clearance
      && point.y<=rect.y+rect.h+clearance
    );
  }

  recordEvent(event){
    this.events.push({
      time:Number(this.game?.elapsedSeconds)||0,
      ...event,
    });
    if(this.events.length>80) this.events.splice(0,this.events.length-80);
  }
}
