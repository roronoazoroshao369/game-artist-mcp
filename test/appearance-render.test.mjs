import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSvg} from '../src/core/render-svg.mjs';
const make=appearance=>({version:1,canvas:{width:64,height:64,background:'transparent'},nodes:[{id:'ga-grad-0',type:'ellipse',cx:32,cy:32,rx:12,ry:10,fill:'#211c1a',stroke:'#332820',strokeWidth:2,appearance},{id:'second',type:'polygon',points:[[3,3],[12,3],[3,12]],fill:'#332820',appearance}]});
const grad={basePaint:{kind:'linearGradient',start:[0,0],end:[1,1],stops:[{at:0,color:'#211c1a',opacity:1},{at:1,color:'#b28a62',opacity:1}]}};
test('line and quadratic surface marks are clipped to original transformed shape',()=>{
 const mark={material:'fabric',surfaceMarks:[
  {kind:'line',from:[0,0],to:[1,1],color:'#d8c59d',width:2,opacity:0.75},
  {kind:'quadratic',from:[0,1],control:[0.5,0.2],to:[1,0],color:'#b28a62',width:3,opacity:0.5}
 ]};
 const d=make(mark);d.nodes[0].transform='translate(3 4)';d.nodes[1].appearance=undefined;
 const svg=renderSvg(d);
 assert.match(svg,/<clipPath /);
 assert.match(svg,/clipPathUnits="userSpaceOnUse"/);
 assert.match(svg,/transform="translate\(3 4\)"/);
 assert.match(svg,/clip-path="url\(#ga-clip-/);
 assert.match(svg,/M 0 0 L 64 64/);
 assert.match(svg,/M 0 64 Q 32 12.8 64 0/);
 const same=renderSvg(make({material:'fabric'}));
 assert.doesNotMatch(same,/clipPath|surfaceMarks/);
 assert.equal(svg,renderSvg(d));
});

test('spirit emission is behind normal node and bounded on canvas',()=>{
 const d=make({material:'spirit',outerGlow:{color:'#69d7cf',opacity:0.5,radius:4}});
 d.nodes[0].opacity=0.8;
 d.nodes[1].appearance=undefined;
 const svg=renderSvg(d);
 assert.match(svg,/feGaussianBlur stdDeviation="4"/);
 assert.match(svg,/filterUnits="userSpaceOnUse"/);
 assert.match(svg,/filter="url\(#ga-glow-/);
 assert.match(svg,/opacity="0.4"/);
 assert.ok(svg.indexOf('filter="url(#ga-glow-')<svg.indexOf('id="ga-grad-0"'));
 assert.match(svg,/width="88" height="88"/);
 assert.equal(svg,renderSvg(d));
});

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
