# Architecture Vision — How The Game Works

## The Board Is Everything

`src/board` is the central authority. It generates the world AND populates it with content. Everything the player sees and interacts with originates from the board's chunk generation pipeline.

### What The Board Generates Per Chunk

Each 32×32 tile chunk, seeded deterministically, produces:

**Terrain:**
- Walls (structural_mass) with varying heights
- Floors (8 types: transit_deck, durasteel_span, collapsed_zone, dust_district, bio_district, aerostructure, abyssal_platform, void_pit)
- Rooms of various sizes connected by corridors
- Border gates for cross-chunk connectivity

**Entities (spawned into Koota ECS when chunk loads):**
- Salvage sites in rooms (scrap metal, circuitry, power cells, durasteel)
- Enemy patrol spawn points in corridors (density increases with distance from origin)
- Lightning rods in rooms (provide power, protect from strikes)
- Fabrication units in large rooms (need power to activate)
- Cult POIs in far chunks (shrines, outposts, bases)
- Story triggers in special rooms (observatory, cult encounters)

**Navigation:**
- Yuka NavGraph for pathfinding within the chunk
- Border gate nodes for cross-chunk pathfinding via WorldNavGraph

### Difficulty Gradient

Content scales with **distance from the player's spawn chunk**:

| Distance (chunks) | Enemies | Resources | POIs |
|---|---|---|---|
| 0-2 | None | Light salvage | Starting machines |
| 3-5 | Wandering scouts | Moderate salvage | Lightning rods |
| 6-10 | Patrol pairs | Dense salvage, mines | Fabrication units |
| 11-20 | War parties | Rare materials | Observatory, campus |
| 20+ | Organized forces | Strategic resources | Cult strongholds |
| 40+ | Cult elite | Endgame materials | Leader's domain |

This isn't hard-coded — it's a continuous function of distance + noise, so each direction has slightly different characteristics.

### Biome Variation

Different directions from spawn have different labyrinth characteristics:
- **All directions:** Industrial ecumenopolis ruins (the base aesthetic)
- **East/South bias:** More open rooms, coastal-feel floor types, mine POIs
- **Southwest bias:** Campus-feel rooms, research POIs, observatory
- **North bias:** Tighter corridors, more walls, cult-themed floor types, fortified

This is achieved through directional noise in the chunk generation — not fixed zones.

## The Rendering Pipeline

### Reactylon Engine → Scene → Everything

One Reactylon Engine owns one canvas. The Scene contains:
- Chunk meshes (created imperatively by `populateChunkScene()`)
- Entity meshes (GLB models synced from Koota ECS by EntityRenderer)
- Lights (directional sun, ambient, accent)
- Camera (ArcRotateCamera, 25° top-down, pan+zoom)
- Fog (exponential, hides chunk edges)
- Ground plane (dark void under everything)
- Effects (GlowLayer for emissive highlights, lightning bolts)

### React DOM Overlay

HUD elements rendered as React DOM positioned over the canvas:
- TopBar (resources, speed, controls)
- Sidebar (minimap, selection info, action panel)
- BasePanel (slides from right on base click)
- NarrativeOverlay (story dialogue)
- DebugOverlay (dev tools)

## The ECS Layer (Koota)

### Traits Define Everything

Every game entity is a bundle of Koota traits:
- Position, Faction, Fragment (basic identity)
- Unit, UnitComponents, Navigation (mobile units)
- BuildingTrait, LightningRod (structures)
- Base (player/cult bases)
- ScavengeSite, Inventory (resources)
- EngagementRule, HackTarget, Hacking (combat/interaction)

### Systems Drive Gameplay

18 systems tick in `simulationTick()`:
- Combat, movement, exploration, power, resources
- Fabrication, repair, hacking, compute
- Cult escalation, cult AI, enemy spawning
- Fragment merge, human temperature, game phases
- Base production, base power
- Governor (automated play for testing)

### The Board↔ECS Bridge

When ChunkManager loads a chunk:
1. Board generates chunk (terrain + entity spawn list)
2. `populateChunkScene()` creates BabylonJS meshes for terrain
3. Entity spawn list creates Koota entities with appropriate traits
4. EntityRenderer syncs Koota entities to BabylonJS meshes each frame

When ChunkManager unloads a chunk:
1. `disposeChunkMeshes()` removes terrain meshes
2. Entities in that chunk are despawned from Koota
3. EntityRenderer removes corresponding meshes

This means the world is TRULY infinite — only the chunks around the camera exist at any time.

## The AI Layer (Yuka GOAP)

### Cult Behavior
CultAgent with Think brain evaluates:
- PatrolGoal: wander corridors
- AggroGoal: chase nearby player units
- EscalateGoal: organize attacks on player base

### Governor (Automated Player)
PlaytestGovernor makes player decisions:
- Explore with idle units
- Attack nearby enemies
- Scavenge near resource sites
- Found bases when resources allow

## Audio (Tone.js)

- Storm ambience: brown noise + periodic thunder
- Epoch music: procedural synth per game phase
- SFX: unit select, move, combat, discovery

## Persistence (Capacitor SQLite)

- Save: serialize Koota world + game state to SQLite
- Load: restore from SQLite
- Works on web (sql.js) AND native (Capacitor SQLite)
- Chunk deltas: only player modifications saved, terrain regenerated from seed
