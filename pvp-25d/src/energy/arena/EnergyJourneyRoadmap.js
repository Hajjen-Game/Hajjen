// Project Energy / Journey Roadmap 1.1.
// New Journey Origins have LIVE first-clear progress and permanent discoveries.
// Legacy XP and aggregated wins are never imported as completed hexes.
// The map reads progress provided by the active Origin; it does not write saves.
export const JOURNEY_STEPS=Object.freeze(Array.from({length:20},(_,i)=>{
  const step=i+1;
  const events={
    1:["FIRST DISCOVERY","Choose a shared spell from any of the five disciplines.","sparkles"],
    3:["COUNTERPLAY","After this victory, new counterplay spells are offered before Hex 4.","shield"],
    5:["AI STYLES","Choose Balanced, Aggressive, Protective or Disruptive for either companion.","team"],
    7:["COMPLEXITY","Unlock more advanced spell choices before Hex 8.","sparkles"],
    8:["FULL LOADOUT","Your tenth active slot opens; future discoveries belong in your library.","sparkles"],
    10:["EVOLUTIONS","First permanent rankless Evolution slot unlocked. Choose one of three paths for a discovered spell.","evolution"],
    12:["EVOLUTION SLOT","A second permanent Evolution can be activated.","evolution"],
    14:["EVOLUTION SLOT","A third permanent Evolution can be activated.","evolution"],
    16:["EVOLUTION SLOT","A fourth permanent Evolution can be activated.","evolution"],
    15:["AI BUILDS","Optional companion build editing with recommended presets already equipped.","team"],
    20:["RIFT EXPEDITION","Fifth Evolution slot unlocked. Synergies and Rift Expedition are still planned for a future update.","rift"]
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
    this.selected=1;this.clears=0;this.armed=false;this.tracked=false;
    // Only the currently active DEV Test Origin may replay cleared Stages.
    this.allowReplay=false;this.replayStage=20;
    this.buttons=new Map();
    this.build();
    this.render();
  }
  build(){
    this.map.replaceChildren();
    this.map.setAttribute("aria-label","20 Planet Defense Journey hexes. Select the next available Stage, or replay cleared Stages with a DEV Origin.");
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
        "Stage "+hex.step+", "+hex.title+
        ". See your active Origin's Journey status.");
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
    this.selected=this.allowReplay?
      Math.max(1,Math.min(20,this.replayStage||this.clears)):
      Math.min(20,this.clears+1);
    this.render();
  }
  select(step){
    // Ordinary Journey progression remains next-Stage-only. A DEV Test
    // Origin may deliberately replay an already-cleared Stage, never a
    // future Stage. No new reward is granted through this map.
    if(!Number.isInteger(step)||step<1||step>20)return false;
    const replay=this.allowReplay&&step<=this.clears;
    if(!replay&&step!==this.clears+1)return false;
    this.selected=step;this.armed=true;
    this.render();
    this.onSelect?.(JOURNEY_STEPS[step-1]);
    return true;
  }
  render(){
    // Never infer clear history from old .wins or XP: those mix several modes.
    const clears=this.clears;
    this.summary.textContent=this.allowReplay?
      "DEV TEST · SELECT A CLEARED STAGE TO REPLAY · "+clears+" / 20 CLEARED":
      this.tracked?"JOURNEY · "+clears+" / 20 CLEARED":
      "JOURNEY · 0 / 20 CLEARED";
    for(const hex of JOURNEY_STEPS){
      const button=this.buttons.get(hex.step);
      const replayable=this.allowReplay&&hex.step<=clears;
      const available=replayable||hex.step===clears+1;
      button.classList.toggle("completed",hex.step<=clears);
      button.classList.toggle("replayable",replayable);
      button.classList.toggle("next",hex.step===clears+1);
      button.classList.toggle("milestone",hex.milestone);
      button.classList.toggle("selected",this.armed&&hex.step===this.selected);
      button.disabled=!available;
      button.setAttribute("aria-pressed",String(this.armed&&hex.step===this.selected));
      button.querySelector(".journey-hex-symbol").textContent=
        hex.step<=clears?"✓":glyphs[hex.kind];
      button.setAttribute("aria-label","Stage "+hex.step+" — "+hex.title+
        "; "+(replayable?"cleared, click to play Stage again":
          hex.step<=clears?"completed":hex.step===clears+1?"next available":"future locked")+
        "; "+(button.disabled?"locked":"selectable")+".");
    }
    const hex=JOURNEY_STEPS[this.selected-1];
    this.detail.replaceChildren();
    const heading=document.createElement("div");
    heading.className="journey-detail-heading";
    const number=document.createElement("span");
    number.textContent="STAGE "+String(hex.step).padStart(2,"0")+" / 20";
    const state=document.createElement("span");
    state.textContent=this.allowReplay&&hex.step<=clears?
      this.armed?"SELECTED · PLAY STAGE AGAIN":"✓ CLEARED · REPLAY AVAILABLE":
      hex.step<=clears?"✓ STAGE CLEARED":
      this.armed?"SELECTED · READY TO PLAY":
      hex.step===clears+1?"NEXT AVAILABLE · SELECT THE HEX":"FUTURE MILESTONE";
    heading.append(number,state);
    const title=document.createElement("strong");title.textContent=hex.title;
    const description=document.createElement("p");description.textContent=hex.description;
    const note=document.createElement("small");
    note.textContent=this.allowReplay?
      "DEV TEST REPLAY · Choose a green, completed hex and press PLAY STAGE AGAIN. Your full build, Evolutions and AI Styles remain active. Replays grant no rewards and do not change your 20/20 progress.":
      this.tracked?
      "This Origin's first-clear progress is saved. Completing the next Stage advances your Journey; permanent spell discoveries are claimed in HUB.":
      "Legacy Origin preview: old XP or PvP wins do not count as hex clears. Existing saves are untouched.";
    this.detail.append(heading,title,description,note);
  }
}
