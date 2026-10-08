import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runLiveRequest, countCorrectionRounds } from "../src/benchmark/live-run.mjs";

test("multiple edits between the same pair of renders are ONE correction round", () => {
  const events = [
    { tool: "render_preview", result: { revision: 1 } },
    { tool: "document_apply_ops", result: { revision: 2 } },
    { tool: "document_apply_ops", result: { revision: 3 } },
    { tool: "render_preview", result: { revision: 3 } },
    { tool: "document_apply_ops", result: { revision: 4 } },
    { tool: "render_preview", result: { revision: 4 } }
  ];
  assert.equal(countCorrectionRounds(events), 2);
});

test("live request writes real RPC transcript and saved PNG/SVG preview", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-artist-live-run-"));
  try {
    const runId = "live_probe_001";
    await runLiveRequest({ root, runId, tool: "style_profile_get", arguments: { profile_id: "dark-cultivation-v1" } });
    await runLiveRequest({ root, runId, tool: "asset_create", arguments: { asset_id: runId, width: 64, height: 64 } });
    await runLiveRequest({ root, runId, tool: "document_apply_ops", arguments: {
      asset_id: runId, expected_revision: 0,
      operations: [{ type: "node.add", node: { id: "v", type: "ellipse", cx: 32, cy: 32, rx: 10, ry: 15,
        fill: "#438f8d", stroke: "#211c1a", strokeWidth: 2 } }]
    } });
    const render = await runLiveRequest({ root, runId, tool: "render_preview", arguments: { asset_id: runId }, phase: "initial" });
    assert.equal(render.result.revision, 1);
    assert.equal(Buffer.from(render.pngBase64, "base64").subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    const directory = join(root, "benchmarks/poc005a/runs", runId);
    assert.match(await readFile(join(directory, "initial.svg"), "utf8"), /^<svg /);
    const trace = (await readFile(join(directory, "transcript.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
    assert.deepEqual(trace.map(e => e.tool), ["style_profile_get", "asset_create", "document_apply_ops", "render_preview"]);
    assert.deepEqual(trace.map(e => e.id), [1, 2, 3, 4]);
    assert.equal(trace[3].result.revision, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("live transport refuses symlinked evidence directory before creating trace", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-artist-link-run-"));
  try {
    const outside = join(root, "outside");
    const runs = join(root, "benchmarks", "poc005a", "runs");
    await mkdir(outside, { recursive: true });
    await mkdir(runs, { recursive: true });
    await symlink(outside, join(runs, "linked_run"));
    await assert.rejects(runLiveRequest({ root, runId: "linked_run", tool: "style_profile_get",
      arguments: { profile_id: "dark-cultivation-v1" } }), /symlink/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("live request forbids traversal-style run IDs and unrecognized tools", async () => {
  await assert.rejects(runLiveRequest({ root: "/tmp", runId: "../escape", tool: "health", arguments: {} }), /runId/);
  await assert.rejects(runLiveRequest({ root: "/tmp", runId: "valid", tool: "arbitrary_command", arguments: {} }), /tool/);
});
