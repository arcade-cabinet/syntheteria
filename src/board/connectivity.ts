import type { TileData } from "./types";

/**
 * Flood-fill from (startX, startZ), returning the set of reachable
 * passable tile keys ("x,z").
 */
function floodFill(
	tiles: TileData[][],
	startX: number,
	startZ: number,
	width: number,
	height: number,
): Set<string> {
	const reachable = new Set<string>();
	const startTile = tiles[startZ]?.[startX];
	if (!startTile || !startTile.passable) return reachable;

	const queue: [number, number][] = [[startX, startZ]];
	reachable.add(`${startX},${startZ}`);

	while (queue.length > 0) {
		const [x, z] = queue.shift()!;
		for (const [dx, dz] of [
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
		]) {
			const nx = x + dx!;
			const nz = z + dz!;
			if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
			const key = `${nx},${nz}`;
			if (!reachable.has(key) && tiles[nz]![nx]!.passable) {
				reachable.add(key);
				queue.push([nx, nz]);
			}
		}
	}

	return reachable;
}

/**
 * Collect all tiles belonging to an orphan cluster via BFS.
 */
function collectCluster(
	tiles: TileData[][],
	startX: number,
	startZ: number,
	width: number,
	height: number,
	visited: Set<string>,
): Array<{ x: number; z: number }> {
	const cluster: Array<{ x: number; z: number }> = [];
	const queue: [number, number][] = [[startX, startZ]];
	const key0 = `${startX},${startZ}`;
	visited.add(key0);
	cluster.push({ x: startX, z: startZ });

	while (queue.length > 0) {
		const [cx, cz] = queue.shift()!;
		for (const [dx, dz] of [
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
		]) {
			const nx = cx + dx!;
			const nz = cz + dz!;
			if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
			const nkey = `${nx},${nz}`;
			if (!visited.has(nkey) && tiles[nz]![nx]!.passable) {
				visited.add(nkey);
				cluster.push({ x: nx, z: nz });
				queue.push([nx, nz]);
			}
		}
	}

	return cluster;
}

/**
 * Find all orphaned clusters (groups of passable tiles not in the reachable set).
 * Returns all tiles for each cluster.
 */
function findOrphanClusters(
	tiles: TileData[][],
	reachable: Set<string>,
	width: number,
	height: number,
): Array<Array<{ x: number; z: number }>> {
	const visited = new Set<string>(reachable);
	const clusters: Array<Array<{ x: number; z: number }>> = [];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const key = `${x},${z}`;
			if (visited.has(key)) continue;
			if (!tiles[z]![x]!.passable) continue;

			const cluster = collectCluster(tiles, x, z, width, height, visited);
			clusters.push(cluster);
		}
	}

	return clusters;
}

/**
 * Punch an L-shaped corridor from (fromX, fromZ) to (toX, toZ).
 * Any impassable tile in the path becomes transit_deck at elevation 0.
 * Goes horizontal first, then vertical.
 */
function punchCorridor(
	tiles: TileData[][],
	fromX: number,
	fromZ: number,
	toX: number,
	toZ: number,
	width: number,
	height: number,
): void {
	let cx = fromX;
	let cz = fromZ;

	// Horizontal segment
	const dx = toX > cx ? 1 : toX < cx ? -1 : 0;
	while (cx !== toX) {
		cx += dx;
		if (cx < 0 || cx >= width) break;
		const tile = tiles[cz]![cx]!;
		if (!tile.passable) {
			tile.floorType = "transit_deck";
			tile.elevation = 0;
			tile.passable = true;
		}
	}

	// Vertical segment
	const dz = toZ > cz ? 1 : toZ < cz ? -1 : 0;
	while (cz !== toZ) {
		cz += dz;
		if (cz < 0 || cz >= height) break;
		const tile = tiles[cz]![cx]!;
		if (!tile.passable) {
			tile.floorType = "transit_deck";
			tile.elevation = 0;
			tile.passable = true;
		}
	}
}

/**
 * For each orphan cluster, find the cluster tile closest to any reachable tile
 * (Manhattan distance) and punch a corridor between the closest pair.
 */
function connectCluster(
	tiles: TileData[][],
	cluster: Array<{ x: number; z: number }>,
	reachable: Set<string>,
	width: number,
	height: number,
): void {
	let bestDist = Number.POSITIVE_INFINITY;
	let bestOrphanX = cluster[0]!.x;
	let bestOrphanZ = cluster[0]!.z;
	let bestReachX = -1;
	let bestReachZ = -1;

	// For performance: iterate reachable set once, check against all cluster tiles
	// But cluster can be large too. Use a Set for cluster for O(1) lookups? No,
	// we need to iterate both. For typical board sizes this is fine.
	for (const key of reachable) {
		const commaIdx = key.indexOf(",");
		const rx = Number(key.slice(0, commaIdx));
		const rz = Number(key.slice(commaIdx + 1));
		for (const orphan of cluster) {
			const dist = Math.abs(rx - orphan.x) + Math.abs(rz - orphan.z);
			if (dist < bestDist) {
				bestDist = dist;
				bestOrphanX = orphan.x;
				bestOrphanZ = orphan.z;
				bestReachX = rx;
				bestReachZ = rz;
			}
		}
	}

	if (bestReachX < 0) return;

	punchCorridor(tiles, bestOrphanX, bestOrphanZ, bestReachX, bestReachZ, width, height);
}

/**
 * Ensure all passable tiles are reachable from the spawn point.
 * Unreachable clusters get connected by punching corridors through
 * the nearest structural_mass wall.
 */
export function ensureConnectivity(
	tiles: TileData[][],
	spawnX: number,
	spawnZ: number,
	width: number,
	height: number,
): void {
	const MAX_ITERATIONS = 3;

	// Ensure the spawn tile itself is passable — it may be a wall tile
	// that the generator forces passable AFTER connectivity runs.
	const spawnTile = tiles[spawnZ]?.[spawnX];
	if (spawnTile && !spawnTile.passable) {
		spawnTile.floorType = "transit_deck";
		spawnTile.elevation = 0;
		spawnTile.passable = true;
	}

	for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
		const reachable = floodFill(tiles, spawnX, spawnZ, width, height);
		const orphanClusters = findOrphanClusters(tiles, reachable, width, height);

		if (orphanClusters.length === 0) return; // All passable tiles connected

		for (const cluster of orphanClusters) {
			// Re-compute reachable after each punch since prior punches expand it
			const currentReachable = floodFill(tiles, spawnX, spawnZ, width, height);

			// Check if this cluster is already reachable now
			const rep = cluster[0]!;
			if (currentReachable.has(`${rep.x},${rep.z}`)) continue;

			connectCluster(tiles, cluster, currentReachable, width, height);
		}
	}
}
