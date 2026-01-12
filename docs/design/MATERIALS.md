# Materials and Supply Chain

This document defines the material resources, processing tiers, and supply chain mechanics for manufacturing in Syntheteria.

---

## Overview

The material system is **highly granular** — real-world materials with realistic processing chains. This creates meaningful logistics puzzles and rewards mastery of automation.

### Material Flow: 5 Tiers

```
EXTRACTION → PRIMARY → SECONDARY → COMPONENTS → ASSEMBLY
   (raw)     (basic)   (advanced)    (parts)    (products)
```

Each tier requires specific facilities and inputs from previous tiers.

---

## Tier 1: Extraction (Raw Materials)

Raw materials are obtained through mining, extraction, atmospheric processing, or scavenging.

### Mined Ores

| Material | Abundance | Notes |
|----------|-----------|-------|
| Iron Ore | Common | Everywhere, foundation of industry |
| Bauxite | Common | Aluminum source |
| Silica (Sand/Quartz) | Common | Glass, semiconductors |
| Copper Ore | Moderate | Essential for electronics, scattered deposits |
| Tin Ore | Moderate | Solder, bronze |
| Nickel Ore | Moderate | Alloys, batteries |
| Titanium Ore (Ilmenite/Rutile) | Limited | Specific deposits, high-performance materials |
| Tungsten Ore | Limited | High-temp applications |
| Lithium Ore (Spodumene) | Limited | Batteries, concentrated in former salt flats |
| Cobalt Ore | Rare | Batteries, superalloys, very limited geography |
| Rare Earth Ores | Rare | Magnets, electronics, highly concentrated deposits |
| Uranium Ore | Rare | Nuclear power, specific deposits |

### Extracted Gases and Liquids

| Material | Source | Notes |
|----------|--------|-------|
| Crude Oil | Wells, old infrastructure | Kerosene, plastics; declining availability |
| Natural Gas | Wells | Methane, hydrogen feedstock |
| Water | Lakes, aquifers, ice | Hydrogen, oxygen, cooling; essential |
| Atmospheric Oxygen | Air separation | Combustion, rocket oxidizer (LOX) |
| Atmospheric Nitrogen | Air separation | Ammonia, propellants |
| Atmospheric CO₂ | Air capture | Methane synthesis via Sabatier process |

### Scavenged Materials

Ruins of human civilization provide alternative material sources.

| Material | Source | Notes |
|----------|--------|-------|
| Scrap Metal | Ruins, vehicles, structures | Mixed quality, requires sorting |
| E-Waste | Electronics, data centers | Recoverable copper, gold, rare earths |
| Intact Components | Ruins | May skip processing steps if functional |
| Salvaged Fuel | Old storage tanks | May be degraded, requires testing |
| Salvaged Machinery | Factories, facilities | Can be repaired or stripped for parts |

**Scavenging vs Mining Trade-off:**
- Scavenging is faster initially but finite
- Mining is slower to establish but sustainable
- Late game requires mining as ruins are depleted

---

## Tier 2: Primary Processing

First-stage processing converts raw materials into basic refined materials.

### Metals

| Output | Inputs | Facility |
|--------|--------|----------|
| Pig Iron | Iron Ore + Carbon + Heat | Blast Furnace |
| Alumina | Bauxite + Caustic Soda | Refinery |
| Titanium Sponge | Titanium Ore + Chlorine + Magnesium | Kroll Process Plant |
| Copper (raw) | Copper Ore + Heat | Smelter |
| Refined Tin | Tin Ore + Heat | Smelter |
| Refined Nickel | Nickel Ore + Acid/Heat | Refinery |
| Refined Cobalt | Cobalt Ore + Processing | Refinery |
| Tungsten Powder | Tungsten Ore + Acid + Heat | Chemical Plant |
| Lithium Carbonate | Lithium Ore + Acid | Chemical Plant |
| Rare Earth Oxides | Rare Earth Ores + Acid separation | Chemical Plant |

### Nuclear

| Output | Inputs | Facility |
|--------|--------|----------|
| Yellowcake | Uranium Ore + Acid leaching | Chemical Plant |
| Enriched Uranium | Yellowcake + Centrifuges | Enrichment Facility |

### Silicon

| Output | Inputs | Facility |
|--------|--------|----------|
| Metallurgical Silicon | Silica + Carbon + Heat | Arc Furnace |

### Gases and Cryogenics

| Output | Inputs | Facility |
|--------|--------|----------|
| Hydrogen (H₂) | Water + Electrolysis | Electrolysis Plant |
| Oxygen (gaseous) | Water + Electrolysis | Electrolysis Plant |
| Oxygen (LOX) | Gaseous O₂ + Cryogenic cooling | Cryo Plant |
| Nitrogen (liquid) | Air + Separation + Cryo | Cryo Plant |
| Methane (extracted) | Natural Gas + Separation | Gas Plant |
| Methane (synthesized) | CO₂ + H₂ + Sabatier process | Chemical Plant |
| Kerosene | Crude Oil + Distillation | Refinery |

### Chemicals

| Output | Inputs | Facility |
|--------|--------|----------|
| Sulfuric Acid | Sulfur + Processing | Chemical Plant |
| Caustic Soda | Salt + Electrolysis | Chemical Plant |
| Plastics (raw pellets) | Crude Oil + Cracking | Chemical Plant |
| Ammonia | Nitrogen + Hydrogen + Pressure | Chemical Plant |

---

## Tier 3: Secondary Processing (Alloys & Advanced Materials)

Second-stage processing creates alloys, composites, and high-purity materials.

### Steel Variants

| Output | Inputs | Properties |
|--------|--------|------------|
| Steel | Pig Iron + Carbon control | Standard structural |
| Stainless Steel | Steel + Chromium + Nickel | Corrosion resistant |
| Tool Steel | Steel + Tungsten/Vanadium | Hard, wear resistant |
| Spring Steel | Steel + Silicon/Manganese | Elastic, fatigue resistant |

### Aluminum Variants

| Output | Inputs | Properties |
|--------|--------|------------|
| Aluminum | Alumina + Electrolysis | Lightweight, conductive |
| Aluminum Alloy (structural) | Aluminum + Copper/Zinc | Higher strength |
| Aluminum Alloy (aerospace) | Aluminum + Lithium | Lightest structural metal |

### Titanium and Superalloys

| Output | Inputs | Properties |
|--------|--------|------------|
| Titanium | Titanium Sponge + Melting | High strength-to-weight |
| Titanium Alloy (Ti-6Al-4V) | Titanium + Aluminum + Vanadium | Aerospace standard |
| Superalloy (Inconel) | Nickel + Chromium + Iron | Extreme heat resistance |
| Superalloy (Hastelloy) | Nickel + Molybdenum + Chromium | Corrosion + heat resistance |

### Electrical Materials

| Output | Inputs | Properties |
|--------|--------|------------|
| Copper Wire | Copper + Drawing | Electrical conductor |
| Bronze | Copper + Tin | Bearings, bushings |
| Brass | Copper + Zinc | Fittings, terminals |

### Electronics Materials

| Output | Inputs | Properties |
|--------|--------|------------|
| Electronic-Grade Silicon | Metallurgical Silicon + Zone refining | 99.9999% pure |
| Polysilicon | Electronic Silicon + CVD | Wafer-ready |
| Gallium Arsenide | Gallium + Arsenic + Processing | High-speed electronics |

### Composites

| Output | Inputs | Properties |
|--------|--------|------------|
| Carbon Fiber | Plastics + Pyrolysis + Weaving | Extreme strength-to-weight |
| Fiberglass | Glass + Fiber process | Structural, insulating |
| Kevlar | Plastics + Specialized process | Ballistic protection |
| Ceramic Matrix Composite | Ceramics + Fiber reinforcement | Extreme heat + strength |

### Other Advanced Materials

| Output | Inputs | Properties |
|--------|--------|------------|
| Permanent Magnets (NdFeB) | Rare Earths + Iron + Boron | Motors, generators |
| Ceramic Insulators | Various oxides + Sintering | Heat shields, electrical |
| Battery Electrolyte | Lithium compounds + Solvents | Energy storage |
| Optical Glass | High-purity silica + Additives | Lenses, fiber optics |

---

## Tier 4: Components

Third-stage processing creates functional parts and subassemblies.

### Structural Components

| Output | Key Inputs | Used In |
|--------|------------|---------|
| Steel Frame | Steel + Fabrication | Heavy chassis, facilities |
| Aluminum Frame | Aluminum Alloy + Fabrication | Light chassis, aircraft |
| Titanium Frame | Titanium Alloy + Fabrication | Aerospace, high-end |
| Carbon Composite Panel | Carbon Fiber + Resin + Layup | Lightweight armor, structures |
| Pressure Vessel | Steel/Titanium + Welding | Fuel tanks, reactors |

### Electrical Components

| Output | Key Inputs | Used In |
|--------|------------|---------|
| Wiring Harness | Copper Wire + Insulation | All electronics |
| Electric Motor | Copper + Magnets + Steel | Locomotion, tools |
| Generator | Copper + Magnets + Steel | Power generation |
| Transformer | Copper + Steel core | Power distribution |
| Power Inverter | Electronics + Copper | Power conversion |

### Electronic Components

| Output | Key Inputs | Used In |
|--------|------------|---------|
| Circuit Board (PCB) | Fiberglass + Copper + Etching | All electronics |
| Microprocessor | Polysilicon + Lithography | Compute hardware |
| Memory Chip | Polysilicon + Lithography | Compute hardware |
| Sensor Array | PCB + Various sensors | Drones, facilities |
| Radio Transceiver | PCB + Components | Communication |
| Power Management IC | Polysilicon + Lithography | Battery management |

### Power Storage Components

| Output | Key Inputs | Used In |
|--------|------------|---------|
| Battery Cell | Lithium + Cobalt + Electrolyte | Energy storage |
| Battery Pack | Battery Cells + BMS + Housing | Drones, facilities |
| Fuel Cell Stack | Platinum + Membrane + H₂ system | Clean power generation |
| Supercapacitor | Aluminum + Electrolyte | Burst power |

### Propulsion Components

| Output | Key Inputs | Used In |
|--------|------------|---------|
| Rocket Engine | Superalloy + Turbopumps + Injectors | Main propulsion |
| Thruster | Steel/Titanium + Propellant feed | Attitude control |
| Turbopump | Superalloy + Precision machining | Rocket engines |
| Propellant Tank | Aluminum/Steel + Insulation + Valves | Fuel storage |
| Combustion Chamber | Superalloy + Cooling channels | Engines |

### Mechanical Components

| Output | Key Inputs | Used In |
|--------|------------|---------|
| Gearbox | Steel + Precision gears | Drivetrains |
| Hydraulic System | Steel + Seals + Fluid | Heavy manipulation |
| Actuator | Motor + Gearbox | Articulation |
| Bearing Assembly | Steel/Bronze + Precision | All moving parts |
| Pneumatic System | Aluminum + Valves + Compressor | Light manipulation |

---

## Tier 5: Assembly (Final Products)

Final assembly creates complete functional units.

### Drone Chassis

| Chassis | Key Components | Characteristics |
|---------|----------------|-----------------|
| Micro | Aluminum Frame, Micro Motor, Battery Cell | Tiny, expendable scouts |
| Light | Aluminum Frame, Small Motors, Battery Pack | Fast scouts, light workers |
| Medium | Steel Frame, Motors, Battery Pack | General-purpose workhorse |
| Heavy | Steel/Titanium Frame, Heavy Motors, Large Battery | Combat, heavy industrial |
| Ultra | Titanium Frame, Multiple Motors, Massive Battery/Generator | Mobile bases, heavy lift |

### Drone Modules

| Module Type | Key Components | Function |
|-------------|----------------|----------|
| Sensor Module | Sensor Array, PCB, Processor | Perception, targeting |
| Weapon Module | Steel, Motors, Ammo feed/Energy system | Combat |
| Manipulator Module | Actuators, Sensors, Steel/Aluminum | Physical interaction |
| Compute Module | Processors, Memory Chips, Cooling | Core units, smart drones |
| Power Module | Generator/Fuel Cell/Solar + Battery | Extended range |
| Locomotion Module | Motors, Gearbox, Wheels/Treads/Legs | Movement options |
| Utility Module | Various | Specialized functions |

### Facilities

| Facility | Key Components | Function |
|----------|----------------|----------|
| Mine | Steel Frame, Excavators, Conveyors | Ore extraction |
| Smelter | Steel Frame, Refractory, Heating | Tier 2 metal processing |
| Refinery | Steel, Pipes, Reactors, Control | Tier 2 chemical processing |
| Chemical Plant | Steel, Reactors, Pipes, Sensors | Tier 2-3 processing |
| Cryo Plant | Steel, Compressors, Insulation | Cryogenic production |
| Arc Furnace | Steel, Electrodes, Power system | Silicon, specialty metals |
| Fabrication Bay | Steel Frame, CNC, Robots | Component manufacturing |
| Electronics Fab | Clean room, Lithography, Chemicals | Chips, PCBs |
| Assembly Plant | Large Frame, Robots, Conveyors | Final assembly |
| Power Plant | Generators, Transformers, Fuel/Solar/Nuclear | Energy generation |
| Electrolysis Plant | Steel, Electrodes, Water system | H₂/O₂ production |

### Rocket Components

| Component | Key Inputs | Notes |
|-----------|------------|-------|
| Rocket Stage | Titanium Frame, Engines, Tanks, Avionics | Main vehicle section |
| Fuel Tank | Aluminum/Steel, Insulation, Valves | Propellant storage |
| Avionics Package | Electronics, Sensors, Radio | Guidance and control |
| Payload Fairing | Composite/Aluminum, Separation system | Cargo protection |
| Launch Support | Steel Structure, Fuel lines, Control | Ground infrastructure |

---

## Propellant Combinations

| Fuel Type | Oxidizer | Fuel | Performance | Notes |
|-----------|----------|------|-------------|-------|
| **Methylox** | LOX | Methane | High ISP, medium density | Clean-burning, reusable-friendly |
| **Keralox** | LOX | Kerosene | Medium ISP, high density | Traditional, easy to store |
| **Hydrolox** | LOX | Hydrogen | Highest ISP, low density | Cryogenic, requires large tanks |
| **Hypergolic** | NTO | Hydrazine variants | Low ISP, instant ignition | Toxic, used for thrusters |

### Propellant Production Chains

**Methylox:**
```
Water → Electrolysis → H₂ + O₂
CO₂ (atmosphere) + H₂ → Sabatier → Methane
O₂ → Cryo → LOX
Result: Methane + LOX
```

**Keralox:**
```
Crude Oil → Distillation → Kerosene
Water/Air → Processing → LOX
Result: Kerosene + LOX
```

**Hydrolox:**
```
Water → Electrolysis → H₂ + O₂
H₂ → Cryo → LH₂
O₂ → Cryo → LOX
Result: LH₂ + LOX
```

---

## Geographic Scarcity

Material distribution forces strategic expansion.

### Common (Available Everywhere)
- Iron Ore
- Bauxite
- Silica
- Water (most regions)

### Moderate (Scattered Deposits)
- Copper Ore
- Nickel Ore
- Tin Ore
- Natural Gas

### Limited (Specific Regions)
- Titanium Ore
- Tungsten Ore
- Lithium (former salt flats: South America, Australia)
- Crude Oil (declining, old infrastructure)

### Rare (Highly Concentrated)
- Rare Earth Ores (former China, Australia, Brazil regions)
- Cobalt Ore (former Congo region)
- Uranium (specific geological formations)

### Strategic Implications

- Early game: Rely on common materials and scavenging
- Mid game: Expand to secure limited resources
- Late game: Contest rare material deposits, may require dealing with rogue AI territories

---

## Facility Requirements Summary

| Processing Tier | Required Facilities |
|-----------------|---------------------|
| Tier 1: Extraction | Mine, Oil Well, Gas Well, Air Separator, Water Extractor |
| Tier 2: Primary | Smelter, Refinery, Chemical Plant, Electrolysis Plant, Cryo Plant, Arc Furnace |
| Tier 3: Secondary | Advanced Smelter, Alloy Foundry, Composite Plant, Electronics Materials Lab |
| Tier 4: Components | Fabrication Bay, Electronics Fab, Motor Plant, Assembly Line |
| Tier 5: Assembly | Assembly Plant, Drone Factory, Rocket Assembly Building |

---

## Open Questions

- **Exact quantities:** How much iron ore → steel? What are the conversion ratios?
- **Processing times:** How long does each step take in game-time?
- **Facility sizes:** What footprint and power draw for each facility type?
- **Automation depth:** How much can supply chains be automated vs. requiring player intervention?
- **Quality levels:** Should materials have quality tiers affecting final product performance?
- **Decay/degradation:** Do stockpiled materials degrade over time?
