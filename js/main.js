import { PLAYER } from "./config.js";
import { state } from "./core/state.js";
import { fitStage } from "./core/viewport.js";
import { allowed, applyPathMagnet } from "./player/movement.js";
import { renderSharkan, updateWalkAnimation } from "./player/animation.js";
import { createDialogueSystem } from "./systems/dialogue.js";
import { createInventorySystem } from "./systems/inventory.js";
import { createSpellbookSystem } from "./systems/spellbook.js";
import { createZoneSystem } from "./systems/zones.js";

const stage=document.getElementById("stage");
const elements={
  root:document.getElementById("sharkanRoot"),
  sprite:document.getElementById("sharkanSprite"),
  shadow:document.getElementById("groundShadow"),
  dot:document.getElementById("anchorDot"),
  debug:document.getElementById("debug")
};

const dialogue=createDialogueSystem();
const inventory=createInventorySystem(state);
const spellbook=createSpellbookSystem();
const render=()=>renderSharkan(state,elements);
const zoneSystem=createZoneSystem(state,render,toast);

fitStage(stage);
addEventListener("resize",()=>fitStage(stage));
render();
inventory.render();
spellbook.render();

const keys={};
addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  keys[k]=true;
  if(k===" "){e.preventDefault();jump();}
  if(k==="i")toggle(inventory.panel,spellbook.panel,inventory.render);
  if(k==="b")toggle(spellbook.panel,inventory.panel,spellbook.render);
  if(e.key==="F2"){
    e.preventDefault();
    state.debug=!state.debug;
    elements.debug.style.display=state.debug?"block":"none";
    elements.dot.style.display=state.debug?"block":"none";
  }
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

document.getElementById("invBtn").addEventListener("click",()=>toggle(inventory.panel,spellbook.panel,inventory.render));
document.getElementById("bookBtn").addEventListener("click",()=>toggle(spellbook.panel,inventory.panel,spellbook.render));
document.querySelectorAll(".close").forEach(b=>b.addEventListener("click",()=>b.closest(".panel").classList.remove("show")));

function modalOpen(){
  return inventory.panel.classList.contains("show")||spellbook.panel.classList.contains("show")||dialogue.isOpen();
}

function toggle(panel,other,renderPanel){
  other.classList.remove("show");
  panel.classList.toggle("show");
  renderPanel();
}

function jump(){
  if(state.jumping||modalOpen())return;
  state.jumping=true;
  elements.root.classList.add("jump");
  elements.shadow.classList.add("jump");
  setTimeout(()=>{
    state.jumping=false;
    elements.root.classList.remove("jump");
    elements.shadow.classList.remove("jump");
  },PLAYER.jumpDuration);
}

function dist(x,y){return Math.hypot(state.x-x,state.y-y);}

function checkContext(){
  const hint=document.getElementById("hint");
  if(state.zone==="intro"){
    if(dist(980,528)<115)hint.textContent="Click Professor Morrow to talk";
    else if(dist(242,726)<120)hint.textContent=state.introDone?"Follow the Ember path":"Professor Morrow should explain the crossroads first";
    else hint.textContent="WASD to walk · SPACE to hop · I backpack · B spellbook · F2 anchor debug";
    if(dist(242,726)<55&&state.introDone)zoneSystem.goZone("ember");
  }else{
    if(dist(1390,465)<125)hint.textContent="Click the Ember Keeper to learn about Ember";
    else if(dist(190,165)<100)hint.textContent="Return to The Crossroads";
    else hint.textContent="Explore Ember · stay on the paths · SPACE to hop · F2 anchor debug";
    if(dist(190,165)<50)zoneSystem.goZone("intro",300,700);
  }
}

document.getElementById("otter").addEventListener("click",()=>{
  if(state.zone!=="intro"||dist(980,528)>130)return toast("Move closer to Professor Morrow.");
  dialogue.start([
    ["Professor Morrow","Ah, Sharkan! Welcome to the Crossroads. This quiet place sits between six primal forces that shape our world."],
    ["Professor Morrow","Each path leads to a different force: Growth, Ember, Flow, Stone, Gale and Aether. In each realm, someone is waiting to teach you what that force can do."],
    ["Sharkan","And the things I find there... those are what I use to make magic?"],
    ["Professor Morrow","Exactly. Objects, plants, minerals and stranger things carry properties of their force. Later you will mix them in your Spellbook to create your own spells."],
    ["Professor Morrow","Begin with Ember. Follow the warm orange path. Learn from its keeper and bring back your first primal object."],
    ["Sharkan","Ember first. Got it. Let's see what fire can teach me."]
  ],()=>{state.introDone=true;toast("The Ember path is now open.");});
});

document.getElementById("emberNpc").addEventListener("click",()=>{
  if(state.zone!=="ember"||dist(1390,465)>145)return toast("Move closer to the Ember Keeper.");
  const already=state.inventory.some(x=>x.id==="emberstone");
  let lines=[
    ["Ember Keeper","You carry the scent of the Crossroads. Good. Then this is your first lesson: Ember is not simply fire."],
    ["Ember Keeper","Ember is heat, energy, ignition and sudden change. Its ingredients often add Burn, Power, Burst or other aggressive properties to a spell."],
    ["Sharkan","So two Ember objects can still behave differently when I mix them?"],
    ["Ember Keeper","Very differently. A feather may make Ember fast. A coal may make it linger. A crystal may focus it into something sharp and violent."],
    ["Ember Keeper","Take this Emberstone. It holds a steady flame and will serve as your first primal ingredient."]
  ];
  if(already)lines=[["Ember Keeper","Study the Emberstone I gave you. Ember rewards power, but the strongest flame is not always the right answer."]];
  dialogue.start(lines,()=>{
    if(!already){
      state.inventory.push({id:"emberstone",name:"Emberstone",force:"Ember",traits:["Power","Burn","Duration"],desc:"A dense stone holding a steady inner flame."});
      state.emberTalk=true;
      toast("Received: Emberstone");
      inventory.render();
    }
  });
});

function toast(msg){
  const d=document.createElement("div");
  d.className="toast";
  d.textContent=msg;
  document.getElementById("toast").appendChild(d);
  setTimeout(()=>d.remove(),3000);
}

let last=performance.now();
function loop(t){
  const dt=Math.min(34,t-last);last=t;

  if(!modalOpen()){
    let dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.s?1:0)-(keys.w?1:0);
    const wasMoving=state.moving;
    state.moving=!!(dx||dy);

    if(state.moving){
      const len=Math.hypot(dx,dy);dx/=len;dy/=len;
      if(Math.abs(dx)>Math.abs(dy))state.dir=dx>0?"right":"left";
      else state.dir=dy>0?"down":"up";

      updateWalkAnimation(state,dt);

      let nx=state.x+dx*PLAYER.speed*dt,ny=state.y+dy*PLAYER.speed*dt;
      if(allowed(state.zone,nx,ny)){
        [nx,ny]=applyPathMagnet(state.zone,nx,ny);
        state.x=nx;state.y=ny;
      }else{
        if(allowed(state.zone,nx,state.y)){
          const p=applyPathMagnet(state.zone,nx,state.y);state.x=p[0];state.y=p[1];
        }
        if(allowed(state.zone,state.x,ny)){
          const p=applyPathMagnet(state.zone,state.x,ny);state.x=p[0];state.y=p[1];
        }
      }
      render();
    }else if(wasMoving){
      state.walkClock=0;state.walkFrame=0;render();
    }
    checkContext();
  }else if(state.moving){
    state.moving=false;state.walkClock=0;state.walkFrame=0;render();
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
