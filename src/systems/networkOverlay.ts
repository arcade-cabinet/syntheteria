import networksConfig from "../config/networks.json";
import {
	Building,
	Identity,
	LightningRod,
	Signal,
	WorldPosition,
} from "../ecs/traits";
import { hexToWorld, worldToHex } from "../ecs/terrain";
import { buildings, lightningRods, units, world } from "../ecs/world";

/**
 * Network Overlay System
 *
 * Reads ECS state (signal connectivity, power distribution, belt routes)
 * and computes the geometric representation of network lines between hex centers.
 *
 * This is a PURE system — no rendering, no Three.js, no React.
 * The renderer reads getNetworkOverlayState() each frame.
 *
 * Network types:
 * - Signal relay: thin cyan lines between connected relay nodes
 * - Power feed: amber lines from lightning rods to powered buildings
 * - Belt route: mint conveyor lines between fabrication endpoints
 *
 * Lines route through hex centers using bezier curves. When multiple
 * networks share a hex edge, lines are offset perpendicular to avoid overlap.
 */

// --- Types ---

export type NetworkType = "signal" | "power" | "belt";

export type FactionId = "player" | "cultist" | "rogue" | "feral" | "wildlife";

export interface NetworkSegment {
	/** Unique ID for this segment (for React keys) */
	id: string;
	/** Network type determines visual style */
	type: NetworkType;
	/** Source hex center in world coordinates */
	from: { x: number; z: number };
	/** Target hex center in world coordinates */
	to: { x: number; z: number };
	/** Faction that owns this network segment */
	faction: FactionId;
	/** For power: throughput ratio [0, 1] for glow intensity */
	throughput: number;
	/** Perpendicular offset index (-1, 0, 1) for parallel routing */
	parallelIndex: number;
}

export interface JunctionNode {
	/** World position of junction */
	x: number;
	z: number;
	/** Faction that owns the junction */
	faction: FactionId;
	/** Number of networks meeting at this junction */
	networkCount: number;
	/** Whether a structure occupies this hex (dims junction) */
	hasStructure: boolean;
}

export interface NetworkOverlayState {
	segments: NetworkSegment[];
	junctions: JunctionNode[];
	/** Current sim tick for animation timing */
	currentTick: number;
}

// --- Module state ---

let overlayState: NetworkOverlayState = {
	segments: [],
	junctions: [],
	currentTick: 0,
};

let nextSegmentId = 0;

// --- Edge key helpers ---

/** Create a canonical key for a hex edge (order-independent) */
function edgeKey(
	q1: number,
	r1: number,
	q2: number,
	r2: number,
): string {
	if (q1 < q2 || (q1 === q2 && r1 < r2)) {
		return `${q1},${r1}-${q2},${r2}`;
	}
	return `${q2},${r2}-${q1},${r1}`;
}

/** Create a key for a hex position */
function hexKey(q: number, r: number): string {
	return `${q},${r}`;
}

/**
 * Get the 6 neighbors of a flat-top hex in axial coordinates.
 * Flat-top hex neighbor offsets in axial (q, r):
 * (+1, 0), (-1, 0), (0, +1), (0, -1), (+1, -1), (-1, +1)
 */
function getHexNeighborOffsets(): Array<{ dq: number; dr: number }> {
	return [
		{ dq: 1, dr: 0 },
		{ dq: -1, dr: 0 },
		{ dq: 0, dr: 1 },
		{ dq: 0, dr: -1 },
		{ dq: 1, dr: -1 },
		{ dq: -1, dr: 1 },
	];
}

// --- Signal network geometry ---

function buildSignalSegments(): NetworkSegment[] {
	const segments: NetworkSegment[] = [];

	// Find all relay nodes and connected units with positions
	const relayEntities = world
		.query(Signal, WorldPosition, Identity)
		.filter((e) => e.get(Signal)?.relaySource);

	// Build a map of hex -> relay entities at that hex
	const hexRelays = new Map<
		string,
		Array<{ q: number; r: number; faction: FactionId }>
	>();

	for (const entity of relayEntities) {
		const pos = entity.get(WorldPosition)!;
		const id = entity.get(Identity)!;
		const hex = worldToHex(pos.x, pos.z);
		const key = hexKey(hex.q, hex.r);

		if (!hexRelays.has(key)) {
			hexRelays.set(key, []);
		}
		hexRelays.get(key)!.push({
			q: hex.q,
			r: hex.r,
			faction: id.faction as FactionId,
		});
	}

	// For each relay, check if neighboring hexes also have relays of the same faction
	// If so, create a signal segment between them
	const createdEdges = new Set<string>();
	const neighborOffsets = getHexNeighborOffsets();

	for (const [, relays] of hexRelays) {
		for (const relay of relays) {
			for (const offset of neighborOffsets) {
				const nq = relay.q + offset.dq;
				const nr = relay.r + offset.dr;
				const neighborKey = hexKey(nq, nr);
				const neighborRelays = hexRelays.get(neighborKey);

				if (!neighborRelays) continue;

				// Check if any neighbor relay is same faction
				const sameFactionNeighbor = neighborRelays.find(
					(n) => n.faction === relay.faction,
				);
				if (!sameFactionNeighbor) continue;

				const ek = edgeKey(relay.q, relay.r, nq, nr);
				if (createdEdges.has(ek)) continue;
				createdEdges.add(ek);

				const fromWorld = hexToWorld(relay.q, relay.r);
				const toWorld = hexToWorld(nq, nr);

				segments.push({
					id: `sig_${nextSegmentId++}`,
					type: "signal",
					from: { x: fromWorld.x, z: fromWorld.z },
					to: { x: toWorld.x, z: toWorld.z },
					faction: relay.faction,
					throughput: 1.0,
					parallelIndex: 0,
				});
			}
		}
	}

	// Also connect non-relay connected units to their nearest relay within range
	const connectedUnits = world
		.query(Signal, WorldPosition, Identity)
		.filter(
			(e) => e.get(Signal)?.connected && !e.get(Signal)?.relaySource,
		);

	for (const unit of connectedUnits) {
		const unitPos = unit.get(WorldPosition)!;
		const unitId = unit.get(Identity)!;
		const unitHex = worldToHex(unitPos.x, unitPos.z);

		// Find nearest relay of same faction
		let nearestDist = Number.POSITIVE_INFINITY;
		let nearestRelayHex: { q: number; r: number } | null = null;

		for (const relay of relayEntities) {
			const relayId = relay.get(Identity)!;
			if (relayId.faction !== unitId.faction) continue;

			const relayPos = relay.get(WorldPosition)!;
			const dx = unitPos.x - relayPos.x;
			const dz = unitPos.z - relayPos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist < nearestDist) {
				nearestDist = dist;
				const rHex = worldToHex(relayPos.x, relayPos.z);
				nearestRelayHex = rHex;
			}
		}

		if (nearestRelayHex) {
			const ek = edgeKey(
				unitHex.q,
				unitHex.r,
				nearestRelayHex.q,
				nearestRelayHex.r,
			);
			if (!createdEdges.has(ek)) {
				createdEdges.add(ek);
				const fromWorld = hexToWorld(unitHex.q, unitHex.r);
				const toWorld = hexToWorld(
					nearestRelayHex.q,
					nearestRelayHex.r,
				);

				segments.push({
					id: `sig_${nextSegmentId++}`,
					type: "signal",
					from: { x: fromWorld.x, z: fromWorld.z },
					to: { x: toWorld.x, z: toWorld.z },
					faction: unitId.faction as FactionId,
					throughput: 0.6,
					parallelIndex: 0,
				});
			}
		}
	}

	return segments;
}

// --- Power network geometry ---

function buildPowerSegments(): NetworkSegment[] {
	const segments: NetworkSegment[] = [];
	const createdEdges = new Set<string>();

	for (const rod of lightningRods) {
		const rodPos = rod.get(WorldPosition);
		const rodComp = rod.get(LightningRod);
		if (!rodPos || !rodComp) continue;

		const rodHex = worldToHex(rodPos.x, rodPos.z);
		const radius = rodComp.protectionRadius || 10;

		// Find powered buildings within rod range
		for (const building of buildings) {
			const bldg = building.get(Building);
			if (!bldg?.powered) continue;
			if (bldg.type === "lightning_rod") continue;

			const bldgPos = building.get(WorldPosition);
			if (!bldgPos) continue;

			const dx = bldgPos.x - rodPos.x;
			const dz = bldgPos.z - rodPos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist > radius) continue;

			const bldgHex = worldToHex(bldgPos.x, bldgPos.z);
			const ek = edgeKey(rodHex.q, rodHex.r, bldgHex.q, bldgHex.r);
			if (createdEdges.has(ek)) continue;
			createdEdges.add(ek);

			// Throughput based on current rod output vs capacity
			const throughput =
				rodComp.rodCapacity > 0
					? Math.min(1.0, rodComp.currentOutput / rodComp.rodCapacity)
					: 0;

			const fromWorld = hexToWorld(rodHex.q, rodHex.r);
			const toWorld = hexToWorld(bldgHex.q, bldgHex.r);

			segments.push({
				id: `pwr_${nextSegmentId++}`,
				type: "power",
				from: { x: fromWorld.x, z: fromWorld.z },
				to: { x: toWorld.x, z: toWorld.z },
				faction: "player",
				throughput,
				parallelIndex: 0,
			});
		}
	}

	return segments;
}

// --- Belt network geometry ---

function buildBeltSegments(): NetworkSegment[] {
	const segments: NetworkSegment[] = [];
	const createdEdges = new Set<string>();

	// Belt routes connect fabrication units to resource sources or other fabricators
	// For now, connect any fabrication buildings that are within 2 hex distance
	const fabBuildings = Array.from(buildings).filter(
		(b) =>
			b.get(Building)?.type === "fabrication_unit" &&
			b.get(Building)?.operational,
	);

	for (let i = 0; i < fabBuildings.length; i++) {
		for (let j = i + 1; j < fabBuildings.length; j++) {
			const posA = fabBuildings[i].get(WorldPosition);
			const posB = fabBuildings[j].get(WorldPosition);
			if (!posA || !posB) continue;

			const hexA = worldToHex(posA.x, posA.z);
			const hexB = worldToHex(posB.x, posB.z);

			// Only connect nearby fabricators (within 3 hex distance)
			const dq = Math.abs(hexA.q - hexB.q);
			const dr = Math.abs(hexA.r - hexB.r);
			const ds = Math.abs(hexA.q + hexA.r - hexB.q - hexB.r);
			const hexDist = Math.max(dq, dr, ds);

			if (hexDist > 3) continue;

			const ek = edgeKey(hexA.q, hexA.r, hexB.q, hexB.r);
			if (createdEdges.has(ek)) continue;
			createdEdges.add(ek);

			const fromWorld = hexToWorld(hexA.q, hexA.r);
			const toWorld = hexToWorld(hexB.q, hexB.r);

			segments.push({
				id: `belt_${nextSegmentId++}`,
				type: "belt",
				from: { x: fromWorld.x, z: fromWorld.z },
				to: { x: toWorld.x, z: toWorld.z },
				faction: "player",
				throughput: 1.0,
				parallelIndex: 0,
			});
		}
	}

	return segments;
}

// --- Parallel offset assignment ---

/**
 * Assign parallelIndex to segments sharing the same hex edge.
 * First network: centered (0), second: +1 offset, third: -1 offset.
 */
function assignParallelOffsets(segments: NetworkSegment[]) {
	const edgeSegments = new Map<string, NetworkSegment[]>();

	for (const seg of segments) {
		// Compute hex coords from world positions to get edge key
		const fromHex = worldToHex(seg.from.x, seg.from.z);
		const toHex = worldToHex(seg.to.x, seg.to.z);
		const ek = edgeKey(fromHex.q, fromHex.r, toHex.q, toHex.r);

		if (!edgeSegments.has(ek)) {
			edgeSegments.set(ek, []);
		}
		edgeSegments.get(ek)!.push(seg);
	}

	const maxParallel = networksConfig.maxParallelPerEdge;

	for (const [, segs] of edgeSegments) {
		// Sort by type priority: signal=0, power=1, belt=2
		const typePriority: Record<NetworkType, number> = {
			signal: 0,
			power: 1,
			belt: 2,
		};
		segs.sort((a, b) => typePriority[a.type] - typePriority[b.type]);

		// Assign offsets: 0, 1, -1 (capped at maxParallel)
		const offsets = [0, 1, -1];
		for (let i = 0; i < Math.min(segs.length, maxParallel); i++) {
			segs[i].parallelIndex = offsets[i];
		}
	}
}

// --- Junction computation ---

function buildJunctions(segments: NetworkSegment[]): JunctionNode[] {
	// Count how many networks meet at each hex center
	const hexNetworks = new Map<
		string,
		{
			x: number;
			z: number;
			faction: FactionId;
			types: Set<NetworkType>;
		}
	>();

	for (const seg of segments) {
		for (const point of [seg.from, seg.to]) {
			const hex = worldToHex(point.x, point.z);
			const key = hexKey(hex.q, hex.r);

			if (!hexNetworks.has(key)) {
				const worldPos = hexToWorld(hex.q, hex.r);
				hexNetworks.set(key, {
					x: worldPos.x,
					z: worldPos.z,
					faction: seg.faction,
					types: new Set(),
				});
			}
			hexNetworks.get(key)!.types.add(seg.type);
		}
	}

	// Only create junctions where 2+ different network types meet
	const junctions: JunctionNode[] = [];

	// Check which hexes have structures
	const structureHexes = new Set<string>();
	for (const building of buildings) {
		const pos = building.get(WorldPosition);
		if (!pos) continue;
		const hex = worldToHex(pos.x, pos.z);
		structureHexes.add(hexKey(hex.q, hex.r));
	}

	for (const [key, info] of hexNetworks) {
		if (info.types.size >= 2) {
			junctions.push({
				x: info.x,
				z: info.z,
				faction: info.faction,
				networkCount: info.types.size,
				hasStructure: structureHexes.has(key),
			});
		}
	}

	return junctions;
}

// --- Public API ---

/**
 * Get the current network overlay state. Updated each sim tick.
 */
export function getNetworkOverlayState(): NetworkOverlayState {
	return overlayState;
}

/**
 * Reset network overlay state.
 */
export function resetNetworkOverlay() {
	nextSegmentId = 0;
	overlayState = {
		segments: [],
		junctions: [],
		currentTick: 0,
	};
}

/**
 * Run network overlay system. Called once per sim tick.
 * Reads ECS state to compute network line geometry for the renderer.
 */
export function networkOverlaySystem(tick: number) {
	nextSegmentId = 0;

	const signalSegs = buildSignalSegments();
	const powerSegs = buildPowerSegments();
	const beltSegs = buildBeltSegments();

	const allSegments = [...signalSegs, ...powerSegs, ...beltSegs];

	assignParallelOffsets(allSegments);

	const junctions = buildJunctions(allSegments);

	overlayState = {
		segments: allSegments,
		junctions,
		currentTick: tick,
	};
}
