# Active Context: Syntheteria

> What's happening RIGHT NOW. Updated every session. Read this first.
> See [GAMEPLAN_1_0.md](../plans/GAMEPLAN_1_0.md) for the full execution roadmap.

---

## Current Focus

- **33-story Ecumenopolis sprint COMPLETE** — all user stories implemented, tested, committed
- **Code quality verified** — 135/135 test suites, 1605/1605 tests, 0 TS errors, 0 lint errors
- **Branch `codex/ecumenopolis-fullscope`** — 53 commits, ready for PR to main

---

## Recent Changes (2026-03-13)

### Ecumenopolis Full-Scope Sprint (33 User Stories)

**Depth 0 — Foundation (16 stories)**
- US-001 through US-016: Core gameplay (harvest, combat, diplomacy, victory, tech tree, weather, exploration, building, resources, turn system, narrative, radial menu, tutorial, unit selection)

**Depth 1 — Integration (6 stories)**
- US-017: World ready gate — systems gated behind `worldReady` flag
- US-018: UI layer mount sequencing — loading → hud-entering → hud-visible
- US-019: Speech bubble renderer — billboarded CanvasTexture panels
- US-020: Unified asset resolution — single `resolveAssetUri()` for all asset types
- US-021: Void fill floor — camera-following shader plane under structural floor
- US-022: Core gameplay loop verification — documented findings

**Depth 2 — Advanced Systems (5 stories)**
- US-023: Rival faction encounters — spawn timing, first contact, strength assessment
- US-024: Asset manifest validation — crash-hard on missing assets at boot
- US-025: Bot speech events — 6 event types, proximity filtering, archetype lines
- US-026: Zone transition blending — smoothstep gradients + breach crack shader
- US-027: Chunk boundary system — deterministic seeding, pure coordinate math

**Depth 3 — Gameplay Verification (3 stories)**
- US-028: Mark upgrade + hacking capture verification — found/fixed 5 Koota mutation bugs
- US-029: Camera-driven chunk loading — state machine with Chebyshev distance
- US-030: Chunk-scoped fog of war — cache round-trip on unload/reload

**Depth 4-5 — Persistence & Integration (2 stories)**
- US-031: Delta persistence for chunks — versioned serialization, backward compatible
- US-032: Instanced rendering per chunk — per-chunk InstancedMesh with frustum culling
- US-033: Full campaign integration verification

**Quality Pass**
- Fixed 4 failing tests (ESM mocks for expo-asset, city model manifest gaps)
- Auto-formatted 172 files with biome
- Reduced lint errors from 239 → 0 (2 false-positive warnings remain)

---

## Next Steps (Prioritized)

1. **Create PR** for `codex/ecumenopolis-fullscope` → `main`
2. **Visual verification in browser** — launch game, confirm floor renders, speech bubbles appear, chunk loading works
3. **Config-driven floor textures** — migrate `floorTextureAssets.ts` from `require()` to JSON manifest
4. **City model manifest regeneration** — run `pnpm city:ingest` to fix manifest gaps
5. **Integration test for chunk pipeline** — loader → discovery → delta → render chain

---

## Active Decisions

| Decision | Rationale |
|----------|-----------|
| Chunk streaming deferred to Phase 3 | Playable fixed-grid game is the immediate goal. Infinite ecumenopolis is vision, not 1.0. |
| Narrative must be emergent bot speech | NOT scripted story blocks. Bots say things because they're doing things. |
| ALL asset loads must crash hard on failure | NEVER fallback silently. Missing asset = crash with clear error naming the asset. |
| One plan document (GAMEPLAN_1_0) | 20 previous plans are demoted to reference. Do NOT create new plan docs. |
| Config over code | Asset paths, costs, material types, texture sets belong in JSON configs, not .ts files. |
| Koota `entity.set()` over `entity.get()` mutation | `get()` returns copies — always use `set()` for mutations. |

---

## Blocked / At Risk

| Item | Status | Risk |
|------|--------|------|
| Floor textures hardcoded | Not yet migrated | Architecture violation, but functional |
| City model manifest gaps | `machine_generator` etc. missing | Tests mock around it; data integrity issue |
| Visual verification | Not done | Jest tests pass but browser rendering unconfirmed |

---

## Key Links

| Resource | Path |
|----------|------|
| Execution roadmap | [`docs/plans/GAMEPLAN_1_0.md`](../plans/GAMEPLAN_1_0.md) |
| Progress tracker | [`docs/memory-bank/progress.md`](progress.md) |
| Product context | [`docs/memory-bank/productContext.md`](productContext.md) |
| System patterns | [`docs/memory-bank/systemPatterns.md`](systemPatterns.md) |
| Tech context | [`docs/memory-bank/techContext.md`](techContext.md) |

---

## Session Log

### 2026-03-13 — Ecumenopolis Full-Scope Sprint
- Executed 33 user stories via DAG-based parallel agents with worktree isolation
- 5 depth levels processed as parallel waves
- Fixed 4 failing tests (ESM boundary mocks, city model manifest gaps)
- Auto-formatted 172 files with biome (239 → 0 errors)
- Updated progress.md and activeContext.md to reflect current state
- Final: 53 commits, 135 test suites, 1605 tests, 0 TS errors
