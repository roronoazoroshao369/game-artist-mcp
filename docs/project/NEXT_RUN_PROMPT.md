# GAME ARTIST MCP — POC-005B CORRECTED VISUAL LOOP / NEXT RUN

Repository: `roronoazoroshao369/game-artist-mcp`  
Remote default branch and **only intended remaining branch**: `main`  
Communication: Vietnamese.  
Source of truth: inspect live GitHub `main`, PRs, workflows and remote branches first; this handoff can become stale.

## Latest VERIFIED product checkpoint — 2026-10-08

- Verified product `main`: `47aa1055855cc11b5cae2883f0fdbe0d036c76bf` (merged PR #13).
- PR #11: https://github.com/roronoazoroshao369/game-artist-mcp/pull/11 — retrospective same-geometry A/B for sword, herb pouch and stone censer (12 real alpha PNGs), merged as `7c67f93928d747abafc88a9e52287da5c270e905`.
- PR #12: https://github.com/roronoazoroshao369/game-artist-mcp/pull/12 — NEW SELF-SELECTED compass local MCP trial, 9 original calls and image inspection, merged as `2564484acd8ca716818f4922a6917dd8a0054b71`. This was **not** an independently assigned held-out prompt.
- PR #13: https://github.com/roronoazoroshao369/game-artist-mcp/pull/13 — image-grounded second correction of the compass's open bronze loop, preserving revision-2 intermediate PNG/SVG and maintaining full local MCP trace.
- PR #13 final head: `53b177ff8e8bbdfe499c74cb278dfd63d9dc9d0c`.
- Exact final push CI: `37813891318` **SUCCESS**; PR CI: `37813899741` **SUCCESS** (same head). Includes Godot 4.7.2 headless and pinned FolderForge child-MCP integration.
- Product merge commit: `47aa1055855cc11b5cae2883f0fdbe0d036c76bf`.
- Post-merge `main` CI `37814117901` **SUCCESS**; automatic branch cleanup `37814232821` **SUCCESS**.
- Verified remote branches after cleanup: **only `main`**.
- Verified local `npm run check` exit 0; **70/70 tests pass**, including new MCP trial and real 64/128px A/B comparison.
- This documentation closeout, once merged, will advance `main` again. Always verify docs PR exact-head push/PR CI, docs merge, new post-merge main CI and branch cleanup separately.

## What actually works

1. POC-001/002: deterministic explicit vector art, revision-checked atomic operations, stdio MCP and FolderForge plugin contract.
2. POC-003/004: original Spirit Lantern visual feedback loop and legacy Godot cutout exported/verified headlessly. Appearance-bearing Godot cutout still **UNSUPPORTED**.
3. POC-005A: original prior local sword, medicinal pouch, stone censer operations and technical evidence audits; all have genuine PNG before/after and SELF_REVIEW only.
4. POC-005B: explicit, opt-in directional gradients, clipped artist-authored surface marks, bounded glow, strict style/security/render budgets and locked legacy SVG fingerprints.
5. Controlled A/B for three original local assets: real PNGs at 64px/128px long axis, same source geometry, random A/B labels, light/dark/checkerboard reviewer board. CI artifact: `poc-005b-real-assets-blind-review-UNSCORED`.
6. Fourth **SELF-SELECTED** original compass session: `benchmarks/poc005a/runs/astral_compass_trial_20261008/`. **14 actual local stdio MCP tool calls, 36 explicit geometry/appearance operations, three real previews, two image-grounded revisions, final revision 3, 28 nodes**. The latest material design has five gradients, nine marks, one glow. Art IR/style validation passed.
7. Source revision 2 looked like a filled brass nub at the top loop. Root cause: `suspension_loop_metal` is an open stroke-only SVG path with `fill:none`, and its explicit `appearance.basePaint` triggered an implicitly closed SVG fill. The author removed that node's basePaint in revision 3 through a genuine MCP `node.update`, preserving the loop hole and all geometry/strokes. `intermediate-r2.png` and `intermediate-r2.svg` preserve the failed appearance; `initial.png` and `revised.png` remain the run's outer before/after checkpoints.
8. Controlled same-FINAL-geometry compass A/B in `npm run poc:005b:heldout` (legacy filename only): new CI artifact `poc-005b-heldout-compass-UNSCORED`. Its metadata explicitly says `briefSelection=SELF_SELECTED_BY_ART_AUTHOR`, `independentHeldout=false`, `qualifiesForAutonomyGo=false`, `agentProvenance=UNKNOWN`, `VISUAL_REVIEW_PENDING`.

## NON-NEGOTIABLE evidence boundary

- TECHNICAL DELIVERY: **PASS** for narrow POC-005B implementation and technical A/B experiment, supported by exact-head and post-merge CI.
- ARTISTIC QUALITY: **VISUAL_REVIEW_PENDING**. No non-author independent blind ratings were supplied or verified. Do not infer VISUAL GO, material superiority or production quality from two visibly different hashes or SELF_REVIEW.
- AUTONOMY: **AGENT_PROVENANCE_PENDING**. The art operations are genuine LOCAL STDIO MCP traffic, not provider-signed model-authorship traces. The additional compass brief was **self-selected** by the producing session, NOT an independently supplied unknown brief.
- Production Godot with new appearance: **NOT SUPPORTED**; still explicit `UNSUPPORTED_GODOT_APPEARANCE`. Only the legacy POC-004 Godot vertical slice is green.
- Fresh independent code review and external art reviewer: **NOT OBSERVED**. Do not invent reviewers, identities, timestamps or scores.
- The public source allows someone to reconstruct which A/B images contain appearance, so blinding is **operational**: show only the reviewer ZIP to non-authors, and record exposure limitations. No cryptographic blind-rating guarantee.
- The generic open-path/appearance fill hazard remains in the renderer contract even though the individual compass ARTWORK was corrected. Do not silently change renderer semantics; obtain a separate spec/plan approval and consider a guard, a warning or dedicated stroke-paint semantics with compatibility tests.

## Next PRIMARY GOAL — independent reviewer + host-origin validation

1. Inspect live `main`, PRs, Actions, branches; do not redo POC-005B engineering or the compass correction.
2. Obtain one, preferably two, **external non-author blind art reviewers**. Give each only the reviewer bundles. Record signed reviewer identity/type/time, scores at actual 64/128 long-axis sizes for recognizability/silhouette, material readability, visual hierarchy, style-fit and consistency (1–5). Store ratings and score sheets **without invented values**. If no reviewer can be engaged, report **BLOCKED: INDEPENDENT_REVIEWER**.
3. Require each of the three original categories to score at least 3/5 on silhouette and style at both sizes, at least two categories to gain >=1 material-readability point at both sizes, and no more than 1 point regression on silhouette or style. Preserve disagreements; do not count the self-selected compass as the evaluator-supplied unknown brief.
4. Arrange a **separately supplied UNKNOWN held-out brief** and a vision-enabled agent host with provider-origin attestation and image-visible tool-call traces. The host must author/edit via real Game Artist MCP and inspect pixels between revisions. Local transcript `JSONL` is insufficient to certify author or perception. Without attestation, report **BLOCKED: PROVIDER_ORIGIN** and do not claim AUTONOMY_GO.
5. If independent review demonstrates a material readability failure, derive a narrow art-abstraction redesign SPEC based on observed defects. Consider an explicitly approved validator/style/UX guard to prevent unwanted fill on open stroke-only paths. If visual GO and real host attestation succeed, propose appearance-aware Godot cutout or atlas next, each via separate approved spec.
6. For any authorized code change: Superpowers brainstorming/spec/plan gates where required → TDD red/green → code review (label SELF_REVIEW if no independent reviewer) → exact-head push & PR CI success → merge `main` → post-merge main CI success → safe branch cleanup to only `main` → update this handoff.

There is **no recurring/background execution** implied by this file. This is a documented resumption plan. Never claim full autonomous production-quality art until the independent gates actually pass.
