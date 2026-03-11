/**
 * Signal/compute network system — BFS-based signal propagation from player bots.
 *
 * Builds a connectivity graph from signal relays and wires each tick.
 * BFS outward from player bot positions through relays within range.
 * Signal strength degrades with distance; connected relays contribute compute
 * to a global pool used by the hacking system.
 *
 * Tunables sourced from config/power.json (signalMinStrength, signalComputeMultiplier).
 */

import { config } from "../../config";
import type { Entity, Vec3 } from "../ecs/types";
import { getEntityById, playerBots, signalRelays, wires } from "../ecs/koota/compat";

/** Signal minimum strength threshold from config. */
const SIGNAL_MIN_STRENGTH = config.power.signalMinStrength;

/** Compute contribution per unit of signal strength from config. */
const SIGNAL_COMPUTE_MULTIPLIER = config.power.signalComputeMultiplier;

/** Global compute pool — sum of compute from all connected relays. */
let globalCompute = 0;

/** Set of relay entity IDs currently connected to the player signal network. */
const connectedRelayIds = new Set<string>();

/**
 * Build an adjacency list from signal wires and spatial proximity of relays.
 * Two relays are neighbors if:
 *   - They are connected by a signal wire, OR
 *   - They are within each other's signalRange
 */
function buildSignalGraph(): Map<string, string[]> {
	const graph = new Map<string, string[]>();

	// Ensure every relay has an entry
	for (const relay of signalRelays) {
		if (!graph.has(relay.id)) graph.set(relay.id, []);
	}

	// Add edges from signal wires
	for (const wireEntity of wires) {
		if (wireEntity.wire!.wireType !== "signal") continue;

		const fromId = wireEntity.wire!.fromEntityId;
		const toId = wireEntity.wire!.toEntityId;

		if (!graph.has(fromId)) graph.set(fromId, []);
		if (!graph.has(toId)) graph.set(toId, []);

		(graph.get(fromId) ?? []).push(toId);
		(graph.get(toId) ?? []).push(fromId);
	}

	// Add edges from spatial proximity (relays within range of each other)
	const relayArray = Array.from(signalRelays);
	for (let i = 0; i < relayArray.length; i++) {
		for (let j = i + 1; j < relayArray.length; j++) {
			const a = relayArray[i];
			const b = relayArray[j];
			const dx = a.worldPosition!.x - b.worldPosition!.x;
			const dz = a.worldPosition!.z - b.worldPosition!.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (
				dist <= Math.min(a.signalRelay!.signalRange, b.signalRelay!.signalRange)
			) {
				// a.id and b.id are guaranteed in graph (pre-populated above)
				const aEdges = graph.get(a.id) ?? [];
				const bEdges = graph.get(b.id) ?? [];
				aEdges.push(b.id);
				bEdges.push(a.id);
				graph.set(a.id, aEdges);
				graph.set(b.id, bEdges);
			}
		}
	}

	return graph;
}

/**
 * Calculate distance between two Vec3 positions (XZ plane).
 */
function distXZ(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Signal network system — runs each simulation tick.
 *
 * 1. Reset all relay signal strengths.
 * 2. BFS from each player bot outward through relays.
 * 3. Signal strength = max(0, 1 - distance / relay.signalRange).
 * 4. Relays with strength > signalMinStrength are "connected" and contribute compute.
 */
export function signalNetworkSystem() {
	connectedRelayIds.clear();
	globalCompute = 0;

	// Reset all relay strengths
	for (const relay of signalRelays) {
		relay.signalRelay!.signalStrength = 0;
	}

	const graph = buildSignalGraph();

	// Collect player bot positions as signal sources
	const playerPositions: Vec3[] = [];
	for (const bot of playerBots) {
		if (bot.playerControlled.isActive) {
			playerPositions.push(bot.worldPosition);
		}
	}

	// Also include all player-faction units as potential signal sources
	// (the active player bot is the primary source)
	if (playerPositions.length === 0) {
		// Fallback: no active player bot, no signal network
		return;
	}

	// BFS: seed with relays that are within range of a player bot
	const visited = new Set<string>();
	const queue: { relayId: string; strength: number }[] = [];

	for (const relay of signalRelays) {
		let bestStrength = 0;
		for (const pos of playerPositions) {
			const dist = distXZ(pos, relay.worldPosition!);
			const strength = Math.max(0, 1 - dist / relay.signalRelay!.signalRange);
			bestStrength = Math.max(bestStrength, strength);
		}

		if (bestStrength > SIGNAL_MIN_STRENGTH) {
			relay.signalRelay!.signalStrength = bestStrength;
			visited.add(relay.id);
			queue.push({ relayId: relay.id, strength: bestStrength });
			connectedRelayIds.add(relay.id);
		}
	}

	// BFS through relay graph — propagate signal
	while (queue.length > 0) {
		const current = queue.shift()!;
		const neighbors = graph.get(current.relayId);
		if (!neighbors) continue;

		for (const neighborId of neighbors) {
			if (visited.has(neighborId)) continue;

			const neighborEntity = getEntityById(neighborId);
			if (!neighborEntity?.signalRelay || !neighborEntity.worldPosition)
				continue;

			const currentEntity = getEntityById(current.relayId);
			if (!currentEntity?.worldPosition) continue;

			const dist = distXZ(
				currentEntity.worldPosition,
				neighborEntity.worldPosition,
			);
			const strength = Math.max(
				0,
				current.strength * (1 - dist / neighborEntity.signalRelay.signalRange),
			);

			if (strength > SIGNAL_MIN_STRENGTH) {
				visited.add(neighborId);
				neighborEntity.signalRelay.signalStrength = strength;
				connectedRelayIds.add(neighborId);
				queue.push({ relayId: neighborId, strength });
			}
		}
	}

	// Compute global pool: each connected relay contributes strength * multiplier
	for (const relayId of connectedRelayIds) {
		const entity = getEntityById(relayId);
		if (entity?.signalRelay) {
			globalCompute += entity.signalRelay.signalStrength * SIGNAL_COMPUTE_MULTIPLIER;
		}
	}
}

/**
 * Get the total compute available from connected signal relays.
 */
export function getGlobalCompute(): number {
	return globalCompute;
}

/**
 * Check if a world position is within signal network coverage.
 * A position is covered if it's within range of any connected relay.
 */
export function isInSignalRange(x: number, z: number): boolean {
	for (const relayId of connectedRelayIds) {
		const entity = getEntityById(relayId);
		if (!entity?.signalRelay || !entity.worldPosition) continue;

		const dx = entity.worldPosition.x - x;
		const dz = entity.worldPosition.z - z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist <= entity.signalRelay.signalRange) {
			return true;
		}
	}
	return false;
}
