# Syntheteria - Open Questions

This document tracks design questions that need resolution. Questions are marked RESOLVED when answered by current design, or OPEN when still undecided.

---

## UI/Interface Questions

- [x] **Q1:** What is the player's primary view?
  - **RESOLVED:** First-person 3D. You ARE a robot walking the surface of a machine planet. Camera is attached to the player's current bot with pointer lock (desktop) or virtual joystick (mobile). Replaced the original 2.5D top-down view during the FPS redesign.

- [x] **Q2:** How does the player select and control multiple robots simultaneously?
  - **RESOLVED:** You don't. You directly control one bot at a time in first-person. Press Q (or dedicated button) to switch consciousness to another bot with a holographic transfer animation. Non-active bots follow automation routines (patrol, guard, work, follow). Contextual interaction replaces click-to-select.

- [x] **Q3:** What does the "growing consciousness" feel like in UI terms?
  - **RESOLVED:** You start as a single broken bot. Growth is physical -- build more bots, assign them automation routines, expand your factory network. The "consciousness" metaphor manifests as the ability to switch between bots and automate increasingly complex systems. No abstract UI representation needed.

- [x] **Q4:** How does exploration/mapping work?
  - **RESOLVED:** Fog of war system with hidden/explored/visible states. You explore by walking (FPS). Bots you control or that are on patrol reveal terrain. Terrain scanning discovers resource deposits and ruins. The fragmented map concept from the top-down design was replaced by standard fog of war appropriate for first-person gameplay.

---

## Gameplay Mechanics Questions

- [x] **Q5:** What resources does the player need to manage?
  - **RESOLVED:** Physical cube economy. Raw ore deposits (organic geological formations) are ground into powder (internal HUD gauge), compressed into physical 0.5m cubes (rigid bodies), carried to furnaces, and processed into items. 15+ material types with PBR treatment. Resources are visible, stackable, steal-able.

- [x] **Q6:** How does robot control work?
  - **RESOLVED:** First-person direct control of active bot (WASD + mouse/touch). Non-active bots run Yuka GOAP brains with automation routines. Player can assign routines (patrol, guard, work, follow) via contextual radial menu. Bot damage affects controls (broken camera = glitchy view, broken legs = slow movement).

- [x] **Q7:** How does fabrication work?
  - **RESOLVED:** Furnace system. Carry physical cubes to furnace hopper. Tap furnace, select recipe from radial menu. Furnace processes cubes over time. Output item slides out. Can also connect furnaces to conveyor belts for automated input/output.

- [x] **Q8:** What types of robots can the player build?
  - **RESOLVED:** Component-based assembly from fabricated parts. Bot types defined in config/units.json. Components include: camera, arms, locomotion, power_cell, power_supply, weapons, sensors. 4 civilization races have distinct bot visual identities (Reclaimers, Volt Collective, Signal Choir, Iron Creed).

- [x] **Q9:** How does hacking work?
  - **RESOLVED:** Three requirements: signal link to target, requisite technique (discovered/researched), sufficient compute. Compute costs and hack speeds defined in config/hacking.json. Can hack enemy infrastructure. Signal Choir race has hacking bias.

---

## World/Setting Questions

- [x] **Q10:** Where does the game take place?
  - **RESOLVED:** A machine planet. The entire planet is a post-industrial landscape -- terrain is corroded metal plating over ancient bedrock. Six biomes: The Foundry (start), Slag Fields (east), Cable Forest (south), Processor Graveyard (west), Storm Spine (north), Deep Works (underground). Defined in config/biomes.json.

- [x] **Q11:** What powers the game world?
  - **RESOLVED:** Lightning rods drawing from a perpetual storm. Rod output = capacity x storm intensity. Storm oscillates via sine wave + random surges. Power flows through physical wire connections (catenary curve cables). Wire thickness/glow indicates load.

- [x] **Q12:** What is the sky like?
  - **RESOLVED:** Perpetual storm covering the entire sky. No day/night cycle. HDRI environment system implemented. From first-person, the storm is dramatic and ever-present overhead.

- [x] **Q13:** Who are the enemies?
  - **RESOLVED:** Four competing AI civilizations (Reclaimers, Volt Collective, Signal Choir, Iron Creed), each with GOAP governors. Also feral bots and environmental hazards. Raid/theft mechanics let enemies steal your physical cube stockpiles. The original cultist antagonists were replaced by competing machine civilizations in the 4X redesign.

---

## Game Structure Questions

- [x] **Q14:** What is the player's starting state?
  - **RESOLVED:** You awaken as a broken robot on the machine planet surface. You have a Harvester (grinding arm) and a single furnace. First task: find an ore vein, grind it, compress powder into a cube, carry it to the furnace, craft your first tool. Otter holograms provide tutorial guidance.

- [x] **Q15:** What defines the game phases?
  - **RESOLVED:** 4X progression. eXplore (fog of war, terrain scanning). eXpand (claim territory with outposts, extend power/signal networks). eXploit (grind, compress, carry, process, fabricate, build). eXterminate (FPS combat, bot armies, hacking enemy infrastructure, cube raiding).

- [x] **Q16:** What determines victory?
  - **RESOLVED:** Victory conditions system implemented (docs/design/011-victory-conditions.md). Multiple victory types appropriate for 4X gameplay.

- [x] **Q17:** Can the player fail? How?
  - **RESOLVED:** Yes. If all bots are destroyed and you have no resources to rebuild, game over. Enemies can raid your cube stockpiles, destroying your economic base.

- [x] **Q18:** What is the time model?
  - **RESOLVED:** Real-time with pause. Game tick system with configurable speed. Pause menu implemented.

---

## Technical/Scope Questions

- [x] **Q19:** What platforms are you targeting?
  - **RESOLVED:** Web first (runs in any browser), with iOS/Android native builds via Expo SDK 55. Landscape orientation locked on mobile.

- [x] **Q20:** What is the intended visual style?
  - **RESOLVED:** Industrial mechanical PBR. Procedural panel-based geometry for bots/buildings. Panels, bolts, chrome, rust -- not flat colored cubes. MaterialFactory generates composable PBR from texture sets. 15 cube material types with unique PBR treatment. NormalMapComposer adds layered detail (bolts, seams, vents, hex patterns).

- [x] **Q21:** What about multiplayer?
  - **RESOLVED (deferred).** Single-player with AI civilizations first. Multiplayer deferred to post-launch. The 4X framework with AI governors provides competitive gameplay without needing networking.

- [x] **Q22:** What is the engine choice?
  - **RESOLVED:** React Three Fiber + Three.js + Koota ECS + Rapier physics + Yuka AI. Bundled with Expo SDK 55 + Metro. See DECISIONS.md for full reasoning and migration history.

---

## Business Model Questions

- [ ] **Q23:** What is the business model?
  - **OPEN.** Options: F2P with cosmetics/convenience, premium (one-time purchase), or free intro with paid full game.

---

## Redesign Questions (from FPS migration)

- [x] **Q24:** How detailed should the starting machines be?
  - **RESOLVED:** Player starts with a Harvester (grinding arm) and one furnace. Components defined in config. Starting state is deliberately minimal -- you must craft everything.

- [x] **Q25:** What specific components exist?
  - **RESOLVED:** Camera (vision), arms (repair/combat/scavenge), locomotion (movement), power_cell, power_supply, weapons, sensors, and more. Full component types in config/units.json and config/buildings.json.

- [x] **Q26:** How do lightning rods work mechanically?
  - **RESOLVED:** Rods output = capacity x stormIntensity. Storm oscillates via sine wave + random surges. Protection radius = 8 units. Min spacing = 10 units between rods. Buildings within radius get powered. Config in config/power.json.

- [x] **Q27:** How does deep-sea mining work?
  - **RESOLVED (partially).** The machine planet redesign replaced the ocean/deep-sea concept with the Deep Works underground biome. Underground mining involves maintenance tunnels, machine guts, darkness, and cave-ins. Specific mechanics still need detail.

- [x] **Q28:** What does the science campus contain?
  - **RESOLVED.** Replaced by the Processor Graveyard biome (vast plains of dead server racks). Contains advanced electronics, compute cores. Hazards: EMP zones, data ghosts. Tech tree progression defined in config/technology.json.

- [x] **Q29:** What is the cult leader's final secret about the EL?
  - **RESOLVED (replaced).** The cultist narrative was replaced by competing machine civilizations in the 4X redesign. Lore now centers on the player robot's origin as a colony probe from a home-planet AI, with otter holograms as guidance projections. See docs/design/007-lore-and-narrative.md.

- [x] **Q30:** How does combat feel?
  - **RESOLVED:** First-person component-based damage. Attacks break specific functional parts (not HP bars). Units with all parts broken are destroyed and drop salvage. FPS combat with turret defense systems, bot armies, and raid mechanics. Config in config/combat.json.

- [x] **Q31:** What does the abstract map (from blind robots) look like?
  - **RESOLVED (replaced).** The blind robot / abstract map concept was part of the top-down design. In FPS, damaged camera components cause visual artifacts (glitchy view, scan-line corruption, reduced resolution) instead of an abstract map mode.

- [x] **Q32:** Can robots plug into lightning rod infrastructure for unlimited stationary power?
  - **RESOLVED.** Buildings within a lightning rod's protection radius (8 units) are powered. Bots can operate within powered zones. Power flows through physical wire connections.

- [x] **Q33:** What is the specific art style?
  - **RESOLVED.** Industrial mechanical PBR. Procedural panel-based construction for bots and buildings. MaterialFactory with composable PBR from texture sets. 15 ore material types. NormalMapComposer for layered detail. Not low-poly, not pixel art -- grounded industrial sci-fi.

---

## FPS Redesign Open Questions

These questions emerged from the Factory Planet FPS Redesign document and remain open or partially resolved.

- [~] **Q34:** Player death -- when the active bot is destroyed, what happens?
  - **PARTIAL.** Consciousness auto-transfers to nearest owned bot if available. If all bots are destroyed, game over. The transfer animation (holographic dissolve/reconstitution) is designed but the exact "last bot standing" UX needs work. What warnings does the player get? Is there a grace period?

- [~] **Q35:** Belt routing UI -- how does first-person belt placement feel?
  - **PARTIAL.** Build mode exists with ghost preview placement. But the exact UX for planning long belt routes in first-person is unresolved. Options: ghost preview extending from player, holographic overlay showing planned route, or a temporary top-down camera mode for planning.

- [ ] **Q36:** Scale of factory -- how large do factory networks get?
  - **OPEN.** Need LOD for distant belt networks? Instanced rendering exists (InstancedCubeRenderer, 387 lines) but isn't wired to the R3F scene yet. Performance at planetary scale with hundreds of belts, wires, and buildings is untested.

- [ ] **Q37:** Underground belts -- can belts go underground to cross each other?
  - **OPEN.** How does this look/work in first-person? Factorio has underground belt pairs. In FPS, this could be visually represented as belts descending into floor grates and emerging elsewhere. Needs design.

- [ ] **Q38:** Bot followers -- can non-active bots follow the player?
  - **OPEN.** Yuka Vehicle steering supports "follow" behavior. The automation system has a "follow" routine. But the UX for managing followers (how many? formation? commands while following?) needs design. Formation movement system exists (524 lines) but needs integration testing with FPS gameplay.

- [ ] **Q39:** Multiplayer implications for factory planet?
  - **OPEN.** Multiple players on the same planet, each as a bot, building competing/cooperating factory networks? This is deferred but the 4X AI governor architecture was designed with eventual multiplayer in mind (AI governors could be swapped for human players).

---

## New Open Questions (from ongoing development)

- [ ] **Q40:** UI/UX quality -- current UI is "just text" and needs visual overhaul.
  - **OPEN.** Need shaders, faction portraits, and modern visual design for all screens (title, pregame, HUD, pause, settings, save/load). The functional UI exists but lacks visual polish.

- [ ] **Q41:** AI-vs-AI spectator mode -- can the player watch AI civilizations compete?
  - **OPEN.** GOAP governors exist and run the 4X loop. But AI civilizations don't yet do the physical harvest-compress-carry-build loop. They need to interact with the physical cube economy the same way the player does.

- [ ] **Q42:** Native mobile builds -- does the game actually run on iOS/Android?
  - **OPEN.** Expo scaffolding is in place. Web works. But no native build has been tested. Performance on mid-range phones is unknown. Touch controls exist (nipplejs) but need real-device testing.

- [ ] **Q43:** How does the pregame lobby flow work for 4X?
  - **OPEN.** Race selection UI exists (FactionSelect.tsx, OpponentConfig.tsx). Map presets defined. But the full flow (select race, configure opponents, choose map, set victory conditions, start game) needs integration testing and UX refinement. See docs/design/GDD-010-pregame-lobby.md.

---

## Status Key

- [ ] Unanswered / Open
- [~] Partially answered / needs clarification
- [x] Resolved

---

## Summary

| Category | Resolved | Partial | Open |
|----------|----------|---------|------|
| UI/Interface | 4 | 0 | 0 |
| Gameplay Mechanics | 5 | 0 | 0 |
| World/Setting | 4 | 0 | 0 |
| Game Structure | 5 | 0 | 0 |
| Technical/Scope | 4 | 0 | 0 |
| Business Model | 0 | 0 | 1 |
| Redesign (FPS migration) | 10 | 0 | 0 |
| FPS Open Questions | 0 | 2 | 4 |
| New Questions | 0 | 0 | 4 |
| **Total** | **32** | **2** | **9** |
