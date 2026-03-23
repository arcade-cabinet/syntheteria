# Spatial Replacement Audit

Date: 2026-03-12
Branch: `codex/ecumenopolis-fullscope`

This document is the implementation audit for removing the legacy outdoor-hex architecture and replacing it with the canonical ecumenopolis sector model.

It is not a migration plan for a hybrid state. It is a deletion map.

## Goal

By squash-merge time, the game should no longer conceptually or technically depend on:

- hex tiles as the long-term spatial contract
- an outdoor world map plus separate city map split
- terrain tilesets as the primary visual language
- exposed belt/network lines routed from hex-center to hex-center
- hex-based AI navigation profiles as the canonical pathing model

The target is:

- one continuous ecumenopolis campaign space
- sector / district / facility structural logic
- square-grid or structural-space navigation contracts where needed
- procedural floor and authored structural modules
- infrastructure overlays as embedded/subsurface machine systems

## Delete / Replace Matrix

### 1. Hard Delete Targets

These should be removed entirely once replacement systems are in place:

- `src/ecs/terrain.ts`
- `src/config/terrainTilesetTheme.ts`
- `src/config/terrainSetRules.ts`
- `src/config/terrainAtlasContracts.ts`
- `src/rendering/TerrainRenderer.tsx`
- `src/rendering/terrainAtlas.ts`
- `src/rendering/terrainHexLayout.ts`
- terrain-specific component tests:
  - `tests/components/TerrainHexLayout.spec.tsx`
  - `tests/components/TerrainHexPreview.tsx`
  - `tests/components/TerrainAdjacencyPermutations.spec.tsx`
  - `tests/components/TerrainAdjacencyPermutationPreview.tsx`
  - terrain atlas contract tests

### 2. Replace With Sector/Structural Runtime

These currently depend on hex/world-map assumptions and should be rewritten against the ecumenopolis model:

- `src/world/generation.ts`
- `src/world/snapshots.ts`
- `src/db/worldPersistence.ts`
- `src/ecs/initialization.ts`
- `src/ui/NewGameModal.tsx`
- `src/ui/LoadingOverlay.tsx`
- `src/ui/CitySiteModal.tsx`
- anchored-briefing and site-overlay surfaces (`src/ui/BriefingBubbleLayer.tsx`, `src/ui/CitySiteOverlay.tsx`)

### 3. Replace Navigation Ownership

These still hardcode hex navigation assumptions and should be rebuilt around structural navigation contracts:

- `src/systems/navmesh.ts`
- `src/systems/pathfinding.ts`
- `src/systems/movement.ts`
- `src/input/UnitInput.tsx`
- `src/ai/navigation/HexNavigationAdapter.ts`
- `src/ai/config/behaviorProfiles.ts` (`world_hex_*` profiles)
- `src/ai/core/WorldAIService.ts`
- `src/ai/bridge/KootaYukaBridge.ts`
- all tests asserting `world_hex_*` profiles

### 4. Reinterpret Infrastructure Overlays

These should survive only if their metaphors are rewritten:

- `src/systems/networkOverlay.ts`
- `src/rendering/NetworkLineRenderer.tsx`
- `src/config/networks.json`

Their future is:

- subsurface logistics
- signal and power conduits
- embedded transit or relay traces
- no visible “belts across terrain hexes” mental model

### 5. Reinterpret World Presentation

These still assume landscape/terrain semantics and should be reevaluated:

- `src/rendering/LandscapeProps.tsx`
- `src/rendering/GroundFog.tsx`
- `src/rendering/CityRenderer.tsx`
- `src/world/overworldCityOverlay.ts`
- `src/ui/panels/Minimap.tsx`
- `src/systems/zoomTier.ts`

### 6. Documentation To Keep In Sync

Any implementation change in this area must remain aligned with:

- `docs/GAME_DESIGN.md`
- `docs/TECHNICAL.md`
- `docs/LORE.md`
- `docs/WORLD_AND_CITY_SYSTEMS.md`
- `docs/FACTION_AND_CAMPAIGN_MODEL.md`
- `docs/INPUT_AND_INTERACTION.md`
- `docs/ASSET_GAPS.md`

## Current Branch Reality

As of this audit:

- the docs are mostly aligned to the ecumenopolis direction
- the runtime is not
- the remaining debt is concentrated in structural navigation polish, residual historical docs, and a few UI labels

## Required Implementation Order

1. Replace world/session/persistence contracts with sector-space contracts.
2. Replace navigation/pathing and AI profile semantics.
3. Replace rendering and overlay assumptions.
4. Delete terrain/hex packages and tests.
5. Revalidate docs, component tests, and E2E against the final model.

## Non-Goals

This audit does not preserve a compatibility layer for the hex world.

If a system only exists to support the old spatial model, it should be deleted rather than wrapped.
