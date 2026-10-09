// Character HUB renders the SAME Babylon glass orb and EnergyOrbPolish
// as the actual arena, but in its own isolated, larger 3D showcase.
// No meshes, materials or draw calls are added to combat by this class.
import { OrbCharacterRenderer } from "../../rendering/babylon/OrbCharacterRenderer.js?v=20261008-orbs-v21-vfx-polish";
import { EnergyOrbPolish } from "./EnergyOrbPolish.js?v=20261009-orb-preview-fix28";
import { energyIdentity } from "./EnergyCharacter.js?v=20261009-character-hub27";

export class EnergyOrbShowcase{
  constructor(canvas){
    if(!window.BABYLON)throw Error("Babylon not loaded");
    this.canvas=canvas;
    this.engine=new BABYLON.Engine(canvas,true,{antialias:true,stencil:true,preserveDrawingBuffer:false});
    this.scene=new BABYLON.Scene(this.engine);
    this.scene.clearColor=BABYLON.Color4.FromHexString("#080e1dff");
    this.scene.ambientColor=BABYLON.Color3.FromHexString("#56637d");
    this.scene.imageProcessingConfiguration.contrast=1.1;
    this.scene.imageProcessingConfiguration.exposure=1.12;
    this.camera=new BABYLON.ArcRotateCamera("hero-preview-camera",
      -Math.PI/2,1.27,2.95,new BABYLON.Vector3(0,.92,0),this.scene);
    this.camera.minZ=.05;
    new BABYLON.HemisphericLight("hero-fill",new BABYLON.Vector3(.15,1,.35),this.scene).intensity=1.15;
    const rim=new BABYLON.PointLight("hero-rim",new BABYLON.Vector3(-2,3,-3),this.scene);
    rim.intensity=2.1;rim.range=10;
    this.characterRender=new OrbCharacterRenderer(this.scene,null,1);
    this.characterRender.styleFor=a=>a.energyStyle;
    this.polish=new EnergyOrbPolish(this.scene,this.characterRender);
    this.actor={
      id:"energy-hub-hero",team:"friendly",control:"player",role:"healer",
      classId:"energy-healer",x:0,y:0,alive:true,
      hp:160,maxHp:160,healthPct:1,flux:100,shield:0,
      statuses:[],cast:null,lastMove:{x:0,y:0},
      energyStyle:{core:"#6fdaad",energy:"#78d1fa"},isShowcase:true
    };
    this.fakeMatch={actors:[this.actor]};
    this.discipline=null;this.secondary=null;
    this.visible=true;
    this.failed=false;
    this.firstFrame=false;
    this.resizeObserver=typeof ResizeObserver==="function"?new ResizeObserver(()=>this.engine.resize()):null;
    this.resizeObserver?.observe(canvas);
    this.engine.runRenderLoop(()=>{
      if(!this.visible||this.failed||this.canvas.clientWidth===0||this.canvas.clientHeight===0)return;
      try{
        this.renderFrame(performance.now());
      }catch(error){
        // Do not silently leave an empty hero portrait if Babylon or a
        // polish layer fails. One explicit diagnostic, no console spam.
        this.failed=true;
        console.error("Energy character orb preview failed:",error);
        const fallback=document.getElementById("hub-visual-fallback");
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
    const e=this.characterRender.entries.get(this.actor.id);
    if(!e)throw Error("OrbCharacterRenderer did not create the showcase orb");
    // Never show a combat HP bar in the character portrait.
    e.barRoot?.setEnabled(false);
    this.camera.alpha=-Math.PI/2+Math.sin(now*.00022)*.18;
    this.scene.render();
    if(!this.firstFrame){
      this.firstFrame=true;
      const fallback=document.getElementById("hub-visual-fallback");
      if(fallback)fallback.hidden=true;
    }
  }
  update(build,level){
    const identity=energyIdentity(build,level);
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
