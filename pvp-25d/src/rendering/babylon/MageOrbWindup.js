// Bespoke Mage wind-ups for Orb Arena. Recreates the choreography of
// PixiProofRenderer's Frostbolt ice cage and Pyroblast inward ember furnace
// with Babylon meshes (no Pixi dependency). Presentation only.
const TAU=Math.PI*2;
const clamp01=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp01(n);return t*t*(3-2*t);};
const color=hex=>BABYLON.Color3.FromHexString(hex);

function glowMaterial(scene,name,hex,alpha,energy){
  const mat=new BABYLON.StandardMaterial(name,scene);
  const tint=color(hex);
  mat.diffuseColor=tint.scale(.12);
  mat.emissiveColor=tint.scale(energy);
  mat.specularColor=BABYLON.Color3.Black();
  mat.alpha=alpha;
  mat.disableLighting=true;
  mat.backFaceCulling=false;
  mat.needDepthPrePass=false;
  mat.disableDepthWrite=true;
  if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined){
    mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
  }
  return mat;
}

function orbMesh(scene,kind,name,opts,parent,material){
  const mesh=BABYLON.MeshBuilder[kind](name,opts,scene);
  mesh.parent=parent;
  mesh.material=material;
  mesh.isPickable=false;
  return mesh;
}

function arcPath(radius,start,end,vertical=0){
  const points=[];
  for(let i=0;i<=24;i++){
    const a=start+(end-start)*(i/24);
    points.push(new BABYLON.Vector3(
      Math.cos(a)*radius,
      Math.sin(a*2)*vertical,
      Math.sin(a)*radius,
    ));
  }
  return points;
}

export class MageOrbWindup{
  constructor(scene,visualRoot,actorId){
    this.scene=scene;
    this.materials=[];
    const name="mage-orb-windup:"+actorId;
    this.root=new BABYLON.TransformNode(name,scene);
    this.root.parent=visualRoot;
    this.root.position.y=.72;
    this.frostRoot=new BABYLON.TransformNode(name+":frost",scene);
    this.frostRoot.parent=this.root;
    this.fireRoot=new BABYLON.TransformNode(name+":fire",scene);
    this.fireRoot.parent=this.root;
    const mat=(tag,hex,alpha,energy)=>{
      const m=glowMaterial(scene,name+":"+tag,hex,alpha,energy);
      this.materials.push(m);
      return m;
    };

    const ice=mat("ice-crystal","#8beaff",.92,1.45);
    const iceWhite=mat("ice-heart","#e8fbff",.92,2.00);
    const iceStroke=mat("ice-lattice","#59cfff",.68,1.40);
    const iceAura=mat("ice-aura","#52bbff",.13,.92);
    const icePulse=mat("ice-pulse","#b6f3ff",.27,1.32);

    this.iceCrystals=[];
    this.iceSpokes=[];
    for(let i=0;i<6;i++){
      const a=i*TAU/6;
      const gem=orbMesh(scene,"CreatePolyhedron",name+":ice-gem:"+i,
        {type:1,size:.072},this.frostRoot,i%2?iceWhite:ice);
      gem.rotation.y=a;
      this.iceCrystals.push(gem);

      // Six short spokes read as a structured frost cage, not a generic orbit.
      const spoke=orbMesh(scene,"CreateTube",name+":ice-spoke:"+i,
        {path:[
          new BABYLON.Vector3(Math.cos(a)*.30,.02,Math.sin(a)*.30),
          new BABYLON.Vector3(Math.cos(a)*.59,.02,Math.sin(a)*.59),
        ],radius:.010,tessellation:5},
        this.frostRoot,iceStroke);
      this.iceSpokes.push(spoke);
    }

    this.iceArcs=[];
    for(let i=0;i<2;i++){
      const sign=i===0?1:-1;
      const arc=orbMesh(scene,"CreateTube",name+":ice-half-arc:"+i,
        {path:arcPath(.68,sign===1?-.94:2.22,sign===1?.94:4.06,.09),
         radius:.015,tessellation:6},
        this.frostRoot,i===0?iceWhite:iceStroke);
      this.iceArcs.push(arc);
    }
    this.iceAura=orbMesh(scene,"CreateSphere",name+":ice-aura-ball",
      {diameter:.69,segments:20},this.frostRoot,iceAura);
    this.icePulse=orbMesh(scene,"CreateSphere",name+":ice-pressure",
      {diameter:.24,segments:20},this.frostRoot,icePulse);
    this.iceHeart=orbMesh(scene,"CreateSphere",name+":ice-hot-core",
      {diameter:.15,segments:20},this.frostRoot,iceWhite);

    const emberRed=mat("ember-red","#ed3c2c",.80,1.17);
    const emberOrange=mat("ember-orange","#ff8537",.96,1.60);
    const emberGold=mat("ember-gold","#ffd374",.95,1.95);
    const fireRing=mat("furnace-ring","#ff7436",.78,1.30);
    const fireDark=mat("furnace-aura","#ff4829",.18,.95);
    const furnaceWhite=mat("furnace-core","#fff2b4",.96,2.15);
    const tongueMat=mat("furnace-tongues","#ffae54",.74,1.42);

    this.fireEmbers=[];
    for(let i=0;i<10;i++){
      const ember=orbMesh(scene,"CreateSphere",name+":ember:"+i,
        {diameter:.037+(i%3)*.011,segments:10},
        this.fireRoot,i%4===0?emberGold:i%2===0?emberOrange:emberRed);
      this.fireEmbers.push(ember);
    }

    this.fireRings=[];
    for(let i=0;i<2;i++){
      const ring=orbMesh(scene,"CreateTorus",name+":furnace-band:"+i,
        {diameter:i===0?1.28:.87,thickness:i===0?.019:.013,tessellation:48},
        this.fireRoot,i===0?fireRing:emberGold);
      ring.rotation.x=.15+i*.48;
      this.fireRings.push(ring);
    }

    this.fireTongues=[];
    for(let i=0;i<3;i++){
      const a=i*TAU/3;
      const path=[];
      for(let step=0;step<=10;step++){
        const p=step/10;
        path.push(new BABYLON.Vector3(
          Math.cos(a+p*.38)*(.33-.13*p),
          -.12+p*.45,
          Math.sin(a+p*.38)*(.33-.13*p),
        ));
      }
      const tongue=orbMesh(scene,"CreateTube",name+":furnace-tongue:"+i,
        {path,radiusFunction:(n)=>.019*Math.pow(1-n/10,.7)+.002,
         tessellation:6},this.fireRoot,tongueMat);
      this.fireTongues.push(tongue);
    }
    this.fireAura=orbMesh(scene,"CreateSphere",name+":furnace-aura-ball",
      {diameter:.76,segments:20},this.fireRoot,fireDark);
    this.fireHeart=orbMesh(scene,"CreateSphere",name+":furnace-heart",
      {diameter:.29,segments:24},this.fireRoot,emberOrange);
    this.fireWhite=orbMesh(scene,"CreateSphere",name+":furnace-white-hot",
      {diameter:.15,segments:24},this.fireRoot,furnaceWhite);

    this.iceMaterials={ice,iceWhite,iceStroke,iceAura,icePulse};
    this.fireMaterials={emberRed,emberOrange,emberGold,fireRing,fireDark,furnaceWhite,tongueMat};
    this.frostRoot.setEnabled(false);
    this.fireRoot.setEnabled(false);
  }

  update(spellId,progress,timeMs){
    const frost=spellId==="mage-frostbolt";
    const fire=spellId==="mage-pyroblast";
    this.frostRoot.setEnabled(frost);
    this.fireRoot.setEnabled(fire);
    if(!frost&&!fire)return;

    const p=clamp01(progress);
    const charge=smooth(p);
    const t=timeMs*.001;
    if(frost){
      const finalP=smooth((p-.82)/.18);
      const pulse=.5+.5*Math.sin(t*18);
      // Pixi's six ice diamonds converge as the lattice contracts. Most of
      // this remains within the outer glass rim, with only short accents beyond.
      const r=.88-charge*.24;
      for(let i=0;i<this.iceCrystals.length;i++){
        const a=i*TAU/6+.12+Math.sin(t*.6+i)*.025;
        const gem=this.iceCrystals[i];
        gem.position.set(Math.cos(a)*r,Math.sin(t*1.4+i)*.055,Math.sin(a)*r);
        gem.rotation.y=a+t*(i%2?.38:-.32);
        gem.rotation.z=t*.43+i*.7;
        gem.scaling.setAll(.75+charge*.27+finalP*.16);
        this.iceSpokes[i].scaling.setAll(1-charge*.10);
      }
      this.iceArcs.forEach((arc,i)=>{
        arc.rotation.y=(i?-.26:.26)*p;
        arc.scaling.setAll(.99-charge*.07);
      });
      this.iceAura.scaling.setAll(.89+charge*.13);
      this.icePulse.scaling.setAll(.85+charge*.90-finalP*.22+pulse*.06);
      this.iceHeart.scaling.setAll(.84+charge*.40+finalP*.70);
      this.iceMaterials.iceStroke.alpha=.40+charge*.27+finalP*.18;
      this.iceMaterials.iceAura.alpha=.075+charge*.085+finalP*.06;
      this.iceMaterials.icePulse.alpha=.17+charge*.18+finalP*.16;
      this.iceMaterials.iceWhite.emissiveColor=color("#e8fbff").scale(1.5+charge*.70+finalP*1.2);
    }else{
      const finalP=smooth((p-.80)/.20);
      const pulse=.5+.5*Math.sin(t*13);
      // Pixi Pyroblast furnace: irregular ember spirals collapse inward,
      // tongues rise, red/orange bands intensify, then a white-hot core forms.
      for(let i=0;i<this.fireEmbers.length;i++){
        const a=i*TAU/10+t*(i%2?1.65:-1.30)+i*.17;
        const startR=1.00+(i%3)*.065;
        const r=startR*(1-charge*.53);
        const mote=this.fireEmbers[i];
        mote.position.set(
          Math.cos(a)*r,
          -.09+Math.sin(t*2.6+i)*.13+charge*(.04+(i%3)*.025),
          Math.sin(a)*r,
        );
        mote.scaling.setAll(.75+charge*.42+finalP*.18);
      }
      this.fireRings.forEach((ring,i)=>{
        ring.rotation.y=t*(i?-.65:.80);
        ring.rotation.x=(i?.44:.16)+Math.sin(t*2.3+i)*.08;
        ring.scaling.setAll(.86+charge*(i?.14:.25)+pulse*.035);
      });
      this.fireTongues.forEach((tongue,i)=>{
        tongue.rotation.y=t*(.40+(i%2)*.12);
        tongue.scaling.set(
          .85+charge*.36,
          .80+charge*.43+Math.sin(t*8.5+i*1.8)*.12,
          .85+charge*.36,
        );
      });
      this.fireAura.scaling.setAll(.90+charge*.19+pulse*.06);
      this.fireHeart.scaling.setAll(.92+charge*.56+finalP*.35);
      this.fireWhite.scaling.setAll(.55+charge*.60+finalP*1.35);
      this.fireMaterials.fireRing.alpha=.43+charge*.33+finalP*.16;
      this.fireMaterials.fireDark.alpha=.10+charge*.13+finalP*.09;
      this.fireMaterials.furnaceWhite.alpha=.34+charge*.22+finalP*.42;
      this.fireMaterials.furnaceWhite.emissiveColor=color("#fff2b4").scale(1.4+charge*.60+finalP*1.5);
    }
  }

  dispose(){
    this.root.dispose(false,true);
    for(const m of this.materials)m.dispose();
    this.materials.length=0;
  }
}
