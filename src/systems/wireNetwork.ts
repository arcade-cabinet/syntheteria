/**
 * Wire network system — power and signal distribution through wire graphs.
 *
 * Power wires carry energy from lightning rods to consumer buildings.
 * Signal wires propagate signal strength from relays, degrading with length.
 *
 * Runs each simulation tick after the power system updates rod outputs.
 */

import type { Entity } from "../ecs/types";
import {
	buildings,
	lightningRods,
	signalRelays,
	wires,
	world,
} from "../ecs/world";

/**
 * Find an entity by ID. Returns undefined if not found.
 */
function getEntityById(id: string): Entity | undefined {
	for (const entity of world) {
		if (entity.id === id) return entity;
	}
	return undefined;
}

/** Set of entity IDs that are powered via wire connections */
const wirePoweredEntities = new Set<string>();

/**
 * Build an adjacency list from all wire entities.
 * Returns a map from entityId -> list of { neighborId, wireEntity }.
 */
function buildWireGraph(
	wireType: "power" | "signal",
): Map<string, { neighborId: string; wire: Entity }[]> {
	const graph = new Map<string, { neighborId: string; wire: Entity }[]>();

	for (const wireEntity of wires) {
		if (wireEntity.wire.wireType !== wireType) continue;

		const fromId = wireEntity.wire.fromEntityId;
		const toId = wireEntity.wire.toEntityId;

		if (!graph.has(fromId)) graph.set(fromId, []);
		if (!graph.has(toId)) graph.set(toId, []);

		// Power wires are bidirectional for graph traversal
		graph.get(fromId)!.push({ neighborId: toId, wire: wireEntity });
		graph.get(toId)!.push({ neighborId: fromId, wire: wireEntity });
	}

	return graph;
}

/**
 * BFS from lightning rod sources through power wire graph.
 * Each rod distributes its currentOutput across connected consumers.
 * Wire currentLoad reflects actual flow as a fraction of maxCapacity.
 */
function distributePowerThroughWires() {
	wirePoweredEntities.clear();

	// Reset all power wire loads
	for (const wireEntity of wires) {
		if (wireEntity.wire!.wireType === "power") {
			wireEntity.wire!.currentLoad = 0;
		}
	}

	const graph = buildWireGraph("power");
	if (graph.size === 0) return;

	// Collect all lightning rod IDs as power sources
	const sourceIds = new Set<string>();
	for (const rod of lightningRods) {
		sourceIds.add(rod.id);
		wirePoweredEntities.add(rod.id);
	}

	// BFS from each source — find all reachable entities via power wires
	const visited = new Set<string>();
	const queue: {
		entityId: string;
		availablePower: number;
		pathWires: Entity[];
	}[] = [];

	for (const rod of lightningRods) {
		if (!graph.has(rod.id)) continue;
		queue.push({
			entityId: rod.id,
			availablePower: rod.lightningRod.currentOutput,
			pathWires: [],
		});
		visited.add(rod.id);
	}

	// Track power flowing through each wire
	const wireFlows = new Map<string, number>();

	let head = 0;
	while (head < queue.length) {
		const current = queue[head++];
		const neighbors = graph.get(current.entityId);
		if (!neighbors) continue;

		// Distribute available power evenly across unvisited neighbors
		const unvisited = neighbors.filter((n) => !visited.has(n.neighborId));
		if (unvisited.length === 0) continue;

		const powerPerBranch = current.availablePower / unvisited.length;

		for (const { neighborId, wire } of unvisited) {
			visited.add(neighborId);

			// Wire capacity limits flow
			const flow = Math.min(powerPerBranch, wire.wire!.maxCapacity);

			// Track wire load
			const existingFlow = wireFlows.get(wire.id) ?? 0;
			wireFlows.set(wire.id, existingFlow + flow);

			// Mark the neighbor as powered if it receives meaningful power
			if (flow > 0.1) {
				wirePoweredEntities.add(neighborId);
			}

			// Continue BFS — power degrades slightly through each wire segment
			const passthrough = flow * 0.95;
			if (passthrough > 0.05) {
				queue.push({
					entityId: neighborId,
					availablePower: passthrough,
					pathWires: [...current.pathWires, wire],
				});
			}
		}
	}

	// Apply wire loads
	for (const wireEntity of wires) {
		if (wireEntity.wire.wireType !== "power") continue;
		const flow = wireFlows.get(wireEntity.id) ?? 0;
		wireEntity.wire.currentLoad = Math.min(
			1,
			flow / wireEntity.wire.maxCapacity,
		);
	}

	// Update building powered state based on wire connections
	for (const building of buildings) {
		if (building.building.type === "lightning_rod") continue;
		if (wirePoweredEntities.has(building.id)) {
			building.building.powered = true;
			building.building.operational = true;
		}
	}
}

/**
 * Propagate signal strength from relays through signal wires.
 * Signal degrades based on wire length.
 */
function distributeSignalThroughWires() {
	// Reset all signal wire loads
	for (const wireEntity of wires) {
		if (wireEntity.wire.wireType === "signal") {
			wireEntity.wire.currentLoad = 0;
		}
	}

	const graph = buildWireGraph("signal");
	if (graph.size === 0) return;

	// BFS from each signal relay
	const visited = new Set<string>();
	const queue: { entityId: string; signalStrength: number }[] = [];

	for (const relay of signalRelays) {
		if (!graph.has(relay.id)) continue;
		queue.push({
			entityId: relay.id,
			signalStrength: relay.signalRelay.signalStrength,
		});
		visited.add(relay.id);
	}

	let signalHead = 0;
	while (signalHead < queue.length) {
		const current = queue[signalHead++];
		const neighbors = graph.get(current.entityId);
		if (!neighbors) continue;

		for (const { neighborId, wire } of neighbors) {
			if (visited.has(neighborId)) continue;
			visited.add(neighborId);

			// Signal degrades with wire length
			const degradation = Math.max(0, 1 - wire.wire!.length * 0.02);
			const propagatedStrength = current.signalStrength * degradation;

			// Set wire load based on signal strength
			wire.wire!.currentLoad = Math.min(1, propagatedStrength);

			// Update signal relay strength if the neighbor is a relay
			const neighborEntity = getEntityById(neighborId);
			if (
				neighborEntity?.signalRelay &&
				propagatedStrength > neighborEntity.signalRelay.signalStrength
			) {
				neighborEntity.signalRelay.signalStrength = propagatedStrength;
			}

			if (propagatedStrength > 0.05) {
				queue.push({
					entityId: neighborId,
					signalStrength: propagatedStrength,
				});
			}
		}
	}
}

/**
 * Check if an entity is powered via the wire network.
 */
export function isEntityPowered(entityId: string): boolean {
	return wirePoweredEntities.has(entityId);
}

/**
 * Run the wire network system. Called once per simulation tick.
 */
export function wireNetworkSystem() {
	distributePowerThroughWires();
	distributeSignalThroughWires();
}
