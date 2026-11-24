// SKYSHIFT R1D — path-only inverse of the 22 archival bootstrap migrations.
// Earlier 0.13.4 and 0.4.9 regex assertions are kept intact after inverse restore.
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../legacy/boot/R1D-migration-manifest.json',import.meta.url),'utf8'));
export function restoreR1DBootPaths(source){
 let out=source;
 for(const {name} of manifest.files){
  out=out.split('"./legacy/boot/'+name+'"').join('"./'+name+'"');
  out=out.split("'./legacy/boot/"+name+"'").join("'./"+name+"'");
  out=out.split('"legacy/boot/'+name+'"').join('"'+name+'"');
  out=out.split("'legacy/boot/"+name+"'").join("'"+name+"'");
 }
 for(const v of manifest.importRegexVersions){
  out=out.split("import\\(\"\\.\\.\\/\\.\\.\\/game-v"+v).join("import\\(\"\\.\\/game-v"+v);
 }
 return out;
}
