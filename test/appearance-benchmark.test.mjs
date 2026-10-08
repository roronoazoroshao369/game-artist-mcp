import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderReviewPng} from '../src/benchmark/render-review.mjs';
import {assertSameGeometryPair,prepareBlindPairMetadata} from '../src/benchmark/appearance-pair.mjs';
const base={version:1,canvas:{width:192,height:256,background:'transparent'},nodes:[{id:'sample',type:'ellipse',cx:96,cy:128,rx:35,ry:95,fill:'#211c1a',stroke:'#332820',strokeWidth:2}]};
test('64/128 PNG are REAL pixel sized, aspect-preserving and deterministic',async()=>{
 const d=await mkdtemp(join(tmpdir(),'ga-appearance-review-'));
 try{
  for(const [limit,w,h] of [[64,48,64],[128,96,128]]){
   const a=join(d,'a'+limit+'.png'),b=join(d,'b'+limit+'.png');
   const ra=await renderReviewPng({document:base,limitPx:limit,rendererPath:'rsvg-convert',outputFile:a});
   const rb=await renderReviewPng({document:base,limitPx:limit,rendererPath:'rsvg-convert',outputFile:b});
   assert.equal(ra.width,w);assert.equal(ra.height,h);
   assert.equal(rb.sha256,ra.sha256);
   const png=await readFile(a);assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);
  }
  await assert.rejects(renderReviewPng({document:base,limitPx:65,rendererPath:'rsvg-convert',outputFile:join(d,'x.png')}),/limitPx/);
 }finally{await rm(d,{recursive:true,force:true});}
});
test('blind same-geometry comparison allows only appearance changes',()=>{
 const styled=structuredClone(base);
 styled.nodes[0].appearance={basePaint:{kind:'solid',color:'#b28a62'}};
 assert.doesNotThrow(()=>assertSameGeometryPair(base,styled));
 const moved=structuredClone(styled);moved.nodes[0].cx=97;
 assert.throws(()=>assertSameGeometryPair(base,moved),/geometry/i);
 const change=structuredClone(styled);change.nodes[0].strokeWidth=4;
 assert.throws(()=>assertSameGeometryPair(base,change),/geometry/i);
 const labels=prepareBlindPairMetadata({baseline:'aaa',enhanced:'bbb',seed:'fixed-seed'});
 assert.deepEqual(labels,prepareBlindPairMetadata({baseline:'aaa',enhanced:'bbb',seed:'fixed-seed'}));
 assert.ok(labels.reviewerVisible&&!JSON.stringify(labels.reviewerVisible).includes('enhanced'));
 assert.ok(labels.sealedMapping&&Object.keys(labels.sealedMapping).length===2);
});
