import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateCutout } from "../src/cutout/validate.mjs";

const document = JSON.parse(
  await readFile(new URL("../examples/spirit-lantern/source.json", import.meta.url), "utf8")
);
const cutout = JSON.parse(
  await readFile(new URL("../examples/spirit-lantern/cutout.json", import.meta.url), "utf8")
);

test("Spirit Lantern cutout manifest is valid", () => {
  const result = validateCutout(document, cutout);
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("cutout validator rejects hierarchy cycles", () => {
  const broken = JSON.parse(JSON.stringify(cutout));
  broken.parts.find((part) => part.id === "body").parent = "flame";
  const result = validateCutout(document, broken);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("cycle")));
});

test("cutout validator rejects duplicate node ownership", () => {
  const broken = JSON.parse(JSON.stringify(cutout));
  broken.parts.find((part) => part.id === "flame").nodes.push("roof");
  const result = validateCutout(document, broken);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("multiple parts")));
});
