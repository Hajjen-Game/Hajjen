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
      :spellId==="rift-slash"?301:spellId==="gravity-hammer"?490:0;
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
  contact(g,e,from,to,t,style){
    const k=clamp(t,0,1),a=e.spellId,fade=Math.pow(1-k,1.3);
    if(a==="crystal-bolt"){
      // Irregular icy facets, not a circular magical puff.
      const arms=11;
      for(let i=0;i<arms;i++){
        const angle=i*TAU/arms+.14*(i%3);
        const outer=(22+(i%4)*5)+(38+(i%3)*7)*k;
        const inner=10+15*k;
        const spread=(.19+.08*(i%3));
        const p1={x:to.x+Math.cos(angle-spread)*outer,
          y:to.y+Math.sin(angle-spread)*outer*.82};
        const tip={x:to.x+Math.cos(angle)*outer*1.34,
          y:to.y+Math.sin(angle)*outer*1.03};
        const p2={x:to.x+Math.cos(angle+spread)*outer,
          y:to.y+Math.sin(angle+spread)*outer*.82};
        this.stroke(g,[{x:to.x+Math.cos(angle)*inner,y:to.y+Math.sin(angle)*inner*.8},
          p1,tip,p2],i%3===0?style.core:style.c,
          i%3===0?3.2:1.9,fade*.94);
      }
      for(let i=0;i<3;i++){
        const scale=(23+48*k)+i*8;
        const hex=[];
        for(let j=0;j<=6;j++){
          const angle=j*TAU/6+i*.19;
          hex.push({x:to.x+Math.cos(angle)*scale,y:to.y+Math.sin(angle)*scale*.7});
        }
        this.stroke(g,hex,i===0?style.core:style.c,i===0?2.6:1.35,
          fade*(.75-i*.15));
      }
    }else if(a==="sun-lance"){
      // Extremely bright centre, asymmetric solar petals and piercing rays.
      const radius=14+61*k;
      this.circle(g,to.x,to.y,radius,style.c,5.2*fade,.82*fade);
      this.circle(g,to.x,to.y,radius*.58,style.core,2.6*fade,fade);
      for(let i=0;i<12;i++){
        const angle=i*TAU/12+k*.32;
        const ray=radius*(i%3===0?1.6:1.21);
        this.stroke(g,[{x:to.x+Math.cos(angle)*radius*.30,
          y:to.y+Math.sin(angle)*radius*.30},
          {x:to.x+Math.cos(angle)*ray,y:to.y+Math.sin(angle)*ray*.83}],
        i%3===0?style.core:style.c,i%3===0?4.7:2.25,fade*.94);
      }
      for(let j=0;j<4;j++){
        const angle=j*Math.PI/2+.25;
        this.stroke(g,[{x:to.x-Math.cos(angle)*radius*1.7,
            y:to.y-Math.sin(angle)*radius*1.25},
          {x:to.x+Math.cos(angle)*radius*1.7,
            y:to.y+Math.sin(angle)*radius*1.25}],
        j===0?style.core:style.c,j===0?4.3:1.7,fade*.84);
      }
    }else if(a==="rift-slash"){
      // Two opposed spatial seams closing around an open central fracture.
      for(let side=-1;side<=1;side+=2){
        const line=[],length=29+52*k;
        for(let i=0;i<=22;i++){
          const u=i/22-0.5;
          line.push({x:to.x+(u*2)*length+side*Math.sin(u*Math.PI*2+k*2)*7,
            y:to.y+u*(35+28*k)*side+Math.sin(u*11+side)*(5+8*k)});
        }
        this.stroke(g,line,side===1?style.core:style.c,side===1?5.4:3.3,
          fade*.96);
      }
      for(let i=0;i<8;i++){
        const a0=i*TAU/8+.17,len=(26+49*k)*(i%2?1.2:.87);
        this.stroke(g,[{x:to.x+Math.cos(a0)*11,y:to.y+Math.sin(a0)*10},
          {x:to.x+Math.cos(a0)*len,y:to.y+Math.sin(a0)*len*.82}],
          i%3===0?style.core:style.c,i%3===0?2.8:1.5,fade*.86);
      }
    }else if(a==="gravity-hammer"){
      // A grounded broad shock disc, asymmetric radiating ground fissures.
      const r=18+k*80;
      for(let ring=0;ring<3;ring++){
        const rr=r*(.53+ring*.32),points=[];
        for(let j=0;j<=30;j++){
          const angle=j*TAU/30;
          const variation=1+Math.sin(angle*7+ring)*.06;
          points.push({x:to.x+Math.cos(angle)*rr*variation,
            y:to.y+Math.sin(angle)*rr*.59*variation});
        }
        this.stroke(g,points,ring===0?style.core:style.c,ring===0?4.8:2.2,
          fade*(1-ring*.17));
      }
      for(let i=0;i<12;i++){
        const angle=i*TAU/12;
        const len=(30+i%3*7)+65*k;
        this.stroke(g,[{x:to.x+Math.cos(angle)*11,y:to.y+Math.sin(angle)*7},
          {x:to.x+Math.cos(angle+.12)*len*.65,
            y:to.y+Math.sin(angle+.12)*len*.33},
          {x:to.x+Math.cos(angle-.06)*len,
            y:to.y+Math.sin(angle-.06)*len*.62}],
          i%4===0?style.core:style.c,i%4===0?3.6:1.9,fade*.9);
      }
    }
  }
  trail(g,e,from,to,t,style){
    if(!from||!to)return;
    const elapsed=t*e.duration,hitAt=e.contactMs||e.duration*.60;
    const travel=clamp(elapsed/hitAt,0,1);
    const ease=travel*travel*(3-2*travel);
    const x=from.x+(to.x-from.x)*ease,y=from.y+(to.y-from.y)*ease;
    const dx=to.x-from.x,dy=to.y-from.y;
    const len=Math.max(1,Math.hypot(dx,dy)),px=-dy/len,py=dx/len;
    const attack=e.spellId;
    if(elapsed<hitAt&&(attack==="sun-lance"||attack==="crystal-bolt")){
      const tail=attack==="sun-lance"?82:60,nx=dx/len,ny=dy/len;
      for(let i=-2;i<=2;i++){
        const wav=attack==="crystal-bolt"?Math.sin(t*30+i*2.3)*6:
          Math.sin(t*32+i*1.8)*2;
        const spread=i*3.2+wav;
        this.stroke(g,[{x:x-nx*tail+px*spread,y:y-ny*tail+py*spread},
          {x:x+px*i*2,y:y+py*i*2}],
        i===0?style.core:style.c,i===0?5.0:1.85,
          Math.max(0,1-travel*.35)*(i===0?1:.8));
      }
      this.circle(g,x,y,attack==="sun-lance"?9:7,style.core,3.1,1);
    }else if(elapsed<hitAt&&attack==="rift-slash"){
      // An actual attack moves outward from the caster instead of appearing
      // as three static arcs parked on top of the victim.
      const r=26+20*travel;
      for(let i=0;i<4;i++){
        const curve=[];
        for(let j=0;j<=26;j++){
          const angle=-1.40+j*2.8/26+travel*.74+i*.16;
          curve.push({x:x+Math.cos(angle)*(r-i*4.5),
            y:y+Math.sin(angle)*(r*.92-i*2.5)});
        }
        this.stroke(g,curve,i===1?style.core:style.c,
          i===1?6.0:2.9,(1-travel*.18)*(i===3?.5:.96));
      }
      // Bright travelling seam visually joins source and target.
      this.stroke(g,[{x:from.x,y:from.y},
        {x:x,y:y}],style.c,2.1,travel*.67);
    }else if(elapsed<hitAt&&attack==="gravity-hammer"){
      const v=1-travel,headY=to.y-(150*v*v);
      for(let i=-2;i<=2;i++){
        this.stroke(g,[{x:to.x+i*10,y:headY-36-10*Math.abs(i)},
          {x:to.x+i*5,y:headY+10}],i===0?style.core:style.c,
          i===0?5.6:2.5,1-travel*.18);
      }
      this.circle(g,to.x,headY,14+12*travel,style.core,3.2,1);
    }
    if(elapsed>=hitAt){
      const impactT=clamp((elapsed-hitAt)/Math.max(1,e.duration-hitAt),0,1);
      if(["sun-lance","crystal-bolt","rift-slash","gravity-hammer"].includes(attack)){
        this.contact(g,e,from,to,impactT,style);
      }else this.flare(g,to.x,to.y,impactT,style,.9);
    }
    // Unchanged healing identity: thin, rotating three-thread transfer.
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
      else if(e.type==="hit"||e.type==="heal")this.trail(g,e,from,to,t,style);
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
