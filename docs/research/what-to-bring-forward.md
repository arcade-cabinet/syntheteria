> **Historical Document (2026-03-23):** This document was written before the BabylonJS + Reactylon pivot. The architecture described here (R3F/Vite/Miniplex) has been superseded. See [CLAUDE.md](/CLAUDE.md) for current architecture.

# What to Bring Forward — Later Work That Supports the Original Vision

> Cross-referencing the original 27-file RTS game with everything built
> on the feature branches to identify what HELPS vs what was scope creep.

## Original Game Needs (from design docs + code)

| Need | Original Implementation | Status |
|------|------------------------|--------|
| Procedural labyrinth city | `cityLayout.ts` (376 LOC) | ✅ Exists in original |
| Storm sky shader | `StormSky.tsx` (85 LOC) | ✅ Exists in original |
| Component damage (not HP) | `combat.ts` (143 LOC) | ✅ Exists in original |
| Fragment merge fog | `terrain.ts` (203 LOC) | ✅ Exists in original |
| Real-time with pause | `gameState.ts` (118 LOC) | ✅ Exists in original |
| Navmesh pathfinding | `navmesh.ts` + `pathfinding.ts` | ✅ Exists in original |
| Unit selection + RTS input | `UnitInput.tsx` (281 LOC) | ✅ Exists in original |
| 6 robot types | Primitive geometry only | ❌ Needs GLB models |
| 3 cult mech types | Not in original | ❌ Needs adding |
| Terrain PBR textures | Not in original (vertex colors) | ❌ Needs adding |
| Landing page with globe | Not in original | 🟡 Built in later work |
| Responsive viewport | Not in original | ❌ Needs adding |
| City buildings as set pieces | Primitive boxes in original | ❌ Needs PBR materials |
| Narrative/dialogue system | Stub in original | 🟡 Built in later work |
| Audio (SFX + music) | Not in original | 🟡 Built in later work |

## What to BRING from Later Work

### ✅ BRING — Directly supports original vision

1. **Robot GLB models** (6 faction + 3 cult)
   - Source: `public/assets/models/robots/` from the feature branch
   - Original has only primitive geometry (boxes, cylinders)
   - These are the CORE visual identity of the game

2. **Labyrinth generator improvements**
   - Source: `src/board/labyrinth.ts` from commit before aeef1650
   - The later version had rooms-and-mazes algorithm, seeded determinism
   - Original `cityLayout.ts` is simpler but works

3. **PBR terrain materials** from `/Volumes/home/assets/2DPhotorealistic/`
   - Concrete, metal, durasteel for city floors/walls
   - NOT for a sphere world — for the FLAT city environment
   - The original uses vertex-colored terrain — needs real textures

4. **Landing page R3F globe + storm effects**
   - The globe from the sphere POC is gorgeous as a MENU background
   - Storm sky from the original game is the IN-GAME sky
   - These serve different purposes and both are valid

5. **Audio system** (Tone.js SFX + procedural music)
   - Source: `src/audio/` from the feature branch
   - Original has no audio at all
   - SFX for combat, movement, alerts directly supports RTS gameplay

6. **New Game modal + settings UI**
   - Source: `src/ui/landing/` from the feature branch
   - Seed selection, difficulty, game configuration
   - Original has a basic title screen only

7. **Yuka.js AI** (for enemy behavior)
   - Source: `src/ai/` from the feature branch
   - Original `enemies.ts` has basic patrol/aggro
   - Yuka GOAP gives cultists smarter escalating behavior
   - BUT simplify: ONE enemy faction, NOT four competing AIs

### ❌ DO NOT BRING — Scope creep that doesn't fit

1. **4 competing AI factions** — original has ONE player
2. **Diplomacy system** — no diplomatic relations in original
3. **5 epoch progression** — original has 3 phases (Awakening/Expansion/War)
4. **Sphere world / equirectangular projection** — original is flat top-down
5. **Tech tree** — original uses blueprint discovery (find it in ruins)
6. **Specialization tracks** — original has Mark I/II/III upgrades
7. **Koota ECS** — original uses Miniplex (evaluate if migration is worth it)
8. **Phaser / enable3d / Babylon.js** — original uses R3F, which works fine
9. **Roboforming** — not in original design at all
10. **Building harvest/synthesis chain** — original is scavenge → repair → fabricate
11. **Turn-based system** — original is REAL-TIME with pause
12. **Territory system** — not in original
13. **200+ building GLBs** — buildings are procedural set pieces, not models

### 🟡 EVALUATE — Could help but needs reshaping

1. **Koota vs Miniplex** — Koota is more mature but migration cost is high.
   Miniplex works fine for the original scope. Evaluate if Koota's features
   (trait composition, faster queries) are needed for the RTS.

2. **SQLite persistence** — original has no save system. The later Capacitor
   SQLite integration could add save/load, but it's not critical for MVP.

3. **E2E tests (Playwright)** — good to have but not blocking.

4. **Biome terrain system** — the continuous noise field and PBR textures
   we built for the sphere are NOT useful for the flat city, BUT the
   biome concept could work for the WORLD MAP (outside the city).

## Architecture Direction

The original game's architecture is clean and simple:
- React + R3F for rendering (keep)
- Miniplex ECS (keep for now, evaluate Koota later)
- Procedural city generation (keep + improve with PBR materials)
- Real-time with pause game loop (keep)
- Component damage combat (keep — this is the signature mechanic)
- Fragment merge fog (keep — this is the other signature mechanic)

What to ADD:
- GLB robot models (replacing primitive geometry)
- PBR materials for city environment (concrete, metal, durasteel)
- Cult mech enemies (3 types)
- Audio (SFX + ambient)
- Responsive viewport
- Landing page (globe + storm as menu background)
- Yuka AI for enemy behavior (simplified: one faction, escalating)
- Save/load (Capacitor SQLite, later)

## Immediate Next Steps

1. Fix the 60 Biome lint errors in the original code
2. Get the game running in the browser
3. Bring in the 6 robot GLBs + 3 cult mech GLBs
4. Replace primitive city geometry with PBR-textured procedural blocks
5. Make the viewport fill and scale responsively
6. Wire up the cult mechs as enemies
7. Test the core loop: wake up → repair robots → explore → fight cultists
