# POC-005C1 — Independent Visual Evaluation: Architectural Design Specification v1.0

**Project:** Game Artist MCP (roronoazoroshao369/game-artist-mcp)  
**Date:** 2026-10-09  
**Approval boundary:** Hybrid Architectural Design v0.1 was approved in chat. This written specification is PROPOSED FOR SEPARATE USER REVIEW; it does not authorize implementation or an implementation plan.  
**Source checkpoint (at authoring):** main 5c5cc0d8bb66e84dc7af50e6d69adf3513770b3c. Always reverify live main before future work.

## 1. Mission, hypothesis, and success boundary

POC-005C1 tests whether explicit appearance instructions, applied to otherwise IDENTICAL existing geometry, measurably improve the visual quality and material readability of game assets at their actual 64 px and 128 px render sizes. A reviewer independent of asset authorship must be able to judge the images without learning which label means enhanced. A deterministic verifier must decide against a predeclared rubric only after genuine human scores are locked and the A/B mapping is revealed.

The chosen architecture is **Hybrid + Offline Review Kit + deterministic CLI verdict engine**:
- Automated technical preflight checks integrity, eligibility, source provenance metadata and consistent A/B geometry.
- An optional AI visual critic provides *advisory* defect descriptions in a separate channel. AI does not create ratings accepted as independent human evidence and cannot issue Visual GO.
- Human non-author reviewers provide blind scores and independence attestations; the evaluator records and verifies their eligibility out of band.
- Deterministic code computes the visual outcome; no model inference inside the verdict function.

POC-005C1 establishes a narrow **VISUAL** quality gate, NOT autonomous author provenance, production art quality across domains, or game-ready Godot integration. POC-005C2 is a separate architecture and approval cycle.

### 1.1 Baseline facts and reused contracts

As of checkpoint:
- POC-005B provides 3 source assets: cultivation sword (35 nodes), medicinal pouch (37), stone censer (44), with same-geometry baseline/enhanced PNGs at 64 and 128 long-axis pixels: 3 assets × 2 variants × 2 sizes = **12 PNGs**.
- Existing technical generators: scripts/poc005b-real-asset-ab.mjs, src/benchmark/appearance-pair.mjs (assertSameGeometryPair), and src/benchmark/render-review.mjs (renderReviewPng).
- Existing rubric header: benchmarks/poc005b/review-rubric.csv. Existing evidence overview: benchmarks/poc005b/evidence-schema.md.
- Optional fourth original compass (28 nodes) is a **self-selected** brief and is **not** one of the mandatory three, nor independent held-out agent proof. Treat it as supplementary case study only.
- Green npm test / CI proves structural behavior only. Reviewer status remains VISUAL_REVIEW_PENDING; provider-origin agent status remains AGENT_PROVENANCE_PENDING.
- Opt-in appearance is NOT supported by current Godot cutout export; retain explicit UNSUPPORTED_GODOT_APPEARANCE.
- Existing POC-005B blind mapping is operational, not cryptographically secret from someone who can inspect the public source. Do not claim otherwise.

### 1.2 Non-goals (out of scope)

No web server, reviewer identity provider, database, SaaS hosting, recruitment/automated impersonation of reviewers, paid AI service, new asset generator, alternative renderer, Godot/atlas/material-export changes, changes to Art IR schema, AI host provenance certification or POC-005C2 implementation. No production UI for public submissions. Do not introduce dependency on generative image assets or generative-model ratings.

## 2. Trust model and actors

- **Art Author:** authored geometry/appearance or initiated visual self-revision. Is INELIGIBLE to serve as an independent human reviewer of the same evaluation session.
- **Evaluator/Operator:** assembles immutable packages, checks integrity and reviewer eligibility, locks submissions, reveals mapping, and runs deterministic verdict. The evaluator may be an author, but must not promote their own judgment as independent reviewer evidence.
- **Independent Human Reviewer:** declares no authorship, receives only reviewer-visible package, submits signed/acknowledged 1–5 blind scoring for all required cells, and supplies a traceable evidence reference and review time. An evaluator must verify the declaration separately; a self-declared or self-signed JSON field is NOT proof.
- **AI Visual Critic (optional):** produces observations with model/tool attribution if available. Never gets decision authority, never counts toward reviewer quorum, and its outputs must be hidden from human reviewers until their forms are locked.
- **Decision Engine:** deterministic, read-only over locked evidence and sealed mapping, independent of external AI or reviewer recruitment.

Threats to handle: fabricated ratings/attestations, post-lock editing, premature label reveal, source-publication leakage, CSV formula injection, malformed records, symlink/path traversal, stale or mixed artifact versions, mismatched renderer output, claims of independent origin without proof, reviewer conflict of interest, and AI advice contaminating blind reviewers. This is **auditable operational blinding**, not cryptographic blind proof against a public-repo researcher.

## 3. Architecture and responsibilities

POC-005C1 is a new evaluation-only module, isolated from the core art editing and runtime systems. Proposed ownership (precise filenames can be finalized in the separately approved implementation plan):

| Component | Responsibility | Inputs → Outputs |
| --- | --- | --- |
| ReviewPackager | Freeze source and create a reviewer-only offline board with the existing A/B PNGs | POC-005B assets, renderer IDs, source pair → frozen session + public kit |
| EvidenceValidator | Check hashes, files, dimensions, actual alpha and source geometry, reject ambiguity | frozen manifest, trusted Art IR and PNGs → preflight |
| OptionalAIVisualCriticAdapter | Record independent, attributed observations; no scoring authority | reviewer-visible pixels → advisory findings or UNAVAILABLE |
| ReviewerRegistry | Bind pseudonymous reviewer IDs to separately verified non-author attestations | trusted evaluator eligibility record → eligible/ineligible/pending |
| BlindReviewCollector | Validate exact rubric cells and accept blind submissions without mapping | offline submission JSON/CSV → staged immutable submission |
| ReviewLocker | Verify complete eligible submissions and freeze scores and hashes before reveal | staged reviews → locked set + lock digest/time |
| MappingVerifier | Reveal A/B only after lock; check mapping by recomputation/source-pixel hashes | sealed mapping, source pair, locked evidence → baseline/enhanced map |
| VisualDecisionEngine | Apply numerical gates with deterministic arithmetic and no AI calls | verified score set, verified mapping → visual verdict |
| ReportBuilder | Assemble reproducible machine/human reports and flags | provenance, validation, score and verdict → private report, redacted public report |

### 3.1 Separate storage boundaries

1. **Public/reviewer-only**: pre-rendered A/B PNGs, neutral review board, public manifest containing blinded labels and pixel hashes, scoring instructions and template. NO source Art IR, A/B roles, AI commentary, original prompt modifications or author review.
2. **Evaluator-private**: source Art IR/SVG, A/B mapping, creation records, normalized eligible reviewer records, reviewer review data, conflict declarations, lock and scoring report. Do not commit raw contact details or private attestations to a public GitHub repo. Private local directory must not be included in CI artifact globs.
3. **Publishable after verdict**: sanitized report with counts, thresholds, material deltas, discrepancies, hashes and reviewer pseudonyms, but not direct PII or credential-bearing payloads.

The initial POC is offline and file-based. There is no false promise of trusted identity proofs from a standalone CSV. The evaluator's out-of-band confirmation is explicit, separate evidence with an opaque reference and local custody; technical tests simulate eligibility shapes but cannot create genuine eligibility.

## 4. Canonical package and versioned data contracts

All new schemas use schemaVersion = 1, strict allowlisted fields, safe normalized identifiers, UTF-8, bounded input sizes and no network-linked media. All hashes are lowercase SHA-256 over original **file bytes**; never hash a JSON object and assume it is the canonical original unless canonical serialization was used explicitly.

### 4.1 EvaluationSession (internal)

Mandatory fields:
- sessionId: nonblank stable safe token (unique; do not reuse across changed content).
- sourceCommitSha (full 40 hex) and sourceProjectId, rendererName and exact rendererVersion, styleProfileId, rubricVersion, packagerVersion.
- createdAt UTC ISO-8601, frozenAt UTC ISO-8601, declared primaryAssets = [cultivation_sword_20261008, medicinal_pouch_20261008, stone_censer_20261008] in a stable prescribed order; optional supplementary assets recorded separately and excluded from the 3-category verdict.
- reviewQuorum: exactly 1 or 2, DECLARED AND FROZEN before releasing the kit. The evaluator may choose quorum=1 (minimum viable) or 2 (preferred), but never silently downgrade a released two-reviewer session to one reviewer after seeing outcomes.
- sourcePairs: for each asset, absolute content SHA-256 of baseline/enhanced source Art IR bytes and SVG bytes, a deterministic sameGeometry=true check and check result. Source paths remain private.
- blindedFiles: exact 12 entries assetId × label A/B × longAxisPx 64/128, each with stable relative filename, SHA-256, native pixel width/height and actual PNG color-type/alpha validation. Dimensions must match the project rasterizer's frozen manifest and max(width,height) exactly 64 or 128.
- sealedMappingDigest = SHA-256 of saved immutable evaluator-side mapping file; mapping content is NOT in review artifact.
- immutable packageDigest over a documented canonical manifest and ordered file hash list. Any mismatch -> TECHNICAL_NO_GO and a new session, never silent in-place repair.

### 4.2 Reviewer-visible manifest and offline board

ReviewManifest includes sessionId, rubricVersion, frozenAt, three descriptive asset labels (function and intended material, **not** baseline/enhanced), renderer identity, a list of 12 blinded PNG names + hashes + actual sizes, and per-review instructions. Reviewer UI must show the original image pixels at natural 64/128 dimensions, allow checkerboard/white/dark backgrounds without modifying source pixels, and support a 3-asset contact sheet. CSS resizing for layout is allowed but NOT a substitute for separately rendered 64px and 128px files. No label reveal.

Offline board may use deterministic local HTML/JS and download an editable submission file, but must work with networking disabled, must not load CDN fonts/scripts/assets or call a server, must escape all untrusted text, must never use untrusted innerHTML, must enforce a restrictive CSP, and must not persist unencrypted private reviewer identities or author-side source state. If browser file-URL restrictions block the desired workflow, a CLI/JSON import-export fallback is mandatory.

### 4.3 ReviewerEligibility and Submission

An eligible reviewer must be a HUMAN who is not the asset's author or contributor, is not blindly copying someone else's assessment, and has not seen A/B mapping or author/AI critique before locking. Fields: reviewerId (pseudonym), reviewerType = HUMAN, declaration NOT_ART_AUTHOR, conflictDisclosure (bounded), blindExposure = NOT_EXPOSED, verificationStatus = VERIFIED_OUT_OF_BAND, verificationMethod, evidenceRef, reviewerSignedOrAcknowledgedAt (UTC), verifiedBy independent evaluator ID and verifiedAt UTC. A self-declaration alone is PENDING; no self-minted credential auto-passes.

A ReviewSubmission has submissionId, sessionId, reviewerId, rubricVersion, submittedAt UTC, provided sourceManifestDigest and a bounded notes section. Exactly **12 score records** are required, one for each of 3 assets × 2 blind labels × 2 actual render sizes. Each record includes five integer scores in 1..5: silhouette, material, hierarchy, styleFit, coherence, plus a bounded optional reason/note. Coherence must be assessed against the 3-asset sheet after the individual images; it remains recorded per asset/size/variant in v1 to match the existing CSV contract. Missing, duplicate, out-of-range or wrong-session score records are rejected. ReviewSubmission never contains baseline/enhanced roles. All reviews must bind the same frozen packageDigest; a review of a regenerated random A/B set is a DIFFERENT session.

The reviewer signature/acknowledgment binds the canonical hash of their submission; it supports chain of custody but does not substitute independent verification of identity. POC implementation may retain signed evidence out of band if personal information must remain private. A reviewer cannot submit a second accepted altered version after locking; any correction requires a new session or explicit superseding version with a new lock and documented reviewer consent. No fabricated scores/test fixtures may be mislabeled as live human submissions.

### 4.4 ReviewLock and MappingReveal

ReviewLock includes sessionId, ordered accepted submission IDs/hashes, frozen packageDigest, evaluator ID, lockedAt UTC and a lockDigest; verify that the number of *eligible distinct humans* exactly equals the session's predeclared reviewQuorum (1 or 2). Order and canonical byte representation for lockDigest must be specified in implementation plan/tests, not depend on JavaScript object iteration or filesystem enumeration. Locking fails while scores, identities, or attestations are incomplete.

Mapping reveal requires a valid lock and artifact-integrity PASS. The evaluator's sealed map must match sealedMappingDigest and role identity; baseline/enhanced role assignment must additionally be confirmed by deterministic rerendering or previously frozen per-role PNG hashes under the pinned renderer and source documents. A match on a new randomized session is invalid. Any unsolved ambiguity or mismatch -> TECHNICAL_NO_GO. Log reveal actor/time and evidence hash. Never allow mapping access from reviewer kit; user-supplied mapping keys must not be trusted alone.

### 4.5 AI Critic advisory output

Optional AIAdvice record contains sessionId, model/provider/tool if known (not guessed), inspected file hashes, observation text, kind = ADVISORY_ONLY, generatedAt UTC, and status = AVAILABLE or AI_TRIAGE_UNAVAILABLE. AIAdvice must not inject human rating rows, substitute reviewer eligibility, alter already locked scores, or affect VisualDecisionEngine results. No external model is mandatory to run POC-005C1. If the external AI connection is absent, report unavailable truthfully and continue human evaluation. Model credentials or raw private account data never enter review artifacts.

## 5. End-to-end state machine

DRAFT → PREFLIGHT_PASSED → RELEASED → COLLECTING → LOCKED → REVEALED → DECIDED.

- DRAFT: sources gathered; no review authority.
- PREFLIGHT_PASSED: complete frozen 12 PNGs, hash and shape integrity, geometry parity and reproducibility verified, renderer/source pins recorded.
- RELEASED: reviewer ZIP generated from manifest and only reviewer-visible resources; any exposure of mapping before submission invalidates the affected review.
- COLLECTING: submissions staged and verified; AI advice handled separately.
- LOCKED: every accepted submission complete, eligible, hashed and bound to exactly one frozen manifest. No mutable scores.
- REVEALED: A/B map verified with locked source; never reveal before lock.
- DECIDED: deterministic report and status produced; no further edits in same session.

On package/source tamper, unverifiable mapping, alpha/size mismatch, changed geometry or unsafe serialization: **TECHNICAL_NO_GO**, halt and start a new session. On missing/invalid reviewers, partially completed forms, conflicts, early mapping exposure or unresolved reviewer disagreement: **REVIEW_PENDING** (blocked reason recorded, session invalidated/reissued when blindness compromised). A review's label leak cannot be cured by resetting a flag. Status errors are not hidden by CI success or optional AI assessment.

## 6. Deterministic scoring and verdict

Only mandatory three original categories count. Reviewer count is 1 or 2 eligible HUMANS in the first release. 1 human is minimum, confidence = SINGLE_REVIEWER; 2 independently eligible and nonconflicting humans, confidence = MULTI_REVIEWER. No numeric 'confidence %' is manufactured. A third adjudicator may be requested in real operations, but introducing 3-reviewer aggregation needs a separately defined/approved scoring policy; until then hold REVIEW_PENDING or start a new frozen review session.

Quorum is fixed in the frozen EvaluationSession: if a two-reviewer session has only one eligible human, remain REVIEW_PENDING. To use single-reviewer confidence instead, start a NEW session with reviewQuorum=1 and recollect eligible blinded submissions; never silently downgrade the existing session.

For one reviewer, each cell's score is that reviewer's integer. For two, cellScore = arithmetic mean of the two integer scores, keeping exact halves (no rounding). For every (asset,blindLabel,scale,criterion) require reviewer agreement: absolute difference <2 for ALL five criteria. Difference >=2 at any required cell => REVIEW_PENDING with discrepancy details; never silently average away disagreements or override them based on AI commentary.

After lock and verified reveal:
- Enhanced silhouette >=3 and enhanced styleFit >=3 for **each of the three assets at both 64 and 128**.
- For at least two of three assets, enhanced material minus baseline material >=1 **at 64 AND at 128**. Evaluate 2-of-3 by asset, not by treating 4 of 6 independent cells as sufficient.
- For every asset/scale, enhanced silhouette minus baseline silhouette >= -1 AND enhanced styleFit minus baseline styleFit >= -1.
- Hierarchy/coherence scores are required and reported, but do not independently trigger VISUAL_GO/NO_GO in version 1; use them for diagnosis.
- Same reviewer roster scores baseline and enhanced for both sizes; no comparing scores from different people on A vs B.
- If all gates pass and independent eligibility/lock/mapping pass, visualStatus = VISUAL_GO.
- If complete valid eligible scores exist but one or more quality gates fail, visualStatus = ARTISTIC_NO_GO / NEEDS_REDESIGN, with failed criterion and asset/size deltas.
- If any eligible reviewer, lock or review completeness requirement is absent, visualStatus = REVIEW_PENDING.
- Independently, technicalStatus can be TECHNICAL_PASS or TECHNICAL_NO_GO; Autonomy remains AGENT_PROVENANCE_PENDING unless separately established by the future C2 (C1 NEVER emits AUTONOMY_GO).
- Human verdict and AI advisory may disagree; preserve both with their evidence and DO NOT let AI change verdict.

All calculations must be exact deterministic integer/half-point arithmetic. Visual threshold values and reviewer behavior are pinned in rubricVersion=1; a later threshold change creates a new evaluation policy and must not rewrite historical verdicts.

## 7. Reports and reproducibility

Private EvaluationReport requires sessionId, exact full sourceCommitSha, all primary input/output file digests, renderer/style/rubric versions, preflight result, reviewer pseudonyms and eligibility verification references, submission/lock/mapping digests, numeric A/B per-criterion scores and deltas, gating calculations and failures, disagreement details, AI advisory status, visualStatus and confidence, explicit AGENT_PROVENANCE_PENDING, createdAt, evaluator information and causal trace to source artifact.

Public redacted report retains reproducible hashes, scoring policy and aggregated scores, provenance limitations, unresolved blockers and exact decision, without raw contact details, private attestations, reviewer-side unredacted comments or unrevealed mapping before lock. The evaluation should be reproducible from retained artifact bytes, trusted reviewer eligibility confirmations, trusted mapping and policy version; do not claim proof of cryptographic human identity absent an out-of-band service.

No reviewer/test data is invented. A CI run with zero external reviewers MUST produce a truthful TECHNICAL_PASS and REVIEW_PENDING; this is an expected successful technical test, not a Visual GO.

## 8. Safety and robustness requirements

- Fail-closed strict input parsing and bounds: safe session/file IDs, reject duplicate JSON keys, unrecognized fields, unknown schema versions, nonfinite/noninteger scores, missing timestamps or inconsistent digests; reviewer note and CSV cell size limits.
- Refuse symlinked sources and path traversal; use allowlisted path roots and atomic writes where feasible. Reviewer ZIP paths must not escape kit root, and external links/network fetches are forbidden in offline assets.
- Defend against CSV formula injection when exporting spreadsheet-readable text; escape HTML/content attributes and enforce CSP. Never execute reviewer-supplied scripts or evaluate document content.
- Do not store personal contact information in committed artifacts; pseudonymous reviewer IDs only. Keep human verification records separately with restricted access.
- Test missing alpha, forged PNG headers, wrong pixel dimensions, mismatched SVG/IR, changed node order or geometry, truncated outputs, mixed sessions and SHA mismatch.
- Test blinded asset names for label bias and role leaks; determine exposure/contamination operationally through protocol and reviewer declaration, not automated assertions that a public repo is 'unbreakably blinded'.
- Optional AI output is untrusted third-party text, can be noisy/hallucinated and must be treated as non-authoritative data.
- Do not modify src/core, src/style, export_godot_cutout or artwork in C1. Add evaluator tooling at the boundary only. Do not alter already frozen POC-005B artifacts in place.

## 9. Testing plan and acceptance matrix (requirements, not code authorization)

| Test case | Expected outcome |
| --- | --- |
| 3 authentic POC-005B categories, 12 PNGs, identical geometry, pinned renderer and hashes | PREFLIGHT_PASSED |
| 11/12 PNGs, invalid native size, absent alpha, altered source JSON, mismatched SHA/role | TECHNICAL_NO_GO |
| Public kit inspection finds sealed mapping/private source/author critique | Release fails; no review |
| AI critic unavailable | Technical review remains usable; AI_TRIAGE_UNAVAILABLE |
| Valid local synthetic score fixture, no real human eligibility | REVIEW_PENDING; fixture NEVER creates genuine VISUAL_GO |
| No human reviewer, zero score rows | REVIEW_PENDING, no fabricated data |
| Human self-attests but no out-of-band identity/independence verification | REVIEW_PENDING |
| Eligible human reviews exactly 12 cells, lock and mapping valid, all thresholds pass | VISUAL_GO, SINGLE_REVIEWER |
| Two eligible humans with no >=2 disagreements, quality gates pass | VISUAL_GO, MULTI_REVIEWER |
| Two humans differ by 2 in a required cell | REVIEW_PENDING (no silent average) |
| 2 of 3 categories improve material >=1 at 64+128 and all other gates pass | Material improvement gate PASS |
| Only 1 category improves at both sizes, or 2 improve at 64 but not 128 | ARTISTIC_NO_GO |
| Enhanced silhouette=3 or styleFit=3 exactly | Threshold PASS (>=3) |
| Silhouette/style delta=-1 exactly | Regression boundary PASS (>=-1) |
| Silhouette/style delta below -1 or one required enhanced score below 3 | ARTISTIC_NO_GO |
| Score altered after lock or mapping shown to reviewer before lock | Refuse mutated evidence; REVIEW_PENDING/redo, or TECHNICAL_NO_GO on content tamper |
| Inaccessible/recovered map cannot match original image bytes | TECHNICAL_NO_GO |
| Contradictory AI advice versus locked human result | Preserve advice; decision unchanged |
| CI all green with zero external scores | Technical checks PASS, VISUAL_REVIEW_PENDING |

All POC-005C1 outputs must be reproducible from controlled versioned inputs; decision-engine unit tests must explicitly test half-point boundaries and require all review cells.

### 9.1 Deliverables and acceptance

1. Versioned, reviewed and frozen schema definitions for manifest, eligibility, submission, lock, map reveal and report.
2. Offline reviewer-only HTML package + machine-readable export/import, works with no network.
3. Integrity gate for exactly three categories and 12 PNGs, geometry/source hash and pinned render check, strict fail-closed state transitions.
4. Deterministic reviewer scoring, disagreement gate, Visual GO/NO-GO/PENDING status; no positive verdict from fixtures or AI output.
5. AI advisory adapter optional or explicitly unavailable; must never block valid independent human review or influence verdict.
6. CI tests with *synthetic labeled fixtures*, plus a real UNSCORED generated review kit from existing POC-005B; CI never pretends synthetic reviewers are humans.
7. Documentation for a human evaluator to recruit external reviewers, collect and lock submissions, reveal verified mapping, run independent scoring and publish redacted results.
8. Full exact-head CI, PR merge, post-merge CI and branch cleanup only after **separate user approval of written implementation plan and its execution mode**.

## 10. Stage gates and next handoff

- **Approved in conversation:** Hybrid Architectural Design v0.1, 2026-10-09.
- **Current output:** this v1.0 written spec for human review, not yet user-approved.
- **STOP:** do not implement scripts, tests, schemas, HTML app or write an implementation plan before user explicitly approves THIS written spec.
- **After written-spec approval:** use Superpowers writing-plans and propose concrete file-by-file TDD steps, then request separate approval for the written plan and execution method.
- **Only after plan approval:** implement on isolated feature branch, RED→GREEN tests, documented self-review vs independent review provenance, exact-head GitHub Actions, merge, post-merge verification, safe branch cleanup.
- **Actual independent review:** collecting a human's scores and verification cannot be conjured by CI or ChatGPT. If absent, mark BLOCKED: INDEPENDENT_REVIEWER, keep VISUAL_REVIEW_PENDING; do not assert production art quality.
