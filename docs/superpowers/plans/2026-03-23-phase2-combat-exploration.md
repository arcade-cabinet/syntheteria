# Phase 2: Combat + Exploration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game playable with combat and exploration — units move via pathfinding, fight cult enemies that escalate over time, and reveal the map through fragment-merge fog-of-war.

**Architecture:** Port the component damage system (camera/arms/legs/power_cell, not HP bars) and fragment merge fog-of-war to Koota. Wire the 3 cult mech archetypes as enemies with Yuka GOAP behavior (patrol/aggro/escalate). Build a navmesh from the labyrinth grid for A* pathfinding. Implement RTS-style unit selection and movement commands (click to select, right-click to move/attack).

**Tech Stack:** Koota ECS, Yuka.js (GOAP + NavGraph + A*), R3F 9.5, Three.js 0.183

**Spec:** `docs/superpowers/specs/2026-03-23-rts-course-correction-design.md`

**Depends on:** Phase 1 (labyrinth city + GLB models + game loop)

---

### Task 2.1: Port Component Damage System to Koota

**Files:**
- Modify: `src/systems/combat.ts`
- Modify: `src/ecs/traits.ts` — ensure `UnitComponents` trait is complete
- Reference: Original `src/systems/combat.ts` and `src/ecs/types.ts` (component helpers)

The signature mechanic: robots have 4 components (camera, arms, legs, power_cell), each with `functional: boolean` and `material: string`. Damage disables components, not HP. A robot with no functional camera can't see. A robot with no functional legs can't move.

- [ ] **Step 1: Verify component damage helpers exist in Koota types**

Confirm `hasCamera()`, `hasArms()`, `hasFunctionalComponent()`, `getBrokenComponents()`, `getFunctionalComponents()` from `src/ecs/types.ts` work with the Koota `UnitComponents` trait's `componentsJson` field. If they reference the old Entity interface, update them to accept parsed component arrays.

- [ ] **Step 2: Port combat.ts to use Koota queries**

The combat system should:
1. Query all units with `Position`, `Unit`, `UnitComponents`, `Faction`
2. For each pair of opposing-faction units within attack range, roll damage
3. Damage targets a random component, setting `functional: false`
4. A unit with ALL components non-functional is destroyed (remove entity)

Ensure the system reads/writes `UnitComponents` via Koota's `entity.get()` / `entity.set()`.

- [ ] **Step 3: Add combat range calculation**

Use `Position` trait to compute distance between units. Attack range should come from the unit's archetype config (melee vs ranged). Reference `src/config/robotDefs.ts` pattern from the spec's target structure.

- [ ] **Step 4: Write combat tests**

Create `src/systems/__tests__/combat.vitest.ts`:
- Test: damage disables a specific component
- Test: unit with all components disabled is destroyed
- Test: units of same faction don't attack each other
- Test: attack range is respected

- [ ] **Step 5: Commit**

```
feat: port component damage combat system to Koota — no HP, component-level damage
```

---

### Task 2.2: Port Fragment Merge Fog-of-War to Koota

**Files:**
- Modify: `src/systems/exploration.ts`
- Modify: `src/systems/fragmentMerge.ts`
- Modify: `src/rendering/TerrainRenderer.tsx` — fog rendering

Fragment merge: tiles start hidden. When a unit explores adjacent tiles, those tiles join the unit's "fragment." When two fragments' tiles touch, they merge into one revealed region. This creates an organic, growing visibility map.

- [ ] **Step 1: Port exploration.ts to Koota**

The exploration system should:
1. Query all player units with `Position` and `Fragment`
2. For each unit, reveal tiles within vision range (affected by `hasCamera()`)
3. Assign revealed tiles to the unit's fragment ID
4. Mark newly revealed tiles in the board data

- [ ] **Step 2: Port fragmentMerge.ts to Koota**

The merge system should:
1. After exploration reveals tiles, check if any two fragments now share adjacent tiles
2. If so, merge them: all tiles in the smaller fragment adopt the larger fragment's ID
3. Update all entities in the merged fragment

- [ ] **Step 3: Wire fog rendering in TerrainRenderer**

Unrevealed tiles render as dark/black. Revealed tiles render normally. Previously-revealed-but-no-unit-present tiles render dimmed (fog of war, not fog of exploration).

- [ ] **Step 4: Write fog-of-war tests**

Create `src/systems/__tests__/exploration.vitest.ts`:
- Test: exploring a tile reveals it
- Test: camera-less unit has reduced vision range
- Test: two fragments merge when adjacent tiles are revealed
- Test: merged fragments share one fragment ID

- [ ] **Step 5: Commit**

```
feat: port fragment merge fog-of-war to Koota — organic visibility growth
```

---

### Task 2.3: Wire Cult Mechs as Enemies

**Files:**
- Create: `src/config/cultDefs.ts` — cult mech definitions
- Create: `src/robots/CultMechs.ts` (extract from feature branch)
- Modify: `src/systems/enemies.ts` — cult spawning
- Modify: `src/ecs/factory.ts` — cult entity spawning

**Source:** `cursor/cloud-agent-runbook-review-0483:src/robots/CultMechs.ts`

**Assets:**
- `public/assets/models/robots/cult/Mecha01.glb`
- `public/assets/models/robots/cult/MechaGolem.glb`
- `public/assets/models/robots/cult/MechaTrooper.glb`

- [ ] **Step 1: Extract CultMechs.ts from feature branch**

```bash
git show cursor/cloud-agent-runbook-review-0483:src/robots/CultMechs.ts > src/robots/CultMechs.ts
```

Adapt to the new trait structure. The 3 cult mech types should have component loadouts defined.

- [ ] **Step 2: Create cultDefs.ts**

Define 3 cult mech archetypes with stats:
- **Mecha01** (Wanderer) — weak, patrols alone, low aggro range
- **MechaGolem** (Brute) — heavy, slow, high damage, appears in war parties
- **MechaTrooper** (Assault) — fast, ranged, appears in assault waves

Include GLB model paths, component loadouts, aggro ranges, and damage values.

- [ ] **Step 3: Add cult mech spawning to enemies.ts**

The enemy system should spawn cult mechs:
- Initial: scatter Wanderers in unexplored rooms
- Cult POI rooms always have Brutes guarding them
- As the game progresses (see Task 2.4), War Parties and Assault waves spawn

- [ ] **Step 4: Add cult unit rendering**

Update `src/rendering/UnitRenderer.tsx` to handle cult faction units, loading their GLB models from the cult model paths. Use the `Faction` trait to distinguish player vs cult rendering.

- [ ] **Step 5: Write cult spawning tests**

Create `src/systems/__tests__/enemies.vitest.ts`:
- Test: initial spawn places Wanderers in unexplored rooms
- Test: cult POI rooms have Brute guards
- Test: cult units have the "cultist" faction

- [ ] **Step 6: Commit**

```
feat: wire 3 cult mech types as enemies — Wanderer, Brute, Assault with GLB models
```

---

### Task 2.4: Implement Cult Escalation

**Files:**
- Modify: `src/systems/enemies.ts`
- Create: `src/systems/cultEscalation.ts`

**Reference:** `cursor/cloud-agent-runbook-review-0483:src/systems/cultEscalation.ts`, `src/systems/cultSpawning.ts`, `src/systems/cultConstants.ts`

The cult escalates in 3 tiers based on game time:

1. **Wanderers** (0-10 min) — lone Mecha01 units patrol corridors
2. **War Parties** (10-25 min) — groups of 2-3 mixed mechs patrol aggressively
3. **Assault Waves** (25+ min) — coordinated waves push toward player base

- [ ] **Step 1: Create cultEscalation.ts system**

Track elapsed game time. At tier thresholds, increase spawn rates and unlock higher-tier cult units. The system should:
1. Maintain an escalation level (1/2/3)
2. At level transitions, spawn a burst of new cult units
3. Increase ambient patrol density at each level

- [ ] **Step 2: Wire escalation into the game loop**

Add `cultEscalation` system to the tick order in `gameState.ts`, running after the main enemy spawn system.

- [ ] **Step 3: Reference feature branch escalation patterns**

Extract the escalation timing constants and spawn logic patterns from `cursor/cloud-agent-runbook-review-0483:src/systems/cultEscalation.ts` and `src/systems/cultConstants.ts`. Simplify for single-faction use.

- [ ] **Step 4: Write escalation tests**

Create `src/systems/__tests__/cultEscalation.vitest.ts`:
- Test: escalation level starts at 1
- Test: level advances to 2 after time threshold
- Test: level 2 spawns War Parties (mixed mech groups)
- Test: level 3 spawns Assault Waves

- [ ] **Step 5: Commit**

```
feat: cult escalation — 3-tier threat ramp from wanderers to assault waves
```

---

### Task 2.5: Wire Yuka GOAP for Cult Behavior

**Files:**
- Create: `src/ai/cultBehavior.ts`
- Reference: `cursor/cloud-agent-runbook-review-0483:src/ai/goals/*.ts`, `src/ai/fsm/FactionFSM.ts`

**Dependencies:** `yuka` (already in package.json from feature branch, or add it)

Cult units need autonomous behavior. Use Yuka GOAP with simplified goal evaluators:

- [ ] **Step 1: Install Yuka if not present**

```bash
pnpm add yuka
```

- [ ] **Step 2: Create cultBehavior.ts with 3 behaviors**

Define Yuka `GoalEvaluator` subclasses:
- **PatrolGoal** — pick a random corridor tile, walk to it, repeat
- **AggroGoal** — if player unit within detection range, move toward and attack
- **EscalateGoal** — at escalation tier 3, coordinate with nearby cult units to form assault groups

Each cult entity gets a Yuka `Vehicle` with a `Think` goal that evaluates these three options each tick.

- [ ] **Step 3: Wire Yuka vehicles to Koota entities**

Maintain a Map from Koota entity ID to Yuka Vehicle. On cult entity spawn, create a Vehicle. On entity destroy, remove the Vehicle. Each tick, sync Position between Koota and Yuka.

- [ ] **Step 4: Wire cult AI into the game loop**

Add a `cultAI` system call to `gameState.ts` that runs Yuka's `EntityManager.update(delta)` each tick.

- [ ] **Step 5: Write GOAP behavior tests**

Create `src/ai/__tests__/cultBehavior.vitest.ts`:
- Test: idle cult unit selects PatrolGoal
- Test: cult unit near player switches to AggroGoal
- Test: PatrolGoal moves unit toward target tile

- [ ] **Step 6: Commit**

```
feat: Yuka GOAP for cult AI — patrol, aggro, escalate behaviors
```

---

### Task 2.6: Navmesh Pathfinding

**Files:**
- Modify: `src/systems/navmesh.ts`
- Modify: `src/systems/pathfinding.ts`
- Modify: `src/systems/movement.ts`

**Reference:** Original `src/systems/navmesh.ts`, `src/systems/pathfinding.ts`, `src/systems/movement.ts`

- [ ] **Step 1: Generate navmesh from labyrinth grid**

After the labyrinth generates, build a Yuka `NavGraph` from walkable tiles. Each walkable tile becomes a node. Edges connect adjacent walkable tiles. Wall tiles are excluded.

- [ ] **Step 2: Port pathfinding.ts to use navmesh A***

When a unit receives a move command, run A* on the NavGraph to find a path. Store the path in the `Navigation` trait as a series of waypoints.

- [ ] **Step 3: Port movement.ts to follow navigation paths**

The movement system should:
1. Query units with `Position`, `Navigation` where `moving === true`
2. Move unit toward next waypoint at `Unit.speed * delta`
3. When reaching a waypoint, advance `pathIndex`
4. When final waypoint reached, set `moving = false`

- [ ] **Step 4: Write pathfinding tests**

Create `src/systems/__tests__/pathfinding.vitest.ts`:
- Test: path exists between two walkable tiles
- Test: path avoids wall tiles
- Test: no path returns empty array
- Test: movement along path reaches destination

- [ ] **Step 5: Commit**

```
feat: navmesh pathfinding — A* on labyrinth grid via Yuka NavGraph
```

---

### Task 2.7: Unit Selection + RTS Input

**Files:**
- Modify: `src/input/UnitInput.tsx`
- Modify: `src/input/TopDownCamera.tsx`

**Reference:** Original `src/input/UnitInput.tsx`, `src/input/TopDownCamera.tsx`

- [ ] **Step 1: Port unit selection to Koota**

Left-click on a unit: set `Unit.selected = true` for that entity, false for all others. Support box select (click-drag rectangle). Show selection indicator (ring/highlight) on selected units.

- [ ] **Step 2: Port movement commands**

Right-click on a walkable tile: issue a move command to all selected units. This triggers pathfinding (Task 2.6) and sets `Navigation.moving = true`.

- [ ] **Step 3: Port attack commands**

Right-click on an enemy unit: issue an attack-move command. Selected units pathfind to the enemy's position and enter combat range.

- [ ] **Step 4: Touch support**

Tap = select. Double-tap = move. Long-press = attack. Ensure touch events map to the same command system as mouse events.

- [ ] **Step 5: Wire visual feedback**

Selected units show a selection ring. Move commands show a brief waypoint indicator. Attack commands show a brief red indicator on the target.

- [ ] **Step 6: Verify input works end-to-end**

Start dev server. Confirm:
- Click a unit to select it (ring appears)
- Right-click a tile to move (unit pathfinds and walks)
- Right-click an enemy to attack (unit approaches and fights)
- Camera WASD + scroll still works

- [ ] **Step 7: Commit**

```
feat: RTS input — unit selection, move commands, attack commands with touch support
```

---

### Task 2.8: Integration Verification

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

Expected: all tests pass (labyrinth, combat, fog, enemies, pathfinding, cult AI)

- [ ] **Step 4: Gameplay verification**

Start `pnpm dev`. Confirm:
- Select units and move them through the labyrinth
- Fog-of-war reveals tiles as units explore
- Fragment merge works when two explored regions touch
- Cult Wanderers patrol corridors
- Combat triggers when player units meet cult units
- Component damage disables unit capabilities (blind without camera, immobile without legs)
- Cult escalation increases threat over time

- [ ] **Step 5: Production build**

```bash
pnpm build
```

Expected: builds successfully

- [ ] **Step 6: Commit**

```
chore: Phase 2 complete — combat, exploration, cult AI, pathfinding, RTS input
```

---

## Phase 2 Completion Criteria

- [ ] Component damage system works (4 components per robot, disable individually)
- [ ] Fragment merge fog-of-war reveals map organically
- [ ] 3 cult mech types spawn and behave autonomously (Yuka GOAP)
- [ ] Cult escalation ramps from wanderers to war parties to assault waves
- [ ] Navmesh A* pathfinding through labyrinth corridors
- [ ] Unit selection (click/tap) and movement commands (right-click/double-tap)
- [ ] Attack commands trigger combat
- [ ] Touch input support
- [ ] All tests pass (combat, fog, enemies, pathfinding, cult AI)
- [ ] 0 TypeScript errors, 0 Biome errors
- [ ] Production build succeeds
- [ ] Gameplay verification: can select units, move them, fight cultists, explore the map
