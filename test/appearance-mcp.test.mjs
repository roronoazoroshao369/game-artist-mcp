import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRenderBudget,assertPngFileSize } from '../src/mcp/render-budget.mjs';
import { parseUniqueKeysJsonLine } from '../src/mcp/strict-json.mjs';
test('duplicate keys in nested RPC JSON cannot overwrite appearance constraints',()=>{
 assert.throws(()=>parseUniqueKeysJsonLine('{"method":"tools/call","params":{"arguments":{"appearance":{"outerGlow":null,"outerGlow":{"radius":0}}}}}'),/duplicate/i);
 assert.throws(()=>parseUniqueKeysJsonLine('{"x":1,"x":2}'),/duplicate/i);
 assert.throws(()=>parseUniqueKeysJsonLine('{"abc":'+('1'.repeat(262145))+'}'),/size|limit/i);
 assert.deepEqual(parseUniqueKeysJsonLine('{"x":[{"y":1},true,null,"escaped \\"value\\\""]}').x[0],{y:1});
});

test('renderer byte budgets reject oversized SVG and PNG',()=>{
 assert.throws(()=>checkRenderBudget('x'.repeat(1048577),Buffer.from([])),/SVG.*budget/);
 assert.throws(()=>checkRenderBudget('<svg/>',Buffer.alloc(8388609)),/PNG.*budget/);
 assert.doesNotThrow(()=>checkRenderBudget('<svg/>',Buffer.from([137,80,78,71,13,10,26,10])));
});

test('invalid JSON-RPC duplicate key returns bounded protocol error rather than hanging',async()=>{
 const {spawn}=await import('node:child_process');
 const {mkdtemp,rm}=await import('node:fs/promises');
 const {join}=await import('node:path');
 const {tmpdir}=await import('node:os');
 const root=await mkdtemp(join(tmpdir(),'ga-jsonrpc-error-'));
 const child=spawn(process.execPath,['src/mcp/server.mjs','--workspace',root],{stdio:['pipe','pipe','pipe']});
 try{
  const outcome=new Promise((resolve,reject)=>{
    let output='';
    const timeout=setTimeout(()=>reject(new Error('no JSON-RPC error response within 1000ms')),1000);
    child.stdout.on('data',chunk=>{
      output+=chunk.toString();
      if(output.includes(String.fromCharCode(10))){clearTimeout(timeout);resolve(JSON.parse(output.trim().split(String.fromCharCode(10))[0]));}
    });
    child.on('error',reject);
  });
  child.stdin.write('{"jsonrpc":"2.0","id":1,"method":"ping","method":"initialize"}'+String.fromCharCode(10));
  const response=await outcome;
  assert.equal(response.jsonrpc,'2.0');
  assert.equal(response.error.code,-32600);
 }finally{child.kill();await rm(root,{recursive:true,force:true});}
});

test('large rendered PNG rejected using file stat before reading bytes',()=>{
 assert.doesNotThrow(()=>assertPngFileSize(8388608));
 assert.throws(()=>assertPngFileSize(8388609),/PNG.*budget/);
});
