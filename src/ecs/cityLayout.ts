import { worldPRNG } from "./seed";

/**
 * Procedural city layout generator — circuit-board labyrinth style.
 *
 * Instead of isolated buildings, the city is composed of elongated
 * interconnected walls forming a labyrinth. The layout resembles
 * a giant circuit board when viewed from above: long corridors,
 * right-angle turns, T-junctions, and dead ends.
 *
 * Building types now represent wall segments and nodes:
 * - "conduit" — long narrow wall segments (traces on a circuit board)
 * - "node" — wider junction blocks where corridors meet (IC pads)
 * - "tower" — tall antenna/pylon structures at key junctions
 * - "ruin" — broken/collapsed wall segments with gaps
 * - "wall" — perimeter walls enclosing the city
 *
 * The layout is deterministic (seeded) so navmesh and rendering agree.
 * Buildings are stored as axis-aligned rectangles in world space.
 */

// Seeded PRNG for deterministic city generation
function seededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		return s / 0x7fffffff;
	};
}

export interface CityBuilding {
	/** World-space center */
	x: number;
	z: number;
	/** Half-extents */
	halfW: number;
	halfD: number;
	/** Building height for rendering */
	height: number;
	/** Type affects visual appearance */
	type: "conduit" | "node" | "tower" | "ruin" | "wall";
}

let cachedBuildings: CityBuilding[] | null = null;

/**
 * City area bounds — the labyrinth fills this region.
 * Open terrain beyond for future areas (coast, campus, etc.)
 */
const CITY_MIN_X = -30;
const CITY_MAX_X = 50;
const CITY_MIN_Z = -20;
const CITY_MAX_Z = 50;

/** Check if a point is inside the city bounds */
export function isInsideCityBounds(x: number, z: number): boolean {
	return (
		x >= CITY_MIN_X && x <= CITY_MAX_X && z >= CITY_MIN_Z && z <= CITY_MAX_Z
	);
}

/** Reset cached layout — call when the world seed changes before a new game. */
export function resetCityLayout() {
	cachedBuildings = null;
}

export function getCityBuildings(): CityBuilding[] {
	if (cachedBuildings) return cachedBuildings;

	// Use worldPRNG("city") so city layout is deterministic per world seed.
	// Fall back to a simple numeric seed to keep the legacy seededRandom path.
	const _prng = worldPRNG("city");
	const _seedNum = Math.floor(_prng() * 0x7fffffff);
	const rng = seededRandom(_seedNum);
	const buildings: CityBuilding[] = [];

	// --- Circuit-board labyrinth generation ---
	// We generate a maze-like structure using a grid of corridors.
	// Primary corridors run N-S and E-W at regular intervals.
	// Secondary corridors connect them, creating the labyrinth.
	// Junctions become "nodes" (wider blocks like IC pads).

	const CORRIDOR_SPACING = 8; // distance between primary corridors
	const WALL_THICKNESS = 0.6; // half-width of corridor walls
	const WALL_HEIGHT_MIN = 3;
	const WALL_HEIGHT_MAX = 5;
	const NODE_SIZE = 1.5; // half-extent of junction nodes

	// Spawn area clearance (5,10) to (20,18) — keep navigable
	const isSpawnArea = (x: number, z: number) =>
		x > 2 && x < 23 && z > 7 && z < 21;

	// --- Primary N-S corridors (vertical traces) ---
	for (let x = CITY_MIN_X + 4; x < CITY_MAX_X - 4; x += CORRIDOR_SPACING) {
		const xOff = (rng() - 0.5) * 1.5; // slight offset for organic feel
		const corridorX = x + xOff;

		// Break corridor into segments between cross-corridors
		for (let z = CITY_MIN_Z + 4; z < CITY_MAX_Z - 8; z += CORRIDOR_SPACING) {
			const zOff = (rng() - 0.5) * 1.0;
			const segStart = z + zOff;
			const segEnd = segStart + CORRIDOR_SPACING - 1;

			// Skip segments that overlap spawn area
			if (isSpawnArea(corridorX, (segStart + segEnd) / 2)) {
				// Place a shorter ruin segment at the edge instead
				if (rng() < 0.4) {
					const ruinLen = 1.5 + rng() * 2;
					buildings.push({
						x: corridorX,
						z: segStart + ruinLen / 2,
						halfW: WALL_THICKNESS,
						halfD: ruinLen / 2,
						height: 1.5 + rng() * 1.5,
						type: "ruin",
					});
				}
				continue;
			}

			// Randomly break some segments (creates passages)
			if (rng() < 0.15) continue;

			// Sometimes split into two segments with a gap (doorway)
			if (rng() < 0.25) {
				const gapPos = segStart + (segEnd - segStart) * (0.3 + rng() * 0.4);
				const gapSize = 1.5 + rng() * 1.5;
				const seg1Len = gapPos - gapSize / 2 - segStart;
				const seg2Len = segEnd - (gapPos + gapSize / 2);
				const h = WALL_HEIGHT_MIN + rng() * (WALL_HEIGHT_MAX - WALL_HEIGHT_MIN);

				if (seg1Len > 1) {
					buildings.push({
						x: corridorX,
						z: segStart + seg1Len / 2,
						halfW: WALL_THICKNESS,
						halfD: seg1Len / 2,
						height: h,
						type: "conduit",
					});
				}
				if (seg2Len > 1) {
					buildings.push({
						x: corridorX,
						z: segEnd - seg2Len / 2,
						halfW: WALL_THICKNESS,
						halfD: seg2Len / 2,
						height: h,
						type: "conduit",
					});
				}
				continue;
			}

			const segLen = segEnd - segStart;
			const height =
				WALL_HEIGHT_MIN + rng() * (WALL_HEIGHT_MAX - WALL_HEIGHT_MIN);
			const isRuin = rng() < 0.12;

			buildings.push({
				x: corridorX,
				z: (segStart + segEnd) / 2,
				halfW: WALL_THICKNESS,
				halfD: segLen / 2,
				height: isRuin ? height * 0.5 : height,
				type: isRuin ? "ruin" : "conduit",
			});
		}
	}

	// --- Primary E-W corridors (horizontal traces) ---
	for (let z = CITY_MIN_Z + 4; z < CITY_MAX_Z - 4; z += CORRIDOR_SPACING) {
		const zOff = (rng() - 0.5) * 1.5;
		const corridorZ = z + zOff;

		for (let x = CITY_MIN_X + 4; x < CITY_MAX_X - 8; x += CORRIDOR_SPACING) {
			const xOff = (rng() - 0.5) * 1.0;
			const segStart = x + xOff;
			const segEnd = segStart + CORRIDOR_SPACING - 1;

			if (isSpawnArea((segStart + segEnd) / 2, corridorZ)) {
				if (rng() < 0.4) {
					const ruinLen = 1.5 + rng() * 2;
					buildings.push({
						x: segStart + ruinLen / 2,
						z: corridorZ,
						halfW: ruinLen / 2,
						halfD: WALL_THICKNESS,
						height: 1.5 + rng() * 1.5,
						type: "ruin",
					});
				}
				continue;
			}

			if (rng() < 0.15) continue;

			if (rng() < 0.25) {
				const gapPos = segStart + (segEnd - segStart) * (0.3 + rng() * 0.4);
				const gapSize = 1.5 + rng() * 1.5;
				const seg1Len = gapPos - gapSize / 2 - segStart;
				const seg2Len = segEnd - (gapPos + gapSize / 2);
				const h = WALL_HEIGHT_MIN + rng() * (WALL_HEIGHT_MAX - WALL_HEIGHT_MIN);

				if (seg1Len > 1) {
					buildings.push({
						x: segStart + seg1Len / 2,
						z: corridorZ,
						halfW: seg1Len / 2,
						halfD: WALL_THICKNESS,
						height: h,
						type: "conduit",
					});
				}
				if (seg2Len > 1) {
					buildings.push({
						x: segEnd - seg2Len / 2,
						z: corridorZ,
						halfW: seg2Len / 2,
						halfD: WALL_THICKNESS,
						height: h,
						type: "conduit",
					});
				}
				continue;
			}

			const segLen = segEnd - segStart;
			const height =
				WALL_HEIGHT_MIN + rng() * (WALL_HEIGHT_MAX - WALL_HEIGHT_MIN);
			const isRuin = rng() < 0.12;

			buildings.push({
				x: (segStart + segEnd) / 2,
				z: corridorZ,
				halfW: segLen / 2,
				halfD: WALL_THICKNESS,
				height: isRuin ? height * 0.5 : height,
				type: isRuin ? "ruin" : "conduit",
			});
		}
	}

	// --- Junction nodes (IC pads) at corridor intersections ---
	for (let x = CITY_MIN_X + 4; x < CITY_MAX_X - 4; x += CORRIDOR_SPACING) {
		for (let z = CITY_MIN_Z + 4; z < CITY_MAX_Z - 4; z += CORRIDOR_SPACING) {
			if (isSpawnArea(x, z)) continue;
			if (rng() < 0.25) continue; // skip some junctions for variety

			const isTower = rng() < 0.15;
			const nodeHeight = isTower ? 6 + rng() * 5 : WALL_HEIGHT_MIN + rng() * 2;

			buildings.push({
				x: x + (rng() - 0.5) * 1.5,
				z: z + (rng() - 0.5) * 1.5,
				halfW: isTower ? 0.8 : NODE_SIZE,
				halfD: isTower ? 0.8 : NODE_SIZE,
				height: nodeHeight,
				type: isTower ? "tower" : "node",
			});
		}
	}

	// --- Secondary diagonal/offset connectors (makes it more labyrinthine) ---
	for (let x = CITY_MIN_X + 8; x < CITY_MAX_X - 8; x += CORRIDOR_SPACING * 2) {
		for (
			let z = CITY_MIN_Z + 8;
			z < CITY_MAX_Z - 8;
			z += CORRIDOR_SPACING * 2
		) {
			if (isSpawnArea(x + CORRIDOR_SPACING / 2, z + CORRIDOR_SPACING / 2))
				continue;
			if (rng() < 0.5) continue;

			const offX = CORRIDOR_SPACING / 2 + (rng() - 0.5) * 2;
			const offZ = CORRIDOR_SPACING / 2 + (rng() - 0.5) * 2;
			const cx = x + offX;
			const cz = z + offZ;

			// Short connecting wall segment
			const isHorizontal = rng() < 0.5;
			const len = 2 + rng() * 3;
			const h = WALL_HEIGHT_MIN + rng() * 1.5;

			buildings.push({
				x: cx,
				z: cz,
				halfW: isHorizontal ? len / 2 : WALL_THICKNESS,
				halfD: isHorizontal ? WALL_THICKNESS : len / 2,
				height: h,
				type: rng() < 0.2 ? "ruin" : "conduit",
			});
		}
	}

	// --- Perimeter walls ---
	addPerimeterStructures(buildings, rng);

	cachedBuildings = buildings;
	return buildings;
}

function addPerimeterStructures(buildings: CityBuilding[], rng: () => number) {
	// Segmented perimeter walls that look like PCB edge traces
	const SEGMENT_LEN = 8;
	const GAP_CHANCE = 0.2;

	// North wall
	for (let x = CITY_MIN_X; x < CITY_MAX_X; x += SEGMENT_LEN) {
		if (rng() < GAP_CHANCE) continue;
		buildings.push({
			x: x + SEGMENT_LEN / 2,
			z: CITY_MAX_Z + 2,
			halfW: SEGMENT_LEN / 2 - 0.3,
			halfD: 1.0,
			height: 3 + rng() * 2,
			type: "wall",
		});
	}

	// South wall
	for (let x = CITY_MIN_X; x < CITY_MAX_X; x += SEGMENT_LEN) {
		if (rng() < GAP_CHANCE) continue;
		buildings.push({
			x: x + SEGMENT_LEN / 2,
			z: CITY_MIN_Z - 2,
			halfW: SEGMENT_LEN / 2 - 0.3,
			halfD: 1.0,
			height: 3 + rng() * 2,
			type: "wall",
		});
	}

	// West wall
	for (let z = CITY_MIN_Z; z < CITY_MAX_Z; z += SEGMENT_LEN) {
		if (rng() < GAP_CHANCE) continue;
		buildings.push({
			x: CITY_MIN_X - 2,
			z: z + SEGMENT_LEN / 2,
			halfW: 1.0,
			halfD: SEGMENT_LEN / 2 - 0.3,
			height: 3 + rng() * 2,
			type: "wall",
		});
	}

	// East wall
	for (let z = CITY_MIN_Z; z < CITY_MAX_Z; z += SEGMENT_LEN) {
		if (rng() < GAP_CHANCE) continue;
		buildings.push({
			x: CITY_MAX_X + 2,
			z: z + SEGMENT_LEN / 2,
			halfW: 1.0,
			halfD: SEGMENT_LEN / 2 - 0.3,
			height: 3 + rng() * 2,
			type: "wall",
		});
	}
}

/**
 * Check if a world position is inside any building footprint.
 * Used by navmesh to mark cells as unwalkable.
 */
export function isInsideBuilding(x: number, z: number): boolean {
	const buildings = getCityBuildings();
	for (const b of buildings) {
		if (
			x >= b.x - b.halfW &&
			x <= b.x + b.halfW &&
			z >= b.z - b.halfD &&
			z <= b.z + b.halfD
		) {
			return true;
		}
	}
	return false;
}

/**
 * Check if a world position is near a building edge (for movement cost increase).
 */
export function nearBuildingEdge(x: number, z: number, margin = 0.5): boolean {
	const buildings = getCityBuildings();
	for (const b of buildings) {
		const nearX = x >= b.x - b.halfW - margin && x <= b.x + b.halfW + margin;
		const nearZ = z >= b.z - b.halfD - margin && z <= b.z + b.halfD + margin;
		if (nearX && nearZ) {
			const insideX = x >= b.x - b.halfW && x <= b.x + b.halfW;
			const insideZ = z >= b.z - b.halfD && z <= b.z + b.halfD;
			if (!insideX || !insideZ) return true; // Near edge but not inside
		}
	}
	return false;
}
