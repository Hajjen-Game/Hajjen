// Energy Arena character home, onboarding and visual talent/evolution workbench.
// Reuses the real Energy build engine; never draws a decorative substitute orb.
import { ABILITY_BY_ID, FREE_ABILITIES, DISCIPLINES, ROLES } from "../abilityCatalog.js";
import { createBuild, allEquippedIds, equipAbility, adjustTalent, chooseEvolution, resetTalents,
  spentTalentPoints, activeEvolutionCount, writeBuildStorage } from "../buildState.js";
import { MODES, progressDetails, stagedLoadout } from "./EnergyProgression.js?v=20261009-character-hub27";
import { loadCharacter, saveCharacter, talentPointsForLevel, energyIdentity } from "./EnergyCharacter.js?v=20261009-character-hub27";
import { EnergyOrbShowcase } from "./EnergyOrbShowcase.js?v=20261009-hub-orbit29";

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
    this.preview=null;this.selectedAbility=null;this.showSwapPicker=false;
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
    $("hub-reset-talents").addEventListener("click",()=>{
      if(!window.confirm("Reset all allocated Talent Points and chosen Evolutions?"))return;
      this.store.draft=resetTalents(this.store.draft);
      this.persist();this.message="Talent Points and Evolutions reset.";this.draw();
    });
    $("hub-change-ability").addEventListener("click",()=>{
      this.showSwapPicker=!this.showSwapPicker;this.renderLibrary();
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
    this.renderTree();
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
    const liveEvolutions=active.filter(spell=>spell.evolutionId).length;
    $("hub-talent-points").textContent=Math.max(0,cap-used)+" AVAILABLE";
    $("hub-evolution-count").textContent=liveEvolutions+" / 2 ACTIVE";
    $("hub-spellbook-count").textContent=active.length+" / 10 UNLOCKED";
    const list=$("hub-spell-nodes");list.replaceChildren();
    if(!this.selectedAbility||!active.some(spell=>spell.id===this.selectedAbility)){
      this.selectedAbility=active[0]?.id||null;this.showSwapPicker=false;
    }
    full.forEach((slot,index)=>{
      const ability=ABILITY_BY_ID[slot.id];
      const unlocked=index<active.length;
      const rank=active.find(spell=>spell.id===slot.id)?.talentRank||0;
      const evolved=Boolean(active.find(spell=>spell.id===slot.id)?.evolutionId);
      const canUpgrade=unlocked&&rank<3&&used<cap;
      const selected=this.selectedAbility===slot.id;
      const node=button("","hub-spell-node"+(unlocked?" unlocked":" locked")+
        (selected?" selected":"")+(evolved?" evolved":"")+(canUpgrade?" upgradeable":""),()=>{
          this.selectedAbility=slot.id;this.showSwapPicker=false;this.renderTree();
        });
      node.disabled=!unlocked;
      node.setAttribute("aria-pressed",String(selected));
      node.style.setProperty("--spell-tone",DISCIPLINES[ability.discipline].color);
      const symbol=el("span","hub-spell-symbol",glyphs[ability.discipline]);
      const text=el("span","hub-spell-copy");
      text.append(el("strong","hub-spell-name",ability.name),
        el("small","hub-spell-category",ability.category.toUpperCase()),
        el("span","hub-spell-level",unlocked?"RANK "+rank+" / 3":"UNLOCK AT LEVEL "+(index-1)));
      const status=el("span","hub-spell-state",!unlocked?"▣":evolved?"✦":canUpgrade?"＋":"✓");
      status.setAttribute("aria-hidden","true");
      node.append(symbol,text,status);list.append(node);
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
    const cap=talentPointsForLevel(state.level),spent=spentTalentPoints(build);
    const live=stagedLoadout(build,state.level).abilitySlots.find(spell=>spell.id===ability.id);
    const rank=live?.talentRank||0,plannedRank=build.talents[ability.id]||0;
    const selectedEvolution=build.evolutions[ability.id]||null;
    const tone=DISCIPLINES[ability.discipline].color;
    holder.style.setProperty("--spell-tone",tone);
    const head=el("div","hub-panel-heading");
    head.append(el("h3","","SPELL EVOLUTION TREE"),
      el("span","hub-path-indicator",ability.name+" · RANK "+rank+"/3"));
    const origin=el("div","hub-tree-origin");
    origin.append(el("span","hub-origin-icon",glyphs[ability.discipline]),
      el("strong","",ability.name),el("small","","BASE SPELL"),
      el("p","",ability.description));
    const rankRow=el("div","hub-rank-row");
    rankRow.style.setProperty("--rank-fill",(rank/3*100)+"%");
    for(let i=1;i<=3;i++){
      const earned=i<=rank;
      const available=i===plannedRank+1&&spent<cap;
      const btn=button("","hub-rank-node"+(earned?" mastered":"")+
        (available?" available":"")+(i<=plannedRank&&!earned?" planned":""),()=>{
          if(available)this.editTalent(ability.id,1);
        });
      btn.disabled=!available;
      btn.setAttribute("aria-label","Rank "+i+": "+(earned?"unlocked":available?"spend one Talent Point":"locked"));
      btn.append(el("span","hub-rank-glyph",earned?"✓":available?"＋":"◆"),
        el("strong","","RANK "+i),
        el("small","",earned?"UNLOCKED":i<=plannedRank?"PLANNED":available?"1 TALENT POINT":"LOCKED"));
      rankRow.append(btn);
    }
    const canSpend=plannedRank<3&&spent<cap;
    const controls=el("div","hub-tree-controls");
    const hint=el("span","hub-tree-hint",
      plannedRank>rank?"Some points are planned in Advanced Build Lab and will activate as you level up.":
        rank===3?"Mastery complete. Choose one of the three evolutions below.":
        spent>=cap?"Earn more Talent Points by leveling up, or refund a rank.":
        "Spend 1 Talent Point per rank. Rank 3 unlocks an Evolution choice.");
    const actions=el("div","hub-rank-actions");
    const minus=button("− REFUND","hub-rank-action secondary",()=>this.editTalent(ability.id,-1));
    minus.disabled=plannedRank===0;
    const plus=button(rank===3?"MAX RANK":canSpend?"+ UNLOCK NEXT RANK":"NO POINTS","hub-rank-action primary",()=>this.editTalent(ability.id,1));
    plus.disabled=!canSpend;
    actions.append(minus,plus);controls.append(hint,actions);
    const branchTitle=el("div","hub-evolution-label");
    branchTitle.append(el("strong","","CHOOSE YOUR EVOLUTION"),
      el("small","","At Rank 3, pick one path. Up to two spells can be evolved in your build."));
    const paths=el("div","hub-evolution-branches");
    const slotsFull=activeEvolutionCount(build)>=2;
    for(const [i,ev] of ability.evolutions.entries()){
      const chosen=selectedEvolution===ev.id;
      const allowed=rank===3&&(chosen||!slotsFull);
      const node=button("","hub-evolution-node"+(chosen?" active":"")+
        (!allowed?" disabled":"") ,()=>{
          if(!allowed)return;
          this.mutate(()=>chooseEvolution(this.store.draft,ability.id,chosen?null:ev.id));
        });
      node.disabled=!allowed;
      node.setAttribute("aria-pressed",String(chosen));
      const badge=el("span","hub-evolution-glyph",["✦","➤","◈"][i]);
      const title=el("strong","hub-branch-heading",ev.name);
      const description=el("p","hub-branch-description",ev.description);
      const status=el("span","hub-branch-status",chosen?"✓ SELECTED":
        rank<3?"REQUIRES RANK 3":slotsFull?"2 / 2 EVOLUTIONS USED":"CHOOSE PATH →");
      node.append(badge,title,description,status);
      paths.append(node);
    }
    holder.append(head,origin,rankRow,controls,branchTitle,paths);
    this.renderDetail(ability,rank,plannedRank,selectedEvolution);
  }
  renderDetail(ability,rank,plannedRank,selectedEvolution){
    const tone=DISCIPLINES[ability.discipline].color;
    const spell=$("hub-detail-spell");spell.replaceChildren();
    spell.style.setProperty("--spell-tone",tone);
    const summary=el("div","hub-detail-title");
    const symbol=el("span","hub-detail-icon",glyphs[ability.discipline]);
    const info=el("div","");
    info.append(el("strong","",ability.name),
      el("small","",DISCIPLINES[ability.discipline].name.toUpperCase()+" · "+ability.category.toUpperCase()));
    summary.append(symbol,info);
    spell.append(summary,el("p","hub-detail-description",ability.description));
    const current=$("hub-detail-current");current.replaceChildren();
    current.append(el("h4","","CURRENT MASTERY"),
      el("div","hub-detail-stat","RANK "+rank+" / 3"),
      el("p","",ability.details));
    const next=$("hub-detail-next");next.replaceChildren();
    next.append(el("h4","","NEXT UPGRADE"),
      el("strong","",rank===3?"MASTERY COMPLETE":rank<plannedRank?"RANK "+(rank+1)+" · PLANNED":
        "RANK "+(rank+1)),
      el("p","",rank===3?"This spell has unlocked its evolution branches.":
        rank===2?"Spend 1 Talent Point to unlock this spell's evolution choices.":
        "Invest a Talent Point here to progress toward Rank 3 and unlock evolution."));
    const evolved=$("hub-detail-evolution");evolved.replaceChildren();
    const selected=ability.evolutions.find(ev=>ev.id===selectedEvolution);
    evolved.append(el("h4","","SELECTED EVOLUTION"),
      el("strong","",selected?selected.name:"NONE YET"),
      el("p","",selected?selected.description:
        "Reach Rank 3 to choose one of three ways to transform this spell."));
  }
  renderLibrary(){
    const build=this.store.draft;
    const state=progressDetails(this.getProgression());
    const active=stagedLoadout(build,state.level).abilitySlots;
    const index=active.findIndex(spell=>spell.id===this.selectedAbility);
    const foundational=new Set(stagedLoadout(build,1).abilitySlots.map(spell=>spell.id));
    const editable=index>=3&&!foundational.has(this.selectedAbility);
    const area=$("hub-spell-swap-area"),holder=$("hub-spell-library"),toggle=$("hub-change-ability");
    area.hidden=!editable;
    if(!editable){this.showSwapPicker=false;holder.hidden=true;return;}
    toggle.textContent=this.showSwapPicker?"CLOSE ABILITY OPTIONS":"CHANGE THIS ABILITY";
    holder.hidden=!this.showSwapPicker;
    holder.replaceChildren();
    if(!this.showSwapPicker)return;
    const free=build.freeSlots;
    const oldIndex=free.indexOf(this.selectedAbility);
    const freeIndex=oldIndex>=0?oldIndex:free.findIndex(id=>id===null);
    if(freeIndex<0){
      holder.append(el("p","","No free slot is available. Use Advanced Build Lab to rearrange abilities."));
      return;
    }
    holder.append(el("p","","Replace this unlocked ability. Any Talent Points spent on it will be refunded."));
    const selector=el("select","hub-swap-slot");
    selector.setAttribute("aria-label","Choose replacement ability");
    const used=new Set(active.map(spell=>spell.id));
    const current=el("option","",ABILITY_BY_ID[this.selectedAbility].name+" (KEEP)");
    current.value=this.selectedAbility;selector.append(current);
    for(const ability of FREE_ABILITIES){
      if(used.has(ability.id)||foundational.has(ability.id))continue;
      const option=el("option","",ability.name+" · "+DISCIPLINES[ability.discipline].name);
      option.value=ability.id;selector.append(option);
    }
    const confirm=button("REPLACE ABILITY →","hub-rank-action primary",()=>{
      if(selector.value===this.selectedAbility){this.showSwapPicker=false;this.renderLibrary();return;}
      const nextId=selector.value;
      this.mutate(()=>equipAbility(this.store.draft,freeIndex,nextId));
      this.selectedAbility=nextId;this.showSwapPicker=false;this.renderTree();
    });
    holder.append(selector,confirm);
  }
  editTalent(id,delta){
    const level=progressDetails(this.getProgression()).level;
    const limit=talentPointsForLevel(level);
    if(delta>0&&spentTalentPoints(this.store.draft)>=limit){
      this.setMessage("Earn more Talent Points by leveling up.");return;
    }
    this.mutate(()=>{
      let build=this.store.draft;
      // Progression auto-fills early combat spells. Pin an auto-filled spell
      // to a real free slot before investing, so the point is persisted.
      if(delta>0&&!allEquippedIds(build).includes(id)){
        const freeIndex=build.freeSlots.findIndex(value=>value===null);
        if(freeIndex<0)throw Error("No free ability slot is available.");
        build=equipAbility(build,freeIndex,id);
      }
      return adjustTalent(build,id,delta);
    });
  }
  mutate(fn){
    try{
      this.store.draft=fn();this.persist();this.message="Build updated · Energy synchronised.";
      this.draw();
    }catch(error){this.setMessage(error?.message||"Could not update build.");}
  }
  dispose(){this.preview?.dispose();this.preview=null;}
}
