# POC-005A — Agent-Authored Art Benchmark and ArtStyleProfile v1

Status: PROPOSED — awaiting design review.
Date: 2026-10-08
Target: Game Artist MCP, an independent deterministic art engine hosted by FolderForge when appropriate.

## 1. Product intent

The user wants ChatGPT to build original stylized 2D assets for a cultivation survival game by explicitly operating deterministic art tools, not by delegating the artwork to a text-to-image or text-to-3D model. A successful POC-005A must demonstrate that a real vision-capable agent can start from an unfamiliar asset brief, construct an editable Art IR document via the existing MCP interface, inspect the actual render, identify weaknesses, revise the same document, and reproduce outputs with a measurable style contract.

POC-005A deliberately tests whether this product thesis is viable. It does not merely improve an existing benchmark fixture or declare an attractive result based on technical validity.

## 2. Verified baseline and remaining uncertainty

Baseline at design time: main ee359f2edebe2e3a117e88354a3b63f6d62199c8, CI 37715406392 SUCCESS, branch cleanup 37715466620 SUCCESS, only main remote branch. Reinspect live GitHub before implementation.

Existing code provides:
- Art IR v1: path, ellipse and polygon; transparent canvas; deterministic SVG.
- Revision-checked document_apply_ops, asset_get, render_preview (MCP PNG image content), validate_asset, export_asset.
- POC-003 Spirit Lantern with preauthored draft/correction operation arrays in a script. It proved a bounded rendering/editing workflow, not autonomous composition of unfamiliar work.
- POC-004 structured cutout parts, pivots, idle animation, Godot 4 headless verification.
- FolderForge child-plugin integration and generic control-plane services.

Missing evidence:
- Tool-call trace originated from a real agent composing an unseen brief.
- A style contract measurable across independently composed assets.
- Repeatable gameplay-scale visual review and honest accounting of unsuccessful attempts.

## 3. Candidate approaches and decision

A. Add a large artistic grammar with many procedural object generators first.
Pros: potentially better initial visual quality.
Cons: hides the question of agent competence behind hardcoded object recipes and increases scope.
Decision: REJECT for POC-005A.

B. Add a small, standalone style checker and an evidence-preserving benchmark protocol on the existing Art IR and MCP.
Pros: smallest falsifiable experiment; no new platform or generative service; existing assets remain readable; changes are independently testable.
Cons: limited expressiveness may yield weak art; this is an experimental result, not grounds to call the implementation complete.
Decision: SELECT.

C. Build a new hosted autonomous-agent orchestration product with LLM keys, job queue and bespoke art server.
Pros: automation and repeatability.
Cons: duplicates FolderForge, adds cost/security concerns, conflates orchestration with the art substrate.
Decision: REJECT.

## 4. POC-005A boundary and architecture

~~~text
Vision-capable ChatGPT or standards-compliant agent host
           |
           v
FolderForge (preferred governed host, not required for core)
           |
           v
Existing Game Artist MCP server
           |
           +-- existing explicit Art IR / transactional operations
           +-- new style_profile_get
           +-- new style_validate
           +-- existing render_preview / SVG / PNG
           |
           v
Human/auditor-accessible benchmark evidence bundle
~~~

No new hosted inference or generated-image service is introduced. The real LLM host is the art director and author of geometry operations; the deterministic core does not call secondary generative models. CLI replay may verify reproducibility but is never counted as agent authorship.

ArtStyleProfile is a separate, versioned JSON schema interpreted by deterministic inspection. It must NOT mutate the canonical Art IR or quietly restyle submitted work.

## 5. ArtStyleProfile v1 contract

The first committed profile is an ORIGINAL dark whimsical cultivation-survival direction. It specifies allowable and measurable properties, not a copyrighted game's pixels or IP.

Example shape (normative field names for implementation):

~~~json
{
  "version": 1,
  "id": "dark-cultivation-v1",
  "name": "Dark Cultivation",
  "palette": {
    "allowedHex": ["#211c1a", "#332820", "#4d392f", "#438f8d", "#72f5ec", "#d8c59d", "#8c332e"],
    "maxDistinctColors": 12
  },
  "stroke": {
    "minWidth": 1,
    "maxWidth": 12,
    "allowedWidths": [1, 2, 3, 4, 5, 6, 8, 9, 12]
  },
  "complexity": {
    "maxNodes": 200
  }
}
~~~

The actual palette must include enough deliberate materials/shades for the three benchmark briefs; this example is illustrative and is NOT an immutable final art palette.

Behavior:
- Export pure validateStyleProfile(profile) and inspectStyle(document, profile).
- validateStyleProfile enforces version, safe ID, strict JSON-compatible structure, normalized 6-digit hex palette, positive bounded integer widths, ordered min/max, maximum array lengths, and no unknown unsafe options.
- inspectStyle returns a stable, machine-readable object with ok, errors, warnings and metrics: observed fill/stroke colors, distinct colors, out-of-palette colors, missing/invalid stroke widths, node count, and profile ID.
- The strings "none" and transparent backgrounds are special non-palette values, not colors; case-normalize hex before comparison. No silently accepted SVG URL paints or arbitrary CSS.
- An invalid style profile is a hard error. Art IR schema validation remains authoritative; a style failure does not corrupt or rewrite the asset.
- Warnings may report aesthetics-adjacent risks but are not represented as proof of beauty, asymmetry, silhouette quality or legibility.

Two read-only MCP tools are added:
- style_profile_get({profile_id}) -> validated profile + version;
- style_validate({asset_id, profile_id}) -> deterministic report with revision and metrics.

Tool names, input schemas and their error behavior remain bounded. Existing nine art tools continue to function on old documents without a profile argument.

Initial profile storage is an allowlisted repository directory (for example styles/dark-cultivation-v1.json), not arbitrary user-provided paths. No remote URL/profile loading or code execution.

## 6. The real-agent benchmark protocol

The benchmark is not another fixed script that contains node.add polygons and a prewritten edit pass. It is an observable experiment in a real MCP host.

Three target tasks should be selected from distinct prop types the agent has not seen as encoded geometry; initial candidates are:
- original cultivation sword;
- original medicinal herb pouch;
- original stone incense burner.

A short brief is handed to the agent only at benchmark time. The exact brief, its hash, project style profile and run identifier are retained in evidence; no node geometry is supplied with the brief. Jade Stone and Spirit Lantern are baseline/regression references, not proof of autonomous performance.

For each run the participating vision-capable agent must:
1. Retrieve the profile.
2. Create an empty asset via MCP.
3. Compose explicit geometry via bounded document_apply_ops calls.
4. Render and actually inspect a returned PNG.
5. Record at least one concrete image-grounded defect if any defect is observed; make a targeted revision motivated by that critique, without resetting the asset.
6. Render again and preserve before/after images.
7. Validate Art IR and the selected ArtStyleProfile.
8. Export artifact files and save a review summary.

The evidence bundle is machine-checkable:
- run.json: project SHA, server/profile version, renderer version, brief hash, tool/operation/render counters, elapsed time, outcome;
- transcript.jsonl: ordered calls and results with request IDs, revision numbers and error messages; credentials and unrelated data removed;
- brief.md;
- initial.png / initial.svg;
- revised.png / revised.svg;
- technical-report.json;
- critique.md: image-grounded problems, corrections, judgment and limitations.

A reusable audit program verifies transcript ordering, presence of the MCP operations and revision transitions, image file signatures, profile-report coherence and required bundle files. It cannot cryptographically prove a call was authored by an AI rather than a scripted client. Therefore human observation, provider-side audit, or host trace verification is additionally required to mark agentProvenance=VERIFIED; otherwise it is UNKNOWN and the autonomy gate cannot pass.

The repository CI can test profile checks, document invariants, evidence schema and deterministic replays. CI alone MUST NOT certify real agent authorship or visual quality.

## 7. Acceptance and stop criteria

Technical gate (automated):
- Existing POC-001 through POC-004 regressions remain green, including exact-version Godot headless import.
- The new profile is valid; positive/negative unit tests cover all constraints.
- MCP style read/validate tool tests pass, including unknown profile, missing asset and invalid profile.
- On each accepted run: Art IR validation passes; style validation passes or explicit exceptions are listed as failures; SVG/PNG exports are valid.
- Review evidence is complete and reproducible.

Autonomy gate (external evidence, required for a full POC-005A PASS):
- At least THREE independent unfamiliar briefs are completed by a real vision-capable agent through MCP, with verified authorship provenance.
- Each simple prop uses no more than 50 art MCP tool calls and no more than five visual correction rounds.
- At least one real inspected image-to-edit-to-image revision is recorded per asset.
- A fixed operation script, downloaded external graphics, text-to-image, image-to-image or text-to-3D output does NOT count.
- Failed attempts are preserved and included in reporting, not silently excluded.

Visual gate (explicitly not automated):
- A reviewer examines each asset at 64px and 128px, both in isolation and in a contact sheet.
- Rubric scored 1–5 separately: silhouette/recognizability, material readability, visual hierarchy, fit with the selected style, and coherence across the set.
- Baseline goal: all three assets achieve >=3/5 for silhouette and style fit from an independent reviewer. Report the raw ratings and reviewer identity/type; model self-rating is labeled SELF-REVIEW and does not satisfy an independent-review claim.
- A technical PASS with insufficient visual results is classified ARTISTIC-NO-GO / NEEDS-REDESIGN, never production-ready.

## 8. Implementation decomposition (subject to plan review)

Anticipated units:
- styles/dark-cultivation-v1.json — the first real style profile.
- src/style/profile.mjs — schema validation and profile lookup.
- src/style/style-check.mjs — pure deterministic Art IR inspection.
- src/mcp/server.mjs — two bounded MCP tool adapters.
- test/style-profile.test.mjs and test/style-mcp.test.mjs — positive/negative tests.
- benchmarks/poc005a/README.md — held-out brief protocol and evidence rubric.
- src/benchmark/evidence-audit.mjs — validation of run artifacts without pretending to judge image attractiveness.
- test/benchmark-evidence.test.mjs — missing/forged/incomplete transcript cases.
- .github/workflows/ci.yml — regression and style tests; no fake green autonomy gate.
- docs/ROADMAP.md and docs/project/NEXT_RUN_PROMPT.md — accurate checkpoint and handoff after a verified implementation delivery.

Cutout crop, atlas, advanced shape templates, character rigging and public MCP deployment remain POC-005B or later; they must not silently expand POC-005A.

## 9. Failure modes and security

- Profile overconstraint prevents basic shading: adjust a reviewed, versioned palette; do not bypass validation without recording it.
- Agent exhausts 50 calls: preserve data, report failure, then investigate operation abstractions before scaling scope.
- Art IR only supports three primitive types: treat poor visual results as evidence about expressiveness; do not claim a better renderer alone solves art design.
- LLM sees metadata but not actual images: mark visual feedback INCOMPLETE; do not invent critique.
- Style checker produces passing colors and stroke sizes but ugly art: separate technical validity from aesthetic review.
- Benchmark evidence only shows replay scripted operations: reject autonomous claim.
- Path injection, oversized tool operations, unsafe SVG fields, unbounded traces: retain the existing workspace jail and bounded tool contracts; add tests on any new file I/O.
- Model credentials, host secrets, personally identifying data: never include them in evidence bundles.

## 10. Integration, release boundary, and merge policy

FolderForge remains responsible for transport, policy, auth, audit, workspace governance and Godot process control. Game Artist remains usable directly through MCP.

Use feature branches/PRs while implementing. Verify exact PR head CI before merge; verify post-merge main CI; allow the existing cleanup workflow to remove only safely merged branches. The finished milestone MUST end with only main, as required by the repository policy.

No new remote deployment or ChatGPT public plugin claim is part of this phase.

## 11. Design review checklist

The design is ready for an implementation plan only if the user approves:
- Benchmark means agent-authored and visually inspected work, not a scripted replay.
- Style v1 is a deliberately narrow deterministic validator, not an image-quality judge.
- POC-005A is intentionally split from crop/atlas and character systems.
- A failed visual gate is a useful result and can block expansion to POC-006.
- Temporary PR branches are removed after successful merge/main CI.

Next stage after approval: write an executable TDD implementation plan at docs/superpowers/plans/2026-10-08-poc005a-artistic-benchmark.md, review it, then implement task-by-task. No feature implementation is authorized by this proposed spec alone.
