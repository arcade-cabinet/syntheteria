/**
 * FormationPatterns -- calculates position offsets for each formation type.
 *
 * Offsets are relative to the leader's position and forward direction.
 * The leader occupies index 0 (offset = zero vector); members start at index 1.
 *
 * Coordinate convention (Yuka / Three.js):
 *   x = right, z = forward (negative z is "forward" in Three.js but Yuka
 *   uses the vehicle's local frame, so offsets are in local space).
 *
 * All spacing values are configurable via the options parameter.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum FormationType {
	/** Side by side, centered on the leader. */
	LINE = "line",
	/** V-shape with leader at the point. */
	WEDGE = "wedge",
	/** Single file behind the leader. */
	COLUMN = "column",
	/** Ring around the leader. */
	CIRCLE = "circle",
}

export interface FormationSpacing {
	/** Lateral spacing for LINE formation (meters). Default: 2 */
	lineSpacing: number;
	/** Lateral and depth spacing for WEDGE formation (meters). Default: 2 */
	wedgeSpacing: number;
	/** Depth spacing for COLUMN formation (meters). Default: 1.5 */
	columnSpacing: number;
	/** Radius for CIRCLE formation (meters). Default: 3 */
	circleRadius: number;
}

export interface Vec3Offset {
	x: number;
	y: number;
	z: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SPACING: FormationSpacing = {
	lineSpacing: 2,
	wedgeSpacing: 2,
	columnSpacing: 1.5,
	circleRadius: 3,
};

// ---------------------------------------------------------------------------
// Offset calculations
// ---------------------------------------------------------------------------

/**
 * Calculate position offsets for each formation member relative to the leader.
 *
 * The leader (index 0) always has offset (0, 0, 0).
 * Followers (indices 1..count-1) get offsets based on the formation type.
 *
 * @param type    - Formation shape.
 * @param count   - Total number of entities (leader + followers).
 * @param spacing - Optional spacing overrides.
 * @returns Array of Vec3 offsets, length === count. Index 0 is the leader.
 */
export function getOffsets(
	type: FormationType,
	count: number,
	spacing: Partial<FormationSpacing> = {},
): Vec3Offset[] {
	if (count <= 0) return [];

	const s: FormationSpacing = { ...DEFAULT_SPACING, ...spacing };

	switch (type) {
		case FormationType.LINE:
			return getLineOffsets(count, s.lineSpacing);
		case FormationType.WEDGE:
			return getWedgeOffsets(count, s.wedgeSpacing);
		case FormationType.COLUMN:
			return getColumnOffsets(count, s.columnSpacing);
		case FormationType.CIRCLE:
			return getCircleOffsets(count, s.circleRadius);
	}
}

// ---------------------------------------------------------------------------
// LINE: side by side, centered on the leader
//
// Layout (5 members, leader = L):
//   M  M  L  M  M
//
// Members are placed alternating left/right of the leader.
// ---------------------------------------------------------------------------

function getLineOffsets(count: number, spacing: number): Vec3Offset[] {
	const offsets: Vec3Offset[] = [{ x: 0, y: 0, z: 0 }];

	for (let i = 1; i < count; i++) {
		// Alternating sides: 1 -> right, 2 -> left, 3 -> right, etc.
		const side = i % 2 === 1 ? 1 : -1;
		const rank = Math.ceil(i / 2);
		offsets.push({ x: side * rank * spacing, y: 0, z: 0 });
	}

	return offsets;
}

// ---------------------------------------------------------------------------
// WEDGE: V-shape with leader at the point
//
// Layout (5 members, leader = L):
//        L
//      M   M
//    M       M
//
// Members trail behind the leader at increasing lateral distance.
// ---------------------------------------------------------------------------

function getWedgeOffsets(count: number, spacing: number): Vec3Offset[] {
	const offsets: Vec3Offset[] = [{ x: 0, y: 0, z: 0 }];

	for (let i = 1; i < count; i++) {
		const side = i % 2 === 1 ? 1 : -1;
		const rank = Math.ceil(i / 2);
		offsets.push({
			x: side * rank * spacing,
			y: 0,
			z: -rank * spacing, // behind the leader
		});
	}

	return offsets;
}

// ---------------------------------------------------------------------------
// COLUMN: single file behind the leader
//
// Layout (5 members, leader = L):
//   L
//   M
//   M
//   M
//   M
// ---------------------------------------------------------------------------

function getColumnOffsets(count: number, spacing: number): Vec3Offset[] {
	const offsets: Vec3Offset[] = [{ x: 0, y: 0, z: 0 }];

	for (let i = 1; i < count; i++) {
		offsets.push({ x: 0, y: 0, z: -i * spacing });
	}

	return offsets;
}

// ---------------------------------------------------------------------------
// CIRCLE: ring around the leader
//
// Members are evenly distributed on a circle centered on the leader.
// The leader sits at the center (offset 0,0,0).
// ---------------------------------------------------------------------------

function getCircleOffsets(count: number, radius: number): Vec3Offset[] {
	const offsets: Vec3Offset[] = [{ x: 0, y: 0, z: 0 }];

	const followerCount = count - 1;
	if (followerCount <= 0) return offsets;

	for (let i = 0; i < followerCount; i++) {
		const angle = (i / followerCount) * Math.PI * 2;
		offsets.push({
			x: Math.cos(angle) * radius,
			y: 0,
			z: Math.sin(angle) * radius,
		});
	}

	return offsets;
}
