#!/usr/bin/env node
// Controlled retrospective A/B: source is actual POC-005A MCP transcript geometry.
// Not a fresh AI-authored held-out brief. Not an independent visual assessment.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {loadRevisedDocument,createMaterialPair,ASSETS} from '../src/benchmark/real-asset-pairs.mjs';
import {renderSvg} from '../src/core/render-svg.mjs';
import {renderReviewPng} from '../src/benchmark/render-review.mjs';
import {assertSameGeometryPair,prepareBlindPairMetadata} from '../src/benchmark/appearance-pair.mjs';
import {inspectStyle} from '../src/style/inspect.mjs';
import {loadStyleProfile} from '../src/style/profile.mjs';

const out=resolve('benchmarks/poc005b/generated/real-asset-ab');
const publicDir=join(out,'review'),sealedDir=join(out,'internal');
const profile=await loadStyleProfile('dark-cultivation-v1');
const sha=data=>createHash('sha256').update(data).digest('hex');
await mkdir(publicDir,{recursive:true});
await mkdir(sealedDir,{recursive:true});
const reports=[],mapping={};
const seed=randomBytes(32).toString('hex');
for(const asset of ASSETS){
 const {document:source,revision,sourceCalls}=await loadRevisedDocument(asset);
 const prior=JSON.parse(await readFile(new URL('../benchmarks/poc005a/runs/'+asset+'/run.json',import.meta.url),'utf8'));
 const {baseline,enhanced,operations}=createMaterialPair(asset,source);
 assertSameGeometryPair(baseline,enhanced);
 const inspection=inspectStyle(enhanced,profile);
 if(!inspection.ok)throw new Error(asset+': '+inspection.errors.join('; '));
 const bdir=join(publicDir,asset),idir=join(sealedDir,asset);
 await mkdir(bdir,{recursive:true});await mkdir(idir,{recursive:true});
 const pair=prepareBlindPairMetadata({baseline:'baseline',enhanced:'enhanced',seed:seed+':'+asset});
 mapping[asset]=pair.sealedMapping;
 const variants={baseline,enhanced},files=[];
 for(const [role,doc] of Object.entries(variants)){
  await writeFile(join(idir,role+'.json'),JSON.stringify(doc,null,2)+'\n');
  await writeFile(join(idir,role+'.svg'),renderSvg(doc));
 }
 for(const [side,role] of Object.entries(pair.sealedMapping)){
  const doc=variants[role];
  for(const size of [64,128]){
   const filename=side+'-'+size+'.png';
   const report=await renderReviewPng({document:doc,limitPx:size,outputFile:join(bdir,filename)});
   const png=await readFile(join(bdir,filename));
   files.push({side,size,width:report.width,height:report.height,sha256:report.sha256,rendererVersion:report.rendererVersion,
    alphaTransparent:(()=>{const pngSignature=png.subarray(0,8).toString('hex');return pngSignature==='89504e470d0a1a0a' && [4,6].includes(png[25]);})()});
   if(!files.at(-1).alphaTransparent)throw new Error('PNG must carry an alpha channel');
  }
 }
 for(const size of [64,128]){
  const a=files.find(f=>f.size===size && f.side==='A');
  const b=files.find(f=>f.size===size && f.side==='B');
  if(!a||!b||a.sha256===b.sha256)throw new Error(asset+': A/B rendered pixels identical at '+size);
 }
 const report={asset,kind:'RETROSPECTIVE_REAL_GEOMETRY_AB_TECHNICAL_ONLY',sourceRevision:revision,
  baselineDocumentSha256:sha(JSON.stringify(baseline)),sourceBriefSha256:prior.briefSha256,
  previousSourceProjectSha:prior.projectSha,
  benchmarkHeadSha:process.env.GITHUB_SHA||null,
  sourceMcpEditCalls:sourceCalls,sourceNodeCount:source.nodes.length,appearanceEditedNodes:operations,
  geometryEqual:true,stylePassed:true,reviewerStatus:'VISUAL_REVIEW_PENDING',
  agentProvenance:'UNKNOWN',independentReviewerCount:0,
  visualGo:null,autonomyGo:null,files};
 reports.push(report);
 await writeFile(join(bdir,'review-data.json'),JSON.stringify({
  asset,kind:report.kind,sourceNodeCount:report.sourceNodeCount,
  status:'VISUAL_REVIEW_PENDING',images:files
 },null,2)+'\n');
 const rows=['asset_id,scale_px,blind_variant,reviewer_id,reviewer_type,reviewed_at,evidence_ref,silhouette_1_5,material_1_5,hierarchy_1_5,style_fit_1_5,coherence_1_5,notes'];
 for(const n of [64,128])for(const side of ['A','B'])rows.push([asset,n,side,...Array(10).fill('')].join(','));
 await writeFile(join(bdir,'unscored-review-template.csv'),rows.join('\n')+'\n');
}
const style='<style>body{background:#eff0f1;color:#171a21;font:15px system-ui;margin:24px auto;max-width:980px}article{margin:24px 0}section{display:flex;gap:12px;flex-wrap:wrap}figure{padding:14px;border:1px solid #9299a0;margin:0;min-width:120px}.checker{background:conic-gradient(#fff 25%,#c3c3c3 0 50%,#fff 0 75%,#c3c3c3 0) 0 0/16px 16px}.dark{background:#17191c}.light{background:#fff}img{display:inline-block;image-rendering:auto;margin:4px}h3{margin:0 0 8px}p{line-height:1.45}</style>';
const section=(asset,bg)=>'<h3>'+bg+'</h3><section>'+['A','B'].map(side=>'<figure class="'+bg+'"><strong>Variant '+side+'</strong><div><img src="'+asset+'/'+side+'-64.png" alt="'+asset+' variant '+side+' 64 px"><img src="'+asset+'/'+side+'-128.png" alt="'+asset+' variant '+side+' 128 px"></div></figure>').join('')+'</section>';
const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>POC-005B Three Real-Geometry Material A/B — Unscored</title>'+style+
 '<h1>POC-005B — 3 original asset categories (blind labels)</h1><p>These are pixel-true 64/128 long-axis PNGs reconstructed from previous LOCAL POC-005A MCP briefs. Geometry is identical within every pair. No independent review, signed AI provider provenance, or artistic quality acceptance is claimed. Reviewers must not see internal mapping. Obtain at least one non-author blind review before declaring Visual GO.</p>'+
 ASSETS.map(asset=>'<article><h2>'+asset+'</h2>'+['checker','dark','light'].map(bg=>section(asset,bg)).join('')+'</article>').join('')+
 '</html>';
await writeFile(join(publicDir,'review.html'),html);
await writeFile(join(publicDir,'README.txt'),
 'UNSCORED independent review bundle. A/B roles are randomized with a private seed for this run. Do not open source code or internal mapping during scoring. Scores must come from independent reviewer(s).\n');
const seal={kind:'INTERNAL_NOT_FOR_BLIND_REVIEW',seedSha256:sha(seed),roleMapping:mapping,sourceCommitHint:'capture exact GitHub Actions head SHA'};
await writeFile(join(sealedDir,'sealed-mapping.json'),JSON.stringify(seal,null,2)+'\n',{mode:0o600});
await writeFile(join(sealedDir,'technical-report.json'),JSON.stringify({
 kind:'RETROSPECTIVE_REAL_GEOMETRY_AB_TECHNICAL_ONLY',
 reviewerStatus:'VISUAL_REVIEW_PENDING',agentProvenance:'UNKNOWN',
 independentReviewerCount:0,visualGo:null,autonomyGo:null,
 assets:reports
},null,2)+'\n');
console.log(JSON.stringify({ok:true,kind:'RETROSPECTIVE_REAL_GEOMETRY_AB_TECHNICAL_ONLY',
 assets:reports.map(r=>({asset:r.asset,nodes:r.sourceNodeCount,edited:r.appearanceEditedNodes,
 files:r.files.map(x=>x.side+':'+x.width+'x'+x.height),stylePassed:r.stylePassed})),
 reviewerStatus:'VISUAL_REVIEW_PENDING',agentProvenance:'UNKNOWN',
 reviewDir:publicDir}));
