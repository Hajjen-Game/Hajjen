// SKYSHIFT R1C: exactly invert 20 reader path edits and the four UI
// assertion path adjustments, so prior original-Git-SHA guards stay strict.
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../legacy/boot/R1C-migration-manifest.json',import.meta.url),'utf8'));
export function restoreR1CBootPaths(source){
 let out=source;
 for(const {name} of manifest.files)out=out.split('"./legacy/boot/'+name+'"').join('"./'+name+'"');
 for(const n of manifest.uiFlowVersions){
  const newPattern=String.raw`assert.match(boot,/import\("\.\.\/\.\.\/game-v`+n;
  const oldPattern=String.raw`assert.match(boot,/import\("\.\/game-v`+n;
  out=out.split(newPattern).join(oldPattern);
 }
 return out;
}
