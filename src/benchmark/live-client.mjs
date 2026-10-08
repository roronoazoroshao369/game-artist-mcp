import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const server = fileURLToPath(new URL("../mcp/server.mjs", import.meta.url));
const MAX_RESPONSE = 4 * 1024 * 1024;

/** One bounded, real JSON-RPC call to the repository MCP server; not a fixture replay. */
export async function callLocalMcpTool(workspace, name, args = {}) {
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(name)) throw new Error("invalid MCP tool name");
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("invalid arguments");
  const child = spawn(process.execPath, [server, "--workspace", resolve(workspace)], {
    stdio: ["pipe", "pipe", "pipe"]
  });
  let buffer = "", stderr = "";
  let id = 0;
  const pending = new Map();
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", chunk => {
    buffer += chunk;
    if (buffer.length > MAX_RESPONSE) {
      for (const entry of pending.values()) entry.reject(new Error("MCP response size exceeded"));
      pending.clear();
      child.kill();
      return;
    }
    for (;;) {
      const index = buffer.indexOf("\n");
      if (index === -1) break;
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        const entry = pending.get(msg.id);
        if (entry) { pending.delete(msg.id); entry.resolve(msg); }
      } catch (e) {
        for (const entry of pending.values()) entry.reject(e);
        pending.clear();
      }
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(-2000); });
  child.on("error", error => {
    for (const entry of pending.values()) entry.reject(error);
    pending.clear();
  });
  const send = (method, params) => new Promise((resolvePromise, reject) => {
    const requestId = ++id;
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error("MCP request timed out: " + method + "; " + stderr));
    }, 10000);
    pending.set(requestId, {
      resolve: msg => { clearTimeout(timeout); resolvePromise(msg); },
      reject: err => { clearTimeout(timeout); reject(err); }
    });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params }) + "\n");
  });
  try {
    const init = await send("initialize", {
      protocolVersion: "2025-11-25", capabilities: {},
      clientInfo: { name: "game-artist-live-benchmark", version: "1.0.0" }
    });
    if (init.error || init.result?.serverInfo?.name !== "game-artist-mcp") throw new Error("MCP initialize failed");
    const reply = await send("tools/call", { name, arguments: args });
    if (reply.error) return { isError: true, error: String(reply.error.message || "MCP protocol error") };
    const response = reply.result;
    const txt = response?.content?.find(part => part.type === "text")?.text;
    const png64 = response?.content?.find(part => part.type === "image" && part.mimeType === "image/png")?.data;
    let result;
    try { result = JSON.parse(txt); } catch { result = { message: txt ?? "" }; }
    return {
      result,
      ...(response?.isError ? { isError: true, error: String(txt || "MCP tool error") } : {}),
      ...(png64 ? { png: Buffer.from(png64, "base64") } : {})
    };
  } finally {
    child.kill("SIGTERM");
  }
}
