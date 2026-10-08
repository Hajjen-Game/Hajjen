// Optional PixiJS 8 accent layer, matching the sharp readability of Pixi 3v3.
// Babylon keeps glass, real 3D buildup and depth. Pixi only draws screen-space
// trails and hit highlights, never controls real damage, targeting or movement.
const PIXI_URL="https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs";
const S=.02,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rgb=hex=>parseInt(hex.replace("#",""),16);
const COLORS={
  "crystal-bolt":{c:0x6fd8ff,core:0xebfcff,dim:0x278cbe},
  "sun-lance":{c:0xffb66b,core:0xfff1bf,dim:0xd36a43},
  "null-prison":{c:0xb895fa,core:0xf2dfff,dim:0x594aa1},
  "rift-slash":{c:0xb084ff,core:0xffd8ff,dim:0x7044b3},
  "gravity-hammer":{c:0xf28593,core:0xffdec7,dim:0xa73c62},
  "pulse-mend":{c:0x68efc0,core:0xeefff1,dim:0x339faa},
  "photon-barrier":{c:0xffc37f,core:0xfff7c6,dim:0xc87854},
  "reactive-thread":{c:0x75ecc2,core:0xd9fff2,dim:0x329cb9},
};
const HERO=new Set(Object.keys(COLORS));
const CAST_MS={"crystal-bolt":1300,"sun-lance":1800,"null-prison":1400,
  "rift-slash":390,"gravity-hammer":600,"pulse-mend":1500,
  "photon-barrier":390,"reactive-thread":390};
export class EnergyPixiVFXOverlay {
  constructor(stage,renderer){
    this.stage=stage;this.renderer=renderer;this.ready=false;
    this.effects=[];this.app=null;this.graphics=null;
    this.alive=true;this.failed=false;this.enabled=true;
    this.resizeHandler=null;
  }
  async init(){
    try{
      const PIXI=await import(PIXI_URL);
      if(!this.alive)return;
      const app=new PIXI.Application();
      await app.init({
        width:Math.max(1,this.stage.clientWidth),
        height:Math.max(1,this.stage.clientHeight),
        antialias:true,backgroundAlpha:0,autoStart:false,
        resolution:Math.min(2.5,Math.max(1.5,window.devicePixelRatio||1)),
      });
      if(!this.alive){app.destroy(true,{children:true});return;}
      this.app=app;this.graphics=new PIXI.Graphics();
      app.stage.addChild(this.graphics);
      const canvas=app.canvas;
      canvas.className="energy-pixi-layer";
      Object.assign(canvas.style,{
        position:"absolute",inset:"0",width:"100%",height:"100%",
        pointerEvents:"none",zIndex:"2",display:"block",
      });
      this.stage.appendChild(canvas);
      canvas.style.display=this.enabled?"block":"none";
      this.resizeHandler=()=>{
        if(!this.app||!this.alive)return;
        const w=Math.max(1,this.stage.clientWidth),h=Math.max(1,this.stage.clientHeight);
        this.app.renderer.resize(w,h);
      };
      if("ResizeObserver"in window){
        this.observer=new ResizeObserver(this.resizeHandler);
        this.observer.observe(this.stage);
      }else window.addEventListener("resize",this.resizeHandler);
      this.ready=true;
    }catch(error){
      this.failed=true;
      console.warn("Optional Pixi VFX accents unavailable; Babylon VFX continue.",error);
    }
  }
  spawn(event,match){
    if(!HERO.has(event.spellId))return;
    if(!["windup","hit","heal","control","shield","ability"].includes(event.type))return;
    if(event.type==="ability"&&event.spellId!=="reactive-thread")return;
    if(event.type==="heal"&&event.spellId!=="pulse-mend"&&event.spellId!=="reactive-thread")return;
    const source=match.getActor(event.actorId),target=match.getActor(event.targetId);
    if(!source)return;
    const spellId=event.spellId;
    const distance=target?Math.hypot(source.x-target.x,source.y-target.y)*S:0;
    const contactMs=spellId==="sun-lance"||spellId==="crystal-bolt"
      ?clamp(235+distance*18,255,490)
      :spellId==="rift-slash"?269:spellId==="gravity-hammer"?478:0;
    const isSignatureHit=event.type==="hit"&&contactMs>0;
    const duration=event.type==="windup"?CAST_MS[spellId]
      :event.type==="control"?1300:event.type==="shield"?1400
      :event.type==="ability"?1200:isSignatureHit?contactMs+750:750;
    this.effects.push({spellId,type:event.type,start:performance.now(),
      duration,contactMs,sourceId:source.id,targetId:target?.id||null});
    if(this.effects.length>52)this.effects.shift();
  }
  point(actor){
    if(!actor||!this.renderer.scene)return null;
    const scene=this.renderer.scene;
    const view=new BABYLON.Viewport(0,0,
      Math.max(1,this.stage.clientWidth),Math.max(1,this.stage.clientHeight));
    const pos=BABYLON.Vector3.Project(
      new BABYLON.Vector3(actor.x*S,.88,actor.y*S),
      BABYLON.Matrix.Identity(),scene.getTransformMatrix(),view);
    if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||pos.z<0||pos.z>1)return null;
    return {x:pos.x,y:pos.y};
  }
  impactScale(actor,centre){
    // A world-size reference projected through the active Babylon camera:
    // impacts shrink with the arena zoom instead of staying giant in pixels.
    if(!actor||!centre||!this.renderer.scene)return .72;
    const scene=this.renderer.scene;
    const viewport=new BABYLON.Viewport(0,0,
      Math.max(1,this.stage.clientWidth),Math.max(1,this.stage.clientHeight));
    const edge=BABYLON.Vector3.Project(
      new BABYLON.Vector3(actor.x*S+.62,.88,actor.y*S),
      BABYLON.Matrix.Identity(),scene.getTransformMatrix(),viewport);
    const px=Math.hypot(edge.x-centre.x,edge.y-centre.y);
    return Number.isFinite(px)?clamp(px/23,.70,4.0):1;
  }
  stroke(g,points,color,width,alpha=1){
    if(points.length<2)return;
    g.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
    g.stroke({color,width,alpha,cap:"round",join:"round"});
  }
  circle(g,x,y,r,color,width,alpha){
    g.circle(x,y,Math.max(.5,r)).stroke({color,width,alpha});
  }
  flare(g,x,y,t,style,scale=1){
    const fade=1-t,r=(13+33*t)*scale;
    this.circle(g,x,y,r,style.c,2.3*scale,.66*fade);
    this.circle(g,x,y,r*.50,style.core,1.6*scale,.82*fade);
    for(let i=0;i<7;i++){
      const a=i*TAU/7+t*.8;
      const a0=r*.34,a1=r*(.85+(i%2)*.27);
      this.stroke(g,[{x:x+Math.cos(a)*a0,y:y+Math.sin(a)*a0},
        {x:x+Math.cos(a)*a1,y:y+Math.sin(a)*a1}],
      i%2?style.c:style.core,2.3*scale,(1-t)*.9);
    }
  }
  charge(g,e,from,t,style){
    const fade=Math.min(1,t*6,Math.max(0,(1-t)*12));
    const speed=e.spellId==="crystal-bolt"?-2.0:e.spellId==="sun-lance"?4.2:2.7;
    const radius=e.spellId==="sun-lance"?21:
      e.spellId==="gravity-hammer"?17:e.spellId==="pulse-mend"?15:18;
    const arms=e.spellId==="sun-lance"?6:e.spellId==="crystal-bolt"?5:4;
    const core=e.spellId==="null-prison"?.5:.25;
    const r=(radius*(.83-t*core));
    for(let i=0;i<arms;i++){
      const a=i*TAU/arms+t*speed*TAU;
      const arc=[];
      for(let j=0;j<=9;j++){
        const phi=a+j*.11*(i%2?-1:1);
        const rr=r+(i%2?5:-3);
        arc.push({x:from.x+Math.cos(phi)*rr,y:from.y+Math.sin(phi)*rr*.76});
      }
      this.stroke(g,arc,i%2?style.c:style.core,i===0?2.0:1.3,
        fade*(.60+.3*t));
    }
    if(e.spellId==="sun-lance")for(let i=0;i<6;i++){
      const a=i*TAU/6;
      this.stroke(g,[{x:from.x+Math.cos(a)*9,y:from.y+Math.sin(a)*9},
      {x:from.x+Math.cos(a)*(17+15*t),y:from.y+Math.sin(a)*(17+15*t)}],
      style.core,1.6,.60*t*fade);
    }
    if(e.spellId==="null-prison"){
      const r=14+t*11,vertices=Array.from({length:7},(_,i)=>({
        x:from.x+Math.cos(i*TAU/6)*r,y:from.y+Math.sin(i*TAU/6)*r}));
      this.stroke(g,vertices,style.c,2,fade*.65);
    }
  }
  // Contact has its own timeline; trails finish when the Babylon missile
  // arrives, then the splinter/star/crater remains briefly on the victim.
  // Impact refinement: compact and intricate. Geometry borrows the same
  // motifs as each buildup instead of introducing broad white shock wheels.
  contact(g,e,from,to,t,style,scale=1){
    const k=clamp(t,0,1),a=e.spellId;
    const fade=Math.min(1,k*10,Math.pow(1-k,1.25)*1.25);
    const unit=(n)=>n*scale;
    if(a==="crystal-bolt"){
      // Seven 4-vertex prism fragments + two incomplete cold orbit arcs.
      for(let i=0;i<7;i++){
        const angle=(i+.18)*TAU/7,rr=unit(9+(i%3)*2+13*k);
        const x=to.x+Math.cos(angle)*rr,y=to.y+Math.sin(angle)*rr*.78;
        const shard=[{x:x-Math.cos(angle+.5)*unit(4),y:y-Math.sin(angle+.5)*unit(4)},
          {x:x+Math.cos(angle)*unit(7),y:y+Math.sin(angle)*unit(6)},
          {x:x+Math.cos(angle-.6)*unit(3),y:y+Math.sin(angle-.6)*unit(3)},
          {x:x-Math.cos(angle+.5)*unit(4),y:y-Math.sin(angle+.5)*unit(4)}];
        this.stroke(g,shard,i===0?style.core:style.c,
          unit(i===0?1.65:.95),fade*(i%3===0?.85:.69));
      }
      for(let i=0;i<2;i++){
        const arc=[];
        for(let j=0;j<=13;j++){
          const angle=.35+i*2.85+j*1.65/13;
          arc.push({x:to.x+Math.cos(angle)*unit(16+12*k+i*4),
            y:to.y+Math.sin(angle)*unit(13+8*k+i*3)});
        }
        this.stroke(g,arc,i===0?style.c:style.dim,unit(1.0),fade*.65);
      }
    }else if(a==="sun-lance"){
      // Single tight corona with five SHORT needle-like, offset solar rays.
      const radius=unit(12+11*k);
      const arc=[];
      for(let j=0;j<=19;j++){
        const angle=-.7+j*4.65/19;
        arc.push({x:to.x+Math.cos(angle)*radius,
          y:to.y+Math.sin(angle)*radius*.86});
      }
      this.stroke(g,arc,style.c,unit(1.45),fade*.86);
      for(let i=0;i<5;i++){
        const angle=(i+.17)*TAU/5;
        const out=unit(19+(i%2)*4+9*k);
        this.stroke(g,[{x:to.x+Math.cos(angle)*unit(7),
          y:to.y+Math.sin(angle)*unit(7)},
          {x:to.x+Math.cos(angle)*out,
          y:to.y+Math.sin(angle)*out*.83}],
          i===0?style.core:style.c,unit(i===0?1.75:1.0),
          fade*(i===0?.9:.67));
      }
      this.circle(g,to.x,to.y,unit(5.5),style.c,unit(1.4),fade*.9);
    }else if(a==="rift-slash"){
      // A narrow dark void seam framed by two coloured hairlines.
      for(let side=-1;side<=1;side+=2){
        const line=[];
        for(let j=0;j<=18;j++){
          const u=j/18-.5;
          const x=u*2*unit(23+10*k);
          line.push({x:to.x+x,
            y:to.y+side*(u*unit(18)+Math.sin(u*10+side)*unit(2.4))});
        }
        this.stroke(g,line,side===1?style.dim:style.c,
          unit(side===1?2.1:1.3),fade*.86);
      }
      for(let i=0;i<5;i++){
        const a0=(i+.12)*TAU/5;
        this.stroke(g,[{x:to.x+Math.cos(a0)*unit(8),
          y:to.y+Math.sin(a0)*unit(7)},
          {x:to.x+Math.cos(a0+.12)*unit(16+(i%2)*5+9*k),
          y:to.y+Math.sin(a0+.12)*unit(14+7*k)}],
          style.c,unit(.88),fade*.5);
      }
    }else if(a==="gravity-hammer"){
      // Ground-hugging elliptical pressure wave + tiny branched cracks.
      for(let ring=0;ring<2;ring++){
        const line=[],radius=unit(11+11*k+ring*6);
        for(let j=0;j<=24;j++){
          const angle=j*TAU/24;
          line.push({x:to.x+Math.cos(angle)*radius,
            y:to.y+Math.sin(angle)*radius*.59});
        }
        this.stroke(g,line,ring===0?style.c:style.dim,
          unit(ring===0?1.35:.85),fade*(ring===0?.79:.46));
      }
      for(let i=0;i<8;i++){
        const angle=i*TAU/8+.16,len=unit(20+(i%3)*2+13*k);
        this.stroke(g,[
          {x:to.x+Math.cos(angle)*unit(7),y:to.y+Math.sin(angle)*unit(4)},
          {x:to.x+Math.cos(angle+.1)*len*.69,
            y:to.y+Math.sin(angle+.1)*len*.36},
          {x:to.x+Math.cos(angle-.06)*len,
            y:to.y+Math.sin(angle-.06)*len*.60}
        ],i===0?style.core:style.c,unit(i===0?1.5:.9),fade*.74);
      }
    }
  }
  trail(g,e,from,to,t,style,scale=1){
    if(!from||!to)return;
    const elapsed=t*e.duration,hitAt=e.contactMs||e.duration*.60;
    const travel=clamp(elapsed/hitAt,0,1);
    const ease=travel*travel*(3-2*travel);
    const x=from.x+(to.x-from.x)*ease,y=from.y+(to.y-from.y)*ease;
    const dx=to.x-from.x,dy=to.y-from.y;
    const len=Math.max(1,Math.hypot(dx,dy)),px=-dy/len,py=dx/len;
    const attack=e.spellId;
    if(elapsed<hitAt&&(attack==="sun-lance"||attack==="crystal-bolt")){
      this.ribbonTrail(g,e,from,to,travel,style,Math.min(scale,3.0));
    }else if(elapsed<hitAt&&attack==="rift-slash"){
      // Two receding after-images and opposing prismatic seams sweep forward.
      // Direction is set by caster->target, not by a static ring at the victim.
      const radius=(15+12*travel)*Math.min(scale,2.8);
      for(let echo=0;echo<3;echo++){
        const p=clamp(travel-echo*.13,0,1);
        const curve=p*p*(3-2*p);
        const cx=from.x+dx*curve,cy=from.y+dy*curve;
        for(let lane=-1;lane<=1;lane+=2){
          const pts=[];
          for(let j=0;j<=20;j++){
            const u=j/20-.5,angle=u*Math.PI*2.4+travel*.52+echo*.18;
            const dist=(radius-echo*3*Math.min(scale,2.8));
            pts.push({x:cx+Math.cos(angle)*dist*px-Math.sin(angle)*dist*.42*tx,
              y:cy+Math.cos(angle)*dist*py-Math.sin(angle)*dist*.42*ty+
                lane*u*dist*.28});
          }
          this.stroke(g,pts,echo===0?(lane<0?style.dim:style.c):style.c,
            (echo===0?1.60:.80)*Math.min(scale,2.8),
            (1-echo*.29)*(1-travel*.20)*(lane<0?.70:.82));
        }
      }
      // A cracked central seam and short fading shards add void personality.
      for(let j=0;j<5;j++){
        const lag=clamp(travel-(j+1)*.10,0,1);
        const eased=lag*lag*(3-2*lag);
        if(lag===0)continue;
        const cx=from.x+dx*eased,cy=from.y+dy*eased;
        const side=j%2?-1:1,sideSize=(4+j%3*2)*Math.min(scale,2.7);
        this.stroke(g,[{x:cx+px*sideSize*side,y:cy+py*sideSize*side},
          {x:cx+px*sideSize*side+tx*8,y:cy+py*sideSize*side+ty*8}],
          j===0?style.core:style.c,.86*Math.min(scale,2.7),.55*(1-j/7));
      }
    }else if(elapsed<hitAt&&attack==="gravity-hammer"){
      // Descending filaments spiral around the compact heavy mass. No long
      // opaque white shaft; the slam gains weight through convergence.
      const shapeScale=Math.min(scale,2.8),v=1-travel;
      const headY=to.y-82*v*v*shapeScale;
      for(let lane=-2;lane<=2;lane++){
        const points=[];
        for(let j=0;j<=13;j++){
          const q=j/13;
          const spin=travel*10+lane*1.75+q*TAU*.85;
          points.push({
            x:to.x+Math.sin(spin)*(8+q*7)*shapeScale+lane*2*shapeScale,
            y:headY-q*(19+16*v)*shapeScale
          });
        }
        this.stroke(g,points,lane===0?style.c:lane%2?style.dim:style.c,
          (lane===0?1.9:.86)*shapeScale,
          (lane===0?.80:.48)*(1-travel*.26));
      }
      for(let i=0;i<5;i++){
        const a=travel*6+i*TAU/5;
        this.stroke(g,[{
          x:to.x+Math.cos(a)*9*shapeScale,
          y:headY+Math.sin(a)*4*shapeScale
        },{
          x:to.x+Math.cos(a+.25)*15*shapeScale,
          y:headY+Math.sin(a+.25)*7*shapeScale
        }],i===0?style.core:style.c,.9*shapeScale,.59);
      }
      this.circle(g,to.x,headY,(6+4*travel)*shapeScale,style.c,1.5*shapeScale,.81);
    }
    if(elapsed>=hitAt){
      const impactT=clamp((elapsed-hitAt)/Math.max(1,e.duration-hitAt),0,1);
      if(["sun-lance","crystal-bolt","rift-slash","gravity-hammer"].includes(attack))
        {
          // Keep tiny, intricate core while the outer layer scales with orb.
          this.contact(g,e,from,to,impactT,style,Math.min(1.55,scale));
          this.outerContact(g,e,from,to,impactT,style,scale);
        }
      else this.flare(g,to.x,to.y,impactT,style,.9);
    }
    // The healing signature is intentionally unchanged in this pass.
    if(attack==="pulse-mend"){
      for(let i=0;i<3;i++){
        const phase=i*TAU/3+t*TAU*3;
        const ox=Math.cos(phase)*9,oy=Math.sin(phase)*10;
        this.stroke(g,[{x:from.x+ox,y:from.y+oy},
          {x:x+ox,y:y+oy}],i===0?style.core:style.c,
          1.5+i*.38,1-t*.35);
      }
    }
  }
  // Deliberately incomplete outer silhouettes. At reference scale, these
  // span ~40–52px from target centre; screen projection grows them with the
  // orb until the impact reads at roughly 2–2.5 orb diameters. The small
  // internal impact remains detailed and unchanged.
  outerContact(g,e,from,to,t,style,scale=1){
    const spell=e.spellId,k=clamp(t,0,1);
    const fade=clamp(Math.min(1,k*12)*(1-k)*1.25,0,.82);
    const R=n=>n*scale;
    const arc=(radius,start,span,color,width,opacity,flat=1,steps=20)=>{
      const pts=[];
      for(let j=0;j<=steps;j++){
        const a=start+j*span/steps;
        pts.push({x:to.x+Math.cos(a)*R(radius),
          y:to.y+Math.sin(a)*R(radius)*flat});
      }
      this.stroke(g,pts,color,R(width),fade*opacity);
    };
    if(spell==="crystal-bolt"){
      // Outer facets form a broken frost chrysanthemum, never a solid ring.
      for(let i=0;i<8;i++){
        const a=i*TAU/8+.16,r=R(29+(i%3)*3+14*k);
        const x=to.x+Math.cos(a)*r,y=to.y+Math.sin(a)*r*.83;
        const ray=[{x:x-Math.cos(a+.65)*R(4),y:y-Math.sin(a+.65)*R(4)},
          {x:x+Math.cos(a)*R(8),y:y+Math.sin(a)*R(6)},
          {x:x+Math.cos(a-.55)*R(4),y:y+Math.sin(a-.55)*R(3)},
          {x:x-Math.cos(a+.65)*R(4),y:y-Math.sin(a+.65)*R(4)}];
        this.stroke(g,ray,i%4===0?style.core:style.c,
          R(i%4===0?1.35:.88),fade*(i%3===0?.89:.72));
      }
      arc(35+9*k,.4,1.37,style.c,1.15,.63,.84);
      arc(44+7*k,3.37,1.05,style.dim,.85,.70,.84);
    }else if(spell==="sun-lance"){
      // Narrow sun penetration: broken corona, six calibrated gold needles,
      // and a few satellites. All rays are short and intentionally offset.
      arc(34+10*k,-.55,2.72,style.c,1.30,.83,.90);
      arc(42+7*k,2.75,1.20,style.dim,.91,.57,.90);
      for(let i=0;i<6;i++){
        const a=(i+.19)*TAU/6;
        const start=R(25),finish=R(43+(i%3)*4+7*k);
        this.stroke(g,[
          {x:to.x+Math.cos(a)*start,y:to.y+Math.sin(a)*start*.9},
          {x:to.x+Math.cos(a)*finish,y:to.y+Math.sin(a)*finish*.88}
        ],i===0?style.core:style.c,R(i===0?1.42:.89),fade*(i%3===0?.93:.67));
      }
      for(let i=0;i<3;i++){
        const a=i*TAU/3+.42;
        this.circle(g,to.x+Math.cos(a)*R(39),to.y+Math.sin(a)*R(33),
          R(1.35),style.c,R(.75),fade*.8);
      }
    }else if(spell==="rift-slash"){
      // A split seam extends well beyond the victim without becoming neon
      // bands. Two asymmetric curves, thin bright edge and small side cracks.
      for(const side of [-1,1]){
        const points=[];
        for(let i=0;i<=24;i++){
          const u=i/24-.5;
          const x=R(u*105);
          points.push({x:to.x+x,y:to.y+side*(R(u*40)+Math.sin(u*10+side)*R(4))});
        }
        this.stroke(g,points,side<0?style.c:style.dim,
          R(side<0?1.36:1.9),fade*.84);
      }
      for(let i=0;i<6;i++){
        const a=(i+.28)*TAU/6;
        this.stroke(g,[{x:to.x+Math.cos(a)*R(27),y:to.y+Math.sin(a)*R(22)},
          {x:to.x+Math.cos(a+.10)*R(40+(i%2)*9),
            y:to.y+Math.sin(a+.1)*R(32+(i%3)*3)}
        ],style.c,R(.88),fade*.60);
      }
    }else if(spell==="gravity-hammer"){
      // Low elliptical expanding ground arcs and short angled fissures.
      // Never draw a full upright star wheel over the orb.
      arc(36+12*k,.15,2.45,style.c,1.48,.83,.50);
      arc(46+9*k,3.08,1.95,style.dim,1.0,.66,.50);
      for(let i=0;i<9;i++){
        const a=(i+.13)*TAU/9,r=R(36+(i%3)*4+12*k);
        this.stroke(g,[
          {x:to.x+Math.cos(a)*R(21),y:to.y+Math.sin(a)*R(11)},
          {x:to.x+Math.cos(a+.12)*r*.72,
            y:to.y+Math.sin(a+.12)*r*.35},
          {x:to.x+Math.cos(a-.06)*r,y:to.y+Math.sin(a-.06)*r*.52}
        ],i===0?style.core:style.c,R(i===0?1.35:.91),fade*.75);
      }
    }
  }
  // Pixi 3v3-inspired moving ribbon: tapered layered glow, an electric thin
  // spine, counter-twisted secondary filaments and discrete tumbling motes.
  // All points are sampled along the ease curve, not just a straight line
  // attached to the projectile. This makes the tail visibly move and unravel.
  ribbonTrail(g,e,from,to,travel,style,scale){
    const spell=e.spellId,isIce=spell==="crystal-bolt";
    const dx=to.x-from.x,dy=to.y-from.y;
    const len=Math.max(1,Math.hypot(dx,dy));
    const tx=dx/len,ty=dy/len,nx=-ty,ny=tx;
    const length=Math.min(.74,Math.max(.20,(isIce?125:155)*scale/len));
    const count=21,phase=travel*18;
    const samples=[];
    const smooth=x=>x*x*(3-2*x);
    for(let i=0;i<count;i++){
      const f=i/(count-1),u=Math.max(0,travel-f*length);
      const p=smooth(u),w=Math.sin(phase-i*.63)*(isIce?3.2:1.65)*scale;
      samples.push({x:from.x+dx*p+nx*w*f,y:from.y+dy*p+ny*w*f,u,f});
    }
    // A broad *transparent* discipline-coloured halo underneath thin details.
    // Draw back-to-front so the head reads crisply instead of glowing white.
    for(let i=count-1;i>0;i--){
      const a=samples[i],b=samples[i-1],fade=(1-i/count)*.75;
      if(a.u===0&&b.u===0)continue;
      this.stroke(g,[a,b],style.c,(4.1+1.7*fade)*scale,fade*.13);
      this.stroke(g,[a,b],style.c,(1.10+1.25*fade)*scale,fade*.65);
      if(i<count*.57)this.stroke(g,[a,b],style.core,.67*scale,fade*.42);
    }
    for(const side of [-1,1]){
      const path=[];
      for(let i=0;i<count-1;i++){
        const p=samples[i];
        if(p.u<=0)continue;
        const spiral=Math.sin(phase*1.4-i*(isIce?.80:.54)+side*1.5);
        const spread=(isIce?6.4:4.1)*scale*(.25+p.f*.75);
        path.push({x:p.x+nx*spiral*spread*side,
          y:p.y+ny*spiral*spread*side});
      }
      if(path.length>1)this.stroke(g,path,
        side<0?style.c:style.dim,(isIce?1.05:.89)*scale,.44);
    }
    // Independent little facets / solar sparks along the wake.
    for(let i=2;i<15;i+=2){
      const p=samples[i];if(p.u<=0)continue;
      const angle=phase*.7+i*1.9;
      const radius=(2.6+(i%3)*1.7)*scale;
      const side=i%2?1:-1;
      const x=p.x+nx*radius*side,y=p.y+ny*radius*side;
      if(isIce){
        const shard=[{x:x-tx*3.2*scale,y:y-ty*3.2*scale},
          {x:x+nx*2.0*scale,y:y+ny*2.0*scale},
          {x:x+tx*4.6*scale,y:y+ty*4.6*scale},
          {x:x-tx*3.2*scale,y:y-ty*3.2*scale}];
        this.stroke(g,shard,i%4===0?style.core:style.c,.83*scale,.62*(1-i/18));
      }else{
        const sx=x+Math.cos(angle)*1.6*scale,sy=y+Math.sin(angle)*1.6*scale;
        this.stroke(g,[{x:sx-tx*3.7*scale,y:sy-ty*3.7*scale},
          {x:sx+tx*3.2*scale,y:sy+ty*3.2*scale}],
          i%4===0?style.core:style.c,.90*scale,.57*(1-i/19));
        if(i%4===0)this.circle(g,sx,sy,1.55*scale,style.c,.7*scale,.55);
      }
    }
    const head=samples[0];
    this.circle(g,head.x,head.y,(isIce?4.3:4.8)*scale,
      style.c,1.7*scale,.84);
    if(!isIce)this.circle(g,head.x,head.y,1.7*scale,
      style.core,.86*scale,.86);
  }
  status(g,e,p,t,style){
    const fade=Math.min(1,t*6,(1-t)*5);
    if(e.spellId==="null-prison"){
      for(let ring=0;ring<2;ring++){
        const r=27+ring*8,hex=[];
        for(let i=0;i<=6;i++){
          const a=i*TAU/6+(ring?-.1:.1)+t*(ring?-.2:.2);
          hex.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.77});
        }
        this.stroke(g,hex,ring?style.c:style.core,ring?1.4:2.5,fade*.84);
      }
    }else if(e.spellId==="photon-barrier"){
      const sides=8;
      for(let shell=0;shell<2;shell++){
        const shape=[],r=29+shell*8;
        for(let i=0;i<=sides;i++){
          const a=i*TAU/sides+t*(shell?-.9:.9);
          shape.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.84});
        }
        this.stroke(g,shape,shell?style.c:style.core,2.3-shell*.65,.75*fade);
      }
    }else if(e.spellId==="reactive-thread"){
      for(let i=0;i<4;i++){
        const arc=[],start=i*TAU/4+t*2.4;
        for(let j=0;j<=14;j++){
          const angle=start+j*.12;
          arc.push({x:p.x+Math.cos(angle)*(23+i%2*5),
            y:p.y+Math.sin(angle)*(15+i%2*5)});
        }
        this.stroke(g,arc,i===0?style.core:style.c,2.1,fade*.91);
      }
    }else this.flare(g,p.x,p.y,t,style,.85);
  }
  setEnabled(value){
    this.enabled=!!value;
    if(this.app?.canvas)this.app.canvas.style.display=this.enabled?"block":"none";
  }
  update(match,now=performance.now()){
    if(!this.ready||!this.graphics||!this.enabled)return;
    const g=this.graphics;g.clear();
    this.effects=this.effects.filter(e=>now-e.start<e.duration);
    for(const e of this.effects){
      const t=clamp((now-e.start)/e.duration,0,1);
      const a=match.getActor(e.sourceId),b=match.getActor(e.targetId);
      const from=this.point(a),to=this.point(b||a);
      if(!from||!to)continue;
      const style=COLORS[e.spellId];
      if(e.type==="windup")this.charge(g,e,from,t,style);
      else if(e.type==="hit"||e.type==="heal")this.trail(g,e,from,to,t,style,
        this.impactScale(b||a,to));
      else this.status(g,e,to,t,style);
    }
    this.app.render();
  }
  dispose(){
    this.alive=false;
    this.observer?.disconnect();
    if(!this.observer&&this.resizeHandler)window.removeEventListener("resize",this.resizeHandler);
    try{this.app?.destroy(true,{children:true});}catch{}
    this.effects=[];this.graphics=null;this.app=null;this.ready=false;
  }
}
