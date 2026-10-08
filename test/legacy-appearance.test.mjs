import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { renderSvg } from '../src/core/render-svg.mjs';
import { createAssetState,applyOperations } from '../src/core/engine.mjs';
const paths=['examples/jade-spirit-stone/document.json','examples/spirit-lantern/source.json'];
const sha=s=>createHash('sha256').update(s).digest('hex');

test('two legacy SVG fixtures remain byte-for-byte identical',async()=>{
  const values={};
  for(const p of paths){
    const doc=JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
    values[p]=sha(renderSvg(doc));
  }
  const text=await readFile(new URL('./fixtures/legacy-svg.sha256',import.meta.url),'utf8').catch(e=>{
    if(e.code==='ENOENT') assert.fail('missing baseline SHA fixture; original values '+JSON.stringify(values)); throw e;
  });
  const expected=Object.fromEntries(text.trim().split('\n').map(line=>{
    const m=/^([^ ]+) ([a-f0-9]{64})$/.exec(line);
    assert.ok(m,'invalid SHA fixture');
    return [m[1],m[2]];
  }));
  assert.deepEqual(Object.keys(expected).sort(),paths.slice().sort());
  assert.deepEqual(values,expected);
});
test('adding plain node preserves canonical revision/history structure',()=>{
 const doc={version:1,canvas:{width:64,height:64,background:'transparent'},nodes:[]};
 const state=createAssetState(doc);
 const after=applyOperations(state,{expectedRevision:0,idempotencyKey:'baseline',operations:[{type:'node.add',node:{type:'ellipse',id:'a',cx:20,cy:20,rx:4,ry:4,fill:'#211c1a'}}]});
 assert.equal(state.revision,0);
 assert.equal(after.revision,1);
 assert.equal(after.history.length,1);
 assert.equal(after.history[0].idempotencyKey,'baseline');
});
