# Playtest Gap Analysis — What's Polished vs What's Dead Code

## POLISHED AND WORKING (verified in running game)

1. ✅ Title screen with R3F storm globe background
2. ✅ New Game modal (seed + difficulty)
3. ✅ Typewriter narration intro
4. ✅ Labyrinth city with visible walls, floors, GLB buildings
5. ✅ Robot GLB models visible with emissive materials
6. ✅ Storm sky dome shader (FBM clouds + wormhole)
7. ✅ HUD with readable resources, speed controls, build toolbar
8. ✅ Component damage combat (not HP)
9. ✅ Fragment merge fog of war (explored vs unexplored)
10. ✅ Real-time with pause (0.5x/1x/2x/4x + Space)
11. ✅ Lightning rod power system (storm oscillation)
12. ✅ Human temperature gauge in HUD
13. ✅ Game phase transitions with narrative overlays
14. ✅ Minimap with labyrinth outline
15. ✅ Debug overlay (hidden by default, toggle with backtick)
16. ✅ Error boundary (catches + displays crashes)
17. ✅ Zero console errors at runtime

## IMPLEMENTED BUT NOT WIRED (dead code)

1. ⚠️ **RadialMenu** — `src/ui/game/RadialMenu.tsx` exists with MOVE/ATTACK/UPGRADE/SCAVENGE
   actions but is never rendered. No right-click handler opens it.

2. ⚠️ **Cult escalation** — `src/systems/cultEscalation.ts` has full 3-tier system but
   `cultEscalationTick()` is NOT called in `gameState.ts` simulationTick().

3. ⚠️ **Yuka GOAP AI** — `src/ai/cultBehavior.ts` has CultAgent with 3 evaluators but
   `cultAISystem()` is NOT called in the game loop. Enemies don't move or attack.

4. ⚠️ **Save/Load** — `src/db/persistence.ts` has full save/load but there are no
   buttons in the UI to trigger saveGame() or loadGame().

5. ⚠️ **Mark I/II/III upgrades** — `src/systems/upgrade.ts` works (12 tests pass)
   but canUpgrade/performUpgrade are never called from the radial menu (which isn't rendered).

6. ⚠️ **Resource scavenging** — system exists but no UI indicator shows what's scavengeable
   or how to initiate scavenging.

7. ⚠️ **Building placement** — toolbar buttons exist but clicking them may not trigger
   the ghost preview placement mode.

## NOT IMPLEMENTED AT ALL

1. ❌ **Hacking** — take over enemy machines (core mechanic from design docs)
2. ❌ **Compute resource** — global cognitive resource managing distributed body
3. ❌ **Deep-sea mining** — specialized underwater units
4. ❌ **Science campus** — story location with observatory
5. ❌ **Fixed geography** — coast east/south, campus southwest, enemy north
6. ❌ **Control groups** — Ctrl+number for unit groups
7. ❌ **Engagement rules** — attack/flee/protect/hold automation
8. ❌ **Box selection** — drag to select multiple units

## VERDICT

The SYSTEMS are built but the game isn't POLISHED because critical wiring
is missing. A player loading the game can:
- See the city ✓
- See robots ✓
- Advance time ✓

But CANNOT:
- Move units (radial menu not rendered, input may not work)
- Fight enemies (cult AI not ticked, enemies are static)
- Build anything (toolbar clicks may not trigger placement)
- Save/load (no UI)
- Upgrade robots (menu not rendered)
- Scavenge resources (no UI feedback)

The gap is WIRING, not IMPLEMENTATION. Every module works in isolation
(488 tests prove it) but the integration between modules and UI is incomplete.
