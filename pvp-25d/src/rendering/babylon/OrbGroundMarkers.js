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
        base:markerMaterial(scene,"orb-ground-"+team+"-base",p.base,.37,.42),
        arc:markerMaterial(scene,"orb-ground-"+team+"-arc",p.arc,.85,.85),
        // Selected target gets a larger readable ring, with detail confined
        // to its circumference. Normal friend/enemy markers stay unchanged.
        selectedBase:markerMaterial(scene,"orb-ground-"+team+"-selected-base",p.base,.72,.83),
        selectedTrack:markerMaterial(scene,"orb-ground-"+team+"-selected-track",p.base,.45,.67),
        selectedArc:markerMaterial(scene,"orb-ground-"+team+"-selected-arc",p.arc,.96,1.48),
        selectedGlow:markerMaterial(scene,"orb-ground-"+team+"-selected-glow",p.arc,.22,.75),
        selectedDot:markerMaterial(scene,"orb-ground-"+team+"-selected-dot",p.arc,.86,1.06),
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
      {diameter:1.72,thickness:.041,tessellation:128},
      this.scene,
    );
    base.parent=root;
    base.material=materials.base;
    base.isPickable=false;

    // The selected target uses an asymmetric segmented orbital indicator,
    // lying in XZ on the arena floor. Meshes are inactive unless targeted.
    // Separate rotations make it feel like a living lock-on, not a HUD ring.
    const selectedGroup=new BABYLON.TransformNode(
      "orb-ground-lock:"+actor.id,this.scene,
    );
    selectedGroup.parent=root;
    selectedGroup.setEnabled(false);
    // Faint complete track restores target legibility at normal camera zoom;
    // rotating arcs and glints are an accent, not the whole indicator.
    const selectedTrack=BABYLON.MeshBuilder.CreateTorus(
      "orb-ground-lock-track:"+actor.id,
      {diameter:2.02,thickness:.033,tessellation:128},
      this.scene,
    );
    selectedTrack.parent=selectedGroup;
    selectedTrack.position.y=.008;
    selectedTrack.material=materials.selectedTrack;
    selectedTrack.isPickable=false;
    const selectedArcsPivot=new BABYLON.TransformNode(
      "orb-ground-lock-arcs:"+actor.id,this.scene,
    );
    selectedArcsPivot.parent=selectedGroup;
    const selectedTicksPivot=new BABYLON.TransformNode(
      "orb-ground-lock-ticks:"+actor.id,this.scene,
    );
    selectedTicksPivot.parent=selectedGroup;
    const selectedArcs=[];
    const selectedGlowArcs=[];
    const arcAngles=[.08,1.68,3.17,4.80];
    const arcSpans=[1.08,.90,1.05,.86];
    for(let i=0;i<4;i++){
      const path=[];
      for(let j=0;j<=40;j++){
        const a=arcAngles[i]+arcSpans[i]*j/40;
        path.push(new BABYLON.Vector3(
          Math.cos(a)*1.012,.014,Math.sin(a)*1.012,
        ));
      }
      const arc=BABYLON.MeshBuilder.CreateTube(
        "orb-ground-lock-segment:"+actor.id+":"+i,
        {path,radius:i%2===0?.027:.023,tessellation:12},
        this.scene,
      );
      arc.parent=selectedArcsPivot;
      arc.material=materials.selectedArc;
      arc.isPickable=false;
      selectedArcs.push(arc);
      if(i%2===0){
        // Faint, slightly broader glow behind two arcs, not a solid halo.
        const glowPath=path.map(p=>
          new BABYLON.Vector3(p.x,.006,p.z)
        );
        const glow=BABYLON.MeshBuilder.CreateTube(
          "orb-ground-lock-soft:"+actor.id+":"+i,
          {path:glowPath,radius:.043,tessellation:10},
          this.scene,
        );
        glow.parent=selectedArcsPivot;
        glow.material=materials.selectedGlow;
        glow.isPickable=false;
        selectedGlowArcs.push(glow);
      }
    }
    const selectedTicks=[];
    for(let i=0;i<5;i++){
      const angle=(i+.21*(i%3))*TAU/5;
      const span=i%2===0?.105:.063;
      // Short tangent marks, never radial spikes beyond the ring.
      const tickPath=[-span*.5,span*.5].map(offset=>
        new BABYLON.Vector3(
          Math.cos(angle+offset)*1.018,.016,Math.sin(angle+offset)*1.018,
        )
      );
      const tick=BABYLON.MeshBuilder.CreateTube(
        "orb-ground-lock-tick:"+actor.id+":"+i,
        {path:tickPath,radius:i%2===0?.016:.012,tessellation:10},
        this.scene,
      );
      tick.parent=selectedTicksPivot;
      tick.material=materials.selectedArc;
      tick.isPickable=false;
      selectedTicks.push(tick);
    }
    const selectedDots=[];
    for(let i=0;i<3;i++){
      const angle=(i+.36)*TAU/3;
      const dot=BABYLON.MeshBuilder.CreateSphere(
        "orb-ground-lock-dot:"+actor.id+":"+i,
        {diameter:i%2===0?.036:.027,segments:12},
        this.scene,
      );
      dot.parent=selectedTicksPivot;
      dot.position.set(Math.cos(angle)*1.014,.018,Math.sin(angle)*1.014);
      dot.material=materials.selectedDot;
      dot.isPickable=false;
      selectedDots.push(dot);
    }

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
      for(let j=0;j<=32;j++){
        const a=start+span*j/32;
        points.push(new BABYLON.Vector3(
          Math.cos(a)*.86,
          .007,
          Math.sin(a)*.86,
        ));
      }
      const arc=BABYLON.MeshBuilder.CreateTube(
        "orb-ground-arc:"+actor.id+":"+i,
        {path:points,radius:i===0?.027:.023,tessellation:12},
        this.scene,
      );
      arc.parent=accents;
      arc.material=materials.arc;
      arc.isPickable=false;
      arcs.push(arc);
    }
    const entry={
      root,accents,base,arcs,team,materials,
      selectedGroup,selectedTrack,selectedArcsPivot,selectedTicksPivot,
      selectedArcs,selectedGlowArcs,selectedTicks,selectedDots,
    };
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
      const direction=team==="friendly"?1:-1;
      entry.accents.rotation.y=direction*t*(selected?1.10:.85);
      entry.selectedGroup.setEnabled(selected);
      if(selected){
        // Two unequal orbital speeds with a restrained breathing motion.
        // The ground marker turns; the 3D glass orb and collision do not.
        entry.selectedArcsPivot.rotation.y=direction*t*.66;
        entry.selectedTicksPivot.rotation.y=-direction*t*1.27;
        const phase=String(actor.id).length*.53;
        const pulse=Math.sin(t*(team==="enemy"?6.2:5.1)+phase);
        entry.root.scaling.setAll(1.042+.009*pulse);
        entry.selectedArcsPivot.scaling.setAll(1+.008*Math.sin(t*3.0+phase));
        for(let i=0;i<entry.selectedDots.length;i++){
          entry.selectedDots[i].visibility=.64+
            .28*(.5+.5*Math.sin(t*4.4+i*1.8+phase));
        }
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
