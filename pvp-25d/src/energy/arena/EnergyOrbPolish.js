// Energy Arena exclusive — glass orb polish pass 21.
// Reuses the existing OrbCharacterRenderer entries without mutating the
// shared Pixi/3v3 renderer, collision geometry, picking or gameplay.
// The reference art is an aesthetic goal, not a 1:1 full-screen VFX budget.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PALETTE={
  cryo:{hex:"#78d1fa",hot:"#e5fcff",accent:"#26caff"},
  solar:{hex:"#f2b56c",hot:"#fff9d8",accent:"#ffb73e"},
  void:{hex:"#b785ed",hot:"#eed9ff",accent:"#db52ff"},
  kinetic:{hex:"#f18491",hot:"#ffe3d9",accent:"#ff6b5f"},
  vital:{hex:"#6fdaad",hot:"#e4fff6",accent:"#36e6be"},
};
const vec=(x,y,z)=>new BABYLON.Vector3(x,y,z);
const rgb=hex=>BABYLON.Color3.FromHexString(hex);

function kindFor(actor){
  const classId=String(actor.classId||"");
  if(/crystal|cryo|frost|ice/.test(classId))return "cryo";
  if(/sun|solar|photon/.test(classId))return "solar";
  if(/null|rift|void/.test(classId))return "void";
  if(/gravity|kinetic|hammer/.test(classId))return "kinetic";
  if(/pulse|reactive|vital|mend/.test(classId))return "vital";
  const col=actor.energyStyle?.core;
  if(/^#[0-9a-f]{6}$/i.test(col||"")){
    const val=parseInt(col.slice(1),16);
    const r=val>>16,g=(val>>8)&255,b=val&255;
    let min=Infinity,which="cryo";
    for(const [id,p] of Object.entries(PALETTE)){
      const c=parseInt(p.hex.slice(1),16);
      const dr=r-(c>>16),dg=g-((c>>8)&255),db=b-(c&255);
      const d=dr*dr+dg*dg+db*db;
      if(d<min){min=d;which=id;}
    }
    return which;
  }
  return actor.role==="healer"?"vital":actor.role==="melee"?"kinetic":"cryo";
}

function glowTexture(scene){
  const tx=new BABYLON.DynamicTexture("energy-orb-soft-floor",{
    width:96,height:96,
  },scene,false);
  const ctx=tx.getContext();
  const grad=ctx.createRadialGradient(48,48,2,48,48,47);
  grad.addColorStop(0,"rgba(255,255,255,.60)");
  grad.addColorStop(.19,"rgba(255,255,255,.34)");
  grad.addColorStop(.48,"rgba(255,255,255,.12)");
  grad.addColorStop(1,"rgba(255,255,255,0)");
  ctx.clearRect(0,0,96,96);
  ctx.fillStyle=grad;ctx.fillRect(0,0,96,96);
  tx.hasAlpha=true;tx.update(false);
  tx.wrapU=tx.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;
  return tx;
}
function material(scene,name,hex,{alpha=.8,emit=1.1}={}){
  const m=new BABYLON.StandardMaterial(name,scene);
  const c=rgb(hex);
  m.diffuseColor=c.scale(.15);
  m.emissiveColor=c.scale(emit);
  m.specularColor=BABYLON.Color3.Black();
  m.alpha=alpha;m.disableLighting=true;
  m.disableDepthWrite=true;m.backFaceCulling=false;
  if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
    m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
  return m;
}

export class EnergyOrbPolish{
  constructor(scene,actorRenderer){
    this.scene=scene;
    this.actorRenderer=actorRenderer;
    this.entries=new Map();
    this.floorTexture=null;
  }
  create(actor,entry){
    const id=actor.id,kind=kindFor(actor),p=PALETTE[kind];
    const mats=[],meshes=[],parts={};
    const mat=(suffix,hex,opts)=>{
      const m=material(this.scene,"energy-orb21:"+id+":"+suffix,hex,opts);
      mats.push(m);return m;
    };
    const add=(mesh,parent,material,point)=>{
      mesh.parent=parent;mesh.material=material;
      mesh.isPickable=false;
      if(point)mesh.position.copyFrom(point);
      meshes.push(mesh);return mesh;
    };
    const shell=entry.visualRoot;
    const hot=mat("heart",p.hot,{alpha:.92,emit:1.55});
    const base=mat("inner",p.hex,{alpha:.72,emit:1.18});
    const accents=mat("accents",p.accent,{alpha:.82,emit:1.40});
    const faint=mat("threads",p.hex,{alpha:.46,emit:1.1});
    const clear=mat("glints","#edfaff",{alpha:.68,emit:1.20});

    // A small, genuinely three-dimensional class-specific centre BEHIND the
    // front glass highlight. Detail scales within the existing 1.24 shell.
    // The y-axis is vertical in world space; all centres remain near 0.72.
    const center=vec(0,.92,0);
    if(kind==="cryo"||kind==="kinetic"){
      const shape=add(BABYLON.MeshBuilder.CreatePolyhedron(
        "energy-orb21-core:"+id,{type:1,size:kind==="cryo"?.155:.135},
        this.scene),shell,kind==="cryo"?hot:accents,center);
      shape.scaling.y=kind==="cryo"?1.57:1.15;
      shape.rotation.z=.34;parts.symbol=shape;
    }else if(kind==="solar"){
      parts.symbol=add(BABYLON.MeshBuilder.CreateSphere(
        "energy-orb21-core:"+id,{diameter:.185,segments:14},this.scene),
        shell,hot,center);
    }else if(kind==="void"){
      const dark=mat("singularity","#180d31",{alpha:.94,emit:.36});
      parts.symbol=add(BABYLON.MeshBuilder.CreateSphere(
        "energy-orb21-core:"+id,{diameter:.205,segments:16},this.scene),
        shell,dark,center);
    }else{
      parts.symbol=add(BABYLON.MeshBuilder.CreateSphere(
        "energy-orb21-core:"+id,{diameter:.155,segments:14},this.scene),
        shell,hot,center);
    }

    // Separate gyres provide visible depth and parallax. Their inclinations
    // are staggered rather than being copies of one flat emblem.
    parts.orbits=[];
    for(let i=0;i<2;i++){
      const o=add(BABYLON.MeshBuilder.CreateTorus(
        "energy-orb21-gyro:"+id+":"+i,{
          diameter:kind==="void"?.50+i*.13:.44+i*.12,
          thickness:i===0?.013:.009,tessellation:32,
        },this.scene),shell,i===0?accents:faint,vec(0,.84+i*.055,0));
      o.rotation.x=.24+i*.79;
      o.rotation.z=(kind==="void"?.63:.24)+i*.62;
      parts.orbits.push(o);
    }
    // Small orbiting faceted motes vary by discipline. Never spawn a
    // screen-sized particle burst or cover enemy HP / target indicators.
    parts.shards=[];
    for(let i=0;i<3;i++){
      const piece=add(BABYLON.MeshBuilder.CreatePolyhedron(
        "energy-orb21-fragment:"+id+":"+i,{
          type:1,size:(kind==="cryo"?.052:.040)+(i===1?.012:0),
        },this.scene),shell,i===0?hot:i===1?accents:base,vec(0,.74,0));
      parts.shards.push(piece);
    }
    // Two sub-pixel energy wakes, hidden at idle; they suggest motion
    // without creating duplicate orbs or an opaque, muddy ground smear.
    parts.wisps=[];
    for(let i=0;i<2;i++){
      const side=i===0?-1:1;
      const w=add(BABYLON.MeshBuilder.CreateTube(
        "energy-orb21-wisp:"+id+":"+i,{
          path:[
            vec(side*.16,.77,-.34),
            vec(side*.22,.73,-.56),
            vec(side*.13,.70,-.79),
            vec(side*.11,.66,-1.02),
          ],radius:.010-i*.002,tessellation:5,
        },this.scene),shell,i===0?base:faint);
      w.visibility=0;
      parts.wisps.push(w);
    }

    // One shared procedural texture for all actors; independent tiny
    // coloured floor light pools reinforce each orb's relationship to the
    // arena. This sits beneath the existing green/red target circles.
    if(!this.floorTexture)this.floorTexture=glowTexture(this.scene);
    const floorMat=mat("floor",p.hex,{alpha:.50,emit:.86});
    floorMat.diffuseTexture=this.floorTexture;
    floorMat.useAlphaFromDiffuseTexture=true;
    const floor=add(BABYLON.MeshBuilder.CreatePlane(
      "energy-orb21-floor:"+id,{
        size:2.1,sideOrientation:BABYLON.Mesh.DOUBLESIDE,
      },this.scene),entry.root,floorMat,vec(0,-.123,0));
    floor.rotation.x=Math.PI/2;
    floor.visibility=.55;
    parts.floor=floor;

    const data={id,kind,p,parts,mats,meshes,entry};
    this.entries.set(id,data);
    return data;
  }
  sync(game,time){
    const present=new Set(game.actors.map(a=>a.id));
    for(const [id,e] of this.entries){
      if(!present.has(id)||this.actorRenderer.entries.get(id)!==e.entry){
        this.disposeEntry(e);this.entries.delete(id);
      }
    }
    for(const actor of game.actors){
      const entry=this.actorRenderer.entries.get(actor.id);
      if(!entry)continue;
      let data=this.entries.get(actor.id);
      if(!data||data.entry!==entry)
        data=this.create(actor,entry);
      const {p,parts}=data;
      // The common character renderer resets these each frame; Energy
      // Arena overrides only its look AFTER actorRender.sync().
      // Dark middle/opaque shell were hiding all existing interior detail.
      entry.shellMat.alpha=actor.cast?.16:.13;
      entry.middleMat.alpha=actor.cast?.046:.036;
      entry.energyMat.alpha=actor.cast?.29:.25;
      entry.plasmaMat.alpha=actor.cast?.10:.075;
      entry.glassMat.alpha=.94;
      entry.heartMat.alpha=actor.cast?.57:.44;
      entry.coreMat.emissiveColor=rgb(p.hex).scale(actor.cast?1.66:1.31);
      entry.nucleusMat.emissiveColor=rgb(p.hot).scale(actor.cast?2.07:1.58);
      entry.nucleus.scaling.setAll(actor.cast?1.0:.82);
      // Strong class colour remains around a SMALL hot nucleus; the
      // outer glass is neutral so classes still look related.
      entry.energyMat.emissiveColor=rgb(p.hex).scale(actor.cast?1.33:1.08);
      entry.plasmaMat.emissiveColor=rgb(p.hex).scale(actor.cast?.92:.65);

      const t=time*.001;
      const activity=actor.cast?1.35:1;
      const motion=actor.lastMove||{x:0,y:0};
      const speed=clamp(Math.hypot(motion.x||0,motion.y||0),0,1);
      const breathe=.5+.5*Math.sin(t*2.0+entry.seed*.037);
      const {symbol,orbits,shards,wisps,floor}=parts;
      symbol.rotation.y=t*(data.kind==="void"?-.72:.47)+entry.seed*.015;
      symbol.rotation.z=.29+.14*Math.sin(t*1.19+entry.seed);
      symbol.scaling.x=(data.kind==="cryo"?.88:1)*(1+breathe*.08);
      symbol.scaling.z=(data.kind==="cryo"?.88:1)*(1+breathe*.08);
      for(let i=0;i<orbits.length;i++){
        const ring=orbits[i],dir=i===0?1:-1;
        ring.rotation.y=dir*t*(.48+i*.24)*activity+entry.seed*.004+i*1.4;
        ring.rotation.x=.25+i*.71+.12*Math.sin(t*.84+i);
        ring.visibility=.68+(actor.cast?.20:breathe*.15);
      }
      for(let i=0;i<shards.length;i++){
        const a=t*(i===1?-1.03:.66)+i*TAU/3+entry.seed*.02;
        const rad=.37+(i===1?.09:0)+.025*Math.sin(t*1.1+i);
        const m=shards[i];
        m.position.set(Math.cos(a)*rad,
          .77+Math.sin(a*1.6+i)*(.12+i*.025),
          Math.sin(a)*rad);
        m.rotation.x=a*.76+i*.6;
        m.rotation.z=-a*.51;
        m.visibility=.66+(actor.cast?.20:breathe*.17);
      }
      for(let i=0;i<wisps.length;i++){
        wisps[i].visibility=speed*clamp(.50+.18*Math.sin(t*7+i),.25,.70);
      }
      floor.visibility=actor.cast?.82:(.47+breathe*.13);
      floor.scaling.setAll(1+speed*.08);
      // No material or mesh allocation during this animation update.
    }
  }
  disposeEntry(data){
    for(const mesh of data.meshes)mesh.dispose();
    for(const mat of data.mats)mat.dispose();
  }
  dispose(){
    for(const e of this.entries.values())this.disposeEntry(e);
    this.entries.clear();
    this.floorTexture?.dispose();
    this.floorTexture=null;
  }
}
