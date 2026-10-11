// Enemy & Boss Design Lab 1.0 — independent Babylon silhouette research.
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
    shell:"#b477b4",edge:"#efabe0",glow:"#f1a6e8",energy:"#b773e6",
  },
  channeler:{
    name:"RIFT CHANNELER",
    caption:"An ancient rune engine held together by energy",
    role:"Caster / high-priority channel interrupt.",
    form:"Open structure: floating glyph plates, a vertical core and counter-rotating rings.",
    attack:"Runes converge, rings align and energy discharges in a broad pulse.",
    risk:"Are its rings legible at real arena zoom, or too similar to a player orb?",
    shell:"#457c99",edge:"#a8eafa",glow:"#8be9fa",energy:"#83acd9",
  },
  bulwark:{
    name:"RIFT BULWARK",
    caption:"A broad, unyielding crystalline guardian",
    role:"Tank / area denial / telegraphed heavy slam.",
    form:"Blocky plated shoulders, angular chassis and a forward-facing shield.",
    attack:"Armour braces around the core, then slams into the ground.",
    risk:"Does it feel heavy without becoming an unreadable collection of chunks?",
    shell:"#8c6a60",edge:"#ffba8b",glow:"#f2a778",energy:"#d87e69",
  },
});

function material(scene,name,hex,emission=0,alpha=1){
  const mat=new BABYLON.StandardMaterial(name,scene);
  const c=color(hex);
  mat.diffuseColor=c.scale(emission>0?.33:.78);
  mat.emissiveColor=c.scale(emission);
  mat.specularColor=color("#a2bed9").scale(.3);
  mat.specularPower=70;
  mat.backFaceCulling=false;
  mat.alpha=alpha;
  if(alpha<1&&BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
    mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
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
  const mats={
    shell:material(scene,key+"-shell",p.shell,.12),
    face:material(scene,key+"-facet",p.edge,.20),
    trim:material(scene,key+"-trim",p.edge,.72,.9),
    energy:material(scene,key+"-energy",p.glow,1.18,.78),
    haze:material(scene,key+"-haze",p.energy,.57,.18),
    rune:material(scene,key+"-runes",p.glow,1.1,.95),
    glass:material(scene,key+"-glass",p.edge,.23,.26),
    shadow:material(scene,key+"-shadow","#101626",.12,.83),
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
  let core=null;
  let shield=null;
  const unit={key,p,root,body,orbit,accent,armor,mats,ground,groundInner,
    groundPulse,energyFlash,particles,shield:null,core:null,bossExtras:[],
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
      body,mats.haze);mist.position.y=-.2;
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
      const shard=crystal(scene,"shard-satellite-"+i,orbit,
        i%3===0?mats.trim:mats.glass,.37+(i%3)*.16,.12+i%2*.035,4);
      const r=1.16+.18*(i%3);
      const x=Math.cos(angle)*r,z=Math.sin(angle)*r,y=Math.sin(angle*2)*.5;
      for(const part of [shard.top,shard.bottom]){
        part.position.x=x;part.position.y+=y;part.position.z=z;
        part.rotation.z=-.55;
      }
      particles.push(shard.top);
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
    const reactor=shape(scene,"CreateIcoSphere","channeler-reactor",{radius:.67,subdivisions:3},
      body,mats.energy);
    reactor.scaling.set(.70,1.20,.7);core=reactor;
    const haze=shape(scene,"CreateSphere","channeler-field",{diameter:1.8,segments:24},body,mats.haze);
    haze.scaling.set(.88,1.26,.88);
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
      const rune=shape(scene,"CreateBox","channeler-glyph-plate-"+i,{
        width:.43,height:.87,depth:.12},holder,mats.glass);
      rune.rotation.z=i%2?.1:-.1;
      const stripe=shape(scene,"CreateBox","channeler-glyph-ink-"+i,{
        width:.055,height:.57,depth:.035},holder,mats.rune);
      stripe.position.z=-.085;
      stripe.rotation.z=.20;
      const dot=shape(scene,"CreateIcoSphere","channeler-glyph-eye-"+i,{
        radius:.10,subdivisions:1},holder,mats.energy);
      dot.position.set(.12,.21,-.12);
      particles.push(holder);
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
      width:1.10,height:1.14,depth:1.25},body,mats.face);
    prism.rotation.y=Math.PI/4;
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
      const shoulderTip=crystal(scene,"bulwark-spine-"+side,armor,mats.face,.83,.31,4);
      for(const part of [shoulderTip.top,shoulderTip.bottom]){
        part.position.z=side*1.33;part.position.y+=.89;part.rotation.z=side*.38;
      }
      const plate=shape(scene,"CreateBox","bulwark-flank-"+side,{
        width:.61,height:1.19,depth:.67},armor,mats.face);
      plate.position.set(-.36,-.45,side*1.05);
      plate.rotation.x=side*.16;
      const band=shape(scene,"CreateBox","bulwark-energy-band-"+side,{
        width:.085,height:.65,depth:.47},armor,mats.trim);
      band.position.set(-.70,-.38,side*1.06);
      const fin=shape(scene,"CreatePolyhedron","bulwark-fin-"+side,{
        type:1,size:.39},armor,mats.trim);
      fin.position.set(.61,.31,side*.68);fin.scaling.set(1.1,.65,.6);
    }
    const shieldNode=new BABYLON.TransformNode("bulwark-forward-shield",scene);
    shieldNode.parent=body;shieldNode.position.set(-1.32,.03,0);
    shield=shape(scene,"CreateCylinder","bulwark-shield-plane",{
      height:.14,diameter:2.05,tessellation:6},shieldNode,mats.glass);
    shield.rotation.z=Math.PI/2;
    const shieldInner=shape(scene,"CreateCylinder","bulwark-shield-hub",{
      height:.21,diameter:1.0,tessellation:6},shieldNode,mats.shell);
    shieldInner.rotation.z=Math.PI/2;
    shieldInner.position.x=-.09;
    const shieldRune=shape(scene,"CreateCylinder","bulwark-shield-crack",{
      height:.24,diameter:.49,tessellation:6},shieldNode,mats.energy);
    shieldRune.position.x=-.21;shieldRune.rotation.z=Math.PI/2;
    unit.shield=shieldNode;
    for(let i=0;i<6;i++){
      const a=Math.PI*2*i/6,r=.68;
      const marker=shape(scene,"CreateSphere","bulwark-shield-nail-"+i,{
        diameter:.13,segments:8},shieldNode,mats.rune);
      marker.position.set(-.20,Math.cos(a)*r,Math.sin(a)*r);
    }
    const guard=torus(scene,"bulwark-guard-orbit",accent,mats.glass,3.35,.043);
    guard.rotation.x=.36;guard.rotation.z=.37;
    const weight=torus(scene,"bulwark-lower-field",body,mats.trim,2.15,.050);
    weight.position.y=-1.12;
    weight.rotation.x=.17;
  }
  unit.core=core;
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
    this.scene.imageProcessingConfiguration.contrast=1.2;
    this.scene.imageProcessingConfiguration.exposure=1.1;
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
    ambient.intensity=.85;
    const keyLight=new BABYLON.DirectionalLight("face-light",V(.65,-1,.42),this.scene);
    keyLight.diffuse=color("#b6d9fc");keyLight.intensity=1.25;
    const edgeLight=new BABYLON.PointLight("edge-light",V(3.4,5.8,-4),this.scene);
    edgeLight.diffuse=color("#a67ddf");edgeLight.intensity=37;
    edgeLight.range=23;
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
    this.glow.intensity=.65;
    this.units={
      shard:createUnit(this.scene,"shard"),
      channeler:createUnit(this.scene,"channeler"),
      bulwark:createUnit(this.scene,"bulwark"),
    };
    this.selected="shard";
    this.compare=false;this.gameplay=false;this.boss=false;this.light=false;
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
    this.camera.radius=this.compare?(this.gameplay?13.4:15.0)*(this.boss?1.18:1):
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
    this.glow.intensity=bright?.48:.65;
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
      if(core)core.scaling.setAll(flutter*(1+wind*.35+impact*.26));
      mats.energy.emissiveColor=color(u.p.glow).scale(1.18+wind*1.50+impact*1.2);
      mats.trim.emissiveColor=color(u.p.edge).scale(.72+wind*.85+impact*.72);
      u.ground.scaling.setAll(1+wind*.13+impact*.17);
      u.ground.visibility=clamp(.52+wind*.36+impact*.28);
      const push=key==="shard"?release*1.28:key==="bulwark"?release*.31:0;
      body.position.x=-push;
      body.scaling.setAll(1+wind*.055+release*.045);
      if(u.shield)u.shield.scaling.setAll(1+wind*.22+impact*.12);
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
