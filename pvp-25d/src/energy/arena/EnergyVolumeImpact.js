// Hero impact depth pass. Pure Babylon mesh volume: real faceted polyhedra,
// suspended curved sheets, axial energy darts and ground-bound debris.
// Invoked in parallel with the existing small core and sharp optional Pixi FX.
// Build-ups, hit/damage rules, orb meshes and old arena are untouched.
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
const SPHERE=new Set(["crystal-bolt","sun-lance","rift-slash"]);
const SUPPORTED=new Set(["crystal-bolt","sun-lance","rift-slash","gravity-hammer"]);

export class EnergyVolumeImpact {
  constructor(hero){
    this.hero=hero;
    this.enabled=true;
    this.maxActive=9;
    this.stats={total:0,active:0};
  }
  setEnabled(on){this.enabled=!!on;}
  // All meshes are owned by hero.makeEffect, therefore automatically disposed
  // by hero.clear(), a replay, or a finished effect.
  makePart(fx,mesh,slot,kind,index,origin,velocity,opts={}){
    this.hero.bind(fx,mesh,slot,index);
    if(origin)mesh.position.copyFrom(origin);
    const p={mesh,slot,kind,index,
      origin:mesh.position.clone(),
      rotation:mesh.rotation.clone(),
      velocity:velocity||new BABYLON.Vector3(),
      delay:opts.delay||0,
      spin:opts.spin||new BABYLON.Vector3(.2,.5,.35),
      intensity:opts.intensity??1};
    fx.volumeParts.push(p);
    return p;
  }
  faceted(fx,name,diameter,slot,index,origin,velocity,opts={}){
    // These are actual solid polyhedra, not flat glowing sprites.
    const mesh=BABYLON.MeshBuilder.CreatePolyhedron(name,{
      type:opts.type??0,size:diameter,
    },this.hero.scene);
    return this.makePart(fx,mesh,slot,"debris",index,origin,velocity,opts);
  }
  dart(fx,name,radius,length,slot,index,origin,velocity,opts={}){
    const mesh=BABYLON.MeshBuilder.CreateCylinder(name,{
      diameterTop:0,diameterBottom:radius*2,
      height:length,tessellation:5,subdivisions:1,
    },this.hero.scene);
    return this.makePart(fx,mesh,slot,"dart",index,origin,velocity,opts);
  }
  arc(fx,name,radius,start,span,elevation,tilt,slot,index){
    // 3D filaments rotate in tilted planes; the target is physically between
    // front and back lobes, creating parallax under Babylon's arena camera.
    const path=[];
    for(let k=0;k<=19;k++){
      const a=start+span*k/19;
      path.push(new BABYLON.Vector3(
        Math.cos(a)*radius,
        elevation+Math.sin(a*1.4)*.18,
        Math.sin(a)*radius));
    }
    const mesh=BABYLON.MeshBuilder.CreateTube(name,{
      path,radius:.015,tessellation:6,cap:BABYLON.Mesh.CAP_ROUND,
    },this.hero.scene);
    mesh.rotation.set(tilt,.14*index,.29*(index%3-1));
    return this.makePart(fx,mesh,slot,"orbit",index,null,null,{
      spin:new BABYLON.Vector3(.33*(index%2?1:-1),.41,.19),
      intensity:.80,
    });
  }
  sheet(fx,name,index,side){
    // A non-billboard ribbon twists through X/Y/Z: angular fragments
    // with volume and depth instead of a screen-space slash emblem.
    const front=[],back=[];
    for(let k=0;k<=18;k++){
      const t=k/18-.5;
      const x=t*2.20;
      const y=side*(t*.9+Math.sin(t*8)*.085);
      const z=side*(Math.sin(t*4.3)*.42+.19*t);
      const width=(.10+Math.sin(Math.PI*(t+.5))*.17)*(side<0?1:.75);
      front.push(new BABYLON.Vector3(x,y-width*.5,z-.045));
      back.push(new BABYLON.Vector3(x,y+width*.5,z+.055));
    }
    const mesh=BABYLON.MeshBuilder.CreateRibbon(name,{
      pathArray:[front,back],closeArray:false,
      sideOrientation:BABYLON.Mesh.DOUBLESIDE,
      updatable:false,
    },this.hero.scene);
    mesh.rotation.set(.23*side,.34*side,.08);
    return this.makePart(fx,mesh,side<0?"dark":"soft","sheet",
      index,new BABYLON.Vector3(0,.02*side,.05*side),
      new BABYLON.Vector3(0,.10*side,.32*side),{
        spin:new BABYLON.Vector3(.06*side,.15*side,.12*side),
        intensity:.62,
      });
  }
  groundRing(fx,name,radius,index,slot="main"){
    const mesh=BABYLON.MeshBuilder.CreateTorus(name,{
      diameter:radius*2,thickness:.019,tessellation:48,
    },this.hero.scene);
    mesh.position.y=.015;
    return this.makePart(fx,mesh,slot,"ground",index,null,null,{
      intensity:index===0?.72:.48,
    });
  }
  spawn(spellId,position,options={}){
    if(!this.enabled||!SUPPORTED.has(spellId))return null;
    const active=this.hero.live.filter(x=>x.type==="volume-impact");
    if(active.length>=this.maxActive)return null;
    const ground=spellId==="gravity-hammer";
    const centre=ground?
      new BABYLON.Vector3(position.x,.115,position.z):position.clone();
    const duration={
      "crystal-bolt":560,"sun-lance":480,"rift-slash":430,
      "gravity-hammer":640,
    }[spellId];
    const fx=this.hero.makeEffect(spellId,"volume-impact",centre,duration,{
      targetId:options.targetId||null,volumeParts:[],ground,
      motionDir:options.direction||new BABYLON.Vector3(1,0,0),
    });
    const V=(x=0,y=0,z=0)=>new BABYLON.Vector3(x,y,z);
    if(spellId==="crystal-bolt"){
      // Crystalline fragments explode in a THREE-DIMENSIONAL spherical spread.
      // Cold shards pass behind and above the glass; some fall below its core.
      for(let i=0;i<12;i++){
        const a=(i+.28)*TAU/12;
        const y=Math.sin(a*2.8)*.37+.10;
        const spread=.66+(i%4)*.12;
        const origin=V(Math.cos(a)*.23,y*.38,Math.sin(a)*.23);
        const velocity=V(Math.cos(a)*spread,y+.18*(i%3-1),Math.sin(a)*spread);
        const p=this.faceted(fx,"ice-3d-shard:"+i,
          .16+(i%3)*.036,i%5===0?"light":i%4===0?"dark":"main",
          i,origin,velocity,{type:i%3===0?1:0,
          delay:(i%4)*.035,
          spin:V(2.1+(i%3),1.4+i*.32,2.7+(i%4)),
          intensity:.75});
        p.mesh.rotation.set(a*.4,a,.2*i);
      }
      this.arc(fx,"ice-3d-shell-near",.85,.20,Math.PI*1.20,-.10,
        .87,"main",2);
      this.arc(fx,"ice-3d-shell-far",1.05,Math.PI*1.1,Math.PI*.78,.02,
        -1.02,"dark",3);
    }else if(spellId==="sun-lance"){
      // The hit pierces through the sphere's depth along its arrival vector.
      // Warm jets fan into a subtle tilted, broken corona.
      const dir=fx.motionDir;
      const planar=Math.hypot(dir.x,dir.z)||1;
      const nx=dir.x/planar,nz=dir.z/planar;
      for(let i=0;i<9;i++){
        const angle=i*TAU/9+.16;
        const side=Math.sin(angle),lift=Math.cos(angle);
        const origin=V(nx*.28+(-nz)*side*.18,lift*.25,nz*.28+nx*side*.18);
        const velocity=V(nx*(.52+i%3*.10)+(-nz)*side*.42,
          lift*(.50+(i%3)*.12),
          nz*(.52+i%3*.10)+nx*side*.42);
        const p=this.dart(fx,"sun-3d-dart:"+i,
          .038+(i%3)*.008,.22+(i%4)*.06,
          i===0?"light":i%3===0?"dark":"main",i,origin,velocity,{
            delay:(i%3)*.026,
            spin:V(.28,1.25,1.6),
            intensity:.76,
          });
        p.mesh.rotation.set(Math.PI*.33,Math.atan2(nx,nz),angle);
      }
      this.arc(fx,"sun-3d-corona-front",.87,.38,Math.PI*1.20,.10,
        .78,"main",12);
      this.arc(fx,"sun-3d-corona-behind",.98,3.5,Math.PI*.62,-.07,
        -.88,"dark",13);
      for(let i=0;i<4;i++){
        const a=i*TAU/4+.24;
        this.faceted(fx,"sun-3d-mote:"+i,
          .095,"main",i+14,V(Math.cos(a)*.35,Math.sin(a)*.30,Math.sin(a)*.22),
          V(nx*.35+Math.cos(a)*.25,Math.sin(a)*.24,nz*.35+Math.sin(a)*.27),
          {spin:V(.9,.8,1.0),intensity:.61});
      }
    }else if(spellId==="rift-slash"){
      // The signature is two TWISTED SURFACES which briefly open through the
      // victim, then recoil. No round sprite ring can fake this perspective.
      this.sheet(fx,"rift-depth-sheet-1",0,-1);
      this.sheet(fx,"rift-depth-sheet-2",1,1);
      for(let i=0;i<7;i++){
        const a=(i+.15)*TAU/7;
        const p=this.faceted(fx,"rift-3d-chip:"+i,
          .10+(i%2)*.04,i%3===0?"dark":"main",i+2,
          V(Math.cos(a)*.27,Math.sin(a)*.17,(i%3-1)*.14),
          V(Math.cos(a)*.73,Math.sin(a)*.54,(i%2?-.55:.55)),{
            delay:(i%3)*.035,
            spin:V(1.8,.8+(i%3),2.1),intensity:.65,
          });
        p.mesh.rotation.y=a;
      }
      this.arc(fx,"rift-3d-far-edge",.87,-.72,Math.PI*1.04,.04,
        1.09,"dark",11);
    }else if(ground){
      // A LOW, VOLUMETRIC SLAM: debris shoots upward from a real contact
      // plane, describing parabolic arcs; an elliptical pressure shell spreads
      // across the arena instead of covering the target with a vertical disk.
      this.groundRing(fx,"gravity-3d-pressure-near",.76,0,"main");
      this.groundRing(fx,"gravity-3d-pressure-far",1.13,1,"dark");
      for(let i=0;i<12;i++){
        const a=(i+.11)*TAU/12;
        const r=.28+(i%3)*.065;
        const p=this.faceted(fx,"gravity-3d-fragment:"+i,
          .11+(i%4)*.020,i%5===0?"light":i%3===0?"dark":"main",
          i+2,V(Math.cos(a)*r,.035,Math.sin(a)*r),
          V(Math.cos(a)*(.57+(i%3)*.14),.45+(i%4)*.17,
            Math.sin(a)*(.57+(i%3)*.14)),{
            delay:i%3*.027,
            spin:V(1.3+(i%3),.9+(i%4)*.2,2.2),
            intensity:.73,
          });
        p.mesh.rotation.y=a;
      }
      for(let i=0;i<3;i++){
        const a=i*TAU/3;
        this.dart(fx,"gravity-3d-shock-jet:"+i,.026,.24,
          "main",i+15,V(Math.cos(a)*.23,.035,Math.sin(a)*.23),
          V(Math.cos(a)*.53,.36,Math.sin(a)*.53),{
            spin:V(.4,1.1,.8),intensity:.50,
          });
      }
    }
    this.stats.total++;
    this.stats.active++;
    return fx;
  }
  update(fx,t,now){
    const progress=smooth(t);
    const fade=clamp(Math.min(1,t*13,(1-t)*1.82),0,.92);
    for(const p of fx.volumeParts){
      const u=clamp((t-p.delay)/Math.max(.001,1-p.delay),0,1);
      const k=smooth(u);
      const m=p.mesh;
      if(p.kind==="ground"){
        m.scaling.setAll(.75+1.05*k);
        m.position.y=p.origin.y+.013*(1-k);
        m.visibility=fade*p.intensity;
        continue;
      }
      if(p.kind==="orbit"){
        m.rotation.x=p.rotation.x+p.spin.x*k;
        m.rotation.y=p.rotation.y+p.spin.y*k;
        m.rotation.z=p.rotation.z+p.spin.z*k;
        m.scaling.setAll(.80+.48*k);
        m.visibility=fade*p.intensity*.75;
        continue;
      }
      const rise=fx.ground?(.42*Math.sin(Math.PI*u)-.15*u*u):0;
      m.position.set(
        p.origin.x+p.velocity.x*k,
        p.origin.y+p.velocity.y*k+rise,
        p.origin.z+p.velocity.z*k);
      if(fx.ground)m.position.y=Math.max(-.075,m.position.y);
      m.rotation.x=p.rotation.x+p.spin.x*k;
      m.rotation.y=p.rotation.y+p.spin.y*k;
      m.rotation.z=p.rotation.z+p.spin.z*k;
      m.scaling.setAll(p.kind==="sheet"?.78+.18*(1-u):.79-.38*u);
      m.visibility=fade*p.intensity*(p.slot==="light"?.85:1);
    }
  }
}
