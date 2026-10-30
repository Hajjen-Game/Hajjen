/* Japanese Harmony · Tutorial Help Modal 1.0
 * Small, self-contained, SVG-based explanations of existing mechanics.
 * No canvas/assets, RNG, moves, rewards or board state are touched.
 */
(function(root){
"use strict";
const NS="http://www.w3.org/2000/svg";
function node(tag,cls,txt){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=txt;
 return el;
}
function shape(svg,tag,attrs,text){
 const el=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));
 if(text!==undefined)el.textContent=text;
 svg.append(el);return el;
}
function tile(svg,x,y,kind,opts={}){
 shape(svg,"rect",{x,y,width:43,height:43,rx:8,fill:"#f5e6c8",stroke:opts.glow?"#c46b49":"#c9a77e","stroke-width":opts.glow?2.5:1.5});
 if(kind==="stone"){
  shape(svg,"path",{d:`M${x+10} ${y+32} L${x+8} ${y+15} L${x+20} ${y+8} L${x+34} ${y+15} L${x+35} ${y+31} L${x+23} ${y+36} Z`,fill:"#8e8b8d",stroke:"#62595a","stroke-width":1.5});
  if(opts.crack)shape(svg,"path",{d:`M${x+20} ${y+9} l-3 11 7 4 -3 11`,fill:"none",stroke:"#4f4b50","stroke-width":1.8});
 }else if(kind==="daruma"){
  shape(svg,"ellipse",{cx:x+21.5,cy:y+24,rx:14,ry:17,fill:"#c75b50",stroke:"#903f38","stroke-width":1.5});
  shape(svg,"ellipse",{cx:x+21.5,cy:y+20,rx:10,ry:9,fill:"#f7dfbe"});
  shape(svg,"circle",{cx:x+17,cy:y+20,r:2.6,fill:opts.hits>=1?"#382a28":"#f7dfbe",stroke:"#382a28","stroke-width":1});
  shape(svg,"circle",{cx:x+26,cy:y+20,r:2.6,fill:opts.hits>=2?"#382a28":"#f7dfbe",stroke:"#382a28","stroke-width":1});
 }else if(kind==="star"){
  shape(svg,"text",{x:x+21.5,y:y+31,"text-anchor":"middle","font-size":29,fill:"#cb9751","font-family":"Georgia,serif"},"✦");
 }else{
  const color=kind==="pink"?"#c86b89":kind==="green"?"#5e9d87":"#ce845b";
  shape(svg,"circle",{cx:x+21.5,cy:y+21.5,r:12.5,fill:color,stroke:"#fff0d5","stroke-width":2});
  shape(svg,"path",{d:`M${x+15} ${y+19} Q${x+20} ${y+11} ${x+28} ${y+18}`,fill:"none",stroke:"#fff4e8","stroke-width":2.8,"stroke-linecap":"round",opacity:.75});
 }
 if(opts.mist){
  shape(svg,"ellipse",{cx:x+22,cy:y+27,rx:19,ry:11,fill:"#c4dce1",opacity:.78});
  shape(svg,"ellipse",{cx:x+16,cy:y+21,rx:12,ry:9,fill:"#f3f9f5",opacity:.80});
  shape(svg,"ellipse",{cx:x+29,cy:y+22,rx:10,ry:9,fill:"#d5e9e7",opacity:.85});
  shape(svg,"path",{d:`M${x+8} ${y+35} Q${x+22} ${y+31} ${x+36} ${y+35}`,stroke:"#9ab9c0",fill:"none","stroke-width":2,opacity:.75});
 }
 if(opts.pulse)shape(svg,"circle",{cx:x+21.5,cy:y+21.5,r:24,fill:"none",stroke:"#b97853","stroke-width":2,"stroke-dasharray":"3 5"});
}
function arrow(svg,x,y){
 shape(svg,"path",{d:`M${x} ${y} h22 m-7 -6 7 6 -7 6`,fill:"none",stroke:"#a25f4a","stroke-width":2.8,"stroke-linecap":"round","stroke-linejoin":"round"});
}
function hit(svg,x,y,count){
 shape(svg,"text",{x,y,"text-anchor":"middle","font-size":10,fill:"#92533d","font-family":"Arial,sans-serif","font-weight":"700"},count);
}
function picture(kind,variant){
 const svg=document.createElementNS(NS,"svg");
 svg.setAttribute("viewBox","0 0 270 81");svg.setAttribute("role","img");
 svg.setAttribute("aria-label",variant===1?"Example before and after the action":"Second illustrated example");
 svg.classList.add("jh-tutorial-svg");
 if(["bamboo-intro","temple-gate","twin-gardens","central-shrine","bamboo-finale"].includes(kind)){
  const B=root.HarmonyBoardMechanics;
  const rows=kind==="bamboo-intro"?[
   ".......",".......",".......","..#.#..",".......",".......","......."
  ]:kind==="temple-gate"?B?.PRESETS.templeGate:
   kind==="twin-gardens"?B?.PRESETS.twinGardens:B?.PRESETS.centralShrine;
  const size=9,originX=99,originY=5;
  if(rows)for(let r=0;r<7;r++)for(let c=0;c<7;c++){
   const wall=rows[r][c]==="#";
   shape(svg,"rect",{x:originX+c*size,y:originY+r*size,
    width:size-1,height:size-1,rx:1.6,
    fill:wall?"#827360":"#efd7b2",
    stroke:wall?"#675644":"#be9971","stroke-width":.6});
   if(!wall&&(r+c)%5===0)
    shape(svg,"circle",{cx:originX+c*size+size*.45,
     cy:originY+r*size+size*.45,r:2.0,fill:"#bf7f6b"});
  }
  shape(svg,"text",{x:135,y:78,"text-anchor":"middle",
   "font-size":9,fill:"#805b46","font-family":"Arial,sans-serif",
   "font-weight":"700"},"STONE TILES STAY CLOSED");
 }else if(kind==="mist"&&variant===1){
  [10,56,102].forEach((x,i)=>tile(svg,x,15,"pink",{mist:i===1,glow:i===1}));
  arrow(svg,158,36);tile(svg,208,15,"pink",{glow:true});
  shape(svg,"text",{x:229,y:73,"text-anchor":"middle","font-size":10,fill:"#5d7a60"},"CLEAR");
 }else if(kind==="mist"){
  tile(svg,16,15,"star",{pulse:true});tile(svg,69,15,"green",{mist:true});
  shape(svg,"path",{d:"M61 35 H68",stroke:"#d09e55","stroke-width":3,"stroke-linecap":"round"});
  arrow(svg,145,36);tile(svg,199,15,"green",{glow:true});
  shape(svg,"text",{x:220,y:73,"text-anchor":"middle","font-size":10,fill:"#5d7a60"},"CLEAR");
 }else if(kind==="daruma"){
  tile(svg,9,15,"pink");tile(svg,55,15,"daruma",{hits:0});
  arrow(svg,111,36);tile(svg,159,15,"daruma",{hits:variant===1?1:2,glow:true});
  hit(svg,180,73,variant===1?"HIT 1":"HIT 2");
 }else if(kind==="stone"){
  tile(svg,9,15,"pink");tile(svg,55,15,"stone",{crack:variant===2});
  arrow(svg,117,36);tile(svg,171,15,variant===2?"star":"stone",{crack:variant===1,glow:true,pulse:variant===2});
  hit(svg,191,73,variant===2?"AWAKENING":"4 HITS");
 }else if(kind==="pulse"){
  tile(svg,15,15,"pink");tile(svg,61,15,"pink");tile(svg,107,15,"pink");
  arrow(svg,159,36);tile(svg,207,15,"star",{pulse:true});
 }else if(kind==="stages"){
  tile(svg,15,15,"green");tile(svg,61,15,"green");tile(svg,107,15,"green");
  arrow(svg,160,36);tile(svg,208,15,"star");
 }else if(kind==="four"){
  [15,60,105,150].forEach(x=>tile(svg,x,15,"pink"));arrow(svg,204,36);
 }else if(kind==="families"||kind==="lantern"||kind==="lantern-masterpiece"||kind==="lantern-finale"){
  tile(svg,9,15,"pink");tile(svg,56,15,"green");tile(svg,103,15,"pink");
  arrow(svg,158,36);tile(svg,207,15,kind==="lantern-masterpiece"||kind==="lantern-finale"?"star":"pink",{glow:true});
 }else{
  tile(svg,15,15,"pink");tile(svg,61,15,"pink");tile(svg,107,15,"pink");
  arrow(svg,160,36);tile(svg,208,15,"pink",{glow:true});
 }
 return svg;
}
const EXAMPLES=Object.freeze({
 mist:[["1 · Fuse on Mist","Land a fusion on the misty tile to clear it."],["2 · Harmony Pulse","A neighboring stage-5 Pulse also removes Mist."]],
 daruma:[["1 · First hit","Fuse beside Daruma or reach it with Harmony Pulse."],["2 · Second hit","Hit again on a later move to complete both eyes."]],
 stone:[["1 · Break the seal","Hit the stone four times, at most once per move."],["2 · Awakening Pulse","The final hit sends energy to all eight neighbors."]],
 match:[["Match three","Swap neighboring pieces to line up three of one family."]],
 stages:[["Grow a treasure","A fusion creates a higher stage from the strongest piece."]],
 pulse:[["Create stage 5","A masterpiece sends Harmony Pulse to four neighboring tiles."]],
 four:[["Make four of a kind","Match four objects on separate moves for this goal."]],
 families:[["Same family","Colors and stages can vary. Match pieces of one family."]],
 lantern:[["Lantern fusions","Match Lanterns across stages to advance your goal."]],
 "lantern-masterpiece":[["Build a Lantern masterpiece","Grow a Lantern to stage 5."]],
 "lantern-finale":[["Festival of Lights","Build two Lantern masterpieces to finish the chapter."]],
 "bamboo-intro":[["Closed garden cells","The shaded stones stay fixed. Fuse treasures beside them."]],
 "temple-gate":[["Narrow passages","Plan matches along the open paths of Temple Gate."]],
 "twin-gardens":[["Two garden wings","The open crossing connects the two sides."]],
 "central-shrine":[["Protected center","The shrine blocks matches through the middle."]],
 "bamboo-finale":[["Clear Mist around the shrine","Closed stones stay fixed. Fuse onto Mist or hit it with Harmony Pulse."]]
});
function render(lesson){
 const kind=EXAMPLES[lesson?.key]?lesson.key:"match";
 const section=node("section","jh-tutorial",""),intro=node("p","jh-tutorial-intro",lesson?.short||"Match treasures to complete the level goal.");
 section.dataset.lesson=kind;
 section.append(intro);
 const examples=node("div","jh-tutorial-examples");
 EXAMPLES[kind].forEach(([title,description],i)=>{
  const card=node("figure","jh-tutorial-example");
  card.append(node("figcaption","jh-tutorial-example-title",title),picture(kind,i+1),
   node("p","jh-tutorial-example-copy",description));
  examples.append(card);
 });
 section.append(examples);
 section.append(node("p","jh-tutorial-reminder","You can open this guide again with the ? beside GOAL."));
 return section;
}
const api=Object.freeze({EXAMPLES,render});
root.HarmonyTutorialHelp=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
