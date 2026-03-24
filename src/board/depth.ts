import type { Elevation, GeneratedBoard } from "./types";

export type SpanType = "bridge" | "tunnel";

export interface DepthSpan {
	id: string;
	type: SpanType;
	tiles: Array<{ x: number; z: number; elevation: Elevation }>;
	entrances: Array<{ x: number; z: number }>;
}

export interface DepthLayer {
	spans: DepthSpan[];
}

/** Generate bridge/tunnel spans. Mutates board tile elevations for affected tiles. */
export function generateDepthLayer(
	board: GeneratedBoard,
	rng: () => number,
): DepthLayer {
	const { width, height } = board.config;
	const occupied = new Set<string>();
	const spans: DepthSpan[] = [];

	function tileKey(x: number, z: number): string {
		return `${x},${z}`;
	}

	function isOccupied(x: number, z: number): boolean {
		return occupied.has(tileKey(x, z));
	}

	function inBounds(x: number, z: number): boolean {
		return x >= 0 && x < width && z >= 0 && z < height;
	}

	// --- Bridges ---
	let bridgeIndex = 0;
	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z][x];
			if (tile.elevation !== 2) continue;
			if (rng() >= 0.05) continue;

			// Pick direction: along X (dx=1,dz=0) or Z (dx=0,dz=1)
			const alongX = rng() < 0.5;
			const dx = alongX ? 1 : 0;
			const dz = alongX ? 0 : 1;
			const length = Math.floor(rng() * 5) + 2; // 2-6 tiles

			// Check all span tiles + ramp tiles fit and aren't occupied
			const spanCoords: Array<{ x: number; z: number }> = [];
			const rampBefore = { x: x - dx, z: z - dz };
			const rampAfter = { x: x + dx * length, z: z + dz * length };

			let valid = true;

			// Check ramps in bounds and not occupied
			if (
				!inBounds(rampBefore.x, rampBefore.z) ||
				!inBounds(rampAfter.x, rampAfter.z)
			) {
				valid = false;
			}
			if (
				valid &&
				(isOccupied(rampBefore.x, rampBefore.z) ||
					isOccupied(rampAfter.x, rampAfter.z))
			) {
				valid = false;
			}

			// Check span tiles
			if (valid) {
				for (let i = 0; i < length; i++) {
					const sx = x + dx * i;
					const sz = z + dz * i;
					if (!inBounds(sx, sz) || isOccupied(sx, sz)) {
						valid = false;
						break;
					}
					spanCoords.push({ x: sx, z: sz });
				}
			}

			if (!valid || spanCoords.length === 0) continue;

			// Commit bridge span
			const spanTiles: DepthSpan["tiles"] = [];
			for (const coord of spanCoords) {
				board.tiles[coord.z][coord.x].elevation = 1;
				board.tiles[coord.z][coord.x].passable = true;
				spanTiles.push({ x: coord.x, z: coord.z, elevation: 1 });
				occupied.add(tileKey(coord.x, coord.z));
			}

			// Ramp tiles: elevation 0, passable
			board.tiles[rampBefore.z][rampBefore.x].elevation = 0;
			board.tiles[rampBefore.z][rampBefore.x].passable = true;
			spanTiles.push({ x: rampBefore.x, z: rampBefore.z, elevation: 0 });
			occupied.add(tileKey(rampBefore.x, rampBefore.z));

			board.tiles[rampAfter.z][rampAfter.x].elevation = 0;
			board.tiles[rampAfter.z][rampAfter.x].passable = true;
			spanTiles.push({ x: rampAfter.x, z: rampAfter.z, elevation: 0 });
			occupied.add(tileKey(rampAfter.x, rampAfter.z));

			const entrances = [
				{ x: rampBefore.x, z: rampBefore.z },
				{ x: rampAfter.x, z: rampAfter.z },
			];

			spans.push({
				id: `bridge_${bridgeIndex++}`,
				type: "bridge",
				tiles: spanTiles,
				entrances,
			});
		}
	}

	// --- Tunnels ---
	// Collect passable ground tiles
	const groundTiles: Array<{ x: number; z: number }> = [];
	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z][x];
			if (tile.passable && tile.elevation === 0 && !isOccupied(x, z)) {
				groundTiles.push({ x, z });
			}
		}
	}

	let tunnelIndex = 0;
	// Attempt tunnel generation for pairs
	const maxAttempts = Math.floor(groundTiles.length * 0.03);
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		if (groundTiles.length < 2) break;

		const idxA = Math.floor(rng() * groundTiles.length);
		const idxB = Math.floor(rng() * groundTiles.length);
		if (idxA === idxB) continue;

		const a = groundTiles[idxA];
		const b = groundTiles[idxB];
		const manhattan = Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
		if (manhattan < 6) continue;

		// L-shaped path: go horizontal from a to (b.x, a.z), then vertical to b
		const pathCoords: Array<{ x: number; z: number }> = [];
		let valid = true;

		// Horizontal segment
		const xDir = a.x <= b.x ? 1 : -1;
		for (let cx = a.x + xDir; cx !== b.x; cx += xDir) {
			if (!inBounds(cx, a.z) || isOccupied(cx, a.z)) {
				valid = false;
				break;
			}
			pathCoords.push({ x: cx, z: a.z });
		}

		if (!valid) continue;

		// Corner tile
		if (a.z !== b.z || a.x !== b.x) {
			if (!inBounds(b.x, a.z) || isOccupied(b.x, a.z)) continue;
			pathCoords.push({ x: b.x, z: a.z });
		}

		// Vertical segment
		const zDir = a.z <= b.z ? 1 : -1;
		for (let cz = a.z + zDir; cz !== b.z; cz += zDir) {
			if (!inBounds(b.x, cz) || isOccupied(b.x, cz)) {
				valid = false;
				break;
			}
			pathCoords.push({ x: b.x, z: cz });
		}

		if (!valid || pathCoords.length === 0) continue;

		// Commit tunnel span
		const spanTiles: DepthSpan["tiles"] = [];
		for (const coord of pathCoords) {
			board.tiles[coord.z][coord.x].elevation = -1;
			spanTiles.push({ x: coord.x, z: coord.z, elevation: -1 });
			occupied.add(tileKey(coord.x, coord.z));
		}

		const entrances = [
			{ x: a.x, z: a.z },
			{ x: b.x, z: b.z },
		];

		spans.push({
			id: `tunnel_${tunnelIndex++}`,
			type: "tunnel",
			tiles: spanTiles,
			entrances,
		});
	}

	return { spans };
}
