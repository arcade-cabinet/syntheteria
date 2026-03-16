# Syntheteria 1.0 — Complete Remaining Work

**Version:** 1.0  
**Date:** 2026-03-13  
**Status:** Active  
**Source:** GAMEPLAN_1_0.md, progress.md, PLAYWRIGHT_TO_MAESTRO_MIGRATION.md, activeContext.md

---

## 1. Executive Summary

Syntheteria is a 4X strategy game (Expo + React Native + R3F). This PRD captures **every remaining task** to reach a fully playable 1.0: config-driven assets, Playwright→Maestro test migration, visual polish, city model manifest fixes, chunk-renderer integration, and final verification.

---

## 2. Goals & Success Metrics

### Goals
- Player can launch game, see world, select unit, move/harvest/build, end turn, save/load
- All assets config-driven (no hardcoded require())
- E2E tests run on Maestro (Playwright deprecated)
- Floor textures in JSON config
- City model manifest complete (no missing model IDs)
- Chunk loader wired to live camera (if not already)
- Visual verification in browser

### Success Metrics
- `pnpm tsc` passes
- `pnpm lint` passes
- `pnpm test` passes (Jest)
- Maestro E2E flows pass
- Game launches and renders in browser

---

## 3. Quality Gates

These commands must pass for every user story:
- `pnpm tsc` — TypeScript check
- `pnpm lint` — Biome lint
- `pnpm test` — Jest (existing tests must not regress)

For UI/rendering stories, also include:
- Verify in browser via `pnpm web` (expo start --web)

---

## 4. Remaining Work (from docs)

### Phase 0: Verify & Stabilize
- Verify floor renders in browser
- Verify radial menu triggers actions
- Verify turn system gates actions
- Verify save/load round-trips
- Remove ALL silent asset fallbacks

### Phase 2: Config-Driven Asset Pipeline
- Floor textures to JSON config (replace floorTextureAssets.ts require())
- Unified asset resolution audit
- Fail-hard audit (no ?? null, empty catch in asset loading)
- City model manifest: run city:ingest, fix missing model IDs

### Phase 4: Visual Polish
- Floor fills viewport (void fill)
- Storm/wormhole spectacle
- Zone transition blending
- Unit visual fidelity (Mark badges, damage states, cultist identity)

### Phase 5: Gameplay Depth
- Mark upgrade UI (radial at Motor Pool)
- Hacking capture flow
- Tech tree effects visible
- Diplomacy consequences
- Victory pacing

### Test Migration (Playwright → Maestro)
- Remove Playwright packages and config
- Install Maestro CLI
- Create maestro/flows/ with title, onboarding, ai-playtest YAML
- Port E2E flows from Playwright specs
- Port component tests: 2D UI → RNTL, R3F → @react-three/test-renderer
- Wire Maestro to EAS or local simulator

### Chunk-Renderer Integration (if not done)
- Chunk loader + camera: wire live camera to chunk load/unload
- Per-chunk InstancedBuildingRenderer already exists; verify integration

### Misc
- Ingest undermaterials (2DPhotorealistic pit textures)
- Config-driven floor materials
- Duplicate hacking tests cleanup
- Create PR for codex/ecumenopolis-fullscope → main

---

## 5. User Stories (Flattened for Ralph)

Stories are ordered by dependency. Each is completable in one agent iteration.

### 0.1 — Remove Playwright, add Maestro scaffold
Remove Playwright packages, configs, test dirs. Add maestro/ with config. Install Maestro CLI.

### 0.2 — Fail-hard asset audit
Search for ?? null, || fallback, empty catch in asset loading. Replace with throw. Document count.

### 0.3 — Floor textures to JSON
Create config/floorTextures.json. Migrate floorTextureAssets.ts. floorMaterialPresets consumes JSON.

### 0.4 — City model manifest fix
Run pnpm city:ingest. Fix missing model IDs (machine_generator etc) in cityComposites or manifest.

### 0.5 — Verify floor renders
Launch game in browser. Confirm ~20 pre-discovered cells visible. No black void.

### 0.6 — Verify radial + turn + save/load
Manual verification: radial triggers actions, AP/MP deplete, End Turn refreshes, save→quit→load works.

### 1.1 — Maestro title flow
Create maestro/flows/title.yaml from title.spec.ts. assertVisible SYNTHETERIA, new game, settings.

### 1.2 — Maestro onboarding flow
Create maestro/flows/onboarding.yaml. Port clearPersistence, radial, briefings from onboarding.spec.ts.

### 1.3 — Maestro ai-playtest flow
Create maestro/flows/ai-playtest.yaml. Long timeout. Port 100-turn playtest steps.

### 1.4 — RNTL 2D UI tests
Port TitleScreen, NewGameModal, LoadingOverlay, HudButton, BriefingBubble to RNTL. Colocate in src/ui/__tests__/.

### 1.5 — R3F test-renderer for 3D components
Add @react-three/test-renderer. Port EcumenopolisWorld, CityKitLab, StructurePlacement to scene-graph assertions.

### 2.1 — Cultist visual identity
Distinct tint/aura for cultist units in UnitRenderer. Config-driven.

### 2.2 — Mark badges + damage states
Mark I-V badge above units. Damage visual degradation. UnitRenderer, GlowRingRenderer.

### 2.3 — Mark upgrade radial action
Radial "Upgrade" at Motor Pool. Resource check, tier gate. radialProviders, motorPool.

### 2.4 — Hacking capture flow
Hack hostile → convert to player. Progress bar, signal link check. hackingSystem.

### 2.5 — Cultist reactive escalation
Spawn rate scales with territory size. Config thresholds. cultistIncursion.

### 3.1 — Storm/wormhole spectacle
Cohesive environmental presence. Storm renderers, WormholeRenderer.

### 3.2 — Zone transition blending
Smoothstep gradients, breach crack shader. StructuralFloorRenderer.

### 3.3 — Void fill floor
Camera-following shader plane under structural floor. No dark void edges.

### 4.1 — Chunk-loader camera integration
Wire chunkLoader to live camera. Load/unload by viewport. Verify per-chunk InstancedBuildingRenderer.

### 4.2 — Ingest undermaterials
2DPhotorealistic pit textures. Config-driven floor materials for pit interiors.

### 4.3 — Accessibility overhaul
role=button, aria-label, focus-visible, modal semantics. TitleScreen, NewGameModal, HudButton.

### 5.1 — EAS + Maestro CI (optional)
Add Maestro Cloud to eas.json. Or document local simulator run.

### 5.2 — Final visual verification
Full playthrough in browser. Document any remaining issues.

### 5.3 — PR creation
Create PR codex/ecumenopolis-fullscope → main. Update docs.

---

## 6. Non-Goals (Out of Scope)

- Chunk streaming infinite world (Phase 3 architecture exists; integration only)
- New game systems beyond what's in GAMEPLAN
- Mobile-specific layout (MOBILE_4X_VIEWPORT_DESIGN is reference only)
- Scripted narrative (emergent bot speech only)

---

## 7. Technical Considerations

- **Koota ECS**: entity.set() for mutations, not entity.get() (returns copies)
- **Config over code**: All asset paths, costs, materials in JSON
- **Crash hard**: Missing asset = throw with clear error
- **One source of truth**: structuralSpace for runtime discovery; DB for persistence
- **Metro + Expo**: No Vite for app. Playwright CT used Vite — deprecated.
- **expo-sqlite**: Uses wa-sqlite; requires COOP/COEP for SharedArrayBuffer. Metro middleware + coi-serviceworker handle this.

---

## 8. References

- docs/plans/GAMEPLAN_1_0.md
- docs/memory-bank/progress.md
- docs/plans/PLAYWRIGHT_TO_MAESTRO_MIGRATION.md
- docs/memory-bank/activeContext.md
- AGENTS.md, CLAUDE.md
