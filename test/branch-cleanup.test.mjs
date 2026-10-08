import assert from "node:assert/strict";
import test from "node:test";
import { isMergedAncestor, selectCleanupCandidates } from "../src/branch-cleanup.mjs";

const repoFullName = "example/art";
const mainSha = "main-sha";
const branch = (name, sha, protectedBranch = false) => ({
  name, commit: { sha }, protected: protectedBranch
});
const pr = (name, sha, merged = true) => ({
  merged_at: merged ? "2026-10-08T00:00:00Z" : null,
  base: { ref: "main" },
  head: { ref: name, sha, repo: { full_name: repoFullName } }
});

test("removes only safe merged heads and identical main refs", () => {
  const names = selectCleanupCandidates({
    repoFullName, mainSha,
    branches: [
      branch("main", mainSha),
      branch("docs/empty", mainSha),
      branch("poc/001", "old-head"),
      branch("poc/002", "changed-head"),
      branch("new-unmerged", "something-else"),
      branch("protected", mainSha, true)
    ],
    mergedPulls: [pr("poc/001", "old-head"), pr("poc/002", "outdated-head")],
    openPulls: []
  }).map(x => x.name);
  assert.deepEqual(names, ["docs/empty", "poc/001"]);
});

test("keeps open PR heads even if a prior PR merged", () => {
  const result = selectCleanupCandidates({
    repoFullName, mainSha,
    branches: [branch("feature", "same-sha")],
    mergedPulls: [pr("feature", "same-sha")],
    openPulls: [pr("feature", "same-sha", false)]
  });
  assert.deepEqual(result, []);
});

test("does not use foreign repository PRs as evidence", () => {
  const foreign = pr("feature", "same-sha");
  foreign.head.repo.full_name = "someone/else";
  const result = selectCleanupCandidates({
    repoFullName, mainSha,
    branches: [branch("feature", "same-sha")],
    mergedPulls: [foreign],
    openPulls: []
  });
  assert.deepEqual(result, []);
});

test("requires trustworthy main/repository evidence", () => {
  assert.throws(() => selectCleanupCandidates({ branches: [], mainSha: "", repoFullName }), /incomplete/);
});

test("accepts only a fully merged ancestor commit", () => {
  assert.equal(isMergedAncestor({ status: "ahead", ahead_by: 3, behind_by: 0 }), true);
  assert.equal(isMergedAncestor({ status: "identical", ahead_by: 0, behind_by: 0 }), true);
  assert.equal(isMergedAncestor({ status: "diverged", ahead_by: 3, behind_by: 2 }), false);
  assert.equal(isMergedAncestor({ status: "behind", ahead_by: 0, behind_by: 2 }), false);
  assert.equal(isMergedAncestor(null), false);
});
