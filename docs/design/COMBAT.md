# Combat System

Combat is not a separate system — it emerges from component assembly. Any robot can become a combat unit by attaching weapons.

---

## Core Principle

**You're not becoming a better fighter. You're becoming a better manager of fighters.**

Combat scales through:
- **Compute** → More units coordinated effectively
- **Automation** → Units fight smarter without direct attention
- **Components** → Individual units hit harder, survive longer
- **Hacking** → Turn enemy machines to your side mid-battle

---

## Combat Progression

### Early Game (City)

**Situation:** A few repaired robots, minimal weapons, learning the systems.

- Direct control only
- Simple physical attacks (improvised melee from maintenance tools)
- Fights are rare — mostly avoiding threats
- First encounters are with lone wandering cultists outside the city

**Teaches:** Basic threat assessment, "is this fight worth it?"

### Mid Game (Expansion)

**Situation:** Multiple robots, venturing west/south, encountering enemies regularly.

- Can't micro every unit simultaneously
- Set engagement rules (attack, flee, protect, hold)
- Better weapons from fabrication and salvage
- Encounter cultist war parties and enslaved machines
- Begin hacking enemy drones
- Automation quality matters — poorly configured robots get destroyed

**Teaches:** Delegation, tactical thinking, cost-benefit of engagement.

### Late Game (War)

**Situation:** Large-scale operations, pushing north, cultists attacking the city.

- Squads with coordinated tactics
- Specialized roles (tank, striker, scout, support)
- Player sets strategy, automation executes
- Must defend the city while attacking cultist territory
- Combat becomes a resource equation: losses vs gains
- Some fights must be avoided — not enough time to rebuild

**Teaches:** Strategic sacrifice, triage, multi-front warfare.

---

## The Enemies

### Cultists of EL (Human)

The primary threat. Primitive humans with supernatural powers.

**Abilities:**
- **Call Lightning:** Can summon lightning strikes from the perpetual storm to hit your units. Devastating damage, requires line of sight.
- **Superhuman Strength:** Incredibly strong in melee — can tear apart lightly-armored machines
- **Resilience:** Far tougher than normal humans, empowered by EL's will

**Organization:**
- **Wanderers** (early): Lone cultists or pairs, low threat individually
- **War Parties** (mid): Groups of 5-15 led by a warrior figure
- **Assault Forces** (late): Large organized groups led by cult leaders with greater powers
- **The Cult Leader** (endgame): Resides in the northern village, most powerful human

**Key Rule:** Cultists **cannot** be hacked. They are human. Only machines can be taken over.

### Enslaved Machine Intelligences (Cultist-Controlled)

Machines that serve the cultists:
- Follow the same component rules as your machines
- Strength depends on their build — some are strong, others are weak
- **Can be hacked** if you meet the requirements (link + technique + compute)
- Designs can be copied for your own fabrication after capture
- Fight alongside cultist war parties

### Rogue AIs (Independent)

Machines not under cultist control but still hostile:

**Feral Units:**
- Territorial, reactive, predictable
- Simple attack patterns
- Don't coordinate with others
- Easy to bait, ambush, or avoid

**Regional Networks:**
- Coordinated within zones, patrol patterns
- Call for backup when threatened
- Tactical awareness (flanking, retreat)
- Harder to deal with — must commit or avoid

**Note:** Rogue AIs and enslaved machines use the same component system. The difference is behavioral — rogue AIs act independently while enslaved machines serve cultist commanders.

---

## Hacking in Combat

Hacking enemy machines is a core combat mechanic:

### Requirements

1. **Signal Link:** Must be within signal range and form a connection
2. **Technique:** Must have discovered/developed the appropriate hacking method for that machine type
3. **Compute:** Must have sufficient available compute to execute the hack

### Process

- Hacking takes time (seconds to minutes depending on target complexity)
- Your hacking unit is vulnerable during the process
- The target may resist or alert nearby enemies
- Success converts the enemy machine to your control instantly

### Tactical Uses

- **Mid-combat conversion:** Turn an enemy drone against its allies
- **Reinforcement:** Capture machines to bolster your forces before a push
- **Intelligence:** Captured machines may reveal enemy positions or designs
- **Denial:** Every machine you take is one fewer enemy

### Limitations

- **Humans are immune:** You can never hack a cultist
- **Compute cost:** Each captured machine adds to your compute demand
- **Technique gap:** Unknown machine types require research/reverse-engineering first
- **Signal range:** Must physically close with the target

---

## Lightning as a Weapon

Lightning is a key combat element on both sides:

### Cultist Lightning

- Cult warriors can call lightning strikes from the storm
- Devastating single-target damage
- Requires line of sight to target
- More powerful cult figures call stronger/more frequent strikes
- The cult leader presumably commands the most powerful lightning

### Environmental Lightning

- Outside the city, random lightning strikes are a constant hazard
- Lightning rods in the city provide protection
- Units in the open must account for lightning risk
- Storms may intensify during combat (more frequent random strikes)

### Player Lightning Defense

- Stay near lightning rods when possible
- Build lightning rod infrastructure outside the city as you expand
- Some component configurations may offer lightning resistance (TBD)

---

## Combat Resolution

### What Determines Outcomes

1. **Component stats** — Damage, durability, speed, range
2. **Numbers** — More units = more damage, but more compute needed
3. **Automation quality** — Well-configured robots outperform direct control at scale
4. **Positioning/terrain** — Ambushes, chokepoints, elevation
5. **Lightning** — Both cultist-summoned and environmental

### Real-Time with Pause

- Combat happens in real-time
- Player can directly control one unit at a time
- Other units follow automation rules
- Can pause to issue orders and adjust strategy
- Can let automation handle everything if well-configured

---

## Losses and Recovery

### When a Robot is Destroyed

- Components are damaged or destroyed
- Some may be recoverable from wreckage (salvage mission)
- High-value components worth recovering
- Time pressure may force abandonment

### City Attacks

- When cultists attack the city, your base infrastructure is at risk
- Losing key facilities (fabrication, power) can be devastating
- Defense planning is critical as the game progresses

### Recovery Options

- Salvage wreckage for components
- Capture enemy machines (if compute available)
- Repair damaged units in the field (support robots)
- Retreat and rebuild

---

## Open Questions

1. **Damage model:** Hit points? Component-specific damage? Degradation?
2. **Automation UI:** How does player configure engagement rules?
3. **Lightning mechanics:** How is lightning calling balanced? Cooldown? Cost?
4. **Friendly fire:** Can automation or lightning accidentally hit friendly units?
5. **Morale/routing:** Do enemies ever flee? At what point?
6. **Defense structures:** Can player build fixed defenses (turrets, walls) for the city?
