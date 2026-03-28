# Finish Plan — Make Syntheteria Playable AND Polished

## Priorities (in execution order)

### P0: Fix What's Visually Broken

#### 1. Globe shader — fix continent pattern
The WGSL `continentPattern()` produces a static blob instead of Earth-like landmasses. The `hash3` function using `sin(dot(large_values))` has precision issues in WGSL — large floats lose mantissa bits differently than GLSL. Fix by:
- Using a better hash function (e.g., pcg hash or bitwise hash instead of sin-based)
- Verify each continent center renders independently (debug by outputting lat/lon as color)
- Verify noise3/fbm6 produce smooth gradients, not repeating patterns
- The hero shader integrates globe + logo + cyclone + lightning — all must work together

#### 2. Hero shader permanence
The landing-hero mesh renders the title text baked into the globe via `createHeroLogoTexture()`. This should be the PERMANENT landing experience — not a mode toggle. Remove the legacy/hero mode switch, make hero the only mode. Storm clouds behind, hero globe in front.

#### 3. Gameplay visual verification
Open Chrome DevTools MCP → navigate through full game flow → screenshot every phase:
- Landing: globe renders with visible continents, title text, storm clouds
- New Game modal: seed, difficulty, START
- Narration: typewriter text, auto-advance, SKIP
- Gameplay: 25° camera, labyrinth with depth, robots visible, fog of war, HUD

### P1: Real Integration Tests (Not Placeholders)

#### 4. Landing integration test
Use `window.__syntheteriaLandingDiagnostics` API:
- Verify all 5 shaders report `status: "compiled"` (not "pending" or "failed")
- Verify canvas has non-black pixels (use `captureCanvasDataUrl()` + pixel check)
- Verify scene has correct mesh composition (storm-clouds, landing-hero, globe, lightning-plane, hypercane)
- Verify camera "globe-cam" is active

#### 5. Gameplay integration test
Spawn real ECS entities (not force-spawned test entities), navigate the real App:
- Verify BabylonJS scene exists with meshes after entering gameplay
- Verify camera beta is in 20-35° range
- Verify FogOfWar initializes with player fragment visibility
- Verify EntityRenderer has loaded models (modelsLoaded > 0)
- Verify governor produces meaningful decisions over 100 ticks
- Verify position changes (units actually move, not just ECS state change)
- Verify resource deltas (resources change over time)
- Verify combat events fire when enemies are in range

#### 6. Component interaction tests (real ECS, not DOM text)
For each HUD component:
- **TopBar**: spawn entities → verify counts match query, click speed → verify gameSpeed changed, click PAUSE → verify isPaused()
- **SelectionInfo**: spawn entity → set selected → verify component shows name + component bars, deselect → verify "No Selection"
- **ActionPanel**: spawn entity → select → verify buttons appear, click STANCE → verify engagement rule cycles in ECS
- **Minimap**: spawn entities at known positions → verify canvas has drawn non-trivial content at those pixel positions
- **BasePanel**: foundBase() → selectBase() → verify panel renders name + power, ESC → verify panel closes

### P2: Gameplay Polish

#### 7. Gameplay lightning
BabylonJS tube-based lightning bolts on the game board (from the user's code reference):
- Random bolts from sky hitting the labyrinth
- Glow layer for visual impact
- Tied to storm intensity from game state
- NOT shader-based — imperative mesh creation with `CreateTube`

#### 8. Save/Load round-trip
Test in browser: save game → reload page → load game → verify ECS state restored. Use the Capacitor SQLite adapter on web.

#### 9. Audio feedback
Verify Tone.js audio:
- Storm ambience plays on game start
- Epoch music plays
- SFX on unit select/move (already wired in Wave 2)

### P3: Test Quality — Every Macro/Meso/Micro Variation

#### 10. Macro: Full game lifecycle
- Title → New Game (with specific seed for determinism) → Narration → Gameplay → 500 ticks → verify: game phase advanced, resources accumulated, enemies engaged, bases founded

#### 11. Meso: System interactions
- Combat: spawn player + enemy within range → tick → verify damage applied to components
- Scavenging: spawn unit near ScavengeSite → tick → verify resources increase
- Base founding: unit at valid position → foundBase → verify Base entity created with correct traits
- Movement: set Navigation path → tick movement → verify Position changed
- Fog of war: spawn unit → verify nearby tiles visible, distant tiles hidden

#### 12. Micro: Edge cases and error paths
- Entity destroyed mid-selection → verify HUD reverts to "No Selection"
- All player units killed → verify game doesn't crash
- Chunk with undefined floorType → verify fallback material used (not crash)
- Save when DB unavailable → verify error surfaced, not swallowed
- Governor with no enemies → verify it explores instead of idling
- Multiple bases founded → verify spacing validation works
- Speed 0 (paused) → verify simulationTick is no-op

### P4: Final Polish

#### 13. Ice blue palette consistency
Verify every UI element uses #8be6ff family, no leftover green (#00ffaa)

#### 14. Mobile responsiveness
Verify HUD layout switches from sidebar to bottom panel on narrow viewport

#### 15. Performance
Verify 60fps with 49 chunks loaded + 20 entities + HUD rendering
