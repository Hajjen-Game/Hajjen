/* Daisugi Bloom 1.3 — 20 existing PNG illustrations packed as 4 transparent WebP atlases.
 * Each family atlas has five 176×176 cells, left to right: frö/grodd/blomma/buske/träd.
 * All art is pre-rendered from the player's selected Japanese-garden image sets.
 * Do not use these textures in the permanent Daisugi's freely adjustable 3D tree view.
 */
(function () {
  "use strict";
  var names=["sakura","verdant","mistbloom","sunleaf"];
  var atlas={};
  names.forEach(function(name){atlas[name]="./assets/plants/"+name+"-atlas.webp";});
  function entry(family,stage){
    if(!atlas[family]||!Number.isInteger(stage)||stage<1||stage>5)return null;
    return {family:family,stage:stage,url:atlas[family],u0:(stage-1)/5,u1:stage/5,v0:0,v1:1};
  }
  window.DaisugiPlantArt={families:names,atlas:atlas,entry:entry,tileSize:176,version:"1.3"};
})();