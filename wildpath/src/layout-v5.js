// Wildpath 0.5 — compact portrait tower-defense-inspired adventure maps.
// Level 1 follows the reference's broad straight streets, T-bends and right angles.
// Positive Z is north/up. The map is a bounded woodland diorama, not an endless field.

export const BOARD_HALF_WIDTH = 15.0;
export const BOARD_START = -12;
export const BOARD_END = 168;
export const CAMERA_WORLD_WIDTH = 33.2;
export const ROAD_HALF_WIDTH = 3.15;

// The first 40 units are deliberately assembled like a top-down game board:
// start near the bottom-left, swing right, then left, then right, then left again.
// Later glades continue the same navigable sequence without duplicating intersections.
export const ROUTE = [
  // Four short glades, around 40 units each. No long, empty transport sections.
  [-4,-12],[-4,11],[5,11],[5,24],[-4,24],[-4,40],
  [-4,50],[4,50],[4,64],[-4,64],[-4,80],
  [-4,90],[5,90],[5,104],[-4,104],[-4,120],
  [-4,130],[5,130],[5,144],[-4,144],[-4,160],[-4,168]
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
export const STAGE_ONE_TURNS = ROUTE.filter((p,i)=>i>0 && i<9 && p[1]<=40);
