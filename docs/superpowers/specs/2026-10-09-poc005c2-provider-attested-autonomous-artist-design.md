# POC-005C2 — Provider-Attested Autonomous Artist Benchmark — Design Specification v1.0

**Repository:** `roronoazoroshao369/game-artist-mcp`  
**Date:** 2026-10-09  
**Status:** PROPOSED FOR WRITTEN SPEC REVIEW, not implementation approval. User's 2026-10-09 "duyệt" authorizes exploration/design of POC-005C2, not automatic implementation or a self-certified autonomy GO.  
**Baseline:** verified live `main` `110a0cca2a823efc04950deadabefd592b4d2ab0`; main CI `37884453724` SUCCESS, cleanup `37884533543` SUCCESS, remote only main before this spec branch. Reverify before any implementation.

## 1. Purpose, question, and falsifiable result

**Question:** Can a genuinely vision-capable model, acting through a real trusted model host, receive an unfamiliar original 2D prop brief, decide explicit Game Artist MCP operations itself, receive the genuine PNG preview, issue an image-grounded correction, and export a technically valid asset, while a distinct verifier can authenticate the event's model/host/tool origin rather than trusting an agent-written transcript?

POC-005C2 tests **autonomous authoring provenance plus observable workflow**, **not** whether the artwork is beautiful. An authenticated invocation is not proof of creative skill; a mechanically correct PNG is not a production-quality asset. POC-005C1 human blind review, Issue #21, remains entirely separate and REVIEW_PENDING until eligible independent humans submit real scores.

**Product constraints:** No text-to-image or text-to-3D generator, no Meshy/SD/Flux, no prewritten geometry recipe as purported agent output, no hidden graph/asset templates. The vision-language model may reason/choose calls; all pixels and geometry are produced via existing deterministic Art IR/MCP tools. FolderForge is the preferred host/control plane but not the origin-trust authority merely because it ran the local plugin.

## 2. Baseline and trust limitations

Existing, reusable:
- `src/mcp/server.mjs`: real stdio MCP 0.0.3, 11 tools, including create/ops/preview/style/export; `render_preview` includes actual `image/png`.
- `src/benchmark/live-client.mjs` and `live-run.mjs`: real local JSON-RPC tool traffic and image bytes; however, `transcript.jsonl` and `run.json` are authored/recorded locally and can be reconstructed or replayed.
- `src/benchmark/evidence-audit.mjs`: structural validator that rightly returns `autonomyVerified:false`; POC-005A trials are self-directed, not externally attested.
- POC-005C1: frozen A/B visual review has strict human evidence requirements and remains `REVIEW_PENDING`, zero independently verified participants.

**External evidence distinctions:**
- OpenAI function call `call_id` associates a tool result with a model-produced call but is not, by itself, a cryptographic signature or a proof that the call actually ran on the claimed model. See https://developers.openai.com/api/docs/guides/function-calling .
- GitHub artifact attestations (Sigstore/OIDC) can bind a released *bundle* to a GitHub Actions workflow identity. They do **not**, by themselves, establish the provenance of model decisions or certify the creativity/vision of a ChatGPT session. See https://docs.github.com/en/actions/concepts/security/artifact-attestations .
- OpenTelemetry GenAI spans improve observability but are not trustworthy origin attestations unless issued and authenticated at a trusted boundary. See https://opentelemetry.io/blog/2026/genai-observability/ .
- In-toto/SLSA provenance is an **inspiration** for subject, materials, builder/host identities, and run parameters; this POC must not claim a SLSA assurance level for model decisions. See https://slsa.dev/spec/v1.0/build-provenance .

No active Game Artist MCP plugin and no current local CLI can mint a provider-origin signing claim. In particular, we must **first prove that the selected host/provider exposes a suitable verifiable attestation API**. Never invent a provider signing feature, key, receipt, or API.

## 3. Alternatives and selected architecture

**A. Local MCP transcript + hashes + operator declaration.** Simple, cheap, reproducible; forgeable by an author or script; useful for structural debug only. **Reject as authoritative autonomy proof.**

**B. Host-mediated authenticated event stream with independent witness and artifact integrity.** Practical when host controls tool dispatch and can export tamper-evident, externally verified run events. Demonstrates `HOST_ATTESTED` autonomy within a declared host trust boundary, but still must not be relabeled provider-signed. **Select as feasible first evidence tier**, contingent on a real trust root, verified isolation, and no author-controlled signature.

**C. Provider-issued, independently verifiable receipt for model invocation and tool-call decisions, joined to host-observed responses.** Highest intended assurance for POC-005C2. **Use as the strict final `PROVIDER_ATTESTED` gate if an actual supported provider interface exists.** If unavailable, report `BLOCKED: PROVIDER_ATTESTATION_UNAVAILABLE`; do not silently downgrade the target.

**Chosen: two-gate hybrid.** Build a bounded host/attestation capability matrix first, then an independent verifier for both tiers. Local evidence alone never reaches a live autonomy GO. B is a meaningful intermediate research outcome; C is the final intended claim and cannot be promised in advance.

## 4. Architecture and separation of duties

```text
Independent challenge curator (private held-out brief; challenge nonce/digest)
  -> Trusted model host (model invocation and tool-dispatch boundary)
      -> Game Artist MCP (existing deterministic tools only)
          -> immutable Art IR revisions / PNG renders / SVG export
      <- actual MCP result and PNG bytes returned to host
  -> Independent evidence collector (host/provider receipts + tool/image digests)
  -> Offline verifier (trust roots, bindings, event order, renderer hash audit)
  -> separate report: TECHNICAL, HOST/PROVIDER PROVENANCE, AUTONOMY, VISUAL
```

**Trust roles:** curator chooses unseen tasks and holds brief pre-commitment; host launches the model; Game Artist MCP edits/renders but is not an agent identity provider; witness receives events outside the model's write path; verifier consumes only authenticated evidence and known trust roots; humans may later score **visual** quality through POC-005C1.

**Isolation boundary:** evidence, host receipts, challenge secrets and signing credentials are private outside tracked repo; no agent write access to witness trust roots, signed event storage, verifier policies or the hidden challenge list. No new SaaS orchestrator is required. No provider API keys in public bundles. Prefer existing FolderForge approvals, sandbox policies and runtime when those can genuinely enforce isolation; do not weaken `danger` sandbox checks.

## 5. Explicit evidence and API contracts (proposal)

All new records use `schemaVersion:1`, strict allowlisted fields, duplicate-key rejection, canonical encoding for locally computed hashes, bounded sizes, no-follow reads and atomic private writes. Opaque credentials must never be recorded. All identifier/digest checks reject cross-run replay and mismatches.

### 5.1 ChallengeManifest — privately curated, immutable before first model call

Mandatory:
- `sessionId` safe unique token, `nonce` >=128-bit independent random challenge, `challengeDigest` SHA-256 of original brief bytes, `challengeCommitmentAt` UTC;
- `projectSha` exact checked-out commit, `styleProfileId`, pinned `mcpServerVersion`, `rendererVersion`, `allowedToolNames`, `policyDigest`, `timeBudgetSeconds`, `toolCallBudget`, `correctionBudget`;
- `challengeId`, `assetId`, `holdoutCustodianRef` private opaque locator, `hostIdentityPolicy`, `provenanceRequirement`.
- Before session starts: independent curator stores the plaintext prompt privately and commits its hash; model/implementer sees plaintext only after challenge opening. No construction coordinates, scripts, prior asset layouts or hidden role mappings are given.

### 5.2 InvocationEnvelope — emitted by trusted host, NOT model text

Mandatory:
- `sessionId`, `nonce`, `challengeDigest`, `modelProvider`, `modelIdentifier`, `modelInvocationId`, `hostRunId`, `eventSequence`, `issuedAt`;
- `eventKind` in `CHALLENGE_DELIVERED|MODEL_TOOL_DECISION|TOOL_DISPATCH|TOOL_RESULT|MODEL_IMAGE_DELIVERED|MODEL_CRITIQUE|RUN_FINISHED`;
- `toolCallId`, `toolName`, `argumentDigest`, `resultDigest`, `assetRevision`, `imageSha256`, `responseFormat` as applicable;
- `prevEventDigest`, `eventDigest` with defined canonicalization and sequence rules; distinguish each producer (`PROVIDER|HOST|MCP|MODEL_TEXT`).
- `attestationTier` in `LOCAL_UNVERIFIED|HOST_ATTESTED|PROVIDER_ATTESTED`; `attestationRef`, trusted issuer identity and a verifier-supported signature/receipt artifact at authenticated tiers.

A model-generated JSON claiming these attributes is untrusted. A locally generated hash-chain detects accidental editing only, **not** authorship. Verify signatures/receipts with a curated trust root held outside the work product.

### 5.3 ExportEvidence and VerificationReport

- `runId`, `challengeDigest`, original initial/revised PNG/SVG SHA-256, actual MCP `render_preview` result hash, final Art IR state hash, exported asset hash, revisions, sourceCommitSha.
- Witness records both successful and rejected calls, image dispatch/receipt, timestamps, trace gaps, tool-call sequence and all failed gates. Separate hosted timestamps from agent-provided timestamps.
- Public report: hashes, counts, non-sensitive verdicts and limitations. Private report: authenticating receipts and challenge custody. Do not expose hidden briefs until all benchmark attempts on the challenge set are complete.

## 6. Mandatory real-agent benchmark protocol

**Pilot:** one externally curated, unfamiliar original 2D prop brief, *not* sword/pouch/censer/compass/lantern reused from POC-005A. After trusted-host capability succeeds, expand to **three** independently curated unfamiliar prop categories and report all attempts, including failures. Never pick only the best trial post hoc.

Per attempt:
1. Curator commits challenge SHA and policy/nonce before disclosure; opens exactly one brief to one live agent session.
2. Host emits genuine invocation/decision receipts; tool bridge records dispatch and matching MCP responses in order (with ids and digests).
3. Model explicitly requests `style_profile_get`, creates an empty asset, creates its own original geometric operations via `document_apply_ops`, and calls `render_preview`.
4. The actual PNG returned by MCP is delivered to the model's image-capable input channel. Record `MODEL_IMAGE_DELIVERED` with exact bytes digest and invocation binding. Delivery is *observable*; an assertion that the model cognitively understood those pixels is **not directly provable**.
5. Model records a concrete, image-grounded diagnosis, applies a motivated revision on the *same* asset, renders again, validates and exports. Verify critique references content actually in the pre-edit PNG and edit meaningfully corresponds to stated defect; this is a separate semantic/human-audited hypothesis, not a signature property.
6. Independently verify hashes, source state, session, authorized tools, event ordering, host receipt and (if supported) provider receipt. Store raw evidence privately and redacted report separately.
7. Freeze the outcome for **every** challenge, including runs that fail, hang, exceed budgets or fail technical quality.

Budget per prop: max 50 MCP tool invocations, max 5 correction rounds, max 15 elapsed minutes (measured by host/witness clock, pauses reported). At least 2 successful previews and 1 genuine post-preview correction; no forced correction if the host fails to deliver an actual image—mark that attempt BLOCKED/INCOMPLETE. Keep token/call/time metrics separately from provenance verdicts.

**No hidden second generative art engine:** models may write instructions/analysis and create explicit Art IR operations; any scripted shape generator or pre-baked geometric array inserted as the primary author automatically invalidates the `AGENT_AUTHORED` result for that trial. Non-generative deterministic renderers and validators are allowed.

## 7. Evidence tiers and verdicts — no conflation

| Tier | Required evidence | Permitted conclusion |
| --- | --- | --- |
| `LOCAL_UNVERIFIED` | locally valid transcript/images/hashes only | `TECHNICAL_PASS` or errors, **never autonomy GO** |
| `HOST_ATTESTED` | independently verifiable trusted-host issuance + tool dispatch/receipt/image chain, isolated witness | `HOST_ATTESTED_AUTONOMY` if workflow also passes; **not provider attested** |
| `PROVIDER_ATTESTED` | genuine provider-verifiable model invocation/tool-decision receipt cryptographically/policy bound to run + host/MCP result chain | `PROVIDER_ATTESTED_AUTONOMY_GO` if workflow also passes |
| unsupported/missing issuer or incomplete bindings | missing receipts, unverifiable trust root, replay or inconsistent provenance | `AGENT_PROVENANCE_PENDING` / `PROVENANCE_NO_GO` (tamper), as applicable |

Independent decision axes:
- `technicalStatus: TECHNICAL_PASS|TECHNICAL_NO_GO|INCOMPLETE`.
- `provenanceStatus: UNVERIFIED|HOST_ATTESTED|PROVIDER_ATTESTED|PROVENANCE_NO_GO|PROVIDER_ATTESTATION_UNAVAILABLE`.
- `workflowStatus: AGENT_AUTHORED|WORKFLOW_NO_GO|UNDETERMINED`.
- `visualStatus: VISUAL_REVIEW_PENDING|VISUAL_GO|ARTISTIC_NO_GO` **only sourced from separate legitimate independent visual review**, never manufactured by C2.
- No `FULL_PASS` or `PRODUCTION_READY` is emitted by this new verification flow.

**Strict C2 GO:** all three held-out trials satisfy technical and workflow gates with independent `PROVIDER_ATTESTED` origin; zero tamper/undeclared scripted-run exceptions, no selection bias. A valid `HOST_ATTESTED` tier is a narrower scientific finding, not strict C2 GO. Provider receipts unsupported: `BLOCKED: PROVIDER_ATTESTATION_UNAVAILABLE`, not `PASS`. The project may still pursue an explicitly separately approved host-attested milestone if strict provider signatures cannot be obtained.

## 8. Negative controls and TDD acceptance matrix

Every structural verifier test must begin RED then turn GREEN and include:
- forged `modelInvocationId` or `call_id` with no authenticated issuer;
- host-generated signature using a key controlled by the art author, or unknown trust root;
- reusing a valid signed receipt from another `nonce`, `challengeDigest`, session, project SHA or brief;
- valid bundle signed by GitHub CI **without** authenticated model event stream — reject as model provenance;
- model-written `transcript.jsonl` masquerading as provider event; copied actor name; locally edited timestamps;
- swapped PNG after `render_preview`; mismatched image MIME/bytes or no model image-delivery evidence;
- dropped, reordered, repeated or spliced event; orphaned tool result; tool decision without tool dispatch;
- preset `document_apply_ops` arrays loaded from fixture or server-script authoring masquerading as agent decisions;
- revision reset replacing first art document; final export inconsistent with observed revised preview;
- purported "grounded critique" supplied before image delivery;
- actual host never connected, no trust root, or no provider receipt, with explicit BLOCKED—not counterfeit success;
- prompt injection via brief or tool text attempting to change signature policy, access private challenge set or upload credentials;
- happy-path **synthetic** fixtures verifying arithmetic and state machine return `SYNTHETIC_TEST` and cannot assert live autonomy.

Additional real E2E checks when a supported host is connected: attested single pilot, independent verifier replays digests, file safety, no secret leakage in redacted report; only after pilot clear to three held-out tasks. Unit tests have no need for paid model calls. CI never requests external paid inference without explicit owner authorization.

## 9. Concrete planned code ownership (not approved implementation plan)

Existing `src/core/`, `src/style/`, `src/export/`, POC-005A and POC-005C1 evidence/gates must remain unchanged unless a separate scoped bugfix is approved.

Potential modules, to be finalized in a separate TDD implementation plan:
- `src/provenance/contracts.mjs`: strict versioned evidence schemas, canonical digests.
- `src/provenance/host-capabilities.mjs`: safe provider/host capability probe, never accepts self-described signing.
- `src/provenance/trust-policy.mjs`: allowlisted issuer roots/policies and tier labels.
- `src/provenance/event-audit.mjs`: matching invocation/tool/image events and state revisions.
- `src/provenance/attestation-verify.mjs`: authenticated external issuance and anti-replay, or explicit UNSUPPORTED.
- `src/provenance/report.mjs`: tier-aware, privacy-preserving report.
- `scripts/poc005c2-audit.mjs`: offline verifier; `scripts/poc005c2-capabilities.mjs`: nonsecret capabilities report.
- `test/provenance-*.test.mjs`, `benchmarks/poc005c2/README.md`.

If a provider exposes no verifiable receipts, **do not fabricate the adapter**. Deliver a capability assessment and deterministic strict-fail verifier scaffold only, or stop at the boundary documented in the separately approved plan.

## 10. Security, privacy and operational constraints

No untrusted code evaluation, arbitrary tool names, arbitrary filesystem access, unsigned data promoted to trusted events, secret exfiltration, public preview of held-out briefs, private signing keys in GitHub Actions artifacts, or automatically purchasing API capacity.

Run witnesses/verifiers under least privilege; segregate signing/issuer config from model-controlled tools; verify receipts with explicit issuer allowlist and session-specific nonce. Time skew/expiration policy and event byte-size limits are specified in implementation plan. Signed artifact custody must remain private as needed; redacted public digest reports omit personal identities or challenge secrets.

Do not mutate signed model/human evidence. If retries require a different brief or policy, use a **new session ID and nonce**. Keep exact evidence source and report confidence limitations. External art reviewer identity is not interchangeable with machine signature evidence.

## 11. Implementation stages, acceptance, stop rules

**Stage 0: feasibility/capability gate (first task of future plan).** Read authentic host/provider documentation and probe whether origin-verifiable model tool decisions and image-delivery records are exposed. Produce a matrix: provider identity, mechanism, who signs, who verifies, trust roots, what is bound (session/nonce/model/tool call), image delivery, latency/cost, unsupported fields. If no cryptographically trustworthy provider receipt is exposed, set strict provider GO blocked; do not proceed to a fabricated live success.

**Stage 1: safe offline schemas, validation and negative controls.** Versioned contracts, explicit tiering, tamper/replay tests, structural audit independent of model.

**Stage 2: real host collection pilot.** Only on a compatible trusted host, with held-out curator task and private custody.

**Stage 3: independently re-verify three real held-out trials.** Publish redacted, scoped results. Do not merge into POC-005C1 numeric visual thresholds.

**Stage 4: closeout:** approved product work requires TDD RED→GREEN, source tests/CI at exact PR HEAD, merge to main, post-merge CI and safe branch cleanup to main only; preserve independent code review vs SELF_REVIEW distinctions. No code or implementation plan until this written spec is approved.

**Stop conditions:** No authentic provider receipt (strict gate blocked), inability to deliver/render PNG to the model, leaked hidden briefs or signing credentials, unresolved injection, no independent verification control, skipped lock/custody, provenance mismatch, or scope expansion to Godot/3D. If a blocker occurs, report it; do not claim autonomous success.

## 12. Review checklist for user

The written spec requests approval for:
1. Hybrid B→C evidence tiers: host-attested intermediate result, strict provider-attested final goal.
2. One unseen pilot followed by three held-out 2D props, 50 calls/5 corrections/15 min per trial.
3. Keeping C1 human visual review independent and still blocked; no manufactured reviewer scores.
4. Stage 0 stop if actual provider proof unavailable; separate approval needed for any weaker redefined goal.
5. After written-spec approval, create a **separate detailed TDD implementation plan** for review before changing product code.

**No claim of current provider attestation or independent artistic validation is made by this specification.**
