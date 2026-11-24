// Read-only inventory for larger coherent root moves. No filename alone proves safety.
// This reports actual tracked and pinned historical source references; no edits or deletes.
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {retirement,retirementL1B,retirementL1C,retirementL1D,retirementL1E,retirementL1F,retirementEF02E,readHistorical} from './legacy-retirement-l1a.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const entries=execFileSync('git',['ls-files','--stage','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean).map(row=>{
 const match=row.match(/^\d+ ([0-9a-f]+) 0\t(.+)$/s);
 if(!match)throw Error('Unexpected index entry '+row);
 return {path:match[2],sha:match[1]};
});
const candidates=entries.filter(f=>/^skyshift\/(?:trial|smooth-track|premium-track|track-3d|circuit-layout)-v\d+\.mjs$/.test(f.path)).map(f=>({...f,target:'skyshift/tracks/shared/'+basename(f.path),consumers:[],metadataRefs:0}));
const byName=new Map(candidates.map(f=>[basename(f.path),f]));
const escaped=[...byName.keys()].map(s=>s.replaceAll('.','\\.'));
const pattern=new RegExp('(?:'+escaped.join('|')+')','g');
const textFile=p=>/\.(?:mjs|js|cjs|ts|html|css|json|yml|yaml|sh|py|txt|md)$/.test(p);
function scan(path,source,sha,archive=false){
 const hits=new Map();
 for(const match of source.matchAll(pattern)){
  const name=match[0];
  if(!hits.has(name))hits.set(name,[]);
  const start=source.lastIndexOf('\n',match.index)+1;
  const end=source.indexOf('\n',match.index);
  const line=source.slice(start,end<0?source.length:end);
  const snippet=line.length>260?line.slice(Math.max(0,match.index-start-100),match.index-start+name.length+100):line.trim();
  const refs=hits.get(name);
  if(!refs.includes(snippet))refs.push(snippet);
 }
 for(const [name,lines] of hits){
  const item=byName.get(name);
  if(path===item.path&&!archive)continue;
  const metadata=!archive&&(/\.md$/.test(path)||/migration-manifest|baseline|consumer-inventory|consumer-queue/.test(path)||path.startsWith('skyshift/docs/architecture/'));
  if(metadata){item.metadataRefs++;continue;}
  const kind=archive?'pinned-archive':path.startsWith('.github/')?'workflow':path.startsWith('skyshift/tests/architecture/')?'architecture':path.startsWith('skyshift/tests/')?'test-or-qa':'source';
  item.consumers.push({path,sha,kind,count:lines.length,examples:lines.slice(0,3)});
 }
}
for(const f of entries)if((f.path.startsWith('skyshift/')||f.path.startsWith('.github/'))&&textFile(f.path)&&existsSync(resolve(repo,f.path)))scan(f.path,readFileSync(resolve(repo,f.path),'utf8'),f.sha);
for(const f of [...retirement.files,...retirementL1B.files,...retirementL1C.files,...retirementL1D.files,...retirementL1E.files,...retirementL1F.files,...retirementEF02E.files])scan(f.path,readHistorical(resolve(repo,f.path)),f.sha,true);
const summary={count:candidates.length,rootFiles:entries.filter(f=>/^skyshift\/[^/]+$/.test(f.path)).length,collision:candidates.filter(f=>existsSync(resolve(repo,f.target))).map(f=>f.target),warning:'Literal basename census only. Review computed imports, path-sensitive assets, historical assertions and equivalent resolved URLs before moving.'};
console.log('SKYSHIFT_BULK_ROOT_SUMMARY '+JSON.stringify(summary));
for(const f of candidates)console.log('SKYSHIFT_BULK_ROOT_CANDIDATE '+JSON.stringify(f));
