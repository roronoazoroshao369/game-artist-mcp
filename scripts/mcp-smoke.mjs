import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const workspace = await mkdtemp(join(tmpdir(), "game-artist-mcp-smoke-"));
const child = spawn(
  process.execPath,
  [join(root, "src/mcp/server.mjs"), "--workspace", workspace],
  { stdio: ["pipe", "pipe", "pipe"] }
);

let buffer = "";
const pending = new Map();

child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  buffer += chunk;
  for (;;) {
    const newline = buffer.indexOf("\n");
    if (newline < 0) break;
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const message = JSON.parse(line);
    const entry = pending.get(message.id);
    if (entry) {
      pending.delete(message.id);
      entry.resolve(message);
    }
  }
});

let stderr = "";
child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

function call(id, method, params = undefined) {
  return new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`timeout waiting for MCP response ${id}; stderr=${stderr}`));
    }, 10_000);
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timeout);
        resolvePromise(value);
      }
    });
    child.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      ...(params === undefined ? {} : { params })
    }) + "\n");
  });
}

try {
  const init = await call(1, "initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "game-artist-smoke", version: "1.0.0" }
  });
  assert.equal(init.result.serverInfo.name, "game-artist-mcp");

  const listed = await call(2, "tools/list");
  const names = listed.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, [
    "health",
    "asset_create",
    "asset_get",
    "document_query",
    "document_apply_ops",
    "render_preview",
    "validate_asset",
    "export_asset"
  ]);

  const health = await call(3, "tools/call", { name: "health", arguments: {} });
  assert.equal(health.result.isError, undefined);

  const created = await call(4, "tools/call", {
    name: "asset_create",
    arguments: { asset_id: "smoke_stone", width: 128, height: 128 }
  });
  assert.equal(created.result.isError, undefined);

  const edited = await call(5, "tools/call", {
    name: "document_apply_ops",
    arguments: {
      asset_id: "smoke_stone",
      expected_revision: 0,
      idempotency_key: "smoke-construct-1",
      operations: [
        {
          type: "node.add",
          node: {
            id: "outer",
            type: "polygon",
            points: [[64, 8], [108, 64], [64, 120], [20, 64]],
            fill: "#5f9f80",
            stroke: "#18231f",
            strokeWidth: 7
          }
        },
        {
          type: "node.add",
          node: {
            id: "core",
            type: "ellipse",
            cx: 64,
            cy: 62,
            rx: 17,
            ry: 25,
            fill: "#b9ffe2",
            stroke: "#eafff6",
            strokeWidth: 3
          }
        }
      ]
    }
  });
  assert.equal(edited.result.isError, undefined);

  const stale = await call(6, "tools/call", {
    name: "document_apply_ops",
    arguments: {
      asset_id: "smoke_stone",
      expected_revision: 0,
      operations: [{ type: "node.remove", id: "core" }]
    }
  });
  assert.equal(stale.result.isError, true);
  assert.match(stale.result.content[0].text, /revision conflict/);

  const preview = await call(7, "tools/call", {
    name: "render_preview",
    arguments: { asset_id: "smoke_stone" }
  });
  assert.equal(preview.result.isError, undefined);
  const image = preview.result.content.find((block) => block.type === "image");
  assert.ok(image);
  const bytes = Buffer.from(image.data, "base64");
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  const validation = await call(8, "tools/call", {
    name: "validate_asset",
    arguments: { asset_id: "smoke_stone" }
  });
  assert.equal(validation.result.isError, undefined);

  const exported = await call(9, "tools/call", {
    name: "export_asset",
    arguments: { asset_id: "smoke_stone" }
  });
  assert.equal(exported.result.isError, undefined);

  for (const name of ["asset.svg", "asset.png", "report.json"]) {
    const file = join(workspace, "assets", "smoke_stone", "output", name);
    assert.ok((await stat(file)).size > 0, `${name} should be non-empty`);
  }

  const state = JSON.parse(
    await readFile(join(workspace, "assets", "smoke_stone", "state.json"), "utf8")
  );
  assert.equal(state.revision, 1);
  assert.equal(state.document.nodes.length, 2);

  console.log(JSON.stringify({
    ok: true,
    tools: names.length,
    finalRevision: state.revision,
    pngBytes: bytes.byteLength
  }, null, 2));
} finally {
  child.kill("SIGTERM");
  await rm(workspace, { recursive: true, force: true });
}
