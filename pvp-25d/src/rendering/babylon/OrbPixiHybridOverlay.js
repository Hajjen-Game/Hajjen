// Hybrid Orb Arena: actual PixiProofRenderer spell VFX over Babylon's 3D canvas.
// 3D glass, inner energy, collision, LOS and combat are always Babylon.
import { PixiProofRenderer } from "../../../../arena3v3/src/rendering/PixiProofRenderer.js?v=20261008-orb-hybrid1";
import { classColorFor } from "../../../../arena3v3/src/content/classes/classColors.js";
import { castBarPaletteFor } from "../../../../arena3v3/src/rendering/CastPalette.js?v=20260928-focusrestyle1";

const PIXI_URL="https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs";
// All native Pixi 3v3 spell categories are supported; only actor geometry
// stays in Babylon. The original Pixi methods filter relevant spell IDs.
const SCALE=.02;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hex=(value,fallback=0xffffff)=>{
  const match=typeof value==="string"&&/^#([a-f0-9]{6})$/i.exec(value);
  return match?parseInt(match[1],16):fallback;
};
const RESOURCE_COLORS={mana:0x4599ec,energy:0xf5d15c,rage:0xe46051,
  runic:0x64cce0,focus:0xd3a952};

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
    // 2D HUD-style bars stay pixel-crisp at any camera zoom. Draw these
    // last so spells never wash out the class HP or school-coloured castbar.
    const status=new PIXI.Container();
    status.label="orb-readable-status:"+id;
    const barBg=new PIXI.Graphics();
    const barFill=new PIXI.Graphics();
    const barBorder=new PIXI.Graphics();
    status.addChild(barBg,barFill,barBorder);
    root.addChild(status);
    view={root,body:{position:{x:0,y:0}},mask,castLayer,
      castWindupGlowFx,castWindupFx,
      status,barBg,barFill,barBorder,...layers};
    this.actorViews.set(id,view);
    return view;
  }
  updateStatusBars(view,actor,radius,selected){
    const bg=view.barBg,fill=view.barFill,border=view.barBorder;
    bg.clear();fill.clear();border.clear();
    view.status.position.set(0,-radius-21);
    const health=clamp(Number(actor.healthPct)||0,0,1);
    const low=health<.2;
    const hpColor=low?0xed5352:hex(classColorFor(actor),0xc9dce5);
    const teamColor=actor.team==="friendly"?0x49e98e:0xff5b60;
    const outline=selected?teamColor:0x7f93a3;
    // 100px health block: dark matte background, vivid class fill, thin
    // contour. Similar to the original Pixi 3v3 UI but easier to read.
    bg.rect(-50,0,100,12).fill({color:0x060a12,alpha:.98});
    fill.rect(-48,2,96*health,8).fill({
      color:hpColor,alpha:low?.90+.10*Math.sin(performance.now()*.014)**2:1,
    });
    border.rect(-50,0,100,12).stroke({
      color:outline,width:selected?1.7:1.1,alpha:selected?.95:.82,
    });
    // Slight dark seam preserves the recognizable Pixi bar proportions.
    if(actor.resource?.max>0){
      const power=clamp(Number(actor.resourcePct)||0,0,1);
      const resource=RESOURCE_COLORS[actor.resource.type]||0x66a3c7;
      bg.rect(-50,14,100,6).fill({color:0x050911,alpha:.94});
      fill.rect(-48,15,96*power,4).fill({color:resource,alpha:.98});
      border.rect(-50,14,100,6).stroke({
        color:0x5b7582,width:.85,alpha:.72,
      });
    }
    if(actor.cast){
      const progress=clamp(
        1-Math.max(0,Number(actor.cast.remainingMs)||0)
          /Math.max(1,Number(actor.cast.totalMs)||1),0,1,
      );
      const palette=castBarPaletteFor(actor,{
        cast:"#d6aa67",cream:"#f4e4c5",border:"#d4baa0",
      });
      const spell=actor.getSpell?.(actor.cast.spellId);
      const castAccent=hex(palette.start,0xe3ac70);
      const borderColor=spell?.interruptible===false
        ?0xffd16d:hex(palette.border,0xffeed0);
      bg.rect(-53,-17,106,11).fill({color:0x070a11,alpha:.97});
      fill.rect(-51,-15,102*progress,7).fill({
        color:castAccent,alpha:.98,
      });
      // A bright cap makes cast progress readable during movement.
      if(progress>.01){
        fill.rect(-51+102*progress-2,-15,2,7).fill({
          color:hex(palette.end,0xffe2a5),alpha:.95,
        });
      }
      border.rect(-53,-17,106,11).stroke({
        color:borderColor,width:1.2,alpha:.96,
      });
    }
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
      const selected=game.player?.targetId===actor.id;
      this.updateStatusBars(view,actor,radius,selected);
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
