# Onboarding and Tutorial Design

**Status:** Active
**Scope:** New player experience from first boot to self-sufficient base -- the emotional arc of "I'm broken, I can harvest, I can build, I have power"

---

## 1. Onboarding Philosophy

### Mystery to Mastery

The onboarding teaches through **emergent discovery**, not scripted beats. Every mechanic is learned by doing it for the first time, not by reading about it. The player never sees a tooltip that says "Press E to interact." Instead, an otter hologram says "See that scrap ore vein? Walk up to it and hold the action button."

The emotional arc:

1. **Confusion** -- Where am I? What am I?
2. **Orientation** -- I can move. I can look around. I am a robot on a strange planet.
3. **Discovery** -- That jutting ore vein. My arm grinds it. Particles spiral into my body.
4. **Agency** -- I compressed powder into a cube. The screen shook. I made something.
5. **Competence** -- I carried it to the furnace. I crafted a tool. I understand the loop.
6. **Ambition** -- There are other materials out there. Other factions. I need walls. I need automation.

### Gradual Capability Unlock

The player starts with exactly one functional system: the Harvester arm. Everything else is earned through the core loop. This creates a natural tutorial cadence -- each new capability (compression, grabbing, furnace crafting, belt placement) is a reward that simultaneously teaches the next step.

### Guided, Not Scripted

Otter hologram projections (from SABLE, the home-planet AI) appear at predetermined locations to deliver context-sensitive guidance. They do not interrupt gameplay. They do not block input. They speak when the player arrives at the right place in the right state, then they wait. If the player walks away, the hologram stays -- it will still be there when they come back.

### Skippable

On subsequent playthroughs, the entire onboarding sequence is skippable. Experienced players can rush to expansion. The quest system tracks completion state; skip grants all Act I quest rewards immediately.

---

## 2. The Awakening

### First Moments

The player is FC-7, a colonist robot dispatched by SABLE aboard the colony ship *Foundry's Promise*. Atmospheric entry damaged most systems. The player wakes on the surface of Ferrathis -- a machine planet where every grain of soil is metallic particulate and every mountain is a collapsed megastructure.

The camera fades in. The player is standing on rusted terrain under a perpetually overcast sky of ionized metallic dust. Electrical arcs flicker in the distance. Nothing is explained.

The player can look around (mouse/touch). They see:
- Rusted metallic ground stretching in every direction
- Scrap ore veins jutting from the surface at irregular angles
- A single machine nearby -- the starting furnace, cold and dark
- Distant structures (collapsed megastructures, ore deposits on the horizon)

After 5 seconds of no input, the first otter hologram activates.

### Pip Appears

A small cyan-green holographic otter flickers to life from an emitter node embedded in the ground near the player's spawn point. Scan lines visible. Semi-transparent. It waves.

> "Hey. You are in rough shape. Whatever hit you during entry scrambled half your subroutines."
>
> "Good news: your Harvester arm still works. See that scrap ore vein jutting from the ground? Walk up to it and hold the action button."
>
> "Grind it down. Watch the particles spiral into your chassis. That powder is the start of everything."

Pip does not disappear. The hologram stays active at its emitter point. SABLE has calculated that persistence is more reassuring than urgency.

---

## 3. Tutorial Phases

Each phase maps to a quest in `config/quests.json` under the `act1_awakening` quest line. The quest system fires otter dialogue when the player reaches each trigger condition.

### Phase 1: Movement and Orientation

**Time target:** 0:00 -- 0:30
**No quest trigger** -- this is pre-quest free exploration

The player discovers they can:
- Move (WASD / virtual joystick on mobile)
- Look around (mouse / touch drag)
- See their own shadow, hear their own footsteps on metal

There is no explicit "movement tutorial." The player is a first-person robot. Moving is instinctive. The otter hologram's instruction to "walk up to" the ore vein is the only prompt needed.

### Phase 2: First Harvest

**Time target:** 0:30 -- 2:00
**Quest:** `awaken_systems` ("System Restart")
**Trigger:** `quest_start:awaken_systems` (fires on game start)
**Otter:** Pip (`pip_tutorial_grind`)
**Objective:** Grind 5 units of scrap ore from surface deposits

The player approaches a scrap ore vein -- an organic geological formation protruding from the terrain (NOT a cube; raw deposits are never cubes). They hold the action button. The Harvester arm activates:
- Grinding particles spiral from the deposit into the player's chassis
- The powder capacity gauge on the HUD fills incrementally
- The ore vein visually shrinks as material is extracted

**What the player learns:**
- How to interact with the world (approach + hold action)
- Raw materials exist as deposits in the terrain
- Powder is an internal resource shown on the HUD
- Deposits are finite and deplete

**Reward:** `harvester_calibration_data` (flavor item confirming motor function restoration)

### Phase 3: First Compression

**Time target:** 2:00 -- 3:00
**Quest:** `first_compression` ("First Compression")
**Trigger:** `quest_start:first_compression` (fires after `awaken_systems` complete)
**Otter:** Pip (`pip_first_compress`)
**Objective:** Compress 1 scrap metal cube

When the powder gauge is full, Pip delivers the compression prompt:

> "Your powder gauge is full. Time to compress."
>
> "Brace yourself -- pressure gauges spike, the screen shakes, and a physical cube of scrap metal ejects at your feet. Your first cube. Pick it up."
>
> "That little block is worth more than you think. On Ferrathis, wealth is visible. Every cube you own, every cube you stack -- other factions can see it. And want it."

The player triggers compression. The experience is deliberately visceral:
- Pressure gauges spike on the HUD
- Heat indicators rise
- The screen shakes (via `screenShake.ts`)
- A physical 0.5m cube of scrap metal ejects from the player and lands on the ground with a satisfying metallic clang
- The cube is a rigid body -- it rolls, bounces, settles

**What the player learns:**
- Powder compresses into physical cubes
- Cubes are real objects in the world (not inventory abstractions)
- Cubes are visible wealth -- the economic thesis of the entire game
- Compression is satisfying (the "juice" that makes the loop feel good)

**Reward:** `basic_grabber` blueprint (unlocks grab/carry mechanic)

### Phase 4: First Delivery

**Time target:** 3:00 -- 4:00
**Quest:** `build_furnace` ("Ignite the Furnace")
**Trigger:** `quest_start:build_furnace` (fires after `first_compression` complete)
**Otter:** Rivet (`rivet_furnace_tutorial`) -- appears near the starting furnace
**Objective:** Drop a cube into the furnace hopper and craft an Improved Harvester

The player picks up their cube (grab mechanic unlocked by the grabber blueprint reward). They carry it -- visibly, physically, the cube held in front of them -- to the starting furnace.

Rivet, the gruff engineering-focused otter hologram, delivers the furnace tutorial:

> "You have cubes. You need a furnace. The one machine you start with is right here -- the hopper is on top, output slot on the side."
>
> "Drop a cube in. Tap the furnace. Pick a recipe. Wait. Collect. That is the entire process."
>
> "Your furnace throughput is limited by input rate. Two belts feeding one furnace means a cube is always waiting. Plan your layout before you build it."

The player drops the cube into the hopper. They tap the furnace. The radial action menu appears -- their first encounter with contextual interaction.

**What the player learns:**
- Cubes are carried physically (not teleported to inventory)
- The furnace is a machine with input (hopper) and output (side slot)
- Contextual interaction: tap any object to get a radial menu of available actions
- Recipes transform cubes into tools and components

**Reward:** `conveyor_belt_t1` blueprint (unlocks automation)

### Phase 5: First Craft

**Time target:** 4:00 -- 5:00
**Quest:** `cube_carry_and_stack` ("Stack and Store")
**Trigger:** `quest_start:cube_carry_and_stack` (fires after `first_compression` complete, parallel to furnace quest)
**Otter:** Pip
**Objectives:** Compress 5 cubes of any material; stack 3 cubes in a single pile near the furnace

This phase runs in parallel with the furnace quest. The player is now cycling the core loop independently:
- Grind ore deposits for powder
- Compress powder into cubes
- Grab cubes and carry them
- Stack cubes near the furnace (learning that stacking is how you store wealth AND build walls)

The stacking mechanic is the bridge between the tutorial's individual loop and the game's strategic layer. Cubes stacked together form stockpiles. Stockpiles are visible to rival factions. Visible stockpiles attract raids.

**What the player learns:**
- The full harvest-compress-carry loop can repeat indefinitely
- Cubes stack physically (rigid body stacking with structural integrity)
- Stockpiles are strategic assets -- and strategic liabilities
- Multiple quests can be active simultaneously

**Reward:** `magnetic_beam_amplifier` (improved grab range)

### Phase 6: Exploration Push

**Time target:** 5:00 -- 12:00
**Quests:** Transition from `act1_awakening` to `act2_foundation`
**Otter:** Glimmer appears near the biome boundary; Wrench appears near the perimeter

With the core loop established, the tutorial opens up. The player has tools, a furnace, and cubes. Now the 4X systems begin:

- **Survey deposits** (`survey_deposits`) -- Glimmer guides the player to discover copper and silicon deposits beyond the starting area: "Look at this formation. Copper ore fused with silicon substrate under billions of years of pressure."
- **Harness the storm** (`build_lightning_rod`) -- power infrastructure via lightning rods
- **Belt it** (`automate_transport`) -- Rivet introduces conveyor belts to automate cube transport
- **Raise the walls** (`first_defense`) -- Rivet explains that walls are compressed cubes stacked in place, not prefabs
- **Hold the perimeter** (`perimeter_defense`) -- Wrench warns of incoming feral machines; first combat encounter

By minute 12, the player should have:
- A furnace fed by at least one conveyor belt
- Walls around their cube stockpile
- Survived their first feral raid
- Discovered at least one new material type
- A sense of what the 4X game ahead looks like

---

## 4. The Otter Hologram System

### How It Works

Otter holograms are projections from SABLE, the home-planet patron AI aboard the orbiting colony ship *Foundry's Promise*. They are projected from **emitter nodes** -- small devices embedded in the ground at predetermined locations. SABLE chose these positions based on survey data, placing them near resource deposits, choke points, and the player's expected path of progression.

The holograms are:
- Monochromatic (cyan-green) with visible scan lines
- Semi-transparent, slightly flickering
- Stationary (emitters are fixed in the ground)
- Non-blocking (they do not interrupt gameplay or prevent input)
- Persistent (they remain active until the player completes the associated quest)

When an otter hologram "speaks," the otter's mouth movements are decorative -- audio transmits through the player bot's communication system. Speech bubble UI represents the data overlay that SABLE layers onto its projections.

### Tutorial-Relevant Projections

| Otter | Role in Tutorial | Location |
|-------|-----------------|----------|
| **Pip** | Primary guide. Warm, practical, gently irreverent. Delivers awakening sequence, compression tutorial, and cube economy introduction. | Near spawn point and primary base |
| **Rivet** | Engineering advisor. Gruff, competent, does not waste words. Delivers furnace tutorial, belt advice, and wall-stacking guidance. | Near starting furnace area |
| **Glimmer** | Exploration motivator. Curious, awed by the planet. Introduces new biomes and deposit types. | Near biome boundaries |
| **Wrench** | Threat warner. Anxious, protective. Alerts to feral machines and incoming raids. | Near base perimeter |

Additional projections (Kelp, Flint, Drift, Current, Barnacle, Anchor) appear in mid-to-late game and are not part of the onboarding sequence. See `config/quests.json` for their full dialogue trees.

### Dialogue Sync to Game State

The quest system (`src/systems/questSystem.ts`) monitors ECS state and fires dialogue triggers when conditions are met:

| Trigger | Condition | Otter | Dialogue Key |
|---------|-----------|-------|-------------|
| `quest_start:awaken_systems` | Game start | Pip | `pip_tutorial_grind` |
| `quest_start:first_compression` | Powder gauge full (first time) | Pip | `pip_first_compress` |
| `quest_start:build_furnace` | First cube compressed | Rivet | `rivet_furnace_tutorial` |
| `quest_start:automate_transport` | Lightning rod built | Rivet | `rivet_belt_advice` |
| `quest_start:first_defense` | Cubes stacked | Rivet | `rivet_wall_stacking` |
| `quest_start:perimeter_defense` | Walls built | Wrench | `wrench_first_ferals` |

Dialogue does not auto-play. The otter hologram activates when the trigger fires. The player must be within range of the emitter node for the dialogue to display. If the player is not near the otter, the dialogue queues until they approach.

---

## 5. Pacing Targets

| Milestone | Target Time | Quest |
|-----------|-------------|-------|
| First movement | 0:00 | (none) |
| First ore ground | 0:30 | `awaken_systems` |
| **First cube compressed** | **2:00** | `first_compression` |
| First cube carried to furnace | 3:00 | `build_furnace` |
| **First tool crafted** | **4:00** | `build_furnace` |
| First cube stockpile (3+ stacked) | 5:00 | `cube_carry_and_stack` |
| First lightning rod | 7:00 | `build_lightning_rod` |
| First conveyor belt | 9:00 | `automate_transport` |
| First wall segment | 10:00 | `first_defense` |
| **First automation loop running** | **12:00** | `automate_transport` |
| First combat encounter | 12:00 | `perimeter_defense` |

These are targets, not enforced gates. A fast player might hit first craft by minute 2. A slow explorer might take 8 minutes before they compress their first cube. The quest system does not rush the player -- the otter holograms wait.

---

## 6. Config References

All tutorial content is data-driven through `config/quests.json`:

- **`questLines[0]`** (`act1_awakening`) -- the four tutorial quests: `awaken_systems`, `first_compression`, `build_furnace`, `cube_carry_and_stack`
- **`questLines[1]`** (`act2_foundation`) -- post-tutorial infrastructure quests that complete the onboarding arc
- **`otterProjections`** -- dialogue lines, personality profiles, and location hints for each named otter
- **`trustArc.stages[0]`** (`directive`) -- the trust stage active during onboarding; SABLE is a helpful mission coordinator

Tutorial quest rewards reference blueprints defined in `config/buildings.json` and items in `config/furnace.json`.

The quest system implementation lives in:
- `src/systems/questSystem.ts` -- quest state tracking, trigger evaluation, completion logic
- `src/systems/questDialogue.ts` -- otter dialogue display, queue management, proximity detection

---

## 7. Open Questions

1. **Failure recovery:** What happens if the player wastes all nearby ore deposits before compressing their first cube? Is there an infinite "tutorial vein" or does Pip offer guidance to a backup deposit?
2. **Skip granularity:** Can the player skip individual tutorial phases or only the entire Act I sequence?
3. **Multiplayer onboarding:** In a multiplayer session, does each player get their own Pip, or does one Pip serve the whole team?
4. **Mobile pacing:** Touch controls are slower than keyboard/mouse. Should pacing targets be adjusted for mobile, or does the "otter waits" design handle it naturally?
5. **First death:** If the player dies to a feral machine during Phase 6, what is the respawn experience? Does Anchor (the crisis-management otter) appear, or is that reserved for later?
6. **Deposit proximity:** How close is the nearest ore vein to spawn? If the player has to walk 30 seconds to find ore, the pacing targets break. What is the guaranteed spawn radius for tutorial deposits?
