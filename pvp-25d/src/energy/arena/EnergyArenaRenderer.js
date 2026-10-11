// Separate Energy Arena renderer. Reuses the production glass orb meshes and
// floor target rings without changing the existing BabylonRenderer / Pixi game.
import { OrbCharacterRenderer } from "../../rendering/babylon/OrbCharacterRenderer.js?v=20261008-orbs-v21-vfx-polish";
import { OrbGroundMarkers } from "../../rendering/babylon/OrbGroundMarkers.js?v=20261008-ground-rings6-contained";
import { EnergyOrbPolish } from "./EnergyOrbPolish.js?v=20261009-hub-orbit29";
import { EnergySpellVFX } from "./EnergySpellVFX.js?v=20261009-side-swing20";
import { EnergyPixiVFXOverlay } from "./EnergyPixiVFXOverlay.js?v=20261009-side-swing20";

const S=.02;
const color=hex=>BABYLON.Color3.FromHexString(hex);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Camera only starts tracking when the player leaves the comfort region. It
// moves towards the closest edge of that region, never snaps to player center.
export function advanceDefenseCamera(anchor,player,dt,arena){
  const deadX=164,deadY=125;
  const targetX=player.x>anchor.x+deadX?player.x-deadX:
    player.x<anchor.x-deadX?player.x+deadX:anchor.x;
  const targetY=player.y>anchor.y+deadY?player.y-deadY:
    player.y<anchor.y-deadY?player.y+deadY:anchor.y;
  const lerp=1-Math.exp(-6.2*clamp(dt,0,.1));
  const boundX=clamp(targetX,510,arena.width-510);
  const boundY=clamp(targetY,360,arena.height-360);
  return {x:anchor.x+(boundX-anchor.x)*lerp,
    y:anchor.y+(boundY-anchor.y)*lerp};
}
export class EnergyArenaRenderer {
  constructor(canvas,arena) {
    if(!window.BABYLON)throw new Error("Babylon.js is unavailable");
    this.canvas=canvas;this.arena=arena;
    this.defenseMode=arena.mode==="defense";
    this.cameraFocus={x:arena.cameraStart?.x??arena.width*.5,
      y:arena.cameraStart?.y??arena.height*.5};
    this.lastFollowAt=0;
    this.engine=new BABYLON.Engine(canvas,true,{stencil:true,antialias:true,preserveDrawingBuffer:false});
    this.scene=new BABYLON.Scene(this.engine);
    this.scene.clearColor=BABYLON.Color4.FromHexString("#080d18ff");
    this.scene.ambientColor=color("#4b5471");
    this.scene.imageProcessingConfiguration.contrast=1.09;
    this.scene.imageProcessingConfiguration.exposure=0.95;
    this.effects=[];
    this.createScene();
    this.spellFX=new EnergySpellVFX(this.scene);
    this.pixiFX=new EnergyPixiVFXOverlay(canvas.parentElement||canvas,this);
    this.pixiFX.init();
    this.actorRender=new OrbCharacterRenderer(this.scene,null,S);
    // Keep our established glass + animated arc geometry but replace class
    // palettes with role and discipline colours from the new Energy system.
    this.actorRender.styleFor=actor=>actor.energyStyle||{core:"#6acbd8",energy:"#83e4ee"};
    // Energy-only glass/core/discipline pass. Shared WoW 3v3 orb renderer stays untouched.
    this.orbPolish=new EnergyOrbPolish(this.scene,this.actorRender);
    this.markers=new OrbGroundMarkers(this.scene,S);
    // Babylon starts with the canvas HTML default drawing buffer (300x150).
    // Resize immediately to CSS stage dimensions, not only after a window resize.
    this.engine.resize();
    this.fitCamera();
    this.resize=()=>{this.engine.resize();this.fitCamera();};
    window.addEventListener("resize",this.resize);
    if("ResizeObserver"in window){
      this.observer=new ResizeObserver(()=>this.resize());
      this.observer.observe(canvas.parentElement||canvas);
    }
  }
  material(id,diffuse,emissive,alpha=1) {
    const m=new BABYLON.StandardMaterial(id,this.scene);
    m.diffuseColor=color(diffuse);m.emissiveColor=color(emissive);
    m.specularColor=color("#1a2433");m.alpha=alpha;
    if(alpha<1)m.backFaceCulling=false;
    return m;
  }
  tube(id,points,radius,mat) {
    const mesh=BABYLON.MeshBuilder.CreateTube(id,{path:points,radius,tessellation:12},this.scene);
    mesh.material=mat;mesh.isPickable=false;return mesh;
  }
  // Deterministic, broad-facet regolith surface with carved rifts and
  // clustered crystalline mesas. Decoration is non-colliding; solid rocks
  // come EXCLUSIVELY from the arena obstacle geometry.
  createDefenseTerrain(a,w,h,cx,cz){
    this.scene.clearColor=BABYLON.Color4.FromHexString("#061020ff");
    this.scene.ambientColor=color("#51637a");
    const ground=BABYLON.MeshBuilder.CreateGround("shattered-expanse-ground",
      {width:w,height:h,subdivisions:2},this.scene);
    ground.position.set(cx,-.055,cz);ground.isPickable=false;
    const mat=this.material("regolith-mat","#ffffff","#101923");
    mat.specularColor=color("#02060c");
    const texture=new BABYLON.DynamicTexture("regolith-lowpoly",
      {width:2048,height:1365},this.scene,false);
    const ctx=texture.getContext();
    let seed=1741;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    ctx.fillStyle="#152133";ctx.fillRect(0,0,2048,1365);
    const facets=["#1d2c40","#1a2a3c","#203144","#253548","#182536",
      "#202f43","#1c2a3b","#263447","#172338","#223247","#26374a"];
    const cols=25,rows=17,dx=2048/cols,dy=1365/rows;
    const grid=Array.from({length:rows+1},(_,y)=>Array.from({length:cols+1},(_,x)=>({
      x:x*dx+(x===0||x===cols?0:(rnd()-.5)*dx*.58),
      y:y*dy+(y===0||y===rows?0:(rnd()-.5)*dy*.58)
    })));
    function triangle(p,q,r,tone){
      ctx.fillStyle=tone;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
      ctx.lineTo(r.x,r.y);ctx.closePath();ctx.fill();
    }
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const p=grid[y][x],q=grid[y][x+1],r=grid[y+1][x+1],t=grid[y+1][x];
      triangle(p,q,r,facets[Math.floor(rnd()*facets.length)]);
      triangle(p,r,t,facets[Math.floor(rnd()*facets.length)]);
    }
    // Hairline rifts and faint scattered mineral glints; no PvP grid.
    for(let i=0;i<31;i++){
      const px=rnd()*2048,py=rnd()*1365,dir=rnd()*6.283,length=35+rnd()*155;
      ctx.beginPath();ctx.moveTo(px,py);
      ctx.lineTo(px+Math.cos(dir)*length*.49,py+Math.sin(dir)*length*.44);
      ctx.lineTo(px+Math.cos(dir+.25)*length,py+Math.sin(dir+.25)*length);
      ctx.strokeStyle=i%4===0?"#5296a26b":"#050e1e9e";
      ctx.lineWidth=i%4===0?2.4:4;ctx.stroke();
    }
    texture.update(false);mat.diffuseTexture=texture;
    mat.emissiveColor=color("#182637");ground.material=mat;
    this.defenseGroundTexture=texture;

    const stoneMats=[
      this.material("regolith-rock-dark","#293447","#142033"),
      this.material("regolith-rock-slate","#384759","#1e3345"),
      this.material("regolith-rock-blue","#354f60","#235064"),
      this.material("regolith-rock-lilac","#484860","#342b52")
    ];
    const crystalMats=[
      this.material("defense-crystal-teal","#345f71","#3685a0"),
      this.material("defense-crystal-violet","#575078","#684cab")
    ];
    // Flat faceted mesas occupy exactly the footprints used by pathfinding.
    for(const [i,o] of a.obstacles.entries()){
      const x=(o.x+o.w*.5)*S,z=(o.y+o.h*.5)*S,bw=o.w*S,bh=o.h*S;
      const mesa=BABYLON.MeshBuilder.CreateBox("defense-mesa:"+o.id,
        {width:bw,height:.60,depth:bh},this.scene);
      mesa.position.set(x,.26,z);mesa.material=stoneMats[i%stoneMats.length];
      mesa.isPickable=false;
      const crown=BABYLON.MeshBuilder.CreateCylinder("defense-crystal:"+o.id,
        {height:1.23,diameterTop:.22,diameterBottom:Math.min(bw,bh)*.66,
          tessellation:5},this.scene);
      crown.position.set(x,.9,z);crown.rotation.y=i*.73;
      crown.material=crystalMats[i%2];crown.isPickable=false;
      const spark=BABYLON.MeshBuilder.CreateCylinder("defense-splinter:"+o.id,
        {height:.87,diameterTop:0,diameterBottom:.46,tessellation:4},this.scene);
      spark.position.set(x+bw*.23,.63,z-bh*.18);
      spark.rotation.z=.22;spark.material=crystalMats[(i+1)%2];spark.isPickable=false;
    }
    // Decorative ancient orbital arcs on the ground, clearly distinct from
    // the square frames/pillar outlines of the PvP arena.
    const etched=this.material("ancient-orbit","#19364a","#265a6a",.72);
    for(const diameter of [6.8,9.2,12.8]){
      const ring=BABYLON.MeshBuilder.CreateTorus("ancient-orbit-"+diameter,
        {diameter,thickness:.018,tessellation:96},this.scene);
      ring.position.set(cx,.006,cz);ring.material=etched;
      ring.isPickable=false;
    }
    // Terrain decorations are kept deliberately sparse and flat so the orb
    // spells remain readable during busy multi-target survival waves.
    for(let i=0;i<55;i++){
      const xx=(130+rnd()*(a.width-260))*S;
      const zz=(130+rnd()*(a.height-260))*S;
      const shard=BABYLON.MeshBuilder.CreateCylinder("regolith-debris-"+i,
        {height:.018,diameter:.10+rnd()*.32,tessellation:3},this.scene);
      shard.position.set(xx,-.014,zz);shard.rotation.y=rnd()*6.28;
      shard.material=stoneMats[i%stoneMats.length];shard.isPickable=false;
    }
  }
  createScene(){
    const a=this.arena,w=a.width*S,h=a.height*S,cx=w/2,cz=h/2;
    const camera=new BABYLON.ArcRotateCamera("energy-camera",-Math.PI/2,0.43,24.1,new BABYLON.Vector3(cx,0,cz+.6),this.scene);
    camera.inputs.clear();camera.minZ=.01;camera.maxZ=170;camera.fov=.72;
    this.camera=camera;this.scene.activeCamera=camera;
    const hemi=new BABYLON.HemisphericLight("energy-hemi",new BABYLON.Vector3(.1,1,.1),this.scene);
    hemi.intensity=.72;hemi.diffuse=color("#c9dbed");hemi.groundColor=color("#323858");
    const sun=new BABYLON.DirectionalLight("energy-sun",new BABYLON.Vector3(-.5,-1,.32),this.scene);
    sun.position.set(18,25,-7);sun.intensity=.65;sun.diffuse=color("#cfb6dd");
    if(this.defenseMode){
      this.createDefenseTerrain(a,w,h,cx,cz);
    }else{
    const ground=BABYLON.MeshBuilder.CreateGround("energy-ground",{width:w,height:h},this.scene);
    ground.position.set(cx,-.038,cz);
    ground.material=this.material("floor-mat","#101522","#080f1f");
    ground.isPickable=false;
    const outerMat=this.material("outer-rim","#11273a","#32869b");
    const innerMat=this.material("inside-line","#0d1e2e","#245465");
    const path=(x,y,ww,hh,elev)=>[
      new BABYLON.Vector3(x,elev,y),new BABYLON.Vector3(x+ww,elev,y),
      new BABYLON.Vector3(x+ww,elev,y+hh),new BABYLON.Vector3(x,elev,y+hh),
      new BABYLON.Vector3(x,elev,y)];
    this.tube("outer-frame",path(.3,.3,w-.6,h-.6,.062),.047,outerMat);
    this.tube("inner-frame",path(.68,.64,w-1.36,h-1.28,.035),.012,innerMat);
    const fieldMat=this.material("field-lines","#0e1e2e","#0d263a");
    for(let i=1;i<8;i++){
      const x=i*w/8;
      this.tube("field-x"+i,[new BABYLON.Vector3(x,.01,.68),new BABYLON.Vector3(x,.01,h-.68)],.010,fieldMat);
    }
    const coreMat=this.material("obstacle-core","#172030","#0e1a2b");
    const sideMat=this.material("obstacle-side","#202d40","#16283e");
    const obstacleRim=this.material("obstacle-rim","#1b5160","#327486");
    for(const o of a.obstacles){
      const x=(o.x+o.w*.5)*S,z=(o.y+o.h*.5)*S,bw=o.w*S,bh=o.h*S;
      const block=BABYLON.MeshBuilder.CreateBox("energy-obstacle:"+o.id,{width:bw,height:1.22,depth:bh},this.scene);
      block.position.set(x,.61,z);block.material=coreMat;block.isPickable=false;
      const top=BABYLON.MeshBuilder.CreateBox("energy-obstacle-top:"+o.id,{width:bw-.08,height:.08,depth:bh-.08},this.scene);
      top.position.set(x,1.25,z);top.material=sideMat;top.isPickable=false;
      this.tube("energy-obstacle-rim:"+o.id,path((o.x+6)*S,(o.y+6)*S,(o.w-12)*S,(o.h-12)*S,1.32),.032,obstacleRim);
      this.tube("energy-obstacle-foot:"+o.id,path(o.x*S,o.y*S,bw,bh,.02),.025,innerMat);
    }
    }
    this.glow=new BABYLON.GlowLayer("energy-glow",this.scene,{blurKernelSize:24});
    this.glow.intensity=.38;
    if(BABYLON.FxaaPostProcess)try{this.fxaa=new BABYLON.FxaaPostProcess("energy-fxaa",1,camera);}catch{}
  }
  fitCamera(){
    const width=Math.max(1,this.engine.getRenderWidth()),height=Math.max(1,this.engine.getRenderHeight());
    const scale=Math.max(1,1.55/(width/height));
    this.camera.target.set(this.cameraFocus.x*S,0,this.cameraFocus.y*S+.6);
    this.camera.radius=(this.defenseMode?19.4:24.1)*scale;
    this.camera.getViewMatrix(true);this.camera.getProjectionMatrix(true);
  }
  pickActor(clientX,clientY) {
    const rect=this.canvas.getBoundingClientRect();
    const x=(clientX-rect.left)*this.engine.getRenderWidth()/Math.max(1,rect.width);
    const y=(clientY-rect.top)*this.engine.getRenderHeight()/Math.max(1,rect.height);
    const pick=this.scene.pick(x,y,mesh=>Boolean(mesh?.metadata?.actorId));
    if(pick?.pickedMesh?.metadata?.actorId)return pick.pickedMesh.metadata.actorId;
    // Clicks near the transparent glass edge should still target the orb.
    const viewport=new BABYLON.Viewport(0,0,
      Math.max(1,rect.width),Math.max(1,rect.height));
    let best=null,bestD=42;
    for(const actor of this.activeActors||[]){
      if(!actor.alive)continue;
      const p=BABYLON.Vector3.Project(
        new BABYLON.Vector3(actor.x*S,.88,actor.y*S),
        BABYLON.Matrix.Identity(),this.scene.getTransformMatrix(),viewport);
      if(!Number.isFinite(p.x)||p.z<0||p.z>1)continue;
      const d=Math.hypot(p.x-(clientX-rect.left),p.y-(clientY-rect.top));
      if(d<bestD){best=actor.id;bestD=d;}
    }
    return best;
  }
  spawnEffect(event,match){
    if(event.type==="resonance-proc"){
      const target=match.getActor(event.targetId)||match.getActor(event.actorId);
      if(target){
        const hex=event.role==="healer"?"#85f0b8":
          event.role==="melee"?"#f58ca0":"#8ecaff";
        const pos=new BABYLON.Vector3(target.x*S,.14,target.y*S);
        this.spellFX.ring(pos,hex,
          event.kind==="wave"?3.1:event.kind==="impact"?1.8:1.25,
          event.kind==="wave"?680:490,"ground");
        if(event.kind!=="wave")
          this.spellFX.sphere(new BABYLON.Vector3(pos.x,.85,pos.z),
            hex,event.kind==="impact"?.43:.24,330,"burst");
      }
      return;
    }
    // Snapshot renderer availability at RELEASE, so a missing/disabled Pixi
    // layer falls back to Babylon rather than making attacks invisible.
    this.spellFX.hero.setPixiProjectilesAvailable(
      !!(this.pixiFX?.ready&&this.pixiFX?.enabled&&!this.pixiFX?.failed));
    this.spellFX.spawn(event,match);
    this.pixiFX?.spawn(event,match);
  }
  render(match){
    const now=performance.now();
    if(this.defenseMode&&match.player?.alive){
      const dt=this.lastFollowAt?Math.min(.1,(now-this.lastFollowAt)/1000):0;
      this.lastFollowAt=now;
      this.cameraFocus=advanceDefenseCamera(this.cameraFocus,match.player,dt,this.arena);
      this.camera.target.set(this.cameraFocus.x*S,0,this.cameraFocus.y*S+.6);
    }
    this.activeActors=match.actors;
    // Five waves create twenty enemies. Keep dead actors for reports, but
    // remove their mesh entries immediately to avoid a growing Babylon scene.
    const display=match.modeId==="defense"?
      {actors:match.actors.filter(a=>a.alive),player:match.player}:match;
    this.actorRender.sync(display,now);
    this.orbPolish.sync(display,now);
    this.markers.sync(display,now);
    // Planet Defense finale: a visible rotating double halo marks the Rift
    // Warden as the wave boss without modifying the shared 3v3 orb renderer.
    const boss=match.modeId==="defense"?
      match.actors.find(a=>a.boss&&a.alive):null;
    if(boss&&!this.defenseBossRings){
      const ringMat=this.material("defense-boss-ring","#b98be9","#bb7aff");
      const edgeMat=this.material("defense-boss-edge","#66559a","#9265d9");
      this.defenseBossRings=[
        BABYLON.MeshBuilder.CreateTorus("defense-boss-halo-inner",
          {diameter:2.3,thickness:.055,tessellation:52},this.scene),
        BABYLON.MeshBuilder.CreateTorus("defense-boss-halo-outer",
          {diameter:2.95,thickness:.024,tessellation:52},this.scene)
      ];
      this.defenseBossRings[0].material=ringMat;
      this.defenseBossRings[1].material=edgeMat;
      for(const ring of this.defenseBossRings)ring.isPickable=false;
    }
    for(const [index,ring] of (this.defenseBossRings||[]).entries()){
      ring.setEnabled(Boolean(boss));
      if(boss){
        ring.position.set(boss.x*S,.12+index*.023,boss.y*S);
        ring.rotation.y=(now*.00037)*(index===0?1:-1);
      }
    }
    this.spellFX.update(match,now);
    this.scene.render();
    this.pixiFX?.update(match,now);
  }
  dispose(){
    this.observer?.disconnect();
    window.removeEventListener("resize",this.resize);
    this.pixiFX?.dispose();
    this.spellFX?.dispose();
    this.markers?.dispose();
    this.orbPolish?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}