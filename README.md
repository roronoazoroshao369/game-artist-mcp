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

POC-001 already proves:

```text
structured art document
→ typed deterministic operations
→ SVG render
→ PNG rasterization
→ validation
→ reproducible output
```

POC-002 adds a real MCP server and FolderForge child-plugin package with a compact art-specific tool surface.

This is still a proof of mechanism, **not proof of production artistic quality**.

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

With FolderForge 3.0.1+ installed:

```bash
folderforge plugin validate .
folderforge plugin test . --call health --args-json '{}'
```

The next falsification gate is POC-003: a real vision-capable agent must construct an asset, inspect the returned PNG, critique it and improve it through MCP edits.
