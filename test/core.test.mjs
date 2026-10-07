import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { applyOperations, createAssetState } from "../src/core/engine.mjs";
import { renderSvg } from "../src/core/render-svg.mjs";
import { validateDocument } from "../src/core/validate.mjs";

const fixture = JSON.parse(
  await readFile(new URL("../examples/jade-spirit-stone/document.json", import.meta.url), "utf8")
);

test("fixture is valid", () => {
  const result = validateDocument(fixture);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("render is deterministic for identical document", () => {
  const first = renderSvg(fixture);
  const second = renderSvg(JSON.parse(JSON.stringify(fixture)));
  assert.equal(first, second);
  assert.match(first, /id="spirit-core"/);
});

test("operations are revision checked and preserve valid state", () => {
  const initial = createAssetState(fixture);

  const next = applyOperations(initial, {
    expectedRevision: 0,
    idempotencyKey: "test-highlight-adjustment",
    operations: [
      {
        type: "node.update",
        id: "highlight",
        patch: { opacity: 0.62, rx: 7.5 }
      }
    ]
  });

  assert.equal(next.revision, 1);
  assert.equal(next.document.nodes.find((node) => node.id === "highlight").opacity, 0.62);
  assert.equal(validateDocument(next.document).ok, true);

  assert.throws(
    () =>
      applyOperations(next, {
        expectedRevision: 0,
        operations: [{ type: "node.remove", id: "highlight" }]
      }),
    /revision conflict/
  );
});

test("invalid transaction is rejected atomically", () => {
  const initial = createAssetState(fixture);
  assert.throws(
    () =>
      applyOperations(initial, {
        expectedRevision: 0,
        operations: [
          {
            type: "node.update",
            id: "highlight",
            patch: { opacity: 5 }
          }
        ]
      }),
    /transaction rejected/
  );
  assert.equal(initial.revision, 0);
});
