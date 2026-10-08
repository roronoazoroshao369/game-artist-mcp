# Branch policy — only main after verified delivery

The final target is **exactly one remote branch: `main`**.

Temporary development branches and PRs are allowed during work. Cleanup is part of the definition of done.

## Safety requirements

After the `ci` workflow succeeds on a `main` push, the cleanup action examines current branches and closed PRs.
A non-protected branch may be deleted only when:

- Its exact commit SHA equals the current `main` SHA; or
- A same-repository PR merged to `main`, with its recorded final head SHA matching the branch's current SHA.

Cleanup never deletes `main`, protected branches, branches with open PRs, or branch heads that changed after an earlier merge.
It also checks the branch head immediately before deletion and skips a stale CI run if `main` moved.

Unmerged branches require inspection, verification, and merge before deletion. Squash-merged PRs should not be merged a second time.

## Required evidence

1. PR CI successful on exact head.
2. PR merged to `main`.
3. Post-merge `main` CI successful.
4. Branch cleanup job succeeded.
5. GitHub branch listing confirms only `main`.

GitHub Actions needs `contents: write` and `pull-requests: read` permissions. If the repository restricts this token,
the cleanup job fails visibly; an administrator must grant the permission or manually delete independently verified branches.
