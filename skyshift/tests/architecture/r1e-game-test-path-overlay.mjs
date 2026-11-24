// SKYSHIFT R1E: undo only game-file reader paths and equivalent historical bootstrap URL assertions.
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../legacy/game/R1E-migration-manifest.json',import.meta.url),'utf8'));
export function restoreR1EGamePaths(source){
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
 for(const {version} of manifest.bootstraps){
  const rebased=String.raw`import\("\.\.\/game\/game-v`+version;
  const previous=String.raw`import\("\.\.\/\.\.\/game-v`+version;
  out=out.split(rebased).join(previous);
 }
 return out;
}
