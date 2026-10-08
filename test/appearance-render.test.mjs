import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSvg} from '../src/core/render-svg.mjs';
const make=appearance=>({version:1,canvas:{width:64,height:64,background:'transparent'},nodes:[{id:'ga-grad-0',type:'ellipse',cx:32,cy:32,rx:12,ry:10,fill:'#211c1a',stroke:'#332820',strokeWidth:2,appearance},{id:'second',type:'polygon',points:[[3,3],[12,3],[3,12]],fill:'#332820',appearance}]});
const grad={basePaint:{kind:'linearGradient',start:[0,0],end:[1,1],stops:[{at:0,color:'#211c1a',opacity:1},{at:1,color:'#b28a62',opacity:1}]}};
test('two gradients use safe collision-free ids and deterministic SVG',()=>{
 const d=make(grad);
 const one=renderSvg(d);
 assert.equal(one,renderSvg(d));
 assert.match(one,/<linearGradient/);
 assert.equal((one.match(/<linearGradient/g)||[]).length,2);
 assert.ok(!one.includes('id="ga-grad-0" gradientUnits'),one);
 assert.match(one,/gradientUnits="objectBoundingBox"/);
 assert.doesNotMatch(one,/<script|url\(https?:|foreignObject/i);
});
test('solid appearance controls fill; descriptive material alone is not a paint instruction',()=>{
 const one=renderSvg(make({material:'metal',basePaint:{kind:'solid',color:'#b28a62'}}));
 assert.match(one,/fill="#b28a62"/);
 const legacy=renderSvg(make(undefined));
 const material=renderSvg(make({material:'metal'}));
 assert.equal(material.replace(/\s+/g,''),legacy.replace(/\s+/g,''),'material label must not draw new effects');
});
