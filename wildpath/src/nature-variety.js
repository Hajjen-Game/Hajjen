// Wildpath Pass 6: deterministic, reusable visual variety for Nature Rebirth.
// This module intentionally has no Babylon or DOM dependency.
export const NATURE_PALETTES=Object.freeze({
  rose:Object.freeze({leaf:'#3ca97a',light:'#96d56e',petal:'#f875b7',accent:'#ff9fcf',glow:'#ffdc98',fx:0xf875b7}),
  lilac:Object.freeze({leaf:'#3e9f92',light:'#8dc3a0',petal:'#a17af2',accent:'#c395ff',glow:'#ceadff',fx:0xa17af2}),
  amber:Object.freeze({leaf:'#80ae46',light:'#cad65d',petal:'#ffac48',accent:'#ffcf56',glow:'#ffd36a',fx:0xffac48}),
  mint:Object.freeze({leaf:'#19ac7b',light:'#7ce59a',petal:'#a0f0a5',accent:'#b5ed65',glow:'#c9f77c',fx:0x7ce59a}),
  aqua:Object.freeze({leaf:'#1b9e9d',light:'#5fd4be',petal:'#5de0ec',accent:'#59dff0',glow:'#64e4e0',fx:0x5de0ec}),
  cream:Object.freeze({leaf:'#79ad61',light:'#b6d16d',petal:'#ffe196',accent:'#ffd878',glow:'#ffcf77',fx:0xffd77a}),
});
export const NATURE_PALETTE_IDS=Object.freeze(Object.keys(NATURE_PALETTES));
export const NATURE_VARIANTS=Object.freeze({
  flower:Object.freeze(['star','cluster','tall']),
  bush:Object.freeze(['round','wide','flowered']),
  tree:Object.freeze(['round','wide','tall','grove']),
  blossom:Object.freeze(['round','wide','tall','grand'])
});
export const NATURE_SCALE=Object.freeze({flower:1.12,bush:1.46,tree:1.77,blossom:2.12});
const SPECIES_OFFSET={mossling:0,bramble:1,ember:2,guardian:4};
export function chooseNatureLook(event,oldLook=null){
  const tier=event.tier in NATURE_VARIANTS?event.tier:'flower';
  const id=Math.max(1,Number.isFinite(event.id)?Math.floor(event.id):1);
  // Fresh sites cycle through ALL palettes, including repeated mossling kills.
  // Upgrading retains its established palette, preventing color flicker.
  const offset=SPECIES_OFFSET[event.species]??0;
  const palette=oldLook?.palette&&NATURE_PALETTES[oldLook.palette]
    ?oldLook.palette:NATURE_PALETTE_IDS[(id-1+offset)%NATURE_PALETTE_IDS.length];
  const variants=NATURE_VARIANTS[tier];
  const variant=variants[(id-1+offset)%variants.length];
  const variation=1+((id*7)%5-2)*.025;
  return {tier,palette,variant,scale:NATURE_SCALE[tier]*variation,
    fxColor:NATURE_PALETTES[palette].fx,rare:tier==='blossom'};
}
export function natureVisibility(distance,tier){
  if(tier!=='tree'&&tier!=='blossom')return 1;
  // Make large canopies fade when they would occlude the player.
  // Visibility is per-instance, so shared palette materials are unaffected.
  const radius=tier==='blossom'?6.2:5;
  const near=tier==='blossom'?.27:.35;
  return Math.max(near,Math.min(1,near+(distance-2.8)/(radius-2.8)*(1-near)));
}
