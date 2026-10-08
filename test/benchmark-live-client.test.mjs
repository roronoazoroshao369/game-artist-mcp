import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { callLocalMcpTool } from "../src/benchmark/live-client.mjs";

test("live agent transport calls actual MCP tools and returns inspectable PNG", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "game-artist-live-client-"));
  try {
    const profile = await callLocalMcpTool(workspace, "style_profile_get", { profile_id: "dark-cultivation-v1" });
    assert.equal(profile.result.profile.id, "dark-cultivation-v1");

    const created = await callLocalMcpTool(workspace, "asset_create", { asset_id: "client_probe", width: 64, height: 64 });
    assert.equal(created.result.revision, 0);

    const edited = await callLocalMcpTool(workspace, "document_apply_ops", {
      asset_id: "client_probe", expected_revision: 0,
      operations: [{ type: "node.add", node: {
        id: "body", type: "ellipse", cx: 32, cy: 32, rx: 12, ry: 21,
        fill: "#438f8d", stroke: "#211c1a", strokeWidth: 3
      } }]
    });
    assert.equal(edited.result.revision, 1);

    const preview = await callLocalMcpTool(workspace, "render_preview", { asset_id: "client_probe" });
    assert.equal(preview.result.revision, 1);
    assert.equal(preview.png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.ok(preview.png.length > 100);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("live MCP client returns tool errors instead of silently accepting them", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "game-artist-live-client-errors-"));
  try {
    const failed = await callLocalMcpTool(workspace, "asset_get", { asset_id: "missing" });
    assert.equal(failed.isError, true);
    assert.match(failed.error, /missing|not found/i);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
