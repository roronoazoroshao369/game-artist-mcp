#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { selectCleanupCandidates } from "../src/branch-cleanup.mjs";

const API = "https://api.github.com";
const PAGE_SIZE = 100;

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repoFullName = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repoFullName || !eventPath) {
    throw new Error("Missing GITHUB_TOKEN, GITHUB_REPOSITORY or GITHUB_EVENT_PATH");
  }

  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const run = event.workflow_run;
  if (run?.name !== "ci" || run?.event !== "push" ||
      run?.head_branch !== "main" || run?.conclusion !== "success") {
    console.log("SKIPPED: not a successful main push CI run");
    return;
  }

  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) throw new Error("Invalid repository name");
  const prefix = "/repos/" + owner + "/" + repo;

  async function request(path, method = "GET", allow404 = false) {
    const response = await fetch(API + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) {
      const body = await response.text();
      throw new Error("GitHub " + method + " " + path + ": " + response.status + " " + body.slice(0, 400));
    }
    return response.status === 204 ? null : response.json();
  }

  async function listPages(path) {
    const results = [];
    for (let page = 1; page <= 50; page += 1) {
      const separator = path.includes("?") ? "&" : "?";
      const items = await request(path + separator + "per_page=" + PAGE_SIZE + "&page=" + page);
      if (!Array.isArray(items)) throw new Error("Unexpected paginated response");
      results.push(...items);
      if (items.length < PAGE_SIZE) return results;
    }
    throw new Error("Pagination safety cap hit: " + path);
  }

  const mainBranch = await request(prefix + "/branches/main");
  const mainSha = mainBranch.commit.sha;

  if (mainSha !== run.head_sha) {
    console.log("SKIPPED: main moved after CI started (" + run.head_sha + " -> " + mainSha + ")");
    return;
  }

  const branches = await listPages(prefix + "/branches");
  const [mergedPulls, openPulls] = await Promise.all([
    listPages(prefix + "/pulls?state=closed"),
    listPages(prefix + "/pulls?state=open")
  ]);
  const selected = selectCleanupCandidates({ branches, mergedPulls, openPulls, mainSha, repoFullName });

  console.log("main=" + mainSha + ", branches=" + branches.length + ", safe_delete=" + selected.length);
  const dryRun = process.env.BRANCH_CLEANUP_DRY_RUN === "1";

  for (const candidate of selected) {
    const refPath = prefix + "/git/ref/heads/" + candidate.name.split("/").map(encodeURIComponent).join("/");
    const current = await request(refPath, "GET", true);
    if (!current) {
      console.log("SKIP already deleted: " + candidate.name);
      continue;
    }
    if (current.object?.sha !== candidate.sha) {
      console.log("SKIP changed since inspection: " + candidate.name);
      continue;
    }
    if (dryRun) {
      console.log("DRY RUN " + candidate.name);
      continue;
    }
    await request(refPath.replace("/git/ref/", "/git/refs/"), "DELETE", true);
    console.log("DELETED " + candidate.name);
  }

  const remaining = await listPages(prefix + "/branches");
  console.log("Remaining branches: " + remaining.map((b) => b.name).join(", "));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
