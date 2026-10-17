// Wildpath Nature Variety & Scale — reusable instanced Babylon scenery.
// Decorative only: no physics, obstruction or changes to combat/targeting.
import {NATURE_MAX_PLANTS,NATURE_MAX_TREES} from './nature-rebirth.js';
import {WILD_RADIUS} from './open-layout.js';
import {makePlantForm,describePlantForm} from './nature-forms.js?v=2.5.2';
import {NATURE_PALETTES,NATURE_PALETTE_IDS,chooseNatureLook,natureVisibility}
  from './nature-variety.js';
const B=window.BABYLON;
function material(scene,id,hex){
  const m=new B.StandardMaterial('rebirth '+id,scene);
  const c=B.Color3.FromHexString(hex);
  m.diffuseColor=c;m.emissiveColor=c.scale(.22);
  m.specularColor=new B.Color3(.023,.026,.020);
  return m;
}
function template(scene,kind,name,mat){
  const mesh=kind==='cylinder'
    ?B.MeshBuilder.CreateCylinder(name,{height:1,diameterTop:.65,diameterBottom:1,tessellation:8},scene)
    :B.MeshBuilder.CreateSphere(name,{diameter:1,segments:9},scene);
  mesh.material=mat;mesh.position.set(0,-500,0);mesh.isPickable=false;
  return mesh;
}
export class NatureGrowth {
  constructor(scene,{onBloom=()=>{}}={}){
    this.scene=scene;this.onBloom=onBloom;
    this.materials=[];this.templates=[];this.byId=new Map();this.order=[];
    this.time=0;this.planted=0;this.upgrades=0;
    const source=(id,type,color)=>{
      const m=material(scene,id,color);this.materials.push(m);
      const mesh=template(scene,type,id,m);this.templates.push(mesh);
      return mesh;
    };
    this.twig=source('twig','cylinder','#588768');
    this.bark=source('bark','cylinder','#826852');
    // Single shared low-resolution radial opacity texture for soft, subtle
    // ground contacts. Unlike the old dark solid circles, the edge fades out.
    this.shadowTexture=new B.DynamicTexture('rebirth contact gradient',
      {width:64,height:64},scene,false);
    const ctx=this.shadowTexture.getContext();
    const g=ctx.createRadialGradient(32,32,1,32,32,32);
    g.addColorStop(0,'rgba(255,255,255,.49)');
    g.addColorStop(.52,'rgba(255,255,255,.19)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.clearRect(0,0,64,64);
    ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
    this.shadowTexture.hasAlpha=true;this.shadowTexture.update();
    const shadowMat=material(scene,'soft contact','#31483c');
    shadowMat.opacityTexture=this.shadowTexture;
    shadowMat.disableLighting=true;shadowMat.alpha=.22;
    shadowMat.backFaceCulling=false;
    this.materials.push(shadowMat);
    this.shadowSource=B.MeshBuilder.CreateGround('rebirth shadow source',
      {width:1,height:1,subdivisions:1},scene);
    this.shadowSource.material=shadowMat;
    this.shadowSource.position.y=-500;
    this.shadowSource.isPickable=false;
    this.templates.push(this.shadowSource);
    this.paletteMeshes={};
    for(const [id,p] of Object.entries(NATURE_PALETTES)){
      this.paletteMeshes[id]={
        leaf:source(id+' leaf','sphere',p.leaf),
        light:source(id+' foliage light','sphere',p.light),
        petal:source(id+' petals','sphere',p.petal),
        accent:source(id+' petals light','sphere',p.accent),
        center:source(id+' pollen','sphere',p.glow)
      };
    }
  }
  add(entry,mesh,x,y,z,sx,sy,sz){
    const part=mesh.createInstance('rebirth '+entry.look.palette+' '+entry.tier);
    part.parent=entry.root;
    part.position.set(x,y,z);part.scaling.set(sx,sy,sz);
    part.isPickable=false;entry.meshes.push(part);
  }
  construct(entry){
    const m=this.paletteMeshes[entry.look.palette];
    const anatomy=makePlantForm(entry.look,entry.seed);
    entry.anatomy=describePlantForm(entry.look,entry.seed);
    // Tiny separate leaf/petal clusters plus two trunk sections and
    // three forked branches replace the huge overlapping canopy spheres.
    for(const piece of anatomy){
      const mesh=piece.kind==='stem'?this.twig:
        piece.kind==='branch'||piece.kind==='bark'?this.bark:
        piece.kind==='blade'?m.leaf:m[piece.kind];
      if(!mesh)throw Error('Unknown Nature Rebirth anatomy: '+piece.kind);
      const p=mesh.createInstance('rebirth '+entry.look.palette+' '+piece.kind);
      p.parent=entry.root;
      p.position.set(piece.x,piece.y,piece.z);
      p.scaling.set(piece.sx,piece.sy,piece.sz);
      p.rotation.x=piece.rx||0;p.rotation.z=piece.rz||0;
      // Preserve the visible trunk even when foliage fades near the hero.
      p.metadata={natureKind:piece.kind};
      p.isPickable=false;entry.meshes.push(p);
    }
  }
  attachShadow(entry){
    if(entry.shadow)entry.shadow.dispose();
    const shadow=this.shadowSource.createInstance('soft contact '+entry.id);
    const size=entry.tier==='blossom'?3.15:entry.tier==='tree'?2.80:
      entry.tier==='bush'?1.65:.76;
    const s=size*entry.look.scale;
    shadow.position.set(entry.x,-.110,entry.z);
    shadow.scaling.set(s,1,s*.81);
    shadow.isPickable=false;
    entry.shadow=shadow;
  }
  remove(entry){
    entry.shadow?.dispose();
    for(const m of entry.meshes)m.dispose();
    entry.meshes.length=0;
    entry.root.dispose();
    this.byId.delete(entry.id);
    const idx=this.order.indexOf(entry);
    if(idx>=0)this.order.splice(idx,1);
  }
  siteFor(x,z,hero,tier,ignoreId=null){
    const minHero=tier==='blossom'?7.0:tier==='tree'?6.0:tier==='bush'?2.5:1.7;
    const dx=x-hero.x,dz=z-hero.z,d=Math.hypot(dx,dz);
    if(d<minHero){
      const angle=d>.1?Math.atan2(dz,dx):Math.atan2(z+1,x+1);
      x=hero.x+Math.cos(angle)*minHero;
      z=hero.z+Math.sin(angle)*minHero;
    }
    const limit=WILD_RADIUS-4.2,r=Math.hypot(x,z);
    if(r>limit){x*=limit/r;z*=limit/r;}
    const spacing=tier==='blossom'?6.0:tier==='tree'?5.1:tier==='bush'?1.8:1.0;
    for(let i=0;i<10;i++){
      if(this.order.every(p=>p.id===ignoreId||
        Math.hypot(p.targetX-x,p.targetZ-z)>spacing))break;
      const angle=i*2.399963+Math.atan2(z,x),step=1.5+i*.46;
      const nx=x+Math.cos(angle)*step,nz=z+Math.sin(angle)*step;
      if(Math.hypot(nx,nz)<limit){x=nx;z=nz;}
    }
    return {x,z};
  }
  enforceBudget(hero,incoming){
    while(this.order.length>=NATURE_MAX_PLANTS){
      const small=this.order.filter(p=>p.tier==='flower'||p.tier==='bush');
      const far=small.filter(p=>Math.hypot(p.targetX-hero.x,p.targetZ-hero.z)>19);
      this.remove((far.length?far:small)[0]||this.order[0]);
    }
    if(incoming==='tree'||incoming==='blossom'){
      const trees=this.order.filter(p=>p.tier==='tree'||p.tier==='blossom');
      if(trees.length>=NATURE_MAX_TREES)this.remove(trees[0]);
    }
  }
  apply(event,hero){
    if(!event||event.kind==='grow')return;
    const existing=this.byId.get(event.id);
    const upgraded=Boolean(existing);
    const look=chooseNatureLook(event,existing?.look);
    if(upgraded){
      const becomingTree=look.tier==='tree'||look.tier==='blossom';
      const wasTree=existing.tier==='tree'||existing.tier==='blossom';
      if(becomingTree&&!wasTree){
        const trees=this.order.filter(p=>p.tier==='tree'||p.tier==='blossom');
        if(trees.length>=NATURE_MAX_TREES)this.remove(trees[0]);
      }
      for(const mesh of existing.meshes)mesh.dispose();
      existing.meshes.length=0;existing.root.dispose();
    }else this.enforceBudget(hero,event.tier);
    const pos=this.siteFor(event.x,event.z,hero,event.tier,event.id);
    const entry=existing||{id:event.id,seed:event.id*1.37,meshes:[],
      root:null,x:pos.x,z:pos.z,targetX:pos.x,targetZ:pos.z};
    entry.look=look;entry.tier=event.tier;entry.species=event.species;
    entry.targetX=pos.x;entry.targetZ=pos.z;
    if(!upgraded){entry.x=pos.x;entry.z=pos.z;}
    entry.age=0;
    entry.duration=entry.tier==='blossom'?1.35:entry.tier==='tree'?1.1:
      entry.tier==='bush'?.85:.62;
    entry.root=new B.TransformNode('grown '+entry.tier+' '+entry.id,this.scene);
    entry.root.position.set(entry.x,.01,entry.z);
    entry.root.scaling.setAll(.001);
    this.construct(entry);
    this.attachShadow(entry);
    if(!upgraded){this.byId.set(entry.id,entry);this.order.push(entry);this.planted++;}
    else this.upgrades++;
    this.onBloom({...event,x:pos.x,z:pos.z,...look},upgraded);
  }
  update(dt,hero){
    this.time+=dt;
    for(const p of this.order){
      p.age+=dt;
      const u=Math.min(1,p.age/p.duration),t=u-1;
      // Spring-like, fast readable grow-pop; scale belongs to the visual tier.
      const bounce=1+2.55*t*t*t+1.55*t*t;
      const sway=1+Math.sin(this.time*1.12+p.seed)*.012;
      p.root.scaling.setAll(Math.max(.001,bounce*p.look.scale*sway));
      const k=Math.min(1,dt*3.4);
      p.x+=(p.targetX-p.x)*k;p.z+=(p.targetZ-p.z)*k;
      p.root.position.set(p.x,.015-(1-u)*.24,p.z);
      p.root.rotation.y=Math.sin(this.time*.59+p.seed)*.028;
      p.shadow.position.x=p.x;p.shadow.position.z=p.z;
      const visible=natureVisibility(Math.hypot(hero.x-p.x,hero.z-p.z),p.tier);
      for(const part of p.meshes)
        part.visibility=['bark','branch','stem'].includes(part.metadata?.natureKind)
          ?Math.max(.83,visible):visible;
    }
  }
  clear(){
    for(const p of [...this.order])this.remove(p);
    this.time=0;this.planted=0;this.upgrades=0;
  }
  dispose(){
    this.clear();
    for(const template of this.templates)template.dispose();
    for(const material of this.materials)material.dispose();
    this.shadowTexture.dispose();
    this.templates=[];this.materials=[];
  }
  snapshot(){
    const tiers={flower:0,bush:0,tree:0,blossom:0};
    const palettes=Object.fromEntries(NATURE_PALETTE_IDS.map(id=>[id,0]));
    const variants={flower:new Set(),bush:new Set(),tree:new Set(),blossom:new Set()};
    let biggestScale=0;
    let visibleBranches=0,foliageClusters=0,contactShadows=0;
    for(const p of this.order){
      tiers[p.tier]++;palettes[p.look.palette]++;
      variants[p.tier].add(p.look.variant);
      biggestScale=Math.max(biggestScale,p.look.scale);
      visibleBranches+=p.anatomy.branches;
      foliageClusters+=p.anatomy.leafClusters;
      if(p.shadow)contactShadows++;
    }
    return {plants:this.order.length,planted:this.planted,upgrades:this.upgrades,
      tiers,palettes,biggestScale,visibleBranches,foliageClusters,contactShadows,
      variants:Object.fromEntries(Object.entries(variants).map(([id,set])=>[id,[...set]]))};
  }
}
