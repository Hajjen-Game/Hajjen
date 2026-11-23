// Stage N — restore ONLY the tested ship HERO path changes for original unit-test Git blobs.
// Source assertions and their original immutable hashes must remain unchanged.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(root,'ships/stageN-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
if(names.length!==16)throw Error('Stage N expects exactly 16 ship HERO modules');
export function restoreStageNPaths(source){
 let out=source;
 for(const name of names){
  const dest='ships/'+name;
  for(const prefix of ['../../','../','./'])out=out.split(prefix+dest).join(prefix+name);
  out=out.split('skyshift/'+dest).join('skyshift/'+name);
 }
 // Restore only the previously literal tested runtime glTF assetPath values.
 out=out.replaceAll('"../assets/ships/stingray-evo-hero-','"./assets/ships/stingray-evo-hero-');
 return out;
}
