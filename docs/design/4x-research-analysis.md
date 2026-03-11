# 4X Game Design Research — Comparative Analysis

**Date:** 2026-03-10
**Purpose:** Inform Syntheteria's governor design by analyzing established 4X games

---

## Games Analyzed

1. **Civilization VI** — Turn-based 4X
2. **Stellaris** — Real-time 4X
3. **Age of Empires IV** — RTS-4X hybrid
4. **Factorio** — Factory builder with 4X elements
5. **RimWorld** — Colony sim with adaptive AI storyteller

---

## Key Takeaways for Syntheteria

### 1. Factorio's Cascading Dependency Loop is Our Model

The harvest→compress→carry→build cycle should create cascading demand:
- Need cubes → need powder → need deposits → need territory → need defense
- Each step creates demand for the previous step at increasing scale
- This is exactly what makes Factorio addictive — every "solution" creates 2-3 new "problems"

### 2. RimWorld's Wealth-Based Threat Scaling is Perfect for Cube Economy

- Colony wealth drives raid difficulty (buildings count at 50%)
- Creates the "success paradox" — prosperity makes you a bigger target
- **Syntheteria parallel:** visible cube stockpiles ARE your wealth, enemies should target them proportionally
- Skilled players practice "wealth management" — don't over-stockpile

### 3. Physical/Visible Economy is Our Biggest Differentiator

No other 4X makes resources this tangible. Factorio comes closest (items on belts), RimWorld second (stockpile stacks). But cubes that enemies can SEE and STEAL creates strategic tension abstract counters never can.

### 4. GOAP for AI Governors Aligns with Industry Best Practice

The hierarchical manager pattern (Grand Strategic AI delegates to Expansion/Military/Economic/Research managers) is used across all successful 4X AI. GOAP with A*-planned action sequences produces more coherent behavior than rule-based systems. Confirmed by F.E.A.R. and Total War implementations.

### 5. Common AI Failures to Avoid

Every game studied has these AI weaknesses:
- Over-deterministic behavior (same inputs → same outputs) — add randomization
- Failure to evaluate consequences before declaring war
- Reliance on resource bonuses at higher difficulty, NOT improved decision-making
- Poor siege/complex-unit management
- Inability to exploit expansion mechanics designed for human thinking

### 6. Onboarding Through Core Loop, Not Front-Loading

Don't present all systems simultaneously. Start with grind→compress→build-one-thing. Each crafted item naturally introduces the next system. 10-16% retention improvements from better onboarding (Google Play data).

---

## Essential Mechanics Tiers

### Tier 1: Required for 4X (must have)

| System | Best Implementation | Syntheteria Status |
|--------|--------------------|--------------------|
| Map Exploration / Fog of War | Stellaris (anomalies, escalating discovery) | Implemented (fogOfWar.ts) |
| Territory Claiming | Civ VI (districts physically occupy tiles) | Implemented (territory.ts + outpost.ts) |
| Resource Economy | Factorio (physical, visible) | Core exists (cubes), integration missing |
| Technology/Research Tree | Civ VI (dual tree with Eureka boosts) | Implemented (techTree.ts) |
| Military/Combat | AoE4 (hard counters) | Implemented (combat.ts, fpsCombat.ts) |
| Multiple Victory Paths | Civ VI (5-6 conditions) | Basic (gameOver.ts), needs expansion |

### Tier 2: Creates Depth

| System | Best Implementation | Syntheteria Status |
|--------|--------------------|--------------------|
| AI with Personality | Stellaris (ethics-driven types) | Partial (GOAP exists, broken) |
| Diplomacy | Civ VI (agendas + delegation) | Basic (diplomacySystem.ts) |
| Economic Specialization | Civ VI (district adjacency) | Not implemented |
| Threat Scaling | RimWorld (wealth-based) | Not implemented |
| Progressive Unlocks | Factorio (science pack tiers) | Tech tree exists, not gated properly |

### Tier 3: Elevates

| System | Best Implementation | Syntheteria Status |
|--------|--------------------|--------------------|
| Physical/Visible Economy | Factorio (items on belts) | Core differentiator — cubes ARE this |
| Emergent Narratives | RimWorld (storyteller + psychology) | Otter holograms, needs expansion |
| Asymmetric Factions | AoE4 (aggressive asymmetry) | 4 races defined, not differentiated in gameplay |
| Crisis/Endgame Events | Stellaris (galaxy threats) | Not implemented |
| Adaptive Pacing | RimWorld (storyteller evaluates colony) | aiPeacePeriod.ts exists, disconnected |
| Spatial Puzzles | Civ VI (district adjacency) | Cube stacking IS a spatial puzzle |

---

## Detailed Game Analysis

### Civilization VI

**Districts:** Cities occupy multiple tiles through districts (Campus, Industrial Zone, etc.). Each gets adjacency bonuses from terrain and neighbors. Limited to one district per 3 population, forcing specialization. Can be pillaged by enemies.

**Dual Progression:** Science drives Technology tree; Culture drives Civics tree. Civics unlock Policy Cards and Government types. "Eureka Moments" (boosts) accelerate 50% when completing specific in-game actions.

**Government & Policy Cards:** Government types provide slot configurations (Military, Economic, Diplomatic, Wildcard). Cards swappable free when Civic completes. Creates "deck-building" feel.

**Three Resource Types:**
- Bonus (Wheat, Deer): improve yields
- Luxury (Silk, Diamonds): provide Amenities, tradeable
- Strategic (Iron, Horses, Oil): required for specific military units

**Amenities & Housing:** Amenities per-city (1 per 2 citizens after first 2). Housing caps population growth. Sources: freshwater, buildings, improvements.

**Loyalty (Rise and Fall):** Cities have loyalty score; low loyalty → Free City → may flip to rival. Governors increase loyalty.

**Victory Conditions:** Science (Mars colony), Culture (tourism dominance), Domination (all capitals), Religion (majority in all civs), Diplomacy (20 Victory Points), Score (fallback).

**AI Weaknesses:** Cannot wage naval/air war effectively. Poor war consequence evaluation. Relies on yield bonuses at higher difficulty, not better decisions. Can't exploit DLC mechanics.

### Stellaris

**Pop-Based Economy:** Pops work Jobs created by Districts and Buildings. Job tiers: Ruler > Specialist > Worker. Buildings don't produce without pops. Economy is fundamentally pop-driven.

**Resources:** Energy Credits (currency), Minerals (building), Food (growth), Alloys (ships), Consumer Goods (specialist upkeep). Strategic: Volatile Motes, Rare Crystals, Exotic Gases. Abstract: Unity, Influence, Research.

**Expansion:** Requires Influence (limited) to claim systems. Colonization needs colony ships (Alloy-expensive). Administrative capacity creates sprawl penalties.

**Intel System:** 0-100 across categories (Government, Military, Diplomatic, Economic, Technology). Spy networks require Envoys. Without intel, rival borders/fleets/stances hidden.

**Anomalies:** 5% base chance per body surveyed, +0.5% per failure. Range from minor bonuses to precursor chain storylines spanning entire game.

**Crises:** Midgame (War in Heaven, Great Khan). Endgame (Prethoryn Scourge, Unbidden, Contingency). "Become the Crisis" lets player BE the threat.

**Megastructures:** Dyson Sphere, Ring World, Science Nexus, etc. Years to build. Late-game economic triumph.

**AI:** Personality types from ethics/traits/government. Aggressiveness affects war declaration. "War preparation" phases before declaring.

### Age of Empires IV

**Villager Economy:** Universal worker. Food efficiency tiers: sheep > deer > berries > boar > farms. Creates decision sequences.

**Landmark Age-Up:** Choose between two Landmark buildings per age transition. Distinct asymmetric bonuses. Makes aging up a strategic decision.

**Aggressive Asymmetry:** Mongols move buildings. English get longbows + farm bonuses. Chinese use dynasty bonuses + tax. Delhi gets free but slow research. HRE uses relics for economy.

**Stone Walls:** Invulnerable to most attacks; only siege weapons breach. Infantry on walls get damage reduction. Clear attacker/defender asymmetry.

### Factorio

**Science Pack Escalation:** 7 tiers of increasing complexity. Each requires automating ALL previous tiers' components. Compound complexity.

**Three Logistics Paradigms:**
- Belts: Simple, visual, throughput-limited, short/medium distance
- Trains: High throughput, long distance, require signaling
- Robots: Flexible routing, easy setup, CPU-intensive at scale

**Biter Evolution:** Pollution from factories spreads. Nests absorb pollution → send attacks. Evolution Factor increases from: pollution, time, nests destroyed. Higher evolution → tougher variants. Direct feedback loop: bigger factory → stronger enemies.

**Physical Economy:** Items exist on belts, in chests, in machines. Bottlenecks diagnosed visually. The economy is never abstract.

### RimWorld

**Storyteller AI:** Cassandra (rising tension), Phoebe (peaceful intervals), Randy (unpredictable). Evaluate: colony wealth, colonist count, combat animals, recent deaths, time since last event.

**Wealth-Based Raids:** Raid points from total wealth (buildings 50%) + colonist count. "Success paradox" — prosperity = bigger target.

**Colonist Needs/Moods:** 0-100% scale. Mental break thresholds at 35%, 20%, 5%. Needs: Food quality, Rest, Comfort, Beauty, Recreation (20+ types with tolerance decay), Social, Temperature.

**Expectations Paradox:** Under 15k wealth: +30 mood. At 308k wealth: 0 bonus. Wealthy colonies need finer amenities or colonists become unhappy despite abundance.

---

## Why Players Bounce Off 4X Games

1. **Information Overload** — Too many systems presented simultaneously
2. **Decision Paralysis** — Can click buttons but don't understand WHY one choice is better
3. **Mid-Game Stagnation** — Best part is first 100 turns; once map known, becomes spreadsheet
4. **Session Length** — 6-20+ hours; players who bounce early never see mid/late systems
5. **Mitigation:** Gradual system introduction, narrative framing, hybridization, shorter formats

---

## The "Feel Complete" Formula

A 4X that feels complete needs:
1. **Strong early-game hook** — exploration, discovery, survival (not just econ setup)
2. **Mid-game systems creating NEW decision types** — not just "more" of early-game
3. **Late-game crisis/pressure** — prevents coasting to victory
4. **Visible progress** — SEE empire growth, not just track numbers
5. **Meaningful rivalry** — AI feels intelligent and reactive
6. **Multiple viable strategies** — no single dominant path

---

*Sources: Civilization Wiki, Paradox Wiki, Factorio Wiki, RimWorld Wiki, Game Developer articles, Google Play data, Game AI Pro, SpaceSector AI analysis*
