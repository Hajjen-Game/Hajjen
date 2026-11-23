// Stage M — strictly invert historical unit-test path changes for original Git blobs.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(root,'world/stageM-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
if(names.length!==16)throw Error('Unexpected Stage M world inventory');
export function restoreStageMPaths(contents){
 let result=contents;
 for(const name of names){
  const relativeTarget=manifest.files[name].destination.slice('skyshift/'.length);
  for(const prefix of ['../../','../','./'])
   result=result.split(prefix+relativeTarget).join(prefix+name);
  result=result.split('skyshift/'+relativeTarget).join('skyshift/'+name);
 }
 result=result.split(String.raw`world\/authoring\/build-station-world-v020`).join('build-station-world-v020');
 result=result.split(String.raw`world\/environment-art-pipeline-v020`).join('environment-art-pipeline-v020');
 for(const prefix of ['"',"'"]){
  result=result.split(prefix+'world/environment-art-pipeline-v020').join(prefix+'environment-art-pipeline-v020');
  result=result.split(prefix+'world/authoring/build-station-world-v020').join(prefix+'build-station-world-v020');
 }
 return result;
}
