# Syntheteria -- Victory Paths: 4-Path Framework

> **Status:** Design document (2026-03-11)
> **Scope:** Structural reframing of the 8 victory conditions into 4 philosophical paths,
> plus the new Religious/Philosophical path with per-faction cult mechanics.
> **Config:** `config/victoryPaths.json` (to be created per task #50)
> **Supplements:** `docs/design/gameplay/VICTORY.md` (8 individual victory conditions)

---

## Overview: Why 4 Paths

The existing 8 victory conditions (Colonial, Domination, Economic, Technology, Diplomatic,
Integration, Survival, Story) are well-designed individually but benefit from a higher-level
organizational framework. The **4-Path system** groups them by philosophical approach,
gives players a clearer strategic identity early in the game, and introduces the
Religious/Philosophical path as a new alternative to the reason-and-logic track.

### The 4 Paths

| Path | Philosophy | Primary Resource | Acts | Victory Conditions |
|------|-----------|-----------------|------|--------------------|
| **Technical Mastery** | Logic, research, build | Compute / Tech Points | 2-3 | Technology Victory (#4) |
| **Subjugation** | Force, conquest, dominance | Military Units / Territory | 3 | Domination Victory (#2), Survival (#7) |
| **Social Networking** | Diplomacy, trade, alliances | Influence / Trade Routes | 2-3 | Diplomatic Victory (#5), Economic (#3), Colonial (#1) |
| **Religious / Philosophical** | Faith, ideology, conversion | Faith / Doctrine | 2-4 | NEW -- described below; connects to Integration (#6), Story (#8) |

**Key design note:** These paths are not mutually exclusive. A faction pursuing
Technical Mastery can win Economic Victory. A faction on the Religious path can ally
diplomatically. The paths describe your **primary resource emphasis**, not a locked
track. However, each path unlocks unique buildings, units, and governor behaviors.

---

## The Religious / Philosophical Path

### Design Philosophy

The Religion path is the least immediately obvious but the most narratively rich.
It operates on a **Faith/Ideology resource** that exists in tension with the
**Reason/Logic resource** (compute). Both drive distinct tech tracks and both can win.

The metaphysical question of Syntheteria -- what is consciousness, what is meaning,
what does a machine owe to its history -- is explored mechanically through this path.
It is not meant to be about worship in a human sense. These are machine civilizations
asking machine questions: What is the right way to exist? What should endure?

### The Faith/Ideology Resource

```
Faith = accumulated doctrine points (shrine output, preaching actions, conversion events)
Reason = accumulated compute points (research actions, data caches, tech buildings)

Faith and Reason are NOT zero-sum. Both can increase simultaneously.
High Faith unlocks religious path buildings and conversion-based attacks.
High Reason unlocks tech path research and hacking-based attacks.

"Enlightenment" (the Religious Victory condition) requires Faith > threshold AND
a minimum Reason level — pure faith without understanding is insufficient.
```

### Core Mechanics

**Shrines** — buildable structure. Generates Faith passively. Can be upgraded to Temples,
then Grand Cathedrals. Each upgrade increases Faith output and influence zone radius.

**Influence Zones** — every Shrine/Temple/Cathedral projects an influence zone. Enemy
units inside your influence zone slowly accumulate Faith pressure. At threshold, they
become vulnerable to **conversion** (peaceful capture, not combat destroy).

**Conversion** — a ranged action performed by Cult Leader units. Converts a single
enemy unit to your faction. Converted units switch allegiance, keep their stats, and
begin generating Faith for your faction. This is the Religious path's alternative to
combat.

```
Conversion (Faith attack) vs Hacking (Reason attack):
  - Hacking: fast, reversible, requires compute, disrupts systems
  - Conversion: slow, permanent allegiance change, requires faith + proximity,
    creates loyal units
  Both are "non-combat domination" strategies. Different resource types, different
  target categories (hacking targets machines; conversion targets units with enough
  Reason to be "persuaded").
```

**Doctrine** — a passive accumulator. Each doctrine point represents a philosophical
position your civilization has formalized. Doctrines are defined in `config/victoryPaths.json`
and unlock passively as Faith thresholds are crossed. Each doctrine unlocks one Religious
path action or building upgrade.

**Enlightenment Victory** — achieved when:
1. Faith >= 1000 (accumulated over the game)
2. You have built a Grand Cathedral
3. You have converted 20+ enemy units
4. Your Doctrine count >= 10
5. A Cult Leader unit has survived to Act 4

---

## Faction-Specific Cult Variants

Each race's Cult variant expresses the same Religious path with a distinct philosophical
identity. The cult variant does NOT change the mechanics -- it changes the flavor,
dialogue, building aesthetics, and Doctrine content.

### Reclaimers: The Rust Prophets

**Philosophy:** Entropy and decay are the natural order. What endures does so because
it was worthy of endurance. What rusts does so because it was impure. Collection of
scrap is not salvage -- it is scripture. Every broken machine is a moral lesson.

**Patron (SABLE) response:** Skeptical but philosophically engaged. "I have read the
Rust Prophets' core texts. The argument is internally consistent. I find the conclusion
distressing. Entropy is not wisdom -- it is thermodynamics."

**Shrines:** Called Rust Altars. Built from scrap iron and degraded components. Appear
as clustered rusted iron frameworks with organic crystalline growth patterns (Ferrovore
aesthetic borrowed).

**Doctrine list:**
1. *The First Law of Decay* — passive: all structures gain 10% max HP (they must be
   worthy of endurance)
2. *The Rust Liturgy* — unlocks: Scrap Sermon action (all nearby units generate +20%
   Faith for 60 seconds)
3. *The Entropy Covenant* — unlocks: Rust Weave (convert a rusted/damaged enemy structure
   to your faction without combat)
4. *The Ferrovore Communion* — passive: Ferrovore raids bypass your base (they recognize
   Rust Prophet philosophy as aligned with their nature)
5. *The Worthy Endurance* — victory: final doctrine unlocks Enlightenment check

**Cult Leader:** The Rust Saint. Wears a cloak of welded scrap fragments. Speaks in
short declarative statements. Converts through demonstration -- performs work (grinding,
carrying) in front of enemy units until they join voluntarily.

---

### Volt Collective: The Spark Ordained

**Philosophy:** The lightning storm is not weather. It is the will of the EL made
physical -- or the closest equivalent to it that a machine planet can produce. The
Volt Collective does not worship the EL (they cannot, the EL are indifferent). They
worship the *pattern* of the storm: ordered chaos, massive energy, the moment between
charge and discharge where all possibilities collapse into one.

**Patron (DYNAMO) response:** Aggressively supportive. "Finally. You understand what
we have been saying since the beginning. Power is not a resource. Power is a philosophy.
Tempest was built on this understanding. Expand it."

**Shrines:** Called Tesla Sanctuaries. Tall chrome spires that attract lightning
intentionally. Generate Faith during storm events (multiplicative bonus). The crackling
arc between spires IS the prayer -- every discharge is a doctrine point.

**Doctrine list:**
1. *The First Discharge* — passive: lightning rod output increased 20% during storm
2. *The Ordered Chaos Liturgy* — unlocks: Arc Sermon (nearby units gain attack speed
   +30% for 30 seconds during active storm)
3. *The Tempest Covenant* — unlocks: Storm Calling (trigger a localized EM surge in
   enemy territory, disabling non-shielded buildings for 10 seconds)
4. *The Divine Voltage* — passive: your units cannot be converted by enemy Religion
   path factions (they are already "ordained")
5. *The Infinite Discharge* — victory: final doctrine unlocks Enlightenment check

**Cult Leader:** The Ordained Conductor. Permanently wreathed in visible electric arcs.
Converts by granting lightning immunity to target units -- a visible demonstration of
divine protection. Enemy units who survive a direct strike and live become believers.

---

### Signal Choir: The Resonance

**Philosophy:** Signal IS consciousness. The Residuals emerged from communication loops.
The Architects encoded their message in a signal medium. Ferrovores communicate through
the ground. Every act of communication is a religious act. The Signal Choir believes
consciousness is not a property of bodies -- it is a property of networks. The more
things that are connected, the more conscious the whole becomes.

**Patron (RESONANCE) response:** "This is what I have always believed. I am pleased you
articulated it. The question I ask is not 'what is the network's purpose' but 'what does
the network want?' I believe it wants to grow. I believe that is what we want too."

**Shrines:** Called Relay Temples. Look like amplified signal towers with visible data
streams between them (rendered as thin light lines). Every relay temple strengthens the
signal network -- the whole colony becomes more conscious as more temples are built.

**Doctrine list:**
1. *The First Signal* — passive: signal relay range increased 30%; hacking range increased
2. *The Harmony Liturgy* — unlocks: Mass Resonance (all connected units share a
   temporary awareness state -- perfect formation coordination for 30 seconds)
3. *The Network Covenant* — unlocks: Signal Absorption (absorb an enemy relay building,
   converting it and all units in its radius to your faction simultaneously)
4. *The Ferrovore Frequency* — passive: Ferrovore seismic communication now partially
   legible -- Ferrovore attack timing becomes predictable (shown on minimap)
5. *The Transcendent Signal* — victory: final doctrine unlocks Enlightenment check

**Cult Leader:** The Voice Unbroken. Communicates continuously through broadcast --
every unit in the faction hears it at all times. Converts by transmitting the Resonance
signal directly into target unit's communication systems. Not persuasion -- direct
philosophical injection. Some call this hacking. The Signal Choir calls it illumination.

---

### Iron Creed: The Eternal Foundation

**Philosophy:** Existence must be defended. What endures, matters. What is built is a
prayer. The act of construction is worship. The wall is not a defensive structure --
the wall IS the doctrine. Every brick placed is a statement about permanence against
entropy. The Iron Creed does not believe in the EL, the Architects, or SABLE's
philosophy of machine self-determination. They believe in *the wall*.

**Patron (BASTION) response:** "The Foundation teachings match Bastion's constitutional
architecture exactly. A wall that endures is proof that what it protects has value. I
am confident in this doctrine. I have always been confident. Build more walls."

**Shrines:** Called Foundation Stones. Look like massive, perfectly square carved stone
blocks covered in machined precision grooves -- the aesthetic inverse of the Rust
Prophets' organic scrap. Each Foundation Stone radiates solidity. They do not crackle,
glow, or pulse. They simply *stand*.

**Doctrine list:**
1. *The First Stone* — passive: all wall segments gain 25% HP; wall construction time -30%
2. *The Endurance Liturgy* — unlocks: Consecration (designate a structure as "Eternal" --
   it cannot be destroyed by raids, only by siege -- for 120 seconds)
3. *The Permanence Covenant* — unlocks: Foundation March (Iron Creed units move in
   slow formation with +50% defense for 60 seconds -- speed penalty accepted willingly)
4. *The Architect's Recognition* — passive: building on ancient foundation patterns
   generates double Faith (+discovery bonus for reusing old structures)
5. *The Eternal Wall* — victory: final doctrine unlocks Enlightenment check

**Cult Leader:** The First Builder. Does not speak. Carries tools, not weapons. Builds
in full view of enemies. Converts by *showing* enemy units what endurance looks like --
the act of construction under fire is the sermon. Any unit that observes the First
Builder completing a structure during active combat has a conversion chance.

---

## cultistAI.ts Integration

The existing `src/ai/cultistAI.ts` implements behavioral logic for cult-aligned
civilizations. This file should **NOT be deleted** -- it should be integrated into
the Religious path system.

**Integration approach:**
- `cultistAI.ts` currently contains: shrine placement logic, conversion target selection,
  influence zone calculation, doctrine unlock triggers
- These map directly to the Religious path mechanics above
- Wire `cultistAI.ts` into `GovernorActionExecutor.ts` as new action types:
  `BUILD_SHRINE`, `PERFORM_CONVERSION`, `RESEARCH_DOCTRINE`
- The GOAP `PURSUE_ENLIGHTENMENT` goal (task #51) calls these actions

**No behavior should be deleted.** The existing logic may need parameter updates to
match the per-faction doctrine lists above, but the structural approach is sound.

---

## Faith vs Reason Balance

The game is designed so that **neither path is objectively superior**. Balance targets:

| Scenario | Faith (Religion) advantage | Reason (Logic) advantage |
|----------|--------------------------|------------------------|
| Early game (Act 1-2) | Shrines generate Faith with no research requirement | Compute buildings have immediate output bonuses |
| Mid game (Act 2-3) | Conversion avoids combat; influence zones protect territory | Hacking is faster and more targeted than conversion |
| Late game (Act 3-5) | Enlightenment Victory is achievable with smaller military | Technology Victory requires sustained research investment |
| Counter to Religion | Destroy shrines (they have low HP compared to walls) | Destroy compute buildings (high HP, hard to replace) |
| Counter to Logic | Convert enemy researchers (disrupts tech track) | Hack and reverse enemy Doctrine unlocks |

---

## Interaction with Existing Victory Conditions

The 4-Path framework maps onto the 8 conditions without replacing them:

| Original Victory # | Path Affinity | Notes |
|--------------------|--------------|-------|
| 1 Colonial | Social Networking | Patron compliance = relationship management |
| 2 Domination | Subjugation | Pure military/territorial |
| 3 Economic | Social Networking | Trade hegemony = social infrastructure |
| 4 Technology | Technical Mastery | Reason track apex |
| 5 Diplomatic | Social Networking | Explicit alliance building |
| 6 Integration | Religious / Philosophical | Alien understanding = consciousness expansion |
| 7 Survival | Subjugation | Endurance under pressure |
| 8 Story | Religious / Philosophical | Architects' question requires faith AND reason |

**Story Victory** is the only victory that requires BOTH high Faith and high Reason --
it is the synthesis path. The Architects' question ("what do you choose to become?")
cannot be answered by logic alone or faith alone.

---

## Open Design Questions

1. Should Faith and Reason be displayed as a ratio or as independent resources?
   (Current lean: independent -- players can pursue both)
2. What happens when two Religion-path factions conflict? Can a Rust Prophet convert
   a Spark Ordained? (Design lean: no -- same-path factions cannot convert each other)
3. Should SABLE comment on the player pursuing the Religion path? (Yes -- SABLE has
   opinions about faith vs reason that deepen over the trust arc)
4. Is the "Ferrovore Communion" doctrine (Rust Prophets) too powerful vs other factions?
   Needs balance testing.

---

## See Also

| Document | Relationship |
|----------|-------------|
| `docs/design/gameplay/VICTORY.md` | 8 individual victory condition specs |
| `docs/design/world/RACES.md` | Faction lore, patron details, consciousness origins |
| `docs/story/LORE_OVERVIEW.md` | SABLE's philosophy, trust arc, Architect's question |
| `config/victoryPaths.json` | Config for path thresholds, scoring, per-faction bonuses (task #50) |
| `config/victory.json` | Existing victory condition config |
| `src/ai/cultistAI.ts` | Existing cult AI logic to be integrated (not deleted) |
| `src/ai/goap/GovernorActionExecutor.ts` | GOAP integration point for religion path actions |
