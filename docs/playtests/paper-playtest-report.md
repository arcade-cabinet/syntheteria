# Paper Playtest Report -- Syntheteria v0.1.0

**Playtester:** Alex (Factorio/Satisfactory/Subnautica/RimWorld player)
**Date:** 2026-03-10
**Method:** Paper playtest via source code review (no live build tested)
**Context:** Downloaded because someone said "first-person Factorio on an alien machine planet"

---

## Implementation Status Audit (2026-03-11)

> Cross-referenced against codebase state: 256 test suites, 7,594 tests passing, 552 source files.
> See `docs/REMAINING-WORK.md` for the full work specification.

---

## First Impressions (Title Screen)

I see "SYNTHETERIA" in big amber monospace type on a dark background with a rivet dot pattern, scan lines, corner bolts, and a glitch effect. Subtitle reads "MACHINE PLANET -- SECTOR 7 COLONY OUTPOST." There's a version badge "v0.1.0 -- PHASE 1 PROTOTYPE" and a green dot that says "SYSTEMS NOMINAL."

The aesthetic is strong. It immediately says "industrial sci-fi terminal." Not generic -- it has a specific identity. The amber/chrome palette on near-black is distinctive and avoids the "generic hacker green" trap that a lot of indie games fall into. The glitch effect on the title text is a nice touch.

There's a "MISSION SEED" input field with a three-word phrase (like Minecraft seeds). NEW GAME, CONTINUE, SETTINGS (disabled), and SPECTATE (disabled). Two of four buttons are grayed out. That's fine for a prototype, but a new player sees "half this game doesn't work yet." The seed input is prominent -- maybe too prominent for a first-time player who doesn't know what seeds are. Minecraft buries its seed field in world creation settings. Here it's the first thing I interact with.

**Verdict:** Good first impression. Looks like a game with a vision. But immediately I notice there's no music, no ambient sound on the title screen. The screen is silent. Factorio's title screen has that incredible mechanical music that sets the mood. Subnautica has underwater ambience. Silence here is a missed opportunity.

---

## Setting Up (Pregame)

Clicking NEW GAME takes me to "COLONY MISSION BRIEFING" with four tabs: PATRON, MAP, RIVALS, SETTINGS.

### Patron (Faction Selection)

Four faction cards in a grid:
- **Reclaimers** -- scavenger economy, "+25% scrap yield, +15% repair speed, start with extra scavenger bot"
- **Volt Collective** -- lightning aggressors, "+20% power efficiency, lightning resistance, start with powered rod"
- **Signal Choir** -- hive-mind hackers, "+30% hacking speed, +25% signal range, start with signal relay"
- **Iron Creed** -- fortress builders, "+20% combat damage, +15% armor durability, start with fortified position"

The factions have distinct identities. The bonuses are concrete and understandable. But several problems:

1. **No faction art.** Each faction has a tiny ASCII glyph like `[::.]` or `[/\/]`. Compare this to Civilization where you see the leader's face, their capital, their unique units. Here I'm choosing based on one sentence of description and three bonus lines. I don't FEEL anything about these factions.

2. **The color scheme is broken.** The faction cards use `#00ffaa` (terminal green) for unselected text, but the rest of the pregame uses amber/chrome. Two different color languages on the same screen. The TitleScreen uses amber. The FactionSelect uses green. The MapConfig uses green. The PregameScreen header uses amber. It's jarring.

3. **No gameplay preview.** I don't know what "+25% scrap yield" means in practice. Is scrap important? How much does 25% matter? Factorio doesn't have factions, but Civ shows you "This is America. You get +1 culture. Here's what that means." There's no context for these numbers.

4. **No lore teasers.** The design doc (GDD-007) has INCREDIBLE lore -- Ferrathis the machine planet, the Overseer AI, otters as holographic messengers from a home planet AI that found Earth creatures endearing. None of that surfaces here. A flavor quote per faction would help enormously.

### Map Config

Map size (small/medium/large), ore density (sparse/normal/rich), storm intensity (calm/moderate/violent), starting resources (minimal/standard/abundant), and a seed field.

This is functional but uninspired. No map preview. No description of what "storm intensity: violent" means for gameplay. Factorio's map settings show a minimap preview. Even just a text description like "Violent storms: constant lightning, high power generation but frequent equipment damage" would help.

### Rivals Config

1-4 AI opponent slots with faction dropdown and difficulty (easy/normal/hard). Clean, functional. The "NO OPPONENTS CONFIGURED" empty state with a dashed "ADD OPPONENT" button is good UX.

**Overall pregame verdict:** Mechanically complete but emotionally empty. I'm making decisions without context. Nothing here makes me excited about the game I'm about to play. The pregame should build anticipation -- it's the "loading the gun" moment before the game fires.

---

## Loading

Two modes: passive (just "INITIALIZING..." with a pulse bar) and active (14-step progress with labels like "Seeding world state", "Generating terrain heightmap", "Spawning rival colonies", "Briefing otter hologram"). At 80% an otter hologram placeholder appears: "~ O ~" with "Patron uplink established. Otter hologram standing by."

The active loading screen is good design. The step-by-step checklist creates anticipation. But the actual implementation in App.tsx uses `requestAnimationFrame` to run init synchronously, which means the active loading screen probably never renders -- it jumps from loading straight to playing in one frame. The passive "INITIALIZING..." fallback is what players actually see. That's a big gap between intention and reality.

The otter tease at 80% is charming. But again, it probably flashes by too fast to register.

---

## First 5 Minutes -- Entering the Game

### What I See

The game loads into a `<Canvas>` wrapped in a `<Bezel>`. The bezel is a top bar (bot name, resources, storm/power) and bottom bar (equipped tool + control hints). The 3D viewport fills the middle.

Immediately visible:
- A crosshair in the center (simple + shape, faction-colored)
- Top center: resource bar (SCRAP:0 E-WASTE:0 PARTS:0 STORM:0% PWR:0/0)
- Top right: speed controls (0.5x, 1x, 2x, PAUSE)
- Bottom left: bot status panel (unit name, component health dots)
- Bottom right: control hints (WASD, MOUSE, E interact, F harvest, C compress, G grab, Q switch, CLICK select)
- The bezel bottom shows "SCANNER" (equipped tool)
- CRT scan lines overlay everything

The 3D scene has: terrain, storm sky with a wormhole effect and lightning flashes, fog of war, ore deposits, landscape props, a flashlight, post-processing (bloom, vignette), ambient lighting.

### What I Do First

I presumably look around. The storm sky is atmospheric -- dark clouds, a pulsating purple wormhole at zenith, random lightning flashes. The terrain should be metallic (machine planet). There are ore deposits visible -- "shiny veins sticking out of the ground."

### The Tutorial

The tutorial system exists and is well-designed. 10 steps:
1. Move around (WASD)
2. Look around (mouse)
3. Grind ore (click on deposit)
4. Compress a cube (press C when powder full)
5. Grab a cube (press G)
6. Carry to furnace
7. Drop in hopper (E near furnace)
8. Craft something
9. Place a building
10. Claim territory

Each step has otter dialogue. "Hey there, rusty! You just booted up. Try moving around." "See those shiny veins sticking out of the ground? Walk up close, hold click, and GRIND. Watch the powder bar fill up!" This is good personality-driven tutorialization.

BUT -- the otter hologram (OtterRenderer) requires pre-rendered PNG keyframe sequences loaded from `otter.zip`. If those textures don't exist or fail to load, the otter is invisible. The tutorial text appears in the QuestPanel positioned at top-left, but only when an active quest exists. The connection between the tutorial system emitting steps and the quest system displaying them isn't clear from the code -- `startTutorial()` calls into the tutorial system, but the QuestPanel reads from `questSystem` and `questDialogue`, which are separate systems.

**Critical question: Does the otter actually appear and guide the player, or do you spawn into a dead world with control hints in the corner and zero guidance?**

Looking at the newGameInit code, `startTutorial(0)` is called, and `placeOtterGuide()` places "Pip" 4 units from the player spawn. But there's no obvious bridge between the tutorial step text and the otter hologram's speech bubble system. The OtterRenderer shows speech bubbles when a player is within proximity, reading from `otter.dialogue`. The tutorial system writes `otterDialogue` per step but I don't see where that gets piped into the otter entity's dialogue field.

**This is probably broken.** The tutorial is defined. The otter exists. The speech system exists. But they likely aren't wired together.

### The Core Loop -- Can I Figure It Out?

Without a working tutorial, here's what a new player sees:
- Control hints in the corner tell me F=harvest, C=compress, G=grab
- There are ore deposits in the world
- I walk up to one and... do I know to press F? The ObjectSelectionSystem uses raycasting to detect what I'm looking at. The ObjectActionMenu shows a radial menu on click with context-appropriate actions. So if I click an ore deposit, I should see a radial menu with "HARVEST" as an option.

This is actually a reasonable interaction model IF the radial menu appears. The menu is driven by the InteractionSystem which determines actions based on entity type. For an OreDeposit, the action registry should provide a "harvest" action.

So the flow should be:
1. Look at ore deposit, click it
2. Radial menu appears with "HARVEST" option
3. Click HARVEST
4. HarvestingIndicator appears: "HARVESTING +X.X powder"
5. PowderStorage panel appears showing accumulated powder
6. Press C to compress -- CompressionBar appears: "COMPRESSING XX%"
7. Cube ejects in front of you
8. HeldCubeIndicator shows "HOLDING: SCRAP IRON CUBE" (if you grab it)
9. Carry to furnace, interact, choose recipe

This is actually a complete and legible flow. The HUD elements are well-designed -- they appear contextually (only when harvesting, only when compressing, only when holding a cube). The CoreLoopHUD is reactive and informative.

**But here's the gap: there's no "aha" moment of discovery.** In Subnautica, you scan something and learn its secrets. In Factorio, you research and the tech tree unfolds. Here, the loop is: grind, compress, carry, smelt. It's a chore until automation kicks in, and I don't see when automation kicks in in the first 5 minutes.

---

## First 30 Minutes

### Have I Built Anything?

I should have cubes by now. The furnace detail panel shows recipes: input materials produce output materials. I can drop cubes in the hopper and get processed cubes out.

Building placement exists (PlacementPreview component, building placement system), but the pathway from "I have cubes" to "I place a building" isn't obvious. The tech tree panel (toggled with a "TECH [+]" button, top right) shows available research. But research costs cubes, and I don't know how many cubes I need to save vs spend.

The WallBuilder system exists. Belt transport exists. Wire power exists. But how do I access building mode? The inventory view (Tab key) shows components, resources, equipped tool, and network status. The RadialToolMenu provides tool switching: SCANNER, REPAIR ARM, WELDER, FABRICATOR, BUILDER, SALVAGER. If I switch to BUILDER, presumably I can place buildings.

But this entire tool-switching system contradicts the GDD's explicit design: "No tool system -- actions depend on what you click, not what you equip." The contextual radial menu on objects is supposed to replace tools entirely. Yet both systems coexist: a tool equip system AND a contextual click system. This is confusing. Do I equip the BUILDER tool then click the ground? Or do I just click the ground and get a "BUILD" option? The contradiction means the player can't form a mental model.

### Have I Seen an Enemy?

AI civilizations spawn at equidistant points around the map. The fog of war starts with a 10-cell radius revealed around your spawn. Enemy territory is hidden. The raid system exists and will eventually send enemy bots to steal your cubes. But in the first 30 minutes? Probably not. The `aiAggressionDelay` on normal difficulty is 300 seconds (5 minutes), but the AI governor has critical bugs (documented in MEMORY.md) that likely prevent it from acting:

1. `passiveHarvest()` uses `Math.round()` on tiny floats producing 0 cubes forever
2. No fallback when GOAP plan exhausts -- AI idles permanently
3. Empty world state means no preconditions match

So the AI civilizations probably sit there doing nothing. No raids. No competition. No tension.

### Is There a Sense of Progression?

The tech tree exists with tiers. Research costs cubes and takes time. Effects include unlocking buildings, boosting stats, enabling new mechanics. The quest system provides otter-guided objectives. But the quest chain is separate from the tutorial, and the tutorial may not be wired to the otter correctly.

Resources start at 0/0/0. There's no minimap, no world map, no territory overlay visible by default. The fog of war renderer exists but I can't tell if it's obvious where the fog boundary is.

---

## The "Fun" Question

### When Does This Game Become FUN?

Based on reading the code, the fun moments should be:

1. **First cube compression** -- screen shake, pressure gauges, a physical cube ejecting at your feet. This is supposed to be satisfying. The compression system has juice (compressionJuice.ts, screenShake.ts). If it works, this could be a great "first hit" moment.

2. **First furnace output** -- dropping a raw cube into a furnace hopper, watching it process, getting a refined cube out. The furnace detail panel is well-designed with hopper contents, processing bar, and recipe list.

3. **First belt automation** -- placing a conveyor belt from a mining output to a furnace. Watching cubes travel along the belt automatically. The belt transport system handles spacing, back-pressure, and belt-to-belt routing.

4. **First wall defense** -- stacking cubes into walls before a raid. Physical cubes as building blocks is a unique mechanic.

### What's the "Factorio Spaghetti Moment"?

It should be belts. The belt-to-belt routing, the conveyor networks, the factory layout optimization. But I can't tell if belt placement has a clean UI flow. The belt renderer and transport physics exist, but the user journey from "I want a conveyor here" to "conveyor is moving cubes" isn't clear.

### What's Making Me Want to Keep Playing?

Honestly? The lore. The GDD-007 document describes a machine planet called Ferrathis that IS a machine -- every grain of soil is metallic particulate, every mountain is a collapsed megastructure. The home-planet AI (the Overseer) found otters cute and uses them as holographic avatars. The factions are displaced colonies competing for resources on an alien world. This is genuinely compelling science fiction.

But NONE of it is in the game yet. It's all in design documents. The player experiences none of this story.

---

## What's Missing That Would Make Me Quit

### Critical Missing Experiences

1. **ONBOARDING IS BROKEN.** The tutorial exists in code but likely isn't wired to the otter hologram. A new player spawns into a world with text control hints and no guidance. In Subnautica, you hear Lifepod 5's computer giving you survival priorities. In Factorio, the campaign walks you through each step. Here? Silence.

   > **[IMPLEMENTED]** `tutorialOtterBridge.ts` now syncs tutorial step dialogue to the otter entity's speech bubble lines. Registered in `registerSystems.ts` game loop (calls `syncTutorialToOtter()` each tick). Tested in `tutorialOtterBridge.test.ts`. The bridge that was "probably broken" now exists and is wired. **Remaining:** visual verification in a live build not yet done; otter texture assets (`otter.zip`) still required for the hologram to render visually. See REMAINING-WORK.md 7.7, 7.8, 7.9, 7.13.

2. **NO MUSIC OR AMBIENT AUDIO ON LOAD.** The AudioSystem initializes on first click. Before that, silence. Even after init, the storm ambience is the main audio element. Where's the soundtrack? Where's the industrial mechanical drone that says "you're on a machine planet"?

   > **[IMPLEMENTED]** Full audio system now exists: `AdaptiveMusic.ts` (5 layered states: explore/build/combat/raid/victory via Tone.js Transport), `SFXLibrary.ts` (procedural sound effects), `SpatialAudio.ts`, `StormAmbience.ts`, `BiomeAmbience.ts`, `FactoryAudio.ts`, `AudioEventBridge.ts` (maps 16+ game events to sounds), `AudioQuality.ts` (GPU-based quality tiers). All tested. `audioEventIntegration.ts` wires harvesting/compression/furnace/grabber/combat events to audio system. See REMAINING-WORK.md 8.1, 8.10-8.14 (all checked). **Remaining:** Title screen music not confirmed; audio still gated behind first user interaction (browser autoplay policy).

3. **NO MINIMAP OR WORLD OVERVIEW.** I have zero spatial awareness. Where am I? Where are the enemies? Where are resources? Factorio gives you a zoomable map from minute one. Even Subnautica has a compass and biome names.

   > **[PARTIALLY DONE]** `minimapData.ts` exists with full logic: terrain grid, fog of war overlay, entity tracking, territory borders, rendering to pixel grid. Tested in `minimapData.test.ts`. However, **no R3F UI renderer** consumes this data -- `GameUI.tsx` references minimap but the visual component is not wired. See REMAINING-WORK.md 7.3, 7.11.

4. **AI OPPONENTS ARE INERT.** The GOAP governor has documented bugs that prevent it from doing anything meaningful. The 4X promise is "compete against AI civilizations." If they don't compete, the game is just a single-player sandbox with no stakes.

   > **[PARTIALLY DONE]** Governor infrastructure significantly improved: `governorSystem.ts` wired to game loop with `tickGovernors()`, `GovernorActionExecutor` translates GOAP actions to bot orders via `actionToOrder()` (46+ tests), `economySimulation.ts` registered in economy phase, AI tech research wired through `GovernorActionExecutor.executeResearchTech()`. AI-produced cubes spawn as real entities (`aiCivilization.ts` calls `spawnCube()`). **Remaining:** AI bots still don't run the full harvest-compress-carry pipeline (REMAINING-WORK.md 2.2, 2.4); GOAP `LaunchRaid` not connected to commander/`planRaid()` (3.3); faction-specific AI strategies not implemented (3.6); trade transfers only modify opinion, not real resources (3.5). The AI is structured but not yet a competitive opponent.

5. **NO CLEAR GOAL.** The game over detection system exists (victory = control all territory or destroy all rivals; loss = all units destroyed). But the player never learns these goals. There's no "OBJECTIVE: Establish dominance over Ferrathis" anywhere visible.

   > **[PARTIALLY DONE]** `victoryConditionEvaluator.ts` now evaluates all 8 victory conditions per faction per tick (colonial, domination, economic, technology, diplomatic, integration, survival, story) with hold timers, tiebreaker resolution, and alert threshold events. `victoryTracking.ts` also registered in game loop. Config in `config/victory.json`. Fully tested. **Remaining:** No victory progress UI panel (REMAINING-WORK.md 5.2); no victory screen (5.12); no in-game objective tracker that SHOWS the player what they're working toward. The evaluator runs silently.

6. **INCONSISTENT INTERACTION MODEL.** Tools (RadialToolMenu: scanner/repair/welder/fabricator/builder/salvager) AND contextual clicking (ObjectActionMenu) both exist. The GDD says "no tools" but the code has a full tool system. Pick one.

   > **[NOT STARTED]** Both `RadialToolMenu.tsx` and the contextual `ObjectActionMenu` / `InteractionSystem.tsx` still coexist. `EquippedToolView.tsx`, `InventoryView.tsx` reference tool switching. No resolution of this design conflict. See REMAINING-WORK.md 7.17 (radial action menu listed but not framed as a conflict to resolve).

7. **THE BEZEL/HUD ARE DOUBLED.** The Bezel top bar shows "SCRAP:X E-WASTE:X PARTS:X" AND the FPSHUD ResourceBar shows the exact same data. Two overlapping resource displays. The bottom bezel shows "SCANNER" and control hints, AND the FPSHUD Hints component shows the same controls.

   > **[NOT STARTED]** Both `Bezel.tsx` and `FPSHUD.tsx` remain in the codebase. `CoreLoopHUD.tsx` adds a third layer of contextual HUD elements. No deduplication has occurred. See REMAINING-WORK.md 7.10 (HUD refinement).

8. **NO FEEDBACK ON PROGRESSION.** When I research a tech, what changes? The TechEffects system applies bonuses but there's no notification: "TECH COMPLETE: Advanced Mining -- Ore extraction +30%." Quest completions have a notification banner, but tech completions don't.

   > **[PARTIALLY DONE]** `notificationSystem.ts` exists and is registered. `techResearch.ts` and `techEffects.ts` apply bonuses. However, wiring from tech completion to notification system is not confirmed. See REMAINING-WORK.md 8.6 (wire progressionSystem to hudState), 5.11 (progression milestone notifications).

---

## Comparison to Genre Peers

### vs Factorio: Belts and Automation Satisfaction

Factorio's genius is the belt grid -- you see resources flowing, splitters splitting, inserters inserting. It's a visible, tangible system. Syntheteria has belt transport, belt routing, and belt rendering. The physical cube flow on belts could be MORE satisfying than Factorio because the cubes are 3D objects, not sprites. But the UX for placing belts, connecting them, and debugging flow isn't apparent from the code. Factorio's blueprint system took years to perfect. Syntheteria's belt placement needs to feel just as smooth.

**Rating: Foundation is there. Implementation gaps are critical.**

> **[STATUS UPDATE]** Belt transport (`beltTransport.ts`), belt routing (`beltRouting.ts`), and belt rendering exist with spacing/back-pressure. Audio events wired for belt/factory sounds. Physical cube movement on belts is the core system. Belt placement UX flow still needs live verification. See REMAINING-WORK.md 2.16 (checked).

### vs Subnautica: Exploration and Wonder

Subnautica's first hour is INCREDIBLE. You crash-land in an alien ocean. Every direction is a mystery. You see bioluminescent creatures, coral forests, dark caves. The PDA gives you contextual info. The radio pulls you toward story objectives.

Syntheteria has fog of war (hidden/explored/visible) and terrain with biomes. The storm sky with a wormhole is atmospheric. But the machine planet surface -- is it visually varied? Is there wonder in exploration? The terrain renderer uses PBR materials and biome zones, but without seeing it rendered, I can't tell if it's "vast industrial wasteland" (boring) or "alien mechanical landscape with surprises" (compelling).

The otter holograms are Syntheteria's equivalent of Subnautica's PDA. If they work, they could be genuinely delightful. A holographic otter appearing Star-Wars-style to give you crafting tips is a fantastic conceit.

**Rating: High potential, needs visual variety and working otter integration.**

> **[STATUS UPDATE]** Otter bridge now wired (`tutorialOtterBridge.ts`). `OtterRenderer.tsx` and `HologramRenderer.tsx` exist for visual rendering. Biome system (`biomeSystem.ts`) with 4 biomes in `config/biomes.json` (desert, forest, mountain, wasteland). `discoverySystem.ts` and `exploration.ts` exist. Visual variety still depends on wiring procgen (REMAINING-WORK.md 1.1-1.8).

### vs RimWorld: Stories and Drama

RimWorld generates emergent stories through character interactions, disasters, and decisions. Syntheteria's 4X frame should generate drama through faction competition, raids, and resource scarcity. The raid system, territory contestation, and AI governors are all designed for this.

But with inert AI, there's no drama. No one raids your cube pile. No one contests your territory. No faction diplomacy. The game is currently a peaceful sandbox with military infrastructure that has no enemies.

**Rating: Systems exist on paper. Zero drama in practice.**

> **[STATUS UPDATE]** Raid system (`raidSystem.ts`, `raidTargeting.ts`) and cube visibility (`cubeVisibility.ts` -- AI can see cube piles, assess attractiveness) are fully implemented and tested. `cubePileTracker.ts` tracks pile locations. `diplomacySystem.ts` registered in game loop. `environmentHazards.ts` adds world events (radiation, toxic spill, unstable ground, magnetic anomaly, scrap storm). `stormEscalation.ts` manages storm lifecycle. `weatherEffects.ts` bridges weather to gameplay modifiers. The **drama infrastructure** exists but AI opponents don't yet act on it (REMAINING-WORK.md 3.3, 3.6, 5.4-5.6).

### vs Satisfactory: Building Beauty

Satisfactory lets you build beautiful factories in a gorgeous world. The first-person perspective creates a sense of scale and ownership. Syntheteria shares the first-person factory concept but the visual execution is unclear. The procedural geometry systems (PanelGeometry, BotGenerator, BuildingGenerator) exist but aren't wired into the live R3F rendering pipeline. The material system uses PBR but many meshes likely still use `meshLambertMaterial` (the GDD notes this as an issue).

**Rating: Architecture is ready but visual polish is pre-alpha.**

> **[STATUS UPDATE]** `meshLambertMaterial` has been fully replaced -- zero Lambert materials remain in `src/` (REMAINING-WORK.md 1.5 checked). `InstancedCubeRenderer.tsx` wired into GameScene (1.4 checked). `SelectionHighlight.tsx` and `PlacementPreview.tsx` wired (1.12, 1.13 checked). HDRI environment lighting reactive to storms (1.7 checked). Procgen generators (PanelGeometry, BotGenerator, BuildingGenerator) still NOT wired to live R3F pipeline (1.1-1.3 still open).

---

## Top 10 Issues (Ranked by Impact on Fun)

1. **No working tutorial/onboarding.** Tutorial steps are defined, otter dialogue is written, but the bridge from tutorial system to otter speech bubbles appears disconnected. New players will be lost. This is the single most important fix. Without it, 90% of players bounce in 2 minutes.

   > **[IMPLEMENTED - tutorialOtterBridge.ts]** Bridge now exists and is wired into game loop via `registerSystems.ts`. `syncTutorialToOtter()` pipes tutorial step dialogue into otter entity lines each tick. Tested. Visual verification in live build still needed.

2. **AI opponents are inert.** The GOAP governor has critical bugs (rounding, no fallback, unreachable preconditions). The entire 4X promise -- competition, raids, territory -- is dead. This turns "first-person 4X" into "first-person sandbox."

   > **[PARTIALLY DONE - governorSystem.ts, economySimulation.ts]** Governor tick loop, action executor, economy simulation, and AI tech research all wired. AI cubes spawn as real entities. However, AI bots don't run full harvest-compress-carry; GOAP-to-raid pipeline not connected; faction-specific strategies not implemented. See REMAINING-WORK.md 2.2, 2.4, 3.1-3.6.

3. **No music or ambient atmosphere at any screen.** The title screen is silent. The game world relies on storm ambience initialized only after first click. There's no soundtrack. Audio is 50% of immersion. Right now it's 0%.

   > **[IMPLEMENTED - src/audio/]** Full audio stack: AdaptiveMusic.ts (5-state layered synthesis), SFXLibrary.ts, SpatialAudio.ts, StormAmbience.ts, BiomeAmbience.ts, FactoryAudio.ts, AudioEventBridge.ts (16+ events), AudioQuality.ts. All tested. Browser autoplay policy still gates initial playback.

4. **Duplicate/conflicting interaction models.** RadialToolMenu (equip tools) AND ObjectActionMenu (contextual click) both exist. The GDD explicitly says "no tools." One must die. This confusion will plague every interaction.

   > **[NOT STARTED]** Both systems still coexist. No design resolution made.

5. **Doubled HUD elements.** The Bezel top bar AND FPSHUD ResourceBar show identical data. The Bezel bottom AND FPSHUD Hints show identical controls. Pick one presentation layer.

   > **[NOT STARTED]** Both Bezel.tsx and FPSHUD.tsx remain. No deduplication.

6. **No minimap or spatial awareness tools.** No map, no compass, no waypoints. Players need to understand where they are on the planet, where resources are, where enemies are. Even a simple compass heading would help.

   > **[PARTIALLY DONE - minimapData.ts]** Data layer complete (terrain, fog, entities, territory borders). Tested. Waypoint system exists (`waypointSystem.ts`). No UI renderer to display minimap to player. See REMAINING-WORK.md 7.3, 7.11.

7. **Color scheme inconsistency.** TitleScreen/PregameScreen/LoadingScreen use amber/chrome (#e8a020). FactionSelect/MapConfig/OpponentConfig use terminal green (#00ffaa). Bezel/FPSHUD/CoreLoopHUD use terminal green. The aesthetic is split between two identities.

   > **[NOT STARTED]** `designTokens.ts` exists in `src/ui/` but color unification across all screens has not been addressed. See REMAINING-WORK.md 7.10.

8. **No clear goal communication.** Victory/loss conditions exist in code but are never presented to the player. The game needs an ever-present objective tracker or at minimum a briefing at game start.

   > **[PARTIALLY DONE - victoryConditionEvaluator.ts]** Full 8-condition evaluator with per-faction scoring, hold timers, tiebreakers, and alert threshold events. Registered in game loop. No UI panel surfaces this to the player. See REMAINING-WORK.md 5.2, 5.12.

9. **Loading screen doesn't show active progress.** The active loading screen (14-step progress, otter tease at 80%) is never invoked -- the init runs synchronously in one frame, so only the passive "INITIALIZING..." pulse bar shows. The beautiful loading screen design is wasted.

   > **[NOT STARTED]** `LoadingScreen.tsx` exists with both modes, but the synchronous init path in `App.tsx` still prevents active mode from rendering. No async init refactor has been done.

10. **Pause menu has disabled features.** Save, Load, and Settings are all grayed out in the pause menu. ESC opens a save/load menu separately. Two overlapping pause/menu systems with incomplete features.

    > **[PARTIALLY DONE]** `SaveManager.ts` exists with 4 save slots, ECS serialization, versioning. IndexedDB persistence works on web (tested). `SettingsScreen.tsx` exists. However, pause menu integration with save/load is not confirmed as fully wired. See REMAINING-WORK.md 7.12, 9.5-9.6.

---

## Top 5 "This Is Actually Cool" Moments

1. **The physical cube economy concept.** Resources as visible, stealable 0.5m rigid-body cubes that you grind, compress, carry, and stack -- this is genuinely novel. Your wealth is literally the pile of cubes sitting outside your base. Enemies can see it and steal it. This is brilliant design. No other factory game does this. If it feels good in practice (screen shake on compress, physical stacking, belt transport of real 3D objects), this alone could be the hook.

2. **The otter hologram lore.** A home-planet AI that found Earth otters endearing and uses them as holographic messengers is WONDERFUL. It's the kind of detail that makes a game world feel loved. The Star-Wars-hologram delivery mechanism is evocative. If the otter actually appears, talks to you, and has personality, players will fall in love with it. This is your Companion Cube, your Glados, your PDA voice.

3. **The contextual radial action menu.** Click anything in the world and get a context-appropriate SVG radial menu with actions. Ore deposit gives you HARVEST. Furnace gives you OPEN/LOAD. Bot gives you COMMAND/REPAIR. This is a clean, modern interaction pattern that eliminates tool switching. The SVG wedge rendering with color-coded entity types is polished.

4. **The storm sky shader.** Procedural dark clouds, a pulsating wormhole at zenith, random lightning flashes -- all in a GLSL fragment shader running on the sky dome. This is atmospheric and distinctive. No skybox image file -- it's all generated. The "perpetual storm on a machine planet" aesthetic is strong.

5. **The pregame colonization framing.** "COLONY MISSION BRIEFING" with tabs for PATRON/MAP/RIVALS. "ABORT MISSION" and "LAUNCH COLONY." The seed phrase system ("hollow-bright-forge"). The loading screen steps ("Spawning rival colonies... Briefing otter hologram..."). The whole framing sells the fantasy of being deployed on a colony mission. It's coherent world-building applied to UI. Most games have "New Game > Select Character > Start." This has narrative flavor.

---

## Final Verdict

Syntheteria has a GREAT foundation. The core concept (first-person 4X with physical cube economy on a machine planet) is genuinely novel. The code architecture is thoughtful -- JSON-driven config, reactive HUD, modular systems, contextual interaction. The lore is compelling. The aesthetic has identity.

But right now, it's an engine, not a game. The player journey from "I launched the game" to "I'm having fun" has too many broken links: no working tutorial, no AI opponents, no music, no clear goals, no visual wow moments. The design documents describe a game I want to play. The code describes a game that's 60% built but whose critical connections (tutorial-to-otter, AI-behavior, tool-vs-context, HUD-deduplication) are frayed or missing.

**If I downloaded this as a paying customer, I would refund after 10 minutes.** Not because it's bad, but because I can't figure out what to do and nobody -- no otter, no HUD, no voice, no text popup -- tells me.

**If I downloaded this as an Early Access supporter who reads dev blogs?** I'd be excited. The bones are excellent. Fix the onboarding, make the AI compete, add music, and this could be special.

**Priority order for making this fun (with 2026-03-11 status):**

| # | Recommendation | Status | Key Files |
|---|----------------|--------|-----------|
| 1 | Wire the otter tutorial | **IMPLEMENTED** | `tutorialOtterBridge.ts`, `registerSystems.ts` |
| 2 | Fix AI governor bugs | **PARTIALLY DONE** | `governorSystem.ts`, `economySimulation.ts` -- governor wired but AI doesn't run full game loop |
| 3 | Add music/ambient audio | **IMPLEMENTED** | `AdaptiveMusic.ts`, `SFXLibrary.ts`, `SpatialAudio.ts`, `StormAmbience.ts`, `BiomeAmbience.ts`, `AudioEventBridge.ts` |
| 4 | Resolve tool-vs-contextual interaction | **NOT STARTED** | `RadialToolMenu.tsx` vs `ObjectActionMenu` -- both still coexist |
| 5 | Deduplicate HUD | **NOT STARTED** | `Bezel.tsx` + `FPSHUD.tsx` still both present |
| 6 | Add a minimap or compass | **PARTIALLY DONE** | `minimapData.ts` data layer complete, no UI renderer |
| 7 | Unify the color scheme | **NOT STARTED** | `designTokens.ts` exists but not applied globally |
| 8 | Communicate victory conditions | **PARTIALLY DONE** | `victoryConditionEvaluator.ts` evaluates all 8 conditions, no UI panel |
| 9 | Wire the active loading screen | **NOT STARTED** | `LoadingScreen.tsx` exists, sync init prevents active mode |
| 10 | Add visual variety to terrain | **PARTIALLY DONE** | `biomeSystem.ts` (4 biomes), `discoverySystem.ts`, `exploration.ts` -- procgen not wired to R3F |
