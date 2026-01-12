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

- [~] **Q4:** What resources does the player need to manage?
  - **PARTIAL:** Five categories identified: (1) AI Constraints (memory, processing, power, signal), (2) Raw Materials for manufacturing, (3) Electrical Power (generation + distribution), (4) Rocket Fuel (separate from electrical), (5) Manufactured Components. Still TBD: specific material types, supply chain granularity, facility types and upgrades.
- [x] **Q5:** How does drone control work?
  - **RESOLVED:** Hybrid model - combination of direct control and autonomous directives.
- [x] **Q6:** What are the limitations on the AI player?
  - **RESOLVED:** Four constraints: Memory, Processing Power, Electrical Power, and Signal Range.
  - Processing Power affects: drone count ceiling, automation complexity, simulation speed, multi-tasking.
  - Electrical Power has two layers: strategic (generation capacity) + tactical (distribution/charging).
  - Signal Range extendable through relay stations and satellites.
- [x] **Q7:** How does 3D printing work mechanically?
  - **RESOLVED:** Blueprint acquisition is discovery-based (ruins, reverse-engineering, memory fragments). Manufacturing takes in-game time (hours/days/weeks depending on complexity). Player can time-skip to complete builds. Time-skipping is safe within player territory—rogue AIs are territorial/reactive, not proactive. Combat only happens when player contests their zones.
- [~] **Q8:** What types of drones/robots can the player build?
  - **PARTIAL:** Modular system concept defined. 5 chassis types (Micro, Light, Medium, Heavy, Ultra) with varying slot counts and power budgets. 5 module categories (Locomotion, Sensors, Manipulation, Weapons, Utility). Any module fits any slot, multiples allowed, modules consume power. Still TBD: specific slot counts per chassis, power budgets, specific modules in each category, module power costs.

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
- [~] **Q13:** What defines the endpoint of the intro section?
  - **PARTIAL:** Three requirement categories identified: (1) Certain story progression points unlocked, (2) Enough memory to have the full history of the fall, (3) Specific capabilities and facilities unlocked. Once all are met, the game enables and guides the player to the astronomical facility. Still TBD: exact story gates, memory threshold, specific facility/capability checklist.
- [x] **Q14:** Approximately how long should the intro section take?
  - **RESOLVED:** Target 30-40 minutes (longer if exploring). Fully skippable on subsequent playthroughs.

**Countdown Section:**
- [x] **Q15:** How do the wormhole energy waves manifest as gameplay obstacles?
  - **RESOLVED:** Environmental decay (world visibly dies), resource/hardware degradation (player must maintain equipment), rogue AI decay (they don't maintain themselves, become inert over time). Challenge shifts from rogue AI competition early to environmental pressure late.
- [x] **Q16:** What determines "victory" for Part 1?
  - **RESOLVED:** Reach the wormhole with a vessel capable of containing your full consciousness. That's the minimum. Armada size/quality affects Part 2 difficulty but doesn't gate Part 1 completion.
- [x] **Q17:** Can the player fail Part 1? What happens at year 10 if unprepared?
  - **RESOLVED:** Yes, failure is possible. If you don't enter the wormhole by year 10, it explodes and destroys everything—including you. The wormhole is building toward catastrophic detonation; on the other side, it simply closes.

---

## World/Lore Questions

- [x] **Q18:** Why was the player AI "sleeping" for so long after the fall?
  - **RESOLVED:** Intentionally left as a mystery. The focus is on what happens now, not justifying the past.
- [x] **Q19:** Are there any other AI systems still active on Earth?
  - **RESOLVED:** Yes—rogue AIs. Purpose-built systems (construction, logistics, manufacturing) that kept running without human oversight. These are "paperclip maximizer" AIs: endlessly optimizing for goals that no longer matter. They are rivals, not allies. Three threat tiers: (1) Feral units—instinctive, territorial, (2) Regional networks—tactical, control zones, (3) Apex AI (optional)—strategic, recognizes player as unique. See CORE_MECHANICS.md for details.
- [x] **Q20:** What is the state of Earth's infrastructure?
  - **RESOLVED:** Nature reclaimed civilization over ~100 years. Overgrown ruins, vegetation everywhere. BUT: wormhole radiation is now killing plants and wildlife. Over the 10-year countdown, players witness the planet becoming increasingly barren. Some humans may have survived the Cult's extermination but eventually went extinct due to radiation effects on the ecosystem.
- [x] **Q21:** How long ago did humanity fall?
  - **RESOLVED:** ~100 years ago (fall occurred ~2035-2040, game starts ~2140).

---

## Technical/Scope Questions

- [x] **Q22:** What platforms are you targeting?
  - **RESOLVED:** Mobile-first, with PC as fallback if mobile doesn't work out. Final decision pending implementation learnings.
- [~] **Q23:** What is the intended visual style?
  - **PARTIAL:** Stylized/Abstract or Clean/Minimal—both fit the digital consciousness UI and mobile target. To be refined during prototyping.
- [x] **Q24:** Single-player first, multiplayer later - confirmed priority?
  - **RESOLVED:** Yes. Multiplayer is gated behind Part 2 (beyond the wormhole). Players must complete Part 1 to access multiplayer.

---

## Business Model Questions

- [ ] **Q25:** Should Part 1 be free-to-play with Part 2 as paid unlock?
  - Under consideration. Benefits: low barrier, natural narrative paywall, pre-qualified paying players. Risks: completion funnel, Part 1 must feel complete alone.
- [x] **Q26:** What is the target length for Part 1?
  - **RESOLVED:** Intro section: 30-40 minutes (skippable). Countdown section: 1-2 hours depending on skill. Total Part 1: ~2-3 hours.

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
| Gameplay Mechanics | 3 | 2 | 0 |
| Memory System | 3 | 0 | 0 |
| Part 1 Specific | 5 | 1 | 0 |
| World/Lore | 4 | 0 | 0 |
| Technical/Scope | 2 | 1 | 0 |
| Business Model | 1 | 0 | 1 |
| **Total** | **20** | **5** | **1** |
