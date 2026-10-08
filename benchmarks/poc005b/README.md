# POC-005B — controlled technical A/B and external artistic review

Status: TECHNICAL EXPERIMENT ONLY. No independent reviewer result or host-authenticated agent authorship is included in this repository.

## Intent
Judge whether **explicit appearance instructions** improve material readability relative to identical original geometry. An original vision-capable agent must still author new held-out geometry itself; locally seeded technical fixture is not agent proof. Do not evaluate authored example templates as independent agent performance.

## Reproducible technical sample
Run `npm run poc:005b` from repo root. It renders a deliberately generic ellipse with unchanged geometry and two appearances using pinned `rsvg-convert`, into `benchmarks/poc005b/generated/`. The outputs are PNGs with actual long sides 64 or 128 pixels, NOT browser CSS resizing. HTML side-by-side board offers checkerboard/dark/light backgrounds and conceals which image uses material enhancement until reviewer scoring is sealed. CI uploads only this technical sample.

## Three real POC-005A geometry A/B pairs (UNSCORED retrospective trial)

Run `npm run poc:005b:real`. This replays the **recorded local stdio MCP operations** in all three POC-005A transcript JSONL files to their final revisions, then applies **only explicitly authored appearance fields** to selected existing nodes. There is no new object generator, no new asset geometry, no generative-art provider. The comparator enforces identical original geometry, node order, fills, strokes and all non-appearance fields. An additional unit test checks source node counts 35/37/44, revisions, style budgets and targeted fail-closed behavior.

Actual transparent PNGs are rendered for 3 assets × 2 randomly labeled A/B roles × 64/128 long-axis sizes (12 images). The reviewer-only HTML board displays checkerboard, dark and light backgrounds. Each new run uses a separate random blind-label seed, with the mapping and source Art IR stored in **ignored internal files**. The CI artifact publishes only `generated/real-asset-ab/review/`, never the mapping; reviewers must avoid source inspection and finish unsigned scoring templates independently. A CI runner's ignored private mapping is ephemeral: after scoring is sealed, the author can recover the A/B role by rerendering the exact baseline and enhanced source with the pinned renderer and comparing output SHA-256 hashes. This is an operational blinding protocol for external reviewers given only the reviewer ZIP, **not** cryptographic confidentiality against somebody examining the public repository and Actions artifacts.

This is a **retrospective controlled appearance experiment** on previously authored geometry; it is NOT evidence that a newly connected provider-authenticated AI designed new assets. It also is not proof of aesthetic improvement. Until a non-author blind review and fresh host-origin signed trial are obtained, keep `VISUAL_REVIEW_PENDING` and `AGENT_PROVENANCE_PENDING`, with Visual GO and Autonomy GO unset. Never promote the bundle to `FULL_PASS` because hashes, style checks, or CI are green.

## Fresh self-selected original MCP trial (2026-10-08, technical only)

The original **Astral Root Compass** brief was **selected by the same ChatGPT session that authored the art**, so it is NOT an evaluator-supplied blind/held-out prompt and cannot satisfy an independent Autonomy GO trial. It was supplied without coordinates or object recipes. A ChatGPT session manually authored 28 explicit Art IR nodes through nine actual local stdio MCP calls, inspected both returned PNGs, changed one cord path after noticing a disconnected tassel and explicitly assigned material gradients, clipped marks and glow to six nodes. The complete nine-file record is under `benchmarks/poc005a/runs/astral_compass_trial_20261008/`, including a SELF_REVIEW critique, two PNGs and a real MCP transcript. Run `npm test` to structurally audit it. The local trace remains `agentProvenance=UNKNOWN` and **cannot prove provider-attested authorship**.

Run `npm run poc:005b:heldout` to reconstruct the final 28-node geometry from that transcript, strip ONLY the appearance modifiers for a same-geometry baseline, validate both documents and generate four actual 64/128 PNGs with randomized blinded A/B labels. Only `generated/heldout-compass/review/` is uploaded in the separate CI reviewer artifact. Hidden mapping and source JSON live under an ignored `internal/` folder. This reviewer package is UNSCORED; no independent reviewer or visual improvement has been demonstrated. The public source could be used to recover the mapping, so blinding depends on restricting reviewer access to the reviewer package alone.

Do not merge the local self-review with a third-party rating. An independent non-author reviewer and externally verifiable provider host-authorship trace are still blockers for visual/autonomy GO.

## Independent trial
1. Provide the vision-capable host an **unfamiliar original asset brief**, without coordinates, geometry recipes or generator service. Obtain provider-side tool-call provenance independently of the in-repo JSONL.
2. Save original geometry and the exact same geometries with opt-in material appearance; check `assertSameGeometryPair`, stop if anything else changes.
3. Save transparent PNGs at 64px and 128px, full SVG/Art IR, hashes, renderer+commit SHA and failures. Show both light/dark/checkerboard backdrops.
4. Conceal A/B assignment from reviewer. Have non-author reviewer(s) inspect each size and the three-item contact sheet, record identity/type, timestamp and evidence, and score silhouette, material, hierarchy, style-fit and consistency 1–5 without seeing enhanced labels.
5. Unlock mapping after scoring, record disagreements. A minimum of one **independent** reviewer; ideally two. Never substitute SELF_REVIEW for this.
6. Use exact baseline categories (sword, medicine pouch, stone incense burner) plus at least one fresh unknown brief, no new A/B geometry changes.
7. Keep FULL_PASS impossible without **both** verified agent provenance and independent visual review. Technical CI cannot satisfy those gates.

Visual GO only with each category >=3/5 silhouette+style at 64 and 128, at least 2/3 categories gaining >=1 point material readability at BOTH resolutions, and no >1-point silhouette/style regression. Otherwise NEEDS_REDESIGN or VISUAL_REVIEW_PENDING as applicable.
