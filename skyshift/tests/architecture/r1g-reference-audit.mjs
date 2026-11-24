// R1G: read-only, exhaustive tracked-reference audit. No repository mutation.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='skyshift', base='ab926746c1a356d8f2a9c079968e7e65dc804901';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});
const sha=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')};
const read=p=>readFileSync(p,'utf8');
const rootFiles=readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile()).map(x=>x.name);
assert.equal(rootFiles.length,328);
const held=new Set(['game-v0101.mjs','game-v0103.mjs','game-v0203.mjs','game-v0210.mjs']);
const candidates=rootFiles.filter(n=>/^game-v\d+\.mjs$/.test(n)&&!held.has(n)).sort();
assert.equal(candidates.length,43);
const baseline=JSON.parse(read(root+'/docs/architecture/root-baseline-2026-11-23.json'));
for(const name of ['index.html','boot-v0210.js','game-v0210.mjs','material-grade-v0203.html','game-v0101.mjs','game-v0103.mjs','boot-v0101.js','boot-v0103.js','game-v0203.mjs']){
 const p=root+'/'+name;assert.equal(sha(read(p)),git('rev-parse',base+':'+p).trim(),'Unexpected baseline change '+p);
}
const tracked=git('ls-files','-z').split('\0').filter(Boolean);
const relevant=tracked.filter(p=>p.startsWith('skyshift/')||p.startsWith('.github/workflows/')).filter(p=>/\.(?:mjs|js|cjs|ts|html|css|json|md|ya?ml|sh|py|txt)$/.test(p));
const dynamic=[];
for(const p of relevant){
 if(/\.(?:md|json)$/.test(p)||p.includes('r1g-reference-audit'))continue;
 const lines=read(p).split('\n');
 for(let i=0;i<lines.length;i++){
  const l=lines[i];
  if(/game-v/.test(l)&&(/game-v.*(?:\$\{|['"]\s*\+|\\d|\[\^|[?*])/.test(l)||/game-v['"]/.test(l)))dynamic.push({path:p,line:i+1,text:l.trim().slice(0,240)});
 }
}
const importPattern=/(\bfrom\s*["']|\bimport\s*["']|\bimport\s*\(\s*["'])\.\/([^"']+)/g;
const result=[];
for(const name of candidates){
 const oldPath=root+'/'+name,newPath=root+'/legacy/game/'+name,source=read(oldPath);
 const originalGitBlobSha=sha(source), issues=[], dependencies=[];
 assert.equal(originalGitBlobSha,git('rev-parse',base+':'+oldPath).trim());
 assert.equal(originalGitBlobSha,baseline.entries.find(e=>e.path===oldPath)?.sha,'R0 baseline mismatch '+name);
 if(source.includes('import.meta.url'))issues.push('import.meta.url requires a separate asset audit');
 for(const l of source.split('\n').filter(l=>/\bnew\s+URL\s*\(/.test(l))){
  if(!/\bnew\s+URL\s*\(\s*(?:window\.)?location\.href\s*\)/.test(l))issues.push('Review URL expression: '+l.trim().slice(0,160));
 }
 for(const m of source.matchAll(importPattern)){
  const target=m[2].split(/[?#]/)[0];
  const original=resolve(root,target),rebased=resolve(dirname(newPath),'../../'+target);
  if(original!==rebased||!existsSync(original))issues.push('Unresolved import: '+target);
  dependencies.push(target);
 }
 if(dependencies.length<10)issues.push('Too few static imports found');
 if(/(?:\bfrom\s*["']|\bimport\s*["']|\bimport\s*\(\s*["'])\.\.\//.test(source))issues.push('Parent-relative import needs explicit resolution');
 if(/\bimport\s*\(\s*(?!["'])/.test(source))issues.push('Computed dynamic import requires review');
 const transformed=source.replace(importPattern,'$1../../$2');
 const restored=transformed.replace(/(\bfrom\s*["']|\bimport\s*["']|\bimport\s*\(\s*["'])\.\.\/\.\.\//g,'$1./');
 if(sha(restored)!==originalGitBlobSha)issues.push('Import rebase is not reversible');
 let grep='';
 try{grep=git('grep','-n','-I','-F','-e',name,'--','.');}catch(e){if(e.status!==1)throw e}
 const refs=[];
 for(const line of grep.split('\n').filter(Boolean)){
  const m=line.match(/^([^:]+):(\d+):(.*)$/);if(!m){issues.push('Unparsed grep result');continue}
  const [,path,num,body]=m; if(path.includes('r1g-reference-audit'))continue;
  let kind='manual-review',replacement=null;
  if(path===oldPath){kind='self';if(body.includes(name))issues.push('Self-reference at '+path+':'+num)}
  else if(/\.md$/.test(path)||(/\.json$/.test(path)&&/(?:manifest|inventory|baseline|queue)/i.test(path))){kind='historical-record'}
  else if(path.startsWith(root+'/legacy/boot/')&&body.includes('import("../../'+name)){
   kind='archived-boot';replacement=body.split('import("../../'+name).join('import("../game/'+name);
  }else if(path.startsWith(root+'/tests/unit/')&&path.endsWith('.test.mjs')){
   let after=body;
   for(const [a,b] of [['../../'+name,'../../legacy/game/'+name],['./'+name,'./legacy/game/'+name],[name,'legacy/game/'+name]]){
    for(const q of ['"',"'"])after=after.split(q+a+q).join(q+b+q);
   }
   if(after!==body&&after.split('legacy/game/'+name).join('').indexOf(name)===-1){kind='unit-reader';replacement=after}
  }else if(path==='.github/workflows/skyshift-tests.yml'&&body.includes('node --check '+oldPath)){
   kind='syntax-check';replacement=body.split('node --check '+oldPath).join('node --check '+newPath);
  }
  if(kind==='manual-review')issues.push('Unclassified reference '+path+':'+num);
  refs.push({path,line:Number(num),kind,text:body.trim().slice(0,350),...(replacement!==null?{replacement}: {})});
 }
 if(refs.filter(r=>r.kind==='archived-boot').length!==1)issues.push('Expected exactly one archived bootstrap import');
 if(refs.filter(r=>r.kind==='syntax-check').length!==1)issues.push('Expected exactly one syntax-check path');
 result.push({name,oldPath,newPath,originalGitBlobSha,rebasedGitBlobSha:sha(transformed),dependencies,refs,issues,eligible:issues.length===0});
}
const eligible=result.filter(r=>r.eligible);
const report={base,rootBefore:328,rootAfterIfEligibleMoved:328-eligible.length,held:[...held],candidates:result,dynamicPatterns:dynamic};
writeFileSync('r1g-audit.json',JSON.stringify(report,null,2)+'\n');
console.log('R1G_COUNTS '+JSON.stringify({before:328,candidates:result.length,eligible:eligible.length,after:328-eligible.length,held:[...held],dynamicPatterns:dynamic.length}));
for(const r of result)console.log('R1G_FILE '+JSON.stringify({name:r.name,eligible:r.eligible,sha:r.originalGitBlobSha,refs:r.refs.filter(x=>x.kind!=='historical-record').map(x=>[x.kind,x.path,x.line]),issues:r.issues}));
for(const d of dynamic)console.log('R1G_DYNAMIC '+JSON.stringify(d));
console.log('Audit only: the eligible count is provisional until dynamic patterns, previous architecture guards, and complete PR checks have been reconciled. No source files moved.');
