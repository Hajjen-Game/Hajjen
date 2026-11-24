// Deterministic R1G migration from audited R1F baseline. Run only in the dedicated migration checkout.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='skyshift',arch=root+'/tests/architecture/',base='ab926746c1a356d8f2a9c079968e7e65dc804901';
const read=p=>readFileSync(p,'utf8'),write=(p,s)=>writeFileSync(p,s,'utf8'),git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:64*1024*1024});
const sha=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')};
assert.equal(git('rev-parse','HEAD').trim(),base);
assert.equal(git('status','--porcelain').trim(),'');
const direct=()=>readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>e.name);
assert.equal(direct().length,328);
const held=['0101','0103','0191','0203','0210'].map(v=>'game-v'+v+'.mjs');
const names=direct().filter(n=>/^game-v\d+\.mjs$/.test(n)&&!held.includes(n)).sort();
assert.equal(names.length,42);
const baseline=JSON.parse(read(root+'/docs/architecture/root-baseline-2026-11-23.json'));
const prior=JSON.parse(read(root+'/legacy/game/R1F-migration-manifest.json'));
const imports=/(\bfrom\s*["']|\bimport\s*["']|\bimport\s*\(\s*["'])\.\/([^"']+)/g;
const inverseImports=/(\bfrom\s*["']|\bimport\s*["']|\bimport\s*\(\s*["'])\.\.\/\.\.\//g;
const literalPairs=name=>[['../../'+name,'../../legacy/game/'+name],['./'+name,'./legacy/game/'+name],[name,'legacy/game/'+name]];
const regexOld=String.raw`\.\.\/\.\.\/game-v`,regexNew=String.raw`\.\.\/game\/game-v`;
function transformReader(s,reverse=false){for(const name of names){for(const [a,b] of literalPairs(name)){for(const q of ['"',"'"])s=s.split(q+(reverse?b:a)+q).join(q+(reverse?a:b)+q)}const v=name.slice(6,-4);s=s.split((reverse?regexNew:regexOld)+v+'\\.mjs').join((reverse?regexOld:regexNew)+v+'\\.mjs')}return s}
const manifest={schemaVersion:1,stage:'R1G — later historical game snapshots',baseCommit:base,previousRootFiles:328,expectedRootFiles:286,active:prior.active,held:[],files:[],tests:[],bootstraps:[]};
for(const name of held){const path=root+'/'+name;manifest.held.push({path,sha:sha(read(path))})}
for(const name of ['index.html','boot-v0210.js','boot-v0101.js','boot-v0103.js','material-grade-v0203.html']){const path=root+'/'+name;manifest.held.push({path,sha:sha(read(path))})}
const wfPath='.github/workflows/skyshift-tests.yml';let wf=read(wfPath);
for(const name of names){
 const oldPath=root+'/'+name,newPath=root+'/legacy/game/'+name,version=name.slice(6,-4),source=read(oldPath);
 const originalGitBlobSha=sha(source);
 assert.equal(originalGitBlobSha,baseline.entries.find(e=>e.path===oldPath)?.sha);
 assert.ok(!source.includes('import.meta.url'));
 for(const l of source.split('\n').filter(l=>/\bnew\s+URL\s*\(/.test(l)))assert.match(l,/\bnew\s+URL\s*\(\s*(?:window\.)?location\.href\s*\)/);
 assert.ok(!existsSync(newPath));
 const rebased=source.replace(imports,'$1../../$2');
 assert.equal(sha(rebased.replace(inverseImports,'$1./')),originalGitBlobSha);
 for(const m of source.matchAll(imports)){const target=m[2].split(/[?#]/)[0];assert.ok(existsSync(resolve(root,target)),name+' '+target);assert.equal(resolve(root,target),resolve(dirname(newPath),'../../'+target));assert.ok(!names.includes(target),'Game-to-game dependency requires explicit rebase')}
 write(newPath,rebased);unlinkSync(oldPath);
 manifest.files.push({version,name,oldPath,newPath,originalGitBlobSha});
 const boot=root+'/legacy/boot/boot-v'+version+'.js',b=read(boot),from='import("../../'+name,to='import("../game/'+name;
 assert.equal(b.split(from).length,2,boot);
 const after=b.replace(from,to);assert.equal(after.replace(to,from),b);write(boot,after);
 manifest.bootstraps.push({version,path:boot,originalGitBlobShaBeforeR1G:sha(b)});
 assert.equal(wf.split('node --check '+oldPath).length,2,name);wf=wf.replace('node --check '+oldPath,'node --check '+newPath);
}
write(wfPath,wf);
for(const name of readdirSync(root+'/tests/unit').filter(n=>n.endsWith('.test.mjs'))){
 const p=root+'/tests/unit/'+name,s=read(p),after=transformReader(s);
 if(after===s)continue;assert.equal(transformReader(after,true),s,'Nonreversible unit reader '+p);write(p,after);manifest.tests.push({path:p,originalGitBlobShaBeforeR1G:sha(s)});
}
assert.equal(direct().length,286);
write(root+'/legacy/game/R1G-migration-manifest.json',JSON.stringify(manifest,null,2)+'\n');
const overlay=`// R1G exact inverse of approved source-reader paths and archived boot target updates.
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../legacy/game/R1G-migration-manifest.json',import.meta.url),'utf8'));
export function restoreR1GGamePaths(source){
 let out=source;
 for(const {name,version} of manifest.files){
  for(const [a,b] of [['../../legacy/game/'+name,'../../'+name],['./legacy/game/'+name,'./'+name],['legacy/game/'+name,name]])for(const q of ['"',"'"])out=out.split(q+a+q).join(q+b+q);
  out=out.split(${JSON.stringify(regexNew)}+version+'\\\\.mjs').join(${JSON.stringify(regexOld)}+version+'\\\\.mjs');
 }
 return out;
}
export function restoreR1GBootImport(source){
 let out=source;
 for(const {version} of manifest.bootstraps)out=out.split('import("../game/game-v'+version+'.mjs').join('import("../../game-v'+version+'.mjs');
 return out;
}
`;
write(arch+'r1g-game-test-path-overlay.mjs',overlay);
const importG="import {restoreR1GGamePaths,restoreR1GBootImport} from './r1g-game-test-path-overlay.mjs';\n";
const edit=(name,fn)=>{const p=arch+name;const before=read(p),after=fn(before);assert.notEqual(after,before,'Missing expected guard update '+name);write(p,after)};
const counts=s=>s.replace(/(assert\.equal\([^\n]*?\.length,)328(?=[,)])/g,'$1286').replace(/(current root |measured |and |leave )328(?= root files| direct|;)/g,'$1286');
const rootGuards=['legacy-boot-migration-r1.test.mjs','legacy-boot-migration-r1b.test.mjs','legacy-boot-migration-r1c.test.mjs','legacy-boot-migration-r1d.test.mjs','legacy-game-migration-r1e.test.mjs','legacy-game-migration-r1f.test.mjs'];
for(const name of rootGuards)edit(name,s=>{
 s=counts(s);
 if(name==='legacy-boot-migration-r1.test.mjs')return importG+s.replace('restoreR1FBootImport(relocated)','restoreR1FBootImport(restoreR1GBootImport(relocated))');
 if(name==='legacy-boot-migration-r1b.test.mjs'){
  return importG+s.replace('const source=readFileSync(target,','const actual=readFileSync(target,').replace("assert.equal((source.match(","const source=restoreR1GBootImport(actual);\n  assert.equal((source.match(").replace('const match=source.match(/import','const match=actual.match(/import').replace(String.raw`(\.\.\/\.\.\/game-v[^"?]+\.mjs)`,String.raw`((?:\.\.\/\.\.\/|\.\.\/game\/)game-v[^"?]+\.mjs)`).replace('restoreR1BBootPaths(source)','restoreR1BBootPaths(restoreR1GGamePaths(source))');
 }
 if(name==='legacy-boot-migration-r1c.test.mjs')return importG+s.replace('restoreR1FBootImport(body)','restoreR1FBootImport(restoreR1GBootImport(body))').replace('restoreR1FGamePaths(source)','restoreR1FGamePaths(restoreR1GGamePaths(source))').replace('assert.ok(source.includes(regexStart)','assert.ok(restoreR1GGamePaths(source).includes(regexStart)');
 if(name==='legacy-boot-migration-r1d.test.mjs')return importG+s.replace('restoreR1FGamePaths(source)','restoreR1FGamePaths(restoreR1GGamePaths(source))');
 if(name==='legacy-game-migration-r1e.test.mjs')return importG+s.replace('restoreR1EGamePaths(source)','restoreR1EGamePaths(restoreR1GGamePaths(source))');
 if(name==='legacy-game-migration-r1f.test.mjs')return importG+s.replace('restoreR1FGamePaths(source)','restoreR1FGamePaths(restoreR1GGamePaths(source))');
 return s;
});
for(const name of ['unit-migration-integrity.test.mjs','bulk-unit-migration-integrity.test.mjs','stage7-unit-migration-integrity.test.mjs','stage8-unit-migration-integrity.test.mjs'])edit(name,s=>importG+s.replace(/restoreR1FGamePaths\((source|contents|migrated)\)/g,'restoreR1FGamePaths(restoreR1GGamePaths($1))'));
edit('station-world-migration-stageM.test.mjs',s=>s.replace("const game=readFileSync(resolve(root,name),'utf8');","const archived=resolve(root,'legacy/game',name);\n  const path=existsSync(archived)?archived:resolve(root,name);\n  const game=readFileSync(path,'utf8');").replace("game.includes('./world/environment-art-pipeline-v020')","game.includes((path===archived?'../../':'./')+'world/environment-art-pipeline-v020')"));
const gate=`// Mandatory R1G original Git identity / dependency / live entrypoint gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreR1GGamePaths,restoreR1GBootImport} from './r1g-game-test-path-overlay.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),repo=resolve(root,'..');
const read=p=>readFileSync(resolve(repo,p),'utf8');
const m=JSON.parse(read('skyshift/legacy/game/R1G-migration-manifest.json'));
const baseline=JSON.parse(read('skyshift/docs/architecture/root-baseline-2026-11-23.json'));
function sha(s){const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\\0').update(b).digest('hex')}
test('R1G: 42 immutable game sources, equivalent imports and held entrypoints',()=>{
 assert.equal(m.files.length,42);assert.equal(m.previousRootFiles,328);assert.equal(m.expectedRootFiles,286);
 assert.equal(readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()).length,286);
 for(const h of m.held)assert.equal(sha(read(h.path)),h.sha,h.path);
 for(const f of m.files){
  assert.equal(f.oldPath,'skyshift/'+f.name);assert.equal(f.newPath,'skyshift/legacy/game/'+f.name);
  assert.ok(!existsSync(resolve(repo,f.oldPath)),f.oldPath);
  const s=read(f.newPath);assert.ok(!s.includes('import.meta.url'),f.name);
  assert.equal(sha(s.replace(${inverseImports.toString()},'$1./')),f.originalGitBlobSha,f.name);
  assert.equal(baseline.entries.find(e=>e.path===f.oldPath)?.sha,f.originalGitBlobSha,f.name);
  const re=/(?:\\bfrom\\s*|\\bimport\\s*\\(\\s*|\\bimport\\s*)(["'])(\\.\\.\\/\\.\\.\\/[^"'?#]+)\\1/g;
  let n=0;for(const match of s.matchAll(re)){assert.ok(existsSync(resolve(dirname(resolve(repo,f.newPath)),match[2])),f.name+' '+match[2]);n++}assert.ok(n>=10,f.name);
  for(const line of s.split('\\n').filter(l=>/\\bnew\\s+URL\\s*\\(/.test(l)))assert.match(line,/\\bnew\\s+URL\\s*\\(\\s*(?:window\\.)?location\\.href\\s*\\)/);
 }
});
test('R1G: historical source readers and boot imports invert exactly',()=>{
 assert.equal(m.bootstraps.length,42);assert.ok(m.tests.length>=50);
 for(const t of m.tests){const s=read(t.path),restored=restoreR1GGamePaths(s);assert.notEqual(restored,s,t.path);assert.equal(sha(restored),t.originalGitBlobShaBeforeR1G,t.path)}
 for(const b of m.bootstraps){const s=read(b.path);assert.equal(sha(restoreR1GBootImport(s)),b.originalGitBlobShaBeforeR1G,b.path);const target='../game/game-v'+b.version+'.mjs';assert.equal(s.split('import("'+target).length,2,b.path);assert.ok(existsSync(resolve(dirname(resolve(repo,b.path)),target)))}
 const wf=read('.github/workflows/skyshift-tests.yml');for(const f of m.files){assert.ok(wf.includes('node --check '+f.newPath),f.name);assert.ok(!wf.includes('node --check '+f.oldPath),f.name)}
});
`;
write(arch+'legacy-game-migration-r1g.test.mjs',gate);
execFileSync('node',['--check',arch+'legacy-game-migration-r1g.test.mjs'],{stdio:'inherit'});
const guardPath='.github/workflows/skyshift-architecture-guard.yml';let guard=read(guardPath);
const needle='      - name: Syntax-check the migrated historical test collection';
assert.ok(guard.includes(needle));guard=guard.replace(needle,'      - name: R1G preserve 42 original game Git blobs and 286 root files\n        run: node --test skyshift/tests/architecture/legacy-game-migration-r1g.test.mjs\n'+needle);write(guardPath,guard);
const statusPath=root+'/docs/architecture/SKYSHIFT-ROOT-CONSOLIDATION-STATUS.md';
let status=read(statusPath);status=status.replace(/> \*\*Status: NOT FINISHED\*\*[^\n]*/,"> **Status: NOT FINISHED** (main: R1F PR #200, ab926746c1a356d8f, 328 root files, all post-merge checks green; R1G migration branch targets 286).");
status+="\n## R1G — 42 later historical game snapshots (UNMERGED)\n\nR1F PR #200 merged at ab926746c1a356d8f2a9c079968e7e65dc804901, 328 direct files, all main checks green. R1G exhaustive reference audit run 45343324620 found 42 eligible of 43 candidates. Move those 42 to legacy/game/ and preserve the exact prior Git blob after reversing only static relative imports; rewire matching bootstraps and audited unit readers, including exact boot import regex paths. Keep v0191 (missing unique CI syntax check), v0101/v0103 compatibility pairs, v0203 comparison page, and live v0210. Historical direct-root Pages script URLs are not redirected. Root target 286. Require independent R1G SHA guard and all original cumulative gates plus full PR checks before merge; verify Pages and track QA afterward. No runtime behavior or asset changes intended. Next: audit held game/boot compatibility, then CSS/UI and subsystem modules. Goal remains <=10 intentional direct files.\n";
write(statusPath,status);
console.log('R1G_MIGRATION '+JSON.stringify({before:328,after:286,games:manifest.files.length,boots:manifest.bootstraps.length,tests:manifest.tests.length}));
for(const f of manifest.files)execFileSync('node',['--check',f.newPath],{stdio:'inherit'});
for(const t of manifest.tests)execFileSync('node',['--check',t.path],{stdio:'inherit'});
execFileSync('node',['--test',...rootGuards.map(n=>arch+n),...['legacy-game-migration-r1g.test.mjs','unit-migration-integrity.test.mjs','bulk-unit-migration-integrity.test.mjs','stage7-unit-migration-integrity.test.mjs','stage8-unit-migration-integrity.test.mjs','station-world-migration-stageM.test.mjs'].map(n=>arch+n)],{stdio:'inherit'});
