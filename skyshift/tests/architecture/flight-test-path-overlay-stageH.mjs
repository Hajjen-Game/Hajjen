// Stage H path-only reversible overlay: original Stage 5–8 test SHAs remain unchanged.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const skyshift=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(skyshift,'flight/stageH-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
if(names.length!==18)throw Error('Stage H flight inventory has changed');
export function restoreStageHFlightReferences(contents){
 let source=contents;
 for(const name of names){
  source=source.split('../../flight/'+name).join('../../'+name);
  source=source.split('../flight/'+name).join('../'+name);
  source=source.split('./flight/'+name).join('./'+name);
  source=source.split('skyshift/flight/'+name).join('skyshift/'+name);
 }
 return source;
}
