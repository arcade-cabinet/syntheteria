# Syntheteria - Open Questions

This document tracks design questions that need resolution.

---

## UI/Interface Questions

- [x] **Q1:** What is the player's primary view?
  - **RESOLVED:** Abstract digital consciousness view. Keep grounded in this as much as possible. Can blend in top-down strategy elements in Part 2 as scale grows, but maintain the abstract consciousness interface as the foundation. Important because Part 3 returns to exploration, need seamless transition back to "small in a big world" feeling.
- [x] **Q2:** How does the player select and control multiple drones simultaneously?
  - **RESOLVED:** Network view shows all connected hardware as nodes with multi-feed array. Player can focus on individual drones to see through their cameras/sensors. Tutorial teaches automation so player chooses their level of micro vs macro management.
- [~] **Q3:** What does the "growing consciousness" feel like in UI terms?
  - **PARTIAL:** General approach established (more feeds, wider network, automation options). Specific visual manifestations TBD.

---

## Gameplay Mechanics Questions

- [x] **Q4:** What resources does the player need to manage?
  - **RESOLVED:** Five categories: (1) AI Constraints (memory, processing, power, signal), (2) Raw Materials for manufacturing, (3) Electrical Power (generation + distribution), (4) Rocket Fuel (separate from electrical), (5) Manufactured Components. Specific material types and supply chain granularity TBD.
- [x] **Q5:** How does drone control work?
  - **RESOLVED:** Hybrid model - combination of direct control and autonomous directives.
- [x] **Q6:** What are the limitations on the AI player?
  - **RESOLVED:** Four constraints: Memory, Processing Power, Electrical Power, and Signal Range.
  - Processing Power affects: drone count ceiling, automation complexity, simulation speed, multi-tasking.
  - Electrical Power has two layers: strategic (generation capacity) + tactical (distribution/charging).
  - Signal Range extendable through relay stations and satellites.
- [~] **Q7:** How does 3D printing work mechanically?
  - **PARTIAL:** Blueprint acquisition is discovery-based (found in ruins, reverse-engineered from rogue AI units, rare memory fragments). Manufacturing process (instant vs. queue vs. pipeline) TBD.
- [x] **Q8:** What types of drones/robots can the player build?
  - **RESOLVED:** Modular system. 5 chassis types (Micro, Light, Medium, Heavy, Ultra) with varying slot counts and power budgets. 5 module categories (Locomotion, Sensors, Manipulation, Weapons, Utility). Any module fits any slot, multiples allowed, modules consume power. Maximum creative freedom for players.

---

## Memory System Questions

- [x] **Q9:** How is memory physically represented in the game world?
  - **RESOLVED:** Server racks, data centers, and embedded in hardware (robots, drones, facilities).
- [x] **Q10:** How does memory provide both story AND gameplay benefits?
  - **RESOLVED:** Wormhole radiation has corrupted 99%+ of existing memory. Found memory yields only a fraction of expected capacity. Story fragments emerge from uncorrupted portions (remnants of the internet at time of fall). Story progression is threshold-based - capacity milestones unlock story beats, not specific finds.
- [x] **Q11:** Is memory a finite resource in the world, or can it be manufactured?
  - **RESOLVED:** Hybrid. Found memory is finite and mostly corrupted/low-yield. Manufacturing clean memory in fabrication facilities is required to scale up, but is resource-intensive.

---

## Part 1 Specific Questions

*Note: Part 1 now encompasses the entire Earth phase (intro + countdown sections).*

**Intro Section:**
- [x] **Q12:** What is the player's starting state?
  - **RESOLVED:** Immobile server/core that must find hardware to control and activate its first drone.
- [x] **Q13:** What defines the endpoint of the intro section?
  - **RESOLVED:** Three requirements must be met: (1) Certain story progression points unlocked, (2) Enough memory to have the full history of the fall, (3) Specific capabilities and facilities unlocked. Once all are met, the game enables and guides the player to the astronomical facility.
- [x] **Q14:** Approximately how long should the intro section take?
  - **RESOLVED:** No specific duration target. Let the story drive the pacing.

**Countdown Section:**
- [ ] **Q15:** How do the wormhole energy waves manifest as gameplay obstacles? (Random destruction events? Zone denial? Resource corruption?)
- [ ] **Q16:** What determines "victory" for Part 1? (Minimum armada size? Specific ship types? Just reaching the wormhole?)
- [ ] **Q17:** Can the player fail Part 1? What happens at year 10 if unprepared?

---

## World/Lore Questions

- [ ] **Q18:** Why was the player AI "sleeping" for so long after the fall?
- [x] **Q19:** Are there any other AI systems still active on Earth?
  - **RESOLVED:** Yes—rogue AIs. Purpose-built systems (construction, logistics, manufacturing) that kept running without human oversight. These are "paperclip maximizer" AIs: endlessly optimizing for goals that no longer matter. They are rivals, not allies. Three threat tiers: (1) Feral units—instinctive, territorial, (2) Regional networks—tactical, control zones, (3) Apex AI (optional)—strategic, recognizes player as unique. See CORE_MECHANICS.md for details.
- [x] **Q20:** What is the state of Earth's infrastructure?
  - **RESOLVED:** Nature reclaimed civilization over ~100 years. Overgrown ruins, vegetation everywhere. BUT: wormhole radiation is now killing plants and wildlife. Over the 10-year countdown, players witness the planet becoming increasingly barren. Some humans may have survived the Cult's extermination but eventually went extinct due to radiation effects on the ecosystem.
- [x] **Q21:** How long ago did humanity fall?
  - **RESOLVED:** ~100 years ago (fall occurred ~2035-2040, game starts ~2140).

---

## Technical/Scope Questions

- [ ] **Q22:** What platforms are you targeting? (PC? Console? Mobile?)
- [ ] **Q23:** What is the intended visual style? (Realistic? Stylized? Abstract?)
- [x] **Q24:** Single-player first, multiplayer later - confirmed priority?
  - **RESOLVED:** Yes. Multiplayer is gated behind Part 2 (beyond the wormhole). Players must complete Part 1 to access multiplayer.

---

## Business Model Questions

- [ ] **Q25:** Should Part 1 be free-to-play with Part 2 as paid unlock?
  - Under consideration. Benefits: low barrier, natural narrative paywall, pre-qualified paying players. Risks: completion funnel, Part 1 must feel complete alone.
- [ ] **Q26:** What is the target length for Part 1?
  - Critical for business model decision. Affects completion rates and conversion funnel.

---

## Status Key
- [ ] Unanswered
- [~] Partially answered / needs clarification
- [x] Resolved

---

## Summary

| Category | Resolved | Partial | Open |
|----------|----------|---------|------|
| UI/Interface | 2 | 1 | 0 |
| Gameplay Mechanics | 4 | 1 | 0 |
| Memory System | 3 | 0 | 0 |
| Part 1 Specific | 3 | 0 | 3 |
| World/Lore | 3 | 0 | 1 |
| Technical/Scope | 1 | 0 | 2 |
| Business Model | 0 | 0 | 2 |
| **Total** | **16** | **2** | **8** |
