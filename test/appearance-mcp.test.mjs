import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRenderBudget } from '../src/mcp/render-budget.mjs';
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
