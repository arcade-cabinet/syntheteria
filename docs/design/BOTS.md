---
title: "Bots"
domain: design
status: canonical
last_updated: 2026-03-13
summary: "9 chassis, archetype families, roles, Mark progression I-V, upgrade tracks, speech profiles"
depends_on:
  - GAME_DESIGN.md
  - ECONOMY.md
planned_work:
  - "Bot speech bubbles — emergent contextual dialogue during gameplay"
  - "Hacking capture flow — hack hostile bot -> convert to player faction"
---

# Syntheteria — Bots

## 1. Core Principle

Syntheteria should not drift toward a traditional 4X tech tree with dozens of mostly redundant units. The player is an efficiency-seeking machine intelligence. The roster should therefore be built around:

- a small number of core archetypes
- recognizable chassis families
- Mark-level iteration (Mark I through Mark V)
- logarithmic upgrade scaling instead of endless branching unit sprawl

The machine question is not "what new random unit did I unlock?" It is:

- which chassis family is appropriate
- what role does it serve
- what Mark has this line reached
- which upgrade tracks has it prioritized

## 2. Chassis Pool

The local robot inventory lives under `assets/models/robots` and currently includes nine chassis:

- `Companion-bot.glb`
- `ReconBot.glb`
- `MobileStorageBot.glb`
- `Arachnoid.glb`
- `FieldFighter.glb`
- `Mecha01.glb`
- `MechaTrooper.glb`
- `MechaGolem.glb`
- `QuadrupedTank.glb`

These are classified in code through `src/bots`.

## 3. Player Bots (6 Models, All Fabricable)

| # | Model | Role | Specialization | Starting? | Mark Progression |
|---|-------|------|---------------|-----------|-----------------|
| 1 | **Companion-bot** | **Technician** | Repair, maintain, component install | Yes (broken camera) | Faster repair, more complex repairs, auto-repair aura |
| 2 | **ReconBot** | **Scout** | Explore, survey, map, detect | Yes | Wider vision, detect hidden resources, reveal cultist camps |
| 3 | **FieldFighter** | **Striker** | Melee combat, breach assault | Yes | Harder hits, component targeting, area stun |
| 4 | **Mecha01** | **Fabricator** | Build structures, harvest structures | Yes | Faster build/harvest, can build larger structures, multi-harvest |
| 5 | **MechaGolem** | **Guardian** | Defensive combat, area denial | Yes | Damage reduction, taunt radius, shield aura |
| 6 | **MobileStorageBot** | **Hauler** | Transport resources, logistics | Fabricated | More cargo, auto-route, supply chain automation |

## 4. Hostile Bots (3 Models, Hackable)

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

Combat capability **grows through the Exterminate pillar** — you don't just kill enemies, you hack them and gain new unit types. This is deeply lore-aligned: you're an AI consciousness that recruits machines.

## 5. Archetype Families

The archetype layer in code:

- `field_technician`
- `relay_hauler`
- `fabrication_rig`
- `substation_engineer`
- `foundry_seed`
- `assault_strider`
- `defense_sentry`
- `feral_raider`
- `cult_conduit`

These are intentionally broader than the currently spawned in-game roster so future roles can expand without replacing the contract.

### Starting Gameplay Roles

- **Field Technician** — awakening/tutorial voice, repair, scouting, map merge discovery
- **Relay Hauler** — route servicing, resource hauling, relay extension
- **Fabrication Rig** — crafting, component rebuilding, local industrial anchor
- **Substation Engineer** — substation establishment, storm hardening, defensive preparation
- **Foundry Seed** — new base / city founding, forward hub deployment
- **Assault Strider** — attack, escort, breach
- **Defense Sentry** — zone control, base defense, line holding

## 6. Mark Progression

Every archetype line scales through Mark levels with logarithmic returns.

| Mark | Label | Multiplier | Key Resource | Fabrication Time |
|------|-------|-----------|-------------|-----------------|
| I | Mark I | 1.0x | Basic materials | Fast |
| II | Mark II | 1.8x | + Silicon Wafer | Medium |
| III | Mark III | 3.0x | + Conductor Wire | Long |
| IV | Mark IV | 5.0x | + EL Crystal | Very Long |
| V | Mark V | 8.0x | + Massive investment | Endgame |

Mark IV-V bots can only be **upgraded** from Mark III bots, not built from scratch. See [ECONOMY](ECONOMY.md) for Motor Pool tier details.

### Specialist Effectiveness Per Role

- **Technician**: Repair speed x Mark, repair range, auto-repair at Mark III+
- **Scout**: Vision radius x Mark, detection quality, auto-map at Mark III+
- **Striker**: Melee damage x Mark, attack speed, component targeting at Mark III+
- **Fabricator**: Build speed x Mark, harvest yield x Mark, multi-structure at Mark III+
- **Guardian**: Damage reduction x Mark, taunt radius, shield projection at Mark III+
- **Hauler**: Cargo capacity x Mark, speed x Mark, auto-route at Mark III+

### Upgrade Track Families

- mobility
- surveying
- repair
- relay
- logistics
- fabrication
- founding
- terrain
- assault
- defense

Each chassis has a base Mark level. Each track can diverge above the base Mark. The most advanced track becomes the chassis' practical specialization focus. The formula lives in `src/bots/progression.ts`.

## 7. Robots Do NOT Consume — They BUILD and Move On

Key design principle: **Bots are workers, not settlers.**

When a Fabricator builds:
1. Player selects Fabricator -> Radial menu -> Build -> Structure type
2. Fabricator walks to location
3. Fabricator builds over N ticks (staged: foundation -> shell -> interior -> operational)
4. Fabricator is FREE to do other work

When a Fabricator harvests:
1. Player selects Fabricator -> Radial menu -> Harvest
2. Fabricator walks to target structure
3. Fabricator harvests over N ticks (based on structure durability)
4. Resources deposited at nearest storage hub
5. Structure consumed, Fabricator moves on

## 8. AI Ownership

Bot definitions are not just render metadata. They include:

- default AI role
- steering profile
- navigation profile
- speech profile

Bot definitions are the correct handoff point into Yuka-backed AI control rather than a later ad hoc mapping layer.

## 9. Diegetic Speech And Tutorial Role

Speech bubbling should come from actual machines, not abstract tutorial panels.

Speech profiles:

- `mentor`
- `scout`
- `quartermaster`
- `fabricator`
- `warden`
- `feral`
- `cult`

This creates a path for:

- diegetic tutorial guidance
- role-specific local context
- bot-anchored world interaction overlays

## 10. Implementation Boundary

Canonical code ownership:

- roster definitions: `src/bots/definitions.ts`
- archetypes and tracks: `src/bots/archetypes.ts`
- progression math: `src/bots/progression.ts`
- Koota unit trait metadata: `src/ecs/traits.ts`
- persistence of archetype / Mark / speech state: `src/world/*` and `src/db/*`

The roster package also owns:

- progression summaries for UI, AI, and balancing
- per-track focus evaluation
- deterministic next-step upgrade potential for every archetype line

## 11. External Candidate Audit

Nearby asset candidates already identified under `/Volumes/home/assets`:

- machine expansion:
  - `3DLowPoly/Characters/SciFi/Animated Mech Pack - March 2021`
  - `3DLowPoly/Characters/SciFi/Animated Robot - Oct 2018`
  - `3DLowPoly/Characters/SciFi/SciFiCharacters-ZuhianTeiyu/CyberSoldier/CyberSoldier.glb`
- human/cult fallback candidates:
  - `3DLowPoly/Characters/Animated/Ultimate Animated Character Pack - Nov 2019/Soldier_*.glb`
  - `3DLowPoly/Characters/Animated/Ultimate Animated Character Pack - Nov 2019/Worker_*.glb`
  - `3DLowPoly/Characters/Animated/KayKit_Adventurers_1.0_EXTRA/Rogue_Hooded.glb`

These are not yet canonical runtime imports, but they are the current highest-value review targets when expanding the machine and cult rosters.
