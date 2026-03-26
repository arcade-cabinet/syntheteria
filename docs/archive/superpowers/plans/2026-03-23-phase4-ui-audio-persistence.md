> **Historical Document (2026-03-23):** This document was written before the BabylonJS + Reactylon pivot. The architecture described here (R3F/Vite/Miniplex) has been superseded. See [CLAUDE.md](/CLAUDE.md) for current architecture.

# Phase 4: UI + Audio + Persistence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the game shell — landing page with globe background, audio (SFX + procedural music + storm ambience), save/load via Capacitor SQLite, and game speed controls. After this phase, the game is a full loop: start, play, save, load, with sound.

**Architecture:** Port the landing UI (LandingScreen, NewGameModal) and R3F globe from the feature branch as the menu experience. Port the Tone.js audio system (SFX, procedural music, storm ambience) directly. Adapt the Capacitor SQLite persistence layer to serialize/deserialize Koota world state. Game speed controls wire into the existing tick loop from Phase 1.

**Tech Stack:** Koota ECS, R3F 9.5, Tone.js, Capacitor SQLite (sql.js for web), React 19

**Spec:** `docs/superpowers/specs/2026-03-23-rts-course-correction-design.md`

**Depends on:** Phase 3 (economy + building — full gameplay systems)

---

### Task 4.1: Port Landing Page from Feature Branch

**Files:**
- Create: `src/ui/landing/LandingScreen.tsx`
- Create: `src/ui/landing/NewGameModal.tsx`
- Modify: `src/App.tsx` — wire Title phase to LandingScreen

**Source:** `cursor/cloud-agent-runbook-review-0483:src/ui/landing/LandingScreen.tsx`, `src/ui/landing/NewGameModal.tsx`

- [ ] **Step 1: Extract landing UI files from feature branch**

```bash
mkdir -p src/ui/landing
git show cursor/cloud-agent-runbook-review-0483:src/ui/landing/LandingScreen.tsx > src/ui/landing/LandingScreen.tsx
git show cursor/cloud-agent-runbook-review-0483:src/ui/landing/NewGameModal.tsx > src/ui/landing/NewGameModal.tsx
```

- [ ] **Step 2: Adapt LandingScreen for RTS context**

The feature branch LandingScreen was designed for the 4X game. Simplify:
- Remove faction selection (single player)
- Remove map size/type options (labyrinth is fixed-format)
- Keep: game seed input, difficulty selector, "New Game" button, "Continue" button (for save/load)
- Update title text and styling to match RTS identity

- [ ] **Step 3: Adapt NewGameModal**

Simplify the new game modal:
- Seed input (text field, auto-generates if empty)
- Difficulty selector (Easy / Normal / Hard — affects cult escalation speed)
- "Start" button triggers board generation + game phase transition

- [ ] **Step 4: Wire into App.tsx phase machine**

`App.tsx` manages phases: `title | playing`. When on `title`, render `LandingScreen`. When "Start" is clicked, transition to `playing` (generate board, spawn entities, start game loop).

- [ ] **Step 5: Verify landing page renders**

Start `pnpm dev`. Confirm the landing screen appears with title, new game button, and modal works.

- [ ] **Step 6: Commit**

```text
feat: landing page — LandingScreen + NewGameModal adapted from feature branch
```

---

### Task 4.2: Port R3F Globe as Menu Background

**Files:**
- Create: `src/ui/landing/GlobeBackground.tsx`
- Create: `src/ui/landing/title/TitleMenuScene.tsx`
- Create: `src/ui/landing/title/shaders.ts`

**Source:** `cursor/cloud-agent-runbook-review-0483:src/ui/Globe.tsx`, `src/ui/landing/title/TitleMenuScene.tsx`, `src/ui/landing/title/shaders.ts`

- [ ] **Step 1: Extract globe and title scene files from feature branch**

```bash
mkdir -p src/ui/landing/title
git show cursor/cloud-agent-runbook-review-0483:src/ui/Globe.tsx > src/ui/landing/GlobeBackground.tsx
git show cursor/cloud-agent-runbook-review-0483:src/ui/landing/title/TitleMenuScene.tsx > src/ui/landing/title/TitleMenuScene.tsx
git show cursor/cloud-agent-runbook-review-0483:src/ui/landing/title/shaders.ts > src/ui/landing/title/shaders.ts
```

- [ ] **Step 2: Adapt Globe as a background-only component**

The feature branch Globe was the main game canvas. Here it is purely decorative — a slowly rotating sphere with storm atmosphere behind the landing screen UI. Strip out:
- Board data rendering
- Unit rendering
- Input handling
- Camera controls

Keep:
- Sphere geometry with storm sky shader
- Atmospheric glow
- Slow auto-rotation

- [ ] **Step 3: Compose in LandingScreen**

Render `GlobeBackground` as a full-screen R3F Canvas behind the landing screen DOM overlay. The globe provides visual atmosphere; the DOM elements sit on top.

- [ ] **Step 4: Verify globe renders behind landing UI**

Start `pnpm dev`. Confirm: spinning globe with storm atmosphere visible behind the landing screen buttons and text.

- [ ] **Step 5: Commit**

```text
feat: R3F globe as menu background — storm atmosphere behind landing page
```

---

### Task 4.3: Port Audio System

**Files:**
- Create: `src/audio/audioEngine.ts`
- Create: `src/audio/sfx.ts`
- Create: `src/audio/music.ts`
- Create: `src/audio/ambience.ts`
- Create: `src/audio/index.ts`

**Source:** `cursor/cloud-agent-runbook-review-0483:src/audio/*.ts`

- [ ] **Step 1: Extract all audio files from feature branch**

```bash
mkdir -p src/audio
for f in audioEngine.ts sfx.ts music.ts ambience.ts index.ts; do
  git show cursor/cloud-agent-runbook-review-0483:src/audio/${f} > src/audio/${f}
done
```

Note: If these were already extracted in Phase 0 Task 0.11, skip this step and proceed to adaptation.

- [ ] **Step 2: Adapt audioEngine.ts**

The audio engine initializes Tone.js and manages the audio context. Ensure:
- Lazy initialization on first user interaction (browser autoplay policy)
- Master volume control
- Mute toggle
- Clean teardown on unmount

- [ ] **Step 3: Adapt sfx.ts for RTS events**

Map sound effects to game events:
- Unit selected (click)
- Unit moved (movement command)
- Combat hit (component damage)
- Component destroyed (component goes non-functional)
- Building placed
- Fabrication complete
- Scavenging (ambient scraping)
- Cult unit spotted (alert)

The feature branch SFX may have different event names — remap to match RTS events.

- [ ] **Step 4: Adapt music.ts**

The feature branch has procedural music generation via Tone.js. Keep the core synthesis engine. Adapt the mood/intensity to RTS context:
- Calm: exploring, no enemies nearby
- Tense: cult units spotted in fog
- Combat: active fighting
- Dread: escalation tier 3 assault wave

- [ ] **Step 5: Adapt ambience.ts**

The storm ambience loop provides atmospheric audio. Keep as-is — the perpetual storm is central to the game's identity.

- [ ] **Step 6: Wire audio into game events**

Connect the audio system to game state:
- SFX triggers from system callbacks (combat, building, etc.)
- Music mood changes based on game state (combat nearby, escalation tier)
- Ambience plays continuously during gameplay
- All audio pauses when game is paused (speed 0x)

- [ ] **Step 7: Add audio controls to UI**

Add volume slider and mute button to the game HUD (`src/ui/GameUI.tsx`) and settings section of the landing page.

- [ ] **Step 8: Verify audio plays**

Start `pnpm dev`. Confirm:
- Storm ambience plays during gameplay
- Music plays and shifts mood
- SFX triggers on unit actions
- Mute/volume controls work
- Audio respects pause state

- [ ] **Step 9: Commit**

```text
feat: audio system — Tone.js SFX, procedural music, storm ambience from feature branch
```

---

### Task 4.4: Port Capacitor SQLite Persistence

**Files:**
- Create: `src/db/adapter.ts`
- Create: `src/db/capacitorAdapter.ts`
- Create: `src/db/gameRepo.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/migrations.ts`
- Create: `src/db/serialize.ts`
- Create: `src/db/types.ts`
- Create: `src/db/index.ts`
- Modify: `src/App.tsx` — wire save/load

**Source:** `cursor/cloud-agent-runbook-review-0483:src/db/*.ts`

- [ ] **Step 1: Extract DB files from feature branch**

```bash
mkdir -p src/db
for f in adapter.ts capacitorAdapter.ts gameRepo.ts schema.ts migrations.ts serialize.ts types.ts index.ts; do
  git show cursor/cloud-agent-runbook-review-0483:src/db/${f} > src/db/${f}
done
```

- [ ] **Step 2: Adapt schema.ts for RTS entity model**

The feature branch schema was designed for the 4X game with factions, diplomacy, etc. Simplify to:
- `games` table — game metadata (seed, difficulty, elapsed time, save date)
- `tiles` table — tile grid state (x, z, terrain type, explored, fragment ID, scavenge remaining)
- `units` table — unit entities (type, mark, position, faction, components JSON, inventory JSON)
- `buildings` table — building entities (type, position, powered, operational)
- `lightning_rods` table — rod entities (position, capacity, output)

- [ ] **Step 3: Rewrite serialize.ts for Koota**

The feature branch serializer worked with the old Koota 4X trait model. Rewrite to:
- **Save:** Query all Koota entities, extract trait data, insert into SQLite tables
- **Load:** Read SQLite tables, spawn Koota entities with appropriate traits
- Handle the `UnitComponents.componentsJson` field (already JSON, store as TEXT)
- Handle the `Navigation.pathJson` field (store as TEXT)

- [ ] **Step 4: Wire save/load into App.tsx**

Add save/load actions:
- **Save:** Pause game, serialize world to SQLite, resume
- **Load:** From landing screen "Continue" button, read save, deserialize into Koota world, transition to playing phase
- **Auto-save:** Every 5 minutes (configurable)

- [ ] **Step 5: Add save/load UI**

Add a save button to `GameUI.tsx` (Ctrl+S / button in HUD). Add a load/continue button to `LandingScreen.tsx` that shows available saves.

- [ ] **Step 6: Ensure SQLite is non-fatal**

If the DB fails (permissions, corruption), the game should continue running from ECS in memory. Log the error but don't crash. Save/load buttons show "unavailable" state.

- [ ] **Step 7: Write persistence tests**

Create `src/db/__tests__/serialize.vitest.ts`:
- Test: save creates valid SQLite records
- Test: load restores entities with correct trait values
- Test: round-trip (save → load) preserves game state
- Test: component damage state survives serialization
- Test: DB failure doesn't crash the game

- [ ] **Step 8: Commit**

```text
feat: Capacitor SQLite persistence — save/load with Koota serialization
```

---

### Task 4.5: Wire Game Speed Controls

**Files:**
- Modify: `src/ecs/gameState.ts` — speed multiplier
- Modify: `src/ui/GameUI.tsx` — speed control buttons
- Create: `src/config/gameSpeedDefs.ts`

**Reference:** Feature branch `cursor/cloud-agent-runbook-review-0483:src/config/gameSpeedDefs.ts`

- [ ] **Step 1: Extract game speed definitions**

```bash
git show cursor/cloud-agent-runbook-review-0483:src/config/gameSpeedDefs.ts > src/config/gameSpeedDefs.ts
```

Adapt if needed. The 5 speeds are: 0x (paused), 0.5x, 1x, 2x, 4x.

- [ ] **Step 2: Wire speed controls into GameUI**

Add speed control buttons to the HUD:
- Pause button (||)
- Speed buttons (0.5x, 1x, 2x, 4x)
- Current speed indicator
- Keyboard shortcuts: Space = pause/unpause, +/- = increase/decrease speed

- [ ] **Step 3: Ensure all systems respect speed multiplier**

Verify that `delta * speedMultiplier` is passed to every system in the tick loop. At 0x, no systems tick. At 4x, everything runs 4x faster. Audio system should also adjust (music tempo, SFX rate if applicable).

- [ ] **Step 4: Write speed control tests**

Add tests to existing game loop tests:
- Test: pause (0x) stops system execution
- Test: 2x speed doubles system delta
- Test: speed change persists across frames

- [ ] **Step 5: Commit**

```text
feat: game speed controls — pause/0.5x/1x/2x/4x with keyboard shortcuts
```

---

### Task 4.6: Integration Verification

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

- [ ] **Step 3: All tests pass**

```bash
pnpm vitest run
```

Expected: all tests pass (including new persistence tests)

- [ ] **Step 4: Full session verification**

Start `pnpm dev`. Play through a full session:
1. Landing page appears with globe background and storm atmosphere
2. Click "New Game" — modal appears with seed and difficulty
3. Click "Start" — labyrinth generates, game begins
4. Audio plays: storm ambience + music + SFX on actions
5. Play for a minute (move units, scavenge, build)
6. Save the game (Ctrl+S or HUD button)
7. Return to title screen
8. Click "Continue" — save loads, game state restored
9. Verify: unit positions, inventory, buildings, fog state all match pre-save state
10. Test speed controls: pause, 0.5x, 1x, 2x, 4x
11. Volume/mute controls work

- [ ] **Step 5: Production build**

```bash
pnpm build
```

Expected: builds successfully

- [ ] **Step 6: Commit**

```text
chore: Phase 4 complete — landing page, audio, save/load, speed controls
```

---

## Phase 4 Completion Criteria

- [ ] Landing page with LandingScreen + NewGameModal
- [ ] R3F globe rotates behind landing page as atmospheric background
- [ ] New game flow: seed input → difficulty → start → labyrinth generates → gameplay
- [ ] Audio plays: storm ambience (continuous), procedural music (mood-reactive), SFX (on actions)
- [ ] Audio controls: volume slider, mute toggle, respects pause
- [ ] Save game to Capacitor SQLite (manual + auto-save every 5 min)
- [ ] Load game restores full state (units, buildings, inventory, fog, board)
- [ ] SQLite failure is non-fatal (game continues in memory)
- [ ] Game speed controls: 0x/0.5x/1x/2x/4x with keyboard shortcuts
- [ ] All persistence round-trip tests pass
- [ ] 0 TypeScript errors, 0 Biome errors
- [ ] Production build succeeds
- [ ] Full session verification: start → play → save → load → resume with audio
