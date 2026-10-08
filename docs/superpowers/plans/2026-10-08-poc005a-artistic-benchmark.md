# POC-005A — Real-Agent Art Benchmark + ArtStyleProfile v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, read-only art-style validator and trustworthy experiment auditing so a real MCP agent can be evaluated on unfamiliar original game-art briefs without confusing scripted reproduction, CI validity, and visual quality.

**Architecture:** Preserve the existing Art IR v1 and nine MCP tools. Introduce a strict, allowlisted `ArtStyleProfile` module; a pure `inspectStyle` function; two read-only MCP tools; and a separate benchmark evidence auditor with a deliberately external agent-provenance/visual-review gate. Reuse FolderForge instead of creating an LLM orchestration service.

**Tech Stack:** Node.js >=22, ESM `.mjs`, built-in `node:test`, SVG / `rsvg-convert`, JSON-RPC MCP stdio, FolderForge child plugin, existing Godot 4.7.2 CI.

**Spec:** `docs/superpowers/specs/2026-10-08-poc005a-artistic-benchmark-design.md`

## Global Constraints

- Core artwork must come from explicit deterministic geometry; no secondary text-to-image, image-to-image, or text-to-3D model.
- Retain existing Art IR v1 `path`, `ellipse` and `polygon`; no breaking schema or silent restyling.
- Preserve existing nine art tools and their behavior; add only `style_profile_get` and `style_validate` for this milestone.
- Profiles are allowlisted, repository-bundled, versioned JSON; never load arbitrary filesystem paths or remote URLs.
- MCP style tools are strictly read-only and must be declared LOW-risk/non-mutating in `folderforge.plugin.json`.
- CLI replay/CI tests cannot verify agent authorship, artistic merit, or independent visual review.
- A full autonomy PASS needs 3 held-out prop briefs, <=50 MCP tool calls and <=5 correction rounds per simple prop, authentic image inspection and third-party provenance verification.
- The artwork rubric is 1–5 and includes 64px/128px silhouettes, material readability, hierarchy, style fit, and cross-asset coherence; an independent reviewer is required for aesthetic PASS.
- Every code change uses RED → GREEN → REFACTOR, with exact evidence and small commits; CI must retain the existing Godot and FolderForge integration checks.
- At delivery closeout, exact-head PR CI → merge main → verify main CI → automatic safe branch cleanup, leaving only `main`.

## File ownership map

| Path | Responsibility |
|---|---|
| `styles/dark-cultivation-v1.json` | Immutable first original house-style constraints |
| `src/style/profile.mjs` | Pure schema validation + literal-ID allowlisted profile lookup |
| `src/style/inspect.mjs` | Pure, deterministic document-vs-profile inspection |
| `test/style-profile.test.mjs` | Valid/invalid profile and allowlist cases |
| `test/style-inspect.test.mjs` | Paint, stroke, node budget, deterministic metrics cases |
| `src/mcp/server.mjs` | Add two read-only RPC adapters; leave existing tools intact |
| `folderforge.plugin.json` | Declare exact read-only permission/risk metadata |
| `scripts/mcp-smoke.mjs` | End-to-end list/profile/style validation, negative cases |
| `src/benchmark/evidence-audit.mjs` | Check size-bounded evidence files and transcript consistency; does not attest agent authorship |
| `scripts/audit-poc005a.mjs` | CLI wrapper and machine-readable exit status for evidence auditing |
| `test/benchmark-evidence.test.mjs` | Positive synthetic bundle and adversarial/incomplete bundle tests |
| `benchmarks/poc005a/README.md` | External real-agent protocol, held-out brief policy, trace capture and scoring rubric |
| `benchmarks/poc005a/evidence-schema.md` | Canonical JSON/JSONL bundle fields + examples, no hardcoded art operations |
| `docs/ROADMAP.md`, `docs/project/NEXT_RUN_PROMPT.md` | Honest technical vs autonomy gates and current handoff |
| `.github/workflows/ci.yml` | Run new tests and synthetic evidence smoke without fake autonomy claims |

## Review Focus

1. **Untrusted paint value**: `fill: "url(javascript:...)"` or CSS-like strings must be hard style errors, not treated as legitimate colors (Task 2).
2. **Invisible/no-stroke nodes**: `fill:"none"` and `stroke:"none"` must not inflate color totals or trigger missing stroke-width errors (Task 2).
3. **Unknown, mutated, or malformed profile**: read-only lookup must reject unknown IDs, unsafe selectors, invalid numbers and unknown properties, without accepting path traversal (Tasks 1 and 3).
4. **Synthetic or forged agent provenance**: a bundle claiming `agentProvenance:"VERIFIED"` without external attestation must NOT produce autonomous PASS (Task 4).
5. **Corrupted/oversized/misordered trace**: missing file, invalid PNG magic bytes, duplicate or out-of-order request IDs, impossible revision transition, or oversized JSONL must fail closed (Task 4).

---

### Task 1: Validated profile model and allowlisted loader

**Files:**
- Create: `styles/dark-cultivation-v1.json`
- Create: `src/style/profile.mjs`
- Create: `test/style-profile.test.mjs`

**Interfaces:**
- Produces `validateStyleProfile(profile): {ok:boolean, errors:string[], warnings:string[]}` (no mutation).
- Produces `loadStyleProfile(profileId): Promise<ArtStyleProfile>`; returns a cloned, validated object for the exact literal ID `dark-cultivation-v1` only, otherwise throws `unknown style profile`.
- Normative profile keys: `version`, `id`, `name`, `palette.allowedHex`, `palette.maxDistinctColors`, `stroke.minWidth`, `stroke.maxWidth`, `stroke.allowedWidths`, `complexity.maxNodes`.
- Decide concrete safe bounds: lower-case hex `#rrggbb` only; 1–64 allowed palette entries; <=32 allowed stroke-width values; positive integer stroke widths within 1–64; `maxDistinctColors` 1–64; `maxNodes` 1–200; strict key sets and duplicate rejection. Profile ID regex `^[a-z][a-z0-9-]{0,63}$`.
- Initial allowed palette must cover intentionally designed dark wood, stone, aged metal, parchment, jade, cyan glow and cinnabar shades without copying another IP; max colors *used per document* = 12.

- [ ] **Step 1: Write failing tests** — `test/style-profile.test.mjs` should import both exported functions, accept a literal valid profile, reject unsupported version/unknown key/malformed hex/duplicate palette/NaN, reject `../secret` and an unknown ID, and prove returned profile edits do not alter later loads.
- [ ] **Step 2: Verify RED** — `node --test test/style-profile.test.mjs`; expected module/export-not-found failure.
- [ ] **Step 3: Implement profile fixture, strict schema validator, exact-ID loader** — no loose paths, no network, no code execution; use `readFile(new URL("../../styles/dark-cultivation-v1.json", import.meta.url))` or equivalent constant path.
- [ ] **Step 4: Verify GREEN** — `node --test test/style-profile.test.mjs`; all cases pass.
- [ ] **Step 5: Commit** — `git add styles/dark-cultivation-v1.json src/style/profile.mjs test/style-profile.test.mjs && git commit -m "feat: define validated house art style profile"`.

### Task 2: Pure deterministic style inspection

**Files:**
- Create: `src/style/inspect.mjs`
- Create: `test/style-inspect.test.mjs`

**Interfaces:**
- Consumes `validateStyleProfile(profile)` from Task 1 and `validateDocument(document)` from existing core.
- Produces `inspectStyle(document, profile): {ok, errors, warnings, profileId, metrics}`.
- `metrics` exact keys: `nodeCount`, `distinctColors` (count), `observedColors` (sorted lowercase hex[]), `outOfPaletteColors` (sorted lowercase hex[]), `missingStrokeWidthIds` (sorted id[]), `invalidStrokeWidthIds` (sorted id[]).
- Null/missing `fill` and `stroke` behave as `none`. When stroke is `none`, absent/zero `strokeWidth` is valid; when stroke is a color, width must be in `allowedWidths` and within min/max.
- Any paint other than lower-case/upper-case 6-digit hex and literal `none` produces a style error. Count distinct colors across active fill and stroke. If `nodeCount > complexity.maxNodes` or observed unique color count exceeds `palette.maxDistinctColors`, return a hard error; never rewrite geometry.
- Warnings can be empty and may never claim subjective beauty or silhouette quality.

- [ ] **Step 1: Write failing tests** — valid asset passes; colors case-normalize and sort; `none` does not count; missing width only fails on visible strokes; out-of-palette color, `url(...)`/CSS paint, invalid node, too many colors, over-budget nodes fail; repeated calls deep-equal and leave input unchanged.
- [ ] **Step 2: Verify RED** — `node --test test/style-inspect.test.mjs`; expected import/export failure.
- [ ] **Step 3: Implement `inspectStyle`** — validate profile, validate document, walk existing nodes exactly once, sort output arrays, return deterministic error messages.
- [ ] **Step 4: Verify GREEN + regression** — `node --test test/style-inspect.test.mjs test/core.test.mjs test/cutout.test.mjs`; all pass.
- [ ] **Step 5: Commit** — `git add src/style/inspect.mjs test/style-inspect.test.mjs && git commit -m "feat: inspect deterministic art style constraints"`.

### Task 3: Read-only MCP integration and FolderForge risk contract

**Files:**
- Modify: `src/mcp/server.mjs` (tool schema, `tools/list` and `tools/call`)
- Modify: `folderforge.plugin.json`
- Modify: `scripts/mcp-smoke.mjs`
- Test: `scripts/mcp-smoke.mjs` (existing integration smoke)

**Interfaces:**
- Consumes `loadStyleProfile(profileId)` and `inspectStyle(document, profile)`.
- Produces `style_profile_get({profile_id:string})` returning JSON text with `profile` and `version`.
- Produces `style_validate({asset_id:string,profile_id:string})` returning JSON text with `asset_id`, `revision`, `ok`, `errors`, `warnings` and `metrics`.
- Both input schemas require exact keys, no `additionalProperties`; status/error conventions match other tool calls.
- Current `tools/list` contains nine tools; after change it contains exactly eleven in stable order. Preserve default MCP transport and version unless required by tested interoperability.

- [ ] **Step 1: Extend failing MCP smoke** — assert eleven names, profile fields, nonmutating revision before/after style_validate, unknown-profile/missing-asset tool errors, as well as original preview/PNG, stale revision and export behavior. Use a separately created *style-compliant* smoke asset, not the original unmodified `smoke_stone` whose palette differs.
- [ ] **Step 2: Verify RED** — `npm run smoke:mcp`; expected missing style tools assertion.
- [ ] **Step 3: Add the two read-only adapters** to `server.mjs` and LOW/`mutates:false` to FolderForge manifest. Do not expose a profile path argument or a mutation tool.
- [ ] **Step 4: Verify GREEN** — `npm run smoke:mcp && npm test`; all pass, and check `node ../FolderForge/dist/main.js plugin validate . --json` in the existing CI environment.
- [ ] **Step 5: Commit** — `git add src/mcp/server.mjs folderforge.plugin.json scripts/mcp-smoke.mjs && git commit -m "feat: expose read-only style MCP tools"`.

### Task 4: Evidence auditor with anti-overclaim safeguards

**Files:**
- Create: `src/benchmark/evidence-audit.mjs`
- Create: `scripts/audit-poc005a.mjs`
- Create: `test/benchmark-evidence.test.mjs`

**Interfaces:**
- Produces `auditEvidence(directory): Promise<{ok,errors,warnings,metrics,autonomyVerified:false,visualQualityVerified:false}>`.
- Consumes exactly: `run.json`, `transcript.jsonl`, `brief.md`, `initial.png`, `initial.svg`, `revised.png`, `revised.svg`, `technical-report.json`, `critique.md`.
- `run.json` must include: `runId`, `projectSha`, `serverVersion`, `profileId`, `profileVersion`, `rendererVersion`, `briefSha256`, `toolCalls`, `operationCount`, `renderCount`, `correctionRounds`, `elapsedMs`, `outcome`, `agentProvenance`. All counts are nonnegative integers; provenance defaults to `UNKNOWN`, never auto-VERIFIED.
- Transcript JSONL contains sequential request IDs, tool names, arguments and matched results with revision; parse and check actual operations count, render count, create→edit→render→edit→render ordering, and revision progress. Require `SHA-256(UTF-8 brief.md) == briefSha256`, PNG header bytes, well-formed nonempty SVG as source evidence, and profile ID in technical report matching run metadata.
- For a synthetic-only fixture, `ok:true` means the *bundle structure* is valid, not agent-origin or aesthetic success.
- Bound total transcript size <= 2 MiB, <= 5000 lines, each required file <= 8 MiB; reject symlinks/outside-directory files and malformed UTF-8/JSON safely. No secrets or personal data in transcript logs.
- CLI usage: `node scripts/audit-poc005a.mjs <directory>`; exits 0 only when structural `ok:true`, outputs report JSON.

- [ ] **Step 1: Write failing auditor tests** — create a complete synthetic bundle in a temp directory; assert structurally valid `ok:true` but `autonomyVerified:false`; remove each critical file, corrupt PNG, falsify brief hash, forge `agentProvenance:"VERIFIED"`, duplicate request ID, skip revision, oversize transcript, symlink file and assert hard errors.
- [ ] **Step 2: Verify RED** — `node --test test/benchmark-evidence.test.mjs`; expected module-not-found.
- [ ] **Step 3: Implement bounded evidence auditing + CLI** — derive metrics from transcript, compare to run metadata, preserve honest unverified status; restrict file reads to the specified evidence directory without following symlinks.
- [ ] **Step 4: Verify GREEN** — `node --test test/benchmark-evidence.test.mjs` and a synthetic fixture smoke using the CLI, with exit codes 0 for valid structural evidence and nonzero for corrupted evidence.
- [ ] **Step 5: Commit** — `git add src/benchmark/evidence-audit.mjs scripts/audit-poc005a.mjs test/benchmark-evidence.test.mjs && git commit -m "feat: audit agent art benchmark evidence safely"`.

### Task 5: Real-agent benchmark runbook and separate acceptance gates

**Files:**
- Create: `benchmarks/poc005a/README.md`
- Create: `benchmarks/poc005a/evidence-schema.md`
- Modify: `docs/ROADMAP.md`
- Create or modify: `docs/project/NEXT_RUN_PROMPT.md` (use the canonical handoff path; do not silently overwrite unrelated newer work)
- Test: `test/benchmark-evidence.test.mjs` (runbook examples audited by Task 4)

**Interfaces:**
- Real-host protocol: unfamiliar cultivation sword, medicinal herb pouch and stone incense burner briefs; publish the *test method* in repo without pre-encoding their geometry or correction operations.
- Review rubric: at 64px/128px record 1–5 ratings for silhouette, material, hierarchy, style fit and coherence; record reviewer type; a self-review does not count as independent.
- Status model: `TECHNICAL_PASS`, `AGENT_PROVENANCE_PENDING`, `VISUAL_REVIEW_PENDING`, `FULL_PASS`, `NEEDS_REDESIGN` and `INCOMPLETE`. No scripted fixture can set `FULL_PASS`.

- [ ] **Step 1: Add failing documentation/fixture contract test** — update evidence auditor test fixture to assert expected fields `agentProvenance`, `outcome` and reviewer status in the schema; test that `FULL_PASS` with `autonomyVerified:false` is rejected as contradictory.
- [ ] **Step 2: Verify RED** — `node --test test/benchmark-evidence.test.mjs`; expected rejection assertion fails before guard exists.
- [ ] **Step 3: Write runbook and evidence field guide** — specify host setup, counter measurement, preservation of failures, exactly how a reviewer sees original pixels, and explicit separation of automated and external gate results. Add the auditor's status guard if absent.
- [ ] **Step 4: Verify GREEN** — `node --test test/benchmark-evidence.test.mjs`; audit remains structurally valid for honest `AGENT_PROVENANCE_PENDING` and refuses an unverified `FULL_PASS`.
- [ ] **Step 5: Commit** — `git add benchmarks/poc005a docs/ROADMAP.md docs/project/NEXT_RUN_PROMPT.md src/benchmark/evidence-audit.mjs test/benchmark-evidence.test.mjs && git commit -m "docs: define held-out art benchmark and honest gates"`.

### Task 6: Full integration/CI and exact-head delivery

**Files:**
- Modify: `.github/workflows/ci.yml` (only if needed for an explicit audit smoke)
- Modify: `package.json` (add `audit:poc005a` if it improves reproducibility)
- Modify: `docs/project/NEXT_RUN_PROMPT.md` as the verified handoff

**Interfaces:**
- No new product APIs. Acceptance data is exact PR head, full regression outcomes, CI run IDs, merge commit, post-merge CI and cleanup status.
- Do not assert `FULL_PASS` until three external real-agent runs satisfy Tasks 4–5 plus independent visual review. Green GitHub CI only proves technical delivery.

- [ ] **Step 1: Define a failing integration smoke** — introduce a synthetic evidence fixture (not counted as real-agent art) and wire `npm run audit:poc005a`; make CI require it if the existing `npm test` coverage does not exercise the CLI.
- [ ] **Step 2: Verify RED** — run `npm run audit:poc005a` before the fixture/script exists; expected command missing or audit failing on absent evidence.
- [ ] **Step 3: Implement the smallest reproducible CI fixture/command** — no bundled generative artwork or secret keys; keep Node 22, pinned FolderForge source and Godot 4.7.2 unchanged.
- [ ] **Step 4: Verify GREEN locally or in a real runner** — `npm test && npm run smoke:mcp && npm run audit:poc005a`; run the full existing CI including `npm run poc:004` and headless Godot on GitHub Actions. Verify exact final PR head CI before merge.
- [ ] **Step 5: Commit, PR review, merge and verify main** — confirm the accepted spec and plan are present in the PR diff, merge only after exact-head success, verify post-merge main CI, then inspect automatic branch cleanup and count branches (target: only `main`).
- [ ] **Step 6: Record evidence in handoff** — exact SHAs, run IDs, technical results, autonomous-art results as `NOT YET VERIFIED` if no genuine host runs exist, and the next task needed for full POC-005A acceptance.

### Task 7: Execute three real-host art experiments (external acceptance, not synthetic CI)

**Files:**
- Create per run (untracked/private until sanitized): `benchmarks/poc005a/runs/<run-id>/` with Task 4 evidence layout
- Modify after genuinely completed reviews: `docs/project/NEXT_RUN_PROMPT.md` and a short result summary

**Interfaces:**
- Agent must call the real MCP server via a supported connector/FolderForge; include host trace sufficient for human or provider-side provenance audit.
- No hardcoded `document_apply_ops` array can be reused as the artist's solution. No imported generator image is counted.
- CI stays green if these external observations have not yet happened; the *product status* stays `AGENT_PROVENANCE_PENDING` or `INCOMPLETE` and cannot be labeled full POC PASS.

- [ ] **Step 1: Check available real MCP/vision host** — verify callable art mutation tools and preview-image visibility in the actual client; if inaccessible, record `BLOCKED: HOST_ACCESS` without pretending to run the experiment.
- [ ] **Step 2: Run three genuinely new briefs** — one run each for sword, herb pouch and incense burner; record raw MCP operations and output metadata.
- [ ] **Step 3: Inspect actual image bytes** — preserve original and revised renders; record image-grounded critique and edits; count calls/iterations and retain failures.
- [ ] **Step 4: Audit bundle + independent visual review** — execute `node scripts/audit-poc005a.mjs <run-directory>`; use external provenance evidence and independent ratings; status is FULL_PASS only if all three are verified and meet the agreed thresholds.
- [ ] **Step 5: Publish truthful report/next action** — if failures arise, identify whether Art IR expressiveness, operation abstractions, profile rigidity, visual feedback or art quality is limiting performance; do not advance to full character without evidence.

## Delivery and review checkpoints

- **Checkpoint A (Tasks 1–3):** StyleProfile plus read-only MCP tools are independently usable; existing Godot and FolderForge paths unchanged.
- **Checkpoint B (Tasks 4–5):** Honest, structurally machine-verifiable evidence protocol; no false autonomous/artistic claims.
- **Checkpoint C (Task 6):** Exact-head CI, merged main, post-merge CI and only main branch.
- **Checkpoint D (Task 7):** Optional external-client availability gate; only genuine autonomous, image-inspected, independently reviewed runs can upgrade the **product** to full POC-005A PASS.

This plan intentionally favors shipping the measurable substrate and a falsifiable experiment over inventing an autonomous host, asset factory or production-art claim.
