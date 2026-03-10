/**
 * Player entity system — manages the player bot as a coherent entity.
 *
 * Tracks health, equipment, powder storage, movement, and death/respawn
 * as a single unified state. Bridges the gap between camera, inventory,
 * physics, and HUD systems by providing the canonical player state.
 *
 * Config references:
 *   - config/combat.json — base health values
 *   - config/mining.json — powder capacity
 *   - config/units.json  — bot type definitions
 */

import combatConfig from "../../config/combat.json";
import miningConfig from "../../config/mining.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Equipment installed in a slot on the player bot. */
export interface EquipmentSlot {
	/** ID of the equipped item, or null if empty. */
	itemId: string | null;
	/** Display name of the equipped item. */
	itemName: string;
	/** Equipment tier: 0=none, 1=basic, 2=improved, 3=advanced. */
	tier: number;
	/** Remaining durability as a 0–1 fraction. */
	durability: number;
	/** Bonus stats granted by this equipment. */
	bonusStats: Record<string, number>;
}

/** Full player entity state. */
export interface PlayerState {
	entityId: string;
	faction: string;
	raceName: string;
	botName: string;

	// Health
	health: number;
	maxHealth: number;
	isDead: boolean;
	/** Seconds remaining until respawn; 0 when alive. */
	respawnTimer: number;

	// Position
	position: { x: number; y: number; z: number };
	yaw: number;
	pitch: number;

	// Equipment slots
	harvester: EquipmentSlot;
	grabber: EquipmentSlot;
	weapon: EquipmentSlot;
	armor: EquipmentSlot;

	// Powder storage
	powderCurrent: number;
	powderCapacity: number;
	/** The type of powder currently stored (empty string when none). */
	powderType: string;

	// Movement
	baseSpeed: number;
	/** Effective speed after terrain/weather/load modifiers. */
	currentSpeed: number;
	isMoving: boolean;
	isGrounded: boolean;

	// Carrying
	heldCubeId: string | null;

	// Progression
	level: number;
	experience: number;
}

/** Result returned from {@link takeDamage}. */
export interface DamageResult {
	finalDamage: number;
	healthRemaining: number;
	isDead: boolean;
	killedBy: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default base health when config doesn't specify. */
const DEFAULT_BASE_HEALTH = 100;

/** Default powder capacity when config doesn't specify. */
const DEFAULT_POWDER_CAPACITY = 100;

/** Default base movement speed (units/second). */
const DEFAULT_BASE_SPEED = 5.0;

/** Default respawn timer in seconds. */
const DEFAULT_RESPAWN_TIME = 5.0;

/** Speed reduction multiplier when carrying a cube. */
const CARRY_SPEED_PENALTY = 0.8;

/** Default spawn position. */
const DEFAULT_SPAWN: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an empty equipment slot. */
function emptySlot(): EquipmentSlot {
	return {
		itemId: null,
		itemName: "None",
		tier: 0,
		durability: 0,
		bonusStats: {},
	};
}

/** Create a starter tier-1 equipment slot. */
function starterSlot(id: string, name: string): EquipmentSlot {
	return {
		itemId: id,
		itemName: name,
		tier: 1,
		durability: 1,
		bonusStats: {},
	};
}

/** Generate a unique entity ID. */
let entityCounter = 0;
function generateId(): string {
	entityCounter += 1;
	return `player-${entityCounter}`;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let playerState: PlayerState | null = null;
let spawnPosition: { x: number; y: number; z: number } = { ...DEFAULT_SPAWN };

// ---------------------------------------------------------------------------
// Public API — Lifecycle
// ---------------------------------------------------------------------------

/**
 * Spawn the player bot with starter equipment.
 *
 * Creates a new player entity for the given faction and race at the
 * specified position. The player starts with a tier-1 harvester and
 * tier-1 grabber, no weapon, and no armor.
 *
 * @param faction  - faction identifier (e.g. "reclaimers")
 * @param raceName - race display name (e.g. "Reclaimer")
 * @param position - world position to spawn at
 * @returns the newly created PlayerState
 */
export function spawnPlayer(
	faction: string,
	raceName: string,
	position: { x: number; y: number; z: number } = { ...DEFAULT_SPAWN },
): PlayerState {
	const baseHealth =
		(combatConfig as Record<string, unknown>).baseHealth != null
			? Number((combatConfig as Record<string, unknown>).baseHealth)
			: DEFAULT_BASE_HEALTH;

	const powderCapacity =
		miningConfig?.powderCapacity ?? DEFAULT_POWDER_CAPACITY;

	const baseSpeed =
		(combatConfig as Record<string, unknown>).playerSpeed != null
			? Number((combatConfig as Record<string, unknown>).playerSpeed)
			: DEFAULT_BASE_SPEED;

	spawnPosition = { ...position };

	playerState = {
		entityId: generateId(),
		faction,
		raceName,
		botName: `${raceName}-Bot`,

		health: baseHealth,
		maxHealth: baseHealth,
		isDead: false,
		respawnTimer: 0,

		position: { ...position },
		yaw: 0,
		pitch: 0,

		harvester: starterSlot("harvester_t1", "Basic Harvester"),
		grabber: starterSlot("grabber_t1", "Basic Grabber"),
		weapon: emptySlot(),
		armor: emptySlot(),

		powderCurrent: 0,
		powderCapacity,
		powderType: "",

		baseSpeed,
		currentSpeed: baseSpeed,
		isMoving: false,
		isGrounded: true,

		heldCubeId: null,

		level: 1,
		experience: 0,
	};

	return { ...playerState };
}

// ---------------------------------------------------------------------------
// Public API — Health
// ---------------------------------------------------------------------------

/**
 * Apply damage to the player.
 *
 * Armor reduces incoming damage by `tier * 10%` (tier 1 = 10%,
 * tier 3 = 30%). If health falls to zero or below, the player dies
 * and the respawn timer starts.
 *
 * @param amount     - raw damage amount
 * @param sourceId   - identifier of the damage source
 * @param damageType - damage category string
 * @returns DamageResult with final values
 */
export function takeDamage(
	amount: number,
	sourceId: string = "unknown",
	_damageType: string = "kinetic",
): DamageResult {
	if (!playerState || playerState.isDead) {
		return { finalDamage: 0, healthRemaining: playerState?.health ?? 0, isDead: playerState?.isDead ?? true, killedBy: null };
	}

	// Armor reduces damage by tier * 10%
	const armorTier = playerState.armor.tier;
	const armorReduction = armorTier * 0.1; // 0%, 10%, 20%, 30%
	const finalDamage = Math.max(0, amount * (1 - armorReduction));

	playerState.health = Math.max(0, playerState.health - finalDamage);

	if (playerState.health <= 0) {
		playerState.isDead = true;
		playerState.respawnTimer = DEFAULT_RESPAWN_TIME;
		playerState.health = 0;

		return {
			finalDamage,
			healthRemaining: 0,
			isDead: true,
			killedBy: sourceId,
		};
	}

	return {
		finalDamage,
		healthRemaining: playerState.health,
		isDead: false,
		killedBy: null,
	};
}

/**
 * Heal the player by a given amount.
 *
 * Health is clamped to maxHealth. Cannot heal a dead player.
 *
 * @param amount - healing amount
 * @returns actual amount healed (may be less than requested)
 */
export function heal(amount: number): number {
	if (!playerState || playerState.isDead) return 0;
	if (amount <= 0) return 0;

	const before = playerState.health;
	playerState.health = Math.min(playerState.maxHealth, playerState.health + amount);
	return playerState.health - before;
}

/**
 * Check whether the player is alive.
 */
export function isAlive(): boolean {
	if (!playerState) return false;
	return !playerState.isDead;
}

// ---------------------------------------------------------------------------
// Public API — Respawn
// ---------------------------------------------------------------------------

/**
 * Update the respawn timer by the elapsed delta (seconds).
 *
 * When the timer reaches zero the player respawns: health resets to
 * max, position teleports to spawn, held cube is cleared, and the
 * dead flag is unset.
 *
 * @param delta - seconds elapsed since last update
 * @returns true if the player just respawned this frame
 */
export function updateRespawn(delta: number): boolean {
	if (!playerState || !playerState.isDead) return false;

	playerState.respawnTimer = Math.max(0, playerState.respawnTimer - delta);

	if (playerState.respawnTimer <= 0) {
		playerState.isDead = false;
		playerState.health = playerState.maxHealth;
		playerState.position = { ...spawnPosition };
		playerState.heldCubeId = null;
		playerState.respawnTimer = 0;
		return true;
	}

	return false;
}

// ---------------------------------------------------------------------------
// Public API — Powder storage
// ---------------------------------------------------------------------------

/**
 * Add powder to the player's storage.
 *
 * If the player already holds a different powder type, the addition
 * is rejected (returns 0) unless current storage is empty. Amount is
 * clamped to remaining capacity.
 *
 * @param type   - powder ore type (e.g. "iron", "copper")
 * @param amount - amount of powder to add
 * @returns actual amount of powder added
 */
export function addPowder(type: string, amount: number): number {
	if (!playerState) return 0;
	if (amount <= 0) return 0;

	// Reject if different type and storage is not empty
	if (playerState.powderType !== "" && playerState.powderType !== type && playerState.powderCurrent > 0) {
		return 0;
	}

	const space = playerState.powderCapacity - playerState.powderCurrent;
	const toAdd = Math.min(amount, space);

	if (toAdd <= 0) return 0;

	playerState.powderType = type;
	playerState.powderCurrent += toAdd;

	return toAdd;
}

/**
 * Remove powder from the player's storage (e.g. for compression).
 *
 * @param amount - amount to remove
 * @returns actual amount removed
 */
export function removePowder(amount: number): number {
	if (!playerState) return 0;
	if (amount <= 0) return 0;

	const toRemove = Math.min(amount, playerState.powderCurrent);
	playerState.powderCurrent -= toRemove;

	// Clear type when storage is empty
	if (playerState.powderCurrent <= 0) {
		playerState.powderCurrent = 0;
		playerState.powderType = "";
	}

	return toRemove;
}

// ---------------------------------------------------------------------------
// Public API — Equipment
// ---------------------------------------------------------------------------

/** Valid equipment slot names. */
export type EquipmentSlotName = "harvester" | "grabber" | "weapon" | "armor";

const VALID_SLOT_NAMES: ReadonlySet<string> = new Set([
	"harvester",
	"grabber",
	"weapon",
	"armor",
]);

/**
 * Equip an item into a named slot.
 *
 * Replaces any currently equipped item in that slot. The slot name
 * must be one of: harvester, grabber, weapon, armor.
 *
 * @param slot - target slot name
 * @param item - equipment to install
 * @returns true if the item was equipped successfully
 */
export function equipItem(
	slot: string,
	item: EquipmentSlot,
): boolean {
	if (!playerState) return false;
	if (!VALID_SLOT_NAMES.has(slot)) return false;

	playerState[slot as EquipmentSlotName] = { ...item };
	return true;
}

// ---------------------------------------------------------------------------
// Public API — Movement
// ---------------------------------------------------------------------------

/**
 * Recalculate the player's current movement speed.
 *
 * Multiplies baseSpeed by each modifier. Carrying a cube applies an
 * additional 20% speed reduction (× 0.8).
 *
 * @param terrainModifier  - speed factor from terrain type (1.0 = normal)
 * @param weatherModifier  - speed factor from weather conditions
 * @param carryingModifier - speed factor from carried weight
 * @returns the updated current speed
 */
export function updateMovementSpeed(
	terrainModifier: number = 1.0,
	weatherModifier: number = 1.0,
	carryingModifier: number = 1.0,
): number {
	if (!playerState) return 0;

	let speed = playerState.baseSpeed * terrainModifier * weatherModifier * carryingModifier;

	if (playerState.heldCubeId != null) {
		speed *= CARRY_SPEED_PENALTY;
	}

	playerState.currentSpeed = speed;
	return speed;
}

// ---------------------------------------------------------------------------
// Public API — Queries
// ---------------------------------------------------------------------------

/**
 * Get a snapshot of the current player state.
 *
 * Returns null if no player has been spawned.
 */
export function getPlayerState(): PlayerState | null {
	if (!playerState) return null;
	return { ...playerState };
}

// ---------------------------------------------------------------------------
// Public API — Mutators (for external systems)
// ---------------------------------------------------------------------------

/**
 * Update the player's position.
 */
export function setPosition(x: number, y: number, z: number): void {
	if (!playerState) return;
	playerState.position = { x, y, z };
}

/**
 * Update the player's facing direction.
 */
export function setRotation(yaw: number, pitch: number): void {
	if (!playerState) return;
	playerState.yaw = yaw;
	playerState.pitch = pitch;
}

/**
 * Set the held cube ID (or null to drop).
 */
export function setHeldCube(cubeId: string | null): void {
	if (!playerState) return;
	playerState.heldCubeId = cubeId;
}

/**
 * Set movement flag.
 */
export function setMoving(moving: boolean): void {
	if (!playerState) return;
	playerState.isMoving = moving;
}

/**
 * Set grounded flag.
 */
export function setGrounded(grounded: boolean): void {
	if (!playerState) return;
	playerState.isGrounded = grounded;
}

/**
 * Add experience points. Levels up at 100 XP per level.
 *
 * @param xp - experience points to add
 */
export function addExperience(xp: number): void {
	if (!playerState) return;
	if (xp <= 0) return;

	playerState.experience += xp;
	while (playerState.experience >= 100) {
		playerState.experience -= 100;
		playerState.level += 1;
	}
}

// ---------------------------------------------------------------------------
// Reset (testing & save/load)
// ---------------------------------------------------------------------------

/**
 * Reset all player entity state. For testing and save/load.
 */
export function reset(): void {
	playerState = null;
	spawnPosition = { ...DEFAULT_SPAWN };
	entityCounter = 0;
}
