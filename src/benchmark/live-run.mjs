import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFile, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { callLocalMcpTool } from "./live-client.mjs";
import { renderSvg } from "../core/render-svg.mjs";

const TOOLS = new Set(["health", "style_profile_get", "asset_create", "asset_get", "document_query",
  "document_apply_ops", "render_preview", "validate_asset", "style_validate", "export_asset"]);
const PROFILES = new Set(["dark-cultivation-v1"]);

export function countCorrectionRounds(trace) {
  let rendered = false, pendingCorrection = false, rounds = 0;
  for (const event of trace) {
    if (event.result?.isError) continue;
    if (event.tool === "render_preview") {
      rendered = true;
      pendingCorrection = false;
    } else if (event.tool === "document_apply_ops" && rendered && !pendingCorrection) {
      rounds++;
      pendingCorrection = true;
    }
  }
  return rounds;
}
const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function assetWorkspace(root) {
  return join(resolve(root), ".game-artist", "live-assets");
}
async function safeEvidenceDirectory(root, runId) {
  let current = resolve(root);
  for (const component of ["benchmarks", "poc005a", "runs", runId]) {
    current = join(current, component);
    try { await mkdir(current); } catch (e) { if (e.code !== "EEXIST") throw e; }
    const st = await lstat(current);
    if (st.isSymbolicLink() || !st.isDirectory()) throw new Error("symlink/non-directory evidence path refused");
  }
  return current;
}
async function refuseSymlinkFiles(directory, ...names) {
  for (const name of names) {
    try {
      const stat = await lstat(join(directory, name));
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("symlink/non-file evidence refused: " + name);
    } catch (e) { if (e.code !== "ENOENT") throw e; }
  }
}
function sensitiveKeys(input) {
  if (Array.isArray(input)) return input.some(sensitiveKeys);
  if (input && typeof input === "object") {
    return Object.entries(input).some(([key, value]) =>
      /^(?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|cookie)$/i.test(key) || sensitiveKeys(value));
  }
  return false;
}
function asResult(value) {
  return value.isError ? { isError: true, error: value.error } : value.result;
}

async function finish(root, runId, directory, trace) {
  const brief = await readFile(join(directory, "brief.md"));
  const final = trace.filter(e => !e.result?.isError);
  const validation = final.filter(e => e.tool === "validate_asset").at(-1)?.result;
  const style = final.filter(e => e.tool === "style_validate").at(-1)?.result;
  const events = trace.filter(e => e.tool === "render_preview" && !e.result?.isError);
  const writes = trace.filter(e => e.tool === "document_apply_ops" && !e.result?.isError);
  const correctionRounds = countCorrectionRounds(trace);
  const lastRevision = final.filter(e => e.tool === "export_asset").at(-1)?.result?.revision;
  const elapsedMs = Math.max(0, Date.parse(trace.at(-1).timestamp) - Date.parse(trace[0].timestamp));
  const projectSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: resolve(root), encoding: "utf8" }).trim();
  const rendererVersion = execFileSync("rsvg-convert", ["--version"], { encoding: "utf8" }).trim().slice(0, 120);
  const metadata = {
    runId, projectSha, serverVersion: "0.0.3", profileId: "dark-cultivation-v1", profileVersion: 1,
    rendererVersion, briefSha256: createHash("sha256").update(brief).digest("hex"),
    toolCalls: trace.length, operationCount: writes.reduce((sum, e) => sum + e.arguments.operations.length, 0),
    renderCount: events.length, correctionRounds, elapsedMs,
    outcome: "AGENT_PROVENANCE_PENDING", agentProvenance: "UNKNOWN"
  };
  const report = {
    profileId: "dark-cultivation-v1", revision: lastRevision,
    artIr: validation ?? { ok: false }, style: style ?? { ok: false }, reviewerStatus: "SELF_REVIEW"
  };
  await writeFile(join(directory, "run.json"), JSON.stringify(metadata, null, 2) + "\n");
  await writeFile(join(directory, "technical-report.json"), JSON.stringify(report, null, 2) + "\n");
}

/**
 * Each invocation is one agent-supplied tool call: no stored shape recipes,
 * deterministic generators or pre-authored correction scripts.
 * The trace is LOCAL STRUCTURAL evidence only; external authorship is pending.
 */
export async function runLiveRequest({ root, runId, tool, arguments: args = {}, phase }) {
  if (!SAFE_ID.test(runId)) throw new Error("invalid runId");
  if (!TOOLS.has(tool)) throw new Error("unsupported tool");
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("invalid arguments");
  if (sensitiveKeys(args) || /bearer\s+[a-z0-9._-]{8,}/i.test(JSON.stringify(args))) throw new Error("secret markers prohibited");
  if (JSON.stringify(args).length > 120_000) throw new Error("arguments too large");
  if (args.asset_id !== undefined && args.asset_id !== runId) throw new Error("asset_id must equal runId");
  if (tool === "style_profile_get" && !PROFILES.has(args.profile_id)) throw new Error("unrecognized profile");
  if (tool === "style_validate" && !PROFILES.has(args.profile_id)) throw new Error("unrecognized profile");
  if (tool === "render_preview" && !["initial", "revised"].includes(phase)) throw new Error("render phase required");
  const directory = await safeEvidenceDirectory(root, runId);
  const tracePath = join(directory, "transcript.jsonl");
  await refuseSymlinkFiles(directory, "transcript.jsonl", "initial.png", "initial.svg",
    "revised.png", "revised.svg", "run.json", "technical-report.json");
  const existing = await readFile(tracePath, "utf8").catch(e => {
    if (e.code === "ENOENT") return ""; throw e;
  });
  const records = existing.trim() ? existing.trim().split("\n").map(JSON.parse) : [];
  if (records.length >= 50) throw new Error("50-tool call budget exhausted");
  if (records.length && records[0].tool !== "style_profile_get") throw new Error("invalid trace prefix");
  if (!records.length && tool !== "style_profile_get") throw new Error("first MCP tool must be style_profile_get");
  const response = await callLocalMcpTool(assetWorkspace(root), tool, args);
  const record = { id: records.length + 1, timestamp: new Date().toISOString(),
    tool, arguments: args, result: asResult(response) };
  await appendFile(tracePath, JSON.stringify(record) + "\n", { encoding: "utf8", mode: 0o600 });
  if (response.png && !response.isError) {
    const state = JSON.parse(await readFile(
      join(assetWorkspace(root), "assets", runId, "state.json"), "utf8"));
    await writeFile(join(directory, phase + ".png"), response.png);
    await writeFile(join(directory, phase + ".svg"), renderSvg(state.document).replace(/^<\?xml[^>]*>\s*/, ""));
  }
  if (tool === "export_asset" && !response.isError) {
    await finish(root, runId, directory, [...records, record]);
  }
  return { isError: !!response.isError, result: response.result, error: response.error,
    ...(response.png ? { pngBase64: response.png.toString("base64") } : {}),
    transcriptIndex: record.id, directory };
}
