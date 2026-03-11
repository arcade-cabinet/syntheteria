# Colonization Model — Core Design Pivot

> **Date:** 2026-03-10
> **Status:** Active — supersedes Civilization-style 4X framing

## The Insight

Syntheteria is **Colonization, not Civilization.** The player is a colonial agent
sent by a home-planet AI to exploit a machine planet. This single reframe
simplifies every system while making the game more thematically coherent.

## The Two Worlds

### Home Planet (the "Old World")
- The Overseer AI that dispatched the player on a colony mission
- Communicates via otter holographic projections (already built)
- Provides: starting equipment, blueprints, tech unlocks, reinforcement units
- Demands: specific cube materials shipped back ("We need 20 chrome cubes")
- Each robot race has its OWN home-planet patron with different priorities
- Think: European powers funding New World colonies for specific resources

### Machine Planet (the "New World")
- Where gameplay takes place — the colonial frontier
- Rich in ore deposits, dangerous terrain, alien natives
- Multiple robot race colonies competing for territory and resources
- The cubes you compress are the "goods" you ship home or use locally

### Alien Natives (indigenous population)
- Were here before robot colonists arrived
- Can be traded with, fought, or integrated
- Classic Colonization mechanic — not colonists, not competing for patron favor
- Their relationship with each race colony creates strategic depth

## Architecture: Event Bus Per Base

Robots don't think like humans with centralized strategic planning. They operate
on event-driven message passing. Each base is an autonomous node:

```
Home Planet Patron (strategic directives, infrequent)
  └── Base Event Bus (operational, per-settlement, continuous)
       ├── harvest_needed { material: "iron", priority: 0.8 }
       ├── transport_needed { from: deposit_3, to: furnace_1 }
       ├── build_queued { type: "wall", position: [x,y,z] }
       ├── defense_alert { threat: "scout", direction: "north" }
       ├── furnace_ready { recipe: "improved_drill", slots: 1 }
       └── Bot Brains (subscribe to relevant events, self-assign tasks)

World Event Bus = aggregates all base buses + home planet directives
```

### "Phone Home" Fallback
When a bot has no active task:
1. Query nearest Base's event bus for available work
2. Base ALWAYS has work (harvest, transport, patrol, build)
3. No bot ever idles — guaranteed task assignment

### Inter-Base Communication
Bases share demand signals over wire/signal network:
- Base A: "Need chrome cubes" → Base B (near chrome): assigns bots to harvest + transport
- Creates emergent supply chain behavior without centralized planning

## What This Simplifies

| Before (Civ model) | After (Colonization model) |
|--------------------|-----------------------------|
| Complex GOAP governor | Base event buses + reactive bots |
| Abstract diplomacy screen | Otter holograms = home planet trade interface |
| Faction-to-faction trade | Colony ↔ home planet shipments |
| Tech tree research | Blueprints earned via home planet requests |
| Victory = dominate map | Victory = fulfill patron mission / dominate / integrate / ascend |
| AI needs strategic genius | AI bases emit events, bots react naturally |

## Economy Loop

```
Grind ore → Compress cube → Choice:
  ├── Use locally (build walls, furnace recipes, weapons)
  └── Ship home (receive blueprints, tech, reinforcements)
```

The tension: do you invest cubes locally for immediate benefit, or ship them
home for long-term tech advantage? This IS the core strategic decision.

## Home Planet Patron Per Race

| Race | Patron Priority | Ships Home | Receives |
|------|----------------|------------|----------|
| Reclaimers | Salvage data | Scrap analysis | Recycling tech |
| Volt Collective | Energy research | Power readings | Weapon blueprints |
| Signal Choir | Signal data | Communication logs | Hacking tools |
| Iron Creed | Structural data | Engineering specs | Fortification plans |

## Victory Conditions (Revised)

1. **Colonial Victory**: Fulfill all home planet patron objectives
2. **Domination**: Control 75% of planet territory
3. **Economic**: Accumulate 500 cubes of 4+ material types
4. **Technology**: Research Tier 5 tech + build Convergence Device
5. **Diplomatic**: All surviving civs allied or vassalized
6. **Integration**: Successfully ally with alien natives (Residuals)
7. **Survival**: Last faction standing after Storm Convergence
8. **Story**: Discover Architects' message in deep substrate (player only)

**Note:** Independence is NOT a victory condition. It is a gradient -- patron dependency decreases organically as local production scales. See GDD-011 for full specs.

## Connection to Existing Code

- `otterTrade.ts` = the home planet trade interface (already exists!)
- `eventBus.ts` = the world event bus (already exists, 25 event types!)
- `OtterRenderer.tsx` = the patron's communication channel (already exists!)
- Base event bus = new system, but builds on existing eventBus infrastructure
- Bot "phone home" = extension of BotBrain's existing RETURN_TO_BASE state
