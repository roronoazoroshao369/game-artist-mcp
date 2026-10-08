export function selectCleanupCandidates({ branches, mergedPulls, openPulls, mainSha, repoFullName, defaultBranch = "main" }) {
  if (!mainSha || !repoFullName || !Array.isArray(branches)) throw new Error("cleanup evidence is incomplete");

  const merged = new Set(
    (mergedPulls ?? [])
      .filter((pr) =>
        pr.merged_at &&
        pr.base?.ref === defaultBranch &&
        pr.head?.repo?.full_name === repoFullName &&
        pr.head?.ref &&
        pr.head?.sha
      )
      .map((pr) => pr.head.ref + "\u0000" + pr.head.sha)
  );

  const open = new Set(
    (openPulls ?? [])
      .filter((pr) => pr.head?.repo?.full_name === repoFullName)
      .map((pr) => pr.head?.ref)
  );

  return branches
    .filter((branch) => {
      const name = branch?.name;
      const sha = branch?.commit?.sha;
      if (!name || !sha || name === defaultBranch || branch.protected || open.has(name)) return false;
      return sha === mainSha || merged.has(name + "\u0000" + sha);
    })
    .map((branch) => ({ name: branch.name, sha: branch.commit.sha }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isMergedAncestor(comparison) {
  return comparison?.behind_by === 0 &&
    (comparison.status === "ahead" || comparison.status === "identical");
}
