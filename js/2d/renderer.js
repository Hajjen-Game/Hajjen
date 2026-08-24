import { WORLD, VIEW, PLAYER } from "./config.js";
import { buildChunks } from "./world-data.js";
import { collisionShape } from "./collision.js";

const chunks = buildChunks();
const palette = {
  grass: "#8fa77f",
  green: "#718d69", pink: "#c98691", orange: "#c98a61", purple: "#887899", trunk: "#755d4e",
  rock: "#8f9188", rockHi: "#a4a59b", cream: "#e6dbc4", shark: "#567487", sharkDark: "#405d6f", vest: "#768069", shorts: "#6d5140"
};

const PATH_TILE_SIZE = 128;
const GROUND_TILE_SIZE = 256;
const TERRAIN_ROOT = "assets/zones/intro/terrain/standard/";

const PATH_FILES = {
  horizontalTop: "path_horizontal_top.png",
  horizontalBottom: "path_horizontal_bottom.png",
  verticalLeft: "path_vertical_left.png",
  verticalRight: "path_vertical_right.png",
  cornerTopLeft: "path_corner_top_left.png",
  cornerTopRight: "path_corner_top_right.png",
  cornerBottomLeft: "path_corner_bottom_left.png",
  cornerBottomRight: "path_corner_bottom_right.png"
};

const GROUND_FILES = {
  sparseGrass: "normal_256_sparse_grass_01.png",
  flowersFerns: "normal_256_flowers_ferns_01.png",
  stonesPlants: "normal_256_stones_plants_01.png",
  flowersLeaves: "normal_256_flowers_leaves_01.png",
  greenBush: "normal_256_green_bush_01.png",
  stonesFlowers: "normal_256_stones_flowers_01.png",
  pinkBush: "normal_256_pink_bush_01.png",
  orangePurpleBushes: "normal_256_orange_purple_bushes_01.png",
  floweringGreenBush: "normal_256_flowering_green_bush_01.png"
};

function loadImages(files) {
  return Object.fromEntries(Object.entries(files).map(([key, file]) => {
    const image = new Image();
    image.decoding = "async";
    image.src = TERRAIN_ROOT + file;
    return [key, image];
  }));
}

const pathImages = loadImages(PATH_FILES);
const groundImages = loadImages(GROUND_FILES);

const terrainLayout = new Map();
const pathKey = (col, row) => `${col},${row}`;
const setTerrain = (col, row, type) => terrainLayout.set(pathKey(col, row), type);

function addHorizontal(row, fromCol, toCol, type) {
  for (let col = Math.min(fromCol, toCol); col <= Math.max(fromCol, toCol); col++) setTerrain(col, row, type);
}

function addVertical(col, fromRow, toRow, type) {
  for (let row = Math.min(fromRow, toRow); row <= Math.max(fromRow, toRow); row++) setTerrain(col, row, type);
}

// Compact gameplay-style route using only the already validated path pieces.
// Geometry, sockets, 128x128 scale and the no-mixed-straight-variant rule remain locked.
addVertical(7, 3, 6, "verticalLeft");
setTerrain(7, 7, "cornerBottomLeft");       // TOP -> RIGHT
addHorizontal(7, 8, 12, "horizontalTop");
setTerrain(13, 7, "cornerTopRight");        // LEFT -> BOTTOM
addVertical(13, 8, 10, "verticalRight");
setTerrain(13, 11, "cornerBottomRight");    // TOP -> LEFT
addHorizontal(11, 9, 12, "horizontalBottom");
setTerrain(8, 11, "cornerTopLeft");         // RIGHT -> BOTTOM
addVertical(8, 12, 14, "verticalLeft");

const GROUND_VARIANTS = [
  { type: "sparseGrass", weight: 9 },
  { type: "flowersFerns", weight: 8 },
  { type: "stonesPlants", weight: 8 },
  { type: "flowersLeaves", weight: 7 },
  { type: "stonesFlowers", weight: 6 },
  { type: "greenBush", weight: 3 },
  { type: "floweringGreenBush", weight: 3 },
  { type: "pinkBush", weight: 2 },
  { type: "orangePurpleBushes", weight: 1 }
];

const weightedGroundPool = GROUND_VARIANTS.flatMap(({ type, weight }) => Array(weight).fill(type));
const groundLayout = new Map();
const groundKey = (col, row) => `${col},${row}`;

function groundHash(col, row, salt = 0) {
  let h = (Math.imul(col + 3, 374761393) ^ Math.imul(row + 7, 668265263) ^ Math.imul(salt + 1, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function buildGroundLayout() {
  const cols = Math.ceil(WORLD.width / GROUND_TILE_SIZE);
  const rows = Math.ceil(WORLD.height / GROUND_TILE_SIZE);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = groundLayout.get(groundKey(col - 1, row));
      const up = groundLayout.get(groundKey(col, row - 1));
      let chosen = weightedGroundPool[groundHash(col, row) % weightedGroundPool.length];

      for (let salt = 1; salt <= 12 && (chosen === left || chosen === up); salt++) {
        chosen = weightedGroundPool[groundHash(col, row, salt) % weightedGroundPool.length];
      }
      groundLayout.set(groundKey(col, row), chosen);
    }
  }

  // Keep all nine production tiles represented inside this compact test area.
  const present = new Set(groundLayout.values());
  const missing = GROUND_VARIANTS.map(v => v.type).filter(type => !present.has(type));
  missing.forEach((type, index) => {
    const col = 1 + (index * 3) % Math.max(1, cols - 2);
    const row = 1 + (index * 5) % Math.max(1, rows - 2);
    groundLayout.set(groundKey(col, row), type);
  });
}

buildGroundLayout();

function visibleBounds(camera, w, h) {
  const m = VIEW.cullMargin;
  return { l: camera.x - w/2 - m, r: camera.x + w/2 + m, t: camera.y - h/2 - m, b: camera.y + h/2 + m };
}

function inView(o, b) { return o.x > b.l && o.x < b.r && o.y > b.t && o.y < b.b; }

function drawGround(ctx, camera, w, h) {
  ctx.imageSmoothingEnabled = false;
  const worldLeft = camera.x - w / 2;
  const worldTop = camera.y - h / 2;
  const minCol = Math.max(0, Math.floor(worldLeft / GROUND_TILE_SIZE));
  const maxCol = Math.min(Math.ceil(WORLD.width / GROUND_TILE_SIZE) - 1, Math.floor((camera.x + w / 2) / GROUND_TILE_SIZE));
  const minRow = Math.max(0, Math.floor(worldTop / GROUND_TILE_SIZE));
  const maxRow = Math.min(Math.ceil(WORLD.height / GROUND_TILE_SIZE) - 1, Math.floor((camera.y + h / 2) / GROUND_TILE_SIZE));
  const screenOriginX = Math.round(-camera.x + w / 2);
  const screenOriginY = Math.round(-camera.y + h / 2);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const type = groundLayout.get(groundKey(col, row)) || "sparseGrass";
      const image = groundImages[type];
      const sx = screenOriginX + col * GROUND_TILE_SIZE;
      const sy = screenOriginY + row * GROUND_TILE_SIZE;

      if (image.complete && image.naturalWidth === GROUND_TILE_SIZE && image.naturalHeight === GROUND_TILE_SIZE) {
        // New 256 terrain is intentionally evaluated un-cropped: full source -> full destination.
        ctx.drawImage(image, sx, sy, GROUND_TILE_SIZE, GROUND_TILE_SIZE);
      } else {
        ctx.fillStyle = palette.grass;
        ctx.fillRect(sx, sy, GROUND_TILE_SIZE, GROUND_TILE_SIZE);
      }
    }
  }
}

function drawPaths(ctx, camera, w, h) {
  ctx.imageSmoothingEnabled = false;
  const worldLeft = camera.x - w / 2;
  const worldTop = camera.y - h / 2;
  const minCol = Math.max(0, Math.floor(worldLeft / PATH_TILE_SIZE));
  const maxCol = Math.min(Math.ceil(WORLD.width / PATH_TILE_SIZE) - 1, Math.floor((camera.x + w / 2) / PATH_TILE_SIZE));
  const minRow = Math.max(0, Math.floor(worldTop / PATH_TILE_SIZE));
  const maxRow = Math.min(Math.ceil(WORLD.height / PATH_TILE_SIZE) - 1, Math.floor((camera.y + h / 2) / PATH_TILE_SIZE));
  const screenOriginX = Math.round(-camera.x + w / 2);
  const screenOriginY = Math.round(-camera.y + h / 2);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const type = terrainLayout.get(pathKey(col, row));
      if (!type) continue;
      const image = pathImages[type];
      const sx = screenOriginX + col * PATH_TILE_SIZE;
      const sy = screenOriginY + row * PATH_TILE_SIZE;

      if (image.complete && image.naturalWidth === PATH_TILE_SIZE && image.naturalHeight === PATH_TILE_SIZE) {
        // LOCKED path treatment: 2px crop, 124x124 source -> unchanged 128x128 destination.
        ctx.drawImage(image, 2, 2, 124, 124, sx, sy, PATH_TILE_SIZE, PATH_TILE_SIZE);
      }
    }
  }
}

function drawObject(ctx, o, camera, w, h) {
  const x = Math.round(o.x - camera.x + w/2), y = Math.round(o.y - camera.y + h/2);
  const accent = [palette.green,palette.pink,palette.orange,palette.purple][o.variant%4];
  if (o.type === "tree") {
    ctx.fillStyle=palette.trunk; ctx.fillRect(x-12,y-42,24,46);
    ctx.fillStyle=accent; ctx.beginPath(); ctx.moveTo(x,y-116); ctx.lineTo(x-58,y-78); ctx.lineTo(x-46,y-28); ctx.lineTo(x,y-46); ctx.lineTo(x+52,y-28); ctx.lineTo(x+62,y-78); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,.10)"; ctx.beginPath(); ctx.moveTo(x-5,y-108);ctx.lineTo(x-45,y-78);ctx.lineTo(x-6,y-67);ctx.closePath();ctx.fill();
  } else if (o.type === "bush") {
    ctx.fillStyle=accent; ctx.beginPath(); ctx.moveTo(x-34,y);ctx.lineTo(x-26,y-28);ctx.lineTo(x,y-40);ctx.lineTo(x+34,y-8);ctx.lineTo(x+20,y+12);ctx.lineTo(x-18,y+14);ctx.closePath();ctx.fill();
  } else if (o.type === "rock") {
    ctx.fillStyle=palette.rock;ctx.beginPath();ctx.moveTo(x-30,y+9);ctx.lineTo(x-20,y-22);ctx.lineTo(x+9,y-32);ctx.lineTo(x+34,y-4);ctx.lineTo(x+19,y+18);ctx.lineTo(x-19,y+20);ctx.closePath();ctx.fill();
    ctx.fillStyle=palette.rockHi;ctx.beginPath();ctx.moveTo(x-19,y-20);ctx.lineTo(x+8,y-30);ctx.lineTo(x+3,y-7);ctx.lineTo(x-15,y-4);ctx.closePath();ctx.fill();
  } else if (o.type === "flower") {
    ctx.fillStyle=accent;ctx.fillRect(x-2,y-10,4,12);ctx.fillRect(x-8,y-15,7,7);ctx.fillRect(x+2,y-17,7,7);ctx.fillRect(x-3,y-22,7,7);
  } else if (o.type === "branch") {
    ctx.strokeStyle=palette.trunk;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x-28,y+5);ctx.lineTo(x+30,y-5);ctx.stroke();
  }
}

function drawSharkan(ctx, player, camera, w, h) {
  const x=Math.round(player.x-camera.x+w/2), y=Math.round(player.y-camera.y+h/2);
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle="rgba(55,62,55,.22)";ctx.beginPath();ctx.ellipse(0,5,30,12,0,0,Math.PI*2);ctx.fill();
  const horizontal = player.dir === "left" || player.dir === "right";
  ctx.fillStyle=palette.shark; ctx.beginPath();
  if(horizontal){ const s=player.dir==="right"?1:-1;ctx.moveTo(-42*s,-28);ctx.lineTo(34*s,-34);ctx.lineTo(48*s,-4);ctx.lineTo(30*s,18);ctx.lineTo(-40*s,12);ctx.lineTo(-55*s,-6);ctx.closePath(); }
  else { const s=player.dir==="down"?1:-1;ctx.moveTo(-35,-72*s);ctx.lineTo(35,-72*s);ctx.lineTo(43,-15*s);ctx.lineTo(28,16*s);ctx.lineTo(-28,16*s);ctx.lineTo(-43,-15*s);ctx.closePath(); }
  ctx.fill();
  ctx.fillStyle=palette.cream;ctx.fillRect(-25,-22,50,34);ctx.fillStyle=palette.vest;ctx.fillRect(-31,-10,16,40);ctx.fillRect(15,-10,16,40);ctx.fillStyle=palette.shorts;ctx.fillRect(-25,24,50,25);
  ctx.fillStyle=palette.cream; for(let i=-2;i<=2;i++) ctx.fillRect(i*11-2,-48+(Math.abs(i)%2)*6,5,5);
  ctx.restore();
}

export function renderFrame(ctx, camera, player, width, height, debug=false) {
  ctx.clearRect(0,0,width,height);
  drawGround(ctx,camera,width,height);
  drawPaths(ctx,camera,width,height);

  const b=visibleBounds(camera,width,height); const visible=[];
  const minCX=Math.max(0,Math.floor(b.l/WORLD.chunkSize)), maxCX=Math.floor(b.r/WORLD.chunkSize);
  const minCY=Math.max(0,Math.floor(b.t/WORLD.chunkSize)), maxCY=Math.floor(b.b/WORLD.chunkSize);
  for(let cy=minCY;cy<=maxCY;cy++) for(let cx=minCX;cx<=maxCX;cx++) for(const o of chunks.get(`${cx},${cy}`)||[]) if(inView(o,b)) visible.push(o);
  visible.push({type:"player",x:player.x,y:player.y}); visible.sort((a,b)=>a.y-b.y);
  for(const o of visible) o.type==="player" ? drawSharkan(ctx,player,camera,width,height) : drawObject(ctx,o,camera,width,height);

  if(debug){
    ctx.strokeStyle="#2b2b2b";ctx.lineWidth=2;
    const px=Math.round(player.x-camera.x+width/2),py=Math.round(player.y-camera.y+height/2);
    ctx.beginPath();ctx.ellipse(px,py,PLAYER.radiusX,PLAYER.radiusY,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="rgba(80,50,80,.45)";
    for(const o of visible){const s=collisionShape(o);if(!s)continue;const x=Math.round(o.x-camera.x+width/2),y=Math.round(o.y-camera.y+height/2);ctx.beginPath();ctx.ellipse(x,y,s.rx,s.ry,0,0,Math.PI*2);ctx.stroke();}
  }
  return visible.length;
}
