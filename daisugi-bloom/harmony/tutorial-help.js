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
 svg.setAttribute("aria-label",kind+" illustrated mechanic "+variant);
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
 }else if(kind==="moon"){
  tile(svg,15,15,"green");tile(svg,60,15,"pink");
  tile(svg,110,15,"star",{glow:true});
  shape(svg,"rect",{x:153,y:15,width:43,height:43,rx:8,fill:"#7b899a",stroke:"#bfc9d4","stroke-width":2});
  shape(svg,"path",{d:"M175 20 L190 36 L175 52 L160 36 Z",fill:"#c1d8de",stroke:"#edf2e5","stroke-width":2});
  shape(svg,"path",{d:"M179 36 H215 M208 30 L216 36 L208 42",fill:"none",stroke:"#a97c4e","stroke-width":3,"stroke-linecap":"round"});
  tile(svg,219,15,"green",{glow:true,pulse:true});
 }else if(kind==="wind"){
  for(const x of [14,63,112])tile(svg,x,15,"green");
  for(const y of [19,32,45])
   shape(svg,"path",{d:"M160 "+y+" H230 m-9 -5 9 5 -9 5",fill:"none",stroke:"#7db0ba","stroke-width":2.2,opacity:.85});
  shape(svg,"text",{x:195,y:75,"text-anchor":"middle","font-size":10,fill:"#6f8190","font-weight":"700"},"ROW SHIFTS · 5 FAMILIES");
 }else if(kind==="lotus-intro"){
  // The crate is on the LAST row, while collection happens one square ABOVE
  // it. The diagram shows a cleared lane, not a rocket entering crate space.
  shape(svg,"text",{x:47,y:8,"text-anchor":"middle","font-size":9,fill:"#805b46","font-weight":700},"BEFORE");
  shape(svg,"text",{x:215,y:8,"text-anchor":"middle","font-size":9,fill:"#805b46","font-weight":700},"AFTER");
  for(const x of [28,196])for(const y of [12,32,52])
   shape(svg,"rect",{x,y,width:38,height:19,rx:4,fill:"#f3dfbc",stroke:"#b99670","stroke-width":1.1});
  // Rocket above two ordinary treasures.
  shape(svg,"path",{d:"M42 25 L47 14 L52 25 Z",fill:"#c95f4e",stroke:"#95483d","stroke-width":1.3});
  shape(svg,"path",{d:"M45 14 L47 9 L49 14",fill:"#e6b656"});
  shape(svg,"circle",{cx:47,cy:42,r:6,fill:"#c87692"});
  shape(svg,"rect",{x:32,y:56,width:30,height:13,rx:3,fill:"#8e5e3e",stroke:"#6c4736","stroke-width":1.4});
  shape(svg,"text",{x:47,y:65,"text-anchor":"middle","font-size":8,fill:"#f8deb0"},"花");
  arrow(svg,99,41);
  // Rocket delivered from the square immediately above its fixed crate.
  shape(svg,"path",{d:"M211 47 L215 34 L219 47 Z",fill:"#c95f4e",stroke:"#95483d","stroke-width":1.3});
  shape(svg,"rect",{x:200,y:56,width:30,height:13,rx:3,fill:"#8e5e3e",stroke:"#6c4736","stroke-width":1.4});
  shape(svg,"text",{x:215,y:65,"text-anchor":"middle","font-size":8,fill:"#f8deb0"},"花");
  shape(svg,"path",{d:"M215 32 V13 m-5 6 5 -6 5 6",fill:"none",stroke:"#d79b47","stroke-width":2.4,"stroke-linecap":"round"});
  for(const dx of [-10,0,10])shape(svg,"circle",{cx:215+dx,cy:12,r:2.5,fill:dx?"#d98870":"#d5ae54"});
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
  // A stage-five masterpiece emits to exactly four orthogonal neighbors,
  // not diagonals. Make this visible in the very first Pulse lesson.
  for(const x of [13,45,77]){
   shape(svg,"circle",{cx:x+10,cy:39,r:10,fill:"#cd7991",stroke:"#f5dec7","stroke-width":1.5});
  }
  arrow(svg,115,39);
  const cx=211,cy=39;
  for(const [x,y] of [[cx-28,cy],[cx+28,cy],[cx,cy-27],[cx,cy+27]]){
   shape(svg,"rect",{x:x-10,y:y-10,width:20,height:20,rx:5,
    fill:"#e4ceb0",stroke:"#ac8f6b","stroke-width":1.2});
   shape(svg,"circle",{cx:x,cy:y,r:6.5,fill:"#90afa2"});
   shape(svg,"path",{d:`M${cx+(x-cx)*.3} ${cy+(y-cy)*.3} L${cx+(x-cx)*.7} ${cy+(y-cy)*.7}`,
    fill:"none",stroke:"#c99c47","stroke-width":2.2,"stroke-linecap":"round"});
  }
  shape(svg,"circle",{cx,cy,r:13.5,fill:"#f2db9b",stroke:"#b68c54","stroke-width":1.6});
  shape(svg,"text",{x:cx,y:cy+6,"text-anchor":"middle","font-size":20,fill:"#bd863f"},"✦");
 }else if(kind==="stages"){
  tile(svg,15,15,"green");tile(svg,61,15,"green");tile(svg,107,15,"green");
  arrow(svg,160,36);tile(svg,208,15,"green",{glow:true});
  shape(svg,"text",{x:229,y:72,"text-anchor":"middle","font-size":11,fill:"#7e563d","font-weight":700},"STAGE 2");
 }else if(kind==="koi-finale"){
  // Two individual Koi reach stage five. Other families do not count.
  for(const cx of [55,122]){
   shape(svg,"ellipse",{cx,cy:32,rx:24,ry:12,fill:"#efdbc0",stroke:"#9c6857","stroke-width":1.6});
   shape(svg,"path",{d:`M${cx-19} 32 l-17 -13 v26 Z`,fill:"#bb6b57",stroke:"#9c6857","stroke-width":1.2});
   shape(svg,"path",{d:`M${cx-6} 22 q8 11 14 0 q-2 12 -14 19`,fill:"none",stroke:"#d98769","stroke-width":6,"stroke-linecap":"round"});
   shape(svg,"circle",{cx:cx+16,cy:29,r:2,fill:"#523d32"});
  }
  arrow(svg,163,36);
  for(const x of [212,247]){
   shape(svg,"circle",{cx:x,cy:35,r:14,fill:"#f3e0a9",stroke:"#bf8d4d","stroke-width":1.7});
   shape(svg,"text",{x,y:42,"text-anchor":"middle","font-size":20,fill:"#ae7e3d"},"★");
  }
  shape(svg,"text",{x:230,y:73,"text-anchor":"middle","font-size":10,fill:"#7e563d","font-weight":700},"2 KOI");
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
 moon:[["Fusion Resonance","A Fusion beside the mirror reflects one hit along its arrow."],
  ["Harmony Pulse","Masterpieces also send Pulse to neighbors, including mirrors."]],
 wind:[["Read the Wind","Every third successful move shifts the marked row. Five treasure families now share the board."],
  ["Plan a return","Treasures wrap across the row. Fixed board fixtures never shift."]],
 mist:[["1 · Fuse on Mist","Land a fusion on the misty tile to clear it."],["2 · Harmony Pulse","A neighboring stage-5 Pulse also removes Mist."]],
 daruma:[["1 · First hit","Fuse beside Daruma or reach it with Harmony Pulse."],["2 · Second hit","Hit again on a later move to complete both eyes."]],
 stone:[["1 · Break the seal","Hit the stone four times, at most once per move."],["2 · Awakening Pulse","The final hit sends energy to all eight neighbors."]],
 match:[["Match three","Swap neighboring pieces to line up three of one family."]],
 stages:[["Grow a treasure","A fusion creates a higher stage from the strongest piece."]],
 pulse:[["Create stage 5","A masterpiece sends Harmony Pulse to four neighboring tiles."]],
 "koi-finale":[["Two Koi masterpieces","Create two separate stage-5 Koi; only Koi count toward this objective."]],
 four:[["Four of a kind","A match of four counts once per turn. To reach a goal of two, make a four-object match on two different moves."]],
 families:[["Same family","Colors and stages can vary. Match pieces of one family."]],
 lantern:[["Lantern fusions","Match Lanterns across stages to advance your goal."]],
 "lantern-masterpiece":[["Build a Lantern masterpiece","Grow a Lantern to stage 5."]],
 "lantern-finale":[["Festival of Lights","Build two Lantern masterpieces to finish the chapter."]],
 "bamboo-intro":[["Closed garden cells","The shaded stones stay fixed. Fuse treasures beside them."]],
 "temple-gate":[["Narrow passages","Plan matches along the open paths of Temple Gate."]],
 "twin-gardens":[["Two garden wings","The open crossing connects the two sides."]],
 "central-shrine":[["Protected center","The shrine blocks matches through the middle."]],
 "bamboo-finale":[["Clear Mist around the shrine","Closed stones stay fixed. Fuse onto Mist or hit it with Harmony Pulse."]],
 "lotus-intro":[["Launch Hanabi fireworks","Clear the space beneath each firework. When it reaches the tile ABOVE its fixed crate, it drops inside. The board fills its empty squares before the firework upgrades its entire column and three more treasures in the upper three rows."]]
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
