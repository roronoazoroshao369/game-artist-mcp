# Game Artist MCP

An AI-native deterministic game-art workstation for agent hosts.

Game Artist is **not** another general MCP control plane and does **not** use a generative image model as its core art engine.

Its job is to give an LLM explicit game-art operations:

```text
LLM
 ↓
Game Artist MCP
 ↓
Art IR / explicit geometry
 ↓
render
 ↓
visual inspection
 ↓
targeted edit
 ↓
game-ready asset
```

## Relationship to FolderForge

FolderForge is the preferred production host/control plane:

```text
ChatGPT / MCP host
        ↓
    FolderForge
        ↓
   Game Artist
        ↓
 deterministic art core
```

FolderForge owns generic infrastructure such as transport, authentication, policy, audit, sandboxing, plugin lifecycle and broad Godot control.

Game Artist owns art-domain capabilities such as vector/cutout representation, pivots, animation recipes, style constraints and art QA.

The core remains usable directly through MCP without FolderForge.

See:

- [ADR-0001](docs/ADR_0001_FOLDERFORGE_BOUNDARY.md)
- [Roadmap](docs/ROADMAP.md)
- [POC-001](docs/POC_001.md)
- [POC-002](docs/POC_002.md)

## Current state

- POC-001/002: deterministic vector art engine and 11-tool stdio MCP with FolderForge integration.
- POC-003: render → image inspection → targeted edit loop (mechanics only).
- POC-004: Spirit Lantern cutout/Godot exporter and headless runtime verification.
- POC-005A: ArtStyleProfile, safe structural evidence auditor, and three **agent-directed local MCP** trials (cultivation sword, medicinal pouch, stone censer) under [benchmarks/poc005a/runs](benchmarks/poc005a/runs). Each preserves two actual PNG renders and a correction on the same asset. Their local structural audit is included in `npm test`.

**Evidence boundary:** The three live sessions were executed through a local stdio MCP transport, not an independently audited provider-origin agent host. Their image critique is SELF_REVIEW. The repository therefore retains `AGENT_PROVENANCE_PENDING` and **does not claim artistic FULL_PASS, independent aesthetics approval or production art quality**. See [POC-005A benchmark protocol](benchmarks/poc005a/README.md).

POC-005B is merged: opt-in material-aware Art IR, deterministic gradient/hand-directed surface marks/bounded glow, plus controlled same-geometry 64/128-pixel A/B review bundles for those three earlier props. The review bundles are **UNSCORED**. A fourth original compass asset was constructed through a new **self-selected** local MCP session (not an evaluator-supplied held-out prompt): 28 nodes, 14 MCP calls, 3 rendered previews and 2 image-grounded corrections. The latest correction restored an open suspension loop that an inappropriate appearance fill made visually solid. Historical revision-2 media are preserved. Technical and style gates pass, but external authorship attestation and independent visual scoring remain pending. See [POC-005B review protocol](benchmarks/poc005b/README.md) and [latest handoff](docs/project/NEXT_RUN_PROMPT.md).

**Hard limits:** Material-aware Godot export is currently unsupported (`UNSUPPORTED_GODOT_APPEARANCE`), even though the legacy Spirit Lantern passes headless Godot. Green CI proves technical behavior, not aesthetic quality, autonomy or production art readiness.

## Local development

Requirements:

- Node.js 22+
- `rsvg-convert` from librsvg for PNG previews

Run the raw MCP server:

```bash
node src/mcp/server.mjs --workspace ./.game-artist
```

Run the direct protocol smoke:

```bash
npm run smoke:mcp
```

To verify the FolderForge integration before the compatible package is published, build the exact source revision used by CI:

```bash
git clone https://github.com/roronoazoroshao369/FolderForge.git ../FolderForge
git -C ../FolderForge checkout 59c1096167a81bef24a07fa88453f5c50e0fe64a
npm --prefix ../FolderForge ci --ignore-scripts
npm --prefix ../FolderForge run build
node ../FolderForge/dist/main.js plugin validate .
node ../FolderForge/dist/main.js plugin test . --call health --args-json '{}'
```

Do not infer npm availability from FolderForge's source `package.json`; POC-002 pins source evidence until a compatible public package is actually published.

The next evidence gate is independent 64/128px blind visual scoring (at least one external non-author reviewer, ideally two), plus provider-attested image inspection and original authorship on an independently assigned unknown brief. The current compass trial has LOCAL STDIO provenance only, and its brief was self-selected; it must not be promoted to Autonomy GO.
