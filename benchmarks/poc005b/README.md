# POC-005B — controlled technical A/B and external artistic review

Status: TECHNICAL EXPERIMENT ONLY. No independent reviewer result or host-authenticated agent authorship is included in this repository.

## Intent
Judge whether **explicit appearance instructions** improve material readability relative to identical original geometry. An original vision-capable agent must still author new held-out geometry itself; locally seeded technical fixture is not agent proof. Do not evaluate authored example templates as independent agent performance.

## Reproducible technical sample
Run `npm run poc:005b` from repo root. It renders a deliberately generic ellipse with unchanged geometry and two appearances using pinned `rsvg-convert`, into `benchmarks/poc005b/generated/`. The outputs are PNGs with actual long sides 64 or 128 pixels, NOT browser CSS resizing. HTML side-by-side board offers checkerboard/dark/light backgrounds and conceals which image uses material enhancement until reviewer scoring is sealed. CI uploads only this technical sample.

## Independent trial
1. Provide the vision-capable host an **unfamiliar original asset brief**, without coordinates, geometry recipes or generator service. Obtain provider-side tool-call provenance independently of the in-repo JSONL.
2. Save original geometry and the exact same geometries with opt-in material appearance; check `assertSameGeometryPair`, stop if anything else changes.
3. Save transparent PNGs at 64px and 128px, full SVG/Art IR, hashes, renderer+commit SHA and failures. Show both light/dark/checkerboard backdrops.
4. Conceal A/B assignment from reviewer. Have non-author reviewer(s) inspect each size and the three-item contact sheet, record identity/type, timestamp and evidence, and score silhouette, material, hierarchy, style-fit and consistency 1–5 without seeing enhanced labels.
5. Unlock mapping after scoring, record disagreements. A minimum of one **independent** reviewer; ideally two. Never substitute SELF_REVIEW for this.
6. Use exact baseline categories (sword, medicine pouch, stone incense burner) plus at least one fresh unknown brief, no new A/B geometry changes.
7. Keep FULL_PASS impossible without **both** verified agent provenance and independent visual review. Technical CI cannot satisfy those gates.

Visual GO only with each category >=3/5 silhouette+style at 64 and 128, at least 2/3 categories gaining >=1 point material readability at BOTH resolutions, and no >1-point silhouette/style regression. Otherwise NEEDS_REDESIGN or VISUAL_REVIEW_PENDING as applicable.
