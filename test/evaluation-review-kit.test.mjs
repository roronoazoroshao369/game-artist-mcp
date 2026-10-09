import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {freezeSourceSession} from '../src/evaluation/preflight.mjs';
import {buildOfflineReviewKit,buildBlankReviewTemplate} from '../src/evaluation/review-kit.mjs';
const sha='93cba70542ad7d7855429b58d61c250d2ae57b7d';
test('public reviewer kit has actual 12 PNGs and no internal mappings',async()=>{
 const root=await mkdtemp(join(tmpdir(),'eval-kit-'));try{
  const {publicManifest}=await freezeSourceSession({sessionId:'offline-kit',sourceCommitSha:sha,reviewQuorum:1,rendererVersion:'rsvg-convert version 2.58.0',styleProfileId:'dark-cultivation-v1',createdAt:'2026-10-09T01:00:00Z',frozenAt:'2026-10-09T01:01:00Z',outputRoot:root});
  const k=await buildOfflineReviewKit({publicManifest,publicAssetRoot:join(root,'review'),outputDir:join(root,'reviewer-output')});
  assert.equal(k.files.filter(x=>x.endsWith('.png')).length,12);
  const names=await readdir(k.kitRoot);assert.ok(names.includes('review.html')&&names.includes('reviewer.js'));
  const html=await readFile(join(k.kitRoot,'review.html'),'utf8');
  assert.match(html,/Content-Security-Policy/);assert.match(html,/reviewer-declaration/);assert.match(html,/checker|background/);assert.match(html,/reviewer.js/);
  assert.doesNotMatch(html,/https?:\/\/|sealed-mapping|baseline\.json|enhanced\.json|innerHTML|eval\(/);
  const js=await readFile(join(k.kitRoot,'reviewer.js'),'utf8');
  assert.match(js,/reviewerDeclaration/);assert.match(js,/reviewer-declaration/);assert.match(js,/evidenceKind:'HUMAN_REVIEW'/);
  const blank=buildBlankReviewTemplate(publicManifest);
  assert.equal(blank.evidenceKind,'HUMAN_REVIEW');assert.equal(blank.reviewerDeclaration,null);
  assert.equal(blank.rows.length,12);assert.equal(blank.rows[0].material,null);assert.equal(blank.packageDigest,publicManifest.packageDigest);
 }finally{await rm(root,{recursive:true,force:true});}
});
