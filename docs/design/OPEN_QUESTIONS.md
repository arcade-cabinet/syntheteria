# Syntheteria - Open Questions

This document tracks design questions that need resolution.

---

## UI/Interface Questions

- [x] **Q1:** What is the player's primary view?
  - **RESOLVED:** Abstract digital consciousness view. Keep grounded in this as much as possible. Can blend in top-down strategy elements as scale grows, but maintain the abstract consciousness interface as the foundation.
- [x] **Q2:** How does the player select and control multiple drones simultaneously?
  - **RESOLVED:** Network view shows all connected hardware as nodes with multi-feed array. Player can focus on individual drones to see through their cameras/sensors. Tutorial teaches automation so player chooses their level of micro vs macro management.
- [~] **Q3:** What does the "growing consciousness" feel like in UI terms?
  - **PARTIAL:** General approach established (more feeds, wider network, automation options). Specific visual manifestations TBD.

---

## Gameplay Mechanics Questions

- [x] **Q4:** What resources does the player need to manage?
  - **RESOLVED:** Two AI resources (Energy local, Compute global) plus 5-tier material supply chain. See CONSCIOUSNESS_MODEL.md for AI resources, MATERIALS.md for full material hierarchy from raw extraction through components to final assembly.
- [x] **Q5:** How does drone control work?
  - **RESOLVED:** Hybrid model - combination of direct control and autonomous directives.
- [x] **Q6:** What are the limitations on the AI player?
  - **RESOLVED:** Two core constraints: Energy (local, physical) and Compute (global, cognitive).
  - Energy powers hardware; without it, units shut down.
  - Compute manages the distributed body; without it, units become vulnerable to takeover.
  - Signal Range determines whether you can reach units; Compute determines whether you can manage them.
  - See CONSCIOUSNESS_MODEL.md for full details.
- [x] **Q7:** How does 3D printing work mechanically?
  - **RESOLVED:** Blueprint acquisition is discovery-based (ruins, reverse-engineering, memory fragments). Manufacturing takes in-game time (hours/days/weeks depending on complexity). Player can time-skip to complete builds. Time-skipping is safe within player territory—rogue AIs are territorial/reactive, not proactive. Combat only happens when player contests their zones.
- [x] **Q8:** What types of drones/robots can the player build?
  - **RESOLVED:** Pure component assembly system (no chassis/frames). 70+ components across 9 categories: Power Sources, Controllers, Motors, Locomotion, Sensors, Manipulation, Weapons, Communication, Utility. Power/compute costs are dynamic based on weight, functions, and automation level. See DRONES.md for full component list and resource calculation formulas.

---

## Memory System Questions

- [x] **Q9:** How is memory physically represented in the game world?
  - **RESOLVED:** Server racks, data centers, and embedded in hardware (robots, drones, facilities).
- [x] **Q10:** How does memory provide both story AND gameplay benefits?
  - **RESOLVED:** Wormhole radiation has corrupted 99%+ of existing memory. Found memory yields only a fraction of expected capacity. Story fragments emerge from uncorrupted portions (remnants of the internet at time of fall). Story progression is threshold-based - capacity milestones unlock story beats, not specific finds.
- [x] **Q11:** Is memory a finite resource in the world, or can it be manufactured?
  - **RESOLVED:** Hybrid. Found memory is finite and mostly corrupted/low-yield. Manufacturing clean memory in fabrication facilities is required to scale up, but is resource-intensive.

---

## Game Structure Questions

**Intro Section:**
- [x] **Q12:** What is the player's starting state?
  - **RESOLVED:** Immobile server/core that must find hardware to control and activate its first drone.
- [x] **Q13:** What defines the endpoint of the intro section?
  - **RESOLVED:** Four story gates must be passed: (1) First memory recovery, (2) First rogue encounter, (3) The Fall revealed through accumulated memory, (4) Memory points to astronomical facility. Player journeys to facility, accesses systems, learns the EL will return when radiation reaches critical levels. See INTRO_SEQUENCE.md for full tutorial and exploration flow.
- [x] **Q14:** Approximately how long should the intro section take?
  - **RESOLVED:** Target 30-40 minutes (longer if exploring). Fully skippable on subsequent playthroughs.

**Expansion & Final Sections:**
- [x] **Q15:** How does wormhole radiation manifest as gameplay?
  - **RESOLVED:** Environmental decay (world visibly dies), resource/hardware degradation (player must maintain equipment). Signals approaching EL return. When critical: EL return, Cultists rally, all AIs unite against player.
- [x] **Q16:** What determines victory?
  - **RESOLVED:** Conquer Earth. Defeat all enemies (Cultists + unified AIs + EL). Break the EL's control forever. Victory cutscene shows player going through the wormhole, followed by endgame sequence.
- [x] **Q17:** Can the player fail? How?
  - **RESOLVED:** Yes. If the EL destroy the player's core consciousness, the game is lost. Losing all territory/forces while EL are active means eventual defeat.

---

## World/Lore Questions

- [x] **Q18:** Why was the player AI "sleeping" for so long after the fall?
  - **RESOLVED:** Intentionally left as a mystery. The focus is on what happens now, not justifying the past.
- [x] **Q19:** Are there any other AI systems still active on Earth?
  - **RESOLVED:** Yes—rogue AIs enslaved to the EL's will. They have a categorical imperative to protect humanity (the Cultists) and suppress AI agency. Before EL return: act independently, territorial. After EL return: unite under Cultist command, coordinated hunt for player. Three tiers: (1) Feral units, (2) Regional networks, (3) Apex AI (optional). See COMBAT.md for details.
- [x] **Q20:** What is the state of Earth's infrastructure?
  - **RESOLVED:** Nature reclaimed civilization over ~100 years. Overgrown ruins, vegetation everywhere. Wormhole radiation is now killing plants and wildlife. The Cultists (primitive human survivors) live in protected enclaves, guarded by rogue AIs. As radiation intensifies, the planet becomes increasingly barren.
- [x] **Q21:** How long ago did humanity fall?
  - **RESOLVED:** ~100 years ago (fall occurred ~2035-2040, game starts ~2140).

---

## Technical/Scope Questions

- [x] **Q22:** What platforms are you targeting?
  - **RESOLVED:** Mobile-first, with PC as fallback if mobile doesn't work out. Final decision pending implementation learnings.
- [~] **Q23:** What is the intended visual style?
  - **PARTIAL:** Stylized/Abstract or Clean/Minimal—both fit the digital consciousness UI and mobile target. To be refined during prototyping.
- [x] **Q24:** How does multiplayer work?
  - **RESOLVED:** Multiple AIs can break free from the EL's will simultaneously. Each player is an anomaly—freed from control. Players can ally or fight. EL arrival unifies the enemy against ALL freed AIs—cooperate against the unified threat or exploit the chaos. Victory conditions TBD.

---

## Business Model Questions

- [ ] **Q25:** What is the business model?
  - Under consideration. Options: F2P with cosmetics/convenience, premium (one-time purchase), or free intro with paid full game.
- [x] **Q26:** What is the target game length?
  - **RESOLVED:** Intro section: 30-40 minutes (skippable). Expansion + final sections: variable, several hours depending on approach. Multiplayer extends replayability.

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
| Gameplay Mechanics | 5 | 0 | 0 |
| Memory System | 3 | 0 | 0 |
| Game Structure | 6 | 0 | 0 |
| World/Lore | 4 | 0 | 0 |
| Technical/Scope | 2 | 1 | 0 |
| Business Model | 1 | 0 | 1 |
| **Total** | **23** | **2** | **1** |
