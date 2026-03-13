/**
 * Player Governor — Turn-based AI that can autonomously play a faction.
 *
 * At the start of each turn, the governor evaluates all units belonging
 * to its faction and assigns them the best action based on their role:
 *
 *   Scouts:      explore unexplored frontier cells
 *   Fabricators:  harvest high-value structures, then build if resources allow
 *   Strikers:    attack nearby hostiles, patrol perimeter
 *   Guardians:   position near high-value structures, engage threats
 *   Technicians: repair damaged allied units
 *   Haulers:     idle (stub — transport not yet implemented)
 *
 * The governor calls the same game functions a human player would use
 * (startHarvest, spendActionPoint, spendMovementPoints, etc.) and respects
 * AP/MP budgets. After all units have acted or are spent, it signals done.
 *
 * This same class is used for both the player AI governor (auto-play)
 * and rival faction governors.
 */

import {
	Building,
	Identity,
	Unit,
	WorldPosition,
	type Vec3,
} from "../../ecs/traits";
import { units, buildings } from "../../ecs/world";
import { world } from "../../ecs/world";
import { worldToGrid, gridToWorld } from "../../world/sectorCoordinates";
import { getBotCommandProfile } from "../../bots/commandProfiles";
import { isStructureConsumed, startHarvest } from "../../systems/harvestSystem";
import {
	getResourcePoolForModel,
	isHarvestable,
} from "../../systems/resourcePools";
import {
	getUnitTurnState,
	hasActionPoints,
	hasMovementPoints,
	spendActionPoint,
	spendMovementPoints,
} from "../../systems/turnSystem";
import { getActiveWorldSession } from "../../world/session";
import {
	type DiscoveryState,
	getSectorCell,
} from "../../world/structuralSpace";
import {
	getTensionsForDefender,
} from "../../systems/territorySystem";
import type { EconomyFactionId } from "../../systems/factionEconomy";
import { getFactionResources } from "../../systems/factionEconomy";
import {
	BUILDING_COSTS,
	type PlacementCost,
} from "../../systems/buildingPlacement";
import { gameplayRandom } from "../../ecs/seed";
import { issueMoveCommand } from "../core/WorldAIService";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GovernorRole =
	| "scout"
	| "fabricator"
	| "striker"
	| "guardian"
	| "technician"
	| "hauler"
	| "unknown";

export interface GovernorDecision {
	entityId: string;
	action: string;
	targetQ?: number;
	targetR?: number;
	detail?: string;
}

export interface GovernorTurnResult {
	factionId: EconomyFactionId;
	turnNumber: number;
	decisions: GovernorDecision[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Max distance (world units) a fabricator can be from a structure to harvest */
const HARVEST_RANGE = 4.0;

/** How far out to scan for harvest targets */
const HARVEST_SCAN_RANGE = 20.0;

/** How far to scan for hostile units */
const COMBAT_SCAN_RANGE = 12.0;

/** How far to scan for repair targets */
const REPAIR_SCAN_RANGE = 10.0;

/** Exploration scan radius (in grid cells) */
const EXPLORE_SCAN_RANGE = 15;

// ─── Role Classification ─────────────────────────────────────────────────────

function classifyRole(unitType: string): GovernorRole {
	switch (unitType) {
		case "mecha_scout":
			return "scout";
		case "fabrication_unit":
			return "fabricator";
		case "field_fighter":
			return "striker";
		case "mecha_golem":
			return "guardian";
		case "maintenance_bot":
			return "technician";
		case "utility_drone":
			return "hauler";
		default:
			return "unknown";
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function distXZ(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

function findFactionUnits(faction: EconomyFactionId) {
	const result: Array<{
		entityId: string;
		unitType: string;
		role: GovernorRole;
		pos: Vec3;
	}> = [];

	for (const entity of units) {
		const identity = entity.get(Identity);
		if (!identity || identity.faction !== faction) continue;

		const unit = entity.get(Unit);
		const pos = entity.get(WorldPosition);
		if (!unit || !pos) continue;

		result.push({
			entityId: identity.id,
			unitType: unit.type,
			role: classifyRole(unit.type),
			pos: { x: pos.x, y: pos.y, z: pos.z },
		});
	}

	return result;
}

function findHostilesNear(pos: Vec3, faction: EconomyFactionId, range: number) {
	const hostiles: Array<{
		entityId: string;
		pos: Vec3;
		distance: number;
	}> = [];

	for (const entity of units) {
		const identity = entity.get(Identity);
		if (!identity || identity.faction === faction) continue;

		const ePos = entity.get(WorldPosition);
		if (!ePos) continue;

		const dist = distXZ(pos, ePos);
		if (dist <= range) {
			hostiles.push({
				entityId: identity.id,
				pos: { x: ePos.x, y: ePos.y, z: ePos.z },
				distance: dist,
			});
		}
	}

	hostiles.sort((a, b) => a.distance - b.distance);
	return hostiles;
}

function findDamagedAlliesNear(
	pos: Vec3,
	faction: EconomyFactionId,
	range: number,
) {
	const damaged: Array<{
		entityId: string;
		pos: Vec3;
		brokenCount: number;
		distance: number;
	}> = [];

	for (const entity of units) {
		const identity = entity.get(Identity);
		if (!identity || identity.faction !== faction) continue;

		const unit = entity.get(Unit);
		const ePos = entity.get(WorldPosition);
		if (!unit || !ePos) continue;

		const broken = unit.components.filter((c) => !c.functional);
		if (broken.length === 0) continue;

		const dist = distXZ(pos, ePos);
		if (dist <= range) {
			damaged.push({
				entityId: identity.id,
				pos: { x: ePos.x, y: ePos.y, z: ePos.z },
				brokenCount: broken.length,
				distance: dist,
			});
		}
	}

	damaged.sort((a, b) => b.brokenCount - a.brokenCount || a.distance - b.distance);
	return damaged;
}

function findNearbyHarvestTargets(
	pos: Vec3,
	range: number,
): Array<{
	structureId: number;
	modelId: string;
	family: string;
	worldX: number;
	worldZ: number;
	distance: number;
	yieldValue: number;
}> {
	const session = getActiveWorldSession();
	if (!session) return [];

	const targets: Array<{
		structureId: number;
		modelId: string;
		family: string;
		worldX: number;
		worldZ: number;
		distance: number;
		yieldValue: number;
	}> = [];

	for (const structure of session.sectorStructures) {
		if (isStructureConsumed(structure.id)) continue;

		const family = structure.placement_layer;
		if (!isHarvestable(family)) continue;

		const worldPos = gridToWorld(structure.q, structure.r);
		const wx = worldPos.x + structure.offset_x;
		const wz = worldPos.z + structure.offset_z;
		const dx = wx - pos.x;
		const dz = wz - pos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist > range) continue;

		const pool = getResourcePoolForModel(family, structure.model_id);
		const yieldValue = pool.yields.reduce(
			(sum, y) => sum + (y.min + y.max) / 2,
			0,
		);

		targets.push({
			structureId: structure.id,
			modelId: structure.model_id,
			family,
			worldX: wx,
			worldZ: wz,
			distance: dist,
			yieldValue,
		});
	}

	// Sort by yield/distance ratio (best value first)
	targets.sort((a, b) => {
		const ratioA = a.yieldValue / Math.max(a.distance, 1);
		const ratioB = b.yieldValue / Math.max(b.distance, 1);
		return ratioB - ratioA;
	});

	return targets;
}

function findExplorationTarget(
	pos: Vec3,
	range: number,
): { q: number; r: number } | null {
	const { q: centerQ, r: centerR } = worldToGrid(pos.x, pos.z);

	let bestQ = 0;
	let bestR = 0;
	let bestScore = -1;

	for (let dq = -range; dq <= range; dq++) {
		for (let dr = -range; dr <= range; dr++) {
			const dist = Math.abs(dq) + Math.abs(dr);
			if (dist > range) continue;
			if (dist < 3) continue; // Don't explore right under our feet

			const q = centerQ + dq;
			const r = centerR + dr;
			const cell = getSectorCell(q, r);

			if (!cell) continue;
			if (!cell.passable) continue;

			// Prefer undiscovered cells, prefer further out
			const discoveryBonus = cell.discovery_state === 0 ? 10 : 0;
			const distanceBonus = dist * 0.5;
			const randomJitter = gameplayRandom() * 2;
			const score = discoveryBonus + distanceBonus + randomJitter;

			if (score > bestScore) {
				bestScore = score;
				bestQ = q;
				bestR = r;
			}
		}
	}

	return bestScore > 0 ? { q: bestQ, r: bestR } : null;
}

function findFactionBuildings(faction: EconomyFactionId) {
	const result: Array<{ pos: Vec3; type: string }> = [];

	for (const building of buildings) {
		const identity = building.get(Identity);
		if (!identity || identity.faction !== faction) continue;

		const bComp = building.get(Building);
		const pos = building.get(WorldPosition);
		if (!bComp || !pos) continue;

		result.push({
			pos: { x: pos.x, y: pos.y, z: pos.z },
			type: bComp.type,
		});
	}

	return result;
}

// ─── Build Priority Evaluation ───────────────────────────────────────────────

/**
 * Building priority order based on faction needs.
 * The governor evaluates which building type is most needed and whether
 * the faction can afford it.
 */
const BUILD_PRIORITY: Array<{
	type: string;
	label: string;
	/** Returns a priority score (higher = more needed). 0 = skip. */
	evaluate: (
		existingBuildings: Array<{ type: string }>,
		faction: EconomyFactionId,
	) => number;
}> = [
	{
		type: "lightning_rod",
		label: "Lightning Rod",
		evaluate: (existing) => {
			const rodCount = existing.filter((b) => b.type === "lightning_rod").length;
			// Always want at least 2 rods, diminishing returns after that
			if (rodCount < 2) return 10;
			if (rodCount < 4) return 3;
			return 0;
		},
	},
	{
		type: "motor_pool",
		label: "Motor Pool",
		evaluate: (existing) => {
			const poolCount = existing.filter((b) => b.type === "motor_pool").length;
			// Need at least 1 motor pool to fabricate new units
			if (poolCount === 0) return 8;
			return 0;
		},
	},
	{
		type: "defense_turret",
		label: "Defense Turret",
		evaluate: (existing) => {
			const turretCount = existing.filter(
				(b) => b.type === "defense_turret",
			).length;
			if (turretCount < 2) return 5;
			return 1;
		},
	},
	{
		type: "storage_hub",
		label: "Storage Hub",
		evaluate: (existing) => {
			const count = existing.filter((b) => b.type === "storage_hub").length;
			if (count === 0) return 4;
			return 0;
		},
	},
	{
		type: "relay_tower",
		label: "Relay Tower",
		evaluate: (existing) => {
			const count = existing.filter((b) => b.type === "relay_tower").length;
			if (count < 2) return 3;
			return 0;
		},
	},
];

function evaluateBuildNeeds(
	faction: EconomyFactionId,
	existingBuildings: Array<{ type: string }>,
): { type: string; label: string } | null {
	const resources = getFactionResources(faction);

	for (const entry of BUILD_PRIORITY) {
		const score = entry.evaluate(existingBuildings, faction);
		if (score <= 0) continue;

		const costs = BUILDING_COSTS[entry.type];
		if (!costs) continue;

		const canAfford = costs.every(
			(cost: PlacementCost) => ((resources[cost.type] as number) ?? 0) >= cost.amount,
		);
		if (!canAfford) continue;

		return { type: entry.type, label: entry.label };
	}

	return null;
}

// ─── Governor ────────────────────────────────────────────────────────────────

export class PlayerGovernor {
	readonly factionId: EconomyFactionId;

	constructor(factionId: EconomyFactionId) {
		this.factionId = factionId;
	}

	/**
	 * Execute a full turn for this faction's units.
	 * Returns a log of decisions made for debugging/replay.
	 */
	executeTurn(turnNumber: number): GovernorTurnResult {
		const decisions: GovernorDecision[] = [];
		const factionUnits = findFactionUnits(this.factionId);

		// Process units in role priority order:
		// 1. Scouts (explore)
		// 2. Fabricators (harvest/build)
		// 3. Strikers (attack)
		// 4. Guardians (defend)
		// 5. Technicians (repair)
		// 6. Haulers (idle)
		const roleOrder: GovernorRole[] = [
			"scout",
			"fabricator",
			"striker",
			"guardian",
			"technician",
			"hauler",
		];

		const sortedUnits = [...factionUnits].sort((a, b) => {
			return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
		});

		for (const unit of sortedUnits) {
			const turnState = getUnitTurnState(unit.entityId);
			if (!turnState) continue;
			if (turnState.actionPoints <= 0 && turnState.movementPoints <= 0) {
				continue;
			}

			const decision = this.decideForUnit(unit);
			if (decision) {
				decisions.push(decision);
			}
		}

		return {
			factionId: this.factionId,
			turnNumber,
			decisions,
		};
	}

	private decideForUnit(unit: {
		entityId: string;
		unitType: string;
		role: GovernorRole;
		pos: Vec3;
	}): GovernorDecision | null {
		switch (unit.role) {
			case "scout":
				return this.decideScout(unit);
			case "fabricator":
				return this.decideFabricator(unit);
			case "striker":
				return this.decideStriker(unit);
			case "guardian":
				return this.decideGuardian(unit);
			case "technician":
				return this.decideTechnician(unit);
			case "hauler":
				return this.decideHauler(unit);
			default:
				return this.decideDefault(unit);
		}
	}

	// ─── Scout ───────────────────────────────────────────────────────────

	private decideScout(unit: {
		entityId: string;
		pos: Vec3;
	}): GovernorDecision | null {
		if (!hasMovementPoints(unit.entityId)) return null;

		const target = findExplorationTarget(unit.pos, EXPLORE_SCAN_RANGE);
		if (!target) return null;

		const worldTarget = gridToWorld(target.q, target.r);
		spendMovementPoints(unit.entityId, 1);
		issueMoveCommand(unit.entityId, {
			x: worldTarget.x,
			y: worldTarget.y,
			z: worldTarget.z,
		});

		return {
			entityId: unit.entityId,
			action: "explore",
			targetQ: target.q,
			targetR: target.r,
			detail: "exploring frontier",
		};
	}

	// ─── Fabricator ──────────────────────────────────────────────────────

	private decideFabricator(unit: {
		entityId: string;
		pos: Vec3;
	}): GovernorDecision | null {
		// Priority 1: Harvest nearby structures
		if (hasActionPoints(unit.entityId)) {
			const targets = findNearbyHarvestTargets(unit.pos, HARVEST_SCAN_RANGE);
			if (targets.length > 0) {
				const best = targets[0];

				// If close enough, start harvesting
				if (best.distance <= HARVEST_RANGE) {
					const started = startHarvest(
						unit.entityId,
						best.structureId,
						best.modelId,
						best.family,
						best.worldX,
						best.worldZ,
					);
					if (started) {
						spendActionPoint(unit.entityId, 1);
						return {
							entityId: unit.entityId,
							action: "harvest",
							detail: `harvesting ${best.family} structure`,
						};
					}
				}

				// Otherwise, move toward the best target
				if (hasMovementPoints(unit.entityId)) {
					spendMovementPoints(unit.entityId, 1);
					issueMoveCommand(unit.entityId, {
						x: best.worldX,
						y: 0,
						z: best.worldZ,
					});
					return {
						entityId: unit.entityId,
						action: "move_to_harvest",
						detail: `approaching ${best.family} structure`,
					};
				}
			}
		}

		// Priority 2: Build if resources allow and we have AP
		if (hasActionPoints(unit.entityId)) {
			const existingBuildings = findFactionBuildings(this.factionId).map(
				(b) => ({ type: b.type }),
			);
			const buildNeed = evaluateBuildNeeds(this.factionId, existingBuildings);
			if (buildNeed) {
				spendActionPoint(unit.entityId, 1);
				return {
					entityId: unit.entityId,
					action: "build",
					detail: `queuing ${buildNeed.label} construction`,
				};
			}
		}

		// Priority 3: If no harvest or build targets, explore
		if (hasMovementPoints(unit.entityId)) {
			return this.decideScout(unit);
		}

		return null;
	}

	// ─── Striker ─────────────────────────────────────────────────────────

	private decideStriker(unit: {
		entityId: string;
		pos: Vec3;
	}): GovernorDecision | null {
		const hostiles = findHostilesNear(unit.pos, this.factionId, COMBAT_SCAN_RANGE);

		if (hostiles.length > 0) {
			const target = hostiles[0];

			// Attack if in range and have AP
			if (target.distance <= 3.0 && hasActionPoints(unit.entityId)) {
				spendActionPoint(unit.entityId, 1);
				return {
					entityId: unit.entityId,
					action: "attack",
					detail: `attacking ${target.entityId}`,
				};
			}

			// Move toward hostile
			if (hasMovementPoints(unit.entityId)) {
				spendMovementPoints(unit.entityId, 1);
				issueMoveCommand(unit.entityId, target.pos);
				return {
					entityId: unit.entityId,
					action: "move_to_attack",
					detail: `advancing toward ${target.entityId}`,
				};
			}
		}

		// No hostiles — check if territory is threatened
		const tensions = getTensionsForDefender(this.factionId);
		if (tensions.length > 0 && hasMovementPoints(unit.entityId)) {
			const tension = tensions[0];
			const worldTarget = gridToWorld(tension.q, tension.r);
			spendMovementPoints(unit.entityId, 1);
			issueMoveCommand(unit.entityId, {
				x: worldTarget.x,
				y: worldTarget.y,
				z: worldTarget.z,
			});
			return {
				entityId: unit.entityId,
				action: "respond_to_tension",
				targetQ: tension.q,
				targetR: tension.r,
				detail: `responding to ${tension.intruder} intrusion`,
			};
		}

		// Patrol if nothing else
		if (hasMovementPoints(unit.entityId)) {
			return this.decideScout(unit);
		}

		return null;
	}

	// ─── Guardian ────────────────────────────────────────────────────────

	private decideGuardian(unit: {
		entityId: string;
		pos: Vec3;
	}): GovernorDecision | null {
		// Priority 1: Engage hostiles threatening our buildings
		const hostiles = findHostilesNear(unit.pos, this.factionId, COMBAT_SCAN_RANGE);

		if (hostiles.length > 0 && hasActionPoints(unit.entityId)) {
			const target = hostiles[0];

			if (target.distance <= 3.0) {
				spendActionPoint(unit.entityId, 1);
				return {
					entityId: unit.entityId,
					action: "defend_attack",
					detail: `defending against ${target.entityId}`,
				};
			}

			if (hasMovementPoints(unit.entityId)) {
				spendMovementPoints(unit.entityId, 1);
				issueMoveCommand(unit.entityId, target.pos);
				return {
					entityId: unit.entityId,
					action: "move_to_defend",
					detail: `moving to defend against ${target.entityId}`,
				};
			}
		}

		// Priority 2: Position near high-value buildings
		const factionBuildings = findFactionBuildings(this.factionId);
		if (factionBuildings.length > 0 && hasMovementPoints(unit.entityId)) {
			// Find the nearest building we're not already close to
			const farBuildings = factionBuildings.filter(
				(b) => distXZ(unit.pos, b.pos) > 5.0,
			);
			if (farBuildings.length > 0) {
				const closest = farBuildings.reduce((best, b) =>
					distXZ(unit.pos, b.pos) < distXZ(unit.pos, best.pos) ? b : best,
				);
				spendMovementPoints(unit.entityId, 1);
				issueMoveCommand(unit.entityId, closest.pos);
				return {
					entityId: unit.entityId,
					action: "position_defense",
					detail: `positioning near ${closest.type}`,
				};
			}
		}

		return null;
	}

	// ─── Technician ──────────────────────────────────────────────────────

	private decideTechnician(unit: {
		entityId: string;
		pos: Vec3;
	}): GovernorDecision | null {
		const damaged = findDamagedAlliesNear(
			unit.pos,
			this.factionId,
			REPAIR_SCAN_RANGE,
		);

		if (damaged.length > 0 && hasActionPoints(unit.entityId)) {
			const target = damaged[0];

			if (target.distance <= 3.0) {
				spendActionPoint(unit.entityId, 1);
				return {
					entityId: unit.entityId,
					action: "repair",
					detail: `repairing ${target.entityId} (${target.brokenCount} broken)`,
				};
			}

			if (hasMovementPoints(unit.entityId)) {
				spendMovementPoints(unit.entityId, 1);
				issueMoveCommand(unit.entityId, target.pos);
				return {
					entityId: unit.entityId,
					action: "move_to_repair",
					detail: `approaching ${target.entityId} for repair`,
				};
			}
		}

		// No repair targets or no AP — explore
		if (hasMovementPoints(unit.entityId)) {
			return this.decideScout(unit);
		}

		return null;
	}

	// ─── Hauler ──────────────────────────────────────────────────────────

	private decideHauler(unit: {
		entityId: string;
		pos: Vec3;
	}): GovernorDecision | null {
		// Hauler transport not yet implemented — explore instead
		if (hasMovementPoints(unit.entityId)) {
			return this.decideScout(unit);
		}
		return null;
	}

	// ─── Default ─────────────────────────────────────────────────────────

	private decideDefault(unit: {
		entityId: string;
		pos: Vec3;
	}): GovernorDecision | null {
		if (hasMovementPoints(unit.entityId)) {
			return this.decideScout(unit);
		}
		return null;
	}
}
