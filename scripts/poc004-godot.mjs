import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(await readFile(join(root, "examples/spirit-lantern/source.json"), "utf8"));
const cutout = JSON.parse(await readFile(join(root, "examples/spirit-lantern/cutout.json"), "utf8"));
const workspace = await mkdtemp(join(tmpdir(), "game-artist-poc004-"));
const generated = join(root, "examples", "spirit-lantern", "generated", "godot");

const child = spawn(
  process.execPath,
  [join(root, "src/mcp/server.mjs"), "--workspace", workspace],
  { stdio: ["pipe", "pipe", "pipe"] }
);

let buffer = "";
let stderr = "";
let nextId = 1;
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
    const waiter = pending.get(message.id);
    if (!waiter) continue;
    pending.delete(message.id);
    waiter.resolve(message);
  }
});
child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => { stderr += chunk; });

function request(method, params = undefined) {
  const requestId = nextId++;
  return new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error("timeout waiting for " + method + "; stderr=" + stderr));
    }, 20000);
    pending.set(requestId, {
      resolve: (value) => {
        clearTimeout(timeout);
        resolvePromise(value);
      }
    });
    child.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method,
      ...(params === undefined ? {} : { params })
    }) + "\n");
  });
}

async function tool(name, args) {
  const response = await request("tools/call", { name, arguments: args });
  if (response.result?.isError) {
    throw new Error(name + " failed: " + (response.result.content?.[0]?.text ?? "unknown"));
  }
  return response.result;
}

try {
  await request("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "poc004-godot", version: "1.0.0" }
  });

  await tool("asset_create", {
    asset_id: cutout.assetId,
    width: source.canvas.width,
    height: source.canvas.height
  });

  await tool("document_apply_ops", {
    asset_id: cutout.assetId,
    expected_revision: 0,
    idempotency_key: "poc004-source",
    operations: source.nodes.map((node) => ({ type: "node.add", node }))
  });

  await tool("export_godot_cutout", {
    asset_id: cutout.assetId,
    cutout
  });

  const sourceProject = join(workspace, "assets", cutout.assetId, "godot");
  await rm(generated, { recursive: true, force: true });
  await cp(sourceProject, generated, { recursive: true });

  for (const path of [
    "project.godot",
    "main.tscn",
    "validation.gd",
    "assets/spirit_lantern/asset.json",
    "assets/spirit_lantern/spirit_lantern.tscn",
    "assets/spirit_lantern/parts/body.svg",
    "assets/spirit_lantern/parts/flame.svg",
    "assets/spirit_lantern/parts/talisman_left.svg",
    "assets/spirit_lantern/parts/talisman_right.svg",
    "assets/spirit_lantern/parts/tassel.svg"
  ]) {
    assert.ok((await stat(join(generated, path))).size > 0, path + " must be non-empty");
  }

  console.log(JSON.stringify({
    ok: true,
    asset: cutout.assetId,
    parts: cutout.parts.length,
    animations: cutout.animations.length,
    godotProject: "examples/spirit-lantern/generated/godot"
  }, null, 2));
} finally {
  child.kill("SIGTERM");
  await rm(workspace, { recursive: true, force: true });
}
