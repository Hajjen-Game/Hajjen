// Visual Combat Slice v1: authored, weaponless energy-orb signatures.
// Deliberately independent of WoW/Pixi class spell IDs and of the legacy arena.
// Babylon renders volumes *inside* the glass, physical energy arcs, projectiles
// and suspended persistent shields. The later Pixi pass can add sharp 2D accents.
import { ABILITY_BY_ID } from "../abilityCatalog.js";
import { EnergyVolumeImpact } from "./EnergyVolumeImpact.js?v=20261008-volume-impact1";

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
    this.volume=new EnergyVolumeImpact(this);
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
    // Visible even with Pixi disabled: 3D particles trace an actual path
    // behind the travelling energy, with colour and turbulence per discipline.
    for(let i=0;i<11;i++){
      const sparkle=this.ball(fx,
        (spellId==="crystal-bolt"?.105:.088)*(1-i*.057),
        i%5===0?"light":i%2===0?"dark":"main",i+8);
      sparkle.parent=null; // keep world position; projectile root moves independently
      sparkle.position.copyFrom(start);
      fx.meshes[fx.meshes.length-1].tracer=i;
    }
    return fx;
  }
  // Rift Slash is a blade-free dimensional tear that races THROUGH the target.
  // It has directional travel and a secondary crossing fracture on contact.
  melee(spellId,source,target){
    const origin=this.world(source,.88),destination=this.world(target,.88);
    const fx=this.makeEffect(spellId,"rift-drive",origin,420,{
      origin:origin.clone(),destination:destination.clone(),sourceId:source.id,
      targetId:target.id,ripTriggered:false,
    });
    for(let i=0;i<3;i++){
      const path=[];
      for(let j=0;j<=24;j++){
        const a=-1.16+j*2.32/24+(i-1)*.09;
        path.push(new BABYLON.Vector3(
          Math.sin(a)*(.57-i*.045),
          Math.cos(a)*(.48-i*.055)+(i-1)*.035,
          Math.sin(a*1.7)*(.065+i*.02)));
      }
      this.tube(fx,path,[.026,.015,.010][i],["dark","main","light"][i],i);
    }
    for(let i=0;i<3;i++){
      const shard=this.cone(fx,.043,.23+i*.05,4,i===1?"light":"main",i+4);
      shard.rotation.z=Math.PI/2+i*.25;
      shard.position.set((i-1)*.12,(i%2?1:-1)*.11,.025);
    }
    return fx;
  }
  riftContact(point){
    const fx=this.makeEffect("rift-slash","rift-impact",point.clone(),460);
    for(let i=0;i<3;i++){
      const path=[];
      for(let j=0;j<=21;j++){
        const a=-1.10+j*2.20/21+(i-1)*.09;
        path.push(new BABYLON.Vector3(
          Math.sin(a)*(.68-i*.065),
          Math.cos(a)*(.50-i*.06)+(i-1)*.08,
          (i-1)*.028+Math.sin(a*2.4)*.034));
      }
      this.tube(fx,path,[.030,.019,.010][i],["dark","main","light"][i],i);
    }
    for(let i=0;i<6;i++){
      const a=i*TAU/6+.23;
      this.tube(fx,[
        new BABYLON.Vector3(Math.cos(a)*.16,Math.sin(a)*.14,0),
        new BABYLON.Vector3(Math.cos(a+.12)*(.38+(i%3)*.055),
          Math.sin(a+.12)*(.34+(i%3)*.04),.045*(i%2?1:-1))
      ],.010,i===0?"light":"main",i+3);
    }
    const floor=this.makeEffect("rift-slash","shock",
      new BABYLON.Vector3(point.x,.08,point.z),350);
    this.torus(floor,.80,.018,"dark");
    this.arc(floor,.50,Math.PI*.95,.35,.013,.012,"main");
    this.outerImpact("rift-slash",point,null);
    this.volume.spawn("rift-slash",point);
    return fx;
  }
  hammer(source,target){
    const fx=this.makeEffect("gravity-hammer","hammer",this.world(target,2.7),520,{
      destination:this.world(target,.88),targetId:target.id,
      impactTriggered:false,
    });
    const head=this.cone(fx,.44,1.11,6,"main");
    head.rotation.x=Math.PI;
    const core=this.cone(fx,.16,1.04,6,"dark",1);
    core.rotation.x=Math.PI;
    this.torus(fx,.69,.032,"main",2).rotation.x=.45;
    for(let i=0;i<4;i++){
      const a=i*TAU/4;
      const shard=this.cone(fx,.040,.21,4,i===0?"light":"main",i+3);
      shard.position.set(Math.cos(a)*.27,-.16,Math.sin(a)*.27);
    }
    return fx;
  }
  gravityContact(target){
    const ground=this.world(target,.085);
    const shock=this.makeEffect("gravity-hammer","gravity-impact",ground,560,{
      targetId:target.id,
    });
    this.ball(shock,.23,"main");
    for(let i=0;i<2;i++){
      const ring=this.torus(shock,.67+i*.43,.024-i*.006,i===0?"main":"dark",i);
      ring.position.y=.012;
    }
    for(let i=0;i<8;i++){
      const a=i*TAU/8+.12*(i%2),len=.43+(i%3)*.11;
      this.tube(shock,[
        new BABYLON.Vector3(Math.cos(a)*.21,.014,Math.sin(a)*.21),
        new BABYLON.Vector3(Math.cos(a+.13)*len*.70,.018,
          Math.sin(a+.13)*len*.70),
        new BABYLON.Vector3(Math.cos(a-.08)*len,.012,Math.sin(a-.08)*len),
      ],i===0?.020:.011,i===0?"light":"main",i);
    }
    for(let i=0;i<5;i++){
      const a=i*TAU/5;
      const chip=this.cone(shock,.037,.16+(i%3)*.05,4,i===0?"light":"main",i+8);
      chip.position.set(Math.cos(a)*.31,.11,Math.sin(a)*.31);
      chip.rotation.z=.4+i*.22;
    }
    const flash=this.makeEffect("gravity-hammer","gravity-flash",
      this.world(target,.86),220,{targetId:target.id});
    this.ball(flash,.33,"main");
    this.ball(flash,.12,"light",1);
    this.torus(flash,.67,.020,"main",2).rotation.x=.65;
    this.outerImpact("gravity-hammer",this.world(target,.085),target.id);
    this.volume.spawn("gravity-hammer",this.world(target,.085),{
      targetId:target.id,
    });
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
  // Two scales, intentionally distinct: detailed impact stays inside the
  // target orb; thin coloured outer fragments reach ~2.1-2.5 orb diameters.
  // These are fractured arcs/shards, never solid white discs or radial wheels.
  outerImpact(spellId,position,targetId){
    const ground=spellId==="gravity-hammer";
    const pos=ground?new BABYLON.Vector3(position.x,.086,position.z):position;
    const fx=this.makeEffect(spellId,"outer-impact",pos,
      spellId==="gravity-hammer"?610:spellId==="rift-slash"?470:540,
      {targetId,ground});
    if(spellId==="crystal-bolt"){
      for(let i=0;i<8;i++){
        const angle=(i+.16)*TAU/8,radius=.81+(i%3)*.16;
        const shard=this.cone(fx,.040+(i%2)*.014,.24+(i%4)*.048,4,
          i===1?"light":i%3===0?"dark":"main",i);
        shard.position.set(Math.cos(angle)*radius,
          (i%3-1)*.18,Math.sin(angle)*radius);
        shard.rotation.z=Math.PI*.46+angle*.18;
        shard.rotation.y=angle;
      }
      this.arc(fx,1.06,Math.PI*.77,.12,-.42,.018,"main",20);
      this.arc(fx,1.19,Math.PI*.49,3.52,-.42,.012,"dark",21);
    }else if(spellId==="sun-lance"){
      this.arc(fx,1.0,Math.PI*.83,-.65,.015,.020,"main",0);
      this.arc(fx,1.19,Math.PI*.39,2.35,-.04,.012,"dark",1);
      for(let i=0;i<5;i++){
        const a=(i+.19)*TAU/5,r=.75+(i%2)*.13;
        this.tube(fx,[
          new BABYLON.Vector3(Math.cos(a)*r,Math.sin(a)*r*.79,0),
          new BABYLON.Vector3(Math.cos(a)*(r+.29+(i%2)*.08),
            Math.sin(a)*(r+.29+(i%2)*.08)*.83,(i%2?-.07:.07))
        ],i===0?.019:.012,i===0?"light":"main",i+2);
      }
      for(let i=0;i<3;i++){
        const a=i*TAU/3+.3;
        const mote=this.ball(fx,.075,"main",i+9);
        mote.position.set(Math.cos(a)*1.0,Math.sin(a)*.68,.13);
      }
    }else if(spellId==="rift-slash"){
      // Two jagged, opposite seams reading as a split in space.
      for(let side=-1;side<=1;side+=2){
        const points=[];
        for(let i=0;i<=17;i++){
          const u=i/17-.5;
          points.push(new BABYLON.Vector3(u*2.56,
            side*(u*.96+Math.sin(u*10+side)*.09),
            .12*Math.cos(u*5+side)));
        }
        this.tube(fx,points,side===1?.027:.019,
          side===1?"dark":"main",side);
      }
      for(let i=0;i<5;i++){
        const a=(i+.32)*TAU/5;
        this.tube(fx,[
          new BABYLON.Vector3(Math.cos(a)*.78,Math.sin(a)*.61,.03),
          new BABYLON.Vector3(Math.cos(a+.10)*(1.04+i%2*.22),
            Math.sin(a+.10)*(.88+i%2*.11),-.02)
        ],.011,i===0?"light":"main",i+3);
      }
    }else if(ground){
      // A low-ground pressure shock that does not obscure the glass orb.
      this.arc(fx,1.25,Math.PI*.97,.09,.017,.027,"main",0);
      this.arc(fx,1.54,Math.PI*.59,3.22,.016,.018,"dark",1);
      for(let i=0;i<9;i++){
        const a=(i+.15)*TAU/9,outer=1.02+(i%3)*.18;
        this.tube(fx,[
          new BABYLON.Vector3(Math.cos(a)*.59,.02,Math.sin(a)*.59),
          new BABYLON.Vector3(Math.cos(a+.11)*outer*.79,.02,
            Math.sin(a+.11)*outer*.79),
          new BABYLON.Vector3(Math.cos(a-.045)*outer,.018,
            Math.sin(a-.045)*outer)
        ],i%4===0?.019:.012,i===1?"light":"main",i+2);
      }
    }
    return fx;
  }
  impact(fx,target){
    const id=fx.spellId;
    const point=target?.alive?this.world(target):fx.root.position.clone();
    const crystal=id==="crystal-bolt";
    const splash=this.makeEffect(id,crystal?"crystal-impact":"solar-impact",
      point,crystal?480:420,{targetId:fx.targetId});
    // Energy is concentrated in a tiny tinted core, not a white disc.
    this.ball(splash,crystal?.24:.27,"main");
    this.ball(splash,.095,"light",1);
    if(crystal){
      // Faceted micro-splinters echo the angular charge inside the glass.
      for(let i=0;i<7;i++){
        const a=i*TAU/7+.15,rr=.23+(i%3)*.045;
        const shard=this.cone(splash,.035+(i%2)*.010,
          .24+(i%3)*.075,4,i===0?"light":"main",i+2);
        shard.position.set(Math.cos(a)*rr,(i%3-1)*.065,Math.sin(a)*rr);
        shard.rotation.y=a;shard.rotation.z=Math.PI*.38+a*.20;
      }
      for(let i=0;i<6;i++){
        const a=(i+.25)*TAU/6;
        this.tube(splash,[
          new BABYLON.Vector3(Math.cos(a)*.15,-.52,Math.sin(a)*.15),
          new BABYLON.Vector3(Math.cos(a+.12)*(.42+(i%2)*.09),-.53,
            Math.sin(a+.12)*(.42+(i%2)*.09))
        ],i===0?.016:.009,i===0?"light":"main",i+9);
      }
      this.arc(splash,.46,Math.PI*1.20,.30,-.49,.011,"main",16);
      this.arc(splash,.53,Math.PI*.66,3.60,-.49,.008,"dark",17);
    }else{
      // Focused piercing corona with only five fine spokes.
      this.arc(splash,.39,Math.PI*1.48,-.58,.01,.016,"main",2);
      this.arc(splash,.47,Math.PI*.62,2.50,-.02,.010,"dark",3);
      for(let i=0;i<5;i++){
        const a=(i+.16)*TAU/5,len=.40+(i%2)*.10;
        this.tube(splash,[
          new BABYLON.Vector3(Math.cos(a)*.15,Math.sin(a)*.12,0),
          new BABYLON.Vector3(Math.cos(a)*len,
            Math.sin(a)*len*.83,(i%2?-.055:.055))
        ],i===0?.019:.010,i===0?"light":"main",i+4);
      }
      for(let i=0;i<4;i++){
        const a=i*TAU/4+.24;
        const mote=this.cone(splash,.026,.15+(i%2)*.045,5,
          i===0?"light":"main",i+9);
        mote.position.set(Math.cos(a)*.32,Math.sin(a)*.22,.055);
        mote.rotation.z=a-Math.PI/2;
      }
    }
    this.outerImpact(id,point,fx.targetId);
    this.volume.spawn(id,point,{
      targetId:fx.targetId,
      direction:fx.destination.subtract(fx.origin),
    });
  }
  update(match,now=performance.now()){
    for(let i=this.live.length-1;i>=0;i--){
      const fx=this.live[i],t=clamp((now-fx.start)/fx.duration,0,1);
      const actor=fx.actorId&&match.getActor(fx.actorId);
      const target=fx.targetId&&match.getActor(fx.targetId);
      if(t>=1){
        // A slow frame can skip across the contact threshold. Make sure the
        // hit always happens once before the travelling geometry is removed.
        if(fx.type==="projectile")this.impact(fx,target);
        if(fx.type==="rift-drive"&&!fx.ripTriggered){
          fx.ripTriggered=true;
          this.riftContact(target?.alive?this.world(target):fx.destination);
        }
        if(fx.type==="hammer"&&!fx.impactTriggered){
          fx.impactTriggered=true;
          if(target)this.gravityContact(target);
        }
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
      if(fx.type==="volume-impact"){
        this.volume.update(fx,t,now);
        continue;
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
      if(fx.type==="rift-drive"){
        const end=target?.alive?this.world(target):fx.destination;
        const travel=smooth(clamp(t/.66,0,1));
        fx.root.position.copyFrom(BABYLON.Vector3.Lerp(fx.origin,end,travel));
        const vec=end.subtract(fx.origin);
        fx.root.rotation.y=Math.atan2(vec.x,vec.z);
        if(!fx.ripTriggered&&t>=.64){
          fx.ripTriggered=true;
          this.riftContact(end);
        }
      }
      if(fx.type==="mend"){
        const end=target?.alive?this.world(target):fx.destination;
        fx.root.position.copyFrom(BABYLON.Vector3.Lerp(fx.origin,end,smooth(t)));
      }
      if(fx.type==="hammer"){
        if(target)fx.root.position.set(target.x*S,fx.root.position.y,target.y*S);
        fx.root.position.y=2.7-1.82*smooth(t);
        if(!fx.impactTriggered&&t>=.92){
          fx.impactTriggered=true;
          if(target)this.gravityContact(target);
        }
      }
      for(const {mesh,slot,i:idx,base,tracer} of fx.meshes){
        // World-space three-dimensional tail is independent of the projectile
        // root rotation. It persists even if Pixi fails to load.
        if(fx.type==="projectile"&&tracer!==undefined){
          const end=target?.alive?this.world(target):fx.destination;
          const progress=smooth(t);
          const historyT=clamp(progress-(tracer+1)*.038,0,1);
          const point=BABYLON.Vector3.Lerp(fx.origin,end,historyT);
          const dx=end.x-fx.origin.x,dz=end.z-fx.origin.z;
          const length=Math.hypot(dx,dz)||1;
          const wobble=(fx.spellId==="crystal-bolt"?.095:.052)*
            Math.sin(now*.012-tracer*1.85)*(1+tracer*.05);
          point.x+=(-dz/length)*wobble;
          point.z+=(dx/length)*wobble;
          point.y+=Math.cos(now*.011-tracer*2.1)*wobble*.6;
          mesh.position.copyFrom(point);
          mesh.scaling.setAll(Math.max(.30,1-tracer*.055));
          mesh.visibility=clamp((1-tracer/12)*Math.min(1,t*9)*(1-t*.42),0,.78);
          continue;
        }
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
        }else if(fx.type==="rift-drive"){
          // A forward-moving spatial cleave with a staggered follow-up wave.
          mesh.rotation.z=-.35+Math.sin(t*3.8+idx*.38)*.18;
          mesh.scaling.setAll((.42+Math.min(1,t*2.5)*.53)*(idx%2?.94:1));
          alpha=Math.min(1,t*7,Math.max(0,(1-t)*5));
        }else if(fx.type==="outer-impact"){
          // Expand gently beyond the orb without changing the tiny inner core.
          // Low-contrast edges keep the signature detailed, not washed out.
          const expansion=.80+.34*smooth(t);
          mesh.scaling.setAll(expansion);
          mesh.visibility=clamp(Math.min(1,t*11,(1-t)*1.65)*
            (slot==="light"?.56:slot==="dark"?.48:.78),0,.85);
        }else if(fx.type==="rift-impact"){
          mesh.scaling.setAll(.62+.40*smooth(t));
          mesh.position.set(base.x*(1+t*.12),base.y*(1+t*.08),
            base.z*(1+t*.12));
          alpha=Math.min(.85,t*8,(1-t)*1.60);
        }else if(fx.type==="crystal-impact"){
          mesh.position.set(base.x*(1+t*.40),base.y*(1+t*.28),
            base.z*(1+t*.40));
          mesh.scaling.setAll(.62+t*.48);
          alpha=Math.min(.85,t*10,(1-t)*1.55);
        }else if(fx.type==="solar-impact"){
          mesh.position.set(base.x*(1+t*.28),base.y*(1+t*.20),
            base.z*(1+t*.28));
          mesh.scaling.setAll(.72+.34*smooth(t));
          mesh.rotation.z+=.009*(idx%2?1:-1);
          alpha=Math.min(.85,t*10,(1-t)*1.45);
        }else if(fx.type==="gravity-impact"){
          mesh.position.set(base.x*(1+t*.28),base.y+Math.sin(t*Math.PI)*(.025+(idx%4)*.015),
            base.z*(1+t*.28));
          mesh.scaling.setAll(.62+.43*smooth(t));
          alpha=Math.min(.9,t*10,(1-t)*1.45);
        }else if(fx.type==="gravity-flash"){
          mesh.scaling.setAll(.6+.48*t);
          alpha=Math.min(.8,t*10,(1-t)*1.6);
        }else if(fx.type==="shock"||fx.type==="impact"){
          mesh.scaling.setAll(.62+t*.46);
          alpha=(1-t)*.74;
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
