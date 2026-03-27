# Everything Remaining — Honest List

25 known bugs + unimplemented game features from GAME_OVERVIEW.md.
No more claiming things are done. This is the full gap.

## TIER 1: Things That Are BROKEN Right Now

### 1. Resize kills the canvas
WebGPU surface goes black on window resize. engine.resize() doesn't restore it.
CSS background hack doesn't survive. Need proper WebGPU alphaMode: "opaque" from engine creation, or find why Reactylon's Engine doesn't handle resize.

### 2. Per-entity SpotLight renders solid circle on selection
EntityRenderer creates SpotLight per selected unit. Same solid-circle problem as the camera spotlight. Replace with PointLight or remove entirely — the selection ring + pulsing emissive should be enough.

### 3. Fog of war is a CSS hack, not real fog
scene.fogMode=2 applies uniform distance-based fog. It doesn't know about exploration state. Unexplored chunks should have THICK fog, explored chunks should be clear. Need to either:
- Use per-mesh visibility based on FogOfWar.ts state (already exists but only toggles visibility, not gradual fog)
- OR use a custom shader on a fog overlay plane that samples the exploration map

### 4. Salvage material names still might have mismatches
Board generates scrapMetal/circuitry/powerCells/durasteel but the ResourcePool type in resources.ts might use different names. Verify the full chain: board → ChunkManager → ECS ScavengeSite → resourceSystem → TopBar display.

## TIER 2: Core Gameplay That Doesn't Work Yet

### 5. Click-to-select/move/attack — never verified
The code exists but nobody has clicked a unit in the browser and confirmed:
- Selection ring appears
- SelectionInfo updates
- Click terrain → unit moves
- Click enemy → unit attacks

### 6. Victory/defeat conditions
No way to win or lose. Need:
- Defeat: all player units destroyed → game over screen
- Victory: cult leader entity destroyed → victory screen + story ending

### 7. Base founding workflow
FOUND BASE button exists but never tested end-to-end:
- Click FOUND BASE → base marker appears → BasePanel opens → production queue works → units spawn

### 8. Repair workflow
REPAIR button exists but never tested:
- Select damaged unit → click REPAIR → resources consumed → component fixed

### 9. Hacking workflow
HACK button exists but never tested:
- Select unit near hackable enemy → click HACK → progress bar → faction change

### 10. Save/Load round-trip
Buttons exist. Never tested if save→load actually restores game state.

## TIER 3: Board/Zone Architecture

### 11. WORLD_EXTENT=256 still constrains the world
src/board/zones.ts uses fixed 256x256 reference frame. Should be replaced with distance+direction gradient from spawn. Different directions should have different biome characteristics:
- North: denser walls, more enemies, cult territory feel
- East/South: more open rooms, coastal floor types, mine-like POIs
- Southwest: campus-style rooms, research POIs
- Center: industrial city, moderate everything

### 12. No geographic content variety
Every chunk looks the same — generic industrial labyrinth. The board should vary:
- Room sizes (bigger rooms in campus zone, smaller in cult territory)
- Wall density (more walls in cult territory, more open in coast)
- Floor type distribution (different biome colors per direction)
- POI types (mines in coast, observatory in campus, cult shrines in north)

### 13. Chunk entity spawning incomplete
Board generates scavenge sites and cult patrols, but:
- Lightning rods need to actually provide power coverage
- Fabrication units need to be activatable
- Story trigger rooms need distinct visual markers
- Cult bases need to be generated at high danger levels, not hardcoded

## TIER 4: Game Feel

### 14. Unit death notification
Players need to know when a unit dies. Toast notification, sound effect, minimap flash.

### 15. Resource pickup feedback
When near a salvage site, should see floating "+2 Fe" or similar.

### 16. Combat feedback
Damage numbers, hit sounds, destroyed unit explosion effect.

### 17. Audio verification
Storm ambience, music, SFX — never confirmed they actually play.

### 18. Mobile touch
Bottom panel layout, tap-to-select, pinch zoom — never tested on mobile viewport.

## TIER 5: Story & Progression

### 19. Story beat triggers need distinct rooms
The board should generate special rooms (observatory, cult shrine, etc.) that look visually different from regular rooms.

### 20. Phase progression gating
The game phases (awakening→expansion→war) should transition based on player actions:
- Awakening→Expansion: first base founded
- Expansion→War: pushed beyond certain distance + cult raids start

### 21. Victory ending
Reaching the cult leader (very far north) and defeating them should trigger the ending sequence with the wormhole launch.

## Execution Order

1. Fix resize crash (Tier 1, blocks everything)
2. Fix per-entity spotlight → PointLight (Tier 1)
3. Real fog of war (Tier 1)
4. Verify click-to-select/move in browser (Tier 2)
5. Victory/defeat conditions (Tier 2)
6. Distance+direction zones in board (Tier 3)
7. Geographic content variety (Tier 3)
8. Everything else (Tiers 4-5)
