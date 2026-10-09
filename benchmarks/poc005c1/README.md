# POC-005C1 — Hybrid independent visual evaluation (OFFLINE)

**Status:** Technical workflow only; no independent reviewer has rated the assets. Never infer VISUAL_GO, autonomy or production quality from CI.

Run `npm run poc:005c1:dry`. This reconstructs the three original POC-005A source asset categories (sword, medicinal pouch, stone censer), produces twelve true 64/128px PNGs and an OFFLINE human-only blind reviewer kit under `benchmarks/poc005c1/generated/review/`. A/B roles are randomized per session and the evaluator-private mapping lives only in an ephemeral temp root on dry runs. The GitHub artifact uploads **only** `generated/review/`. It must remain UNSCORED until real reviewers submit their assessments.

## Operator workflow (human review only)

- Run `node scripts/poc005c1-evaluate.mjs freeze --session-id <safe-unique-id> --out <private-outside-repo-dir> --source-sha <40-hex-main-sha> --quorum 1` (use 2 if two independent humans are available before the session is frozen). Prefer a private directory **outside any tracked repository**, never commit or share `internal/`.
- Give the reviewer **only** `reviewer-kit/`. Instruct them not to inspect the public code or other reviewers' scores, source files, author/AI critique, sealed A/B mapping or previews before submitting.
- Reviewer inspects all image pairs on checkerboard, light and dark backgrounds at both resolutions, rates five criteria 1–5 on **12 required rows**, and returns the downloaded blind JSON. The offline HTML does not require network; JSON/CLI import is the fallback.
- A real independent evaluator verifies each reviewer is human, not involved in creation, and did not see the A/B assignment; retain an external confirmation privately. The `--verification` JSON includes `reviewerId`, `verificationStatus="VERIFIED_OUT_OF_BAND"`, `verificationMethod`, `evidenceRef`, `verifiedBy`, `verifiedAt`, `reviewerSignedOrAcknowledgedAt`, `realHumanConfirmed=true`, `notAuthorConfirmed=true`, and `blindExposure="NOT_EXPOSED"`. **Writing this file or ticking these fields does not itself prove human independence.** It is an operator-attested custody record; use real external evidence.
- Import after eligibility checks: `node scripts/poc005c1-evaluate.mjs submit --session <root> --submission <blind-scores.json> --verification <private-confirmation.json>`. Never import synthetic CI fixture data as human scores.
- Validate any time: `node scripts/poc005c1-evaluate.mjs validate --session <root>`. Decide only after the frozen 1/2-person quorum has submitted: `node scripts/poc005c1-evaluate.mjs decide --session <root> --evaluator-id <id>`. This locks scores, checks mapping integrity and produces private and redacted reports under `internal/`. Do not attempt re-locking an already decided session.
- If reviewer is unavailable, declare **BLOCKED: INDEPENDENT_REVIEWER** and `REVIEW_PENDING`. 2-reviewer quorum is frozen and cannot be downgraded later. Do not use AI scoring to fill missing humans.

## Visual gate

Enhanced silhouette and style fit >=3/5 on all 3 categories at both sizes; >=2/3 categories improve material >=1 point at 64px **and** 128px; silhouette/style must not regress by more than 1. Two reviewers with any 2-point disagreement remain REVIEW_PENDING. AI advice is optional, labeled `ADVISORY_ONLY`, and never changes the verdict. This workflow does **not** verify agent-provider authorship. Keep `AGENT_PROVENANCE_PENDING` until a separately approved POC-005C2.

## Scope and evidence limitations

- Synthetic unit tests can exercise arithmetic but are NOT real blind human evaluations.
- Public source permits inferring some A/B assignments. Blinding is operational, not cryptographic.
- Identity is verified manually outside the repository, not proven by JSON flags. No secrets/contact details belong in GitHub artifacts.
- New appearance is still unsupported in the legacy Godot cutout exporter; POC-005C1 does not change that.
