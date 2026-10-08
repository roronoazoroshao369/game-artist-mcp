#!/usr/bin/env node
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {renderSvg} from '../src/core/render-svg.mjs';
import {renderReviewPng} from '../src/benchmark/render-review.mjs';
import {assertSameGeometryPair,prepareBlindPairMetadata} from '../src/benchmark/appearance-pair.mjs';
import {inspectStyle} from '../src/style/inspect.mjs';
import {loadStyleProfile} from '../src/style/profile.mjs';
const dir=resolve('benchmarks/poc005b/generated');
await mkdir(dir,{recursive:true});
const before={version:1,canvas:{width:192,height:256,background:'transparent'},nodes:[{
 id:'technical_shape',type:'ellipse',cx:96,cy:128,rx:45,ry:90,
 fill:'#4d392f',stroke:'#211c1a',strokeWidth:3
}]};
const after=structuredClone(before);
after.nodes[0].appearance={
 material:'metal',
 basePaint:{kind:'linearGradient',start:[0,0],end:[1,1],
  stops:[{at:0,color:'#d8c59d',opacity:1},{at:0.5,color:'#a0785f',opacity:1},{at:1,color:'#4d392f',opacity:1}]},
 surfaceMarks:[{kind:'line',from:[0.42,0.25],to:[0.56,0.7],color:'#b28a62',width:2,opacity:0.8}],
 outerGlow:{color:'#69d7cf',radius:2,opacity:0.35}
};
assertSameGeometryPair(before,after);
const profile=await loadStyleProfile('dark-cultivation-v1');
const validity=inspectStyle(after,profile);
if(!validity.ok)throw new Error('technical A/B sample invalid: '+validity.errors.join('; '));
const label=prepareBlindPairMetadata({baseline:'baseline',enhanced:'enhanced',seed:'poc005b-technical-sample-v1'});
const variants={baseline:before,enhanced:after},meta={kind:'SYNTHETIC_TECHNICAL_FIXTURE_NOT_ARTISTIC_PROOF',
 reviewerStatus:'VISUAL_REVIEW_PENDING',agentProvenance:'UNKNOWN',
 sizes:[],style:validity,geometryEqual:true};
for(const [side,role] of Object.entries(label.sealedMapping)){
 const doc=variants[role];
 await writeFile(join(dir,side+'.svg'),renderSvg(doc));
 for(const n of [64,128]){
  const file=join(dir,side+'-'+n+'.png');
  const report=await renderReviewPng({document:doc,limitPx:n,rendererPath:'rsvg-convert',outputFile:file});
  meta.sizes.push({side,limitPx:n,...report});
 }
}
const html=(background)=>`<style>body{font:14px system-ui;background:#eee;padding:24px}section{display:flex;gap:24px}figure{padding:18px;border:1px solid #999}img{image-rendering:auto}.checker{background:conic-gradient(#fff 25%,#ccc 0 50%,#fff 0 75%,#ccc 0) 0 0/16px 16px}.dark{background:#17191c}.light{background:#fff}</style><h1>POC-005B Technical A/B (NOT independently reviewed)</h1><p>Both variants use identical source geometry; no artistic or agent-origin claim. These are real pixel-sized PNGs.</p>${['checker','dark','light'].map(bg=>'<h2>'+bg+'</h2><section>'+['A','B'].map(x=>'<figure class="'+bg+'"><h3>Variant '+x+'</h3><img src="'+x+'-64.png" width="48" height="64" alt="'+x+' 64px"><img src="'+x+'-128.png" width="96" height="128" alt="'+x+' 128px"></figure>').join('')+'</section>').join('')}`;
await writeFile(join(dir,'review.html'),html());
await writeFile(join(dir,'technical-report.json'),JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify({ok:true,kind:meta.kind,sizes:meta.sizes.map(x=>({side:x.side,size:x.width+'x'+x.height,sha256:x.sha256})),technicalOnly:true}));
