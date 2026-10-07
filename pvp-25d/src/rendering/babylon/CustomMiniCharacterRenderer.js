const MODEL_ROOT = "./assets/characters/miniheroes/";

const MODEL_BY_CLASS = Object.freeze({
  priest:"minihero-caster.glb",
  mage:"minihero-caster.glb",
  warlock:"minihero-caster.glb",
  druid:"minihero-caster.glb",
  shaman:"minihero-caster.glb",
  rogue:"minihero-rogue.glb",
  hunter:"minihero-rogue.glb",
  warrior:"minihero-warrior.glb",
  paladin:"minihero-warrior.glb",
  "death-knight":"minihero-warrior.glb",
});

const MODEL_FILES=Object.freeze([
  "minihero-caster.glb",
  "minihero-rogue.glb",
  "minihero-warrior.glb",
]);

const STYLE=Object.freeze({
  priest:{primary:"#efe2bd",secondary:"#a98d3f",accent:"#f1d66d",metal:"#d8c78d",scale:1.00},
  mage:{primary:"#4f9fe4",secondary:"#514497",accent:"#8d7cf0",metal:"#8bbde0",scale:1.00},
  warlock:{primary:"#8257a7",secondary:"#40284e",accent:"#b06ad8",metal:"#68536f",scale:1.00},
  druid:{primary:"#9a764d",secondary:"#527245",accent:"#79a85a",metal:"#8b8064",scale:1.02},
  shaman:{primary:"#477fae",secondary:"#3c6e6c",accent:"#55b4af",metal:"#7da2ae",scale:1.02},
  rogue:{primary:"#9f8a2f",secondary:"#353229",accent:"#e0c755",metal:"#b8bbc1",scale:0.98},
  hunter:{primary:"#6f8950",secondary:"#48533a",accent:"#a3b867",metal:"#9fa391",scale:0.99},
  warrior:{primary:"#9d5144",secondary:"#453a36",accent:"#d4875f",metal:"#8f969f",scale:1.05},
  paladin:{primary:"#d89eb9",secondary:"#9c7a38",accent:"#f0d170",metal:"#d5d2c8",scale:1.05},
  "death-knight":{primary:"#4f4258",secondary:"#27262d",accent:"#64a9cf",metal:"#667782",scale:1.06},
});

const DEFAULT_STYLE={primary:"#8f8171",secondary:"#4b4540",accent:"#c9b888",metal:"#8f9498",scale:1};

function color(hex){return BABYLON.Color3.FromHexString(hex);}

export class CustomMiniCharacterRenderer{
  constructor(scene,shadowGenerator,scale){
    this.scene=scene;
    this.shadowGenerator=shadowGenerator;
    this.scale=scale;
    this.entries=new Map();
    this.containers=new Map();
    this.loadingPromise=this.preload();
  }

  styleFor(actor){return STYLE[actor.classId]||DEFAULT_STYLE;}
  fileFor(actor){return MODEL_BY_CLASS[actor.classId]||"minihero-caster.glb";}

  async preload(){
    // Intentional 071ff visual baseline:
    // before the generated GLBs existed, this renderer displayed its
    // procedural fallback miniatures. That is the look we are keeping.
    return;
  }

  create(actor){
    const root=new BABYLON.TransformNode("actor:"+actor.id,this.scene);
    const visualRoot=new BABYLON.TransformNode("minihero:"+actor.id,this.scene);
    visualRoot.parent=root;
    visualRoot.rotation.y=Math.PI;

    const entry={
      root,visualRoot,
      classId:actor.classId,role:actor.role,
      style:this.styleFor(actor),modelFile:null,
      meshes:[],ownedMaterials:[],modelAttached:false,
      hp:null,hpBack:null,barRoot:null,classRing:null,
      baseVisualY:0,
    };

    this.createGrounding(actor,entry);
    this.createHealthBar(actor,entry);
    this.entries.set(actor.id,entry);
    this.attach(actor,entry);
    return entry;
  }

  tintMaterial(original,actor,entry){
    if(!original) return original;

    if(original.getClassName?.()==="MultiMaterial"||Array.isArray(original.subMaterials)){
      const mm=new BABYLON.MultiMaterial(actor.id+":"+original.name,this.scene);
      mm.subMaterials=(original.subMaterials||[]).map(m=>this.tintMaterial(m,actor,entry));
      entry.ownedMaterials.push(mm);
      return mm;
    }

    if(!original.clone) return original;

    const m=original.clone(actor.id+":"+original.name);
    entry.ownedMaterials.push(m);
    const n=String(original.name||"").toUpperCase();
    let target=null;
    if(n.includes("PVP_PRIMARY")) target=color(entry.style.primary);
    else if(n.includes("PVP_SECONDARY")) target=color(entry.style.secondary);
    else if(n.includes("PVP_ACCENT")) target=color(entry.style.accent);
    else if(n.includes("PVP_METAL")) target=color(entry.style.metal);
    else if(n.includes("PVP_DARK")) target=color("#16130f");

    if(target){
      if(m.albedoColor){
        m.albedoColor=target;
        m.emissiveColor=color(entry.style.accent).scale(n.includes("ACCENT")?0.025:0.006);
        if("roughness" in m) m.roughness=n.includes("METAL")?0.70:0.88;
        if("metallic" in m) m.metallic=n.includes("METAL")?0.08:0;
      }else if(m.diffuseColor){
        m.diffuseColor=target;
        m.emissiveColor=color(entry.style.accent).scale(n.includes("ACCENT")?0.022:0.005);
        m.specularColor=n.includes("METAL")
          ?new BABYLON.Color3(0.18,0.18,0.18)
          :new BABYLON.Color3(0.025,0.025,0.02);
      }
    }
    return m;
  }

  async attach(actor,entry){
    // Intentionally use the original procedural Mini Hero fallback shape.
    // This reproduces the visual baseline seen before commit 071ff added GLBs.
    if(!this.entries.has(actor.id)||entry.modelAttached) return;
    this.createFallback(actor,entry);
  }

  normalize(entry){
    const meshes=entry.meshes.filter(m=>m.getBoundingInfo);
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

    entry.visualRoot.scaling.setAll((2.15*(entry.style.scale||1))/h);
    for(const m of meshes) m.computeWorldMatrix(true);

    minY=Infinity;
    for(const m of meshes){
      const b=m.getBoundingInfo()?.boundingBox;
      if(b) minY=Math.min(minY,b.minimumWorld.y);
    }
    if(Number.isFinite(minY)) entry.visualRoot.position.y-=minY;
    entry.baseVisualY=entry.visualRoot.position.y;
  }

  createGrounding(actor,entry){
    const shadowMat=new BABYLON.StandardMaterial("mini-shadow:"+actor.id,this.scene);
    shadowMat.diffuseColor=new BABYLON.Color3(0.035,0.027,0.023);
    shadowMat.specularColor=BABYLON.Color3.Black();
    shadowMat.alpha=0.28;
    shadowMat.disableLighting=true;

    const shadow=BABYLON.MeshBuilder.CreateCylinder(
      "contact-shadow:"+actor.id,
      {height:0.010,diameter:1.00,tessellation:20},
      this.scene
    );
    shadow.parent=entry.root;
    shadow.position.y=0.012;
    shadow.scaling.set(1.18,1,0.74);
    shadow.material=shadowMat;
    shadow.isPickable=false;

    const ringMat=new BABYLON.StandardMaterial("mini-ring:"+actor.id,this.scene);
    ringMat.diffuseColor=color(entry.style.accent);
    ringMat.emissiveColor=color(entry.style.accent).scale(0.055);
    ringMat.specularColor=BABYLON.Color3.Black();
    ringMat.alpha=0.10;
    ringMat.disableLighting=true;

    const ring=BABYLON.MeshBuilder.CreateTorus(
      "class-ring:"+actor.id,
      {diameter:0.90,thickness:0.018,tessellation:32},
      this.scene
    );
    ring.parent=entry.root;
    ring.position.y=0.034;
    ring.material=ringMat;
    ring.isPickable=false;
    entry.classRing=ring;
  }

  createHealthBar(actor,entry){
    const backMat=new BABYLON.StandardMaterial("mini-hp-back:"+actor.id,this.scene);
    backMat.diffuseColor=BABYLON.Color3.FromHexString("#171412");
    backMat.specularColor=BABYLON.Color3.Black();
    backMat.disableLighting=true;

    const hpMat=new BABYLON.StandardMaterial("mini-hp:"+actor.id,this.scene);
    hpMat.diffuseColor=BABYLON.Color3.FromHexString(actor.team==="friendly"?"#58b96b":"#d55c50");
    hpMat.emissiveColor=hpMat.diffuseColor.scale(0.025);
    hpMat.specularColor=BABYLON.Color3.Black();
    hpMat.disableLighting=true;

    const br=new BABYLON.TransformNode("status:"+actor.id,this.scene);
    br.parent=entry.root;
    br.position.y=2.55;

    const back=BABYLON.MeshBuilder.CreatePlane(
      "hpBack:"+actor.id,
      {width:1.26,height:0.105,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      this.scene
    );
    back.parent=br;
    back.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
    back.material=backMat;
    back.isPickable=false;

    const hp=BABYLON.MeshBuilder.CreatePlane(
      "hp:"+actor.id,
      {width:1.20,height:0.064,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      this.scene
    );
    hp.parent=br;
    hp.position.z=-0.012;
    hp.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
    hp.material=hpMat;
    hp.isPickable=false;

    entry.barRoot=br;
    entry.hpBack=back;
    entry.hp=hp;
  }

  createWarriorArmsAndAxe(actor,entry){
    const skinMat=new BABYLON.StandardMaterial("warrior-arms:"+actor.id,this.scene);
    skinMat.diffuseColor=BABYLON.Color3.FromHexString("#b88463");
    skinMat.specularColor=BABYLON.Color3.Black();

    const handleMat=new BABYLON.StandardMaterial("warrior-axe-handle:"+actor.id,this.scene);
    handleMat.diffuseColor=BABYLON.Color3.FromHexString("#3b2b22");
    handleMat.specularColor=BABYLON.Color3.Black();

    const axeMat=new BABYLON.StandardMaterial("warrior-axe-head:"+actor.id,this.scene);
    axeMat.diffuseColor=BABYLON.Color3.FromHexString("#8f969f");
    axeMat.specularColor=new BABYLON.Color3(0.12,0.12,0.12);

    entry.ownedMaterials.push(skinMat,handleMat,axeMat);

    const weaponPivot=new BABYLON.TransformNode("warrior-weapon-pivot:"+actor.id,this.scene);
    weaponPivot.parent=entry.visualRoot;
    weaponPivot.position.set(0,0.73,-0.02);

    const leftArm=BABYLON.MeshBuilder.CreateBox(
      "warrior-arm-left:"+actor.id,
      {width:0.15,height:0.15,depth:0.48},
      this.scene
    );
    leftArm.parent=entry.visualRoot;
    leftArm.position.set(-0.25,0.73,-0.18);
    leftArm.rotation.y=-0.58;
    leftArm.material=skinMat;
    leftArm.metadata={actorId:actor.id};
    this.shadowGenerator?.addShadowCaster(leftArm);

    const rightArm=BABYLON.MeshBuilder.CreateBox(
      "warrior-arm-right:"+actor.id,
      {width:0.15,height:0.15,depth:0.48},
      this.scene
    );
    rightArm.parent=entry.visualRoot;
    rightArm.position.set(0.25,0.73,-0.18);
    rightArm.rotation.y=0.58;
    rightArm.material=skinMat;
    rightArm.metadata={actorId:actor.id};
    this.shadowGenerator?.addShadowCaster(rightArm);

    const handle=BABYLON.MeshBuilder.CreateBox(
      "warrior-axe-handle:"+actor.id,
      {width:0.075,height:0.075,depth:0.92},
      this.scene
    );
    handle.parent=weaponPivot;
    handle.position.set(0.24,0,-0.27);
    handle.rotation.y=-0.32;
    handle.material=handleMat;
    handle.metadata={actorId:actor.id};
    this.shadowGenerator?.addShadowCaster(handle);

    const axeHead=BABYLON.MeshBuilder.CreateBox(
      "warrior-axe-head:"+actor.id,
      {width:0.42,height:0.12,depth:0.24},
      this.scene
    );
    axeHead.parent=weaponPivot;
    axeHead.position.set(0.38,0,-0.70);
    axeHead.rotation.y=-0.32;
    axeHead.material=axeMat;
    axeHead.metadata={actorId:actor.id};
    this.shadowGenerator?.addShadowCaster(axeHead);

    entry.weaponPivot=weaponPivot;
    entry.warriorAttackStartedAt=0;
    entry.warriorCooldownSnapshot=new Map([
      ["warrior-rend",actor.cooldownFor("warrior-rend")],
      ["warrior-mortal-strike",actor.cooldownFor("warrior-mortal-strike")],
      ["warrior-slam",actor.cooldownFor("warrior-slam")],
    ]);
    entry.meshes.push(leftArm,rightArm,handle,axeHead);
  }

  createFallback(actor,entry){
    const m=new BABYLON.StandardMaterial("mini-fallback:"+actor.id,this.scene);
    m.diffuseColor=color(entry.style.primary);
    const marker=BABYLON.MeshBuilder.CreateCapsule(
      "mini-fallback:"+actor.id,
      {height:1.35,radius:0.32,tessellation:8},
      this.scene
    );
    marker.parent=entry.visualRoot;
    marker.position.y=0.68;
    marker.material=m;
    marker.metadata={actorId:actor.id};
    this.shadowGenerator?.addShadowCaster(marker);
    entry.meshes=[marker];
    if(actor.classId==="warrior"){
      this.createWarriorArmsAndAxe(actor,entry);
    }
    entry.modelAttached=true;
  }

  disposeEntry(entry){
    for(const m of entry.ownedMaterials||[]){try{m.dispose();}catch{}}
    entry.root.dispose(false,true);
  }

  sync(game,time=performance.now()){
    const ids=new Set(game.actors.map(a=>a.id));
    for(const [id,e] of this.entries){
      if(ids.has(id)) continue;
      this.disposeEntry(e);
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
      if(!actor.alive) continue;

      e.root.position.set(actor.x*this.scale,0.16,actor.y*this.scale);

      const mv=actor.lastMove||{x:0,y:0};
      const moving=Math.hypot(mv.x,mv.y)>0.05;
      if(moving) e.root.rotation.y=Math.atan2(mv.x,mv.y);

      const bob=moving
        ?Math.sin(time*0.013)*0.030
        :Math.sin(time*0.0026)*0.008;
      e.visualRoot.position.y=e.baseVisualY+bob;

      // Tiny lean makes the rigid miniature feel alive until authored
      // arm/weapon animations are added in the next pass.
      e.visualRoot.rotation.z=moving?Math.sin(time*0.013)*0.028:0;

      if(actor.classId==="warrior" && e.weaponPivot){
        const meleeSpellIds=[
          "warrior-rend",
          "warrior-mortal-strike",
          "warrior-slam",
        ];

        for(const spellId of meleeSpellIds){
          const current=actor.cooldownFor(spellId);
          const previous=e.warriorCooldownSnapshot?.get(spellId) ?? 0;
          if(current>previous+120){
            e.warriorAttackStartedAt=time;
          }
          e.warriorCooldownSnapshot?.set(spellId,current);
        }

        const elapsed=time-(e.warriorAttackStartedAt||0);
        if(elapsed>=0 && elapsed<320){
          const t=elapsed/320;
          const swing=Math.sin(t*Math.PI);
          e.weaponPivot.rotation.y=-0.52+swing*1.45;
          e.weaponPivot.rotation.z=-swing*0.16;
        }else{
          e.weaponPivot.rotation.y=-0.52;
          e.weaponPivot.rotation.z=0;
        }
      }

      const health=Math.max(0,Math.min(1,actor.healthPct));
      e.hp.scaling.x=health;
      e.hp.position.x=-0.60*(1-health);

      const hpColor=health<0.20
        ?"#e14d43"
        :actor.team==="friendly"?"#58b96b":"#d55c50";
      e.hp.material.diffuseColor=BABYLON.Color3.FromHexString(hpColor);
      e.hp.material.emissiveColor=e.hp.material.diffuseColor.scale(health<0.20?0.07:0.025);
      e.classRing.visibility=actor.cast?0.30:0.10;
    }
  }

  meshForActor(id){return this.entries.get(id)?.meshes?.[0]||null;}
  rootForActor(id){return this.entries.get(id)?.root||null;}
  worldPosition(id,y=1.22){
    const root=this.rootForActor(id);
    return root?new BABYLON.Vector3(root.position.x,root.position.y+y,root.position.z):null;
  }
}
