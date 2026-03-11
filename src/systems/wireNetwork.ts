/**
 * Wire network system — power and signal distribution through wire graphs.
 *
 * Power wires carry energy from lightning rods to consumer buildings.
 * Signal wires propagate signal strength from relays, degrading with length.
 *
 * Runs each simulation tick after the power system updates rod outputs.
 */

import { config } from "../../config";
import type { Entity } from "../ecs/types";
import {
	buildings,
	getEntityById,
	lightningRods,
	signalRelays,
	wires,
} from "../ecs/koota/compat";

const WIRE_PASSTHROUGH = config.power.wirePassthroughFactor;
const WIRE_MIN_PASSTHROUGH = config.power.wireMinPassthrough;
const WIRE_POWER_THRESHOLD = config.power.wirePowerThreshold;
const SIGNAL_DEGRADATION = config.power.signalDegradationPerUnit;
const SIGNAL_MIN_STRENGTH = config.power.signalMinStrength;

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
		const wire = wireEntity.wire;
		if (!wire) continue;
		if (wire.wireType !== wireType) continue;

		const fromId = wire.fromEntityId;
		const toId = wire.toEntityId;

		if (!graph.has(fromId)) graph.set(fromId, []);
		if (!graph.has(toId)) graph.set(toId, []);

		// Power wires are bidirectional for graph traversal
		const fromEdges = graph.get(fromId) ?? [];
		const toEdges = graph.get(toId) ?? [];
		fromEdges.push({ neighborId: toId, wire: wireEntity });
		toEdges.push({ neighborId: fromId, wire: wireEntity });
		graph.set(fromId, fromEdges);
		graph.set(toId, toEdges);
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
		if (wireEntity.wire?.wireType === "power") {
			wireEntity.wire.currentLoad = 0;
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

			// Wire capacity limits flow (wire.wire is guaranteed by buildWireGraph filter)
			const flow = Math.min(powerPerBranch, wire.wire?.maxCapacity ?? 0);

			// Track wire load
			const existingFlow = wireFlows.get(wire.id) ?? 0;
			wireFlows.set(wire.id, existingFlow + flow);

			// Mark the neighbor as powered if it receives meaningful power
			if (flow > WIRE_POWER_THRESHOLD) {
				wirePoweredEntities.add(neighborId);
			}

			// Continue BFS — power degrades slightly through each wire segment
			const passthrough = flow * WIRE_PASSTHROUGH;
			if (passthrough > WIRE_MIN_PASSTHROUGH) {
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
		const wire = wireEntity.wire;
		if (!wire || wire.wireType !== "power") continue;
		const flow = wireFlows.get(wireEntity.id) ?? 0;
		wire.currentLoad = Math.min(1, flow / wire.maxCapacity);
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
		if (wireEntity.wire?.wireType === "signal") {
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
		if (!relay.signalRelay) continue;
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

			// Signal degrades with wire length (wire.wire is guaranteed by buildWireGraph filter)
			const wireLen = wire.wire?.length ?? 0;
			const degradation = Math.max(0, 1 - wireLen * SIGNAL_DEGRADATION);
			const propagatedStrength = current.signalStrength * degradation;

			// Set wire load based on signal strength
			if (wire.wire) wire.wire.currentLoad = Math.min(1, propagatedStrength);

			// Update signal relay strength if the neighbor is a relay
			const neighborEntity = getEntityById(neighborId);
			if (
				neighborEntity?.signalRelay &&
				propagatedStrength > neighborEntity.signalRelay.signalStrength
			) {
				neighborEntity.signalRelay.signalStrength = propagatedStrength;
			}

			if (propagatedStrength > SIGNAL_MIN_STRENGTH) {
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
