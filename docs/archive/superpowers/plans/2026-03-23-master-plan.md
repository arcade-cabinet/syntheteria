# Syntheteria RTS Course Correction — Master Plan

> **Historical Document (2026-03-23):** This document was written before the BabylonJS + Reactylon pivot. The architecture described here (R3F/Vite/Miniplex) has been superseded. See [CLAUDE.md](/CLAUDE.md) for current architecture.

> **Design Spec:** `docs/superpowers/specs/2026-03-23-rts-course-correction-design.md`

## Vision

Restore the original RTS vision: one emergent AI waking in industrial ruins, repairing robots, exploring, fortifying, pushing north to defeat the Cult of EL. Port the best infrastructure from the feature branch (Koota, labyrinth, audio, persistence, models) while dropping all 4X scope creep.

---

## Phase Overview

| Phase | Name | Plan | Status | Depends On |
|-------|------|------|--------|------------|
| **0** | Foundation | [`2026-03-23-phase0-foundation.md`](2026-03-23-phase0-foundation.md) | Not started | — |
| **1** | Core RTS Loop | [`2026-03-23-phase1-core-rts.md`](2026-03-23-phase1-core-rts.md) | Not started | Phase 0 |
| **2** | Combat + Exploration | [`2026-03-23-phase2-combat-exploration.md`](2026-03-23-phase2-combat-exploration.md) | Not started | Phase 1 |
| **3** | Economy + Building | [`2026-03-23-phase3-economy-building.md`](2026-03-23-phase3-economy-building.md) | Not started | Phase 2 |
| **4** | UI + Audio + Persistence | [`2026-03-23-phase4-ui-audio-persistence.md`](2026-03-23-phase4-ui-audio-persistence.md) | Not started | Phase 3 |
| **5** | Polish + Narrative | [`2026-03-23-phase5-polish-narrative.md`](2026-03-23-phase5-polish-narrative.md) | Not started | Phase 4 |

---

## Dependency Graph

```text
Phase 0: Foundation
  ├── Fix Biome lint errors
  ├── Miniplex → Koota ECS port (27 files)
  └── Copy GLB assets + audio from feature branch
        │
        ▼
Phase 1: Core RTS Loop
  ├── Extract labyrinth generator (from aeef1650^)
  ├── Adapt labyrinth for single-player (1 start, cult POIs)
  ├── Wire labyrinth as board data source
  ├── GLB robot models (6 player archetypes)
  ├── GLB building models (25 building types)
  ├── Responsive viewport
  └── Real-time game loop (5 speeds)
        │
        ▼
Phase 2: Combat + Exploration
  ├── Component damage system (camera/arms/legs/power_cell)
  ├── Fragment merge fog-of-war
  ├── 3 cult mech types as enemies
  ├── Cult escalation (wanderer → war party → assault)
  ├── Yuka GOAP for cult AI
  ├── Navmesh A* pathfinding
  └── Unit selection + RTS input (click/tap)
        │
        ▼
Phase 3: Economy + Building
  ├── Resource scavenging (4 materials)
  ├── Fabrication recipes (components from materials)
  ├── Lightning rod power grid
  ├── Building placement (6 types, ghost preview)
  ├── Repair system (auto + manual)
  └── Mark I/II/III upgrades via radial menu
        │
        ▼
Phase 4: UI + Audio + Persistence
  ├── Landing page (LandingScreen + NewGameModal)
  ├── R3F globe menu background
  ├── Tone.js audio (SFX + music + ambience)
  ├── Capacitor SQLite save/load
  └── Game speed controls (keyboard shortcuts)
        │
        ▼
Phase 5: Polish + Narrative
  ├── Intro narrative (typewriter dialogue)
  ├── Human temperature system (5 tiers)
  ├── 3 game phases (Awakening/Expansion/War)
  ├── PBR materials (ambientCG textures)
  ├── E2E tests (Playwright)
  ├── Error handling (assert+throw, debug overlay)
  └── Mobile optimization (Capacitor iOS/Android)
```

---

## Code Sourcing Reference

All code is sourced from existing commits and branches — nothing is written from scratch without a reference.

| Component | Source | Destination |
|-----------|--------|-------------|
| Labyrinth generator (6 files + tests) | `aeef1650^` (parent of removal commit) | `src/board/labyrinth*.ts` |
| Koota trait patterns | `cursor/cloud-agent-runbook-review-0483:src/traits/*.ts` | `src/ecs/traits.ts` (template) |
| Cult mechs (3 archetypes) | `cursor/cloud-agent-runbook-review-0483:src/robots/CultMechs.ts` | `src/robots/CultMechs.ts` |
| Robot GLBs (6 player + 3 cult) | `cursor/cloud-agent-runbook-review-0483:public/assets/models/robots/` | `public/assets/models/robots/` |
| Building GLBs (25) | `cursor/cloud-agent-runbook-review-0483:public/assets/models/buildings/` | `public/assets/models/buildings/` |
| Audio system (5 files) | `cursor/cloud-agent-runbook-review-0483:src/audio/*.ts` | `src/audio/` |
| DB/persistence (8 files) | `cursor/cloud-agent-runbook-review-0483:src/db/*.ts` | `src/db/` |
| Landing UI (3 files + title/) | `cursor/cloud-agent-runbook-review-0483:src/ui/landing/` | `src/ui/landing/` |
| R3F Globe | `cursor/cloud-agent-runbook-review-0483:src/ui/Globe.tsx` | `src/ui/landing/GlobeBackground.tsx` |
| Yuka AI (GOAP patterns) | `cursor/cloud-agent-runbook-review-0483:src/ai/` | `src/ai/cultBehavior.ts` |
| Game speed defs | `cursor/cloud-agent-runbook-review-0483:src/config/gameSpeedDefs.ts` | `src/config/gameSpeedDefs.ts` |
| PBR textures | `/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/` | `public/assets/textures/pbr/` |
| Original game systems (12) | Current branch `src/systems/` | Ported to Koota in place |
| Original renderers (5) | Current branch `src/rendering/` | Upgraded to GLB in place |
| Original input (2) | Current branch `src/input/` | Ported to Koota in place |

---

## Completion Criteria Per Phase

### Phase 0: Foundation
- All 27 files ported from Miniplex to Koota
- 0 TS errors, 0 Biome errors
- 9 robot GLBs + 25 building GLBs in `public/assets/`
- Production build succeeds
- Game compiles (may not render correctly yet)

### Phase 1: Core RTS Loop
- Labyrinth city renders with GLB models
- 6 robot types visible as 3D models
- Viewport fills screen responsively
- Game loop ticks with 5 speed settings
- Labyrinth tests pass with seeded determinism

### Phase 2: Combat + Exploration
- Component damage (4 components, not HP)
- Fragment merge fog-of-war
- 3 cult mech types with Yuka GOAP AI
- Cult escalation over time
- Navmesh pathfinding, unit selection, move/attack commands

### Phase 3: Economy + Building
- Full resource loop: scavenge → fabricate → power → repair → upgrade
- 6 building types placeable with ghost preview
- Mark I/II/III upgrade path for 6 robot archetypes
- Radial menu for unit actions

### Phase 4: UI + Audio + Persistence
- Landing page with globe background
- Audio: SFX + procedural music + storm ambience
- Save/load via SQLite (non-fatal on failure)
- Game speed controls with keyboard shortcuts

### Phase 5: Polish + Narrative
- Intro narrative, 3 game phases, human temperature
- PBR city materials
- E2E tests pass
- Assert-and-throw error handling
- Mobile builds via Capacitor

---

## Overall Success Criteria

From the design spec — the game is DONE when:

- [ ] Procedural labyrinth city fills viewport responsively
- [ ] 6 robot types rendered as GLB models with component damage
- [ ] 3 cult mech types as enemies with escalating behavior
- [ ] Real-time combat with pause
- [ ] Fragment merge fog-of-war
- [ ] Resource loop: scavenge → repair → fabricate → upgrade
- [ ] Building placement (lightning rods, fabrication units)
- [ ] Save/load via Capacitor SQLite
- [ ] Audio: SFX + procedural music + storm ambience
- [ ] Landing page with R3F globe
- [ ] Mobile-responsive viewport
- [ ] 0 TypeScript errors, Biome clean, all tests pass

---

## What Got DROPPED (permanently)

| Feature | Reason |
|---------|--------|
| 4 competing AI factions | Original has ONE player |
| Diplomacy system | No faction relations |
| 5 epochs | Replaced by 3 game phases |
| Sphere world | Original is flat top-down |
| Tech tree | Replaced by blueprint discovery / Mark upgrades |
| Specialization tracks | Mark I/II/III replaces this |
| Roboforming | Not in original |
| Territory system | Not in original |
| Turn-based system | Real-time with pause |
| Phaser / enable3d / Babylon.js | R3F is the rendering tech |
| 200+ scatter GLBs | 25 buildings + procedural city |
| Biome terrain system | City environment, not natural terrain |
| Weather multipliers on gameplay | Storm is atmospheric only |
