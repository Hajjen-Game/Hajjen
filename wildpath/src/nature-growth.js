// Nature Rebirth 1.0. Instanced Babylon meshes + TransformNode growth; decorative only.
// Mesh templates, color materials and transforms are shared and disposed on teardown.
// IMPORTANT: No collision, targeting, health or movement modifications.
import {NATURE_MAX_PLANTS,NATURE_MAX_TREES} from './nature-rebirth.js';
import {WILD_RADIUS} from './open-layout.js';
const B=window.BABYLON;
const COLORS={
  mossling:{petal:'#f6bdd5',leaf:'#75a985',glow:'#fff2d9'},
  bramble:{petal:'#c3a4ef',leaf:'#78988b',glow:'#e9d4ff'},
  ember:{petal:'#f4ce91',leaf:'#a6a373',glow:'#fff1ae'},
  guardian:{petal:'#a8e6df',leaf:'#78ad97',glow:'#efffee'}
};
function material(scene,id,hex){
  const m=new B.StandardMaterial('rebirth '+id,scene);
  const c=B.Color3.FromHexString(hex);
  m.diffuseColor=c;m.emissiveColor=c.scale(.23);
  m.specularColor=new B.Color3(.035,.04,.03);
  return m;
}
function model(scene,kind,name,color){
  const m=kind==='cylinder'
    ?B.MeshBuilder.CreateCylinder(name,{height:1,diameterTop:.72,diameterBottom:1,tessellation:8},scene)
    :B.MeshBuilder.CreateSphere(name,{diameter:1,segments:8},scene);
  m.material=color;m.position.set(0,-500,0);m.isPickable=false;
  return m;
}
export class NatureGrowth {
  constructor(scene,{onBloom=()=>{}}={}){
    this.scene=scene;this.onBloom=onBloom;
    this.materials=[];this.templates=[];this.byId=new Map();this.order=[];
    this.time=0;this.planted=0;this.upgrades=0;
    const mat=(id,color)=>{
      const m=material(scene,id,color);this.materials.push(m);return m;
    };
    const orb=(id,color)=>{
      const mesh=model(scene,'sphere',id,mat(id,color));
      this.templates.push(mesh);return mesh;
    };
    this.twig=model(scene,'cylinder','stem',mat('stem','#57886a'));
    this.templates.push(this.twig);
    this.bark=model(scene,'cylinder','trunk',mat('trunk','#766454'));
    this.templates.push(this.bark);
    this.leaves={};this.petals={};this.centers={};
    for(const [species,p] of Object.entries(COLORS)){
      this.leaves[species]=orb('leaf '+species,p.leaf);
      this.petals[species]=orb('petal '+species,p.petal);
      this.centers[species]=orb('center '+species,p.glow);
    }
    this.treeLeaf=orb('tree canopy','#6e9b78');
    this.treeLeaf2=orb('tree canopy shaded','#578571');
  }
  addPiece(entry,source,x,y,z,sx,sy,sz){
    const mesh=source.createInstance('rebirth '+entry.tier+' '+entry.id);
    mesh.parent=entry.root;mesh.position.set(x,y,z);
    mesh.scaling.set(sx,sy,sz);mesh.isPickable=false;
    entry.meshes.push(mesh);
  }
  construct(entry){
    const add=(m,x,y,z,sx,sy,sz)=>this.addPiece(entry,m,x,y,z,sx,sy,sz);
    const leaf=this.leaves[entry.species]||this.leaves.mossling;
    const petal=this.petals[entry.species]||this.petals.mossling;
    const center=this.centers[entry.species]||this.centers.mossling;
    if(entry.tier==='flower'){
      add(this.twig,0,.25,0,.08,.50,.08);
      add(leaf,-.16,.21,0,.34,.15,.20);
      add(leaf,.14,.33,.03,.27,.12,.22);
      for(let i=0;i<5;i++){
        const a=i*Math.PI*2/5;
        add(petal,Math.cos(a)*.20,.61,Math.sin(a)*.20,.29,.13,.25);
      }
      add(center,0,.64,0,.22,.20,.22);
    }else if(entry.tier==='bush'){
      for(const [x,z,size] of [[-.38,.17,.8],[.34,.17,.85],[-.08,-.29,.95],[.18,.42,.66]]){
        add(leaf,x,.35,z,size,.66,size);
      }
      for(const [x,y,z] of [[-.41,.70,.19],[.43,.68,-.05],[.02,.88,-.40],[.06,.75,.38]]){
        add(petal,x,y,z,.32,.27,.32);
        add(center,x,y+.13,z,.12,.14,.12);
      }
    }else{
      const big=entry.tier==='blossom';
      const height=big?1.25:.98;
      add(this.bark,0,height*.48,0,big?.34:.29,height,big?.34:.29);
      const canopy=big?petal:this.treeLeaf;
      const canopy2=big?leaf:this.treeLeaf2;
      add(canopy,0,height+.52,0,big?2.08:1.65,big?1.30:1.12,big?1.86:1.55);
      add(canopy2,-.56,height+.28,.15,big?1.17:.96,big?.98:.78,big?1.25:1.01);
      add(canopy,.53,height+.35,-.21,big?1.21:1.07,big?.96:.82,big?1.18:1.08);
      if(big){
        for(let i=0;i<5;i++){
          const a=i*Math.PI*2/5+entry.seed;
          add(center,Math.cos(a)*.78,height+.85+Math.sin(i)*.18,
            Math.sin(a)*.69,.22,.24,.22);
        }
      }else{
        add(petal,-.36,height+.72,-.55,.29,.21,.24);
        add(petal,.53,height+.63,.44,.27,.22,.26);
      }
    }
  }
  remove(entry){
    for(const m of entry.meshes)m.dispose();
    entry.meshes.length=0;
    entry.root.dispose();
    this.byId.delete(entry.id);
    const index=this.order.indexOf(entry);
    if(index>=0)this.order.splice(index,1);
  }
  siteFor(x,z,hero,tier,ignoreId=null){
    const minHero=tier==='blossom'?4.2:tier==='tree'?3.4:1.9;
    const dx=x-hero.x,dz=z-hero.z,d=Math.hypot(dx,dz);
    if(d<minHero){
      const angle=d>.1?Math.atan2(dz,dx):Math.atan2(z+1,x+1);
      x=hero.x+Math.cos(angle)*minHero;
      z=hero.z+Math.sin(angle)*minHero;
    }
    const r=Math.hypot(x,z),limit=WILD_RADIUS-3.5;
    if(r>limit){x*=limit/r;z*=limit/r;}
    // Keep new plants from stacking directly on each other.
    const distance=tier==='blossom'?2.3:tier==='tree'?1.85:1.05;
    for(let attempt=0;attempt<7;attempt++){
      if(this.order.every(p=>p.id===ignoreId||Math.hypot(p.targetX-x,p.targetZ-z)>distance))break;
      const a=attempt*2.39996+Math.atan2(z,x);
      const rad=1.1+attempt*.26;
      const nx=x+Math.cos(a)*rad,nz=z+Math.sin(a)*rad;
      if(Math.hypot(nx,nz)<limit){x=nx;z=nz;}
    }
    return {x,z};
  }
  enforceBudget(hero,upcomingTier){
    while(this.order.length>=NATURE_MAX_PLANTS){
      // Recycle old, small plants far from the camera first.
      const candidates=this.order.filter(p=>p.tier==='flower'||p.tier==='bush');
      const far=candidates.filter(p=>Math.hypot(p.targetX-hero.x,p.targetZ-hero.z)>19);
      this.remove((far.length?far:candidates)[0]||this.order[0]);
    }
    const trees=this.order.filter(p=>p.tier==='tree'||p.tier==='blossom');
    if((upcomingTier==='tree'||upcomingTier==='blossom')&&trees.length>=NATURE_MAX_TREES){
      // Tree density bound: oldest tree transitions out when the next grows.
      this.remove(trees[0]);
    }
  }
  apply(event,hero){
    if(!event)return;
    const existing=this.byId.get(event.id);
    if(event.kind==='grow')return;
    const isUpgrade=Boolean(existing);
    if(isUpgrade){
      // The incoming tier might turn a flower into a tree. Keep a strict
      // tree count without accidentally removing the plant being upgraded.
      if((event.tier==='tree'||event.tier==='blossom')&&
         existing.tier!=='tree'&&existing.tier!=='blossom'){
        const trees=this.order.filter(p=>p.tier==='tree'||p.tier==='blossom');
        if(trees.length>=NATURE_MAX_TREES)this.remove(trees[0]);
      }
      for(const m of existing.meshes)m.dispose();
      existing.meshes.length=0;
      existing.root.dispose();
    }else{
      this.enforceBudget(hero,event.tier);
    }
    const pos=this.siteFor(event.x,event.z,hero,event.tier,event.id);
    const entry=isUpgrade?existing:{
      id:event.id,seed:event.id*1.37,meshes:[],root:null,
      x:pos.x,z:pos.z,targetX:pos.x,targetZ:pos.z
    };
    entry.tier=event.tier;entry.species=event.species;
    entry.targetX=pos.x;entry.targetZ=pos.z;
    if(!isUpgrade){entry.x=pos.x;entry.z=pos.z;}
    entry.age=0;entry.duration=event.tier==='blossom'?1.18:event.tier==='tree'?.93:.63;
    entry.root=new B.TransformNode('grown '+entry.tier+' '+entry.id,this.scene);
    entry.root.position.set(entry.x,.02,entry.z);
    entry.root.scaling.setAll(.001);
    this.construct(entry);
    if(!isUpgrade){this.byId.set(entry.id,entry);this.order.push(entry);this.planted++;}
    else this.upgrades++;
    this.onBloom({...event,x:pos.x,z:pos.z},isUpgrade);
  }
  update(dt,hero){
    this.time+=dt;
    for(const p of this.order){
      p.age+=dt;
      const u=Math.min(1,p.age/p.duration);
      const t=u-1;
      const eased=1+2.55*t*t*t+1.55*t*t;
      const sway=1+Math.sin(this.time*1.3+p.seed)*.008;
      p.root.scaling.setAll(Math.max(.001,eased*sway));
      const k=Math.min(1,dt*3.6);
      p.x+=(p.targetX-p.x)*k;p.z+=(p.targetZ-p.z)*k;
      p.root.position.set(p.x,.01+(1-u)*-.20,p.z);
      p.root.rotation.y=Math.sin(this.time*.7+p.seed)*.024;
      // Near-trees remain tiny compared with the player; no collision.
    }
  }
  clear(){
    for(const p of [...this.order])this.remove(p);
    this.time=0;this.planted=0;this.upgrades=0;
  }
  dispose(){
    this.clear();
    for(const t of this.templates)t.dispose(false,false);
    for(const m of this.materials)m.dispose();
    this.templates=[];this.materials=[];
  }
  snapshot(){
    const tiers={flower:0,bush:0,tree:0,blossom:0};
    for(const p of this.order)tiers[p.tier]++;
    return {plants:this.order.length,planted:this.planted,upgrades:this.upgrades,tiers};
  }
}
