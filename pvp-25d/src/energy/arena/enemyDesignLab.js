// Enemy & Boss Design Lab 1.4 — Shard-matched glass and visible living interiors.
// No imports from EnergyMatch, no mutation of Planet Defense, saves or AI.
// All forms, glow volumes and animation passes are authored as real 3D meshes.
const $=id=>document.getElementById(id);
const clamp=(x,min=0,max=1)=>Math.min(max,Math.max(min,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const V=(x=0,y=0,z=0)=>new BABYLON.Vector3(x,y,z);
const color=hex=>BABYLON.Color3.FromHexString(hex);

const CONCEPTS=Object.freeze({
  shard:{
    name:"RIFT SHARD",
    caption:"A nervous, splintered energy predator",
    role:"Small skirmisher / swarm pressure.",
    form:"Long, asymmetric crystal point surrounded by orbiting living fragments.",
    attack:"Contracts its fragments, then lunges forward in a sharp burst.",
    risk:"Does it read as a living creature instead of a floating crystal pickup?",
    shell:"#9974c7",edge:"#d3b8f7",glow:"#f0a4fa",energy:"#b375e9",
  },
  channeler:{
    name:"RIFT CHANNELER",
    caption:"An ancient rune engine held together by energy",
    role:"Caster / high-priority channel interrupt.",
    form:"Open structure: clean floating crystal fins, a contained vertical core and counter-rotating rings.",
    attack:"Runes converge, rings align and energy discharges in a broad pulse.",
    risk:"Are its rings legible at real arena zoom, or too similar to a player orb?",
    shell:"#44799b",edge:"#a2e9f8",glow:"#8be9fa",energy:"#79b8e7",
  },
  bulwark:{
    name:"RIFT BULWARK",
    caption:"A broad, unyielding crystalline guardian",
    role:"Tank / area denial / telegraphed heavy slam.",
    form:"Broad separated crystal shoulders protecting an exposed internal reactor. No round front shield.",
    attack:"Side armour braces inward, then the entire heavy frame slams forward.",
    risk:"Does it feel heavy without becoming an unreadable collection of chunks?",
    shell:"#826c9b",edge:"#ffc4a3",glow:"#ffc28c",energy:"#d48cba",
  },
});

function material(scene,name,hex,emission=0,alpha=1){
  const mat=new BABYLON.StandardMaterial(name,scene);
  const c=color(hex);
  mat.diffuseColor=c.scale(emission>0?.33:.68);
  mat.emissiveColor=c.scale(emission);
  mat.specularColor=color("#d4edff").scale(.56);
  mat.specularPower=100;
  mat.backFaceCulling=false;
  mat.alpha=alpha;
  if(alpha<1){
    mat.needDepthPrePass=true;
    if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
      mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
  }
  return mat;
}
// All three now use Shard's precise glass/edge formula. Their energy
// identity comes from light and *inside* geometry, not an opaque face fill.
const MATERIAL_BALANCE=Object.freeze({
  shard:     {shell:.39,face:.48,glass:.22,faceFill:0,shellGlow:.09,faceGlow:.16,coreGlow:.67,heartGlow:.45,plasmaGlow:.48},
  channeler: {shell:.39,face:.48,glass:.22,faceFill:0,shellGlow:.09,faceGlow:.16,coreGlow:1.02,heartGlow:.76,plasmaGlow:.92},
  bulwark:   {shell:.39,face:.48,glass:.22,faceFill:0,shellGlow:.09,faceGlow:.16,coreGlow:1.06,heartGlow:.80,plasmaGlow:.96},
});
function glassMaterial(scene,name,hex,alpha,emission=.12,faceFill=0){
  const mat=material(scene,name,hex,emission,alpha);
  mat._glassAlpha=alpha;
  mat._glassEmissive=emission;
  // Higher-opacity creatures also receive more diffuse front-face color,
  // not only bright edges. Preserve clean transparent surfaces on Shard.
  mat.diffuseColor=color(hex).scale(.33+faceFill*.20);
  if(BABYLON.FresnelParameters){
    const rim=new BABYLON.FresnelParameters();
    rim.bias=.10;rim.power=2.7;
    rim.leftColor=new BABYLON.Color3(.95,.97,1);
    rim.rightColor=new BABYLON.Color3(faceFill,faceFill,faceFill);
    const light=new BABYLON.FresnelParameters();
    light.bias=.015;light.power=4;
    light.leftColor=color(hex).scale(.36);
    light.rightColor=BABYLON.Color3.Black();
    mat._glassOpacityFresnel=rim;
    mat._glassEmissiveFresnel=light;
    mat.opacityFresnelParameters=rim;
    mat.emissiveFresnelParameters=light;
  }
  return mat;
}
function shape(scene,kind,name,options,parent,mat){
  const mesh=BABYLON.MeshBuilder[kind](name,options,scene);
  mesh.parent=parent;
  mesh.material=mat;
  mesh.isPickable=false;
  return mesh;
}
function torus(scene,name,parent,mat,diameter,thickness=.045){
  return shape(scene,"CreateTorus",name,{diameter,thickness,tessellation:52},parent,mat);
}
function crystal(scene,name,parent,mat,h=1.1,w=.42,sides=5){
  const top=shape(scene,"CreateCylinder",name+"-up",{
    height:h*.68,diameterTop:0,diameterBottom:w*2,tessellation:sides,
  },parent,mat);
  top.position.y=h*.16;
  const bottom=shape(scene,"CreateCylinder",name+"-down",{
    height:h*.42,diameterTop:w*2,diameterBottom:0,tessellation:sides,
  },parent,mat);
  bottom.position.y=-h*.38;
  return {top,bottom};
}
function line(scene,name,parent,mat,points,radius=.027){
  return shape(scene,"CreateTube",name,{path:points,radius,tessellation:6},parent,mat);
}
function createUnit(scene,key){
  const p=CONCEPTS[key];
  const root=new BABYLON.TransformNode("research-"+key,scene);
  const body=new BABYLON.TransformNode(key+"-body",scene);
  body.parent=root;body.position.y=1.75;
  const orbit=new BABYLON.TransformNode(key+"-orbit",scene);
  orbit.parent=body;
  const accent=new BABYLON.TransformNode(key+"-accent",scene);
  accent.parent=body;
  const armor=new BABYLON.TransformNode(key+"-armor",scene);
  armor.parent=body;
  const balance=MATERIAL_BALANCE[key];
  const mats={
    shell:glassMaterial(scene,key+"-shell",p.shell,
      balance.shell,balance.shellGlow,balance.faceFill),
    face:glassMaterial(scene,key+"-facet",p.edge,
      balance.face,balance.faceGlow,balance.faceFill),
    trim:material(scene,key+"-trim",p.edge,.62,.78),
    energy:material(scene,key+"-energy",p.glow,1.20,key==="shard"?.72:.83),
    haze:material(scene,key+"-haze",p.energy,.42,.13),
    rune:material(scene,key+"-runes",p.glow,1.02,.93),
    glass:glassMaterial(scene,key+"-glass",p.edge,balance.glass,
      .24,balance.faceFill*.75),
    plasma:material(scene,key+"-inner-plasma",p.energy,
      balance.plasmaGlow,key==="shard"?.19:.37),
    heart:material(scene,key+"-heart",
      key==="channeler"?"#e2faff":key==="bulwark"?"#ffead9":"#ffedf9",
      key==="shard"?.75:1.10,key==="shard"?.78:.96),
    trace:material(scene,key+"-tracers",p.glow,
      key==="shard"?.70:.95,key==="shard"?.75:.90),
  };
  const ground=torus(scene,key+"-ground",root,mats.haze,2.95,.047);
  ground.position.y=.085;
  const groundInner=torus(scene,key+"-ground-inner",root,mats.trim,1.93,.023);
  groundInner.position.y=.093;groundInner.material=material(scene,key+"-ground-ink",p.edge,.32,.36);
  const groundPulse=torus(scene,key+"-impact-wave",root,mats.energy,2.4,.095);
  groundPulse.position.set(0,.13,0);
  groundPulse.setEnabled(false);
  const energyFlash=shape(scene,"CreateSphere",key+"-flash",{
    diameter:1.3,segments:20},body,mats.energy);
  energyFlash.setEnabled(false);
  const particles=[];
  const satellites=[];
  const glyphs=[];
  let core=null;
  const unit={key,p,root,body,orbit,accent,armor,mats,ground,groundInner,
    groundPulse,energyFlash,particles,satellites,glyphs,core:null,
    coreBaseScale:null,inner:null,bossExtras:[],balance,
    color:p.glow,phaseOffset:{shard:.7,channeler:2.2,bulwark:3.8}[key]};
  if(key==="shard"){
    // The hero is a perfect sphere; this predator is deliberately very tall,
    // fractured and asymmetrical. All orbital shards have their own 3D depth.
    const spear=crystal(scene,"shard-chassis",body,mats.shell,2.7,.72,5);
    spear.top.rotation.y=.22;spear.bottom.rotation.y=.22;
    const rib=crystal(scene,"shard-bright-spine",body,mats.face,1.65,.25,5);
    rib.top.position.z=-.23;rib.bottom.position.z=-.23;
    core=shape(scene,"CreateIcoSphere","shard-reactor",{radius:.53,subdivisions:2},body,mats.energy);
    core.position.y=-.2;
    const mist=shape(scene,"CreateSphere","shard-reactor-glass",{diameter:1.32,segments:18},
      body,mats.glass);mist.position.y=-.2;
    const innerFlare=shape(scene,"CreateIcoSphere","shard-internal-thorn",{
      radius:.73,subdivisions:1},body,mats.plasma);
    innerFlare.scaling.set(.5,1.4,.55);innerFlare.position.y=-.13;
    for(let i=0;i<3;i++){
      const side=i%2===0?-1:1;
      const barb=crystal(scene,"shard-barb-"+i,body,i===2?mats.trim:mats.face,
        i===2?1.18:1.02,.23,4);
      const x=side*(.68+i*.15),y=i===2?.38:-.43,z=i===1?.22:-.12;
      for(const part of [barb.top,barb.bottom]){
        part.position.x=x;part.position.y+=y;part.position.z=z;
        part.rotation.z=side*(.42+i*.12);
      }
    }
    for(let i=0;i<7;i++){
      const angle=i*Math.PI*2/7;
      const holder=new BABYLON.TransformNode("shard-fragment-holder-"+i,scene);
      holder.parent=orbit;
      const shard=crystal(scene,"shard-satellite-"+i,holder,
        i%3===0?mats.trim:mats.glass,.37+(i%3)*.16,.12+i%2*.035,4);
      const r=1.16+.18*(i%3);
      const baseY=Math.sin(angle*2)*.5;
      holder.position.set(Math.cos(angle)*r,baseY,Math.sin(angle)*r);
      holder.rotation.z=-.45;holder.rotation.y=angle;
      satellites.push({node:holder,baseY,index:i,angle});
      particles.push(holder);
    }
    const arc=torus(scene,"shard-crooked-halo",accent,mats.glass,2.72,.035);
    arc.rotation.x=.72;arc.rotation.z=.33;
    const arc2=torus(scene,"shard-second-halo",accent,mats.trim,2.0,.025);
    arc2.rotation.x=-.46;arc2.rotation.z=.63;
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      line(scene,"shard-core-vein-"+i,body,mats.rune,[
        V(Math.cos(a)*.32,-.85,Math.sin(a)*.30),
        V(Math.cos(a+.14)*.49,-.1,Math.sin(a+.14)*.42),
        V(Math.cos(a+.22)*.12,.56,Math.sin(a+.22)*.15),
      ],.019);
    }
  }else if(key==="channeler"){
    const tower=shape(scene,"CreatePolyhedron","channeler-spindle",{type:1,size:1.15},body,mats.shell);
    tower.scaling.set(.63,1.34,.61);
    // Keep luminous matter *inside* the spindle even at peak wind-up.
    // In 1.1 the glass volume plus glowing reactor filled the whole frame
    // and bloomed beyond its silhouette.
    const reactor=shape(scene,"CreateIcoSphere","channeler-reactor",{radius:.47,subdivisions:3},
      body,mats.energy);
    // Only a little wider/brighter: it must remain inside the tall spindle.
    reactor.scaling.set(.68,1.05,.70);core=reactor;
    const haze=shape(scene,"CreateSphere","channeler-field",{diameter:1.33,segments:24},body,mats.glass);
    haze.scaling.set(.70,1.00,.70);
    const conduit=shape(scene,"CreateCylinder","channeler-light-conduit",{
      height:1.43,diameter:.125,tessellation:10},body,mats.plasma);
    conduit.position.y=.02;
    const conduitTop=shape(scene,"CreateSphere","channeler-throat",{
      diameter:.15,segments:12},body,mats.heart);
    conduitTop.position.y=.52;
    const top=crystal(scene,"channeler-top-spire",body,mats.face,1.15,.36,6);
    const bottom=crystal(scene,"channeler-bottom-spire",body,mats.trim,1.0,.29,6);
    for(const part of [top.top,top.bottom])part.position.y+=1.13;
    for(const part of [bottom.top,bottom.bottom])part.position.y-=1.22;
    const outer=torus(scene,"channeler-horizontal-mandala",orbit,mats.trim,3.35,.047);
    outer.rotation.x=.32;
    const vertical=torus(scene,"channeler-vertical-mandala",accent,mats.glass,3.55,.061);
    vertical.rotation.z=Math.PI/2.2;
    const secondary=torus(scene,"channeler-second-mandala",accent,mats.rune,2.37,.029);
    secondary.rotation.x=.8;
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,r=1.52;
      const holder=new BABYLON.TransformNode("channeler-glyph-"+i,scene);
      holder.parent=orbit;
      holder.position.set(Math.cos(a)*r,Math.sin(a*2)*.38,Math.sin(a)*r);
      holder.rotation.y=-a;
      // No runes, dots or pictogram-like markings: these are natural
      // translucent energy fins rather than rotating UI icons.
      const fin=shape(scene,"CreateBox","channeler-clear-fin-"+i,{
        width:.29,height:.59,depth:.085},holder,mats.glass);
      fin.rotation.z=i%2?.16:-.16;
      fin.rotation.y=(i%3-1)*.18;
      particles.push(holder);
      glyphs.push({node:holder,index:i,x:Math.cos(a)*r,
        y:Math.sin(a*2)*.38,z:Math.sin(a)*r});
      line(scene,"channeler-tether-"+i,body,mats.haze,[
        V(Math.cos(a)*.38,-.10,Math.sin(a)*.38),
        V(Math.cos(a)*.92,Math.sin(a*3)*.14,Math.sin(a)*.92),
      ],.033);
    }
    const base=torus(scene,"channeler-lower-sigil",body,mats.rune,1.9,.032);
    base.position.y=-1.55;
  }else{
    // The Bulwark is a broad horizontal armour silhouette, nothing like the
    // spindle or shard. Separated plates expose the animated central engine.
    const chassis=shape(scene,"CreatePolyhedron","bulwark-chassis",{type:1,size:1.36},body,mats.shell);
    chassis.scaling.set(1.05,.92,.96);
    const prism=shape(scene,"CreateBox","bulwark-central-casing",{
      width:1.10,height:1.14,depth:1.25},body,mats.glass);
    prism.rotation.y=Math.PI/4;
    const innerHeart=shape(scene,"CreateIcoSphere","bulwark-broad-reactor",{
      radius:.77,subdivisions:2},body,mats.plasma);
    innerHeart.scaling.set(1.12,.81,1.07);
    // Let the living reactor read through the frontal crystal facet.
    innerHeart.position.x=-.20;
    // A narrow angular visor frames the power source without a disk or ring.
    const upperRidge=shape(scene,"CreateBox","bulwark-reactor-brow",{
      width:.25,height:.10,depth:1.06},body,mats.trim);
    upperRidge.position.set(-.94,.45,0);
    core=shape(scene,"CreateIcoSphere","bulwark-reactor",{
      radius:.67,subdivisions:2},body,mats.energy);
    core.position.x=-.48;core.scaling.set(.8,.86,.9);
    const windowpane=shape(scene,"CreatePolyhedron","bulwark-reactor-window",{
      type:1,size:.66},body,mats.glass);
    windowpane.position.x=-.95;
    for(const side of [-1,1]){
      const pa=shape(scene,"CreatePolyhedron","bulwark-shoulder-"+side,{
        type:1,size:.85},armor,mats.shell);
      pa.position.set(.03,.12,side*1.1);
      pa.scaling.set(.76,1.0,.8);
      const shoulderTip=crystal(scene,"bulwark-spine-"+side,armor,mats.face,.58,.25,4);
      for(const part of [shoulderTip.top,shoulderTip.bottom]){
        part.position.z=side*1.30;part.position.y+=.70;part.rotation.z=side*.26;
      }
      const plate=shape(scene,"CreateBox","bulwark-flank-"+side,{
        width:.61,height:1.19,depth:.67},armor,mats.face);
      plate.position.set(-.36,-.45,side*1.05);
      plate.rotation.x=side*.16;
      const band=shape(scene,"CreateBox","bulwark-energy-band-"+side,{
        width:.085,height:.65,depth:.47},armor,mats.trim);
      band.position.set(-.70,-.38,side*1.06);
      // Cleaner frontal plate gaps instead of extra polygonal fins.
      // Exposed luminous seams keep the large plates legible through glass.
      line(scene,"bulwark-plate-seam-"+side,armor,mats.trace,[
        V(-.69,-.84,side*.88),V(-.79,-.2,side*1.17),
        V(-.36,.31,side*1.32),V(.15,.58,side*.96),
      ],.030);
    }
    // No circular shield, orbital guard hoop or shield nails. The shoulder
    // plates themselves telegraph Bulwark's defensive brace.
    const weight=torus(scene,"bulwark-lower-field",body,mats.trim,2.15,.050);
    weight.position.y=-1.12;
    weight.rotation.x=.17;
  }
  unit.core=core;
  // Preserve the reactor's custom aspect ratio when it pulses. The old
  // setAll() accidentally made the Channeler reactor round after one frame.
  unit.coreBaseScale=core?.scaling.clone()||V(1,1,1);
  // Shared Energy Arena visual language: layered *internal* plasma, a bright
  // heartbeat and independent luminous gyres — NOT an opaque orb skin.
  // Each creature keeps its distinct external silhouette.
  const inner=new BABYLON.TransformNode(key+"-living-interior",scene);
  inner.parent=body;
  inner.position.copyFrom(key==="shard"?V(0,-.20,0):
    key==="bulwark"?V(-.18,0,0):V(0,0,0));
  const plasma=shape(scene,"CreateSphere",key+"-interior-cloud",{
    diameter:key==="bulwark"?1.40:key==="channeler"?.87:1.08,segments:18},inner,mats.plasma);
  plasma.scaling.set(key==="channeler"?.70:1.1,
    key==="channeler"?1.08:.82,key==="channeler"?.67:.89);
  const heart=shape(scene,"CreateIcoSphere",key+"-living-heart",{
    radius:key==="bulwark"?.26:.21,subdivisions:2},inner,mats.heart);
  heart.scaling.set(1.05,1.12,1);
  const innerOrbit=new BABYLON.TransformNode(key+"-inner-gyres",scene);
  innerOrbit.parent=inner;
  for(let i=0;i<3;i++){
    const gyre=torus(scene,key+"-inner-gyre-"+i,innerOrbit,mats.trace,
      (key==="bulwark"?1.25:key==="channeler"?.65:1.0)+
      i*(key==="channeler"?.10:.19),key==="shard"?.022+i*.002:.031+i*.003);
    gyre.rotation.set(i*.87+.18,i*.66,i*.85+.25);
    if(key==="channeler")gyre.scaling.y=1.15;
  }
  for(let i=0;i<5;i++){
    const angle=i*Math.PI*2/5;
    const mote=shape(scene,"CreateSphere",key+"-internal-mote-"+i,{
      diameter:(i%2?.10:.14)*(key==="shard"?1:1.22),segments:8},innerOrbit,mats.heart);
    const moteRange=key==="channeler"?.57:1;
    mote.position.set(Math.cos(angle)*(.35+i*.038)*moteRange,
      Math.sin(angle*1.7)*.38*moteRange,
      Math.sin(angle)*(.38+i*.024)*moteRange);
  }
  // Animated energy currents have the same layered-depth principle as Shard,
  // but each path fits *inside* its creature. They are visible from multiple
  // camera angles and rotate around the contained heart during idle/casting.
  if(key!=="shard"){
    for(let i=0;i<4;i++){
      const angle=i*Math.PI/2;
      const radial=key==="channeler"?.23:.47;
      const height=key==="channeler"?.51:.34;
      const path=[
        V(Math.cos(angle)*radial,-height,Math.sin(angle)*radial),
        V(Math.cos(angle+.42)*radial*.80,-height*.36,
          Math.sin(angle+.42)*radial*.80),
        V(Math.cos(angle+.82)*radial*.89,height*.42,
          Math.sin(angle+.82)*radial*.89),
        V(Math.cos(angle+1.14)*radial*.62,height,
          Math.sin(angle+1.14)*radial*.62),
      ];
      line(scene,key+"-internal-current-"+i,innerOrbit,mats.trace,path,.028);
    }
  }
  unit.inner={node:inner,heart,plasma,plasmaBaseScale:plasma.scaling.clone(),innerOrbit};
  // Independent boss silhouette exploration. Enlarges and adds overhead
  // energy architecture, but makes NO claim this is a production boss.
  const crown=new BABYLON.TransformNode(key+"-boss-crown",scene);
  crown.parent=body;crown.position.y=key==="bulwark"?1.4:1.65;
  const halo=torus(scene,key+"-boss-halo",crown,mats.trim,
    key==="bulwark"?3.9:3.25,.055);
  halo.rotation.x=key==="channeler"?.55:.2;
  const upper=crystal(scene,key+"-boss-thorn",crown,mats.face,.95,.30,5);
  for(const part of [upper.top,upper.bottom])part.position.y+=.38;
  unit.bossExtras.push(crown);
  crown.setEnabled(false);
  return unit;
}

class EnemyShowroom{
  constructor(canvas){
    if(!window.BABYLON)throw new Error("Babylon.js failed to load.");
    this.canvas=canvas;
    this.engine=new BABYLON.Engine(canvas,true,{antialias:true,stencil:true});
    this.scene=new BABYLON.Scene(this.engine);
    this.scene.clearColor=BABYLON.Color4.FromHexString("#080f1fff");
    this.scene.ambientColor=color("#51627f");
    this.scene.imageProcessingConfiguration.contrast=1.12;
    this.scene.imageProcessingConfiguration.exposure=.88;
    this.camera=new BABYLON.ArcRotateCamera("research-camera",
      -Math.PI*.62,1.18,9.6,V(0,1.5,0),this.scene);
    this.camera.lowerRadiusLimit=5.2;
    this.camera.upperRadiusLimit=28;
    this.camera.lowerBetaLimit=.38;
    this.camera.upperBetaLimit=1.46;
    this.camera.wheelPrecision=47;
    this.camera.panningSensibility=0;
    this.camera.attachControl(canvas,true);
    const ambient=new BABYLON.HemisphericLight("soft-sky",V(.3,1,.2),this.scene);
    ambient.diffuse=color("#bacde8");ambient.groundColor=color("#35324f");
    ambient.intensity=.68;
    const keyLight=new BABYLON.DirectionalLight("face-light",V(.65,-1,.42),this.scene);
    keyLight.diffuse=color("#a7c7e7");keyLight.intensity=.84;
    const edgeLight=new BABYLON.PointLight("edge-light",V(3.4,5.8,-4),this.scene);
    // The previous point light left a distracting white patch on the floor.
    edgeLight.diffuse=color("#9172bf");edgeLight.intensity=1.15;
    edgeLight.range=11;
    this.groundMaterial=material(this.scene,"research-floor","#141d30",.03);
    this.floor=shape(this.scene,"CreateGround","research-platform",{
      width:28,height:19,subdivisions:2},null,this.groundMaterial);
    this.floor.position.y=-.055;
    this.gridMaterial=material(this.scene,"research-grid","#567394",.13,.30);
    for(let x=-12;x<=12;x+=2){
      line(this.scene,"floor-east-"+x,null,this.gridMaterial,
        [V(x,-.045,-8),V(x,-.045,8)],.008);
    }
    for(let z=-8;z<=8;z+=2){
      line(this.scene,"floor-north-"+z,null,this.gridMaterial,
        [V(-12,-.045,z),V(12,-.045,z)],.008);
    }
    this.glow=new BABYLON.GlowLayer("research-emission",this.scene,{
      blurKernelSize:42});
    this.glow.intensity=.50;
    this.units={
      shard:createUnit(this.scene,"shard"),
      channeler:createUnit(this.scene,"channeler"),
      bulwark:createUnit(this.scene,"bulwark"),
    };
    this.selected="shard";
    this.compare=false;this.gameplay=false;this.boss=false;this.light=false;
    this.glass=true;
    this.paused=false;this.repeat=false;this.cue="idle";
    this.elapsed=0;this.cueAt=0;this.lastFrame=performance.now();
    this.setLayout();
    this.resize=()=>this.engine.resize();
    window.addEventListener("resize",this.resize);
    this.engine.resize();
    this.frame=()=>{
      try{
        const now=performance.now(),dt=clamp((now-this.lastFrame)/1000,0,.06);
        this.lastFrame=now;
        if(!this.paused)this.update(dt);
        this.scene.render();
      }catch(error){
        this.engine.stopRenderLoop();
        const host=$("lab-error");
        host.hidden=false;host.textContent="Enemy lab rendering error: "+
          (error?.message||String(error));
        console.error(error);
      }
    };
    this.engine.runRenderLoop(this.frame);
  }
  setLayout(){
    const keys=Object.keys(this.units);
    const scale=(this.gameplay?.63:1)*(this.boss?1.50:1);
    for(const [index,key] of keys.entries()){
      const u=this.units[key];
      u.root.setEnabled(this.compare||key===this.selected);
      u.root.position.set(this.compare?(index-1)*4.65:0,0,0);
      u.root.scaling.setAll(scale);
      for(const extra of u.bossExtras)extra.setEnabled(this.boss);
    }
    this.camera.target.copyFrom(V(0,1.63*scale,0));
    // Symmetrical comparison: perspective should not turn the nearest model
    // into a giant while the third model disappears near the far edge.
    this.camera.alpha=this.compare?-Math.PI/2:-Math.PI*.62;
    this.camera.beta=this.compare?1.15:1.18;
    this.camera.radius=this.compare?(this.gameplay?17.6:18.2)*(this.boss?1.20:1):
      (this.gameplay?10.9:8.4)*(this.boss?1.22:1);
    $("comparison-labels").hidden=!this.compare;
    $("stage-title").textContent=this.compare?"THREE RIFT SILHOUETTES":CONCEPTS[this.selected].name;
    $("stage-subtitle").textContent=this.compare?
      "One scene · same scale · identical lighting":CONCEPTS[this.selected].caption;
  }
  setLighting(bright){
    this.light=bright;
    this.scene.clearColor=BABYLON.Color4.FromHexString(bright?"#25334bff":"#080f1fff");
    this.groundMaterial.diffuseColor=color(bright?"#536477":"#141d30");
    this.groundMaterial.emissiveColor=color(bright?"#26354d":"#080e1b").scale(.3);
    this.glow.intensity=bright?.36:.50;
  }
  setGlass(enabled){
    this.glass=enabled;
    for(const u of Object.values(this.units)){
      for(const role of ["shell","face","glass"]){
        const mat=u.mats[role];
        mat.alpha=enabled?mat._glassAlpha:.94;
        mat.opacityFresnelParameters=enabled?
          (mat._glassOpacityFresnel||null):null;
        mat.emissiveFresnelParameters=enabled?
          (mat._glassEmissiveFresnel||null):null;
        mat.needDepthPrePass=enabled;
        mat.emissiveColor=color(role==="shell"?u.p.shell:u.p.edge).scale(
          enabled?mat._glassEmissive:.12);
      }
    }
  }
  select(key){
    if(!CONCEPTS[key])return;
    this.selected=key;this.setLayout();this.play("idle");
  }
  play(cue){
    const valid=["idle","windup","attack","impact","sequence"];
    if(!valid.includes(cue))return;
    this.cue=cue;this.cueAt=this.elapsed;this.paused=false;
    $("toggle-pause").textContent="PAUSE";
    $("toggle-pause").setAttribute("aria-pressed","false");
    const controls={idle:"test-idle",windup:"test-windup",attack:"test-attack",
      impact:"test-impact",sequence:"test-sequence"};
    for(const key of Object.values(controls))$(key).classList.toggle("active",key===controls[cue]);
  }
  update(dt){
    this.elapsed+=dt;
    let t=Math.max(0,this.elapsed-this.cueAt);
    const duration={idle:Infinity,windup:2.8,attack:2.1,impact:1.2,sequence:3.15}[this.cue];
    if(t>=duration&&this.cue!=="idle"){
      if(this.repeat){this.cueAt=this.elapsed;t=0;}
      else{this.play("idle");t=0;}
    }
    let wind=0,release=0,impact=0;
    if(this.cue==="windup"){
      wind=clamp(t/.84)*(1-clamp((t-2.0)/.7));
    }else if(this.cue==="attack"){
      wind=clamp(t/.55)*(1-clamp((t-.65)/.40));
      release=clamp((t-.62)/.43)*(1-clamp((t-1.36)/.45));
      impact=clamp((t-1.08)/.37)*(1-clamp((t-1.42)/.52));
    }else if(this.cue==="impact"){
      impact=clamp(t/.14)*(1-clamp((t-.18)/.7));
    }else if(this.cue==="sequence"){
      wind=clamp(t/.92)*(1-clamp((t-.96)/.42));
      release=clamp((t-1.03)/.46)*(1-clamp((t-1.48)/.38));
      impact=clamp((t-1.49)/.22)*(1-clamp((t-1.71)/.55));
    }
    const phase=impact>.2?"IMPACT":release>.2?"RELEASE":wind>.15?
      "BUILD-UP":"IDLE";
    const descriptions={
      IDLE:"Living core, float rhythm, orbiting parts and grounded silhouette.",
      "BUILD-UP":"Core compresses. Armour, shards or glyphs gather into a warning.",
      RELEASE:"The silhouette reacts: dash, ritual discharge or heavy forward slam.",
      IMPACT:"Short-lived ground wave, energy flare and recovery.",
    };
    $("phase-label").textContent=phase;
    $("phase-description").textContent=descriptions[phase];
    const time=this.elapsed;
    for(const u of Object.values(this.units)){
      const {key,body,orbit,accent,armor,core,mats}=u;
      const offset=u.phaseOffset;
      const slow=key==="bulwark"?.46:key==="channeler"?.88:1.25;
      const bob=Math.sin(time*1.95*slow+offset)*(key==="bulwark"?.052:.13);
      body.position.y=1.75+bob+(key==="bulwark"?.08:0);
      body.rotation.y=(this.compare?.22:0)+Math.sin(time*.46*slow+offset)*.16;
      body.rotation.z=Math.sin(time*1.2*slow+offset)*.027;
      orbit.rotation.y+=dt*(key==="channeler"?.6:key==="shard"?1.35:.25)*(1+wind*2);
      orbit.rotation.z=key==="shard"?Math.sin(time*.7)*.08:0;
      accent.rotation.y-=dt*(key==="channeler"?.38:key==="bulwark"?.19:.5);
      armor.rotation.z=key==="bulwark"?Math.sin(time*.7)*.012:0;
      const flutter=1+.045*Math.sin(time*3.2*slow+offset);
      const pulse=flutter*(1+wind*.28+impact*.14);
      if(core){
        const base=u.coreBaseScale;
        core.scaling.set(base.x*pulse,base.y*pulse,base.z*pulse);
      }
      u.inner.innerOrbit.rotation.y+=dt*(key==="channeler"?1.16:
        key==="shard"?.95:.54)*(1+wind*2.3);
      u.inner.innerOrbit.rotation.z+=dt*(key==="bulwark"?.25:.47);
      u.inner.heart.scaling.setAll(.88+.13*Math.sin(time*3.8+offset)+
        wind*.34+impact*.29);
      const innerScale=.96+Math.sin(time*1.7+offset)*.045+wind*.15;
      const pb=u.inner.plasmaBaseScale;
      u.inner.plasma.scaling.set(pb.x*innerScale,pb.y*innerScale,pb.z*innerScale);
      for(const glyph of u.glyphs){
        const {node,index,x,y,z}=glyph;
        const gather=1-wind*.27;
        node.position.set(x*gather,y+Math.sin(time*1.8+index)*.12,
          z*gather);
        node.rotation.z=Math.sin(time*1.15+index)*.10+wind*.24;
      }
      armor.scaling.set(1-wind*(key==="bulwark"?.055:0),
        1+wind*(key==="bulwark"?.045:0),
        1+wind*(key==="bulwark"?.06:0));
      for(const fragment of u.satellites){
        const {node,index,baseY}=fragment;
        node.position.y=baseY+Math.sin(time*(1.45+index*.11)+index)*.17;
        node.rotation.z=-.40+Math.sin(time*1.3+index*1.8)*.24-wind*.29;
        node.scaling.setAll(1-wind*.21+release*.28);
      }
      // Balance idle cores without dulling spell build-ups or impacts.
      // Shard keeps its lively outline but no longer floods the scene
      // with a pink-white centre.
      mats.energy.emissiveColor=color(u.p.glow).scale(
        u.balance.coreGlow+wind*(key==="channeler"?.70:
          key==="shard"?.94:1.22)+impact*.94);
      mats.trim.emissiveColor=color(u.p.edge).scale(.56+wind*.82+impact*.67);
      mats.trace.emissiveColor=color(u.p.glow).scale(.70+wind*.72+impact*.48);
      mats.heart.emissiveColor=color(
        key==="channeler"?"#e2faff":key==="bulwark"?"#ffead9":"#fff0fb"
      ).scale(u.balance.heartGlow+wind*.40+impact*.46);
      mats.plasma.emissiveColor=color(u.p.energy).scale(
        u.balance.plasmaGlow+
        (key==="shard"?.09:.19)*(.5+.5*Math.sin(time*2.3+offset))+
        wind*.36+impact*.30);
      u.ground.scaling.setAll(1+wind*.13+impact*.17);
      u.ground.visibility=clamp(.52+wind*.36+impact*.28);
      const push=key==="shard"?release*1.28:key==="bulwark"?release*.31:0;
      body.position.x=-push;
      body.scaling.setAll(1+wind*.055+release*.045);
       const showPulse=impact>.035;
      u.groundPulse.setEnabled(showPulse);
      u.energyFlash.setEnabled(showPulse);
      if(showPulse){
        const fade=1-impact;
        u.groundPulse.scaling.setAll(1+.68*(1-fade));
        u.groundPulse.visibility=clamp(impact*.88);
        u.energyFlash.scaling.setAll(.5+impact*1.55);
        u.energyFlash.visibility=clamp(impact*.45);
      }
      for(const crown of u.bossExtras){
        crown.rotation.y+=dt*.32;
        crown.scaling.setAll(1+Math.sin(time*1.2+offset)*.035+wind*.13);
      }
    }
  }
  dispose(){
    window.removeEventListener("resize",this.resize);
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }
}

let showroom=null;
function setPressed(id,value,on,off){
  const el=$(id);el.setAttribute("aria-pressed",String(value));
  el.textContent=value?on:off;
}
function selectConcept(key){
  if(!CONCEPTS[key])return;
  showroom?.select(key);
  for(const card of document.querySelectorAll("[data-enemy]")){
    const active=card.dataset.enemy===key;
    card.classList.toggle("selected",active);
    card.setAttribute("aria-pressed",String(active));
  }
  const data=CONCEPTS[key];
  $("assessment-title").textContent=data.name;
  $("assessment-role").textContent=data.role;
  $("assessment-form").textContent=data.form;
  $("assessment-attack").textContent=data.attack;
  $("assessment-risk").textContent=data.risk;
}
function init(){
  for(const card of document.querySelectorAll("[data-enemy]"))
    card.addEventListener("click",()=>selectConcept(card.dataset.enemy));
  for(const [id,mode] of [
    ["test-idle","idle"],["test-windup","windup"],
    ["test-attack","attack"],["test-impact","impact"],
    ["test-sequence","sequence"],
  ])$(id).addEventListener("click",()=>showroom?.play(mode));
  $("toggle-compare").addEventListener("click",()=>{
    if(!showroom)return;showroom.compare=!showroom.compare;showroom.setLayout();
    setPressed("toggle-compare",showroom.compare,"COMPARE: ON","COMPARE: OFF");
  });
  $("toggle-scale").addEventListener("click",()=>{
    if(!showroom)return;showroom.gameplay=!showroom.gameplay;showroom.setLayout();
    setPressed("toggle-scale",showroom.gameplay,"GAMEPLAY SCALE: ON","GAMEPLAY SCALE: OFF");
  });
  $("toggle-boss").addEventListener("click",()=>{
    if(!showroom)return;showroom.boss=!showroom.boss;showroom.setLayout();
    setPressed("toggle-boss",showroom.boss,"BOSS STUDY: ON","BOSS STUDY: OFF");
  });
  $("toggle-glass").addEventListener("click",()=>{
    if(!showroom)return;
    showroom.setGlass(!showroom.glass);
    setPressed("toggle-glass",showroom.glass,"GLASS: ON","GLASS: OFF");
  });
  $("toggle-light").addEventListener("click",()=>{
    if(!showroom)return;showroom.setLighting(!showroom.light);
    setPressed("toggle-light",showroom.light,"LIGHT FLOOR: ON","LIGHT FLOOR: OFF");
  });
  $("toggle-loop").addEventListener("click",()=>{
    if(!showroom)return;showroom.repeat=!showroom.repeat;
    setPressed("toggle-loop",showroom.repeat,"LOOP: ON","LOOP: OFF");
  });
  $("toggle-pause").addEventListener("click",()=>{
    if(!showroom)return;showroom.paused=!showroom.paused;
    setPressed("toggle-pause",showroom.paused,"RESUME","PAUSE");
  });
  try{
    showroom=new EnemyShowroom($("creature-canvas"));
    selectConcept("shard");
  }catch(error){
    console.error(error);
    $("lab-error").hidden=false;
    $("lab-error").textContent="Could not start the 3D design lab: "+
      (error?.message||String(error));
  }
  window.addEventListener("beforeunload",()=>showroom?.dispose(),{once:true});
}
init();
