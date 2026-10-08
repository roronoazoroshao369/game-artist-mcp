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

The first next gate is external agent-authorship attestation and independent 64px/128px review of these and fresh held-out results. Artistic weaknesses should drive POC-005B redesign before widening scope.

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

The next falsification gate is POC-003: a real vision-capable agent must construct an asset, inspect the returned PNG, critique it and improve it through MCP edits.
