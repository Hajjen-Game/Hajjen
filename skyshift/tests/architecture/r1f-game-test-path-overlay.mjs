// SKYSHIFT R1F — reverse only audited game-file reader paths and boot game-target rebases.
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../legacy/game/R1F-migration-manifest.json',import.meta.url),'utf8'));
export function restoreR1FGamePaths(source){
 let out=source;
 for(const {name} of manifest.files){
  for(const [a,b] of [
   ['../../legacy/game/'+name,'../../'+name],
   ['./legacy/game/'+name,'./'+name],
   ['legacy/game/'+name,name]
  ]){
   out=out.split('"'+a+'"').join('"'+b+'"');
   out=out.split("'"+a+"'").join("'"+b+"'");
  }
 }
 return out;
}
export function restoreR1FBootImport(source){
 let out=source;
 for(const {version} of manifest.bootstraps){
  out=out.split('import("../game/game-v'+version+'.mjs').join('import("../../game-v'+version+'.mjs');
 }
 return out;
}
