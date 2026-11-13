// SKYSHIFT 0.4 – quiet, deep-space environment.
// No canyon, terrain, towers or artificial floor. Static camera-local deep
// background and fine nearfield stars leave the race track as hero geometry.
export const SPACE_DESIGN=Object.freeze({
  starLayers:3,starCount:940,nebulaCount:2,landmarkCount:0,
  geologicalMeshes:0,background:"deep space"
});

function seeded(seed=0x5a3b4e){
  let x=seed>>>0;
  return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;
    return x/4294967296;};
}
function nebulaTexture(THREE){
  const c=document.createElement("canvas");
  c.width=256;c.height=256;
  const g=c.getContext("2d");
  const r=g.createRadialGradient(128,128,10,128,128,125);
  r.addColorStop(0,"rgba(210,170,255,.42)");
  r.addColorStop(.24,"rgba(100,111,211,.26)");
  r.addColorStop(.62,"rgba(56,75,130,.08)");
  r.addColorStop(1,"rgba(56,75,130,0)");
  g.fillStyle=r;g.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(c);
}
export function installSpaceBackdrop(THREE,camera){
  const rand=seeded();
  const groups=[
    {count:410,spanX:590,spanY:260,depth:480,size:.40,color:0xd1e3f8,opacity:.54},
    {count:330,spanX:410,spanY:190,depth:300,size:.62,color:0x88bddd,opacity:.52},
    {count:200,spanX:270,spanY:140,depth:195,size:.79,color:0xe4b7d9,opacity:.40}
  ];
  let drawn=0;
  for(let layer=0;layer<groups.length;layer++){
    const cfg=groups[layer],pts=[];
    for(let k=0;k<cfg.count;k++){
      const x=(rand()-.5)*cfg.spanX;
      const y=(rand()-.4)*cfg.spanY;
      const z=-(36+rand()*cfg.depth);
      // Keep center flight horizon mostly clear of big nearby objects.
      if(layer===2&&Math.abs(x)<15&&y>-18&&y<35)continue;
      pts.push(x,y,z);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.Float32BufferAttribute(pts,3));
    const mat=new THREE.PointsMaterial({
      color:cfg.color,size:cfg.size,transparent:true,opacity:cfg.opacity,
      sizeAttenuation:false,depthWrite:false,fog:false
    });
    const cloud=new THREE.Points(geo,mat);
    cloud.frustumCulled=false;
    camera.add(cloud);drawn+=pts.length/3;
  }
  const texture=nebulaTexture(THREE);
  for(const [x,y,z,scale,opacity] of [
    [-144,38,-360,235,.070],[164,-20,-420,295,.048]
  ]){
    const material=new THREE.SpriteMaterial({
      map:texture,color:0x879ada,transparent:true,
      opacity,depthWrite:false,fog:false,blending:THREE.AdditiveBlending
    });
    const sprite=new THREE.Sprite(material);
    sprite.position.set(x,y,z);
    sprite.scale.set(scale,scale*.55,1);
    sprite.renderOrder=-20;
    camera.add(sprite);
  }
  return {stars:drawn,layers:SPACE_DESIGN.starLayers,nebulae:SPACE_DESIGN.nebulaCount};
}
