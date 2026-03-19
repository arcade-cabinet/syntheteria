/**
 * Robot class taxonomy.
 *
 * Faction bots — used by ALL factions (player + AI). Differentiated by role.
 * Cult mechs  — EL cult POI spawns and random encounters only.
 */
export type RobotClass =
	// Faction bots (6)
	| "scout"
	| "infantry"
	| "cavalry"
	| "ranged"
	| "support"
	| "worker"
	// Cult mechs (3)
	| "cult_infantry"
	| "cult_ranged"
	| "cult_cavalry";

export type BotTier = 1 | 2 | 3 | 4 | 5;
