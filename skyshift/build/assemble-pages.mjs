// Assemble the full multi-game site; only SKYSHIFT's production index changes.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cp,mkdir,readFile,writeFile,rm,lstat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readArchivedWorldAsset} from './archived-world-assets.mjs';
import {entryArchive,readArchivedEntrySource} from './archived-entry-sources.mjs';
import {readOwnerRelocations} from './ef08-owner-paths.mjs';
const here=dirname(fileURLToPath(import.meta.url)),repo=resolve(here,'../..'),site=join(here,'site'),dist=join(here,'dist');
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:repo,maxBuffer:16*1024*1024}).toString();
const commit=git('rev-parse','HEAD').trim();
assert.match(commit,/^[a-f0-9]{40}$/);
const report=JSON.parse(await readFile(join(dist,'build-report.json'),'utf8'));
await rm(site,{recursive:true,force:true});await mkdir(site,{recursive:true});
const tracked=git('ls-files','-z').split('\0').filter(Boolean),kept=[],excluded=[];
for(const path of tracked){
 if(path.startsWith('.github/')||path==='.gitignore'||path.startsWith('skyshift/build/')){excluded.push(path);continue;}
 assert.ok(!path.startsWith('/')&&!path.split('/').includes('..'),path);
 const from=join(repo,path),to=join(site,path);
 assert.ok((await lstat(from)).isFile(),path);
 await mkdir(dirname(to),{recursive:true});await cp(from,to);kept.push(path);
}
const source=await readFile(join(site,'skyshift/index.html')),legacy='skyshift/source-comparison.html';
assert.ok(!tracked.includes(legacy));await writeFile(join(site,legacy),source);
for(const f of report.files){
 const path='skyshift/'+f.path;
 if(kept.includes(path)&&path!=='skyshift/index.html'){
  assert.ok(path.startsWith('skyshift/assets/'),path+' unexpected collision');
  assert.equal(sha(await readFile(join(site,path))),f.sha256,path+' changed asset');
 }
 const dest=join(site,path);await mkdir(dirname(dest),{recursive:true});await cp(join(dist,f.path),dest);
 assert.equal(sha(await readFile(dest)),f.sha256,path+' copy integrity');
}
await cp(join(dist,'build-report.json'),join(site,'skyshift/build-report.json'));
const otherEntries=kept.filter(p=>p==='index.html'||/^[^/]+\/index\.html$/.test(p)&&p!=='skyshift/index.html');
const preserved=[];
for(const path of kept){
 if(path==='skyshift/index.html')continue;
 const a=sha(await readFile(join(repo,path))),b=sha(await readFile(join(site,path)));
 assert.equal(b,a,path+' compatibility bytes changed');
 if(otherEntries.includes(path)||['skyshift/material-grade-v0203.html','skyshift/boot-v0210.js','skyshift/game-v0210.mjs'].includes(path))preserved.push({path,sha256:a});
}
preserved.push({path:legacy,sha256:sha(source)});
for(const f of report.comparisonAssets){
 const path='skyshift/'+f.path;
 assert.ok(!tracked.includes(path),path+' retired from tracked source');
 const bytes=readArchivedWorldAsset(path);assert.equal(bytes.length,f.bytes);assert.equal(sha(bytes),f.sha256);
 const dest=join(site,path);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,bytes,{flag:'wx'});
 assert.ok(!report.files.some(x=>x.path===f.path),path+' comparison asset excluded from production artifact');
 preserved.push({path,sha256:f.sha256});
}
// Historical raw source URLs remain byte-exact in the compatibility site only.
for(const f of entryArchive.files){
 assert.ok(!tracked.includes(f.path),f.path+' must not be tracked');
 assert.ok(!report.files.some(x=>'skyshift/'+x.path===f.path),f.path+' must not ship in production');
 const bytes=readArchivedEntrySource(f.path),dest=join(site,f.path);
 await mkdir(dirname(dest),{recursive:true});await writeFile(dest,bytes,{flag:'wx'});
 preserved.push({path:f.path,sha256:sha(bytes)});
}
// Preserve public raw CSS URLs from the one canonical stylesheet owner, not a second tracked copy.
for(const f of readOwnerRelocations(repo).manifest.moves.filter(f=>f.oldPath.endsWith('.css'))){
 assert.ok(!tracked.includes(f.oldPath)&&tracked.includes(f.newPath));
 assert.ok(!report.files.some(x=>'skyshift/'+x.path===f.oldPath));
 const bytes=await readFile(join(repo,f.newPath));
 await writeFile(join(site,f.oldPath),bytes,{flag:'wx'});
 assert.equal(sha(await readFile(join(site,f.oldPath))),sha(bytes));
 preserved.push({path:f.oldPath,sha256:sha(bytes)});
}
const publication={schema:1,commit,sourceVersion:report.sourceVersion,productionCatalog:report.productionCatalog,production:report.files.filter(x=>!x.path.startsWith('.vite/')).map(x=>({...x,path:'skyshift/'+x.path})),preserved,keptFiles:kept.length,excludedBuildOrCiFiles:excluded.length};
assert.ok(!tracked.includes('skyshift/publication.json'));
await writeFile(join(site,'skyshift/publication.json'),JSON.stringify(publication,null,2)+'\n');
console.log('SKYSHIFT_EF03_PAGES '+JSON.stringify({commit,preserved:kept.length-1,otherEntries,productionFiles:publication.production.length,excluded:excluded.length}));
