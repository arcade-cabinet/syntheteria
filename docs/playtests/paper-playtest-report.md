# Paper Playtest Report -- Syntheteria v0.1.0

**Playtester:** Alex (Factorio/Satisfactory/Subnautica/RimWorld player)
**Date:** 2026-03-10
**Method:** Paper playtest via source code review (no live build tested)
**Context:** Downloaded because someone said "first-person Factorio on an alien machine planet"

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

2. **NO MUSIC OR AMBIENT AUDIO ON LOAD.** The AudioSystem initializes on first click. Before that, silence. Even after init, the storm ambience is the main audio element. Where's the soundtrack? Where's the industrial mechanical drone that says "you're on a machine planet"?

3. **NO MINIMAP OR WORLD OVERVIEW.** I have zero spatial awareness. Where am I? Where are the enemies? Where are resources? Factorio gives you a zoomable map from minute one. Even Subnautica has a compass and biome names.

4. **AI OPPONENTS ARE INERT.** The GOAP governor has documented bugs that prevent it from doing anything meaningful. The 4X promise is "compete against AI civilizations." If they don't compete, the game is just a single-player sandbox with no stakes.

5. **NO CLEAR GOAL.** The game over detection system exists (victory = control all territory or destroy all rivals; loss = all units destroyed). But the player never learns these goals. There's no "OBJECTIVE: Establish dominance over Ferrathis" anywhere visible.

6. **INCONSISTENT INTERACTION MODEL.** Tools (RadialToolMenu: scanner/repair/welder/fabricator/builder/salvager) AND contextual clicking (ObjectActionMenu) both exist. The GDD says "no tools" but the code has a full tool system. Pick one.

7. **THE BEZEL/HUD ARE DOUBLED.** The Bezel top bar shows "SCRAP:X E-WASTE:X PARTS:X" AND the FPSHUD ResourceBar shows the exact same data. Two overlapping resource displays. The bottom bezel shows "SCANNER" and control hints, AND the FPSHUD Hints component shows the same controls.

8. **NO FEEDBACK ON PROGRESSION.** When I research a tech, what changes? The TechEffects system applies bonuses but there's no notification: "TECH COMPLETE: Advanced Mining -- Ore extraction +30%." Quest completions have a notification banner, but tech completions don't.

---

## Comparison to Genre Peers

### vs Factorio: Belts and Automation Satisfaction

Factorio's genius is the belt grid -- you see resources flowing, splitters splitting, inserters inserting. It's a visible, tangible system. Syntheteria has belt transport, belt routing, and belt rendering. The physical cube flow on belts could be MORE satisfying than Factorio because the cubes are 3D objects, not sprites. But the UX for placing belts, connecting them, and debugging flow isn't apparent from the code. Factorio's blueprint system took years to perfect. Syntheteria's belt placement needs to feel just as smooth.

**Rating: Foundation is there. Implementation gaps are critical.**

### vs Subnautica: Exploration and Wonder

Subnautica's first hour is INCREDIBLE. You crash-land in an alien ocean. Every direction is a mystery. You see bioluminescent creatures, coral forests, dark caves. The PDA gives you contextual info. The radio pulls you toward story objectives.

Syntheteria has fog of war (hidden/explored/visible) and terrain with biomes. The storm sky with a wormhole is atmospheric. But the machine planet surface -- is it visually varied? Is there wonder in exploration? The terrain renderer uses PBR materials and biome zones, but without seeing it rendered, I can't tell if it's "vast industrial wasteland" (boring) or "alien mechanical landscape with surprises" (compelling).

The otter holograms are Syntheteria's equivalent of Subnautica's PDA. If they work, they could be genuinely delightful. A holographic otter appearing Star-Wars-style to give you crafting tips is a fantastic conceit.

**Rating: High potential, needs visual variety and working otter integration.**

### vs RimWorld: Stories and Drama

RimWorld generates emergent stories through character interactions, disasters, and decisions. Syntheteria's 4X frame should generate drama through faction competition, raids, and resource scarcity. The raid system, territory contestation, and AI governors are all designed for this.

But with inert AI, there's no drama. No one raids your cube pile. No one contests your territory. No faction diplomacy. The game is currently a peaceful sandbox with military infrastructure that has no enemies.

**Rating: Systems exist on paper. Zero drama in practice.**

### vs Satisfactory: Building Beauty

Satisfactory lets you build beautiful factories in a gorgeous world. The first-person perspective creates a sense of scale and ownership. Syntheteria shares the first-person factory concept but the visual execution is unclear. The procedural geometry systems (PanelGeometry, BotGenerator, BuildingGenerator) exist but aren't wired into the live R3F rendering pipeline. The material system uses PBR but many meshes likely still use `meshLambertMaterial` (the GDD notes this as an issue).

**Rating: Architecture is ready but visual polish is pre-alpha.**

---

## Top 10 Issues (Ranked by Impact on Fun)

1. **No working tutorial/onboarding.** Tutorial steps are defined, otter dialogue is written, but the bridge from tutorial system to otter speech bubbles appears disconnected. New players will be lost. This is the single most important fix. Without it, 90% of players bounce in 2 minutes.

2. **AI opponents are inert.** The GOAP governor has critical bugs (rounding, no fallback, unreachable preconditions). The entire 4X promise -- competition, raids, territory -- is dead. This turns "first-person 4X" into "first-person sandbox."

3. **No music or ambient atmosphere at any screen.** The title screen is silent. The game world relies on storm ambience initialized only after first click. There's no soundtrack. Audio is 50% of immersion. Right now it's 0%.

4. **Duplicate/conflicting interaction models.** RadialToolMenu (equip tools) AND ObjectActionMenu (contextual click) both exist. The GDD explicitly says "no tools." One must die. This confusion will plague every interaction.

5. **Doubled HUD elements.** The Bezel top bar AND FPSHUD ResourceBar show identical data. The Bezel bottom AND FPSHUD Hints show identical controls. Pick one presentation layer.

6. **No minimap or spatial awareness tools.** No map, no compass, no waypoints. Players need to understand where they are on the planet, where resources are, where enemies are. Even a simple compass heading would help.

7. **Color scheme inconsistency.** TitleScreen/PregameScreen/LoadingScreen use amber/chrome (#e8a020). FactionSelect/MapConfig/OpponentConfig use terminal green (#00ffaa). Bezel/FPSHUD/CoreLoopHUD use terminal green. The aesthetic is split between two identities.

8. **No clear goal communication.** Victory/loss conditions exist in code but are never presented to the player. The game needs an ever-present objective tracker or at minimum a briefing at game start.

9. **Loading screen doesn't show active progress.** The active loading screen (14-step progress, otter tease at 80%) is never invoked -- the init runs synchronously in one frame, so only the passive "INITIALIZING..." pulse bar shows. The beautiful loading screen design is wasted.

10. **Pause menu has disabled features.** Save, Load, and Settings are all grayed out in the pause menu. ESC opens a save/load menu separately. Two overlapping pause/menu systems with incomplete features.

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

**Priority order for making this fun:**
1. Wire the otter tutorial (make Pip actually talk to me)
2. Fix AI governor bugs (make rivals actually play the game)
3. Add music/ambient audio (make the planet feel alive)
4. Resolve tool-vs-contextual interaction (pick one, delete the other)
5. Deduplicate HUD (one resource display, one control hint area)
6. Add a minimap or compass
7. Unify the color scheme (amber OR green, not both)
8. Communicate victory conditions
9. Wire the active loading screen
10. Add visual variety to terrain (landmarks, ruins, discoveries)
