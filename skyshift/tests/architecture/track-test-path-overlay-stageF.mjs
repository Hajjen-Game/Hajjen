// Stage F additive source-path overlay for original Stage 5–8 immutable
// historical test SHA verification. Only 4 explicitly approved modules.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const skyshift=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(skyshift,'tracks/shared/stageF-migration-manifest.json'),'utf8'));
const files=manifest.files;
if(Object.keys(files).length!==4)throw Error('Stage F track migration count drift');
export function restoreStageFTrackReferences(contents){
 let source=contents;
 for(const [name,cfg] of Object.entries(files)){
  const relativeTarget=cfg.targetPath.slice('skyshift/'.length);
  source=source.split('../../'+relativeTarget).join('../../'+name);
  source=source.split('./'+relativeTarget).join('./'+name);
 }
 return source;
}
