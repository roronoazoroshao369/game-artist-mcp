# ADR-0001 — FolderForge is the host platform, Game Artist is the specialist engine

- Status: Accepted
- Date: 2026-10-07

## Context

FolderForge already provides the infrastructure needed to safely host local and remote MCP capabilities:

- stdio and Streamable HTTP transports;
- ChatGPT/OpenAI tunnel support;
- authentication/OAuth;
- policy, approvals, rate limits and audit;
- workspace boundaries and optional isolation;
- child MCP adapters and a plugin lifecycle;
- rich MCP image content;
- Godot control and runtime verification.

Rebuilding these capabilities in Game Artist would duplicate a mature codebase while doing little to improve art quality.

Game Artist has a different domain problem:

- explicit art intermediate representations;
- deterministic art editing;
- vector/raster rendering;
- cutout parts and pivots;
- animation recipes;
- style constraints;
- game-art validators;
- game-ready packaging.

## Decision

Game Artist remains an independent repository and host-agnostic core, but ships a FolderForge plugin manifest and child MCP server.

Dependency direction:

```text
FolderForge
    |
    | hosts / governs
    v
Game Artist MCP
    |
    v
Game Artist Core
```

The core MUST NOT depend on FolderForge APIs.

Only the integration/package layer knows about FolderForge.

Godot responsibilities are split:

- Game Artist: generate domain-specific asset resources/scenes/metadata;
- FolderForge Godot adapter: import, run, inspect, screenshot, test and verify the game.

## Consequences

### We reuse

- transport;
- authentication;
- tunnels;
- policy;
- approval;
- audit;
- workspace governance;
- plugin lifecycle;
- Godot remote control.

### We build

- Art IR;
- art operations;
- renderers;
- cutout rig model;
- animation model;
- style engine;
- art QA;
- asset recipe/history;
- exporters.

### We explicitly do not build yet

- another generic MCP control plane;
- another shell/filesystem MCP;
- another Godot MCP;
- another tunnel/auth stack;
- a full Photoshop clone;
- a full Blender clone.

## Validation

POC-002 must prove that FolderForge can load Game Artist as a child MCP plugin and govern its real art tools without Game Artist importing FolderForge internals.
