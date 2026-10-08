import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { auditEvidence } from "../src/benchmark/evidence-audit.mjs";

const root = resolve(new URL("../benchmarks/poc005a/runs", import.meta.url).pathname);
for (const runId of ["cultivation_sword_20261008", "medicinal_pouch_20261008", "stone_censer_20261008"]) {
  test("real local MCP evidence for " + runId + " passes STRUCTURAL audit only", async () => {
    const directory = join(root, runId);
    const audit = await auditEvidence(directory);
    assert.equal(audit.ok, true, JSON.stringify(audit.errors));
    assert.equal(audit.metrics.toolCalls, 9);
    assert.equal(audit.metrics.renderCount, 2);
    assert.equal(audit.metrics.correctionRounds, 1);
    assert.equal(audit.metrics.finalRevision, 2);
    assert.equal(audit.autonomyVerified, false, "local trace cannot attest model authorship");
    assert.equal(audit.visualQualityVerified, false, "a self-review is not independent");
    const run = JSON.parse(await readFile(join(directory, "run.json"), "utf8"));
    assert.equal(run.outcome, "AGENT_PROVENANCE_PENDING");
    assert.equal(run.agentProvenance, "UNKNOWN");
    assert.ok(run.operationCount > 0 && run.toolCalls <= 50);
  });
}
