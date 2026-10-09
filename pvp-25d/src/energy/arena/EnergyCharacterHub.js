// Energy Arena character home, onboarding and visual talent/evolution workbench.
// Reuses the real Energy build engine; never draws a decorative substitute orb.
import { ABILITY_BY_ID, FREE_ABILITIES, DISCIPLINES, ROLES } from "../abilityCatalog.js";
import { createBuild, equipAbility, adjustTalent, chooseEvolution, resetTalents,
  spentTalentPoints, activeEvolutionCount, writeBuildStorage } from "../buildState.js";
import { MODES, progressDetails, stagedLoadout } from "./EnergyProgression.js?v=20261009-character-hub27";
import { loadCharacter, saveCharacter, talentPointsForLevel, energyIdentity } from "./EnergyCharacter.js?v=20261009-character-hub27";
import { EnergyOrbShowcase } from "./EnergyOrbShowcase.js?v=20261009-orb-preview-fix28";

const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
};
function button(text,cls,fn){
  const node=el("button",cls,text);node.type="button";node.addEventListener("click",fn);
  return node;
}
const glyphs={void:"◈",solar:"✦",cryo:"❖",kinetic:"⌁",vital:"✧"};

export class EnergyCharacterHub{
  constructor({storage,buildStore,getProgression,getMode,changeMode,startMatch}){
    this.storage=storage;this.store=buildStore;
    this.getProgression=getProgression;this.getMode=getMode;
    this.changeMode=changeMode;this.startMatch=startMatch;
    this.character=loadCharacter(storage);
    this.preview=null;this.selectedAbility=null;this.isEditing=false;
    this.message="";
    this.bind();
  }
  bind(){
    for(const item of document.querySelectorAll("[data-create-role]")){
      item.addEventListener("click",()=>{
        document.querySelectorAll("[data-create-role]").forEach(n=>{
          const active=n===item;
          n.classList.toggle("selected",active);
          n.setAttribute("aria-pressed",String(active));
        });
      });
    }
    $("create-character").addEventListener("click",()=>{
      try{
        const role=document.querySelector("[data-create-role].selected")?.dataset.createRole||"healer";
        const character=saveCharacter(this.storage,{name:$("new-character-name").value,role});
        this.character=character;
        // Preserve a former Build Lab draft as a preset before starting a
        // fresh character. If presets are full, keep a recoverable backup.
        const previous=this.store.draft;
        if(previous&&(previous.freeSlots||[]).some(Boolean)){
          const empty=this.store.saved.findIndex(b=>!b);
          if(empty>=0)this.store.saved[empty]=previous;
          else try{this.storage.setItem("pvp25d-energy-pre-character-draft-v1",JSON.stringify(previous));}
          catch{}
        }
        this.store.draft=createBuild(role);
        this.persist();
        this.open();
      }catch(error){$("create-character-error").textContent=error.message;}
    });
    $("new-character-name").addEventListener("keydown",e=>{
      if(e.key==="Enter")$("create-character").click();
    });
    $("hub-talents-button").addEventListener("click",()=>this.showTalents(true));
    $("hub-close-talents").addEventListener("click",()=>this.showTalents(false));
    $("hub-reset-talents").addEventListener("click",()=>{
      this.store.draft=resetTalents(this.store.draft);
      this.persist();this.draw();
    });
    $("hub-play-button").addEventListener("click",()=>{
      if(!this.character)return;
      this.startMatch(this.store.draft,this.getMode());
    });
    for(const item of document.querySelectorAll("[data-arena-mode]")){
      item.addEventListener("click",()=>{this.changeMode(item.dataset.arenaMode);this.renderModes();});
    }
    $("hub-name-edit").addEventListener("click",()=>{
      if(!this.character)return;
      const name=window.prompt("Name your Energy orb",this.character.name);
      if(name===null)return;
      try{this.character=saveCharacter(this.storage,{...this.character,name});this.draw();}
      catch(error){this.setMessage(error.message);}
    });
  }
  persist(){
    try{writeBuildStorage(this.storage,this.store);}
    catch{this.setMessage("Local storage is unavailable. Changes may not be retained.");}
  }
  setMessage(text){
    this.message=text;$("hub-status").textContent=text;
  }
  open(){
    $("combat-screen").hidden=true;
    $("build-gate").hidden=false;
    $("character-creation").hidden=Boolean(this.character);
    $("character-hub").hidden=!this.character;
    if(!this.character){
      $("new-character-name").value="";
      $("create-character-error").textContent="";
      return;
    }
    if(this.store.draft.role!==this.character.role){
      // A role switch made intentionally in Advanced Build Lab belongs to
      // this character. Never discard that edited build on return.
      this.character=saveCharacter(this.storage,{
        name:this.character.name,role:this.store.draft.role
      });
    }
    if(!this.preview){
      try{this.preview=new EnergyOrbShowcase($("hub-orb-canvas"));}
      catch(error){
        console.warn("Character 3D preview unavailable",error);
        $("hub-visual-fallback").hidden=false;
        $("hub-visual-fallback").textContent="Your character's energy portrait is temporarily unavailable.";
      }
    }
    this.preview?.setVisible(true);
    this.draw();
  }
  hide(){
    $("build-gate").hidden=true;
    // Free the separate HUB WebGL context while combat is rendering.
    this.preview?.dispose();this.preview=null;
  }
  showTalents(open){
    this.isEditing=Boolean(open);
    $("hub-talent-workbench").hidden=!open;
    $("hub-battle-modes").hidden=Boolean(open);
    $("hub-talents-button").setAttribute("aria-expanded",String(open));
    if(open)this.renderTree();
  }
  draw(){
    if(!this.character)return;
    const build=this.store.draft;
    const progress=progressDetails(this.getProgression());
    const identity=energyIdentity(build,progress.level);
    this.preview?.update(build,progress.level);
    $("hub-character-name").textContent=this.character.name;
    $("hub-role").textContent=ROLES[build.role].name.toUpperCase()+" · ENERGY ORB";
    $("hub-level").textContent="LEVEL "+progress.level;
    $("hub-level-subtitle").textContent=progress.slots+" OF 10 ABILITIES UNLOCKED";
    $("hub-xp").textContent=progress.maxLevel?"MAX LEVEL":
      progress.xp+" XP · "+progress.remaining+" TO NEXT LEVEL";
    $("hub-xp-fill").style.width=(progress.progress*100).toFixed(1)+"%";
    $("hub-focus").textContent=progress.lesson;
    $("hub-record").textContent=this.getProgression().wins+" WINS / "+this.getProgression().losses+" LOSSES";
    $("hub-energy-name").textContent=identity.label.toUpperCase();
    const weights=$("hub-energy-weights");weights.replaceChildren();
    const total=Object.values(identity.weights).reduce((a,b)=>a+b,0)||1;
    for(const [discipline,weight] of Object.entries(identity.weights)
      .filter(([,weight])=>weight>0).sort((a,b)=>b[1]-a[1])){
      const row=el("div","hub-energy-row");
      const label=el("span","",DISCIPLINES[discipline].name);
      const track=el("div","hub-energy-track");
      const fill=el("div","hub-energy-fill");
      fill.style.width=Math.max(5,weight/total*100)+"%";
      fill.style.background=DISCIPLINES[discipline].color;
      track.append(fill);row.append(label,track);weights.append(row);
    }
    $("hub-orb-stage").style.setProperty("--hub-core",identity.style.core);
    $("hub-orb-stage").style.setProperty("--hub-accent",identity.style.energy);
    this.renderModes();
    if(this.isEditing)this.renderTree();
    $("hub-status").textContent=this.message;
  }
  renderModes(){
    const selected=this.getMode();
    for(const n of document.querySelectorAll("[data-arena-mode]")){
      const id=n.dataset.arenaMode;
      n.classList.toggle("selected",id===selected);
      n.setAttribute("aria-pressed",String(id===selected));
      n.querySelector(".mode-label").textContent=MODES[id].label;
      n.querySelector(".mode-size").textContent=MODES[id].size;
      n.querySelector(".mode-description").textContent=MODES[id].description;
    }
    $("hub-play-button").textContent="ENTER "+MODES[selected].size+" ARENA →";
  }
  renderTree(){
    const build=this.store.draft;
    const state=progressDetails(this.getProgression());
    const active=stagedLoadout(build,state.level).abilitySlots;
    const full=stagedLoadout(build,8).abilitySlots;
    const cap=talentPointsForLevel(state.level);
    const used=spentTalentPoints(build);
    const effective=active.reduce((sum,spell)=>sum+spell.talentRank,0);
    $("hub-talent-points").textContent=Math.max(0,cap-used)+" AVAILABLE · "+
      effective+"/"+cap+" ACTIVE TP"+(used>cap?" · "+(used-cap)+" PLANNED":"");
    $("hub-evolution-count").textContent=activeEvolutionCount(build)+" / 2 EVOLUTIONS";
    const list=$("hub-spell-nodes");list.replaceChildren();
    if(!this.selectedAbility||!active.some(x=>x.id===this.selectedAbility))
      this.selectedAbility=active[0]?.id||null;
    full.forEach((slot,index)=>{
      const ability=ABILITY_BY_ID[slot.id];
      const unlocked=index<active.length,rank=active[index]?.talentRank||0;
      const node=button("", "hub-spell-node"+(unlocked?" unlocked":" locked")+
        (this.selectedAbility===slot.id?" selected":""),()=>{
          this.selectedAbility=slot.id;this.renderTree();
        });
      node.disabled=!unlocked;
      node.style.setProperty("--spell-tone",DISCIPLINES[ability.discipline].color);
      const symbol=el("span","hub-spell-symbol",glyphs[ability.discipline]);
      const name=el("span","hub-spell-name",ability.name);
      const number=el("span","hub-spell-level",unlocked?("RANK "+rank+"/3"):"LEVEL "+Math.min(8,index-1));
      node.append(symbol,name,number);list.append(node);
    });
    this.renderSelected();
    this.renderLibrary();
  }
  renderSelected(){
    const holder=$("hub-selected-spell");holder.replaceChildren();
    const ability=ABILITY_BY_ID[this.selectedAbility];
    if(!ability)return;
    const build=this.store.draft;
    const state=progressDetails(this.getProgression());
    const spent=spentTalentPoints(build),cap=talentPointsForLevel(state.level);
    const plannedRank=build.talents[ability.id]||0;
    const rank=stagedLoadout(build,state.level).abilitySlots.find(a=>a.id===ability.id)?.talentRank||0;
    holder.style.setProperty("--spell-tone",DISCIPLINES[ability.discipline].color);
    holder.append(el("p","eyebrow",DISCIPLINES[ability.discipline].name.toUpperCase()+" · "+ability.category.toUpperCase()),
      el("h3","",ability.name),el("p","hub-spell-description",ability.description));
    const growth=el("div","hub-talent-growth");
    const nodes=el("div","hub-talent-ranks");
    for(let i=1;i<=3;i++){
      nodes.append(el("span","hub-talent-rank"+(i<=rank?" active":""),String(i)));
    }
    const minus=button("−","hub-talent-adjust",()=>this.editTalent(ability.id,-1));
    const plus=button("+","hub-talent-adjust",()=>this.editTalent(ability.id,1));
    minus.disabled=plannedRank===0;
    plus.disabled=plannedRank===3||spent>=cap;
    growth.append(el("span","hub-small-label","SPELL MASTERY"),minus,nodes,plus);
    holder.append(growth,el("p","hub-tree-hint",
      plannedRank>rank?"Additional points are planned in Advanced Build Lab. "+
        "Only earned Talent Points take effect in combat.":
      rank<3?"Spend three earned Talent Points to unlock a spell evolution.":
      "Mastered · Choose one Evolution branch below."));
    const paths=el("div","hub-evolution-branches");
    for(const [i,ev] of ability.evolutions.entries()){
      const active=rank===3&&build.evolutions[ability.id]===ev.id;
      const btn=button("", "hub-evolution-node"+(active?" active":"")+(rank<3?" disabled":""),()=>{
        if(rank<3)return;
        this.mutate(()=>chooseEvolution(build,ability.id,active?null:ev.id));
      });
      btn.disabled=rank<3||(!active&&!build.evolutions[ability.id]&&activeEvolutionCount(build)>=2);
      const branch=el("span","hub-branch-line");
      const head=el("span","hub-branch-heading","0"+(i+1)+" · "+ev.name);
      const description=el("span","hub-branch-description",ev.description);
      const pill=el("span","hub-branch-status",active?"ACTIVE":rank<3?"REQUIRES RANK 3":"CHOOSE");
      btn.append(branch,head,description,pill);
      paths.append(btn);
    }
    holder.append(paths);
  }
  renderLibrary(){
    const build=this.store.draft;
    const state=progressDetails(this.getProgression());
    const active=stagedLoadout(build,state.level).abilitySlots;
    const holder=$("hub-spell-library");holder.replaceChildren();
    // Role starters remain stable; optional free spells can be customised
    // once the player reaches an additional unlocked slot.
    const available=state.slots>3;
    $("hub-library-label").textContent=available
      ?"CUSTOMISE YOUR NEXT FREE ABILITY":"MORE ABILITIES UNLOCK AT LEVEL 2";
    if(!available)return;
    const equipped=new Set(active.map(x=>x.id));
    const replaceable=active.filter(s=>!ROLES[build.role].locked.includes(s.id));
    if(!replaceable.length)return;
    const select=el("select","hub-swap-slot");
    select.setAttribute("aria-label","Ability to replace");
    for(const slot of replaceable){
      const opt=el("option","",ABILITY_BY_ID[slot.id].name);
      opt.value=slot.id;select.append(opt);
    }
    select.value=replaceable.some(x=>x.id===this.selectedAbility)
      ?this.selectedAbility:replaceable[0].id;
    const library=el("div","hub-library-grid");
    for(const a of FREE_ABILITIES){
      const node=button(a.name,"hub-library-ability",()=>{
        const old=select.value;
        const oldIndex=build.freeSlots.indexOf(old);
        // A starter spell can be temporarily auto-equipped without appearing
        // in saved draft. Find an empty slot; equip and keep the draft intact.
        const i=oldIndex>=0?oldIndex:build.freeSlots.indexOf(null);
        if(i<0){this.setMessage("All free slots used. Use Energy Build Lab to rearrange them.");return;}
        if(build.freeSlots.some((id,j)=>id===a.id&&j!==i)){
          this.setMessage(a.name+" is already in your build.");return;
        }
        this.mutate(()=>equipAbility(build,i,a.id));
        this.selectedAbility=a.id;
      });
      node.style.setProperty("--spell-tone",DISCIPLINES[a.discipline].color);
      node.disabled=equipped.has(a.id);
      if(equipped.has(a.id))node.classList.add("equipped");
      library.append(node);
    }
    holder.append(select,library);
  }
  editTalent(id,delta){
    const limit=talentPointsForLevel(progressDetails(this.getProgression()).level);
    if(delta>0&&spentTalentPoints(this.store.draft)>=limit){
      this.setMessage("Level up to earn more talent points.");return;
    }
    this.mutate(()=>adjustTalent(this.store.draft,id,delta));
  }
  mutate(fn){
    try{
      this.store.draft=fn();this.persist();this.message="Build updated · Energy synchronised.";
      this.draw();
    }catch(error){this.setMessage(error?.message||"Could not update build.");}
  }
  dispose(){this.preview?.dispose();this.preview=null;}
}
