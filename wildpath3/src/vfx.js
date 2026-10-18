// Wildpath 3.0 Pass 1.1: reuse the proven Wildpath 2.x Pixi water artwork.
// Optional mobile-friendly overlay: Babylon projectiles/rings remain visible
// if Pixi or its CDN fails to load. No gameplay authority in this module.
import {drawWaterProjectile,drawWaterSpell} from '../../wildpath/src/water-pixi.js?v=3.1.0';
const B=window.BABYLON;
const PIXI_URL='https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export class WaterVFX {
  constructor(canvas,scene,engine){
    this.canvas=canvas;this.scene=scene;this.engine=engine;
    this.ready=false;this.failed=false;this.effects=[];this.clock=0;
    this.width=0;this.height=0;this.view=null;this.app=null;this.graphics=null;
  }
  async init(){
    let view;
    try{
      const PIXI=await import(PIXI_URL);
      view=document.createElement('canvas');
      view.className='water-vfx-overlay';view.setAttribute('aria-hidden','true');
      Object.assign(view.style,{position:'fixed',inset:'0',width:'100%',height:'100%',
        pointerEvents:'none',zIndex:'2',background:'transparent'});
      this.canvas.insertAdjacentElement('afterend',view);
      this.width=Math.max(1,window.innerWidth);this.height=Math.max(1,window.innerHeight);
      const app=new PIXI.Application();
      await app.init({canvas:view,width:this.width,height:this.height,
        backgroundAlpha:0,antialias:true,autoStart:false,preference:'webgl',
        resolution:Math.min(1.6,Math.max(1,devicePixelRatio||1))});
      this.app=app;this.view=view;this.graphics=new PIXI.Graphics();
      app.stage.addChild(this.graphics);this.ready=true;
    }catch(error){
      this.failed=true;view?.remove();
      console.warn('Optional restored Pixi water VFX unavailable:',error);
    }
  }
  resize(){
    if(!this.ready)return;
    const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
    if(w===this.width&&h===this.height)return;
    this.width=w;this.height=h;this.app.renderer.resize(w,h);
  }
  project(x,y,z){
    const camera=this.scene.activeCamera,view=camera.viewport.toGlobal(
      this.engine.getRenderWidth(),this.engine.getRenderHeight());
    const v=B.Vector3.Project(new B.Vector3(x,y,z),B.Matrix.Identity(),
      this.scene.getTransformMatrix(),view);
    if(!Number.isFinite(v.x)||!Number.isFinite(v.y)||v.z<0||v.z>1)return null;
    return {x:v.x*this.width/this.engine.getRenderWidth(),
      y:v.y*this.height/this.engine.getRenderHeight()};
  }
  emit(name,stage,x,z,intensity=1){
    if(this.effects.length>=45)this.effects.shift();
    this.effects.push({name,stage,x,z,y:.75,life:stage==='burst'?.39:.29,
      intensity:clamp(intensity,.6,2),elapsed:0,seed:this.clock*12.31});
  }
  update(dt,projectiles,playing){
    if(!this.ready)return;
    this.resize();
    this.clock+=dt;
    const g=this.graphics;g.clear();
    if(playing){
      for(const p of projectiles){
        const head=this.project(p.x,1.32,p.z);
        if(!head||!p.target?.alive)continue;
        const dx=p.target.x-p.x,dz=p.target.z-p.z;
        const dist=Math.max(.001,Math.hypot(dx,dz));
        const from=this.project(p.x-dx/dist*.92,1.32,p.z-dz/dist*.92);
        if(from)drawWaterProjectile(g,from,head,.95,this.clock,p.age*17);
      }
    }
    for(let i=this.effects.length-1;i>=0;i--){
      const e=this.effects[i];
      if(playing)e.elapsed+=dt;
      if(e.elapsed>=e.life){this.effects.splice(i,1);continue;}
      if(!playing)continue;
      const pos=this.project(e.x,e.y,e.z);
      if(pos)drawWaterSpell(g,e,pos,16);
    }
    this.app.render();
  }
  clear(){this.effects.length=0;this.graphics?.clear();}
}
