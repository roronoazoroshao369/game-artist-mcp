# POC-005B Material-Aware Art Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Add opt-in, deterministic artist-directed material rendering to the existing vector Art IR, and measure whether it improves actual 64px/128px readability without overstating aesthetic quality or agent provenance.

**Architecture:** Keep document.version=1, existing path/ellipse/polygon nodes and revision-controlled MCP operations. Validate an optional strict \`node.appearance\` object; extend SVG rendering with bounded gradients, geometry-clipped marks and emission, but preserve the exact legacy serialization branch when no appearance exists. Collect controlled same-geometry A/B evidence through the existing MCP/CLI and a separate reviewer protocol.

**Tech Stack:** Node.js >=22 ESM / node:test, dependency-free JSON Art IR, SVG, \`rsvg-convert\` (librsvg), Godot 4.7.2 headless, GitHub Actions, FolderForge child MCP.

**Spec:** \`docs/superpowers/specs/2026-10-08-poc005b-material-aware-art-tools-design.md\` (written spec approved 2026-10-08; this implementation plan requires a separate approval).

## Global Constraints

- Agent authors **original editable geometry** with deterministic tools; no SD/Flux/Meshy/Tripo, text/image generative models, object prefab catalogs or hardcoded sword/pouch/censer generators.
- Preserve exact behavior and SVG bytes of every existing document **without** \`node.appearance\`; preserve the existing three node types, \`document.version:1\`, 200-node style budget, and existing 50-operations/transaction engine bound.
- Existing \`document_apply_ops\`, \`render_preview\`, \`validate_asset\`, \`style_validate\`, \`export_asset\`, \`export_godot_cutout\` remain the primary MCP API. No new hosting/control plane; FolderForge continues to own governance.
- Existing \`dark-cultivation-v1\` JSON profile and v1 schema **must not silently change**. Any added effective palette/stroke checks operate against that profile.
- The three opt-in features are exactly **directional paint**, **explicit wear/fold marks**, **spirit glow**. Material category is metadata and never generates art by itself.
- Exact proposed wire contract (all objects are strict: unknown keys rejected):
  - \`appearance = { material?, basePaint?, surfaceMarks?, outerGlow? }\`, \`material\` in \`metal|stone|fabric|spirit\`.
  - \`basePaint = { kind:"solid", color:"#rrggbb" }\` OR \`{kind:"linearGradient", start:[u,v], end:[u,v], stops:[{at,color,opacity}, ...]}\`. Stop count 2..5; \`at\` increases strictly from **0 to 1**, endpoints required; vectors normalized to **node object-bounding-box**, all u/v in [0,1].
  - \`surfaceMarks = [{kind:"line",from:[u,v],to:[u,v],color,width,opacity} | {kind:"quadratic",from:[u,v],control:[u,v],to:[u,v],color,width,opacity}]\`. Points normalized to **canvas bounds**, not node bbox; clip marks to their source node's actual transformed geometry.
  - \`outerGlow = {color:"#rrggbb",opacity:0..1,radius:0..4}\` measured in source-canvas pixels; glow clone is rendered **behind** normal node, with the source node's existing opacity composing once with emission opacity.
- Hex colors must be lowercase \`#[0-9a-f]{6}\` (no CSS, \`url()\`, scripts, raw SVG strings, external filters); normalized finite numbers in [0,1]; mark widths positive integers 1..12 checked against the loaded style profile. Material tags alone change no pixels.
- Guardrails proposed as implementation decisions for this small POC: <=12 marks/node; <=128 marks/document; <=64 gradient nodes/document; <=32 glow nodes/document; <=200 base nodes/document; <=1 MiB SVG; <=256 KiB incoming JSON-RPC line; <=8 seconds per PNG renderer process; <=8 MiB returned PNG; maximum 4096x4096 canvas. Treat these as technical ceilings, **not artistic quality scores**; test rejection at every boundary.
- If an appearance feature cannot be represented correctly by Godot cutout export, **fail explicitly** before writing partial output; never silently drop appearance. Legacy Godot export must continue to pass.
- \`npm run check\` plus complete GitHub Actions job (pinned Godot 4.7.2, FolderForge integration) must pass on the exact final branch head, on PR, and on post-merge \`main\`; merged-branch cleanup only after successful post-merge CI.
- Artistic scores at 64/128 are collected from non-author reviewers, **not** unit tests. POC-005A provenance remains \`AGENT_PROVENANCE_PENDING\`. No automatic \`FULL_PASS\`, production-ready or independent-aesthetic claim.

## Review Focus

Five high-risk inputs the spec implies; the corresponding tests are pinned in Tasks 2–7:

1. **Legacy asset with no appearance:** renderer emits byte-identical SVG, PNG hash in the pinned environment, unchanged revision history (Tasks 1, 6).
2. **Malicious or ambiguous appearance JSON:** duplicate object keys in wire JSON, non-finite values, unknown keys or CSS/SVG injection fail closed before state mutation (Tasks 2, 7).
3. **Clipped marks on transformed polygon/ellipse/path:** no un-clipped damage, bad geometry or duplicate SVG IDs; exact source geometry and stroke remain intact (Task 4).
4. **Glow/gradient overload and asset at canvas edge:** bounded filter extents, 1-MiB/8-s render limits, no visual cut-off beyond the documented canvas policy (Tasks 3, 5, 7).
5. **Appearance-bearing Godot export or unequal A/B geometry:** explicit unsupported error instead of silently losing effects; comparator rejects changed geometry and non-blind labels (Tasks 7–8).

---

## File Structure & Execution Rules

Create small modules rather than overloading the existing \`src/mcp/server.mjs\` or \`src/core/validate.mjs\`:

- **Create** \`src/core/appearance.mjs\`: pure validator and bounded counters; exports \`validateAppearance(node, canvas) -> {errors:string[],metrics:AppearanceCounts}\`.
- **Create** \`src/core/render-appearance.mjs\`: deterministic appearance-to-SVG definitions and node emission; exports \`renderStyledDocument(document) -> string\`. The existing legacy serializer remains untouched.
- **Create** \`src/mcp/strict-json.mjs\`: detects repeated object keys in a bounded raw JSON line before the existing JSON.parse pipeline.
- **Create** \`src/benchmark/render-review.mjs\`: render SVG at preserving-aspect max-dimension 64/128; return PNG hashes and actual dimensions.
- **Create** \`src/benchmark/appearance-pair.mjs\`: validates that A/B inputs differ only in \`appearance\` and prepares blinded evidence metadata.
- **Modify** \`src/core/validate.mjs\`, \`src/core/render-svg.mjs\`, \`src/style/inspect.mjs\`, \`src/mcp/server.mjs\`, \`src/export/godot-cutout.mjs\`, \`package.json\`, \`.github/workflows/ci.yml\` only in owning tasks.
- **Tests:** \`test/legacy-appearance.test.mjs\`, \`test/appearance-schema.test.mjs\`, \`test/appearance-render.test.mjs\`, \`test/appearance-style.test.mjs\`, \`test/appearance-mcp.test.mjs\`, \`test/appearance-godot.test.mjs\`, \`test/appearance-benchmark.test.mjs\`.
- **Benchmark docs/evidence:** \`benchmarks/poc005b/README.md\`, \`benchmarks/poc005b/review-rubric.csv\`, \`benchmarks/poc005b/evidence-schema.md\`, \`docs/ROADMAP.md\`. Do not commit fictional reviewer ratings.

**Execution lifecycle:** First task begins with a new isolated feature branch from *live* \`main\`, not this docs branch; inspect current open PRs, check out the approved spec+plan after docs merge. Each task is RED→GREEN→focused tests→review→commit. Finish with full-suite verification, a real code-review gate, push CI, PR CI, merge, main CI, branch cleanup. Do not merge if any gate is red.

### Task 1: Freeze Legacy Behavior and Regression Fixtures

**Files**
- Create: \`test/legacy-appearance.test.mjs\`
- Create: \`test/fixtures/legacy-svg.sha256\` (committed fingerprint captured from the **pre-feature main** fixture; never hardcode a guessed hash)
- Modify: none of the renderer or engine in this task.

**Interfaces**
- Consumes: \`renderSvg(document)\` from \`src/core/render-svg.mjs\`, \`applyOperations(state, request)\` from \`src/core/engine.mjs\`.
- Produces: \`legacy document -> exact SVG fixture SHA-256\`, referenced by later regression tests.

- [ ] **Step 1: Write failing baseline invariants.** In \`test/legacy-appearance.test.mjs\`, load \`examples/jade-spirit-stone/document.json\` and \`examples/spirit-lantern/source.json\`; use node:crypto SHA-256 and assert each generated \`renderSvg\` hash equals a checked-in \`test/fixtures/legacy-svg.sha256\` entry. Add an \`applyOperations\` revision/history preservation assertion; do not modify production code.
- [ ] **Step 2: Run** \`node --test test/legacy-appearance.test.mjs\`; expected RED because baseline fingerprint file is not yet present.
- [ ] **Step 3: Capture the exact baseline once, from current \`main\`,** writing two \`filename sha256\` lines to the fixture file and reviewing source files to ensure they are pre-feature. Then make the test parse the fixture and reject missing/duplicate entries.
- [ ] **Step 4: Run** \`node --test test/legacy-appearance.test.mjs\` and \`npm run check\`; expected GREEN. Record baseline Git SHA in the commit message.
- [ ] **Step 5: Commit** \`git add test/legacy-appearance.test.mjs test/fixtures/legacy-svg.sha256 && git commit -m "test: lock legacy Art IR render fingerprints"\`.

### Task 2: Strict Optional Appearance Contract and Atomic Validation

**Files**
- Create: \`src/core/appearance.mjs\`, \`test/appearance-schema.test.mjs\`
- Modify: \`src/core/validate.mjs\`
- Test: \`test/core.test.mjs\`

**Interfaces**
- Produces: \`validateAppearance(node, canvas) -> {errors:string[],metrics:{marks:number,gradients:number,glows:number}}\`.
- Consumes: \`validateDocument(document)\` invoked by existing revision-checked \`applyOperations(state,{expectedRevision,operations,idempotencyKey})\`.
- Contract: use exact \`appearance\` wire keys and numeric limits in Global Constraints; no implicit material shading and no mutation of document during validation.

- [ ] **Step 1: Add failing \`appearance-schema\` tests.** Accept: ellipse with \`{material:"metal",basePaint:{kind:"linearGradient",start:[0,0],end:[1,1],stops:[{at:0,color:"#211c1a",opacity:1},{at:1,color:"#b28a62",opacity:1}]}}\`; mark line/quadratic and glow. Reject unknown nested keys, wrong material, stop order/endpoints, stop length 1/6, invalid color, invalid quadratic control, out-of-range coordinates, radius >4, 13 marks on one node, 129 marks globally, 65 gradients, 33 glows, prototype-unsafe keys, NaN, Infinity and invalid arrays. Confirm appearance-free v1 fixtures stay valid. Assert \`node.update\` malformed appearance rolls back revision/history atomically.
- [ ] **Step 2: Run** \`node --test test/appearance-schema.test.mjs\`; expected RED because the appearance validator does not exist and legacy validator currently accepts unknown \`appearance\`.
- [ ] **Step 3: Implement** \`validateAppearance(node,canvas)\` using own-key allowlists and finite bounds, then compose it into \`validateDocument\` and enforce the document-wide counters. Reject all invalid fields with stable error paths, e.g. \`nodes[2].appearance.basePaint.stops[1].at\`.
- [ ] **Step 4: Run** \`node --test test/appearance-schema.test.mjs test/core.test.mjs test/legacy-appearance.test.mjs\`; expected GREEN. Verify errors do not include secret data or raw untrusted markup.
- [ ] **Step 5: Commit** \`git add src/core/appearance.mjs src/core/validate.mjs test/appearance-schema.test.mjs && git commit -m "feat: validate bounded opt-in material appearance"\`.

### Task 3: Opt-In Solid and Directional Paint Without Legacy Drift

**Files**
- Create: \`src/core/render-appearance.mjs\`, \`test/appearance-render.test.mjs\`
- Modify: \`src/core/render-svg.mjs\`

**Interfaces**
- Produces: \`renderStyledDocument(document) -> string\`; returns valid deterministic SVG when any appearance exists. \`renderSvg(document)\` delegates to it **only** if at least one node has appearance; otherwise execute the original legacy code path byte-for-byte.
- Gradient: \`linearGradient\` with \`gradientUnits="objectBoundingBox"\`, \`start\`/\`end\` coordinates and ordered \`stop-color\`/\`stop-opacity\`; distinct stable ID per gradient, never a user-supplied reference.
- Solid basePaint explicitly overrides \`fill\`; absence of basePaint leaves original fill unchanged. Original strokes, transforms, opacities remain.

- [ ] **Step 1: Write failing tests.** Assert (a) unchanged pre-feature hashes with no appearance, (b) deterministic identical SVG from repeated gradient render, (c) no external \`url(http...)|script|foreignObject\`, (d) two gradients use distinct IDs, (e) a node with ID colliding with suggested \`ga-grad-0\` cannot hijack definition, (f) paint-only solid override and material-only no pixel change.
- [ ] **Step 2: Run** \`node --test test/appearance-render.test.mjs test/legacy-appearance.test.mjs\`; expected RED on new gradients/IDs, GREEN on legacy baselines.
- [ ] **Step 3: Implement** \`renderStyledDocument\` with an SVG-safe deterministic ID allocator that reserves all user node IDs and produces collision-free IDs in document order. Render controlled \`<defs>\` paint assets; do not pass through arbitrary URL/CSS strings.
- [ ] **Step 4: Run** \`node --test test/appearance-render.test.mjs test/legacy-appearance.test.mjs test/appearance-schema.test.mjs\`; expected GREEN, and compare legacy SHA fixture unchanged.
- [ ] **Step 5: Commit** \`git add src/core/render-appearance.mjs src/core/render-svg.mjs test/appearance-render.test.mjs && git commit -m "feat: render deterministic opt-in directional paint"\`.

### Task 4: Artist-Directed Wear and Fabric-Fold Marks

**Files**
- Modify: \`src/core/render-appearance.mjs\`, \`test/appearance-render.test.mjs\`, \`test/appearance-schema.test.mjs\`.

**Interfaces**
- Consumes: exact \`surfaceMarks[]\` from Task 2; \`from/to/control\` values normalized to canvas dimensions, mapped to canvas-space SVG coordinates; \`kind=line\` becomes M→L, \`kind=quadratic\` becomes M→Q.
- Produces: deterministic \`clipPath\` of the original node geometry, including its original transform; mark paths carry \`clip-path\`, explicit color/width/opacity, and do not change underlying fill/stroke.

- [ ] **Step 1: Write failing tests** for line and quadratic mark shapes, overflow mark clipped to ellipse/polygon/path, transformed parent node clipping, duplicate user IDs and marks rendered in existing node order. Assert no extra material pattern is generated merely from \`material:"fabric"\`.
- [ ] **Step 2: Run** \`node --test test/appearance-render.test.mjs\`; expected RED on missing \`clipPath\`/mark output.
- [ ] **Step 3: Implement** exact geometry serialization helper shared by normal node and clip clone, with escaped attributes and stable IDs; use original node \`transform\` on clip clone. Avoid extracting or approximating SVG path bounding boxes. Apply mark coordinates in normalized **canvas** space as specified.
- [ ] **Step 4: Run** \`node --test test/appearance-render.test.mjs test/appearance-schema.test.mjs test/legacy-appearance.test.mjs\`; expected GREEN, with legacy hashes unchanged.
- [ ] **Step 5: Commit** \`git add src/core/render-appearance.mjs test/appearance-render.test.mjs test/appearance-schema.test.mjs && git commit -m "feat: clip explicit artist marks to source geometry"\`.

### Task 5: Bounded Spirit Glow and Render Resource Limits

**Files**
- Modify: \`src/core/render-appearance.mjs\`, \`src/mcp/server.mjs\`, \`test/appearance-render.test.mjs\`
- Create: \`test/appearance-mcp.test.mjs\`

**Interfaces**
- Consumes: \`appearance.outerGlow = {color,opacity,radius}\` validated in Task 2.
- Produces: shape clone **behind** the original node using an SVG \`feGaussianBlur\` filter, \`stdDeviation<=4\`, controlled IDs and fixed \`filterUnits="userSpaceOnUse"\` bounds covering canvas plus 12px padding on each side; no arbitrary user filter inputs.
- \`renderPng(document) -> Promise<Buffer>\` remains the server's private helper; renderer process must time out at 8000ms, SVG text <=1048576 UTF-8 bytes, PNG <=8388608 bytes, and errors must use bounded sanitized messages.

- [ ] **Step 1: Write failing tests** asserting filter stdDeviation and bounds, clone behind non-emissive original, opacity \`existingNode.opacity * glow.opacity\` applied once, no filter when absent, 33-glow document rejection, huge SVG rejection, and simulated timeout/oversized PNG failures. Include a drawable near-canvas-edge glow and assert predictable clipping only at the declared canvas boundary.
- [ ] **Step 2: Run** \`node --test test/appearance-render.test.mjs test/appearance-mcp.test.mjs\`; expected RED for glow and resource-limit tests.
- [ ] **Step 3: Implement** glow rendering in \`render-appearance.mjs\`; constrain server SVG/PNG IO and subprocess timeout without changing public MCP response layout for legacy \`render_preview\`. No fallback to another renderer on failure.
- [ ] **Step 4: Run** \`node --test test/appearance-render.test.mjs test/appearance-mcp.test.mjs test/legacy-appearance.test.mjs\` and \`npm run smoke:mcp\`; expected GREEN.
- [ ] **Step 5: Commit** \`git add src/core/render-appearance.mjs src/mcp/server.mjs test/appearance-render.test.mjs test/appearance-mcp.test.mjs && git commit -m "feat: render bounded spirit emission safely"\`.

### Task 6: Style Validation of Effective Appearance Colors and Widths

**Files**
- Modify: \`src/style/inspect.mjs\`
- Create: \`test/appearance-style.test.mjs\`

**Interfaces**
- Consumes: \`validateAppearance\` and \`validateStyleProfile\`, existing \`inspectStyle(document,profile)\`.
- Produces: same report schema \`{ok,errors,warnings,profileId,metrics}\`, with extra \`metrics.appearance\` counters only for appearance-bearing documents. Effective \`observedColors\` and \`distinctColors\` include solid/gradient stops, marks and glow; all marks' widths must satisfy \`profile.stroke.allowedWidths\`.
- Aesthetic ratings **never** appear in \`inspectStyle\`; it stays a deterministic compliance checker.

- [ ] **Step 1: Add failing tests.** Gradient stop color outside profile must fail; adding mark/glow colors over the 12-distinct-color budget must fail; mark width forbidden by profile must fail; material-only does not alter output; unchanged legacy report \`deepEqual\` must pass.
- [ ] **Step 2: Run** \`node --test test/appearance-style.test.mjs test/style-inspect.test.mjs\`; expected RED for new appearance coverage.
- [ ] **Step 3: Implement** effective color/width accounting without mutating node/profiles or widening \`dark-cultivation-v1\`. Keep canonical lowercase sorting of reported colors.
- [ ] **Step 4: Run** \`node --test test/appearance-style.test.mjs test/style-inspect.test.mjs test/style-profile.test.mjs\`; expected GREEN.
- [ ] **Step 5: Commit** \`git add src/style/inspect.mjs test/appearance-style.test.mjs && git commit -m "feat: enforce appearance-aware style budgets"\`.

### Task 7: MCP Security, Transactionality and Explicit Godot Handling

**Files**
- Create: \`src/mcp/strict-json.mjs\`, \`test/appearance-godot.test.mjs\`
- Modify: \`src/mcp/server.mjs\`, \`src/export/godot-cutout.mjs\`, \`test/appearance-mcp.test.mjs\`

**Interfaces**
- Produces: \`parseUniqueKeysJsonLine(raw:string) -> object\` (reject duplicate object keys, including keys within appearance; no \`eval\` or substitutions). Integrate with JSON-RPC wire parser before \`JSON.parse\` accepts ambiguous repeated keys. Reject raw line size >262144 bytes **before accumulation**.
- Existing RPC signatures/tool catalog unchanged; \`document_apply_ops\` with invalid appearance returns \`isError:true\` and original revision.
- Godot v0 decision: **reject appearance-bearing documents** in \`exportGodotCutout\` with \`UNSUPPORTED_GODOT_APPEARANCE\` before \`mkdir\` or any output writes. All appearance-free Godot exports remain supported. A future rasterized cutout implementation requires its own reviewed spec.

- [ ] **Step 1: Add failing tests** for JSON wire duplicate \`appearance\` keys, nested duplicates, unknown objects, 262145-byte RPC line, truncated JSON, and valid request behavior; assert a failed style/geometry edit leaves revision and history unchanged. Add Godot test checking explicit unsupported status and zero partial files, plus existing headless legacy export.
- [ ] **Step 2: Run** \`node --test test/appearance-mcp.test.mjs test/appearance-godot.test.mjs\`; expected RED on duplicate-key and Godot unsupported guarantees.
- [ ] **Step 3: Implement** a bounded JSON lexical scanner that distinguishes JSON string keys from string values and tracks per-object key sets; call it before normal JSON.parse, reject duplicate keys, and preserve existing JSON-RPC error semantics. Add non-disclosing buffer bound. Add Godot preflight guard before output creation.
- [ ] **Step 4: Run** \`node --test test/appearance-mcp.test.mjs test/appearance-godot.test.mjs test/core.test.mjs\`, \`npm run smoke:mcp\` and \`npm run poc:004\`; expected GREEN. Validate a real appearance asset gets a non-silent Godot error and a legacy asset still exports.
- [ ] **Step 5: Commit** \`git add src/mcp/strict-json.mjs src/mcp/server.mjs src/export/godot-cutout.mjs test/appearance-mcp.test.mjs test/appearance-godot.test.mjs && git commit -m "fix: fail closed on invalid art wire payloads and unsupported Godot effects"\`.

### Task 8: Deterministic 64/128 Rendering and Same-Geometry A/B Review

**Files**
- Create: \`src/benchmark/render-review.mjs\`, \`src/benchmark/appearance-pair.mjs\`, \`test/appearance-benchmark.test.mjs\`, \`benchmarks/poc005b/README.md\`, \`benchmarks/poc005b/evidence-schema.md\`, \`benchmarks/poc005b/review-rubric.csv\`
- Modify: \`package.json\`, \`.github/workflows/ci.yml\`, \`docs/ROADMAP.md\`

**Interfaces**
- Produces: \`renderReviewPng({document,limitPx,rendererPath,outputFile}) -> Promise<{width,height,sha256,rendererVersion}>\` for \`limitPx = 64|128\`; preserve aspect ratio (\`width,height\` are actual integer pixel dimensions, with **longest axis** equal to limitPx).
- Produces: \`assertSameGeometryPair(before,after) -> void\`; deep-compare \`version,canvas\` and every ordered node **after deleting only each node's appearance**; reject any unapproved geometry/stroke/layer order changes.
- Produces: \`prepareBlindPairMetadata({baseline,enhanced,seed})\` labels A/B without exposing the enhanced mapping in reviewer-visible CSV; store mapping separately in an access-restricted file, never claim cryptographic blind security from local JSON alone.
- Evidence statuses remain separate: \`TECHNICAL_PASS\`, \`VISUAL_REVIEW_PENDING\`, \`AGENT_PROVENANCE_PENDING\`, \`ARTISTIC_NO_GO/NEEDS_REDESIGN\`; no local tool may mint \`FULL_PASS\`.

- [ ] **Step 1: Add failing tests.** Renderer on 192x256 canvas produces 48x64 and 96x128 PNGs, confirmed by PNG IHDR (not browser CSS); deterministic SHA on repeated calls; wrong \`limitPx\` fails; geometry-mutated pair fails; appearance-only pair passes; seeded label assignment is reproducible and can be concealed; missing review scores never mark GO. Reject CSV rows claiming an independent reviewer with no supporting identity/evidence.
- [ ] **Step 2: Run** \`node --test test/appearance-benchmark.test.mjs\`; expected RED on missing modules.
- [ ] **Step 3: Implement** actual \`rsvg-convert\` rasterization with explicitly calculated dimensions and deterministic byte hashes, process/resource bounds from Tasks 5/7, and the A/B pair checker. Use a non-generative graphics path and output PNGs on transparent/light/dark background previews; create no style-dependent object recipes.
- [ ] **Step 4: Write** the reviewer protocol and evidence schema: three existing categories plus >=1 fresh unseen brief, exact revision/brief SHA/renderer build/provenance, equal-geometry A/B renders, alpha checker, blind labels, two independent reviewers preferred (one required), 1..5 silhouette/material/hierarchy/style/coherence at both scales, signed/dated score sheets and disagreement reporting.
- [ ] **Step 5: Pin** GitHub \`runs-on: ubuntu-24.04\`, \`node-version:22\`, and fail CI unless \`rsvg-convert --version\` matches \`2.58.0\` (record installed package version in CI log). Preserve existing Godot 4.7.2 digest check and FolderForge pinned SHA. Add deterministic A/B technical sample test to CI and \`npm run check\`; **do not** add fake external reviewer data.
- [ ] **Step 6: Run** \`node --test test/appearance-benchmark.test.mjs\`, \`npm run check\` and \`npm run audit:poc005a\`; expected GREEN. Confirm new technical reports explicitly show \`VISUAL_REVIEW_PENDING\` and \`AGENT_PROVENANCE_PENDING\`, never automatic FULL_PASS.
- [ ] **Step 7: Commit** \`git add src/benchmark/render-review.mjs src/benchmark/appearance-pair.mjs test/appearance-benchmark.test.mjs benchmarks/poc005b package.json .github/workflows/ci.yml docs/ROADMAP.md && git commit -m "test: add controlled material A-B quality evidence pipeline"\`.

## Final Product Verification and External Review Gate

These steps are **not** a ninth coding task; execute them after Task 8 passes.

- [ ] **Review** every task against the spec, ensure no hardcoded object recipe, non-deterministic renderer fallback, over-broad new tool, hidden generated image, leaked credential or silent Godot degradation. Request a fresh code reviewer and address Critical/Important findings before merge.
- [ ] **Run clean verification** on exact feature head: \`npm test\`, \`npm run check\`, \`npm run audit:poc005a\`, deterministic SVG/PNG hash checks, MCP smoke and real valid/invalid appearance RPCs; \`npm run poc:004\` and generated Godot headless import/run with pinned binary; FolderForge plugin validate/test. Record commands, exit codes and commit SHA.
- [ ] **Push** feature head and open PR against live \`main\`; require exact-head push CI and PR CI to finish \`SUCCESS\` at matching SHA. If any step fails, diagnose with Superpowers systematic-debugging and repeat RED/GREEN on same branch. Avoid force-push.
- [ ] **Merge only after review/green gates** and prior execution authorization. Verify post-merge \`main\` full CI and automated safe branch cleanup; check remote branches count equals one (\`main\`) and no unique open branch data was deleted. Update handoff in a separate docs closeout if necessary.
- [ ] **Run real artistic evaluation:** gather same-geometry A/B 64/128 PNGs for sword, pouch, censer; >=1 unfamiliar brief through a writable vision-capable agent host, document all failures/calls, and send blinded images to non-author reviewer(s). Do not manufacture provenance or reviewers. A missing independent review means \`VISUAL_REVIEW_PENDING\` even if rendering passes.
- [ ] **Publish decision:** Technical PASS iff regression/security/performance gates pass; Visual GO iff all three assets score >=3/5 silhouette+style at both sizes, >=2/3 pairs gain >=1 material-readability point at both sizes, no silhouette/style drop >1, with recorded disagreement; Autonomy GO only with provider-attested authored traces for >=3 unseen briefs. Failure results in \`TECHNICAL_NO_GO\` or \`ARTISTIC_NO_GO/NEEDS_REDESIGN\` (not a congratulatory release).

## Plan Self-Review Check

- **Spec coverage:** opt-in IR, explicit paint/marks/emission, legacy preservation, validation, style, MCP, security, explicit Godot behavior, 64/128 experiment, independent reviewers, provenance, deterministic CI and safe integration mapped to Tasks 1–8.
- **Task size:** independent slices (baseline, schema, paint, marks, glow, style, transport/Godot, evidence) each with its own RED/GREEN/commit.
- **Signatures:** \`validateAppearance\`, \`renderStyledDocument\`, \`parseUniqueKeysJsonLine\`, \`renderReviewPng\`, \`assertSameGeometryPair\` and \`prepareBlindPairMetadata\` each defined once and consumed consistently.
- **Review Focus:** the five risk classes listed at the top are tested by Tasks 1,2,3,4,5,7,8; the explicit Godot rejection is a deliberate POC limitation, not an assertion of appearance-aware cutout support.
- **Proportion:** no code implementation bodies; the algorithmic decisions omitted from the approved spec (wire names, normalized coordinate frames, resource ceilings, backward-compatibility strategy) are pinned here for an engineer who has not seen the discussion.
- **Status:** **PLAN PENDING USER APPROVAL**. This document does not grant permission to modify product code.
