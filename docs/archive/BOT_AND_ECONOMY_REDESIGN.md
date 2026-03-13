# Bot & Economy Redesign — Deep Brainstorm

## The World's Material Reality

In 2190, Earth has no accessible natural resources. Everything geological is buried under the ecumenopolis. The oceans are 50°C+. There is no agriculture, no mining, no forestry. The only resources are:

1. **The dead machine civilization itself** — its walls, pipes, computers, cables, and infrastructure ARE the resource base
2. **The perpetual storm** — lightning is capturable energy, and the storm carries charged particles
3. **Cultist breach zones** — EL-touched materials with unique properties
4. **Deep infrastructure** — abyssal extraction wards still connect to buried geological deposits, but they require enormous investment to reach

This means the resource system should feel like **urban mining** — stripping a dead city for parts — not traditional extraction.

## Revised Material System

Materials should map to real material science categories that matter for machine fabrication:

| Material | Source | What It Actually Is | Use |
|----------|--------|-------------------|-----|
| **Ferrous Scrap** | Walls, columns, beams, structural steel | Iron, steel alloys | Heavy chassis, armor plating, structural building |
| **Alloy Stock** | Props, equipment frames, containers | Aluminum, titanium, lightweight alloys | Sensors, light chassis, drones |
| **Polymer Salvage** | Pipes, insulation, capsules, seals | Plastics, rubber, composites | Wiring insulation, seals, basic components |
| **Conductor Wire** | Electronics, wiring harnesses, terminals | Copper, gold trace, fiber optic | Circuit boards, signal relay, communication |
| **Electrolyte** | Industrial vessels, battery banks, coolant systems | Battery acid, coolant, fuel | Power cells, fuel cells, energy storage |
| **Silicon Wafer** | Computers, processors, solar cells | Semiconductor dies, sensor arrays | AI cores, processors, Mark upgrades |
| **Storm Charge** | Lightning rods, storm collection arrays | Captured atmospheric energy | Immediate power, energy weapons, charging |
| **EL-Touched Crystal** | Cultist breach zones, wormhole proximity | Unknown crystalline material | Wormhole tech, advanced AI, endgame research |

### Crafting Chain
```
Raw salvage (from harvesting structures)
  → Refined materials (from processing at fabrication hub)
    → Components (from assembly at motor pool)
      → Robots / Base structures / Upgrades
```

## The 9 Robot Models — Full Redesign

### Player Bots (6 models, all fabricable)

| # | Model | Role | Specialization | Starting? | Mark Progression |
|---|-------|------|---------------|-----------|-----------------|
| 1 | **Companion-bot** | **Technician** | Repair, maintain, component install | ✅ (broken camera) | Faster repair, more complex repairs, auto-repair aura |
| 2 | **ReconBot** | **Scout** | Explore, survey, map, detect | ✅ | Wider vision, detect hidden resources, reveal cultist camps |
| 3 | **FieldFighter** | **Striker** | Melee combat, breach assault | ✅ | Harder hits, component targeting, area stun |
| 4 | **Mecha01** | **Fabricator** | Build structures, harvest structures | ✅ | Faster build/harvest, can build larger structures, multi-harvest |
| 5 | **MechaGolem** | **Guardian** | Defensive combat, area denial | ✅ | Damage reduction, taunt radius, shield aura |
| 6 | **MobileStorageBot** | **Hauler** | Transport resources, logistics | (fabricated) | More cargo, auto-route, supply chain automation |

### Hostile Bots (3 models, hackable)

| # | Model | Hostile Role | When Hacked | 
|---|-------|-------------|-------------|
| 7 | **Arachnoid** | **Cult Mech** — fast swarm attacker controlled by cultists | Becomes a fast melee specialist — fills the "light assault" niche |
| 8 | **MechaTrooper** | **Rogue Sentinel** — patrol and guard AI-controlled zones | Becomes a ranged combat unit — fills the "ranged attacker" niche |
| 9 | **QuadrupedTank** | **Siege Engine** — attacks fortified positions | Becomes a siege unit — heavy damage vs structures, slow |

### How Combat Types Are Filled

| Combat Role | Starting Bot | Hacked Bot | Notes |
|------------|-------------|-----------|-------|
| Melee | Striker (FieldFighter) | Cult Mech (Arachnoid) | Striker = power, Arachnoid = speed |
| Ranged | — | Rogue Sentinel (MechaTrooper) | Player earns ranged through hacking |
| Defensive | Guardian (MechaGolem) | — | Guardian is the wall |
| Siege | — | Siege Engine (QuadrupedTank) | Player earns siege through hacking |

This means **combat capability GROWS through the Exterminate pillar** — you don't just kill enemies, you HACK them and gain new unit types. This is deeply lore-aligned: you're an AI consciousness that recruits machines.

## Mark Progression — Roman Numerals, Logarithmic Growth

Each Mark level doubles a bot's specialist effectiveness but costs exponentially more:

| Mark | Label | Multiplier | Key Resource | Fabrication Time |
|------|-------|-----------|-------------|-----------------|
| I | Mark I | 1.0× | Basic materials | Fast |
| II | Mark II | 1.8× | + Silicon Wafer | Medium |
| III | Mark III | 3.0× | + Conductor Wire | Long |
| IV | Mark IV | 5.0× | + EL-Touched Crystal | Very Long |
| V | Mark V | 8.0× | + Massive investment | Endgame |

### What "Specialist Effectiveness" Means Per Role

- **Technician**: Repair speed × Mark, repair range, auto-repair at Mark III+
- **Scout**: Vision radius × Mark, detection quality, auto-map at Mark III+
- **Striker**: Melee damage × Mark, attack speed, component targeting at Mark III+
- **Fabricator**: Build speed × Mark, harvest yield × Mark, multi-structure at Mark III+
- **Guardian**: Damage reduction × Mark, taunt radius, shield projection at Mark III+
- **Hauler**: Cargo capacity × Mark, speed × Mark, auto-route at Mark III+

## Robots Do NOT Consume — They BUILD and Move On

Key design principle: **Bots are workers, not settlers.**

When a Fabricator builds a structure:
1. Player selects Fabricator → Radial menu → Build → Structure type
2. Fabricator walks to location
3. Fabricator builds over N ticks (staged: foundation → shell → interior → operational)
4. Fabricator is FREE to do other work

When a Fabricator harvests a structure:
1. Player selects Fabricator → Radial menu → Harvest
2. Fabricator walks to target structure
3. Fabricator harvests over N ticks (based on structure durability)
4. Resources deposited at nearest storage hub
5. Structure consumed, Fabricator moves on

## The Motor Pool — Robot Replication

The **Motor Pool** is a base building (not a bot). It's the key Expand structure.

### Motor Pool Function
- Has a **fabrication queue** (1 at base level, 2 at upgraded, 3 at max)
- Player loads resources + selects bot type + Mark level
- After build time, a new bot emerges at the Motor Pool location
- Higher Mark bots require the Motor Pool to be at matching tier

### Motor Pool Tiers
| Tier | Can Build | Additional |
|------|----------|-----------|
| Basic | Mark I of any player type | Single queue |
| Advanced | Mark I-II | Double queue, faster build |
| Elite | Mark I-III | Triple queue, can rebuild hacked bots at player Mark |

Mark IV-V bots can only be upgraded FROM Mark III bots, not built from scratch. This means the player must NURTURE their best units through the Mark progression rather than mass-producing elite units.

## Storm Gatherers — Outside the Domes

The user mentioned **storm gatherers** operating outside dome protection. This is a brilliant mechanic:

### Storm Exposure Zones
- **Shielded** (inside dome/shell) — safe, normal operation
- **Stressed** (partial exposure) — occasional damage, storm charge accumulation
- **Exposed** (full storm) — constant damage, massive storm charge, high risk

### Storm Gatherer Role
The **Scout** (ReconBot) at Mark II+ gains "Storm Gatherer" capability:
- Can venture into exposed zones
- Accumulates Storm Charge while outside
- Takes damage proportional to exposure time
- Returns to base to deposit charge
- At Mark III+: "Storm Rider" — reduced damage in storms, can navigate through breach zones
- At Mark IV+: "Eye Runner" — can approach the wormhole column, gathers EL-Touched Crystal fragments

This creates a **risk/reward exploration loop** that ties directly into the endgame wormhole victory path.

## Resource Flow Diagram

```
ECUMENOPOLIS STRUCTURES (infinite, generated by chunk)
  │ [Fabricator harvests]
  ▼
RAW SALVAGE (Ferrous, Alloy, Polymer, Conductor, Electrolyte, Silicon)
  │ [Fabrication Hub processes]
  ▼
REFINED MATERIALS
  │ [Motor Pool assembles]
  ▼
NEW ROBOTS ← Storm Charge (power)
  │           EL-Crystal (advanced)
  ▼
EXPLORATION → HARVESTING → BUILDING → DEFENSE → EXPANSION
  ▲                                              │
  └──────────────────────────────────────────────┘
```

## Implications for the Map

In a world with no natural resources, the ecumenopolis IS the map AND the resource. Every tile has:
- **Terrain type** (zone: command, fabrication, storage, habitation, power, breach, transit)
- **Structures** (walls, columns, props, details) — each harvestable
- **Storm exposure** — determines energy capture potential
- **Discovery state** — fog of war, revealed by scouts
- **Cultist threat level** — increases with proximity to breach zones and campaign progression

The player's strategic decisions are:
1. **Where to explore** (scouts reveal resources AND threats)
2. **What to harvest** (every structure is a choice — do you strip walls for ferrous, or computers for silicon?)
3. **Where to build** (bases need defensible positions with good resource access)
4. **How to defend** (cultists attack from breach zones, rival machines contest territory)
5. **Which bots to build** (limited resources = hard choices about unit composition)
6. **What to upgrade** (Mark progression is expensive — concentrate or spread?)

## Next Steps

1. Implement the revised material types in resourcePools.ts
2. Update bot definitions with redesigned roles
3. Create Motor Pool as a base building type
4. Add storm exposure mechanics to exploration
5. Wire harvesting through Fabricator bots specifically
6. Implement Mark upgrade UI in the radial menu
