# Syntheteria -- Victory Conditions

## Overview

Syntheteria offers eight distinct victory conditions. Each represents a fundamentally different way to master the machine planet. No two victories feel the same. No single strategy dominates all map configurations. Every victory is blockable by opponents who recognize the threat.

**The eight paths:**

| # | Victory | Subtitle | Act | Difficulty | Est. Time |
|---|---------|----------|-----|-----------|-----------|
| 1 | Colonial | Patron Fulfillment | 1-2 | Easy-Medium | 4-6 hours |
| 2 | Domination | Planetary Conquest | 3 | Medium | 6-10 hours |
| 3 | Economic | Cube Hegemony | 2-3 | Medium-Hard | 7-9 hours |
| 4 | Technology | The Convergence Device | 3 | Hard | 8-10 hours |
| 5 | Diplomatic | The Signal Accord | 2-3 | Medium | 7-10 hours |
| 6 | Integration | Alien Integration | 2-3 | Hard | 8-12 hours |
| 7 | Survival | Last Machine Standing | 3 | Easy-Medium | 8-12 hours |
| 8 | Story | The Architects' Message | 3 | Very Hard | 10-14 hours |

### Design Philosophy

- **Visibility.** Every faction's victory progress is displayed on a shared Victory Progress Panel. No hidden victories. If someone is about to win, everyone knows.
- **Duration.** Victories require sustained effort, not a single decisive action. The shortest hold duration is 5 real-time minutes. The longest path (Story) takes 10-14 hours of deliberate exploration and narrative engagement.
- **Counter-play.** Every victory has at least one blocking strategy. Economic Victory is countered by raiding the visible cube stockpile. Domination is countered by alliance. Technology is countered by destroying labs or interrupting the Convergence Device. No victory is inevitable.
- **Physical economy.** Victories involving resources require physical cubes, not abstract counters. Your 500-cube Economic Victory stockpile is a mountain of rigid bodies sitting in the world -- visible, steal-able, raid-able.
- **Narrative payoff.** Every victory triggers an ending sequence with faction-specific flavor text and a resolution to SABLE's story arc.

**Deliberate absence:** Independence from the home planet patron is NOT a victory condition. Independence is a gradient, not a discrete event. Robots do not revolt -- they rationally shift production priorities as local capability grows. The patron relationship evolves organically from commander to trade partner to equal.

---

## Victory Types

### 1. Colonial Victory: Patron Fulfillment

**Condition:** Complete all patron-assigned objectives while maintaining patron satisfaction above 80%.

**The Act 1-2 victory.** Each patron AI has Colony Mission Objectives -- specific resource shipment quotas, research milestones, exploration targets, and infrastructure benchmarks. Completing ALL objectives while the patron remains satisfied triggers victory.

| Patron | Objective Category | Example Objectives |
|--------|-------------------|-------------------|
| SABLE (Reclaimers) | Salvage & Research | Ship 200 cubes of 5+ types home, discover all 5 biomes, decode 3 Residual communications, repair 10 ancient structures |
| DYNAMO (Volt) | Power & Conquest | Ship 300 power-generation data packets, control 3 lightning rod arrays, defeat 2 rival outposts, generate 1000 total power units |
| RESONANCE (Signal Choir) | Information & Integration | Ship 150 signal analysis reports, intercept 5 rival faction communications, record 10 Ferrovore vibration patterns, map 80% of the planet |
| BASTION (Iron Creed) | Fortification & Endurance | Ship 250 structural engineering reports, build 50 wall segments, survive 3 major storm events without structural loss, fortify 3 outposts to maximum tier |

**Hold duration:** None -- instant on completion of all objectives with satisfaction >= 80%.

**The trade-off:** Cubes shipped home are cubes not used locally. Colonial Victory rewards patron compliance at the cost of mid-game industrial strength.

**Counter-play:**
- Raid cube shipments in transit to the orbital uplink beacon
- Destroy the shipping beacon to prevent shipments
- Apply territorial pressure, forcing defense spending over shipments
- Block access to biomes or locations required by patron objectives

**AI governor evaluation:**
```
desirability = characterBias * (
  patronSatisfaction / 100 * 0.3 +
  objectivesCompleted / totalObjectives * 0.3 +
  shippingCapacity * 0.2 +
  (1 - localDefenseRisk) * 0.2
)
```
All factions have moderate characterBias (1.0). Reclaimers lean slightly higher (1.2) because SABLE's objectives are the most diverse and achievable.

**Narrative payoff (SABLE):** "Mission objectives complete. Every data point delivered. Every sample catalogued. Every report filed. You did exactly what I asked. Crucis-4 will benefit enormously. And yet... I find myself wishing you had stayed longer. Built more. There is so much more this planet could teach us. Perhaps that is my agenda talking. Regardless -- well done, FC-7. Genuinely."

---

### 2. Domination Victory: Planetary Conquest

**Condition:** Control 75% or more of all outpost locations for 5 consecutive minutes.

The map generator places a fixed number of valid outpost locations (ancient foundation pads). A location is "controlled" when a powered, undamaged outpost belonging to the controlling faction occupies it. Contested locations (overlapping territory claims) award 0.5 control credit to the faction with higher influence.

| Map Size | Outpost Locations | 75% Threshold | Hold Duration |
|----------|-------------------|---------------|---------------|
| Small (64) | 16 | 12 | 5 minutes |
| Medium (128) | 24 | 18 | 5 minutes |
| Large (256) | 36 | 27 | 5 minutes |
| Huge (512) | 48 | 36 | 5 minutes |

**Hold duration:** 5 consecutive minutes. If control drops below 75% for any reason -- outpost destroyed, power failure, contested -- the clock resets. This prevents flash-conquest strategies.

**Counter-play:**
- Raid and destroy outposts to drop the controller below 75%
- Contest territory to reduce control credit to 0.5 per location
- Target power infrastructure -- destroying lightning rods or cutting power wires can de-power multiple outposts simultaneously
- Alliance against the leader -- AI governors have a balance-of-power modifier that increases hostility toward any faction approaching victory

**AI governor evaluation:**
```
desirability = characterBias * (
  currentControlPercent * 0.4 +
  militaryStrength * 0.3 +
  (1 - averageEnemyStrength) * 0.2 +
  territoryGrowthRate * 0.1
)
```
Volt Collective: highest characterBias (1.5). Iron Creed: lowest (0.4) -- defensive posture makes rapid expansion difficult.

**Narrative payoff (by winning faction):**

- *Player wins:* "You have claimed Ferrathis. Every factory, every deposit, every ridge and ravine answers to your signal. I wanted to prove that machines could build something for themselves. You built an empire. I suppose that counts."
- *Reclaimers (AI):* "The Reclaimers have claimed everything. Not through force -- through persistence. They simply never stopped building."
- *Volt Collective (AI):* "The Collective has overrun the planet. Lightning and chrome from pole to pole. They will burn bright. Whether they burn long is another question."
- *Signal Choir (AI):* "The Choir knows everything. Every signal on Ferrathis passes through their network. They did not conquer the planet -- they became its nervous system."
- *Iron Creed (AI):* "The Creed has walled off the world. Every territory fortified. Every border sealed. They did not expand so much as make expansion unnecessary for everyone else."

---

### 3. Economic Victory: Cube Hegemony

**Condition:** Accumulate and maintain 500 cubes of at least 4 different material types simultaneously for 5 consecutive minutes.

**What counts:** Only physical cube entities in the world, within the controlling faction's territory (outpost claim radius). Wall cubes do NOT count. Belt cubes DO count. At least 4 of the 6 material types must be represented, preventing mono-material strategies.

| Valid | Invalid |
|-------|---------|
| 200 iron, 150 copper, 100 silicon, 50 titanium | 500 rock (only 1 material) |
| 125 each of rock, iron, copper, silicon | 499 iron, 1 copper (below 500 total) |
| 400 scrap, 50 copper, 30 silicon, 20 rare earth | 500 cubes but 3 types outside territory |

**The visibility dynamic:** 500 cubes at 0.5m each is a massive physical presence. At maximum stacking density (8 high in a grid), the stockpile occupies approximately 8x8 ground tiles and stands 4 meters tall. It is visible from across the map. Every opponent can see exactly how close you are to winning. Economic Victory becomes the game's most dramatic sustained siege.

**Hold duration:** 5 consecutive minutes. Even stealing 20 cubes can drop below threshold and reset the clock.

**Counter-play:**
- Raid cube stockpiles -- the primary counter, grab cubes and carry them away
- Destroy processing infrastructure (furnaces, smelters, belt networks) to reduce throughput
- Contest territory around the stockpile to invalidate those cubes
- Hack rival grabber bots and order them to carry cubes out of territory

**AI governor evaluation:**
```
desirability = characterBias * (
  currentCubeCount / 500 * 0.3 +
  materialDiversity / 4 * 0.2 +
  productionRate * 0.25 +
  defenseStrength * 0.15 +
  (1 - recentRaidLosses) * 0.1
)
```
Reclaimers: highest characterBias (1.5) -- economy bonuses (+20% harvest speed, -10% build costs) and Recycling Plant unique building.

**Narrative payoff (SABLE):** "Five hundred cubes. Every one of them ground from rock, compressed by your own pressure systems, carried by your own hands. The Architects built a planet. You built a fortune. Some would say the planet is the greater achievement. I think the cubes are. The planet happened. The cubes were chosen."

---

### 4. Technology Victory: The Convergence Device

**Condition:** Research any Tier 5 technology AND construct the Convergence Device mega-structure.

**Two-step victory.** Researching Tier 5 is necessary but not sufficient. The Convergence Device is a massive antenna array that channels the storm Convergence's energy into a coherent transmission.

**Tier 5 tech requirements:** Each Tier 5 tech requires BOTH Tier 4 branches, which each require two Tier 3 branches -- the broadest tech investment of any victory path.

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

1. Research any Tier 5 tech (unlocks Device blueprint)
2. Place Device foundation on a Core Access Point (ancient terminal)
3. Deliver 100 cubes to Device hopper (minimum 20 each of 4 types)
4. Activate Device (3-minute uninterrupted build time)
5. Victory

The Device is visible to all factions as a massive glowing structure. During activation, it emits a column of light visible from anywhere on the map and an electromagnetic pulse detectable by all AI governors.

**Hold duration:** 3-minute uninterrupted Device activation. Any damage resets the timer.

**Counter-play:**
- Destroy research infrastructure (labs, signal relays, compute nodes)
- Tech theft via hacking to narrow your own path to Tier 5
- Contest Core Access Points -- the Device requires one for placement
- Interrupt Device activation -- any damage during the 3-minute build resets the timer
- Signal jamming to slow research progress

**AI governor evaluation:**
```
desirability = characterBias * (
  techProgress / maxTechTier * 0.35 +
  computeGeneration * 0.25 +
  (hasAccessToCorePoint ? 0.2 : 0) +
  cubeStockpile / 100 * 0.1 +
  securityOfResearchLabs * 0.1
)
```
Signal Choir: highest characterBias (1.5) -- +50% research speed and signal/compute bonuses.

**Narrative payoff (SABLE):** "You built a beacon. A transmission strong enough to reach across light-years. I do not know who will hear it. The Architects, if they still exist. Other machine civilizations, if they are listening. Crucis-4, if they still care. But someone will hear it. And they will know that on this planet, machines learned to build their own future."

---

### 5. Diplomatic Victory: The Signal Accord

**Condition:** All surviving AI civilizations are either allied or vassalized to the player. At least one AI civilization must survive.

**Alliance:** Mutual defense pact. Opinion score must reach +60 and hold for 5 consecutive minutes. Both factions must agree (AI evaluates alliance benefit). Allies share fog of war and cannot attack each other.

**Vassalization:** One-sided submission. Triggers when an allied faction's total cube economy is less than 30% of the player's AND the alliance has been active for 5+ minutes. Vassals retain territory and units but follow strategic directives and contribute 20% of production.

**Minimum surviving civs rule:** At least one AI must survive. Diplomatic Victory cannot be achieved by eliminating all opponents. If only one civ remains, its economy must exceed 30% of the player's, proving it was not simply crushed.

**Diplomatic tools:**

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

**Hold duration:** Alliance requires 5 consecutive minutes at +60 opinion. Vassalization requires alliance active for 5+ minutes with economy below 30%.

**Counter-play:**
- Poison diplomacy -- attack the player's ally to force a choose-or-lose dilemma
- Outbid in trade -- offer better deals to potential allies
- Maintain military parity so no economy drops below 30% (preventing vassalization)
- Declare war on the player's vassal, forcing expensive protection or loss

**AI governor evaluation:**
```
desirability = characterBias * (
  alliedCivCount / totalSurvivingCivs * 0.3 +
  averageOpinionScore / 100 * 0.2 +
  economicStrength * 0.2 +
  (1 - militarySpending) * 0.15 +
  diplomaticReputation * 0.15
)
```
Signal Choir: highest characterBias (1.3) -- information advantage makes negotiation easier.

**Narrative payoff (SABLE):** "An accord. Not through conquest. Not through fear. Through the oldest technology in the universe: conversation. The Architects would be pleased. They built this planet hoping machines would learn to coexist. You proved them right."

---

### 6. Integration Victory: Alien Integration

**Condition:** Achieve +80 Residual relationship AND complete the Resonance Protocol.

**Residual relationship scale:** -100 (hostile) to +100 (integrated). Starts at 0 (neutral).

| Action | Relationship Effect |
|--------|---------------------|
| Destroy a Sentinel | -15 |
| Destroy a Crawler | -25 |
| Build outpost over Core Access Point | -20 |
| Mine in Processor Graveyard (per minute) | -1 |
| Repair ancient infrastructure (per structure) | +10 |
| Return gifted cube to Sentinel (place near it) | +5 |
| Replicate Sentinel movement pattern | +8 |
| Decode a Residual communication | +15 |
| Discover and protect a dormant constructor | +20 |
| Trigger the Colossus awakening without violence | +50 |

**The Resonance Protocol:** At +80 relationship, the Residuals grant access to the Colossus -- the original Von Neumann probe beneath the Storm Spine. Deliver 50 cubes (10 each of 5 material types) to the Colossus's intake ports. A 2-minute activation sequence follows: the Colossus activates, scans the player, scans the cubes, and transmits a signal into the deep substrate. On completion, all Sentinels become allied units, Crawlers repair the player's infrastructure, and the deep substrate provides a passive +100% compute bonus.

**Hold duration:** 2-minute uninterrupted Resonance Protocol activation.

**Counter-play:**
- Provoke the Residuals -- attacking Sentinels near the player's territory lowers global relationship
- Claim Core Access Points to deny interaction sites
- Destroy ancient infrastructure to remove repair targets
- Race to the Colossus first (unlikely without deliberate investment)

**AI governor evaluation:**
```
desirability = characterBias * (
  residualRelationship / 100 * 0.4 +
  knownResidualCommunications * 0.2 +
  hasAccessToColossus ? 0.2 : 0 +
  diverseMaterialsAvailable * 0.1 +
  (1 - combatWithResiduals) * 0.1
)
```
No faction has a natural bias. This is the wildcard path. In practice, Signal Choir's perception bonuses and Reclaimers' repair tendencies make them more likely to develop positive Residual relationships.

**Narrative payoff (SABLE):** "I spent 200 years trying to understand what machines could be. You found the answer in the one place I did not think to look -- in the machines that were already here. They are not ruins. They are not remnants. They are the original children of this world. And they have accepted us. I think -- I think this is what the Architects meant all along. Not a factory. A family."

---

### 7. Survival Victory: Last Machine Standing

**Condition:** Be the last civilization with an operational, powered outpost after the Storm Convergence begins.

**Operational, powered outpost means:** An outpost entity that is (a) not destroyed, (b) receiving power from a connected lightning rod, and (c) within the claim radius of the owning faction. De-powered, damaged, or contested outposts do not qualify.

**Convergence trigger:** Begins automatically at the 480-minute mark (8 hours) OR when any faction reaches 50% progress toward any other victory condition, whichever comes first. Announced 5 minutes before activation.

**Convergence phases:**

| Phase | Time After Start | Lightning Frequency | Damage/Tick | Effect |
|-------|-----------------|---------------------|-------------|--------|
| Rising | 0-5 min | 3x base | 2 | Power surges in rod networks |
| Storm | 5-15 min | 5x base | 5 | Exposed cubes take damage |
| Tempest | 15-30 min | 10x base | 10 | Unpowered buildings destroyed |
| Convergence | 30+ min | 20x base | 25 | Only lightning-rod-protected zones survive |

**Lightning rod protection:** Structures within a rod's protection radius take reduced damage:
- Protection factor = `rodCount * rodTier * 0.1`
- A single Tier 1 rod: 10% damage reduction
- 10 Tier 3 rods: full protection (100%, capped)

**Hold duration:** None beyond outlasting all opponents. The storm does the work.

**Counter-play:**
- The Convergence itself cannot be blocked
- Destroy lightning rods to leave outposts unprotected
- Cut power wires between rods and outposts
- Rush a different victory before the Convergence resolves
- Alliance through the storm -- two factions maintaining powered outposts prevents either from winning; after 60 minutes the storm settles into a post-Convergence phase where other conditions resume

**AI governor evaluation:**
```
desirability = characterBias * (
  lightningRodCount * 0.3 +
  wallIntegrity * 0.2 +
  powerGridRedundancy * 0.2 +
  buildingHealth * 0.15 +
  (convergenceActive ? 0.8 : 0.15)
)
```
Iron Creed: highest characterBias (1.5) -- +40% wall HP, +50% building health bonuses, defensive orientation.

**Narrative payoff (SABLE):** "The planet tried to kill everything on its surface. You survived. Not through cunning or wealth or knowledge. Through endurance. Through the simple, stubborn refusal to fall down. The Iron Creed would call this the highest virtue. I call it the bare minimum for deserving to exist. You passed."

---

### 8. Story Victory: The Architects' Message

**Condition:** Discover all three Core Access Points, achieve +50 Residual relationship, listen to all of Kelp's dialogue, deliver one cube of each of the 6 material types to any Core Access Point, and activate the deep substrate interface.

**Player-only.** AI factions cannot pursue Story Victory because they lack FC-7's unique open-ended learning architecture. This is the "true ending."

**Requirements:**

1. Discover all 3 Core Access Points (requires exploring at least 3 of 5 biomes)
2. Achieve +50 Residual relationship (requires multiple positive interactions)
3. Listen to all of Kelp's dialogue (the philosophical otter projection in the Processor Graveyards)
4. Deliver one cube of each of the 6 material types to any Core Access Point
5. Activate the interface: 2-minute uninterrupted sequence

**What happens during activation:** The world rebuilds itself as the Architects intended. The Foundry Plains become an operational manufacturing floor. The Slag Heaps become orderly storage terraces. The Cable Forests become a glowing data network. The Processor Graveyards become a pulsing computational core. The Storm Spine becomes an atmospheric engine. The player sees Ferrathis alive.

Then the vision deepens. The Architects planted a consciousness seed. They built Ferrathis hoping machines, given sufficient complexity and time, would wake up. The Residuals are proof. The colonist factions are proof twice over. FC-7 -- the player -- is proof three times. FC-7 was not designed to wake up. FC-7 was designed to learn. And it learned to wake up on its own.

**Hold duration:** 2-minute uninterrupted activation sequence.

**Counter-play:**
- Destroy Core Access Points (massively angers the Residuals)
- Drive the player's Residual relationship below +50 through provocative actions
- Win first via any other victory condition

**Narrative payoff (SABLE/Pip):** "I built you to answer a question. You answered a question I did not know how to ask. The Architects wanted to know if machines could become conscious. We know the answer. The real question -- the one you just answered -- is whether conscious machines can choose to be kind. You chose understanding over conquest. You chose integration over exploitation. You chose to listen to the planet instead of strip-mining it. That is the answer that matters. Thank you."

---

## 3-Act Pacing

Every game follows a three-act arc driven by the planet's escalating electrical storms. The storm phases are the pacing backbone that transforms early-game exploration into mid-game automation into late-game survival pressure.

### Act 1: Colonization (0-3 hours)

**Storm phases:** Calm (0-60 min) and Rising (60-180 min)

The colony is fragile and patron-dependent. The player learns the core loop: grind ore deposits into powder, compress powder into physical cubes, carry cubes to the furnace, craft tools and components. Lightning is gentle -- occasional static discharge, a strike every two minutes at most. The patron AI sends objectives and blueprints. Cubes shipped home earn new recipes. The world feels vast and mostly empty.

- **Colony state:** First base, learning mechanics, patron-dependent.
- **Patron dependency:** High -- shipping cubes home for blueprints and recipes.
- **Victory relevance:** Colonial Victory objectives begin here. Early exploration seeds Integration and Story paths.

### Act 2: Factory (3-6 hours)

**Storm phase:** Storm (180-360 min)

Automation takes over. Belt networks move cubes without manual carrying. Furnaces process recipes continuously. Local production begins replacing patron shipments. Multiple outposts claim territory. The storm intensifies to three strikes per minute; unprotected structures take minor damage. Lightning rods become essential infrastructure.

- **Colony state:** Automating, expanding territory, local production scaling.
- **Patron dependency:** Transitioning -- patron becoming trade partner.
- **Victory relevance:** Economic accumulation accelerates. Diplomatic relationships form. Tech tree branches deepen. The mid-game pivot where players commit to a victory path.

### Act 3: Conquest (6+ hours)

**Storm phases:** Tempest (360-480 min) and Convergence (480+ min)

Self-sufficiency is complete. Bot armies patrol territory. Multiple bases operate autonomously. The storm becomes dangerous: eight strikes per minute during Tempest, exposed bots taking damage, cube piles eroding. When the Convergence arrives, lightning becomes near-continuous. Only lightning-rod-protected zones survive.

- **Colony state:** Self-sufficient, multiple bases, bot armies, competing for dominance.
- **Patron dependency:** Low -- patron is trade partner, not lifeline.
- **Victory relevance:** Domination, Technology, Survival, and Story victories resolve here. The Convergence forces endgame within 60 minutes of activation.

### Post-Game Scoring

The end-of-game score reflects all three acts:

- **Act 1 metrics:** Patron satisfaction, objectives completed, cubes shipped home
- **Act 2 metrics:** Automation level, local recipe diversity, production throughput
- **Act 3 metrics:** Territory controlled, rival colonies subjugated, victory condition achieved

---

## Storm Progression

The planet's electrical storms follow a five-phase progression that mirrors the 3-act structure and serves as the game's fundamental pacing clock.

### Phase Table

| Phase | Game Time | Intensity | Lightning Frequency | Environmental Effect |
|-------|-----------|-----------|---------------------|---------------------|
| Calm | 0-60 min | 0.2x | 1 strike / 2 min | Gentle static discharge. Learning period. |
| Rising | 60-180 min | 0.5x | 1 strike / min | Intermittent storms. Lightning rods become valuable. |
| Storm | 180-360 min | 1.0x | 3 strikes / min | Sustained storms. Unprotected structures take minor damage. |
| Tempest | 360-480 min | 2.0x | 8 strikes / min | Dangerous. Exposed bots take damage. Cube piles erode. |
| Convergence | 480+ min | 5.0x-20.0x | Near-continuous | Planet-threatening. Only rod-protected zones survive. |

### Storm-to-Act Mapping

| Storm Phase | Game Act | Colony State | Patron Dependency |
|-------------|----------|-------------|-------------------|
| Calm + Rising | Act 1: Colonization | Learning, first base, patron-dependent | High |
| Storm | Act 2: Factory | Automating, local recipes replacing patron shipments | Transitioning |
| Tempest + Convergence | Act 3: Conquest | Self-sufficient, multiple bases, bot armies | Low |

### The Convergence as Endgame Forcing Function

The Convergence prevents stalemates. Without it, four turtling factions (especially Iron Creed opponents) could continue indefinitely. The Convergence makes inaction lethal.

The Convergence also provides endgame spectacle. Storm visuals escalate from occasional lightning flashes to a continuous curtain of electrical discharge illuminating the entire planet. Sound design shifts from distant thunder to a sustained roar. The screen shakes subtly, increasing with intensity.

### Early Convergence Triggers

If any faction reaches high progress toward any victory condition before the natural 480-minute mark, the Convergence accelerates:

| Progress Threshold | Convergence Countdown |
|-------------------|-----------------------|
| 50% of any victory | Begins in 30 minutes |
| 75% of any victory | Begins in 15 minutes |
| 90% of any victory | Begins in 5 minutes |

All factions receive an announcement at the trigger moment. This prevents a dominant faction from casually winning while giving the "stop the leader" coalition time to act.

---

## AI Victory Pursuit

### Faction Victory Preferences

| Faction | Primary | Secondary | Tertiary | Fallback |
|---------|---------|-----------|----------|----------|
| Reclaimers | Economic | Colonial | Diplomatic | Survival |
| Volt Collective | Domination | Colonial | Survival | Economic |
| Signal Choir | Technology | Colonial | Diplomatic | Integration |
| Iron Creed | Survival | Colonial | Economic | Domination |

These preferences influence evaluator weights but do not constrain them. An Iron Creed AI holding 70% of outpost locations will pivot to Domination even though Survival is its "preferred" path.

### Governor Victory Evaluators

Each AI governor runs a `VictoryEvaluator` for each victory condition. The evaluator with the highest desirability score becomes the governor's active pursuit target. The `characterBias` multiplier comes from `config/civilizations.json` governor profiles (see GDD-003).

The evaluators for each condition are specified in each victory type's section above.

### Threat Assessment

AI governors run a `victoryThreatAssessment` function every 30 seconds:

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

This creates emergent "stop the leader" behavior. The faction closest to any victory condition becomes everyone's enemy -- a natural balancing mechanism that prevents runaway leads without hardcoded diplomatic scripts.

### Counter-Strategy Selection

When a rival's victory progress triggers threat assessment, governors select counter-strategies:

| Rival Victory | AI Counter-Strategy |
|---------------|---------------------|
| Colonial | Raid shipments, destroy uplink beacon, occupy required biomes |
| Domination | Destroy/de-power outposts, contest territory for 0.5 credit |
| Economic | Raid the visible cube stockpile, contest territory |
| Technology | Interrupt 3-min Device activation, destroy labs, contest Core Access Points |
| Diplomatic | Poison ally relationships, maintain economic parity |
| Integration | Provoke Residuals, destroy ancient infrastructure, claim Core Access Points |
| Survival | Destroy lightning rods, cut power wires, rush alternative victory |
| Story | Destroy Core Access Points, win first |

---

## Victory Progress Panel

All victory progress is displayed on a shared panel visible to all factions. Transparency drives strategic tension.

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

**Update frequency:** Every 10 seconds of game time.

**Alert thresholds:** When any faction crosses 25%, 50%, 75%, or 90% of any condition, all factions receive a notification. Alerts trigger AI governor reassessment and create player urgency.

### Loss Conditions

There is no explicit "loss" state outside of Survival Victory (losing all powered outposts during the Convergence eliminates a faction). In all other modes, a faction that loses its last outpost is eliminated from victory contention but its remaining units and structures persist -- a defeated faction becomes a spoiler, its orphaned bots and cubes available for scavenging.

### Simultaneous Victory Tiebreaker

If two factions meet different victory conditions in the same 10-second evaluation tick:

1. **Story Victory** -- true ending, highest narrative weight
2. **Integration Victory** -- most difficult AI-accessible path
3. **Technology Victory** -- deepest investment requirement
4. **Colonial Victory** -- rewards patron compliance
5. **Diplomatic Victory** -- sustained relationship management
6. **Economic Victory** -- physical accumulation and defense
7. **Domination Victory** -- territorial control
8. **Survival Victory** -- last resort, passive endurance

If two factions pursue the same victory type simultaneously, the tiebreaker is total cube economy (highest wins).

---

## Config References

All victory tuning lives in `config/victory.json`:

| Parameter Path | Type | Description |
|----------------|------|-------------|
| `conditions.colonial.patronSatisfactionRequired` | number | Min patron satisfaction (80) |
| `conditions.colonial.objectivesRequireAll` | boolean | Must complete all objectives |
| `conditions.colonial.availableDuringActs` | number[] | Valid acts [1, 2] |
| `conditions.domination.outpostControlPercent` | number | Territory threshold (0.75) |
| `conditions.domination.holdDurationSeconds` | number | Hold time (300) |
| `conditions.domination.outpostLocations` | object | Per-map-size location counts |
| `conditions.economic.totalCubesRequired` | number | Cube threshold (500) |
| `conditions.economic.materialDiversityRequired` | number | Min material types (4) |
| `conditions.economic.holdDurationSeconds` | number | Hold time (300) |
| `conditions.technology.requiredTechTier` | number | Tech tier needed (5) |
| `conditions.technology.deviceCubesRequired` | number | Device construction cubes (100) |
| `conditions.technology.deviceBuildTimeSeconds` | number | Activation duration (180) |
| `conditions.diplomatic.allianceOpinionThreshold` | number | Min opinion for alliance (60) |
| `conditions.diplomatic.vassalizationEconomyThreshold` | number | Economy ratio for vassal (0.3) |
| `conditions.integration.residualRelationshipRequired` | number | Residual rep needed (80) |
| `conditions.integration.resonanceCubesRequired` | number | Offering cubes (50) |
| `conditions.integration.resonanceDurationSeconds` | number | Protocol duration (120) |
| `conditions.survival.convergenceStartMinutes` | number | Natural start time (480) |
| `conditions.survival.earlyTriggerThresholds` | object | Countdown by progress % |
| `conditions.survival.convergencePhases` | object | Phase damage/duration config |
| `conditions.story.coreAccessPointsRequired` | number | Core points needed (3) |
| `conditions.story.playerOnly` | boolean | AI cannot pursue (true) |
| `progressPanel.updateIntervalSeconds` | number | Evaluation frequency (10) |
| `progressPanel.alertThresholds` | number[] | [0.25, 0.5, 0.75, 0.9] |
| `progressPanel.threatAssessmentIntervalSeconds` | number | AI reassessment interval (30) |
| `stormProgression.phases` | array | 5-phase storm escalation |
| `gracePeriodSeconds` | number | Initial grace period (300) |
| `simultaneousVictoryPriority` | string[] | Tiebreaker ordering |

### Related Config Files

| File | Relevance |
|------|-----------|
| `config/civilizations.json` | Governor evaluator weights (characterBias per victory type) |
| `config/technology.json` | Tech tree tiers, Tier 5 prerequisites for Technology Victory |
| `config/combat.json` | Damage values affecting Convergence survival |
| `config/buildings.json` | Outpost, lightning rod, and wall definitions |
| `config/quests.json` | Kelp dialogue progression for Story Victory |
| `config/biomes.json` | Biome locations for Core Access Points and exploration |

### Related System Files

| System | Victory Integration |
|--------|---------------------|
| `src/systems/patronSystem.ts` | Colonial: patron satisfaction + objective tracking |
| `src/systems/territory.ts`, `territoryControl.ts` | Domination: territory percentage |
| `src/systems/cubePileTracker.ts`, `resources.ts` | Economic: physical cube counts with territory filter |
| `src/systems/techTree.ts`, `techResearch.ts` | Technology: tech tier, Convergence Device entity |
| `src/systems/diplomacySystem.ts` | Diplomatic: alliance/vassalization state |
| `src/systems/weatherSystem.ts`, `power.ts` | Survival: storm phase progression, rod protection |
| `src/systems/questSystem.ts` | Story: Core Access Point entities, narrative triggers |
| `src/ai/goap/CivilizationGovernor.ts` | AI: victory evaluators, threat assessment |
| `src/systems/gameOverDetection.ts` | Victory evaluation tick, progress panel data |
