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

function addGlassFresnel(material,edgeColor){
  if(!BABYLON.FresnelParameters) return;
  const opacity=new BABYLON.FresnelParameters();
  opacity.bias=0.03;
  opacity.power=3.2;
  opacity.leftColor=new BABYLON.Color3(0.92,0.97,1.00);
  opacity.rightColor=BABYLON.Color3.Black();
  material.opacityFresnelParameters=opacity;

  const emissive=new BABYLON.FresnelParameters();
  emissive.bias=0.00;
  emissive.power=4.1;
  emissive.leftColor=edgeColor.scale(0.44);
  emissive.rightColor=BABYLON.Color3.Black();
  material.emissiveFresnelParameters=emissive;
}

// The glass catches clean, short specular arcs while the energy underneath
// keeps its own (class-coloured) orbit. No texture sheets or image assets.
function glassHighlightPath(radius,start,span){
  const points=[];
  const height=Math.sqrt(Math.max(0,0.62*0.62-radius*radius));
  for(let i=0;i<=20;i++){
    const t=i/20;
    const angle=start+t*span;
    points.push(new BABYLON.Vector3(
      Math.cos(angle)*radius,
      0.72+height+0.008,
      Math.sin(angle)*radius,
    ));
  }
  return points;
}

function wakePath(lane){
  const points=[];
  for(let i=0;i<=24;i++){
    const t=i/24;
    points.push(new BABYLON.Vector3(
      -0.40-1.28*t,
      0.72+0.08*Math.sin(t*4.2+lane*1.3)-0.10*t,
      (lane-1)*0.13+Math.sin(t*5.7+lane*1.7)*(0.035+0.12*t),
    ));
  }
  return points;
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
      "#d7e2ef",
      0.11,
      0.05,
    );
    shellMat.diffuseColor=new BABYLON.Color3(0.055,0.070,0.090);
    shellMat.emissiveColor=new BABYLON.Color3(0.008,0.012,0.018);
    shellMat.specularColor=new BABYLON.Color3(0.88,0.94,1.00);
    shellMat.specularPower=180;
    addGlassFresnel(shellMat,new BABYLON.Color3(0.75,0.87,1.00));
    // A transparent sphere must not depth-mask its luminous core.
    shellMat.needDepthPrePass=false;
    shellMat.separateCullingPass=true;

    const middleMat=alphaMaterial(
      this.scene,
      "orb-middle-mat:"+actor.id,
      "#b8c5d3",
      0.055,
      0.018,
    );
    middleMat.diffuseColor=new BABYLON.Color3(0.030,0.038,0.052);
    middleMat.emissiveColor=new BABYLON.Color3(0.004,0.006,0.010);
    middleMat.specularColor=new BABYLON.Color3(0.55,0.68,0.82);
    middleMat.specularPower=128;

    const coreMat=alphaMaterial(
      this.scene,
      "orb-core-mat:"+actor.id,
      style.energy,
      0.98,
      1.38,
    );
    coreMat.specularPower=96;

    const shell=BABYLON.MeshBuilder.CreateSphere(
      "orb-shell:"+actor.id,
      {diameter:1.24,segments:28},
      this.scene,
    );
    shell.parent=visualRoot;
    shell.position.y=0.72;
    shell.material=shellMat;
    shell.metadata={actorId:actor.id,orbPart:"shell"};
    shell.isPickable=true;

    const middle=BABYLON.MeshBuilder.CreateSphere(
      "orb-middle:"+actor.id,
      {diameter:0.92,segments:20},
      this.scene,
    );
    middle.parent=visualRoot;
    middle.position.y=0.72;
    middle.material=middleMat;
    middle.metadata={actorId:actor.id,orbPart:"middle"};
    middle.isPickable=true;

    const core=BABYLON.MeshBuilder.CreatePolyhedron(
      "orb-core:"+actor.id,
      {type:2,size:0.30},
      this.scene,
    );
    core.parent=visualRoot;
    core.position.y=0.72;
    core.scaling.set(1.0,1.18,1.0);
    core.material=coreMat;
    core.metadata={actorId:actor.id,orbPart:"core"};
    core.isPickable=true;
    this.shadowGenerator?.addShadowCaster(core);

    const energyMat=alphaMaterial(
      this.scene,
      "orb-energy-mat:"+actor.id,
      style.core,
      0.42,
      1.05,
    );
    energyMat.disableLighting=true;

    const energy=BABYLON.MeshBuilder.CreatePolyhedron(
      "orb-energy:"+actor.id,
      {type:1,size:0.50},
      this.scene,
    );
    energy.parent=visualRoot;
    energy.position.y=0.72;
    energy.scaling.set(1.0,0.82,1.0);
    energy.material=energyMat;
    energy.isPickable=false;

    const plasmaMat=alphaMaterial(
      this.scene,
      "orb-plasma-mat:"+actor.id,
      style.energy,
      0.16,
      0.78,
    );
    plasmaMat.disableLighting=true;
    plasmaMat.backFaceCulling=true;
    plasmaMat.needDepthPrePass=false;

    const plasma=BABYLON.MeshBuilder.CreateSphere(
      "orb-plasma:"+actor.id,
      {diameter:0.72,segments:16},
      this.scene,
    );
    plasma.parent=visualRoot;
    plasma.position.y=0.72;
    plasma.material=plasmaMat;
    plasma.isPickable=false;

    const ringMat=alphaMaterial(
      this.scene,
      "orb-ring-mat:"+actor.id,
      style.energy,
      0.58,
      1.15,
    );
    ringMat.disableLighting=true;

    const rings=[];
    const ringDefs=[
      {diameter:0.94,thickness:0.013,rx:Math.PI*0.28,rz:0.18},
      {diameter:0.72,thickness:0.017,rx:Math.PI*0.57,rz:Math.PI*0.34},
      {diameter:0.52,thickness:0.014,rx:Math.PI*0.14,rz:-Math.PI*0.22},
    ];
    for(let i=0;i<ringDefs.length;i++){
      const d=ringDefs[i];
      const ring=BABYLON.MeshBuilder.CreateTorus(
        "orb-energy-ring:"+actor.id+":"+i,
        {diameter:d.diameter,thickness:d.thickness,tessellation:48},
        this.scene,
      );
      ring.parent=visualRoot;
      ring.position.y=0.72;
      ring.rotation.x=d.rx;
      ring.rotation.z=d.rz;
      ring.material=ringMat;
      ring.isPickable=false;
      rings.push(ring);
    }

    const shardMat=alphaMaterial(
      this.scene,
      "orb-shard-mat:"+actor.id,
      style.core,
      0.88,
      1.35,
    );
    shardMat.disableLighting=true;

    const shards=[];
    for(let i=0;i<5;i++){
      const shard=BABYLON.MeshBuilder.CreatePolyhedron(
        "orb-shard:"+actor.id+":"+i,
        {type:1,size:0.075+(i%2)*0.012},
        this.scene,
      );
      shard.parent=visualRoot;
      shard.material=shardMat;
      shard.isPickable=false;
      shards.push(shard);
    }

    // Distinct luminous centre, nested gyres and curved white glass reflections.
    // The small white-hot kernel anchors the shape from top-down camera distance.
    const nucleusMat=alphaMaterial(
      this.scene,"orb-nucleus-mat:"+actor.id,"#fffdf3",0.98,1.9,
    );
    nucleusMat.disableLighting=true;
    const nucleus=BABYLON.MeshBuilder.CreateSphere(
      "orb-nucleus:"+actor.id,
      {diameter:actor.classId==="rogue"?0.105:0.16,segments:12},
      this.scene,
    );
    nucleus.parent=visualRoot;
    nucleus.position.y=0.735;
    nucleus.material=nucleusMat;
    nucleus.isPickable=false;

    const loopMat=alphaMaterial(
      this.scene,"orb-heart-loop-mat:"+actor.id,style.energy,0.82,1.72,
    );
    loopMat.disableLighting=true;
    loopMat.needDepthPrePass=false;
    const heartLoops=[];
    for(let i=0;i<2;i++){
      const ring=BABYLON.MeshBuilder.CreateTorus(
        "orb-heart-loop:"+actor.id+":"+i,
        {diameter:0.30+i*0.17,thickness:i===0?0.020:0.013,tessellation:56},
        this.scene,
      );
      ring.parent=visualRoot;
      ring.position.y=0.73;
      ring.rotation.x=0.12+i*0.36;
      ring.rotation.z=i*0.6;
      ring.material=loopMat;
      ring.isPickable=false;
      heartLoops.push(ring);
    }

    // Curved surface reflections: these sit on the upper hemisphere, not in
    // the core, so the orb continues to read as a transparent glass object.
    const glintMat=alphaMaterial(
      this.scene,"orb-glass-glint-mat:"+actor.id,"#effaff",0.76,1.18,
    );
    glintMat.disableLighting=true;
    glintMat.needDepthPrePass=false;
    const glassGlints=[];
    for(const [i,d] of [
      {radius:0.54,start:2.45,span:0.75},
      {radius:0.48,start:4.46,span:0.43},
      {radius:0.37,start:2.70,span:0.36},
    ].entries()){
      const glint=BABYLON.MeshBuilder.CreateTube(
        "orb-glass-glint:"+actor.id+":"+i,
        {path:glassHighlightPath(d.radius,d.start,d.span),
         radius:i===0?0.012:0.008,tessellation:6,cap:BABYLON.Mesh.NO_CAP},
        this.scene,
      );
      glint.parent=visualRoot;
      glint.material=glintMat;
      glint.isPickable=false;
      glassGlints.push(glint);
    }

    // Narrow tapered energy wisps, rather than additional ghost copies of
    // the whole sphere. They remain subtle at rest and brighten while casting.
    const wakeMat=alphaMaterial(
      this.scene,"orb-wake-mat:"+actor.id,style.energy,0.35,1.24,
    );
    wakeMat.disableLighting=true;
    wakeMat.needDepthPrePass=false;
    const wakes=[];
    for(let i=0;i<3;i++){
      const wake=BABYLON.MeshBuilder.CreateTube(
        "orb-wake:"+actor.id+":"+i,
        {path:wakePath(i),
         radiusFunction:(step,distance)=>0.018*Math.pow(1-step/24,1.6)+0.001,
         tessellation:5,cap:BABYLON.Mesh.NO_CAP},
        this.scene,
      );
      wake.parent=visualRoot;
      wake.material=wakeMat;
      wake.isPickable=false;
      wakes.push(wake);
    }

    const moteMat=alphaMaterial(
      this.scene,"orb-mote-mat:"+actor.id,style.energy,0.72,1.25,
    );
    moteMat.disableLighting=true;
    const motes=[];
    for(let i=0;i<9;i++){
      const mote=BABYLON.MeshBuilder.CreateSphere(
        "orb-mote:"+actor.id+":"+i,
        {diameter:0.021+(i%3)*0.012,segments:6},
        this.scene,
      );
      mote.parent=visualRoot;
      mote.material=moteMat;
      mote.isPickable=false;
      motes.push(mote);
    }

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
    for(let i=0;i<6;i++){
      const spark=BABYLON.MeshBuilder.CreateSphere(
        "orb-spark:"+actor.id+":"+i,
        {diameter:Math.max(0.040,0.085-i*0.006),segments:7},
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
        style.energy,
        0.085-i*0.014,
        0.46,
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
      shell,middle,core,energy,plasma,rings,shards,nucleus,heartLoops,glassGlints,wakes,motes,halo,castBand,contactShadow,
      sparks,trail,hp,hpBack,barRoot,
      shellMat,middleMat,coreMat,energyMat,plasmaMat,ringMat,shardMat,nucleusMat,loopMat,glintMat,wakeMat,moteMat,haloMat,castMat,hpMat,
      ownedMaterials:[
        shellMat,middleMat,coreMat,energyMat,plasmaMat,ringMat,shardMat,nucleusMat,loopMat,glintMat,wakeMat,moteMat,haloMat,castMat,
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
        0.98+castProgress*0.24+castPulse*0.08
      );
      e.core.scaling.y*=1.18;

      const energyPulse=1+Math.sin(time*0.010+String(actor.id).length)*0.12;
      e.energy.scaling.set(
        energyPulse*(1+castProgress*0.12),
        (0.78+castProgress*0.10)/energyPulse,
        energyPulse*(1+castProgress*0.12),
      );
      e.energy.rotation.x=time*0.0017;
      e.energy.rotation.y=-time*0.0024;
      e.energy.rotation.z=time*0.0011;

      e.middle.scaling.setAll(1.0+castProgress*0.04);
      e.shellMat.alpha=0.055+(cast?0.010+castPulse*0.008:0);
      e.middleMat.alpha=0.026+(cast?0.010:0);
      e.coreMat.emissiveColor=c3(e.style.energy).scale(
        cast?1.72:1.28
      );
      e.energyMat.emissiveColor=c3(e.style.core).scale(
        cast?1.45:1.08
      );
      e.energyMat.alpha=0.28+(cast?0.16+castPulse*0.08:0);

      const plasmaPulse=1+Math.sin(time*0.0067+String(actor.id).length)*0.08;
      e.plasma.scaling.setAll(
        plasmaPulse*(1+castProgress*0.13+castPulse*0.04)
      );
      e.plasmaMat.alpha=0.095+(cast?0.09+castPulse*0.045:0);
      e.plasmaMat.emissiveColor=c3(e.style.energy).scale(
        cast?1.10:0.66
      );

      for(let i=0;i<e.rings.length;i++){
        const ring=e.rings[i];
        const dir=i%2===0?1:-1;
        // Clock-based rotation: stable speed at 30/60/120 fps.
        ring.rotation.x=[Math.PI*0.28,Math.PI*0.57,Math.PI*0.14][i]
          +Math.sin(time*0.00054+i)*0.08;
        ring.rotation.y=dir*time*(0.00065+i*0.00018)*(cast?1.5:1.0);
        ring.rotation.z=[0.18,Math.PI*0.34,-Math.PI*0.22][i]
          +dir*time*0.00023;
        ring.scaling.setAll(
          0.98+Math.sin(time*(0.0038+i*0.0009)+i)*0.05
          +castProgress*0.08
        );
      }
      e.ringMat.alpha=0.56+(cast?0.22+castPulse*0.10:0);
      e.ringMat.emissiveColor=c3(e.style.energy).scale(
        cast?1.42:1.08
      );

      e.castMat.alpha=cast?0.20+castPulse*0.28:0;
      e.castBand.scaling.setAll(0.88+castProgress*0.32);
      e.castBand.rotation.z=time*0.0024;
      e.castBand.rotation.y=time*0.0018;

      e.halo.scaling.setAll(1+Math.sin(time*0.004+String(actor.id).length)*0.055);
      e.haloMat.alpha=0.13+(cast?0.08:0);

      for(let i=0;i<e.sparks.length;i++){
        const a=time*(0.0017+i*0.00022)+i*Math.PI*2/e.sparks.length;
        const radius=0.22+(i%2)*0.08+(cast?0.05+castProgress*0.07:0);
        e.sparks[i].position.set(
          Math.cos(a)*radius,
          0.72+Math.sin(a*1.7+i)*0.23,
          Math.sin(a)*radius,
        );
        e.sparks[i].scaling.setAll(
          (cast?1.28:0.92)*(i%2?0.82:1.0)
        );
      }

      for(let i=0;i<e.shards.length;i++){
        const a=time*(0.0011+i*0.00016)+i*Math.PI*2/e.shards.length;
        const radius=0.47+(i%2)*0.07+castProgress*0.06;
        const shard=e.shards[i];
        shard.position.set(
          Math.cos(a)*radius,
          0.72+Math.sin(a*1.35+i)*0.18,
          Math.sin(a)*radius,
        );
        shard.rotation.x=time*0.0018+i;
        shard.rotation.y=-time*0.0022+i*0.6;
        shard.scaling.setAll(cast?1.20:0.92);
      }
      e.shardMat.alpha=0.72+(cast?0.18:0);
      e.shardMat.emissiveColor=c3(e.style.core).scale(
        cast?1.54:1.14
      );

      e.nucleus.scaling.setAll(
        0.96+Math.sin(time*0.009+String(actor.id).length)*0.12
        +castProgress*0.28
      );
      e.nucleusMat.emissiveColor=c3("#fffdf3").scale(cast?2.5:1.7);
      e.loopMat.alpha=0.70+(cast?0.20+castPulse*0.08:0);
      e.loopMat.emissiveColor=c3(e.style.energy).scale(cast?2.1:1.38);
      for(let i=0;i<e.heartLoops.length;i++){
        const loop=e.heartLoops[i];
        loop.rotation.x=0.12+i*0.36+Math.sin(time*0.00085+i)*0.17;
        loop.rotation.z=i*0.6+time*(i===0?0.00064:-0.00043);
        loop.scaling.setAll(1+castProgress*0.15+Math.sin(time*0.004+i)*0.045);
      }
      e.glintMat.alpha=0.63+Math.sin(time*0.0026+String(actor.id).length)*0.12
        +(cast?0.06:0);
      for(let i=0;i<e.glassGlints.length;i++){
        e.glassGlints[i].visibility=0.70+Math.sin(time*0.0019+i*1.9)*0.22;
      }
      e.wakeMat.alpha=0.21+(moving?0.13*speed:0.05)
        +(cast?0.12+castPulse*0.09:0);
      e.wakeMat.emissiveColor=c3(e.style.energy).scale(cast?1.65:1.15);
      for(let i=0;i<e.wakes.length;i++){
        const wake=e.wakes[i];
        wake.scaling.x=0.76+(moving?0.35*speed:0)
          +castProgress*0.24;
        wake.rotation.y=Math.sin(time*0.0011+i*2.2)*0.12;
        wake.visibility=0.78+i*0.06;
      }
      for(let i=0;i<e.motes.length;i++){
        const angle=time*(0.00075+i*0.00010)+i*2.39996;
        const r=0.64+(i%3)*0.10+0.09*Math.sin(time*0.0008+i);
        const mote=e.motes[i];
        mote.position.set(
          Math.cos(angle)*r,
          0.72+Math.sin(angle*2.0+i)*0.22,
          Math.sin(angle)*r,
        );
        mote.visibility=0.35+0.40*(0.5+0.5*Math.sin(time*0.004+i));
        mote.scaling.setAll(cast?1.35:0.95);
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
