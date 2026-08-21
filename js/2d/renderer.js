import { WORLD, VIEW, PLAYER } from "./config.js";
import { PATHS, buildChunks } from "./world-data.js";
import { collisionShape } from "./collision.js";

const chunks = buildChunks();
const palette = {
  grass: "#8fa77f", grass2: "#9cb38a", grass3: "#829b73", dirt: "#c4a77f", dirt2: "#b79570",
  green: "#718d69", pink: "#c98691", orange: "#c98a61", purple: "#887899", trunk: "#755d4e",
  rock: "#8f9188", rockHi: "#a4a59b", cream: "#e6dbc4", shark: "#567487", sharkDark: "#405d6f", vest: "#768069", shorts: "#6d5140"
};

function visibleBounds(camera, w, h) {
  const m = VIEW.cullMargin;
  return { l: camera.x - w/2 - m, r: camera.x + w/2 + m, t: camera.y - h/2 - m, b: camera.y + h/2 + m };
}

function inView(o, b) { return o.x > b.l && o.x < b.r && o.y > b.t && o.y < b.b; }

function drawGround(ctx, camera, w, h) {
  ctx.fillStyle = palette.grass;
  ctx.fillRect(0, 0, w, h);
  const tile = 96;
  const startX = Math.floor((camera.x-w/2)/tile)*tile;
  const startY = Math.floor((camera.y-h/2)/tile)*tile;
  for(let y=startY;y<camera.y+h/2+tile;y+=tile){
    for(let x=startX;x<camera.x+w/2+tile;x+=tile){
      const sx = Math.round(x-camera.x+w/2), sy = Math.round(y-camera.y+h/2);
      const n = ((x/tile*17 + y/tile*31)|0) % 3;
      ctx.fillStyle = n===0 ? palette.grass2 : n===1 ? palette.grass3 : palette.grass;
      ctx.beginPath(); ctx.moveTo(sx,sy+18); ctx.lineTo(sx+48,sy); ctx.lineTo(sx+96,sy+24); ctx.lineTo(sx+78,sy+70); ctx.lineTo(sx+24,sy+88); ctx.closePath(); ctx.fill();
    }
  }
}

function drawPaths(ctx, camera, w, h) {
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const p of PATHS) {
    ctx.beginPath();
    p.points.forEach(([x,y],i)=>{ const sx=Math.round(x-camera.x+w/2), sy=Math.round(y-camera.y+h/2); i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy); });
    ctx.strokeStyle = palette.dirt2; ctx.lineWidth = p.width + 18; ctx.stroke();
    ctx.strokeStyle = palette.dirt; ctx.lineWidth = p.width; ctx.stroke();
  }
}

function drawObject(ctx, o, camera, w, h) {
  const x=Math.round(o.x-camera.x+w/2), y=Math.round(o.y-camera.y+h/2);
  const accent=[palette.green,palette.pink,palette.orange,palette.purple][o.variant%4];
  if(o.type==="tree"){
    ctx.fillStyle=palette.trunk; ctx.fillRect(x-12,y-42,24,46);
    ctx.fillStyle=accent; ctx.beginPath(); ctx.moveTo(x,y-116); ctx.lineTo(x-58,y-78); ctx.lineTo(x-46,y-28); ctx.lineTo(x,y-46); ctx.lineTo(x+52,y-28); ctx.lineTo(x+62,y-78); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,.10)"; ctx.beginPath(); ctx.moveTo(x-5,y-108);ctx.lineTo(x-45,y-78);ctx.lineTo(x-6,y-67);ctx.closePath();ctx.fill();
  } else if(o.type==="bush"){
    ctx.fillStyle=accent; ctx.beginPath(); ctx.moveTo(x-34,y);ctx.lineTo(x-26,y-28);ctx.lineTo(x,y-40);ctx.lineTo(x+34,y-8);ctx.lineTo(x+20,y+12);ctx.lineTo(x-18,y+14);ctx.closePath();ctx.fill();
  } else if(o.type==="rock"){
    ctx.fillStyle=palette.rock;ctx.beginPath();ctx.moveTo(x-30,y+9);ctx.lineTo(x-20,y-22);ctx.lineTo(x+9,y-32);ctx.lineTo(x+34,y-4);ctx.lineTo(x+19,y+18);ctx.lineTo(x-19,y+20);ctx.closePath();ctx.fill();
    ctx.fillStyle=palette.rockHi;ctx.beginPath();ctx.moveTo(x-19,y-20);ctx.lineTo(x+8,y-30);ctx.lineTo(x+3,y-7);ctx.lineTo(x-15,y-4);ctx.closePath();ctx.fill();
  } else if(o.type==="flower"){
    ctx.fillStyle=accent;ctx.fillRect(x-2,y-10,4,12);ctx.fillRect(x-8,y-15,7,7);ctx.fillRect(x+2,y-17,7,7);ctx.fillRect(x-3,y-22,7,7);
  } else if(o.type==="branch"){
    ctx.strokeStyle=palette.trunk;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x-28,y+5);ctx.lineTo(x+30,y-5);ctx.stroke();
  }
}

function drawSharkan(ctx, player, camera, w, h) {
  const x=Math.round(player.x-camera.x+w/2), y=Math.round(player.y-camera.y+h/2);
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle="rgba(55,62,55,.22)";ctx.beginPath();ctx.ellipse(0,5,30,12,0,0,Math.PI*2);ctx.fill();
  const horizontal = player.dir==="left"||player.dir==="right";
  ctx.fillStyle=palette.shark;
  ctx.beginPath();
  if(horizontal){ const s=player.dir==="right"?1:-1;ctx.moveTo(-42*s,-28);ctx.lineTo(34*s,-34);ctx.lineTo(48*s,-4);ctx.lineTo(30*s,18);ctx.lineTo(-40*s,12);ctx.lineTo(-55*s,-6);ctx.closePath(); }
  else { const s=player.dir==="down"?1:-1;ctx.moveTo(-35,-72*s);ctx.lineTo(35,-72*s);ctx.lineTo(43,-15*s);ctx.lineTo(28,16*s);ctx.lineTo(-28,16*s);ctx.lineTo(-43,-15*s);ctx.closePath(); }
  ctx.fill();
  ctx.fillStyle=palette.cream;ctx.fillRect(-25,-22,50,34);ctx.fillStyle=palette.vest;ctx.fillRect(-31,-10,16,40);ctx.fillRect(15,-10,16,40);ctx.fillStyle=palette.shorts;ctx.fillRect(-25,24,50,25);
  ctx.fillStyle=palette.cream; for(let i=-2;i<=2;i++){ctx.fillRect(i*11-2,-48+(Math.abs(i)%2)*6,5,5);} 
  ctx.restore();
}

export function renderFrame(ctx, camera, player, width, height, debug=false) {
  ctx.clearRect(0,0,width,height); drawGround(ctx,camera,width,height); drawPaths(ctx,camera,width,height);
  const b=visibleBounds(camera,width,height); const visible=[];
  const minCX=Math.max(0,Math.floor(b.l/WORLD.chunkSize)), maxCX=Math.floor(b.r/WORLD.chunkSize);
  const minCY=Math.max(0,Math.floor(b.t/WORLD.chunkSize)), maxCY=Math.floor(b.b/WORLD.chunkSize);
  for(let cy=minCY;cy<=maxCY;cy++) for(let cx=minCX;cx<=maxCX;cx++) for(const o of chunks.get(`${cx},${cy}`)||[]) if(inView(o,b)) visible.push(o);
  visible.push({type:"player",x:player.x,y:player.y}); visible.sort((a,b)=>a.y-b.y);
  for(const o of visible) o.type==="player"?drawSharkan(ctx,player,camera,width,height):drawObject(ctx,o,camera,width,height);
  if(debug){
    ctx.strokeStyle="#2b2b2b";ctx.lineWidth=2;const px=Math.round(player.x-camera.x+width/2),py=Math.round(player.y-camera.y+height/2);ctx.beginPath();ctx.ellipse(px,py,PLAYER.radiusX,PLAYER.radiusY,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="rgba(80,50,80,.45)"; for(const o of visible){const s=collisionShape(o);if(!s)continue;const x=Math.round(o.x-camera.x+width/2),y=Math.round(o.y-camera.y+height/2);ctx.beginPath();ctx.ellipse(x,y,s.rx,s.ry,0,0,Math.PI*2);ctx.stroke();}
  }
  return visible.length;
}
