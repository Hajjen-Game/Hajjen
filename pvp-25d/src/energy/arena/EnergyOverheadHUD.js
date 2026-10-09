// Energy Arena only. Screen-space overhead health/cast panels, projected
// from actor world positions so they remain legible at the gameplay camera.
// We never mutate or replace the shared Babylon orb renderer's geometry.
const SCALE=.02;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rgbColor=(hex)=>/^#[0-9a-f]{6}$/i.test(hex||"")?hex:"#94d7f2";

export class EnergyOverheadHUD{
  constructor(stage,renderer,abilities,disciplines){
    this.stage=stage;
    this.renderer=renderer;
    this.abilities=abilities;
    this.disciplines=disciplines;
    this.entries=new Map();
    this.interrupts=new Map();
    this.layer=document.createElement("div");
    this.layer.className="energy-overhead-layer";
    this.layer.setAttribute("aria-hidden","true");
    stage.appendChild(this.layer);
  }
  create(actor){
    const root=document.createElement("div");
    root.className="energy-overhead";
    root.dataset.actorId=actor.id;
    const title=document.createElement("div");
    title.className="energy-overhead-title";
    const label=document.createElement("span");
    label.className="energy-overhead-name";
    const value=document.createElement("span");
    value.className="energy-overhead-value";
    title.append(label,value);
    const hpTrack=document.createElement("div");
    hpTrack.className="energy-overhead-hp";
    const hpFill=document.createElement("div");
    hpFill.className="energy-overhead-hp-fill";
    hpTrack.append(hpFill);
    const cast=document.createElement("div");
    cast.className="energy-overhead-cast";
    const castTitle=document.createElement("div");
    castTitle.className="energy-overhead-cast-name";
    const spell=document.createElement("span");
    const time=document.createElement("span");
    castTitle.append(spell,time);
    const castTrack=document.createElement("div");
    castTrack.className="energy-overhead-cast-track";
    const castFill=document.createElement("div");
    castFill.className="energy-overhead-cast-fill";
    castTrack.append(castFill);
    cast.append(castTitle,castTrack);
    root.append(title,hpTrack,cast);
    this.layer.appendChild(root);
    const entry={root,label,value,hpFill,cast,spell,time,castFill};
    this.entries.set(actor.id,entry);
    return entry;
  }
  onEvent(event,now=performance.now()){
    // A recent kick gets a short dedicated visual feedback window, while
    // never hiding the HP bar or freezing the castbar after the interrupt.
    if(event.type==="interrupt"&&event.targetId)
      this.interrupts.set(event.targetId,now+800);
  }
  project(actor){
    const scene=this.renderer.scene;
    if(!scene)return null;
    const viewport=new BABYLON.Viewport(0,0,
      Math.max(1,this.stage.clientWidth),Math.max(1,this.stage.clientHeight));
    const point=BABYLON.Vector3.Project(
      new BABYLON.Vector3(actor.x*SCALE,1.96,actor.y*SCALE),
      BABYLON.Matrix.Identity(),scene.getTransformMatrix(),viewport);
    return Number.isFinite(point.x)&&Number.isFinite(point.y)
      &&point.z>=0&&point.z<=1?point:null;
  }
  update(match,now=performance.now()){
    if(!match)return;
    const liveIds=new Set(match.actors.map(a=>a.id));
    for(const [id,e] of this.entries){
      if(!liveIds.has(id)){
        e.root.remove();
        this.entries.delete(id);
        this.interrupts.delete(id);
      }
    }
    for(const actor of match.actors){
      // Shared orbs keep their low-level 3D bar for other renderers; Energy
      // Arena suppresses it while a readable 2D panel follows the same orb.
      const orb=this.renderer.actorRender?.entries?.get(actor.id);
      if(orb?.barRoot)orb.barRoot.setEnabled(false);
      const e=this.entries.get(actor.id)||this.create(actor);
      if(!actor.alive){e.root.hidden=true;continue;}
      const position=this.project(actor);
      if(!position){e.root.hidden=true;continue;}
      e.root.hidden=false;
      e.root.style.left=position.x.toFixed(1)+"px";
      e.root.style.top=position.y.toFixed(1)+"px";
      const pct=clamp(actor.hp/Math.max(1,actor.maxHp),0,1);
      const selected=match.player?.targetId===actor.id;
      const danger=pct<.20;
      e.root.classList.toggle("friendly",actor.team==="friendly");
      e.root.classList.toggle("enemy",actor.team==="enemy");
      e.root.classList.toggle("player",actor.id==="player");
      e.root.classList.toggle("selected",selected);
      e.root.classList.toggle("danger",danger);
      e.root.classList.toggle("shielded",(actor.shield||0)>0);
      const displayName=actor.id==="player"?"YOU":actor.name;
      if(e.label.textContent!==displayName)e.label.textContent=displayName;
      const hpText=Math.ceil(actor.hp)+"/"+actor.maxHp;
      if(e.value.textContent!==hpText)e.value.textContent=hpText;
      e.hpFill.style.width=(pct*100).toFixed(1)+"%";
      const casting=actor.cast;
      const interrupted=(this.interrupts.get(actor.id)||0)>now;
      if(casting){
        const ability=this.abilities[casting.spellId];
        const colour=rgbColor(this.disciplines[ability?.discipline]?.color);
        e.root.style.setProperty("--cast-colour",colour);
        const spellName=ability?.name||casting.spellId;
        if(e.spell.textContent!==spellName)e.spell.textContent=spellName;
        e.time.textContent=Math.max(0,casting.remainingMs/1000).toFixed(1)+"s";
        e.castFill.style.width=(clamp(
          1-casting.remainingMs/Math.max(1,casting.totalMs),0,1)*100
        ).toFixed(1)+"%";
        e.cast.classList.remove("interrupted");
        e.cast.hidden=false;
      }else if(interrupted){
        e.cast.hidden=false;
        e.cast.classList.add("interrupted");
        e.spell.textContent="INTERRUPTED";
        e.time.textContent="";
        e.castFill.style.width="100%";
      }else{
        e.cast.hidden=true;
        e.cast.classList.remove("interrupted");
        this.interrupts.delete(actor.id);
      }
    }
  }
  dispose(){
    this.layer.remove();
    this.entries.clear();
    this.interrupts.clear();
  }
}
