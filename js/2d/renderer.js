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
const GROUND_ASSET_VERSION = "color-corrected-v2";
const TERRAIN_FILES = {
  grass: "grass_center.png",
  horizontalTop: "path_horizontal_top.png",
  horizontalBottom: "path_horizontal_bottom.png",
  verticalLeft: "path_vertical_left.png",
  verticalRight: "path_vertical_right.png",
  cornerTopLeft: "path_corner_top_left.png",
  cornerTopRight: "path_corner_top_right.png",
  cornerBottomLeft: "path_corner_bottom_left.png",
  cornerBottomRight: "path_corner_bottom_right.png",

  sparseGrass: "ground_sparse_grass_01.png",
  flowers01: "ground_flowers_01.png",
  flowers02: "ground_flowers_02.png",
  leafClusters: "ground_leaf_clusters_01.png",
  smallStones: "ground_small_stones_01.png",
  smallStonesFlowers: "ground_small_stones_flowers_01.png",
  smallBranches: "ground_small_branches_01.png",
  densePlants: "ground_dense_plants_01.png",
  pinkBush: "ground_pink_bush_01.png",
  orangeBush: "ground_orange_bush_01.png",
  purpleBush: "ground_purple_bush_01.png",
  pinkPurpleBushes: "ground_pink_purple_bushes_01.png",
  pinkBushStones: "ground_pink_bush_stones_01.png",
  orangeBushBranches: "ground_orange_bush_branches_01.png",
  purpleBushFlowers: "ground_purple_bush_flowers_01.png",
  mixedBushes: "ground_mixed_bushes_01.png"
};

const GROUND_TYPES = new Set([
  "sparseGrass", "flowers01", "flowers02", "leafClusters",
  "smallStones", "smallStonesFlowers", "smallBranches", "densePlants",
  "pinkBush", "orangeBush", "purpleBush", "pinkPurpleBushes",
  "pinkBushStones", "orangeBushBranches", "purpleBushFlowers", "mixedBushes"
]);

const terrainImages = Object.fromEntries(Object.entries(TERRAIN_FILES).map(([key, file]) => {
  const image = new Image();
  image.decoding = "async";
  const cacheBust = GROUND_TYPES.has(key) ? `?v=${GROUND_ASSET_VERSION}` : "";
  image.src = TERRAIN_ROOT + file + cacheBust;
  return [key, image];
}));

// Corner connectivity established from the supplied production assets:
// cornerBottomLeft  = TOP + RIGHT
// cornerTopLeft     = RIGHT + BOTTOM
// cornerTopRight    = BOTTOM + LEFT
// cornerBottomRight = LEFT + TOP
const terrainLayout = new Map();
const tileKey = (col, row) => `${col},${row}`;
const setTerrain = (col, row, type) => terrainLayout.set(tileKey(col, row), type);

// Compact temporary path-compatibility map centered around the existing spawn.
// Every corner direction is tested twice: once with horizontalTop + verticalLeft,
// once with horizontalBottom + verticalRight. Independent examples are separated
// by grass, so incompatible straight variants never touch each other directly.
function addCornerTest(col, row, cornerType, horizontalType, verticalType, horizontalSide, verticalSide) {
  setTerrain(col, row, cornerType);
  setTerrain(col + (horizontalSide === "right" ? 1 : -1), row, horizontalType);
  setTerrain(col, row + (verticalSide === "bottom" ? 1 : -1), verticalType);
}

// TOP -> RIGHT
addCornerTest(11, 15, "cornerBottomLeft", "horizontalTop",    "verticalLeft",  "right", "top");
addCornerTest(15, 15, "cornerBottomLeft", "horizontalBottom", "verticalRight", "right", "top");

// RIGHT -> BOTTOM
addCornerTest(19, 15, "cornerTopLeft", "horizontalTop",    "verticalLeft",  "right", "bottom");
addCornerTest(11, 19, "cornerTopLeft", "horizontalBottom", "verticalRight", "right", "bottom");

// BOTTOM -> LEFT
addCornerTest(15, 19, "cornerTopRight", "horizontalTop",    "verticalLeft",  "left", "bottom");
addCornerTest(19, 19, "cornerTopRight", "horizontalBottom", "verticalRight", "left", "bottom");

// LEFT -> TOP
addCornerTest(11, 23, "cornerBottomRight", "horizontalTop",    "verticalLeft",  "left", "top");
addCornerTest(15, 23, "cornerBottomRight", "horizontalBottom", "verticalRight", "left", "top");

const GROUND_VARIANTS = [
  { type: "sparseGrass", weight: 8 },
  { type: "flowers01", weight: 8 },
  { type: "flowers02", weight: 8 },
  { type: "leafClusters", weight: 8 },
  { type: "smallStones", weight: 8 },
  { type: "smallStonesFlowers", weight: 8 },
  { type: "smallBranches", weight: 8 },
  { type: "densePlants", weight: 8 },
  { type: "pinkBush", weight: 3 },
  { type: "orangeBush", weight: 3 },
  { type: "purpleBush", weight: 3 },
  { type: "pinkBushStones", weight: 3 },
  { type: "orangeBushBranches", weight: 3 },
  { type: "purpleBushFlowers", weight: 3 },
  { type: "pinkPurpleBushes", weight: 1 },
  { type: "mixedBushes", weight: 1 }
];

const weightedGroundPool = GROUND_VARIANTS.flatMap(({ type, weight }) => Array(weight).fill(type));
const groundLayout = new Map();

function groundHash(col, row, salt = 0) {
  let h = (Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263) ^ Math.imul(salt + 1, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function buildGroundLayout() {
  const cols = Math.ceil(WORLD.width / TILE_SIZE);
  const rows = Math.ceil(WORLD.height / TILE_SIZE);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const key = tileKey(col, row);
      if (terrainLayout.has(key)) continue;
      const left = groundLayout.get(tileKey(col - 1, row));
      const up = groundLayout.get(tileKey(col, row - 1));
      let chosen = weightedGroundPool[groundHash(col, row) % weightedGroundPool.length];
      for (let salt = 1; salt <= 12 && (chosen === left || chosen === up); salt++) {
        chosen = weightedGroundPool[groundHash(col, row, salt) % weightedGroundPool.length];
      }
      groundLayout.set(key, chosen);
    }
  }
  const present = new Set(groundLayout.values());
  const missing = GROUND_VARIANTS.map(v => v.type).filter(type => !present.has(type));
  if (missing.length) {
    const candidates = [];
    for (let row = 2; row < rows - 2; row++) for (let col = 2; col < cols - 2; col++) {
      const key = tileKey(col, row);
      if (!terrainLayout.has(key)) candidates.push(key);
    }
    missing.forEach((type, index) => groundLayout.set(candidates[(index * 47 + 23) % candidates.length], type));
  }
}
buildGroundLayout();

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
  const screenOriginX = Math.round(-camera.x + w / 2);
  const screenOriginY = Math.round(-camera.y + h / 2);

  for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
    const key = tileKey(col, row);
    const type = terrainLayout.get(key) || groundLayout.get(key) || "sparseGrass";
    const image = terrainImages[type];
    const sx = screenOriginX + col * TILE_SIZE;
    const sy = screenOriginY + row * TILE_SIZE;
    if (image.complete && image.naturalWidth === TILE_SIZE && image.naturalHeight === TILE_SIZE) {
      ctx.drawImage(image, 2, 2, 124, 124, sx, sy, TILE_SIZE, TILE_SIZE);
    } else {
      ctx.fillStyle = palette.grass;
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
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
  ctx.fillStyle=palette.shark; ctx.beginPath();
  if(horizontal){ const s=player.dir==="right"?1:-1;ctx.moveTo(-42*s,-28);ctx.lineTo(34*s,-34);ctx.lineTo(48*s,-4);ctx.lineTo(30*s,18);ctx.lineTo(-40*s,12);ctx.lineTo(-55*s,-6);ctx.closePath(); }
  else { const s=player.dir==="down"?1:-1;ctx.moveTo(-35,-72*s);ctx.lineTo(35,-72*s);ctx.lineTo(43,-15*s);ctx.lineTo(28,16*s);ctx.lineTo(-28,16*s);ctx.lineTo(-43,-15*s);ctx.closePath(); }
  ctx.fill();
  ctx.fillStyle=palette.cream;ctx.fillRect(-25,-22,50,34);ctx.fillStyle=palette.vest;ctx.fillRect(-31,-10,16,40);ctx.fillRect(15,-10,16,40);ctx.fillStyle=palette.shorts;ctx.fillRect(-25,24,50,25);
  ctx.fillStyle=palette.cream; for(let i=-2;i<=2;i++)ctx.fillRect(i*11-2,-48+(Math.abs(i)%2)*6,5,5);
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
