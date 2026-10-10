// Energy Arena character home, onboarding and visual talent/evolution workbench.
// Reuses the real Energy build engine; never draws a decorative substitute orb.
import { ABILITY_BY_ID, FREE_ABILITIES, DISCIPLINES, ROLES, availableAbilities } from "../abilityCatalog.js?v=20261010-origins35";
import { createBuild, allEquippedIds, equipAbility, adjustTalent, chooseEvolution, resetTalents, renameBuild, normalizeBuild,
  spentTalentPoints, activeEvolutionCount, writeBuildStorage } from "../buildState.js?v=20261010-origins35";
import { SPELL_SLOT_LEVELS, completeArenaBuild, progressDetails, stagedLoadout } from "./EnergyProgression.js?v=20261010-origins35";
import { loadCharacter, saveCharacter, talentPointsForLevel, energyIdentity } from "./EnergyCharacter.js?v=20261010-origins35";
import { REACTIONS, FORGE_LEVEL, FORGE_TIER_LEVELS, FORGE_TIER_COSTS,
  validateForgeSelection, forgeSingularity, upgradeSingularity, singularityAvailable }
  from "./EnergySingularity.js?v=20261010-origins35";
import { EnergyOrbShowcase } from "./EnergyOrbShowcase.js?v=20261010-origins35";

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
const TAU=Math.PI*2;
const ELEMENT_ORDER=["solar","cryo","void","vital","kinetic"];
function orbitPos(angle,radius){
  return {x:500+Math.cos(angle)*radius,y:500+Math.sin(angle)*radius};
}
function svgShape(tag,attrs){
  const node=document.createElementNS("http://www.w3.org/2000/svg",tag);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
  return node;
}
function classCompatibleSpells(role){return availableAbilities(role);}


export class EnergyCharacterHub{
  constructor({storage,buildStore,getProgression,changeProgression,openMainMenu,openPlayMenu}){
    this.storage=storage;this.store=buildStore;
    this.getProgression=getProgression;this.changeProgression=changeProgression;
    this.openMainMenu=openMainMenu;this.openPlayMenu=openPlayMenu;
    this.character=loadCharacter(storage);
    this.preview=null;this.selectedAbility=null;this.showSwapPicker=false;this.listFilter="equipped";
    this.message="";this.forgeDraft=null;
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
        this.updateOriginChoice(item.dataset.createRole);
      });
    }
    this.updateOriginChoice("healer");
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
    for(const tab of document.querySelectorAll("[data-hub-list]")){
      tab.addEventListener("click",()=>{
        this.listFilter=tab.dataset.hubList;this.renderTree();
      });
    }
    $("hub-orbit-board").addEventListener("mouseleave",()=>this.hideTooltip());
    $("hub-play-button").addEventListener("click",()=>this.openPlayMenu());
    $("hub-back-menu").addEventListener("click",()=>this.openMainMenu());
    $("hub-new-build").addEventListener("click",()=>{
      if(!window.confirm("Start a fresh build for this character? Save your current build in a preset first."))return;
      this.store.draft=createBuild(this.character.role);
      this.selectedAbility=null;this.showSwapPicker=false;
      this.message="Fresh build ready. Your character, level and saved presets are unchanged.";
      this.persist();this.draw();
    });
    $("hub-forge-anchor").addEventListener("change",event=>{
      this.forgeDraft={...this.forgeDraft,anchor:event.target.value};
      this.renderForge();
    });
    $("hub-forge-partner").addEventListener("change",event=>{
      this.forgeDraft={...this.forgeDraft,partner:event.target.value};
      this.renderForge();
    });
    $("hub-forge-confirm").addEventListener("click",()=>this.commitForge());
    $("hub-name-edit").addEventListener("click",()=>{
      if(!this.character)return;
      const name=window.prompt("Name your Energy orb",this.character.name);
      if(name===null)return;
      try{this.character=saveCharacter(this.storage,{...this.character,name});this.draw();}
      catch(error){this.setMessage(error.message);}
    });
  }
  updateOriginChoice(role){
    const origin=ROLES[role]||ROLES.healer;
    $("origin-selected-name").textContent=origin.name.toUpperCase();
    $("origin-selected-description").textContent=origin.description;
    $("origin-selected-playstyle").textContent=origin.playstyle;
    $("origin-selected-spells").textContent=origin.locked
      .map(id=>ABILITY_BY_ID[id]?.name||id).join(" + ");
    $("origin-selected-passive").textContent=origin.passive;
    $("origin-choice-details").style.setProperty("--origin-color",origin.color);
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
    $("hub-role").textContent=ROLES[build.role].name.toUpperCase()+" · ENERGY ORIGIN";
    $("hub-level").textContent="LEVEL "+progress.level;
    const nextSlotLevel=SPELL_SLOT_LEVELS.find(required=>required>progress.level);
    $("hub-level-subtitle").textContent=progress.slots+" OF 10 SPELLS UNLOCKED"+
      (nextSlotLevel?" · NEXT SPELL LVL "+nextSlotLevel:" · FULL LOADOUT");
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
    this.renderTree();
    this.renderForge();
    this.renderPresets();
    const excess=spentTalentPoints(build)>talentPointsForLevel(progress.level);
    $("hub-status").textContent=this.message||(excess
      ?"Legacy build: some previously allocated ranks exceed your current level. Only earned Talent Points apply in combat. RESET TALENTS is free."
      :"");
  }
  renderForge(){
    const profile=this.getProgression();
    const state=this.treeSnapshot();
    const level=state.level;
    $("hub-matter-count").textContent=profile.blackHoleMatter||0;
    $("hub-fragments-count").textContent=profile.energyFragments||0;
    const isLocked=level<FORGE_LEVEL;
    $("hub-forge-status").textContent=isLocked?"LOCKED · LVL 10":"UNLOCKED";
    $("hub-forge-locked").hidden=!isLocked;
    $("hub-forge-unlocked").hidden=isLocked;
    if(isLocked)return;
    const available=state.unlocked.map(slot=>slot.id);
    const anchorOptions=ROLES[state.build.role].locked.filter(id=>available.includes(id));
    const partnerOptions=available.filter(id=>!ROLES[state.build.role].locked.includes(id));
    const core=profile.singularity;
    if(!this.forgeDraft){
      this.forgeDraft=core?{...core}:{anchor:anchorOptions[0]||"",
        partner:partnerOptions[0]||"",reaction:"annihilation"};
    }
    // Do not silently replace an active pairing if a preset changed;
    // preserve the draft and explain that this core is dormant.
    const selection=this.forgeDraft;
    for(const [id,choices,key] of [
      ["hub-forge-anchor",anchorOptions,"anchor"],
      ["hub-forge-partner",partnerOptions,"partner"]
    ]){
      const select=$(id);select.replaceChildren();
      for(const abilityId of choices){
        const option=el("option","",ABILITY_BY_ID[abilityId]?.name||abilityId);
        option.value=abilityId;select.append(option);
      }
      // Browsers fall back to the first option if the former pair is not
      // currently unlocked. This changes only the PREVIEW, not the core.
      if(!choices.includes(selection[key]))selection[key]=choices[0]||"";
      select.value=selection[key];
    }
    const reactions=$("hub-forge-reactions");reactions.replaceChildren();
    for(const entry of Object.values(REACTIONS)){
      const selected=selection.reaction===entry.id;
      const choice=button(entry.name,"hub-forge-reaction"+(selected?" selected":""),()=>{
        this.forgeDraft={...selection,reaction:entry.id};
        this.renderForge();
      });
      choice.setAttribute("aria-pressed",String(selected));
      choice.append(el("small","",entry.short));
      reactions.append(choice);
    }
    const active=singularityAvailable(core,level,available);
    const preview=REACTIONS[selection.reaction]||REACTIONS.annihilation;
    $("hub-forge-preview").textContent=preview.description+" "+preview.note;
    $("hub-forge-summary").textContent=!core
      ?"No Singularity forged yet. Link one Origin spell to one unlocked shared spell."
      :active?"ACTIVE · "+ABILITY_BY_ID[core.anchor]?.name+" + "+ABILITY_BY_ID[core.partner]?.name
        +" · "+REACTIONS[core.reaction].name+" · MASTERY "+(core.tier||0)+"/4"
      :"INACTIVE · Your forged pair is not fully equipped or unlocked in this build. Re-equip its spells or reforge the link.";
    const error=validateForgeSelection({...profile,level},state.build,available,selection);
    const unchanged=Boolean(core&&core.anchor===selection.anchor
      &&core.partner===selection.partner&&core.reaction===selection.reaction);
    const confirm=$("hub-forge-confirm");
    confirm.disabled=Boolean(error||unchanged||(profile.blackHoleMatter||0)<1);
    confirm.textContent=unchanged?"CURRENT SINGULARITY":
      core?"REFORGE · 1 BLACK HOLE MATTER":"FORGE · 1 BLACK HOLE MATTER";
    confirm.title=error||((profile.blackHoleMatter||0)<1
      ?"Earn Black Hole Matter from arena victories.":"Preview is free; only confirming spends Matter.");
    const mastery=$("hub-forge-mastery");mastery.replaceChildren();
    mastery.append(el("h4","","SINGULARITY MASTERY"));
    if(!core){
      mastery.append(el("p","","Forge your first link to begin developing its tree with Energy Fragments."));
      return;
    }
    const tier=Math.max(0,Math.min(4,core.tier||0));
    const dots=el("div","hub-forge-tier-dots");
    for(let i=0;i<4;i++)dots.append(el("span",i<tier?"filled":""));
    mastery.append(dots);
    if(tier===4){mastery.append(el("p","","Fully mastered · all four upgrades unlocked."));return;}
    const neededLevel=FORGE_TIER_LEVELS[tier],cost=FORGE_TIER_COSTS[tier];
    const upgrade=button("MASTERY "+(tier+1)+" · "+cost+" FRAGMENTS",
      "hub-secondary hub-forge-upgrade",()=>this.purchaseForgeMastery());
    upgrade.disabled=level<neededLevel||(profile.energyFragments||0)<cost;
    mastery.append(el("p","",level<neededLevel?"Next mastery unlocks at level "+neededLevel+".":
      "Spend Energy Fragments earned from your team's kills to develop your chosen Singularity."),
      upgrade);
  }
  commitForge(){
    const profile=this.getProgression();
    const state=this.treeSnapshot();
    const ids=state.unlocked.map(slot=>slot.id);
    const error=validateForgeSelection({...profile,level:state.level},state.build,ids,this.forgeDraft);
    if(error){this.setMessage(error);return;}
    if(profile.singularity&&!window.confirm(
      "Spend 1 Black Hole Matter to change your active Singularity? Existing mastery will be preserved."))return;
    try{
      const next=forgeSingularity({...profile,level:state.level},
        state.build,ids,this.forgeDraft);
      if(next===profile)return;
      this.changeProgression(next);
      this.message="Singularity forged · "+REACTIONS[next.singularity.reaction].name+" ready.";
      this.draw();
    }catch(error){this.setMessage(error.message||"Could not forge a Singularity.");}
  }
  purchaseForgeMastery(){
    const profile=this.getProgression();
    const level=progressDetails(profile).level;
    try{
      const next=upgradeSingularity({...profile,level});
      this.changeProgression(next);
      this.message="Singularity mastery upgraded to tier "+next.singularity.tier+".";
      this.draw();
    }catch(error){this.setMessage(error.message||"Could not upgrade Singularity.");}
  }
  renderPresets(){
    const root=$("hub-preset-slots");root.replaceChildren();
    for(let index=0;index<3;index++){
      const saved=this.store.saved[index];
      const sameRole=!saved||saved.role===this.character.role;
      const row=el("div","hub-preset-row"+(sameRole?"":" hub-preset-other-role"));
      const info=el("div","hub-preset-label");
      info.append(el("strong","",saved?.name||"EMPTY PRESET "+(index+1)),
        el("span","",saved
          ?ROLES[saved.role].name+" · "+spentTalentPoints(saved)+" TP · "+activeEvolutionCount(saved)+" Evolutions"
          :"Save your current build here"));
      const actions=el("div","hub-preset-actions");
      const save=button(saved?"SAVE OVER":"SAVE","hub-preset-button",()=>this.savePreset(index));
      if(saved){
        const load=button("LOAD","hub-preset-button load",()=>this.loadPreset(index));
        load.disabled=!sameRole;
        load.title=sameRole?"Use this preset":"This build belongs to a different Origin";
        actions.append(load);
      }
      actions.append(save);row.append(info,actions);root.append(row);
    }
  }
  savePreset(index){
    if(!this.character)return;
    if(this.store.saved[index]&&!window.confirm("Overwrite saved preset "+(index+1)+"?"))return;
    const current=this.store.draft;
    const name=window.prompt("Name this build",current.name||"My Build");
    if(name===null)return;
    try{
      // Complete auto-filled starter choices into explicit saved slots, so
      // future pool changes cannot silently alter a loaded preset.
      const snapshot=normalizeBuild(renameBuild(completeArenaBuild(current),name));
      this.store.saved[index]=snapshot;
      this.persist();this.message="Preset "+(index+1)+" saved: "+snapshot.name;
      this.renderPresets();$("hub-status").textContent=this.message;
    }catch(error){this.setMessage(error.message||"Could not save preset.");}
  }
  loadPreset(index){
    const saved=this.store.saved[index];
    if(!saved)return;
    if(saved.role!==this.character.role){
      this.setMessage("This preset belongs to a different Origin. Your current Origin stays unchanged.");return;
    }
    if(!window.confirm("Load preset "+(index+1)+"? Unsaved changes in your current build will be replaced."))return;
    this.store.draft=normalizeBuild(saved);
    this.selectedAbility=null;this.showSwapPicker=false;
    this.message="Loaded "+saved.name+" · character and level unchanged.";
    this.persist();this.draw();
  }

  // The map always contains 18 nodes: both role-specific spells and all 16
  // shared spells. Ten are in the (possibly level-gated) loadout, eight in pool.
  treeSnapshot(){
    const build=this.store.draft;
    const level=progressDetails(this.getProgression()).level;
    const planned=stagedLoadout(build,30).abilitySlots;
    const unlocked=stagedLoadout(build,level).abilitySlots;
    const plannedIds=new Set(planned.map(slot=>slot.id));
    const activeById=new Map(unlocked.map(slot=>[slot.id,slot]));
    const roleBound=new Set(ROLES[build.role].locked);
    const compatible=classCompatibleSpells(build.role);
    const pool=compatible.filter(spell=>!plannedIds.has(spell.id));
    // The same discipline ordering groups related spell paths together
    // without discarding the player's actual chosen abilities.
    const byDiscipline=(a,b)=>ELEMENT_ORDER.indexOf(a.discipline)-
      ELEMENT_ORDER.indexOf(b.discipline)||a.name.localeCompare(b.name);
    const inner=planned.map(slot=>ABILITY_BY_ID[slot.id]).sort(byDiscipline);
    return {build,level,planned,unlocked,plannedIds,activeById,
      roleBound,pool:pool.sort(byDiscipline),inner,compatible};
  }
  renderTree(){
    const state=this.treeSnapshot();
    const cap=talentPointsForLevel(state.level);
    const used=spentTalentPoints(state.build);
    $("hub-talent-points").textContent=Math.max(0,cap-used)+" AVAILABLE / "+cap+" EARNED";
    $("hub-evolution-count").textContent=activeEvolutionCount(state.build)+" / 10 CHOSEN";
    $("hub-spellbook-count").textContent=state.planned.length+" / 10 IN BUILD";
    if(!this.selectedAbility||!state.compatible.some(spell=>spell.id===this.selectedAbility)){
      this.selectedAbility=state.inner[0]?.id||null;
    }
    for(const tab of document.querySelectorAll("[data-hub-list]")){
      const chosen=tab.dataset.hubList===this.listFilter;
      tab.classList.toggle("active",chosen);tab.setAttribute("aria-pressed",String(chosen));
      tab.textContent=tab.dataset.hubList==="equipped"?"BUILD ("+state.planned.length+")":
        "POOL ("+state.pool.length+")";
    }
    this.renderSpellList(state);
    this.renderOrbitMap(state);
    this.renderDetail(state);
    this.renderLibrary(state);
  }
  selectSpell(id){
    if(this.selectedAbility!==id)this.showSwapPicker=false;
    this.selectedAbility=id;this.hideTooltip();this.renderTree();
  }
  renderSpellList(state){
    const holder=$("hub-spell-nodes");holder.replaceChildren();
    const items=this.listFilter==="pool"?state.pool:state.inner;
    for(const ability of items){
      const inBuild=state.plannedIds.has(ability.id);
      const unlocked=state.activeById.has(ability.id);
      const rank=state.activeById.get(ability.id)?.talentRank||0;
      const evolved=Boolean(state.build.evolutions[ability.id]);
      const bound=state.roleBound.has(ability.id);
      const btn=button("","hub-spell-node"+(inBuild?" unlocked":" in-pool")+
        (this.selectedAbility===ability.id?" selected":"")+
        (!unlocked&&inBuild?" level-gated":"")+(evolved?" evolved":""),()=>this.selectSpell(ability.id));
      btn.style.setProperty("--spell-tone",DISCIPLINES[ability.discipline].color);
      btn.setAttribute("aria-pressed",String(this.selectedAbility===ability.id));
      btn.title=ability.name+" — "+ability.description;
      const label=el("span","hub-spell-copy");
      label.append(el("strong","hub-spell-name",ability.name),
        el("small","hub-spell-category",DISCIPLINES[ability.discipline].name.toUpperCase()+" · "+ability.category.toUpperCase()),
        el("span","hub-spell-level",bound?"ORIGIN SPELL · "+(unlocked?"RANK "+rank:"LOCKED BY LEVEL"):
          !inBuild?"IN AVAILABLE POOL":unlocked?"RANK "+rank+"/3":"UNLOCKS AS YOU LEVEL"));
      const stateGlyph=bound?"♙":!inBuild?"＋":evolved?"✦":unlocked?"✓":"◇";
      btn.append(el("span","hub-spell-symbol",glyphs[ability.discipline]),label,
        el("span","hub-spell-state",stateGlyph));
      btn.addEventListener("mouseenter",event=>this.showTooltip(ability,event,inBuild));
      btn.addEventListener("mouseleave",()=>this.hideTooltip());
      holder.append(btn);
    }
  }
  // SVG connections and HTML buttons share one 1000 x 1000 coordinate system.
  // The embedded Babylon canvas stays isolated and is never recreated by a
  // spell click, hover or Evolution selection.
  renderOrbitMap(state){
    const svg=$("hub-orbit-lines"),holder=$("hub-orbit-nodes");
    svg.replaceChildren();holder.replaceChildren();
    const primary=svgShape("circle",{cx:500,cy:500,r:283,class:"hub-orbit-track"});
    const outer=svgShape("circle",{cx:500,cy:500,r:425,class:"hub-orbit-track outer"});
    svg.append(primary,outer);
    const addLine=(p1,p2,cls,color)=>{
      const line=svgShape("line",{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,class:cls,
        stroke:color||"#42647f"});
      svg.append(line);
    };
    const place=(node,p)=>{
      node.style.left=(p.x/10)+"%";
      node.style.top=(p.y/10)+"%";
      holder.append(node);
    };
    for(const [index,ability] of state.inner.entries()){
      const angle=-Math.PI/2+index*TAU/10;
      const p=orbitPos(angle,283);
      const tone=DISCIPLINES[ability.discipline].color;
      const unlocked=state.activeById.has(ability.id);
      const selected=this.selectedAbility===ability.id;
      addLine(orbitPos(angle,205),p,"hub-orbit-link"+(selected?" selected":""),tone);
      const node=button("","hub-orbit-spell active"+(selected?" selected":"")+
        (!unlocked?" future":"")+(state.roleBound.has(ability.id)?" class-bound":""),()=>this.selectSpell(ability.id));
      node.style.setProperty("--node-tone",tone);
      node.setAttribute("aria-label",ability.name+" (in build)"+(state.roleBound.has(ability.id)?" class-bound":""));
      node.setAttribute("aria-pressed",String(selected));
      node.title=ability.name+" — "+ability.description;
      const icon=el("span","hub-orbit-icon",glyphs[ability.discipline]);
      if(state.roleBound.has(ability.id))icon.append(el("span","hub-orbit-lock","♙"));
      node.append(icon,el("span","hub-orbit-name",ability.name));
      node.addEventListener("mouseenter",event=>this.showTooltip(ability,event,true));
      node.addEventListener("mousemove",event=>this.moveTooltip(event));
      node.addEventListener("mouseleave",()=>this.hideTooltip());
      place(node,p);
      this.renderEvolutionSatellites({ability,angle,origin:p,dist:344,
        visible:true,selected,state,place,addLine});
    }
    for(const [index,ability] of state.pool.entries()){
      const angle=-Math.PI/2+TAU/16+index*TAU/8;
      const p=orbitPos(angle,425),tone=DISCIPLINES[ability.discipline].color;
      const selected=this.selectedAbility===ability.id;
      addLine(orbitPos(angle,389),p,"hub-orbit-link pool"+(selected?" selected":""),tone);
      const node=button("","hub-orbit-spell pool"+(selected?" selected":""),()=>this.selectSpell(ability.id));
      node.style.setProperty("--node-tone",tone);
      node.setAttribute("aria-label",ability.name+" (available in pool)");
      node.setAttribute("aria-pressed",String(selected));
      node.title=ability.name+" — "+ability.description;
      node.append(el("span","hub-orbit-icon",glyphs[ability.discipline]),
        el("span","hub-orbit-name",ability.name));
      node.addEventListener("mouseenter",event=>this.showTooltip(ability,event,false));
      node.addEventListener("mousemove",event=>this.moveTooltip(event));
      node.addEventListener("mouseleave",()=>this.hideTooltip());
      place(node,p);
      // To keep all eighteen main spell names readable, show the three
      // outer-pool Evolution subnodes when that spell is selected. Their
      // names/descriptions are always accessible in the right detail panel.
      if(selected)this.renderEvolutionSatellites({ability,angle,origin:p,dist:356,
        visible:true,selected,state,place,addLine,pool:true});
    }
    // Put the active spell/evolution above the decorative connecting lines.
  }
  renderEvolutionSatellites({ability,angle,origin,dist,selected,state,place,addLine,pool=false}){
    const rank=state.activeById.get(ability.id)?.talentRank||0;
    const chosenId=state.build.evolutions[ability.id]||null;
    for(const [i,ev] of ability.evolutions.entries()){
      const branchAngle=angle+(i-1)*.112;
      const p=orbitPos(branchAngle,dist);
      const chosen=chosenId===ev.id;
      const tone=DISCIPLINES[ability.discipline].color;
      addLine(origin,p,"hub-orbit-branch"+(chosen?" evolved":"")+(pool?" pool":""),tone);
      const btn=button("","hub-orbit-evolution"+(chosen?" selected":"")+
        (rank<3?" unmastered":"")+(pool?" pool":"") ,()=>{
          this.selectedAbility=ability.id;this.showSwapPicker=false;
          if(!pool&&rank===3){
            this.pickEvolution(ability.id,chosen?null:ev.id);
          }else this.renderTree();
        });
      btn.style.setProperty("--node-tone",tone);
      btn.setAttribute("aria-label",ability.name+" Evolution: "+ev.name+
        (chosen?" (selected)":pool?" (requires equipping)":
        rank<3?" (requires Rank 3)":" (click to choose)"));
      btn.title=ev.name+": "+ev.description;
      btn.append(el("span","",i===0?"✦":i===1?"➤":"◈"));
      btn.addEventListener("mouseenter",event=>this.showTooltip(ability,event,!pool,ev));
      btn.addEventListener("mousemove",event=>this.moveTooltip(event));
      btn.addEventListener("mouseleave",()=>this.hideTooltip());
      place(btn,p);
    }
  }
  showTooltip(ability,event,inBuild,evolution=null){
    const tip=$("hub-node-tooltip");
    const discipline=DISCIPLINES[ability.discipline];
    tip.replaceChildren();
    tip.append(el("strong","",evolution?evolution.name:ability.name),
      el("small","",discipline.name.toUpperCase()+" · "+(inBuild?"IN BUILD":"AVAILABLE POOL")),
      el("p","",evolution?evolution.description:ability.description));
    if(!evolution)tip.append(el("span","",
      "EVOLUTIONS: "+ability.evolutions.map(ev=>ev.name).join(" · ")));
    tip.hidden=false;this.moveTooltip(event);
  }
  moveTooltip(event){
    const tip=$("hub-node-tooltip");
    if(tip.hidden||!event||typeof event.clientX!=="number")return;
    const bounds=$("hub-orbit-board").getBoundingClientRect();
    // Coarse floating position, clamped so no tooltip leaves the board.
    const x=Math.max(6,Math.min(bounds.width-230,event.clientX-bounds.left+15));
    const y=Math.max(6,Math.min(bounds.height-110,event.clientY-bounds.top+14));
    tip.style.left=x+"px";tip.style.top=y+"px";
  }
  hideTooltip(){$("hub-node-tooltip").hidden=true;}
  renderDetail(state){
    const ability=ABILITY_BY_ID[this.selectedAbility];
    if(!ability)return;
    const build=state.build,rank=state.activeById.get(ability.id)?.talentRank||0;
    const plannedRank=build.talents[ability.id]||0;
    const inBuild=state.plannedIds.has(ability.id);
    const bound=state.roleBound.has(ability.id);
    const unlocked=state.activeById.has(ability.id);
    const availableTP=talentPointsForLevel(state.level)-spentTalentPoints(build);
    const selectedEvolution=build.evolutions[ability.id]||null;
    $("hub-detail-status").textContent=bound?"ORIGIN-BOUND":inBuild?"IN BUILD":"AVAILABLE POOL";
    const spell=$("hub-detail-spell");spell.replaceChildren();
    spell.style.setProperty("--spell-tone",DISCIPLINES[ability.discipline].color);
    const summary=el("div","hub-detail-title");
    const info=el("div","");
    info.append(el("strong","",ability.name),el("small","",
      DISCIPLINES[ability.discipline].name.toUpperCase()+" · "+ability.category.toUpperCase()));
    summary.append(el("span","hub-detail-icon",glyphs[ability.discipline]),info);
    spell.append(summary,el("p","hub-detail-description",ability.description));
    if(bound)spell.append(el("span","hub-bound-chip","♙ ORIGIN SPELL · CANNOT REPLACE"));
    else if(!inBuild)spell.append(el("span","hub-pool-chip","AVAILABLE TO EQUIP"));
    const current=$("hub-detail-current");current.replaceChildren();
    current.append(el("h4","","SPELL MASTERY"),el("p","",ability.details));
    const rankRow=el("div","hub-detail-ranks");
    for(let i=1;i<=3;i++){
      const achieved=inBuild&&i<=rank;
      const canRank=inBuild&&unlocked&&i===plannedRank+1&&availableTP>0;
      const rankNode=button(achieved?"✓":String(i),"hub-detail-rank"+(achieved?" mastered":"")+
        (canRank?" available":""),()=>{
          if(canRank)this.editTalent(ability.id,1);
        });
      rankNode.disabled=!canRank;
      rankNode.title="Rank "+i+(achieved?" unlocked":canRank?" · spend 1 Talent Point":" · locked");
      rankNode.setAttribute("aria-label",rankNode.title);
      rankRow.append(rankNode);
    }
    current.append(rankRow,el("p","hub-detail-stat",
      !inBuild?"Not equipped · preview only":
        !unlocked?"Selected for your future build · unlocks as you level":
        "Rank "+rank+" / 3 · "+availableTP+" Talent Points available"));
    if(inBuild&&unlocked&&plannedRank>0){
      const refund=button("− REFUND ONE RANK","hub-detail-refund",()=>this.editTalent(ability.id,-1));
      current.append(refund);
    }
    const next=$("hub-detail-next");next.replaceChildren();
    next.append(el("h4","","NEXT STEP"),
      el("p","",!inBuild?"Add this spell by replacing one of the eight shared spells.":
        !unlocked?"Play arena matches to reach the level required for this spell.":
        rank===3?"Max Rank reached. Choose an Evolution below, or change your choice freely.":
        availableTP>0?"Click the glowing next rank above to spend 1 Talent Point.":
        "Level up to earn more Talent Points, or refund points from another spell."));
    const evolutions=$("hub-detail-evolution");evolutions.replaceChildren();
    evolutions.append(el("h4","","EVOLUTIONS · CHOOSE ONE"));
    for(const ev of ability.evolutions){
      const chosen=selectedEvolution===ev.id;
      const canChoose=inBuild&&unlocked&&rank===3;
      const btn=button("","hub-detail-evolution-choice"+(chosen?" selected":"")+
        (!canChoose?" unavailable":""),()=>{
          if(canChoose)this.pickEvolution(ability.id,chosen?null:ev.id);
        });
      btn.disabled=!canChoose;
      btn.style.setProperty("--spell-tone",DISCIPLINES[ability.discipline].color);
      btn.append(el("strong","",ev.name),el("p","",ev.description),
        el("span","",chosen?"✓ SELECTED":canChoose?"CHOOSE →":inBuild?"REQUIRES RANK 3":"PREVIEW"));
      evolutions.append(btn);
    }
  }
  pickEvolution(id,evolutionId){
    this.mutate(()=>chooseEvolution(this.store.draft,id,evolutionId));
  }
  // Swapping always uses the complete eight-slot shared loadout, including
  // auto-filled early-game choices, so the chosen slot is replaced exactly.
  // No role spell can be swapped out. The old spell's talents/evolution are
  // automatically refunded by equipAbility; saved presets remain untouched.
  replaceSharedSpell(oldId,newId){
    const build=this.store.draft;
    const locked=new Set(ROLES[build.role].locked);
    if(locked.has(oldId)||locked.has(newId))throw Error("Origin spells cannot be swapped.");
    const shared=stagedLoadout(build,30).abilitySlots.map(s=>s.id).filter(id=>!locked.has(id));
    const index=shared.indexOf(oldId);
    if(index<0||shared.includes(newId))throw Error("Choose a valid shared spell to replace.");
    const hydrated={...build,freeSlots:shared};
    return equipAbility(hydrated,index,newId);
  }
  renderLibrary(state=this.treeSnapshot()){
    const holder=$("hub-spell-library"),area=$("hub-spell-swap-area");
    const toggle=$("hub-change-ability");
    const id=this.selectedAbility;
    const inBuild=state.plannedIds.has(id);
    const bound=state.roleBound.has(id);
    area.hidden=bound||!id;
    if(bound||!id){
      this.showSwapPicker=false;holder.hidden=true;return;
    }
    toggle.textContent=this.showSwapPicker?"CLOSE SPELL OPTIONS":
      inBuild?"REPLACE THIS SPELL":"ADD TO YOUR BUILD";
    holder.hidden=!this.showSwapPicker;
    holder.replaceChildren();
    if(!this.showSwapPicker)return;
    const select=el("select","hub-swap-slot");
    const description=el("p","",
      inBuild?"Choose another spell from the pool to replace "+ABILITY_BY_ID[id].name+".":
      "Choose which of your eight shared spells to replace with "+ABILITY_BY_ID[id].name+".");
    if(inBuild){
      for(const ability of state.pool){
        const opt=el("option","",ability.name+" · "+DISCIPLINES[ability.discipline].name);
        opt.value=ability.id;select.append(opt);
      }
      select.setAttribute("aria-label","New spell from available pool");
    }else{
      const current=state.planned.filter(slot=>!state.roleBound.has(slot.id));
      for(const slot of current){
        const ability=ABILITY_BY_ID[slot.id];
        const opt=el("option","",ability.name+" · current build");
        opt.value=ability.id;select.append(opt);
      }
      select.setAttribute("aria-label","Shared spell to replace");
    }
    const confirm=button(inBuild?"CONFIRM REPLACEMENT":"ADD SPELL TO BUILD","hub-rank-action primary",()=>{
      const oldId=inBuild?id:select.value;
      const newId=inBuild?select.value:id;
      try{
        const updated=this.replaceSharedSpell(oldId,newId);
        this.selectedAbility=newId;this.showSwapPicker=false;
        this.mutate(()=>updated);
      }catch(error){this.setMessage(error?.message||"Could not change this spell.");}
    });
    holder.append(description,select,confirm);
  }
  editTalent(id,delta){
    const level=progressDetails(this.getProgression()).level;
    const limit=talentPointsForLevel(level);
    if(delta>0&&spentTalentPoints(this.store.draft)>=limit){
      this.setMessage("Earn more Talent Points by leveling up.");return;
    }
    this.mutate(()=>{
      let build=this.store.draft;
      // Convert auto-filled choices into eight explicit slots before
      // modifying talent ranks, preserving the exact current build.
      if(delta>0&&!allEquippedIds(build).includes(id)){
        const locked=new Set(ROLES[build.role].locked);
        const shared=stagedLoadout(build,30).abilitySlots.map(s=>s.id).filter(spell=>!locked.has(spell));
        if(!shared.includes(id))throw Error("Equip this spell before spending Talent Points.");
        build={...build,freeSlots:shared};
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
