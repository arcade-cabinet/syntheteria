# Implementation Plan — From Rendering Demo to Playable Game

## Current State (Honest)

We have:
- A BabylonJS/Reactylon canvas that renders a small cluster of labyrinth chunks
- WGSL shaders for the landing globe (working)
- 18 game systems that tick (but most produce invisible results)
- A HUD that displays ECS state
- 732 unit tests + 51 browser tests
- Robot GLBs that load but are barely visible
- A chunk generation pipeline that produces terrain but no entities

We do NOT have:
- A labyrinth that fills the viewport
- Visible, selectable, movable robots
- Procedural entity placement in chunks
- A difficulty gradient
- Any story/dialogue system
- Working fog of war on the minimap
- Correct storm/power math
- A game anyone would want to play

## Phase 1: Make The World Work (Blocks Everything)

### 1.1 Fix chunk loading — labyrinth fills viewport
Debug why only a small cluster renders when VIEW_RADIUS=3 should produce 49 chunks. The POC loaded chunks that filled the screen. Compare POC chunk generation with current `generateChunk()`. The canvas renders transparent pixels (alpha=0) where chunks should be — either chunks aren't generating, meshes aren't being created, or they're positioned wrong.

**Test:** After navigating to gameplay, >50% of canvas pixels are non-transparent.

### 1.2 Board generates entities in chunks
Add entity spawn data to `Chunk` type. During generation, place:
- ScavengeSite entities in rooms (density based on distance from origin)
- Enemy patrol markers in corridors (density based on distance)
- Lightning rods in large rooms near origin
- Fabrication units in specific room configurations

ChunkManager spawns entities when chunk loads, despawns when unloads.

**Test:** After loading chunks, Koota world has ScavengeSite + enemy entities that the player didn't manually spawn.

### 1.3 Difficulty gradient via distance
Replace `WORLD_EXTENT` zone system with distance-based difficulty:
```typescript
function dangerLevel(chunkX: number, chunkZ: number, spawnCx: number, spawnCz: number): number {
  const dist = Math.sqrt((chunkX - spawnCx) ** 2 + (chunkZ - spawnCz) ** 2);
  return Math.min(1.0, dist / 30); // 0 at spawn, 1.0 at 30 chunks out
}
```
Danger level drives: enemy density, resource rarity, cult POI probability.

**Test:** Chunks far from spawn have more enemy spawn points than chunks near spawn.

### 1.4 Strip initializeWorld to just player start
Remove all hardcoded entity spawns. Board does it now. `initializeWorld` only:
1. Sets game config (seed, difficulty)
2. Inits city layout + nav graph
3. Spawns 2 broken starting robots
4. Returns start position

**Test:** With no chunks loaded, Koota world has exactly 2 Unit entities.

## Phase 2: Make Units Visible and Interactive

### 2.1 Fix robot GLB visibility
Scale, position, and lighting so robots are clearly visible at the camera distance. Use Blender MCP to verify GLB models have correct normals, materials, and scale.

**Test:** Screenshot shows recognizable robot models at spawn position.

### 2.2 Selection and movement work
Click robot → selection ring → click ground → unit navigates there. The pathfinding (`buildNavGraph` + Yuka) is now wired. Verify the full chain: click → pick → selectEntity → click terrain → issueMoveTo → Navigation trait → movementSystem → Position update → EntityRenderer sync.

**Test:** Unit position changes after issuing move command.

### 2.3 Combat produces visual feedback
When player unit and enemy are in combat range, damage flash shows on the target. Component damage reduces functionality (broken camera = can't see, broken legs = can't move).

**Test:** Near an enemy, combat events fire and mesh flashes red.

## Phase 3: The Base Building Loop

### 3.1 Found base → production → units
Click FOUND BASE → base marker appears → BasePanel shows → add items to production queue → units are produced over time. The systems (baseManagement.ts) exist — wire them to the UI.

**Test:** Found base, add production item, wait N ticks, new unit spawns.

### 3.2 Lightning rods and power
Rods generate power from storm. Power supplies fabrication units and bases. Power deficit = things stop working.

**Test:** PWR shows generation and demand. Removing a rod reduces generation.

### 3.3 Repair workflow
Damaged components can be repaired using fabricated parts. The repair system exists — wire to UI (select damaged unit, choose component, spend resources, repair).

**Test:** Damaged component goes from broken to functional after repair action.

## Phase 4: The Enemy Threat

### 4.1 Cult escalation
Over time, cult presence increases. Wandering scouts → patrol pairs → war parties → base raids. The cult escalation system exists — verify it produces visible enemies that approach and attack.

**Test:** After 500 ticks, enemy count has increased and enemies are near player base.

### 4.2 Cult AI behavior
CultAgent (Yuka GOAP) decides: patrol, aggro, escalate. Verify agents actually make decisions and move through the labyrinth.

**Test:** Enemy units change position over time (not static).

### 4.3 Hacking
When near a hackable enemy, player can attempt to convert it. Changes faction from cultist to player.

**Test:** Hack action on enemy → faction changes → unit is now player-controlled.

## Phase 5: Story Discovery

### 5.1 Dialogue system
When the player encounters a story trigger (special room, cult figure), a dialogue overlay appears. Typewriter text with speaker labels — similar to NarrativeOverlay but triggered by world exploration, not phase transitions.

**Test:** Moving unit to a story trigger room shows dialogue overlay.

### 5.2 Story triggers in chunks
Board generates story trigger rooms at specific distances/directions from spawn. Each trigger has associated dialogue content.

**Test:** Exploring far enough from spawn eventually hits a story trigger.

## Phase 6: Polish

### 6.1 Fog of war on minimap
Minimap only shows explored areas. Unexplored = dark.

### 6.2 Storm/power math
Cap storm display at meaningful range. Power display shows surplus/deficit clearly.

### 6.3 Audio integration
Storm ambience + epoch music + SFX all playing at correct times.

### 6.4 Save/Load
Full ECS state serialization + chunk delta storage.

### 6.5 Mobile layout
Sidebar → bottom panel on narrow viewport.

## Implementation Rules

1. Each phase verified visually in Chrome DevTools MCP
2. Tests must fail when feature is broken, pass when working
3. Board is the sole authority for entity placement
4. No hardcoded positions outside of the 2 starting robots
5. Every commit has a descriptive message explaining what changed
6. If something looks wrong in a screenshot, fix it before moving on
