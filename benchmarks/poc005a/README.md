# POC-005A — Real-agent artistic benchmark

This benchmark tests whether an actual vision-capable agent can design **original** editable art through the deterministic Game Artist MCP. Structural CI can never prove agent authorship or aesthetic quality.

## Local agent-directed MCP benchmark (technical evidence, not provider provenance)

A bounded one-call-at-a-time JSON-RPC client is available via `npm run benchmark:live`. For each invocation, write one JSON request to the ignored `.game-artist/live-request.json`, for example:

```json
{"runId":"new_prop_001","tool":"style_profile_get","arguments":{"profile_id":"dark-cultivation-v1"}}
```

Then run `npm run benchmark:live`. Invoke `asset_create` with `asset_id=runId`, manually compose `document_apply_ops` geometry, and call `render_preview` with top-level `phase:"initial"` or `phase:"revised"`. The runner preserves the actual server replies, preview PNG bytes and deterministic SVG under `benchmarks/poc005a/runs/<runId>/`. Provide `brief.md` and a concrete pixel-inspection `critique.md`; finishing with `validate_asset`, `style_validate` and `export_asset` emits `run.json` and `technical-report.json`. The request file is ignored; committed runs intentionally retain real geometry operations in the transcript.

The three 2026-10-08 samples are LOCAL STDIO MCP evidence only, without secure provider-authored trace. The local auditor tests structure, NEVER independent authorship or aesthetic acceptance. A genuine external vision-capable host must still independently complete fresh held-out trials and external visual review before artistic FULL_PASS.

## Host setup and eligibility

Use FolderForge as the preferred governed host, or any compatible writable MCP client, with access to asset_create, document_apply_ops, render_preview, style_validate, export_asset and **the returned image/png pixels**. Verify tool calls and image visibility before starting. If the host is inaccessible, explicitly record **BLOCKED: HOST_ACCESS**; do not invent artifacts.

Use three distinct unfamiliar briefs, delivered individually *when* the experiment begins: (1) an original Cultivation Sword, (2) an original Medicinal Herb Pouch, (3) an original Stone Incense Burner. Give each agent a descriptive material/function/shape brief without geometry, operation arrays, coordinates, or copyrighted images. Keep generation prompts and visual references separate from predetermined scripts.

## Genuine experiment, one run per prop

1. Record exact brief.md, SHA-256, run ID, project SHA, profile, renderer/server versions, provider trace ID and wall-clock start.
2. Invoke style_profile_get, then asset_create with an empty document. The participating agent must generate explicit geometry through document_apply_ops, not replay an existing node script.
3. Render using render_preview; **inspect the actual PNG pixels**. Save initial.png and matching initial.svg. Record concrete visual defects in critique.md.
4. Make at least one *motivated* targeted edit to the same asset, then render again. Save revised.png/revised.svg, critique and correction reasoning. Keep every unsuccessful attempt and failed MCP call.
5. Validate the final revision with validate_asset and style_validate; export_asset, save technical-report.json, and archive the complete sanitized original JSON-RPC transcript.
6. Derive counts from transcript: toolCalls = all actual art tools/call invocations; operationCount = sum of document_apply_ops operations; renderCount = successful render_preview; correctionRounds = batches of edits between a render and its succeeding rerender; elapsedMs = real time from first to last call.
7. Run node scripts/audit-poc005a.mjs DIRECTORY. It only validates structure and refuses FULL_PASS. Keep host-origin trace for an **external** agent provenance audit.

Budgets: at most 50 art MCP calls and 5 correction rounds per simple prop. The first render must be followed by an actual image-inspection-to-edit-to-image revision; a fixed script or synthetic fixture **does not count**.

## Independent visual rubric

A reviewer who did not author the geometry must inspect 64px and 128px renders, each separately and as a 3-asset contact sheet. Record raw 1–5 scores for silhouette/recognizability, material readability, hierarchy, style fit, cross-asset coherence. Record reviewer identity/type, timestamp, evidence and limitations. A self-review must be labeled SELF_REVIEW and never satisfies independent review.

Baseline aesthetic target: *each* asset scores at least 3/5 on silhouette and style fit. Verify agent provenance using a real provider-side trace or independent observation. The local JSONL can be forged and **cannot** attest that a particular agent composed the operations.

Status vocabulary: INCOMPLETE, TECHNICAL_PASS, AGENT_PROVENANCE_PENDING, VISUAL_REVIEW_PENDING, NEEDS_REDESIGN and FULL_PASS. Only the externally verified three-asset result can reach FULL_PASS; local auditor always reports autonomyVerified:false and visualQualityVerified:false. A failed visual result is an informative NEEDS_REDESIGN rather than production quality.

No secondary generative model, hosted art orchestration stack, hardcoded object generators or public marketplace deployment. POC-005B improvements must follow actual experimental results.
