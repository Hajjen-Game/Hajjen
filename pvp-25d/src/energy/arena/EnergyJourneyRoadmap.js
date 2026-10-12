// Project Energy / Journey Roadmap 1.1 visual preview.
// IMPORTANT: this is a READ-ONLY design prototype. Existing XP and generic
// match wins are NOT Planet Defense campaign clears. No unlocks/save writes.
export const JOURNEY_STEPS=Object.freeze(Array.from({length:20},(_,i)=>{
  const step=i+1;
  const events={
    1:["FIRST DISCOVERY","Choose a shared spell from any of the five disciplines.","sparkles"],
    3:["COUNTERPLAY","After this victory, new counterplay spells are offered before Hex 4.","shield"],
    5:["AI STYLES","Choose Balanced, Aggressive, Protective or Disruptive for either companion.","team"],
    7:["COMPLEXITY","Unlock more advanced spell choices before Hex 8.","sparkles"],
    8:["FULL LOADOUT","Your tenth active slot opens; future discoveries belong in your library.","sparkles"],
    10:["EVOLUTIONS","Evolutions begin. Change how equipped spells behave.","evolution"],
    15:["AI BUILDS","Optional companion build editing with recommended presets already equipped.","team"],
    20:["RIFT EXPEDITION","Proposed Synergies and Rift Expedition unlock milestone.","rift"]
  };
  const event=events[step];
  return Object.freeze({
    step,
    title:event?.[0]|| (step<=8?"SPELL DISCOVERY":
      step<=16?"LIBRARY & EVOLUTION":"RIFT PREPARATION"),
    description:event?.[1]|| (step<=8?
      "Discover one shared spell and grow your active loadout.":
      step<=16?"Expand your spell library or discover new Evolution possibilities.":
      "Prepare your Origin and its companions for tougher Rift threats."),
    kind:event?.[2]||"planet",
    milestone:!!event
  });
}));

const nodePosition=index=>{
  const row=Math.floor(index/5),offset=index%5;
  return {x:10+(row%2?4-offset:offset)*20,y:12.5+row*25};
};
const glyphs={sparkles:"✦",shield:"⬡",team:"◈",evolution:"✧",rift:"✺",planet:"⬡"};

export class EnergyJourneyRoadmap{
  constructor({map,detail,summary,onSelect=null}){
    this.map=map;this.detail=detail;this.summary=summary;
    this.onSelect=onSelect;
    this.selected=1;this.clears=0;this.armed=false;
    this.buttons=new Map();
    this.build();
    this.render();
  }
  build(){
    this.map.replaceChildren();
    this.map.setAttribute("aria-label","20 Planet Defense journey hexes — preview only");
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.classList.add("journey-route");
    svg.setAttribute("viewBox","0 0 1000 800");
    svg.setAttribute("preserveAspectRatio","none");
    svg.setAttribute("aria-hidden","true");
    const poly=document.createElementNS("http://www.w3.org/2000/svg","polyline");
    poly.setAttribute("points",JOURNEY_STEPS.map((_,index)=>{
      const p=nodePosition(index);return p.x*10+","+p.y*8;
    }).join(" "));
    poly.setAttribute("class","journey-route-line");
    svg.append(poly);
    this.map.append(svg);
    JOURNEY_STEPS.forEach((hex,index)=>{
      const spot=nodePosition(index);
      const button=document.createElement("button");
      button.type="button";
      button.className="journey-hex";
      button.style.left=spot.x+"%";button.style.top=spot.y+"%";
      button.dataset.hex=String(hex.step);
      button.setAttribute("aria-label",
        "Planet Defense step "+hex.step+", "+hex.title+
        ". Design preview, not yet earned.");
      const face=document.createElement("span");face.className="journey-hex-face";
      const number=document.createElement("small");number.textContent=String(hex.step).padStart(2,"0");
      const glyph=document.createElement("span");glyph.className="journey-hex-symbol";
      glyph.textContent=glyphs[hex.kind];
      face.append(number,glyph);button.append(face);
      const hover=document.createElement("span");hover.className="journey-hex-label";
      hover.textContent=hex.milestone?hex.title:"";
      button.append(hover);
      button.addEventListener("click",()=>this.select(hex.step));
      this.buttons.set(hex.step,button);
      this.map.append(button);
    });
  }
  resetSelection(){
    this.armed=false;
    this.selected=Math.min(20,this.clears+1);
    this.render();
  }
  select(step){
    // Only the first uncleared step can be armed for PLAY. Future milestones
    // are readable but cannot bypass the campaign route.
    if(step!==this.clears+1||step>20)return false;
    this.selected=step;this.armed=true;
    this.render();
    this.onSelect?.(JOURNEY_STEPS[step-1]);
    return true;
  }
  render(){
    // Never infer clear history from old .wins or XP: those mix several modes.
    const clears=this.clears;
    this.summary.textContent="PLANET DEFENSE · 20 HEXES · PREVIEW";
    for(const hex of JOURNEY_STEPS){
      const button=this.buttons.get(hex.step);
      button.classList.toggle("completed",hex.step<=clears);
      button.classList.toggle("next",hex.step===clears+1);
      button.classList.toggle("milestone",hex.milestone);
      button.classList.toggle("selected",this.armed&&hex.step===this.selected);
      button.disabled=hex.step!==clears+1;
      button.setAttribute("aria-pressed",String(this.armed&&hex.step===this.selected));
      button.setAttribute("aria-label","Planet Defense step "+hex.step+" — "+hex.title+
        "; "+(hex.step<=clears?"completed":hex.step===clears+1?"next planned":"future")+
        "; "+(button.disabled?"locked":"selectable")+"; roadmap preview.");
    }
    const hex=JOURNEY_STEPS[this.selected-1];
    this.detail.replaceChildren();
    const heading=document.createElement("div");
    heading.className="journey-detail-heading";
    const number=document.createElement("span");
    number.textContent="PLANET "+String(hex.step).padStart(2,"0")+" / 20";
    const state=document.createElement("span");
    state.textContent=this.armed?"SELECTED · READY TO PLAY":"NEXT AVAILABLE · SELECT THE HEX";
    heading.append(number,state);
    const title=document.createElement("strong");title.textContent=hex.title;
    const description=document.createElement("p");description.textContent=hex.description;
    const note=document.createElement("small");
    note.textContent="Selection starts the current Planet Defense prototype; hex wins, permanent rewards and progression tracking are not active yet. Existing saves remain untouched.";
    this.detail.append(heading,title,description,note);
  }
}
