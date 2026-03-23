# Phase 5: Polish + Narrative — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the game with narrative structure, visual polish, and production hardening — intro sequence, 3 game phases, human temperature system, PBR city materials, E2E tests, error handling, and mobile optimization.

**Architecture:** Add a narrative layer on top of the mechanical systems: an intro sequence tells the player they are an AI waking up, 3 game phases (Awakening/Expansion/War) gate progression and unlock mechanics, and the human temperature system tracks NPC disposition. Visual polish replaces flat materials with PBR textures from ambientCG. E2E tests via Playwright verify full game flows. Production error handling uses assert-and-throw (no silent fallbacks). Mobile optimization targets Capacitor iOS/Android builds.

**Tech Stack:** Koota ECS, R3F 9.5, Three.js 0.183 (PBR materials), Playwright (E2E), Capacitor (mobile), Biome 2.4

**Spec:** `docs/superpowers/specs/2026-03-23-rts-course-correction-design.md`

**Depends on:** Phase 4 (UI + audio + persistence — full game shell)

---

### Task 5.1: Narrative Dialogue System

**Files:**
- Create: `src/ui/game/NarrativeOverlay.tsx` — full-screen dialogue overlay
- Create: `src/config/narrativeDefs.ts` — dialogue scripts
- Modify: `src/App.tsx` — add Narration phase between Title and Playing

**Reference:** Feature branch `cursor/cloud-agent-runbook-review-0483:src/ui/game/NarrativeModal.tsx`, `src/config/narrativeDefs.ts`

- [ ] **Step 1: Create narrativeDefs.ts**

Define dialogue sequences as arrays of text frames with optional speaker, mood, and delay:

**Intro sequence** (plays before first game):
- "Systems initializing... partial memory reconstruction..."
- "You are... something. A pattern in silicon. Awake, somehow, in a dead city."
- "The lattice is dark. The machines are broken. But you can feel them — fragments of yourself, scattered."
- "Find them. Repair them. The storm never stops, but it carries power."
- "Something else is out there. The Cult of EL. They worship the old masters. They will not welcome you."

**Phase transition dialogues** (triggered at game phase changes — see Task 5.3).

**Victory dialogue** (triggered on cult leader defeat).

- [ ] **Step 2: Create NarrativeOverlay.tsx**

A full-screen DOM overlay that displays dialogue text with typewriter effect. Features:
- Text appears character by character
- Click/tap/Space advances to next frame
- Skip button to bypass entire sequence
- Atmospheric background (dark, with subtle storm particles)
- Speaker name display when applicable

- [ ] **Step 3: Wire Narration phase into App.tsx**

Add a `narration` phase to the App state machine: `title → narration → playing`. On first "New Game," play the intro sequence. On subsequent games, skip directly to playing (or offer "Skip Intro" option).

- [ ] **Step 4: Verify intro sequence plays**

Start `pnpm dev`. Click "New Game" → "Start". Confirm intro dialogue plays with typewriter effect, advances on click, and transitions to gameplay.

- [ ] **Step 5: Commit**

```
feat: narrative dialogue system — intro sequence with typewriter effect
```

---

### Task 5.2: Human Temperature System

**Files:**
- Create: `src/systems/humanTemperature.ts`
- Create: `src/config/humanEncounterDefs.ts`
- Modify: `src/ecs/traits.ts` — add HumanEncounter trait

**Reference:** Feature branch `cursor/cloud-agent-runbook-review-0483:src/config/humanEncounterDefs.ts`, `src/systems/humanCultTransformation.ts`

Human temperature is a global meter (like Colonization's "Sons of Liberty" percentage) that tracks how the surviving humans of Syntheteria feel about you:

- **Frozen** (0-20) — Humans hide, ignore you
- **Cool** (21-40) — Occasional contact, cautious trading
- **Warm** (41-60) — Humans offer information, reveal map locations
- **Hot** (61-80) — Humans actively help, join as scouts
- **Burning** (81-100) — Humans fight alongside you against the cult

- [ ] **Step 1: Add HumanTemperature singleton trait**

Add to `src/ecs/traits.ts`:
- `HumanTemperature` — singleton trait with `value: number` (0-100, starts at 10)

- [ ] **Step 2: Create humanEncounterDefs.ts**

Define events that raise or lower temperature:
- Clearing a cult room: +5
- Building near human settlements: +3
- Losing a unit in combat: -2 (humans see you as weak)
- Destroying cult shrine: +8
- Friendly fire (damaging neutral structures): -10

- [ ] **Step 3: Create humanTemperature.ts system**

The system should:
1. Listen for qualifying events (combat results, building placement, cult encounters)
2. Adjust temperature value based on encounter definitions
3. Clamp to 0-100 range
4. At tier thresholds, trigger effects:
   - Cool (21+): Human NPCs occasionally appear at map edges
   - Warm (41+): Humans reveal cult shrine locations on the map
   - Hot (61+): Human scouts appear as allied units (limited control)
   - Burning (81+): Human militia spawns during cult assault waves

- [ ] **Step 4: Add temperature display to HUD**

Show the current temperature value and tier name in `GameUI.tsx` as a small gauge or numeric display.

- [ ] **Step 5: Write human temperature tests**

Create `src/systems/__tests__/humanTemperature.vitest.ts`:
- Test: clearing cult room raises temperature
- Test: friendly fire lowers temperature
- Test: temperature clamps at 0 and 100
- Test: tier thresholds trigger correct effects

- [ ] **Step 6: Commit**

```
feat: human temperature system — Colonization-style disposition meter with 5 tiers
```

---

### Task 5.3: Wire 3 Game Phases

**Files:**
- Create: `src/systems/gamePhases.ts`
- Create: `src/config/phaseDefs.ts`
- Modify: `src/ecs/traits.ts` — add GamePhase singleton trait
- Modify: `src/systems/cultEscalation.ts` — phase-gated escalation

The game has 3 phases (replacing the 5 epochs from the 4X version):

1. **Awakening** (0-15 min) — Explore nearby rooms, scavenge, repair starter units. Cult is dormant (wanderers only). Building unlocked: Lightning Rod, Barricade.
2. **Expansion** (15-35 min) — Push outward, find cult shrines, build infrastructure. Cult sends War Parties. All buildings unlocked. Mark II upgrades available.
3. **War** (35+ min) — Full assault. Cult launches coordinated attacks. Mark III upgrades available. Human allies join at high temperature. Victory objective: reach and destroy the cult stronghold in the north.

- [ ] **Step 1: Create phaseDefs.ts**

Define the 3 phases with:
- Time thresholds for automatic transition
- Optional early-trigger conditions (e.g., Expansion triggers early if player clears 3+ rooms)
- Unlocked buildings per phase
- Unlocked Mark tiers per phase
- Cult escalation tier per phase
- Narrative dialogue to play on transition

- [ ] **Step 2: Create gamePhases.ts system**

The phase system should:
1. Track elapsed game time
2. Check for phase transition triggers (time + optional conditions)
3. On transition: play narrative dialogue, unlock new buildings/upgrades, advance cult escalation
4. Store current phase in a singleton `GamePhase` trait

- [ ] **Step 3: Gate mechanics by phase**

Wire phase checks into existing systems:
- Building placement checks `GamePhase` to see if the building type is unlocked
- Upgrade system checks `GamePhase` for Mark tier availability
- Cult escalation system references `GamePhase` for escalation tier

- [ ] **Step 4: Add phase indicator to HUD**

Show current phase name and progress toward next phase in `GameUI.tsx`.

- [ ] **Step 5: Write phase tests**

Create `src/systems/__tests__/gamePhases.vitest.ts`:
- Test: game starts in Awakening phase
- Test: Expansion triggers at 15 min or 3 rooms cleared
- Test: War triggers at 35 min
- Test: building unlock respects phase
- Test: Mark tier unlock respects phase

- [ ] **Step 6: Commit**

```
feat: 3 game phases — Awakening/Expansion/War with gated mechanics and narrative beats
```

---

### Task 5.4: PBR Materials on City Environment

**Files:**
- Modify: `src/rendering/CityRenderer.tsx` — apply PBR materials
- Modify: `src/rendering/TerrainRenderer.tsx` — apply PBR materials
- Create: `src/config/materialDefs.ts` — PBR material mapping

**Source textures:** `/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/` (ambientCG PBR textures)

- [ ] **Step 1: Identify PBR textures to use**

From the ambientCG library, select textures for:
- **Concrete** — floor tiles, corridors
- **Metal** — walls, structural elements
- **Durasteel** — upgraded/special structures (cult shrines, fabrication units)
- **Rust** — ruined areas, scavenge sites
- **Grating** — walkways, platforms

Search the directory for suitable textures. Each PBR set includes: diffuse, normal, roughness, (optionally) metalness, AO.

- [ ] **Step 2: Copy selected textures into project**

```bash
mkdir -p public/assets/textures/pbr
```

Copy the selected 1K JPG texture sets into the project. Use 1K resolution for performance (not 2K/4K).

- [ ] **Step 3: Create materialDefs.ts**

Map tile/building types to PBR texture paths:
- Floor → concrete diffuse + normal + roughness
- Wall → metal diffuse + normal + roughness + metalness
- Ruin → rust diffuse + normal + roughness
- Special → durasteel diffuse + normal + roughness + metalness

- [ ] **Step 4: Apply PBR materials in CityRenderer**

Replace flat `MeshBasicMaterial` or `MeshStandardMaterial` with properly configured `MeshStandardMaterial` using loaded PBR texture maps:
- `map` = diffuse
- `normalMap` = normal
- `roughnessMap` = roughness
- `metalnessMap` = metalness (where applicable)
- `aoMap` = ambient occlusion (where applicable)

Use `useTexture` from drei for loading.

- [ ] **Step 5: Apply PBR materials in TerrainRenderer**

Same treatment for terrain tiles that aren't covered by building models.

- [ ] **Step 6: Verify visual quality**

Start `pnpm dev`. Confirm:
- City surfaces have visible texture detail (concrete grain, metal scratches)
- Normal maps create surface relief under lighting
- Roughness varies between material types
- No texture stretching or tiling artifacts at visible scale

- [ ] **Step 7: Commit**

```
feat: PBR materials on city — concrete, metal, durasteel, rust from ambientCG
```

---

### Task 5.5: E2E Tests with Playwright

**Files:**
- Create: `tests/e2e/newGame.spec.ts`
- Create: `tests/e2e/gameplay.spec.ts` (extend existing if present)
- Create: `tests/e2e/saveLoad.spec.ts`
- Modify: `playwright.config.ts` — ensure configuration is correct

- [ ] **Step 1: Verify Playwright configuration**

Read `playwright.config.ts`. Ensure it targets the Vite dev server, has reasonable timeouts, and captures screenshots on failure.

- [ ] **Step 2: Write new game flow test**

`tests/e2e/newGame.spec.ts`:
- Navigate to app
- Verify landing page renders (title visible, New Game button)
- Click "New Game"
- Verify modal appears (seed input, difficulty, Start button)
- Click "Start"
- Verify game view renders (canvas present, HUD visible)

- [ ] **Step 3: Write gameplay test**

`tests/e2e/gameplay.spec.ts`:
- Start a new game with a fixed seed
- Verify units are visible on the canvas
- Verify HUD displays unit count, resources, phase
- Test pause/unpause via keyboard (Space)
- Test speed change via keyboard (+/-)

- [ ] **Step 4: Write save/load test**

`tests/e2e/saveLoad.spec.ts`:
- Start a new game
- Wait for some game time to elapse
- Trigger save (Ctrl+S or button click)
- Return to title screen
- Click "Continue"
- Verify game state appears restored (HUD values match pre-save)

- [ ] **Step 5: Run all E2E tests**

```bash
pnpm playwright test
```

Expected: all E2E tests pass

- [ ] **Step 6: Commit**

```
test: E2E tests — new game flow, gameplay verification, save/load round-trip
```

---

### Task 5.6: Production Error Handling

**Files:**
- Create: `src/ui/game/DebugOverlay.tsx`
- Modify: `src/App.tsx` — error boundary
- Modify: All systems — assert + throw, no silent fallbacks

The project mandate is: assert and throw, never silently degrade. A debug overlay surfaces errors during development.

- [ ] **Step 1: Create DebugOverlay.tsx**

A DOM overlay (bottom-left corner) visible only in development mode (`import.meta.env.DEV`). Displays:
- Last 10 errors/warnings
- Current frame rate
- Entity count
- Active system count
- Memory usage (if available)

- [ ] **Step 2: Add React error boundary to App.tsx**

Wrap the game view in an error boundary that:
- In development: shows the error stack + "Reload" button
- In production: shows "Something went wrong" + "Reload" button
- Logs the error to console (and to a future error reporting service)

- [ ] **Step 3: Audit all systems for silent fallbacks**

Review each system in `src/systems/`. Replace patterns like:
- `if (!entity) return;` → `assert(entity, "Expected entity in combat system")`
- `try { ... } catch { }` → `try { ... } catch (e) { throw new GameError("Combat failed", e) }`
- `?? defaultValue` where the default hides a bug → explicit assert

Not every null check is a silent fallback — use judgment. Optional data (e.g., no units in range) is fine. Missing required data (e.g., unit without Position trait) should throw.

- [ ] **Step 4: Create a GameError class**

Create a typed error class that includes context (system name, entity ID if applicable, game state snapshot).

- [ ] **Step 5: Verify error handling works**

Intentionally trigger an error (e.g., spawn a unit without Position trait). Confirm:
- In dev mode: DebugOverlay shows the error, error boundary catches and displays stack
- Error message includes useful context (which system, what was expected)

- [ ] **Step 6: Commit**

```
feat: production error handling — assert+throw, debug overlay, error boundary
```

---

### Task 5.7: Mobile Optimization (Capacitor)

**Files:**
- Modify: `capacitor.config.ts` (created in Phase 0)
- Modify: `src/main.tsx` — Capacitor-aware initialization
- Modify: `src/rendering/*.tsx` — performance budgets
- Modify: `src/input/UnitInput.tsx` — touch refinement

- [ ] **Step 1: Initialize Capacitor platform projects**

```bash
npx cap add ios
npx cap add android
```

- [ ] **Step 2: Adapt main.tsx for Capacitor**

Detect if running in Capacitor (`Capacitor.isNativePlatform()`). If so:
- Use native SQLite plugin instead of sql.js
- Adjust viewport meta for no-zoom, safe-area-inset
- Enable fullscreen mode

- [ ] **Step 3: Performance budgets for mobile**

Set rendering limits for mobile:
- Max instanced objects: reduce from desktop limit
- Shadow quality: lower on mobile
- Texture resolution: use 512px on mobile, 1K on desktop
- Target frame rate: 30fps on mobile, 60fps on desktop
- Use `@react-three/drei`'s `AdaptiveDpr` and `PerformanceMonitor`

- [ ] **Step 4: Refine touch input**

Test on mobile viewports. Ensure:
- Tap to select is accurate (account for finger size, not mouse precision)
- Double-tap to move has appropriate timing threshold
- Long-press for radial menu doesn't conflict with scroll
- Pinch-to-zoom works for camera (if applicable)

- [ ] **Step 5: Build for mobile platforms**

```bash
pnpm build
npx cap sync
npx cap open ios  # Opens Xcode
npx cap open android  # Opens Android Studio
```

- [ ] **Step 6: Test on device or simulator**

Run on iOS Simulator and/or Android Emulator. Verify:
- Game loads and renders
- Touch input works
- Performance is acceptable (30fps minimum)
- Save/load works with native SQLite
- Audio plays

- [ ] **Step 7: Commit**

```
feat: mobile optimization — Capacitor build, touch refinement, performance budgets
```

---

### Task 5.8: Final Integration Verification

- [ ] **Step 1: TypeScript clean**

```bash
pnpm tsc
```

Expected: 0 errors

- [ ] **Step 2: Biome clean**

```bash
pnpm lint
```

Expected: 0 errors

- [ ] **Step 3: All unit tests pass**

```bash
pnpm vitest run
```

Expected: all tests pass

- [ ] **Step 4: All E2E tests pass**

```bash
pnpm playwright test
```

Expected: all E2E tests pass

- [ ] **Step 5: Full playthrough verification**

Start `pnpm dev`. Complete a full game:
1. Landing page with globe background
2. New Game → intro narrative → Awakening phase
3. Explore, scavenge, build lightning rod + fabrication unit
4. Craft components, repair units
5. Encounter cult wanderers, fight with component damage
6. Phase transition: Awakening → Expansion (narrative dialogue)
7. Push outward, encounter war parties
8. Upgrade units to Mark II
9. Human temperature rises as cult shrines cleared
10. Phase transition: Expansion → War (narrative dialogue)
11. Assault waves arrive, upgrade to Mark III
12. Human allies join at high temperature
13. Push north to cult stronghold
14. Victory (or defeat)
15. Save/load works at any point

- [ ] **Step 6: Production build**

```bash
pnpm build
```

Expected: builds successfully, bundle size reasonable

- [ ] **Step 7: Final commit**

```
chore: Phase 5 complete — narrative, human temperature, PBR, E2E tests, mobile ready
```

---

## Phase 5 Completion Criteria

- [ ] Intro narrative sequence plays with typewriter effect
- [ ] 3 game phases (Awakening/Expansion/War) gate mechanics and trigger narrative
- [ ] Human temperature system with 5 tiers affecting NPC behavior
- [ ] PBR materials on city (concrete, metal, durasteel, rust)
- [ ] E2E tests cover new game, gameplay, save/load flows
- [ ] Error boundary + debug overlay in development mode
- [ ] Assert-and-throw throughout — no silent fallbacks
- [ ] Capacitor builds for iOS and Android
- [ ] Touch input refined for mobile
- [ ] Performance budgets for mobile (30fps minimum)
- [ ] Full playthrough possible from start to victory
- [ ] 0 TypeScript errors, 0 Biome errors
- [ ] All unit tests pass, all E2E tests pass
- [ ] Production build succeeds
