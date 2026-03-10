# GDD-004: Core Game Loop — Harvesting, Cubes, Compression, Physical Materials

**Status:** Draft
**Date:** 2026-03-10
**Scope:** The moment-to-moment gameplay — what you DO every second, how materials move through the world as physical objects

---

## 1. The Feel

You are a broken robot on a machine planet. You start with nothing but a **Harvester** — a grinding tool mounted on your arm. You walk up to an ore vein jutting from the ground, hold the action button, and your Harvester grinds it into powder. Particles swirl into your body. A capacity gauge fills. When you've got enough, you **Compress** — the screen shakes, pressure valves on the HUD spike, heat distortion warps the edges — and you disgorge a **cube** of raw material onto the ground in front of you. A physical block. You can see it. Walk around it. Switch to your **Grabber**, magnetically latch onto the cube, and carry it to your starting machine.

Your starting base is **one machine**: a hopper basket feeding into a furnace. You drop the cube into the hopper. Tap the furnace front. Its radial menu opens: `[SMELT] [ALLOY] [CAST]`. Select one. The furnace glows, sparks fly, and out slides your first component — a better drill bit, a stronger grabber, a power cell.

That's the loop. Grind → Compress → Carry → Process → Build. Everything is physical. Everything is a thing you can see and touch.

---

## 2. Material States

Materials exist in three physical states in the world:

### 2.1 Raw Deposits (Organic Shapes)

Ore veins are **organic, geological formations** — not cubes, not abstract icons. They protrude from terrain, jut out of mountainsides, cluster in ravines.

| Deposit Type | Visual | Where Found |
|-------------|--------|-------------|
| Scrap Ore | Rusted metal sheets, bent rebar, corroded plates | Surface ruins, slag heaps |
| Copper Vein | Green-patina veins threading through rock | Cliff faces, ravine walls |
| Silicon Cluster | Glassy crystalline outcrops | Processor graveyards |
| Titanium Seam | Dark metallic bands in mountain faces | Deep terrain, mountain bases |
| Rare Earth Node | Faintly glowing nodules | Underground cavities, rare surface |
| Carbon Deposit | Dark, sooty compressed layers | Cable forests, old foundries |

**Visual design:**
- Rough, procedural geometry — NOT cubes at this stage
- Distinct PBR materials per type (metallic/roughness/color differentiate at a glance)
- Veins have visible volume — they deplete visually as you harvest (shrink, crack, crumble)
- Depleted veins leave behind scarred terrain

### 2.2 Powder (Internal State)

When you grind a deposit, the material becomes **powder** stored internally in your bot:

- Not visible in the world — it's inside you
- Shown on HUD as a **capacity bar** with material color
- Each material type has its own powder color and icon
- Bot can carry limited powder (upgradeable capacity)
- Powder is volatile — you lose some if you take damage before compressing

### 2.3 Cubes (Physical World Objects)

Compressed powder becomes a **cube** — a physical rigid body in the world:

```
┌─────────────┐
│             │   Each cube is:
│   MATERIAL  │   - A kinematic Rapier rigid body
│    CUBE     │   - ~0.5m per side (grabbable scale)
│             │   - Distinct PBR material per type
│             │   - Stackable (snap-to-grid when placed)
└─────────────┘   - Interactable (click → radial menu)
```

| Cube Type | Color | Surface |
|-----------|-------|---------|
| Scrap Metal | Dark grey, orange rust | Rough, pitted, seam lines |
| Copper | Warm orange-brown, green patina edges | Semi-smooth, oxidation patterns |
| Silicon | Translucent grey-blue | Glassy, subtle internal refraction |
| Titanium | Cool dark silver | Smooth, brushed metal |
| Rare Earth | Faint cyan glow | Smooth with emissive veins |
| Carbon | Matte black | Layered, compressed texture |

**Cube interactions (via contextual radial menu):**
- `[GRAB]` — magnet grab, carry it
- `[STACK]` — place into a stack (snap grid)
- `[INFO]` — show material type, quantity
- `[CRUSH]` — break back into powder (lossy)

---

## 3. Tools (Progression-Based, Not Loadout)

You don't "equip tools from a menu." You start with a Harvester. You build upgrades. Each upgrade IS a new tool capability on your bot.

### 3.1 Starting Tool: Harvester

Your first and only tool at game start.

**How it works:**
1. Walk up to an ore deposit (within 2m range)
2. Crosshair changes to grinding indicator when aimed at harvestable deposit
3. Hold primary action — grinding animation + particles
4. Powder particles spiral from deposit into your bot (like a vacuum)
5. Deposit visually depletes (cracks, shrinks, fragments break off)
6. HUD capacity bar fills with material-colored powder
7. When deposit is fully mined, it crumbles and disappears

**Harvester tiers (from tech tree):**
| Tier | Name | Speed | Ore Types | Unlock Cost |
|------|------|-------|-----------|-------------|
| 1 | Salvage Grinder | 1x | Scrap only | Starting |
| 2 | Diamond Drill | 2x | Scrap, Copper, Carbon | 4x Scrap Cubes |
| 3 | Plasma Cutter | 3x | All common ores | 2x Copper + 1x Silicon |
| 4 | Quantum Extractor | 5x | All ores including Rare Earth | 1x Titanium + 1x Rare Earth |

### 3.2 Compression

Not a separate tool — it's an ability.

**How it works:**
1. When carrying enough powder (minimum threshold per material), Compress becomes available
2. Press Compress action (long-press or dedicated button)
3. **Screen shake** — intensity increases over ~2 seconds
4. **HUD pressure/heat gauges** spike — valves animate, warning lights flash
5. **Sound design** — hydraulic press sound, metallic groaning, pressure hiss
6. Bot bends forward slightly (first-person camera dips)
7. A **cube ejects** from the bot onto the ground in front of you
8. Powder capacity resets to zero for that material

**Compression quality:**
- Compress with exactly the right amount → clean cube
- Compress with excess → cube + leftover powder stays
- Take damage during compression → cube quality degrades (cracked cube, worth less)

### 3.3 Grabber

Your second tool — built from your first few cubes.

**How it works:**
1. Aim crosshair at a cube (or any grabbable physics object)
2. Press grab action — magnetic beam visual connects bot hand to cube
3. Cube levitates and follows your movement (held ~1m in front at chest height)
4. Walk to destination
5. Release — cube drops with physics (or snaps to grid if near a valid slot)
6. Can throw cubes (release while moving) — combat potential

**Grabber upgrades:**
| Tier | Range | Carry Weight | Special |
|------|-------|-------------|---------|
| 1 | 3m | 1 cube | Basic magnet |
| 2 | 5m | 2 cubes | Stronger magnet |
| 3 | 8m | 4 cubes | Tractor beam, can pull distant cubes |
| 4 | 12m | 8 cubes | Gravity manipulation, can grab enemy cubes |

### 3.4 Tool Unlock Sequence

```
Game Start
  └── Harvester Tier 1 (starting)
        └── First Scrap Cubes → Furnace assembles:
              ├── Grabber Tier 1
              ├── Harvester Tier 2
              └── Scanner (see deposit types at range)
                    └── More diverse cubes → Furnace upgrades:
                          ├── Grabber Tier 2
                          ├── Basic Belt (conveyor)
                          ├── Hopper (auto-feed furnace)
                          └── Power Cell (enables machines)
                                └── Powered machines → Advanced assembly:
                                      ├── Battle Bot chassis
                                      ├── Wall segments
                                      ├── Turret base
                                      ├── Signal Relay
                                      └── Outpost Core (territory claim)
```

---

## 4. Starting Base: The Furnace Machine

### 4.1 The One Starting Machine

Every civilization starts with exactly **one machine** placed at their spawn point:

```
        ┌───────┐
        │HOPPER │ ← Drop cubes in here (top opening)
        │BASKET │
        ├───────┤
        │       │
        │FURNACE│ ← Tap front face → radial menu
        │  🔥   │    [SMELT] [ALLOY] [CAST]
        │       │
        └───┬───┘
            │
         OUTPUT   ← Finished items slide out here
```

**Physical design:**
- ~2m tall, industrial look, glowing intake at top
- Front face has visible controls (buttons, gauges, display panel)
- Chimney/exhaust vents — emit particle smoke when active
- Output slot at bottom-front — items physically slide out
- Status lights: red (empty), yellow (processing), green (ready)

### 4.2 Interaction

1. **Drop cubes into hopper** — walk up, aim at hopper opening, release grabbed cube
   - Cube falls into hopper with physics (clanking sound)
   - Hopper shows what's inside (visible cubes, or inventory count on display)

2. **Tap furnace front** → contextual radial menu appears:
   - Menu options depend on what cubes are in the hopper
   - Greyed-out options show what additional materials are needed

3. **Processing** — select a recipe:
   - Furnace animates (glow intensifies, sparks, smoke)
   - Takes real time (5-30 seconds depending on recipe)
   - Progress bar on the furnace display panel
   - Sound: molten metal, hammering, hissing

4. **Output** — finished item slides out the front slot:
   - Physical object on the ground
   - Grab it, install it (tap your own bot → upgrade menu)

### 4.3 Furnace Recipes (Starting Tier)

```jsonc
// config/furnace.json
{
  "tier_1_salvage": {
    "recipes": {
      "grabber_arm": {
        "displayName": "Grabber Arm",
        "description": "Magnetic manipulator. Lets you pick up and carry cubes.",
        "input": { "scrap_cube": 3 },
        "time": 10,
        "output": "tool_grabber_t1"
      },
      "drill_upgrade": {
        "displayName": "Diamond Drill Bit",
        "description": "Upgraded harvester. Mines copper and carbon.",
        "input": { "scrap_cube": 4 },
        "time": 15,
        "output": "tool_harvester_t2"
      },
      "scanner_lens": {
        "displayName": "Scanner Lens",
        "description": "See deposit types and richness at range.",
        "input": { "scrap_cube": 2 },
        "time": 8,
        "output": "tool_scanner_t1"
      },
      "power_cell": {
        "displayName": "Basic Power Cell",
        "description": "Powers machines. Required for advanced processing.",
        "input": { "scrap_cube": 5 },
        "time": 20,
        "output": "component_power_cell"
      },
      "repair_patch": {
        "displayName": "Repair Patch",
        "description": "Restores one broken component on your bot.",
        "input": { "scrap_cube": 2 },
        "time": 5,
        "output": "consumable_repair"
      }
    }
  },
  "tier_2_copper": {
    "requires": "tool_harvester_t2",
    "recipes": {
      "copper_wire_bundle": {
        "displayName": "Copper Wire Bundle",
        "description": "Enables power connections between machines.",
        "input": { "copper_cube": 2 },
        "time": 12,
        "output": "component_wire_bundle"
      },
      "belt_segment": {
        "displayName": "Conveyor Belt Segment",
        "description": "Automated cube transport.",
        "input": { "scrap_cube": 3, "copper_cube": 1 },
        "time": 15,
        "output": "building_belt_segment"
      },
      "hopper_upgrade": {
        "displayName": "Auto-Hopper",
        "description": "Hopper that accepts cubes from belts automatically.",
        "input": { "scrap_cube": 4, "copper_cube": 2 },
        "time": 20,
        "output": "building_auto_hopper"
      },
      "grabber_upgrade": {
        "displayName": "Grabber Mk2",
        "description": "Longer range, can carry 2 cubes.",
        "input": { "copper_cube": 3, "scrap_cube": 2 },
        "time": 15,
        "output": "tool_grabber_t2"
      }
    }
  },
  "tier_3_silicon": {
    "requires": "tool_harvester_t2",
    "recipes": {
      "circuit_board": {
        "displayName": "Circuit Board",
        "description": "Enables signal network and compute.",
        "input": { "silicon_cube": 2, "copper_cube": 1 },
        "time": 25,
        "output": "component_circuit_board"
      },
      "signal_relay": {
        "displayName": "Signal Relay",
        "description": "Extends your signal network range.",
        "input": { "silicon_cube": 1, "copper_cube": 2, "scrap_cube": 2 },
        "time": 20,
        "output": "building_signal_relay"
      },
      "battle_bot_chassis": {
        "displayName": "Battle Bot Chassis",
        "description": "Empty combat bot frame. Needs components to activate.",
        "input": { "scrap_cube": 6, "copper_cube": 2, "silicon_cube": 1 },
        "time": 30,
        "output": "unit_battle_bot_chassis"
      }
    }
  },
  "tier_4_titanium": {
    "requires": "tool_harvester_t3",
    "recipes": {
      "plasma_cutter": {
        "displayName": "Plasma Cutter",
        "description": "Mines all ore types. Fast extraction.",
        "input": { "titanium_cube": 2, "silicon_cube": 1, "copper_cube": 2 },
        "time": 30,
        "output": "tool_harvester_t3"
      },
      "turret_base": {
        "displayName": "Defense Turret",
        "description": "Automated defense. Attacks enemies in range.",
        "input": { "titanium_cube": 3, "silicon_cube": 2, "copper_cube": 3 },
        "time": 40,
        "output": "building_turret"
      },
      "wall_segment": {
        "displayName": "Wall Segment",
        "description": "Fortified barrier. Blocks movement and projectiles.",
        "input": { "titanium_cube": 4, "scrap_cube": 4 },
        "time": 25,
        "output": "building_wall"
      },
      "outpost_core": {
        "displayName": "Outpost Core",
        "description": "Claims territory. Enables building in an area.",
        "input": { "titanium_cube": 2, "silicon_cube": 2, "copper_cube": 4, "scrap_cube": 4 },
        "time": 60,
        "output": "building_outpost"
      }
    }
  }
}
```

---

## 5. Cube Physics & World

### 5.1 Cubes as Rigid Bodies

Every cube in the world is a Rapier kinematic rigid body:

```typescript
// game/ecs/traits/materials.ts
import { trait, relation } from 'koota';

export const MaterialCube = trait(() => ({
  material: 'scrap' as string,
  quality: 1.0,       // 0-1, affected by damage during compression
  stackable: true,
}));

// Cube is "held" by a bot via relation
export const HeldBy = relation({ exclusive: true });

// Cube is "in" a hopper/machine via relation
export const InsideOf = relation({ exclusive: true });

// Powder state (internal to bot)
export const PowderStorage = trait(() => ({
  material: '' as string,
  amount: 0,
  capacity: 100,
}));
```

### 5.2 Cube Stacking

Cubes snap to a **half-meter grid** when placed near other cubes or flat ground:

```
Grid snap rules:
- Within 0.3m of grid point → snap
- Adjacent to another cube → snap to neighbor
- Stacks up to 8 high before becoming unstable
- Unstable stacks topple (physics simulation)
```

This creates emergent structures — walls of cubes, cube stockpiles, cube bridges. Players and AI civs build visible material reserves.

### 5.3 Cubes as Currency

Cubes ARE the economy. There is no abstract resource counter. Your wealth is the physical pile of cubes sitting outside your base. Enemies can **raid** your cube stockpiles. You can **steal** enemy cubes.

This means:
- You can see how wealthy an enemy is (count their cube piles)
- Raiding is meaningful — you physically grab their cubes and run
- Defense matters — walls protect cube stockpiles
- Belt logistics matter — automated cube transport reduces theft risk

---

## 6. Ore Deposits & World Generation

### 6.1 Deposit Placement

```jsonc
// config/deposits.json
{
  "scrap_ore": {
    "frequency": 0.4,
    "clusterSize": [3, 8],
    "yieldPerNode": [80, 150],
    "spawnZones": ["ruins", "slag_heaps", "surface"],
    "minElevation": 0,
    "maxElevation": 20,
    "visual": {
      "meshType": "organic_rubble",
      "scale": [0.8, 1.5],
      "material": "rusted_metal"
    }
  },
  "copper_vein": {
    "frequency": 0.25,
    "clusterSize": [2, 5],
    "yieldPerNode": [50, 100],
    "spawnZones": ["cliff_face", "ravine", "mountain"],
    "minElevation": 3,
    "maxElevation": 40,
    "visual": {
      "meshType": "vein_protrusion",
      "scale": [0.5, 1.2],
      "material": "copper_patina"
    }
  },
  "silicon_cluster": {
    "frequency": 0.15,
    "clusterSize": [1, 4],
    "yieldPerNode": [30, 80],
    "spawnZones": ["processor_graveyard", "crystal_field"],
    "minElevation": 0,
    "maxElevation": 15,
    "visual": {
      "meshType": "crystal_cluster",
      "scale": [0.4, 1.0],
      "material": "glassy_silicon"
    }
  },
  "titanium_seam": {
    "frequency": 0.08,
    "clusterSize": [1, 3],
    "yieldPerNode": [20, 60],
    "spawnZones": ["mountain_base", "deep_ravine"],
    "minElevation": 10,
    "maxElevation": 50,
    "visual": {
      "meshType": "seam_band",
      "scale": [1.0, 2.0],
      "material": "dark_titanium"
    }
  },
  "rare_earth_node": {
    "frequency": 0.03,
    "clusterSize": [1, 2],
    "yieldPerNode": [10, 30],
    "spawnZones": ["underground", "rare_surface"],
    "minElevation": -5,
    "maxElevation": 5,
    "visual": {
      "meshType": "glowing_nodule",
      "scale": [0.3, 0.8],
      "material": "emissive_rare_earth"
    }
  },
  "carbon_deposit": {
    "frequency": 0.2,
    "clusterSize": [2, 6],
    "yieldPerNode": [40, 100],
    "spawnZones": ["cable_forest", "foundry_ruins"],
    "minElevation": 0,
    "maxElevation": 10,
    "visual": {
      "meshType": "compressed_layer",
      "scale": [0.6, 1.3],
      "material": "matte_carbon"
    }
  }
}
```

### 6.2 Deposit Depletion Visuals

As a deposit is harvested:
- **100%** — full size, pristine
- **75%** — small cracks appear, fragments on ground nearby
- **50%** — visible reduction in volume, deeper cracks
- **25%** — heavily fragmented, nearly flat, dim color
- **0%** — crumbles to dust (particle burst), scarred terrain patch remains

---

## 7. HUD for Core Loop

### 7.1 Powder Capacity Gauge

```
Bottom-center HUD (replaces equipped tool indicator):

┌──────────────────────────────┐
│  HARVESTER T1                │
│  ▓▓▓▓▓▓▓▓░░░░░░░  52/100   │  ← Powder capacity bar
│  ■ SCRAP ORE                 │  ← Current material type
└──────────────────────────────┘
```

- Bar color matches material type
- Pulses when near full capacity
- Shows "COMPRESS READY" when above minimum threshold

### 7.2 Compression Overlay

When compressing, temporary overlay:

```
┌─────────────────────────────────────┐
│                                     │
│    PRESSURE ▓▓▓▓▓▓▓▓▓▓▓░░ 85%     │
│    HEAT     ▓▓▓▓▓▓▓▓░░░░░ 62%     │
│                                     │
│         [SCREEN SHAKE ACTIVE]       │
│     [HEAT DISTORTION ON EDGES]      │
│                                     │
│    ◼ COMPRESSING SCRAP ORE...       │
│                                     │
└─────────────────────────────────────┘
```

- Pressure bar fills in ~2 seconds
- Heat bar fills slightly behind
- Both must reach 100% for clean cube
- Camera shake intensity matches pressure
- Edge heat distortion (post-processing) matches heat
- Sound: hydraulic press crescendo

### 7.3 Grabber Indicator

When grabber is active and holding:

```
Bottom-right HUD:

┌────────────────┐
│  GRABBER T1    │
│  HOLDING:      │
│  ■ SCRAP CUBE  │
│  Quality: 100% │
│  [RELEASE: R]  │
└────────────────┘
```

---

## 8. Otter Holograms as Quest Guides

Otters appear as holographic projections near key progression points. They guide the player through the tech tree with contextual hints.

### 8.1 Quest Flow

```jsonc
// config/quests.json
{
  "quest_first_cube": {
    "trigger": "game_start",
    "otter_position": "near_starting_deposit",
    "dialogue": [
      "Hey, new bot! See that scrap pile?",
      "Walk up to it and hold [ACTION] to grind it down.",
      "When your powder gauge is full, hold [COMPRESS].",
      "You'll get a cube! Take it to the furnace."
    ],
    "objective": "compress_first_cube",
    "reward": null,
    "next": "quest_first_craft"
  },
  "quest_first_craft": {
    "trigger": "compress_first_cube",
    "otter_position": "near_furnace",
    "dialogue": [
      "Nice cube! Now grab it — aim and press [GRAB].",
      "Carry it to the furnace and drop it in the hopper.",
      "Then tap the furnace front to see what you can make."
    ],
    "objective": "craft_first_item",
    "reward": null,
    "next": "quest_get_grabber"
  },
  "quest_get_grabber": {
    "trigger": "craft_first_item",
    "otter_position": "near_furnace",
    "dialogue": [
      "A Grabber Arm! This'll make hauling cubes way easier.",
      "Install it by opening your bot menu [TAB].",
      "Now you can carry cubes without grinding them first.",
      "Pro tip: Stack cubes near the furnace for quick access."
    ],
    "objective": "install_grabber",
    "reward": null,
    "next": "quest_explore_copper"
  },
  "quest_explore_copper": {
    "trigger": "install_grabber",
    "otter_position": "direction_of_copper",
    "dialogue": [
      "See those green streaks on the cliff face?",
      "That's copper. You'll need a better drill to mine it.",
      "Make 4 scrap cubes and craft a Diamond Drill at the furnace.",
      "Copper unlocks wires, belts, and better tools."
    ],
    "objective": "craft_harvester_t2",
    "reward": null,
    "next": "quest_first_belt"
  },
  "quest_first_belt": {
    "trigger": "craft_harvester_t2",
    "otter_position": "between_deposit_and_furnace",
    "dialogue": [
      "Tired of carrying cubes one by one?",
      "Craft a Belt Segment — it'll move cubes automatically.",
      "Place belts from the ore deposit to your furnace hopper.",
      "Then cubes roll right in without you lifting a magnet."
    ],
    "objective": "place_first_belt",
    "reward": null,
    "next": "quest_defense"
  },
  "quest_defense": {
    "trigger": "place_first_belt",
    "otter_position": "near_base_perimeter",
    "dialogue": [
      "Heads up — other machines are watching your cube pile.",
      "Feral bots will try to steal your materials.",
      "Craft walls to protect your stockpile.",
      "Or build a battle bot to patrol the perimeter."
    ],
    "objective": "build_first_defense",
    "reward": null,
    "next": "quest_signal_network"
  }
}
```

### 8.2 Otter Hologram Behavior

- Otters shimmer with holographic shader (existing `HolographicShader.ts`)
- They wave, point in directions, do little dances
- Speech bubbles appear when player is within range
- They relocate to the next quest-relevant location after each objective
- Tapping an otter → `[TALK] [REPEAT HINT] [DISMISS]`
- Never block the player — they're translucent, no collider

---

## 9. First 10 Minutes of Gameplay

```
0:00  Title screen → Start Game → Race Selection → Map Setup
0:30  Camera fades in. You're a broken bot on rusted terrain.
      Your Harvester is sparking. An otter hologram waves nearby.

0:45  Otter: "Hey! See that scrap pile?"
      Player walks to nearby scrap ore deposit.

1:00  Player holds action → Harvester grinds ore.
      Particles swirl in. Capacity bar fills.
      Deposit visually cracks and shrinks.

1:30  Capacity reaches threshold. "COMPRESS READY" pulses.
      Player holds compress. Screen shakes. Pressure gauges spike.
      A scrap cube ejects onto the ground. First cube!

1:45  Otter: "Nice! Now take it to the furnace."
      Player grabs cube (initially by walking into it and pressing grab).
      Cube magnetically attaches, floats in front of bot.

2:00  Player walks to furnace (10m away at spawn).
      Drops cube into hopper. Clank!

2:15  Player taps furnace → radial menu: [REPAIR PATCH] [GRABBER ARM] [DRILL UPGRADE]
      Player selects Grabber Arm (needs 3 cubes, has 1).

2:30  Player goes back to deposit. Grinds more scrap. Compresses.
      Carries cube #2 to furnace. Then cube #3.

3:30  Three cubes in hopper. Taps furnace → selects [GRABBER ARM].
      Furnace glows, sparks fly. 10 seconds processing.
      Grabber Arm slides out the output slot.

4:00  Player picks up Grabber Arm → [INSTALL] prompt.
      Presses install. Brief animation. "GRABBER T1 ONLINE" on HUD.

4:15  Now player can grab cubes from range (3m).
      Otter: "Copper is that way! Make a drill upgrade."

4:30  Player grinds 4 more scrap cubes, feeds furnace.
      Crafts Diamond Drill. Installs it. "HARVESTER T2 ONLINE."

5:30  Player ventures toward copper veins on cliff face.
      New terrain biome — different colors, steeper.
      Grinds copper. Different particle color (orange-green).

6:30  Compresses copper cubes. Carries them back.
      Crafts first Conveyor Belt Segment.

7:00  Places belt between deposit and furnace area.
      Drops cubes on belt → they roll toward furnace! Automation begins.

8:00  With belt running, player explores further.
      Discovers silicon cluster in processor graveyard.
      Can't mine it yet — needs Plasma Cutter (tier 3).

9:00  Otter hologram appears at base perimeter:
      "Other machines are watching your cubes..."
      A feral bot is skulking near the cube pile.

10:00 Player must decide: defend cubes, build walls, or keep expanding.
      The 4X begins.
```

---

## 10. How Cubes Connect to Existing Systems

### 10.1 Belts Transport Cubes

Conveyor belts now transport **physical cubes**, not abstract items:
- Cube placed on belt entrance → cube rigid body moves along belt path
- Visual: actual cube mesh sliding on the belt surface
- Belt speed determines cube transport speed
- Cubes stack on belts (max 1 per segment, queue at junctions)

### 10.2 Machines Accept Cubes

All processing machines have hopper inputs that accept cubes:
- Furnace hopper (starting)
- Smelter (processes raw cubes into refined cubes)
- Fabricator (assembles components from multiple cube types)
- Each machine's radial menu shows recipes based on what cubes are in its hopper

### 10.3 AI Civilizations Use Cubes

AI governors manage physical cube logistics:
- AI bots harvest deposits → compress cubes → carry to their machines
- AI cube stockpiles are visible and raidable
- AI defenses protect cube reserves
- Trade between civs = physically exchanging cubes at borders

### 10.4 Combat Over Cubes

The primary strategic resource is physical cubes:
- Raiding enemy bases to steal cubes
- Defending cube stockpiles with walls and turrets
- Battle bots that patrol and intercept raiders
- Destroyed bots drop cubes as loot

---

## 11. Koota Traits for Core Loop

```typescript
// game/ecs/traits/materials.ts

// Ore deposit in the world (organic shape)
export const OreDeposit = trait(() => ({
  oreType: 'scrap' as string,
  currentYield: 100,    // units of powder remaining
  maxYield: 100,
  depletionVisual: 1.0, // 0-1, drives mesh scale/crack state
}));

// Cube in the world (physical block)
export const MaterialCube = trait(() => ({
  material: 'scrap' as string,
  quality: 1.0,
}));

// Bot's internal powder storage
export const PowderStorage = trait(() => ({
  material: '' as string,
  amount: 0,
  capacity: 100,
}));

// Bot's compression state
export const CompressionState = trait(() => ({
  active: false,
  progress: 0,     // 0-1
  pressure: 0,     // 0-1
  heat: 0,         // 0-1
}));

// Harvester tool on a bot
export const Harvester = trait({
  tier: 1,
  speed: 1.0,
  mineableTypes: 'scrap' as string, // comma-separated list
});

// Grabber tool on a bot
export const Grabber = trait({
  tier: 0,        // 0 = not installed
  range: 3.0,
  maxCarry: 1,
});

// Scanner tool on a bot
export const Scanner = trait({
  tier: 0,
  range: 0,
});

// Machine hopper (accepts cubes)
export const Hopper = trait(() => ({
  cubeSlots: 8,
  // Cubes inside tracked via InsideOf relation
}));

// Machine that processes cubes → outputs
export const Processor = trait(() => ({
  processorType: 'furnace' as string,
  currentRecipe: null as string | null,
  progress: 0,
  speed: 1.0,
  active: false,
}));

// Relations
export const HeldBy = relation({ exclusive: true });     // cube → bot holding it
export const InsideOf = relation({ exclusive: true });    // cube → machine hopper
export const OnBelt = relation({ exclusive: true });      // cube → belt segment
export const OutputOf = relation({ exclusive: true });    // item → machine that made it
```

---

## 12. What Changes from Previous GDDs

| GDD-002/003 Design | GDD-004 Revision |
|--------------------|--------------------|
| Abstract `ResourcePool` world trait | Physical cubes ARE the resources |
| `miner.extractionRate` (number) | Harvester grinding deposit → powder → cube |
| `Item` trait with `itemType` | `MaterialCube` trait with physics body |
| Belt transports abstract items | Belt transports physical cubes |
| Building costs = abstract resource check | Building costs = cubes in hopper |
| Tool system with 6 tools | Harvester/Grabber/Scanner as bot upgrades |
| `RadialToolMenu` on player | `ObjectActionMenu` on clicked object/machine |
| Power cell as abstract component | Power cell as physical craftable item |
| Hidden resource counters | Visible cube stockpiles (raid-able) |

---

## 13. Implementation Priority

### Phase 1: Harvest → Compress → Cube
1. `OreDeposit` trait + procedural deposit placement
2. Ore deposit renderer (organic meshes with PBR materials)
3. Harvester grinding mechanic (hold action → particles → powder fills)
4. `PowderStorage` trait + HUD capacity bar
5. Compression mechanic (hold → screen shake → pressure/heat HUD → cube ejects)
6. `MaterialCube` trait + cube renderer (Rapier rigid body + PBR material)

### Phase 2: Grab → Carry → Furnace
1. Grabber tool (aim → magnetic beam → cube follows)
2. Furnace machine entity (hopper + processor + output slot)
3. Hopper physics (drop cube in → `InsideOf` relation)
4. Furnace radial menu (recipes from `config/furnace.json`)
5. Processing animation + output item
6. Tool installation on bot (TAB menu)

### Phase 3: Belt Automation
1. Belt transports physical cubes (not abstract items)
2. Cube-on-belt physics (ride along, queue at junctions)
3. Auto-hopper (belt → hopper connection)

### Phase 4: Combat & Economy
1. Cube stockpiles as visible wealth
2. AI bots harvest/compress/carry cubes
3. Raiding mechanics (grab enemy cubes)
4. Defense buildings (walls, turrets protecting cube piles)

---

## 14. Success Criteria

- [ ] Ore deposits are organic-shaped 3D objects protruding from terrain
- [ ] Harvesting grinds deposits with visible particle effects and depletion
- [ ] Powder capacity shows on HUD, fills as you harvest
- [ ] Compression produces screen shake, pressure/heat gauges, ejects physical cube
- [ ] Cubes are physical rigid bodies you can walk around, stack, grab
- [ ] Grabber magnetically lifts and carries cubes
- [ ] Furnace accepts cubes via physical hopper drop
- [ ] Tapping furnace opens contextual radial menu with available recipes
- [ ] Crafted items slide out physically, can be installed on bot
- [ ] Otter holograms guide through quest progression
- [ ] Belts move physical cubes, not abstract items
- [ ] Enemy cube stockpiles are visible and raid-able
- [ ] No abstract resource counters — cubes ARE the economy
