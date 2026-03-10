/**
 * Tooltip system — generates contextual tooltip data for any game entity.
 *
 * When the player looks at or hovers over a world object, this module
 * produces a TooltipData payload describing what the object is, its current
 * state, and what the player can do with it. The UI layer reads TooltipData
 * and renders a tooltip panel with title, stats, action hints, and a rarity
 * border.
 *
 * Entity type determines which stats are generated:
 *   - ore_deposit: Quantity bar, Material type, Hardness
 *   - material_cube: Material, Weight, Value
 *   - furnace: Power status, Processing status, Recipe
 *   - enemy_bot / friendly_bot: Health bar, Faction, Type, Threat/Status
 *   - building: Health bar, Power, Upgrade tier
 *   - turret: Ammo, Target mode, Range
 *   - otter: Quest status, Trade available
 *   - lightning_rod: Charge level, Storm status
 *
 * Utility formatters (formatDistance, formatTime, formatPercent) are exported
 * for use by other UI systems.
 *
 * No React — pure TypeScript logic. Fully testable in isolation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single stat row displayed in the tooltip. */
export interface TooltipStat {
	/** Human-readable label (e.g. "Health", "Quantity", "Material"). */
	label: string;
	/** Formatted value string (e.g. "85/100", "Iron", "42%"). */
	value: string;
	/** Hex color override for the value text, or null for default. */
	color: string | null;
	/** Progress bar fill 0–1, or null if no bar should be shown. */
	barPercent: number | null;
}

/** Rarity tier — affects tooltip border color. */
export type Rarity = "common" | "uncommon" | "rare" | "legendary";

/** Complete tooltip payload for a single entity. */
export interface TooltipData {
	/** ECS entity ID. */
	entityId: string;
	/** Primary display name (e.g. "Iron Ore Deposit", "Furnace Mk.I"). */
	title: string;
	/** Secondary line (e.g. "Reclaimer Territory", "Powered"). */
	subtitle: string;
	/** Variable-length list of stat rows. */
	stats: TooltipStat[];
	/** Action hint strings (e.g. "E: Harvest", "F: Inspect"). */
	actions: string[];
	/** Rarity tier — drives border color. */
	rarity: Rarity;
	/** Hex color for faction indicator stripe, or null if factionless. */
	factionColor: string | null;
}

/**
 * Flexible entity data bag — mirrors common ECS trait fields.
 * All fields beyond `type` are optional so callers can pass partial data.
 */
export interface EntityData {
	/** Entity type tag (e.g. "ore_deposit", "material_cube", "furnace"). */
	type: string;
	/** Override display name. If omitted, derived from type. */
	displayName?: string;
	/** Faction identifier (e.g. "Reclaimers", "Volt Collective"). */
	faction?: string;
	/** Current health points. */
	health?: number;
	/** Maximum health points. */
	maxHealth?: number;
	/** Current quantity (ore deposits, ammo, etc.). */
	quantity?: number;
	/** Maximum quantity. */
	maxQuantity?: number;
	/** Material type string (e.g. "iron", "copper", "titanium"). */
	materialType?: string;
	/** Whether the entity is currently receiving power. */
	isPowered?: boolean;
	/** Whether the entity is actively processing something. */
	isProcessing?: boolean;
	/** Upgrade / experience level. */
	level?: number;
	/** Technology tier. */
	tier?: number;
	/** Free-form status string (e.g. "Idle", "Patrolling", "Charging"). */
	status?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Faction name → hex color mapping. */
const FACTION_COLORS: Record<string, string> = {
	reclaimers: "#D4763C",
	"volt collective": "#4FC3F7",
	"signal choir": "#AB47BC",
	"iron creed": "#78909C",
	player: "#4CAF50",
	friendly: "#4CAF50",
	enemy: "#F44336",
	hostile: "#F44336",
};

/** Rarity → border hex color. */
const RARITY_COLORS: Record<Rarity, string> = {
	common: "#BDBDBD",
	uncommon: "#4CAF50",
	rare: "#2196F3",
	legendary: "#FFD600",
};

/** Fallback display names derived from entity type. */
const TYPE_DISPLAY_NAMES: Record<string, string> = {
	ore_deposit: "Ore Deposit",
	material_cube: "Material Cube",
	furnace: "Furnace",
	belt: "Conveyor Belt",
	lightning_rod: "Lightning Rod",
	turret: "Turret",
	enemy_bot: "Enemy Bot",
	friendly_bot: "Friendly Bot",
	otter: "Otter",
	wall: "Wall",
	wire: "Wire",
	building: "Building",
};

/** Default actions per entity type. */
const TYPE_ACTIONS: Record<string, string[]> = {
	ore_deposit: ["E: Harvest", "F: Inspect"],
	material_cube: ["E: Grab", "F: Inspect"],
	furnace: ["E: Deposit", "F: Inspect", "R: Recipes"],
	belt: ["R: Rotate", "F: Inspect"],
	lightning_rod: ["F: Inspect"],
	turret: ["F: Inspect", "T: Target Mode"],
	enemy_bot: ["LMB: Attack", "H: Hack", "F: Inspect"],
	friendly_bot: ["E: Command", "Q: Switch To", "F: Inspect"],
	otter: ["E: Talk", "F: Inspect"],
	wall: ["F: Inspect"],
	wire: ["F: Inspect"],
	building: ["F: Inspect", "U: Upgrade"],
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Cache of recently generated tooltips, keyed by entityId. */
const tooltipCache = new Map<string, TooltipData>();

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

/**
 * Format a distance in meters to a human-readable string.
 *
 * @param meters - distance in meters
 * @returns formatted string (e.g. "2.5m", "150m", "1.2km")
 */
export function formatDistance(meters: number): string {
	if (meters < 0) meters = 0;
	if (meters >= 1000) {
		const km = meters / 1000;
		return km % 1 === 0 ? `${km}km` : `${km.toFixed(1)}km`;
	}
	if (meters >= 10) {
		return `${Math.round(meters)}m`;
	}
	if (meters % 1 === 0) {
		return `${meters}m`;
	}
	return `${meters.toFixed(1)}m`;
}

/**
 * Format a duration in seconds to a human-readable string.
 *
 * @param seconds - time in seconds
 * @returns formatted string (e.g. "5s", "1m 30s", "2h 15m")
 */
export function formatTime(seconds: number): string {
	if (seconds < 0) seconds = 0;
	seconds = Math.round(seconds);

	if (seconds === 0) return "0s";

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) {
		if (minutes > 0) return `${hours}h ${minutes}m`;
		return `${hours}h`;
	}
	if (minutes > 0) {
		if (secs > 0) return `${minutes}m ${secs}s`;
		return `${minutes}m`;
	}
	return `${secs}s`;
}

/**
 * Format a value/max pair as a percentage string with color coding.
 *
 * @param value - current value
 * @param max - maximum value
 * @returns percentage string (e.g. "85%")
 */
export function formatPercent(value: number, max: number): string {
	if (max <= 0) return "0%";
	const pct = Math.round((value / max) * 100);
	return `${Math.max(0, Math.min(100, pct))}%`;
}

/**
 * Get a hex color representing a health percentage on a green-yellow-orange-red gradient.
 *
 * @param percent - health as 0–1
 * @returns hex color string
 */
export function getHealthColor(percent: number): string {
	if (percent > 0.75) return "#4CAF50"; // green
	if (percent > 0.5) return "#FFEB3B"; // yellow
	if (percent > 0.25) return "#FF9800"; // orange
	return "#F44336"; // red
}

/**
 * Get the border hex color for a given rarity tier.
 *
 * @param rarity - rarity tier
 * @returns hex color string
 */
export function getRarityColor(rarity: Rarity): string {
	return RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
}

// ---------------------------------------------------------------------------
// Stat generators per entity type
// ---------------------------------------------------------------------------

function generateOreDepositStats(data: EntityData): TooltipStat[] {
	const stats: TooltipStat[] = [];
	const quantity = data.quantity ?? 0;
	const maxQuantity = data.maxQuantity ?? 100;
	const pct = maxQuantity > 0 ? quantity / maxQuantity : 0;

	stats.push({
		label: "Quantity",
		value: `${quantity}/${maxQuantity}`,
		color: pct < 0.25 ? "#F44336" : null,
		barPercent: pct,
	});

	stats.push({
		label: "Material",
		value: capitalize(data.materialType ?? "Unknown"),
		color: null,
		barPercent: null,
	});

	stats.push({
		label: "Hardness",
		value: getHardness(data.materialType),
		color: null,
		barPercent: null,
	});

	return stats;
}

function generateMaterialCubeStats(data: EntityData): TooltipStat[] {
	const stats: TooltipStat[] = [];

	stats.push({
		label: "Material",
		value: capitalize(data.materialType ?? "Unknown"),
		color: null,
		barPercent: null,
	});

	stats.push({
		label: "Weight",
		value: getCubeWeight(data.materialType),
		color: null,
		barPercent: null,
	});

	stats.push({
		label: "Value",
		value: getCubeValue(data.materialType),
		color: null,
		barPercent: null,
	});

	return stats;
}

function generateFurnaceStats(data: EntityData): TooltipStat[] {
	const stats: TooltipStat[] = [];

	stats.push({
		label: "Power",
		value: data.isPowered ? "Online" : "Offline",
		color: data.isPowered ? "#4CAF50" : "#F44336",
		barPercent: null,
	});

	stats.push({
		label: "Status",
		value: data.isProcessing ? "Processing" : "Idle",
		color: data.isProcessing ? "#FFEB3B" : null,
		barPercent: null,
	});

	if (data.tier !== undefined) {
		stats.push({
			label: "Tier",
			value: `Mk.${toRoman(data.tier)}`,
			color: null,
			barPercent: null,
		});
	}

	return stats;
}

function generateEnemyBotStats(data: EntityData): TooltipStat[] {
	const stats: TooltipStat[] = [];
	const health = data.health ?? 0;
	const maxHealth = data.maxHealth ?? 100;
	const pct = maxHealth > 0 ? health / maxHealth : 0;

	stats.push({
		label: "Health",
		value: `${health}/${maxHealth}`,
		color: getHealthColor(pct),
		barPercent: pct,
	});

	if (data.faction) {
		stats.push({
			label: "Faction",
			value: capitalize(data.faction),
			color: null,
			barPercent: null,
		});
	}

	stats.push({
		label: "Type",
		value: capitalize(data.status ?? "Scout"),
		color: null,
		barPercent: null,
	});

	stats.push({
		label: "Threat",
		value: getThreatLevel(data.level),
		color: getThreatColor(data.level),
		barPercent: null,
	});

	return stats;
}

function generateFriendlyBotStats(data: EntityData): TooltipStat[] {
	const stats: TooltipStat[] = [];
	const health = data.health ?? 0;
	const maxHealth = data.maxHealth ?? 100;
	const pct = maxHealth > 0 ? health / maxHealth : 0;

	stats.push({
		label: "Health",
		value: `${health}/${maxHealth}`,
		color: getHealthColor(pct),
		barPercent: pct,
	});

	stats.push({
		label: "Status",
		value: capitalize(data.status ?? "Idle"),
		color: null,
		barPercent: null,
	});

	stats.push({
		label: "Commands",
		value: data.level !== undefined ? `${data.level} queued` : "None",
		color: null,
		barPercent: null,
	});

	stats.push({
		label: "Cargo",
		value:
			data.quantity !== undefined
				? `${data.quantity}/${data.maxQuantity ?? 10}`
				: "Empty",
		color: null,
		barPercent: null,
	});

	return stats;
}

function generateBuildingStats(data: EntityData): TooltipStat[] {
	const stats: TooltipStat[] = [];
	const health = data.health ?? 0;
	const maxHealth = data.maxHealth ?? 100;
	const pct = maxHealth > 0 ? health / maxHealth : 0;

	stats.push({
		label: "Health",
		value: `${health}/${maxHealth}`,
		color: getHealthColor(pct),
		barPercent: pct,
	});

	stats.push({
		label: "Power",
		value: data.isPowered ? "Online" : "Offline",
		color: data.isPowered ? "#4CAF50" : "#F44336",
		barPercent: null,
	});

	if (data.tier !== undefined) {
		stats.push({
			label: "Upgrade",
			value: `Tier ${data.tier}`,
			color: null,
			barPercent: null,
		});
	}

	return stats;
}

function generateTurretStats(data: EntityData): TooltipStat[] {
	const stats: TooltipStat[] = [];
	const quantity = data.quantity ?? 0;
	const maxQuantity = data.maxQuantity ?? 100;
	const pct = maxQuantity > 0 ? quantity / maxQuantity : 0;

	stats.push({
		label: "Ammo",
		value: `${quantity}/${maxQuantity}`,
		color: pct < 0.25 ? "#F44336" : null,
		barPercent: pct,
	});

	stats.push({
		label: "Mode",
		value: capitalize(data.status ?? "Auto"),
		color: null,
		barPercent: null,
	});

	stats.push({
		label: "Range",
		value: data.level !== undefined ? `${data.level}m` : "15m",
		color: null,
		barPercent: null,
	});

	return stats;
}

function generateOtterStats(data: EntityData): TooltipStat[] {
	const stats: TooltipStat[] = [];

	stats.push({
		label: "Quest",
		value: capitalize(data.status ?? "Available"),
		color: data.status === "complete" ? "#4CAF50" : null,
		barPercent: null,
	});

	stats.push({
		label: "Trade",
		value: data.isPowered !== false ? "Available" : "Unavailable",
		color: data.isPowered !== false ? "#4CAF50" : "#9E9E9E",
		barPercent: null,
	});

	return stats;
}

function generateLightningRodStats(data: EntityData): TooltipStat[] {
	const stats: TooltipStat[] = [];
	const quantity = data.quantity ?? 0;
	const maxQuantity = data.maxQuantity ?? 100;
	const pct = maxQuantity > 0 ? quantity / maxQuantity : 0;

	stats.push({
		label: "Charge",
		value: formatPercent(quantity, maxQuantity),
		color: pct > 0.75 ? "#4CAF50" : pct > 0.25 ? "#FFEB3B" : "#F44336",
		barPercent: pct,
	});

	stats.push({
		label: "Storm",
		value: capitalize(data.status ?? "Clear"),
		color: data.status === "active" ? "#FFEB3B" : null,
		barPercent: null,
	});

	return stats;
}

function generateDefaultStats(data: EntityData): TooltipStat[] {
	const stats: TooltipStat[] = [];

	if (data.health !== undefined && data.maxHealth !== undefined) {
		const pct = data.maxHealth > 0 ? data.health / data.maxHealth : 0;
		stats.push({
			label: "Health",
			value: `${data.health}/${data.maxHealth}`,
			color: getHealthColor(pct),
			barPercent: pct,
		});
	}

	if (data.status) {
		stats.push({
			label: "Status",
			value: capitalize(data.status),
			color: null,
			barPercent: null,
		});
	}

	return stats;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function getHardness(materialType: string | undefined): string {
	const hardnessMap: Record<string, string> = {
		iron: "Medium",
		copper: "Soft",
		titanium: "Hard",
		gold: "Soft",
		uranium: "Very Hard",
		crystal: "Brittle",
	};
	return hardnessMap[materialType?.toLowerCase() ?? ""] ?? "Medium";
}

function getCubeWeight(materialType: string | undefined): string {
	const weightMap: Record<string, string> = {
		iron: "7.8 kg",
		copper: "8.9 kg",
		titanium: "4.5 kg",
		gold: "19.3 kg",
		uranium: "19.1 kg",
		crystal: "2.3 kg",
	};
	return weightMap[materialType?.toLowerCase() ?? ""] ?? "5.0 kg";
}

function getCubeValue(materialType: string | undefined): string {
	const valueMap: Record<string, string> = {
		iron: "10 credits",
		copper: "15 credits",
		titanium: "50 credits",
		gold: "100 credits",
		uranium: "200 credits",
		crystal: "75 credits",
	};
	return valueMap[materialType?.toLowerCase() ?? ""] ?? "5 credits";
}

function getThreatLevel(level: number | undefined): string {
	const l = level ?? 1;
	if (l >= 10) return "Extreme";
	if (l >= 7) return "High";
	if (l >= 4) return "Medium";
	return "Low";
}

function getThreatColor(level: number | undefined): string {
	const l = level ?? 1;
	if (l >= 10) return "#D32F2F";
	if (l >= 7) return "#F44336";
	if (l >= 4) return "#FF9800";
	return "#4CAF50";
}

function toRoman(n: number): string {
	const numerals: [number, string][] = [
		[10, "X"],
		[9, "IX"],
		[5, "V"],
		[4, "IV"],
		[1, "I"],
	];
	let result = "";
	let remaining = Math.max(1, Math.min(n, 39));
	for (const [value, numeral] of numerals) {
		while (remaining >= value) {
			result += numeral;
			remaining -= value;
		}
	}
	return result;
}

function resolveTitle(data: EntityData): string {
	if (data.displayName) return data.displayName;

	const baseName = TYPE_DISPLAY_NAMES[data.type] ?? capitalize(data.type.replace(/_/g, " "));

	// Append material type for deposits and cubes
	if (
		(data.type === "ore_deposit" || data.type === "material_cube") &&
		data.materialType
	) {
		return `${capitalize(data.materialType)} ${baseName}`;
	}

	// Append tier for furnaces and buildings
	if (
		(data.type === "furnace" || data.type === "building") &&
		data.tier !== undefined
	) {
		return `${baseName} Mk.${toRoman(data.tier)}`;
	}

	return baseName;
}

function resolveSubtitle(data: EntityData): string {
	const parts: string[] = [];

	if (data.faction) {
		parts.push(`${capitalize(data.faction)} Territory`);
	}

	if (data.isPowered !== undefined) {
		parts.push(data.isPowered ? "Powered" : "Unpowered");
	}

	if (data.isProcessing) {
		parts.push("Processing");
	}

	if (data.status && data.type !== "otter" && data.type !== "turret") {
		parts.push(capitalize(data.status));
	}

	return parts.join(" \u2022 ") || deriveDefaultSubtitle(data.type);
}

function deriveDefaultSubtitle(type: string): string {
	switch (type) {
		case "ore_deposit":
			return "Natural Formation";
		case "material_cube":
			return "Compressed Resource";
		case "furnace":
			return "Processing Machine";
		case "belt":
			return "Transport";
		case "lightning_rod":
			return "Power Collection";
		case "turret":
			return "Automated Defense";
		case "enemy_bot":
			return "Hostile";
		case "friendly_bot":
			return "Allied Unit";
		case "otter":
			return "Friendly Creature";
		case "wall":
			return "Defensive Structure";
		case "wire":
			return "Power Conduit";
		case "building":
			return "Structure";
		default:
			return "Unknown Object";
	}
}

function resolveRarity(data: EntityData): Rarity {
	// Tier-based rarity
	if (data.tier !== undefined) {
		if (data.tier >= 4) return "legendary";
		if (data.tier >= 3) return "rare";
		if (data.tier >= 2) return "uncommon";
		return "common";
	}

	// Material-based rarity
	if (data.materialType) {
		const mat = data.materialType.toLowerCase();
		if (mat === "uranium" || mat === "crystal") return "legendary";
		if (mat === "titanium" || mat === "gold") return "rare";
		if (mat === "copper") return "uncommon";
		return "common";
	}

	// Level-based rarity for bots
	if (data.level !== undefined) {
		if (data.level >= 10) return "legendary";
		if (data.level >= 7) return "rare";
		if (data.level >= 4) return "uncommon";
		return "common";
	}

	return "common";
}

function resolveFactionColor(data: EntityData): string | null {
	if (!data.faction) return null;
	return FACTION_COLORS[data.faction.toLowerCase()] ?? null;
}

function resolveActions(data: EntityData): string[] {
	return TYPE_ACTIONS[data.type] ?? ["F: Inspect"];
}

// ---------------------------------------------------------------------------
// Stat generator dispatch
// ---------------------------------------------------------------------------

const STAT_GENERATORS: Record<
	string,
	(data: EntityData) => TooltipStat[]
> = {
	ore_deposit: generateOreDepositStats,
	material_cube: generateMaterialCubeStats,
	furnace: generateFurnaceStats,
	enemy_bot: generateEnemyBotStats,
	friendly_bot: generateFriendlyBotStats,
	building: generateBuildingStats,
	turret: generateTurretStats,
	otter: generateOtterStats,
	lightning_rod: generateLightningRodStats,
};

// ---------------------------------------------------------------------------
// Public API — generateTooltip
// ---------------------------------------------------------------------------

/**
 * Generate a complete TooltipData payload for a game entity.
 *
 * Inspects the entity's type and data fields to produce contextually
 * appropriate title, subtitle, stats, action hints, rarity, and faction
 * indicator.
 *
 * @param entityId - ECS entity ID
 * @param entityData - flexible data bag with entity state
 * @returns fully populated TooltipData
 */
export function generateTooltip(
	entityId: string,
	entityData: EntityData,
): TooltipData {
	const generator = STAT_GENERATORS[entityData.type] ?? generateDefaultStats;
	const stats = generator(entityData);

	const tooltip: TooltipData = {
		entityId,
		title: resolveTitle(entityData),
		subtitle: resolveSubtitle(entityData),
		stats,
		actions: resolveActions(entityData),
		rarity: resolveRarity(entityData),
		factionColor: resolveFactionColor(entityData),
	};

	tooltipCache.set(entityId, tooltip);
	return tooltip;
}

// ---------------------------------------------------------------------------
// Public API — reset (for testing)
// ---------------------------------------------------------------------------

/**
 * Reset all tooltip system state.
 *
 * Clears the internal tooltip cache. Used by tests to ensure isolation.
 */
export function reset(): void {
	tooltipCache.clear();
}
