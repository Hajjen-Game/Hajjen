// Hybrid Orb Arena: actual PixiProofRenderer spell VFX over Babylon's 3D canvas.
// 3D glass, inner energy, collision, LOS and combat are always Babylon.
import { PixiProofRenderer } from "../../../../arena3v3/src/rendering/PixiProofRenderer.js?v=20261008-orb-hybrid1";

const PIXI_URL="https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs";
const SPELLS=new Set(["mage-frostbolt","mage-pyroblast"]);
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

    const projectileVfx2GlowFx=new PIXI.Graphics();
    const projectileVfx2CoreFx=new PIXI.Graphics();
    root.addChild(projectileVfx2GlowFx,projectileVfx2CoreFx);
    view={root,body:{position:{x:0,y:0}},mask,castLayer,
      castWindupGlowFx,castWindupFx,
      projectileVfx2GlowFx,projectileVfx2CoreFx};
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
      view.castLayer.scale.set(clamp(radius/26,.65,1.2));
      actorMap.set(actor.id,{
        id:actor.id,x:projected.x,y:projected.y,radius,
        alive:true,classId:actor.classId,
        cast:SPELLS.has(actor.cast?.spellId)?actor.cast:null,
        getSpell:id=>actor.getSpell?.(id)||{id},
      });
    }
    for(const [id,view] of this.actorViews){
      if(actorMap.has(id))continue;
      view.root.destroy({children:true});
      this.actorViews.delete(id);
    }
    const effects=(game.vfx?.events||[])
      .filter(e=>e.type==="spell"&&SPELLS.has(e.spellId))
      .map(e=>{
        // Snapshot original 3v3 cast-completion coordinates. Do not tether
        // visual trails to the moving caster or moving target.
        const source=Number.isFinite(e.sourceX)&&Number.isFinite(e.sourceY)
          ?this.at(e.sourceX,e.sourceY):actorMap.get(e.sourceId);
        const target=Number.isFinite(e.targetX)&&Number.isFinite(e.targetY)
          ?this.at(e.targetX,e.targetY):actorMap.get(e.targetId);
        return {...e,sourceX:source?.x,sourceY:source?.y,
          targetX:target?.x,targetY:target?.y,
          seed:e.seed??e.id};
      })
      .filter(e=>Number.isFinite(e.sourceX)&&Number.isFinite(e.targetX));

    const projectedGame={
      actors:[...actorMap.values()],
      getActor:id=>actorMap.get(id),
      vfx:{effects},
      elapsedSeconds:Number(game.elapsedSeconds)||0,
    };
    // Execute original, polished 3v3 Pixi functions directly. Zero geometry
    // copied or redrawn from memory: shared source of truth.
    PixiProofRenderer.prototype.updateNativeCastWindupVfx.call(this,projectedGame);
    PixiProofRenderer.prototype.updateNativeProjectileVfx2.call(this,projectedGame);
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
