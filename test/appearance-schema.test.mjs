import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDocument } from '../src/core/validate.mjs';
import {createAssetState,applyOperations} from '../src/core/engine.mjs';
const base={version:1,canvas:{width:64,height:64,background:'transparent'},nodes:[]};
const shape=(appearance,id='a')=>({...base,nodes:[{id,type:'ellipse',cx:20,cy:20,rx:12,ry:10,fill:'#211c1a',stroke:'#332820',strokeWidth:2,appearance}]});
const grad={kind:'linearGradient',start:[0,0],end:[1,1],stops:[{at:0,color:'#211c1a',opacity:1},{at:1,color:'#b28a62',opacity:0.7}]};
const err=(obj)=>validateDocument(obj).ok===false;
test('valid material gradient, marks and glow compose and legacy remains valid',()=>{
 assert.equal(validateDocument({...base,nodes:[{id:'plain',type:'ellipse',cx:4,cy:5,rx:3,ry:3}]}).ok,true);
 const a={material:'metal',basePaint:grad,surfaceMarks:[
  {kind:'line',from:[0,0],to:[1,1],color:'#211c1a',width:2,opacity:0.5},
  {kind:'quadratic',from:[0,0],control:[0.5,0.5],to:[1,1],color:'#d8c59d',width:3,opacity:1}
 ],outerGlow:{color:'#69d7cf',opacity:0.3,radius:4}};
 assert.equal(validateDocument(shape(a)).ok,true,JSON.stringify(validateDocument(shape(a)).errors));
});
test('strict appearance refuses untrusted fields, invalid paint, finite and range errors',()=>{
 const bad=[
 {material:'wood'},{unknown:1},{basePaint:{kind:'solid',color:'red'}},
 {basePaint:{...grad,end:[1.5,1]}},{basePaint:{...grad,stops:grad.stops.slice(0,1)}},
 {basePaint:{...grad,stops:[{at:0.3,color:'#211c1a',opacity:1},grad.stops[1]]}},
 {basePaint:{...grad,stops:[grad.stops[0],grad.stops[0]]}},
 {outerGlow:{color:'#69d7cf',opacity:1,radius:5}},
 {outerGlow:{color:'#69d7cf',opacity:NaN,radius:4}},
 {surfaceMarks:[{kind:'line',from:[0,0],to:[1,2],color:'#d8c59d',width:2,opacity:1}]},
 {surfaceMarks:[{kind:'quadratic',from:[0,0],to:[1,1],color:'#d8c59d',width:2,opacity:1}]},
 {surfaceMarks:Array.from({length:13},()=>({kind:'line',from:[0,0],to:[1,1],color:'#d8c59d',width:2,opacity:1}))},
 JSON.parse('{"__proto__":{"polluted":true}}'),
 {basePaint:{kind:'solid',color:'#211c1a',svg:'<script>x</script>'}},
 {basePaint:{kind:'solid',color:'#211c1a',filter:'url(http://evil)'}}
 ];
 for(const appearance of bad)assert.equal(err(shape(appearance)),true,JSON.stringify(appearance));
});
test('document effect budgets and malformed transaction cannot mutate state',()=>{
 const mark={kind:'line',from:[0,0],to:[1,1],color:'#211c1a',width:2,opacity:1};
 assert.equal(err({...base,nodes:Array.from({length:11},(_,i)=>({...shape({surfaceMarks:Array(12).fill(mark)}).nodes[0],id:'x'+i}))}),true);
 assert.equal(err({...base,nodes:Array.from({length:65},(_,i)=>({...shape({basePaint:grad}).nodes[0],id:'g'+i}))}),true);
 assert.equal(err({...base,nodes:Array.from({length:33},(_,i)=>({...shape({outerGlow:{color:'#69d7cf',opacity:0.5,radius:2}}).nodes[0],id:'gl'+i}))}),true);
 const state=createAssetState({...base,nodes:[{id:'x',type:'ellipse',cx:2,cy:2,rx:1,ry:1}]});
 assert.throws(()=>applyOperations(state,{expectedRevision:0,operations:[{type:'node.update',id:'x',patch:{appearance:{outerGlow:{radius:99,color:'#211c1a',opacity:1}}}}]}),/transaction rejected/);
 assert.equal(state.revision,0);assert.equal(state.history.length,0);
});
