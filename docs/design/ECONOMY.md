---
title: "Economy"
domain: design
status: canonical
last_updated: 2026-03-13
summary: "Turn structure (AP/MP), material types, harvest flow, building costs, Motor Pool tiers"
depends_on:
  - GAME_DESIGN.md
  - BOTS.md
planned_work:
  - "Config-driven floor textures — move from hardcoded imports to JSON"
  - "Mark upgrade UI at Motor Pool"
---

# Syntheteria — Economy

## 1. Turn Structure

Syntheteria uses a **Civilization-style turn-based system**:

1. **Player Turn**: Each unit gets Action Points (AP) and Movement Points (MP)
2. **AI Faction Turns**: Rival machine consciousnesses execute their actions sequentially
3. **Environment Phase**: Storm intensity shifts, cultist pressure advances, weather cycles
4. **New Turn**: All AP/MP refresh, turn counter advances

### Action Points (AP)

- Base: 2 AP per unit per turn
- Mark bonus: +floor(log2(markLevel)) AP
- Spent on: harvesting, building, repairing, attacking, hacking, surveying
- Each action costs 1 AP unless specified otherwise

### Movement Points (MP)

- Base: 3 MP per unit per turn
- Mark bonus: +floor(log2(markLevel)) MP
- 1 MP = 1 cell movement on the sector grid
- Terrain modifiers: transit corridors cost 1 MP, breach zones cost 2 MP

### Unit Readiness Glow

- Units with remaining AP/MP display an **emissive cyan glow ring**
- Units that have spent all points show no glow (inactive for this turn)
- Instant visual feedback on who can still act

### End Turn

- Player clicks "End Turn" button (top-right HUD) or presses Enter
- Remaining AP/MP are forfeit — they do not bank
- AI factions then execute their turns
- Environment phase processes storm/weather/cultist events
- New turn begins with all AP/MP refreshed

## 2. Urban Mining — The Ecumenopolis IS the Resource Base

In 2190, there are no natural resources accessible on Earth's surface. Everything geological is buried under the machine civilization. The only materials come from **salvaging the dead ecumenopolis itself**.

This is **urban mining** — stripping a machine corpse for parts.

Material sources:

1. **The dead machine civilization itself** — walls, pipes, computers, cables, infrastructure
2. **The perpetual storm** — lightning is capturable energy, charged particles
3. **Cultist breach zones** — EL-touched materials with unique properties
4. **Deep infrastructure** — abyssal extraction wards connect to buried geological deposits (enormous investment to reach)

## 3. Material Types

The game has 11 material types. Three are legacy resources from the original scavenge system; eight are urban mining materials from the harvest system.

### Legacy Scavenge Materials

| Material | Code Field | Source | Use |
|----------|-----------|--------|-----|
| Scrap Metal | `scrapMetal` | Scattered scavenge points | General-purpose crafting |
| E-Waste | `eWaste` | Scattered scavenge points | Electronics, basic components |
| Intact Components | `intactComponents` | Scattered scavenge points (rare) | Advanced fabrication |

### Urban Mining Materials (Harvest System)

| Material | Code Field | Source | Use |
|----------|-----------|--------|-----|
| Ferrous Scrap | `ferrousScrap` | Walls, columns, structural steel | Heavy chassis, armor, structural building |
| Alloy Stock | `alloyStock` | Props, equipment frames, containers | Sensors, light chassis, drones |
| Polymer Salvage | `polymerSalvage` | Pipes, insulation, capsules, seals | Wiring insulation, seals, basic components |
| Conductor Wire | `conductorWire` | Electronics, wiring harnesses, terminals | Circuit boards, signal relay, communication |
| Electrolyte | `electrolyte` | Vessels, battery banks, coolant systems | Power cells, fuel cells, energy storage |
| Silicon Wafer | `siliconWafer` | Computers, processors, solar cells | AI cores, processors, Mark upgrades |
| Storm Charge | `stormCharge` | Lightning rods, storm collection arrays | Immediate power, energy weapons, charging |
| EL Crystal | `elCrystal` | Cultist breach zones, wormhole proximity | Wormhole tech, advanced AI, endgame research |

All 11 fields are defined in `src/systems/resources.ts` as the `ResourcePool` interface.

### Design Name to Code Name Mapping

| Design Document Name | Code Field Name | Notes |
|---------------------|----------------|-------|
| Heavy Metals | `ferrousScrap` | Renamed to match material science |
| Light Metals | `alloyStock` | Renamed to match material science |
| Uranics | `electrolyte` | Refocused: energy storage, not nuclear |
| Plastics | `polymerSalvage` | Renamed to match salvage context |
| Oil | (removed) | Merged into polymerSalvage / electrolyte |
| Microchips | `siliconWafer` | Renamed to match fabrication chain |
| Scrap | `scrapMetal` | Legacy scavenge resource |
| Rare Components | `intactComponents` | Legacy scavenge resource |
| EL-Touched Crystal | `elCrystal` | Shortened in code |

## 4. Harvesting Flow

1. **Select a Fabricator bot** (or any unit with harvest capability)
2. **Open radial menu -> Harvest** (costs 1 AP)
3. **Fabricator walks to target structure** (costs MP)
4. **Harvest timer ticks down** (varies by structure: walls=120, props=50-80, details=30)
5. **Materials deposited** based on structure's resource pool
6. **Structure consumed** — disappears from the world

### Resource Pool Mapping

Each model family maps to a resource pool:

- **wall** -> Ferrous Scrap (3-5), Scrap (1-2)
- **column** -> Ferrous Scrap (2-4), Alloy Stock (0-1)
- **prop (computer)** -> Silicon Wafer (1-3), Alloy Stock (1)
- **prop (container)** -> Alloy Stock (1-2), Polymer Salvage (1-2)
- **prop (vessel)** -> Polymer Salvage (2-3), Electrolyte (1-2)
- **utility** -> Polymer Salvage (1-3), Electrolyte (1)
- **door** -> Ferrous Scrap (1-2), Alloy Stock (1), Silicon Wafer (0-1)
- **roof** -> Ferrous Scrap (2-3), Polymer Salvage (1)
- **power infrastructure** -> Electrolyte (1-3), Ferrous Scrap (2), Silicon Wafer (0-1)
- **research equipment** -> Silicon Wafer (2-4), EL Crystal (0-2)

### Strategic Decisions

Every structure the player harvests is a **permanent choice** — the structure is gone forever (in the current chunk). This creates tension:

- **Harvest walls** for ferrous scrap? Lose defensive cover.
- **Harvest computers** for silicon wafers? Lose potential intel.
- **Harvest power infrastructure** for electrolyte? Lose energy generation.

The infinite ecumenopolis provides plenty of resources, but the *local* environment is reshaped by every harvest decision.

## 5. Crafting Chain

```
Raw salvage (from harvesting structures)
  -> Refined materials (from processing at Fabrication Hub)
    -> Components (from assembly at Motor Pool)
      -> Robots / Base structures / Upgrades
```

## 6. Resource Flow Diagram

```
ECUMENOPOLIS STRUCTURES (infinite, generated by chunk)
  | [Fabricator harvests]
  v
RAW SALVAGE (Ferrous, Alloy, Polymer, Conductor, Electrolyte, Silicon)
  | [Fabrication Hub processes]
  v
REFINED MATERIALS
  | [Motor Pool assembles]
  v
NEW ROBOTS  <-  Storm Charge (power)
  |              EL Crystal (advanced)
  v
EXPLORATION -> HARVESTING -> BUILDING -> DEFENSE -> EXPANSION
  ^                                                  |
  +--------------------------------------------------+
```

## 7. Motor Pool (Base Building)

The **Motor Pool** is the key Expand structure — it fabricates new robots.

### Motor Pool Tiers

| Tier | Can Build | Queue | Additional |
|------|----------|-------|-----------|
| Basic | Mark I of any player type | 1 slot | Single queue |
| Advanced | Mark I-II | 2 slots | Faster build |
| Elite | Mark I-III | 3 slots | Can rebuild hacked bots at player Mark |

Mark IV-V bots can only be **upgraded** from Mark III bots, not built from scratch. This means the player must nurture their best units through the Mark progression rather than mass-producing elite units.

### Motor Pool Function

- Has a fabrication queue (1 at base level, 2 at upgraded, 3 at max)
- Player loads resources + selects bot type + Mark level
- After build time, a new bot emerges at the Motor Pool location
- Higher Mark bots require the Motor Pool to be at matching tier

## 8. Storm Exposure & Gathering

### Storm Exposure Zones

- **Shielded** (inside dome/shell) — safe, normal operation
- **Stressed** (partial exposure) — occasional damage, storm charge accumulation
- **Exposed** (full storm) — constant damage, massive storm charge, high risk

### Storm Gatherer Role

The Scout (ReconBot) at Mark II+ gains "Storm Gatherer" capability:

- Can venture into exposed zones
- Accumulates Storm Charge while outside
- Takes damage proportional to exposure time
- Returns to base to deposit charge
- At Mark III+: "Storm Rider" — reduced damage, can navigate breach zones
- At Mark IV+: "Eye Runner" — can approach wormhole column, gathers EL Crystal fragments

This creates a **risk/reward exploration loop** tied directly to the endgame wormhole victory path.

## 9. Map Implications

Every tile in the ecumenopolis has:

- **Terrain type** (zone: command, fabrication, storage, habitation, power, breach, transit)
- **Structures** (walls, columns, props, details) — each harvestable
- **Storm exposure** — determines energy capture potential
- **Discovery state** — fog of war, revealed by scouts
- **Cultist threat level** — increases with proximity to breach zones and campaign progression

The player's strategic decisions:

1. **Where to explore** — scouts reveal resources AND threats
2. **What to harvest** — every structure is a choice (strip walls for ferrous, or computers for silicon?)
3. **Where to build** — bases need defensible positions with good resource access
4. **How to defend** — cultists attack from breach zones, rival machines contest territory
5. **Which bots to build** — limited resources = hard choices about unit composition
6. **What to upgrade** — Mark progression is expensive: concentrate or spread?
