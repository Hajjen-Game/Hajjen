// Compact match-local coaching checklist. The coach never changes combat,
// unlocks or XP; it teaches which mechanic to practise in Training Grounds.
import { ABILITY_BY_ID } from "../abilityCatalog.js";
export class EnergyTrainingGuide{
  constructor(stage){
    this.node=document.createElement("aside");
    this.node.className="energy-training-coach";
    this.node.setAttribute("aria-label","Training objectives");
    this.heading=document.createElement("strong");
    this.detail=document.createElement("p");
    this.goals=document.createElement("div");
    this.goals.className="energy-coach-goals";
    this.node.append(this.heading,this.detail,this.goals);
    stage.appendChild(this.node);
    this.tasks=[];
  }
  start(match){
    this.match=match;
    this.node.hidden=match.modeId!=="training";
    if(this.node.hidden)return;
    const level=match.progressLevel;
    const newest=match.loadout.abilitySlots[match.loadout.abilitySlots.length-1]?.id;
    this.heading.textContent=level===1?"TRAINING · FIRST STEPS":"TRAINING · LEVEL "+level;
    this.detail.textContent=level===1?"Complete these basics at your own pace:"
      :"Practise your newest ability and the fundamentals:";
    this.tasks=level===1?[
      {id:"target",text:"Target your opponent (Tab or click)",done:false},
      {id:"move",text:"Move with WASD",done:false},
      {id:"cast",text:"Land an attack or use a core ability",done:false},
    ]:[
      {id:"target",text:"Select an opponent (Tab or click)",done:false},
      {id:"move",text:"Reposition with WASD",done:false},
      {id:"new",text:"Use "+(ABILITY_BY_ID[newest]?.name||"your newest ability"),spellId:newest,done:false},
    ];
    this.draw();
  }
  mark(id){
    const goal=this.tasks.find(t=>t.id===id);
    if(!goal||goal.done)return;
    goal.done=true;this.draw();
  }
  onTarget(actor){
    if(this.match?.modeId!=="training")return;
    if(actor?.team==="enemy"&&actor.alive)this.mark("target");
  }
  onMove(){
    if(this.match?.modeId==="training")this.mark("move");
  }
  onEvent(event){
    if(this.match?.modeId!=="training"||event.actorId!=="player")return;
    if(event.type==="ability"){
      this.mark("cast");
      if(this.tasks.find(t=>t.id==="new")?.spellId===event.spellId)this.mark("new");
    }
  }
  draw(){
    this.goals.replaceChildren();
    for(const goal of this.tasks){
      const line=document.createElement("div");
      line.className="energy-coach-goal"+(goal.done?" completed":"");
      const bullet=document.createElement("span");
      bullet.className="energy-coach-check";bullet.textContent=goal.done?"✓":"○";
      const text=document.createElement("span");text.textContent=goal.text;
      line.append(bullet,text);this.goals.appendChild(line);
    }
    this.node.classList.toggle("all-done",this.tasks.length>0&&this.tasks.every(t=>t.done));
    if(this.tasks.length&&this.tasks.every(t=>t.done))
      this.detail.textContent="ALL OBJECTIVES COMPLETE · Win or keep practising!";
  }
  dispose(){this.node.remove();this.match=null;this.tasks=[];}
}
