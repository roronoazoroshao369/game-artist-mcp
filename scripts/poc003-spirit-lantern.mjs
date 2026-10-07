import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedDir = join(root, "examples", "spirit-lantern", "generated");
const workspace = await mkdtemp(join(tmpdir(), "game-artist-poc003-"));
await mkdir(generatedDir, { recursive: true });

const child = spawn(
  process.execPath,
  [join(root, "src", "mcp", "server.mjs"), "--workspace", workspace],
  { stdio: ["pipe", "pipe", "pipe"] }
);

let buffer = "";
let stderr = "";
let nextId = 1;
let toolCalls = 0;
let renderCalls = 0;
let operationCount = 0;
const pending = new Map();
const startedAt = Date.now();

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
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

function request(method, params = undefined) {
  const id = nextId++;
  return new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`timeout waiting for ${method}; stderr=${stderr}`));
    }, 15_000);

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

async function tool(name, args) {
  toolCalls += 1;
  if (name === "render_preview") renderCalls += 1;
  if (name === "document_apply_ops") operationCount += args.operations?.length ?? 0;
  const response = await request("tools/call", { name, arguments: args });
  if (response.result?.isError) {
    throw new Error(`${name} failed: ${response.result.content?.[0]?.text ?? "unknown error"}`);
  }
  return response.result;
}

function parseText(result) {
  const block = result.content?.find((item) => item.type === "text");
  return block ? JSON.parse(block.text) : null;
}

function imageBytes(result) {
  const image = result.content?.find((item) => item.type === "image");
  if (!image) throw new Error("render_preview returned no image block");
  return Buffer.from(image.data, "base64");
}

const draftOps = [
  {
    type: "node.add",
    node: {
      id: "handle",
      type: "path",
      d: "M76 78 C80 30 176 26 184 78",
      fill: "none",
      stroke: "#211c1a",
      strokeWidth: 12
    }
  },
  {
    type: "node.add",
    node: {
      id: "handle_inner",
      type: "path",
      d: "M82 77 C87 40 166 37 178 77",
      fill: "none",
      stroke: "#725342",
      strokeWidth: 5
    }
  },
  {
    type: "node.add",
    node: {
      id: "roof",
      type: "polygon",
      points: [[88, 72], [128, 47], [171, 73], [158, 90], [100, 90]],
      fill: "#594236",
      stroke: "#201b19",
      strokeWidth: 8
    }
  },
  {
    type: "node.add",
    node: {
      id: "roof_highlight",
      type: "path",
      d: "M101 72 Q128 55 156 73",
      fill: "none",
      stroke: "#98715a",
      strokeWidth: 4
    }
  },
  {
    type: "node.add",
    node: {
      id: "frame_body",
      type: "path",
      d: "M93 86 L103 239 Q128 260 153 239 L164 86 Z",
      fill: "#4a382f",
      stroke: "#201b19",
      strokeWidth: 9
    }
  },
  {
    type: "node.add",
    node: {
      id: "glass",
      type: "path",
      d: "M108 101 Q128 91 149 102 L145 222 Q128 238 111 222 Z",
      fill: "#4d9d9a",
      stroke: "#183838",
      strokeWidth: 5,
      opacity: 0.95
    }
  },
  {
    type: "node.add",
    node: {
      id: "glass_glow",
      type: "path",
      d: "M116 108 Q128 101 141 109 L138 216 Q128 226 118 216 Z",
      fill: "#69d7cf",
      stroke: "none",
      strokeWidth: 0,
      opacity: 0.55
    }
  },
  {
    type: "node.add",
    node: {
      id: "flame",
      type: "path",
      d: "M128 204 C105 190 113 170 127 157 C142 143 144 129 138 117 C160 134 158 158 145 174 C138 183 139 194 148 202 C144 218 132 225 128 204 Z",
      fill: "#b8fff4",
      stroke: "#eafffb",
      strokeWidth: 4
    }
  },
  {
    type: "node.add",
    node: {
      id: "flame_core",
      type: "path",
      d: "M129 198 C119 188 121 177 130 168 C138 160 140 151 137 145 C147 155 145 171 139 180 C134 186 135 192 140 197 C137 205 132 207 129 198 Z",
      fill: "#4ed7ca",
      stroke: "none",
      strokeWidth: 0
    }
  },
  {
    type: "node.add",
    node: {
      id: "base",
      type: "polygon",
      points: [[98, 233], [158, 233], [170, 251], [151, 267], [105, 267], [88, 251]],
      fill: "#4c392f",
      stroke: "#201b19",
      strokeWidth: 8
    }
  },
  {
    type: "node.add",
    node: {
      id: "left_hook",
      type: "path",
      d: "M98 116 C82 116 76 126 75 142",
      fill: "none",
      stroke: "#2c2420",
      strokeWidth: 6
    }
  },
  {
    type: "node.add",
    node: {
      id: "right_hook",
      type: "path",
      d: "M158 116 C174 116 180 126 181 142",
      fill: "none",
      stroke: "#2c2420",
      strokeWidth: 6
    }
  },
  {
    type: "node.add",
    node: {
      id: "talisman_left",
      type: "polygon",
      points: [[57, 137], [82, 141], [78, 201], [60, 207]],
      fill: "#d6c29a",
      stroke: "#332820",
      strokeWidth: 4
    }
  },
  {
    type: "node.add",
    node: {
      id: "talisman_right",
      type: "polygon",
      points: [[174, 141], [199, 137], [197, 205], [178, 201]],
      fill: "#d6c29a",
      stroke: "#332820",
      strokeWidth: 4
    }
  },
  {
    type: "node.add",
    node: {
      id: "seal_left",
      type: "ellipse",
      cx: 69,
      cy: 166,
      rx: 6,
      ry: 7,
      fill: "#983f35",
      stroke: "none",
      strokeWidth: 0
    }
  },
  {
    type: "node.add",
    node: {
      id: "seal_right",
      type: "ellipse",
      cx: 187,
      cy: 166,
      rx: 6,
      ry: 7,
      fill: "#983f35",
      stroke: "none",
      strokeWidth: 0
    }
  },
  {
    type: "node.add",
    node: {
      id: "tassel_cord",
      type: "path",
      d: "M128 264 C126 278 130 286 128 294",
      fill: "none",
      stroke: "#6b302e",
      strokeWidth: 5
    }
  },
  {
    type: "node.add",
    node: {
      id: "tassel",
      type: "polygon",
      points: [[117, 289], [139, 289], [146, 309], [128, 316], [110, 309]],
      fill: "#8f3834",
      stroke: "#2f1f1e",
      strokeWidth: 5
    }
  }
];

try {
  const init = await request("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "poc003-benchmark", version: "1.0.0" }
  });
  assert.equal(init.result.serverInfo.name, "game-artist-mcp");

  await request("tools/list");

  await tool("asset_create", {
    asset_id: "spirit_lantern",
    width: 256,
    height: 320
  });

  const edited = await tool("document_apply_ops", {
    asset_id: "spirit_lantern",
    expected_revision: 0,
    idempotency_key: "poc003-draft-1",
    operations: draftOps
  });
  assert.equal(parseText(edited).revision, 1);

  const validation = parseText(await tool("validate_asset", { asset_id: "spirit_lantern" }));
  assert.equal(validation.ok, true);

  const preview = await tool("render_preview", { asset_id: "spirit_lantern" });
  const png = imageBytes(preview);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  await writeFile(join(generatedDir, "draft.png"), png);

  await tool("export_asset", { asset_id: "spirit_lantern" });
  await cp(
    join(workspace, "assets", "spirit_lantern", "output", "asset.svg"),
    join(generatedDir, "draft.svg")
  );
  await cp(
    join(workspace, "assets", "spirit_lantern", "output", "report.json"),
    join(generatedDir, "technical-report.json")
  );

  const benchmark = {
    benchmark: "POC-003",
    asset: "spirit_lantern",
    stage: "draft-awaiting-visual-critique",
    protocol: "MCP",
    toolCalls,
    operations: operationCount,
    renders: renderCalls,
    correctionIterations: 0,
    hardValidationErrors: validation.errors.length,
    elapsedMs: Date.now() - startedAt,
    finalRevision: 1,
    visualReview: "PENDING"
  };

  await writeFile(
    join(generatedDir, "benchmark.json"),
    JSON.stringify(benchmark, null, 2) + "\n",
    "utf8"
  );

  console.log(JSON.stringify(benchmark, null, 2));
} finally {
  child.kill("SIGTERM");
  await rm(workspace, { recursive: true, force: true });
}
