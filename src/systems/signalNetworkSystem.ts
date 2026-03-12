import type { Entity, Vec3 } from "../ecs/traits";
import { Compute, Identity, Signal, Unit, WorldPosition } from "../ecs/traits";
import { world } from "../ecs/world";
import { globalCompute } from "./hacking";

function gridDistance(a: Vec3, b: Vec3): number {
	if (!a || !b) return Number.POSITIVE_INFINITY;
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

export function signalNetworkSystem() {
	// 1. Calculate Global Compute
	let totalCapacity = 0;
	let totalDemand = 0;

	for (const entity of world.query(Compute, Identity)) {
		if (entity.get(Identity)?.faction === "player") {
			const net = entity.get(Compute)!.contribution - entity.get(Compute)!.cost;
			if (net > 0) totalCapacity += net;
			else totalDemand += Math.abs(net);
		}
	}

	globalCompute.capacity = totalCapacity;
	globalCompute.demand = totalDemand;
	globalCompute.available = totalCapacity - totalDemand;

	// 2. Signal Network Update (BFS)
	const playerUnits = world
		.query(Unit, Identity)
		.filter((e) => e.get(Identity)?.faction === "player");
	const relays = world
		.query(Signal, WorldPosition, Identity)
		.filter(
			(e) =>
				e.get(Identity)?.faction === "player" && e.get(Signal)?.relaySource,
		);

	const visited = new Set<string>();
	const queue: Entity[] = [...relays];

	while (queue.length > 0) {
		const current = queue.shift()!;
		visited.add(current.get(Identity)!.id);

		for (const unit of playerUnits) {
			if (
				unit.get(WorldPosition)! &&
				current.get(WorldPosition)! &&
				unit.get(Signal)!
			) {
				const dist = gridDistance(
					current.get(WorldPosition)!,
					unit.get(WorldPosition)!,
				);
				if (current.get(Signal)! && dist <= current.get(Signal)!.range) {
					unit.get(Signal)!.connected = true;
					visited.add(unit.get(Identity)!.id);
					if (
						unit.get(Signal)?.relaySource &&
						!visited.has(unit.get(Identity)!.id)
					) {
						queue.push(unit);
					}
				}
			}
		}
	}

	for (const unit of playerUnits) {
		if (unit.get(Signal)! && !visited.has(unit.get(Identity)!.id)) {
			unit.get(Signal)!.connected = false;
		}
	}
}
