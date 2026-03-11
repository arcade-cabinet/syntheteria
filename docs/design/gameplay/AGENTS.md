# Gameplay Design — Agent Guide

What the player DOES. Core loop, economy, combat, progression, win conditions.

## Documents

| Document | Scope | Key Topics |
|----------|-------|------------|
| `OVERVIEW.md` | Game concept, vision, colonization model, 4X pillars, design philosophy | What is Syntheteria? Why first-person? The colonization tension. |
| `MECHANICS.md` | Core loop — grind → compress → carry → furnace → build | Harvesting, compression, grabbing, belt transport, power grid, processing, fabrication. |
| `MATERIALS.md` | 9 material types, extraction rates, furnace recipes, economy balance | Ore deposits, cube properties, wealth brackets, config references. |
| `COMBAT.md` | FPS combat, bot armies, hacking, raids, defense, turrets | Damage model, component damage, hack mechanics, raid targeting, wall building. |
| `PROGRESSION.md` | Tech tree (5 tiers), unlock paths, difficulty curve, research mechanics | Tier breakdown, research costs, unlock dependencies, pacing. |
| `VICTORY.md` | 8 victory conditions, 3-act pacing, storm progression, counter-play | Colonial, Domination, Economic, Technology, Diplomatic, Integration, Survival, Story. |

## Config Files

These JSON files control gameplay balance — docs reference them but don't duplicate values:

| Config | Controls |
|--------|----------|
| `config/mining.json` | Ore extraction rates, deposit sizes |
| `config/furnace.json` | Furnace recipes, processing times |
| `config/cubeMaterials.json` | Cube material properties (name, value, color) |
| `config/buildings.json` | Building types, power requirements, costs |
| `config/combat.json` | Damage, ranges, cooldowns, raid thresholds |
| `config/technology.json` | Tech tree tiers, research costs, unlock gates |
| `config/economy.json` | Wealth brackets, trade rates |
| `config/quests.json` | Quest progression, otter dialogue |
