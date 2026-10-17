// Wildpath Nature Variety & Scale — reusable instanced Babylon scenery.
// Decorative only: no physics, obstruction or changes to combat/targeting.
import {NATURE_MAX_PLANTS,NATURE_MAX_TREES} from './nature-rebirth.js';
import {WILD_RADIUS} from './open-layout.js';
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
    const A=(mesh,x,y,z,sx,sy,sz)=>this.add(entry,mesh,x,y,z,sx,sy,sz);
    const flower=(x,y,z,size=1,petals=5)=>{
      for(let i=0;i<petals;i++){
        const a=i*Math.PI*2/petals;
        A(i%2?m.accent:m.petal,x+Math.cos(a)*.18*size,y,
          z+Math.sin(a)*.18*size,.24*size,.13*size,.22*size);
      }
      A(m.center,x,y+.035*size,z,.17*size,.18*size,.17*size);
    };
    const leaf=(x,y,z,sx,sy,sz)=>A(m.leaf,x,y,z,sx,sy,sz);
    const variant=entry.look.variant;
    if(entry.tier==='flower'){
      if(variant==='star'){
        A(this.twig,0,.28,0,.085,.56,.085);
        leaf(-.15,.22,.04,.30,.12,.21);
        leaf(.16,.32,-.02,.32,.13,.22);
        flower(0,.68,0,1.05);
      }else if(variant==='cluster'){
        for(const [x,z,y] of [[-.22,-.1,.38],[.22,.13,.5],[.02,-.22,.59]]){
          A(this.twig,x,y*.5,z,.055,y,.06);
          flower(x,y+.16,z,.70,4);
        }
        leaf(.02,.17,.01,.58,.18,.32);
      }else{
        A(this.twig,0,.42,0,.085,.85,.08);
        leaf(-.24,.30,-.03,.42,.14,.24);
        leaf(.24,.47,.05,.43,.17,.22);
        flower(0,.99,0,.90);
        flower(-.18,.67,.13,.57,4);
      }
    }else if(entry.tier==='bush'){
      if(variant==='round'){
        for(const [x,z,s] of [[-.35,.06,.86],[.33,-.02,.82],[0,.26,.96],[0,-.32,.78]])
          leaf(x,.35,z,s,.65,s);
      }else if(variant==='wide'){
        for(let i=-2;i<=2;i++){
          const x=i*.36;
          A(i%2?m.light:m.leaf,x,.26+(.22-Math.abs(i)*.06),i%2?.17:-.12,
            .68,.56,.72);
        }
      }else{
        for(const [x,y,z] of [[-.42,.34,.11],[.30,.47,.20],[0,.58,-.29],[.4,.32,-.32]])
          A(m.light,x,y,z,.80,.79,.80);
      }
      const buds=variant==='flowered'?7:variant==='wide'?5:4;
      for(let i=0;i<buds;i++){
        const a=(i+.2)*Math.PI*2/buds;
        const rad=variant==='wide'?.76:.49;
        flower(Math.cos(a)*rad,.71+(i%2)*.14,Math.sin(a)*.40,.42,4);
      }
    }else{
      const big=entry.tier==='blossom';
      const height=big?1.40:1.18;
      const wide=variant==='wide',tall=variant==='tall';
      const crownH=height+(tall?1.08:.70);
      const trunkH=height+(tall?.30:0);
      A(this.bark,0,trunkH*.50,0,big?.39:.33,trunkH,big?.39:.33);
      // Four genuinely distinct tree silhouettes, not merely color swaps.
      const main=big?m.light:m.leaf;
      if(variant==='round'||variant==='grand'){
        A(main,0,crownH,0,2.15,1.48,2.08);
        A(m.leaf,-.75,crownH-.28,.22,1.29,1.07,1.33);
        A(m.light,.73,crownH-.23,-.18,1.35,1.03,1.19);
        if(variant==='grand'){
          A(main,0,crownH+.54,.07,1.65,1.09,1.58);
          A(m.leaf,.12,crownH-.29,.79,1.50,.91,1.11);
        }
      }else if(wide){
        A(main,-.69,crownH-.06,0,1.95,1.20,1.62);
        A(m.leaf,.72,crownH-.02,-.05,1.95,1.24,1.73);
        A(m.light,0,crownH+.26,.03,1.77,1.19,1.65);
        A(main,.04,crownH-.38,.60,1.96,.78,1.13);
      }else if(tall){
        A(main,0,crownH+.45,0,1.48,1.69,1.39);
        A(m.leaf,-.43,crownH-.25,.15,1.26,1.27,1.25);
        A(m.light,.42,crownH-.28,-.15,1.25,1.19,1.20);
        A(main,0,crownH+1.05,-.02,.86,.92,.87);
      }else{ // grove: a cluster of overlapping, rounded mini-canopies
        for(let i=0;i<5;i++){
          const a=i*Math.PI*2/5+entry.seed;
          const rad=i%2?.67:.91;
          A(i%2?m.light:m.leaf,Math.cos(a)*rad,crownH+(i%3)*.23,
            Math.sin(a)*rad,1.32,1.18,1.32);
        }
        A(main,0,crownH+.28,0,1.50,1.19,1.48);
      }
      // Separate blossoms supply the color signature even on green trees.
      const blossoms=big?variant==='grand'?13:10:3;
      for(let i=0;i<blossoms;i++){
        const a=i*2.399963+entry.seed*.35;
        const r=(i%3===0?.37:i%3===1?.73:1.12)*(wide?1.25:1);
        const x=Math.cos(a)*r,z=Math.sin(a)*r*.75;
        const y=crownH+(i%4)*.19+(tall?.15:0);
        A(i%3===0?m.accent:m.petal,x,y,z,big?.39:.25,big?.23:.17,big?.37:.24);
        if(big&&i%3===0)A(m.center,x,y+.16,z,.13,.12,.14);
      }
    }
  }
  remove(entry){
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
      const visible=natureVisibility(Math.hypot(hero.x-p.x,hero.z-p.z),p.tier);
      for(const part of p.meshes)part.visibility=visible;
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
    this.templates=[];this.materials=[];
  }
  snapshot(){
    const tiers={flower:0,bush:0,tree:0,blossom:0};
    const palettes=Object.fromEntries(NATURE_PALETTE_IDS.map(id=>[id,0]));
    const variants={flower:new Set(),bush:new Set(),tree:new Set(),blossom:new Set()};
    let biggestScale=0;
    for(const p of this.order){
      tiers[p.tier]++;palettes[p.look.palette]++;
      variants[p.tier].add(p.look.variant);
      biggestScale=Math.max(biggestScale,p.look.scale);
    }
    return {plants:this.order.length,planted:this.planted,upgrades:this.upgrades,
      tiers,palettes,biggestScale,
      variants:Object.fromEntries(Object.entries(variants).map(([id,set])=>[id,[...set]]))};
  }
}
