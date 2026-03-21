# src/views/ — Unified Rendering Package

Two sub-packages under one roof:

| Sub-package | Stack | Phase | Contents |
|-------------|-------|-------|----------|
| `title/` | React Three Fiber (TSX) | title → generating | Globe, storms, cities, LOD, legacy match R3F renderers |
| `board/` | Phaser + enable3d (pure TS) | playing | WorldScene, terrain, units, fog, lighting, input |

## Rules

- **`title/`** contains all R3F components (TSX). Only `Globe.tsx` imports from it.
- **`board/`** contains all Phaser/Three.js code (pure TS, no React). Only `GameBoard.tsx` mounts it.
- **No cross-imports** between `title/` and `board/` (they serve different phases).
- **`systems/` and `traits/` must NOT import from `views/`** — rendering reads ECS, never the reverse.
- Import from `views`, `views/title`, or `views/board` — never deep into sub-files.

## Consumers

| Consumer | Imports from |
|----------|-------------|
| `src/ui/Globe.tsx` | `views/title` |
| `src/app/GameBoard.tsx` | `views/board` (via `views` barrel) |
