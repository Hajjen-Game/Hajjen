// Visual Combat Slice v1: authored, weaponless energy-orb signatures.
// Deliberately independent of WoW/Pixi class spell IDs and of the legacy arena.
// Babylon renders volumes *inside* the glass, physical energy arcs, projectiles
// and suspended persistent shields. The later Pixi pass can add sharp 2D accents.
import { ABILITY_BY_ID } from "../abilityCatalog.js";

const TAU=Math.PI*2;
const S=.02;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
const CHOSEN=new Set([
  "crystal-bolt","sun-lance","null-prison","rift-slash",
  "gravity-hammer","pulse-mend","photon-barrier","reactive-thread",
]);
const COLOR={
  "crystal-bolt":["#70d9fd","#e9fbff","#277cb7"],
  "sun-lance":["#ffb761","#fff4b7","#f07351"],
  "null-prison":["#b88afb","#f1d6ff","#5f4ca6"],
  "rift-slash":["#b07afb","#efd8ff","#4d2c8a"],
  "gravity-hammer":["#f0788d","#ffdcc3","#a43c62"],
  "pulse-mend":["#63edc5","#e6fff0","#2b9da4"],
  "photon-barrier":["#ffca7b","#fff3bd","#c66f57"],
  "reactive-thread":["#73ebbc","#d5fff3","#359bba"],
};
const rgb=hex=>BABYLON.Color3.FromHexString(hex);

export class EnergyHeroVFX {
  constructor(scene){
    this.scene=scene;
    this.live=[];
    this.materials=new Map();
    this.sequence=0;
    this.maxLive=76;  // no unbounded GPU objects in longer matches
    this.stats={lastSpell:"",active:0};
  }
  supports(id){return CHOSEN.has(id);}
  material(hex,alpha=1,emission=1.05){
    const key=hex+":"+alpha+":"+emission;
    if(this.materials.has(key))return this.materials.get(key);
    const m=new BABYLON.StandardMaterial("energy-hero-mat:"+key,this.scene);
    const c=rgb(hex);
    m.diffuseColor=c.scale(.13);m.emissiveColor=c.scale(emission);
    m.specularColor=BABYLON.Color3.Black();
    m.alpha=alpha;m.disableLighting=true;
    m.backFaceCulling=false;m.disableDepthWrite=true;m.needDepthPrePass=false;
    if(alpha<1&&BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
      m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    this.materials.set(key,m);return m;
  }
  world(actor,y=.88){return new BABYLON.Vector3(actor.x*S,y,actor.y*S);}
  makeEffect(spellId,type,position,duration,options={}){
    const root=new BABYLON.TransformNode("hero-fx-root:"+this.sequence++,this.scene);
    root.position.copyFrom(position);
    const effect={spellId,type,root,meshes:[],start:performance.now(),
      duration, ...options};
    this.live.push(effect);
    while(this.live.length>this.maxLive)this.destroy(this.live.shift());
    this.stats.lastSpell=spellId;
    return effect;
  }
  bind(fx,mesh,slot="main",i=0){
    mesh.parent=fx.root;
    mesh.material=this.material(COLOR[fx.spellId]?.[slot==="light"?1:slot==="dark"?2:0]||"#99e7ff",
      slot==="ghost"?.19:slot==="soft"?.33:slot==="light"?.99:.85,
      slot==="light"?1.65:slot==="dark"?.65:1.17);
    mesh.isPickable=false;
    // Keep real world depth, including occlusion by pillars.
    fx.meshes.push({mesh,slot,i,base:mesh.position.clone()});
    return mesh;
  }
  ball(fx,diameter,slot="main",i=0,position){
    const mesh=BABYLON.MeshBuilder.CreateSphere("hero-ball:"+this.sequence++,{
      diameter,segments:slot==="light"?16:12,
    },this.scene);
    if(position)mesh.position.copyFrom(position);
    return this.bind(fx,mesh,slot,i);
  }
  torus(fx,diameter,thickness,slot="main",i=0,position){
    const mesh=BABYLON.MeshBuilder.CreateTorus("hero-orbit:"+this.sequence++,{
      diameter,thickness,tessellation:60,
    },this.scene);
    if(position)mesh.position.copyFrom(position);
    return this.bind(fx,mesh,slot,i);
  }
  cone(fx,radius,height,tessellation=6,slot="main",i=0){
    const mesh=BABYLON.MeshBuilder.CreateCylinder("hero-facet:"+this.sequence++,{
      diameterTop:0,diameterBottom:radius*2,height,
      tessellation,subdivisions:1,
    },this.scene);
    return this.bind(fx,mesh,slot,i);
  }
  tube(fx,points,radius,slot="main",i=0){
    const mesh=BABYLON.MeshBuilder.CreateTube("hero-filament:"+this.sequence++,{
      path:points,radius,tessellation:8,cap:BABYLON.Mesh.CAP_ROUND,
    },this.scene);
    return this.bind(fx,mesh,slot,i);
  }
  arc(fx,radius,span,start,y,thickness,slot="main",i=0){
    const points=[];
    for(let j=0;j<=24;j++){
      const a=start+span*j/24;
      points.push(new BABYLON.Vector3(Math.cos(a)*radius,y,Math.sin(a)*radius));
    }
    return this.tube(fx,points,thickness,slot,i);
  }
  // Every school has a DIFFERENT build-up silhouette and movement pattern.
  windup(spellId,actor,target,castDuration){
    const isCast=castDuration>0;
    const life=isCast?Math.min(3000,castDuration*1000):390;
    const fx=this.makeEffect(spellId,"charge",this.world(actor),life,{
      actorId:actor.id,progressive:isCast,
    });
    if(spellId==="crystal-bolt"){
      for(let i=0;i<5;i++){
        const shard=this.cone(fx,.085+i*.008,.38+i*.055,4,"main",i);
        shard.rotation.z=Math.PI*.5;
      }
      for(let i=0;i<2;i++){
        const ring=this.torus(fx,.7+i*.26,.021,i?"soft":"light",i);
        ring.rotation.x=.45+i*.9;
      }
    }else if(spellId==="sun-lance"){
      this.ball(fx,.31,"light");
      for(let i=0;i<3;i++){
        const ring=this.torus(fx,.65+i*.27,.032,i===1?"light":"main",i);
        ring.rotation.x=.65+i*.55;
      }
      for(let i=0;i<6;i++)this.cone(fx,.055,.39,5,i%2?"light":"main",i);
    }else if(spellId==="null-prison"){
      for(let i=0;i<3;i++){
        const ring=this.torus(fx,.72+i*.15,.03,i===1?"light":"main",i);
        ring.rotation.x=Math.PI/2;
      }
      for(let i=0;i<6;i++)this.ball(fx,.086,i%2?"light":"main",i);
    }else if(spellId==="rift-slash"){
      for(let i=0;i<3;i++){
        this.arc(fx,.53+i*.12,Math.PI*1.15,i*.9,0,.055,
          i===0?"light":"main",i);
      }
      this.cone(fx,.18,.6,5,"dark",0);
    }else if(spellId==="gravity-hammer"){
      for(let i=0;i<3;i++){
        const ring=this.torus(fx,.42+i*.20,.045,i===0?"light":"main",i);
        ring.rotation.x=Math.PI*.4;
      }
      this.ball(fx,.23,"light");
      if(target){
        const preview=this.makeEffect(spellId,"warning",
          this.world(target,.085),life,{targetId:target.id});
        this.torus(preview,1.55,.065,"main");
        this.arc(preview,.96,Math.PI*1.2,-Math.PI*.7,.012,.045,"light");
      }
    }else if(spellId==="pulse-mend"){
      for(let i=0;i<4;i++)this.arc(fx,.33+i*.085,Math.PI*1.5,i*1.1,0,.026,
        i%2?"main":"light",i);
      this.ball(fx,.22,"light");
    }else if(spellId==="photon-barrier"){
      this.ball(fx,.4,"light");
      for(let i=0;i<3;i++){
        const ring=this.torus(fx,.64+i*.23,.023,i===0?"light":"main",i);
        ring.rotation.x=.33+i*.65;
      }
    }else if(spellId==="reactive-thread"){
      for(let i=0;i<4;i++)this.arc(fx,.38+i*.04,TAU*.62,i*TAU/4,.02,.025,
        i%2?"light":"main",i);
      this.ball(fx,.16,"light");
    }
    return fx;
  }
  // All attack projectiles have launch/travel/contact instead of spawning
  // generic flash particles directly on an already-hit target.
  projectile(spellId,source,target){
    const start=this.world(source,.88),end=this.world(target,.88);
    const far=BABYLON.Vector3.Distance(start,end);
    const duration=clamp(235+far*18,255,490);
    const fx=this.makeEffect(spellId,"projectile",start,duration,{
      targetId:target.id,sourceId:source.id,origin:start.clone(),destination:end.clone(),
    });
    if(spellId==="crystal-bolt"){
      const crystal=this.cone(fx,.22,.88,5,"main",0);
      crystal.position.y=.04;
      const tip=this.cone(fx,.12,.68,5,"light",1);
      tip.position.y=.15;
      for(let i=0;i<3;i++)this.ball(fx,.1,"light",i,
        new BABYLON.Vector3(Math.cos(i*TAU/3)*.18,-.3,Math.sin(i*TAU/3)*.18));
    }else{
      const spine=this.cone(fx,.22,1.35,5,"main",0);
      const core=this.cone(fx,.085,1.72,5,"light",1);
      core.position.y=.1;
      this.torus(fx,.42,.042,"light",2).position.y=-.15;
      for(let i=0;i<3;i++)this.ball(fx,.095,"main",i,
        new BABYLON.Vector3(.20*Math.cos(i*TAU/3),-.50,.20*Math.sin(i*TAU/3)));
    }
    return fx;
  }
  // Rift Slash is a blade-free dimensional tear that races THROUGH the target.
  // It has directional travel and a secondary crossing fracture on contact.
  melee(spellId,source,target){
    const origin=this.world(source,.88),destination=this.world(target,.88);
    const fx=this.makeEffect(spellId,"rift-drive",origin,470,{
      origin:origin.clone(),destination:destination.clone(),sourceId:source.id,
      targetId:target.id,ripTriggered:false,
    });
    for(let i=0;i<4;i++){
      const path=[];
      for(let j=0;j<=32;j++){
        const t=j/32,a=-1.27+t*2.54+(i-1.5)*.13;
        path.push(new BABYLON.Vector3(
          Math.sin(a)*(1.12-i*.09),Math.cos(a)*(.73-i*.07)+(i-1.5)*.11,
          Math.sin(a*1.6)*(.14+i*.055)
        ));
      }
      this.tube(fx,path,i===0?.088:i===1?.055:.033,
        i===1?"light":i===3?"dark":"main",i);
    }
    // The bright gap between two dark facets sells a rip in space, not a sword.
    for(let i=0;i<4;i++){
      const shard=this.cone(fx,.11,.48+i*.14,4,i%2?"light":"main",i+4);
      shard.rotation.z=Math.PI/2+i*.35;
      shard.position.set((i-1.5)*.20,(i%2?1:-1)*.21,.03);
    }
    return fx;
  }
  riftContact(point){
    const fx=this.makeEffect("rift-slash","rift-impact",point.clone(),730);
    this.ball(fx,.68,"light");
    for(let i=0;i<3;i++){
      const path=[];
      for(let j=0;j<=25;j++){
        const a=-1.18+j*2.36/25+i*.26;
        path.push(new BABYLON.Vector3(
          Math.sin(a)*(1.40-i*.12),Math.cos(a)*(.83-i*.05),
          (i-1)*.19+Math.sin(a*1.8)*.12,
        ));
      }
      this.tube(fx,path,i===0?.075:i===1?.045:.028,
        i===1?"light":i===2?"dark":"main",i);
    }
    for(let i=0;i<8;i++){
      const a=i*TAU/8;
      const start=.26,end=.74+(i%3)*.15;
      this.tube(fx,[
        new BABYLON.Vector3(Math.cos(a)*start,Math.sin(a)*start*.8,0),
        new BABYLON.Vector3(Math.cos(a)*end,Math.sin(a)*end*.84,.2*(i%2?1:-1)),
      ],i%3===0?.037:.023,i%3===0?"light":"main",i+3);
    }
    const floor=this.makeEffect("rift-slash","shock",new BABYLON.Vector3(
      point.x,.08,point.z),590);
    this.torus(floor,1.42,.065,"main");
    return fx;
  }
  hammer(source,target){
    const fx=this.makeEffect("gravity-hammer","hammer",
      this.world(target,3.55),590,{
        destination:this.world(target,.88),targetId:target.id,
        impactTriggered:false,
      });
    const head=this.cone(fx,.75,1.80,6,"main");
    head.rotation.x=Math.PI;
    const core=this.cone(fx,.32,1.89,6,"light",1);
    core.rotation.x=Math.PI;
    const collar=this.torus(fx,1.03,.085,"main",2);
    collar.rotation.x=.39;
    for(let i=0;i<6;i++){
      const a=i*TAU/6;
      const shard=this.cone(fx,.08,.38,4,i%2?"light":"main",i+3);
      shard.position.set(Math.cos(a)*.48,-.22,Math.sin(a)*.48);
    }
    // Ground fracture waits until the descending energy physically contacts.
    return fx;
  }
  gravityContact(target){
    const ground=this.world(target,.085);
    const shock=this.makeEffect("gravity-hammer","gravity-impact",ground,880,{
      targetId:target.id,
    });
    this.ball(shock,.95,"light");
    for(let i=0;i<3;i++){
      const ring=this.torus(shock,1.15+i*.48,i===0?.10:.054,
        i===0?"light":i===2?"dark":"main",i);
      ring.position.y=.035+i*.012;
    }
    // Twelve asymmetrical ground cracks, spreading out from actual contact.
    for(let i=0;i<12;i++){
      const a=i*TAU/12+.14*(i%3),len=1.05+(i%4)*.22;
      const path=[
        new BABYLON.Vector3(Math.cos(a)*.37,.04,Math.sin(a)*.37),
        new BABYLON.Vector3(Math.cos(a+.10)*len*.64,.035,Math.sin(a+.10)*len*.64),
        new BABYLON.Vector3(Math.cos(a-.09)*len,.027,Math.sin(a-.09)*len),
      ];
      this.tube(shock,path,i%3===0?.055:.033,i%4===0?"light":"main",i);
    }
    for(let i=0;i<7;i++){
      const a=i*TAU/7;
      const chip=this.cone(shock,.08+(i%3)*.025,.42+(i%4)*.13,5,
        i%3===0?"light":"main",i+14);
      chip.position.set(Math.cos(a)*.65,.35,Math.sin(a)*.65);
      chip.rotation.z=.55+i*.17;
    }
    const flash=this.makeEffect("gravity-hammer","gravity-flash",
      this.world(target,.9),520,{targetId:target.id});
    this.ball(flash,1.19,"light");
    this.torus(flash,1.95,.094,"main").rotation.x=.48;
    return shock;
  }
  // Patient receives layered energy ribbons with an emphasized landing.
  mend(spellId,source,target){
    const src=this.world(source),end=this.world(target);
    const fx=this.makeEffect(spellId,"mend",src,500,{
      origin:src.clone(),destination:end.clone(),sourceId:source.id,targetId:target.id,
    });
    for(let i=0;i<3;i++){
      this.ball(fx,.22-i*.04,i===0?"light":"main",i);
    }
    const landing=this.makeEffect(spellId,"mend-landing",end,680,{targetId:target.id,delay:330});
    this.torus(landing,1.0,.048,"light",0);
    this.torus(landing,1.36,.026,"main",1);
    this.ball(landing,.34,"light");
  }
  prison(target,source){
    const fx=this.makeEffect("null-prison","prison",this.world(target),4100,{targetId:target.id});
    const radius=.86,height=1.62,edges=6;
    for(let i=0;i<edges;i++){
      const a=i*TAU/edges;
      const x=radius*Math.cos(a),z=radius*Math.sin(a);
      this.tube(fx,[new BABYLON.Vector3(x,-height*.5,z),
        new BABYLON.Vector3(x,height*.5,z)],.035,i%2?"main":"light",i);
      this.ball(fx,.135,"light",i,new BABYLON.Vector3(x,height*.5,z));
    }
    for(let i=0;i<3;i++){
      const ring=this.torus(fx,radius*2,.043,i===1?"light":"main",i);
      ring.position.y=(i-1)*height*.42;
    }
    this.ball(fx,.32,"dark");
    return fx;
  }
  barrier(target){
    const fx=this.makeEffect("photon-barrier","barrier",
      this.world(target),5050,{targetId:target.id});
    const shell=this.ball(fx,2.04,"ghost",0);
    shell.visibility=.30;
    for(let i=0;i<3;i++){
      const ring=this.torus(fx,1.88+i*.06,.036,i===0?"light":"main",i);
      ring.rotation.x=i*.82;
    }
    for(let i=0;i<5;i++)this.ball(fx,.08,"light",i);
    return fx;
  }
  thread(target){
    // One persistent thread per target; refreshing should replace, not stack.
    for(let i=this.live.length-1;i>=0;i--){
      const f=this.live[i];
      if(f.type==="thread"&&f.targetId===target.id){
        this.destroy(f);this.live.splice(i,1);
      }
    }
    const fx=this.makeEffect("reactive-thread","thread",
      this.world(target),10000,{targetId:target.id});
    for(let i=0;i<4;i++){
      const arc=this.arc(fx,.62+(i%2)*.12,Math.PI*1.14,i*TAU/4,.0,.023,
        i===0?"light":"main",i);
      arc.rotation.x=i*.28;
    }
    for(let i=0;i<4;i++)this.ball(fx,.087,"light",i);
    return fx;
  }
  spawn(event,match){
    const spellId=event.spellId;
    if(!this.supports(spellId))return false;
    const source=match.getActor(event.actorId);
    const target=match.getActor(event.targetId);
    if(!source)return true;
    if(event.type==="windup"){
      const durations={
        "crystal-bolt":1.3,"sun-lance":1.8,"null-prison":1.4,
        "pulse-mend":1.5,"gravity-hammer":.6,
      };
      this.windup(spellId,source,target,durations[spellId]||0);
      return true;
    }
    if(event.type==="hit"){
      if(!target)return true;
      if(spellId==="sun-lance"||spellId==="crystal-bolt")this.projectile(spellId,source,target);
      else if(spellId==="rift-slash")this.melee(spellId,source,target);
      else if(spellId==="gravity-hammer")this.hammer(source,target);
      return true;
    }
    if(event.type==="control"&&spellId==="null-prison"){
      if(target)this.prison(target,source);
      return true;
    }
    if(event.type==="shield"&&spellId==="photon-barrier"){
      if(target)this.barrier(target);
      return true;
    }
    if(event.type==="heal"&&spellId==="pulse-mend"){
      if(target&&source)this.mend(spellId,source,target);
      return true;
    }
    if(event.type==="heal"&&spellId==="reactive-thread"){
      if(target){
        const pulse=this.makeEffect(spellId,"pulse",this.world(target),500,{targetId:target.id});
        this.torus(pulse,1.05,.065,"light");
        this.ball(pulse,.34,"main",1);
      }
      return true;
    }
    if(event.type==="ability"&&spellId==="reactive-thread"){
      if(target)this.thread(target);
      return true;
    }
    // Do not let the generic VFX spawn duplicates of these hero spells.
    return true;
  }
  impact(fx,target){
    const spellId=fx.spellId;
    const point=target?.alive?this.world(target):fx.root.position.clone();
    const crystalline=spellId==="crystal-bolt";
    const splash=this.makeEffect(spellId,
      crystalline?"crystal-impact":"solar-impact",point,crystalline?810:760,
      {targetId:fx.targetId});
    this.ball(splash,crystalline?.92:1.13,"light");
    this.ball(splash,crystalline?1.45:1.75,"soft");
    if(crystalline){
      // Faceted splinters project outward at different heights; cold cracks
      // and polygon shockrings give a very different silhouette from Solar.
      for(let i=0;i<12;i++){
        const a=i*TAU/12,rr=.40+(i%4)*.11;
        const splinter=this.cone(splash,.095+(i%3)*.017,.67+(i%4)*.17,4,
          i%3===0?"light":"main",i);
        splinter.position.set(Math.cos(a)*rr,(i%3-1)*.19,
          Math.sin(a)*rr);
        splinter.rotation.z=Math.PI*.45+a*.22;
        splinter.rotation.y=a;
      }
      for(let i=0;i<7;i++){
        const a=(i+.23)*TAU/7;
        this.tube(splash,[
          new BABYLON.Vector3(0,-.72,0),
          new BABYLON.Vector3(Math.cos(a)*(.55+i%3*.14),-.74,
            Math.sin(a)*(.55+i%3*.14)),
          new BABYLON.Vector3(Math.cos(a+.15)*(1.15+i%2*.21),-.75,
            Math.sin(a+.15)*(1.15+i%2*.21)),
        ],i%3===0?.049:.032,i%2?"light":"main",i+13);
      }
      for(let i=0;i<2;i++){
        const ring=this.torus(splash,1.35+i*.45,.063,
          i===0?"light":"main",i+20);
        ring.position.y=-.68;
        ring.rotation.y=i*.45;
      }
    }else{
      // A focused, piercing star: directional radiant spokes + hot corona,
      // much brighter and longer-lived than the original generic flash.
      const main=this.torus(splash,1.48,.084,"light",0);
      main.rotation.x=.54;
      const second=this.torus(splash,2.06,.052,"main",1);
      second.rotation.x=-.55;
      for(let i=0;i<12;i++){
        const a=i*TAU/12,len=1.16+(i%3)*.31;
        this.tube(splash,[
          new BABYLON.Vector3(Math.cos(a)*.27,Math.sin(a)*.18,0),
          new BABYLON.Vector3(Math.cos(a)*len,
            Math.sin(a)*len*.88,(i%2?-.22:.22)),
        ],i%3===0?.064:.034,i%3===0?"light":"main",i+2);
      }
      for(let i=0;i<5;i++){
        const a=i*TAU/5;
        const dart=this.cone(splash,.1,.72,5,i%2?"light":"main",i+17);
        dart.position.set(Math.cos(a)*.82,Math.sin(a)*.64,.12);
        dart.rotation.z=a-Math.PI/2;
      }
    }
  }
  update(match,now=performance.now()){
    for(let i=this.live.length-1;i>=0;i--){
      const fx=this.live[i],t=clamp((now-fx.start)/fx.duration,0,1);
      const actor=fx.actorId&&match.getActor(fx.actorId);
      const target=fx.targetId&&match.getActor(fx.targetId);
      if(t>=1){
        if(fx.type==="projectile")this.impact(fx);
        this.destroy(fx);this.live.splice(i,1);
        continue;
      }
      if(actor&&fx.type==="charge")fx.root.position.copyFrom(this.world(actor));
      if(target&&["prison","barrier","thread","pulse","mend-landing"].includes(fx.type))
        fx.root.position.copyFrom(this.world(target));
      if(fx.type==="prison"&&target&&!target.statuses?.some(s=>s.kind==="incapacitate")&&t>.10){
        this.destroy(fx);this.live.splice(i,1);continue;
      }
      if(fx.type==="barrier"&&target&&!target.statuses?.some(s=>s.kind==="shield")&&t>.12){
        this.destroy(fx);this.live.splice(i,1);continue;
      }
      if(fx.type==="thread"&&target&&!target.statuses?.some(s=>s.kind==="reactive-thread")&&t>.10){
        this.destroy(fx);this.live.splice(i,1);continue;
      }
      if(fx.type==="projectile"){
        const end=target?.alive?this.world(target):fx.destination;
        const travel=smooth(t);
        fx.root.position.copyFrom(BABYLON.Vector3.Lerp(fx.origin,end,travel));
        const diff=end.subtract(fx.origin).normalize();
        fx.root.rotation.x=Math.PI/2;
        // align conical axis (+Y) with travel in the XZ plane
        fx.root.rotation.z=-Math.atan2(diff.x,diff.z);
      }
      if(fx.type==="mend"){
        const end=target?.alive?this.world(target):fx.destination;
        fx.root.position.copyFrom(BABYLON.Vector3.Lerp(fx.origin,end,smooth(t)));
      }
      if(fx.type==="hammer")
        fx.root.position.y=3.55-2.67*smooth(t);
      for(const {mesh,slot,i:idx,base} of fx.meshes){
        let alpha=1;
        if(fx.type==="charge"){
          const pressure=smooth(t),angle=now*.001*(1+idx*.25)+idx*TAU/6;
          if(mesh.name.includes("hero-facet")||mesh.name.includes("hero-ball")&&idx>0){
            const radius=fx.spellId==="sun-lance"?.36*(1-pressure*.7):.35*(1-pressure*.8);
            mesh.position.set(Math.cos(angle)*radius,Math.sin(angle*1.1)*.17,
              Math.sin(angle)*radius);
            mesh.rotation.z=angle*1.1;
          }else {
            mesh.rotation.y=angle;
            mesh.rotation.x=.35*Math.sin(angle);
          }
          mesh.scaling.setAll(.64+pressure*.82);
          alpha=.68+pressure*.32;
        }else if(fx.type==="projectile"){
          mesh.rotation.y=now*.003*(idx%2?1:-1);
          mesh.scaling.setAll(1+.2*Math.sin(t*12+idx));
          alpha=clamp((1-t)*4,0,1);
        }else if(fx.type==="prison"){
          const rise=smooth(t/.11),sag=1-.03*Math.sin(now*.002+idx);
          mesh.scaling.setAll((.65+.35*rise)*sag);
          mesh.rotation.y=now*.0003*(idx%2?1:-1);
          alpha=Math.min(1,t/.11,(1-t)*8);
        }else if(fx.type==="barrier"){
          mesh.rotation.x=idx*.22+now*.00027*(idx%2?1:-1);
          mesh.rotation.y=idx*.44+now*.00036;
          mesh.scaling.setAll(1+.04*Math.sin(now*.004+idx));
          alpha=Math.min(1,t/.10,(1-t)*9);
        }else if(fx.type==="thread"){
          mesh.rotation.x=idx*.34+now*.0004*(idx%2?1:-1);
          mesh.rotation.y=idx*.77+now*.00055*(idx%2?1:-1);
          alpha=Math.min(1,t/.12,(1-t)*9);
        }else if(fx.type==="melee"){
          mesh.rotation.y=-.75+t*2.4+idx*.16;
          mesh.scaling.setAll(.57+t*.85);
          alpha=(1-t)*1.2;
        }else if(fx.type==="shock"||fx.type==="impact"){
          mesh.scaling.setAll(.52+t*2.0);
          alpha=(1-t)*.94;
        }else if(fx.type==="hammer"){
          mesh.rotation.y=now*.0013+idx;
          mesh.scaling.setAll(1+.08*Math.sin(t*12+idx));
          alpha=t>.75?(1-t)*4:1;
        }else if(fx.type==="mend"){
          const a=t*TAU*3+idx*TAU/3;
          mesh.position.set(Math.cos(a)*.19,Math.sin(a)*.19,0);
          alpha=Math.min(1,t*7,(1-t)*5);
        }else if(fx.type==="mend-landing"){
          mesh.scaling.setAll(.55+t*1.6);
          alpha=t<.2?t/.2:Math.max(0,(1-t)*1.25);
        }else if(fx.type==="pulse"){
          mesh.scaling.setAll(.70+t*1.1);alpha=1-t;
        }else if(fx.type==="warning"){
          if(target)fx.root.position.copyFrom(this.world(target,.09));
          mesh.scaling.setAll(.78+t*.45);
          mesh.rotation.y=t*1.9;
          alpha=.35+t*.63;
        }
        mesh.visibility=clamp(alpha,0,1);
      }
    }
    this.stats.active=this.live.length;
  }
  destroy(fx){
    for(const e of fx.meshes)e.mesh.dispose();
    fx.root.dispose();
  }
  clear(){
    for(const fx of this.live)this.destroy(fx);
    this.live.length=0;
  }
  dispose(){
    this.clear();
    for(const mat of this.materials.values())mat.dispose();
    this.materials.clear();
  }
}
