// Wildpath Pass 6: deterministic, reusable visual variety for Nature Rebirth.
// This module intentionally has no Babylon or DOM dependency.
export const NATURE_PALETTES=Object.freeze({
  rose:Object.freeze({leaf:'#7b9c78',light:'#9fb68b',petal:'#eaa6c2',accent:'#f9d0df',glow:'#fff0e8',fx:0xeaa6c2}),
  lilac:Object.freeze({leaf:'#788e87',light:'#9ea7a2',petal:'#b6a0df',accent:'#d7c9f5',glow:'#f0e6ff',fx:0xb6a0df}),
  amber:Object.freeze({leaf:'#89986c',light:'#bdad79',petal:'#efa575',accent:'#ffd19c',glow:'#fff1ce',fx:0xf1ad75}),
  mint:Object.freeze({leaf:'#64a18b',light:'#9ec4a0',petal:'#bce0bd',accent:'#def4c8',glow:'#f0ffdf',fx:0xb2e2be}),
  aqua:Object.freeze({leaf:'#629c97',light:'#92bcb0',petal:'#9bd9d3',accent:'#caf1e7',glow:'#eafff7',fx:0x9bd9d3}),
  cream:Object.freeze({leaf:'#829d7a',light:'#a7b88b',petal:'#eed9a6',accent:'#fff2c7',glow:'#ffffe9',fx:0xf3dfa8})
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
