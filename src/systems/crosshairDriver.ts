/**
 * crosshairDriver — determines crosshair/reticle state based on raycast data.
 *
 * Pure logic module that translates what the player is looking at (via
 * RaycastHit data from the physics system) into crosshair style, target
 * name, distance display, interaction prompts, and health bar data for
 * the FPS HUD.
 *
 * No rendering, no React, no config imports — fully testable in isolation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Data from a physics raycast describing what the player's reticle hit. */
export interface RaycastHit {
	entityId: string;
	entityType: string;
	distance: number;
	point: { x: number; y: number; z: number };
	faction?: string;
	displayName?: string;
	health?: number;
	isInteractable: boolean;
}

/** The player's current look/mode context. */
export interface PlayerLookState {
	mode: PlayerMode;
	isHoldingCube: boolean;
	buildItemName?: string;
	currentFaction: string;
}

/** Crosshair style determines reticle appearance. */
export type CrosshairStyle = "default" | "harvest" | "interact" | "combat" | "build";

/** Player gameplay mode. */
export type PlayerMode = "explore" | "combat" | "build" | "harvest";

/** The output of updateCrosshair — everything the HUD needs. */
export interface CrosshairUpdate {
	style: CrosshairStyle;
	targetName: string | undefined;
	targetDistance: number | undefined;
	canInteract: boolean;
	quickAction: string | undefined;
}

/** Health bar rendering data for the HUD. */
export interface TargetHealthBar {
	show: boolean;
	percent: number;
	color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum interaction range per entity type (meters). */
const MAX_INTERACTION_RANGE: Record<string, number> = {
	ore_deposit: 3.0,
	material_cube: 2.5,
	furnace: 3.0,
	belt: 3.0,
	enemy_bot: 15.0,
	friendly_bot: 5.0,
	turret: 4.0,
	otter: 3.0,
	wall: 4.0,
	wire: 4.0,
	building: 4.0,
};

/** Default range for entity types not in the map. */
const DEFAULT_INTERACTION_RANGE = 4.0;

/** Hex colors per crosshair style. */
const RETICLE_COLORS: Record<CrosshairStyle, string> = {
	default: "#ffffff",
	harvest: "#ffcc00",
	interact: "#00ccff",
	combat: "#ff3333",
	build: "#33ff33",
};

/** Faction colors for health bars. */
const FACTION_COLORS: Record<string, string> = {
	reclaimers: "#cc6633",
	volt_collective: "#3399ff",
	signal_choir: "#aa44ff",
	iron_creed: "#888888",
	feral: "#ff3333",
	player: "#00ff88",
};

const DEFAULT_FACTION_COLOR = "#ff3333";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let currentMode: PlayerMode = "explore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the max interaction range for an entity type.
 */
function getMaxRange(entityType: string): number {
	return MAX_INTERACTION_RANGE[entityType] ?? DEFAULT_INTERACTION_RANGE;
}

/**
 * Check if a hit is within interaction range.
 */
function isInRange(hit: RaycastHit): boolean {
	return hit.distance <= getMaxRange(hit.entityType);
}

/**
 * Determine the crosshair style for an entity type, considering player mode.
 */
function resolveStyle(entityType: string, mode: PlayerMode): CrosshairStyle {
	if (mode === "build") return "build";

	switch (entityType) {
		case "ore_deposit":
			return "harvest";
		case "enemy_bot":
			return "combat";
		case "material_cube":
		case "furnace":
		case "belt":
		case "friendly_bot":
		case "turret":
		case "otter":
		case "wall":
		case "wire":
		case "building":
			return "interact";
		default:
			return "default";
	}
}

/**
 * Format target name for display, including status information.
 */
function formatTargetName(hit: RaycastHit, playerState: PlayerLookState): string {
	const name = hit.displayName;

	switch (hit.entityType) {
		case "ore_deposit": {
			const pct = hit.health != null ? `${Math.round(hit.health * 100)}%` : "??%";
			return name ? `${name} (${pct})` : `Ore Deposit (${pct})`;
		}
		case "material_cube":
			return name ?? "Cube";
		case "furnace": {
			const status = hit.health != null && hit.health > 0 ? "Powered" : "Unpowered";
			return name ? `${name} [${status}]` : `Furnace [${status}]`;
		}
		case "belt":
			return name ?? "Belt";
		case "enemy_bot": {
			const hp = hit.health != null ? `${Math.round(hit.health * 100)}% HP` : "??% HP";
			return name ? `${name} [${hp}]` : `Enemy [${hp}]`;
		}
		case "friendly_bot":
			return name ? `${name} [Idle]` : "Bot [Idle]";
		case "turret": {
			const active = hit.health != null && hit.health > 0 ? "Active" : "Offline";
			return name ? `${name} [${active}]` : `Turret [${active}]`;
		}
		case "otter":
			return name ? `${name} [Quest!]` : "Otter [Quest!]";
		case "wall":
			return name ?? "Wall";
		case "wire":
			return name ?? "Wire";
		case "building":
			return name ?? "Building";
		default:
			return name ?? hit.entityType;
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Update the crosshair state based on what the player is looking at.
 *
 * @param hit - Raycast hit data, or null if looking at nothing.
 * @param playerState - Current player mode and context.
 * @returns CrosshairUpdate with style, target name, distance, and action prompt.
 */
export function updateCrosshair(
	hit: RaycastHit | null,
	playerState: PlayerLookState,
): CrosshairUpdate {
	// Build mode overrides everything
	if (playerState.mode === "build") {
		return {
			style: "build",
			targetName: playerState.buildItemName
				? `Place: ${playerState.buildItemName}`
				: undefined,
			targetDistance: hit?.distance,
			canInteract: true,
			quickAction: "LMB to place",
		};
	}

	// Nothing targeted
	if (!hit) {
		return {
			style: "default",
			targetName: undefined,
			targetDistance: undefined,
			canInteract: false,
			quickAction: undefined,
		};
	}

	const inRange = isInRange(hit);
	const style = resolveStyle(hit.entityType, playerState.mode);
	const targetName = formatTargetName(hit, playerState);
	const quickAction = inRange
		? (getInteractionPrompt(hit.entityType, playerState) ?? undefined)
		: "Move closer";
	const canInteract = hit.isInteractable && inRange;

	return {
		style,
		targetName,
		targetDistance: hit.distance,
		canInteract,
		quickAction,
	};
}

/**
 * Get a contextual interaction prompt based on entity type and player state.
 *
 * @param entityType - The type of entity being looked at.
 * @param playerState - Current player context.
 * @returns A prompt string, or null if no prompt applies.
 */
export function getInteractionPrompt(
	entityType: string,
	playerState: PlayerLookState,
): string | null {
	switch (entityType) {
		case "ore_deposit":
			return "Hold E to harvest";
		case "material_cube":
			return playerState.isHoldingCube ? "E to swap" : "E to grab";
		case "furnace":
			return playerState.isHoldingCube ? "E to deposit" : "E to open";
		case "belt":
			return "E to configure";
		case "enemy_bot":
			return "LMB to attack";
		case "friendly_bot":
			return "Tab to switch";
		case "turret":
			return "E to configure";
		case "otter":
			return "E to talk";
		case "wall":
			return "E to inspect";
		case "wire":
			return "E to inspect";
		case "building":
			return "E to interact";
		default:
			return null;
	}
}

/**
 * Get health bar display data for a raycast hit target.
 *
 * Returns health/status bar data for entities that should display one:
 * - Enemies: health bar colored by faction
 * - Buildings/furnaces/turrets: repair status bar
 * - Ore deposits: remaining percentage
 * - Cubes and non-damageable entities: null (no bar)
 *
 * @param hit - The raycast hit to evaluate.
 * @returns Health bar data, or null if no bar should be shown.
 */
export function getTargetHealthBar(hit: RaycastHit | null): TargetHealthBar | null {
	if (!hit) return null;
	if (hit.health == null) return null;

	switch (hit.entityType) {
		case "enemy_bot": {
			const color = hit.faction
				? (FACTION_COLORS[hit.faction] ?? DEFAULT_FACTION_COLOR)
				: DEFAULT_FACTION_COLOR;
			return { show: true, percent: hit.health, color };
		}
		case "friendly_bot": {
			const color = hit.faction
				? (FACTION_COLORS[hit.faction] ?? FACTION_COLORS.player)
				: FACTION_COLORS.player;
			return { show: true, percent: hit.health, color };
		}
		case "furnace":
		case "turret":
		case "building":
		case "wall":
			return { show: true, percent: hit.health, color: "#ffcc00" };
		case "ore_deposit":
			return { show: true, percent: hit.health, color: "#88ccff" };
		case "material_cube":
			return null;
		default:
			return null;
	}
}

/**
 * Set the player's current gameplay mode. Affects crosshair behavior.
 *
 * @param mode - The new player mode.
 */
export function setPlayerMode(mode: PlayerMode): void {
	currentMode = mode;
}

/**
 * Get the current player mode.
 *
 * @returns The active player mode.
 */
export function getPlayerMode(): PlayerMode {
	return currentMode;
}

/**
 * Get the reticle hex color for a given crosshair style.
 *
 * @param style - The crosshair style.
 * @returns Hex color string.
 */
export function getReticleColor(style: CrosshairStyle): string {
	return RETICLE_COLORS[style];
}

/**
 * Reset all crosshair driver state to defaults. For testing.
 */
export function reset(): void {
	currentMode = "explore";
}
