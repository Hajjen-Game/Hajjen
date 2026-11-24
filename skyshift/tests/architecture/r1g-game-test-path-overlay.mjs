// R1G exact inverse of approved source-reader paths and archived boot target updates.
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../legacy/game/R1G-migration-manifest.json',import.meta.url),'utf8'));
export function restoreR1GGamePaths(source){
 let out=source;
 for(const {name,version} of manifest.files){
  for(const [a,b] of [['../../legacy/game/'+name,'../../'+name],['./legacy/game/'+name,'./'+name],['legacy/game/'+name,name]])for(const q of ['"',"'"])out=out.split(q+a+q).join(q+b+q);
  out=out.split("\\.\\.\\/game\\/game-v"+version+'\\.mjs').join("\\.\\.\\/\\.\\.\\/game-v"+version+'\\.mjs');
 }
 return out;
}
export function restoreR1GBootImport(source){
 let out=source;
 for(const {version} of manifest.bootstraps)out=out.split('import("../game/game-v'+version+'.mjs').join('import("../../game-v'+version+'.mjs');
 return out;
}
