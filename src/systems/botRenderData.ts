/**
 * Bot render data system — aggregates bot entity state into render-ready data.
 *
 * Each bot is registered with a faction and bot type. Per-frame updates push
 * transform, animation, health, and status effect data. The renderer calls
 * `collectBotRenderData()` to get a snapshot of everything it needs to draw
 * every bot in one pass.
 *
 * Faction materials are defined inline (no config import, no Three.js import).
 * All output is plain data — the renderer is responsible for turning it into
 * meshes and materials.
 *
 * State lives in module-level Maps. Call `reset()` between tests or on
 * scene teardown.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Faction =
	| "reclaimers"
	| "volt_collective"
	| "signal_choir"
	| "iron_creed";

export type BotType = "worker" | "scout" | "soldier" | "builder" | "harvester";

export type AnimState =
	| "idle"
	| "walking"
	| "harvesting"
	| "combat"
	| "damaged"
	| "dead";

export type StatusEffect =
	| "poison"
	| "hacked"
	| "stunned"
	| "shielded"
	| "overcharged"
	| "burning"
	| "frozen";

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface FactionMaterial {
	color: string;
	roughness: number;
	metalness: number;
	emissive?: string;
}

export interface BotRenderInfo {
	botId: string;
	position: Vec3;
	rotation: Vec3;
	velocity: Vec3;
	faction: Faction;
	botType: BotType;
	animState: AnimState;
	healthPercent: number;
	statusEffects: readonly StatusEffect[];
	factionMaterial: FactionMaterial;
	isPlayerControlled: boolean;
	nameplate: string;
}

// ---------------------------------------------------------------------------
// Faction material palette
// ---------------------------------------------------------------------------

const FACTION_MATERIALS: Readonly<Record<Faction, FactionMaterial>> = {
	reclaimers: {
		color: "#8B6914",
		roughness: 0.7,
		metalness: 0.4,
	},
	volt_collective: {
		color: "#C0C0C0",
		roughness: 0.2,
		metalness: 0.9,
		emissive: "#001133",
	},
	signal_choir: {
		color: "#9090B0",
		roughness: 0.3,
		metalness: 0.6,
		emissive: "#1A0033",
	},
	iron_creed: {
		color: "#707070",
		roughness: 0.4,
		metalness: 0.8,
	},
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface BotEntry {
	botId: string;
	faction: Faction;
	botType: BotType;
	position: Vec3;
	rotation: Vec3;
	velocity: Vec3;
	animState: AnimState;
	healthCurrent: number;
	healthMax: number;
	statusEffects: StatusEffect[];
	nameplate: string;
}

/** All registered bots, keyed by botId. */
const bots = new Map<string, BotEntry>();

/** The ID of the player-controlled bot, or null. */
let playerBotId: string | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function vec3Zero(): Vec3 {
	return { x: 0, y: 0, z: 0 };
}

function vec3Copy(v: Vec3): Vec3 {
	return { x: v.x, y: v.y, z: v.z };
}

function distanceSq(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return dx * dx + dy * dy + dz * dz;
}

function defaultNameplate(botId: string, botType: BotType): string {
	return `${botType}-${botId}`;
}

function entryToRenderInfo(entry: BotEntry): BotRenderInfo {
	const healthPercent =
		entry.healthMax > 0 ? entry.healthCurrent / entry.healthMax : 0;
	return {
		botId: entry.botId,
		position: vec3Copy(entry.position),
		rotation: vec3Copy(entry.rotation),
		velocity: vec3Copy(entry.velocity),
		faction: entry.faction,
		botType: entry.botType,
		animState: entry.animState,
		healthPercent,
		statusEffects: [...entry.statusEffects],
		factionMaterial: { ...FACTION_MATERIALS[entry.faction] },
		isPlayerControlled: entry.botId === playerBotId,
		nameplate: entry.nameplate,
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a bot for rendering. Throws if the botId is already registered.
 */
export function registerBot(
	botId: string,
	faction: Faction,
	position: Vec3,
	botType: BotType,
): void {
	if (bots.has(botId)) {
		throw new Error(`Bot already registered: ${botId}`);
	}
	bots.set(botId, {
		botId,
		faction,
		botType,
		position: vec3Copy(position),
		rotation: vec3Zero(),
		velocity: vec3Zero(),
		animState: "idle",
		healthCurrent: 100,
		healthMax: 100,
		statusEffects: [],
		nameplate: defaultNameplate(botId, botType),
	});
}

/**
 * Unregister a bot. If the bot is the player bot, clears the player reference.
 * Throws if the botId is not registered.
 */
export function unregisterBot(botId: string): void {
	if (!bots.has(botId)) {
		throw new Error(`Bot not registered: ${botId}`);
	}
	bots.delete(botId);
	if (playerBotId === botId) {
		playerBotId = null;
	}
}

/**
 * Update a bot's transform (position, rotation, velocity).
 * Throws if the botId is not registered.
 */
export function updateBotTransform(
	botId: string,
	position: Vec3,
	rotation: Vec3,
	velocity: Vec3,
): void {
	const entry = bots.get(botId);
	if (!entry) {
		throw new Error(`Bot not registered: ${botId}`);
	}
	entry.position = vec3Copy(position);
	entry.rotation = vec3Copy(rotation);
	entry.velocity = vec3Copy(velocity);
}

/**
 * Set the current animation state for a bot.
 * Throws if the botId is not registered.
 */
export function setBotAnimation(botId: string, animState: AnimState): void {
	const entry = bots.get(botId);
	if (!entry) {
		throw new Error(`Bot not registered: ${botId}`);
	}
	entry.animState = animState;
}

/**
 * Set the health bar data for a bot.
 * Throws if the botId is not registered or if max is negative.
 */
export function setBotHealth(
	botId: string,
	current: number,
	max: number,
): void {
	const entry = bots.get(botId);
	if (!entry) {
		throw new Error(`Bot not registered: ${botId}`);
	}
	if (max < 0) {
		throw new Error(`Max health cannot be negative: ${max}`);
	}
	entry.healthCurrent = current;
	entry.healthMax = max;
}

/**
 * Set the active status effects for a bot. Replaces the previous array.
 * Throws if the botId is not registered.
 */
export function setBotStatus(
	botId: string,
	statusEffects: StatusEffect[],
): void {
	const entry = bots.get(botId);
	if (!entry) {
		throw new Error(`Bot not registered: ${botId}`);
	}
	entry.statusEffects = [...statusEffects];
}

/**
 * Collect render data for all registered bots. Returns a new array of
 * `BotRenderInfo` snapshots (safe to mutate).
 */
export function collectBotRenderData(): BotRenderInfo[] {
	const result: BotRenderInfo[] = [];
	for (const entry of bots.values()) {
		result.push(entryToRenderInfo(entry));
	}
	return result;
}

/**
 * Mark a bot as player-controlled. Only one bot can be the player at a time.
 * Throws if the botId is not registered.
 */
export function setPlayerBot(botId: string): void {
	if (!bots.has(botId)) {
		throw new Error(`Bot not registered: ${botId}`);
	}
	playerBotId = botId;
}

/**
 * Get the render data for the player-controlled bot.
 * Returns null if no player bot is set.
 */
export function getPlayerBot(): BotRenderInfo | null {
	if (playerBotId === null) return null;
	const entry = bots.get(playerBotId);
	if (!entry) return null;
	return entryToRenderInfo(entry);
}

/**
 * Get the PBR material spec for a faction.
 * Returns a copy so callers cannot mutate the palette.
 */
export function getFactionMaterial(faction: Faction): FactionMaterial {
	return { ...FACTION_MATERIALS[faction] };
}

/**
 * Spatial query: return render data for all bots within `radius` of
 * `position` (Euclidean 3D distance). Results are sorted nearest-first.
 */
export function getBotsInRange(
	position: Vec3,
	radius: number,
): BotRenderInfo[] {
	const radiusSq = radius * radius;
	const hits: { info: BotRenderInfo; dSq: number }[] = [];
	for (const entry of bots.values()) {
		const dSq = distanceSq(position, entry.position);
		if (dSq <= radiusSq) {
			hits.push({ info: entryToRenderInfo(entry), dSq });
		}
	}
	hits.sort((a, b) => a.dSq - b.dSq);
	return hits.map((h) => h.info);
}

/**
 * Filter all registered bots by faction.
 */
export function getBotsByFaction(faction: Faction): BotRenderInfo[] {
	const result: BotRenderInfo[] = [];
	for (const entry of bots.values()) {
		if (entry.faction === faction) {
			result.push(entryToRenderInfo(entry));
		}
	}
	return result;
}

/**
 * Total number of registered bots.
 */
export function getBotCount(): number {
	return bots.size;
}

/**
 * Clear all state. Call between tests or on scene teardown.
 */
export function reset(): void {
	bots.clear();
	playerBotId = null;
}
