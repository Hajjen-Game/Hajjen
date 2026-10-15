// Eclipse VFX 1.0 — bespoke, independent crystal-school animation layer.
// NEVER handles Crystal Bolt or Sun Lance. Their accepted Hero/Pixi geometry,
// layered trails, release/impact clocks and files are intentionally untouched.
// Runs from the same production EnergyMatch events in arena and VFX Lab.
const S=.02,TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const SCHOOL=new Set(["crystal-snare","fracture-spear","froststorm","crystal-mirror","avalanche"]);
const EVOLUTIONS=new Set([
  "deep-freeze","conduit-link","crystal-conduit","shatterfield",
  "crystal-rupture","riftbreaker","focused-fracture",
  "froststorm-start","froststorm-tick","barrage-warning","glacial-barrage",
  "shattering-storm","avalanche-wave","avalanche-track"
]);
const IDENTITY=new Set(["mirror-armed","mirror-shatter","mirror-shards","avalanche-launch"]);
const colors={ice:"#73d7fc",white:"#effcff",core:"#b7f3ff",
  dark:"#316ea9",shade:"#5265ae",glass:"#8cdcf5"};
export class EnergyEclipseVFX {
  constructor(scene){
    this.scene=scene;
    this.materials=new Map();
    this.live=[];
    this.seq=0;
    this.maxEffects=115;
    this.mirrorOrigins=new Map();
    this.stats={spells:{},active:0};
  }
  material(name,alpha=.9){
    const key=name+":"+alpha;
    if(this.materials.has(key))return this.materials.get(key);
    const mat=new BABYLON.StandardMaterial("eclipse-vfx:"+key,this.scene);
    const c=BABYLON.Color3.FromHexString(colors[name]||name);
    mat.diffuseColor=c.scale(.11);
    mat.emissiveColor=c.scale(name==="white"?1.60:name==="core"?1.35:.98);
    mat.specularColor=BABYLON.Color3.Black();
    mat.alpha=alpha;mat.disableLighting=true;mat.backFaceCulling=false;
    mat.disableDepthWrite=alpha<1;mat.needDepthPrePass=false;
    if(alpha<1&&BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
      mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    this.materials.set(key,mat);
    return mat;
  }
  pos(x,y,z=.92){return new BABYLON.Vector3(x*S,z,y*S);}
  position(actor,height=.92){return this.pos(actor.x,actor.y,height);}
  effect(kind,point,life=480,props={}){
    const root=new BABYLON.TransformNode("eclipse:"+kind+":"+(this.seq++),this.scene);
    root.position.copyFrom(point);
    const fx={kind,root,life,start:performance.now(),meshes:[],...props};
    this.live.push(fx);
    while(this.live.length>this.maxEffects)this.destroy(this.live.shift());
    this.stats.active=this.live.length;
    return fx;
  }
  bind(fx,mesh,kind="ice",alpha=.9){
    mesh.material=this.material(kind,alpha);
    mesh.parent=fx.root;
    mesh.isPickable=false;
    fx.meshes.push({mesh,base:mesh.position.clone(),kind});
    return mesh;
  }
  gem(fx,r=.19,h=.7,name="ice",x=0,y=0,z=0,alpha=.93){
    const mesh=BABYLON.MeshBuilder.CreatePolyhedron("eclipse-facet:"+this.seq++,{
      type:1,size:r,flat:false
    },this.scene);
    // Octahedral prism: tapered at both ends. Bigger faceted surfaces than
    // the tiny Crystal Bolt gem, yet the same clean diamond-based grammar.
    this.bind(fx,mesh,name,alpha);
    mesh.scaling.set(1,Math.max(1,h/(r*2)),1);
    mesh.position.set(x,y,z);
    return mesh;
  }
  ring(fx,r=.6,name="ice",y=0,thick=.018,alpha=.68){
    const mesh=BABYLON.MeshBuilder.CreateTorus("eclipse-ring:"+this.seq++,{
      diameter:r*2,thickness:thick,tessellation:48
    },this.scene);
    this.bind(fx,mesh,name,alpha);
    mesh.position.y=y;
    return mesh;
  }
  line(fx,points,name="ice",width=.018,alpha=.75){
    const mesh=BABYLON.MeshBuilder.CreateTube("eclipse-filament:"+this.seq++,{
      path:points,radius:width,tessellation:5,cap:BABYLON.Mesh.CAP_ALL
    },this.scene);
    return this.bind(fx,mesh,name,alpha);
  }
  bloom(point,heavy=false,direction=0,kind="burst"){
    const fx=this.effect(kind,point,heavy?620:430,{direction});
    const n=heavy?11:7;
    for(let i=0;i<n;i++){
      const a=i*TAU/n+.14,rr=.18+(i%3)*.09;
      const gem=this.gem(fx,heavy?.14:.085,heavy?.75:.43,
        i%4===0?"white":i%3===0?"dark":"ice",
        Math.cos(a)*rr,(i%3-1)*.19,Math.sin(a)*rr);
      gem.rotation.z=.36+Math.sin(a)*.42;
      gem.rotation.x=.3+Math.cos(a)*.38;
      if(i%3===0)this.line(fx,[
        new BABYLON.Vector3(Math.cos(a)*.08,.06,Math.sin(a)*.08),
        new BABYLON.Vector3(Math.cos(a)*(.59+(i%3)*.12),.18,
          Math.sin(a)*(.59+(i%3)*.12))
      ],"core",.012,.57);
    }
    if(heavy)this.ring(fx,.83,"ice",-.68,.026,.42);
    this.gem(fx,heavy?.21:.14,heavy?.41:.29,"white",0,.03,0,.88);
    return fx;
  }
  charge(spell,actor,target,ms){
    const duration=Math.max(300,Math.min(2600,(ms||0)*1000||470));
    const fx=this.effect("charge-"+spell,this.position(actor),
      duration,{actorId:actor.id,targetId:target?.id||null});
    const options={
      "crystal-snare":[6,.31],
      "fracture-spear":[9,.34],
      froststorm:[8,.31],
      "crystal-mirror":[6,.30],
      avalanche:[10,.35]
    };
    const [n,range]=options[spell];
    for(let i=0;i<n;i++){
      const a=TAU*i/n;
      const item=this.gem(fx,spell==="fracture-spear"?.068:.047,
        spell==="fracture-spear"?.40:.26,
        i%4===0?"white":i%2?"ice":"shade",
        Math.cos(a)*range,(i%3-1)*.10,Math.sin(a)*range);
      item.rotation.x=a*.37;
      item.rotation.z=.35+i*.18;
    }
    for(let i=0;i<3;i++){
      const halo=this.ring(fx,.29+i*.15,
        i===1?"core":"ice",.025+i*.036,.012+(i===1?.004:0),.56);
      halo.rotation.x=.36+i*.52;
      halo.rotation.z=i*.56;
    }
    // The focal detail is INSIDE the glass, not a huge white disc outside it.
    const focus=this.gem(fx,.09,spell==="fracture-spear"?.62:.34,
      "white",0,0,0,.86);
    focus.rotation.z=spell==="fracture-spear"?Math.PI*.5:0;
    return fx;
  }
  snare(actor,target,match){
    if(!target)return;
    const group=[...match.actors].filter(q=>q.alive&&q.team!==actor.team&&
      (q.statuses||[]).some(s=>s.spellId==="crystal-snare"&&
        (s.kind==="root"||s.kind==="incapacitate")&&
        s.sourceId===actor.id&&s.remaining>0));
    const shown=group.length?group.slice(0,12):[target];
    shown.forEach((foe,i)=>{
      const status=(foe.statuses||[]).find(s=>s.spellId==="crystal-snare"&&
        (s.kind==="root"||s.kind==="incapacitate")&&s.remaining>0);
      const hard=status?.kind==="incapacitate";
      const fx=this.effect("snare-cage",this.position(foe),
        Math.max(550,(status?.remaining||1)*1000),{
          targetId:foe.id,cc:true,hard,ownerId:actor.id
        });
      for(let j=0;j<6;j++){
        const a=j*TAU/6;
        const radius=hard?.70:.81;
        const shard=this.gem(fx,hard?.17:.11,hard?1.68:1.12,
          j%3===0?"white":j%2?"dark":"ice",
          Math.cos(a)*radius,-.22,Math.sin(a)*radius,.73);
        shard.rotation.z=.08*Math.sin(a);shard.rotation.x=.11*Math.cos(a);
      }
      for(let k=0;k<2;k++){
        const halo=this.ring(fx,hard?.88:1.08,k===0?"core":"ice",
          k===0?-.73:.49,.018,.56);
        halo.rotation.x=.02+k*.08;
      }
      // Frozen six-point spokes converge on the rooted orb, visibly not
      // the wide ground AoE the other schools use.
      for(let j=0;j<3;j++){
        const a=j*TAU/3;
        this.line(fx,[new BABYLON.Vector3(Math.cos(a)*.60,-.7,Math.sin(a)*.60),
          new BABYLON.Vector3(Math.cos(a)*.21,.35,Math.sin(a)*.21)],
          j===0?"white":"ice",.011,.54);
      }
      if(hard)this.gem(fx,.45,1.38,"glass",0,-.08,0,.22);
    });
  }
  spear(actor,target){
    if(!target)return;
    const origin=this.position(actor),destination=this.position(target);
    const d=destination.subtract(origin),angle=Math.atan2(d.x,d.z);
    const length=Math.hypot(d.x,d.z);
    const fx=this.effect("spear-flight",origin,clamp(250+length*35,310,530),{
      sourceId:actor.id,targetId:target.id,origin:origin.clone(),
      destination:destination.clone(),impactDone:false,angle
    });
    // A slim long quartz tip, suspended shards and two opposing strands,
    // all with geometry matching Crystal Bolt's intricacy but NOT its art.
    for(const [i,r,h,c] of [[0,.22,1.80,"ice"],[1,.125,1.55,"core"],[2,.071,1.23,"white"]]){
      const facet=this.gem(fx,r,h,c,0,0,0);
      facet.rotation.x=Math.PI/2;
    }
    for(let i=0;i<6;i++){
      const a=i*TAU/6;
      const shard=this.gem(fx,.052,.38,i%3===0?"white":"ice",
        Math.cos(a)*.28,(i%3-1)*.12,Math.sin(a)*.28,.74);
      shard.rotation.x=.72;
    }
    for(let k=0;k<2;k++){
      const r=this.ring(fx,.30+k*.11,k===0?"core":"ice",0,.012,.55);
      r.rotation.x=k*.56+.4;
    }
    return fx;
  }
  froststorm(event,match){
    const actor=match.getActor(event.actorId);
    const p=this.pos(event.x,event.y,.04);
    const field=actor&&match.froststormFields?.find(f=>
      f.owner===actor.id&&Math.hypot(f.x-event.x,f.y-event.y)<6&&f.until>match.time);
    const duration=Math.round((field?.until-match.time||4.0)*1000);
    const radius=(field?.radius||154)*S;
    const fx=this.effect("frost-field",p,Math.max(1100,duration),{
      ownerId:event.actorId,atX:event.x,atY:event.y,
      radius,field:true
    });
    // Low ground geometry + raised spiral makes a real localized cold
    // phenomenon, not an opaque cyan circle obscuring enemy positions.
    for(let i=0;i<3;i++){
      const band=this.ring(fx,radius*(.59+i*.19),
        i===0?"white":i===1?"ice":"shade",.07+i*.03,.015+i*.003,
        i===2?.36:.63);
      band.rotation.z=i*.3;
    }
    const count=12;
    for(let i=0;i<count;i++){
      const a=i*TAU/count,dist=radius*(.37+(i%4)*.16);
      const shard=this.gem(fx,.053+(i%3)*.018,.37+(i%3)*.22,
        i%4===0?"white":i%2?"shade":"ice",
        Math.cos(a)*dist,.13+(i%3)*.18,Math.sin(a)*dist,.68);
      shard.rotation.x=.20+i*.24;shard.rotation.z=.15+i*.08;
    }
    return fx;
  }
  mirror(actor,target,match){
    if(!target)return;
    const status=(target.statuses||[]).find(s=>s.kind==="crystal-mirror"&&
      s.sourceId===actor.id&&s.remaining>0);
    const fx=this.effect("mirror-shield",this.position(target),Math.max(800,
      (status?.remaining||5)*1000),{targetId:target.id,ownerId:actor.id,shield:true});
    for(let i=0;i<5;i++){
      const a=i*TAU/5;
      const panel=this.gem(fx,.255,1.58,
        i===0?"white":i%2?"ice":"glass",
        Math.cos(a)*.97,.08,Math.sin(a)*.97,i===0?.60:.37);
      panel.rotation.z=.13*Math.sin(a);panel.rotation.x=.12*Math.cos(a);
    }
    for(let i=0;i<2;i++){
      const halo=this.ring(fx,.85+i*.21,i===0?"white":"ice",
        i===0?-.55:.77,.018,.47);
      halo.rotation.x=i*.14;
    }
  }
  avalanche(point,kind="wave",actor){
    const p=this.pos(point.x,point.y,.12);
    const fx=this.effect("avalanche-"+kind,p,kind==="track"?750:520,{
      ownerId:actor?.id
    });
    // Multiple concentric jagged teeth rise as the travelling pressure
    // front passes; thin interrupted frost traces provide a real wake.
    const n=kind==="track"?5:9;
    for(let i=0;i<n;i++){
      const a=i*TAU/n+.3,dist=.36+(i%3)*.31;
      const g=this.gem(fx,.075+(i%3)*.035,.48+(i%4)*.30,
        i%4===0?"white":i%2?"shade":"ice",
        Math.cos(a)*dist,-.25,Math.sin(a)*dist,.75);
      g.rotation.z=.12+(i%2)*.28;
    }
    for(let i=0;i<2;i++){
      const arc=this.ring(fx,kind==="track"?1.02+i*.19:1.16+i*.36,
        i===0?"core":"shade",-.78,.024,.47);
      arc.rotation.x=.05;
    }
  }
  proc(event,match){
    const actor=match.getActor(event.actorId);
    const target=match.getActor(event.targetId);
    const x=Number.isFinite(event.x)?event.x:target?.x??actor?.x;
    const y=Number.isFinite(event.y)?event.y:target?.y??actor?.y;
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const point=this.pos(x,y,event.kind==="avalanche-wave"?.35:.88);
    const kind=event.kind;
    if(kind==="froststorm-start"){this.froststorm(event,match);return;}
    if(kind==="froststorm-tick"){this.bloom(this.pos(x,y,.23),false,0,"frost-tick");return;}
    if(kind==="avalanche-wave"||kind==="avalanche-track"){
      this.avalanche({x,y},kind==="avalanche-wave"?"wave":"track",actor);return;
    }
    if(kind==="deep-freeze"){this.bloom(point,true,0,"ice-tomb-slam");return;}
    if(kind==="conduit-link"||kind==="crystal-conduit"){
      this.bloom(point,false,0,"conduit");
      const mark=target?.statuses?.find(s=>s.kind==="crystal-conduit"&&
        s.sourceId===actor?.id&&s.remaining>0);
      if(!mark)return;
      const peers=match.actors.filter(q=>q!==target&&q.alive&&
        q.team===target.team&&q.statuses?.some(s=>
          s.kind==="crystal-conduit"&&s.groupId===mark.groupId&&
          s.remaining>0)).sort((a,b)=>a.id.localeCompare(b.id));
      // One sustained crystal beam from the first linked victim to each
      // other victim. Never draw a misleading tether from the caster.
      const first=[target,...peers].sort((a,b)=>a.id.localeCompare(b.id))[0];
      if(first?.id===target.id)return;
      if(peers.length&&first){
        const start=this.position(first),end=this.position(target);
        const displacement=end.subtract(start);
        const fx=this.effect("conduit-active",start,
          Math.max(480,mark.remaining*1000),{
            targetId:target.id,peerId:first.id,ownerId:actor.id,
            groupId:mark.groupId,conduit:true
          });
        for(let i=0;i<3;i++){
          const lane=(i-1)*.085;
          const points=[];
          for(let j=0;j<=11;j++){
            const t=j/11;
            points.push(new BABYLON.Vector3(
              displacement.x*t+lane*Math.sin(t*Math.PI*2+i),
              displacement.y*t+.11*Math.sin(t*Math.PI*3+i),
              displacement.z*t+lane*Math.cos(t*Math.PI*2+i)
            ));
          }
          this.line(fx,points,i===0?"white":i===1?"ice":"shade",
            i===0?.018:.012,i===0?.75:.43);
        }
      }
      return;
    }
    if(kind==="barrage-warning"){
      const fx=this.effect("barrage-warning",this.pos(x,y,.09),820);
      this.ring(fx,.62,"white",0,.026,.80);return;
    }
    if(kind==="glacial-barrage"||kind==="riftbreaker"){
      const fx=this.effect("sky-spear",this.pos(x,y,3.7),480,{
        destination:this.pos(x,y,.85),impactDone:false
      });
      this.gem(fx,.26,1.45,"ice",0,0,0,.90);
      this.gem(fx,.11,1.15,"white",0,0,0);
      return;
    }
    if(kind==="shattering-storm"||kind==="fracture-chain"||
      kind==="crystal-rupture"||kind==="shatterfield"){
      this.bloom(point,true,0,kind);return;
    }
    if(kind==="avalanche-launch"){
      if(actor)this.charge("avalanche",actor,null,.43);
      return;
    }
    if(kind==="mirror-armed"){if(actor)this.mirror(actor,target||actor,match);return;}
    if(kind==="mirror-shatter"){
      if(actor)this.mirrorOrigins.set(actor.id,{point:point.clone(),
        until:performance.now()+750});
      this.bloom(point,true,0,"mirror-shatter");return;
    }
    if(kind==="mirror-shards"){
      const remembered=actor&&this.mirrorOrigins.get(actor.id);
      const from=remembered?.until>performance.now()?
        remembered.point:this.position(actor||target);
      if(from&&target)this.linkPoint(from,target,"white",true);
      return;
    }
    this.bloom(point,false,0,kind);
  }
  link(actor,target,tone="ice",reflected=false){
    this.linkPoint(this.position(actor),target,tone,reflected);
  }
  linkPoint(start,target,tone="ice",reflected=false){
    const end=this.position(target);
    const fx=this.effect(reflected?"reflect-flight":"conduit-flight",start,410,{
      origin:start.clone(),destination:end.clone()
    });
    for(let i=0;i<5;i++){
      const a=i*TAU/5;
      const gem=this.gem(fx,.065,.35,i%2?"ice":tone,
        Math.cos(a)*.14,(i%3-1)*.12,Math.sin(a)*.14);
      gem.rotation.x=.56;
    }
  }
  spawn(event,match){
    const id=event.spellId;
    // This explicit guard protects Crystal Bolt and all other classes,
    // even when events contain similar-looking generic evolution kinds.
    if(!SCHOOL.has(id))return false;
    const actor=match.getActor(event.actorId);
    const target=match.getActor(event.targetId);
    if(event.type==="windup"){
      if(actor)this.charge(id,actor,target,event.castSeconds||0);
      return true;
    }
    if(event.type==="ground-telegraph"&&id==="froststorm"){
      const fx=this.effect("frost-telegraph",this.pos(event.x,event.y,.08),
        Math.max(600,(event.duration||1)*1000),{actorId:event.actorId});
      const rr=(event.radius||140)*S;
      for(let i=0;i<3;i++)this.ring(fx,rr*(.68+i*.16),
        i===0?"white":i===1?"ice":"shade",0,.02,.53);
      return true;
    }
    if(event.type==="hit"){
      if(id==="fracture-spear"&&actor&&target)this.spear(actor,target);
      if(id==="froststorm"&&target)
        this.bloom(this.position(target),false,0,"frost-contact");
      // Crystal Snare and Crystal Mirror are visualized from their status
      // changes, not as a fake generic damage orb.
      return true;
    }
    if(event.type==="ability"){
      if(id==="crystal-snare"&&actor)this.snare(actor,target,match);
      return true;
    }
    if(event.type==="control"&&id==="crystal-snare")return true;
    if(event.type==="hit"&&id==="crystal-mirror")return true;
    if(event.type==="identity-proc"&&IDENTITY.has(event.kind)){
      this.proc(event,match);return true;
    }
    if(event.type==="evolution-proc"&&EVOLUTIONS.has(event.kind)){
      this.proc(event,match);return true;
    }
    if(event.type==="immune"&&id==="crystal-snare"&&target){
      this.bloom(this.position(target),false,0,"boss-chilled");return true;
    }
    // All other Eclipse feedback still passes through the standard system,
    // including unrelated combat text and camera-independent indicators.
    return false;
  }
  update(match,now=performance.now()){
    for(let i=this.live.length-1;i>=0;i--){
      const fx=this.live[i];
      let t=clamp((now-fx.start)/fx.life,0,1);
      const actor=fx.actorId?match.getActor(fx.actorId):null;
      const target=fx.targetId?match.getActor(fx.targetId):null;
      if(fx.cc){
        const alive=target?.alive&&(target.statuses||[]).some(s=>
          s.spellId==="crystal-snare"&&(s.kind==="root"||
          s.kind==="incapacitate")&&s.remaining>0);
        if(!alive)t=1;
      }
      if(fx.shield){
        const active=target?.alive&&(target.statuses||[]).some(s=>
          s.kind==="crystal-mirror"&&s.sourceId===fx.ownerId&&s.remaining>0);
        if(!active)t=1;
      }
      if(fx.kind==="frost-telegraph"&&
        (!actor?.alive||actor.cast?.spellId!=="froststorm"))t=1;
      if(fx.conduit){
        const peer=match.getActor(fx.peerId);
        const connected=target?.alive&&peer?.alive&&
          target.statuses?.some(s=>s.kind==="crystal-conduit"&&
            s.groupId===fx.groupId&&s.remaining>0)&&
          peer.statuses?.some(s=>s.kind==="crystal-conduit"&&
            s.groupId===fx.groupId&&s.remaining>0);
        if(!connected)t=1;
        else fx.root.position.copyFrom(this.position(peer));
      }
      if(fx.field&&!match.froststormFields?.some(f=>
          f.until>match.time&&f.owner===fx.ownerId&&
          Math.hypot(fx.atX-f.x,fx.atY-f.y)<6))t=1;
      if(t>=1){
        if(fx.kind==="spear-flight"&&!fx.impactDone){
          this.bloom(target?.alive?this.position(target):fx.destination,true,
            fx.angle||0,"spear-impact");
        }else if(fx.kind==="sky-spear"&&!fx.impactDone){
          this.bloom(fx.destination,true,0,"sky-spear-impact");
        }else if(fx.kind==="snare-cage"||fx.kind==="mirror-shield")
          this.bloom(fx.root.position,false,0,
            fx.kind==="snare-cage"?"snare-break":"mirror-release");
        this.destroy(fx);this.live.splice(i,1);continue;
      }
      if(fx.actorId&&actor?.alive&&fx.kind.startsWith("charge"))
        fx.root.position.copyFrom(this.position(actor));
      if((fx.cc||fx.shield)&&target?.alive)
        fx.root.position.copyFrom(this.position(target));
      if(fx.kind==="spear-flight"||fx.kind==="sky-spear"||
        fx.kind==="reflect-flight"||fx.kind==="conduit-flight"){
        const end=target?.alive?this.position(target):fx.destination;
        const progress=smooth(t),start=fx.origin||fx.root.position;
        fx.root.position.copyFrom(BABYLON.Vector3.Lerp(start,end,progress));
        if(fx.kind==="spear-flight"){
          fx.root.rotation.y=fx.angle;
          fx.root.rotation.z=Math.PI*.5;
        }
      }
      for(const [index,entry]of fx.meshes.entries()){
        const {mesh,base}=entry;
        if(fx.kind.startsWith("charge")){
          const a=now*.001*(1.4+index*.08)+index*TAU/9;
          if(index<11){
            const r=(.29+index%3*.045)*(1-.45*smooth(t));
            mesh.position.set(Math.cos(a)*r,Math.sin(a*1.5)*.13,
              Math.sin(a)*r);
            mesh.rotation.y=a;mesh.rotation.x=.20+Math.sin(a)*.24;
          }else mesh.rotation.y+=.012*(index%2?1:-1);
          mesh.visibility=Math.min(.94,t*10,(1-t)*9);
        }else if(fx.field){
          if(index>=3){
            const a=now*.00055*(index%2?1:-1)+index*TAU/12;
            const r=fx.radius*(.35+(index%4)*.17);
            mesh.position.x=Math.cos(a)*r;
            mesh.position.z=Math.sin(a)*r;
            mesh.position.y=.12+Math.sin(a*2+index)*.18;
            mesh.rotation.y=a;mesh.rotation.z=.25*Math.sin(a);
          }else mesh.rotation.y=now*.00018*(index%2?1:-1);
          mesh.visibility=Math.min(.80,t*9,(1-t)*5);
        }else if(fx.cc){
          mesh.rotation.y+=(index%2?.004:-.003);
          mesh.scaling.y=(index<6?.86+.14*smooth(t/.12):1);
          mesh.visibility=Math.min(.79,t*13,(1-t)*6);
        }else if(fx.shield){
          if(index<5){
            const a=index*TAU/5+now*.00017;
            mesh.position.x=Math.cos(a)*.97;
            mesh.position.z=Math.sin(a)*.97;
            mesh.rotation.y=a*.26;
          }else mesh.rotation.y=now*.00025*(index%2?1:-1);
          mesh.visibility=Math.min(.58,t*12,(1-t)*7);
        }else if(fx.conduit){
          mesh.visibility=Math.min(.82,t*11,(1-t)*7)*
            (.75+.25*Math.sin(now*.009+index*1.7));
        }else if(fx.kind.startsWith("avalanche")){
          const k=smooth(t/.36);
          mesh.position.y=base.y+(index<9?.38*k:0);
          mesh.scaling.y=.38+.74*k;
          mesh.visibility=Math.min(.89,t*9,(1-t)*3.4);
        }else if(fx.kind==="spear-flight"||fx.kind==="sky-spear"||
          fx.kind==="reflect-flight"||fx.kind==="conduit-flight"){
          mesh.rotation.y+=.011*(index%2?1:-1);
          mesh.visibility=Math.min(.96,t*12,(1-t)*9);
        }else{
          const u=smooth(t),phase=index*TAU/11;
          mesh.position.set(base.x*(.7+u*1.5),base.y+u*(index%3-1)*.17,
            base.z*(.7+u*1.5));
          mesh.rotation.x+=.014*(index%2?1:-1);
          mesh.scaling.setAll(.70+.23*u);
          mesh.visibility=Math.min(.88,t*14,(1-t)*2.35);
        }
      }
    }
    this.stats.active=this.live.length;
  }
  destroy(fx){
    for(const entry of fx.meshes)entry.mesh.dispose();
    fx.root.dispose();
  }
  clear(){for(const fx of this.live)this.destroy(fx);this.live.length=0;
    this.mirrorOrigins.clear();}
  dispose(){this.clear();for(const mat of this.materials.values())mat.dispose();this.materials.clear();}
}
