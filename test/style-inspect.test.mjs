import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectStyle } from '../src/style/inspect.mjs';
const profile={version:1,id:'example',name:'Example',palette:{allowedHex:['#211c1a','#72f5ec','#123456'],maxDistinctColors:2},stroke:{minWidth:1,maxWidth:12,allowedWidths:[2,4,6,8]},complexity:{maxNodes:2}};
const doc={version:1,canvas:{width:64,height:64,background:'transparent'},nodes:[{id:'a',type:'ellipse',cx:20,cy:20,rx:8,ry:9,fill:'#72F5EC',stroke:'#211c1a',strokeWidth:4}]};
const clone=x=>structuredClone(x);
test('valid style report normalizes hex deterministically and does not mutate input',()=>{
 const before=clone(doc);const r=inspectStyle(doc,profile);
 assert.equal(r.ok,true,r.errors.join('; '));assert.equal(r.profileId,'example');
 assert.deepEqual(r.metrics.observedColors,['#211c1a','#72f5ec']);
 assert.equal(r.metrics.distinctColors,2);assert.equal(r.metrics.nodeCount,1);
 assert.deepEqual(doc,before);assert.deepEqual(inspectStyle(doc,profile),r);
});
test('no fill/no stroke do not count colors or require width',()=>{
 const d=clone(doc);d.nodes[0].fill='none';d.nodes[0].stroke='none';delete d.nodes[0].strokeWidth;
 const r=inspectStyle(d,profile);assert.equal(r.ok,true);assert.deepEqual(r.metrics.observedColors,[]);assert.deepEqual(r.metrics.missingStrokeWidthIds,[]);
});
test('missing width on visible stroke is a hard error',()=>{
 const d=clone(doc);delete d.nodes[0].strokeWidth;
 const r=inspectStyle(d,profile);assert.equal(r.ok,false);assert.deepEqual(r.metrics.missingStrokeWidthIds,['a']);
});
test('rejects unsupported paint syntax and out-of-palette colors',()=>{
 for(const fill of ['url(javascript:alert(1))','red','#ffffff','var(--red)']){
 const d=clone(doc);d.nodes[0].fill=fill;const r=inspectStyle(d,profile);assert.equal(r.ok,false,fill);
 }
});
test('stroke budget and distinct colors fail deterministically',()=>{
 const d=clone(doc);d.nodes[0].strokeWidth=7;
 const r=inspectStyle(d,profile);assert.equal(r.ok,false);assert.deepEqual(r.metrics.invalidStrokeWidthIds,['a']);
 const e=clone(doc);e.nodes.push({id:'b',type:'ellipse',cx:20,cy:20,rx:7,ry:7,fill:'#123456',stroke:'none'});
 assert.equal(inspectStyle(e,profile).ok,false);
 e.nodes.push({id:'c',type:'path',d:'M0 0 L1 1',fill:'none',stroke:'none'});
 assert.equal(inspectStyle(e,profile).ok,false);
});
test('invalid profiles and Art IR are not accepted',()=>{
 const broken=clone(profile);broken.palette.allowedHex.push('red');assert.equal(inspectStyle(doc,broken).ok,false);
 const d=clone(doc);d.nodes[0].rx=-1;assert.equal(inspectStyle(d,profile).ok,false);
});
