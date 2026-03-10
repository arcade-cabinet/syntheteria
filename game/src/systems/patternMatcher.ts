/**
 * 3D pattern matcher for blueprint recognition.
 *
 * Given a world grid of placed cubes and a set of blueprints, this
 * module checks whether any blueprint pattern matches at a given
 * anchor position. Patterns are tried in all 4 Y-axis rotations
 * (0, 90, 180, 270 degrees).
 *
 * All functions are pure — no side effects, no global state.
 * Blueprints are passed as parameters, not imported from JSON config.
 */

import { type GridCoord, gridKey } from "./gridSnap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A blueprint definition for a buildable structure.
 *
 * The pattern is a 3D array indexed as [y][z][x]:
 * - y layers stack vertically
 * - z rows go along the Z axis
 * - x columns go along the X axis
 *
 * Each cell is a material type string or "_" for empty (no cube required).
 */
export interface Blueprint {
	id: string;
	name: string;
	pattern: string[][][];
	result: string;
}

/**
 * A successful match result containing the blueprint, the rotation
 * that matched, and the grid coordinates of all matched cubes.
 */
export interface MatchResult {
	blueprint: Blueprint;
	rotation: number;
	cubeCoords: GridCoord[];
}

// ---------------------------------------------------------------------------
// Pattern rotation
// ---------------------------------------------------------------------------

/**
 * Rotate a 3D pattern 90 degrees clockwise around the Y axis.
 *
 * The Y layers are preserved. Within each layer, the XZ plane is
 * rotated: the new pattern has dimensions swapped (old X becomes
 * new Z depth, old Z becomes new X width), and values are
 * rearranged to reflect a clockwise rotation when viewed from above.
 *
 * Rotation mapping (clockwise from +Y looking down):
 *   new_x = (maxZ - old_z)
 *   new_z = old_x
 *
 * So a layer that was [z][x] with dimensions depthZ x widthX
 * becomes [z'][x'] with dimensions widthX x depthZ where:
 *   result[old_x][maxZ - old_z] = original[old_z][old_x]
 */
export function rotatePattern90(pattern: string[][][]): string[][][] {
	const ySize = pattern.length;
	if (ySize === 0) return [];

	const result: string[][][] = [];

	for (let y = 0; y < ySize; y++) {
		const layer = pattern[y];
		const zSize = layer.length;
		const xSize = zSize > 0 ? layer[0].length : 0;

		// After 90-degree CW rotation: new dimensions are xSize x zSize
		// newPattern[newZ][newX] where newZ = old_x, newX = (maxZ - old_z)
		const rotatedLayer: string[][] = [];

		for (let newZ = 0; newZ < xSize; newZ++) {
			const row: string[] = [];
			for (let newX = 0; newX < zSize; newX++) {
				// Map back: old_z = (maxZ - newX) = (zSize - 1 - newX), old_x = newZ
				row.push(layer[zSize - 1 - newX][newZ]);
			}
			rotatedLayer.push(row);
		}

		result.push(rotatedLayer);
	}

	return result;
}

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

/**
 * Check whether a single pattern matches the world grid at the given anchor.
 *
 * The anchor position corresponds to pattern index [0][0][0].
 * Each cell in the pattern is checked:
 * - "_" matches an empty slot (no cube at that grid position)
 * - Any other string must match the material at that grid position exactly
 *
 * @returns The list of grid coordinates that contain cubes (non-underscore
 *          matches), or null if the pattern does not match.
 */
function tryMatch(
	worldGrid: Map<string, string>,
	anchor: GridCoord,
	pattern: string[][][],
): GridCoord[] | null {
	const cubeCoords: GridCoord[] = [];

	for (let y = 0; y < pattern.length; y++) {
		const layer = pattern[y];
		for (let z = 0; z < layer.length; z++) {
			const row = layer[z];
			for (let x = 0; x < row.length; x++) {
				const expected = row[x];
				const coord: GridCoord = {
					x: anchor.x + x,
					y: anchor.y + y,
					z: anchor.z + z,
				};
				const key = gridKey(coord);
				const actual = worldGrid.get(key);

				if (expected === "_") {
					// Empty slot required — must have no cube here
					if (actual !== undefined) {
						return null;
					}
				} else {
					// Material must match exactly
					if (actual !== expected) {
						return null;
					}
					cubeCoords.push(coord);
				}
			}
		}
	}

	return cubeCoords;
}

/**
 * Try to match any blueprint at the given anchor position.
 *
 * For each blueprint, all 4 Y-axis rotations (0, 90, 180, 270)
 * are tested. Returns the first match found, or null if no
 * blueprint matches.
 *
 * @param worldGrid  A map of gridKey strings to material type strings,
 *                   representing all placed cubes in the world.
 * @param anchor     The grid position to use as the pattern origin [0][0][0].
 * @param blueprints The list of blueprint definitions to check.
 * @returns A MatchResult with the matched blueprint, rotation, and cube
 *          coordinates, or null if nothing matches.
 */
export function matchBlueprint(
	worldGrid: Map<string, string>,
	anchor: GridCoord,
	blueprints: Blueprint[],
): MatchResult | null {
	for (const blueprint of blueprints) {
		let current = blueprint.pattern;

		for (let rotation = 0; rotation < 360; rotation += 90) {
			const cubeCoords = tryMatch(worldGrid, anchor, current);

			if (cubeCoords !== null) {
				return {
					blueprint,
					rotation,
					cubeCoords,
				};
			}

			// Rotate for next iteration
			current = rotatePattern90(current);
		}
	}

	return null;
}
