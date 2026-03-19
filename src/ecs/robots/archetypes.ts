// Faction bots (all factions use these 6)
export { SUPPORT_DEFAULTS, spawnSupport } from "./BuilderBot";
export { CAVALRY_DEFAULTS, spawnCavalry } from "./CavalryBot";
export { RANGED_DEFAULTS, spawnRanged } from "./GuardBot";
export { WORKER_DEFAULTS, spawnWorker } from "./HarvesterBot";
export { SCOUT_DEFAULTS, spawnScout } from "./ScoutBot";
export { INFANTRY_DEFAULTS, spawnInfantry } from "./SentinelBot";

// Cult mechs (EL cult POI encounters only)
export {
	CULT_INFANTRY_DEFAULTS,
	CULT_RANGED_DEFAULTS,
	CULT_CAVALRY_DEFAULTS,
	spawnCultInfantry,
	spawnCultRanged,
	spawnCultCavalry,
} from "./CultMechs";
