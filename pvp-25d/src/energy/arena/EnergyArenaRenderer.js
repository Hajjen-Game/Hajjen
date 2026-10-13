// Separate Energy Arena renderer. Reuses the production glass orb meshes and
// floor target rings without changing the existing BabylonRenderer / Pixi game.
import { OrbCharacterRenderer } from "../../rendering/babylon/OrbCharacterRenderer.js?v=20261008-orbs-v21-vfx-polish";
import { OrbGroundMarkers } from "../../rendering/babylon/OrbGroundMarkers.js?v=20261008-ground-rings6-contained";
import { EnergyOrbPolish } from "./EnergyOrbPolish.js?v=20261009-hub-orbit29";
import { EnergySpellVFX } from "./EnergySpellVFX.js?v=20261013-rift12";
import { EnergyPixiVFXOverlay } from "./EnergyPixiVFXOverlay.js?v=20261009-side-swing20";
import { EnergyRiftActorRenderer } from "./EnergyRiftActorRenderer.js?v=20261011-riftcombat2";
import { createRiftEnvironment } from "./EnergyRiftEnvironment.js?v=20261013-rift12b";
import { ABILITY_BY_ID } from "../abilityCatalog.js?v=20261012-eclipse-oc1";

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
    this.createScene();
    this.spellFX=new EnergySpellVFX(this.scene);
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
  spawnEffect(event,match){
    this.riftActors?.notify(event,match);
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
    if(event.type==="ground-telegraph"&&event.spellId==="zenith-crash"){
      const center=new BABYLON.Vector3(event.x*S,.10,event.y*S);
      const diameter=(event.radius||124)*S*2;
      // Friendly pillars look Solar-gold; enemy danger zones look hostile red.
      const hostile=match.getActor(event.actorId)?.team==="enemy";
      this.spellFX.ring(center,hostile?"#f16f88":"#ffc780",
        diameter,(event.duration||2)*1000,"telegraph",{casterId:event.actorId});
      this.spellFX.ring(new BABYLON.Vector3(center.x,.105,center.z),
        hostile?"#aa3d64":"#e07856",diameter*.62,(event.duration||2)*1000,
        "telegraph",{casterId:event.actorId});
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
        const c=event.spellId==="phase-slip"?"#bda0f1":
          kinetic?"#f68a9c":"#ffe0a0";
        const p=new BABYLON.Vector3(x*S,.11,y*S);
        const radius=event.kind==="flux-third-hit"?1.9:
          event.kind==="precision-execute"?2.05:1.35;
        this.spellFX.ring(p,c,radius,460,"ground");
        if(event.kind==="flux-third-hit"||event.kind==="precision-execute")
          this.spellFX.sphere(new BABYLON.Vector3(p.x,.91,p.z),c,
            .32,350,"burst");
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
        const burst=["collapse","crystal-rupture","unstable-prison"].includes(event.kind);
        const secondary=["contagion","glacial-echo","echo-cut","harmonic-thread",
          "harmonic-field"].includes(event.kind);
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
          event.role==="melee"?"#f58ca0":"#8ecaff";
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
    this.riftWorld?.update(match,now);
    this.scene.render();
    this.pixiFX?.update(match,now);
  }
  dispose(){
    this.observer?.disconnect();
    window.removeEventListener("resize",this.resize);
    this.pixiFX?.dispose();
    this.spellFX?.dispose();
    this.markers?.dispose();
    this.orbPolish?.dispose();
    this.riftActors?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}