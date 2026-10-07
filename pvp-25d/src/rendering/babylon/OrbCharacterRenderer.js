const CLASS_STYLE=Object.freeze({
  priest:{core:"#f2e5b8",energy:"#fff3b0"},
  warrior:{core:"#c84d3f",energy:"#ff7a5f"},
  mage:{core:"#45bff2",energy:"#89e6ff"},
  shaman:{core:"#2f83d9",energy:"#72d6ff"},
  rogue:{core:"#d8ca43",energy:"#fff07a"},
  warlock:{core:"#7b50b5",energy:"#b98cff"},
  paladin:{core:"#e88caf",energy:"#ffd0df"},
  druid:{core:"#d97828",energy:"#ffb35f"},
  "death-knight":{core:"#4e8e9f",energy:"#83e1e8"},
  hunter:{core:"#6e9f55",energy:"#a7dc82"},
});

const DEFAULT_STYLE={core:"#7b8b91",energy:"#bad1d7"};

function c3(hex){return BABYLON.Color3.FromHexString(hex);}

function alphaMaterial(scene,name,hex,alpha,emissive=0){
  const m=new BABYLON.StandardMaterial(name,scene);
  const c=c3(hex);
  m.diffuseColor=c.scale(0.72);
  m.emissiveColor=c.scale(emissive);
  m.specularColor=c.scale(0.20);
  m.alpha=alpha;
  m.backFaceCulling=false;
  m.needDepthPrePass=true;
  if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined){
    m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
  }
  return m;
}

export class OrbCharacterRenderer{
  constructor(scene,shadowGenerator,scale){
    this.scene=scene;
    this.shadowGenerator=shadowGenerator;
    this.scale=scale;
    this.entries=new Map();
  }

  styleFor(actor){return CLASS_STYLE[actor.classId]||DEFAULT_STYLE;}

  create(actor){
    const style=this.styleFor(actor);
    const root=new BABYLON.TransformNode("orb-actor:"+actor.id,this.scene);
    const visualRoot=new BABYLON.TransformNode("orb-visual:"+actor.id,this.scene);
    visualRoot.parent=root;

    const shellMat=alphaMaterial(
      this.scene,
      "orb-shell-mat:"+actor.id,
      style.core,
      0.18,
      0.16,
    );
    const middleMat=alphaMaterial(
      this.scene,
      "orb-middle-mat:"+actor.id,
      style.core,
      0.30,
      0.32,
    );
    const coreMat=alphaMaterial(
      this.scene,
      "orb-core-mat:"+actor.id,
      style.energy,
      0.96,
      0.92,
    );
    coreMat.specularPower=96;

    const shell=BABYLON.MeshBuilder.CreateSphere(
      "orb-shell:"+actor.id,
      {diameter:1.18,segments:20},
      this.scene,
    );
    shell.parent=visualRoot;
    shell.position.y=0.72;
    shell.material=shellMat;
    shell.metadata={actorId:actor.id,orbPart:"shell"};
    shell.isPickable=true;

    const middle=BABYLON.MeshBuilder.CreateSphere(
      "orb-middle:"+actor.id,
      {diameter:0.86,segments:16},
      this.scene,
    );
    middle.parent=visualRoot;
    middle.position.y=0.72;
    middle.material=middleMat;
    middle.metadata={actorId:actor.id,orbPart:"middle"};
    middle.isPickable=true;

    const core=BABYLON.MeshBuilder.CreatePolyhedron(
      "orb-core:"+actor.id,
      {type:2,size:0.36},
      this.scene,
    );
    core.parent=visualRoot;
    core.position.y=0.72;
    core.scaling.set(1.0,1.18,1.0);
    core.material=coreMat;
    core.metadata={actorId:actor.id,orbPart:"core"};
    core.isPickable=true;
    this.shadowGenerator?.addShadowCaster(core);

    const haloMat=alphaMaterial(
      this.scene,
      "orb-halo-mat:"+actor.id,
      style.energy,
      0.18,
      0.48,
    );
    haloMat.disableLighting=true;

    const halo=BABYLON.MeshBuilder.CreateTorus(
      "orb-halo:"+actor.id,
      {diameter:1.05,thickness:0.028,tessellation:40},
      this.scene,
    );
    halo.parent=root;
    halo.position.y=0.10;
    halo.material=haloMat;
    halo.isPickable=false;

    const castMat=alphaMaterial(
      this.scene,
      "orb-cast-mat:"+actor.id,
      style.energy,
      0.0,
      0.72,
    );
    castMat.disableLighting=true;
    const castBand=BABYLON.MeshBuilder.CreateTorus(
      "orb-cast-band:"+actor.id,
      {diameter:1.28,thickness:0.045,tessellation:48},
      this.scene,
    );
    castBand.parent=visualRoot;
    castBand.position.y=0.72;
    castBand.rotation.x=Math.PI/2;
    castBand.material=castMat;
    castBand.isPickable=false;

    const shadowMat=new BABYLON.StandardMaterial(
      "orb-contact-shadow-mat:"+actor.id,
      this.scene,
    );
    shadowMat.diffuseColor=new BABYLON.Color3(0.018,0.014,0.012);
    shadowMat.specularColor=BABYLON.Color3.Black();
    shadowMat.alpha=0.34;
    shadowMat.disableLighting=true;

    const contactShadow=BABYLON.MeshBuilder.CreateCylinder(
      "orb-contact-shadow:"+actor.id,
      {height:0.008,diameter:0.88,tessellation:28},
      this.scene,
    );
    contactShadow.parent=root;
    contactShadow.position.y=0.014;
    contactShadow.scaling.set(1.18,1,0.68);
    contactShadow.material=shadowMat;
    contactShadow.isPickable=false;

    const sparks=[];
    for(let i=0;i<3;i++){
      const spark=BABYLON.MeshBuilder.CreateSphere(
        "orb-spark:"+actor.id+":"+i,
        {diameter:0.105-i*0.014,segments:7},
        this.scene,
      );
      spark.parent=visualRoot;
      spark.material=coreMat;
      spark.isPickable=false;
      sparks.push(spark);
    }

    const trail=[];
    for(let i=0;i<3;i++){
      const trailMat=alphaMaterial(
        this.scene,
        "orb-trail-mat:"+actor.id+":"+i,
        style.core,
        0.10-i*0.022,
        0.22,
      );
      trailMat.disableLighting=true;

      const ghost=BABYLON.MeshBuilder.CreateSphere(
        "orb-trail:"+actor.id+":"+i,
        {diameter:0.72-i*0.09,segments:10},
        this.scene,
      );
      ghost.material=trailMat;
      ghost.isPickable=false;
      ghost.visibility=0;
      ghost.position.set(actor.x*this.scale,0.80,actor.y*this.scale);
      trail.push({mesh:ghost,material:trailMat});
    }

    const hpBackMat=new BABYLON.StandardMaterial(
      "orb-hp-back-mat:"+actor.id,
      this.scene,
    );
    hpBackMat.diffuseColor=new BABYLON.Color3(0.035,0.03,0.028);
    hpBackMat.specularColor=BABYLON.Color3.Black();
    hpBackMat.disableLighting=true;

    const hpMat=new BABYLON.StandardMaterial(
      "orb-hp-mat:"+actor.id,
      this.scene,
    );
    hpMat.diffuseColor=c3(style.core);
    hpMat.emissiveColor=c3(style.core).scale(0.10);
    hpMat.specularColor=BABYLON.Color3.Black();
    hpMat.disableLighting=true;

    const barRoot=new BABYLON.TransformNode("orb-status:"+actor.id,this.scene);
    barRoot.parent=root;
    barRoot.position.y=1.58;

    const hpBack=BABYLON.MeshBuilder.CreatePlane(
      "orb-hp-back:"+actor.id,
      {width:1.12,height:0.095,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      this.scene,
    );
    hpBack.parent=barRoot;
    hpBack.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
    hpBack.material=hpBackMat;
    hpBack.isPickable=false;

    const hp=BABYLON.MeshBuilder.CreatePlane(
      "orb-hp:"+actor.id,
      {width:1.06,height:0.058,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      this.scene,
    );
    hp.parent=barRoot;
    hp.position.z=-0.012;
    hp.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
    hp.material=hpMat;
    hp.isPickable=false;

    const entry={
      root,visualRoot,
      classId:actor.classId,role:actor.role,
      style,
      shell,middle,core,halo,castBand,contactShadow,
      sparks,trail,hp,hpBack,barRoot,
      shellMat,middleMat,coreMat,haloMat,castMat,hpMat,
      ownedMaterials:[
        shellMat,middleMat,coreMat,haloMat,castMat,
        shadowMat,hpBackMat,hpMat,
        ...trail.map(t=>t.material),
      ],
      lastPos:new BABYLON.Vector3(actor.x*this.scale,0.16,actor.y*this.scale),
    };

    this.entries.set(actor.id,entry);
    return entry;
  }

  disposeEntry(entry){
    for(const t of entry.trail||[]) t.mesh?.dispose();
    for(const m of entry.ownedMaterials||[]){try{m.dispose();}catch{}}
    entry.root.dispose(false,true);
  }

  sync(game,time=performance.now()){
    const ids=new Set(game.actors.map(a=>a.id));
    for(const [id,entry] of this.entries){
      if(ids.has(id)) continue;
      this.disposeEntry(entry);
      this.entries.delete(id);
    }

    for(const actor of game.actors){
      let e=this.entries.get(actor.id);
      if(e&&(e.classId!==actor.classId||e.role!==actor.role)){
        this.disposeEntry(e);
        this.entries.delete(actor.id);
        e=null;
      }
      e=e||this.create(actor);

      e.root.setEnabled(actor.alive);
      for(const t of e.trail) t.mesh.setEnabled(actor.alive);
      if(!actor.alive) continue;

      const pos=new BABYLON.Vector3(
        actor.x*this.scale,
        0.16,
        actor.y*this.scale,
      );
      e.root.position.copyFrom(pos);

      const mv=actor.lastMove||{x:0,y:0};
      const speed=Math.min(1,Math.hypot(mv.x||0,mv.y||0));
      const moving=speed>0.05;

      if(moving){
        e.visualRoot.rotation.y=Math.atan2(mv.x,mv.y);
      }

      const breathe=1+Math.sin(time*0.0034+String(actor.id).length)*0.025;
      if(moving){
        e.visualRoot.scaling.set(0.94,1.00,1.13);
      }else{
        e.visualRoot.scaling.set(breathe,1.0/breathe,breathe);
      }

      const cast=actor.cast;
      const castProgress=cast
        ?1-Math.max(0,cast.remainingMs)/Math.max(1,cast.totalMs)
        :0;
      const castPulse=cast
        ?0.5+0.5*Math.sin(time*0.024)
        :0;

      e.core.scaling.setAll(
        0.96+castProgress*0.20+castPulse*0.07
      );
      e.core.scaling.y*=1.18;
      e.middle.scaling.setAll(1.0+castProgress*0.08);
      e.shellMat.alpha=0.16+(cast?0.08+castPulse*0.035:0);
      e.middleMat.alpha=0.28+(cast?0.10:0);
      e.coreMat.emissiveColor=c3(e.style.energy).scale(
        cast?1.0:0.72
      );

      e.castMat.alpha=cast?0.20+castPulse*0.28:0;
      e.castBand.scaling.setAll(0.88+castProgress*0.32);
      e.castBand.rotation.z=time*0.0024;
      e.castBand.rotation.y=time*0.0018;

      e.halo.scaling.setAll(1+Math.sin(time*0.004+String(actor.id).length)*0.055);
      e.haloMat.alpha=0.13+(cast?0.08:0);

      for(let i=0;i<e.sparks.length;i++){
        const a=time*(0.0018+i*0.00035)+i*Math.PI*2/3;
        const radius=0.26+(cast?0.05+castProgress*0.08:0);
        e.sparks[i].position.set(
          Math.cos(a)*radius,
          0.72+Math.sin(a*1.7+i)*0.20,
          Math.sin(a)*radius,
        );
        e.sparks[i].scaling.setAll(cast?1.18:0.92);
      }

      let leader=pos;
      for(let i=0;i<e.trail.length;i++){
        const ghost=e.trail[i].mesh;
        const follow=moving?(0.20-i*0.025):0.34;
        BABYLON.Vector3.LerpToRef(
          ghost.position,
          leader,
          Math.max(0.08,follow),
          ghost.position,
        );
        leader=ghost.position.clone();
        ghost.position.y=0.80;
        ghost.visibility=moving
          ?Math.max(0,0.26-i*0.065)*speed
          :Math.max(0,ghost.visibility-0.08);
        ghost.scaling.set(
          0.88-i*0.06,
          0.84-i*0.05,
          1.12+i*0.05,
        );
      }

      const health=Math.max(0,Math.min(1,actor.healthPct));
      e.hp.scaling.x=health;
      e.hp.position.x=-0.53*(1-health);
      if(health<0.20){
        e.hpMat.diffuseColor=c3("#e14d43");
        e.hpMat.emissiveColor=c3("#e14d43").scale(0.24);
        const danger=1+Math.sin(time*0.012)*0.05;
        e.shell.scaling.setAll(danger);
      }else{
        e.hpMat.diffuseColor=c3(e.style.core);
        e.hpMat.emissiveColor=c3(e.style.core).scale(0.10);
        e.shell.scaling.setAll(1);
      }

      e.lastPos.copyFrom(pos);
    }
  }

  meshForActor(id){
    return this.entries.get(id)?.shell||null;
  }

  rootForActor(id){
    return this.entries.get(id)?.root||null;
  }

  worldPosition(id,y=0.88){
    const root=this.rootForActor(id);
    return root
      ?new BABYLON.Vector3(root.position.x,root.position.y+y,root.position.z)
      :null;
  }
}
