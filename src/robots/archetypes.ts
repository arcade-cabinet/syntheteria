// Faction bots (all factions use these 6)
export { SUPPORT_DEFAULTS, spawnSupport } from "./BuilderBot";
export { CAVALRY_DEFAULTS, spawnCavalry } from "./CavalryBot";
// Cult mechs (EL cult POI encounters only)
export {
	CULT_CAVALRY_DEFAULTS,
	CULT_INFANTRY_DEFAULTS,
	CULT_RANGED_DEFAULTS,
	spawnCultCavalry,
	spawnCultInfantry,
	spawnCultRanged,
} from "./CultMechs";
export { RANGED_DEFAULTS, spawnRanged } from "./GuardBot";
export { spawnWorker, WORKER_DEFAULTS } from "./HarvesterBot";
export { SCOUT_DEFAULTS, spawnScout } from "./ScoutBot";
export { INFANTRY_DEFAULTS, spawnInfantry } from "./SentinelBot";
