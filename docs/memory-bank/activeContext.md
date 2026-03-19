# Active Context: Syntheteria

> What's happening RIGHT NOW. Updated every session. Read this first.

---

## Current State (2026-03-18)

**2171 tests, 124 suites (120 passing, 4 failing), 0 TypeScript errors.**

The game is a playable turn-based 4X with:
- **BSP city generator** with labyrinth maze corridors, abyssal zones, bridges
- **PBR texture atlas** (8 AmbientCG packs, 5 atlas maps, atlas-sampling GLSL shader)
- **15 faction buildings** + 6 cult structures + 10 salvage types
- **Specialization system** — 14 tracks across 6 robot classes, Garage modal, AI track selection
- **27-tech research tree** (15 base + 12 track-gating techs across 5 tiers)
- **Cult mutation system** — 4-tier time-based evolution (stat buffs → abilities → aberrant)
- **Floor mining** with DAISY pattern — backstop economy when salvage is consumed
- **Yuka GOAP AI** with fuzzy logic, faction personalities, perception memory, NavGraph A*
- **Combat** — attack ranges, damage calc, counterattack, death/removal
- **Cult escalation** — 3 stages (wanderer → war party → assault), per-sect GOAP behaviors
- **Economy** — harvest/synthesize/fabricate loop, building placement, tech/upgrade progression
- **Territory** — faction tile painting, minimap visualization
- **Victory** — 7 paths (domination, research, economic, survival, wormhole, technical supremacy, forced domination)
- **Diplomacy** — granular standings (-100 to +100), trade, reputation, AI personality responses
- **Save/Load** — fixed for BSP generator, unit identity persistence, manual save, auto-save
- **360 GLB models** from 3 asset packs (sci-fi blends, Space Colony, KayKit)
- **Audio** — Tone.js synth pooling, ambient storm loop, SFX

**Pending/ is READ-ONLY REFERENCE** — valuable for design patterns and game data, but most code is incompatible (real-time hex-grid architecture vs our turn-based square-grid). Port DATA (configs, narrative text), not CODE.

---

## What Was Built This Session

### Specialization System (Complete)
- 6 track definition files (`src/ecs/robots/specializations/`)
- 14 tracks: pathfinder/infiltrator (scout), vanguard/shock_trooper (infantry), flanker/interceptor (cavalry), sniper/suppressor (ranged), field_medic/signal_booster/war_caller (support), deep_miner/fabricator/salvager (worker)
- Track registry (`trackRegistry.ts`) — single source of truth for all tracks
- Garage modal (`GarageModal.tsx`) — two-step fabrication: Classification → Specialization
- Specialization passives runtime (`specializationSystem.ts`) — aura effects applied per turn
- AI track selection (`src/ai/trackSelection.ts`) — per-faction preferences
- 12 track-gating techs wired into tech tree (27 total techs)
- Victory: Technical Supremacy checks Mark V of all 6 faction robot classes

### Cult Mutations (Complete)
- Time-based 4-tier mutation system (`cultMutation.ts`)
- Tier 1 (turn 6): one stat buff (speed/armor/damage)
- Tier 2 (turn 11): second buff + special ability (regen/area_attack/fear_aura)
- Tier 3 (turn 21): Aberrant — +2 to ALL stats, mini-boss threat
- Seeded-deterministic buff selection

### Floor Mining (Complete)
- Strip-mine tiles for foundation materials (`floorMiningSystem.ts`)
- DAISY pattern: mine adjacent tiles, create visible pits (elevation → -1)
- Deep mining tech bonus: +50% yield
- MinedPitRenderer for visual pit geometry

### Cult Escalation (Complete)
- 3 stages: wanderer (flee), war_party (coordinate), assault (charge buildings)
- Per-sect behaviors: Static Remnants (defend POIs), Null Monks (ambush isolated), Lost Signal (berserker)
- POI spawning at game start on abandoned terrain
- Structure-based altar spawning + corruption spread
- Final assault mode after turn 300

### Other Gaps Fixed
- Deep mining tech yield multiplier
- `bio_processor` replaced with `resource_refinery` (machines don't eat)
- `bio_farm` added as cult structure
- `abyssal_relic` salvage type yields `el_crystal`
- Robot placement: min 2-tile spread, 10-tile search radius

---

## Architecture

- R3F + Three.js + **Koota ECS** + Vite
- **Yuka** for AI GOAP (Think/GoalEvaluator/FuzzyModule/NavGraph)
- **AmbientCG** PBR textures via atlas shader (5 atlas maps)
- **3 asset packs**: sci-fi blends (structures), Space Colony (buildings), KayKit (modules)
- **Tests**: Vitest JSDOM (2171 tests, 124 suites), Playwright E2E (AI-vs-AI playtests)

## Key Rules
- ECS systems accept `world: World` param — never singleton
- No JSON configs — TypeScript const objects only
- All generation seeded-deterministic
- pending/ is reference-only — port data, not code
- Check pending/ BEFORE building from scratch

## Next Steps

- **Unified depth layer refactor** — replace BiomeRenderer + DepthRenderer + MinedPitRenderer with single unified renderer
- **#53**: Fog of war radiating gradient (not hard cutoff)
- **#54**: Storm dome atmosphere (hypercane + wormhole-is-the-eye)
- **#63**: Signal relay control limits (low priority)
- **#39**: Visual polish with Chrome DevTools screenshots
- Fix 4 failing test suites
