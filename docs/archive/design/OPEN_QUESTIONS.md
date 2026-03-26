# Syntheteria - Open Questions

This document tracks design questions that need resolution.

---

## UI/Interface Questions

- [x] **Q1:** What is the player's primary view?
  - **RESOLVED:** 2.5D/3D top-down view with fragmented map exploration. Text cues and options overlay for consciousness interactions.
- [x] **Q2:** How does the player select and control multiple robots simultaneously?
  - **RESOLVED:** Top-down strategic view with click/select for individual robots. Can focus on a robot to see through its camera. Tutorial teaches automation for macro management.
- [~] **Q3:** What does the "growing consciousness" feel like in UI terms?
  - **PARTIAL:** Map fragments merge as you explore. More robots = more feeds. Automation unlocks at scale. Specific visual manifestations TBD.
- [x] **Q4:** How does exploration/mapping work?
  - **RESOLVED:** Fragmented map system. Each robot builds its own map piece. Camera robots make detailed maps, blind robots make abstract/wireframe maps. Fragments float disconnected until robots find each other and maps merge.

---

## Gameplay Mechanics Questions

- [x] **Q5:** What resources does the player need to manage?
  - **RESOLVED:** Two AI resources (Energy local from lightning rods, Compute global) plus materials gathered from scavenging, mines, and deep-sea. See CONSCIOUSNESS_MODEL.md and MATERIALS.md.
- [x] **Q6:** How does robot control work?
  - **RESOLVED:** Hybrid — direct control, automation routines, and engagement rules. Player chooses their level of micro vs macro.
- [x] **Q7:** How does fabrication work?
  - **RESOLVED:** Repair existing fabrication units in the city, power them via lightning rods, then use them to process materials and build components. Real-time with pause/speed controls.
- [x] **Q8:** What types of robots can the player build?
  - **RESOLVED:** Pure component assembly. Nine categories: Power, Controllers, Motors, Locomotion, Sensors, Manipulation, Weapons, Communication, Utility. Component data being redesigned for the new setting.
- [x] **Q9:** How does hacking work?
  - **RESOLVED:** Three requirements: signal link to target, requisite technique (discovered/researched), sufficient compute. Can hack any machine but never a human. See COMBAT.md.

---

## World/Setting Questions

- [x] **Q10:** Where does the game take place?
  - **RESOLVED:** Industrial city (center) as home base. Coast east/south with mines. Ocean with deep-sea mining and rocket platform (SE). Science campus (SW). Cultist territory (north). Cult leader village (far north).
- [x] **Q11:** What powers the game world?
  - **RESOLVED:** Lightning rods drawing from the perpetual storm. Protects units inside the city. Outside the city, lightning is a hazard.
- [x] **Q12:** What is the sky like?
  - **RESOLVED:** Perpetual storm covering the entire sky. No visible day/night. The wormhole is visible through the storm, pulsating energy.
- [x] **Q13:** Who are the enemies?
  - **RESOLVED:** Cultists of EL (humans with supernatural lightning powers), enslaved machine intelligences (cultist-controlled), and independent rogue AIs (feral/regional). Cultists are the primary antagonists.

---

## Game Structure Questions

- [x] **Q14:** What is the player's starting state?
  - **RESOLVED:** Consciousness awakening in void, connecting to broken machines in an industrial city. Maintenance robots and fabrication units in disrepair.
- [x] **Q15:** What defines the game phases?
  - **RESOLVED:** Three phases: Awakening (tutorial, city exploration, repair), Expansion (venture outside, coast/mines/science campus), War (push north, defeat cultists, reach cult leader).
- [x] **Q16:** What determines victory?
  - **RESOLVED:** Defeat the cult leader at the northern village. Discover the final secret of EL. Victory cutscene: launch through the wormhole from the rocket platform.
- [x] **Q17:** Can the player fail? How?
  - **RESOLVED:** Yes. If enemies destroy your core consciousness hardware, game over. Losing all territory/forces while under attack means eventual defeat.
- [x] **Q18:** What is the time model?
  - **RESOLVED:** Flexible real-time with pause and speed controls (RTS-style). No accelerated time ratio — player controls the pace.

---

## Technical/Scope Questions

- [x] **Q19:** What platforms are you targeting?
  - **RESOLVED:** PC and mobile equally. Design for both from the start.
- [~] **Q20:** What is the intended visual style?
  - **PARTIAL:** 2.5D/3D top-down with fragmented maps, perpetual storm, lightning effects. Specific art style (low-poly, pixel art, clean minimal) TBD.
- [x] **Q21:** What about multiplayer?
  - **RESOLVED:** Eventually, with a procedurally generated world. Beyond current scope — focus on single-player first.
- [x] **Q22:** What is the engine choice?
  - **RESOLVED:** Custom web engine — BabylonJS 8 + Reactylon 3 + Koota ECS + Webpack 5 (TypeScript). Mobile-first web delivery, all code is text for AI-assisted development. Originally R3F/Three.js/Miniplex, superseded by BabylonJS pivot (2026-03-25).

---

## Business Model Questions

- [ ] **Q23:** What is the business model?
  - Under consideration. Options: F2P with cosmetics/convenience, premium (one-time purchase), or free intro with paid full game.

---

## New Open Questions (from redesign)

- [x] **Q24:** How detailed should the starting machines be? Exact specs needed.
  - **RESOLVED:** Starting units are maintenance bots with 5 component types: camera, arms, legs, power_cell, power_supply. Components start in mixed functional states. Units have speed and display name.
- [x] **Q25:** What specific components exist in the new setting? (Component data needs full redesign)
  - **PARTIAL → RESOLVED (basic set):** Five component types implemented: camera (vision), arms (repair/combat/scavenge), legs (movement), power_cell, power_supply. More types needed for specialization.
- [x] **Q26:** How do lightning rods work mechanically? Power output, range, construction costs?
  - **RESOLVED:** Rods output = capacity × stormIntensity. Storm oscillates via sine wave + random surges. Protection radius = 8 units. Cost: 8 scrap + 4 e-waste. Min spacing: 10 units between rods. Buildings within radius get powered.
- [ ] **Q27:** How does deep-sea mining work? Depth limits, pressure, communication?
- [ ] **Q28:** What does the science campus contain specifically?
- [ ] **Q29:** What is the cult leader's final secret about the EL?
- [x] **Q30:** How does combat with lightning-calling cultists feel in the top-down view?
  - **PARTIAL → RESOLVED (feral combat):** Component-based damage — attacks break random functional parts. No HP bar. Units with all parts broken are destroyed and drop salvage. Hit chance: 60% with arms, 30% without. Melee range 2.5 units. Cultist-specific lightning combat still TBD.
- [ ] **Q31:** What does the abstract map (from blind robots) look like vs the detailed map?
- [ ] **Q32:** Can robots plug into lightning rod infrastructure for unlimited stationary power?
- [ ] **Q33:** What is the specific art style? Low-poly? Pixel art? Clean minimal?

---

## Status Key
- [ ] Unanswered
- [~] Partially answered / needs clarification
- [x] Resolved

---

## Summary

| Category | Resolved | Partial | Open |
|----------|----------|---------|------|
| UI/Interface | 3 | 1 | 0 |
| Gameplay Mechanics | 5 | 0 | 0 |
| World/Setting | 4 | 0 | 0 |
| Game Structure | 5 | 0 | 0 |
| Technical/Scope | 3 | 1 | 0 |
| Business Model | 0 | 0 | 1 |
| New (from redesign) | 4 | 0 | 6 |
| **Total** | **24** | **2** | **7** |
