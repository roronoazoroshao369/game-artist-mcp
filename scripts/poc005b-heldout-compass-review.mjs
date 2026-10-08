#!/usr/bin/env node
// Post-hoc blinded appearance-only A/B from one genuinely new LOCAL MCP trial.
// Never call this independent agent/provider provenance or aesthetic FULL_PASS.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {loadHeldoutCompassPair} from '../src/benchmark/heldout-compass.mjs';
import {assertSameGeometryPair,prepareBlindPairMetadata} from '../src/benchmark/appearance-pair.mjs';
import {renderReviewPng} from '../src/benchmark/render-review.mjs';
import {renderSvg} from '../src/core/render-svg.mjs';
import {inspectStyle} from '../src/style/inspect.mjs';
import {loadStyleProfile} from '../src/style/profile.mjs';

const root=resolve('benchmarks/poc005b/generated/heldout-compass');
const review=join(root,'review'),internal=join(root,'internal');
await mkdir(review,{recursive:true});await mkdir(internal,{recursive:true});
const {baseline,enhanced,appearanceNodes,runId,sourceRevision}=await loadHeldoutCompassPair();
assertSameGeometryPair(baseline,enhanced);
const profile=await loadStyleProfile('dark-cultivation-v1');
for(const d of [baseline,enhanced]){
 const report=inspectStyle(d,profile);
 if(!report.ok)throw new Error('heldout style failed: '+report.errors.join('; '));
}
const seed=randomBytes(32).toString('hex');
const mapping=prepareBlindPairMetadata({baseline:'baseline',enhanced:'enhanced',seed}).sealedMapping;
const variants={baseline,enhanced},files=[];
for(const [role,doc] of Object.entries(variants)){
 await writeFile(join(internal,role+'.json'),JSON.stringify(doc,null,2)+'\n');
 await writeFile(join(internal,role+'.svg'),renderSvg(doc));
}
for(const [side,role] of Object.entries(mapping)){
 const doc=variants[role];
 for(const longAxis of [64,128]){
  const path=join(review,side+'-'+longAxis+'.png');
  const result=await renderReviewPng({document:doc,limitPx:longAxis,outputFile:path});
  const png=await readFile(path);
  const alphaTransparent=png.subarray(0,8).toString('hex')==='89504e470d0a1a0a'&&[4,6].includes(png[25]);
  if(!alphaTransparent)throw new Error('expected PNG alpha channel');
  files.push({side,longAxis,width:result.width,height:result.height,
   sha256:result.sha256,rendererVersion:result.rendererVersion,alphaTransparent});
 }
}
for(const n of [64,128]){
 const a=files.find(x=>x.side==='A'&&x.longAxis===n),b=files.find(x=>x.side==='B'&&x.longAxis===n);
 if(!a||!b||a.sha256===b.sha256)throw new Error('A/B must have distinguishable pixels at '+n);
}
const metadata={kind:'SELF_SELECTED_LOCAL_MCP_UNSCORED_APPEARANCE_ONLY',
 asset:runId,sourceRevision,sourceNodes:28,appearanceNodes,
 geometryEqual:true,reviewerStatus:'VISUAL_REVIEW_PENDING',
 agentProvenance:'UNKNOWN',independentReviewerCount:0,
 independentHeldout:false,briefSelection:'SELF_SELECTED_BY_ART_AUTHOR',qualifiesForAutonomyGo:false,
 visualGo:null,autonomyGo:null,
 processingSha:process.env.GITHUB_SHA||null,files};
await writeFile(join(review,'metadata.json'),JSON.stringify(metadata,null,2)+'\n');
const fields=['asset_id','scale_px','blind_variant','reviewer_id','reviewer_type','reviewed_at','evidence_ref','silhouette_1_5','material_1_5','hierarchy_1_5','style_fit_1_5','coherence_1_5','notes'];
const rows=[fields.join(',')];
for(const n of [64,128])for(const label of ['A','B'])
 rows.push([runId,n,label,...Array(10).fill('')].join(','));
await writeFile(join(review,'review-template.csv'),rows.join('\n')+'\n');
const bg=['checker','dark','light'];
const cards=x=>bg.map(back=>'<h2>'+back+'</h2><section>'+['A','B'].map(side=>'<figure class="'+back+'"><strong>Blind variant '+side+'</strong><div><img src="'+side+'-64.png" alt="'+side+' at 64px"><img src="'+side+'-128.png" alt="'+side+' at 128px"></div></figure>').join('')+'</section>').join('');
const html='<!doctype html><html><meta charset="utf-8"><title>Heldout Compass A/B — UNSCORED</title><style>body{font:15px system-ui;padding:20px;max-width:900px;margin:auto;background:#f0f0f0;color:#171b1d}section{display:flex;gap:20px;flex-wrap:wrap}figure{padding:20px;margin:0;min-width:150px;border:1px solid #777}img{margin:6px;vertical-align:middle}.checker{background:conic-gradient(#fff 25%,#aaa 0 50%,#fff 0 75%,#aaa 0) 0 0/16px 16px}.dark{background:#17191c;color:#f1f1f1}.light{background:white}</style><h1>Self-selected compass — appearance-only A/B</h1><p>Blind reviewer packet only. Both images use identical geometry at FINAL revision, but different explicit appearance. Images have native 64px and 128px longest edges. Brief was SELF-SELECTED by the art author, NOT independently held-out. Unsigned local MCP experiment. No independent visual ratings or provider-origin attestation.</p>'+cards(bg)+'</html>';
await writeFile(join(review,'review.html'),html);
await writeFile(join(review,'README.txt'),'UNSCORED. Brief SELF-SELECTED by the art author, NOT independently held-out. Show only this review folder to independent non-author reviewers. Do not infer production quality or provider-signed model provenance.\n');
const sha=x=>createHash('sha256').update(x).digest('hex');
await writeFile(join(internal,'sealed-mapping.json'),JSON.stringify({kind:'INTERNAL_NOT_FOR_REVIEW',
 seedHash:sha(seed),mapping},null,2)+'\n',{mode:0o600});
await writeFile(join(internal,'technical-report.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({ok:true,asset:runId,kind:metadata.kind,files:files.map(x=>x.side+':'+x.width+'x'+x.height),
 independentReviewerCount:0,agentProvenance:'UNKNOWN'}));
