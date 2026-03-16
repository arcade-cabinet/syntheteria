---
title: "Nice to Haves"
domain: meta
status: canonical
last_updated: 2026-03-14
summary: "Consolidated list of optional, P2, and deferred items — address when capacity allows"
---

# Nice to Haves

Items that improve quality but are not required for 1.0. Sourced from progress.md, GAMEPLAN, activeContext, and domain docs.

---

## Asset & Config

| Item | Source | Status | Action |
|------|--------|--------|--------|
| Full runtime floor texture resolution | progress.md | Deferred | Metro requires static imports; floorTextures.json + static imports work. Revisit if Metro adds runtime asset resolution. |
| Ingest undermaterials (pit interiors) | activeContext, WORLD_SYSTEMS | Deferred | Add pit/undermaterial zones to floorTextures.json when 2DPhotorealistic textures available. Run `UNDERMATERIALS_SRC=/path pnpm tsx scripts/ingest-undermaterials.ts`. |
| Floor tile GLBs as optional accents | ASSETS | Optional | Procedural floor is baseline; visible tile GLBs are polish. |
| Unified asset resolution (all via resolveAssetUri) | GAMEPLAN Phase 2 | Partial | Models use it; floor textures use static imports. Stretch goal. |

---

## Testing & CI

| Item | Source | Status | Action |
|------|--------|--------|--------|
| Maestro E2E in CI (EAS + Maestro Cloud) | PLAYWRIGHT_TO_MAESTRO, techContext | Optional | maestro/README documents local run. Add to eas.json when ready. |
| Consolidate duplicate hacking tests | progress.md | Addressed | hacking.test.ts → hacking.ts (core system). hackingSystem.test.ts → hackingSystem.ts (capture flow). Different modules; scope documented in file headers. |
| Focus-visible styles (keyboard nav) | CLAUDE_UI_POLISH | Addressed | HudButton has focus-visible:outline. Modals (Settings, Pause, NewGame, TechTree, Diplomacy) use accessibilityRole/aria; close buttons and key actions have labels. |
| Reduced-motion handling | UI_BRAND_old | Future | room for future a11y. |

---

## Visual Polish

| Item | Source | Status | Action |
|------|--------|--------|--------|
| Storm/wormhole spectacle tuning | GAMEPLAN 4.2 | Manual verify | StormSky, LightningSystem, WormholeRenderer exist. Tune for cohesion in browser. |
| Zone transition blending | GAMEPLAN 4.5 | Exists, tune | zoneBlending.json + zoneBlendLogic. StructuralFloorRenderer blend edges. Tune smoothstep. |
| Construction animation staging | GAMEPLAN 4.3 | Exists | ConstructionRenderer.tsx. Verify foundation→shell→operational in browser. |
| Rain splash impacts | RENDERING | Optional, perf-gated | Small ripple effects on exposed floors. GPU particle system. |
| Cultist lightning (combat) | RENDERING, STORM_WEATHER | Future | Red-white danger, screen flash. |
| 7-octave FBM for StormSky | live-storm spec | Optional | StormSky can adopt shared noise library; 5→7 octave if performance allows. |

---

## Gameplay

| Item | Source | Status | Action |
|------|--------|--------|--------|
| Tech tree effects visible | GAMEPLAN 5.3 | Exists | techTree.ts has effects. Verify completed techs change gameplay noticeably. |
| Diplomacy consequences | GAMEPLAN 5.4 | Exists | diplomacy.ts. Verify trade/alliance/war affect gameplay. |
| Victory pacing | GAMEPLAN 5.5 | Exists | victoryConditions.ts. Tune game duration, achievability. |
| AI faction visibility | GAMEPLAN 1.2 | Partial | GOAP runs; visible construction/expansion minimal. Enhance when capacity allows. |

---

## Docs & Process

| Item | Source | Status | Action |
|------|--------|--------|--------|
| OPEN_QUESTIONS resolution | design/OPEN_QUESTIONS | Periodic | Business model, deep-sea mining, EL revelation, etc. Revalidate when design capacity allows. |
| Minimap/briefing timing | FRONTEND_PLAYTEST | Addressed | Minimap deferred until currentTick > 0. Briefing bubbles on interaction. |

---

## Quick Wins (Done This Session)

- **Hacking test scope:** Added file-header notes: hacking.test.ts tests hacking.ts (core); hackingSystem.test.ts tests hackingSystem.ts (capture). No merge needed.
- **This doc:** Consolidated all nice-to-haves in one place. progress.md and activeContext reference it.
