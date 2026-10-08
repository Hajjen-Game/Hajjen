// Floating combat text with the same design intent as arena3v3 PixiProofRenderer:
// actor anchored, red damage, green heals, outlined numbers, quick pop and rise.
// Pure HUD overlay; does not alter Babylon's orb renderer or arena targeting.
const WORLD_SCALE=0.02;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PALETTE={
  damage:"#ff6c69",heal:"#7bea9c",absorb:"#aed9ff",control:"#f4d49a",
  interrupt:"#e3afff",immune:"#f3deb4",info:"#d8e7f7",
};

export class EnergyCombatFeedback{
  constructor(stage,renderer){
    this.stage=stage;this.renderer=renderer;this.items=[];
    this.layer=document.createElement("div");
    this.layer.className="energy-combat-text-layer";
    this.layer.setAttribute("aria-hidden","true");
    stage.appendChild(this.layer);
  }
  spawn(type,label,actorId,now=performance.now()){
    if(!label||!actorId)return;
    const actor=this.match?.getActor(actorId);
    if(!actor)return;
    const node=document.createElement("span");
    node.className="energy-combat-number energy-"+type;
    node.textContent=String(label);
    node.style.color=PALETTE[type]||PALETTE.info;
    const lane=this.items.filter(x=>x.actorId===actorId&&now-x.start<500).length;
    const item={type,node,actorId,start:now,duration:type==="damage"||type==="heal"?950:1150,lane};
    this.items.push(item);
    this.layer.appendChild(node);
    if(this.items.length>125){
      const old=this.items.shift();old.node.remove();
    }
  }
  onEvent(event,match){
    this.match=match;
    const to=event.targetId||event.actorId;
    if(event.type==="hit"){
      if(event.amount>0)this.spawn("damage","−"+event.amount,to);
      if(event.absorbed>0)this.spawn("absorb","ABSORB "+Math.round(event.absorbed),to);
    }else if(event.type==="heal"){
      if(event.amount>0)this.spawn("heal","+"+event.amount,to);
      else if(event.overheal>0 && event.actorId==="player")this.spawn("info","FULL HP",to);
    }else if(event.type==="control"){
      this.spawn("control",(event.spellId==="crystal-snare"?"ROOTED":"CONTROLLED"),to);
    }else if(event.type==="interrupt"){
      this.spawn("interrupt","INTERRUPTED",to);
    }else if(event.type==="immune"){
      this.spawn("immune","IMMUNE",to);
    }else if(event.type==="death"){
      this.spawn("info","ELIMINATED",event.actorId);
    }else if(event.type==="break"){
      this.spawn("info","CC BROKEN",to);
    }else if(event.type==="cleanse"){
      this.spawn("heal","CLEANSED",to);
    }else if(event.type==="shield"){
      this.spawn("absorb","SHIELD +"+Math.round(event.amount||0),to);
    }else if(event.type==="guard"){
      this.spawn("absorb","GUARDED",to);
    }else if(event.type==="link"){
      this.spawn("heal","LINKED",to);
    }else if(event.type==="nothing"&&event.actorId==="player"){
      this.spawn("info",event.message||"NO EFFECT",to);
    }
  }
  project(actor){
    const {scene}=this.renderer;
    if(!scene||!actor)return null;
    const viewport=new BABYLON.Viewport(0,0,
      Math.max(1,this.stage.clientWidth),Math.max(1,this.stage.clientHeight));
    const point=BABYLON.Vector3.Project(
      new BABYLON.Vector3(actor.x*WORLD_SCALE,1.60,actor.y*WORLD_SCALE),
      BABYLON.Matrix.Identity(),scene.getTransformMatrix(),viewport);
    return Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.z>=0&&point.z<=1?point:null;
  }
  update(match,now=performance.now()){
    this.match=match;
    for(let i=this.items.length-1;i>=0;i--){
      const item=this.items[i];
      const elapsed=now-item.start;
      if(elapsed>=item.duration){
        item.node.remove();this.items.splice(i,1);continue;
      }
      const actor=match.getActor(item.actorId),p=this.project(actor);
      if(!p){item.node.style.opacity="0";continue;}
      const t=clamp(elapsed/item.duration,0,1);
      const rise=(item.type==="heal"?34:46)*t;
      const offset=item.lane*19;
      const pop=t<.16?0.74+(.26*(t/.16)):1;
      item.node.style.left=(p.x+((item.lane%3)-1)*12)+"px";
      item.node.style.top=(p.y-rise-offset)+"px";
      item.node.style.opacity=String(Math.min(1,t/.09,(1-t)/.26));
      item.node.style.transform="translate(-50%,-50%) scale("+pop.toFixed(2)+")";
    }
  }
  dispose(){this.layer.remove();this.items.length=0;}
}
