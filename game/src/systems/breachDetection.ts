/**
 * Breach detection for cube walls and structures.
 *
 * Uses BFS / flood-fill on a grid to determine whether a contiguous wall
 * has been breached — i.e. a gap has been created by a destroyed cube
 * that splits the wall into disconnected sections.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GridCoord {
	x: number;
	y: number;
	z: number;
}

export interface BreachResult {
	/** True if the wall has at least one gap that splits it. */
	breached: boolean;
	/** Grid positions where cubes are missing (gaps in the wall). */
	gapPositions: GridCoord[];
	/** Each disconnected group of remaining cubes. */
	disconnectedSections: GridCoord[][];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function coordKey(c: GridCoord): string {
	return `${c.x},${c.y},${c.z}`;
}

/**
 * 6-connected neighbors on the integer grid (face-adjacent cubes).
 */
function neighbors(c: GridCoord): GridCoord[] {
	return [
		{ x: c.x + 1, y: c.y, z: c.z },
		{ x: c.x - 1, y: c.y, z: c.z },
		{ x: c.x, y: c.y + 1, z: c.z },
		{ x: c.x, y: c.y - 1, z: c.z },
		{ x: c.x, y: c.y, z: c.z + 1 },
		{ x: c.x, y: c.y, z: c.z - 1 },
	];
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Check whether a set of wall cubes has been breached.
 *
 * @param wallCubes - The grid positions of cubes that are *still present*
 *                    (destroyed cubes should NOT be in this list).
 * @param expectedPositions - Optional full set of positions that the wall
 *                            *should* occupy. If provided, any position in
 *                            this set that is missing from `wallCubes` is
 *                            reported as a gap. If omitted, gaps are inferred
 *                            from connectivity alone (the wall is breached
 *                            when it fragments into multiple components).
 */
export function checkBreach(
	wallCubes: GridCoord[],
	expectedPositions?: GridCoord[],
): BreachResult {
	// ----- Edge cases -----
	if (wallCubes.length === 0) {
		// No cubes at all — if there were expected positions, everything is a gap
		const gaps = expectedPositions ? [...expectedPositions] : [];
		return {
			breached: expectedPositions !== undefined && expectedPositions.length > 0,
			gapPositions: gaps,
			disconnectedSections: [],
		};
	}

	// Build lookup set of surviving cubes
	const cubeSet = new Set<string>();
	for (const c of wallCubes) {
		cubeSet.add(coordKey(c));
	}

	// ----- Detect gap positions -----
	const gapPositions: GridCoord[] = [];
	if (expectedPositions) {
		for (const pos of expectedPositions) {
			if (!cubeSet.has(coordKey(pos))) {
				gapPositions.push(pos);
			}
		}
	}

	// ----- BFS to find connected components among surviving cubes -----
	const visited = new Set<string>();
	const sections: GridCoord[][] = [];

	for (const cube of wallCubes) {
		const key = coordKey(cube);
		if (visited.has(key)) continue;

		// BFS from this cube
		const section: GridCoord[] = [];
		const queue: GridCoord[] = [cube];
		visited.add(key);

		while (queue.length > 0) {
			const current = queue.shift()!;
			section.push(current);

			for (const nb of neighbors(current)) {
				const nbKey = coordKey(nb);
				if (cubeSet.has(nbKey) && !visited.has(nbKey)) {
					visited.add(nbKey);
					queue.push(nb);
				}
			}
		}

		sections.push(section);
	}

	// The wall is breached if there is more than one connected component,
	// OR if there are explicit gap positions.
	const breached = sections.length > 1 || gapPositions.length > 0;

	return {
		breached,
		gapPositions,
		disconnectedSections: sections,
	};
}
