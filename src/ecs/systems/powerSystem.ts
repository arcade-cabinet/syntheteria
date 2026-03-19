/**
 * Storm power grid system.
 *
 * Power flows from the perpetual storm through storm transmitters.
 * Transmitters broadcast power to tiles within their radius.
 * Power boxes within range accumulate charge each turn.
 * Consumer buildings draw from the nearest charged power box.
 * Buildings that can't draw enough power lose the Powered trait.
 */

import type { World } from "koota";
import { Building, Powered, PowerGrid } from "../traits/building";

// ─── Helpers ────────────────────────────────────────────────────────────────

function manhattanDist(
	ax: number,
	az: number,
	bx: number,
	bz: number,
): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

interface PowerEntity {
	entity: ReturnType<World["query"]>[number];
	tileX: number;
	tileZ: number;
	powerDelta: number;
	storageCapacity: number;
	currentCharge: number;
	powerRadius: number;
	buildingType: string;
}

function collectPowerEntities(world: World): PowerEntity[] {
	const result: PowerEntity[] = [];
	for (const e of world.query(Building, PowerGrid)) {
		const b = e.get(Building);
		const pg = e.get(PowerGrid);
		if (!b || !pg) continue;
		result.push({
			entity: e,
			tileX: b.tileX,
			tileZ: b.tileZ,
			powerDelta: pg.powerDelta,
			storageCapacity: pg.storageCapacity,
			currentCharge: pg.currentCharge,
			powerRadius: pg.powerRadius,
			buildingType: b.buildingType,
		});
	}
	return result;
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Run the power grid simulation for one turn.
 *
 * Phase 1: Transmitters charge nearby power boxes.
 * Phase 2: Consumer buildings draw from nearest charged power box.
 * Phase 3: Update Powered trait on all consumer buildings.
 */
export function runPowerGrid(world: World): void {
	const entities = collectPowerEntities(world);

	const transmitters = entities.filter((e) => e.powerDelta > 0);
	const powerBoxes = entities.filter((e) => e.buildingType === "power_box");
	const consumers = entities.filter((e) => e.powerDelta < 0);

	// Phase 1: Transmitters charge nearby power boxes
	for (const tx of transmitters) {
		for (const box of powerBoxes) {
			const dist = manhattanDist(tx.tileX, tx.tileZ, box.tileX, box.tileZ);
			if (dist <= tx.powerRadius) {
				// Each transmitter adds its powerDelta to each box in range (capped)
				box.currentCharge = Math.min(
					box.currentCharge + tx.powerDelta,
					box.storageCapacity,
				);
			}
		}
	}

	// Phase 2: Consumers draw from nearest charged power box in range
	// Sort consumers by distance to nearest box so closer ones draw first
	for (const consumer of consumers) {
		const demand = Math.abs(consumer.powerDelta);

		// Find nearest charged power box within any transmitter's radius
		let bestBox: PowerEntity | null = null;
		let bestDist = Infinity;
		for (const box of powerBoxes) {
			if (box.currentCharge <= 0) continue;
			const dist = manhattanDist(
				consumer.tileX,
				consumer.tileZ,
				box.tileX,
				box.tileZ,
			);
			if (dist < bestDist) {
				bestDist = dist;
				bestBox = box;
			}
		}

		// Also check if consumer is directly in transmitter range
		let directPower = false;
		for (const tx of transmitters) {
			const dist = manhattanDist(
				consumer.tileX,
				consumer.tileZ,
				tx.tileX,
				tx.tileZ,
			);
			if (dist <= tx.powerRadius) {
				directPower = true;
				break;
			}
		}

		let powered = false;
		if (directPower) {
			// Direct transmitter coverage — powered without draining a box
			powered = true;
		} else if (bestBox && bestBox.currentCharge >= demand) {
			// Draw from nearest power box
			bestBox.currentCharge -= demand;
			powered = true;
		}

		// Phase 3: Update Powered trait
		if (powered) {
			if (!consumer.entity.has(Powered)) {
				consumer.entity.add(Powered);
			}
		} else {
			if (consumer.entity.has(Powered)) {
				consumer.entity.remove(Powered);
			}
		}
	}

	// Phase 4: Generators (transmitters) are always self-powered
	for (const tx of transmitters) {
		if (!tx.entity.has(Powered)) {
			tx.entity.add(Powered);
		}
	}

	// Commit charge changes back to power box entities
	for (const box of powerBoxes) {
		box.entity.set(PowerGrid, {
			...box.entity.get(PowerGrid)!,
			currentCharge: box.currentCharge,
		});
	}
}

// ─── Coverage Query ─────────────────────────────────────────────────────────

/**
 * Check if a tile is within powered coverage.
 * A tile is powered if it's within range of a transmitter OR a charged power box.
 */
export function isPowered(
	world: World,
	tileX: number,
	tileZ: number,
): boolean {
	for (const e of world.query(Building, PowerGrid)) {
		const b = e.get(Building);
		const pg = e.get(PowerGrid);
		if (!b || !pg) continue;

		// Transmitter coverage
		if (pg.powerDelta > 0 && pg.powerRadius > 0) {
			if (manhattanDist(tileX, tileZ, b.tileX, b.tileZ) <= pg.powerRadius) {
				return true;
			}
		}

		// Charged power box coverage — use a fixed broadcast radius of 6
		if (
			b.buildingType === "power_box" &&
			pg.currentCharge > 0
		) {
			if (manhattanDist(tileX, tileZ, b.tileX, b.tileZ) <= 6) {
				return true;
			}
		}
	}
	return false;
}
