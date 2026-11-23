// Root R1B: invert precisely the 20 historical test boot-reader path edits.
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../legacy/boot/R1B-migration-manifest.json',import.meta.url),'utf8'));
export function restoreR1BBootPaths(source){
 let out=source;
 for(const {name} of manifest.files)out=out.split('"./legacy/boot/'+name+'"').join('"./'+name+'"');
 return out;
}
