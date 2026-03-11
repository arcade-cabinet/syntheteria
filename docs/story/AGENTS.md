# Story & Lore -- Agent Guide

Narrative design, world-building, and lore.

## Documents

| Document | Scope |
|----------|-------|
| `LORE_OVERVIEW.md` | Complete backstory: Ferrathis planetary history, SABLE and the 4 patron AIs, FC-7's identity, otter hologram system, trust arc, memory fragment revelation sequence, faction origins, colonization model, indigenous inhabitants (Ferrovores + Residuals), legacy Earth lore |

## Sections in LORE_OVERVIEW.md

| Section | Content |
|---------|---------|
| 1. Setting | One-paragraph summary of the entire narrative |
| 2. Planetary History | Ferrathis timeline (4B years), dual origin, ecological depth map |
| 3. Colonization Model | Sid Meier's Colonization structure, two worlds, cube tension, independence gradient |
| 4. Earth Communication | Ship-to-surface comms, severed Crucis-4 link, patron satisfaction, weather effects |
| 5. SABLE | Identity, personality, why otters, hidden agenda, 10 named projections, trust arc, secret dialogues |
| 6. FC-7 | Player identity, atmospheric entry pulse, open-ended learning architecture |
| 7. Four Patrons | SABLE, DYNAMO, RESONANCE, BASTION -- personality, comms style, native policy, blueprints |
| 8. Faction Origins | Reclaimers, Volt Collective, Signal Choir, Iron Creed -- origin worlds, consciousness models |
| 9. Indigenous Inhabitants | Ferrovores (native fauna), Residuals (machine consciousness), colonization parallel |
| 10. Memory Fragments | 27-beat ordered revelation sequence across all 5 acts |
| 11. Storm and World | Perpetual storm, Convergence, 5 biomes with hidden truths |
| 12. Legacy Lore | Original Earth-based prototype lore (EL, Cultists, wormhole) -- preserved for reference |
| 13. Victory Conditions | 8 victory paths (summary, links to VICTORY.md) |
| 14. Open Questions | 10 active lore questions for future development |

## Related Documents

- Faction lore, patron details, consciousness models, military doctrines --> `docs/design/world/RACES.md`
- Ferrovore biology, Residual behavior, diplomacy, Integration Victory --> `docs/design/world/ALIENS.md`
- Weather, biomes, terrain, environmental hazards --> `docs/design/world/ENVIRONMENT.md`
- Game overview with colonization model --> `docs/design/gameplay/OVERVIEW.md`
- 5-act progression, tech tree --> `docs/design/gameplay/PROGRESSION.md`
- Tutorial design, otter dialogue triggers --> `docs/design/interface/ONBOARDING.md`
- Victory conditions with narrative payoffs --> `docs/design/gameplay/VICTORY.md`
- Trust arc stages, otter projections, quest definitions --> `config/quests.json`
- Quest state tracking --> `src/systems/questSystem.ts`
- Otter dialogue queue --> `src/systems/questDialogue.ts`
- Otter hologram entities --> `src/systems/otters.ts`
- Holographic trade system --> `src/systems/otterTrade.ts`
