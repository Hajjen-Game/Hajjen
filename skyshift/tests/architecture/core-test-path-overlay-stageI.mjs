// Stage I: strictly reverse only the 15 approved runtime performance/fidelity source paths.
// Original historical unit test assertions and stored Git SHA expectations are unchanged.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const skyshift=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(skyshift,'core/stageI-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
if(names.length!==15)throw Error('Stage I core inventory unexpectedly changed');
export function restoreStageICoreReferences(contents){
 let source=contents;
 for(const name of names){
  source=source.split('../../core/'+name).join('../../'+name);
  source=source.split('../core/'+name).join('../'+name);
  source=source.split('./core/'+name).join('./'+name);
  source=source.split('skyshift/core/'+name).join('skyshift/'+name);
 }
 // Only this historical test's fixed-path regexp changed; its assertion is otherwise identical.
 source=source.split(String.raw`core\/frame-pacing-v044`).join('frame-pacing-v044');
 return source;
}
