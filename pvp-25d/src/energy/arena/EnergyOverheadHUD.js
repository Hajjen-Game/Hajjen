// Energy Arena only — minimalist screen-space bars, inspired by Pixi 3v3.
// Cast colour above HP; no actor names, HP numerals, spell labels or panels.
// These are purely visual and do not intercept targeting or modify gameplay.
const SCALE=.02;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rgbColor=hex=>/^#[0-9a-f]{6}$/i.test(hex||"")?hex:"#94d7f2";

export class EnergyOverheadHUD {
  constructor(stage,renderer,abilities,disciplines){
    this.stage=stage;
    this.renderer=renderer;
    this.abilities=abilities;
    this.disciplines=disciplines;
    this.entries=new Map();
    this.layer=document.createElement("div");
    this.layer.className="energy-overhead-layer";
    this.layer.setAttribute("aria-hidden","true");
    stage.appendChild(this.layer);
  }
  create(actor){
    const root=document.createElement("div");
    root.className="energy-orb-bars";
    root.dataset.actorId=actor.id;
    const cast=document.createElement("div");
    cast.className="energy-orb-cast";
    cast.hidden=true;
    const castFill=document.createElement("div");
    castFill.className="energy-orb-cast-fill";
    cast.appendChild(castFill);
    const hp=document.createElement("div");
    hp.className="energy-orb-hp";
    const hpFill=document.createElement("div");
    hpFill.className="energy-orb-hp-fill";
    hp.appendChild(hpFill);
    // The bottom is anchored just above the orb. Revealing the cast bar
    // ABOVE HP does not move the HP bar or obscure the character.
    root.append(cast,hp);
    this.layer.appendChild(root);
    const entry={root,cast,castFill,hp,hpFill};
    this.entries.set(actor.id,entry);
    return entry;
  }
  project(actor){
    const scene=this.renderer.scene;
    if(!scene)return null;
    const viewport=new BABYLON.Viewport(0,0,
      Math.max(1,this.stage.clientWidth),Math.max(1,this.stage.clientHeight));
    const point=BABYLON.Vector3.Project(
      new BABYLON.Vector3(actor.x*SCALE,1.74,actor.y*SCALE),
      BABYLON.Matrix.Identity(),scene.getTransformMatrix(),viewport);
    return Number.isFinite(point.x)&&Number.isFinite(point.y)
      &&point.z>=0&&point.z<=1?point:null;
  }
  update(match){
    if(!match)return;
    const ids=new Set(match.actors.map(a=>a.id));
    for(const [id,e] of this.entries){
      if(!ids.has(id)){e.root.remove();this.entries.delete(id);}
    }
    for(const actor of match.actors){
      // Only suppress the old shared 3D strip in Energy Arena. The old
      // renderer and 3v3 are untouched.
      const orb=this.renderer.actorRender?.entries?.get(actor.id);
      if(orb?.barRoot)orb.barRoot.setEnabled(false);
      const e=this.entries.get(actor.id)||this.create(actor);
      if(!actor.alive){e.root.hidden=true;continue;}
      const pos=this.project(actor);
      if(!pos){e.root.hidden=true;continue;}
      e.root.hidden=false;
      e.root.style.left=pos.x.toFixed(1)+"px";
      e.root.style.top=pos.y.toFixed(1)+"px";
      const pct=clamp(actor.hp/Math.max(1,actor.maxHp),0,1);
      e.hpFill.style.width=(pct*100).toFixed(1)+"%";
      e.root.classList.toggle("friendly",actor.team==="friendly");
      e.root.classList.toggle("enemy",actor.team==="enemy");
      e.root.classList.toggle("player",actor.id==="player");
      e.root.classList.toggle("selected",match.player?.targetId===actor.id);
      e.root.classList.toggle("danger",pct<.2);
      e.root.classList.toggle("shielded",(actor.shield||0)>0);

      if(actor.cast){
        const ability=this.abilities[actor.cast.spellId];
        const colour=rgbColor(this.disciplines[ability?.discipline]?.color);
        e.root.style.setProperty("--cast-colour",colour);
        const total=Math.max(1,actor.cast.totalMs);
        e.castFill.style.width=(clamp(1-actor.cast.remainingMs/total,0,1)*100).toFixed(1)+"%";
        e.cast.hidden=false;
      }else{
        e.cast.hidden=true;
      }
    }
  }
  dispose(){
    this.layer.remove();
    this.entries.clear();
  }
}
