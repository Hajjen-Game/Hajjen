import { MageOrbWindup } from "./MageOrbWindup.js?v=20261008-mage-bespoke1";

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

function actorSeed(id){
  return String(id||"orb").split("").reduce(
    (sum,ch,index)=>sum+ch.charCodeAt(0)*(index+3),
    17,
  );
}

function castEnergyProfile(spellId="",fallback=DEFAULT_STYLE){
  const id=String(spellId||"").toLowerCase();
  if(/frost|ice/.test(id)){
    return {main:"#5fd8ff",core:"#e7fbff",accent:"#82aaff",mode:"frost"};
  }
  if(/pyro|fire|flame|lava|holy-fire/.test(id)){
    return {main:"#ff6138",core:"#fff0a8",accent:"#ff9b3d",mode:"fire"};
  }
  if(/lightning|storm|thunder/.test(id)){
    return {main:"#56bfff",core:"#eefcff",accent:"#8a7dff",mode:"lightning"};
  }
  if(/mind|shadow|fear|warlock|curse|hex/.test(id)){
    return {main:"#9d63ff",core:"#f1ddff",accent:"#5c3bc4",mode:"shadow"};
  }
  if(/heal|renew|holy|flash|greater|paladin/.test(id)){
    return {main:"#ffe168",core:"#fffdf0",accent:"#f5a7cf",mode:"holy"};
  }
  if(/druid|nature|lifebloom|rejuven|swiftmend/.test(id)){
    return {main:"#74e68b",core:"#efffdc",accent:"#b7d95e",mode:"nature"};
  }
  if(/poison|rogue|garrote|sinister|eviscerate|mutilate/.test(id)){
    return {main:"#d6e94e",core:"#ffffc4",accent:"#75bd53",mode:"poison"};
  }
  if(/warrior|slam|mortal|rend|bloodthirst|overpower/.test(id)){
    return {main:"#ff6655",core:"#fff0dc",accent:"#d73b33",mode:"melee"};
  }
  if(/death|dk|frost-strike/.test(id)){
    return {main:"#72d7e5",core:"#eefcff",accent:"#3f88a2",mode:"rune"};
  }
  return {
    main:fallback.energy,
    core:"#ffffff",
    accent:fallback.core,
    mode:"arcane",
  };
}

function classMotionProfile(classId="",seed=0){
  const base={
    priest:{rate:.70,wobble:.11,segments:3},
    mage:{rate:1.02,wobble:.07,segments:4},
    shaman:{rate:.91,wobble:.15,segments:4},
    warlock:{rate:.78,wobble:.18,segments:3},
    paladin:{rate:.62,wobble:.06,segments:4},
    druid:{rate:.66,wobble:.20,segments:5},
    warrior:{rate:.74,wobble:.09,segments:3},
    rogue:{rate:1.10,wobble:.13,segments:2},
    "death-knight":{rate:.71,wobble:.14,segments:3},
    hunter:{rate:.84,wobble:.10,segments:3},
  }[classId]||{rate:.82,wobble:.12,segments:3};
  return {
    ...base,
    direction:seed%2===0?1:-1,
    phase:(seed%997)*.0137,
  };
}

function createArcSegment(scene,name,radius,span,thickness,material){
  const steps=18;
  const points=[];
  for(let i=0;i<=steps;i++){
    const a=-span*.5+(i/steps)*span;
    points.push(new BABYLON.Vector3(
      Math.cos(a)*radius,
      0,
      Math.sin(a)*radius,
    ));
  }
  const mesh=BABYLON.MeshBuilder.CreateTube(
    name,
    {
      path:points,
      radius:thickness,
      tessellation:6,
      cap:BABYLON.Mesh.CAP_ROUND,
      updatable:false,
    },
    scene,
  );
  mesh.material=material;
  mesh.isPickable=false;
  return mesh;
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
    const seed=actorSeed(actor.id);
    const motion=classMotionProfile(actor.classId,seed);
    const root=new BABYLON.TransformNode("orb-actor:"+actor.id,this.scene);
    const visualRoot=new BABYLON.TransformNode("orb-visual:"+actor.id,this.scene);
    visualRoot.parent=root;
    // Only Mage allocates the bespoke wind-up meshes; other classes stay untouched.
    const mageWindup=actor.classId==="mage"
      ?new MageOrbWindup(this.scene,visualRoot,actor.id)
      :null;

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
      0.22,
      0.70,
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

    const motifArcMat=alphaMaterial(
      this.scene,
      "orb-motif-arc-mat:"+actor.id,
      style.energy,
      0.54,
      1.30,
    );
    motifArcMat.disableLighting=true;
    motifArcMat.needDepthPrePass=false;

    const motifArcs=[];
    const motifCount=Math.max(3,motion.segments);
    for(let i=0;i<motifCount;i++){
      const span=0.62+((seed+i*37)%5)*0.12;
      const radius=0.30+(i%3)*0.085+((seed+i*11)%7)*0.004;
      const arc=createArcSegment(
        this.scene,
        "orb-motif-arc:"+actor.id+":"+i,
        radius,
        span,
        0.008+(i%2)*0.003,
        motifArcMat,
      );
      arc.parent=visualRoot;
      arc.position.y=0.72;
      arc.rotation.x=(i%3)*0.42+0.15;
      arc.rotation.z=(i*1.31+motion.phase)%Math.PI;
      motifArcs.push(arc);
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

    const chargeMat=alphaMaterial(
      this.scene,"orb-cast-charge-mat:"+actor.id,style.energy,0,1.55,
    );
    chargeMat.disableLighting=true;
    chargeMat.needDepthPrePass=false;

    const chargeMotes=[];
    for(let i=0;i<12;i++){
      const mote=BABYLON.MeshBuilder.CreateSphere(
        "orb-cast-charge:"+actor.id+":"+i,
        {diameter:0.025+(i%4)*0.008,segments:7},
        this.scene,
      );
      mote.parent=visualRoot;
      mote.position.y=0.72;
      mote.material=chargeMat;
      mote.isPickable=false;
      mote.visibility=0;
      chargeMotes.push(mote);
    }

    const chargeArcMat=alphaMaterial(
      this.scene,"orb-cast-arc-mat:"+actor.id,style.energy,0,1.65,
    );
    chargeArcMat.disableLighting=true;
    chargeArcMat.needDepthPrePass=false;

    const chargeArcs=[];
    for(let i=0;i<4;i++){
      const arc=createArcSegment(
        this.scene,
        "orb-cast-arc:"+actor.id+":"+i,
        0.74+i*0.10,
        0.72+i*0.13,
        0.009+(i%2)*0.003,
        chargeArcMat,
      );
      arc.parent=visualRoot;
      arc.position.y=0.72;
      arc.rotation.x=0.22+i*0.43;
      arc.rotation.z=i*1.17;
      arc.visibility=0;
      chargeArcs.push(arc);
    }

    const releaseMat=alphaMaterial(
      this.scene,"orb-cast-release-mat:"+actor.id,"#ffffff",0,2.20,
    );
    releaseMat.disableLighting=true;
    const releaseCore=BABYLON.MeshBuilder.CreateSphere(
      "orb-cast-release-core:"+actor.id,
      {diameter:0.18,segments:20},
      this.scene,
    );
    releaseCore.parent=visualRoot;
    releaseCore.position.y=0.72;
    releaseCore.material=releaseMat;
    releaseCore.isPickable=false;
    releaseCore.visibility=0;

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
      style,seed,motion,mageWindup,
      shell,middle,core,energy,plasma,rings,motifArcs,shards,nucleus,heartLoops,glassFace,heartFace,motes,chargeMotes,chargeArcs,releaseCore,halo,castBand,contactShadow,
      sparks,trail,hp,hpBack,barRoot,
      shellMat,middleMat,coreMat,energyMat,plasmaMat,ringMat,motifArcMat,shardMat,nucleusMat,loopMat,glassMat,heartMat,moteMat,chargeMat,chargeArcMat,releaseMat,haloMat,castMat,hpMat,
      ownedMaterials:[
        shellMat,middleMat,coreMat,energyMat,plasmaMat,ringMat,motifArcMat,shardMat,nucleusMat,loopMat,glassMat,heartMat,moteMat,chargeMat,chargeArcMat,releaseMat,haloMat,castMat,
        shadowMat,hpBackMat,hpMat,
      ],
      lastPos:new BABYLON.Vector3(actor.x*this.scale,0.16,actor.y*this.scale),
    };

    this.entries.set(actor.id,entry);
    return entry;
  }

  disposeEntry(entry){
    entry.mageWindup?.dispose();
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
      const spellId=cast?.spellId||"";
      const castProfile=castEnergyProfile(spellId,e.style);
      const mode=cast?castProfile.mode:"idle";
      // Different physical gestures per spell school, not just recolouring
      // identical orbiting rings for every class.
      const modeSpeed={
        frost:.63,fire:1.52,lightning:1.92,
        shadow:-1.13,holy:.53,nature:.77,
        poison:1.35,melee:1.67,rune:.88,
      }[mode]||1;
      const modePressure=cast?({
        frost:-.13,fire:.15,lightning:.07,
        shadow:-.075,holy:.12,nature:.085,
        poison:.045,melee:.095,rune:-.025,
      }[mode]||0)*castProgress:0;
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

      const t=time*0.001;
      const orbitSpeed=e.motion.rate*(cast?modeSpeed*(1.18+castProgress*.85):1);
      for(let i=0;i<e.rings.length;i++){
        const ring=e.rings[i];
        const dir=(i%2===0?1:-1)*e.motion.direction;
        const irregular=
          Math.sin(t*(0.43+i*.17)+e.motion.phase+i)*e.motion.wobble;
        ring.rotation.x=[Math.PI*0.28,Math.PI*0.57,Math.PI*0.14][i]
          +irregular*.55
          +(cast&&mode==="holy"?.10*castProgress:0)
          +(cast&&mode==="lightning"?Math.sin(t*12+i*2.3)*.11:0);
        ring.rotation.y=
          dir*t*orbitSpeed*(0.62+i*.17)
          +Math.sin(t*.23+e.motion.phase+i)*.12;
        ring.rotation.z=[0.18,Math.PI*0.34,-Math.PI*0.22][i]
          +dir*t*(.15+i*.035)
          +Math.sin(t*(.31+i*.07)+i)*.07;
        ring.scaling.setAll(
          .96
          +Math.sin(t*(1.05+i*.31)+e.motion.phase+i)*.025
          +castProgress*.045+modePressure
          +(cast&&mode==="nature"?Math.sin(t*3+i*2)*.045*castProgress:0)
        );
      }
      e.ringMat.alpha=.16+(cast?.11+castPulse*.035:0);
      e.ringMat.emissiveColor=c3(cast?castProfile.accent:e.style.energy).scale(
        cast?1.22:.70
      );

      for(let i=0;i<e.motifArcs.length;i++){
        const arc=e.motifArcs[i];
        const dir=(i%2===0?1:-1)*e.motion.direction;
        const classPhase=e.motion.phase+i*1.73;
        const wobble=
          Math.sin(t*(.47+i*.083)+classPhase)*e.motion.wobble;
        const surge=
          Math.sin(t*(1.1+i*.19)+classPhase)*.035;
        arc.rotation.y=
          dir*t*e.motion.rate*(.74+(i%3)*.18)
          +classPhase
          +wobble
          +(cast&&mode==="shadow"?.21*Math.sin(t*3.1+i):0)
          +(cast&&mode==="lightning"?.15*Math.sin(t*15+i*1.4):0);
        arc.rotation.x=
          .18+(i%3)*.46
          +Math.sin(t*(.29+i*.11)+classPhase)*(.10+e.motion.wobble*.35);
        arc.rotation.z=
          (i*1.31+e.motion.phase)
          +dir*t*(.19+(i%2)*.07)
          +Math.cos(t*.37+classPhase)*.08;
        arc.scaling.setAll(
          1+surge+castProgress*(i%2===0?.05:.02)
          +modePressure*(i%2===0?1:.48)
        );
        arc.visibility=.72+(i%2)*.14;
      }
      e.motifArcMat.alpha=.46+(cast?.10:0);
      e.motifArcMat.emissiveColor=c3(cast?castProfile.main:e.style.energy).scale(
        cast?1.48:1.08
      );

      const bespokeMageCast=e.classId==="mage"
        && (spellId==="mage-frostbolt"||spellId==="mage-pyroblast");
      e.mageWindup?.update(spellId,castProgress,time);
      const castMain=c3(castProfile.main);
      const castCore=c3(castProfile.core);
      const castAccent=c3(castProfile.accent);
      const castLate=cast?Math.max(0,(castProgress-.68)/.32):0;
      // Spell school takes over the Mage core during these two signature casts.
      if(bespokeMageCast){
        e.coreMat.emissiveColor=castMain.scale(1.25+castProgress*.72+castLate*.56);
        e.energyMat.emissiveColor=castMain.scale(.88+castProgress*.53);
        e.plasmaMat.emissiveColor=castMain.scale(.46+castProgress*.37);
        e.motifArcMat.emissiveColor=castAccent.scale(.80+castProgress*.44);
      }

      e.chargeMat.diffuseColor=castMain.scale(.25);
      e.chargeMat.emissiveColor=castMain.scale(1.52);
      e.chargeMat.alpha=cast?.78:0;
      e.chargeArcMat.diffuseColor=castAccent.scale(.20);
      e.chargeArcMat.emissiveColor=castMain.scale(1.62);
      e.chargeArcMat.alpha=cast?.58:0;
      e.releaseMat.diffuseColor=castCore.scale(.35);
      e.releaseMat.emissiveColor=castCore.scale(2.25);
      e.releaseMat.alpha=cast?Math.min(1,castLate*1.18):0;

      for(let i=0;i<e.chargeMotes.length;i++){
        const mote=e.chargeMotes[i];
        if(!cast||bespokeMageCast){
          mote.visibility=0;
          continue;
        }
        const phase=e.motion.phase+i*2.399963;
        const dir=(i%2===0?1:-1)*e.motion.direction;
        const startRadius=.94+(i%4)*.12+((e.seed+i*19)%7)*.015;
        const inward=Math.pow(castProgress,.72);
        let radius=startRadius*(1-inward*.58);
        let angle=
          phase
          +dir*t*(.82+(i%5)*.11)
          +Math.sin(t*(1.30+i*.09)+phase)*(.09+e.motion.wobble*.45);
        let yWave=Math.sin(angle*(1.35+(i%3)*.16)+phase)*(.24-(inward*.08));

        if(castProfile.mode==="lightning"){
          angle+=Math.sin(t*7+i*1.7)*.08;
          radius+=Math.sin(t*11+i)*.035;
          yWave+=Math.sin(t*9+i)*.045;
        }else if(castProfile.mode==="fire"){
          yWave+=Math.sin(t*3.2+i)*.055*(1-inward);
        }else if(castProfile.mode==="holy"){
          angle+=Math.sin(t*.8+i)*.045;
          yWave*=.72;
        }else if(castProfile.mode==="shadow"){
          radius+=Math.sin(t*2.2+i)*.04;
          angle+=Math.sin(t*1.4+i)*.12;
        }else if(castProfile.mode==="nature"){
          yWave+=Math.sin(t*1.7+i*2.1)*.08;
        }

        mote.position.set(
          Math.cos(angle)*radius,
          .72+yWave,
          Math.sin(angle)*radius,
        );
        mote.visibility=.28+castProgress*.72;
        mote.scaling.setAll(.72+castProgress*.72+(i%3)*.08);
      }

      for(let i=0;i<e.chargeArcs.length;i++){
        const arc=e.chargeArcs[i];
        if(!cast||bespokeMageCast){
          arc.visibility=0;
          continue;
        }
        const dir=(i%2===0?1:-1)*e.motion.direction;
        const tighten=1-castProgress*.22;
        const flicker=.78+.22*Math.sin(t*(2.1+i*.37)+e.motion.phase+i);
        arc.visibility=(.20+castProgress*.80)*flicker;
        arc.scaling.setAll(tighten*(1+Math.sin(t*.9+i)*.025));
        arc.rotation.y=
          dir*t*(.92+i*.17)
          +e.motion.phase+i*1.37
          +Math.sin(t*.57+i)*.11;
        arc.rotation.x=
          .18+i*.39
          +Math.sin(t*(.41+i*.08)+i)*.14;
        arc.rotation.z=
          dir*t*(.21+i*.04)
          +Math.cos(t*.33+i)*.09;
      }

      e.releaseCore.visibility=cast&&!bespokeMageCast?castLate:0;
      e.releaseCore.scaling.setAll(
        .55+castLate*2.10+Math.sin(t*15)*castLate*.10
      );

      // Pixi-style build-up: the permanent identity layers tighten and the
      // centre swells only near release instead of looping at one intensity.
      if(cast){
        // Frost visibly condenses; Fire inflates; Holy rises steadily;
        // Shadow folds inward while Lightning flickers asymmetrically.
        e.core.scaling.setAll(
          .92+castProgress*.10+castLate*.42+castPulse*.025
          +modePressure*.55
        );
        e.nucleus.scaling.setAll(
          .92+castProgress*.18+castLate*.65
        );
        e.plasma.scaling.setAll(
          1+castProgress*.08+castLate*.16
        );
      }

      e.castMat.alpha=bespokeMageCast
        ?0.10+castProgress*.14
        :(cast?0.20+castPulse*0.28:0);
      e.castMat.diffuseColor=castMain.scale(.20);
      e.castMat.emissiveColor=castMain.scale(1.18);
      e.castBand.scaling.setAll(.94+castProgress*.18);
      e.castBand.rotation.z=t*(1.4+castProgress*.8)*e.motion.direction;
      e.castBand.rotation.y=-t*(.95+castProgress*.5)*e.motion.direction;

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

      // Keep the final pressure spike! Previously the generic pulse below
      // overwrote the stronger last-32%-of-cast scale calculated above.
      e.nucleus.scaling.setAll(
        0.96+Math.sin(time*0.009+String(actor.id).length)*0.10
        +castProgress*.19+castLate*.62+modePressure*.42
      );
      e.nucleusMat.emissiveColor=c3(cast?castProfile.core:"#fffdf3")
        .scale(cast?2.15:1.7);
      e.loopMat.alpha=0.70+(cast?0.20+castPulse*0.08:0);
      e.loopMat.emissiveColor=c3(cast?castProfile.accent:e.style.energy)
        .scale(cast?1.85:1.38);
      for(let i=0;i<e.heartLoops.length;i++){
        const loop=e.heartLoops[i];
        loop.rotation.x=0.12+i*0.36+Math.sin(time*0.00085+i)*0.17;
        loop.rotation.z=i*.6+time*(i===0?0.00064:-0.00043)
          *(cast?modeSpeed:1);
        loop.scaling.setAll(1+castProgress*.15+modePressure
          +Math.sin(time*.004+i)*.045);
      }
      // Glass remains neutral; only the inner energy adopts the class colour.
      e.glassMat.alpha=0.88+(cast?0.08:0);
      e.heartMat.alpha=0.58+(cast?0.13+castPulse*0.11:0);
      e.heartMat.emissiveColor=c3(cast?castProfile.main:e.style.energy)
        .scale(cast?1.35:1.22);
      e.heartFace.scaling.setAll(
        1+Math.sin(time*0.0047+String(actor.id).length)*0.035
        +castProgress*0.13
      );
      for(let i=0;i<e.motes.length;i++){
        const phase=e.motion.phase+i*2.39996;
        const dir=(i%2===0?1:-1)*e.motion.direction;
        const angle=
          dir*t*(.46+i*.075)
          +phase
          +Math.sin(t*(.29+i*.055)+phase)*(.12+e.motion.wobble);
        const r=
          .54+(i%3)*.050
          +.055*Math.sin(t*(.61+i*.12)+phase);
        const mote=e.motes[i];
        mote.position.set(
          Math.cos(angle)*r,
          .72+Math.sin(angle*(1.55+(i%2)*.22)+phase)*(.14+(i%3)*.03),
          Math.sin(angle)*r,
        );
        mote.visibility=
          .18+.46*(.5+.5*Math.sin(t*(1.15+i*.21)+phase));
        mote.scaling.setAll(
          cast?.90:.72+(i%2)*.12
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
