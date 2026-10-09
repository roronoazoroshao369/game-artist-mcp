import {mkdir,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {sha256Bytes,canonicalBytes,validateManifest,SCORE_KEYS} from './contracts.mjs';
import {readBoundedFile,writeAtomicFile} from './safe-io.mjs';
import {renderReviewerHtml,reviewerCss} from './reviewer-ui.mjs';
export function buildBlankReviewTemplate(manifest,reviewerId=''){
 validateManifest(manifest);
 return {schemaVersion:1,sessionId:manifest.sessionId,reviewerId,rubricVersion:1,packageDigest:manifest.packageDigest,submittedAt:null,
 rows:manifest.files.map(f=>({asset:f.asset,scale:f.size,variant:f.label,...Object.fromEntries(SCORE_KEYS.map(k=>[k,null]))}))};
}
export async function buildOfflineReviewKit({publicManifest,publicAssetRoot,outputDir}){
 validateManifest(publicManifest);
 const kitRoot=resolve(outputDir);await mkdir(kitRoot,{recursive:true});
 const files=[];
 for(const f of publicManifest.files){
  const source=await readBoundedFile({root:publicAssetRoot,relativePath:f.path,maxBytes:4194304});
  if(sha256Bytes(source)!==f.sha256)throw new Error('PNG hash mismatch');
  await mkdir(join(kitRoot,f.asset),{recursive:true});
  await writeAtomicFile({root:kitRoot,relativePath:f.path,content:source});
  files.push(f.path);
 }
 for(const [name,body] of Object.entries({
  'review.html':renderReviewerHtml(publicManifest),
  'reviewer.js':REVIEWER_JS,
  'reviewer.css':reviewerCss,
  'manifest.json':canonicalBytes(publicManifest),
  'unscored-template.json':canonicalBytes(buildBlankReviewTemplate(publicManifest))
 })){
  await writeAtomicFile({root:kitRoot,relativePath:name,content:body});
  files.push(name);
 }
 return {kitRoot,kitDigest:sha256Bytes(canonicalBytes(files.sort())),files};
}
const REVIEWER_JS="const SCORE_KEYS=['silhouette','material','hierarchy','styleFit','coherence'];\nconst root=document.querySelector('#review-sheet');\nconst manifest=JSON.parse(document.querySelector('#manifest-data').textContent);\nconst status=document.querySelector('#status');\nfunction downloadFile(content,name){\n const blob=new Blob([JSON.stringify(content,null,2)],{type:'application/json'});\n const url=URL.createObjectURL(blob);\n const anchor=document.createElement('a');anchor.href=url;anchor.download=name;\n document.body.append(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);\n}\ndocument.querySelector('#export').addEventListener('click',()=>{\n const reviewerId=String(document.querySelector('#reviewer-id').value||'').trim();\n const cells=[...root.querySelectorAll('tr[data-asset]')];\n if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(reviewerId)){status.textContent='Reviewer ID is required';return;}\n const rows=[];\n for(const tr of cells){\n  const row={asset:tr.dataset.asset,scale:Number(tr.dataset.scale),variant:tr.dataset.variant};\n  for(const k of SCORE_KEYS){\n   const v=Number(tr.querySelector('[name=\"'+k+'\"]').value);\n   if(!Number.isInteger(v)||v<1||v>5){status.textContent='All five scores must be 1–5';return;}\n   row[k]=v;\n  }\n  rows.push(row);\n }\n downloadFile({schemaVersion:1,sessionId:manifest.sessionId,reviewerId,rubricVersion:1,packageDigest:manifest.packageDigest,submittedAt:new Date().toISOString(),rows},\n   manifest.sessionId+'-'+reviewerId+'-blind.json');\n status.textContent='Download created. Return JSON to the evaluator; you have not revealed any A/B roles.';\n});\nfor(const b of document.querySelectorAll('[data-background]'))b.addEventListener('click',()=>{\n for(const panel of document.querySelectorAll('.board')){panel.dataset.background=b.dataset.background;}\n});\n";
