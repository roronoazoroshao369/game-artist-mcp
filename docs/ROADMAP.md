# Game Artist MCP roadmap

The roadmap is evidence-gated. A later phase does not start merely because the previous code exists; its acceptance gate must pass.

## Product goal

A user should eventually be able to request:

> Create an original animated spirit lantern for my stylized cultivation survival game and make it ready for Godot.

The system should create explicit source geometry, game-ready parts, pivots, animation, atlas/metadata, run technical QA, export Godot resources and support a visual correction loop.

## Architecture rule

FolderForge is the preferred production host/control plane.

Game Artist owns only domain-specific art intelligence and deterministic art tooling.

The core remains usable without FolderForge through raw MCP/CLI/test clients.

## Phase 0 — POC-001: deterministic art substrate — PASS

Evidence already merged:

- explicit JSON art document;
- deterministic SVG rendering;
- validation;
- revision-checked transactional edits;
- Linux PNG rasterization.

This proves mechanics, not artistic quality.

## Phase 1 — POC-002: real child MCP + FolderForge integration

### Build

- dependency-free MCP stdio server;
- persistent bounded asset store;
- compact tool surface;
- PNG image result for visual clients;
- FolderForge plugin manifest;
- direct MCP smoke test;
- FolderForge plugin validate/test smoke.

### Tool surface

- `health`
- `asset_create`
- `asset_get`
- `document_query`
- `document_apply_ops`
- `render_preview`
- `validate_asset`
- `export_asset`

### Gate

PASS only when:

1. direct MCP initialize and tools/list succeed;
2. an asset can be created through MCP;
3. a batched edit advances revision;
4. stale revisions fail;
5. preview returns a valid PNG image content block;
6. export produces SVG + PNG + report;
7. FolderForge validates and starts the package as a real child plugin;
8. CI passes on exact PR head.

## Phase 2 — POC-003: autonomous render → inspect → edit loop

Use an MCP-capable vision host to construct and correct:

1. Jade Spirit Stone;
2. Ancient Spirit Lantern.

Measure:

- MCP round trips;
- internal operations;
- preview renders;
- correction iterations;
- elapsed time;
- hard validator failures;
- output hashes.

Gate target for a simple prop:

- <= 50 MCP round trips;
- <= 5 visual correction iterations;
- zero hard technical validation errors;
- clear improvement after at least one visual critique;
- independent/human visual review before any production-quality claim.

## Phase 3 — game-ready Spirit Lantern vertical slice

Add domain IR:

- part;
- pivot;
- parent/attachment;
- animation clip;
- transform keyframe;
- emission role;
- collision metadata.

Required parts:

- body;
- flame;
- left talisman;
- right talisman;
- tassel.

Required output:

- source document;
- PNG/SVG outputs;
- animation metadata;
- atlas or deterministic part package;
- Godot scene/resources;
- headless Godot import/run validation.

FolderForge Godot tools should verify runtime behavior rather than duplicating a new Godot control plane here.

## Phase 4 — cutout character

Original Wandering Cultivator:

- separated body parts;
- pivots;
- hierarchy;
- idle;
- walk;
- attack;
- equipment slot.

Gate on:

- silhouette/readability;
- clipping;
- loop continuity;
- foot sliding;
- Godot runtime validity.

## Phase 5 — measurable style system

Introduce ArtStyleProfile with measurable constraints:

- proportions;
- line-weight ranges;
- palette limits;
- value contrast;
- angularity;
- asymmetry;
- detail density.

Benchmark at least 10 independently created assets for cross-asset consistency.

## Phase 6 — production hardening

- resumable asset jobs;
- checkpoints/history;
- quotas;
- concurrency;
- cancellation;
- bounded artifact storage;
- observability;
- security review;
- packaging;
- FolderForge plugin signing/packaging;
- raw MCP compatibility tests.

## Phase 7 — optional 3D extension

Only after 2D cutout proves economic value:

- Blender worker;
- stylized props;
- weapons;
- alchemy furnace;
- directional rendering.

Do not begin with humanoid sculpting.

## Kill criteria

Redesign or stop a modality if:

- simple icons need hundreds of MCP round trips;
- cutout props remain visually poor after two abstraction redesigns;
- the agent cannot reliably self-correct visible errors;
- style consistency remains poor across a 10-asset benchmark;
- Godot packages remain brittle despite deterministic technical validation.
