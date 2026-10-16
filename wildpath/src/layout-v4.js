// Wildpath 0.4 — authored, orthogonal route geometry.
// Level 1 follows the reference's broad straight streets, T-bends and right angles.
// Positive Z is north/up. The map is a bounded woodland diorama, not an endless field.

export const BOARD_HALF_WIDTH = 16.2;
export const BOARD_START = -35;
export const BOARD_END = 438;
export const CAMERA_WORLD_WIDTH = 36.8;
export const ROAD_HALF_WIDTH = 3.7;

// The first 105 units are deliberately assembled like a top-down game board:
// start near the bottom-left, swing right, then left, then right, then left again.
// Later glades continue the same navigable sequence without duplicating intersections.
export const ROUTE = [
  [-7,-35],[-7,12],[7,12],[7,36],[-7,36],[-7,58],
  [7,58],[7,81],[-2,81],[-2,105],
  [-2,128],[8,128],[8,155],[-7,155],[-7,183],[0,183],[0,210],
  [0,238],[-8,238],[-8,267],[7,267],[7,294],[-1,294],[-1,315],
  [-1,339],[8,339],[8,363],[-8,363],[-8,392],[0,392],[0,420],[0,435]
];
export const WAYPOINTS = ROUTE.map(([x,z])=>({x,z}));

export const ROAD_SEGMENTS = WAYPOINTS.slice(1).map((b,i)=>{
  const a=WAYPOINTS[i],horizontal=a.z===b.z;
  if(!horizontal && a.x!==b.x)throw new Error('Route contains diagonal segment');
  return {
    a,b,horizontal,
    minX:Math.min(a.x,b.x)-ROAD_HALF_WIDTH,
    maxX:Math.max(a.x,b.x)+ROAD_HALF_WIDTH,
    minZ:Math.min(a.z,b.z)-ROAD_HALF_WIDTH,
    maxZ:Math.max(a.z,b.z)+ROAD_HALF_WIDTH
  };
});

export function pathX(z){
  // On horizontal links use the NEXT northbound leg's x (used for enemy spawning).
  for(const seg of ROAD_SEGMENTS){
    if(!seg.horizontal && z>=seg.a.z && z<seg.b.z)return seg.a.x;
  }
  return z<0?ROUTE[0][0]:ROUTE.at(-1)[0];
}
export function roadDistance(x,z){
  let best=Infinity;
  for(const s of ROAD_SEGMENTS){
    const px=Math.max(s.minX,Math.min(s.maxX,x));
    const pz=Math.max(s.minZ,Math.min(s.maxZ,z));
    best=Math.min(best,Math.hypot(px-x,pz-z));
  }
  return best;
}
export function isOnRoad(x,z,buffer=.12){
  return ROAD_SEGMENTS.some(s=>x>=s.minX-buffer&&x<=s.maxX+buffer&&z>=s.minZ-buffer&&z<=s.maxZ+buffer);
}
export function clampToBoard(x,z,margin=1){
  return {x:Math.max(-BOARD_HALF_WIDTH+margin,Math.min(BOARD_HALF_WIDTH-margin,x)),
    z:Math.max(BOARD_START+margin,Math.min(BOARD_END-margin,z))};
}
export function projectToRoad(x,z){
  let closest=null,distance=Infinity;
  for(const s of ROAD_SEGMENTS){
    const px=Math.max(s.minX,Math.min(s.maxX,x)),pz=Math.max(s.minZ,Math.min(s.maxZ,z));
    const d=(x-px)**2+(z-pz)**2;
    if(d<distance){closest={x:px,z:pz};distance=d;}
  }
  return closest;
}
export function moveOnRoad(x,z,dx,dz){
  // "slide" against the street's straight edges; diagonal runs remain responsive.
  const nx=x+dx,nz=z+dz;
  if(isOnRoad(nx,nz))return {x:nx,z:nz};
  if(isOnRoad(nx,z))return {x:nx,z};
  if(isOnRoad(x,nz))return {x,z:nz};
  return {x,z};
}
export function rectsForRoad(){
  return ROAD_SEGMENTS.map(s=>({
    x:(s.minX+s.maxX)/2,z:(s.minZ+s.maxZ)/2,
    w:s.maxX-s.minX,d:s.maxZ-s.minZ,segment:s
  }));
}
// Useful on maps where a single painted centerline is insufficient.
export const STAGE_ONE_TURNS = ROUTE.filter((p,i)=>i>0 && i<9 && p[1]<=105);
