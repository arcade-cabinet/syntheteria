# Next Steps — Gap Analysis & Implementation Roadmap

## Current State Assessment (after 11 commits)

### ✅ Working
- Live 3D diegetic title screen (storm, globe, lightning, bezel menu)
- Loading screen with spinner + staged progress
- Clean HUD (Energy, Materials, Units, Storm Pressure, Turn counter, End Turn)
- Radial menu (positioned circular buttons, provider system)
- Fog of war (floor + structure renderers filter by discovery_state)
- Turn system data model (AP/MP per unit, turn phases, End Turn)
- Harvest system data model (tick-based harvesting, structure consumption)
- Resource pool system (8 urban mining materials mapped to model families)
- 9 bot models with definitions and starting roster
- World generation with adjacency-aware structure placement
- Storm sky, lightning, weather systems
- Narrative/thought overlay system
- All documentation aligned

### ❌ NOT Working / NOT Connected

## Priority 1: Wire Turn System to ALL Actions (Makes game PLAYABLE)

**Problem:** Turn system tracks AP/MP but nothing SPENDS them. Player can move infinitely, act infinitely.

1. **Wire movement to MP cost** — `src/systems/movement.ts` should call `spendMovementPoints()` when a unit moves. Each grid cell = 1 MP. If no MP remaining, movement blocked.

2. **Wire radial actions to AP cost** — Every radial action (harvest, build, repair, attack, hack, survey) should call `spendActionPoint()`. If no AP remaining, action disabled in radial menu.

3. **Initialize turn state on game start** — `src/ecs/initialization.ts` should call `initializeTurnForUnits()` with all player unit IDs after entity hydration.

4. **Gate radial actions by AP** — In `src/systems/radialProviders.ts`, check `hasActionPoints(entityId)` before enabling actions. Check `hasMovementPoints(entityId)` before enabling movement.

5. **Refresh units on End Turn** — Already done in `endPlayerTurn()`.

## Priority 2: Add Harvest to Radial Menu (Makes economy FUNCTIONAL)

6. **Create harvest radial provider** — In `radialProviders.ts`, add a "Harvest" category that shows when a Fabricator bot is selected near a harvestable structure. The action should call `startHarvest()`.

7. **Detect nearby harvestable structures** — The provider needs to find structures within range of the selected unit's position and present them as harvest targets.

## Priority 3: Emissive Glow Rings (Makes turns VISIBLE)

8. **Add glow ring to UnitRenderer** — In `src/rendering/UnitRenderer.tsx`, for each player unit, check `hasAnyPoints(entityId)`. If true, render a translucent cyan ring mesh beneath the unit.

9. **Dim spent units** — Units with 0 AP and 0 MP should render at reduced opacity or with a gray tint to indicate they're done for this turn.

## Priority 4: Hamburger Menu (Declutters gameplay area)

10. **Create hamburger button** — Add a ☰ icon button in the top-right corner of the HUD bar (next to End Turn).

11. **Create slide-out panel** — On press, slide a panel from the right containing:
    - Minimap (moved from main view)
    - Resource breakdown (all 8 material types with amounts)
    - Unit roster summary
    - Campaign stats (turn number, structures harvested, area explored)

## Priority 5: Floor Biome Rendering (Makes world BEAUTIFUL)

12. **Verify PBR texture loading** — The floor texture ID mapping was added but textures may not be loading from all paths. Test by checking if command_core, fabrication, corridor_transit, habitation zones all show different textures.

13. **Reduce grid visibility** — The current box geometry (0.12 height) creates visible grid lines. Consider reducing to 0.04 or using plane geometry to create smoother transitions between cells.

14. **Add zone transition blending** — Where two zone types meet, blend colors/textures for less harsh boundaries.

## Priority 6: Walkable Pathfinding (Makes world NAVIGABLE)

15. **Structure collision awareness** — The pathfinding system should treat cells with non-passable structures as blocked. Currently units walk through everything.

16. **Movement path visualization** — When a unit is selected and has MP, show a path indicator (dotted line or highlighted cells) showing where it can reach.

17. **Click-to-move with MP check** — Clicking a cell should only start movement if the path cost (in MP) is affordable.

## Priority 7: Bot Role Specialization (Makes choices MEANINGFUL)

18. **Update bot definitions** — Align `src/bots/definitions.ts` with the new 6-role system: Technician (repair), Scout (explore), Striker (melee), Fabricator (build/harvest), Guardian (defense), Hauler (logistics).

19. **Restrict harvest to Fabricators** — Only Fabricator bots should have the Harvest radial action.

20. **Restrict building to Fabricators** — Only Fabricators can build structures.

21. **Scout bonus** — Scouts should have 2× exploration radius.

22. **Guardian taunt** — Guardians should draw enemy attacks (when combat exists).

## Priority 8: Motor Pool & Bot Fabrication (Enables EXPANSION)

23. **Motor Pool blueprint** — Add to construction system as a buildable structure.

24. **Motor Pool UI** — When a Motor Pool is operational, the radial menu on it should show "Fabricate Bot" with a list of available types and their resource costs.

25. **Bot fabrication queue** — Motor Pool processes one bot at a time over N turns.

## Priority 9: Construction Visualization (Makes building VISIBLE)

26. **Show construction stages** — When a structure is being built, render only the parts that match the current stage (foundation → shell → interior → operational).

27. **Progress overlay** — Show a small progress bar or percentage over structures under construction.

## Priority 10: Cultist Incursions (Creates THREAT)

28. **Cultist spawn system** — Every N turns, cultist units spawn at breach zones within a radius of the player's territory.

29. **Cultist behavior** — Cultists move toward player structures and attack them.

30. **Escalation** — Cultist spawn frequency and strength increase as the player's territory grows.

## Priority 11: Save/Load Harvest State (Enables PERSISTENCE)

31. **Persist consumed structures** — Save the set of consumed structure IDs to SQLite so they survive reload.

32. **Persist resource totals** — Save the full ResourcePool (including new harvest materials) to the save game.

## Priority 12: Chunk-Based Generation (Enables INFINITE WORLD)

33. **Refactor generation.ts** — Replace fixed-size map with chunk-based generation where each chunk is deterministically generated from worldSeed + chunkKey.

34. **Camera-driven chunk loading** — Load chunks within viewport radius, unload chunks outside.

35. **Delta persistence** — Only save modifications (harvested structures, built structures, discovery state) per chunk.

## Priority 13: Mark Upgrades (Enables PROGRESSION)

36. **Mark upgrade UI** — Radial action on Motor Pool: "Upgrade Unit" showing cost in Silicon Wafer + materials.

37. **Mark progression effects** — Apply the logarithmic multiplier from `progression.ts` to unit AP/MP and specialist effectiveness.

## Priority 14: Hacking Integration (Captures ENEMIES)

38. **Wire hacking to turn system** — Hacking costs AP and takes multiple turns.

39. **Capture hostile bots** — Successful hack converts hostile bot to player faction with its original model/type.

40. **Hacked bot roles** — Arachnoid → fast melee, MechaTrooper → ranged, QuadrupedTank → siege.

---

## Implementation Order (recommended)

**Sprint 1 — Playable Loop (items 1-9)**
Wire turns to actions, add harvest to radial, show glow rings. This creates the first real gameplay: explore → select unit → move (costs MP) → harvest (costs AP) → End Turn → repeat.

**Sprint 2 — Visual Polish (items 10-14)**
Hamburger menu, floor biomes, walkable pathfinding. Makes the game look and feel right.

**Sprint 3 — Economy & Expansion (items 18-27)**
Bot specialization, Motor Pool, construction visualization. Player can build an economy.

**Sprint 4 — Threat & Progression (items 28-37)**
Cultist incursions, save/load, Mark upgrades. Game has stakes and progression.

**Sprint 5 — Advanced Systems (items 33-40)**
Chunk generation, hacking integration. Game scales to full vision.
