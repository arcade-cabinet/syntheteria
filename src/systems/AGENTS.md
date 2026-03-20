# systems/

All Koota ECS systems — pure functions that read/write traits on the world.

## Rules
- **One system per file** — each file owns a single domain
- **All systems accept `world: World`** — never import a world singleton
- **No rendering or React** — systems are pure simulation logic
- **Config values come from `src/config/`** — no magic numbers
- **Reset functions prefixed with `_reset`** — used in tests only

## Public API

### Turn Flow
- `advanceTurn`, `getCurrentTurn`, `getGameOutcome` — turn lifecycle
- `runAiTurns`, `resolveAllMoves` — AI decision + move resolution

### Combat & Units
- `resolveAttacks` — attack resolution
- `awardXP`, `applyMarkUpgrade`, `recordKill`, `recordHarvest` — XP system
- `applyMark`, `getMaxTier`, `parseMarks`, `hasMark` — upgrade system
- `queueFabrication`, `runFabrication` — unit production
- `runSpecializationPassives` — class passive effects

### Economy & Resources
- `getPlayerResources`, `addResources`, `spendResources`, `canAfford`
- `harvestSystem`, `startHarvest` — resource harvesting
- `floorMiningSystem`, `startFloorMining` — floor tile mining
- `runResourceRenewal` — deposit regeneration
- `queueSynthesis`, `runSynthesis` — fusion recipes
- `trackIncome`, `trackExpenditure`, `finalizeTurnDeltas`

### Buildings & Infrastructure
- `placeStarterBuildings` — initial building placement
- `startBuildPlacement`, `confirmBuildPlacement`, `cancelBuildPlacement`
- `runPowerGrid`, `isPowered` — power network
- `runSignalNetwork`, `isInSignalRange` — comms network
- `runTurrets` — defensive turrets

### Cult & Threat
- `initCultPOIs`, `initBreachZones`, `checkCultistSpawn` — cult setup
- `runCultPatrols`, `spreadCorruption` — cult AI
- `tickCultMutations`, `computeTier` — mutation escalation

### Diplomacy
- `runDiplomacy`, `proposeAlliance`, `declareWar` — diplomacy actions
- `getStandingLevel`, `recordAggression`, `isAlly`

### Map & Territory
- `revealFog` — fog of war
- `computeTerritory`, `getTerritoryPercent`
- `placeSalvageProps` — scatter salvage on map
- `movementSystem` — unit movement interpolation

### Research
- `queueResearch`, `cancelResearch`, `runResearch`
- `isTechResearched`, `hasTechEffect`, `getTechEffectValue`

### UI State (Zustand-like stores)
- `getRadialMenuState`, `openRadialMenu`, `confirmRadialSelection`
- `triggerSpeech`, `getActiveSpeech`, `subscribeSpeech`
- `pushToast`, `dismissToast`, `subscribeToasts`
- `logTurnEvent`, `getCurrentTurnEvents`, `getCompletedTurnLogs`
- `collectTurnSummary`, `getTurnSummary`
- `placeFragment`, `readFragment`, `checkProximity`
- `getTutorialState`, `getCurrentStep`, `completeCurrentStep`

### Victory
- `checkVictoryConditions`, `getVictoryProgress`
- `calculateFactionScore`, `recordCultStructureDestroyed`
- `canStartWormholeProject`, `tickWormholeProject`

## Files
| File | Domain |
|------|--------|
| aiTurnSystem.ts | AI turn execution + move resolution |
| analyticsCollector.ts | Per-turn analytics snapshots |
| analysisSystem.ts | Analysis node acceleration for building upgrades |
| attackSystem.ts | Combat resolution |
| buildingPlacement.ts | Starter building placement |
| buildingUpgradeSystem.ts | Per-building tier upgrade jobs |
| buildSystem.ts | Player build flow |
| campaignStats.ts | Long-running campaign statistics |
| cultistSystem.ts | Cult POI init, patrols, corruption |
| cultMutation.ts | Cult unit mutation tiers |
| diplomacySystem.ts | Faction diplomacy + trade |
| experienceSystem.ts | Unit XP + mark thresholds |
| fabricationSystem.ts | Robot fabrication queue |
| floorMiningSystem.ts | Floor tile mining |
| fogRevealSystem.ts | Fog of war reveal |
| hackingSystem.ts | Unit hacking actions |
| hackingTypes.ts | Hacking constants + bot roles |
| harvestSystem.ts | Resource harvesting |
| highlightSystem.ts | Tile highlight management |
| memoryFragments.ts | Lore fragments + proximity |
| movementSystem.ts | Unit movement interpolation |
| populationSystem.ts | Population cap + counting |
| powerSystem.ts | Power grid simulation |
| radialMenu.ts | Legacy radial state machine (Vitest + specs; in-game UI uses BuildingModal) |
| repairSystem.ts | Unit repair |
| researchSystem.ts | Tech research queue |
| resourceDeltaSystem.ts | Per-turn income/expenditure tracking |
| resourceRenewalSystem.ts | Resource deposit renewal |
| resourceSystem.ts | Core resource read/write |
| salvagePlacement.ts | Salvage prop scattering |
| signalSystem.ts | Signal/comms network |
| specializationSystem.ts | Class passive effects |
| speechBubbleStore.ts | Speech bubble state |
| speechTriggers.ts | Context-based speech triggers |
| synthesisSystem.ts | Fusion recipe execution |
| territorySystem.ts | Territory computation |
| toastNotifications.ts | Toast notification store |
| turnEventLog.ts | Per-turn event log |
| turnSummary.ts | End-of-turn summary |
| turnSystem.ts | Turn advancement + outcome |
| turretSystem.ts | Turret firing logic |
| tutorialSystem.ts | Tutorial step state machine |
| upgradeSystem.ts | Unit mark/tier upgrades |
| victorySystem.ts | 6 victory conditions: domination, network, reclamation, transcendence, cult, score |
| scoreSystem.ts | Weighted faction score for turn-cap victory |
| wormholeProject.ts | Wormhole project state machine |
