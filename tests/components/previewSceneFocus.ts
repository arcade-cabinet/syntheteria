import { gridToWorld } from "../../src/world/sectorCoordinates";
import type { WorldSessionSnapshot } from "../../src/world/snapshots";

function edgeOffset(edge: string | null) {
	switch (edge) {
		case "north":
			return { x: 0, z: -1.02 };
		case "east":
			return { x: 1.02, z: 0 };
		case "south":
			return { x: 0, z: 1.02 };
		case "west":
			return { x: -1.02, z: 0 };
		default:
			return { x: 0, z: 0 };
	}
}

export function getAnchorClusterFocus(
	session: WorldSessionSnapshot,
	q: number,
	r: number,
) {
	const anchorKey = `${q},${r}`;
	const structures = session.sectorStructures.filter(
		(structure) => structure.anchor_key === anchorKey,
	);

	if (structures.length === 0) {
		const anchor = gridToWorld(q, r);
		return {
			target: [anchor.x, 0.55, anchor.z] as [number, number, number],
			position: [anchor.x + 4.8, 3.8, anchor.z + 5.6] as [number, number, number],
		};
	}

	const positions = structures.map((structure) => {
		const origin = gridToWorld(structure.q, structure.r);
		const edge = edgeOffset(structure.edge);
		return {
			x: origin.x + structure.offset_x + edge.x,
			y:
				(structure.placement_layer === "roof"
					? 1.85
					: structure.placement_layer === "detail"
						? 0.4
						: structure.placement_layer === "prop"
							? 0.08
							: 0) + structure.offset_y,
			z: origin.z + structure.offset_z + edge.z,
		};
	});

	const center = positions.reduce(
		(acc, position) => ({
			x: acc.x + position.x,
			y: acc.y + position.y,
			z: acc.z + position.z,
		}),
		{ x: 0, y: 0, z: 0 },
	);
	center.x /= positions.length;
	center.y /= positions.length;
	center.z /= positions.length;

	let maxRadius = 0;
	for (const position of positions) {
		const dx = position.x - center.x;
		const dz = position.z - center.z;
		maxRadius = Math.max(maxRadius, Math.sqrt(dx * dx + dz * dz));
	}

	const radius = Math.max(1.75, maxRadius + 1.15);

	return {
		target: [center.x, 0.95, center.z] as [number, number, number],
		position: [
			center.x + radius * 0.78,
			Math.max(3.6, radius * 0.58),
			center.z + radius * 1.02,
		] as [number, number, number],
	};
}
