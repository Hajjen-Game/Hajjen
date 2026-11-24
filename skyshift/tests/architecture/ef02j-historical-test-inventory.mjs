// Temporary EF02J read-only evidence collection; no automatic retirements.
import {execFileSync} from 'node:child_process';
import {readFileSync,statSync} from 'node:fs';
import {resolve,relative,basename,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {extractLiteralReferences,resolveLocalReference} from './dependency-inventory-v2.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url)),root=resolve(repo,'skyshift');
const norm=p=>p.split('\\').join('/');
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024});
const all=git('ls-files','-z').split('\0').filter(Boolean).sort();
const set=new Set(all),code=all.filter(p=>p.startsWith('skyshift/')&&/\.(?:js|mjs|html|css)$/.test(p));
const text=all.filter(p=>/\.(?:mjs|js|cjs|ts|html|css|json|ya?ml|sh|py|txt|md|gltf)$/.test(p));
const cache=new Map(text.map(p=>[p,readFileSync(resolve(repo,p),'utf8')]));
const workflows=text.filter(p=>p.startsWith('.github/workflows/'));
const units=code.filter(p=>p.startsWith('skyshift/tests/unit/')&&p.endsWith('.test.mjs'));
const arch=code.filter(p=>p.startsWith('skyshift/tests/architecture/')&&p.endsWith('.test.mjs'));
const qa=code.filter(p=>p.startsWith('skyshift/tests/')||/\/browser-[^/]+\.mjs$/.test(p));
const edges=new Map();
const unresolved=new Map();
for(const p of code){
 const refs=extractLiteralReferences(cache.get(p),extname(p)),targets=[],missing=[];
 for(const spec of refs){
  const dest=resolveLocalReference(root,resolve(repo,p),spec);
  if(!dest)continue;
  const q=norm(relative(repo,dest));
  if(set.has(q))targets.push(q);else missing.push(spec);
 }
 edges.set(p,[...new Set(targets)]);unresolved.set(p,[...new Set(missing)]);
}
function closure(roots){
 const seen=new Set(),todo=[...roots];
 while(todo.length){const p=todo.pop();if(seen.has(p))continue;seen.add(p);todo.push(...(edges.get(p)||[]));}
 return seen;
}
const live=closure(['skyshift/index.html']);
const comparisonRoots=code.filter(p=>p.endsWith('.html')&&p!=='skyshift/index.html');
const comparison=closure(comparisonRoots);
const testRoots=[...new Set([...units,...arch,...qa])];
const testReach=new Map(testRoots.map(p=>[p,closure([p])]));
function workflowRefs(p){
 const out=[];
 for(const w of workflows){
  const lines=cache.get(w).split('\n'),matches=[];
  for(let i=0;i<lines.length;i++)if(lines[i].includes(p)||lines[i].includes(basename(p)))matches.push({line:i+1,text:lines[i].trim().slice(0,220)});
  if(matches.length)out.push({path:w,matches});
 }
 return out;
}
function literalConsumers(p){
 const name=basename(p),stem=name.replace(/\.(mjs|js|css|html)$/,'');
 return text.filter(q=>q!==p&&(cache.get(q).includes(name)||cache.get(q).includes(stem))).map(q=>({path:q,kind:q.startsWith('.github/')?'workflow':q.startsWith('skyshift/docs/')||q.endsWith('.md')?'documentation':q.startsWith('skyshift/tests/architecture/')?'architecture':q.startsWith('skyshift/tests/')?'test':'other'}));
}
function dynamicHints(s){
 return s.split('\n').map((line,i)=>({line:i+1,text:line.trim().slice(0,180)})).filter(x=>/\b(?:import\s*\(\s*[^"'\s]|new\s+URL\s*\(|readFileSync\s*\(|readHistorical\s*\(|fetch\s*\(|execFileSync\s*\(|page\.evaluate\s*\(|import\.meta\.url|import\.meta\.glob)/.test(x.text));
}
function testRow(p){
 const s=cache.get(p),deps=edges.get(p)||[];
 return {path:p,bytes:statSync(resolve(repo,p)).size,workflowRefs:workflowRefs(p),testDeclarations:s.split('\n').map((line,i)=>({line:i+1,text:line.trim().slice(0,220)})).filter(x=>/\b(?:test|it|describe)\s*\(/.test(x.text)),assertionLines:s.split('\n').filter(x=>/\bassert\./.test(x)).length,directDeps:deps,liveDeps:deps.filter(q=>live.has(q)),comparisonDeps:deps.filter(q=>comparison.has(q)),missingLiteralRefs:unresolved.get(p),dynamicHints:dynamicHints(s),disposition:'unresolved-retain-until-reviewed'};
}
const candidates=code.filter(p=>/\.(mjs|js)$/.test(p)&&!p.startsWith('skyshift/tests/')&&!live.has(p)&&!comparison.has(p));
const rows=candidates.map(p=>{
 const owners=testRoots.filter(q=>testReach.get(q).has(p));
 return {path:p,bytes:statSync(resolve(repo,p)).size,testOwners:owners,literalConsumers:literalConsumers(p),dynamicHints:dynamicHints(cache.get(p)),unresolvedLiteralRefs:unresolved.get(p),disposition:'unresolved-retain-until-reviewed'};
});
console.log('SKYSHIFT_EF02J_SUMMARY '+JSON.stringify({commit:git('rev-parse','HEAD').trim(),unitTests:units.length,architectureTests:arch.length,qaFiles:qa.length,workflows:workflows.length,liveLiteralReach:live.size,comparisonRoots,comparisonLiteralReach:comparison.size,nonLiveNonComparisonCodeCandidates:rows.length,warning:'Literal graph and basename/stem evidence only. Workflow matches include syntax and metadata, not necessarily executed tests. Computed paths, archive reads, browser document-relative imports, workflow globs, external links and behavior equivalence need review. No candidate is approved for deletion.'}));
for(const p of [...units,...arch])console.log('SKYSHIFT_EF02J_TEST '+JSON.stringify(testRow(p)));
for(const row of rows)console.log('SKYSHIFT_EF02J_SOURCE '+JSON.stringify(row));
