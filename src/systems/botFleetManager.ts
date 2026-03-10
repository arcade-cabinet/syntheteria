/**
 * Bot fleet manager — tracks all bots owned by each faction.
 *
 * Manages bot creation, destruction, faction assignment, and fleet
 * statistics. Provides queries for bot counts, types, and status.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BotRecord {
	id: string;
	faction: string;
	type: string;
	status: "active" | "idle" | "damaged" | "destroyed";
	createdTick: number;
	destroyedTick?: number;
	position: { x: number; z: number };
	assignment?: string; // current task/order
}

export interface FleetStats {
	totalBots: number;
	activeBots: number;
	idleBots: number;
	damagedBots: number;
	destroyedBots: number;
	botsByType: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const bots = new Map<string, BotRecord>();
let nextBotId = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new bot.
 */
export function registerBot(
	faction: string,
	type: string,
	position: { x: number; z: number },
	createdTick: number,
	id?: string,
): string {
	const botId = id ?? `bot_${nextBotId++}`;
	bots.set(botId, {
		id: botId,
		faction,
		type,
		status: "active",
		createdTick,
		position: { ...position },
	});
	return botId;
}

/**
 * Remove a bot (destroyed).
 */
export function destroyBot(id: string, tick: number): boolean {
	const bot = bots.get(id);
	if (!bot) return false;
	bot.status = "destroyed";
	bot.destroyedTick = tick;
	return true;
}

/**
 * Permanently remove a bot record.
 */
export function removeBot(id: string): boolean {
	return bots.delete(id);
}

/**
 * Update a bot's status.
 */
export function setBotStatus(
	id: string,
	status: "active" | "idle" | "damaged",
): boolean {
	const bot = bots.get(id);
	if (!bot || bot.status === "destroyed") return false;
	bot.status = status;
	return true;
}

/**
 * Update a bot's position.
 */
export function updateBotPosition(
	id: string,
	x: number,
	z: number,
): boolean {
	const bot = bots.get(id);
	if (!bot) return false;
	bot.position = { x, z };
	return true;
}

/**
 * Assign a task to a bot.
 */
export function assignBot(id: string, assignment: string): boolean {
	const bot = bots.get(id);
	if (!bot || bot.status === "destroyed") return false;
	bot.assignment = assignment;
	bot.status = "active";
	return true;
}

/**
 * Clear a bot's assignment.
 */
export function unassignBot(id: string): boolean {
	const bot = bots.get(id);
	if (!bot) return false;
	bot.assignment = undefined;
	if (bot.status === "active") bot.status = "idle";
	return true;
}

/**
 * Get a bot by ID.
 */
export function getBot(id: string): BotRecord | null {
	const bot = bots.get(id);
	return bot ? { ...bot } : null;
}

/**
 * Get all bots for a faction.
 */
export function getFactionBots(faction: string): BotRecord[] {
	const result: BotRecord[] = [];
	for (const bot of bots.values()) {
		if (bot.faction === faction && bot.status !== "destroyed") {
			result.push({ ...bot });
		}
	}
	return result;
}

/**
 * Get all bots of a specific type for a faction.
 */
export function getFactionBotsByType(
	faction: string,
	type: string,
): BotRecord[] {
	return getFactionBots(faction).filter((b) => b.type === type);
}

/**
 * Get fleet statistics for a faction.
 */
export function getFleetStats(faction: string): FleetStats {
	const factionBots = Array.from(bots.values()).filter(
		(b) => b.faction === faction,
	);

	const stats: FleetStats = {
		totalBots: factionBots.length,
		activeBots: 0,
		idleBots: 0,
		damagedBots: 0,
		destroyedBots: 0,
		botsByType: {},
	};

	for (const bot of factionBots) {
		switch (bot.status) {
			case "active":
				stats.activeBots++;
				break;
			case "idle":
				stats.idleBots++;
				break;
			case "damaged":
				stats.damagedBots++;
				break;
			case "destroyed":
				stats.destroyedBots++;
				break;
		}

		stats.botsByType[bot.type] = (stats.botsByType[bot.type] ?? 0) + 1;
	}

	return stats;
}

/**
 * Get idle bots for a faction (available for new assignments).
 */
export function getIdleBots(faction: string): BotRecord[] {
	return getFactionBots(faction).filter((b) => b.status === "idle");
}

/**
 * Get bots near a position within a radius.
 */
export function getBotsNear(
	x: number,
	z: number,
	radius: number,
	faction?: string,
): BotRecord[] {
	const radiusSq = radius * radius;
	const result: BotRecord[] = [];

	for (const bot of bots.values()) {
		if (bot.status === "destroyed") continue;
		if (faction && bot.faction !== faction) continue;

		const dx = bot.position.x - x;
		const dz = bot.position.z - z;
		if (dx * dx + dz * dz <= radiusSq) {
			result.push({ ...bot });
		}
	}

	return result;
}

/**
 * Get total bot count across all factions.
 */
export function getTotalBotCount(): number {
	let count = 0;
	for (const bot of bots.values()) {
		if (bot.status !== "destroyed") count++;
	}
	return count;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetBotFleet(): void {
	bots.clear();
	nextBotId = 0;
}
