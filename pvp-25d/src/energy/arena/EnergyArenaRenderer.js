// Separate Energy Arena renderer. Reuses the production glass orb meshes and
// floor target rings without changing the existing BabylonRenderer / Pixi game.
import { OrbCharacterRenderer } from "../../rendering/babylon/OrbCharacterRenderer.js?v=20261008-orbs-v21-vfx-polish";
import { OrbGroundMarkers } from "../../rendering/babylon/OrbGroundMarkers.js?v=20261008-ground-rings6-contained";
import { EnergyOrbPolish } from "./EnergyOrbPolish.js?v=20261009-hub-orbit29";
import { EnergySpellVFX } from "./EnergySpellVFX.js?v=20261013-rift12";
import { EnergyEclipseVFX } from "./EnergyEclipseVFX.js?v=20261015-eclipse-vfx2";
import { EnergySolarVFX } from "./EnergySolarVFX.js?v=20261015-solar-vfx2";
import { EnergyPixiVFXOverlay } from "./EnergyPixiVFXOverlay.js?v=20261015-solar-pixi1";
import { EnergyRiftActorRenderer } from "./EnergyRiftActorRenderer.js?v=20261011-riftcombat2";
import { createRiftEnvironment } from "./EnergyRiftEnvironment.js?v=20261013-rift-lightfix";
import { ABILITY_BY_ID } from "../abilityCatalog.js?v=20261015-voidlab1";

const S=.02;
const color=hex=>BABYLON.Color3.FromHexString(hex);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Camera only starts tracking when the player leaves the comfort region. It
// moves towards the closest edge of that region, never snaps to player center.
export function advanceDefenseCamera(anchor,player,dt,arena){
  const deadX=164,deadY=125;
  const targetX=player.x>anchor.x+deadX?player.x-deadX:
    player.x<anchor.x-deadX?player.x+deadX:anchor.x;
  const targetY=player.y>anchor.y+deadY?player.y-deadY:
    player.y<anchor.y-deadY?player.y+deadY:anchor.y;
  const lerp=1-Math.exp(-6.2*clamp(dt,0,.1));
  const boundX=clamp(targetX,510,arena.width-510);
  const boundY=clamp(targetY,360,arena.height-360);
  return {x:anchor.x+(boundX-anchor.x)*lerp,
    y:anchor.y+(boundY-anchor.y)*lerp};
}
export class EnergyArenaRenderer {
  constructor(canvas,arena) {
    if(!window.BABYLON)throw new Error("Babylon.js is unavailable");
    this.canvas=canvas;this.arena=arena;
    this.defenseMode=arena.mode==="defense"||arena.mode==="rift";
    this.cameraFocus={x:arena.cameraStart?.x??arena.width*.5,
      y:arena.cameraStart?.y??arena.height*.5};
    this.lastFollowAt=0;
    this.engine=new BABYLON.Engine(canvas,true,{stencil:true,antialias:true,preserveDrawingBuffer:false});
    this.scene=new BABYLON.Scene(this.engine);
    this.scene.clearColor=BABYLON.Color4.FromHexString(arena.mode==="rift"?"#08091bff":"#080d18ff");
    this.scene.ambientColor=color("#4b5471");
    this.scene.imageProcessingConfiguration.contrast=1.09;
    this.scene.imageProcessingConfiguration.exposure=0.95;
    this.effects=[];
    this.solarFamiliars=new Map();
    this.voidFormMeshes=new Map();
    this.solarHeliosBeams=new Map();
    this.createScene();
    this.spellFX=new EnergySpellVFX(this.scene);
    this.eclipseVFX=new EnergyEclipseVFX(this.scene);
    this.solarVFX=new EnergySolarVFX(this.scene);
    this.pixiFX=new EnergyPixiVFXOverlay(canvas.parentElement||canvas,this);
    this.pixiFX.init();
    this.actorRender=new OrbCharacterRenderer(this.scene,null,S);
    // Planet Defense uses the same procedural creatures as the design lab.
    // PvP, teammates and the player's orb still use OrbCharacterRenderer.
    this.riftActors=this.defenseMode?new EnergyRiftActorRenderer(this.scene,S):null;
    // Keep our established glass + animated arc geometry but replace class
    // palettes with role and discipline colours from the new Energy system.
    this.actorRender.styleFor=actor=>actor.energyStyle||{core:"#6acbd8",energy:"#83e4ee"};
    // Energy-only glass/core/discipline pass. Shared WoW 3v3 orb renderer stays untouched.
    this.orbPolish=new EnergyOrbPolish(this.scene,this.actorRender);
    this.markers=new OrbGroundMarkers(this.scene,S);
    this.createIdentificationMarkers();
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
  // The existing target floor ring stays; four luminous chevrons point
  // inward at its circumference. No more floating overhead markers.
  createIdentificationMarkers(){
    const halo=(name,hex,diameter,thickness)=>{
      const mesh=BABYLON.MeshBuilder.CreateTorus(name,{
        diameter,thickness,tessellation:64},this.scene);
      mesh.material=this.material(name+"-mat",hex,hex,.95);
      mesh.isPickable=false;
      return mesh;
    };
    this.targetFloorArrows={};
    for(const team of ["friendly","enemy"]){
      const hex=team==="friendly"?"#65ffac":"#ff687c";
      const material=this.material("energy-target-chevron-mat-"+team,hex,hex,.95);
      material.disableLighting=true;
      const group=new BABYLON.TransformNode("energy-target-arrows-"+team,this.scene);
      for(let i=0;i<4;i++){
        const angle=i*Math.PI/2;
        const point=(a,r)=>new BABYLON.Vector3(Math.cos(a)*r,.025,Math.sin(a)*r);
        // Thin arrowheads stop at the old selected ring and face its centre.
        const path=[point(angle-.14,1.43),point(angle,1.105),
          point(angle+.14,1.43)];
        const arrow=BABYLON.MeshBuilder.CreateTube(
          "energy-target-chevron-"+team+"-"+i,
          {path,radius:.046,tessellation:8},this.scene);
        arrow.material=material;
        arrow.parent=group;
        arrow.isPickable=false;
      }
      group.setEnabled(false);
      this.targetFloorArrows[team]=group;
    }
    // The player has a different, always-on icy orbit; it never turns
    // friendly or hostile red/green.
    this.selfMarks=[
      halo("energy-self-orbit-main","#c5f6ff",1.92,.046),
      halo("energy-self-orbit-edge","#76d7f1",2.12,.023)
    ];
    for(const ring of this.selfMarks)ring.setEnabled(false);
  }
  updateIdentificationMarkers(match,now){
    const selected=match.getActor(match.player?.targetId);
    for(const [team,group] of Object.entries(this.targetFloorArrows)){
      const enabled=Boolean(selected?.alive&&selected.team===team);
      group.setEnabled(enabled);
      if(!enabled)continue;
      group.position.set(selected.x*S,.092,selected.y*S);
      group.rotation.y=Math.sin(now*.0008)*.095;
      group.scaling.setAll(.99+.022*(.5+.5*Math.sin(now*.005)));
    }
    const player=match.player;
    for(const [index,ring] of this.selfMarks.entries()){
      ring.setEnabled(Boolean(player?.alive));
      if(!player?.alive)continue;
      ring.position.set(player.x*S,.94+index*.1,player.y*S);
      ring.rotation.x=index===0?.24:-.19;
      ring.rotation.y=now*.0008*(index===0?1:-1);
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
    // Reuse EXACTLY the PvP arena materials and lighting. Planet Defense is
    // simply a much larger, open battlefield with a moving camera.
    const ground=BABYLON.MeshBuilder.CreateGround("energy-ground",{width:w,height:h},this.scene);
    ground.position.set(cx,-.038,cz);
    ground.material=this.material("floor-mat","#101522","#080f1f");
    ground.isPickable=false;
    if(a.mode==="rift"){
      this.riftWorld=createRiftEnvironment(this.scene,a,S);
    }else{
    const outerMat=this.material("outer-rim","#11273a","#32869b");
    const innerMat=this.material("inside-line","#0d1e2e","#245465");
    const path=(x,y,ww,hh,elev)=>[
      new BABYLON.Vector3(x,elev,y),new BABYLON.Vector3(x+ww,elev,y),
      new BABYLON.Vector3(x+ww,elev,y+hh),new BABYLON.Vector3(x,elev,y+hh),
      new BABYLON.Vector3(x,elev,y)];
    this.tube("outer-frame",path(.3,.3,w-.6,h-.6,.062),.047,outerMat);
    this.tube("inner-frame",path(.68,.64,w-1.36,h-1.28,.035),.012,innerMat);
    const fieldMat=this.material("field-lines","#0e1e2e","#0d263a");
    const gridColumns=this.defenseMode?24:8;
    for(let i=1;i<gridColumns;i++){
      const x=i*w/gridColumns;
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
    }
    this.glow=new BABYLON.GlowLayer("energy-glow",this.scene,{blurKernelSize:24});
    this.glow.intensity=.38;
    if(BABYLON.FxaaPostProcess)try{this.fxaa=new BABYLON.FxaaPostProcess("energy-fxaa",1,camera);}catch{}
  }
  fitCamera(){
    const width=Math.max(1,this.engine.getRenderWidth()),height=Math.max(1,this.engine.getRenderHeight());
    const scale=Math.max(1,1.55/(width/height));
    this.camera.target.set(this.cameraFocus.x*S,0,this.cameraFocus.y*S+.6);
    this.camera.radius=(this.defenseMode?19.4:24.1)*scale;
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
  pickGround(clientX,clientY){
    const rect=this.canvas.getBoundingClientRect();
    const x=(clientX-rect.left)*this.engine.getRenderWidth()/Math.max(1,rect.width);
    const y=(clientY-rect.top)*this.engine.getRenderHeight()/Math.max(1,rect.height);
    const ray=this.scene.createPickingRay(x,y,BABYLON.Matrix.Identity(),this.camera);
    const plane=BABYLON.Plane.FromPositionAndNormal(
      BABYLON.Vector3.Zero(),BABYLON.Vector3.Up());
    const t=ray.intersectsPlane(plane);
    if(!Number.isFinite(t)||t<0)return null;
    const hit=ray.origin.add(ray.direction.scale(t));
    return {x:hit.x/S,y:hit.z/S};
  }
  spawnEffect(event,match){
    this.riftActors?.notify(event,match);
    // Solar 1.0 is five-spell-only, with a separate Babylon + Pixi pipeline.
    // NEVER intercept Sun Lance or Crystal Bolt (nor their accepted VFX).
    if(this.solarVFX?.spawn(event,match)){
      if(event.spellId==="flux-bolt"&&event.kind==="helios-tick")
        this.drawSolarHelios(event,match);
      if(event.spellId==="flux-bolt"&&event.kind==="helios-end")
        this.clearSolarHelios(event.actorId);
      this.pixiFX?.spawn(event,match);
      return;
    }
    // Only five Eclipse spells enter this independent 3D pipeline.
    // Crystal Bolt, Sun Lance and all other existing VFX stay untouched.
    if(this.eclipseVFX?.spawn(event,match)){
      // Babylon body + Pixi crisp strands for the same Eclipse event.
      // Only the old generic path is bypassed, never the Pixi layer.
      this.pixiFX?.spawn(event,match);
      return;
    }
    if(event.type==="encounter-telegraph"){
      const origin=new BABYLON.Vector3(event.x*S,.115,event.y*S);
      const diameter=Math.max(1,event.radius*2*S);
      const hue=event.boss?"#ed76d6":"#b68af2";
      // Persistent warning rings are tied to the live interruptible cast,
      // not to damage events. Interrupting or killing the caster cancels them.
      this.spellFX.ring(origin,hue,diameter,event.duration*1000,
        "encounter-telegraph",{casterId:event.actorId,castSpell:event.spellId});
      this.spellFX.ring(new BABYLON.Vector3(origin.x,.118,origin.z),
        event.boss?"#ff9a95":"#8bd9fa",diameter*.74,event.duration*1000,
        "encounter-telegraph",{casterId:event.actorId,castSpell:event.spellId});
      return;
    }
    if(event.type==="encounter-impact"){
      const center=new BABYLON.Vector3(event.x*S,.11,event.y*S);
      const hex=event.boss?"#d28cff":"#9eacf9";
      this.spellFX.ring(center,hex,
        Math.max(1,2*S*event.radius*.88),540,"ground");
      this.spellFX.sphere(new BABYLON.Vector3(center.x,.88,center.z),
        "#ead2ff",event.boss?1.35:.94,510,"burst");
      return;
    }
    if(event.type==="boss-phase"){
      const boss=match.getActor(event.actorId);
      if(boss){
        const center=new BABYLON.Vector3(boss.x*S,.13,boss.y*S);
        this.spellFX.ring(center,"#d2a3ff",4.0,950,"ground");
        this.spellFX.sphere(new BABYLON.Vector3(center.x,1.02,center.z),
          "#b886f8",1.3,650,"burst");
      }
      return;
    }
    if(event.type==="encounter-guard"){
      const shielded=match.getActor(event.actorId);
      if(shielded)this.spellFX.ring(
        new BABYLON.Vector3(shielded.x*S,.14,shielded.y*S),
        "#f7b377",2.1,650,"ground");
      return;
    }
    if(event.type==="charge-trail"){
      // The sphere is a wake behind an actually moving orb, not a teleport.
      this.spellFX.sphere(new BABYLON.Vector3(event.x*S,.68,event.y*S),
        "#f090a6",.23,210,"burst");
      return;
    }
    if(event.type==="charge-impact"){
      this.spellFX.ring(new BABYLON.Vector3(event.x*S,.105,event.y*S),
        "#ff9bad",1.55,400,"ground");
      this.spellFX.sphere(new BABYLON.Vector3(event.x*S,.84,event.y*S),
        "#ffcad5",.40,300,"burst");
      return;
    }
    if(event.type==="wave-debuff"&&event.spellId==="rift-corruption"){
      const target=match.getActor(event.targetId);
      if(target){
        const p=new BABYLON.Vector3(target.x*S,.12,target.y*S);
        this.spellFX.ring(p,"#b78af5",1.95,750,"ground");
        this.spellFX.sphere(new BABYLON.Vector3(p.x,1.1,p.z),
          "#c3a1fa",.48,550,"burst");
      }
      return;
    }
    if(event.type==="dash"&&
      (event.spellId==="phase-slip"||event.spellId==="vector-rush")){
      const x1=event.fromX*S,z1=event.fromY*S,x2=event.toX*S,z2=event.toY*S;
      if(event.spellId==="phase-slip"){
        this.spellFX.ring(new BABYLON.Vector3(x1,.11,z1),"#a987e8",1.5,490,"ground");
        this.spellFX.ring(new BABYLON.Vector3(x2,.11,z2),"#d9b2ff",1.9,530,"ground");
        this.spellFX.sphere(new BABYLON.Vector3(x2,.83,z2),"#b98fe7",.39,430,"burst");
      }else{
        // Vector Rush has a readable travel path; Phase Slip has only the
        // two blink endpoints. No extra damage is attached to either VFX.
        for(let i=0;i<6;i++){
          const t=(i+.5)/6;
          const x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;
          this.spellFX.sphere(new BABYLON.Vector3(x,.15,z),
            i%2?"#f88fa3":"#fbd0d8",.18+(1-t)*.07,330,"burst");
        }
        this.spellFX.ring(new BABYLON.Vector3(x2,.11,z2),"#f48ea4",1.3,480,"ground");
      }
      return;
    }
    if(event.type==="ground-telegraph"&&["zenith-crash","gravity-hammer","froststorm"].includes(event.spellId)){
      const center=new BABYLON.Vector3(event.x*S,.10,event.y*S);
      const diameter=(event.radius||124)*S*2;
      // Friendly pillars look Solar-gold; enemy danger zones look hostile red.
      const hostile=match.getActor(event.actorId)?.team==="enemy";
      this.spellFX.ring(center,hostile?"#f16f88":
        event.spellId==="gravity-hammer"?"#fb799a":event.spellId==="froststorm"?"#8dddff":"#ffc780",
        diameter,(event.duration||2)*1000,"telegraph",{casterId:event.actorId});
      this.spellFX.ring(new BABYLON.Vector3(center.x,.105,center.z),
        hostile?"#aa3d64":event.spellId==="gravity-hammer"?"#ffafc7":event.spellId==="froststorm"?"#beeaff":"#e07856",diameter*.62,(event.duration||2)*1000,
        "telegraph",{casterId:event.actorId});
      return;
    }
    // Void 1.0: class-specific dark-violet shadow geometry layered over
    // the existing spell VFX; unrelated Sun Lance/Crystal Bolt remain untouched.
    if((event.type==="identity-proc"&&[
      "void-teleport","metamorphosis-start","metamorphosis-end",
      "entropy-applied","dual-shadow-blades","pact-sacrifice"
    ].includes(event.kind))||(event.type==="evolution-proc"&&[
      "rift-open","rift-tendrils","rift-implosion","rift-swallow","dark-spear",
      "phantom-assault","umbral-cyclone","executioners-veil",
      "marked-fracture","psychic-collapse","contagion","devouring-pact",
      "shadow-ambush","rift-echo","rift-echo-start","veilwalk","veilwalk-dodge",
      "form-blades","dreadblade-arcs","mark-psychic-pulse","mindstorm-spear",
      "soul-devourer","soul-devourer-finale"
    ].includes(event.kind))){
      const actor=match.getActor(event.actorId);
      const target=match.getActor(event.targetId)||actor;
      const x=Number.isFinite(event.x)?event.x:target?.x;
      const y=Number.isFinite(event.y)?event.y:target?.y;
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      const p=new BABYLON.Vector3(x*S,.15,y*S),kind=event.kind;
      const big=["metamorphosis-start","rift-implosion","psychic-collapse",
        "soul-devourer-finale","dark-spear","mindstorm-spear"].includes(kind);
      const color=big?"#e7a4ff":"#a767ea";
      if(["dark-spear","mindstorm-spear"].includes(kind)){
        this.spellFX.sphere(new BABYLON.Vector3(p.x,5.1,p.z),
          "#d3a2ff",big?1.12:.67,550,"fall",{end:new BABYLON.Vector3(p.x,.5,p.z)});
        this.spellFX.ring(p,"#8f52bd",3.3,710,"ground");
      }else if(["void-teleport","rift-echo","shadow-ambush","phantom-assault",
         "executioners-veil"].includes(kind)){
        this.spellFX.ring(p,"#aa6bd8",2.9,650,"ground");
        for(let i=0;i<3;i++)
          this.spellFX.sphere(new BABYLON.Vector3(p.x+(i-1)*.5,1.1+i*.25,p.z),
            "#b787ef",.27,480,"burst");
      }else if(kind==="rift-open"||kind==="rift-tendrils"||kind==="rift-swallow"){
        this.spellFX.ring(p,kind==="rift-open"?"#573277":"#aa62dc",
          kind==="rift-open"?6:4,kind==="rift-open"?3900:650,"ground");
        this.spellFX.sphere(new BABYLON.Vector3(p.x,.6,p.z),
          "#6c299c",kind==="rift-open"?.85:.52,650,"burst");
      }else if(kind==="metamorphosis-start"||kind==="form-blades"||kind==="dreadblade-arcs"){
        this.spellFX.ring(p,"#c786ee",big?5.3:3.2,big?1200:600,"ground");
        for(const side of [-1,1])this.spellFX.sphere(new BABYLON.Vector3(p.x+side*.72,
          1.6,p.z+.22),"#b265f2",big?.74:.39,big?850:430,"burst");
      }else{
        this.spellFX.ring(p,color,big?5.1:2.7,big?820:510,"ground");
        this.spellFX.sphere(new BABYLON.Vector3(p.x,
          kind==="rift-implosion"?.4:1.1,p.z),
          big?"#d29af8":"#8b54c0",big?1.15:.42,big?650:460,"burst");
      }
      return;
    }
    // Solar 1.0 is ADDITIVE: the established Sun Lance windup, traveling
    // projectile, tail and impact remain owned by their original VFX pipeline.
    // These effects are separate named procs layered around those visuals.
    if(event.type==="identity-proc"&&[
      "familiar-summon","familiar-orbit","familiar-shot","soulbrand-ray",
      "tempest-core","ascension-start","ascension-orbit","ascension-beam","precision-execute"
    ].includes(event.kind)&&
      ["cinder-familiar","solar-ascension","chain-tempest"].includes(event.spellId)){
      const source=match.getActor(event.actorId);
      const target=match.getActor(event.targetId)||source;
      if(!source||!target)return;
      const x=source.x*S,z=source.y*S;
      const px=target.x*S,pz=target.y*S;
      if(["familiar-summon","familiar-orbit","ascension-start","ascension-orbit"].includes(event.kind)){
        const big=event.kind==="ascension-start"||event.kind==="ascension-orbit";
        const orbit=new BABYLON.Vector3(x+.75,big?1.45:1.65,z-.56);
        this.spellFX.sphere(orbit,big?"#fff0ae":"#ffe29b",
          big?.43:.35,big?1100:1150,"burst");
        if(big){
          const count=source.solarSigils?.charges||3;
          for(let i=0;i<count;i++){
            const a=(i/3)*Math.PI*2;
            this.spellFX.sphere(new BABYLON.Vector3(x+Math.cos(a)*1.15,1.16,
              z+Math.sin(a)*1.15),"#ffefb0",.25,1000,"burst");
          }
        }
        this.spellFX.ring(new BABYLON.Vector3(x,.12,z),
          big?"#ffc974":"#f0a45c",big?3.6:2.0,big?1500:1000,"ground");
      }else if(["familiar-shot","soulbrand-ray"].includes(event.kind)){
        const start=new BABYLON.Vector3(x+.72,1.8,z-.5);
        this.spellFX.sphere(start,"#ffca6e",.38,410,"projectile",{
          end:new BABYLON.Vector3(px,1.0,pz),spellId:"cinder-familiar"});
        if(event.kind==="soulbrand-ray")
          this.spellFX.ring(new BABYLON.Vector3(px,.16,pz),"#ffc07a",1.5,520,"ground");
      }else if(event.kind==="ascension-beam"){
        const end=new BABYLON.Vector3(px,.48,pz);
        this.spellFX.sphere(new BABYLON.Vector3(px,5.3,pz),
          "#fff7c7",.92,420,"fall",{end});
        this.spellFX.ring(new BABYLON.Vector3(px,.15,pz),"#ffd185",3.4,640,"ground");
      }else if(event.kind==="tempest-core"){
        this.spellFX.sphere(new BABYLON.Vector3(px,1.25,pz),"#fff1b6",.83,480,"burst");
        this.spellFX.ring(new BABYLON.Vector3(px,.15,pz),"#ffc571",2.8,530,"ground");
      }
      return;
    }
    if(event.type==="evolution-proc"&&[
      "corona-volley","thunderhead-cloud","thunderhead","helios-ready",
      "helios-tick","helios-end","judgment-of-dawn","scorching-lance",
      "scorching-death","split-lance","prism-cross","prism-cross-ready",
      "phoenix-dive","phoenix-trail","soulbrand-discharge","dying-star",
      "solar-aftershock","solar-aftershock-ready","burning-ground",
      "tempest-chain","tempest-focus"
    ].includes(event.kind)){
      const source=match.getActor(event.actorId);
      const target=match.getActor(event.targetId)||source;
      const x=Number.isFinite(event.x)?event.x:target?.x;
      const y=Number.isFinite(event.y)?event.y:target?.y;
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      const p=new BABYLON.Vector3(x*S,.14,y*S),kind=event.kind;
      if(kind==="helios-tick")this.drawSolarHelios(event,match);
      if(kind==="helios-end")this.clearSolarHelios(event.actorId);
      if(["judgment-of-dawn","dying-star","solar-aftershock","tempest-focus"].includes(kind)){
        this.spellFX.sphere(new BABYLON.Vector3(p.x,kind==="dying-star"?4.7:5.5,p.z),
          kind==="dying-star"?"#ffffff":"#ffdfa0",
          kind==="dying-star"?1.25:.84,490,"fall",{
            end:new BABYLON.Vector3(p.x,.52,p.z)});
        this.spellFX.ring(p,"#ffdc91",kind==="dying-star"?5.5:4.1,650,"ground");
      }else if(kind==="thunderhead-cloud"){
        this.spellFX.sphere(new BABYLON.Vector3(p.x,3.0,p.z),"#ffe6ac",.73,2200,"burst");
        this.spellFX.ring(p,"#ffd080",2.3,950,"ground");
      }else if(["thunderhead","tempest-chain","soulbrand-discharge"].includes(kind)){
        this.spellFX.sphere(new BABYLON.Vector3(p.x,3.8,p.z),"#fff2cb",
          .48,350,"fall",{end:new BABYLON.Vector3(p.x,.78,p.z)});
        this.spellFX.ring(p,"#f7be73",1.85,460,"ground");
      }else if(kind==="helios-tick"||kind==="helios-end"){
        if(source){
          this.spellFX.sphere(new BABYLON.Vector3(source.x*S,.96,source.y*S),
            "#fff8d5",kind==="helios-tick"?.36:.55,380,"projectile",{
              end:new BABYLON.Vector3(p.x,1,p.z),spellId:"flux-bolt"});
        }
        this.spellFX.ring(p,"#ffe5a6",
          kind==="helios-tick"?2.0:3.0,460,"ground");
      }else if(kind==="phoenix-dive"){
        if(source){
          const start=new BABYLON.Vector3(source.x*S,1.8,source.y*S);
          for(const offset of [-.55,-.27,0,.27,.55]){
            this.spellFX.sphere(new BABYLON.Vector3(start.x+offset,start.y+Math.abs(offset),start.z),
              offset===0?"#fff0b2":"#ff9d56",.36,540,"projectile",{
                end:new BABYLON.Vector3(p.x+offset*.3,.68,p.z),spellId:"cinder-familiar"});
          }
        }
        this.spellFX.ring(p,"#ffb56b",3.7,560,"ground");
      }else if(kind==="corona-volley"||kind==="split-lance"){
        if(source)
          this.spellFX.sphere(new BABYLON.Vector3(source.x*S,1,source.y*S),
            "#ffd77f",.29,430,"projectile",{
              end:new BABYLON.Vector3(p.x,1,p.z),spellId:event.spellId});
        this.spellFX.ring(p,"#fff2b6",1.6,440,"ground");
      }else if(kind==="prism-cross"||kind==="prism-cross-ready"){
        this.spellFX.ring(p,"#ffcf80",kind==="prism-cross"?2.1:4.8,510,"ground");
        this.spellFX.sphere(new BABYLON.Vector3(p.x,.42,p.z),
          "#ffe2a2",.37,400,"burst");
      }else{
        this.spellFX.ring(p,"#ffc775",kind==="burning-ground"?3.8:1.8,
          kind==="burning-ground"?840:530,"ground");
        this.spellFX.sphere(new BABYLON.Vector3(p.x,1,p.z),
          "#ffe3a2",.35,450,"burst");
      }
      return;
    }
    // Eclipse VFX are additive. Do not alter the existing Crystal Bolt
    // build-up, flight/trail or impact path in HeroSpellFX/Pixi.
    if(event.type==="identity-proc"&&
      ["crystal-mirror","avalanche"].includes(event.spellId)){
      const owner=match.getActor(event.actorId);
      const protectedTarget=match.getActor(event.targetId)||owner;
      if(!protectedTarget)return;
      const p=new BABYLON.Vector3(protectedTarget.x*S,.85,protectedTarget.y*S);
      if(event.kind==="mirror-armed"){
        this.spellFX.ring(new BABYLON.Vector3(p.x,.14,p.z),"#b7f4ff",2.8,6800,"ground");
        for(let i=0;i<6;i++){
          const theta=i*Math.PI/3;
          this.spellFX.sphere(new BABYLON.Vector3(
            p.x+Math.cos(theta)*.9,1.2+Math.sin(theta*2)*.25,p.z+Math.sin(theta)*.9),
            i%2?"#d9ffff":"#79d7ff",.24,6800,"burst");
        }
      }else if(event.kind==="mirror-shatter"){
        this.spellFX.ring(new BABYLON.Vector3(p.x,.12,p.z),"#efffff",3.4,640,"ground");
        for(let i=0;i<7;i++){
          const theta=i*Math.PI*2/7;
          this.spellFX.sphere(new BABYLON.Vector3(p.x+Math.cos(theta)*1.0,1.8,
            p.z+Math.sin(theta)*1.0),"#aeecff",.34,510,"burst");
        }
      }else if(event.kind==="mirror-shards"&&owner){
        for(let i=0;i<5;i++)
          this.spellFX.sphere(new BABYLON.Vector3(owner.x*S,.7+i*.15,owner.y*S),
            i%2?"#eaffff":"#83ddff",.24,460,"projectile",{
              end:new BABYLON.Vector3(p.x,1.0,p.z),spellId:"crystal-mirror"});
      }else if(event.kind==="avalanche-launch"){
        this.spellFX.ring(new BABYLON.Vector3(p.x,.13,p.z),"#acdbff",3.5,720,"ground");
      }
      return;
    }
    if(event.type==="evolution-proc"&&[
      "froststorm-start","froststorm-tick","barrage-warning","glacial-barrage",
      "shattering-storm","avalanche-wave","avalanche-track",
      "deep-freeze","conduit-link","crystal-conduit","fracture-chain",
      "riftbreaker","shatterfield"
    ].includes(event.kind)){
      const target=match.getActor(event.targetId)||match.getActor(event.actorId);
      const x=Number.isFinite(event.x)?event.x:target?.x;
      const y=Number.isFinite(event.y)?event.y:target?.y;
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      const p=new BABYLON.Vector3(x*S,.14,y*S);
      const kind=event.kind;
      const heavy=["glacial-barrage","avalanche-wave","deep-freeze","riftbreaker"].includes(kind);
      const pale=heavy?"#d3f6ff":"#7dd6ff";
      if(kind==="froststorm-start"){
        this.spellFX.ring(p,"#8ad9ff",4.7,5400,"ground");
        this.spellFX.ring(new BABYLON.Vector3(p.x,.16,p.z),
          "#b7f5ff",3.0,5100,"ground");
      }else if(kind==="barrage-warning"){
        this.spellFX.ring(p,"#edfaff",1.3,900,"telegraph",{casterId:event.actorId});
      }else if(kind==="glacial-barrage"||kind==="riftbreaker"){
        this.spellFX.sphere(new BABYLON.Vector3(p.x,5.0,p.z),
          "#e2ffff",.91,470,"fall",{end:new BABYLON.Vector3(p.x,.46,p.z)});
        this.spellFX.ring(p,"#9de8ff",2.2,550,"ground");
      }else if(kind==="avalanche-wave"){
        this.spellFX.ring(p,"#9de4ff",3.1,520,"ground");
        for(let i=-2;i<=2;i++){
          const lateral=i*.62;
          this.spellFX.sphere(new BABYLON.Vector3(p.x+lateral,.85+Math.abs(i)*.28,
            p.z+(i%2)*.35),i%2?"#72c8ff":"#ebffff",.48,430,"burst");
        }
      }else if(kind==="deep-freeze"){
        this.spellFX.ring(p,"#a8eeff",2.7,3800,"ground");
        this.spellFX.sphere(new BABYLON.Vector3(p.x,1.3,p.z),
          "#c3efff",1.1,3700,"burst");
      }else if(kind==="conduit-link"||kind==="crystal-conduit"){
        const source=match.getActor(event.actorId);
        this.spellFX.ring(p,"#9dedff",1.55,500,"ground");
        if(source&&source.id!==event.targetId)
          this.spellFX.sphere(new BABYLON.Vector3(source.x*S,1.1,source.y*S),
            "#cefbff",.18,470,"projectile",{
              end:new BABYLON.Vector3(p.x,.95,p.z),spellId:"crystal-snare"});
      }else if(kind==="fracture-chain"){
        this.spellFX.ring(p,"#e7faff",2.0,440,"ground");
        this.spellFX.sphere(new BABYLON.Vector3(p.x,1.1,p.z),
          "#bcf3ff",.42,410,"burst");
      }else{
        this.spellFX.ring(p,pale,kind==="shattering-storm"?3.1:1.6,490,"ground");
        this.spellFX.sphere(new BABYLON.Vector3(p.x,.80,p.z),
          "#c4f4ff",kind==="shattering-storm"?.63:.28,420,"burst");
      }
      return;
    }
    if(event.type==="identity-proc"&&event.spellId==="kinetic-rampart"){
      const actor=match.getActor(event.actorId);
      if(!actor)return;
      const base=new BABYLON.Vector3(actor.x*S,.55,actor.y*S);
      const facing=actor.rampart?.facing||{x:1,y:0};
      const side={x:-facing.y,y:facing.x};
      const tone=event.kind==="rampart-catch"?"#ffe5ee":"#fc7895";
      this.spellFX.ring(new BABYLON.Vector3(base.x,.12,base.z),tone,
        event.kind==="rampart-start"?2.6:3.5,
        event.kind==="rampart-start"?3900:560,"ground");
      for(let i=-2;i<=2;i++){
        const a=i*.38;
        const forward=1.1*Math.cos(a),lateral=1.1*Math.sin(a);
        const x=base.x+(facing.x*forward+side.x*lateral);
        const z=base.z+(facing.y*forward+side.y*lateral);
        this.spellFX.sphere(new BABYLON.Vector3(x,.7+Math.abs(i)*.17,z),
          tone,event.kind==="rampart-start"?.20:.32,
          event.kind==="rampart-start"?3500:570,"burst");
      }
      if(event.kind==="rampart-volley"){
        for(const foe of match.opponents(actor).slice(0,4)){
          this.spellFX.sphere(base,"#ffb8ca",.30,390,"projectile",{
            end:new BABYLON.Vector3(foe.x*S,.78,foe.y*S),
            spellId:"kinetic-rampart"});
        }
      }
      return;
    }
    if(event.type==="identity-proc"){
      const actor=match.getActor(event.actorId);
      const target=match.getActor(event.targetId)||actor;
      const x=Number.isFinite(event.x)?event.x:target?.x;
      const y=Number.isFinite(event.y)?event.y:target?.y;
      if(Number.isFinite(x)&&Number.isFinite(y)){
        const kinetic=["arc-second-strike","counterstrike","dissonance",
          "dissonance-absorbed"].includes(event.kind);
        const vital=ABILITY_BY_ID[event.spellId]?.discipline==="vital";
        const c=vital?"#81f4b9":event.spellId==="phase-slip"?"#bda0f1":
          kinetic?"#f68a9c":"#ffe0a0";
        const p=new BABYLON.Vector3(x*S,.11,y*S);
        const radius=event.kind==="flux-third-hit"?1.9:
          event.kind==="precision-execute"?2.05:
          ["vital-reversal","team-cascade","recall-release","relay-linked"].includes(event.kind)?2.3:1.35;
        this.spellFX.ring(p,c,radius,460,"ground");
        if(event.kind==="flux-third-hit"||event.kind==="precision-execute"||vital)
          this.spellFX.sphere(new BABYLON.Vector3(p.x,.91,p.z),c,
            vital?.49:.32,350,"burst");
        if(vital){
          this.spellFX.ring(new BABYLON.Vector3(p.x,.12,p.z),"#e5fff1",
            radius*.70,570,"ground");
          // Vital Reversal visibly fans healing projectiles FROM the enemy
          // impact toward all wounded friends, even when far apart.
          if(event.kind==="vital-reversal"&&actor&&target){
            for(const ally of match.allies(actor).filter(a=>a.alive&&a.hp<a.maxHp)){
              const start=new BABYLON.Vector3(target.x*S,.95,target.y*S);
              this.spellFX.sphere(start,c,.25,460,"projectile",{
                end:new BABYLON.Vector3(ally.x*S,.9,ally.y*S),
                spellId:"pulse-mend"});
            }
          }
          if(event.kind==="team-cascade"&&actor&&target){
            for(const ally of match.allies(actor).filter(a=>a.alive&&a!==target)){
              this.spellFX.sphere(new BABYLON.Vector3(target.x*S,.9,target.y*S),
                "#b0ffd0",.21,450,"projectile",{
                  end:new BABYLON.Vector3(ally.x*S,.9,ally.y*S),
                  spellId:"vital-cascade"});
            }
          }
        }
        if(event.kind==="dissonance"){
          const source=actor;
          if(source){
            const start=new BABYLON.Vector3(source.x*S,.91,source.y*S);
            this.spellFX.sphere(start,c,.32,320,"projectile",
              {end:new BABYLON.Vector3(p.x,.85,p.z),spellId:"resonance-cut"});
          }
        }
      }
      return;
    }
    if(event.type==="evolution-proc"&&[
      "gravity-impact","uppercut-launch","uppercut-fracture","uppercut-crash",
      "meteor-charge","piercing-charge","countershock","seismic-wave",
      "gravity-well","kinetic-reprisal","kinetic-reprisal-ready","overdrive",
      "warpath","echo-sever","relentless-pursuit"
    ].includes(event.kind)){
      const source=match.getActor(event.actorId);
      const target=match.getActor(event.targetId)||source;
      const px=Number.isFinite(event.x)?event.x:target?.x;
      const py=Number.isFinite(event.y)?event.y:target?.y;
      if(Number.isFinite(px)&&Number.isFinite(py)){
        const p=new BABYLON.Vector3(px*S,.12,py*S);
        const heavy=["gravity-impact","uppercut-crash","meteor-charge","countershock"].includes(event.kind);
        const c=heavy?"#ffc2d1":"#f27c96";
        this.spellFX.ring(p,c,heavy?4.3:event.kind==="seismic-wave"?3.6:2.1,
          heavy?780:540,"ground");
        if(heavy||event.kind==="uppercut-launch"||event.kind==="uppercut-fracture"){
          this.spellFX.sphere(new BABYLON.Vector3(p.x,
            heavy?5.1:event.kind==="uppercut-launch"?.7:3.2,p.z),
            c,heavy?1.05:.65,heavy?470:390,
            heavy?"fall":event.kind==="uppercut-launch"?"burst":"fall",
            heavy?{end:new BABYLON.Vector3(p.x,.45,p.z)}:{end:new BABYLON.Vector3(p.x,.8,p.z)});
        }else{
          this.spellFX.sphere(new BABYLON.Vector3(p.x,1,p.z),
            "#ffadc2",.38,400,"burst");
        }
        if(["kinetic-reprisal-ready","warpath"].includes(event.kind)&&source){
          this.spellFX.ring(new BABYLON.Vector3(source.x*S,.18,source.y*S),
            "#ff5d90",2.9,3300,"ground");
        }
      }
      return;
    }
    if(event.type==="evolution-proc"){
      const target=match.getActor(event.targetId)||match.getActor(event.actorId);
      const px=(Number.isFinite(event.x)?event.x:target?.x),py=(Number.isFinite(event.y)?event.y:target?.y);
      if(Number.isFinite(px)&&Number.isFinite(py)){
        if(event.kind==="zenith-impact"){
          const p=new BABYLON.Vector3(px*S,.12,py*S);
          this.spellFX.sphere(new BABYLON.Vector3(p.x,4.2,p.z),"#ffd18a",.96,440,"fall",
            {end:new BABYLON.Vector3(p.x,.4,p.z)});
          this.spellFX.ring(p,"#ffdd96",4.9,680,"ground");
          this.spellFX.ring(p,"#e7a363",1.45,490,"ground");
          return;
        }
        if(event.kind==="split-lance"){
          const source=match.getActor(event.actorId);
          if(source){
            const start=new BABYLON.Vector3(source.x*S,.93,source.y*S);
            this.spellFX.sphere(start,"#f8c477",.38,370,"projectile",
              {end:new BABYLON.Vector3(px*S,.85,py*S),spellId:event.spellId});
          }
        }
        const {discipline}=ABILITY_BY_ID[event.spellId]||{};
        const colors={solar:"#ffc577",kinetic:"#f27c96",void:"#ba94f4",
          cryo:"#83d9ff",vital:"#8ce6b7"};
        const hex=colors[discipline]||"#b2d9fa";
        const p=new BABYLON.Vector3(px*S,.115,py*S);
        const field=["shatterfield","residual-field"].includes(event.kind);
        const burst=["collapse","crystal-rupture","unstable-prison","last-stand",
          "vital-crescendo","retaliation","life-transfer"].includes(event.kind);
        const secondary=["contagion","glacial-echo","echo-cut","harmonic-thread",
          "harmonic-field","mercy-bloom","rejuvenating-orbit","guardian-network",
          "second-heart","double-cascade"].includes(event.kind);
        const wide=["seismic-wave","solar-aftershock","burning-ground",
          "shock-trail","interrupt-shockwave","prismatic-return",...["shatterfield","residual-field"]].includes(event.kind);
        const setup=String(event.kind).endsWith("-ready")||event.kind==="impact-charge";
        const dim=field?4.5:burst?3.1:
          event.kind==="solar-aftershock"||event.kind==="burning-ground"?
          4.9:wide?3.1:setup?1.1:1.7;
        this.spellFX.ring(p,hex,dim,wide?690:440,"ground");
        if(burst){
          this.spellFX.ring(new BABYLON.Vector3(p.x,.13,p.z),hex,
            dim*.64,520,"ground");
          this.spellFX.sphere(new BABYLON.Vector3(p.x,1.05,p.z),
            hex,.65,390,"burst");
        }else if(!setup&&!field)
          this.spellFX.sphere(new BABYLON.Vector3(p.x,.85,p.z),hex,
            wide?.44:.28,360,"burst");
        if(secondary){
          // Actual secondary hits/linked healing must show a second energy
          // path, not merely an extra combat-text number on another orb.
          const source=match.getActor(event.actorId);
          if(source&&source.id!==event.targetId){
            this.spellFX.sphere(new BABYLON.Vector3(source.x*S,.9,source.y*S),
              hex,.24,390,"projectile",
              {end:new BABYLON.Vector3(p.x,.85,p.z),spellId:event.spellId});
          }
        }
      }
      return;
    }
    if(event.type==="hit"&&event.spellId==="zenith-crash")
      return; // Its one descending pillar comes from zenith-impact, not every AoE hit.
    if(event.type==="resonance-proc"){
      const target=match.getActor(event.targetId)||match.getActor(event.actorId);
      if(target){
        const hex=event.role==="healer"?"#85f0b8":
          event.role==="melee"?"#f58ca0":event.role==="solar"?"#ffcb78":event.role==="void"?"#bc86fa":"#8ecaff";
        const pos=new BABYLON.Vector3(target.x*S,.14,target.y*S);
        this.spellFX.ring(pos,hex,
          event.kind==="wave"?3.1:event.kind==="impact"?1.8:1.25,
          event.kind==="wave"?680:490,"ground");
        if(event.kind!=="wave")
          this.spellFX.sphere(new BABYLON.Vector3(pos.x,.85,pos.z),
            hex,event.kind==="impact"?.43:.24,330,"burst");
      }
      return;
    }
    // Snapshot renderer availability at RELEASE, so a missing/disabled Pixi
    // layer falls back to Babylon rather than making attacks invisible.
    this.spellFX.hero.setPixiProjectilesAvailable(
      !!(this.pixiFX?.ready&&this.pixiFX?.enabled&&!this.pixiFX?.failed));
    this.spellFX.spawn(event,match);
    this.pixiFX?.spawn(event,match);
  }

  clearSolarHelios(actorId){
    const entry=this.solarHeliosBeams.get(actorId);
    if(!entry)return;
    for(const mesh of entry.meshes)mesh.dispose();
    this.solarHeliosBeams.delete(actorId);
  }
  drawSolarHelios(event,match){
    const caster=match.getActor(event.actorId),victim=match.getActor(event.targetId);
    if(!caster?.alive||!victim?.alive)return;
    this.clearSolarHelios(caster.id);
    if(!this.heliosMats){
      this.heliosMats=[
        this.material("solar-helios-glow","#ffb35e","#ffb35e",.30),
        this.material("solar-helios-core","#fff0c1","#fffce7",.97)
      ];
    }
    const path=[new BABYLON.Vector3(caster.x*S,.94,caster.y*S),
      new BABYLON.Vector3(victim.x*S,1.0,victim.y*S)];
    const count=caster.cast?.channelHits||1;
    const width=Math.min(.17,.075+count*.015);
    const meshes=[
      this.tube("solar-helios-halo",path,width*2.2,this.heliosMats[0]),
      this.tube("solar-helios-hot-core",path,width,this.heliosMats[1])
    ];
    this.solarHeliosBeams.set(caster.id,{meshes,until:performance.now()+425});
  }
  syncVoidForms(match,now){
    const active=new Set();
    for(const actor of match.actors){
      if(!actor.alive||!actor.voidForm||actor.voidForm.until<=match.time)continue;
      active.add(actor.id);
      let entry=this.voidFormMeshes.get(actor.id);
      if(!entry){
        const node=new BABYLON.TransformNode("void-form-blades-"+actor.id,this.scene);
        const material=this.material("void-form-blade-mat-"+actor.id,
          "#4d276a","#ac62ee",.93);
        const hilite=this.material("void-form-edge-"+actor.id,
          "#935ac5","#d8a0ff",.95);
        const blades=[];
        for(const side of [-1,1]){
          const blade=BABYLON.MeshBuilder.CreateCylinder(
            "void-curved-blade-"+actor.id+"-"+side,
            {height:1.65,diameterTop:0,diameterBottom:.36,tessellation:4},this.scene);
          blade.parent=node;blade.material=material;blade.isPickable=false;
          blade.position.set(side*.78,.42,side*.17);
          blade.rotation.z=side*.38;blades.push(blade);
          const tip=BABYLON.MeshBuilder.CreateSphere("void-edge-"+actor.id+"-"+side,
            {diameter:.28,segments:5},this.scene);
          tip.parent=node;tip.material=hilite;tip.isPickable=false;
          tip.position.set(side*1.06,1.08,side*.17);blades.push(tip);
        }
        entry={node,material,hilite};
        this.voidFormMeshes.set(actor.id,entry);
      }
      const t=now*.001;
      entry.node.position.set(actor.x*S,1.10+Math.sin(t*4)*.09,actor.y*S);
      entry.node.rotation.y=t*.7;
      const scale=actor.voidForm.evo==="dreadblade-form"?1.4:1;
      entry.node.scaling.setAll(scale);
    }
    for(const [id,entry]of this.voidFormMeshes){
      if(active.has(id))continue;
      entry.node.dispose(false,false);
      entry.material.dispose();entry.hilite.dispose();
      this.voidFormMeshes.delete(id);
    }
  }
  syncSolarVisuals(match,now){
    // Real persistent mesh for a SINGLE familiar per caster. Unlike an NPC,
    // it has no targeting frame, AI actor, collision or body physics.
    const active=new Set();
    for(const actor of match.actors){
      if(!actor.alive||!actor.familiar||actor.familiar.until<=match.time)continue;
      active.add(actor.id);
      let visual=this.solarFamiliars.get(actor.id);
      if(!visual){
        const node=new BABYLON.TransformNode("cinder-mini-sun-"+actor.id,this.scene);
        const surface=this.material("mini-sun-surface-"+actor.id,
          "#f3a34e","#ffc76c");
        const heart=this.material("mini-sun-heart-"+actor.id,
          "#a75b20","#fff1ad");
        const shard=this.material("mini-sun-shards-"+actor.id,
          "#e98436","#ffd794");
        const ball=BABYLON.MeshBuilder.CreateSphere("cinder-sun-core-"+actor.id,
          {diameter:.69,segments:9},this.scene);
        ball.material=surface;ball.parent=node;ball.isPickable=false;
        const inner=BABYLON.MeshBuilder.CreateSphere("cinder-sun-heart-"+actor.id,
          {diameter:.32,segments:7},this.scene);
        inner.material=heart;inner.parent=node;inner.isPickable=false;
        const fragments=Array.from({length:4},(_,i)=>{
          const fragment=BABYLON.MeshBuilder.CreateSphere("cinder-fragment-"+actor.id+"-"+i,
            {diameter:.15,segments:6},this.scene);
          fragment.material=shard;fragment.parent=node;fragment.isPickable=false;
          return fragment;
        });
        visual={node,fragments,materials:[surface,heart,shard]};
        this.solarFamiliars.set(actor.id,visual);
      }
      const locked=actor.familiar.evo==="soulbrand"&&
        match.getActor(actor.familiar.targetId)?.alive?
        match.getActor(actor.familiar.targetId):null;
      const follow=locked||actor;
      const t=now*.001;
      visual.node.position.set(follow.x*S+.79,1.65+Math.sin(t*2.9)*.12,
        follow.y*S-.45);
      visual.node.rotation.y=t*.8;
      const radius=actor.familiar.evo==="phoenix-dive"?.55:.44;
      for(let i=0;i<visual.fragments.length;i++){
        const a=t*1.5+i*Math.PI/2;
        visual.fragments[i].position.set(Math.cos(a)*radius,
          Math.sin(a*1.3)*.16,Math.sin(a)*radius);
      }
      visual.node.scaling.setAll(1+.06*Math.sin(t*4.1));
    }
    for(const [id,v] of this.solarFamiliars){
      if(active.has(id))continue;
      v.node.dispose(false,false);
      for(const mat of v.materials)mat.dispose();
      this.solarFamiliars.delete(id);
    }
    for(const [id,v] of this.solarHeliosBeams)
      if(v.until<now||!match.getActor(id)?.cast?.heliosBeam)
        this.clearSolarHelios(id);
  }
  render(match){
    const now=performance.now();
    if(this.defenseMode&&match.player?.alive){
      const dt=this.lastFollowAt?Math.min(.1,(now-this.lastFollowAt)/1000):0;
      this.lastFollowAt=now;
      this.cameraFocus=advanceDefenseCamera(this.cameraFocus,match.player,dt,this.arena);
      this.camera.target.set(this.cameraFocus.x*S,0,this.cameraFocus.y*S+.6);
    }
    this.activeActors=match.actors;
    // Five waves create twenty enemies. Keep dead actors for reports, but
    // remove their mesh entries immediately to avoid a growing Babylon scene.
    const display=this.defenseMode?
      {actors:match.actors.filter(a=>a.alive),player:match.player}:match;
    const orbs=this.defenseMode?
      {...display,actors:display.actors.filter(a=>!(a.team==="enemy"&&a.encounterKey))}:display;
    // Never draw a player-shaped orb on top of a Rift creature.
    this.actorRender.sync(orbs,now);
    this.orbPolish.sync(orbs,now);
    this.riftActors?.sync(display.actors,now);
    // The targeting/LOS indicators still use ALL living actors, including
    // new Rift meshes, so combat interaction behaves exactly as before.
    this.markers.sync(display,now);
    this.updateIdentificationMarkers(match,now);
    // Planet Defense finale: a visible rotating double halo marks the Rift
    // Warden as the wave boss without modifying the shared 3v3 orb renderer.
    const boss=this.defenseMode?
      match.actors.find(a=>a.boss&&a.alive):null;
    if(boss&&!this.defenseBossRings){
      const ringMat=this.material("defense-boss-ring","#b98be9","#bb7aff");
      const edgeMat=this.material("defense-boss-edge","#66559a","#9265d9");
      this.defenseBossRings=[
        BABYLON.MeshBuilder.CreateTorus("defense-boss-halo-inner",
          {diameter:2.3,thickness:.055,tessellation:52},this.scene),
        BABYLON.MeshBuilder.CreateTorus("defense-boss-halo-outer",
          {diameter:2.95,thickness:.024,tessellation:52},this.scene)
      ];
      this.defenseBossRings[0].material=ringMat;
      this.defenseBossRings[1].material=edgeMat;
      for(const ring of this.defenseBossRings)ring.isPickable=false;
    }
    for(const [index,ring] of (this.defenseBossRings||[]).entries()){
      ring.setEnabled(Boolean(boss));
      if(boss){
        ring.position.set(boss.x*S,.12+index*.023,boss.y*S);
        ring.rotation.y=(now*.00037)*(index===0?1:-1);
      }
    }
    this.spellFX.update(match,now);
    this.eclipseVFX?.update(match,now);
    this.solarVFX?.update(match,now);
    this.syncSolarVisuals(match,now);
    this.syncVoidForms(match,now);
    this.riftWorld?.update(match,now);
    this.scene.render();
    this.pixiFX?.update(match,now);
  }
  dispose(){
    for(const id of this.solarHeliosBeams.keys())this.clearSolarHelios(id);
    for(const entry of this.voidFormMeshes.values()){
      entry.node.dispose(false,false);entry.material.dispose();entry.hilite.dispose();
    }
    this.voidFormMeshes.clear();
    for(const visual of this.solarFamiliars.values()){
      visual.node.dispose(false,false);
      for(const mat of visual.materials)mat.dispose();
    }
    this.solarFamiliars.clear();
    if(this.heliosMats)for(const mat of this.heliosMats)mat.dispose();
    this.observer?.disconnect();
    window.removeEventListener("resize",this.resize);
    this.pixiFX?.dispose();
    this.spellFX?.dispose();
    this.eclipseVFX?.dispose();
    this.solarVFX?.dispose();
    this.markers?.dispose();
    this.orbPolish?.dispose();
    this.riftActors?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}