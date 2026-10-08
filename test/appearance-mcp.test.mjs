import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRenderBudget } from '../src/mcp/render-budget.mjs';
test('renderer byte budgets reject oversized SVG and PNG',()=>{
 assert.throws(()=>checkRenderBudget('x'.repeat(1048577),Buffer.from([])),/SVG.*budget/);
 assert.throws(()=>checkRenderBudget('<svg/>',Buffer.alloc(8388609)),/PNG.*budget/);
 assert.doesNotThrow(()=>checkRenderBudget('<svg/>',Buffer.from([137,80,78,71,13,10,26,10])));
});
