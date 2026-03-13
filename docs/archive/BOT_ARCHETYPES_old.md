# Bot Archetypes

This document defines the machine roster as production gameplay contracts rather than a loose set of one-off unit types.

## 1. Core Principle

Syntheteria should not drift toward a traditional 4X tech tree with dozens of mostly redundant units. The player is an efficiency-seeking machine intelligence. The roster should therefore be built around:

- a small number of core archetypes
- recognizable chassis families
- Mark-level iteration (`Mark I`, `Mark II`, `Mark III`, ...)
- logarithmic upgrade scaling instead of endless branching unit sprawl

The machine question is not "what new random unit did I unlock?" It is:

- which chassis family is appropriate
- what role does it serve
- what Mark has this line reached
- which upgrade tracks has it prioritized

## 2. Current Chassis Pool

The local robot inventory now lives under `assets/models/robots` and currently includes nine chassis:

- `Companion-bot.glb`
- `ReconBot.glb`
- `MobileStorageBot.glb`
- `Arachnoid.glb`
- `FieldFighter.glb`
- `Mecha01.glb`
- `MechaTrooper.glb`
- `MechaGolem.glb`
- `QuadrupedTank.glb`

These are now classified in code through `src/bots`.

## 3. Archetype Families

Current archetype layer:

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

## 4. Starting Gameplay Roles

The docs now support a clearer early/mid-game role breakdown:

- **Field Technician**
  - awakening/tutorial voice
  - repair
  - scouting
  - map merge discovery
- **Relay Hauler**
  - route servicing
  - resource hauling
  - relay extension
- **Fabrication Rig**
  - crafting
  - component rebuilding
  - local industrial anchor
- **Substation Engineer**
  - substation establishment
  - storm hardening
  - defensive preparation
- **Foundry Seed**
  - new base / city founding
  - forward hub deployment
- **Assault Strider**
  - attack
  - escort
  - breach
- **Defense Sentry**
  - zone control
  - base defense
  - line holding

This gives us an ecumenopolis-scale 4X roster without needing a bloated catalog.

## 5. Mark Progression

Every archetype line should be able to scale indefinitely through Mark levels.

Current design:

- each chassis line starts at `Mark I`
- growth is driven by upgrade tracks
- scaling uses logarithmic returns so Marks can grow indefinitely without exploding balance

Current track families:

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

The formula lives in `src/bots/progression.ts`.

The runtime expectation is now:

- each chassis has a base Mark level
- each track can diverge above the base Mark
- the most advanced track becomes the chassis' practical specialization focus
- upgrade growth remains logarithmic so the same archetype can keep scaling without needing infinite new unit classes

This is the intended replacement for a traditional sprawling tech tree.

## 6. AI Ownership

Bot definitions are not just render metadata. They now include:

- default AI role
- steering profile
- navigation profile
- speech profile

That means bot definitions are the correct handoff point into Yuka-backed AI control rather than a later ad hoc mapping layer.

## 7. Diegetic Speech And Tutorial Role

Speech bubbling should come from actual machines, not abstract tutorial panels.

The bot package now includes speech profiles so early-game lore and onboarding can be attached to real chassis:

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

## 8. Implementation Boundary

Canonical code ownership:

- roster definitions: `src/bots/definitions.ts`
- archetypes and tracks: `src/bots/archetypes.ts`
- progression math: `src/bots/progression.ts`
- Koota unit trait metadata: `src/ecs/traits.ts`
- persistence of archetype / Mark / speech state: `src/world/*` and `src/db/*`

The roster package now also owns:

- progression summaries for UI, AI, and balancing
- per-track focus evaluation
- deterministic next-step upgrade potential for every archetype line

The old flat `src/config/units.json` layer has been removed.

## 9. External Candidate Audit

Nearby asset candidates already identified under `/Volumes/home/assets`:

- machine expansion:
  - `3DLowPoly/Characters/SciFi/Animated Mech Pack - March 2021`
  - `3DLowPoly/Characters/SciFi/Animated Robot - Oct 2018`
  - `3DLowPoly/Characters/SciFi/SciFiCharacters-ZuhianTeiyu/CyberSoldier/CyberSoldier.glb`
- human/cult fallback candidates:
  - `3DLowPoly/Characters/Animated/Ultimate Animated Character Pack - Nov 2019/Soldier_*.glb`
  - `3DLowPoly/Characters/Animated/Ultimate Animated Character Pack - Nov 2019/Worker_*.glb`
  - `3DLowPoly/Characters/Animated/KayKit_Adventurers_1.0_EXTRA/Rogue_Hooded.glb`

These are not yet canonical runtime imports, but they are the current highest-value next review targets when expanding the machine and cult rosters.
