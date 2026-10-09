# POC-005C1 Hybrid Independent Visual Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an auditable, offline, deterministic visual-review gate for existing three-category POC-005B A/B assets, where independent human submissions—not green CI or AI opinion—control artistic verdicts.

**Architecture:** New isolated `src/evaluation/` module owns immutable packages, validation, offline review, out-of-band reviewer eligibility, locking, mapping verification, deterministic verdicts and reports. Reuse the POC-005B geometry/render primitives without changing Art IR or legacy exporters. Separate reviewer-visible material from evaluator-private records, and keep synthetic CI evaluation incapable of producing a live `VISUAL_GO` assertion.

**Tech Stack:** Node.js >=22, ES modules, Node built-in `node:test` / `node:assert/strict` / `node:crypto` / `node:fs/promises`, pinned `rsvg-convert 2.58.0` and GitHub Actions Ubuntu 24.04; static offline HTML/JS, no added runtime NPM dependencies.

**Spec:** `docs/superpowers/specs/2026-10-09-poc005c1-hybrid-independent-visual-evaluation-design.md`

## Global Constraints

- This plan is **PROPOSED** following the approved written spec. Do not execute steps or change product code until the user separately approves this plan and selects an execution mode.
- Frozen primary categories, in order: `cultivation_sword_20261008`, `medicinal_pouch_20261008`, `stone_censer_20261008`; exact review cells: 3 assets × 2 blinded labels × 2 native longest-edge sizes (64 and 128) = 12 PNGs AND 12 score records **per reviewer**.
- Eligibility: exactly 1 or 2 distinct verified independent HUMAN reviewers as `reviewQuorum`, chosen **before** releasing the package; a session cannot silently downgrade 2→1.
- Five required **integer** scores per record: `silhouette`, `material`, `hierarchy`, `styleFit`, `coherence`, each 1–5. Required 12 cells per reviewer; coherence informed by three-asset contact sheet.
- For two reviewers, cell mean is exact (including halves) and `abs(score1-score2) >= 2` on any required cell => `REVIEW_PENDING`. A third reviewer/adjudication is out of scope for v1.
- `VISUAL_GO` thresholds: enhanced silhouette and styleFit >=3 at **both** sizes for **all three** categories; at least two of the three categories improve material >=1 **at both** sizes; no silhouette/styleFit delta < -1 for any asset/size.
- `TECHNICAL_NO_GO` is not interchangeable with `REVIEW_PENDING` or `ARTISTIC_NO_GO`. An AI critic is `ADVISORY_ONLY` and cannot issue or alter the human verdict.
- Preserve `AGENT_PROVENANCE_PENDING`. No provider-authorship proofs, independent held-out claims, new art generators or Godot material-aware exports in this project.
- **No source Art IR, sealed mapping, reviewer PII, third-party AI advice, author commentary or evaluator identity evidence inside reviewer kit or a public GitHub Actions artifact.** Keep evaluator-private state out of tracked files and CI artifact globs.
- Strict schema v1, UTF-8, bounded data; reject unknown/duplicate keys, unsafe paths/symlinks, tampered manifests, dimension/alpha errors. SHA-256 must hash original bytes, not unstable object serialization.
- Preexisting `src/core`, `src/style`, `src/export`, artwork and original POC-005B images MUST NOT be mutated. Only add evaluation-facing adapters, scripts, docs, tests and CI steps.
- Public reviewer HTML must work offline, with no network, no CDN or dynamic untrusted HTML, and with an explicit CSP; provide CLI JSON fallback if `file://` browser download/import is unavailable.
- Inline test snippets are contract examples. Implement any named setup helper that is not an exported production API (e.g. `freezeFixture`, `tamperOnePng`, `eligibleLockedFixture`, `runDryFixture`, `selfDeclaredHuman`) as a test-local function in that task's specified test file, using the v1 synthetic factories from Task 1. Never ship fixture identities or synthetic reviews as verified production evidence.
- Operator-private runtime data must live outside tracked source (or under an explicitly ignored private generated root). Modify `.gitignore` for `benchmarks/poc005c1/generated/` and any dedicated private evaluator directory; CI uploads ONLY the public `review/` subtree.
- Git policy after **future execution approval**: short-lived product branch, frequent RED→GREEN tests, self-review truthfully labeled, exact-head push + PR CI, merge to main, post-merge CI, safe remote branch cleanup leaving main, documentation handoff.

## Review Focus

The following traps must be explicitly tested in the task owning the code:
1. **Two-reviewer session with only one real eligible submission:** remain `REVIEW_PENDING` and never downgrade quorum to one automatically (Task 5).
2. **Newly regenerated/randomized A/B mapping accidentally combined with old score submissions:** reject on manifest/package/hash mismatch, rather than computing material deltas (Tasks 2, 5, 6).
3. **Adversarial PNG with a valid header but fake alpha/invalid IHDR or extra bytes:** do not accept from eight-byte signature alone; validate bounded real dimensions, PNG chunks, alpha and decode/render evidence (Task 2).
4. **Self-proclaimed human eligibility or synthetic CI fixture:** must not become live `VISUAL_GO` even if every numerical criterion is 5/5 (Tasks 4, 6, 8).
5. **CSV spreadsheet injection, local reviewer script/source leak or symlink in reviewer bundle:** refuse the export/input or encode safely, and fail kit release before reviewers see it (Tasks 1, 3, 8).

---

## Code ownership and ordered deliverables

| Task | Owns | Files |
| --- | --- | --- |
| 1 | Safe versioned contracts & immutable digests | `src/evaluation/contracts.mjs`, `src/evaluation/safe-io.mjs`, `test/evaluation-contracts.test.mjs` |
| 2 | Source-geometry and 12-PNG integrity preflight | `src/evaluation/preflight.mjs`, `test/evaluation-preflight.test.mjs` |
| 3 | Frozen offline reviewer-only kit | `src/evaluation/review-kit.mjs`, `src/evaluation/reviewer-ui.mjs`, `test/evaluation-review-kit.test.mjs` |
| 4 | Reviewer eligibility, 12-score submissions, safe import | `src/evaluation/reviewers.mjs`, `src/evaluation/submissions.mjs`, `test/evaluation-submissions.test.mjs` |
| 5 | Lock lifecycle and sealed mapping reveal | `src/evaluation/lifecycle.mjs`, `src/evaluation/locking.mjs`, `test/evaluation-locking.test.mjs` |
| 6 | Deterministic human-only verdict engine | `src/evaluation/verdict.mjs`, `test/evaluation-verdict.test.mjs` |
| 7 | Optional AI advice, traceable reports and privacy | `src/evaluation/advice.mjs`, `src/evaluation/reports.mjs`, `test/evaluation-reports.test.mjs` |
| 8 | Operator CLI, full offline rehearsal, CI/docs | `scripts/poc005c1-evaluate.mjs`, `test/evaluation-e2e.test.mjs`, `package.json`, `.github/workflows/ci.yml`, `benchmarks/poc005c1/README.md` |

Tasks 1–3 yield a reviewer kit independently; 4–6 add a safe verdict; 7–8 add reporting and an operator path. Do NOT create a hosted service, authentication stack, generalized art UI or 3rd-party recruitment connector.

### Task 1: Contracts, canonical evidence and safe file primitives

**Files:**
- Create: `src/evaluation/contracts.mjs`
- Create: `src/evaluation/safe-io.mjs`
- Test: `test/evaluation-contracts.test.mjs`
- Create: `test/fixtures/evaluation-fixtures.mjs` (only synthetic unit-test factory methods `validSession`, `validManifest`, `validSubmission` and `syntheticScoreRows`; outputs must carry `evidenceKind: "SYNTHETIC_TEST"`, never live human provenance).

**Interfaces:**
- Produces `parseEvaluationJson(rawUtf8: string): object` (strict parsing; reuse `parseUniqueKeysJsonLine` from `src/mcp/strict-json.mjs` under its existing 262144-byte budget, plus fixed schema strictness).
- Produces `validateSession(input: unknown): EvaluationSession`, `validateManifest(input: unknown): ReviewManifest`, `validateEligibility(input: unknown): ReviewerEligibility` and `validateSubmission(input: unknown, session: EvaluationSession): ReviewSubmission`; each returns sanitized frozen data or throws a typed validation error. Declare shapes with JSDoc typedefs in this file so Task 4 imports instead of redefining fields.
- Produces `canonicalBytes(value: JsonValue): Buffer`: explicitly sort object keys lexicographically recursively, preserve array order, allow only JSON values, require safe integers or finite numeric halves where policy permits, UTF-8 without whitespace; `sha256Bytes(bytes: Buffer): string`.
- Produces `readBoundedFile({root,relativePath,maxBytes}): Promise<Buffer>` (safe relative path, no ancestor symlinks, final regular file, no-follow open, max length, no path traversal); `writeAtomicFile({root,relativePath,content}): Promise<void>` (root-controlled directory, exclusive temp + atomic rename, cannot overwrite sealed state).
- Shared constants: `PRIMARY_ASSETS`, `SIZES=[64,128]`, `BLIND_LABELS=["A","B"]`, `SCORE_KEYS`, `RUBRIC_VERSION=1`.

- [ ] **Step 1: Write failing tests:** require exact primary assets, `reviewQuorum=1|2`, full 40-hex source SHA and UTC timestamps; reject duplicate JSON keys, extra fields, invalid Unicode, percent-encoded traversal, absolute paths, symlinks, BOM/non-UTF8 and inputs beyond limits. Assert `sha256Bytes(Buffer.from("a"))` is stable and `canonicalBytes({b:2,a:1})` byte-equals `canonicalBytes({a:1,b:2})`. Test CSV formula escaping as a pure helper `safeCsvCell(value)` in `contracts.mjs` (leading =,+,-,@, tab, CR).
~~~js
test("fixed reviewer quorum refuses 0/3", () => {
  assert.throws(() => validateSession(validSession({reviewQuorum: 0})), /reviewQuorum/);
  assert.throws(() => validateSession(validSession({reviewQuorum: 3})), /reviewQuorum/);
});
test("canonical object key order does not affect evidence digest", () => {
  assert.deepEqual(canonicalBytes({b: 2, a: 1}), canonicalBytes({a: 1, b: 2}));
});
~~~

- [ ] **Step 2: RED:** `node --test test/evaluation-contracts.test.mjs` → fails on missing imports/functions (not on test syntax).
- [ ] **Step 3: Implement minimal contracts/safe-io** using native Node crypto/fs, reuse existing unique-key parser, JSDoc shape validation, no new npm dependency; reject unsafe operations atomically.
- [ ] **Step 4: GREEN:** `node --test test/evaluation-contracts.test.mjs` → all named tests PASS; `npm test` keeps existing suite green.
- [ ] **Step 5: Commit:** `git add src/evaluation/contracts.mjs src/evaluation/safe-io.mjs test/evaluation-contracts.test.mjs test/fixtures/evaluation-fixtures.mjs && git commit -m "feat(evaluation): add safe versioned evidence contracts"`.

### Task 2: Frozen 12-PNG preflight and same-geometry source verification

**Files:**
- Create: `src/evaluation/preflight.mjs`
- Test: `test/evaluation-preflight.test.mjs`
- Reuse (no modification): `src/benchmark/real-asset-pairs.mjs`, `src/benchmark/appearance-pair.mjs`, `src/benchmark/render-review.mjs`.

**Interfaces:**
- Consumes contracts, safe IO and `assertSameGeometryPair(before,after)`.
- Produces `freezeSourceSession({sessionId,sourceCommitSha,reviewQuorum,rendererVersion,styleProfileId,createdAt,frozenAt,outputRoot}): Promise<{session: EvaluationSession, publicManifest: ReviewManifest, privateMapping: SealedMapping}>`.
- Produces `preflightSession({session,publicManifest,privateMapping,root,rerender}): Promise<{technicalStatus:"TECHNICAL_PASS"|"TECHNICAL_NO_GO",errors:string[]}>`. The source is reconstructed from all **three genuine existing POC-005A revisions** through `loadRevisedDocument` and `createMaterialPair`, not hardcoded geometry. Require actual `rsvg-convert version 2.58.0` in CI and verify full project SHA, exact native PNG size and original-byte hashes.
- PNG validator must walk IHDR/IDAT/IEND chunk boundaries and CRC, verify PNG color type 4 or 6 and valid alpha, native width/height, bounded bytes, and (in the renderer-pinned preflight) decode via fresh render comparison, not merely trust the PNG magic number. Reject atypical manipulated chunk layouts.

- [ ] **Step 1: Write failing tests:** freeze the 3 assets into a temp directory and assert exactly 12 PNG entries, matching source pair hashes and dimensions 64/128. Reject 11 files, wrong 63/127 long axis, forged PNG IHDR or CRC, loss of alpha, modified file after freeze, source/revision mismatch, changed geometry/z order, wrong renderer/version, missing seal, altered manifest digest, symlink and 2 sessions cross-wired.
~~~js
test("changed byte after freeze rejects entire session", async () => {
  const {session, publicManifest, privateMapping, root} = await freezeFixture();
  await tamperOnePng(root);
  const audit = await preflightSession({session, publicManifest, privateMapping, root, rerender: true});
  assert.equal(audit.technicalStatus, "TECHNICAL_NO_GO");
});
~~~

- [ ] **Step 2: RED:** `node --test test/evaluation-preflight.test.mjs` → import/functions missing.
- [ ] **Step 3: Implement** freeze and integrity preflight. Pin filenames `<assetId>/A-64.png`, `.../A-128.png`, `.../B-64.png`, `.../B-128.png`. Generate a single random A/B mapping per asset **once per frozen session**; persist private map before reviewer kit generation. Hash all original bytes and stable canonical manifest. Treat post-freeze regenerations as NEW sessions, even if source is identical.
- [ ] **Step 4: GREEN:** targeted tests PASS and rerun existing `node --test test/real-asset-pairs.test.mjs`. If renderer is unavailable locally, do not fake a passing PNG preflight; run pinned CI before accepting completion.
- [ ] **Step 5: Commit:** `git add src/evaluation/preflight.mjs test/evaluation-preflight.test.mjs && git commit -m "feat(evaluation): freeze and validate real A/B evidence"`.

### Task 3: Offline reviewer-only HTML and tamper-safe release boundary

**Files:**
- Create: `src/evaluation/review-kit.mjs`
- Create: `src/evaluation/reviewer-ui.mjs`
- Test: `test/evaluation-review-kit.test.mjs`

**Interfaces:**
- Consumes a PREFLIGHT_PASSED source session and its public manifest (never private mapping).
- Produces `buildOfflineReviewKit({publicManifest,publicAssetRoot,outputDir}): Promise<{kitRoot:string,kitDigest:string,files:string[]}>`; `renderReviewerHtml(manifest: ReviewManifest): string` creates a neutral, CSP-restricted offline page with allowlisted LOCAL `reviewer.js` (no CDN); `buildBlankReviewTemplate(manifest: ReviewManifest,reviewerId?:string): object` generates exactly 12 **unscored** rows and both `sourceManifestDigest` and `packageDigest` references bound to the frozen session.
- Role labels A/B remain constant for both scales. No source docs, sealed map, author comments, AI advice, unredacted names or external fonts/scripts are accepted in `kitRoot`.

- [ ] **Step 1: Write failing tests:** kit lists exactly 12 PNGs + neutral HTML + local offline `reviewer.js` + public manifest + blank score template; no internal private names/content, full source or evidence identities. Inspect HTML for inline/external scripts, unsafe event handlers, `http:`/`https:` references, `innerHTML`, A/B answer leakage, and CSV formula injection. Assert 64/128 file names and three backgrounds/contact-sheet sections, strict CSP, escaping of adversarial captions, working JSON import/export fallback (no server).
~~~js
test("reviewer kit never includes the sealed mapping", async () => {
  const kit = await buildOfflineReviewKit(frozenFixture);
  assert.equal(kit.files.filter(f => f.endsWith(".png")).length, 12);
  assert.equal(kit.files.some(f => /sealed|internal|author|source/i.test(f)), false);
});
~~~

- [ ] **Step 2: RED:** `node --test test/evaluation-review-kit.test.mjs` → expected failure before implementation.
- [ ] **Step 3: Implement** static offline board with minimal reviewer controls, labels and template download/export, no privilege to reveal mapping or change frozen pixels. Keep DOM code simple and local; avoid introducing libraries or browser HTTP dependencies. Use a templating escape helper and allowlisted file paths.
- [ ] **Step 4: GREEN:** targeted tests PASS. Manually inspect generated HTML with network disabled and verify original 64/128 PNGs are distinct real files; if browser testing is unavailable, record that limitation explicitly and rely on CLI fallback.
- [ ] **Step 5: Commit:** `git add src/evaluation/review-kit.mjs src/evaluation/reviewer-ui.mjs test/evaluation-review-kit.test.mjs && git commit -m "feat(evaluation): build blind offline human review kit"`.

### Task 4: Out-of-band reviewer eligibility and bounded complete submission

**Files:**
- Create: `src/evaluation/reviewers.mjs`
- Create: `src/evaluation/submissions.mjs`
- Test: `test/evaluation-submissions.test.mjs`

**Interfaces:**
- Consumes canonical frozen manifest from Task 1, reviewer-only form from Task 3.
- Produces `checkEligibility({reviewerRecord,session,independentVerification}): {eligible:boolean,reason:string}`, where independentVerification is an evaluator-controlled restricted local record with `verificationRef`, `verifiedBy` and `verifiedAt`; never treat arbitrary reviewer-written fields or AI strings as out-of-band evidence.
- Produces `validateHumanSubmission({rawSubmission,session,publicManifest}): ReviewSubmission` and `stageSubmission({submission,eligibility,privateRoot}): Promise<{submissionId:string,sha256:string}>`, rejecting wrong digest, duplicate cells/IDs, extras, non-human type, bad note lengths or changed blinded labels. Original form may be imported as JSON or safe, unambiguous CSV with quote parsing.

- [ ] **Step 1: Write failing tests:** build 12 × 5 integer scores, check exact set membership and 1..5 bounds; reject mixed-session IDs, 11/13 cells, duplicate row, fractional/NaN score, extra fields, >max notes, repeated reviewers, source manifest mismatch, unsupported CSV quoting, formula injection, PII leak, 'VERIFIED' string self-claim, self/author conflict, exposed A/B and no independent verification record. Ensure private records never land in tracked/public paths.
~~~js
test("self declaration never establishes independent eligibility", () => {
  const check = checkEligibility({reviewerRecord: selfDeclaredHuman(), session, independentVerification: null});
  assert.equal(check.eligible, false);
});
test("11 or 13 scored cells are rejected", () => {
  assert.throws(() => validateHumanSubmission({rawSubmission: submissionWithRows(11), session, publicManifest}), /12/);
  assert.throws(() => validateHumanSubmission({rawSubmission: submissionWithRows(13), session, publicManifest}), /12/);
});
~~~

- [ ] **Step 2: RED:** `node --test test/evaluation-submissions.test.mjs` → expected missing interfaces.
- [ ] **Step 3: Implement** strict import/eligibility separation and atomic private staging. Never claim a reviewer was really recruited or verified by tests. Restrict private verification record directory at filesystem boundary and print warnings if operator uses a public tracked path.
- [ ] **Step 4: GREEN:** targeted test suite and full `npm test` pass.
- [ ] **Step 5: Commit:** `git add src/evaluation/reviewers.mjs src/evaluation/submissions.mjs test/evaluation-submissions.test.mjs && git commit -m "feat(evaluation): validate non-author human submissions"`.

### Task 5: Immutable review lifecycle, lock and mapping reveal

**Files:**
- Create: `src/evaluation/lifecycle.mjs`
- Create: `src/evaluation/locking.mjs`
- Test: `test/evaluation-locking.test.mjs`

**Interfaces:**
- Produces `transitionSession({session,currentState,nextState}): EvaluationSession` with legal chain DRAFT → PREFLIGHT_PASSED → RELEASED → COLLECTING → LOCKED → REVEALED → DECIDED; illegal shortcut rejects.
- Produces `lockReview({session,submissions,verifiedEligibility,evaluatorId,lockedAt,privateRoot}): Promise<ReviewLock>`, requiring distinct eligible reviewer count equals predeclared reviewQuorum. Canonical lock digest hashes ordered `[sessionId,packageDigest,reviewQuorum,sortedByReviewerId(submissionId,sha256),evaluatorId,lockedAt]` with field keys fixed, not filesystem order.
- Produces `revealMapping({session,reviewLock,sealedMapping,sourceRoleHashes,actorId,revealedAt}): Promise<MappingReveal>`; sourceRoleHashes must match frozen baseline/enhanced **actual pixel bytes per scale**, plus sealed map SHA and the locked package digest. No revealing on partial locks.

- [ ] **Step 1: Write failing tests:** ensure cannot LOCK with no human, no verified identity, missing reviewer, self-claims or mixed sessions; predeclared quorum=2 with one reviewer remains REVIEW_PENDING. Reject changed scores after lock, tampered lock SHA, early mapping read, shuffled A/B role association, source hash mismatch, altered mapping, reordered reviewer rows, same signed review for different session, and illegal state jump. Verify deterministic lock digest independent of input ordering and new session requirement on blindness breach.
~~~js
test("two-person quorum cannot be downgraded after release", async () => {
  const session = validSession({reviewQuorum: 2});
  await assert.rejects(lockReview({session, submissions: [oneVerifiedSubmission], verifiedEligibility, evaluatorId, lockedAt, privateRoot}), /quorum|pending/i);
});
~~~

- [ ] **Step 2: RED:** `node --test test/evaluation-locking.test.mjs` → expected missing interfaces.
- [ ] **Step 3: Implement** immutable state transitions and the locked-stage checks. Persist secret/private state with exclusive files and restrictive permission; no code path exports mapping to public reviewer kit. Log reveal time and actor. Errors explicit; tampered source => TECHNICAL_NO_GO; unavailable reviewer/compromised blindness => REVIEW_PENDING plus redo.
- [ ] **Step 4: GREEN:** targeted tests PASS and verify reviewer kit cannot import `locking.mjs` or access sealed map.
- [ ] **Step 5: Commit:** `git add src/evaluation/lifecycle.mjs src/evaluation/locking.mjs test/evaluation-locking.test.mjs && git commit -m "feat(evaluation): lock blind scores before verified reveal"`.

### Task 6: Deterministic human-only VISUAL_GO / NO_GO / PENDING

**Files:**
- Create: `src/evaluation/verdict.mjs`
- Test: `test/evaluation-verdict.test.mjs`

**Interfaces:**
- Consumes `ReviewLock` and `MappingReveal` from Task 5 with verified eligible human submissions (never accepts advisory AI as score input).
- Produces `scoreVisual({session,lockedReviews,mappingReveal}): {visualStatus:"VISUAL_GO"|"ARTISTIC_NO_GO"|"REVIEW_PENDING",confidence:null|"SINGLE_REVIEWER"|"MULTI_REVIEWER",deltas:object,failures:string[]}` with exact integer/half-point arithmetic, required six asset/size groups and five criteria per blind label. `TECHNICAL_NO_GO` returns from preflight/lock integrity and must stop before scoreVisual runs.
- Produces `calculateDeltas({scores,mapping}): ScoreDeltas` (pure). For two reviewers with `abs(scoreA-scoreB)>=2` for ANY score cell, report disagreement and REVIEW_PENDING without smoothing away.

- [ ] **Step 1: Write failing tests with fully specified miniature tables:** exactly 3 assets×2 scales; 2-of-3 material improvements >=1 at BOTH sizes -> pass; 2 pass only at 64 but not 128 -> ARTISTIC_NO_GO; silhouette/style exactly 3 -> pass; delta exactly -1 -> pass, -1.5 -> fail; quality score halves never rounded; hierarchy/coherence mandatory but diagnostic-only. Independent no-role-reviewer quorum=0, self-claim, AI-only record => REVIEW_PENDING, not VISUAL_GO. Two humans with diff=2 at any required cell => REVIEW_PENDING. A correctly assembled **synthetic** positive test must be labeled `SIMULATED_ONLY` by the operator/end-to-end reporting layer, not human-proven live VISUAL_GO.
~~~js
test("two of three improve >=1 at both real sizes", () => {
  const result = scoreVisual(eligibleLockedFixture({materialWinners: ["sword", "pouch"], scales: [64, 128]}));
  assert.equal(result.visualStatus, "VISUAL_GO"); // purely simulated scorer unit test
});
test("a 2-point disagreement blocks averaging", () => {
  assert.equal(scoreVisual(eligibleLockedFixture({reviewerDisagreement: 2})).visualStatus, "REVIEW_PENDING");
});
~~~

- [ ] **Step 2: RED:** `node --test test/evaluation-verdict.test.mjs` → expected missing interfaces.
- [ ] **Step 3: Implement** pure arithmetic on locked scores. Assert same valid roster for both variants, both sizes. Preserve full decision trace and reasons. Never use model text, CI flag or optional AIAdvice to override a human gate. Distinguish tested pure hypothetical scores from a live operator-attested result in report (Task 7).
- [ ] **Step 4: GREEN:** targeted tests PASS; all threshold boundary tests covered and deterministic across shuffled score rows.
- [ ] **Step 5: Commit:** `git add src/evaluation/verdict.mjs test/evaluation-verdict.test.mjs && git commit -m "feat(evaluation): add deterministic human-only visual gates"`.

### Task 7: Optional AI critic advisory, provenance-preserving reports

**Files:**
- Create: `src/evaluation/advice.mjs`
- Create: `src/evaluation/reports.mjs`
- Test: `test/evaluation-reports.test.mjs`

**Interfaces:**
- Produces `normalizeAIAdvice({sessionId,status,provider,model,tool,pixelHashes,observations,generatedAt}): AIAdvice`; no external connector required for v1. Missing genuine available AI integration => `{status:"AI_TRIAGE_UNAVAILABLE",kind:"ADVISORY_ONLY"}`; never manufacture model identity or scores. Advice must be stored separately until all human reviews LOCK.
- Produces `buildPrivateReport({session,preflight,reviewLock,reveal,verdict,advice,evaluatorId,createdAt}): EvaluationReport` and `redactPublicReport(privateReport): PublicReport`. Always include exact source SHA, renderer/rubric versions, reviewer pseudonyms, evidence hashes, lock/map digests, criterion deltas, disagreements and `agentProvenance:"AGENT_PROVENANCE_PENDING"`. A dry-run/synthetic evaluation emits `evidenceKind:"SYNTHETIC_TEST"` and `liveVisualGoClaim:false` even if the pure-score function meets numerical thresholds.

- [ ] **Step 1: Write failing tests:** critic unavailable; unknown provider/model must be null/not guessed; advice says "excellent/GO" but human review pending or NO_GO => unchanged visual status. Private report preserves provenance and locked hash chain; redacted output excludes private verification/identity contacts, raw reviews/author notes and unrevealed mapping. Synthetic test fixtures must NEVER create a human-backed public VISUAL_GO claim.
~~~js
test("CI synthetic score fixtures cannot assert a real visual GO", () => {
  const report = buildPrivateReport({ ...validReportArgs, evidenceKind: "SYNTHETIC_TEST" });
  assert.equal(report.liveVisualGoClaim, false);
  assert.equal(redactPublicReport(report).agentProvenance, "AGENT_PROVENANCE_PENDING");
});
~~~

- [ ] **Step 2: RED:** `node --test test/evaluation-reports.test.mjs` → expected missing interfaces.
- [ ] **Step 3: Implement** normalized advice and two report projections with explicit public/private allowlists. Preserve decision trace, labels, attestation limitations and `AI_TRIAGE_UNAVAILABLE`. Do not add network calls or paid model integrations.
- [ ] **Step 4: GREEN:** targeted tests PASS; inspect redacted JSON on known adversarial private fixture and diff it against allowed public field list.
- [ ] **Step 5: Commit:** `git add src/evaluation/advice.mjs src/evaluation/reports.mjs test/evaluation-reports.test.mjs && git commit -m "feat(evaluation): separate advisory AI and redacted audit reports"`.

### Task 8: Offline operator CLI, integration/CI artifact, documentation

**Files:**
- Create: `scripts/poc005c1-evaluate.mjs`
- Create: `test/evaluation-e2e.test.mjs`
- Create: `benchmarks/poc005c1/README.md`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `.gitignore`

**Interfaces:**
- CLI with four explicit commands, each using prior tasks without inventing data:
  - `node scripts/poc005c1-evaluate.mjs freeze --session-id ID --quorum 1|2 --out ROOT --source-sha FULLSHA`: generate private source and public kit under separate roots after preflight; print technical hashes/SESSION ID only.
  - `... validate --session ROOT`: rehash/check geometry, PNG, manifest and output machine-readable technical status.
  - `... submit --session ROOT --submission PATH --verification PATH`: stage human scores with evaluator-side verified record (staging does NOT infer identity from fields).
  - `... decide --session ROOT --evaluator-id ID --locked-at ISO --revealed-at ISO`: run lock/reveal/report only when quorum and hashes verified; otherwise truthful REVIEW_PENDING without revealing map.
- CI script `npm run poc:005c1:dry`: creates a real UNSCORED reviewer kit from actual POC-005B material pairs and verifies its integrity, always writing `visualStatus:"REVIEW_PENDING"` and `independentReviewerCount:0`. This CI script must NOT invoke production `decide` using dummy reviewers.
- Keep existing `npm run check` and CI POC-001–005B/FolderForge/Godot gates intact; append new dry evaluator gate, and upload ONLY `benchmarks/poc005c1/generated/review/` with no private `internal/` path. Test glob boundary similarly to `test/real-asset-review-artifact.test.mjs`.

- [ ] **Step 1: Write failing end-to-end tests:** complete staged workflow with actual 12 PNGs, no network, all previous evidence hashes. With no external human produce honest TECHNICAL_PASS + REVIEW_PENDING. Attempt synthetic scores and a fake VERIFY flag -> still no live claim, note private verification needed. Verify invalid score import and tampered manifest cause correct statuses. Scan public artifact for source/mapping/PII/advice/author critique. Assert reviewer ZIP only contains allowlisted public resources. Verify CLI bad args and unsafe paths reject without mutation.
~~~js
test("dry CI kit stays unscored regardless of technical success", async () => {
  const {report,reviewKitFiles} = await runDryFixture();
  assert.equal(report.technicalStatus, "TECHNICAL_PASS");
  assert.equal(report.visualStatus, "REVIEW_PENDING");
  assert.equal(report.independentReviewerCount, 0);
  assert.equal(reviewKitFiles.some(f => /sealed|internal|private/i.test(f)), false);
});
~~~

- [ ] **Step 2: RED:** `node --test test/evaluation-e2e.test.mjs` → expected failing missing CLI/interfaces. Do not count synthetic fixtures as human reviewer evidence.
- [ ] **Step 3: Implement** minimal CLI orchestration with explicit `freeze`, `validate`, `submit`, `decide`, plus `poc:005c1:dry` npm script and pinned CI step. Store every operator-private record under an untracked, ignored root and warn/reject when a CLI output destination is a public tracked workspace path; add `benchmarks/poc005c1/generated/` to `.gitignore`. Generate README operator protocol: recruit at least one non-author human; declare quorum BEFORE kit release; keep score/mapping private; verify identity out of band; collect/lock scores; reveal map; compute deterministic verdict; publish sanitized report; label missing reviewer as BLOCKED: INDEPENDENT_REVIEWER. Leave origin attestation to POC-005C2.
- [ ] **Step 4: GREEN:** `node --test test/evaluation-e2e.test.mjs`, `npm run poc:005c1:dry`, `npm test`, `npm run check` all return exit 0 with no synthetic/actual live review claim. CI head must run the pinned Godot 4.7.2 and FolderForge fixture successfully, and public artifact must be reviewer-only.
- [ ] **Step 5: Commit:** `git add scripts/poc005c1-evaluate.mjs test/evaluation-e2e.test.mjs benchmarks/poc005c1/README.md package.json .github/workflows/ci.yml .gitignore && git commit -m "feat(evaluation): deliver offline human-review workflow and CI dry gate"`.

## Pre-merge whole-branch review and post-merge verification (execution-phase only)

- [ ] Reopen approved `docs/superpowers/specs/2026-10-09-poc005c1-hybrid-independent-visual-evaluation-design.md` and this plan; audit scope vs implemented interfaces: no unapproved renderer/Art IR/Godot changes.
- [ ] Run exact-head `npm test`, `npm run check`, `npm run poc:005c1:dry`; record test counts and actual exit codes instead of promising future ones. Manually inspect reviewer HTML/PNG as permitted; label unobserved GUI verification as not verified.
- [ ] Request separate whole-branch code review if available. Otherwise label review **SELF_REVIEW ONLY**—do not invent an external reviewer.
- [ ] Run secret/path/public-asset leakage review. Verify no real human ratings, credentials or private mapping in tracked branch or CI artifacts.
- [ ] Push feature branch, open PR and require exact-head push and PR Actions SUCCESS (including Godot, FolderForge and review-kit non-leak). On failure, systematic debugging + RED→GREEN regression and rerun exact final head before merge.
- [ ] Only after required reviews/CI pass merge PR into `main`, verify post-merge main CI and only then safely delete completed remote branches. Do not delete unmerged work and do not leave speculative branches.
- [ ] Update `README.md` and `docs/project/NEXT_RUN_PROMPT.md` in a documentation closeout PR with actual verified evidence, then repeat exact-head and post-merge verification. Do not call POC-005C1 Visual GO unless authentic independent human scoring/identity verification actually occurred.

## Execution Handoff — awaiting separate user approval

Written spec was user-approved on 2026-10-09; this implementation plan is not yet user-approved. Approval of the written spec is **not** permission to execute these tasks. Human reviewer recruitment, true identity attestation and POC-005C2 host provenance remain external gates regardless of CI status.

Recommendation: **Native execution** for this repo, because Tasks 1–8 share tight immutable-session/contract interfaces and must be integrated without changing existing art tools; reserve separate independent code/human-art review when available and never claim it occurred just because the same agent self-checked.

After the user reviews the plan, obtain explicit approval and execution-method selection before using `superpowers:executing-plans` or `superpowers:subagent-driven-development`. Stop here until then.
