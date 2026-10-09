import test from 'node:test';import assert from 'node:assert/strict';
import {validSession,syntheticScoreRows} from './fixtures/evaluation-fixtures.mjs';
import {scoreVisual,calculateDeltas} from '../src/evaluation/verdict.mjs';
const session=validSession();
const mapping=Object.fromEntries(session.primaryAssets.map(a=>[a,{A:'baseline',B:'enhanced'}]));
const locked=({rows,otherRows}={})=>({session,lockedReviews:[{reviewerId:'r1',rows:rows||syntheticScoreRows()},...(otherRows?[{reviewerId:'r2',rows:otherRows}]:[])],mappingReveal:{verified:true,mapping}});
test('pure synthetic fixture may calculate GO, but never claims it is human-verified',()=>{
 const result=scoreVisual(locked());assert.equal(result.visualStatus,'VISUAL_GO');
 assert.equal(result.confidence,'SINGLE_REVIEWER');
});
test('two of three categories need >=1 material improvement at BOTH native sizes',()=>{
 const rows=syntheticScoreRows().map(r=>r.asset==='stone_censer_20261008'&&r.variant==='B'?{...r,material:2}:r);
 assert.equal(scoreVisual(locked({rows})).visualStatus,'VISUAL_GO');
 const loses=rows.map(r=>r.asset==='medicinal_pouch_20261008'&&r.variant==='B'&&r.scale===128?{...r,material:2}:r);
 assert.equal(scoreVisual(locked({rows:loses})).visualStatus,'ARTISTIC_NO_GO');
});
test('two reviewers with >=2 point disagreement cannot be averaged into a GO',()=>{
 const other=syntheticScoreRows().map((r,i)=>i===0?{...r,material:5}:r);
 assert.equal(scoreVisual({...locked({otherRows:other}),session:validSession({reviewQuorum:2})}).visualStatus,'REVIEW_PENDING');
});
test('threshold inclusivity and regression exactly minus one allowed',()=>{
 const rows=syntheticScoreRows().map(r=>r.variant==='B'?{...r,silhouette:3,styleFit:3}:r);
 assert.equal(scoreVisual(locked({rows})).visualStatus,'VISUAL_GO');
 const bad=rows.map((r,i)=>i===1?{...r,silhouette:2}:r);
 assert.equal(scoreVisual(locked({rows:bad})).visualStatus,'ARTISTIC_NO_GO');
});
