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
      burst:!!opts.burst,
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
      // The small spear now RELEASES icy energy through the target's volume.
      // A strongly angled, irregular fan reaches outside the glass rather
      // than merely trembling around the impact centre.
      const dir=fx.motionDir,L=Math.hypot(dir.x,dir.z)||1;
      const tx=dir.x/L,tz=dir.z/L,sx=-tz,sz=tx;
      for(let i=0;i<15;i++){
        const side=i%2?-1:1;
        const spread=(.31+(i%5)*.13);
        const back=i%7===0?-1:1;
        const along=-.24+(i%4)*.10;
        const lat=side*(.07+(i%3)*.05);
        const lift=(i%5-2)*.105;
        const origin=V(tx*along+sx*lat,lift,tz*along+sz*lat);
        const speed=back*(.58+(i%4)*.19);
        const velocity=V(tx*speed+sx*side*spread,
          (.10+(i%5)*.14)*(i%3===0?-1:1),
          tz*speed+sz*side*spread);
        const part=this.faceted(fx,"ice-3d-burst-shard:"+i,
          .145+(i%4)*.027,i%5===0?"light":i%4===0?"dark":"main",
          i,origin,velocity,{type:i%3===0?1:0,
            delay:(i%4)*.020,burst:true,
            spin:V(2.3+(i%3)*.5,1.9+i*.19,2.7+(i%4)*.28),
            intensity:.89});
        part.mesh.rotation.set(i*.19,Math.atan2(tx,tz),side*.38);
      }
      // Four flying needle-streaks open across several different depth
      // planes, with distinct lengths and directions.
      for(let j=0;j<4;j++){
        const side=j%2?1:-1,alt=j%3===0?-1:1;
        const origin=V(tx*.06+sx*side*.09,(j-1.5)*.09,
          tz*.06+sz*side*.09);
        const velocity=V(tx*alt*(.70+j*.07)+sx*side*(.38+j*.08),
          .25+(j%2)*.22,tz*alt*(.70+j*.07)+sz*side*(.38+j*.08));
        this.dart(fx,"ice-3d-burst-needle:"+j,.018+j*.004,
          .26+j*.058,j===0?"light":"main",18+j,origin,velocity,{
            delay:j*.025,burst:true,spin:V(.85,1.0,.55),
            intensity:.70});
      }
      for(let lane=0;lane<2;lane++){
        const side=lane?1:-1,offset=side*.12;
        const needle=this.hero.tube(fx,[
          V(-tx*.37+sx*offset,-.04+side*.10,-tz*.37+sz*offset),
          V(-tx*.06+sx*offset*.54,side*.06,-tz*.06+sz*offset*.54),
          V(tx*.50+sx*offset*.32,.06-side*.06,tz*.50+sz*offset*.32),
        ],lane===0?.015:.010,lane===0?"main":"light",24+lane);
        (fx.volumeStatic||= []).push(needle);
      }
    }else if(spellId==="sun-lance"){
      // A concentrated solar penetration is followed by a hot three-
      // dimensional fan: white-gold darts, tumbling embers, and short
      // high/low heat streaks. No geometric star wheel or closed corona.
      const dir=fx.motionDir,L=Math.hypot(dir.x,dir.z)||1;
      const tx=dir.x/L,tz=dir.z/L,sx=-tz,sz=tx;
      for(let i=0;i<15;i++){
        const side=i%2?-1:1,back=i%8===0?-.52:1;
        const lat=side*(.05+(i%4)*.05);
        const along=-.13+(i%5)*.075;
        const lift=(i%5-2)*.095;
        const origin=V(tx*along+sx*lat,lift,tz*along+sz*lat);
        const velocity=V(tx*back*(.55+(i%4)*.19)+
          sx*side*(.27+(i%5)*.095),
          (i%3-1)*.24+(i%4)*.07,
          tz*back*(.55+(i%4)*.19)+
          sz*side*(.27+(i%5)*.095));
        const dart=this.dart(fx,"sun-3d-eruption:"+i,
          .034+(i%3)*.006,.20+(i%4)*.065,
          i%5===0?"light":i%4===0?"dark":"main",i,
          origin,velocity,{delay:(i%4)*.017,burst:true,
            spin:V(.36,1.1,.54),intensity:.83});
        dart.mesh.rotation.set(.35,Math.atan2(tx,tz),side*.23);
      }
      for(let i=0;i<8;i++){
        const side=i%2?1:-1;
        const initial=V(tx*(i%4)*.08+sx*side*.1,
          (i%3-1)*.10,tz*(i%4)*.08+sz*side*.1);
        const velocity=V(tx*(.48+(i%4)*.16)+
            sx*side*(.39+(i%3)*.13),
          (i%4-1)*.23,
          tz*(.48+(i%4)*.16)+
            sz*side*(.39+(i%3)*.13));
        this.faceted(fx,"sun-3d-tumbling-ember:"+i,
          .092+(i%3)*.022,i%4===0?"light":"main",18+i,
          initial,velocity,{burst:true,delay:(i%4)*.029,
            spin:V(.8,.65,1.1),intensity:.68});
      }
      const shaft=this.hero.tube(fx,[
        V(-tx*.36,-.035,-tz*.36),
        V(-tx*.10,.01,-tz*.10),
        V(tx*.51,.025,tz*.51),
      ],.018,"light",28);
      fx.volumeStatic=[shaft];
    }
    // A brief living 3D flash expands within/just beyond the glass, then
    // hands off to real flying debris. It is not a flat radial ring.
    if(spellId==="crystal-bolt"||spellId==="sun-lance"){
      const shell=this.hero.ball(fx,
        spellId==="crystal-bolt"?.44:.52,"soft",31);
      const core=this.hero.ball(fx,
        spellId==="crystal-bolt"?.21:.25,"light",32);
      fx.volumeFlash=[{mesh:shell,core:false},{mesh:core,core:true}];
      fx.volumeBurst=true;
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
    const burst=!!fx.volumeBurst;
    const fade=burst
      ?smooth(t/.065)*(1-smooth((t-.54)/.46))
      :clamp(Math.min(1,t*13,(1-t)*1.82),0,.92);
    // Contact pressure peaks in the first 100ms, then transfers its energy
    // to the flying three-dimensional fragments before fading out.
    for(const entry of fx.volumeFlash||[]){
      const opening=smooth(t/.15);
      const cooling=1-smooth((t-.16)/.31);
      entry.mesh.scaling.setAll((entry.core?.72:.70)+
        (entry.core?1.18:1.55)*opening);
      entry.mesh.visibility=clamp(cooling*
        (entry.core?.92:.55),0,.92);
    }
    // The two penetrating filaments fade quickly after contact rather than
    // becoming lingering rings in front of the target.
    for(const filament of fx.volumeStatic||[]){
      filament.visibility=clamp((1-smooth((t-.06)/.46))*.62,0,.66);
    }
    for(const p of fx.volumeParts){
      const u=clamp((t-p.delay)/Math.max(.001,1-p.delay),0,1);
      const k=p.burst?smooth(u/.45):smooth(u);
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
      const rise=fx.ground?(.42*Math.sin(Math.PI*u)-.15*u*u)
        :(p.burst?.09*Math.sin(Math.PI*k):0);
      m.position.set(
        p.origin.x+p.velocity.x*k,
        p.origin.y+p.velocity.y*k+rise,
        p.origin.z+p.velocity.z*k);
      if(fx.ground)m.position.y=Math.max(-.075,m.position.y);
      m.rotation.x=p.rotation.x+p.spin.x*k;
      m.rotation.y=p.rotation.y+p.spin.y*k;
      m.rotation.z=p.rotation.z+p.spin.z*k;
      m.scaling.setAll(p.kind==="sheet"?.78+.18*(1-u)
        :p.burst?1.14-.53*smooth(u):.79-.38*u);
      m.visibility=fade*p.intensity*(p.slot==="light"?.90:1);
    }
  }
}
