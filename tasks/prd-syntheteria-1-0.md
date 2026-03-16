[PRD]
# PRD: Syntheteria 1.0 — All Remaining Work

## Overview

Syntheteria is a first-person 4X factory game on a machine planet, built with R3F + Koota ECS + Expo/Metro. The codebase has 375 source files, 1,092 passing tests, and zero TypeScript errors — but the game still renders as a black void on first launch. The gap between "tests pass" and "player sees a game" is the core problem.

This PRD covers ALL remaining work to reach a playable 1.0: fixing critical rendering bugs, making AI opponents visible, adding emergent bot dialogue, completing the config-driven asset pipeline, visual polish, gameplay depth features, and optional chunk-based world streaming.

**Source of truth:** `docs/plans/GAMEPLAN_1_0.md` (6-phase roadmap), `docs/memory-bank/progress.md` (system status)

## Goals

- Fix P0 crashes so the game renders and runs in a browser
- Make AI factions visible opponents (not background simulations)
- Add emergent bot speech so the world feels alive
- Complete config-driven asset pipeline (no hardcoded asset paths)
- Polish visuals to match the industrial machine-consciousness aesthetic
- Add gameplay depth (Mark upgrades, hacking capture, diplomacy consequences)
- Implement chunk-based world streaming for infinite exploration

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` — TypeScript type checking (zero errors)
- `npx biome check .` — Linting (tabs, double quotes, sorted imports)
- `npx jest --passWithNoTests` — All tests pass

For UI stories, also include:
- Verify in browser via `expo start --web`

## Dependency Graph

The stories are structured for maximum parallelism. Same-depth stories touch different files/directories and have no mutual dependencies.

```
Depth 0 (16 parallel):
  US-001 ─── US-002 ─── US-003 ─── US-004 ─── US-005 ─── US-006
  US-007 ─── US-008 ─── US-009 ─── US-010 ─── US-011 ─── US-012
  US-013 ─── US-014 ─── US-015 ─── US-016

Depth 1 (7 parallel):
  US-017(←001) ── US-018(←001) ── US-019(←004) ── US-020(←003)
  US-021(←003) ── US-022(←001) ── US-023(←016)

Depth 2 (5 parallel):
  US-024(←020) ── US-025(←019,016) ── US-026(←021) ── US-027(←021)
  US-028(←022,008,009)

Depth 3 (3 parallel):
  US-029(←027) ── US-030(←027) ── US-031(←027)

Depth 4 (2 parallel):
  US-032(←029,030,031) ── US-033(←025,026,028)
```

## User Stories

---

### DEPTH 0 — Foundation (16 parallel, no dependencies)

---

### US-001: Fix web asset resolution crash
**Description:** As a player, I want the game canvas to mount successfully on web so that I can see the game world instead of a red error screen.

**Touches:** `src/config/assetUri.ts`, `src/config/assetUri.test.ts`

**Acceptance Criteria:**
- [ ] `resolveAssetUri()` works in Metro web bundle (no `require()` that breaks in web context)
- [ ] Use static imports or `useGLTF.preload()` patterns instead of dynamic `require()` for web
- [ ] R3F Canvas mounts without "Asset module resolution requires a module runtime" error
- [ ] Existing `assetUri.test.ts` tests updated and passing
- [ ] Verify canvas renders in browser (not red/blank)

---

### US-002: Fail-hard audit — remove all silent asset fallbacks
**Description:** As a developer, I want every asset load path to crash hard on failure so that missing assets are caught immediately instead of producing silent black voids.

**Touches:** `src/config/`, `src/rendering/` loaders, `src/audio/` loaders (NOT game systems or UI)

**Acceptance Criteria:**
- [ ] Search codebase for `?? null`, `?? undefined`, `|| fallback` patterns in asset/texture/model/audio loading
- [ ] Search for empty `catch` blocks in asset loading paths
- [ ] Replace all found patterns with `throw new Error()` including the missing asset name/path
- [ ] `resolveAssetUri()` already throws on empty strings — verify no callers catch and swallow
- [ ] Add test for at least 3 fail-hard paths confirming they throw on missing assets
- [ ] Document count of fallbacks removed in commit message

---

### US-003: Floor textures to JSON config
**Description:** As a developer, I want floor texture definitions in JSON config (not hardcoded ES module imports) so the asset pipeline can evolve without code changes.

**Touches:** `src/config/floorTextureAssets.ts` → NEW `config/floorTextures.json`, `src/city/config/floorMaterialPresets.ts`

**Acceptance Criteria:**
- [ ] Create `config/floorTextures.json` with all floor texture definitions (zone type → texture path mapping)
- [ ] `floorTextureAssets.ts` imports from JSON config instead of using `require()` calls
- [ ] `floorMaterialPresets.ts` consumes the JSON config
- [ ] `StructuralFloorRenderer.tsx` texture loading unchanged (already uses `resolveAssetUri()`)
- [ ] Add type definitions for the JSON schema in `config/index.ts`
- [ ] Existing floor rendering tests pass
- [ ] New test verifying all JSON-defined textures resolve to valid paths

---

### US-004: Bot speech engine
**Description:** As a player, I want my bots to occasionally say contextual things during gameplay ("Scrap yield's good here", "Storm's picking up") so the world feels alive with emergent personality.

**Touches:** NEW `src/systems/botSpeech.ts`, NEW `config/speechProfiles.json`, NEW `src/systems/__tests__/botSpeech.test.ts`

**Acceptance Criteria:**
- [ ] Create `config/speechProfiles.json` with speech lines per profile (mentor, scout, quartermaster, fabricator, warden, feral, cult) — 8-12 lines each
- [ ] Lines organized by trigger context: harvesting, combat, storm, idle, movement, discovery
- [ ] `botSpeech.ts` system selects lines based on bot archetype speech profile + current activity + world state
- [ ] Uses `gameplayRandom` (seeded PRNG), NOT `Math.random()`
- [ ] Cooldown prevents speech spam (configurable in JSON, default: 1 speech per bot per 5 turns)
- [ ] System exports `getActiveSpeechBubbles(): Array<{entityId, text, expiresAtTurn}>` for UI consumption
- [ ] Register system in `registerSystems.ts` tick phases
- [ ] Tests: at least 5 covering profile selection, cooldown, context matching, PRNG determinism, expiry

---

### US-005: Cultist reactive escalation
**Description:** As a player, I want cultist pressure to respond to my expansion (not just time) so threats feel like consequences of my growth.

**Touches:** `src/systems/cultistIncursion.ts`, `config/cultists.json` (or relevant config)

**Acceptance Criteria:**
- [ ] Cultist spawn rate scales with player territory size (cells owned), not just turn count
- [ ] Spawn rate also scales with proximity to breach zones
- [ ] Config-driven thresholds: territory milestones (10, 25, 50, 100 cells) trigger escalation tiers
- [ ] Each tier increases spawn frequency and optionally unlocks stronger cultist unit types
- [ ] Existing cultist tests updated to cover reactive escalation
- [ ] New tests: territory-driven spawn scaling (at least 3 threshold tests)

---

### US-006: Accessibility overhaul (P1 issues)
**Description:** As a player using keyboard or screen reader, I want all interactive elements to have proper semantics so I can navigate and use the game.

**Touches:** `src/ui/TitleScreen.tsx`, `src/ui/NewGameModal.tsx`, `src/ui/components/HudButton.tsx`, `src/ui/components/HudPanel.tsx`

**Acceptance Criteria:**
- [ ] H1: LOAD GAME button renders on title screen (asset exists at `assets/ui/buttons/load_game.png`)
- [ ] H2: All clickable elements have `role="button"` and `aria-label`
- [ ] H3: Document title set to "Syntheteria" (not "app")
- [ ] H4: Button images have meaningful `alt` text
- [ ] H5: Focus-visible styles (outline or glow) on all interactive elements
- [ ] H6: Modal backdrop on NewGameModal (dark overlay behind modal)
- [ ] H7: CANCEL and GENERATE WORLD buttons visible without scrolling
- [ ] H8: NewGameModal has X button and backdrop click-to-close
- [ ] H9: Focus trap in NewGameModal (`role="dialog"`, `aria-modal="true"`)
- [ ] H10: Selection options have `role="radio"` and `aria-checked`
- [ ] H11: Selected state has sufficient contrast (WCAG 1.4.11)
- [ ] H12: Seed input has `aria-label` or linked `<label>`
- [ ] Verify all fixes in browser

---

### US-007: Unit renderer — cultist identity + Mark badges + damage states
**Description:** As a player, I want to visually distinguish cultist units from my bots, see Mark level indicators, and see damage states so I can make tactical decisions at a glance.

**Touches:** `src/rendering/UnitRenderer.tsx`, `src/rendering/GlowRingRenderer.tsx`

**Acceptance Criteria:**
- [ ] Cultist units render with distinct visual treatment (red/purple tint, particle aura, or color shift)
- [ ] Player units show Mark level badge (I-V) as floating text or icon above unit
- [ ] Mark badge color scales with level (I=white, II=green, III=blue, IV=purple, V=gold)
- [ ] Damaged components shown via visual degradation (reduced glow, sparking particles, or desaturation)
- [ ] All visual properties driven by ECS component state, not hardcoded
- [ ] Tests for badge rendering logic (Mark level → badge color mapping)
- [ ] Verify in browser: cultist vs player unit distinction is clear at default zoom

---

### US-008: Mark upgrade radial action
**Description:** As a player, I want to upgrade a unit's Mark level at the Motor Pool via the radial menu so I can progress my best units.

**Touches:** `src/systems/radialProviders.ts`, `src/systems/motorPool.ts`

**Acceptance Criteria:**
- [ ] New radial action "Upgrade" appears when selecting a unit adjacent to a Motor Pool
- [ ] Action shows required resources and target Mark level
- [ ] Action is disabled with tooltip if: insufficient resources, Motor Pool tier too low, already max Mark
- [ ] On confirm: resources deducted, unit Mark level incremented, upgrade timer starts
- [ ] Motor Pool tier gates: Basic=Mark I→II, Advanced=Mark I→III, Elite=Mark I→V
- [ ] Mark IV-V only via upgrade (not fabrication) — enforce this in Motor Pool queue
- [ ] Config-driven upgrade costs from `config/` (not hardcoded)
- [ ] Tests: resource check, tier gate, upgrade success, max Mark rejection

---

### US-009: Hacking capture flow
**Description:** As a player, I want to hack a hostile bot and convert it to my faction so I can gain new unit types (ranged, siege) through the Exterminate pillar.

**Touches:** `src/systems/hackingSystem.ts`, `src/ui/RadialMenu.tsx` (action entry)

**Acceptance Criteria:**
- [ ] Radial action "Hack" appears when selecting a player unit adjacent to a hostile bot
- [ ] Hack requires: signal link active + required technique researched + sufficient compute
- [ ] Hack progress bar shows over target (multi-turn process)
- [ ] On completion: hostile bot faction changes to player, gains player's speech profile
- [ ] Hacked Arachnoid → light melee specialist, MechaTrooper → ranged, QuadrupedTank → siege
- [ ] Hacking fails if signal link is broken (target moves out of range) — progress resets
- [ ] Tests: hack success, hack failure (broken link), compute check, faction conversion

---

### US-010: Tech tree visible effects
**Description:** As a player, I want completed tech research to noticeably change gameplay so the tech tree feels meaningful, not cosmetic.

**Touches:** `src/systems/techTree.ts`, connected systems (combat, harvest, exploration)

**Acceptance Criteria:**
- [ ] At least 5 researched techs produce measurable gameplay effects (not just unlocks)
- [ ] Example effects: "Improved Harvesting" → +50% harvest yield, "Storm Shielding" → -30% storm damage, "Signal Boost" → +2 vision radius
- [ ] Effects applied via the tech tree's existing effect system (config-driven)
- [ ] Effects visible in HUD tooltips (hover over resource/stat shows tech modifier)
- [ ] Verify tech effects in `config/techTree.json` (or relevant config) — not hardcoded
- [ ] Tests: at least 3 tech effects verified through system integration

---

### US-011: Diplomacy gameplay consequences
**Description:** As a player, I want trade, alliance, and war declarations to produce real gameplay effects so diplomacy is a strategic tool, not a menu.

**Touches:** `src/systems/diplomacy.ts`

**Acceptance Criteria:**
- [ ] Trade agreements: partner faction shares a percentage of harvest income per turn
- [ ] Alliance: allied factions share fog of war (mutual visibility)
- [ ] War declaration: territory border cells become contested, hostile units may enter
- [ ] Breaking a trade/alliance incurs a standing penalty with ALL factions (reputation cost)
- [ ] AI governors react to diplomatic state: allies don't attack, enemies prioritize contested borders
- [ ] All thresholds and percentages config-driven
- [ ] Tests: trade income, alliance visibility, war territory contest, reputation penalty

---

### US-012: Victory pacing + balance
**Description:** As a player, I want a full campaign (any victory path) to last 80-150 turns with escalating challenge so the game feels neither rushed nor interminable.

**Touches:** `src/systems/victoryConditions.ts`, relevant config files

**Acceptance Criteria:**
- [ ] Subjugation victory requires controlling >60% of discovered territory — config-driven threshold
- [ ] Technical supremacy requires all Mark V units + all techs researched — verify checkable at runtime
- [ ] Wormhole victory requires collecting EL Crystals + reaching wormhole — verify progression gates
- [ ] Turn-count soft cap: storm intensity escalates after turn 120, forcing resolution
- [ ] AI factions progress toward victory at calibrated rates (not too fast, not stalled)
- [ ] Simulate 3 test games (different seeds): verify victory achievable in 80-150 turn range
- [ ] Tests: victory condition thresholds, storm escalation timing

---

### US-013: Storm/wormhole VFX coherence
**Description:** As a player, I want the storm and wormhole to form a cohesive environmental spectacle — the wormhole visible at the hypercane eye, storm intensity visually dramatic.

**Touches:** `src/rendering/StormSky.tsx`, `src/rendering/StormParticles.tsx`, `src/rendering/WormholeRenderer.tsx`, `src/rendering/StormEnvironment.tsx`

**Acceptance Criteria:**
- [ ] Wormhole glow at zenith syncs with storm intensity (brighter during surges)
- [ ] Wormhole is a persistent visual presence from mid-game onward (not just endgame structure)
- [ ] Storm particle density visually matches intensity value (0.0 = clear, 1.0 = torrential)
- [ ] Lightning frequency correlates with storm intensity
- [ ] Storm color grade shifts per storm profile (standard, surge, calm)
- [ ] All storm parameters driven by `weather.ts` system state — renderers don't invent weather logic
- [ ] Verify in browser: storm feels like a cohesive weather system, not disconnected effects

---

### US-014: Construction animation stages
**Description:** As a player, I want to see buildings being constructed in stages (foundation → shell → operational) so expansion feels tangible.

**Touches:** `src/rendering/ConstructionRenderer.tsx`

**Acceptance Criteria:**
- [ ] Construction progresses through 3 visible stages: foundation (wireframe/outline), shell (partial geometry), operational (full model)
- [ ] Stage transitions driven by build progress percentage from `buildingPlacement.ts`
- [ ] Each stage has distinct visual treatment (opacity, color, particle effects)
- [ ] Construction particles (sparks, dust) during active building ticks
- [ ] Completed construction has a brief "power-on" flash effect
- [ ] Tests: stage selection based on progress percentage
- [ ] Verify in browser: build a structure, observe staged construction

---

### US-015: Fix P2 UI polish issues
**Description:** As a player, I want a polished UI without overlapping text, crowded buttons, or deprecation warnings so the game feels finished.

**Touches:** `src/ui/panels/GameHUD.tsx`, `src/ui/panels/TopBar.tsx`, `src/ui/panels/SimControl.tsx`

**Acceptance Criteria:**
- [ ] M1: "STORM COMMAND UPLINK" header does not overlap with thought overlay text
- [ ] M2: SIM CONTROL panel buttons have adequate spacing, usable at mobile widths
- [ ] M3: Resource strip layout responds to viewport width without overflow
- [ ] M4: Minimap only renders after world is ready (not during loading)
- [ ] M5: POI tooltip deferred until world is interactive
- [ ] M6: Fix deprecation warnings: `shadow*` → `boxShadow`, `props.pointerEvents` → `style.pointerEvents`, `THREE.Clock` → `THREE.Timer`
- [ ] M7: Fix require cycle: `src/bots/index.ts ↔ src/bots/startingRoster.ts`
- [ ] M8: Canvas crash fallback uses dark industrial theme color, not alarm red
- [ ] Verify in browser: no overlapping elements, no console deprecation warnings

---

### US-016: AI factions produce visible world changes
**Description:** As a player, I want to see rival factions building structures, expanding territory, and moving units so I know I have real opponents.

**Touches:** `src/systems/governorSystem.ts`, `src/systems/aiCivilization.ts`, rendering integration

**Acceptance Criteria:**
- [ ] When an AI faction builds, the player sees construction animation in discovered territory
- [ ] When an AI faction expands, territory borders shift visibly (TerritoryBorderRenderer already exists)
- [ ] AI scout units appear at the player's fog edge (visible contact)
- [ ] AI harvest actions produce visible HarvestVisualRenderer effects
- [ ] AI actions logged to a "faction activity" feed (data only — UI is a separate story)
- [ ] Governor decisions wired to real-time renderer effects (not just ECS state mutations)
- [ ] Tests: AI build produces construction event, AI expand updates territory borders

---

### DEPTH 1 — Builds on foundation (7 parallel)

---

### US-017: Gate systems behind world-ready flag
**Description:** As a developer, I want game systems gated behind a "world ready" flag so they don't tick before the world is loaded, preventing the "No structural fragment" crash (989 errors/tick).

**Depends on:** US-001

**Touches:** `src/ecs/gameState.ts`, `src/systems/registerSystems.ts`

**Acceptance Criteria:**
- [ ] Add `worldReady` boolean to game state (default false)
- [ ] Set `worldReady = true` after world generation completes and structural space is populated
- [ ] `enemySystem`, `simulationTick`, and other world-dependent systems skip if `!worldReady`
- [ ] Zero console errors during loading phase
- [ ] Tests: systems produce no output when worldReady is false

---

### US-018: Fix UI layer mount sequencing
**Description:** As a player, I want UI layers to appear in order (loading alone → world ready → HUD fade in → tooltips on interaction) instead of all rendering simultaneously.

**Depends on:** US-001

**Touches:** `src/ui/GameUI.tsx`

**Acceptance Criteria:**
- [ ] Loading overlay renders alone during world generation
- [ ] After world ready: loading overlay fades out, then HUD fades in
- [ ] Thought/mentor overlays appear only after HUD is visible
- [ ] POI tooltips appear only on user interaction (not during loading)
- [ ] State machine or ordered phase system controls layer visibility
- [ ] Tests: layer visibility state machine transitions
- [ ] Verify in browser: clean sequenced entry from loading to gameplay

---

### US-019: Speech bubble R3F renderer
**Description:** As a player, I want to see speech bubbles above bots in the 3D scene so their contextual dialogue is spatially grounded.

**Depends on:** US-004

**Touches:** NEW `src/rendering/SpeechBubbleRenderer.tsx`, `src/GameScene.tsx`

**Acceptance Criteria:**
- [ ] Renderer consumes `getActiveSpeechBubbles()` from `botSpeech.ts`
- [ ] Speech bubble positioned above unit in 3D space (billboard facing camera)
- [ ] Bubble styled with industrial theme (dark panel, cyan text, thin border)
- [ ] Bubble fades in on appear, fades out on expiry (2-3 second display)
- [ ] Maximum 3 simultaneous bubbles visible (hide oldest if exceeded)
- [ ] Mount renderer in `GameScene.tsx`
- [ ] Add corresponding `jest.mock` in `appSmoke.test.tsx`
- [ ] Verify in browser: bot speech appears as floating bubble above unit

---

### US-020: Unified asset resolution for all asset types
**Description:** As a developer, I want ALL asset references (models, textures, audio, UI images) to go through `resolveAssetUri()` so there's one loading pipeline.

**Depends on:** US-003

**Touches:** `src/audio/` loaders, `src/ui/` image refs, `src/rendering/` texture loaders

**Acceptance Criteria:**
- [ ] Audit all asset loading paths outside `resolveAssetUri()` (models already use it)
- [ ] Audio assets: move paths to JSON config, load via `resolveAssetUri()`
- [ ] UI image assets: move paths to JSON config where not already (brand assets may stay as static imports)
- [ ] Floor textures: already handled by US-003
- [ ] Zero hardcoded file paths in `.ts` source files for loadable assets
- [ ] Tests: verify unified resolution for at least audio + UI + texture paths

---

### US-021: Floor fills viewport — no void edges
**Description:** As a player, I want the floor to fill my entire viewport with no dark void at the edges so the ecumenopolis feels continuous.

**Depends on:** US-003

**Touches:** `src/rendering/StructuralFloorRenderer.tsx`

**Acceptance Criteria:**
- [ ] Floor geometry extends beyond camera frustum edges (overdraw by 1-2 chunks)
- [ ] Camera panning never reveals void/black beyond the floor edge
- [ ] Undiscovered cells render with a dark "fog" texture (not invisible/void)
- [ ] Performance: floor overdraw does not drop below 30fps on mobile
- [ ] Verify in browser: pan camera to all edges, no void visible

---

### US-022: Verify core gameplay loop in browser
**Description:** As a player, I want to complete a basic gameplay loop (select unit → move → harvest → build → end turn → save → load) so I know the game works end-to-end.

**Depends on:** US-001

**Touches:** verification only — no code changes unless bugs found

**Acceptance Criteria:**
- [ ] Launch game in browser, world renders (floor visible, units visible)
- [ ] Select a unit via click/tap — radial menu appears
- [ ] Move unit (spending MP) — unit relocates, MP decremented
- [ ] Harvest a structure (spending AP) — resources gained, structure consumed
- [ ] Build a structure (spending AP + resources) — construction starts
- [ ] End turn — AP/MP refresh, AI factions take turns, environment phase runs
- [ ] Save game — verify save slot created
- [ ] Load game — verify same state restored
- [ ] Document any bugs found as issues (do not fix in this story)

---

### US-023: Rival faction encounters at fog edge
**Description:** As a player, I want to encounter rival faction scouts near the edge of my explored territory so expansion feels contested.

**Depends on:** US-016

**Touches:** `src/ai/`, `src/systems/exploration.ts`

**Acceptance Criteria:**
- [ ] AI scout units patrol toward the player's territory border
- [ ] Player sees rival scouts appear at fog edge as they explore
- [ ] First contact triggers a diplomatic notification (faction discovered)
- [ ] Rival scouts retreat if outmatched, engage if they have numerical advantage
- [ ] Encounter frequency scales with mid-game progression (not turn 1)
- [ ] Tests: scout patrol toward player border, first contact event fires

---

### DEPTH 2 — Integration layer (5 parallel)

---

### US-024: Asset manifest validation at startup
**Description:** As a developer, I want a startup check that validates all referenced assets exist so missing assets are caught before gameplay, not during.

**Depends on:** US-020

**Touches:** NEW `src/config/assetValidation.ts`

**Acceptance Criteria:**
- [ ] On app startup, iterate all asset paths defined in JSON configs
- [ ] For each path, verify the file is resolvable via `resolveAssetUri()`
- [ ] If ANY asset is missing, throw with a clear error listing ALL missing assets (not just the first)
- [ ] Validation runs before world generation starts
- [ ] Can be disabled via config flag for development (but ON by default)
- [ ] Tests: validation passes with complete assets, throws with removed asset

---

### US-025: Bot speech wired to AI + game events
**Description:** As a player, I want bot speech to react to AI faction events and game state changes so speech feels emergent, not random.

**Depends on:** US-019, US-016

**Touches:** `src/systems/botSpeech.ts` (extends US-004)

**Acceptance Criteria:**
- [ ] Bots comment on nearby AI faction activity ("Hostile construction detected", "Enemy scouts nearby")
- [ ] Bots react to combat events ("Taking fire!", "Target down")
- [ ] Bots react to environmental changes ("Storm intensifying", "Lightning close")
- [ ] Speech triggered by proximity to events (within vision radius), not global state
- [ ] Warden/Guardian bots have defensive speech; Strikers have aggressive speech
- [ ] Tests: event-triggered speech, proximity filtering, profile-appropriate lines

---

### US-026: Zone transition blending
**Description:** As a player, I want soft visual blends between floor biomes (command → fabrication → breach) so the ecumenopolis feels continuous, not grid-like.

**Depends on:** US-021

**Touches:** `src/rendering/StructuralFloorRenderer.tsx`

**Acceptance Criteria:**
- [ ] Adjacent cells of different zone types blend at their shared edge
- [ ] Blend width: 10-20% of cell size (configurable)
- [ ] Blend uses texture interpolation or alpha masking (not hard edges)
- [ ] Breach zone boundaries have a distinctive glow/crack effect (not soft blend)
- [ ] Performance: blending does not add >2ms per frame
- [ ] Verify in browser: zone transitions look smooth, breach zones look threatening

---

### US-027: Chunk boundary system
**Description:** As a developer, I want a chunk coordinate system that maps world positions to chunks with deterministic seeding so the infinite ecumenopolis can generate on demand.

**Depends on:** US-021

**Touches:** NEW `src/world/chunks.ts`, NEW `src/world/__tests__/chunks.test.ts`

**Acceptance Criteria:**
- [ ] Define chunk as an 8×8 cell region (configurable)
- [ ] `worldToChunk(worldX, worldZ)` → `{chunkX, chunkZ}` coordinate mapping
- [ ] `chunkToSeed(worldSeed, chunkX, chunkZ)` → deterministic chunk seed
- [ ] Same chunk seed always produces identical terrain/structures
- [ ] Chunk adjacency: `getAdjacentChunks(chunkX, chunkZ)` returns 8 neighbors
- [ ] Tests: coordinate mapping, seed determinism, adjacency correctness

---

### US-028: Verify new gameplay features in browser
**Description:** As a player, I want to verify that Mark upgrades and hacking capture work in an actual gameplay session.

**Depends on:** US-022, US-008, US-009

**Touches:** verification only — no code changes unless bugs found

**Acceptance Criteria:**
- [ ] Build a Motor Pool, select adjacent unit, radial menu shows "Upgrade"
- [ ] Upgrade a unit from Mark I to Mark II — resources deducted, Mark badge updates
- [ ] Find hostile bot, select adjacent player unit, radial menu shows "Hack"
- [ ] Complete hack — hostile bot converts to player faction
- [ ] Hacked bot appears with player color/glow and responds to player commands
- [ ] Document any bugs found as issues

---

### DEPTH 3 — World streaming (3 parallel)

---

### US-029: Camera-driven chunk loading
**Description:** As a player, I want new chunks to generate as I pan the camera so exploration feels infinite.

**Depends on:** US-027

**Touches:** `src/rendering/` camera integration, `src/world/chunks.ts`

**Acceptance Criteria:**
- [ ] Camera position tracked each frame; when camera enters a new chunk region, adjacent chunks load
- [ ] Chunks beyond 3-chunk radius from camera are unloaded (geometry removed, state cached)
- [ ] Chunk loading is async (doesn't block render frame)
- [ ] Loading indicator for chunks being generated (subtle shimmer at edges)
- [ ] Performance: chunk load < 100ms, no frame drops during streaming
- [ ] Tests: chunk load trigger on camera move, unload on distance

---

### US-030: Chunk-scoped fog of war
**Description:** As a developer, I want discovery state stored and streamed per chunk so fog of war works with infinite worlds.

**Depends on:** US-027

**Touches:** `src/systems/exploration.ts`, `src/world/structuralSpace.ts`

**Acceptance Criteria:**
- [ ] Discovery state stored per chunk (not global array)
- [ ] When a chunk loads, its discovery state is restored from cache or initialized as undiscovered
- [ ] When a chunk unloads, its discovery state is persisted to cache
- [ ] Unit vision still reveals cells — now scoped to the chunk the unit is in + adjacent chunks
- [ ] Tests: per-chunk discovery, cache round-trip, cross-chunk vision

---

### US-031: Delta persistence for chunks
**Description:** As a developer, I want only player modifications saved per chunk (not the entire procedural baseline) so save files stay small with infinite worlds.

**Depends on:** US-027

**Touches:** `src/db/worldPersistence.ts`

**Acceptance Criteria:**
- [ ] Save format stores chunk deltas: harvested structures, player-built structures, modified terrain
- [ ] On load: regenerate chunk from seed, then apply deltas
- [ ] Unmodified chunks have zero storage cost
- [ ] Save file size scales with player activity, not world size
- [ ] Backward compatible with existing fixed-grid saves (migration path)
- [ ] Tests: delta save/load round-trip, unmodified chunk zero-cost

---

### DEPTH 4 — Final integration (2 parallel)

---

### US-032: Instanced rendering per chunk
**Description:** As a developer, I want instanced building rendering scoped to loaded chunks so performance doesn't degrade with world size.

**Depends on:** US-029, US-030, US-031

**Touches:** `src/rendering/InstancedBuildingRenderer.tsx`

**Acceptance Criteria:**
- [ ] Instance buffers partitioned by chunk (one instanced mesh per chunk)
- [ ] When chunk loads: create instance buffer, populate with structures
- [ ] When chunk unloads: dispose instance buffer
- [ ] Total draw calls bounded by loaded chunk count (not total structure count)
- [ ] Performance: 1000+ structures across 9 loaded chunks at 30fps on mobile
- [ ] Tests: instance buffer lifecycle (create on load, dispose on unload)

---

### US-033: Full campaign integration verification
**Description:** As a player, I want to play a complete campaign (50+ turns) encountering all major systems so the game feels like a cohesive 1.0 experience.

**Depends on:** US-025, US-026, US-028

**Touches:** verification only — no code changes unless bugs found

**Acceptance Criteria:**
- [ ] Start new game, play 50+ turns hitting all major systems
- [ ] Bot speech appears during gameplay (at least 5 distinct lines seen)
- [ ] AI factions visibly build and expand (construction animations, territory shifts)
- [ ] Rival scouts encountered at fog edge
- [ ] Storm intensity visibly changes, lightning strikes occur
- [ ] Tech research produces visible effects
- [ ] Save mid-game, reload, continue without state loss
- [ ] At least one victory condition reachable within the session
- [ ] Document any remaining polish items as issues

---

## Functional Requirements

- FR-01: All asset paths defined in JSON config files, loaded via `resolveAssetUri()`. Zero hardcoded paths in `.ts` source.
- FR-02: Missing asset at load time → hard crash with error naming the asset. Zero silent fallbacks.
- FR-03: All gameplay-affecting randomness uses seeded PRNG (`gameplayRandom`), never `Math.random()`.
- FR-04: All tunable values (costs, thresholds, cooldowns, multipliers) come from JSON config, not inline constants.
- FR-05: Renderers consume system state. Renderers NEVER invent gameplay logic.
- FR-06: Bot speech is emergent (archetype + context + world state), not scripted trigger sequences.
- FR-07: AI faction actions produce visible world changes (construction, territory, unit movement).
- FR-08: Chunk generation is deterministic from `worldSeed + chunkKey`. Same inputs = same output.
- FR-09: Only player modifications (deltas) are persisted. Procedural baseline regenerates from seed.
- FR-10: Touch-first: every interaction works with fingers. Min tap target 44×44dp.
- FR-11: R3F Canvas mounts without errors on web. Zero console errors during loading.
- FR-12: All interactive elements have ARIA roles, labels, and focus-visible styles.

## Non-Goals (Out of Scope for 1.0)

- Multiplayer / networked play
- Localization / i18n
- Spectator mode or replay system
- iOS/Android native builds (web-first, native later)
- Custom color schemes or theme settings
- Procedural audio (Tone.js basics only)
- System theme auto-detection
- Map editor or modding support
- Leaderboards or cloud saves
- Interactive fiction or branching story

## Technical Considerations

- **Bundler:** Metro (Expo). No Vite. Packages using `import.meta` in ESM break — use `unstable_conditionNames` in metro.config.js.
- **ECS:** Koota (not Miniplex). All gameplay state in ECS traits.
- **Testing:** Jest + ts-jest (CJS mode via `tsconfig.test.json`). Playwright for E2E.
- **Formatting:** Biome (tabs, double quotes, sorted imports).
- **State pattern:** Module-level `Map` state with `_reset()` for test cleanup.
- **R3F smoke tests:** Every renderer added to `GameScene.tsx` needs a `jest.mock()` entry in `appSmoke.test.tsx`.
- **Chunk system:** Uses `worldSeed + chunkKey` for deterministic generation. Delta-only persistence.

## Success Metrics

- Game launches in browser without errors (canvas mounts, floor renders, units visible)
- A new player can complete a basic gameplay loop within 5 minutes of starting
- AI factions visibly compete (player sees rival construction, territory shifts, scout encounters)
- Bot speech appears at least once every 3-5 turns during active gameplay
- Full campaign playable in 80-150 turns with all 3 victory paths achievable
- Zero silent asset fallbacks in codebase
- Zero TypeScript errors, zero test failures, zero biome lint errors

## Open Questions

1. What is the right number of speech lines per profile to feel varied? 8-12 suggested, may need playtesting.
3. Should cultist escalation have a cap, or should pressure increase indefinitely to force resolution?
4. What frame budget should chunk loading target on mobile devices?
5. Should the asset manifest validation run in production, or only in development?
[/PRD]
