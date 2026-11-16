// SKYSHIFT 0.11.1 — preserve HDR beauty/SMAA; scale only the bloom blur mip chain.
export const OPT_0111=Object.freeze({
 version:"render-cpu-optimization-0111",premiumBloomScale:0.88,
 lowMemoryBloomScale:0.78,hudHz:30,physicsChanged:false,
 postPassesAdded:0,fullResolutionBeauty:true,fullResolutionSmaa:true
});
const positive=n=>Number.isFinite(n)&&n>0?n:1;
export function bloomScaleFor({lowMemory=false,forceFullBloom=false}={}){
 return forceFullBloom?1:lowMemory?
  OPT_0111.lowMemoryBloomScale:OPT_0111.premiumBloomScale;
}
export function scaledBloomSize(width,height,scale){
 const s=Math.max(.5,Math.min(1,positive(scale)));
 return {width:Math.max(1,Math.round(positive(width)*s)),
  height:Math.max(1,Math.round(positive(height)*s))};
}
// EffectComposer's normal RenderPass, SMAAPass, tone mapping and output
// keep their current internal DPR; only UnrealBloomPass receives smaller
// dimensions for its downsampled blur texture chain.
export function tuneBloomPass(bloom,scale){
 if(!bloom||typeof bloom.setSize!=="function")
  throw Error("UnrealBloomPass.setSize required");
 const original=bloom.setSize.bind(bloom);
 const selected=Math.max(.5,Math.min(1,positive(scale)));
 let width=0,height=0,sourceWidth=0,sourceHeight=0;
 bloom.setSize=(w,h)=>{
  sourceWidth=w;sourceHeight=h;
  const scaled=scaledBloomSize(w,h,selected);
  width=scaled.width;height=scaled.height;
  original(width,height);
 };
 return {scale:selected,stats:()=>({
  scale:selected,sourceWidth,sourceHeight,bloomInputWidth:width,
  bloomInputHeight:height,
  bloomPixelFraction:+(selected*selected).toFixed(4),
  fullResolutionBeauty:true,fullResolutionSmaa:true,postPassesAdded:0
 })};
}
export function newHudBudget(hz=OPT_0111.hudHz){
 const interval=1000/Math.max(1,positive(hz));
 let last=-Infinity,updates=0,skips=0;
 return {shouldUpdate(now,force=false){
  if(force||now<last||now-last>=interval){
   last=now;updates++;return true;
  }
  skips++;return false;
 },reset(){last=-Infinity;updates=0;skips=0;},
 stats(){return {targetHz:1000/interval,updates,skips}}};
}
// No layout reads; skip redundant DOM writes and innerHTML reparsing.
export function createDomWriteCache(){
 let cache=new WeakMap(),writes=0,skips=0;
 function update(node,key,value,apply){
  if(!node)return;
  let props=cache.get(node);
  if(!props){props=new Map();cache.set(node,props)}
  if(props.get(key)===value){skips++;return}
  apply();props.set(key,value);writes++;
 }
 return {
  text(node,value){const v=String(value);update(node,"text",v,()=>node.textContent=v)},
  html(node,value){const v=String(value);update(node,"html",v,()=>node.innerHTML=v)},
  width(node,value){const v=String(value);update(node,"width",v,()=>node.style.width=v)},
  attr(node,name,value){const v=String(value);update(node,"attr:"+name,v,
   ()=>node.setAttribute(name,v))},
  property(node,name,value){const v=String(value);update(node,"prop:"+name,v,
   ()=>node.style.setProperty(name,v))},
  reset(){cache=new WeakMap();writes=0;skips=0},
  stats(){return {writes,skips}}
 };
}
