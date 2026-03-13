# Turn System & Economy

## Turn Structure

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
- This gives the player instant visual feedback on who can still act

### End Turn
- Player clicks "End Turn" button (top-right HUD) or presses Enter
- Remaining AP/MP are forfeit — they do not bank
- AI factions then execute their turns
- Environment phase processes storm/weather/cultist events
- New turn begins with all AP/MP refreshed

## Economy — Urban Mining

### The Ecumenopolis IS the Resource Base

In 2190, there are no natural resources accessible on Earth's surface. Everything geological is buried under the machine civilization. The only materials come from **salvaging the dead ecumenopolis itself**.

This is **urban mining** — stripping a machine corpse for parts.

### Material Types

| Material | Field Name | Source | Use |
|----------|-----------|--------|-----|
| Ferrous Scrap | `ferrousScrap` | Walls, columns, structural steel | Chassis, armor, structural building |
| Alloy Stock | `alloyStock` | Props, equipment frames | Sensors, light chassis, drones |
| Polymer Salvage | `polymerSalvage` | Pipes, insulation, capsules | Wiring, seals, components |
| Conductor Wire | `conductorWire` | Electronics, terminals | Circuits, relay, communication |
| Electrolyte | `electrolyte` | Vessels, batteries, coolant | Power cells, fuel cells |
| Silicon Wafer | `siliconWafer` | Computers, processors | AI cores, Mark upgrades |
| Storm Charge | `stormCharge` | Lightning rods, storm arrays | Power, energy weapons |
| EL Crystal | `elCrystal` | Cultist breach zones | Wormhole tech, endgame |

### Harvesting Flow

1. **Select a Fabricator bot** (or any unit with harvest capability)
2. **Open radial menu → Harvest** (costs 1 AP)
3. **Fabricator walks to target structure** (costs MP)
4. **Harvest timer ticks down** (varies by structure: walls=120, props=50-80, details=30)
5. **Materials deposited** based on structure's resource pool
6. **Structure consumed** — disappears from the world

### Resource Pool Mapping

Each model family maps to a resource pool:

- **wall** → Ferrous Scrap (3-5), Scrap (1-2)
- **column** → Ferrous Scrap (2-4), Alloy Stock (0-1)
- **prop (computer)** → Silicon Wafer (1-3), Alloy Stock (1)
- **prop (container)** → Alloy Stock (1-2), Polymer Salvage (1-2)
- **prop (vessel)** → Polymer Salvage (2-3), Electrolyte (1-2)
- **utility** → Polymer Salvage (1-3), Electrolyte (1)
- **door** → Ferrous Scrap (1-2), Alloy Stock (1), Silicon Wafer (0-1)
- **roof** → Ferrous Scrap (2-3), Polymer Salvage (1)
- **power infrastructure** → Electrolyte (1-3), Ferrous Scrap (2), Silicon Wafer (0-1)
- **research equipment** → Silicon Wafer (2-4), EL Crystal (0-2)

### Crafting Chain

```
Salvaged structures → Raw materials
  → Fabrication Hub processes → Refined materials
    → Motor Pool assembles → New robots / Upgrades
```

### Strategic Decisions

Every structure the player harvests is a **permanent choice** — the structure is gone forever (in the current chunk). This creates tension:

- **Harvest walls** for ferrous scrap? Lose defensive cover.
- **Harvest computers** for silicon wafers? Lose potential intel.
- **Harvest power infrastructure** for electrolyte? Lose energy generation.

The infinite ecumenopolis provides plenty of resources, but the *local* environment is reshaped by every harvest decision.

## Motor Pool (Base Building)

The Motor Pool is the key Expand structure — it fabricates new robots.

| Tier | Can Build | Queue |
|------|----------|-------|
| Basic | Mark I of any player type | 1 slot |
| Advanced | Mark I-II | 2 slots |
| Elite | Mark I-III | 3 slots |

Mark IV-V bots can only be **upgraded** from Mark III bots, not built from scratch.
