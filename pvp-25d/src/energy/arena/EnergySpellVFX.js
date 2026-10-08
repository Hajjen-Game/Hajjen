// Dedicated Energy Arena VFX. Babylon-only prototype effects, built around
// actual spell events, not by replaying old WoW-class Pixi spell identifiers.
// Procedural, luminous spell travel / buildup / impact preserve orb readability.
import { ABILITY_BY_ID, DISCIPLINES } from "../abilityCatalog.js";
import { ABILITY_RULES } from "./EnergyMatch.js";
import { EnergyHeroVFX } from "./EnergyHeroVFX.js?v=20261008-neon-color11";

const S=.02,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class EnergySpellVFX {
  constructor(scene){
    this.scene=scene;this.effects=[];this.nextId=0;
    this.materials=new Map();
    this.hero=new EnergyHeroVFX(scene);
  }
  material(hex){
    if(this.materials.has(hex))return this.materials.get(hex);
    const c=BABYLON.Color3.FromHexString(hex);
    const m=new BABYLON.StandardMaterial("energy-spell-mat:"+hex,this.scene);
    m.diffuseColor=c.scale(.15);m.emissiveColor=c.scale(1.36);
    m.specularColor=BABYLON.Color3.Black();m.disableLighting=true;
    m.alpha=.95;m.backFaceCulling=false;m.disableDepthWrite=true;
    if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
      m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    this.materials.set(hex,m);return m;
  }
  world(actor,y=.85){
    return new BABYLON.Vector3(actor.x*S,y,actor.y*S);
  }
  sphere(position,color,diameter=.3,duration=500,type="burst",extra={}){
    const mesh=BABYLON.MeshBuilder.CreateSphere("energy-fx:"+this.nextId++,{
      diameter,segments:16},this.scene);
    mesh.position.copyFrom(position);mesh.material=this.material(color);
    mesh.isPickable=false;mesh.renderingGroupId=1;
    const effect={type,mesh,start:performance.now(),duration,
      initial:position.clone(),...extra};
    this.effects.push(effect);return effect;
  }
  ring(position,color,diameter=1.05,duration=550,type="ring",extra={}){
    const mesh=BABYLON.MeshBuilder.CreateTorus("energy-ring:"+this.nextId++,{
      diameter,thickness:.055,tessellation:56},this.scene);
    mesh.position.copyFrom(position);mesh.material=this.material(color);
    mesh.isPickable=false;mesh.renderingGroupId=1;
    const effect={type,mesh,start:performance.now(),duration,initial:position.clone(),...extra};
    this.effects.push(effect);return effect;
  }
  slash(position,color,spellId){
    const points=[];const r=spellId==="gravity-hammer"?.75:.86;
    for(let i=0;i<=18;i++){
      const angle=-1.0+i*2.0/18;
      points.push(new BABYLON.Vector3(
        position.x+Math.sin(angle)*r,
        position.y+Math.cos(angle)*r*.48,
        position.z+Math.sin(angle)*r*.30
      ));
    }
    const mesh=BABYLON.MeshBuilder.CreateTube("energy-swipe:"+this.nextId++,{
      path:points,radius:.065,tessellation:12},this.scene);
    mesh.material=this.material(color);mesh.isPickable=false;
    this.effects.push({type:"slash",mesh,start:performance.now(),duration:440,
      initial:position.clone()});
    this.ring(new BABYLON.Vector3(position.x,.075,position.z),color,1.2,570,"ground");
  }
  spawn(e,match){
    if(!e.spellId)return;
    if(this.hero.supports(e.spellId)){
      this.hero.spawn(e,match);
      return;
    }
    const ability=ABILITY_BY_ID[e.spellId],rule=ABILITY_RULES[e.spellId];
    if(!ability)return;
    const from=match.getActor(e.actorId),target=match.getActor(e.targetId);
    if(!from)return;
    const hex=DISCIPLINES[ability.discipline]?.color||"#8bdfff";
    const ranged=rule?.range>200;
    if(e.type==="windup"){
      // Begin charging immediately, inside the glass core. Casts grow until
      // completion, instant abilities flash quickly rather than feeling dead.
      const castMs=(rule?.cast||0)*1000;
      this.sphere(this.world(from,.89),hex,.23,
        castMs?Math.min(2800,castMs):300,"charge",{actorId:from.id});
      return;
    }
    if(e.type==="hit"){
      if(!target)return;
      const end=this.world(target,.88);
      if(e.spellId==="gravity-hammer"){
        this.sphere(new BABYLON.Vector3(end.x,3.65,end.z),hex,.85,440,"fall",{end});
        this.ring(new BABYLON.Vector3(end.x,.09,end.z),hex,1.5,650,"ground");
      }else if(ranged&&from!==target){
        const start=this.world(from,.91);
        this.sphere(start,hex,e.spellId==="fracture-spear"?.58:.45,370,"projectile",{
          end,spellId:e.spellId,
        });
      }else this.slash(end,hex,e.spellId);
      return;
    }
    if(e.type==="heal"){
      if(!target)return;
      const end=this.world(target,.88);
      this.sphere(end,hex,.53,580,"heal");
      this.ring(end,hex,1.15,660,"healRing");
      return;
    }
    if(["shield","guard","control","link","cleanse","immune","interrupt","break"].includes(e.type)){
      const end=this.world(target||from,.88);
      const duration=e.type==="control"?1000:e.type==="shield"?900:640;
      this.ring(end,hex,e.type==="control"?1.8:1.35,duration,"aura");
      if(e.type==="shield"||e.type==="guard")this.sphere(end,hex,1.55,750,"shell");
      return;
    }
    if(e.type==="ability"&&["dot","hot"].includes(rule?.mode)&&target){
      const end=this.world(target,.88);
      this.ring(end,hex,1.32,750,"aura");
    }
    if(e.type==="dash")this.ring(this.world(from,.10),hex,1,500,"ground");
  }
  update(match,now=performance.now()){
    this.hero.update(match,now);
    for(let i=this.effects.length-1;i>=0;i--){
      const effect=this.effects[i];
      const t=clamp((now-effect.start)/effect.duration,0,1);
      if(t>=1){effect.mesh.dispose();this.effects.splice(i,1);continue;}
      const mesh=effect.mesh;
      if(effect.type==="charge"){
        const actor=match.getActor(effect.actorId);
        if(actor?.alive)mesh.position.copyFrom(this.world(actor,.89));
        mesh.scaling.setAll(.65+t*2.5);
        mesh.visibility=(1-t*.55)*(.68+.15*Math.sin(t*18));
      }else if(effect.type==="projectile"){
        const ease=t*t*(3-2*t);
        mesh.position=BABYLON.Vector3.Lerp(effect.initial,effect.end,ease);
        mesh.scaling.setAll(1+t*.28);
        mesh.visibility=1;
        if(t>.87&& !effect.impact){
          effect.impact=true;
          this.ring(this.world({x:effect.end.x/S,y:effect.end.z/S},.88),
            DISCIPLINES[ABILITY_BY_ID[effect.spellId].discipline]?.color||"#8bdfff",
            1.08,550,"healRing");
        }
      }else if(effect.type==="fall"){
        mesh.position.y=effect.initial.y-(effect.initial.y-effect.end.y)*(t*t);
        mesh.scaling.setAll(1.0+t*.25);mesh.visibility=1-t*.35;
      }else if(effect.type==="slash"){
        mesh.rotation.y=t*1.25-.35;
        mesh.scaling.setAll(.74+.85*t);mesh.visibility=(1-t)*.96;
      }else if(effect.type==="ground"){
        mesh.scaling.setAll(.7+1.1*t);
        mesh.visibility=.85*(1-t);
      }else if(effect.type==="healRing"){
        mesh.rotation.x=t*.4;
        mesh.scaling.setAll(.65+1.15*t);
        mesh.visibility=.85*(1-t);
      }else if(effect.type==="shell"){
        mesh.scaling.setAll(1+.24*t);mesh.visibility=.26*(1-t);
      }else {
        mesh.scaling.setAll(.75+t*1.3);
        mesh.visibility=(1-t)*.85;
      }
    }
  }
  dispose(){
    this.hero.dispose();
    for(const e of this.effects)e.mesh.dispose();
    this.effects=[];
    for(const material of this.materials.values())material.dispose();
    this.materials.clear();
  }
}
