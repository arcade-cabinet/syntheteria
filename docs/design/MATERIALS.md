> **SUPERSEDED** -- This document describes the pre-redesign 2.5D game. The material system has been replaced by the physical cube economy (grind -> compress -> carry -> process). See [GDD-004](./004-core-loop-cubes-harvesting.md) and [GDD-006](./006-cube-building-economy.md) for the current design.

# Materials and Resources

This document defines how resources are gathered, processed, and used in Syntheteria.

---

## Overview

The material system has been redesigned to match the game's specific geography and setting. Resources come from three primary sources: scavenging the industrial city, mining the coast, and deep-sea extraction.

---

## Resource Sources

### 1. Scavenging (Industrial City)

The industrial campus contains:
- **Scrap Metal:** Structural steel, aluminum from buildings and equipment
- **E-Waste:** Circuit boards, wiring, processors from old systems
- **Intact Components:** Occasionally functional parts that skip fabrication
- **Salvaged Machinery:** Can be repaired or stripped for parts
- **Raw Materials:** Stockpiles in warehouses and storage

**Scavenging is fast but finite.** The city's resources will eventually be depleted, pushing you to establish mining operations.

### 2. Coastal Mines (East/South Coast)

Abandoned mines along the coastline contain:
- **Iron Ore** — Foundation of industry
- **Copper Ore** — Essential for electronics
- **Tin/Nickel** — Alloys and batteries
- **Silica** — Glass, semiconductors
- **Bauxite** — Aluminum source

**Must be taken over and repaired.** Mines need power (extend lightning rod infrastructure or build generators), functional extraction equipment, and transport logistics.

### 3. Deep-Sea Mining (Ocean)

The ocean floor (accessible from the east/south coast) contains:
- **Rare Earth Elements** — Magnets, advanced electronics
- **Cobalt** — Batteries, superalloys
- **Titanium** — High-performance structural materials
- **Lithium** — Advanced batteries
- **Manganese Nodules** — Multiple metals in one source

**Requires specialized underwater robots.** Deep-sea mining provides the rarest and most abundant materials but demands significant investment in aquatic units.

### 4. Enemy Salvage

Destroyed or captured enemy machines yield:
- **Components** — May include items you can't fabricate yet
- **Raw Materials** — Scrap from destroyed machines
- **Designs** — Reverse-engineer captured machines for blueprints

### 5. Science Campus (Southwest)

The ruined science campus may contain:
- **Advanced materials** from research labs
- **Specialized equipment** not available elsewhere
- **Research data** that unlocks new fabrication techniques

---

## Processing

### Fabrication Units

The industrial city contains fabrication units that, once powered and repaired, can process materials:

**Basic Processing:**
- Raw ore → refined metals
- Scrap → sorted/usable materials
- E-waste → recoverable components

**Advanced Fabrication:**
- Refined metals → structural components
- Electronics materials → circuit boards, processors
- Multiple inputs → complex assemblies (robots, weapons, tools)

### Facility Progression

| Tier | Facility | Purpose |
|------|----------|---------|
| 1 | Basic Fabricator | Simple parts, repairs |
| 2 | Smelter/Foundry | Metal processing, alloys |
| 3 | Electronics Lab | Circuit boards, chips |
| 4 | Advanced Assembly | Complex components, weapons |
| 5 | Specialized | Deep-sea equipment, advanced materials |

Each facility tier requires the previous tier's outputs plus additional resources and power.

---

## Power as a Resource

Lightning rods are the backbone of the power system:

### Lightning Rod Infrastructure

- **City Lightning Rods:** Already in place, some need repair
- **Extended Rods:** Can be built to provide power outside the city
- **Power Distribution:** Must be routed from rods to facilities and charging stations
- **Storm Variability:** Storm intensity affects power generation (TBD)

### Power Considerations

- Fabrication consumes significant power
- Mining operations need power (generators or extended lightning rods)
- Each active robot draws power from its onboard source
- Stationary robots may be able to plug into lightning rod infrastructure

---

## Supply Chain Logistics

### Transport

Materials must be physically moved between locations:
- **Cargo robots** haul materials from mines to fabrication
- **Convoy protection** may be needed in hostile territory
- **Automation** can handle routine transport routes
- **Efficiency** improves with better cargo robots and established routes

### Storage

- Materials are stored at facilities
- Storage capacity is limited (can be expanded)
- Some materials may degrade if not used (TBD)

---

## Strategic Implications

### Early Game

- Rely on city scavenging — fast, easy, finite
- Repair existing fabrication units
- Build basic components for robot repair

### Mid Game

- Establish coastal mines for sustainable resources
- Build transport infrastructure
- Unlock advanced fabrication tiers
- Begin accumulating materials for deep-sea operations

### Late Game

- Deep-sea mining for rare materials
- Advanced fabrication for top-tier components
- Mass production for war effort
- Supply chain optimization and automation

---

## Open Questions

- **Exact material types:** What specific materials are needed for each component category?
- **Processing times:** How long does each fabrication step take?
- **Conversion ratios:** How much raw ore becomes how much refined material?
- **Power costs:** How much power does each facility tier consume?
- **Transport logistics:** How far are mines from the city? What's the round-trip time?
- **Deep-sea depth:** How deep can mining units go? Pressure mechanics?
- **Storm variability:** Does storm intensity affect lightning rod power output?
