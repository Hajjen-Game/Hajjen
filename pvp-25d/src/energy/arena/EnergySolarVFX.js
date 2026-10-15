// Solar VFX 1.0 — five premium solar-class spells. Crystal Bolt and Sun Lance
// NEVER enter this pipeline. Event-driven visual-only Babylon geometry,
// shared by production EnergyArenaRenderer and Visual VFX Lab.
const S=.02,TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
export const SOLAR_VFX_IDS=new Set([
  "flux-bolt","zenith-crash","cinder-familiar","solar-ascension","chain-tempest"
]);
const HUES={core:"#fff9d9",hot:"#ffe2a0",gold:"#ffc06c",amber:"#e8863d",
  corona:"#fff4ba",plasma:"#ffa75c",storm:"#ffd6ac",electric:"#f6e6ff",
  dusk:"#d86f51",shade:"#bc6c43"};
export class EnergySolarVFX{
  constructor(scene){
    this.scene=scene;this.materials=new Map();this.effects=[];this.sequence=0;
    this.maxEffects=105;this.ascension=new Map();this.familiars=new Map();
    this.plasmaFields=new Map();
    this.chainOrigins=new Map();this.coronaOrigins=new Map();
  }
  mat(hue="gold",alpha=.85){
    const key=hue+":"+alpha;
    if(this.materials.has(key))return this.materials.get(key);
    const mat=new BABYLON.StandardMaterial("solar-vfx:"+key,this.scene);
    const c=BABYLON.Color3.FromHexString(HUES[hue]||hue);
    mat.diffuseColor=c.scale(.12);mat.emissiveColor=c.scale(
      hue==="core"?1.43:hue==="hot"?1.23:1.03);
    mat.specularColor=BABYLON.Color3.Black();
    mat.alpha=alpha;mat.disableLighting=true;mat.backFaceCulling=false;
    if(alpha<1){mat.disableDepthWrite=true;
      if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
        mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;}
    this.materials.set(key,mat);return mat;
  }
  world(x,y,h=.92){return new BABYLON.Vector3(x*S,h,y*S)}
  actor(a,h=.92){return this.world(a.x,a.y,h)}
  make(kind,at,ms=520,meta={}){
    const root=new BABYLON.TransformNode("solar:"+kind+":"+(++this.sequence),this.scene);
    root.position.copyFrom(at);
    const fx={kind,root,created:performance.now(),duration:ms,parts:[],nodes:[],...meta};
    this.effects.push(fx);
    while(this.effects.length>this.maxEffects)this.remove(this.effects.shift());
    return fx;
  }
  add(fx,mesh,tone="gold",alpha=.87){
    mesh.parent=fx.root;mesh.material=this.mat(tone,alpha);
    mesh.isPickable=false;
    fx.parts.push({mesh,original:mesh.position.clone()});
    return mesh;
  }
  gem(fx,size=.17,height=.5,hue="gold",x=0,y=0,z=0,alpha=.9){
    const mesh=BABYLON.MeshBuilder.CreatePolyhedron("solar-facet:"+this.sequence,{
      type:1,size,flat:false
    },this.scene);
    this.add(fx,mesh,hue,alpha);
    mesh.scaling.set(1,Math.max(.2,height/(size*2)),1);
    mesh.position.set(x,y,z);return mesh;
  }
  core(fx,diameter=.35,hue="core",x=0,y=0,z=0,alpha=.84){
    const mesh=BABYLON.MeshBuilder.CreateSphere("solar-core:"+this.sequence,{
      diameter,segments:9
    },this.scene);
    this.add(fx,mesh,hue,alpha);mesh.position.set(x,y,z);return mesh;
  }
  hoop(fx,r=.66,hue="gold",y=0,w=.025,alpha=.72){
    const mesh=BABYLON.MeshBuilder.CreateTorus("solar-corona:"+this.sequence,{
      diameter:r*2,thickness:w,tessellation:44
    },this.scene);
    this.add(fx,mesh,hue,alpha);mesh.position.y=y;return mesh;
  }
  filament(fx,points,hue="hot",width=.014,alpha=.72){
    if(points.length<2)return null;
    const mesh=BABYLON.MeshBuilder.CreateTube("solar-thread:"+this.sequence,{
      path:points,radius:width,tessellation:5,cap:BABYLON.Mesh.CAP_ALL
    },this.scene);
    return this.add(fx,mesh,hue,alpha);
  }
  burst(at,{large=false,kind="solar-burst",tone="gold"}={}){
    const fx=this.make(kind,at,large?730:480);
    const total=large?13:8;
    for(let i=0;i<total;i++){
      const a=(i+.25)*TAU/total;
      const dist=.22+(i%4)*.11;
      const crystal=this.gem(fx,large?.13:.08,large?.73:.43,
        i%4===0?"core":i%3===0?"amber":tone,
        Math.cos(a)*dist,(i%3-1)*.17,Math.sin(a)*dist,.76);
      crystal.rotation.x=a*.35;crystal.rotation.z=a*.2;
      if(i%2===0)this.filament(fx,[
        new BABYLON.Vector3(Math.cos(a)*.11,.07,Math.sin(a)*.11),
        new BABYLON.Vector3(Math.cos(a)*(large?.9:.61),.22,
          Math.sin(a)*(large?.9:.61))],
        i%3===0?"core":"hot",.013,.58);
    }
    this.core(fx,large?.44:.25,"core",0,.05,0,.82);
    this.hoop(fx,large?.88:.59,"hot",-.47,.023,.55);
    return fx;
  }
  buildup(actor,spell,castSeconds=0){
    const ms=clamp(castSeconds*1000||360,330,2500);
    const fx=this.make("charge-"+spell,this.actor(actor),ms,{sourceId:actor.id});
    const count=spell==="flux-bolt"?9:spell==="zenith-crash"?10:7;
    for(let i=0;i<count;i++){
      const a=i*TAU/count;
      const g=this.gem(fx,i%3===0?.073:.055,.26+(i%3)*.095,
        i%4===0?"core":i%2===0?"gold":"amber",
        Math.cos(a)*.37,(i%3-1)*.11,Math.sin(a)*.37);
      g.rotation.z=.3+.19*i;
    }
    this.core(fx,spell==="zenith-crash"?.32:.22,"hot",0,0,0,.72);
    for(let j=0;j<3;j++){
      const ring=this.hoop(fx,.31+j*.11,j===0?"core":j===1?"gold":"amber",
        (j-1)*.09,.015,.55);
      ring.rotation.x=j*.53+.1;ring.rotation.z=j*.36;
    }
    return fx;
  }
  flight(kind,from,to,ms=400){
    const fx=this.make(kind,from,ms,{from:from.clone(),to:to.clone()});
    const d=to.subtract(from),heading=Math.atan2(d.x,d.z);
    this.core(fx,kind==="flux-flight"?.47:kind==="tempest-flight"?.99:.36,
      "core",0,0,0,.92);
    const n=kind==="tempest-flight"?9:7;
    for(let i=0;i<n;i++){
      const a=i*TAU/n;
      const r=kind==="tempest-flight"?.48:.26;
      const shard=this.gem(fx,kind==="tempest-flight"?.09:.061,
        kind==="tempest-flight"?.50:.31,
        i%3===0?"electric":i%2?"hot":"gold",
        Math.cos(a)*r,(i%3-1)*.12,Math.sin(a)*r,.79);
      shard.rotation.x=a*.40;
    }
    for(let j=0;j<3;j++)this.hoop(fx,
      kind==="tempest-flight"?.63+j*.17:.37+j*.09,
      j===0?"core":j===1?"hot":"amber",0,.016,.58);
    fx.heading=heading;return fx;
  }
  lightning(from,to,{kind="solar-arc",ms=480,strong=false}={}){
    const diff=to.subtract(from),span=Math.hypot(diff.x,diff.z)||.01;
    const fx=this.make(kind,from,ms,{to:to.clone(),from:from.clone()});
    const sideways=new BABYLON.Vector3(-diff.z/span,0,diff.x/span);
    for(let lane=0;lane<(strong?4:3);lane++){
      const path=[],n=10;
      for(let i=0;i<=n;i++){
        const t=i/n;
        const deviation=(i===0||i===n)?0:
          Math.sin(i*7.3+lane*2.6)*(.1+lane*.036);
        path.push(new BABYLON.Vector3(diff.x*t+sideways.x*deviation,
          diff.y*t+Math.sin(t*Math.PI*2+lane)*.06,
          diff.z*t+sideways.z*deviation));
      }
      this.filament(fx,path,lane===0?"core":lane===1?"electric":"gold",
        strong?.035-lane*.005:.022-lane*.003, lane===0?.93:.64);
    }
    this.core(fx,strong?.26:.18,"hot",0,0,0,.81);
    return fx;
  }
  // Focused solar impact: sun-rune rings, radial pointed shards and
  // a sculpted vertical pillar, never a full-screen opaque flash.
  pillar(x,y,{kind="zenith-impact",large=true,sky=true,ms=800}={}){
    const origin=this.world(x,y,.14);
    const fx=this.make(kind,origin,ms,{x,y,sky,impact:true});
    const n=large?12:8;
    for(let j=0;j<3;j++)this.hoop(fx,
      (large?1.25:.73)+j*(large?.39:.27),
      j===0?"core":j===1?"hot":"amber",.008+j*.015,
      .035-j*.005,j===0?.75:.53);
    for(let i=0;i<n;i++){
      const a=i*TAU/n+.13,rad=(large?1.2:.72)+(i%3)*.32;
      const g=this.gem(fx,large?.13:.085,large?1.03:.57,
        i%4===0?"core":i%2?"gold":"amber",
        Math.cos(a)*rad,.24+(i%3)*.11,Math.sin(a)*rad,.82);
      g.rotation.z=.12*Math.sin(a);
    }
    if(sky){
      // A shaft with faceted translucent gold walls, a tiny white-hot spine,
      // and interrupted high-altitude corona rings.
      for(const [offset,r,hue,opacity] of [[0,.39,"gold",.31],[.035,.17,"core",.63]]){
        const shaft=BABYLON.MeshBuilder.CreateCylinder("solar-sky-shaft:"+this.sequence,{
          height:5.2,diameterTop:r*.62,diameterBottom:r*1.6,tessellation:9
        },this.scene);
        this.add(fx,shaft,hue,opacity);shaft.position.set(offset,2.51,-offset);
      }
      this.hoop(fx,.75,"hot",4.8,.027,.56);
      this.core(fx,.48,"core",0,4.84,0,.88);
    }
    return fx;
  }
  // Each active Solar Ascension charge has a real orbiting low-poly sigil.
  // Sigils track the caster and disappear one by one on consumption.
  addAscension(actor){
    this.clearAscension(actor.id);
    const fx=this.make("ascension-orbit",this.actor(actor,1.1),13000,
      {sourceId:actor.id,persistent:true});
    const glyphs=[];
    for(let i=0;i<3;i++){
      const root=new BABYLON.TransformNode("ascension-glyph-"+i,this.scene);
      root.parent=fx.root;
      fx.nodes.push(root);
      const g=this.gem(fx,.21,.53,i===0?"core":i===1?"hot":"gold",0,0,0,.85);
      g.parent=root;
      const wing=this.gem(fx,.105,.23,"hot",.27,.04,0,.65);
      wing.parent=root;
      glyphs.push(root);
    }
    for(let i=0;i<2;i++)this.hoop(fx,1.26+i*.17,i===0?"gold":"hot",
      -.18+i*.13,.016,.34);
    fx.glyphs=glyphs;
    this.ascension.set(actor.id,fx);
    return fx;
  }
  clearAscension(id){const fx=this.ascension.get(id);if(!fx)return;
    this.ascension.delete(id);this.drop(fx);}
  // The original mini-sun stays in EnergyArenaRenderer.syncSolarVisuals.
  // This augments it with small corona shards and orbiting heated filaments.
  addFamiliar(actor){
    this.clearFamiliar(actor.id);
    const fx=this.make("familiar-corona",this.actor(actor,1.65),12600,
      {sourceId:actor.id,persistent:true});
    for(let i=0;i<8;i++){
      const a=i*TAU/8;
      const g=this.gem(fx,.076,.37,
        i%3===0?"core":i%2?"gold":"amber",
        Math.cos(a)*.68,.02*Math.sin(a*2),Math.sin(a)*.68,.74);
      g.rotation.z=.25+i*.11;
    }
    for(let k=0;k<2;k++){
      const ring=this.hoop(fx,.64+k*.13,k===0?"hot":"gold",0,.017,.54);
      ring.rotation.x=k*.61+.14;
    }
    this.familiars.set(actor.id,fx);
    return fx;
  }
  clearFamiliar(id){const fx=this.familiars.get(id);if(!fx)return;
    this.familiars.delete(id);this.drop(fx);}
  familiarShot(actor,target,kind){
    const fam=actor.familiar;
    const locked=fam?.evo==="soulbrand"&&fam.targetId?
      this.activeMatch?.getActor(fam.targetId):null;
    const follow=locked?.alive?locked:actor;
    const from=this.world(follow.x+39.5,follow.y-22.5,1.65);
    const to=this.actor(target);
    this.flight(kind==="soulbrand-ray"?"soulbrand-flight":"familiar-flight",
      from,to,kind==="soulbrand-ray"?350:310);
    if(kind==="soulbrand-ray")this.lightning(from,to,{
      kind:"soulbrand-filaments",ms:350,strong:false});
  }
  familiarPhoenix(actor,target){
    // Two angular sunfire wings surround one comet core; this is NOT a new NPC.
    const start=this.world(actor.x+39.5,actor.y-22.5,1.7);
    const to=this.actor(target,.93);
    const fx=this.flight("phoenix-dive-flight",start,to,560);
    for(const side of [-1,1]){
      for(let i=0;i<3;i++){
        const a=(i+.4)*.43;
        const g=this.gem(fx,.11,.7+(2-i)*.15,
          i===0?"core":i===1?"hot":"amber",
          side*(.55+i*.23),.12+i*.12,-.16-(i*.14),.72);
        g.rotation.z=side*(.52+i*.13);
      }
      this.filament(fx,[new BABYLON.Vector3(side*.28,.08,0),
        new BABYLON.Vector3(side*.78,.41,-.26),
        new BABYLON.Vector3(side*1.35,.2,-.66)],
        side>0?"hot":"gold",.024,.68);
    }
    return fx;
  }
  spawn(event,match){
    const id=event.spellId;
    // Explicitly reject protected Sun Lance and Crystal Bolt for every type.
    if(!SOLAR_VFX_IDS.has(id))return false;
    const actor=match.getActor(event.actorId);
    const target=match.getActor(event.targetId);
    const kind=event.kind||"";
    const point=Number.isFinite(event.x)&&Number.isFinite(event.y)?
      this.world(event.x,event.y,.24):target?this.actor(target):actor?this.actor(actor):null;
    if(event.type==="windup"){
      if(actor)this.buildup(actor,id,event.castSeconds||0);
      return true;
    }
    if(event.type==="ground-telegraph"&&id==="zenith-crash"&&point){
      const fx=this.make("zenith-warning",this.world(event.x,event.y,.08),
        Math.max(500,(event.duration||2)*1000),{sourceId:event.actorId,
          preview:true});
      const r=(event.radius||124)*S;
      for(let i=0;i<3;i++){
        const ring=this.hoop(fx,r*(.55+i*.22),
          i===0?"core":i===1?"hot":"amber",.02,.023,.69);
        ring.rotation.z=i*.14;
      }
      for(let i=0;i<8;i++){
        const a=i*TAU/8;
        const shard=this.gem(fx,.07,.34,i%2?"gold":"hot",
          Math.cos(a)*r*.8,.04,Math.sin(a)*r*.8,.73);
        shard.rotation.y=a;
      }
      return true;
    }
    if(event.type==="hit"&&point){
      if(id==="flux-bolt"&&actor&&target){
        this.flight("flux-flight",this.actor(actor),this.actor(target),360);
      }else if(id==="chain-tempest"&&actor&&target){
        this.flight("tempest-flight",this.actor(actor),this.actor(target),430);
      }else if(id==="cinder-familiar"){
        this.burst(point,{large:false,kind:"familiar-contact"});
      }else if(id==="solar-ascension"){
        this.burst(point,{large:false,kind:"ascension-contact"});
      }else if(id==="zenith-crash"){
        this.burst(point,{large:false,kind:"zenith-hit-contact"});
      }
      return true;
    }
    if(event.type==="identity-proc"){
      if(!actor)return true;
      if(id==="cinder-familiar"){
        if(kind==="familiar-summon"){
          this.addFamiliar(actor);
          this.burst(this.actor(actor,1.65),{kind:"familiar-summon"});
        }else if(kind==="familiar-shot"||kind==="soulbrand-ray"){
          if(target)this.familiarShot(actor,target,kind);
        }else if(kind==="familiar-orbit"&&!this.familiars.has(actor.id)){
          this.addFamiliar(actor);
        }
      }else if(id==="solar-ascension"){
        if(kind==="ascension-start"){
          this.addAscension(actor);
          this.burst(this.actor(actor),{large:true,kind:"ascension-start"});
        }else if(kind==="ascension-beam"&&target){
          this.pillar(target.x,target.y,{kind:"ascension-skybeam",
            large:false,ms:610});
        }
      }else if(id==="chain-tempest"&&kind==="tempest-core"&&target){
        this.chainOrigins.set(actor.id,{
          x:target.x,y:target.y,expires:performance.now()+1650});
        // Orb visually travels BEFORE the impact, rather than exploding early.
        this.burst(this.actor(actor),{kind:"tempest-release"});
      }else if(id==="flux-bolt"&&kind==="flux-third-hit"&&target){
        this.coronaOrigins.set(actor.id,{x:target.x,y:target.y,
          expires:performance.now()+1050});
        this.burst(this.actor(target),{large:true,kind:"flux-third-hit"});
      }
      return true;
    }
    if(event.type==="evolution-proc"&&point){
      if(id==="flux-bolt"){
        if(kind==="helios-tick")this.burst(point,{kind:"helios-focus"});
        else if(kind==="helios-ready"&&actor){
          const fx=this.make("helios-ready",this.actor(actor),1400);
          for(let j=0;j<3;j++)this.hoop(fx,.33+j*.23,
            j===0?"core":"gold",-.16+j*.12,.018,.58);
        }else if(kind==="corona-volley"&&actor&&target){
          const origin=this.coronaOrigins.get(actor.id);
          const start=origin?.expires>performance.now()?
            this.world(origin.x,origin.y):this.actor(actor);
          this.flight("corona-flight",start,point,370);
          this.burst(point,{kind:"corona-hit"});
        }else if(kind==="thunderhead-cloud"){
          const fx=this.make("thunderhead-cloud",
            this.world(point.x/S,point.z/S,3.1),2050);
          for(let i=0;i<7;i++){
            const a=i*TAU/7;
            this.core(fx,.32,i%3===0?"core":"storm",
              Math.cos(a)*.58,(i%2)*.20,Math.sin(a)*.48,.72);
          }
          this.hoop(fx,.73,"hot",-.14,.017,.62);
        }else if(kind==="thunderhead"){
          this.pillar(point.x/S,point.z/S,{kind:"thunder-strike",
            large:false,ms:420});
        }
      }else if(id==="zenith-crash"){
        if(kind==="zenith-impact")
          this.pillar(point.x/S,point.z/S,{kind:"zenith-pillar"});
        else if(kind==="solar-aftershock-ready"){
          const fx=this.make("aftershock-rune",
            this.world(point.x/S,point.z/S,.09),1000);
          for(let i=0;i<2;i++)this.hoop(fx,1.45+i*.28,
            i?"amber":"hot",0,.019,.61);
        }else if(kind==="solar-aftershock")
          this.pillar(point.x/S,point.z/S,{kind:"zenith-aftershock",
            large:false});
        else if(kind==="burning-ground"){
          const old=this.plasmaFields.get(event.actorId);
          if(!old||!this.effects.includes(old)||
             Math.hypot(old.root.position.x-point.x,
               old.root.position.z-point.z)>.5){
            if(old)this.drop(old);
            const fx=this.make("plasma-field",
              this.world(point.x/S,point.z/S,.1),3450,{
                sourceId:event.actorId,plasma:true});
            for(let i=0;i<3;i++)this.hoop(fx,.94+i*.36,
              i===0?"core":i===1?"plasma":"amber",
              i*.012,.022,.43);
            for(let i=0;i<9;i++){
              const a=i*TAU/9,r=.58+(i%4)*.35;
              this.gem(fx,.064,.32+(i%3)*.12,i%3===0?"hot":"plasma",
                Math.cos(a)*r,.08,Math.sin(a)*r,.62);
            }
            this.plasmaFields.set(event.actorId,fx);
          }else this.burst(point,{kind:"plasma-tick"});
        }else if(kind==="prism-cross"){
          this.pillar(point.x/S,point.z/S,{kind:"prism-hit",
            large:false,sky:false,ms:490});
        }else if(kind==="prism-cross-ready"){
          const fx=this.make("prism-core",point,700);
          for(const side of [-1,1])for(const other of [-1,1])
            this.filament(fx,[new BABYLON.Vector3(0,0,0),
              new BABYLON.Vector3(side*1.35,.09,other*1.35)],
            "hot",.027,.79);
        }
      }else if(id==="cinder-familiar"){
        if(kind==="phoenix-dive"&&actor&&target)
          this.familiarPhoenix(actor,target);
        else if(kind==="dying-star"){
          if(actor)this.clearFamiliar(actor.id);
          this.pillar(point.x/S,point.z/S,{kind:"dying-star-supernova",
            large:true,sky:false,ms:950});
          this.burst(point,{large:true,kind:"dying-star-finale"});
        }else if(kind==="soulbrand-discharge")
          this.lightning(actor?this.actor(actor):point,point,{
            kind:"soulbrand-discharge",ms:440});
        else if(kind==="phoenix-trail")
          this.burst(point,{kind:"phoenix-scorch"});
      }else if(id==="chain-tempest"){
        const start=this.chainOrigins.get(event.actorId);
        if(kind==="tempest-chain"){
          if(start?.expires>performance.now())
            this.lightning(this.world(start.x,start.y),point,{
              kind:"tempest-chain-arc",strong:true,ms:490});
          this.burst(point,{kind:"tempest-chain-hit"});
        }else if(kind==="tempest-focus"){
          this.lightning(this.world(point.x/S,point.z/S,3.3),point,{
            kind:"tempest-focus-bolt",ms:420,strong:true});
          this.burst(point,{kind:"tempest-focus-hit"});
        }
      }
      return true;
    }
    // Do not draw a second generic explosion for follow-up ability events;
    // meaningful gameplay events already have their own high-detail visuals.
    return ["ability"].includes(event.type);
  }
  update(match,now=performance.now()){
    this.activeMatch=match;
    // Effect pool is independent of spell cooldowns and never touches combat.
    for(let i=this.effects.length-1;i>=0;i--){
      const fx=this.effects[i];
      let t=clamp((now-fx.created)/fx.duration,0,1);
      const source=fx.sourceId?match.getActor(fx.sourceId):null;
      if(fx.persistent&&fx.kind==="ascension-orbit"){
        if(!source?.alive||!source.solarSigils||source.solarSigils.until<=match.time||
          source.solarSigils.charges<=0)t=1;
        else{
          fx.root.position.copyFrom(this.actor(source,1.15));
          const charges=source.solarSigils.charges;
          for(let j=0;j<3;j++){
            const root=fx.glyphs[j],a=j*TAU/3+now*.00048;
            root.setEnabled(j<charges);
            root.position.set(Math.cos(a)*1.33,
              .20+Math.sin(a*1.3)*.16,Math.sin(a)*1.33);
            root.rotation.y=a*.35;
          }
        }
      }
      if(fx.persistent&&fx.kind==="familiar-corona"){
        const fam=source?.familiar;
        if(!source?.alive||!fam||fam.until<=match.time)t=1;
        else{
          const locked=fam.evo==="soulbrand"&&match.getActor(fam.targetId)?.alive?
            match.getActor(fam.targetId):null;
          const follow=locked||source;
          fx.root.position.set(follow.x*S+.79,
            1.65+Math.sin(now*.0029)*.12,follow.y*S-.45);
          fx.root.rotation.y=now*.0008;
        }
      }
      if(fx.preview&&(!source?.alive||source.cast?.spellId!=="zenith-crash"))t=1;
      if(t>=1){
        if(["flux-flight","tempest-flight","corona-flight",
          "familiar-flight","soulbrand-flight","phoenix-dive-flight"].includes(fx.kind))
          this.burst(fx.to,{large:fx.kind==="tempest-flight",
            kind:fx.kind+"-impact"});
        this.drop(fx);continue;
      }
      if(fx.kind.startsWith("charge-")&&source?.alive)
        fx.root.position.copyFrom(this.actor(source));
      if(fx.from&&fx.to&&[
        "flux-flight","tempest-flight","corona-flight","familiar-flight",
        "soulbrand-flight","phoenix-dive-flight"
      ].includes(fx.kind)){
        fx.root.position.copyFrom(BABYLON.Vector3.Lerp(fx.from,fx.to,ease(t)));
        fx.root.rotation.y=now*.002;
      }
      for(const [n,entry]of fx.parts.entries()){
        const mesh=entry.mesh,origin=entry.original;
        if(fx.kind.startsWith("charge-")){
          const a=now*.0015*(n%2?-1:1)+n*TAU/9;
          if(n<11){
            const r=(.29+n%3*.046)*(1-.43*ease(t));
            mesh.position.set(Math.cos(a)*r,Math.sin(a*1.5)*.14,
              Math.sin(a)*r);
          }else mesh.rotation.y=now*.00041;
          mesh.visibility=Math.min(.92,t*12,(1-t)*11);
        }else if(fx.kind==="familiar-corona"){
          const a=n*TAU/10+now*.00135;
          if(n<8)mesh.position.set(Math.cos(a)*.71,
            Math.sin(a*1.2)*.16,Math.sin(a)*.71);
          else mesh.rotation.z=now*.00028*(n%2?-1:1);
          mesh.visibility=.64+.2*Math.sin(a);
        }else if(fx.kind==="ascension-orbit"){
          mesh.visibility=.68+.16*Math.sin(now*.004+n);
        }else if(fx.kind==="zenith-warning"||fx.kind==="aftershock-rune"){
          mesh.rotation.y=now*.00024*(n%2?1:-1);
          mesh.visibility=Math.min(.84,t*6,(1-t)*5);
        }else if(fx.plasma){
          if(n>=3){
            const a=n*TAU/9+now*.00048*(n%2?1:-1);
            const radius=.58+(n%4)*.35;
            mesh.position.x=Math.cos(a)*radius;
            mesh.position.z=Math.sin(a)*radius;
            mesh.position.y=.09+Math.sin(a*2+n)*.09;
            mesh.rotation.y=a;
          }else mesh.rotation.y=now*.00015*(n%2?1:-1);
          mesh.visibility=Math.min(.72,t*6,(1-t)*4)*
            (.78+.22*Math.sin(now*.005+n));
        }else if(fx.kind==="thunderhead-cloud"){
          const a=n*TAU/7+now*.00065*(n%2?1:-1);
          mesh.position.x=origin.x+Math.cos(a)*.08;
          mesh.position.z=origin.z+Math.sin(a)*.08;
          mesh.visibility=.68+.18*Math.sin(now*.006+n);
        }else if(fx.impact){
          if(fx.sky&&mesh.position.y>2){
            mesh.visibility=Math.min(.82,t*11,(1-t)*4);
          }else{
            mesh.rotation.y=now*.00038*(n%2?1:-1);
            mesh.scaling.y=(.45+.58*ease(t/.30));
            mesh.visibility=Math.min(.90,t*12,(1-t)*3);
          }
        }else if(fx.kind.endsWith("-flight")||
          fx.kind.includes("filament")||fx.kind.includes("-arc")){
          if(!fx.kind.includes("-arc"))mesh.rotation.y=now*.0017*(n%2?-1:1);
          mesh.visibility=Math.min(.92,t*12,(1-t)*10);
        }else{
          const spread=ease(t);
          mesh.position.set(origin.x*(.7+spread*1.6),
            origin.y+(n%3-1)*spread*.15,
            origin.z*(.7+spread*1.6));
          mesh.rotation.x+=.012*(n%2?1:-1);
          mesh.visibility=Math.min(.89,t*13,(1-t)*3);
        }
      }
    }
    // Clean stale references (effects were already dropped above).
    for(const [id,fx]of this.ascension)if(!this.effects.includes(fx))
      this.ascension.delete(id);
    for(const [id,fx]of this.familiars)if(!this.effects.includes(fx))
      this.familiars.delete(id);
    for(const [id,state]of this.chainOrigins)if(state.expires<now)
      this.chainOrigins.delete(id);
    for(const [id,state]of this.coronaOrigins)if(state.expires<now)
      this.coronaOrigins.delete(id);
    for(const [id,fx]of this.plasmaFields)if(!this.effects.includes(fx))
      this.plasmaFields.delete(id);
  }
  remove(fx){for(const part of fx.parts)part.mesh.dispose();
    for(const node of fx.nodes)node.dispose();
    fx.root.dispose();}
  drop(fx){const i=this.effects.indexOf(fx);if(i>=0)this.effects.splice(i,1);
    this.remove(fx);}
  clear(){
    while(this.effects.length)this.remove(this.effects.pop());
    this.ascension.clear();this.familiars.clear();this.chainOrigins.clear();
    this.coronaOrigins.clear();
    this.plasmaFields.clear();
  }
  dispose(){this.clear();
    for(const mat of this.materials.values())mat.dispose();
    this.materials.clear();}
}
