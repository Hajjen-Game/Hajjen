// Hybrid Orb Arena: actual PixiProofRenderer spell VFX over Babylon's 3D canvas.
// 3D glass, inner energy, collision, LOS and combat are always Babylon.
import { PixiProofRenderer } from "../../../../arena3v3/src/rendering/PixiProofRenderer.js?v=20261008-orb-hybrid1";

const PIXI_URL="https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs";
// All native Pixi 3v3 spell categories are supported; only actor geometry
// stays in Babylon. The original Pixi methods filter relevant spell IDs.
const SCALE=.02;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class OrbPixiHybridOverlay{
  constructor(babylon){
    this.babylon=babylon;
    this.canvas=babylon.canvas;
    this.scene=babylon.scene;
    this.camera=babylon.camera;
    this.actorViews=new Map();
    this.width=0;this.height=0;this.ready=false;
  }
  async init(){
    const PIXI=await import(PIXI_URL);
    this.PIXI=PIXI;
    const stage=this.canvas.parentElement;
    if(!stage)throw new Error("Orb stage is missing");
    const view=document.createElement("canvas");
    this.view=view;
    view.id="orb-pixi-hybrid";
    view.setAttribute("aria-hidden","true");
    Object.assign(view.style,{
      position:"absolute",inset:"0",width:"100%",height:"100%",
      display:"block",pointerEvents:"none",zIndex:"2",background:"transparent",
    });
    // Babylon keeps all input/picking; this surface never receives pointers.
    this.canvas.insertAdjacentElement("afterend",view);
    try{
      this.width=Math.max(1,stage.clientWidth||1280);
      this.height=Math.max(1,stage.clientHeight||720);
      this.app=new PIXI.Application();
      await this.app.init({
        canvas:view,width:this.width,height:this.height,
        backgroundAlpha:0,antialias:true,autoStart:false,
        preference:"webgl",autoDensity:true,
        resolution:Math.min(2,Math.max(1,window.devicePixelRatio||1)),
      });
      this.fxStage=new PIXI.Container();
      this.app.stage.addChild(this.fxStage);
      this.ready=true;
    }catch(error){
      view.remove();
      this.view=null;
      throw error;
    }
  }
  resize(){
    const stage=this.canvas.parentElement;
    if(!this.ready||!stage)return;
    const width=Math.max(1,stage.clientWidth||this.width);
    const height=Math.max(1,stage.clientHeight||this.height);
    if(width===this.width&&height===this.height)return;
    this.width=width;this.height=height;
    this.app.renderer.resize(width,height);
  }
  project(world){
    const viewport=new BABYLON.Viewport(0,0,this.width,this.height);
    const v=BABYLON.Vector3.Project(
      world,BABYLON.Matrix.Identity(),this.scene.getTransformMatrix(),viewport,
    );
    return Number.isFinite(v.x)&&Number.isFinite(v.y)
      &&v.z>=0&&v.z<=1?{x:v.x,y:v.y}:null;
  }
  at(x,y,height=.88){
    return this.project(new BABYLON.Vector3(x*SCALE,height,y*SCALE));
  }
  pixelsPerWorldUnit(actor){
    if(!actor)return this.width/1280;
    const c=this.at(actor.x,actor.y);
    const edge=this.at(actor.x+1,actor.y);
    return c&&edge?clamp(Math.hypot(edge.x-c.x,edge.y-c.y),.25,3):this.width/1280;
  }
  radius(actor,center){
    const edge=this.project(new BABYLON.Vector3(
      actor.x*SCALE+.62,.88,actor.y*SCALE,
    ));
    return edge?clamp(Math.hypot(edge.x-center.x,edge.y-center.y),13,75):24;
  }
  ensureView(id){
    let view=this.actorViews.get(id);
    if(view)return view;
    const PIXI=this.PIXI;
    const root=new PIXI.Container();
    root.label="orb-hybrid:"+id;
    this.fxStage.addChild(root);

    const castLayer=new PIXI.Container();
    const castWindupGlowFx=new PIXI.Graphics();
    const castWindupFx=new PIXI.Graphics();
    castLayer.addChild(castWindupGlowFx,castWindupFx);
    root.addChild(castLayer);
    const mask=new PIXI.Graphics();
    root.addChild(mask);
    castLayer.mask=mask;

    // Layer names match PixiProofRenderer.createActorView, allowing us to
    // invoke the ORIGINAL per-class VFX methods rather than rewriting them.
    // Layers are ordered soft->sharp to preserve the authored colour balance.
    const layers={};
    for(const name of [
      "secondaryGlowFx","secondaryFx",
      "burstFx","slashFx","ringFx","beamFx",
      "chainGlowFx","chainFx","chainSparkFx",
      "priestHealSpellFx","priestDruidSpellFx",
      "paladinDkSpellFx","warriorRogueSpellFx",
      "commonCasterSpellFx",
      "combatVfx2GlowFx","combatVfx2CoreFx",
      "projectileVfx2GlowFx","projectileVfx2CoreFx",
      "spellPolishGlowFx","spellPolishCoreFx",
    ]){
      const graphic=new PIXI.Graphics();
      graphic.label=name;
      root.addChild(graphic);
      layers[name]=graphic;
    }
    view={root,body:{position:{x:0,y:0}},mask,castLayer,
      castWindupGlowFx,castWindupFx,...layers};
    this.actorViews.set(id,view);
    return view;
  }
  render(game){
    if(!this.ready||!this.scene||!this.camera)return;
    this.resize();
    const actorMap=new Map();
    for(const actor of game.actors||[]){
      if(!actor.alive)continue;
      const projected=this.at(actor.x,actor.y);
      if(!projected)continue;
      const view=this.ensureView(actor.id);
      const radius=this.radius(actor,projected);
      view.root.position.set(projected.x,projected.y);
      view.root.visible=true;
      // Pixi's detailed buildup is inside the projected sphere; Babylon
      // still supplies the actual volumetric core and rotating 3D energy.
      view.mask.clear().circle(0,0,radius*.89).fill(0xffffff);
      view.castLayer.scale.set(clamp((radius*.82)/(radius+33),.23,.57));
      actorMap.set(actor.id,{
        ...actor,
        x:projected.x,y:projected.y,radius,
        // Preserve every class's original spellbook, cast and combat state;
        // Pixi's dedicated healer, melee and talent VFX need these fields.
        alive:true,
        getSpell:id=>actor.getSpell?.(id)||{id},
      });
    }
    for(const [id,view] of this.actorViews){
      if(actorMap.has(id))continue;
      view.root.destroy({children:true});
      this.actorViews.delete(id);
    }
    const events=game.vfx?.events||[];
    const effects=events.map(e=>{
      // Preserve the frozen cast positions, rather than attaching moving
      // projectile tails to the actor's CURRENT position.
      const source=Number.isFinite(e.sourceX)&&Number.isFinite(e.sourceY)
        ?this.at(e.sourceX,e.sourceY):actorMap.get(e.sourceId);
      const target=Number.isFinite(e.targetX)&&Number.isFinite(e.targetY)
        ?this.at(e.targetX,e.targetY):actorMap.get(e.targetId);
      const point=Number.isFinite(e.x)&&Number.isFinite(e.y)
        ?this.at(e.x,e.y):null;
      // In Pixi, actor.radius and AoE radii use screen-pixel units. Convert
      // Babylon's logical arena units using a local projected X offset.
      const anchor=actorMap.get(e.sourceId)||actorMap.get(e.targetId);
      const pixelsPerGameUnit=anchor&&game.getActor
        ?this.pixelsPerWorldUnit(game.getActor(anchor.id))
        :this.width/1280;
      return {
        ...e,
        sourceX:source?.x??e.sourceX,sourceY:source?.y??e.sourceY,
        targetX:target?.x??e.targetX,targetY:target?.y??e.targetY,
        x:point?.x??e.x,y:point?.y??e.y,
        radiusStart:Number.isFinite(e.radiusStart)?e.radiusStart*pixelsPerGameUnit:undefined,
        radiusEnd:Number.isFinite(e.radiusEnd)?e.radiusEnd*pixelsPerGameUnit:undefined,
        seed:e.seed??e.id,
      };
    });

    const projectedGame={
      actors:[...actorMap.values()],
      getActor:id=>actorMap.get(id),
      vfx:{effects},
      elapsedSeconds:Number(game.elapsedSeconds)||0,
    };
    // These are the actual Pixi 3v3 methods, in their original order.
    // They know which spells each class owns and skip inapplicable events.
    const original=PixiProofRenderer.prototype;
    original.updateNativeCastWindupVfx.call(this,projectedGame);
    original.updateNativeSecondaryCombatVfx.call(this,projectedGame);
    original.updateNativeBurstVfx.call(this,projectedGame);
    original.updateNativeSlashVfx.call(this,projectedGame);
    original.updateNativeRingVfx.call(this,projectedGame);
    original.updateNativeBeamVfx.call(this,projectedGame);
    original.updateNativeChainVfx.call(this,projectedGame);
    original.updateNativePriestHealSpellVfx.call(this,projectedGame);
    original.updateNativePriestDruidSpellVfx.call(this,projectedGame);
    original.updateNativePaladinDkSpellVfx.call(this,projectedGame);
    original.updateNativeWarriorRogueSpellVfx.call(this,projectedGame);
    original.updateNativeCommonCasterSpellVfx.call(this,projectedGame);
    original.updateNativeCombatVfx2.call(this,projectedGame);
    original.updateNativeProjectileVfx2.call(this,projectedGame);
    original.updateNativeSpellAnimationPolish.call(this,projectedGame);
    original.updateNativeRangedShowcaseVfx.call(this,projectedGame);
    this.app.render();
  }
  dispose(){
    this.ready=false;
    for(const view of this.actorViews.values())view.root.destroy({children:true});
    this.actorViews.clear();
    this.app?.destroy(true,{children:true});
    this.view?.remove();
  }
}
