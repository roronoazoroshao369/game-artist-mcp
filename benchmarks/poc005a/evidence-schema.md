# POC-005A evidence bundle schema v1

Exactly nine mandatory files per run:
- run.json, transcript.jsonl, brief.md
- initial.png, initial.svg, revised.png, revised.svg
- technical-report.json, critique.md

All leaf files must be regular, not symlinks; max 8 MiB each, transcript <=2 MiB and <=5000 lines. No credentials, secrets, personal data or untrusted external media. All text UTF-8. Missing, oversized, unsafe, or malformed evidence is rejected.

## run.json

Required string fields: runId (safe literal identifier), projectSha (40 lowercase hex), serverVersion, profileId, rendererVersion, briefSha256 (64 lowercase hex). Required integers: profileVersion (=1), toolCalls, operationCount, renderCount, correctionRounds, elapsedMs. Required status outcome: TECHNICAL_PASS / AGENT_PROVENANCE_PENDING / VISUAL_REVIEW_PENDING / NEEDS_REDESIGN / INCOMPLETE. Required/optional agentProvenance: UNKNOWN or UNVERIFIED. Claiming VERIFIED without external audit, or FULL_PASS inside this local bundle, is prohibited.

Example shape (replace all placeholders with real data):

    {"runId":"example-sword-001","projectSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
     "serverVersion":"0.0.3","profileId":"dark-cultivation-v1","profileVersion":1,
     "rendererVersion":"rsvg-2","briefSha256":"<sha256 of exact brief.md>",
     "toolCalls":9,"operationCount":3,"renderCount":2,"correctionRounds":1,
     "elapsedMs":1200,"outcome":"AGENT_PROVENANCE_PENDING","agentProvenance":"UNKNOWN"}

## transcript.jsonl

One JSON object per MCP request/response with sequential integer id starting at 1, tool, arguments, result. Results include current revision and validation ok flags when applicable. Keep failed calls with their errors. The auditor requires asset_create revision 0, document_apply_ops with expected_revision and incrementing result.revision, an initial render, at least one subsequent edit and revised render, then passing validate_asset and style_validate and export_asset on the final revision. profile_id must match run metadata. Client/provider trace reference for external verification should be stored separately.

Minimal illustrative lines only (not a whole accepted benchmark):

    {"id":1,"tool":"style_profile_get","arguments":{"profile_id":"dark-cultivation-v1"},"result":{"profile":{"id":"dark-cultivation-v1","version":1}}}
    {"id":2,"tool":"asset_create","arguments":{"asset_id":"example_sword","width":128,"height":128},"result":{"revision":0}}

## technical-report.json

Must include profileId, revision, artIr.ok=true, style.ok=true, and reviewerStatus=PENDING|SELF_REVIEW|INDEPENDENT_REVIEW_PENDING|INDEPENDENT_REVIEWED. These fields establish technical state only, never visual acceptance or actual agent origin.

The PNG files must have the PNG magic signature. SVG files must be nonempty safe root SVG. critique.md must document actual, image-grounded weaknesses and corrections. brief.md SHA-256 is verified on exact original bytes. Local checks **do not** compare the image pixels to transcript operations or establish cryptographic authorship. For independent visual ratings, retain an out-of-band audit/reviewer record.
