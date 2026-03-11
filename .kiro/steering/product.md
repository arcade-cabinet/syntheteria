# Syntheteria — Product Context

First-person 4X strategy game on a machine planet. You play as a broken robot who grinds ore veins into powder, compresses powder into physical cubes, carries cubes to a furnace, and crafts tools, bots, and buildings. Expand territory, defend cube stockpiles, and compete against 4 AI civilizations for planetary control.

## Core Loop

Grind ore → powder fills capacity → compress into physical cube → carry to furnace → select recipe → craft item → install/place/feed to next machine.

## Key Design Principles

- Resources are physical rigid-body cubes (0.5m Rapier bodies), not abstract counters. Wealth is visible and stealable.
- Contextual interaction: click any object → radial action menu. No equipped tool system.
- All game balance is externalized to JSON config files in `config/`. Balance changes never require code changes.
- 4 AI civilizations governed by Yuka GOAP: Reclaimers, Volt Collective, Signal Choir, Iron Creed.
- Industrial mechanical PBR art style: panels, bolts, chrome, rust. Not flat colored cubes.
- Design documents in `docs/design/` (GDDs) are the source of truth for design decisions.

## 4X Pillars

- Explore: Fog of war, terrain scanning, resource deposits
- Expand: Claim territory with outposts, extend power/signal networks
- Exploit: Grind → Compress → Carry → Process → Fabricate → Build
- Exterminate: FPS combat, bot armies, hacking enemy infrastructure, cube raiding
