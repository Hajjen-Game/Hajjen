// Character HUB renders the SAME Babylon glass orb and EnergyOrbPolish
// as the actual arena, but in its own isolated, larger 3D showcase.
// No meshes, materials or draw calls are added to combat by this class.
import { OrbCharacterRenderer } from "../../rendering/babylon/OrbCharacterRenderer.js?v=20261008-orbs-v21-vfx-polish";
import { EnergyOrbPolish } from "./EnergyOrbPolish.js?v=20261009-hub-orbit29";
import { energyIdentity } from "./EnergyCharacter.js?v=20261012-rift1";

export class EnergyOrbShowcase{
  constructor(canvas,{companionRole=null,side=null}={}){
    if(!window.BABYLON)throw Error("Babylon not loaded");
    this.canvas=canvas;this.companionRole=companionRole;this.side=side;
    this.engine=new BABYLON.Engine(canvas,true,{antialias:!companionRole,stencil:true,preserveDrawingBuffer:false});
    if(companionRole)this.engine.setHardwareScalingLevel?.(1.65);
    this.scene=new BABYLON.Scene(this.engine);
    this.scene.clearColor=BABYLON.Color4.FromHexString("#080e1dff");
    this.scene.ambientColor=BABYLON.Color3.FromHexString("#56637d");
    this.scene.imageProcessingConfiguration.contrast=1.1;
    this.scene.imageProcessingConfiguration.exposure=1.12;
    // ONE orb per canvas. Companion previews are separate small panels beneath
    // the Evolution Tree, never overlapping the player's central orb.
    this.camera=new BABYLON.ArcRotateCamera("hero-preview-camera",
      -Math.PI/2,1.27,companionRole?2.85:2.43,new BABYLON.Vector3(0,.72,0),this.scene);
    this.camera.minZ=.05;
    new BABYLON.HemisphericLight("hero-fill",new BABYLON.Vector3(.15,1,.35),this.scene).intensity=1.15;
    const rim=new BABYLON.PointLight("hero-rim",new BABYLON.Vector3(-2,3,-3),this.scene);
    rim.intensity=2.1;rim.range=10;
    this.characterRender=new OrbCharacterRenderer(this.scene,null,1);
    this.characterRender.styleFor=a=>a.energyStyle;
    this.polish=new EnergyOrbPolish(this.scene,this.characterRender);
    this.actor={
      id:companionRole?"energy-hub-ally-"+side:"energy-hub-hero",
      team:"friendly",control:companionRole?"ai":"player",
      role:companionRole||"healer",classId:"energy-"+(companionRole||"healer"),
      x:0,y:0,alive:true,
      hp:160,maxHp:160,healthPct:1,flux:100,shield:0,
      statuses:[],cast:null,lastMove:{x:0,y:0},
      energyStyle:{core:"#6fdaad",energy:"#78d1fa"},isShowcase:true
    };
    this.fakeMatch={actors:[this.actor]};
    if(companionRole)this.updateCompanion(companionRole);
    this.discipline=null;this.secondary=null;
    this.visible=true;
    this.failed=false;
    this.firstFrame=false;
    this.lastCompactFrame=0;
    this.resizeObserver=typeof ResizeObserver==="function"?new ResizeObserver(()=>this.engine.resize()):null;
    this.resizeObserver?.observe(canvas);
    this.engine.runRenderLoop(()=>{
      if(!this.visible||this.failed||this.canvas.clientWidth===0||this.canvas.clientHeight===0)return;
      try{
        const now=performance.now();
        // Small previews run at ~30 FPS and reduced resolution; prioritize
        // the hero's large interactive 3D Evolution Tree.
        if(this.companionRole&&now-this.lastCompactFrame<33)return;
        if(this.companionRole)this.lastCompactFrame=now;
        this.renderFrame(now);
      }catch(error){
        // Do not silently leave an empty hero portrait if Babylon or a
        // polish layer fails. One explicit diagnostic, no console spam.
        this.failed=true;
        console.error("Energy character orb preview failed:",error);
        const fallback=document.getElementById(
          this.side?"hub-ally-fallback-"+this.side:"hub-visual-fallback");
        if(fallback){
          fallback.hidden=false;
          fallback.textContent="Unable to render your 3D orb. Open the browser console for details.";
        }
        this.engine.stopRenderLoop();
      }
    });
  }
  renderFrame(now){
    // OrbCharacterRenderer receives the same actor-shaped input as combat.
    // The polished layer must run AFTER sync, as in EnergyArenaRenderer.
    this.characterRender.sync(this.fakeMatch,now);
    this.polish.sync(this.fakeMatch,now);
    const entry=this.characterRender.entries.get(this.actor.id);
    if(!entry)throw Error("OrbCharacterRenderer did not create the portrait orb");
    entry.barRoot?.setEnabled(false);
    // Isolated central hero and isolated companion canvases — one actor each.
    entry.root.scaling.setAll(1);
    this.camera.alpha=-Math.PI/2+Math.sin(now*.00022)*.11;
    this.scene.render();
    if(!this.firstFrame){
      this.firstFrame=true;
      const fallback=document.getElementById(
        this.side?"hub-ally-fallback-"+this.side:"hub-visual-fallback");
      if(fallback)fallback.hidden=true;
    }
  }
  update(build,level,journey=null){
    const identity=energyIdentity(build,level,journey);
    this.actor.role=build.role;
    this.actor.classId="energy-"+build.role;
    this.actor.energyStyle=identity.style;
    if(identity.primary!==this.discipline||identity.secondary!==this.secondary){
      const p=this.polish.entries.get(this.actor.id);
      if(p){this.polish.disposeEntry(p);this.polish.entries.delete(this.actor.id);}
      const e=this.characterRender.entries.get(this.actor.id);
      if(e){this.characterRender.disposeEntry(e);this.characterRender.entries.delete(this.actor.id);}
      this.discipline=identity.primary;this.secondary=identity.secondary;
    }
    return identity;
  }
  updateCompanion(role){
    if(!this.companionRole)return;
    const styles={
      healer:{core:"#66d5ad",energy:"#b0f8de"},
      melee:{core:"#f27b83",energy:"#f7ad91"},
      caster:{core:"#79cafd",energy:"#baaffb"}
    };
    this.companionRole=role;
    this.actor.role=role;
    this.actor.classId="energy-"+role;
    this.actor.energyStyle=styles[role]||styles.caster;
    // Recreate existing meshes/materials if a reused panel switches Origin.
    const p=this.polish.entries.get(this.actor.id);
    if(p){this.polish.disposeEntry(p);this.polish.entries.delete(this.actor.id);}
    const e=this.characterRender.entries.get(this.actor.id);
    if(e){this.characterRender.disposeEntry(e);this.characterRender.entries.delete(this.actor.id);}
  }
  setVisible(visible){
    this.visible=Boolean(visible);
    if(!this.visible||this.failed)return;
    this.engine.resize();
    // The parent HUB has just been unhidden; resize again after layout.
    requestAnimationFrame(()=>{
      if(this.visible&&!this.failed)this.engine.resize();
    });
  }
  dispose(){
    this.resizeObserver?.disconnect();
    this.engine.stopRenderLoop();
    this.polish.dispose();
    for(const entry of this.characterRender.entries.values())
      this.characterRender.disposeEntry(entry);
    this.characterRender.entries.clear();
    this.characterRender.glassTexture?.dispose();
    this.characterRender.heartTexture?.dispose();
    this.scene.dispose();this.engine.dispose();
  }
}
