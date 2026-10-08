// Separate Energy Arena renderer. Reuses the production glass orb meshes and
// floor target rings without changing the existing BabylonRenderer / Pixi game.
import { OrbCharacterRenderer } from "../../rendering/babylon/OrbCharacterRenderer.js?v=20261008-orbs-v21-vfx-polish";
import { OrbGroundMarkers } from "../../rendering/babylon/OrbGroundMarkers.js?v=20261008-ground-rings6-contained";
import { EnergySpellVFX } from "./EnergySpellVFX.js?v=20261008-combat-vfx1";

const S=.02;
const color=hex=>BABYLON.Color3.FromHexString(hex);
export class EnergyArenaRenderer {
  constructor(canvas,arena) {
    if(!window.BABYLON)throw new Error("Babylon.js is unavailable");
    this.canvas=canvas;this.arena=arena;
    this.engine=new BABYLON.Engine(canvas,true,{stencil:true,antialias:true,preserveDrawingBuffer:false});
    this.scene=new BABYLON.Scene(this.engine);
    this.scene.clearColor=BABYLON.Color4.FromHexString("#080d18ff");
    this.scene.ambientColor=color("#4b5471");
    this.scene.imageProcessingConfiguration.contrast=1.09;
    this.scene.imageProcessingConfiguration.exposure=0.95;
    this.effects=[];
    this.createScene();
    this.spellFX=new EnergySpellVFX(this.scene);
    this.actorRender=new OrbCharacterRenderer(this.scene,null,S);
    // Keep our established glass + animated arc geometry but replace class
    // palettes with role and discipline colours from the new Energy system.
    this.actorRender.styleFor=actor=>actor.energyStyle||{core:"#6acbd8",energy:"#83e4ee"};
    this.markers=new OrbGroundMarkers(this.scene,S);
    // Babylon starts with the canvas HTML default drawing buffer (300x150).
    // Resize immediately to CSS stage dimensions, not only after a window resize.
    this.engine.resize();
    this.fitCamera();
    this.resize=()=>{this.engine.resize();this.fitCamera();};
    window.addEventListener("resize",this.resize);
    if("ResizeObserver"in window){
      this.observer=new ResizeObserver(()=>this.resize());
      this.observer.observe(canvas.parentElement||canvas);
    }
  }
  material(id,diffuse,emissive,alpha=1) {
    const m=new BABYLON.StandardMaterial(id,this.scene);
    m.diffuseColor=color(diffuse);m.emissiveColor=color(emissive);
    m.specularColor=color("#1a2433");m.alpha=alpha;
    if(alpha<1)m.backFaceCulling=false;
    return m;
  }
  tube(id,points,radius,mat) {
    const mesh=BABYLON.MeshBuilder.CreateTube(id,{path:points,radius,tessellation:12},this.scene);
    mesh.material=mat;mesh.isPickable=false;return mesh;
  }
  createScene(){
    const a=this.arena,w=a.width*S,h=a.height*S,cx=w/2,cz=h/2;
    const camera=new BABYLON.ArcRotateCamera("energy-camera",-Math.PI/2,0.43,24.1,new BABYLON.Vector3(cx,0,cz+.6),this.scene);
    camera.inputs.clear();camera.minZ=.01;camera.maxZ=170;camera.fov=.72;
    this.camera=camera;this.scene.activeCamera=camera;
    const hemi=new BABYLON.HemisphericLight("energy-hemi",new BABYLON.Vector3(.1,1,.1),this.scene);
    hemi.intensity=.72;hemi.diffuse=color("#c9dbed");hemi.groundColor=color("#323858");
    const sun=new BABYLON.DirectionalLight("energy-sun",new BABYLON.Vector3(-.5,-1,.32),this.scene);
    sun.position.set(18,25,-7);sun.intensity=.65;sun.diffuse=color("#cfb6dd");
    const ground=BABYLON.MeshBuilder.CreateGround("energy-ground",{width:w,height:h},this.scene);
    ground.position.set(cx,-.038,cz);
    ground.material=this.material("floor-mat","#101522","#080f1f");
    ground.isPickable=false;
    const outerMat=this.material("outer-rim","#11273a","#32869b");
    const innerMat=this.material("inside-line","#0d1e2e","#245465");
    const path=(x,y,ww,hh,elev)=>[
      new BABYLON.Vector3(x,elev,y),new BABYLON.Vector3(x+ww,elev,y),
      new BABYLON.Vector3(x+ww,elev,y+hh),new BABYLON.Vector3(x,elev,y+hh),
      new BABYLON.Vector3(x,elev,y)];
    this.tube("outer-frame",path(.3,.3,w-.6,h-.6,.062),.047,outerMat);
    this.tube("inner-frame",path(.68,.64,w-1.36,h-1.28,.035),.012,innerMat);
    const fieldMat=this.material("field-lines","#0e1e2e","#0d263a");
    for(let i=1;i<8;i++){
      const x=i*w/8;
      this.tube("field-x"+i,[new BABYLON.Vector3(x,.01,.68),new BABYLON.Vector3(x,.01,h-.68)],.010,fieldMat);
    }
    const coreMat=this.material("obstacle-core","#172030","#0e1a2b");
    const sideMat=this.material("obstacle-side","#202d40","#16283e");
    const obstacleRim=this.material("obstacle-rim","#1b5160","#327486");
    for(const o of a.obstacles){
      const x=(o.x+o.w*.5)*S,z=(o.y+o.h*.5)*S,bw=o.w*S,bh=o.h*S;
      const block=BABYLON.MeshBuilder.CreateBox("energy-obstacle:"+o.id,{width:bw,height:1.22,depth:bh},this.scene);
      block.position.set(x,.61,z);block.material=coreMat;block.isPickable=false;
      const top=BABYLON.MeshBuilder.CreateBox("energy-obstacle-top:"+o.id,{width:bw-.08,height:.08,depth:bh-.08},this.scene);
      top.position.set(x,1.25,z);top.material=sideMat;top.isPickable=false;
      this.tube("energy-obstacle-rim:"+o.id,path((o.x+6)*S,(o.y+6)*S,(o.w-12)*S,(o.h-12)*S,1.32),.032,obstacleRim);
      this.tube("energy-obstacle-foot:"+o.id,path(o.x*S,o.y*S,bw,bh,.02),.025,innerMat);
    }
    this.glow=new BABYLON.GlowLayer("energy-glow",this.scene,{blurKernelSize:24});
    this.glow.intensity=.38;
    if(BABYLON.FxaaPostProcess)try{this.fxaa=new BABYLON.FxaaPostProcess("energy-fxaa",1,camera);}catch{}
  }
  fitCamera(){
    const width=Math.max(1,this.engine.getRenderWidth()),height=Math.max(1,this.engine.getRenderHeight());
    const scale=Math.max(1,1.55/(width/height));
    this.camera.target.set(this.arena.width*S*.5,0,this.arena.height*S*.5+.6);
    this.camera.radius=24.1*scale;
    this.camera.getViewMatrix(true);this.camera.getProjectionMatrix(true);
  }
  pickActor(clientX,clientY) {
    const rect=this.canvas.getBoundingClientRect();
    const x=(clientX-rect.left)*this.engine.getRenderWidth()/Math.max(1,rect.width);
    const y=(clientY-rect.top)*this.engine.getRenderHeight()/Math.max(1,rect.height);
    const pick=this.scene.pick(x,y,mesh=>Boolean(mesh?.metadata?.actorId));
    if(pick?.pickedMesh?.metadata?.actorId)return pick.pickedMesh.metadata.actorId;
    // Clicks near the transparent glass edge should still target the orb.
    const viewport=new BABYLON.Viewport(0,0,
      Math.max(1,rect.width),Math.max(1,rect.height));
    let best=null,bestD=42;
    for(const actor of this.activeActors||[]){
      if(!actor.alive)continue;
      const p=BABYLON.Vector3.Project(
        new BABYLON.Vector3(actor.x*S,.88,actor.y*S),
        BABYLON.Matrix.Identity(),this.scene.getTransformMatrix(),viewport);
      if(!Number.isFinite(p.x)||p.z<0||p.z>1)continue;
      const d=Math.hypot(p.x-(clientX-rect.left),p.y-(clientY-rect.top));
      if(d<bestD){best=actor.id;bestD=d;}
    }
    return best;
  }
  spawnEffect(event,match){
    this.spellFX.spawn(event,match);
  }
  render(match){
    const now=performance.now();
    this.activeActors=match.actors;
    this.actorRender.sync(match,now);
    this.markers.sync(match,now);
    this.spellFX.update(match,now);
    this.scene.render();
  }
  dispose(){
    this.observer?.disconnect();
    window.removeEventListener("resize",this.resize);
    this.spellFX?.dispose();
    this.markers?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}