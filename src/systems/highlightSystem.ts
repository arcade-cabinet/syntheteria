import type { World } from "koota";
import { Tile, TileHighlight, UnitFaction, UnitPos } from "../traits";

export function clearHighlights(world: World): void {
	for (const e of world.query(TileHighlight)) {
		e.set(TileHighlight, {
			emissive: 0.0,
			reason: "none" as const,
			color: 0x00ffaa,
		});
	}
}

export function highlightReachableTiles(
	world: World,
	selectedUnitTileX: number,
	selectedUnitTileZ: number,
	mp: number,
): void {
	clearHighlights(world);

	// Build a passability map from Tile entities
	const passable = new Set<string>();
	for (const e of world.query(Tile)) {
		const t = e.get(Tile);
		if (t?.passable) passable.add(`${t.x},${t.z}`);
	}

	// BFS
	const reachable = new Set<string>();
	const queue: Array<{ x: number; z: number; steps: number }> = [
		{ x: selectedUnitTileX, z: selectedUnitTileZ, steps: 0 },
	];
	const visited = new Set<string>();
	visited.add(`${selectedUnitTileX},${selectedUnitTileZ}`);

	while (queue.length > 0) {
		const current = queue.shift()!;
		reachable.add(`${current.x},${current.z}`);
		if (current.steps >= mp) continue;
		for (const [dx, dz] of [
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
		]) {
			const nx = current.x + dx;
			const nz = current.z + dz;
			const key = `${nx},${nz}`;
			if (!visited.has(key) && passable.has(key)) {
				visited.add(key);
				queue.push({ x: nx, z: nz, steps: current.steps + 1 });
			}
		}
	}

	// Collect enemy positions for attack reticle
	const enemyPositions = new Set<string>();
	for (const e of world.query(UnitPos, UnitFaction)) {
		const f = e.get(UnitFaction);
		const p = e.get(UnitPos);
		if (!f || !p || f.factionId === "player") continue;
		enemyPositions.add(`${p.tileX},${p.tileZ}`);
	}

	// Build set of tiles adjacent to the selected unit (attack range)
	const attackRange = new Set<string>();
	for (const [dx, dz] of [
		[0, 1],
		[0, -1],
		[1, 0],
		[-1, 0],
	]) {
		attackRange.add(`${selectedUnitTileX + dx},${selectedUnitTileZ + dz}`);
	}

	// Apply highlights
	for (const e of world.query(Tile, TileHighlight)) {
		const t = e.get(Tile);
		if (!t) continue;
		const key = `${t.x},${t.z}`;
		if (t.x === selectedUnitTileX && t.z === selectedUnitTileZ) {
			e.set(TileHighlight, {
				emissive: 1.0,
				reason: "selected" as const,
				color: 0xffffff,
			});
		} else if (attackRange.has(key) && enemyPositions.has(key)) {
			// Enemy in attack range — red reticle
			e.set(TileHighlight, {
				emissive: 0.8,
				reason: "danger" as const,
				color: 0xff2200,
			});
		} else if (reachable.has(key)) {
			e.set(TileHighlight, {
				emissive: 0.6,
				reason: "reachable" as const,
				color: 0x00ffaa,
			});
		}
	}
}

/** Highlight a single tile in construction yellow during build placement mode. */
export function highlightPlacementTile(
	world: World,
	tileX: number,
	tileZ: number,
): void {
	for (const e of world.query(Tile, TileHighlight)) {
		const t = e.get(Tile);
		if (!t) continue;
		if (t.x === tileX && t.z === tileZ) {
			e.set(TileHighlight, {
				emissive: 0.7,
				reason: "placement" as const,
				color: 0xe8c86a,
			});
		} else {
			const h = e.get(TileHighlight);
			if (h && h.reason === "placement") {
				e.set(TileHighlight, {
					emissive: 0.0,
					reason: "none" as const,
					color: 0x00ffaa,
				});
			}
		}
	}
}
