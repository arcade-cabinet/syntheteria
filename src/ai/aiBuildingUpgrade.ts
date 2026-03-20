/**
 * AI building upgrade logic — evaluates and initiates building tier upgrades.
 * Called during the AI turn after other building decisions.
 *
 * Priority order for upgrades mirrors the economy chain:
 * motor_pool > synthesizer > storm_transmitter > relay_tower > defense_turret > others
 */

import type { World } from "koota";
import { BUILDING_UNLOCK_CHAINS } from "../config";
import { startBuildingUpgrade } from "../systems";
import { getBuildingUpgradeJob } from "../systems/buildingUpgradeSystem";
import { Board, Building } from "../traits";
import { isCultFactionId } from "./aiHelpers";

const UPGRADE_PRIORITY: readonly string[] = [
	"motor_pool",
	"synthesizer",
	"storm_transmitter",
	"relay_tower",
	"defense_turret",
	"analysis_node",
	"maintenance_bay",
];

/**
 * Evaluate and initiate building tier upgrades for an AI faction.
 * Upgrades ALL eligible buildings each turn (not just one).
 */
export function aiConsiderBuildingUpgrades(
	world: World,
	factionId: string,
): void {
	if (factionId === "player") return;
	if (isCultFactionId(factionId)) return;

	let currentTurn = 1;
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) {
			currentTurn = b.turn;
			break;
		}
	}

	// Compute highest building tier across ALL factions (global clock)
	let highestBuildingTier = 1;
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b) {
			const tier = b.buildingTier ?? 1;
			if (tier > highestBuildingTier) highestBuildingTier = tier;
		}
	}

	// Collect this faction's buildings, group by type
	const factionBuildings: Array<{
		entityId: number;
		buildingType: string;
		tier: number;
	}> = [];
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b || b.factionId !== factionId) continue;
		factionBuildings.push({
			entityId: e.id(),
			buildingType: b.buildingType,
			tier: b.buildingTier ?? 1,
		});
	}

	// Try upgrading ALL buildings in priority order
	for (const targetType of UPGRADE_PRIORITY) {
		const candidates = factionBuildings.filter(
			(b) =>
				b.buildingType === targetType &&
				b.tier < 3 &&
				BUILDING_UNLOCK_CHAINS[
					targetType as keyof typeof BUILDING_UNLOCK_CHAINS
				] != null &&
				!getBuildingUpgradeJob(b.entityId),
		);

		if (candidates.length === 0) continue;

		// Pick the lowest-tier candidate (upgrade tier 1→2 before 2→3)
		candidates.sort((a, b) => a.tier - b.tier);

		for (const candidate of candidates) {
			startBuildingUpgrade(
				world,
				candidate.entityId,
				highestBuildingTier,
				currentTurn,
			);
		}
	}
}

/**
 * Run building upgrades for all AI factions.
 * Called after building construction in the AI turn pipeline.
 */
export function runAiBuildingUpgrades(
	world: World,
	factionIds: string[],
): void {
	for (const factionId of factionIds) {
		aiConsiderBuildingUpgrades(world, factionId);
	}
}
