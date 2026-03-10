/**
 * Environment hazards system — world hazards that spawn, persist, and expire.
 *
 * Hazard types: radiation_zone, toxic_spill, unstable_ground,
 * magnetic_anomaly, scrap_storm. Each hazard occupies a circular area
 * in the world with configurable radius, intensity, and duration.
 *
 * Effects are queried by external systems:
 * - radiation_zone: damages bots in the zone each tick
 * - toxic_spill: slows movement for bots inside
 * - unstable_ground: damages buildings each tick
 * - magnetic_anomaly: scrambles navigation for bots inside
 * - scrap_storm: damages bots + buildings, drops random resources
 *
 * Uses a seeded PRNG for deterministic spawning in tests.
 *
 * All tunables sourced from config/environmentHazards.json.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HazardType =
	| "radiation_zone"
	| "toxic_spill"
	| "unstable_ground"
	| "magnetic_anomaly"
	| "scrap_storm";

export interface Position {
	x: number;
	y: number;
	z: number;
}

export interface Hazard {
	id: string;
	type: HazardType;
	position: Position;
	radius: number;
	intensity: number;
	duration: number;
	ticksRemaining: number;
}

export interface HazardEffect {
	damagePerTick: number;
	movementModifier: number;
	buildingDamagePerTick: number;
	navigationScramble: boolean;
	dropsResources: boolean;
}

export interface ResourceDropEvent {
	hazardId: string;
	resourceType: string;
	position: Position;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const hazardConfig = config.environmentHazards;
const SPAWN_INTERVAL = hazardConfig.spawnIntervalTicks;
const MAX_ACTIVE = hazardConfig.maxActiveHazards;
const SPAWN_CHANCE = hazardConfig.spawnChancePerInterval;
const WORLD_MIN = hazardConfig.worldBoundsMin;
const WORLD_MAX = hazardConfig.worldBoundsMax;

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

let rngSeed = 42;
let rngState = 42;

function mulberry32(): number {
	let t = (rngState += 0x6d2b79f5);
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Set the RNG seed for deterministic behavior. Resets internal state.
 */
export function setRngSeed(seed: number): void {
	rngSeed = seed;
	rngState = seed;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let activeHazards: Hazard[] = [];
let nextHazardId = 1;
let pendingResourceDrops: ResourceDropEvent[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist3d(a: Position, b: Position): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function dist2d(a: Position, b: Position): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

function getHazardTypeConfig(type: HazardType) {
	return hazardConfig.hazardTypes[type];
}

function randomPosition(): Position {
	const range = WORLD_MAX - WORLD_MIN;
	return {
		x: WORLD_MIN + mulberry32() * range,
		y: 0,
		z: WORLD_MIN + mulberry32() * range,
	};
}

function pickRandomHazardType(): HazardType {
	const types: HazardType[] = [
		"radiation_zone",
		"toxic_spill",
		"unstable_ground",
		"magnetic_anomaly",
		"scrap_storm",
	];
	const idx = Math.floor(mulberry32() * types.length);
	return types[idx];
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Manually spawn a hazard at a specific position.
 * Returns the created hazard.
 */
export function spawnHazard(
	type: HazardType,
	position: Position,
	radius: number,
	intensity: number,
	duration: number,
): Hazard {
	const hazard: Hazard = {
		id: `hazard_${nextHazardId++}`,
		type,
		position: { ...position },
		radius,
		intensity,
		duration,
		ticksRemaining: duration,
	};
	activeHazards.push(hazard);
	return hazard;
}

/**
 * Get all active hazards.
 */
export function getActiveHazards(): readonly Hazard[] {
	return activeHazards;
}

/**
 * Get all hazards whose area overlaps a circle at (pos, radius).
 * Uses 2D distance (XZ plane) for spatial query.
 */
export function getHazardsNearPosition(
	pos: Position,
	radius: number,
): Hazard[] {
	return activeHazards.filter((h) => {
		const d = dist2d(pos, h.position);
		return d <= h.radius + radius;
	});
}

/**
 * Check if a position is safe (not inside any active hazard).
 * Uses 2D distance — a position is unsafe if within any hazard's radius.
 */
export function isPositionSafe(pos: Position): boolean {
	for (const h of activeHazards) {
		if (dist2d(pos, h.position) <= h.radius) {
			return false;
		}
	}
	return true;
}

/**
 * Get the combined effect modifiers at a position from all overlapping hazards.
 * Damage stacks additively. Movement modifier uses the slowest (minimum).
 * Navigation scramble is true if any hazard scrambles.
 */
export function getEffectsAtPosition(pos: Position): HazardEffect {
	const result: HazardEffect = {
		damagePerTick: 0,
		movementModifier: 1.0,
		buildingDamagePerTick: 0,
		navigationScramble: false,
		dropsResources: false,
	};

	for (const h of activeHazards) {
		if (dist2d(pos, h.position) > h.radius) continue;

		const tc = getHazardTypeConfig(h.type);
		result.damagePerTick += tc.damagePerTick * h.intensity;
		result.movementModifier = Math.min(
			result.movementModifier,
			tc.movementModifier,
		);
		result.buildingDamagePerTick += tc.buildingDamagePerTick * h.intensity;
		if (tc.navigationScramble) result.navigationScramble = true;
		if (tc.dropsResources) result.dropsResources = true;
	}

	return result;
}

/**
 * Get resource drop events since last call. Drains the queue.
 */
export function getResourceDropEvents(): ResourceDropEvent[] {
	const events = pendingResourceDrops;
	pendingResourceDrops = [];
	return events;
}

/**
 * Remove a specific hazard by ID (e.g. player cleans it up).
 */
export function removeHazard(id: string): boolean {
	const idx = activeHazards.findIndex((h) => h.id === id);
	if (idx === -1) return false;
	activeHazards.splice(idx, 1);
	return true;
}

/**
 * Advance the environment hazard system by one tick.
 *
 * - Decrements ticksRemaining on all active hazards.
 * - Removes expired hazards.
 * - Spawns new hazards at configured intervals (seeded RNG).
 * - Generates resource drop events for scrap_storm hazards.
 */
export function environmentHazardSystem(currentTick: number): void {
	// Tick down active hazards
	for (const h of activeHazards) {
		h.ticksRemaining--;
	}

	// Generate resource drops for scrap_storm hazards
	for (const h of activeHazards) {
		if (h.type !== "scrap_storm" || h.ticksRemaining <= 0) continue;
		const tc = getHazardTypeConfig("scrap_storm");
		if ("resourceDropChance" in tc && "resourceDropTypes" in tc) {
			const dropChance =
				(tc as { resourceDropChance: number }).resourceDropChance *
				h.intensity;
			if (mulberry32() < dropChance) {
				const dropTypes = (
					tc as { resourceDropTypes: string[] }
				).resourceDropTypes;
				const resType =
					dropTypes[Math.floor(mulberry32() * dropTypes.length)];
				const dropPos: Position = {
					x:
						h.position.x +
						(mulberry32() - 0.5) * 2 * h.radius,
					y: 0,
					z:
						h.position.z +
						(mulberry32() - 0.5) * 2 * h.radius,
				};
				pendingResourceDrops.push({
					hazardId: h.id,
					resourceType: resType,
					position: dropPos,
				});
			}
		}
	}

	// Remove expired hazards
	activeHazards = activeHazards.filter((h) => h.ticksRemaining > 0);

	// Periodic spawning
	if (
		currentTick > 0 &&
		currentTick % SPAWN_INTERVAL === 0 &&
		activeHazards.length < MAX_ACTIVE
	) {
		if (mulberry32() < SPAWN_CHANCE) {
			const type = pickRandomHazardType();
			const tc = getHazardTypeConfig(type);
			const pos = randomPosition();
			spawnHazard(
				type,
				pos,
				tc.defaultRadius,
				tc.defaultIntensity,
				tc.defaultDurationTicks,
			);
		}
	}
}

/**
 * Reset all hazard state. For tests and world reset.
 */
export function resetEnvironmentHazards(): void {
	activeHazards = [];
	nextHazardId = 1;
	pendingResourceDrops = [];
	rngState = rngSeed;
}
