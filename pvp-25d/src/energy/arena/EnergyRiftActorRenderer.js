// The Planet Defense-only display bridge for the SAME procedural creatures
// used by Enemy & Boss Design Lab. PvP stays on the normal player-orb renderer.
// Enemy AI, hitboxes, spells and wave scheduling are intentionally untouched.
import {createUnit,animateRiftCreature} from "./EnergyRiftCreatureModels.js?v=20261011-riftcombat1";

export function speciesForPvEActor(actor){
  if(actor?.team!=="enemy"||!actor.encounterKey)return null;
  if(actor.boss){
    // Give the evolving Warden identities distinct silhouettes.
    const level=actor.encounterLevel||actor.level||1;
    return level>=24?"channeler":level>=16?"bulwark":
      level>=8?"channeler":"bulwark";
  }
  if(["raider","skirmisher"].includes(actor.encounterKey))return "shard";
  if(["spark","channeler","harbinger","mender","weaver"].includes(actor.encounterKey))
    return "channeler";
  if(actor.encounterKey==="bulwark")return "bulwark";
  return "shard";
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PICK_EXCLUDED=/ground|impact-wave|flash|boss-crown|floor/i;
const GLOW_PART=/reactor|heart|plasma|inner-gyre|internal-current|internal-mote|mandala|sigil|trim|spine|orbit|halo/i;

export class EnergyRiftActorRenderer{
  constructor(scene,scale=.02){
    this.scene=scene;this.scale=scale;
    this.entries=new Map();this.pendingEvents=new Map();this.lastNow=0;
    this.glow=typeof BABYLON.GlowLayer==="function"?
      new BABYLON.GlowLayer("energy-rift-combat-glow",scene,{blurKernelSize:32}):null;
    if(this.glow)this.glow.intensity=.43;
  }
  create(actor){
    const species=speciesForPvEActor(actor);
    const unit=createUnit(this.scene,species);
    const scale=(actor.boss?.78:species==="bulwark"?.54:.49);
    unit.root.scaling.setAll(scale);
    unit.root.position.set(actor.x*this.scale,.08,actor.y*this.scale);
    // Research models intentionally keep their internal 3D structure.
    // Do not render the hero orb underneath or reuse its character shaders.
    for(const crown of unit.bossExtras)crown.setEnabled(Boolean(actor.boss));
    const meshes=unit.root.getChildMeshes(false);
    // Some authored materials (e.g. optional rune variants) have no mesh
    // in a particular species. Dispose those too after each PvE wave.
    const materials=new Set(Object.values(unit.mats));
    for(const mesh of meshes){
      if(mesh.material)materials.add(mesh.material);
      mesh.isPickable=!PICK_EXCLUDED.test(mesh.name);
      if(mesh.isPickable)mesh.metadata={actorId:actor.id,riftSpecies:species};
      if(this.glow&&GLOW_PART.test(mesh.name)&&
         !/glass|shell|facet|ground/.test(mesh.name))
        this.glow.addIncludedOnlyMesh(mesh);
    }
    const entry={actorId:actor.id,species,unit,meshes,materials,scale,
      boss:Boolean(actor.boss),lastAttack:-100,lastImpact:-100,
      facing:0};
    this.entries.set(actor.id,entry);
    return entry;
  }
  notify(event,match){
    if(!event?.actorId||match.modeId!=="defense")return;
    const actor=match.getActor(event.actorId);
    if(!actor||actor.team!=="enemy"||!actor.encounterKey)return;
    const state=this.entries.get(actor.id);
    const now=performance.now();
    if(event.type==="hit"||event.type==="heal"||
      event.type==="charge-impact"||event.type==="encounter-telegraph"||
      event.type==="encounter-impact"){
      if(state){
        if(event.type==="hit"||event.type==="heal"||
          event.type==="charge-impact")state.lastAttack=now;
        if(event.type==="encounter-impact")state.lastImpact=now;
      }else{
        this.pendingEvents.set(actor.id,{time:now,type:event.type});
      }
    }
  }
  sync(actors,now=performance.now()){
    const alive=actors.filter(a=>a.alive&&a.team==="enemy"&&a.encounterKey);
    const present=new Set(alive.map(a=>a.id));
    for(const [id,entry] of this.entries){
      if(!present.has(id)){
        this.disposeEntry(entry);
        this.entries.delete(id);
      }
    }
    const dt=this.lastNow?clamp((now-this.lastNow)/1000,0,.075):0;
    this.lastNow=now;
    for(const actor of alive){
      const species=speciesForPvEActor(actor);
      let entry=this.entries.get(actor.id);
      if(entry&&entry.species!==species){
        this.disposeEntry(entry);this.entries.delete(actor.id);entry=null;
      }
      entry=entry||this.create(actor);
      const queued=this.pendingEvents.get(actor.id);
      if(queued){
        if(queued.type==="encounter-impact")entry.lastImpact=queued.time;
        else entry.lastAttack=queued.time;
        this.pendingEvents.delete(actor.id);
      }
      const u=entry.unit;
      u.root.position.set(actor.x*this.scale,.08,actor.y*this.scale);
      const movement=actor.lastMove||{x:0,y:0};
      if(Math.hypot(movement.x||0,movement.y||0)>.09)
        entry.facing=Math.atan2(movement.y||0,movement.x||0);
      // Motion is carried by the root, creature breath/gesture by its body.
      // The lab's default orientation is preserved for recognisable silhouettes.
      u.root.rotation.y=entry.facing*.46;
      const cast=actor.cast;
      const progress=cast?clamp(1-cast.remainingMs/Math.max(1,cast.totalMs),0,1):0;
      const wind=cast
        ?cast.spellId?.startsWith("encounter-")
          ?.38+.62*progress:.38*progress
        :0;
      const attackAge=(now-entry.lastAttack)/1000;
      const impactAge=(now-entry.lastImpact)/1000;
      const release=attackAge>=0&&attackAge<.52?
        Math.sin(Math.PI*attackAge/.52):0;
      const impact=impactAge>=0&&impactAge<.50?
        Math.sin(Math.PI*impactAge/.50):0;
      animateRiftCreature(u,now*.001,dt,{wind,release,impact});
    }
    for(const id of this.pendingEvents.keys())
      if(!present.has(id))this.pendingEvents.delete(id);
  }
  disposeEntry(entry){
    if(this.glow?.removeIncludedOnlyMesh)
      for(const mesh of entry.meshes)this.glow.removeIncludedOnlyMesh(mesh);
    // The extra ground-ink material is owned by the unit but not by mats.
    entry.unit.root.dispose(false,false);
    for(const material of entry.materials)material.dispose();
  }
  dispose(){
    for(const entry of this.entries.values())this.disposeEntry(entry);
    this.entries.clear();this.pendingEvents.clear();
    this.glow?.dispose();
  }
}
