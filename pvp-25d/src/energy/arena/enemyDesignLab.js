import {CONCEPTS,createUnit,animateRiftCreature,material,color,V,shape,line} from "./EnergyRiftCreatureModels.js?v=20261011-riftcombat1";
// Enemy & Boss Design Lab 1.4 — Shard-matched glass and visible living interiors.
// No imports from EnergyMatch, no mutation of Planet Defense, saves or AI.
// All forms, glow volumes and animation passes are authored as real 3D meshes.
const $=id=>document.getElementById(id);
const clamp=(x,min=0,max=1)=>Math.min(max,Math.max(min,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const V=(x=0,y=0,z=0)=>new BABYLON.Vector3(x,y,z);
const color=hex=>BABYLON.Color3.FromHexString(hex);


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
    for(const unit of Object.values(this.units))
      animateRiftCreature(unit,time,dt,{wind,release,impact,compare:this.compare});
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
