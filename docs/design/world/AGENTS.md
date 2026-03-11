# World Design — Agent Guide

Where the game takes place. The machine planet, its factions, its native inhabitants.

## Documents

| Document | Scope | Key Topics |
|----------|-------|------------|
| `ENVIRONMENT.md` | Weather, biomes, hazards, processing cycles, terrain | 5 weather states, 5 biome zones, storm progression, day/night-equivalent processing cycles. |
| `RACES.md` | 4 robot factions, lore, otter holograms, consciousness model | Reclaimers, Volt Collective, Signal Choir, Iron Creed. Home-planet patrons, visual identity, governor biases. |
| `ALIENS.md` | Native fauna and sentient Residuals, relationship system | Ferrovores (wildlife), Residuals (indigenous machines), trade/alliance/integration path. |

## Config Files

| Config | Controls |
|--------|----------|
| `config/biomes.json` | Biome zone definitions, terrain colors, deposit distribution |
| `config/terrain.json` | Heightfield generation, zone boundaries |
| `config/civilizations.json` | Race definitions, governor profiles, visual identity |

## Key Concepts

- **Machine planet** — no vegetation, no water. "Hills" are slag heaps, "rivers" are chemical runoff, "forests" are broken antenna masts.
- **Processing cycles** — the planet's equivalent of seasons. 5-phase cycle (Dormant → Active → Volatile → Convergent → Aftermath) over ~60 minutes.
- **Colonization framing** — player is a colonial agent from a home-planet AI. Factions are rival colonial powers, not civilizations that evolved here.
- **Residuals** — indigenous machines that were here before colonists arrived. Not enemies by default — can be traded with, allied, or fought.
