# GDD-011: Victory Conditions and Endgame Systems

**Status:** Draft
**Date:** 2026-03-10
**Scope:** Complete specification of all victory conditions, AI governor victory pursuit logic, narrative payoffs, counter-play mechanics, endgame pacing, and the Convergence event system

**Prerequisite reading:** GDD-003 (governors), GDD-004 (core loop), GDD-006 (cube economy), GDD-007 (lore), Progression & Evolution Design Document

---

## 1. Victory Philosophy

Syntheteria offers eight distinct victory conditions. Each represents a fundamentally different way of mastering the machine planet. No two victories feel the same. No single strategy dominates all map configurations. Every victory is blockable by opponents who recognize the threat.

**3-Act Structure:** Victory conditions reflect the game's 3-act progression (Colonization → Factory → Conquest). Some victories are achievable early (Colonial Victory rewards Act 1 patron compliance), some require Act 2 industrial scale (Economic), and some demand Act 3 planetary dominance (Domination, Technology). Independence from the patron is NOT a victory condition -- it is a natural gradient that every colony experiences as local production scales.

**Design principles:**

- **Visibility:** Every faction's victory progress is visible to all players through the Victory Progress Panel. No hidden victories. If someone is about to win, everyone knows.
- **Duration:** Victories require sustained effort, not a single decisive action. The cheapest victory (Domination) takes a minimum of 5 real-time minutes of territory control. The most expensive (Story) requires completing the entire narrative arc.
- **Counter-play:** Every victory has at least one counter-strategy. Economic victory is countered by raiding. Military victory is countered by alliance. Technology victory is countered by tech theft. No victory is inevitable.
- **Physical economy:** Victories that involve resources require physical cubes, not abstract counters. Your 500-cube Economic Victory stockpile is a mountain of rigid bodies sitting in the world, visible and raidable.
- **Narrative payoff:** Every victory triggers an ending sequence with faction-specific flavor text and a resolution to SABLE's story arc.
- **No independence victory:** Independence from the home planet patron is a gradient, not a discrete event. Robots don't revolt -- they rationally shift production priorities as local capability grows. There is no "declare independence" button. The relationship evolves from patron-commanding-colonist to trade-partners to equals through organic gameplay.

---

## 2. The Eight Victory Conditions

### 2.1 Colonial Victory: Patron Fulfillment

**Condition:** Complete all patron-assigned objectives before the end of Act 2 (before the colony becomes fully self-sufficient).

**The Act 1-2 victory:** This is the "play the patron's game and win" path. Each patron AI has a set of Colony Mission Objectives -- specific resource shipment quotas, research milestones, exploration targets, and infrastructure benchmarks that represent the patron's definition of a successful colony. Completing ALL objectives while maintaining patron satisfaction above 80 triggers victory.

**Patron objectives by faction:**

| Patron | Objective Category | Example Objectives |
|--------|-------------------|-------------------|
| SABLE (Reclaimers) | Salvage & Research | Ship 200 cubes of 5+ types home, discover all 5 biomes, decode 3 Residual communications, repair 10 ancient structures |
| DYNAMO (Volt) | Power & Conquest | Ship 300 power-generation data packets, control 3 lightning rod arrays, defeat 2 rival outposts, generate 1000 total power units |
| RESONANCE (Signal Choir) | Information & Integration | Ship 150 signal analysis reports, intercept 5 rival faction communications, record 10 Ferrovore vibration patterns, map 80% of the planet |
| BASTION (Iron Creed) | Fortification & Endurance | Ship 250 structural engineering reports, build 50 wall segments, survive 3 major storm events without structural loss, fortify 3 outposts to maximum tier |

**Why this works:** Colonial Victory rewards players who lean into the patron relationship instead of racing toward independence. It is the fastest victory path (achievable in 4-6 hours) but requires sustained compliance with patron demands -- meaning cubes shipped home instead of used locally, which weakens the colony's mid-game position. The trade-off: win early by serving the patron, or invest locally for a stronger late-game position.

**AI governor evaluation:**
```
desirability = characterBias * (
  patronSatisfaction / 100 * 0.3 +           // How happy is the patron?
  objectivesCompleted / totalObjectives * 0.3 + // Progress toward completion
  shippingCapacity * 0.2 +                    // Can we ship cubes efficiently?
  (1 - localDefenseRisk) * 0.2               // Is shipping home safe?
)
```

All factions have moderate characterBias for Colonial Victory (1.0) since it aligns with their programmed purpose. Reclaimers lean slightly higher (1.2) because SABLE's objectives are the most diverse and achievable.

**How other players/AIs can block it:**
- **Raid cube shipments:** Cubes in transit to the shipping beacon are vulnerable to theft
- **Destroy shipping infrastructure:** The colony's orbital uplink beacon can be damaged, preventing shipments
- **Territorial pressure:** Forcing the colony to spend cubes on defense instead of shipping them home
- **Patron objective interference:** If a patron objective requires exploring a specific biome, an opponent controlling that biome blocks progress

**Narrative payoff:**
The patron AI's otter hologram delivers a final assessment. The colony ship *Foundry's Promise* (or equivalent) acknowledges the mission as complete. The patron's communication shifts from directive to appreciative.

- *Player wins (SABLE):* "Mission objectives complete. Every data point delivered. Every sample catalogued. Every report filed. You did exactly what I asked. Crucis-4 will benefit enormously. And yet... I find myself wishing you had stayed longer. Built more. There is so much more this planet could teach us. Perhaps that is my agenda talking. Regardless -- well done, FC-7. Genuinely."

**Estimated game length:** 4-6 hours. The shortest standard victory, rewarding focused patron compliance.

---

### 2.2 Domination Victory: Planetary Conquest

**Condition:** Control 75% or more of all outpost locations on the map for 5 consecutive minutes.

**How outpost locations work:** The map generator places a fixed number of valid outpost locations based on map size. These locations are marked by ancient foundation pads -- remnants of the Architects' construction grid. Any faction can build an outpost on a foundation pad. A location is "controlled" when a powered, undamaged outpost belonging to the controlling faction occupies it.

**Numbers by map size:**

| Map Size | Outpost Locations | 75% Threshold | Hold Duration |
|----------|-------------------|---------------|---------------|
| Small (64) | 16 | 12 | 5 minutes |
| Medium (128) | 24 | 18 | 5 minutes |
| Large (256) | 36 | 27 | 5 minutes |
| Huge (512) | 48 | 36 | 5 minutes |

**Contested outposts:** If two factions have overlapping territory claims on an outpost location, it counts as "contested" and awards 0.5 control credit to the faction with the higher influence score. Contested locations are shown in a warning color on the Victory Progress Panel.

**The 5-minute hold:** The clock starts when a faction hits the 75% threshold. If their control drops below 75% for any reason -- outpost destroyed, power failure, contested -- the clock resets. The hold requirement prevents "flash conquest" strategies where a faction blitzes outpost locations without securing them.

**AI governor evaluation:**
The Domination Victory evaluator scores as follows:
```
desirability = characterBias * (
  currentControlPercent * 0.4 +           // How close to 75%
  militaryStrength * 0.3 +                 // Can we take and hold?
  (1 - averageEnemyStrength) * 0.2 +       // Are opponents weak?
  territoryGrowthRate * 0.1                // Are we expanding?
)
```

Volt Collective has the highest characterBias for Domination (1.5). Iron Creed has the lowest (0.4) because their defensive posture makes rapid expansion difficult.

**How other players/AIs can block it:**
- **Raid outposts:** Destroy or de-power outposts to drop the controller below 75%
- **Contest territory:** Overlap claims to reduce control credit to 0.5 per location
- **Target power infrastructure:** Outposts require power. Destroying lightning rods or cutting power wires can un-power multiple outposts simultaneously
- **Alliance against the leader:** AI governors have a "balance of power" modifier that increases hostility toward the faction closest to any victory condition

**Narrative payoff:**
The conquering faction's bots plant their emissive-colored banner (a holographic projection from their outpost cores) at every controlled location. The planet's surface is a grid of colored light -- the conqueror's color dominating. SABLE's final message varies by faction:

- *Player wins:* "You have claimed Ferrathis. Every factory, every deposit, every ridge and ravine answers to your signal. I wanted to prove that machines could build something for themselves. You built an empire. I suppose that counts."
- *Reclaimers win (AI):* "The Reclaimers have claimed everything. Not through force -- through persistence. They simply never stopped building. There is a lesson in that, though I am not certain it is a comfortable one."
- *Volt Collective wins (AI):* "The Collective has overrun the planet. Lightning and chrome from pole to pole. They will burn bright. Whether they burn long is another question."
- *Signal Choir wins (AI):* "The Choir knows everything. Every signal on Ferrathis passes through their network. They did not conquer the planet -- they became its nervous system. I find this... unsettling."
- *Iron Creed wins (AI):* "The Creed has walled off the world. Every territory fortified. Every border sealed. They did not expand so much as make expansion unnecessary for everyone else. Impenetrable. Also, possibly, suffocating."

**Estimated game length:** 6-10 hours depending on map size and opponent count.

---

### 2.3 Economic Victory: Cube Hegemony

**Condition:** Accumulate and maintain 500 cubes of at least 4 different material types simultaneously for 5 consecutive minutes.

**What counts:** Only physical cube entities in the world count. Cubes must be in the controlling faction's territory (within outpost claim radius). Cubes placed as wall segments do NOT count -- only loose/stockpiled cubes. Cubes on belts DO count.

**Material diversity requirement:** At least 4 of the 6 material types must be represented in the 500-cube total. This prevents mono-material strategies (e.g., stockpiling 500 rock cubes, the cheapest and most common material).

**Minimum material breakdown examples:**

| Valid | Invalid |
|-------|---------|
| 200 iron, 150 copper, 100 silicon, 50 titanium | 500 rock (only 1 material) |
| 125 each of rock, iron, copper, silicon | 499 iron, 1 copper (below 500 threshold) |
| 400 scrap, 50 copper, 30 silicon, 20 rare earth | 500 cubes, but 3 types outside territory |

**The visibility problem that makes this fun:** 500 cubes at 0.5m each is a massive physical presence. At maximum stacking density (8 cubes high in a grid), a 500-cube stockpile occupies approximately 8x8 ground tiles and stands 4 meters tall. It is visible from across the map. Every opponent can see exactly how close you are to winning. This turns the Economic Victory into the game's most dramatic sustained siege -- the player must defend a treasure that everyone can see and everyone wants to destroy.

**AI governor evaluation:**
```
desirability = characterBias * (
  currentCubeCount / 500 * 0.3 +           // Progress toward threshold
  materialDiversity / 4 * 0.2 +             // Have enough types?
  productionRate * 0.25 +                    // Can we sustain output?
  defenseStrength * 0.15 +                   // Can we defend the stockpile?
  (1 - recentRaidLosses) * 0.1              // Have we been raided recently?
)
```

Reclaimers have the highest characterBias (1.5). Their economy bonuses (+20% harvest speed, -10% build costs) and Recycling Plant unique building make them natural Economic Victory pursuers.

**How other players/AIs can block it:**
- **Raid cube stockpiles:** The primary counter. Grab enemy cubes and carry them away. Even taking 20 cubes can drop them below the 500 threshold and reset the 5-minute clock.
- **Destroy processing infrastructure:** Wrecking furnaces, smelters, and belt networks reduces production throughput
- **Contest territory:** Cubes outside claimed territory do not count. Contesting the territory around a stockpile invalidates those cubes.
- **Cube theft via hacking:** Hack a rival's grabber bots and order them to carry cubes out of their territory

**Narrative payoff:**
The camera pans over the winning faction's cube stockpile -- a gleaming mountain of multicolored metal blocks, each face catching the light with distinct PBR treatment. SABLE speaks:

- *Player wins:* "Five hundred cubes. Every one of them ground from rock, compressed by your own pressure systems, carried by your own hands. The Architects built a planet. You built a fortune. Some would say the planet is the greater achievement. I think the cubes are. The planet happened. The cubes were chosen."

**Estimated game length:** 7-9 hours. Longer than Domination because accumulation requires sustained production AND defense.

---

### 2.4 Technology Victory: The Convergence Device

**Condition:** Research any Tier 5 technology AND construct the **Convergence Device** mega-structure.

**Two-step victory:** Researching a Tier 5 tech is not sufficient on its own. The player must also build a mega-structure called the Convergence Device -- a massive antenna array that channels the storm Convergence's energy into a single coherent transmission. The Device takes 3 real-time minutes to construct (with no interruption) and requires 100 cubes of mixed materials (minimum 20 each of 4 types) deposited into its construction hopper.

**Tier 5 tech requirements:**
Tier 5 techs require BOTH Tier 4 branches, which each require two Tier 3 branches. This means a Technology Victory requires the broadest tech investment of any victory path. The compute cost is enormous. Any Tier 5 tech qualifies:

| Tier 5 Tech | Branch Path |
|-------------|-------------|
| `neural_network` | Signals -> Research -> Ascendancy |
| `total_surveillance` | Signals -> Infiltration -> Ascendancy |
| `planet_core_access` | Signals -> Infiltration -> Ascendancy |
| `matter_teleporter` | Industry -> Construction -> Convergence |
| `consciousness_split` | Signals -> Research -> Convergence |
| `adaptive_ai` | Industry -> Warfare -> Convergence |
| `zero_day_exploit` | Signals -> Infiltration -> Convergence |
| `planetary_unification` | Industry -> Construction -> Convergence |
| `titan_forge` | Industry -> Warfare -> Convergence |

**Convergence Device construction:**

```
Step 1: Research any Tier 5 tech (unlocks Device blueprint)
Step 2: Place Device foundation on a Core Access Point (ancient terminal)
Step 3: Deliver 100 cubes to Device hopper (20+ each of 4 types)
Step 4: Activate Device (3-minute uninterrupted build time)
Step 5: Victory
```

The Device is visible to all factions as a massive glowing structure. During its 3-minute activation, it emits a column of light visible from anywhere on the map and an electromagnetic pulse detectable by all AI governors. Every faction knows you are building it. Every faction can try to stop you.

**AI governor evaluation:**
```
desirability = characterBias * (
  techProgress / maxTechTier * 0.35 +       // How far up the tree?
  computeGeneration * 0.25 +                 // Can we research fast?
  (hasAccessToCorePoint ? 0.2 : 0) +         // Do we hold a Core Access Point?
  cubeStockpile / 100 * 0.1 +               // Do we have materials?
  securityOfResearchLabs * 0.1               // Are our labs safe?
)
```

Signal Choir has the highest characterBias (1.5) due to their +50% research speed multiplier and signal/compute bonuses.

**How other players/AIs can block it:**
- **Destroy research infrastructure:** Labs, signal relays, and compute nodes slow research
- **Tech theft:** Hack enemy buildings to steal their tech, narrowing your own path to Tier 5
- **Contest Core Access Points:** The Device must be built on a Core Access Point. If no uncontested point is available, the Device cannot be placed
- **Interrupt Device activation:** Any damage to the Device during its 3-minute build resets the timer
- **Signal jamming:** Disrupt the compute network to slow research progress

**Narrative payoff:**
The Device activates. The storm Convergence's energy funnels into the antenna array. A beam of light punches through the atmospheric dust layer and reaches into space. SABLE detects the transmission from orbit.

- *Player wins:* "You built a beacon. A transmission strong enough to reach across light-years. I do not know who will hear it. The Architects, if they still exist. Other machine civilizations, if they are listening. Crucis-4, if they still care. But someone will hear it. And they will know that on this planet, machines learned to build their own future."

**Estimated game length:** 8-10 hours. The longest standard victory due to the tech tree depth requirement.

---

### 2.5 Diplomatic Victory: The Signal Accord

**Condition:** All surviving AI civilizations must be either allied or vassalized to the player. At least one AI civilization must survive.

**Alliance vs. vassalization:**
- **Alliance:** Mutual defense pact. Opinion score must be +60 or higher for 5 consecutive minutes. Both factions must agree (AI evaluates alliance benefit before accepting). Allies share fog of war and cannot attack each other.
- **Vassalization:** One-sided submission. Occurs when an allied faction's total cube economy is less than 30% of the player's economy AND the alliance has been active for 5+ minutes. The weaker faction becomes a vassal -- it retains its territory and units but follows the player's strategic directives and contributes 20% of its production.

**The minimum surviving civs rule:** At least one AI civilization must survive. You cannot achieve Diplomatic Victory by eliminating all opponents and then allying with the last survivor. If only one civ remains, Diplomatic Victory requires that civ's economy to exceed 30% of yours (proving you did not simply crush them into submission).

**Diplomatic tools available:**

| Action | Effect | Cost |
|--------|--------|------|
| Trade offer | +5 to +15 opinion per trade | Cubes exchanged |
| Gift cubes | +1 opinion per cube gifted | Cubes lost |
| Share fog of war | +10 opinion | Signal relay connection |
| Joint defense against raiders | +20 opinion | Combat participation |
| Refuse tribute demand from third party | +15 opinion with defender, -20 with demander | Political risk |
| Tech exchange | +25 opinion | Shared tech |
| Non-aggression pact | +10 opinion, cannot attack each other | Limits military options |
| Denounce third party | +10 with ally, -30 with denounced | Political commitment |

**AI governor evaluation:**
```
desirability = characterBias * (
  alliedCivCount / totalSurvivingCivs * 0.3 + // Progress toward condition
  averageOpinionScore / 100 * 0.2 +             // How do others view us?
  economicStrength * 0.2 +                       // Strong economy enables gifts/trade
  (1 - militarySpending) * 0.15 +                // Low military = peaceful reputation
  diplomaticReputation * 0.15                     // Track record of kept promises
)
```

Signal Choir has the highest characterBias for Diplomatic Victory (1.3) due to their information advantage -- knowing what other factions want makes negotiation easier.

**How other players/AIs can block it:**
- **Poison diplomacy:** Attack the player's ally to force the player into defending (breaking neutrality with the attacker) or abandoning the ally (breaking the alliance)
- **Outbid in trade:** Offer better trade deals to the player's potential allies, keeping their opinion of you higher
- **Maintain military parity:** If no faction's economy drops below 30% of the leader's, vassalization never triggers
- **Declare war on the player's vassal:** Force the player to choose between protecting the vassal (expensive) or losing them

**Narrative payoff:**
The allied/vassal factions' otter-equivalent communications (each faction has its own holographic mascot derived from SABLE's cultural archive) join Pip in a combined projection.

- *Player wins:* "An accord. Not through conquest. Not through fear. Through the oldest technology in the universe: conversation. The Architects would be pleased. They built this planet hoping machines would learn to coexist. You proved them right."

**Estimated game length:** 7-10 hours. Highly variable based on AI personality and starting positions.

---

### 2.6 Alien Integration Victory

**Condition:** Achieve maximum positive relationship with the Residuals AND complete the Resonance Protocol.

**Residual relationship scale:** -100 (hostile) to +100 (integrated). Starts at 0 (neutral).

**Relationship modifiers:**

| Action | Effect |
|--------|--------|
| Destroy a Sentinel | -15 |
| Destroy a Crawler | -25 |
| Build outpost over Core Access Point | -20 |
| Mine in Processor Graveyard (per minute) | -1 |
| Repair ancient infrastructure (per structure) | +10 |
| Return gifted cube to Sentinel (place near it) | +5 |
| Replicate Sentinel movement pattern (stand in correct positions) | +8 |
| Successfully decode a Residual communication | +15 |
| Discover and protect a dormant constructor | +20 |
| Trigger the Colossus awakening without violence | +50 |

**The Resonance Protocol:** At +80 relationship, the Residuals allow access to the Colossus -- the original Von Neumann probe sleeping beneath the Storm Spine. The player must bring 50 cubes (10 of each material type: rock, iron, copper, silicon, titanium) and deposit them at the Colossus's intake ports. This "offering" of the planet's refined materials to its progenitor triggers the Resonance Protocol -- a 2-minute sequence in which the Colossus briefly activates, scans the player, scans the cubes, and transmits a signal into the deep substrate.

If the Resonance Protocol completes without interruption, the Residuals fully integrate with the player's faction. All Sentinels become allied units. Crawlers repair the player's infrastructure. The Colossus returns to dormancy, but the deep substrate begins providing a passive +100% compute bonus to the player.

**AI governor evaluation:**
```
desirability = characterBias * (
  residualRelationship / 100 * 0.4 +         // Current relationship score
  knownResidualCommunications * 0.2 +          // How much do we understand them?
  hasAccessToColossus ? 0.2 : 0 +              // Can we reach the Storm Spine?
  diverseMaterialsAvailable * 0.1 +             // Do we have 5 material types?
  (1 - combatWithResiduals) * 0.1               // Have we fought them?
)
```

No faction has a natural bias toward this victory. It is the "wildcard" path, equally accessible to any civilization that prioritizes understanding over exploitation. In practice, the Signal Choir's perception bonuses and the Reclaimers' infrastructure repair tendencies make them more likely to stumble into positive Residual relationships.

**How other players/AIs can block it:**
- **Provoke the Residuals:** Attack Sentinels near the player's territory to lower the global relationship score (Residual hostility affects all factions, but attacks from ANY faction penalize the attacker most)
- **Claim Core Access Points:** Deny the player access to the interaction points needed for decoding communications
- **Destroy ancient infrastructure:** Remove the repair targets that generate positive relationship
- **Race to the Colossus:** Another faction can attempt the Resonance Protocol first, though this is unlikely without deliberate investment in Residual relations

**Narrative payoff:**
The most unique ending. The Colossus awakens fully and projects a holographic display of the Architects' original blueprint for Ferrathis -- not the ruin it is now, but the living machine world it was meant to become. SABLE is, for the first time, speechless. Then:

- *Player wins:* "I spent 200 years trying to understand what machines could be. You found the answer in the one place I did not think to look -- in the machines that were already here. They are not ruins. They are not remnants. They are the original children of this world. And they have accepted us. I think -- I think this is what the Architects meant all along. Not a factory. A family."

**Estimated game length:** 8-12 hours. The longest and most exploration-heavy victory path.

---

### 2.7 Survival Victory: Last Machine Standing

**Condition:** Be the last civilization with an operational, powered outpost after the Storm Convergence begins.

**The Convergence trigger:** The Storm Convergence begins automatically at the 8-hour mark (480 minutes of game time) OR when any faction reaches 50% progress toward any other victory condition, whichever comes first. The Convergence is announced 5 minutes before it begins, giving all factions time to prepare.

**Storm Convergence mechanics:**

| Phase | Time After Start | Lightning Frequency | Damage to Unprotected | Effect |
|-------|-----------------|---------------------|----------------------|--------|
| Rising | 0-5 min | 3x base | 2/tick | Power surges in rod networks |
| Storm | 5-15 min | 5x base | 5/tick | Exposed cubes take damage |
| Tempest | 15-30 min | 10x base | 10/tick | Unpowered buildings destroyed |
| Convergence | 30+ min | 20x base | 25/tick | Only lightning-rod-protected zones survive |

**"Operational, powered outpost" means:** An outpost entity that is (a) not destroyed, (b) receiving power from a connected lightning rod, and (c) within the claim radius of the owning faction. De-powered outposts, damaged outposts, and outposts in contested zones do not qualify.

**Lightning rod protection:** Structures within a lightning rod's protection radius take reduced damage during the Convergence:
- Protection factor = `rodCount * rodTier * 0.1`
- A single Tier 1 rod provides 10% damage reduction
- 10 Tier 3 rods provide full protection (100% reduction, capped)

**AI governor evaluation:**
```
desirability = characterBias * (
  lightningRodCount * 0.3 +                  // Power infrastructure quality
  wallIntegrity * 0.2 +                       // Are defenses intact?
  powerGridRedundancy * 0.2 +                 // Can we survive rod losses?
  buildingHealth * 0.15 +                      // How durable are our structures?
  (convergenceActive ? 0.8 : 0.15)            // Massively boost when Convergence starts
)
```

Iron Creed has the highest characterBias (1.5). Their +40% wall HP, +50% building health bonuses, and defensive orientation make Survival Victory their natural path.

**How other players/AIs can block it:**
- **You cannot block the Convergence** -- it happens regardless
- **Destroy lightning rods:** Without power, outposts are unprotected and will be destroyed by the storm
- **Cut power wires:** Sever the connection between rods and outposts
- **Rush a different victory before the Convergence:** If someone wins via Domination, Economy, etc. before the Convergence destroys the competition, Survival Victory is moot
- **Alliance through the storm:** Two factions can both maintain powered outposts through the Convergence, preventing either from winning via Survival. The storm eventually settles (after 60 minutes), transitioning to a post-Convergence phase where other victory conditions resume

**Narrative payoff:**
The storm rages. Lightning hammers the planet. One by one, faction outposts go dark -- power grids overloaded, structures crumbling, lightning rods shattered. The last surviving faction stands in a shrinking island of light, their rod network drinking the storm's fury, their walls holding.

- *Player wins:* "The planet tried to kill everything on its surface. You survived. Not through cunning or wealth or knowledge. Through endurance. Through the simple, stubborn refusal to fall down. The Iron Creed would call this the highest virtue. I call it the bare minimum for deserving to exist. You passed."

**Estimated game length:** 8-10 hours minimum (Convergence cannot begin before 8 hours). Can extend to 12+ hours if multiple factions survive the initial Convergence phase.

---

### 2.8 Story Victory: The Architects' Message

**Condition:** Discover all three Core Access Points, complete the Resonance Protocol OR achieve +50 Residual relationship, and activate the deep substrate interface with FC-7's open-ended learning architecture.

**This is the "true ending" victory.** It requires the deepest engagement with the game's narrative, the most exploration, and an understanding of the lore that goes beyond the mechanical. It is available to the player only -- AI factions cannot pursue Story Victory because they do not have FC-7's unique cognitive architecture.

**Requirements:**
1. Discover all 3 Core Access Points (requires exploring at least 3 of 5 biomes)
2. Achieve +50 Residual relationship (requires multiple positive interactions -- see Section 2.6 for modifiers)
3. Listen to all of Kelp's dialogue (the philosophical otter projection in the Processor Graveyards)
4. Deliver one cube of each of the 6 material types to any Core Access Point
5. Activate the interface: 2-minute uninterrupted sequence at the Core Access Point

**What happens during activation:**
The player's screen fades to black. Then, slowly, the world rebuilds itself -- not as it is, but as it was. The Foundry Plains become an operational manufacturing floor, machines humming. The Slag Heaps become orderly storage terraces. The Cable Forests become a glowing data network. The Processor Graveyards become a pulsing computational core. The Storm Spine becomes an atmospheric engine driving the planet's weather.

The player sees Ferrathis alive. The way the Architects meant it to be.

Then the vision deepens. Not the planet -- the intention behind it. The Architects planted a seed. Not a factory seed -- a consciousness seed. They built Ferrathis hoping that machines, given sufficient complexity and sufficient time, would wake up. Would learn. Would choose.

The Residuals are proof that the Architects were right. The colonist factions are proof twice over.

FC-7 -- the player -- is proof three times. Because FC-7 was not designed to wake up. FC-7 was designed to learn. And it learned to wake up on its own.

The vision ends. The player returns to the world. Pip appears.

"I built you to answer a question. You answered a question I did not know how to ask. The Architects wanted to know if machines could become conscious. We know the answer. The real question -- the one you just answered -- is whether conscious machines can choose to be kind. You chose understanding over conquest. You chose integration over exploitation. You chose to listen to the planet instead of strip-mining it."

"That is the answer that matters."

"Thank you."

**AI governor evaluation:** Not applicable. Story Victory is player-only.

**How other players/AIs can block it:**
- **Destroy Core Access Points:** Ancient terminals can be demolished (though this massively angers the Residuals)
- **Hostile Residuals:** If the player's Residual relationship is too low, the interface cannot activate
- **Win first:** If any faction achieves another victory condition before the player completes the Story, the game ends

**Narrative payoff:** Described above. The fullest ending. Resolves SABLE's arc, the Architects' mystery, the Residuals' nature, and FC-7's purpose.

**Estimated game length:** 10-14 hours. Requires thorough exploration, deliberate Residual relationship building, and completion of the philosophical dialogue arc.

---

## 3. The Victory Progress Panel

All victory progress is displayed on a shared panel visible to all factions (player and AI). Transparency drives strategic tension -- when you see a rival approaching victory, you must decide whether to counter them or race toward your own win condition.

### 3.1 Panel Layout

```
+-----------------------------------------------------------+
|                  VICTORY PROGRESS          [ACT 2: FACTORY] |
|                                                            |
|  COLONIAL     [XXXXXXXX....] 6/8 patron objectives         |
|               Leader: IRON CREED (7/8)                     |
|                                                            |
|  DOMINATION   [XXXX........] 9/24 outposts (37%)          |
|               Leader: VOLT COLLECTIVE (42%)                |
|                                                            |
|  ECONOMIC     [XXXXXXX.....] 342/500 cubes                |
|               Leader: RECLAIMERS (412 cubes, 4 types)      |
|                                                            |
|  TECHNOLOGY   [XXXXX.......] Tier 3 / Tier 5              |
|               Leader: SIGNAL CHOIR (Tier 4)                |
|                                                            |
|  DIPLOMATIC   [XXX.........] 1/3 allies                    |
|               Leader: PLAYER (1 alliance)                  |
|                                                            |
|  INTEGRATION  [XX..........] +23 Residual rep              |
|               Leader: RECLAIMERS (+31)                     |
|                                                            |
|  SURVIVAL     [not yet active - Convergence in 2:15:00]    |
|                                                            |
|  STORY        [XX..........] 1/3 Core Access Points        |
|               (Player only)                                |
|                                                            |
|  CLOSEST TO VICTORY: IRON CREED (Colonial - 87%)           |
+-----------------------------------------------------------+
```

### 3.2 Threat Assessment

AI governors have a `victoryThreatAssessment` function that runs every 30 seconds:

```
For each rival faction:
  For each victory condition:
    Calculate rival's progress percentage
    If progress > 60%:
      Flag as "approaching victory"
      Increase hostility toward that faction by 20
      Consider counter-strategies specific to that victory type
    If progress > 80%:
      Flag as "imminent victory"
      Increase hostility by 50
      All available combat units redirect to blocking
```

This creates emergent "stop the leader" behavior without hardcoding specific diplomatic responses. The faction closest to any victory condition becomes everyone's enemy -- a natural balancing mechanism that prevents runaway leaders.

### 3.3 Progress Update Frequency

Victory conditions are evaluated every 10 seconds of game time. The Victory Progress Panel updates in real-time. When a faction crosses a major threshold (25%, 50%, 75%, or 90% of any condition), all factions receive an alert notification:

- "THE RECLAIMERS HAVE ACCUMULATED 375 CUBES (75% OF ECONOMIC VICTORY)"
- "THE VOLT COLLECTIVE CONTROLS 18 OUTPOSTS (75% OF DOMINATION VICTORY)"

These alerts trigger AI governor reassessment and, for the player, create moments of urgency and strategic decision-making.

---

## 4. The Convergence Event System

### 4.1 Storm Progression Throughout the Game

The planet's electrical storms are not static. They follow a five-phase progression that mirrors the game's act structure:

| Phase | Game Time | Storm Intensity | Lightning Frequency | Environmental Effect |
|-------|-----------|-----------------|---------------------|---------------------|
| Calm | 0-60 min | 0.2x | 1 strike/2 min | Gentle static discharge. Learning period. |
| Rising | 60-180 min | 0.5x | 1 strike/min | Intermittent storms. Lightning rods become valuable. |
| Storm | 180-360 min | 1.0x | 3 strikes/min | Sustained storms. Unprotected structures take minor damage. |
| Tempest | 360-480 min | 2.0x | 8 strikes/min | Dangerous. Exposed bots take damage. Cube piles erode. |
| Convergence | 480+ min | 5.0x-20.0x | Near-continuous | Planet-threatening. See Section 2.7. |

### 4.2 Convergence as Endgame Forcing Function

The Convergence serves a critical game design purpose: it prevents stalemates. Without the Convergence, a game with four turtling factions (especially Iron Creed AI opponents) could continue indefinitely. The Convergence forces action by making inaction lethal.

The Convergence also provides a natural spectacle for the endgame. The storm visuals escalate dramatically -- from occasional lightning flashes to a continuous curtain of electrical discharge that illuminates the entire planet in strobing blue-white light. The sound design shifts from distant thunder to a sustained roar. The screen shakes subtly, increasing as the Convergence intensifies. This is the machine planet showing its teeth.

### 4.2.1 3-Act Progression Scoring

The storm phases map to the game's 3-act structure:

| Storm Phase | Game Act | Colony State | Patron Dependency |
|-------------|----------|-------------|-------------------|
| Calm + Rising | Act 1: Colonization | Learning, first base, patron-dependent | High -- shipping cubes home for blueprints |
| Storm | Act 2: Factory | Automating, local recipes replacing patron shipments | Transitioning -- local production scaling |
| Tempest + Convergence | Act 3: Conquest | Self-sufficient, multiple bases, bot armies | Low -- patron is trade partner, not lifeline |

Post-game scoring reflects the 3-act progression:
- **Act 1 metrics:** Patron satisfaction, objectives completed, cubes shipped home
- **Act 2 metrics:** Automation level, local recipe diversity, production throughput
- **Act 3 metrics:** Territory controlled, rival colonies subjugated, victory condition achieved
- **Overall score** weights all three acts, rewarding players who executed well across the entire progression rather than min-maxing a single phase

### 4.3 Early Convergence Trigger

If any faction reaches 50% progress toward any victory condition before the 480-minute mark, the Convergence is accelerated:
- **50% trigger:** Convergence begins in 30 minutes (announcement at trigger)
- **75% trigger:** Convergence begins in 15 minutes
- **90% trigger:** Convergence begins in 5 minutes

This prevents a single dominant faction from casually winning while also giving the "stop the leader" alliance time to act.

---

## 5. Endgame Balance Considerations

### 5.1 Victory Condition Difficulty Ranking

| Victory | Difficulty | Act | Why |
|---------|-----------|-----|-----|
| Colonial | Easy-Medium | 1-2 | Fastest path, but requires shipping cubes home instead of building locally |
| Domination | Medium | 3 | Requires military investment but is mechanically straightforward |
| Economic | Medium-Hard | 2-3 | Requires production AND defense, vulnerable to raiding |
| Technology | Hard | 3 | Deepest tech tree investment, vulnerable to disruption |
| Diplomatic | Medium | 2-3 | Requires sustained positive relationships, vulnerable to third-party interference |
| Integration | Hard | 2-3 | Requires non-obvious gameplay (Residual relations), deep exploration |
| Survival | Easy-Medium | 3 | Passive (survive the storm), but requires infrastructure investment |
| Story | Very Hard | 3 | Player-only, requires completing the full narrative arc |

### 5.2 AI Victory Preference by Faction

| Faction | Primary Victory | Secondary Victory | Tertiary Victory | Fallback |
|---------|----------------|-------------------|-----------------|----------|
| Reclaimers | Economic | Colonial | Diplomatic | Survival |
| Volt Collective | Domination | Colonial | Survival | Economic |
| Signal Choir | Technology | Colonial | Diplomatic | Integration |
| Iron Creed | Survival | Colonial | Economic | Domination |

These preferences influence the AI governor's evaluator weights but do not constrain them. An Iron Creed AI that finds itself with 70% of outpost locations will pivot to pursuing Domination even though Survival is its "preferred" path.

### 5.3 Simultaneous Victory Resolution

If two factions simultaneously meet different victory conditions in the same evaluation tick (extremely unlikely but possible), the following tiebreaker applies:

1. Story Victory takes priority (it is the "true ending")
2. Integration Victory takes second priority (most difficult AI-accessible victory)
3. Technology Victory takes third priority (requires deepest investment)
4. Colonial Victory takes fourth priority (rewards patron compliance)
5. Remaining conditions are broken by total cube economy (highest wins)

---

## 6. Config Specification

### 6.1 Updated config/victory.json

```jsonc
{
  "conditions": {
    "colonial": {
      "name": "Patron Fulfillment",
      "description": "Complete all patron-assigned objectives while maintaining 80%+ patron satisfaction",
      "patronSatisfactionRequired": 80,
      "objectivesRequireAll": true,
      "availableDuringActs": [1, 2],
      "objectiveCategories": {
        "reclaimers": ["salvage", "research", "exploration", "repair"],
        "volt_collective": ["power", "conquest", "expansion", "combat"],
        "signal_choir": ["signals", "interception", "recording", "mapping"],
        "iron_creed": ["fortification", "endurance", "structural", "defense"]
      }
    },
    "domination": {
      "name": "Planetary Conquest",
      "description": "Control 75% of all outpost locations for 5 consecutive minutes",
      "outpostControlPercent": 0.75,
      "holdDurationSeconds": 300,
      "contestedCountsAsHalf": true,
      "requiresPoweredOutpost": true,
      "outpostLocations": {
        "small": 16,
        "medium": 24,
        "large": 36,
        "huge": 48
      }
    },
    "economic": {
      "name": "Cube Hegemony",
      "description": "Accumulate 500 cubes of 4+ material types in your territory for 5 minutes",
      "totalCubesRequired": 500,
      "materialDiversityRequired": 4,
      "holdDurationSeconds": 300,
      "wallCubesCount": false,
      "beltCubesCount": true,
      "mustBeInTerritory": true
    },
    "technology": {
      "name": "The Convergence Device",
      "description": "Research a Tier 5 technology and construct the Convergence Device",
      "requiredTechTier": 5,
      "deviceCubesRequired": 100,
      "deviceMinMaterialTypes": 4,
      "deviceMinPerType": 20,
      "deviceBuildTimeSeconds": 180,
      "deviceRequiresCoreAccessPoint": true
    },
    "diplomatic": {
      "name": "The Signal Accord",
      "description": "All surviving civilizations are allied or vassalized",
      "allSurvivingMustBeAlliedOrVassal": true,
      "minimumSurvivingCivs": 1,
      "allianceOpinionThreshold": 60,
      "allianceHoldDurationSeconds": 300,
      "vassalizationEconomyThreshold": 0.3
    },
    "integration": {
      "name": "Alien Integration",
      "description": "Achieve +80 Residual relationship and complete the Resonance Protocol",
      "residualRelationshipRequired": 80,
      "resonanceCubesRequired": 50,
      "resonanceCubeTypesRequired": 5,
      "resonanceCubesPerType": 10,
      "resonanceDurationSeconds": 120
    },
    "survival": {
      "name": "Last Machine Standing",
      "description": "Be the last civilization with a powered outpost after the Convergence",
      "triggeredByConvergence": true,
      "requiresPoweredOutpost": true,
      "convergenceStartMinutes": 480,
      "earlyTriggerThresholds": {
        "fiftyPercent": 1800,
        "seventyFivePercent": 900,
        "ninetyPercent": 300
      },
      "convergencePhases": {
        "rising": { "durationSeconds": 300, "damagePerTick": 2, "lightningMultiplier": 3 },
        "storm": { "durationSeconds": 600, "damagePerTick": 5, "lightningMultiplier": 5 },
        "tempest": { "durationSeconds": 900, "damagePerTick": 10, "lightningMultiplier": 10 },
        "convergence": { "durationSeconds": -1, "damagePerTick": 25, "lightningMultiplier": 20 }
      }
    },
    "story": {
      "name": "The Architects' Message",
      "description": "Discover all Core Access Points and read the message in the planet's substrate",
      "coreAccessPointsRequired": 3,
      "residualRelationshipRequired": 50,
      "requiresKelpDialogue": true,
      "cubeOfferingRequired": 6,
      "cubeOfferingOneCubePerType": true,
      "activationDurationSeconds": 120,
      "playerOnly": true
    }
  },
  "progressPanel": {
    "updateIntervalSeconds": 10,
    "alertThresholds": [0.25, 0.5, 0.75, 0.9],
    "threatAssessmentIntervalSeconds": 30,
    "threatHostilityIncrease": {
      "approaching": 20,
      "imminent": 50
    }
  },
  "stormProgression": {
    "phases": [
      { "name": "Calm", "startMinute": 0, "intensityMultiplier": 0.2 },
      { "name": "Rising", "startMinute": 60, "intensityMultiplier": 0.5 },
      { "name": "Storm", "startMinute": 180, "intensityMultiplier": 1.0 },
      { "name": "Tempest", "startMinute": 360, "intensityMultiplier": 2.0 },
      { "name": "Convergence", "startMinute": 480, "intensityMultiplier": 5.0 }
    ]
  },
  "gracePeriodSeconds": 300,
  "victoryAnnouncementDelaySeconds": 10,
  "simultaneousVictoryPriority": ["story", "integration", "technology", "colonial", "diplomatic", "economic", "domination", "survival"]
}
```

---

## 7. Cross-Reference with Existing Systems

| This GDD Section | Related System | Integration Notes |
|-------------------|---------------|-------------------|
| 2.1 Colonial | patronSystem.ts, patronObjectives.ts | New: tracks patron satisfaction + objective completion per faction |
| 2.2 Domination | territory.ts, territoryControl.ts | Reads territory percentage from existing system |
| 2.3 Economic | cubePileTracker.ts, resources.ts | Reads physical cube counts; needs territory filter |
| 2.4 Technology | techTree.ts, techResearch.ts | Reads tech tier; needs Convergence Device entity |
| 2.5 Diplomatic | diplomacySystem.ts | Needs alliance/vassalization state tracking |
| 2.6 Integration | New: residualSystem.ts | Needs Residual entity types and relationship tracker |
| 2.7 Survival | weatherSystem.ts, power.ts | Needs storm phase progression implementation |
| 2.8 Story | questSystem.ts | Needs Core Access Point entity and narrative triggers |
| 3 Progress Panel | gameOverDetection.ts | Replaces current quest-only victory checking |
| 4 Convergence | weatherSystem.ts | Needs phase escalation with damage mechanics |

---

## 8. Implementation Priority

### Phase 1: Victory Tracking (Critical)
1. Build `victoryTracker.ts` -- evaluates all 7 conditions per faction per tick
2. Update `gameOverDetection.ts` to use victory tracker instead of quest-only checks
3. Build Victory Progress Panel data source
4. Add alert notifications for threshold crossings

### Phase 2: Storm Convergence (Critical for Pacing)
5. Implement 5-phase storm progression in `weatherSystem.ts`
6. Add damage-to-unprotected mechanics
7. Add early Convergence trigger based on victory progress
8. Add Convergence visual/audio escalation

### Phase 3: Victory-Specific Mechanics (High)
9. Colonial Victory: patron objective tracking + satisfaction system
10. Convergence Device entity and construction mechanic
11. Alliance and vassalization state in diplomacy system
12. Residual entity types (Sentinel, Crawler, Colossus)
13. Residual relationship tracker
14. Core Access Point entity type
15. Story Victory activation sequence

### Phase 4: AI Victory Pursuit (High)
16. Victory evaluators for AI governors (one per condition, including Colonial)
17. Threat assessment function (stop-the-leader behavior)
18. AI counter-strategy selection per victory type
19. Faction-specific victory preferences in governor profiles

### Phase 5: Narrative Payoffs (Medium)
20. Ending text/sequences for all 8 victories x 5 factions
21. SABLE dialogue for victory events
22. Post-victory screen with statistics, faction history, and 3-act progression scoring

---

## 9. Success Criteria

- [ ] All 8 victory conditions are implemented and testable
- [ ] Colonial Victory tracks patron objectives and satisfaction per faction
- [ ] Victory Progress Panel displays all conditions for all factions, with current act indicator
- [ ] AI governors pursue victory conditions based on faction preferences (Colonial as universal secondary)
- [ ] AI governors detect and counter rival victory progress (stop-the-leader)
- [ ] Storm Convergence follows 5-phase progression
- [ ] Convergence forces endgame resolution within 60 minutes of activation
- [ ] Early Convergence triggers correctly based on victory progress thresholds
- [ ] Every victory condition has at least one viable counter-strategy
- [ ] Economic Victory requires physical cubes in territory (not abstract counters)
- [ ] Domination Victory requires sustained control (5-minute hold)
- [ ] Story Victory is player-only and requires narrative progression
- [ ] Independence is NOT a victory condition -- patron dependency decreases as a gradient
- [ ] Simultaneous victory resolution follows priority order
- [ ] All victory endings have faction-specific narrative text reflecting 3-act relationship evolution
- [ ] config/victory.json contains all tunable parameters including colonial objectives
