import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectStyle} from '../src/style/inspect.mjs';
const profile={version:1,id:'review',name:'Review',palette:{allowedHex:['#211c1a','#332820','#b28a62','#69d7cf'],maxDistinctColors:3},stroke:{minWidth:1,maxWidth:4,allowedWidths:[2,4]},complexity:{maxNodes:200}};
const node={id:'n',type:'ellipse',cx:20,cy:20,rx:10,ry:10,fill:'#211c1a',stroke:'#332820',strokeWidth:2};
const doc=(a)=>({version:1,canvas:{width:64,height:64,background:'transparent'},nodes:[{...node,...(a?{appearance:a}:{})}]});
test('gradient stop colors and glow enter effective color palette',()=>{
 const good={basePaint:{kind:'linearGradient',start:[0,0],end:[1,1],stops:[{at:0,color:'#211c1a',opacity:1},{at:1,color:'#b28a62',opacity:1}]}};
 assert.equal(inspectStyle(doc(good),profile).ok,true);
 assert.equal(inspectStyle(doc({...good,outerGlow:{color:'#69d7cf',opacity:0.5,radius:2}}),profile).ok,false,'distinct effective paints exceed budget');
 const bad=structuredClone(good);bad.basePaint.stops[1].color='#ffffff';
 assert.equal(inspectStyle(doc(bad),profile).ok,false,'out of profile palette must fail');
});
test('surface mark width obeys StyleProfile; legacy report shape unchanged',()=>{
 const mark={kind:'line',from:[0,0],to:[1,1],color:'#b28a62',width:3,opacity:1};
 const a=inspectStyle(doc({surfaceMarks:[mark]}),profile);
 assert.equal(a.ok,false);
 assert.ok(a.errors.some(x=>/mark|stroke|width/i.test(x)),a.errors.join(','));
 const base=inspectStyle(doc(),profile);
 assert.equal(Object.hasOwn(base.metrics,'appearance'),false);
 assert.deepEqual(base,inspectStyle(structuredClone(doc()),profile));
});
