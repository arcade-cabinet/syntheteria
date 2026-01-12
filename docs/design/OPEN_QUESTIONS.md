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
- [ ] **Q7:** How does 3D printing work mechanically? (Blueprints? Research tree? Material requirements?)
- [ ] **Q8:** What types of drones/robots can the player build?

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

- [x] **Q12:** What is the player's starting state?
  - **RESOLVED:** Immobile server/core that must find hardware to control and activate its first drone.
- [x] **Q13:** What defines the "standardized endpoint" for Part 1?
  - **RESOLVED:** Three requirements must be met: (1) Certain story progression points unlocked, (2) Enough memory to have the full history of the fall, (3) Specific capabilities and facilities unlocked. Once all are met, the game enables and guides the player to the astronomical facility.
- [x] **Q14:** Approximately how long should Part 1 take for a first-time player?
  - **RESOLVED:** No specific duration target. Let the story drive the pacing.

---

## Part 2 Specific Questions

- [ ] **Q15:** How do the wormhole energy waves manifest as gameplay obstacles? (Random destruction events? Zone denial? Resource corruption?)
- [ ] **Q16:** What determines "victory" for Part 2? (Minimum armada size? Specific ship types? Just reaching the wormhole?)
- [ ] **Q17:** Can the player fail Part 2? What happens at year 10 if unprepared?

---

## World/Lore Questions

- [ ] **Q18:** Why was the player AI "sleeping" for so long after the fall?
- [ ] **Q19:** Are there any other AI systems still active on Earth? (Potential allies or rivals?)
- [x] **Q20:** What is the state of Earth's infrastructure?
  - **RESOLVED:** Nature reclaimed civilization over ~100 years. Overgrown ruins, vegetation everywhere. BUT: wormhole radiation is now killing plants and wildlife. Over the 10-year Part 2 window, players witness the planet becoming increasingly barren. Some humans may have survived the Cult's extermination but eventually went extinct due to radiation effects on the ecosystem.
- [x] **Q21:** How long ago did humanity fall?
  - **RESOLVED:** ~100 years ago (fall occurred ~2035-2040, game starts ~2140).

---

## Technical/Scope Questions

- [ ] **Q22:** What platforms are you targeting? (PC? Console? Mobile?)
- [ ] **Q23:** What is the intended visual style? (Realistic? Stylized? Abstract?)
- [ ] **Q24:** Single-player first, multiplayer later - confirmed priority?

---

## Status Key
- [ ] Unanswered
- [~] Partially answered / needs clarification
- [x] Resolved
