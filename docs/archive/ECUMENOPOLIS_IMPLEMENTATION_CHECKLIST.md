# Ecumenopolis Implementation Checklist

This is the single execution checklist for `codex/ecumenopolis-fullscope`.

Use this as the canonical branch ledger. Older branch-status and spatial-replacement notes are historical context only unless their content has been folded into the root docs.

## 1. Canonical Docs

- [x] Canonicalize ecumenopolis campaign direction in root docs
- [x] Canonicalize machine-faction vs cultist campaign model
- [x] Canonicalize radial actions + anchored local context direction
- [x] Canonicalize procedural floor direction
- [x] Remove first major batch of stale hex/world-city wording from active plans and implementation docs
- [ ] Fold any still-useful branch-only notes from `BRANCH_REVIEW_AND_REALIGNMENT` and `SPATIAL_REPLACEMENT_AUDIT` into root docs, then archive them as historical notes

## 2. Spatial Runtime Replacement

- [x] Remove `src/ecs/terrain.ts` and all live callers
- [x] Remove terrain tileset/theme/rules/runtime/rendering
- [~] Replace world generation with sector/ecumenopolis generation
- [~] Replace world persistence tile model with ecumenopolis/sector/district/substation model
- [~] Replace minimap/zoom assumptions with structural-space assumptions

## 3. Navigation And AI

- [x] Remove `world_hex_*` navigation profile semantics
- [~] Replace hex navigation/pathfinding with sector/structural navigation contracts
- [ ] Update AI persistence and tests for the new navigation model
- [ ] Ensure player, hostile, cultist, and service jobs all use the same AI-owned task pipeline

## 4. Structural Kit Operationalization

- [x] Copy structural kit into `assets/models/city`
- [x] Generate preview inventory and manifest
- [x] Add understanding summaries, passability classes, and structural roles
- [x] Add curated floor material presets from photorealistic library
- [ ] Fully encode all subdirectories/families with production-grade semantics
- [ ] Fully encode all major composites and area-capability groupings
- [ ] Add landmark composites for key sector archetypes
- [ ] Add structural-world lab coverage for every family, subdirectory, floor preset, and representative faction/cult cluster

## 5. Campaign Flow

- [ ] Replace New Game generation flow with persistent ecumenopolis generation
- [ ] Spawn starting bot roster into the command arcology
- [~] Replace founding semantics with substation/base-district semantics
- [~] Persist substations, sector control, and local capabilities
- [ ] Restore the exact active campaign state on Continue

## 6. Player-Facing UX

- [x] Retarget local context toward anchored briefings
- [x] Replace `LocationPanel` as the primary local-context owner in the live HUD
- [x] Add first live site speech bubbles and briefing callouts
- [~] Ensure radial owns all contextual actions
- [~] Add screenshots for title/new game/loading, starting sector, anchor clusters, robot ops, radial actions, substations, lab views, cult and rival scenes
- [x] Add deterministic ecumenopolis world-scene screenshot validation with generated campaign overview, anchor-cluster view, and starting-sector inspection
- [x] Add screenshot-backed robot ops validation for placement, AI-owned movement, and anchored speech-bubble readability
- [x] Add screenshot-backed rival and cult cluster validation
- [x] Surface structure-derived operational actions in the live site brief

## 7. Tests

- [x] Remove first batch of terrain-only component tests
- [ ] Remove all remaining tests that only protect deleted hex behavior
- [~] Add package tests for sector generation, composites, floor presets, substation capability resolution, and AI persistence
- [~] Add component tests for briefing bubbles, site modals, structural-lab states, world-scene validation, and robot ops validation
- [~] Add E2E for new game -> generation -> bot actions -> first substation -> continue
