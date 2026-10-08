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

// One shared, procedural camera-facing glass reflection texture. The actual
// collider/pick target and the lit inner meshes remain true 3D spheres.
// A nearly transparent centre and crisp circular rim are essential at
// gameplay zoom, especially against the black arena floor.
function makeOrbTexture(scene,type){
  const tex=new BABYLON.DynamicTexture(
    "orb-"+type+"-texture",256,scene,false,BABYLON.Texture.BILINEAR_SAMPLINGMODE,
  );
  const ctx=tex.getContext();
  const cx=128,cy=128;
  ctx.clearRect(0,0,256,256);
  if(type==="glass"){
    // Refracted shading only, never an opaque fill over the coloured core.
    let g=ctx.createRadialGradient(105,89,20,128,128,117);
    g.addColorStop(0,"rgba(216,235,255,0.015)");
    g.addColorStop(0.60,"rgba(170,201,230,0.018)");
    g.addColorStop(0.83,"rgba(198,226,250,0.055)");
    g.addColorStop(0.96,"rgba(222,244,255,0.18)");
    g.addColorStop(1,"rgba(228,247,255,0)");
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(cx,cy,116,0,Math.PI*2);
    ctx.fill();

    // Subtle full 360-degree rim to guarantee a readable sphere silhouette.
    const rim=ctx.createLinearGradient(38,35,216,219);
    rim.addColorStop(0,"rgba(247,252,255,0.86)");
    rim.addColorStop(0.38,"rgba(199,224,245,0.41)");
    rim.addColorStop(0.75,"rgba(170,199,224,0.28)");
    rim.addColorStop(1,"rgba(240,251,255,0.66)");
    ctx.lineWidth=4.0;
    ctx.strokeStyle=rim;
    ctx.beginPath();ctx.arc(cx,cy,110,0,Math.PI*2);ctx.stroke();
    ctx.lineWidth=1.35;
    ctx.strokeStyle="rgba(245,253,255,0.46)";
    ctx.beginPath();ctx.arc(cx,cy,105,0,Math.PI*2);ctx.stroke();

    // Two short white studio reflections suggest curved clear glass.
    ctx.save();
    ctx.shadowColor="rgba(224,248,255,0.8)";
    ctx.shadowBlur=7;
    ctx.lineCap="round";
    ctx.lineWidth=6;
    ctx.strokeStyle="rgba(251,253,255,0.94)";
    ctx.beginPath();ctx.arc(cx,cy,108,3.58,4.63);ctx.stroke();
    ctx.lineWidth=3.1;
    ctx.strokeStyle="rgba(241,251,255,0.70)";
    ctx.beginPath();ctx.arc(cx,cy,101,5.36,5.88);ctx.stroke();
    ctx.restore();
    ctx.lineWidth=2.0;
    ctx.strokeStyle="rgba(235,248,255,0.47)";
    ctx.beginPath();ctx.arc(cx,cy,91,2.62,3.17);ctx.stroke();
  }else{
    // Faint diffuse energy surrounding a concentrated 3D nucleus.
    const g=ctx.createRadialGradient(cx,cy,3,cx,cy,116);
    g.addColorStop(0,"rgba(255,255,255,0.66)");
    g.addColorStop(0.20,"rgba(255,255,255,0.42)");
    g.addColorStop(0.48,"rgba(255,255,255,0.14)");
    g.addColorStop(0.76,"rgba(255,255,255,0.035)");
    g.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=g;
    ctx.fillRect(0,0,256,256);
  }
  tex.hasAlpha=true;
  tex.update(false);
  return tex;
}

function makeOrbBillboardMaterial(scene,name,texture,emissiveColor,alpha){
  const mat=new BABYLON.StandardMaterial(name,scene);
  mat.diffuseTexture=texture;
  mat.useAlphaFromDiffuseTexture=true;
  mat.diffuseColor=BABYLON.Color3.Black();
  mat.emissiveTexture=texture;
  mat.emissiveColor=emissiveColor;
  mat.disableLighting=true;
  mat.backFaceCulling=false;
  mat.disableDepthWrite=true;
  mat.alpha=alpha;
  if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined){
    mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
  }
  return mat;
}

export class OrbCharacterRenderer{
  constructor(scene,shadowGenerator,scale){
    this.scene=scene;
    this.shadowGenerator=shadowGenerator;
    this.scale=scale;
    this.entries=new Map();
    this.glassTexture=makeOrbTexture(scene,"glass");
    this.heartTexture=makeOrbTexture(scene,"heart");
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
    shellMat.backFaceCulling=true;

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
    middleMat.needDepthPrePass=false;
    middleMat.backFaceCulling=true;

    const coreMat=alphaMaterial(
      this.scene,
      "orb-core-mat:"+actor.id,
      style.energy,
      0.98,
      1.38,
    );
    coreMat.specularPower=96;
    coreMat.needDepthPrePass=false;
    coreMat.backFaceCulling=true;
    coreMat.diffuseColor=c3(style.core).scale(0.20);

    const shell=BABYLON.MeshBuilder.CreateSphere(
      "orb-shell:"+actor.id,
      {diameter:1.24,segments:48},
      this.scene,
    );
    shell.parent=visualRoot;
    shell.position.y=0.72;
    shell.material=shellMat;
    shell.metadata={actorId:actor.id,orbPart:"shell"};
    shell.isPickable=true;

    const middle=BABYLON.MeshBuilder.CreateSphere(
      "orb-middle:"+actor.id,
      {diameter:0.89,segments:40},
      this.scene,
    );
    middle.parent=visualRoot;
    middle.position.y=0.72;
    middle.material=middleMat;
    middle.metadata={actorId:actor.id,orbPart:"middle"};
    middle.isPickable=true;

    const core=BABYLON.MeshBuilder.CreateSphere(
      "orb-core:"+actor.id,
      {diameter:0.35,segments:32},
      this.scene,
    );
    core.parent=visualRoot;
    core.position.y=0.72;
    core.scaling.setAll(1);
    core.material=coreMat;
    core.metadata={actorId:actor.id,orbPart:"core"};
    core.isPickable=true;
    // Internal energy must not cast hard-edged shadows across its own glass.

    const energyMat=alphaMaterial(
      this.scene,
      "orb-energy-mat:"+actor.id,
      style.core,
      0.42,
      1.05,
    );
    energyMat.disableLighting=true;
    energyMat.backFaceCulling=true;
    energyMat.needDepthPrePass=false;

    const energy=BABYLON.MeshBuilder.CreateSphere(
      "orb-energy:"+actor.id,
      {diameter:0.52,segments:32},
      this.scene,
    );
    energy.parent=visualRoot;
    energy.position.y=0.72;
    energy.scaling.setAll(1);
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
      {diameter:0.76,segments:36},
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
      {diameter:0.94,thickness:0.010,rx:Math.PI*0.28,rz:0.18},
      {diameter:0.76,thickness:0.013,rx:Math.PI*0.57,rz:Math.PI*0.34},
      {diameter:0.53,thickness:0.012,rx:Math.PI*0.14,rz:-Math.PI*0.22},
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
      0.50,
      0.85,
    );
    shardMat.disableLighting=true;

    const shards=[];
    for(let i=0;i<4;i++){
      const shard=BABYLON.MeshBuilder.CreatePolyhedron(
        "orb-shard:"+actor.id+":"+i,
        {type:1,size:0.026+(i%2)*0.010},
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
      {diameter:0.12,segments:24},
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

    // Camera-facing reflections restore the spherical outline at any angle.
    const glassMat=makeOrbBillboardMaterial(
      this.scene,"orb-glass-face-mat:"+actor.id,
      this.glassTexture,new BABYLON.Color3(0.75,0.87,1.0),0.95,
    );
    const glassFace=BABYLON.MeshBuilder.CreatePlane(
      "orb-glass-face:"+actor.id,
      {size:1.31,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      this.scene,
    );
    glassFace.parent=visualRoot;
    glassFace.position.y=0.72;
    glassFace.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
    glassFace.material=glassMat;
    glassFace.alphaIndex=12;
    glassFace.isPickable=false;

    const heartMat=makeOrbBillboardMaterial(
      this.scene,"orb-heart-face-mat:"+actor.id,
      this.heartTexture,c3(style.energy).scale(1.22),0.66,
    );
    const heartFace=BABYLON.MeshBuilder.CreatePlane(
      "orb-heart-face:"+actor.id,
      {size:0.95,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      this.scene,
    );
    heartFace.parent=visualRoot;
    heartFace.position.y=0.72;
    heartFace.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
    heartFace.material=heartMat;
    heartFace.alphaIndex=8;
    heartFace.isPickable=false;

    const moteMat=alphaMaterial(
      this.scene,"orb-mote-mat:"+actor.id,style.energy,0.72,1.25,
    );
    moteMat.disableLighting=true;
    const motes=[];
    for(let i=0;i<5;i++){
      const mote=BABYLON.MeshBuilder.CreateSphere(
        "orb-mote:"+actor.id+":"+i,
        {diameter:0.013+(i%3)*0.009,segments:10},
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

    // Do not duplicate the entire sphere behind moving actors; it reads as
    // multiple flat crystals at arena distance rather than subtle motion.
    const trail=[];

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
      shell,middle,core,energy,plasma,rings,shards,nucleus,heartLoops,glassFace,heartFace,motes,halo,castBand,contactShadow,
      sparks,trail,hp,hpBack,barRoot,
      shellMat,middleMat,coreMat,energyMat,plasmaMat,ringMat,shardMat,nucleusMat,loopMat,glassMat,heartMat,moteMat,haloMat,castMat,hpMat,
      ownedMaterials:[
        shellMat,middleMat,coreMat,energyMat,plasmaMat,ringMat,shardMat,nucleusMat,loopMat,glassMat,heartMat,moteMat,haloMat,castMat,
        shadowMat,hpBackMat,hpMat,
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

      // Preserve a spherical outline both while running and while idle.
      const breathe=1+Math.sin(time*0.0034+String(actor.id).length)*0.014;
      e.visualRoot.scaling.setAll(breathe);

      const cast=actor.cast;
      const castProgress=cast
        ?1-Math.max(0,cast.remainingMs)/Math.max(1,cast.totalMs)
        :0;
      const castPulse=cast
        ?0.5+0.5*Math.sin(time*0.024)
        :0;

      e.core.scaling.setAll(
        0.96+castProgress*0.12+castPulse*0.045
      );

      const energyPulse=1+Math.sin(time*0.010+String(actor.id).length)*0.12;
      e.energy.scaling.setAll(
        (0.96+energyPulse*0.045)*(1+castProgress*0.10)
      );
      e.energy.rotation.x=time*0.0017;
      e.energy.rotation.y=-time*0.0024;
      e.energy.rotation.z=time*0.0011;

      e.middle.scaling.setAll(1.0+castProgress*0.04);
      e.shellMat.alpha=0.22+(cast?0.035+castPulse*0.015:0);
      e.middleMat.alpha=0.06+(cast?0.012:0);
      e.coreMat.emissiveColor=c3(e.style.energy).scale(
        cast?1.72:1.28
      );
      e.energyMat.emissiveColor=c3(e.style.core).scale(
        cast?1.45:1.08
      );
      e.energyMat.alpha=0.15+(cast?0.07+castPulse*0.03:0);

      const plasmaPulse=1+Math.sin(time*0.0067+String(actor.id).length)*0.08;
      e.plasma.scaling.setAll(
        plasmaPulse*(1+castProgress*0.13+castPulse*0.04)
      );
      e.plasmaMat.alpha=0.075+(cast?0.05+castPulse*0.035:0);
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
        const radius=0.50+(i%2)*0.045+castProgress*0.03;
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
      e.shardMat.alpha=0.48+(cast?0.20:0);
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
      // Glass remains neutral; only the inner energy adopts the class colour.
      e.glassMat.alpha=0.88+(cast?0.08:0);
      e.heartMat.alpha=0.58+(cast?0.13+castPulse*0.11:0);
      e.heartFace.scaling.setAll(
        1+Math.sin(time*0.0047+String(actor.id).length)*0.035
        +castProgress*0.13
      );
      for(let i=0;i<e.motes.length;i++){
        const angle=time*(0.00075+i*0.00010)+i*2.39996;
        const r=0.60+(i%3)*0.045+0.05*Math.sin(time*0.0008+i);
        const mote=e.motes[i];
        mote.position.set(
          Math.cos(angle)*r,
          0.72+Math.sin(angle*2.0+i)*0.22,
          Math.sin(angle)*r,
        );
        mote.visibility=0.35+0.40*(0.5+0.5*Math.sin(time*0.004+i));
        mote.scaling.setAll(cast?1.35:0.95);
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
