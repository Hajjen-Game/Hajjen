import { WORLD, VIEW, PLAYER } from "./config.js";
import { buildChunks } from "./world-data.js";
import { collisionShape } from "./collision.js";

const chunks = buildChunks();
const palette = {
  grass: "#8fa77f",
  green: "#718d69", pink: "#c98691", orange: "#c98a61", purple: "#887899", trunk: "#755d4e",
  rock: "#8f9188", rockHi: "#a4a59b", cream: "#e6dbc4", shark: "#567487", sharkDark: "#405d6f", vest: "#768069", shorts: "#6d5140"
};

const TILE_SIZE = 128;
const TERRAIN_ROOT = "assets/zones/intro/terrain/standard/";
const TERRAIN_FILES = {
  grass: "grass_center.png",
  horizontalTop: "path_horizontal_top.png",
  horizontalBottom: "path_horizontal_bottom.png",
  verticalLeft: "path_vertical_left.png",
  verticalRight: "path_vertical_right.png",
  cornerTopLeft: "path_corner_top_left.png",
  cornerTopRight: "path_corner_top_right.png",
  cornerBottomLeft: "path_corner_bottom_left.png",
  cornerBottomRight: "path_corner_bottom_right.png"
};

const terrainImages = Object.fromEntries(Object.entries(TERRAIN_FILES).map(([key, file]) => {
  const image = new Image();
  image.decoding = "async";
  image.src = TERRAIN_ROOT + file;
  return [key, image];
}));

// The corner names describe their position in the original rounded-square master:
// top-left = RIGHT + BOTTOM, top-right = LEFT + BOTTOM,
// bottom-left = TOP + RIGHT, bottom-right = TOP + LEFT.
const terrainLayout = new Map();
const tileKey = (col, row) => `${col},${row}`;
const setTerrain = (col, row, type) => terrainLayout.set(tileKey(col, row), type);

// A continuous straight run always uses one single supplied variant.
// This prevents top/bottom or left/right straight variants from touching each
// other inside the same run, where their subtle artwork differences are visible.
function addHorizontal(row, fromCol, toCol, type) {
  const start = Math.min(fromCol, toCol);
  const end = Math.max(fromCol, toCol);
  for (let col = start; col <= end; col++) setTerrain(col, row, type);
}

function addVertical(col, fromRow, toRow, type) {
  const start = Math.min(fromRow, toRow);
  const end = Math.max(fromRow, toRow);
  for (let row = start; row <= end; row++) setTerrain(col, row, type);
}

// One continuous top-to-bottom test route with long straight runs and all four
// supplied corner orientations. Different variants are tested on separate runs,
// never alternated directly beside each other.
addVertical(6, 0, 4, "verticalLeft");
setTerrain(6, 5, "cornerBottomLeft");       // TOP -> RIGHT
addHorizontal(5, 7, 19, "horizontalTop");
setTerrain(20, 5, "cornerTopRight");        // LEFT -> BOTTOM
addVertical(20, 6, 10, "verticalRight");
setTerrain(20, 11, "cornerBottomRight");    // TOP -> LEFT
addHorizontal(11, 11, 19, "horizontalBottom");
setTerrain(10, 11, "cornerTopLeft");        // RIGHT -> BOTTOM
addVertical(10, 12, 16, "verticalLeft");
setTerrain(10, 17, "cornerBottomLeft");     // TOP -> RIGHT
addHorizontal(17, 11, 22, "horizontalTop");
setTerrain(23, 17, "cornerTopRight");       // LEFT -> BOTTOM
addVertical(23, 18, 22, "verticalRight");
setTerrain(23, 23, "cornerBottomRight");    // TOP -> LEFT
addHorizontal(23, 15, 22, "horizontalBottom");
setTerrain(14, 23, "cornerTopLeft");        // RIGHT -> BOTTOM
addVertical(14, 24, 27, "verticalLeft");

// TEMPORARY TERRAIN-SEAM DIAGNOSTIC AREA.
// It is deliberately centered around the existing player spawn so both versions
// can be inspected immediately without changing camera, player, gameplay or world data.
// Left side: grass_center.png drawn normally.
// Right side: the same PNG using only source rect (3,3,122,122), stretched to 128x128.
const DIAGNOSTIC = {
  minCol: 8,
  maxCol: 20,
  minRow: 14,
  maxRow: 21,
  splitCol: 14
};

function isDiagnosticTile(col, row) {
  return col >= DIAGNOSTIC.minCol && col <= DIAGNOSTIC.maxCol &&
         row >= DIAGNOSTIC.minRow && row <= DIAGNOSTIC.maxRow;
}

function visibleBounds(camera, w, h) {
  const m = VIEW.cullMargin;
  return { l: camera.x - w/2 - m, r: camera.x + w/2 + m, t: camera.y - h/2 - m, b: camera.y + h/2 + m };
}

function inView(o, b) { return o.x > b.l && o.x < b.r && o.y > b.t && o.y < b.b; }

function drawTerrain(ctx, camera, w, h) {
  ctx.imageSmoothingEnabled = false;

  const worldLeft = camera.x - w / 2;
  const worldTop = camera.y - h / 2;
  const minCol = Math.max(0, Math.floor(worldLeft / TILE_SIZE));
  const maxCol = Math.min(Math.ceil(WORLD.width / TILE_SIZE) - 1, Math.floor((camera.x + w / 2) / TILE_SIZE));
  const minRow = Math.max(0, Math.floor(worldTop / TILE_SIZE));
  const maxRow = Math.min(Math.ceil(WORLD.height / TILE_SIZE) - 1, Math.floor((camera.y + h / 2) / TILE_SIZE));

  // Snap the camera-derived screen origin ONCE, then derive every tile from the
  // exact 128px grid. Adjacent screen positions are therefore always exactly
  // 128 pixels apart and can never accumulate independent rounding differences.
  const screenOriginX = Math.round(-camera.x + w / 2);
  const screenOriginY = Math.round(-camera.y + h / 2);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const diagnosticTile = isDiagnosticTile(col, row);
      const type = diagnosticTile ? "grass" : (terrainLayout.get(tileKey(col, row)) || "grass");
      const image = terrainImages[type];
      const sx = screenOriginX + col * TILE_SIZE;
      const sy = screenOriginY + row * TILE_SIZE;

      if (image.complete && image.naturalWidth === TILE_SIZE && image.naturalHeight === TILE_SIZE) {
        if (diagnosticTile && col >= DIAGNOSTIC.splitCol) {
          // Diagnostic B: exclude exactly the outermost 3 source pixels on every side.
          // The PNG itself remains untouched; only the canvas source rectangle changes.
          ctx.drawImage(image, 3, 3, 122, 122, sx, sy, TILE_SIZE, TILE_SIZE);
        } else {
          // Normal renderer / Diagnostic A.
          ctx.drawImage(image, sx, sy, TILE_SIZE, TILE_SIZE);
        }
      } else {
        ctx.fillStyle = palette.grass;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      }
    }
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
  ctx.clearRect(0,0,width,height);
  drawTerrain(ctx,camera,width,height);

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
