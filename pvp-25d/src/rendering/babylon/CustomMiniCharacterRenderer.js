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
    handleMat.diffuseColor=BABYLON.Color3.FromHexString("#4a3124");
    handleMat.specularColor=BABYLON.Color3.Black();

    const axeMat=new BABYLON.StandardMaterial("warrior-axe-head:"+actor.id,this.scene);
    axeMat.diffuseColor=BABYLON.Color3.FromHexString("#9aa2aa");
    axeMat.specularColor=new BABYLON.Color3(0.18,0.18,0.18);

    entry.ownedMaterials.push(skinMat,handleMat,axeMat);

    // One shared combat rig: arms, hands and axe rotate together during a swing,
    // so the hands can never visually detach from the weapon.
    const combatRig=new BABYLON.TransformNode("warrior-combat-rig:"+actor.id,this.scene);
    combatRig.parent=entry.visualRoot;
    combatRig.position.set(0,0,0);

    const makeTube=(name,path,radius,material)=>{
      const mesh=BABYLON.MeshBuilder.CreateTube(
        name,
        {
          path:path.map(([x,y,z])=>new BABYLON.Vector3(x,y,z)),
          radius,
          tessellation:8,
          cap:BABYLON.Mesh.CAP_ALL,
        },
        this.scene,
      );
      mesh.parent=combatRig;
      mesh.material=material;
      mesh.metadata={actorId:actor.id};
      mesh.isPickable=true;
      this.shadowGenerator?.addShadowCaster(mesh);
      return mesh;
    };

    const makeHand=(name,[x,y,z])=>{
      const hand=BABYLON.MeshBuilder.CreateSphere(
        name,
        {diameter:0.18,segments:8},
        this.scene,
      );
      hand.parent=combatRig;
      hand.position.set(x,y,z);
      hand.scaling.set(1.0,0.86,0.92);
      hand.material=skinMat;
      hand.metadata={actorId:actor.id};
      hand.isPickable=true;
      this.shadowGenerator?.addShadowCaster(hand);
      return hand;
    };

    // The handle is diagonal in the arena plane. The two grip points below
    // are literally on this same line, so both hands read as holding it.
    const handleStart=[-0.23,0.73,-0.26];
    const gripLeft=[-0.06,0.73,-0.43];
    const gripRight=[0.10,0.73,-0.59];
    const handleEnd=[0.43,0.73,-0.92];

    const leftArm=makeTube(
      "warrior-arm-left:"+actor.id,
      [
        [-0.27,0.78,-0.04],
        [-0.25,0.75,-0.25],
        gripLeft,
      ],
      0.070,
      skinMat,
    );
    const rightArm=makeTube(
      "warrior-arm-right:"+actor.id,
      [
        [0.27,0.78,-0.04],
        [0.24,0.75,-0.34],
        gripRight,
      ],
      0.070,
      skinMat,
    );

    const leftHand=makeHand("warrior-hand-left:"+actor.id,gripLeft);
    const rightHand=makeHand("warrior-hand-right:"+actor.id,gripRight);

    const handle=makeTube(
      "warrior-axe-handle:"+actor.id,
      [handleStart,handleEnd],
      0.042,
      handleMat,
    );

    // Low-poly wedge-prism axe blade instead of a box.
    const blade=new BABYLON.Mesh("warrior-axe-blade:"+actor.id,this.scene);
    blade.parent=combatRig;
    blade.position.set(handleEnd[0]+0.02,handleEnd[1],handleEnd[2]-0.01);
    blade.rotation.y=-0.73;

    const shape=[
      [-0.06,-0.17],
      [0.18,-0.23],
      [0.40,-0.18],
      [0.46,0.02],
      [0.37,0.24],
      [0.10,0.18],
      [-0.06,0.09],
    ];
    const halfThickness=0.055;
    const positions=[];
    for(const y of [-halfThickness,halfThickness]){
      for(const [x,z] of shape){
        positions.push(x,y,z);
      }
    }

    const n=shape.length;
    const indices=[];
    // Bottom + top faces.
    for(let i=1;i<n-1;i++){
      indices.push(0,i+1,i);
      indices.push(n,n+i,n+i+1);
    }
    // Side walls.
    for(let i=0;i<n;i++){
      const j=(i+1)%n;
      indices.push(i,j,n+j,i,n+j,n+i);
    }

    const normals=[];
    BABYLON.VertexData.ComputeNormals(positions,indices,normals);
    const data=new BABYLON.VertexData();
    data.positions=positions;
    data.indices=indices;
    data.normals=normals;
    data.applyToMesh(blade);
    blade.material=axeMat;
    blade.metadata={actorId:actor.id};
    blade.isPickable=true;
    this.shadowGenerator?.addShadowCaster(blade);

    // Small rear metal cap helps the head read as attached to the handle
    // without turning the weapon into a hammer.
    const socket=BABYLON.MeshBuilder.CreateCylinder(
      "warrior-axe-socket:"+actor.id,
      {height:0.16,diameter:0.13,tessellation:8},
      this.scene,
    );
    socket.parent=combatRig;
    socket.position.set(handleEnd[0],handleEnd[1],handleEnd[2]);
    socket.rotation.z=Math.PI/2;
    socket.material=axeMat;
    socket.metadata={actorId:actor.id};
    this.shadowGenerator?.addShadowCaster(socket);

    entry.weaponPivot=combatRig;
    entry.warriorAttackStartedAt=0;
    entry.warriorCooldownSnapshot=new Map([
      ["warrior-rend",actor.cooldownFor("warrior-rend")],
      ["warrior-mortal-strike",actor.cooldownFor("warrior-mortal-strike")],
      ["warrior-slam",actor.cooldownFor("warrior-slam")],
    ]);
    entry.meshes.push(
      leftArm,
      rightArm,
      leftHand,
      rightHand,
      handle,
      blade,
      socket,
    );
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
        if(elapsed>=0 && elapsed<360){
          const t=elapsed/360;
          const eased=t<0.30
            ?-(t/0.30)*0.30
            :Math.sin(((t-0.30)/0.70)*Math.PI)*1.10;
          e.weaponPivot.rotation.y=-0.10+eased;
          e.weaponPivot.rotation.z=-Math.max(0,eased)*0.10;
        }else{
          e.weaponPivot.rotation.y=-0.10;
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
