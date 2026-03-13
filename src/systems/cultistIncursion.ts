/**
 * Cultist Incursion System — barbarian-pressure spawning and behavior.
 *
 * Cultists are NOT a symmetric 4X faction. They are destructive pressure:
 * - Spawn at breach zones every N turns
 * - Move toward nearest faction structures
 * - Attack on contact, prefer high-value targets (Motor Pool, power)
 * - Do NOT harvest, build, or hold territory
 * - Spawn frequency and strength scale with player territory size
 *
 * Storm interactions (Task #31):
 * - Cultists take 50% less weather damage
 * - Can call down lightning (2 AP, area damage) near breach zones
 * - Can sense machines through fog within 5 cells of a breach zone
 */

import { createBotUnitState } from "../bots";
import { gameplayRandom } from "../ecs/seed";
import {
	AIController,
	Building,
	Identity,
	MapFragment,
	Navigation,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { buildings, units, world } from "../ecs/world";
import { gridToWorld } from "../world/sectorCoordinates";
import { getBreachZones, type BreachZone } from "./breachZones";
import { getTurnState } from "./turnSystem";
import { getWeatherSnapshot } from "./weather";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CultistSpawnEvent {
	breachZoneId: string;
	entityId: string;
	q: number;
	r: number;
	turnNumber: number;
}

export interface CultistAttackEvent {
	attackerId: string;
	targetId: string;
	targetType: "building" | "unit";
	damage: number;
	turnNumber: number;
}

export type CultistTier = "acolyte" | "zealot" | "conduit";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Turns between cultist waves at base escalation */
const BASE_SPAWN_INTERVAL = 5;
/** Minimum turns between waves at max escalation */
const MIN_SPAWN_INTERVAL = 2;
/** Max cultists per wave at base escalation */
const BASE_WAVE_SIZE = 1;
/** Max cultists per wave at max escalation */
const MAX_WAVE_SIZE = 4;
/** Territory cell count that triggers maximum escalation */
const MAX_ESCALATION_TERRITORY = 80;
/** Range at which cultists attack structures */
const CULTIST_ATTACK_RANGE = 2.5;
/** Range at which cultists move toward targets */
const CULTIST_AGGRO_RANGE = 15;
/** Cultist weather damage reduction */
const WEATHER_DAMAGE_REDUCTION = 0.5;
/** Lightning call AP cost */
const LIGHTNING_CALL_AP = 2;
/** Lightning call area damage radius (grid cells) */
const LIGHTNING_CALL_RADIUS = 3;
/** Fog sense range from breach zones (grid cells) */
const BREACH_FOG_SENSE_RANGE = 5;
/** Maximum total cultists alive at once */
const MAX_TOTAL_CULTISTS = 12;

// ─── Module State ─────────────────────────────────────────────────────────────

let nextCultistId = 0;
let lastSpawnTurn = 0;
let lastSpawnEvents: CultistSpawnEvent[] = [];
let lastAttackEvents: CultistAttackEvent[] = [];
let totalTerritorySize = 0;

// ─── Escalation ───────────────────────────────────────────────────────────────

/**
 * Set the player's current territory size for escalation calculations.
 * Should be called each turn before the cultist system runs.
 */
export function setTerritorySize(size: number) {
	totalTerritorySize = size;
}

/**
 * Get the escalation factor [0, 1] based on territory size.
 * 0 = minimum pressure, 1 = maximum pressure.
 */
export function getEscalationFactor(): number {
	return Math.min(1, totalTerritorySize / MAX_ESCALATION_TERRITORY);
}

/**
 * Get the current spawn interval in turns.
 * Decreases from BASE_SPAWN_INTERVAL to MIN_SPAWN_INTERVAL as escalation rises.
 */
export function getSpawnInterval(): number {
	const factor = getEscalationFactor();
	return Math.round(
		BASE_SPAWN_INTERVAL -
			factor * (BASE_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL),
	);
}

/**
 * Get the wave size for the current escalation level.
 */
export function getWaveSize(): number {
	const factor = getEscalationFactor();
	return Math.round(
		BASE_WAVE_SIZE + factor * (MAX_WAVE_SIZE - BASE_WAVE_SIZE),
	);
}

/**
 * Determine cultist tier based on escalation and randomness.
 */
function rollCultistTier(): CultistTier {
	const factor = getEscalationFactor();
	const roll = gameplayRandom();

	// Higher escalation = higher chance of stronger tiers
	if (roll < 0.1 + factor * 0.2) return "conduit";
	if (roll < 0.3 + factor * 0.3) return "zealot";
	return "acolyte";
}

// ─── Tier Stats ───────────────────────────────────────────────────────────────

function getTierSpeed(tier: CultistTier): number {
	switch (tier) {
		case "acolyte":
			return 2.5;
		case "zealot":
			return 3.0;
		case "conduit":
			return 2.0;
	}
}

function getTierDisplayName(tier: CultistTier, id: string): string {
	const suffix = id.slice(-2).toUpperCase();
	switch (tier) {
		case "acolyte":
			return `Cult Acolyte ${suffix}`;
		case "zealot":
			return `Cult Zealot ${suffix}`;
		case "conduit":
			return `Cult Conduit ${suffix}`;
	}
}

function getTierComponents(tier: CultistTier) {
	switch (tier) {
		case "acolyte":
			return [
				{ name: "legs", functional: true, material: "metal" as const },
				{ name: "arms", functional: true, material: "metal" as const },
				{
					name: "power_cell",
					functional: true,
					material: "electronic" as const,
				},
			];
		case "zealot":
			return [
				{ name: "legs", functional: true, material: "metal" as const },
				{ name: "arms", functional: true, material: "metal" as const },
				{ name: "camera", functional: true, material: "electronic" as const },
				{
					name: "power_cell",
					functional: true,
					material: "electronic" as const,
				},
				{ name: "armor", functional: true, material: "metal" as const },
			];
		case "conduit":
			return [
				{ name: "legs", functional: true, material: "metal" as const },
				{ name: "arms", functional: true, material: "metal" as const },
				{ name: "camera", functional: true, material: "electronic" as const },
				{
					name: "power_cell",
					functional: true,
					material: "electronic" as const,
				},
				{ name: "armor", functional: true, material: "metal" as const },
				{
					name: "storm_relay",
					functional: true,
					material: "electronic" as const,
				},
			];
	}
}

// ─── Counting ─────────────────────────────────────────────────────────────────

function countCultists(): number {
	let count = 0;
	for (const unit of units) {
		if (unit.get(Identity)?.faction === "cultist") count++;
	}
	return count;
}

// ─── Spawning ─────────────────────────────────────────────────────────────────

/**
 * Pick a random breach zone for spawning, weighted toward primary zones.
 */
function pickSpawnZone(): BreachZone | null {
	const zones = getBreachZones();
	if (zones.length === 0) return null;

	// Primary zones are twice as likely to be chosen
	const weighted: BreachZone[] = [];
	for (const zone of zones) {
		weighted.push(zone);
		if (zone.isPrimary) weighted.push(zone);
	}

	const index = Math.floor(gameplayRandom() * weighted.length);
	return weighted[index];
}

/**
 * Spawn a single cultist at the given breach zone.
 */
function spawnCultist(
	zone: BreachZone,
	turnNumber: number,
): CultistSpawnEvent | null {
	// Pick a random cell within the breach zone cluster
	const cellIndex = Math.floor(gameplayRandom() * zone.cells.length);
	const cell = zone.cells[cellIndex];
	const worldPos = gridToWorld(cell.q, cell.r);

	const id = `cultist_${nextCultistId++}`;
	const tier = rollCultistTier();

	const entity = world.spawn(
		AIController,
		Identity,
		WorldPosition,
		MapFragment,
		Unit,
		Navigation,
	);

	entity.set(AIController, {
		role: "cultist",
		enabled: true,
		stateJson: JSON.stringify({
			tier,
			breachZoneId: zone.id,
			targetEntityId: null,
			state: "seeking",
		}),
	});
	entity.set(Identity, { id, faction: "cultist" as const });
	entity.set(WorldPosition, { x: worldPos.x, y: worldPos.y, z: worldPos.z });
	entity.set(MapFragment, { fragmentId: "" });
	entity.set(
		Unit,
		createBotUnitState({
			unitType: "mecha_trooper",
			displayName: getTierDisplayName(tier, id),
			speed: getTierSpeed(tier),
			components: getTierComponents(tier),
			identity: {
				archetypeId: "cult_conduit",
				speechProfile: "cult",
			},
		}),
	);
	entity.set(Navigation, { path: [], pathIndex: 0, moving: false });

	return {
		breachZoneId: zone.id,
		entityId: id,
		q: cell.q,
		r: cell.r,
		turnNumber,
	};
}

/**
 * Attempt to spawn a cultist wave. Called during the environment phase.
 */
export function spawnCultistWave(turnNumber: number): CultistSpawnEvent[] {
	const interval = getSpawnInterval();
	if (turnNumber - lastSpawnTurn < interval) return [];

	const currentCount = countCultists();
	if (currentCount >= MAX_TOTAL_CULTISTS) return [];

	const waveSize = Math.min(
		getWaveSize(),
		MAX_TOTAL_CULTISTS - currentCount,
	);
	const events: CultistSpawnEvent[] = [];

	for (let i = 0; i < waveSize; i++) {
		const zone = pickSpawnZone();
		if (!zone) break;

		const event = spawnCultist(zone, turnNumber);
		if (event) events.push(event);
	}

	if (events.length > 0) {
		lastSpawnTurn = turnNumber;
	}

	return events;
}

// ─── Behavior: Move Toward Structures ─────────────────────────────────────────

/** Priority weights for targeting structures */
const TARGET_PRIORITY: Record<string, number> = {
	motor_pool: 10,
	power_sink: 9,
	relay_tower: 8,
	fabrication_bay: 7,
	turret: 6,
	storage: 4,
	habitat: 3,
	wall: 1,
};

function getTargetPriority(buildingType: string): number {
	return TARGET_PRIORITY[buildingType] ?? 2;
}

interface CultistTarget {
	entityId: string;
	x: number;
	z: number;
	priority: number;
	distance: number;
}

/**
 * Find the best target for a cultist based on priority and distance.
 * Prefers high-value targets that are closer.
 */
function findBestTarget(
	cultistX: number,
	cultistZ: number,
): CultistTarget | null {
	const targets: CultistTarget[] = [];

	// Target buildings (primary objective — destroy structures)
	for (const building of buildings) {
		const pos = building.get(WorldPosition);
		const bld = building.get(Building);
		const identity = building.get(Identity);
		if (!pos || !bld || !identity) continue;
		// Only target non-cultist buildings
		if (identity.faction === "cultist") continue;

		const dx = pos.x - cultistX;
		const dz = pos.z - cultistZ;
		const distance = Math.sqrt(dx * dx + dz * dz);

		targets.push({
			entityId: identity.id,
			x: pos.x,
			z: pos.z,
			priority: getTargetPriority(bld.type),
			distance,
		});
	}

	// Also target player units if no buildings nearby
	if (targets.length === 0) {
		for (const unit of units) {
			const identity = unit.get(Identity);
			if (!identity || identity.faction !== "player") continue;
			const pos = unit.get(WorldPosition);
			if (!pos) continue;

			const dx = pos.x - cultistX;
			const dz = pos.z - cultistZ;
			const distance = Math.sqrt(dx * dx + dz * dz);

			if (distance <= CULTIST_AGGRO_RANGE) {
				targets.push({
					entityId: identity.id,
					x: pos.x,
					z: pos.z,
					priority: 5,
					distance,
				});
			}
		}
	}

	if (targets.length === 0) return null;

	// Score: priority / (1 + distance * 0.1) — close high-priority targets win
	targets.sort((a, b) => {
		const scoreA = a.priority / (1 + a.distance * 0.1);
		const scoreB = b.priority / (1 + b.distance * 0.1);
		return scoreB - scoreA;
	});

	return targets[0];
}

/**
 * Run cultist AI behavior for one turn.
 * Each cultist identifies its target and moves toward it.
 * If in melee range, attacks.
 */
export function cultistBehaviorTick(): CultistAttackEvent[] {
	const events: CultistAttackEvent[] = [];
	const turnNumber = getTurnState().turnNumber;

	for (const unit of units) {
		const identity = unit.get(Identity);
		if (!identity || identity.faction !== "cultist") continue;

		const pos = unit.get(WorldPosition);
		const unitData = unit.get(Unit);
		if (!pos || !unitData) continue;

		// Skip destroyed cultists
		if (unitData.components.every((c) => !c.functional)) continue;

		const target = findBestTarget(pos.x, pos.z);
		if (!target) continue;

		const dx = target.x - pos.x;
		const dz = target.z - pos.z;
		const distance = Math.sqrt(dx * dx + dz * dz);

		if (distance <= CULTIST_ATTACK_RANGE) {
			// Attack the target
			const event = attackTarget(identity.id, target, turnNumber);
			if (event) events.push(event);
		} else {
			// Move toward the target
			const moveSpeed = unitData.speed;
			const ratio = Math.min(1, moveSpeed / distance);
			pos.x += dx * ratio;
			pos.z += dz * ratio;
			unit.set(WorldPosition, { x: pos.x, y: pos.y, z: pos.z });
		}
	}

	return events;
}

function attackTarget(
	attackerId: string,
	target: CultistTarget,
	turnNumber: number,
): CultistAttackEvent | null {
	// Determine whether the target is a building or unit
	for (const building of buildings) {
		const identity = building.get(Identity);
		if (identity?.id === target.entityId) {
			const bld = building.get(Building);
			if (!bld) return null;

			// Damage a random functional component
			const functional = bld.components.filter((c) => c.functional);
			if (functional.length === 0) return null;

			const victim =
				functional[Math.floor(gameplayRandom() * functional.length)];
			victim.functional = false;

			// Check if all components broken
			if (bld.components.every((c) => !c.functional)) {
				bld.operational = false;
			}

			return {
				attackerId,
				targetId: target.entityId,
				targetType: "building",
				damage: 1,
				turnNumber,
			};
		}
	}

	// Try units
	for (const unit of units) {
		const identity = unit.get(Identity);
		if (identity?.id === target.entityId) {
			const unitData = unit.get(Unit);
			if (!unitData) return null;

			const functional = unitData.components.filter((c) => c.functional);
			if (functional.length === 0) return null;

			const victim =
				functional[Math.floor(gameplayRandom() * functional.length)];
			victim.functional = false;

			return {
				attackerId,
				targetId: target.entityId,
				targetType: "unit",
				damage: 1,
				turnNumber,
			};
		}
	}

	return null;
}

// ─── Storm Interaction ────────────────────────────────────────────────────────

/**
 * Get the cultist weather damage reduction factor.
 * Cultists take 50% less storm/weather damage.
 */
export function getCultistWeatherDamageReduction(): number {
	return WEATHER_DAMAGE_REDUCTION;
}

/**
 * Check if a cultist can call lightning this turn.
 * Requires: conduit tier, within 5 cells of a breach zone, storm active.
 */
export function canCallLightning(entityId: string): boolean {
	for (const unit of units) {
		const identity = unit.get(Identity);
		if (identity?.id !== entityId) continue;

		const controller = unit.get(AIController);
		if (!controller?.stateJson) return false;

		const state = JSON.parse(controller.stateJson);
		if (state.tier !== "conduit") return false;

		// Check storm activity
		const weather = getWeatherSnapshot();
		if (weather.cultistActivityMultiplier < 0.5) return false;

		// Check proximity to breach zone
		const pos = unit.get(WorldPosition);
		if (!pos) return false;

		const zones = getBreachZones();
		for (const zone of zones) {
			const worldPos = gridToWorld(zone.centerQ, zone.centerR);
			const dx = pos.x - worldPos.x;
			const dz = pos.z - worldPos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);
			// BREACH_FOG_SENSE_RANGE cells * lattice size (2)
			if (dist <= BREACH_FOG_SENSE_RANGE * 2) return true;
		}
	}
	return false;
}

/**
 * Execute a lightning call at a target position.
 * Damages all non-cultist entities within LIGHTNING_CALL_RADIUS.
 * Returns the number of entities damaged.
 */
export function callLightning(
	_callerId: string,
	targetQ: number,
	targetR: number,
): number {
	const targetWorld = gridToWorld(targetQ, targetR);
	const radiusWorld = LIGHTNING_CALL_RADIUS * 2; // Convert grid cells to world units
	let damaged = 0;

	// Damage buildings in radius
	for (const building of buildings) {
		const identity = building.get(Identity);
		if (identity?.faction === "cultist") continue;

		const pos = building.get(WorldPosition);
		if (!pos) continue;

		const dx = pos.x - targetWorld.x;
		const dz = pos.z - targetWorld.z;
		if (Math.sqrt(dx * dx + dz * dz) > radiusWorld) continue;

		const bld = building.get(Building);
		if (!bld) continue;

		const functional = bld.components.filter((c) => c.functional);
		if (functional.length === 0) continue;

		const victim =
			functional[Math.floor(gameplayRandom() * functional.length)];
		victim.functional = false;
		damaged++;
	}

	// Damage units in radius
	for (const unit of units) {
		const identity = unit.get(Identity);
		if (!identity || identity.faction === "cultist") continue;

		const pos = unit.get(WorldPosition);
		if (!pos) continue;

		const dx = pos.x - targetWorld.x;
		const dz = pos.z - targetWorld.z;
		if (Math.sqrt(dx * dx + dz * dz) > radiusWorld) continue;

		const unitData = unit.get(Unit);
		if (!unitData) continue;

		const functional = unitData.components.filter((c) => c.functional);
		if (functional.length === 0) continue;

		const victim =
			functional[Math.floor(gameplayRandom() * functional.length)];
		victim.functional = false;
		damaged++;
	}

	return damaged;
}

/**
 * Check if a position is within fog-sense range of a breach zone.
 * Cultists can detect machines through fog within this range.
 */
export function isWithinBreachFogSense(q: number, r: number): boolean {
	const zones = getBreachZones();
	for (const zone of zones) {
		const dq = q - zone.centerQ;
		const dr = r - zone.centerR;
		if (Math.sqrt(dq * dq + dr * dr) <= BREACH_FOG_SENSE_RANGE) return true;
	}
	return false;
}

// ─── Main System Tick ─────────────────────────────────────────────────────────

/**
 * Full cultist incursion system tick.
 * Called during the environment phase of each turn.
 *
 * 1. Check if it's time for a new wave
 * 2. Spawn cultists at breach zones
 * 3. Run cultist AI behavior (move + attack)
 * 4. Process conduit lightning calls
 */
export function cultistIncursionSystem(): {
	spawnEvents: CultistSpawnEvent[];
	attackEvents: CultistAttackEvent[];
} {
	const turnNumber = getTurnState().turnNumber;

	// Spawn phase
	const spawnEvents = spawnCultistWave(turnNumber);

	// Behavior phase — all cultists act
	const attackEvents = cultistBehaviorTick();

	// Conduit lightning calls
	for (const unit of units) {
		const identity = unit.get(Identity);
		if (!identity || identity.faction !== "cultist") continue;

		if (canCallLightning(identity.id)) {
			// Find best target for lightning near the conduit
			const pos = unit.get(WorldPosition);
			if (!pos) continue;

			const target = findBestTarget(pos.x, pos.z);
			if (!target) continue;

			// Only call lightning if target is within range
			const dx = target.x - pos.x;
			const dz = target.z - pos.z;
			if (Math.sqrt(dx * dx + dz * dz) <= LIGHTNING_CALL_RADIUS * 2) {
				const targetGrid = {
					q: Math.round(target.x / 2),
					r: Math.round(target.z / 2),
				};
				callLightning(identity.id, targetGrid.q, targetGrid.r);
			}
		}
	}

	lastSpawnEvents = spawnEvents;
	lastAttackEvents = attackEvents;

	return { spawnEvents, attackEvents };
}

// ─── Query API ────────────────────────────────────────────────────────────────

export function getLastSpawnEvents(): readonly CultistSpawnEvent[] {
	return lastSpawnEvents;
}

export function getLastAttackEvents(): readonly CultistAttackEvent[] {
	return lastAttackEvents;
}

// ─── Reset ────────────────────────────────────────────────────────────────────

export function resetCultistIncursion() {
	nextCultistId = 0;
	lastSpawnTurn = 0;
	lastSpawnEvents = [];
	lastAttackEvents = [];
	totalTerritorySize = 0;
}
