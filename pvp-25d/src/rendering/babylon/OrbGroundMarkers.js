// Orb Arena allegiance markers: small Babylon meshes lying flat on the floor.
// Intentionally independent of OrbCharacterRenderer / Pixi spell VFX.
// Any failure can disable markers without taking down the arena.
const TAU=Math.PI*2;
const TEAM_COLORS={
  friendly:{base:"#40cc84",arc:"#66ffac"},
  enemy:{base:"#e44753",arc:"#ff6a72"},
};

function markerMaterial(scene,name,hex,alpha,emission){
  const m=new BABYLON.StandardMaterial(name,scene);
  const tint=BABYLON.Color3.FromHexString(hex);
  m.diffuseColor=tint.scale(0.09);
  m.emissiveColor=tint.scale(emission);
  m.specularColor=BABYLON.Color3.Black();
  m.disableLighting=true;
  m.backFaceCulling=false;
  m.alpha=alpha;
  m.needDepthPrePass=false;
  m.disableDepthWrite=true;
  if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined){
    m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
  }
  return m;
}

export class OrbGroundMarkers{
  constructor(scene,scale){
    this.scene=scene;
    this.scale=scale;
    this.entries=new Map();
    this.materials={};
    for(const team of ["friendly","enemy"]){
      const p=TEAM_COLORS[team];
      this.materials[team]={
        base:markerMaterial(scene,"orb-ground-"+team+"-base",p.base,.40,.48),
        arc:markerMaterial(scene,"orb-ground-"+team+"-arc",p.arc,.88,.96),
        selectedBase:markerMaterial(scene,"orb-ground-"+team+"-selected-base",p.base,.98,1.22),
        selectedArc:markerMaterial(scene,"orb-ground-"+team+"-selected-arc",p.arc,1.00,1.90),
        selectedGlow:markerMaterial(scene,"orb-ground-"+team+"-selected-glow",p.arc,.45,1.52),
      };
    }
  }

  create(actor){
    const team=actor.team==="friendly"?"friendly":"enemy";
    const materials=this.materials[team];
    const root=new BABYLON.TransformNode("orb-ground-marker:"+actor.id,this.scene);
    // Floor top is about 0.0175; 0.065 avoids z-fighting without
    // placing the ring at the glass orb's mid-height (0.88).
    root.position.y=.065;

    // Flat XZ torus. Not parented to the orb's bobbing / rotation.
    const base=BABYLON.MeshBuilder.CreateTorus(
      "orb-ground-base:"+actor.id,
      {diameter:1.72,thickness:.025,tessellation:72},
      this.scene,
    );
    base.parent=root;
    base.material=materials.base;
    base.isPickable=false;

    // A second, wider halo makes the CURRENT target unmistakable, while
    // remaining flat on the floor below the orb rather than around its body.
    // Disabled by default: all untargeted actors keep their previous look.
    const targetHalo=BABYLON.MeshBuilder.CreateTorus(
      "orb-ground-target-halo:"+actor.id,
      {diameter:2.08,thickness:.080,tessellation:80},
      this.scene,
    );
    targetHalo.parent=root;
    targetHalo.position.y=.002;
    targetHalo.material=materials.selectedGlow;
    targetHalo.isPickable=false;
    targetHalo.setEnabled(false);

    const targetOutline=BABYLON.MeshBuilder.CreateTorus(
      "orb-ground-target-outline:"+actor.id,
      {diameter:2.08,thickness:.022,tessellation:80},
      this.scene,
    );
    targetOutline.parent=root;
    targetOutline.position.y=.012;
    targetOutline.material=materials.selectedArc;
    targetOutline.isPickable=false;
    targetOutline.setEnabled(false);

    // Three light accents travel around the otherwise stable ring.
    const accents=new BABYLON.TransformNode(
      "orb-ground-accents:"+actor.id,this.scene,
    );
    accents.parent=root;
    const arcs=[];
    for(let i=0;i<3;i++){
      const points=[];
      const start=i*TAU/3;
      const span=[.73,.49,.60][i];
      for(let j=0;j<=15;j++){
        const a=start+span*j/15;
        points.push(new BABYLON.Vector3(
          Math.cos(a)*.86,
          .007,
          Math.sin(a)*.86,
        ));
      }
      const arc=BABYLON.MeshBuilder.CreateTube(
        "orb-ground-arc:"+actor.id+":"+i,
        {path:points,radius:i===0?.020:.015,tessellation:5},
        this.scene,
      );
      arc.parent=accents;
      arc.material=materials.arc;
      arc.isPickable=false;
      arcs.push(arc);
    }
    const entry={root,accents,base,targetHalo,targetOutline,arcs,team,materials};
    this.entries.set(actor.id,entry);
    return entry;
  }

  sync(game,now){
    const actors=game.actors||[];
    const aliveIds=new Set();
    const selectedId=game.player?.targetId;
    const t=now*.001;
    for(const actor of actors){
      if(!actor.alive)continue;
      aliveIds.add(actor.id);
      const team=actor.team==="friendly"?"friendly":"enemy";
      let entry=this.entries.get(actor.id);
      if(entry&&entry.team!==team){
        entry.root.dispose(false,false);
        this.entries.delete(actor.id);
        entry=null;
      }
      entry=entry||this.create(actor);
      entry.root.position.set(actor.x*this.scale,.065,actor.y*this.scale);
      const selected=actor.id===selectedId;
      entry.base.material=selected?entry.materials.selectedBase:entry.materials.base;
      for(const arc of entry.arcs){
        arc.material=selected?entry.materials.selectedArc:entry.materials.arc;
      }
      entry.accents.rotation.y=(team==="friendly"?1:-1)*t*(selected?1.12:.85);
      entry.targetHalo.setEnabled(selected);
      entry.targetOutline.setEnabled(selected);
      if(selected){
        // Stronger, readable selected-target signal with a living outer halo.
        // We never scale/rotate the orb itself or change gameplay collision.
        const pulse=Math.sin(t*(team==="enemy"?7.2:5.8));
        entry.root.scaling.setAll(1.105+.032*pulse);
        entry.targetHalo.scaling.setAll(1.01+.033*Math.sin(t*4.8));
        entry.targetOutline.scaling.setAll(1.005+.016*Math.sin(t*6.2));
      }else{
        entry.root.scaling.setAll(
          1+.008*Math.sin(t*2.7+String(actor.id).length),
        );
      }
    }
    for(const [id,entry] of this.entries){
      if(aliveIds.has(id))continue;
      entry.root.dispose(false,false);
      this.entries.delete(id);
    }
  }

  dispose(){
    // These entries share one material set per team: never dispose materials
    // via mesh disposal until the renderer itself shuts down.
    for(const entry of this.entries.values())entry.root.dispose(false,false);
    this.entries.clear();
    for(const mats of Object.values(this.materials)){
      for(const material of Object.values(mats))material.dispose();
    }
    this.materials={};
  }
}
