// EF01A follow-up: summarize evidence to durable CI log; don't classify dead code.
import {readFileSync,writeFileSync} from 'node:fs';
const [input,out]=process.argv.slice(2);
const d=JSON.parse(readFileSync(input,'utf8'));
const live=new Set(d.graphs.production),comparison=new Set(d.graphs.comparison),qa=new Set(d.graphs.qa);
const bucket=p=>live.has(p)?'production':comparison.has(p)?'comparison':qa.has(p)?'qa':'other';
const countBy=(rows,key)=>rows.reduce((o,r)=>(o[key(r)]=(o[key(r)]||0)+1,o),{});
const result={commit:d.commit,unresolvedByOwner:countBy(d.unresolvedLiteralReferences,r=>bucket(r.owner)),dynamicByOwner:countBy(d.dynamicCandidates,r=>bucket(r.owner)),liveUnresolved:d.unresolvedLiteralReferences.filter(r=>live.has(r.owner)),liveDynamicCandidates:d.dynamicCandidates.filter(r=>live.has(r.owner)),duplicateGroups:d.duplicateCandidates.map(g=>g.map(f=>({path:f.path,lines:f.lines,bytes:f.bytes,category:bucket(f.path)}))),liveExternal:d.externalReferences.filter(r=>live.has(r.owner)),largestLiveCode:d.files.filter(f=>live.has(f.path)&&/\.(mjs|js)$/.test(f.path)).sort((a,b)=>b.bytes-a.bytes).slice(0,15).map(f=>({path:f.path,bytes:f.bytes}))};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log('SKYSHIFT_EF01_REVIEW '+JSON.stringify({...result,liveDynamicCandidates:undefined}));
