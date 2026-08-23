import { PLAYER, DEBUG_KEY } from "./config.js";
import { WORLD_OBJECTS } from "./world-data.js";
import { moveWithCollision } from "./collision.js";
import { createCamera, updateCamera } from "./camera.js";
import { renderFrame } from "./renderer.js?v=20260823-seams-v1";
import { state } from "../core/state.js";
import { createInventorySystem } from "../systems/inventory.js";
import { createSpellbookSystem } from "../systems/spellbook.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const debugPanel = document.getElementById("debugPanel");
const hint = document.getElementById("hint");
const inventory = createInventorySystem(state);
const spellbook = createSpellbookSystem();
inventory.render(); spellbook.render();

const player = { x: PLAYER.spawn.x, y: PLAYER.spawn.y, dir: "down", speed: PLAYER.speed, moving: false };
const camera = createCamera(player.x, player.y);
const keys = new Set();
let debug = false;
let visibleCount = 0;

function resize() {
  const rect = canvas.getBoundingClientRect();
  // Fractional devicePixelRatio values (commonly produced by browser/display
  // scaling) can place otherwise integer terrain edges between physical pixels.
  // Use an integer backing-store scale so 128px tile edges remain pixel aligned.
  const dpr = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled = false;
}
addEventListener("resize", resize);
resize();

function panelOpen() {
  return inventory.panel.classList.contains("show") || spellbook.panel.classList.contains("show");
}
function toggle(panel, other, render) {
  other.classList.remove("show"); panel.classList.toggle("show"); render();
}

document.getElementById("invBtn").addEventListener("click",()=>toggle(inventory.panel,spellbook.panel,inventory.render));
document.getElementById("bookBtn").addEventListener("click",()=>toggle(spellbook.panel,inventory.panel,spellbook.render));
document.querySelectorAll(".close").forEach(b=>b.addEventListener("click",()=>b.closest(".panel")?.classList.remove("show")));

addEventListener("keydown", e => {
  const k=e.key.toLowerCase();
  if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) { e.preventDefault(); keys.add(k); }
  if(k==="i") toggle(inventory.panel,spellbook.panel,inventory.render);
  if(k==="b") toggle(spellbook.panel,inventory.panel,spellbook.render);
  if(e.key===DEBUG_KEY){e.preventDefault();debug=!debug;debugPanel.hidden=!debug;}
});
addEventListener("keyup", e=>keys.delete(e.key.toLowerCase()));
addEventListener("blur",()=>keys.clear());

let last=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  let dx=0,dy=0;
  if(!panelOpen()){
    dx=(keys.has("d")||keys.has("arrowright")?1:0)-(keys.has("a")||keys.has("arrowleft")?1:0);
    dy=(keys.has("s")||keys.has("arrowdown")?1:0)-(keys.has("w")||keys.has("arrowup")?1:0);
    player.moving=!!(dx||dy);
    if(player.moving){
      const len=Math.hypot(dx,dy);dx/=len;dy/=len;
      if(Math.abs(dx)>Math.abs(dy)) player.dir=dx>0?"right":"left"; else player.dir=dy>0?"down":"up";
      moveWithCollision(player,dx,dy,dt,WORLD_OBJECTS);
    }
  } else player.moving=false;

  const rect=canvas.getBoundingClientRect();
  updateCamera(camera,player.x,player.y,dt,rect.width,rect.height);
  visibleCount=renderFrame(ctx,camera,player,rect.width,rect.height,debug);
  if(debug) debugPanel.textContent=`HAJJEN 2D v0.1 · x ${Math.round(player.x)} y ${Math.round(player.y)} · facing ${player.dir} · visible ${visibleCount}/${WORLD_OBJECTS.length}`;
  requestAnimationFrame(loop);
}

hint.textContent="WASD / arrow keys to explore · I backpack · B spellbook · F2 debug";
requestAnimationFrame(loop);
