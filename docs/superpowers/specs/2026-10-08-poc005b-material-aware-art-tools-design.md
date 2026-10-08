# POC-005B — Material-Aware Art Tools, Visual Quality Experiments

**Status:** CONCEPT APPROVED on 2026-10-08; this written architectural specification is **PENDING USER REVIEW**. Approval of the earlier in-chat design does not authorize implementation, implementation planning, or a production-quality claim.

**Repository:** `roronoazoroshao369/game-artist-mcp`  
**Baseline:** live `main` = `043f51da4f545cdfbdb7dcb2a69c501c8fae2bf6` at spec creation. The current repository, not this checkpoint, is authoritative on resume.

## 1. Product intent and boundaries

A vision-capable agent should draw **original** stylized cultivation-survival 2D game assets by operating explicit, deterministic art tools, much as a human artist uses layers, material facets, strokes, highlights and effects. The MCP must not secretly replace art direction with preset object generators or generative models.

POC-005B tests one narrow thesis: giving the agent **controllable material and lighting operations** on existing vector geometry can improve readability and perceived materials at 64/128 px, without breaking deterministic editability, repeatability, security or Godot export.

The user's approved direction is **Material-aware Art Tools**, not a wholesale renderer replacement. Work is limited to a small opt-in set of geometric appearance operators plus genuinely evaluated before/after experiments. Preserve every failure.

**Explicitly excluded:** text-to-image/image-to-image, Meshy/Tripo/SD/Flux, object prefab catalogs, Blender/3D, autonomous agent hosting, external inference APIs, texture synthesis, complete character/rig/animation, sprite atlas packing, Godot runtime redesign and new deployment infrastructure. FolderForge remains the optional governed host; the art engine remains independently usable.

## 2. Established baseline and uncertainty

As of POC-005A: Art IR v1 contains `path`, `ellipse`, `polygon` with ordered nodes. Operations `node.add`, `node.update`, `node.remove`, `node.reorder` are revision checked and transactional. The SVG renderer emits one flat fill and stroke per node, and PNG previews use `rsvg-convert`. ArtStyleProfile v1 checks palette, stroke widths and node budget, **not beauty, value contrast or material plausibility**. Tests and Godot cutout are already operating.

Three independently described local MCP assets exist: cultivation sword, medicinal pouch and stone censer. Each includes initial/revised PNG and a critique, nine tool calls, one correction round, and a STRUCTURAL audit result. Those images suggest a wood-like metal sword, a rigid/barrel-like fabric pouch and an anthropomorphic censer lid. These are **SELF_REVIEW observations**, not statistically established artistic results.

POC-005A's `agentProvenance=UNKNOWN` and `reviewerStatus=SELF_REVIEW` remain **unresolved**. Neither this design nor any CI may quietly promote them to verified AI authorship or independent visual quality. The previous data may guide failure hypotheses and engineering, but only separately attested independent review can satisfy artistic acceptance.

## 3. Considered approaches

1. **SVG-only gradients, shadows and glows:** quick technical win but no semantic notion of artist-controlled material. Useful as implementation primitives, insufficient as an end-to-end thesis.
2. **Selected: explicit, material-aware appearance operations:** the agent still creates/edit shapes and chooses material facets, highlight direction, wear and emission. The engine renders exactly those bounded choices. More complex schema and more test obligations, but experiments can isolate the benefit.
3. **Object-specific generators (sword/pouch/censer templates):** may look better quickly but confounds the test by hiding composition behind hardcoded examples. **Rejected.**

## 4. Proposed architecture

```text
Agent (brief → original node geometry → explicit appearance choices)
  → MCP document_apply_ops (existing revision/idempotency contract)
  → Art IR v1 with strictly validated opt-in appearance on shape nodes
  → deterministic material renderer → SVG → pinned rsvg-convert → PNG
  → render_review at 64/128 px → actual image inspection
  → critique → transactionally edit SAME asset → render again
  → validate_asset + style_validate + export + evidence bundle
```

No opaque model decides what the material should look like within the renderer. Appearance is inspectable/editable source data. The engine never assigns a material by class name without explicit agent choices. It must never alter or restyle old documents silently.

### 4.1 Compatibility decision

Keep `document.version: 1` and the three existing node types; introduce a **strictly optional** `node.appearance` for new documents/updates. If absent, rendering and validation behavior remain byte-for-byte identical to baseline. Existing `fill` and `stroke` continue to be accepted.

`appearance` is a rendering modifier that derives explicit SVG paint/effect definitions from existing node geometry; it cannot replace node geometry or add a hidden prefab. `node.appearance` must be rejected, not silently ignored, when malformed. Presence is opt-in, and all new values must pass the same deterministic and bounded validation path used by both engine and MCP.

**Source-of-truth rule:** an appearance base paint *replaces* a node's solid `fill` only when explicitly specified; otherwise the existing `fill` is used. Strokes and their existing semantics remain unchanged. Existing `opacity` composes deterministically with optional emission. Appearance cannot reference external SVG/CSS URLs, scripts, arbitrary SVG filters or remote textures.

### 4.2 Initial material-operator set (maximum three)

1. **Directional facet/paint:** `basePaint` may be `solid` or `linearGradient`. The agent supplies start/end vector and 2–5 ordered color stops in normalized node bounds. The gradient is clipped to the shape; light direction and every stop are explicit. No automatic metal/wood classification.
2. **Hand-directed wear and fabric folds:** `surfaceMarks` accepts up to 12 explicit bounded mark paths/line segments, each with color, thickness and opacity. Marks are clipped to the parent shape. A material label (`metal`, `stone`, `fabric`, `spirit`) is **descriptive only**; it does not inject generated cracks, scratches or folds. This avoids claiming a prefab material intelligence that has not been proven.
3. **Spirit emission:** optional `outerGlow` with explicit color, opacity and blur radius, emitted only for the selected node and kept within documented render bounds. It must never create unbounded SVG filters, infinite raster extents or uncontrolled blend modes.

These are **design-level schema concepts**, not final wire names; the implementation plan must pin canonical JSON field names and reject aliases. All values need strict allowlists and finite bounds: normalized coordinates in [0,1], color as #RRGGBB, opacity in [0,1], positive stroke widths constrained by ArtStyleProfile, maximum five gradient stops, twelve marks/node, one glow/node and small bounded filter radius. Cap total effect complexity globally as well as per node; document and test the exact thresholds before writing production code. Preserve up to 200 base nodes as the current budget.

Do not add more effects until measured visual evidence identifies a specific need. In particular do not synthesize generic noise textures or generate material microdetails automatically.

### 4.3 Module ownership

- `src/core/validate.mjs`: strict optional appearance schema, safe numeric geometry and value bounds, forbidden SVG/CSS constructs.
- `src/core/render-svg.mjs`: deterministic ID generation, gradient/filter/clip serialization, stable order and escaping, no external resources. Keep flat-render path untouched for legacy nodes.
- `src/core/engine.mjs`: existing revision-checked transaction protocol; appearance changed through bounded `node.update` patches. Invalid partial edits reject atomically.
- `src/style/inspect.mjs` and `src/style/profile.mjs`: include stops/marks/glow in effective palette and stroke budget; report metrics separately from aesthetic scores. Do not widen `dark-cultivation-v1` by default.
- `src/mcp/server.mjs`: reuse existing `document_apply_ops`, `render_preview`, `validate_asset`, `style_validate`, `export_asset`; only add a small review-preview tool if implementation evidence proves the existing preview path cannot support 64/128 px review without duplicated logic.
- `src/export/godot-cutout.mjs`: retain valid legacy exports. For opt-in appearance, either export rasterized final appearance consistently or report **explicit unsupported feature**, never silently drop it or claim compatibility.
- `benchmarks/poc005b/`: versioned experiment protocols, image pairs, anonymized blind-review rating sheets and audit metadata. Keep scripts separate from artistic benchmark to avoid disguised fixed recipes.

## 5. Failure paths, resource budgets and threat model

All new appearance fields are untrusted. Reject NaN/infinite/negative radii, extreme path lengths, invalid SVG path grammar, invalid paint, repeated/unknown keys, XML/script/event-handler fragments, self-referential clips, arbitrary `url(...)`, unsupported transform effects, oversized arrays and runaway output. Preserve existing workspace jail, atomic rollback semantics, optimistic revision checks and credential redaction.

Rendering must be deterministic for identical Art IR under the same pinned renderer/runtime: hash stable SVG output and byte-equal PNG output in a fixed CI image. Bound SVG output size and render time and document test-environment-specific budgets during implementation planning. Unsupported platform/rasterizer must cause an explicit error, not fall back to producing a different appearance.

Older Art IR v1 fixtures and POC-001/002/003/004 outputs must remain unchanged when `appearance` is absent. Test duplicate IDs, effect collisions, old-doc migration/readback, invalid material payloads and malformed RPC, as well as valid effects.

## 6. Falsifiable visual experiment and evidence

Do not use the three existing images as an independent aesthetic PASS; they serve as **unverified baseline design hypotheses**. Prepare equivalent A/B samples for sword, fabric pouch and stone censer from **the same original geometry**, with and without new opt-in appearance. Randomize labels, background order and display position so the independent reviewer cannot infer the variant. Include alpha-checker, light/dark background and actual exported 64px and 128px PNGs (not merely CSS-downscaled pictures). Also create at least one fresh held-out agent-authored brief to test whether the new API can be used rather than just replayed.

Capture:
- Exact commit SHAs, style/renderer revisions, rasterizer build, source brief and its SHA-256.
- Exact `document_apply_ops` requests/revisions, MCP preview bytes, render hashes, timing/call/operation counters and all failures.
- A/B PNG/SVG and matching original source documents; ensure the comparison varies *only* the explicit appearance in the controlled subset.
- Actual visual observations and revision actions from the agent, marked SELF_REVIEW.
- Independent reviewer sheets with reviewer identity/type, blind label mapping sealed until scoring, scores at 64px/128px and five axes: recognizability/silhouette, material readability, hierarchy, style fit and set coherence.
- Separate host-origin provenance audit; local JSONL alone cannot certify which model authored geometry.

A minimum of one non-author reviewer is required; target two independent reviewers to reduce single-reviewer bias, and record disagreements instead of averaging away outliers. Without an independent reviewer, outcome is `VISUAL_REVIEW_PENDING` regardless of CI.

### 6.1 Objective gates

**Technical PASS** requires:
- backward-compatible deterministic legacy rendering, tests and Godot headless regression;
- no new broken Art IR/MCP safety bounds or secret leakage;
- stable SVG and PNG output hashes in the pinned environment, and PNG snapshots at 64/128;
- no more than 50 MCP art calls and 5 visual correction rounds for each new simple prop;
- complete evidence bundles and exact-head CI, main post-merge CI and safe branch cleanup if implementation was authorized.

**Visual GO** requires (independent scored evidence, *not a unit test*):
- each of the three original categories attains at least 3/5 for **silhouette and style fit** in both scales;
- a majority of A/B pairs (at least two of three) improve material readability by at least one point on a 1–5 rubric at 64px *and* 128px;
- none loses more than one point on silhouette or style fit at either scale;
- reviewer disagreements and visibility limitations documented.

**Autonomy GO** is separate: host-attested authorship and image inspection for at least three genuinely unfamiliar briefs, not synthetic CI or replayed operations. Until verified, preserve `AGENT_PROVENANCE_PENDING`. Visual GO does not imply Autonomy GO or production readiness.

If visual ratings are missing: `VISUAL_REVIEW_PENDING`. If valid ratings fail material improvements or readability: `ARTISTIC_NO_GO / NEEDS_REDESIGN` with defect evidence. If renderer/security/regression fails: `TECHNICAL_NO_GO`. **Never** use a green CI status to override a failed visual gate.

## 7. Delivery and stage gates

1. **Current step — architectural spec only:** commit this design to a docs PR and request explicit review. No product code or implementation plan is authorized by the prior conceptual approval.
2. **After written-spec approval:** use Superpowers `writing-plans` to create an executable TDD plan covering schema/renderer/style/MCP security, deterministic rendering, benchmark and verification. The user then reviews and chooses the execution method.
3. **After explicit plan approval:** implement in small feature PRs, tests RED→GREEN, request code review, exact-head push and PR CI, merge, post-merge main CI, documentation closeout and delete only safely merged branches; `main` alone must remain.
4. **Independent A/B and provenance review:** obtain human/provider evidence, publish candid GO/NO-GO report. If independent validation is blocked, document the blocker rather than asserting success.
5. Only consider atlas and cutout-character expansion after evidence shows material tools yield meaningful improvements.

## 8. Self-review checklist

- Scope is a narrow material/lighting addition; not a general-purpose graphics editor, automatic asset generator or unrelated Godot upgrade.
- All appearance operations remain **explicit** and reproducible, while models choose shapes and materials.
- Legacy unchanged-rendering gate is explicit; Godot treatment of new appearance is explicit and non-silent.
- Safety and bounds are defined as requirements, and final numeric render caps must be measured and locked in the implementation plan.
- Artistic, technical and provenance results are deliberately independent; no invented independent ratings.
- Next gate is **USER REVIEW OF THIS WRITTEN SPEC**. No implementation is implied by its commit.
