> **Historical Document (2026-03-23):** This document was written before the BabylonJS + Reactylon pivot. The architecture described here (R3F/Vite/Miniplex) has been superseded. See [CLAUDE.md](/CLAUDE.md) for current architecture.

# Phase 3: Economy + Building — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the resource loop — scavenge ruins for parts, fabricate components at powered workshops, place and power buildings with lightning rods, repair damaged robots, and upgrade units through Mark I/II/III progression via the radial menu.

**Architecture:** Port the existing resource, fabrication, power, repair, and building placement systems from the original game to Koota. Add the Mark I/II/III upgrade path as a new system driven by the radial menu. Resources are physical (scavenged from ruins, carried by units) not abstract (no global stockpile ticking up). Power comes from lightning rods harvesting the perpetual storm. Buildings require adjacent power to operate.

**Tech Stack:** Koota ECS, R3F 9.5, Three.js 0.183, Radial menu (DOM overlay)

**Spec:** `docs/superpowers/specs/2026-03-23-rts-course-correction-design.md`

**Depends on:** Phase 2 (combat + pathfinding + unit selection)

---

### Task 3.1: Port Resource Scavenging System

**Files:**
- Modify: `src/systems/resources.ts`
- Modify: `src/ecs/traits.ts` — add resource-related traits
- Create: `src/config/materials.ts` — resource material definitions

**Reference:** Original `src/systems/resources.ts`, feature branch `cursor/cloud-agent-runbook-review-0483:src/config/resourceDefs.ts`

- [ ] **Step 1: Define resource traits**

Add to `src/ecs/traits.ts`:
- `Inventory` trait — array of material/quantity pairs carried by a unit
- `ScavengeSite` trait — marks a tile as containing scavengeable materials, with remaining quantity

- [ ] **Step 2: Create materials.ts config**

Define the resource materials used in the game:
- **Scrap Metal** — common, from ruins
- **Circuitry** — uncommon, from tech rooms
- **Power Cells** — rare, from cult structures
- **Durasteel** — rare, from deep ruins

Reference `cursor/cloud-agent-runbook-review-0483:src/config/resourceDefs.ts` for the pattern, but simplify to these 4 core materials.

- [ ] **Step 3: Port resources.ts to Koota**

The scavenging system should:
1. Query units with `Position`, `Unit`, `Inventory` at a `ScavengeSite` tile
2. If unit is idle and at a scavenge site, transfer materials from site to unit inventory
3. Scavenge takes time (several seconds per unit)
4. When site is depleted, remove `ScavengeSite` trait from tile

- [ ] **Step 4: Seed scavenge sites in the labyrinth**

During board generation, mark ruin rooms and corridor dead-ends as scavenge sites. Tech rooms get circuitry, cult rooms get power cells, normal ruins get scrap metal.

- [ ] **Step 5: Write resource tests**

Create `src/systems/__tests__/resources.vitest.ts`:
- Test: unit at scavenge site collects materials over time
- Test: depleted site stops yielding
- Test: unit inventory tracks collected materials
- Test: scavenge rate respects game speed

- [ ] **Step 6: Commit**

```text
feat: resource scavenging — strip ruins for scrap, circuitry, power cells, durasteel
```

---

### Task 3.2: Port Fabrication System

**Files:**
- Modify: `src/systems/fabrication.ts`
- Modify: `src/ecs/traits.ts` — fabrication-related traits
- Create: `src/config/recipeDefs.ts` — fabrication recipes

**Reference:** Original `src/systems/fabrication.ts`, feature branch `cursor/cloud-agent-runbook-review-0483:src/systems/fabricationSystem.ts`, `src/config/recipeDefs.ts`

- [ ] **Step 1: Create recipeDefs.ts**

Define fabrication recipes — what materials are needed to build each component:
- Camera: 2 Circuitry + 1 Scrap Metal
- Arms: 3 Scrap Metal + 1 Circuitry
- Legs: 3 Scrap Metal + 1 Durasteel
- Power Cell: 2 Power Cells + 1 Circuitry

Each recipe also has a fabrication time.

- [ ] **Step 2: Port fabrication.ts to Koota**

The fabrication system should:
1. Query `Building` entities where `buildingType === "fabrication_unit"` and `powered === true`
2. Check if a unit is adjacent with materials matching a recipe
3. Consume materials, start fabrication timer
4. On completion, produce the component (add to unit's inventory or directly repair)

- [ ] **Step 3: Wire fabrication UI feedback**

Show a progress bar over the fabrication building while crafting. Show the recipe cost in the unit's radial menu (Phase 3.6).

- [ ] **Step 4: Write fabrication tests**

Create `src/systems/__tests__/fabrication.vitest.ts`:
- Test: fabrication consumes correct materials
- Test: unpowered fabrication unit refuses to craft
- Test: fabrication timer completes after specified duration
- Test: insufficient materials prevents crafting

- [ ] **Step 5: Commit**

```text
feat: fabrication system — craft components from scavenged materials at powered workshops
```

---

### Task 3.3: Port Power System (Lightning Rods)

**Files:**
- Modify: `src/systems/power.ts`
- Modify: `src/ecs/traits.ts` — ensure `LightningRod` trait is complete

**Reference:** Original `src/systems/power.ts`

Lightning rods harvest energy from Syntheteria's perpetual storm. Buildings within a rod's `protectionRadius` receive power. No rod = no power = buildings don't function.

- [ ] **Step 1: Port power.ts to Koota**

The power system should:
1. Query all `LightningRod` entities with `Position`
2. For each rod, find all `Building` entities within `protectionRadius`
3. Set `Building.powered = true` for buildings in range, `false` for those outside
4. Rod `currentOutput` fluctuates based on a noise function (storm intensity)

- [ ] **Step 2: Add power grid visualization**

Render a subtle power radius indicator around lightning rods (a faint circle or hex grid overlay). Buildings change visual state (lit vs dark) based on powered status.

- [ ] **Step 3: Wire power into fabrication dependency**

Ensure the fabrication system (Task 3.2) checks `Building.powered` before allowing crafting.

- [ ] **Step 4: Write power system tests**

Create `src/systems/__tests__/power.vitest.ts`:
- Test: building within rod radius is powered
- Test: building outside rod radius is unpowered
- Test: removing a rod unpowers its buildings
- Test: rod output fluctuates over time

- [ ] **Step 5: Commit**

```text
feat: lightning rod power system — storm-harvested energy powers nearby buildings
```

---

### Task 3.4: Port Building Placement System

**Files:**
- Modify: `src/systems/buildingPlacement.ts`
- Create: `src/config/buildingDefs.ts` — building definitions

**Reference:** Original `src/systems/buildingPlacement.ts`, feature branch `cursor/cloud-agent-runbook-review-0483:src/config/buildings/`

- [ ] **Step 1: Create buildingDefs.ts**

Define the buildings the player can construct. Start with the essential set:
- **Lightning Rod** — powers nearby buildings, requires: 5 Scrap Metal + 2 Circuitry
- **Fabrication Unit** — crafts components, requires: 8 Scrap Metal + 3 Circuitry + 1 Durasteel
- **Repair Bay** — auto-repairs adjacent units, requires: 4 Scrap Metal + 2 Circuitry
- **Barricade** — blocks enemy pathfinding, requires: 3 Scrap Metal
- **Sensor Tower** — extends fog-of-war vision radius, requires: 2 Scrap Metal + 3 Circuitry
- **Storage Depot** — increases unit inventory capacity when adjacent, requires: 6 Scrap Metal

Each definition includes: build cost, build time, GLB model path (from `public/assets/models/buildings/`), and gameplay properties.

- [ ] **Step 2: Port buildingPlacement.ts to Koota**

The building placement system should:
1. Enter placement mode when player selects a building type from UI
2. Show a ghost preview (semi-transparent GLB) following the cursor
3. Validate placement: must be on walkable tile, not blocking pathfinding, builder unit adjacent
4. On confirm (click): consume materials from builder's inventory, spawn building entity with `BuildingTrait`, start build timer
5. On completion: set `Building.operational = true`

- [ ] **Step 3: Add placement validation rules**

- Cannot place on walls or occupied tiles
- Cannot block the only path between two rooms (connectivity check)
- Lightning rods require minimum spacing (one rod per N tiles)
- Builder unit must be within 1 tile of placement site

- [ ] **Step 4: Write building placement tests**

Create `src/systems/__tests__/buildingPlacement.vitest.ts`:
- Test: valid placement spawns building entity
- Test: placement on wall tile is rejected
- Test: placement blocking connectivity is rejected
- Test: materials are consumed from builder inventory
- Test: build timer completes after specified duration

- [ ] **Step 5: Commit**

```text
feat: building placement — ghost preview, validation, construction with material costs
```

---

### Task 3.5: Port Repair System

**Files:**
- Modify: `src/systems/repair.ts`

**Reference:** Original `src/systems/repair.ts`

- [ ] **Step 1: Port repair.ts to Koota**

The repair system should:
1. Query `Building` entities where `buildingType === "repair_bay"` and `powered === true` and `operational === true`
2. Find player units with `Position` within 1 tile of the repair bay that have broken components
3. If the unit's inventory (or the repair bay's stockpile) has the required component, repair it (set `functional: true`)
4. Repair takes time per component

- [ ] **Step 2: Add manual repair option**

A unit at a fabrication unit can self-repair using crafted components from its inventory, even without a repair bay. This is slower but doesn't require a dedicated building.

- [ ] **Step 3: Wire repair visual feedback**

Show a repair animation (sparks, progress bar) while repairing. Component state changes should be visible on the unit model if possible (dimmed vs lit parts).

- [ ] **Step 4: Write repair tests**

Create `src/systems/__tests__/repair.vitest.ts`:
- Test: damaged unit at repair bay gets component repaired
- Test: repair consumes time
- Test: unpowered repair bay doesn't repair
- Test: manual repair at fabrication unit works

- [ ] **Step 5: Commit**

```text
feat: repair system — auto-repair at powered repair bays, manual repair at fabrication units
```

---

### Task 3.6: Wire Mark I/II/III Upgrades via Radial Menu

**Files:**
- Create: `src/ui/game/RadialMenu.tsx`
- Create: `src/config/robotDefs.ts` — robot type definitions with Mark progression
- Modify: `src/ecs/traits.ts` — add Mark level to Unit trait

**Reference:** Feature branch `cursor/cloud-agent-runbook-review-0483:src/ui/game/RadialMenu.tsx` (for DOM overlay pattern), `src/robots/marks.ts` (for Mark progression data)

- [ ] **Step 1: Add Mark level to Unit trait**

Extend the `Unit` trait with `mark: 1 | 2 | 3`. Mark level affects unit stats (speed, vision range, component durability, attack damage).

- [ ] **Step 2: Create robotDefs.ts**

Define 6 robot archetypes, each with Mark I/II/III stat tiers:

| Robot | Role | Mark I | Mark II | Mark III |
|-------|------|--------|---------|----------|
| Maintenance Bot | Repair/Build | Slow, basic tools | Faster, better repair | Remote repair |
| Utility Drone | Scout | Fast, fragile | Extended vision | Stealth |
| Fabrication Unit | Craft | Basic recipes | Advanced recipes | All recipes |
| Guard Bot | Defense | Melee only | Melee + ranged | AOE damage |
| Cavalry Bot | Assault | Fast melee | Charge ability | Devastating charge |
| Sentinel Bot | Heavy | Slow, armored | Very armored | Reflects damage |

Reference `cursor/cloud-agent-runbook-review-0483:src/robots/archetypes.ts`, `src/robots/marks.ts` for data patterns.

- [ ] **Step 3: Create RadialMenu.tsx**

A DOM overlay (not in-canvas) that appears when a unit is selected and right-clicked (or long-pressed on mobile). Menu options:
- **Move** — enter move mode
- **Attack** — enter attack mode
- **Repair** — if at repair bay/fab unit, repair a component
- **Upgrade** — if at fabrication unit with materials, upgrade Mark level
- **Scavenge** — if at scavenge site, begin scavenging

The upgrade option shows the material cost and is grayed out if insufficient materials.

- [ ] **Step 4: Wire upgrade action**

When "Upgrade" is selected:
1. Check materials in unit inventory against upgrade cost (defined in robotDefs.ts)
2. Consume materials
3. Increment `Unit.mark`
4. Apply new stats from the Mark tier definition

- [ ] **Step 5: Write upgrade tests**

Create `src/systems/__tests__/upgrade.vitest.ts`:
- Test: Mark I → II upgrade consumes correct materials
- Test: Mark II → III upgrade consumes correct materials
- Test: Mark III cannot upgrade further
- Test: upgrade applies new stat values
- Test: insufficient materials blocks upgrade

- [ ] **Step 6: Commit**

```text
feat: Mark I/II/III robot upgrades via radial menu — 6 archetypes with 3 tiers each
```

---

### Task 3.7: Integration Verification

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

Expected: all tests pass (resources, fabrication, power, building placement, repair, upgrade)

- [ ] **Step 4: Full resource loop verification**

Start `pnpm dev`. Play through the complete loop:
1. Move a unit to a ruin room (scavenge site)
2. Scavenge materials (scrap metal appears in inventory)
3. Place a lightning rod (ghost preview, validate, build)
4. Place a fabrication unit within rod's power radius
5. Craft a component at the fabrication unit
6. Place a repair bay
7. Repair a damaged unit at the repair bay
8. Upgrade a unit from Mark I to Mark II at a fabrication unit

All 8 steps should work end-to-end.

- [ ] **Step 5: Production build**

```bash
pnpm build
```

Expected: builds successfully

- [ ] **Step 6: Commit**

```text
chore: Phase 3 complete — full economy loop: scavenge, fabricate, power, repair, upgrade
```

---

## Phase 3 Completion Criteria

- [ ] 4 resource materials defined (Scrap Metal, Circuitry, Power Cells, Durasteel)
- [ ] Scavenge sites yield materials over time
- [ ] Fabrication recipes consume materials and produce components
- [ ] Lightning rods power nearby buildings from the storm
- [ ] 6 building types placeable with ghost preview and validation
- [ ] Repair system fixes broken components at powered repair bays
- [ ] Mark I/II/III upgrade path for all 6 robot archetypes
- [ ] Radial menu provides unit actions (move, attack, repair, upgrade, scavenge)
- [ ] Full resource loop works end-to-end
- [ ] All economy tests pass
- [ ] 0 TypeScript errors, 0 Biome errors
- [ ] Production build succeeds
