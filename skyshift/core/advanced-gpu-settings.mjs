// SKYSHIFT 0.29.3.1: separate reversible experiments from fixed graphics.
export const ADVANCED_GPU_KEY="skyshift-advanced-gpu-02931";
export const BLOOM_CHOICES=Object.freeze(["original","0.78","0.65","0.50"]);
export function normalizeAdvancedGpu(value={}){
 return {bloom:BLOOM_CHOICES.includes(value?.bloom)?value.bloom:"0.78",
  exterior:value?.exterior===true,detailLod:value?.detailLod===true,
  occlusion:value?.occlusion===true};
}
export function readAdvancedGpu(storage){
 let value={};try{value=JSON.parse(storage?.getItem(ADVANCED_GPU_KEY)||"{}");}catch{}
 return normalizeAdvancedGpu(value);
}
export function saveAdvancedGpu(storage,value){
 try{storage?.setItem(ADVANCED_GPU_KEY,JSON.stringify(normalizeAdvancedGpu(value)));}catch{}
}
export function resolveBloomScale(choice,original){
 return choice==="original"||!BLOOM_CHOICES.includes(choice)?original:Math.min(original,Number(choice));
}
