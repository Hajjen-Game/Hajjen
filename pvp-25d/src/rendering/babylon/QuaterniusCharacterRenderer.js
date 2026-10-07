const MODEL_ROOT = "./assets/characters/quaternius/";

const MODEL_BY_CLASS = Object.freeze({
  priest: "quaternius-caster.glb",
  mage: "quaternius-caster.glb",
  warlock: "quaternius-caster.glb",
  druid: "quaternius-caster.glb",
  shaman: "quaternius-caster.glb",
  rogue: "quaternius-rogue.glb",
  hunter: "quaternius-rogue.glb",
  warrior: "quaternius-warrior.glb",
  paladin: "quaternius-warrior.glb",
  "death-knight": "quaternius-warrior.glb",
});

const MODEL_FILES = Object.freeze([
  "quaternius-caster.glb",
  "quaternius-rogue.glb",
  "quaternius-warrior.glb",
]);

const KAYKIT_COMMIT = "672074b73ba276876a19e8816ecdc5241817ab47";
const PROP_ROOT =
  "https://raw.githubusercontent.com/KayKit-Game-Assets/"
  + "KayKit-Character-Pack-Adventures-1.0/"
  + KAYKIT_COMMIT
  + "/addons/kaykit_character_pack_adventures/Assets/gltf/";

const PROP_FILES = Object.freeze([
  "staff.gltf","wand.gltf","spellbook_open.gltf",
  "sword_1handed.gltf","sword_2handed.gltf",
  "dagger.gltf","axe_1handed.gltf","shield_badge.gltf",
  "shield_round.gltf","crossbow_2handed.gltf",
]);

const STYLE = Object.freeze({
  priest:{primary:"#eee1bd",secondary:"#b89848",accent:"#e7c85e",scale:1.02,
    props:[
      {file:"staff.gltf",pos:[0.48,0.84,0.10],scale:0.58,rot:[0,0,-0.13]},
      {file:"spellbook_open.gltf",pos:[-0.33,0.94,0.17],scale:0.32,rot:[-0.38,0,-0.06]},
    ]},
  mage:{primary:"#5b9fe8",secondary:"#51449f",accent:"#8874ef",scale:1.01,
    props:[{file:"staff.gltf",pos:[0.47,0.84,0.10],scale:0.58,rot:[0,0,-0.13]}]},
  warlock:{primary:"#9469b6",secondary:"#4d355d",accent:"#a46bd1",scale:1.01,
    props:[
      {file:"wand.gltf",pos:[0.35,0.82,0.10],scale:0.44,rot:[0,0,-0.28]},
      {file:"spellbook_open.gltf",pos:[-0.30,0.92,0.14],scale:0.30,rot:[-0.36,0,0.06]},
    ]},
  druid:{primary:"#9b744d",secondary:"#527947",accent:"#77a85c",scale:1.02,
    props:[{file:"staff.gltf",pos:[0.44,0.81,0.09],scale:0.52,rot:[0,0,-0.10]}]},
  shaman:{primary:"#5a8fbb",secondary:"#3e7775",accent:"#58aaa8",scale:1.03,
    props:[
      {file:"axe_1handed.gltf",pos:[0.36,0.75,0.11],scale:0.40,rot:[0,0,-0.42]},
      {file:"shield_round.gltf",pos:[-0.36,0.82,0.15],scale:0.47,rot:[0,0.04,0.04]},
    ]},
  rogue:{primary:"#aa963b",secondary:"#3d3928",accent:"#dec85b",scale:0.98,
    props:[
      {file:"dagger.gltf",pos:[-0.36,0.70,0.12],scale:0.48,rot:[0,0,0.50]},
      {file:"dagger.gltf",pos:[0.36,0.70,0.12],scale:0.48,rot:[0,0,-0.50]},
    ]},
  hunter:{primary:"#728952",secondary:"#4f5f3b",accent:"#90aa61",scale:0.99,
    props:[{file:"crossbow_2handed.gltf",pos:[0.12,0.87,-0.14],scale:0.37,rot:[0.08,0,-0.72]}]},
  warrior:{primary:"#a55b49",secondary:"#858b91",accent:"#d08a63",scale:1.07,
    props:[{file:"sword_2handed.gltf",pos:[0.51,0.72,0.04],scale:0.60,rot:[0,0,-0.52]}]},
  paladin:{primary:"#d29ab4",secondary:"#d5ba5d",accent:"#efc6d9",scale:1.06,
    props:[
      {file:"sword_1handed.gltf",pos:[0.37,0.75,0.11],scale:0.40,rot:[0,0,-0.46]},
      {file:"shield_badge.gltf",pos:[-0.37,0.83,0.16],scale:0.50,rot:[0,0.04,0.05]},
    ]},
  "death-knight":{primary:"#55485e",secondary:"#68818e",accent:"#6fa8c7",scale:1.07,
    props:[{file:"sword_2handed.gltf",pos:[0.48,0.70,0.03],scale:0.56,rot:[0,0,-0.49]}]},
});

const DEFAULT_STYLE={primary:"#8f8171",secondary:"#5b534a",accent:"#c9b888",scale:1,props:[]};

function color(hex){ return BABYLON.Color3.FromHexString(hex); }

function findAnimation(groups,hints){
  const h=hints.map(x=>x.toLowerCase());
  return groups.find(g=>h.some(x=>String(g?.name||"").toLowerCase().includes(x)))||null;
}

export class QuaterniusCharacterRenderer {
  constructor(scene,shadowGenerator,scale){
    this.scene=scene;
    this.shadowGenerator=shadowGenerator;
    this.scale=scale;
    this.entries=new Map();
    this.bodyContainers=new Map();
    this.propContainers=new Map();
    this.loadingPromise=this.preload();
  }

  styleFor(actor){ return STYLE[actor.classId]||DEFAULT_STYLE; }
  fileFor(actor){ return MODEL_BY_CLASS[actor.classId]||"quaternius-caster.glb"; }

  async preload(){
    const bodies=MODEL_FILES.map(async file=>{
      try{
        const c=await BABYLON.SceneLoader.LoadAssetContainerAsync(MODEL_ROOT,file,this.scene);
        this.bodyContainers.set(file,c);
      }catch(error){ console.error("Quaternius body load failed",file,error); }
    });
    const props=PROP_FILES.map(async file=>{
      try{
        const c=await BABYLON.SceneLoader.LoadAssetContainerAsync(PROP_ROOT,file,this.scene);
        this.propContainers.set(file,c);
      }catch(error){ console.warn("Quaternius test prop load failed",file,error); }
    });
    await Promise.all([...bodies,...props]);
  }

  create(actor){
    const root=new BABYLON.TransformNode("actor:"+actor.id,this.scene);
    const visualRoot=new BABYLON.TransformNode("quaternius:"+actor.id,this.scene);
    visualRoot.parent=root;
    visualRoot.rotation.y=Math.PI;
    const propRoot=new BABYLON.TransformNode("props:"+actor.id,this.scene);
    propRoot.parent=root;
    propRoot.rotation.y=Math.PI;

    const entry={
      root,visualRoot,propRoot,
      classId:actor.classId,role:actor.role,
      style:this.styleFor(actor),modelFile:this.fileFor(actor),
      modelMeshes:[],propMeshes:[],ownedMaterials:[],
      animationGroups:[],animationState:null,
      hp:null,hpBack:null,barRoot:null,classRing:null,
      baseVisualY:0,modelAttached:false,
    };
    this.createGrounding(actor,entry);
    this.createHealthBar(actor,entry);
    this.entries.set(actor.id,entry);
    this.attach(actor,entry);
    return entry;
  }

  cloneAndTintMaterial(original,actor,entry){
    if(!original) return original;
    if(original.getClassName?.()==="MultiMaterial" || Array.isArray(original.subMaterials)){
      const mm=new BABYLON.MultiMaterial(actor.id+":"+original.name,this.scene);
      mm.subMaterials=(original.subMaterials||[]).map(m=>this.cloneAndTintMaterial(m,actor,entry));
      entry.ownedMaterials.push(mm);
      return mm;
    }
    if(!original.clone) return original;
    const m=original.clone(actor.id+":"+original.name);
    entry.ownedMaterials.push(m);
    const n=String(original.name||"").toUpperCase();
    const target=n.includes("PVP_SKIN")
      ? null
      : n.includes("SECONDARY")
        ? color(entry.style.secondary)
        : color(entry.style.primary);
    const strength=n.includes("PVP_SKIN") ? 0 : 0.92;
    if(target && m.albedoColor){
      m.albedoColor=BABYLON.Color3.Lerp(m.albedoColor,target,strength);
      m.emissiveColor=color(entry.style.accent).scale(0.010);
      if("roughness" in m) m.roughness=0.86;
      if("metallic" in m) m.metallic=0;
    }else if(target && m.diffuseColor){
      m.diffuseColor=BABYLON.Color3.Lerp(m.diffuseColor,target,strength);
      m.emissiveColor=color(entry.style.accent).scale(0.008);
      m.specularColor=new BABYLON.Color3(0.025,0.025,0.02);
    }
    return m;
  }

  async attach(actor,entry){
    await this.loadingPromise;
    if(!this.entries.has(actor.id)||entry.modelAttached) return;
    const container=this.bodyContainers.get(entry.modelFile);
    if(!container){ this.createFallback(actor,entry); return; }

    try{
      const inst=container.instantiateModelsToScene(n=>actor.id+":"+n,false);
      for(const node of inst.rootNodes||[]) node.parent=entry.visualRoot;
      entry.modelMeshes=entry.visualRoot.getChildMeshes(false);
      entry.animationGroups=inst.animationGroups||[];

      for(const mesh of entry.modelMeshes){
        mesh.metadata={...(mesh.metadata||{}),actorId:actor.id,quaternius:true};
        mesh.isPickable=true;
        mesh.receiveShadows=true;
        mesh.renderOutline=true;
        mesh.outlineColor=new BABYLON.Color3(0.045,0.035,0.03);
        mesh.outlineWidth=0.020;
        this.shadowGenerator?.addShadowCaster(mesh);
        if(mesh.material) mesh.material=this.cloneAndTintMaterial(mesh.material,actor,entry);
      }

      this.normalize(entry);
      this.attachProps(actor,entry);
      entry.modelAttached=true;
      this.setAnimation(entry,"idle",true);
    }catch(error){
      console.error("Quaternius instance failed",entry.modelFile,error);
      this.createFallback(actor,entry);
    }
  }

  normalize(entry){
    const meshes=entry.modelMeshes.filter(m=>m.getBoundingInfo);
    if(!meshes.length) return;
    for(const m of meshes) m.computeWorldMatrix(true);
    let minY=Infinity,maxY=-Infinity;
    for(const m of meshes){
      const b=m.getBoundingInfo()?.boundingBox;
      if(!b) continue;
      minY=Math.min(minY,b.minimumWorld.y);
      maxY=Math.max(maxY,b.maximumWorld.y);
    }
    const h=maxY-minY;
    if(!Number.isFinite(h)||h<=0.001) return;
    entry.visualRoot.scaling.setAll((2.02*(entry.style.scale||1))/h);
    for(const m of meshes) m.computeWorldMatrix(true);
    minY=Infinity;
    for(const m of meshes){
      const b=m.getBoundingInfo()?.boundingBox;
      if(b) minY=Math.min(minY,b.minimumWorld.y);
    }
    if(Number.isFinite(minY)) entry.visualRoot.position.y-=minY;
    entry.baseVisualY=entry.visualRoot.position.y;
  }

  attachProps(actor,entry){
    for(const [i,spec] of (entry.style.props||[]).entries()){
      const container=this.propContainers.get(spec.file);
      if(!container) continue;
      try{
        const inst=container.instantiateModelsToScene(n=>actor.id+":prop:"+i+":"+n,false);
        const anchor=new BABYLON.TransformNode(actor.id+":prop-anchor:"+i,this.scene);
        anchor.parent=entry.propRoot;
        anchor.position.set(...spec.pos);
        anchor.rotation.set(...spec.rot);
        anchor.scaling.setAll(spec.scale);
        for(const node of inst.rootNodes||[]) node.parent=anchor;
        for(const mesh of anchor.getChildMeshes(false)){
          mesh.metadata={...(mesh.metadata||{}),actorId:actor.id,classProp:true};
          mesh.isPickable=true;
          mesh.receiveShadows=true;
          mesh.renderOutline=true;
          mesh.outlineColor=new BABYLON.Color3(0.05,0.04,0.035);
          mesh.outlineWidth=0.014;
          this.shadowGenerator?.addShadowCaster(mesh);
          entry.propMeshes.push(mesh);
        }
      }catch(error){ console.warn("Prop instantiate failed",spec.file,error); }
    }
  }

  createGrounding(actor,entry){
    const sm=new BABYLON.StandardMaterial("q-shadow:"+actor.id,this.scene);
    sm.diffuseColor=new BABYLON.Color3(0.04,0.03,0.025);
    sm.specularColor=BABYLON.Color3.Black();
    sm.alpha=0.27; sm.disableLighting=true;
    const shadow=BABYLON.MeshBuilder.CreateCylinder(
      "contact-shadow:"+actor.id,
      {height:0.010,diameter:0.92,tessellation:20},
      this.scene
    );
    shadow.parent=entry.root; shadow.position.y=0.010;
    shadow.scaling.set(1.18,1,0.74); shadow.material=sm; shadow.isPickable=false;

    const rm=new BABYLON.StandardMaterial("q-ring:"+actor.id,this.scene);
    rm.diffuseColor=color(entry.style.accent);
    rm.emissiveColor=color(entry.style.accent).scale(0.05);
    rm.specularColor=BABYLON.Color3.Black(); rm.alpha=0.10; rm.disableLighting=true;
    const ring=BABYLON.MeshBuilder.CreateTorus(
      "class-ring:"+actor.id,
      {diameter:0.86,thickness:0.018,tessellation:30},
      this.scene
    );
    ring.parent=entry.root; ring.position.y=0.03; ring.material=rm; ring.isPickable=false;
    entry.classRing=ring;
  }

  createHealthBar(actor,entry){
    const bm=new BABYLON.StandardMaterial("q-hp-back:"+actor.id,this.scene);
    bm.diffuseColor=BABYLON.Color3.FromHexString("#171412");
    bm.specularColor=BABYLON.Color3.Black(); bm.disableLighting=true;
    const hm=new BABYLON.StandardMaterial("q-hp:"+actor.id,this.scene);
    hm.diffuseColor=BABYLON.Color3.FromHexString(actor.team==="friendly"?"#58b96b":"#d55c50");
    hm.emissiveColor=hm.diffuseColor.scale(0.025);
    hm.specularColor=BABYLON.Color3.Black(); hm.disableLighting=true;

    const br=new BABYLON.TransformNode("status:"+actor.id,this.scene);
    br.parent=entry.root; br.position.y=2.55;
    const back=BABYLON.MeshBuilder.CreatePlane(
      "hpBack:"+actor.id,
      {width:1.22,height:0.105,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      this.scene
    );
    back.parent=br; back.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
    back.material=bm; back.isPickable=false;
    const hp=BABYLON.MeshBuilder.CreatePlane(
      "hp:"+actor.id,
      {width:1.16,height:0.064,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      this.scene
    );
    hp.parent=br; hp.position.z=-0.012; hp.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
    hp.material=hm; hp.isPickable=false;
    entry.barRoot=br; entry.hpBack=back; entry.hp=hp;
  }

  createFallback(actor,entry){
    const m=new BABYLON.StandardMaterial("q-fallback:"+actor.id,this.scene);
    m.diffuseColor=color(entry.style.primary);
    const marker=BABYLON.MeshBuilder.CreateCapsule(
      "q-fallback:"+actor.id,
      {height:1.30,radius:0.30,tessellation:8},
      this.scene
    );
    marker.parent=entry.visualRoot; marker.position.y=0.65; marker.material=m;
    marker.metadata={actorId:actor.id}; this.shadowGenerator?.addShadowCaster(marker);
    entry.modelMeshes=[marker]; entry.modelAttached=true;
  }

  setAnimation(entry,state,force=false){
    if(!entry.animationGroups.length) return;
    if(!force&&entry.animationState===state) return;
    const hints=state==="run"?["run","walk"]
      :state==="cast"?["cast","spell","attack"]
      :state==="death"?["death","die"]:["idle"];
    const selected=findAnimation(entry.animationGroups,hints);
    for(const g of entry.animationGroups) if(g!==selected) g.stop();
    if(selected){ selected.start(true,1,selected.from,selected.to,false); entry.animationState=state; }
  }

  disposeEntry(entry){
    for(const g of entry.animationGroups||[]){ try{g.stop();g.dispose();}catch{} }
    for(const m of entry.ownedMaterials||[]){ try{m.dispose();}catch{} }
    entry.root.dispose(false,true);
  }

  sync(game,time=performance.now()){
    const ids=new Set(game.actors.map(a=>a.id));
    for(const [id,e] of this.entries){
      if(ids.has(id)) continue;
      this.disposeEntry(e); this.entries.delete(id);
    }
    for(const actor of game.actors){
      let e=this.entries.get(actor.id);
      if(e&&(e.classId!==actor.classId||e.role!==actor.role)){
        this.disposeEntry(e); this.entries.delete(actor.id); e=null;
      }
      e=e||this.create(actor);
      e.root.setEnabled(actor.alive);
      if(!actor.alive){ this.setAnimation(e,"death"); continue; }

      e.root.position.set(actor.x*this.scale,0.16,actor.y*this.scale);
      const mv=actor.lastMove||{x:0,y:0};
      const moving=Math.hypot(mv.x,mv.y)>0.05;
      if(moving) e.root.rotation.y=Math.atan2(mv.x,mv.y);

      if(actor.cast) this.setAnimation(e,"cast");
      else if(moving) this.setAnimation(e,"run");
      else this.setAnimation(e,"idle");

      const bob=moving?Math.sin(time*0.012)*0.022:Math.sin(time*0.0024)*0.006;
      e.visualRoot.position.y=e.baseVisualY+bob;
      e.propRoot.position.y=bob;
      e.visualRoot.rotation.z=moving?Math.sin(time*0.012)*0.018:0;

      const health=Math.max(0,Math.min(1,actor.healthPct));
      e.hp.scaling.x=health; e.hp.position.x=-0.58*(1-health);
      const hpColor=health<0.20?"#e14d43":actor.team==="friendly"?"#58b96b":"#d55c50";
      e.hp.material.diffuseColor=BABYLON.Color3.FromHexString(hpColor);
      e.hp.material.emissiveColor=e.hp.material.diffuseColor.scale(health<0.20?0.07:0.025);
      e.classRing.visibility=actor.cast?0.28:0.10;
    }
  }

  meshForActor(id){ return this.entries.get(id)?.modelMeshes?.[0]||null; }
  rootForActor(id){ return this.entries.get(id)?.root||null; }
  worldPosition(id,y=1.22){
    const root=this.rootForActor(id);
    return root?new BABYLON.Vector3(root.position.x,root.position.y+y,root.position.z):null;
  }
}
